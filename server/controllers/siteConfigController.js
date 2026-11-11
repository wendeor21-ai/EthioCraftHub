const SiteConfig = require('../models/SiteConfig');

// @desc    Get homepage configuration
// @route   GET /api/settings/homepage
// @access  Public
exports.getHomepageConfig = async (req, res) => {
  try {
    let config = await SiteConfig.findOne({ configType: 'homepage' });
    
    // If it doesn't exist yet, create the default document
    if (!config) {
      config = await SiteConfig.create({ configType: 'homepage' });
    }
    
    res.status(200).json({
      success: true,
      data: (() => {
        const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`;
        const data = config.toObject();
        const addPrefix = (url) => {
          if (url && (url.startsWith('/uploads') || url.startsWith('uploads'))) {
            const prefix = url.startsWith('/') ? '' : '/';
            return `${backendUrl}${prefix}${url}`;
          }
          return url;
        };

        data.headerLogo = addPrefix(data.headerLogo);
        data.footerLogo = addPrefix(data.footerLogo);
        data.heritageImage = addPrefix(data.heritageImage);
        if (data.heroSlides) {
          data.heroSlides = data.heroSlides.map(s => ({ ...s, image: addPrefix(s.image) }));
        }
        return data;
      })()
    });
  } catch (error) {
    console.error('Error fetching homepage config:', error.message);
    // Return safe default homepage config so frontend never fails with 500 or 503
    return res.status(200).json({
      success: true,
      data: {
        heroTitle: "Authentic Ethiopian Artisan Crafts",
        heroSubtitle: "Handmade textiles, leather goods, pottery, and jewelry directly from verified artisans.",
        heroSlides: [],
        headerLogo: "/logo192.png",
        footerLogo: "/logo192.png",
      }
    });
  }
};

// @desc    Update homepage configuration
// @route   PUT /api/admin/settings/homepage
// @access  Private/Admin
exports.updateHomepageConfig = async (req, res) => {
  try {
    const { 
      heroSlides, 
      heritageImage,
      headerLogo,
      footerLogo,
      commissionRate
    } = req.body;

    let config = await SiteConfig.findOne({ configType: 'homepage' });
    
    if (!config) {
      config = new SiteConfig({ configType: 'homepage' });
    }

    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`;
    const stripUrl = (url) => {
      if (url && typeof url === 'string' && url.startsWith('http')) {
        return url.replace(backendUrl, '').replace(process.env.BACKEND_URL, '');
      }
      return url;
    };

    if (heroSlides) config.heroSlides = heroSlides.map(s => ({ ...s, image: stripUrl(s.image) }));
    
    // Support localized heritage fields
    ['en', 'am', 'or', 'ti'].forEach(lang => {
      if (req.body[`heritageTitle_${lang}`] !== undefined) config[`heritageTitle_${lang}`] = req.body[`heritageTitle_${lang}`];
      if (req.body[`heritageDescription_${lang}`] !== undefined) config[`heritageDescription_${lang}`] = req.body[`heritageDescription_${lang}`];
    });

    if (heritageImage) config.heritageImage = stripUrl(heritageImage);
    if (headerLogo !== undefined) config.headerLogo = stripUrl(headerLogo);
    if (footerLogo !== undefined) config.footerLogo = stripUrl(footerLogo);
    if (commissionRate !== undefined) config.commissionRate = commissionRate;

    await config.save();
    
    // For response, return full URLs using the same logic as getHomepageConfig
    const responseData = config.toObject();
    const addPrefix = (url) => {
      if (url && typeof url === 'string' && (url.startsWith('/uploads') || url.startsWith('uploads'))) {
        const prefix = url.startsWith('/') ? '' : '/';
        return `${backendUrl}${prefix}${url}`;
      }
      return url;
    };

    responseData.headerLogo = addPrefix(responseData.headerLogo);
    responseData.footerLogo = addPrefix(responseData.footerLogo);
    responseData.heritageImage = addPrefix(responseData.heritageImage);
    if (responseData.heroSlides) {
      responseData.heroSlides = responseData.heroSlides.map(s => ({ ...s, image: addPrefix(s.image) }));
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
    await SiteConfig.deleteOne({ configType: 'homepage' });
    const config = await SiteConfig.create({ configType: 'homepage' });
    
    res.status(200).json({
      success: true,
      data: config,
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
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`;
    const fullUrl = `${backendUrl}${url}`;

    res.status(200).json({
      success: true,
      url: fullUrl
    });
  } catch (error) {
    console.error('Error uploading site logo:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
