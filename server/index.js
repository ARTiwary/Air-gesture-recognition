import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ------------------ SETUP ------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// ------------------ MIDDLEWARE ------------------
app.use(cors({
  origin: function (origin, callback) {
    const allowed = ["http://localhost:5173"];
    if (!origin) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));

app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------ UPLOADS DIR ------------------
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// serve images
app.use("/uploads", express.static(uploadsDir));

// ------------------ IN-MEMORY STORAGE ------------------
const imageCache = new Map();

// simple friend mapping
const friendsMap = new Map([
  ["id1", "id2"],
  ["id2", "id1"],
]);

// ------------------ MULTER CONFIG ------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueString = Math.random().toString(36).substring(7);
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);

    cb(null, `image-${name}-${timestamp}-${uniqueString}${ext}`);
  },
});

const upload = multer({ storage });

// ------------------ ROUTES ------------------

// Upload image
app.post("/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const userID = req.body.userID;
    if (!userID) {
      return res.status(400).json({
        success: false,
        message: "Missing userID",
      });
    }

    const imagePath = `/uploads/${req.file.filename}`;
    imageCache.set(userID, imagePath);

    res.json({
      success: true,
      message: "Image uploaded successfully",
      imagePath,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
});

// Drop image for receiver
app.get("/drop/:receiverID", (req, res) => {
  try {
    const receiverID = req.params.receiverID;
    const senderID = friendsMap.get(receiverID);

    if (!senderID) {
      return res.json({
        success: false,
        message: "No friend mapping found",
      });
    }

    const imagePath = imageCache.get(senderID);

    if (!imagePath) {
      return res.json({
        success: false,
        message: "No image available from your friend",
      });
    }

    // remove from cache after drop
    imageCache.delete(senderID);

    res.json({
      success: true,
      imagePath,
      message: "Image received",
    });
  } catch (error) {
    console.error("Drop error:", error);
    res.status(500).json({
      success: false,
      message: "Drop failed",
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// ------------------ START SERVER ------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
