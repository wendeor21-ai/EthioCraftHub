const fs = require('fs');
const path = require('path');
let SiteConfig;
try {
  SiteConfig = require('../models/SiteConfig');
} catch (e) {
  SiteConfig = null;
}

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const CONFIG_FILE = path.join(dataDir, 'homepage-config.json');

const getDefaultConfig = () => ({
  configType: 'homepage',
  heroTitle: 'Authentic Ethiopian Artisan Crafts',
  heroSubtitle: 'Handmade textiles, leather goods, pottery, and jewelry directly from verified artisans.',
  heroSlides: [
    {
      title_en: 'Authentic Ethiopian Crafts',
      title_am: 'ትክክለኛ የኢትዮጵያ የእጅ ጥበብ ውጤቶች',
      description_en: 'Directly from verified master artisans across Ethiopia',
      description_am: 'ከተረጋገጡ የኢትዮጵያ የእጅ ጥበብ ባለሙያዎች በቀጥታ',
      badge_en: 'Featured',
      badge_am: 'ተመራጭ',
      cta_en: 'Explore Marketplace',
      cta_am: 'ምርቶችን ይመልከቱ',
      link: '/products',
      image: '/images/hero/hero-bg.jpg'
    }
  ],
  headerLogo: '/logo192.png',
  footerLogo: '/logo192.png',
  heritageTitle_en: 'Centuries of Living Heritage',
  heritageTitle_am: 'የዘመናት ጥበባዊ ቅርስ',
  heritageDescription_en: 'Every piece tells a story of generation-to-generation heritage.',
  heritageDescription_am: 'እያንዳንዱ የእጅ ጥበብ ከትውልድ ወደ ትውልድ የተላለፈ የታሪክና የባህል አሻራ ነው።',
  heritageImage: '/images/heritage.jpg',
  commissionRate: 5
});

const readConfigFile = () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not read homepage-config.json:', err.message);
  }
  return getDefaultConfig();
};

const writeConfigFile = (data) => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Could not write homepage-config.json:', err.message);
    return false;
  }
};

// @desc    Get homepage configuration
// @route   GET /api/settings/homepage
// @access  Public
exports.getHomepageConfig = async (req, res) => {
  try {
    let data = readConfigFile();

    // If MongoDB is connected and has data, sync it
    if (SiteConfig && typeof SiteConfig.findOne === 'function') {
      try {
        const mongoConfig = await SiteConfig.findOne({ configType: 'homepage' }).maxTimeMS(2000);
        if (mongoConfig) {
          data = { ...data, ...mongoConfig.toObject() };
        }
      } catch (dbErr) {
        // silently fallback to file
      }
    }

    const cleanUrl = (url) => {
      if (!url || typeof url !== 'string') return url;
      return url
        .replace(/^https?:\/\/localhost(:\d+)?/i, '')
        .replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/i, '')
        .replace(/^https?:\/\/ethiocrafthub\.com/i, '');
    };

    data.headerLogo = cleanUrl(data.headerLogo);
    data.footerLogo = cleanUrl(data.footerLogo);
    data.heritageImage = cleanUrl(data.heritageImage);
    if (Array.isArray(data.heroSlides)) {
      data.heroSlides = data.heroSlides.map(s => ({ ...s, image: cleanUrl(s.image) }));
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching homepage config:', error.message);
    return res.status(200).json({
      success: true,
      data: getDefaultConfig()
    });
  }
};

// @desc    Update homepage configuration
// @route   PUT /api/admin/settings/homepage
// @access  Private/Admin
exports.updateHomepageConfig = async (req, res) => {
  try {
    const existing = readConfigFile();
    const stripUrl = (url) => {
      if (!url || typeof url !== 'string') return url;
      return url
        .replace(/^https?:\/\/localhost(:\d+)?/i, '')
        .replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/i, '')
        .replace(/^https?:\/\/ethiocrafthub\.com/i, '');
    };

    const updated = {
      ...existing,
      ...req.body
    };

    if (req.body.heroSlides && Array.isArray(req.body.heroSlides)) {
      updated.heroSlides = req.body.heroSlides.map(s => ({ ...s, image: stripUrl(s.image) }));
    }

    if (req.body.headerLogo !== undefined) updated.headerLogo = stripUrl(req.body.headerLogo);
    if (req.body.footerLogo !== undefined) updated.footerLogo = stripUrl(req.body.footerLogo);
    if (req.body.heritageImage !== undefined) updated.heritageImage = stripUrl(req.body.heritageImage);

    // Save to file storage
    writeConfigFile(updated);

    // Also attempt MongoDB if connected
    if (SiteConfig && typeof SiteConfig.findOneAndUpdate === 'function') {
      try {
        await SiteConfig.findOneAndUpdate(
          { configType: 'homepage' },
          { $set: updated },
          { upsert: true, new: true }
        ).maxTimeMS(2000);
      } catch (dbErr) {
        // file write was already successful
      }
    }

    const cleanUrl = (url) => {
      if (!url || typeof url !== 'string') return url;
      return url
        .replace(/^https?:\/\/localhost(:\d+)?/i, '')
        .replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/i, '')
        .replace(/^https?:\/\/ethiocrafthub\.com/i, '');
    };

    const responseData = { ...updated };
    responseData.headerLogo = cleanUrl(responseData.headerLogo);
    responseData.footerLogo = cleanUrl(responseData.footerLogo);
    responseData.heritageImage = cleanUrl(responseData.heritageImage);
    if (Array.isArray(responseData.heroSlides)) {
      responseData.heroSlides = responseData.heroSlides.map(s => ({ ...s, image: cleanUrl(s.image) }));
    }

    res.status(200).json({
      success: true,
      data: responseData,
      message: 'Homepage configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating homepage config:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Reset homepage config to defaults
// @route   POST /api/admin/settings/homepage/reset
// @access  Private/Admin
exports.resetHomepageConfig = async (req, res) => {
  try {
    const defaults = getDefaultConfig();
    writeConfigFile(defaults);
    res.status(200).json({
      success: true,
      data: defaults,
      message: 'Configuration reset to localized defaults'
    });
  } catch (error) {
    console.error('Error resetting homepage config:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Upload logo for site config
// @route   POST /api/admin/settings/upload-logo
// @access  Private/Admin
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const url = `/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      url: url
    });
  } catch (error) {
    console.error('Error uploading site logo:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
