import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;



app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://air-gesture-drop.netlify.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));


app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const uploadsDir = process.env.NODE_ENV === "production"
  ? "/tmp/uploads"
  : path.join(__dirname, "uploads");


if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, {recursive: true});
}


app.use("/uploads", express.static(uploadsDir));


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


app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// ------------------ START SERVER ------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
