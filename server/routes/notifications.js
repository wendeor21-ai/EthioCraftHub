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

const writeJson = (name, data) => {
  const p = path.join(dataDir, name + ".json");
  try {
    fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("writeJson", p, e);
  }
};

// Public endpoint for broadcasts with auto-expiration
router.get("/broadcasts", (req, res) => {
  const broadcasts = readJson("broadcasts", []);
  const now = Date.now();
  
  // Filter active (non-expired) broadcasts
  const active = broadcasts.filter((b) => {
    if (!b.expiresAt) return true;
    return new Date(b.expiresAt).getTime() > now;
  });

  // If any expired, clean up JSON storage silently
  if (active.length !== broadcasts.length) {
    writeJson("broadcasts", active);
  }

  res.json({ broadcasts: active });
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

  // Ensure logoUrl is clean relative path without localhost
  if (settings.logoUrl) {
    settings.logoUrl = settings.logoUrl.replace(/^https?:\/\/localhost(:\d+)?/i, '').replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/i, '');
  }

  res.json({ settings });
});

module.exports = router;
