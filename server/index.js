import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import crypto from "crypto";
import http from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 5000;
const ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",").map((s) => s.trim());
const SECRET = process.env.FILE_SIGNING_SECRET || crypto.randomBytes(32).toString("hex");
const MAX_BYTES = 5 * 1024 * 1024, MAX_PENDING = 5; // images live only in RAM, so cap what one inbox can hold
const CODE_TTL = 5 * 60e3, ITEM_TTL = 10 * 60e3, LINK_TTL = 10 * 60e3, DEVICE_TTL = 24 * 3600e3;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

// ---------- state ----------
const byToken = new Map(); // sha256(token) -> deviceId (raw tokens are never stored)
const byId = new Map();    // deviceId -> { id, partner, seen }
const codes = new Map();   // code -> { owner, expires }
const items = new Map();   // itemId -> { id, owner, to, buf, mime, at, claimed } (image bytes stay in RAM, never on disk)

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const room = (id) => `dev:${id}`;
const pendingFor = (id) => [...items.values()].filter((i) => i.to === id && !i.claimed);
const sig = (id, exp) => crypto.createHmac("sha256", SECRET).update(`${id}.${exp}`).digest("base64url");
const sign = (it) => { const exp = Date.now() + LINK_TTL; return `/files/${it.id}?exp=${exp}&sig=${sig(it.id, exp)}`; };
const safeEq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };

// Identify the real file type from its bytes; the client-supplied name and MIME type are never trusted.
const sniff = (b) =>
  b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ? "jpg"
  : b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? "png"
  : b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" ? "webp"
  : b.subarray(0, 4).toString("latin1") === "GIF8" ? "gif" : null;

const drop = (it) => items.delete(it.id);

// ---------- app ----------
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ORIGINS }, maxHttpBufferSize: 1e4 });

const unpair = (dev) => {
  const p = byId.get(dev.partner);
  if (p) { p.partner = null; io.to(room(p.id)).emit("unpaired"); }
  dev.partner = null;
  for (const it of items.values()) if ([dev.id, p?.id].includes(it.owner) || [dev.id, p?.id].includes(it.to)) drop(it);
};

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: (o, cb) => cb(null, !o || ORIGINS.includes(o)),
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10kb" }));

const limit = (windowMs, max) => rateLimit({ windowMs, limit: max, standardHeaders: true, legacyHeaders: false, message: { message: "Too many requests. Wait a moment and try again." } });
app.use("/api", limit(60e3, 120));

const auth = (req, res, next) => {
  const t = (req.headers.authorization || "").replace(/^Bearer /, "");
  const dev = t && byId.get(byToken.get(sha(t)));
  if (!dev) return res.status(401).json({ message: "Session expired. Reconnect." });
  dev.seen = Date.now();
  req.dev = dev;
  next();
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 0 } });

// ---------- routes ----------
app.post("/api/session", limit(60e3, 10), (req, res) => {
  const token = crypto.randomBytes(32).toString("base64url");
  const id = crypto.randomUUID();
  byId.set(id, { id, partner: null, seen: Date.now() });
  byToken.set(sha(token), id);
  res.json({ token });
});

app.get("/api/me", auth, (req, res) => res.json({ paired: !!req.dev.partner, pending: pendingFor(req.dev.id).length }));

app.post("/api/pair/code", auth, limit(60e3, 10), (req, res) => {
  if (req.dev.partner) return res.status(409).json({ message: "Already paired. Unpair first." });
  for (const [c, v] of codes) if (v.owner === req.dev.id) codes.delete(c);
  let code;
  do code = Array.from({ length: 6 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join("");
  while (codes.has(code));
  const expiresAt = Date.now() + CODE_TTL;
  codes.set(code, { owner: req.dev.id, expires: expiresAt });
  res.json({ code, expiresAt });
});

app.post("/api/pair/join", auth, limit(60e3, 8), (req, res) => {
  const code = String(req.body?.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const entry = codes.get(code);
  const owner = entry && entry.expires > Date.now() && byId.get(entry.owner);
  if (!owner) return res.status(400).json({ message: "That code is invalid or expired." });
  if (owner.id === req.dev.id) return res.status(400).json({ message: "Enter this code on your other device." });
  if (req.dev.partner || owner.partner) return res.status(409).json({ message: "Already paired. Unpair first." });
  codes.delete(code); // single use
  owner.partner = req.dev.id;
  req.dev.partner = owner.id;
  io.to(room(owner.id)).to(room(req.dev.id)).emit("paired");
  res.json({ paired: true });
});

app.delete("/api/pair", auth, (req, res) => { unpair(req.dev); res.json({ ok: true }); });

app.post("/api/send", auth, limit(60e3, 20), upload.single("image"), async (req, res) => {
  const { dev } = req;
  if (!dev.partner) return res.status(409).json({ message: "Pair with a device first." });
  const buf = req.file?.buffer;
  const ext = buf && sniff(buf);
  if (!ext) return res.status(415).json({ message: "Only JPG, PNG, WebP or GIF images are allowed." });
  if (pendingFor(dev.partner).length >= MAX_PENDING) return res.status(429).json({ message: "Their inbox is full. Wait until they receive some." });
  const id = crypto.randomBytes(12).toString("hex");
  items.set(id, { id, owner: dev.id, to: dev.partner, buf, mime: MIME[ext], at: Date.now(), claimed: false });
  io.to(room(dev.partner)).emit("incoming");
  res.json({ id });
});

app.delete("/api/send/:id", auth, (req, res) => {
  const it = items.get(req.params.id);
  if (!it || it.owner !== req.dev.id || it.claimed) return res.status(404).json({ message: "Already received." });
  drop(it);
  io.to(room(it.to)).emit("recalled");
  res.json({ ok: true });
});

app.get("/api/receive", auth, (req, res) => {
  const it = pendingFor(req.dev.id)[0];
  if (!it) return res.status(404).json({ message: "Nothing is waiting yet." });
  it.claimed = true;
  res.json({ id: it.id, url: sign(it), at: it.at });
});

// Files are only reachable through short-lived signed links, and only after the receiver claims them.
app.get("/files/:id", (req, res) => {
  const it = items.get(req.params.id);
  const exp = Number(req.query.exp);
  if (!it || !it.claimed || !(exp > Date.now()) || !safeEq(String(req.query.sig || ""), sig(it.id, exp))) return res.sendStatus(403);
  res.set({
    "Content-Type": it.mime,
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=600",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  res.send(it.buf);
});

const REACTIONS = ["heart", "hug", "wave"];
app.post("/api/react", auth, limit(60e3, 30), (req, res) => {
  const type = req.body?.type;
  if (!req.dev.partner) return res.status(409).json({ message: "Pair with a device first." });
  if (!REACTIONS.includes(type)) return res.status(400).json({ message: "Unknown reaction." });
  io.to(room(req.dev.partner)).emit("reaction", type);
  res.json({ ok: true });
});

app.get("/health", (req, res) => res.json({ status: "OK" }));

app.use((err, req, res, _next) => {
  const multerErr = err instanceof multer.MulterError;
  if (!multerErr) console.error(err);
  const tooBig = err.code === "LIMIT_FILE_SIZE";
  res.status(tooBig ? 413 : multerErr ? 400 : 500).json({ message: tooBig ? "Image is over 5 MB." : multerErr ? "Invalid upload." : "Something went wrong." });
});

// ---------- realtime ----------
io.use((s, next) => {
  const id = byToken.get(sha(String(s.handshake.auth?.token || "")));
  if (!id) return next(new Error("unauthorized"));
  s.data.id = id;
  next();
});
io.on("connection", (s) => s.join(room(s.data.id)));

// ---------- cleanup ----------
setInterval(() => {
  const now = Date.now();
  for (const [c, v] of codes) if (v.expires < now) codes.delete(c);
  for (const it of items.values()) if (now - it.at > ITEM_TTL) drop(it);
  for (const [id, d] of byId) {
    if (now - d.seen < DEVICE_TTL) continue;
    unpair(d);
    byId.delete(id);
    for (const [h, i] of byToken) if (i === id) byToken.delete(h);
  }
}, 30e3).unref();

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
