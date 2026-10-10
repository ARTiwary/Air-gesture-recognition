import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PORT = 5055;
const API = `http://localhost:${PORT}`;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
let proc;

const call = (path, token, { method = "GET", json, body } = {}) =>
  fetch(API + path, {
    method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(json && { "Content-Type": "application/json" }) },
    body: json ? JSON.stringify(json) : body,
  });
const session = async () => (await (await call("/api/session", null, { method: "POST" })).json()).token;
const upload = (bytes, name = "x.png") => { const f = new FormData(); f.append("image", new Blob([bytes]), name); return f; };

before(async () => {
  proc = spawn("node", ["index.js"], { cwd: fileURLToPath(new URL("..", import.meta.url)), env: { ...process.env, PORT, FILE_SIGNING_SECRET: "test-secret" }, stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${API}/health`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
});
after(() => proc.kill());

test("requests without a token are rejected", async () => {
  assert.equal((await call("/api/me")).status, 401);
  assert.equal((await call("/api/me", "not-a-real-token")).status, 401);
});

test("unpaired devices cannot send or react", async () => {
  const t = await session();
  assert.equal((await call("/api/send", t, { method: "POST", body: upload(PNG) })).status, 409);
  assert.equal((await call("/api/react", t, { method: "POST", json: { type: "heart" } })).status, 409);
});

test("pair, send, receive, and signed links", async () => {
  const a = await session(), b = await session(), c = await session();

  const { code } = await (await call("/api/pair/code", a, { method: "POST" })).json();
  assert.match(code, /^[A-Z2-9]{6}$/);
  assert.equal((await call("/api/pair/join", a, { method: "POST", json: { code } })).status, 400, "cannot join your own code");
  assert.equal((await call("/api/pair/join", b, { method: "POST", json: { code } })).status, 200);
  assert.equal((await call("/api/pair/join", c, { method: "POST", json: { code } })).status, 400, "codes are single use");

  assert.equal((await call("/api/send", a, { method: "POST", body: upload(Buffer.from("not an image"), "fake.png") })).status, 415, "content is checked, not the name");
  assert.equal((await call("/api/react", a, { method: "POST", json: { type: "nope" } })).status, 400);
  assert.equal((await call("/api/react", a, { method: "POST", json: { type: "heart" } })).status, 200);

  const sent = await call("/api/send", a, { method: "POST", body: upload(PNG) });
  assert.equal(sent.status, 200);
  assert.equal((await (await call("/api/me", b)).json()).pending, 1);

  const item = await (await call("/api/receive", b)).json();
  const ok = await fetch(API + item.url);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "image/png");
  assert.equal(ok.headers.get("x-content-type-options"), "nosniff");
  assert.equal((await fetch(API + item.url.slice(0, -1) + (item.url.endsWith("A") ? "B" : "A"))).status, 403, "tampered signature");
  assert.equal((await call("/api/receive", b)).status, 404, "inbox is empty after receiving");

  assert.equal((await call("/api/pair", a, { method: "DELETE" })).status, 200);
  assert.equal((await fetch(API + item.url)).status, 403, "images are dropped when a pair ends");
});
