const express = require("express");
const multer = require("multer");
const path = require("path");
const { authenticate } = require("../middleware/auth");

// optional Cloudinary integration
let cloudinary;
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary = require("cloudinary").v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("⚡ Cloudinary configured for uploads");
}

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "uploads");
const fs = require("fs");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safeName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    cb(null, safeName);
  },
});

const upload = multer({ storage });

// POST /api/uploads - upload one or more files (authenticated)
router.post("/", authenticate, upload.array("files", 10), async (req, res) => {
  try {
    // if cloudinary is configured, upload each file there instead of returning local path
    if (cloudinary) {
      const uploaded = [];
      for (const file of req.files || []) {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: process.env.CLOUDINARY_UPLOAD_FOLDER || "ethiocraft",
            use_filename: true,
            unique_filename: false,
          });
          // optionally delete local file after upload
          try {
            require("fs").unlinkSync(file.path);
          } catch (_) {}
          uploaded.push(result.secure_url);
        } catch (e) {
          console.error("Cloudinary upload failed for", file.path, e.message);
          // fall back to local path if cloud upload fails
          uploaded.push(`/uploads/${file.filename}`);
        }
      }
      return res.json({ files: uploaded });
    }

    // otherwise just return local paths as before
    const files = (req.files || []).map((f) => `/uploads/${f.filename}`);
    res.json({ files });
  } catch (err) {
    console.error("Upload error", err);
    res.status(500).json({ error: "Failed to upload files" });
  }
});

module.exports = router;
