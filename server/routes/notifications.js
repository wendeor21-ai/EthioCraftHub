const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const readJson = (name, fallback) => {
  const p = path.join(dataDir, name + ".json");
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p));
  } catch (e) {
    console.error("readJson", p, e);
  }
  return fallback;
};

// Public endpoint for broadcasts
router.get("/broadcasts", (req, res) => {
  const broadcasts = readJson("broadcasts", []);
  // filter active broadcasts; for now return all
  res.json({ broadcasts });
});

// Public endpoint for platform settings (safe to expose basic branding info)
router.get("/platform-settings", (req, res) => {
  const settings = readJson("platform-settings", {
    name: "EthioCraft",
    contactEmail: "",
    currency: "ETB",
    region: "ET",
    logoUrl: "",
  });

  // Ensure logoUrl is a full path if it starts with /uploads
  if (settings.logoUrl && settings.logoUrl.startsWith('/uploads')) {
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`;
    settings.logoUrl = `${backendUrl}${settings.logoUrl}`;
  }

  res.json({ settings });
});

module.exports = router;
