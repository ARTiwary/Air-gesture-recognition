const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;

/* -------------------- CORS -------------------- */
app.use(
  cors({
    origin: "*", // allow Netlify + mobile browsers
    methods: ["GET", "POST"],
  })
);

/* -------------------- Body parser -------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------- Upload folder -------------------- */
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/* -------------------- Multer config -------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/* -------------------- Routes -------------------- */
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  res.status(200).json({
    message: "File uploaded successfully",
    file: req.file.filename,
  });
});

/* -------------------- Start server -------------------- */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
