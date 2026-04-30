/*
Script: fillMissingUploads.js
Scans User.verification.documents and creates placeholder images in server/uploads
for any missing filenames so the Admin UI can open them during testing.

Usage:
  node server/scripts/fillMissingUploads.js

Make sure MONGODB_URI is set in your environment or in a .env file.
*/

const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const User = require("../models/User");

const uploadsDir = path.join(__dirname, "..", "uploads");
const publicImagesDir = path.join(__dirname, "..", "public", "images");

async function main() {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/ethiocraft";
  console.log("Connecting to MongoDB:", mongoUri);
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    // Ensure uploads dir exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log("Created uploads directory:", uploadsDir);
    }

    const users = await User.find({
      "verification.documents.0": { $exists: true },
    }).select("verification");
    console.log(`Found ${users.length} users with verification documents`);

    const placeholderBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="; // 1x1 PNG
    const placeholderBuffer = Buffer.from(placeholderBase64, "base64");

    const missingFiles = new Set();

    for (const u of users) {
      const docs = (u.verification && u.verification.documents) || [];
      for (const doc of docs) {
        if (!doc) continue;
        const fileName = String(doc).split("/").pop();
        const uploadPath = path.join(uploadsDir, fileName);
        const publicPath = path.join(publicImagesDir, fileName);

        const existsInUploads = fs.existsSync(uploadPath);
        const existsInPublic = fs.existsSync(publicPath);

        if (!existsInUploads && !existsInPublic) {
          missingFiles.add(fileName);
        }
      }
    }

    if (missingFiles.size === 0) {
      console.log("No missing files found. Nothing to do.");
    } else {
      console.log(
        `Creating ${missingFiles.size} placeholder files in uploads:`,
      );
      for (const fileName of missingFiles) {
        const dest = path.join(uploadsDir, fileName);
        try {
          fs.writeFileSync(dest, placeholderBuffer);
          console.log("  +", fileName);
        } catch (err) {
          console.error("Failed to create", dest, err.message);
        }
      }
      console.log("Placeholders created. Restart server and retry Admin UI.");
    }
  } catch (err) {
    console.error("Error scanning users or creating placeholders:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
