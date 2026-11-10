/**
 * Artisan Routes for EthioCraft Global
 * Handles artisan-specific operations including verification
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/verification');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Increased to 10MB for video support
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|mp4/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPG, PNG), PDF, and MP4 videos are allowed'));
    }
  }
});

/**
 * @route   POST /api/artisan/verify-submit
 * @desc    Submit artisan verification with comprehensive documents
 * @access  Private (Artisan only)
 */
router.post(
  '/verify-submit',
  authenticate,
  upload.fields([
    { name: 'identity', maxCount: 1 },
    { name: 'tradeLicense', maxCount: 1 },
    { name: 'tinCertificate', maxCount: 1 },
    { name: 'productPhotos', maxCount: 5 },
    { name: 'workVideos', maxCount: 2 }
  ]),
  asyncHandler(async (req, res) => {
    console.log('📝 Processing comprehensive artisan verification request...');
    
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ error: 'Access denied', message: 'Only artisans can submit verification' });
    }

    const { 
      businessName, tinNumber, tradeLicenseNumber, 
      bankName, accountHolderName, accountNumber, telebirrNumber,
      termsAccepted 
    } = req.body;

    // Validation
    if (!req.files?.identity) {
      return res.status(400).json({ error: 'Validation failed', message: 'Identity document is required.' });
    }
    if (!req.files?.tradeLicense) {
      return res.status(400).json({ error: 'Validation failed', message: 'Trade License is required to operate on EthioCraft Global.' });
    }

    // Bank account: digits only, 13–16 digits
    if (accountNumber) {
      const digits = accountNumber.replace(/\D/g, '');
      if (!/^\d+$/.test(accountNumber) || digits.length < 13 || digits.length > 16) {
        return res.status(400).json({ error: 'Validation failed', message: 'Please enter a valid 13–16 digit Ethiopian bank account number.' });
      }
    }

    // Telebirr: must start with 09 or 07 and be exactly 10 digits
    if (telebirrNumber && !/^(09|07)\d{8}$/.test(telebirrNumber)) {
      return res.status(400).json({ error: 'Validation failed', message: 'Telebirr number must start with 09 or 07 and be exactly 10 digits.' });
    }

    // Get file paths helper
    const getPath = (field) => req.files[field] ? `/uploads/verification/${req.files[field][0].filename}` : null;
    const getPaths = (field) => req.files[field] ? req.files[field].map(f => `/uploads/verification/${f.filename}`) : [];

    // Find and update user
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 1. Update Profile/Business Info — safely merge with existing data
    const existingProfile = user.profile || {};
    const existingBusinessInfo = existingProfile.businessInfo || {};
    const updatedProfile = {
      ...existingProfile,
      businessInfo: {
        ...existingBusinessInfo,
        businessName: businessName || existingBusinessInfo.businessName || '',
        tinNumber: tinNumber || existingBusinessInfo.tinNumber || '',
        tradeLicenseNumber: tradeLicenseNumber || existingBusinessInfo.tradeLicenseNumber || '',
      }
    };

    // 2. Update Bank/Payment Details — safely merge with existing data
    const existingBankDetails = user.bankDetails || {};
    const updatedBankDetails = {
      ...existingBankDetails,
      bankName: bankName || existingBankDetails.bankName || '',
      accountHolderName: accountHolderName || existingBankDetails.accountHolderName || '',
      accountNumber: accountNumber || existingBankDetails.accountNumber || '',
      telebirrNumber: telebirrNumber || existingBankDetails.telebirrNumber || '',
      updatedAt: new Date(),
    };

    // 3. Build verification object
    const photos = getPaths('productPhotos');
    const videos = getPaths('workVideos');
    const updatedVerification = {
      status: 'pending',
      submittedAt: new Date(),
      identityCard: getPath('identity'),
      tradeLicense: getPath('tradeLicense'),
      tinCertificate: getPath('tinCertificate'),
      productPhotos: photos,
      workVideos: videos,
      termsAccepted: termsAccepted === 'true' || termsAccepted === true,
      documents: [getPath('identity'), getPath('tradeLicense'), getPath('tinCertificate'), ...photos, ...videos].filter(Boolean),
      feedback: '',
    };

    // Use Prisma directly to avoid MongoCompat nested JSON mutation issues
    const { prisma } = require('../lib/prisma');
    await prisma.user.update({
      where: { id: String(req.user._id) },
      data: {
        profile: updatedProfile,
        bankDetails: updatedBankDetails,
        verification: updatedVerification,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Verification submitted successfully. Your account is now under review.',
      verification: updatedVerification,
    });
  })
);

/**
 * @route   POST /api/artisan/accept-guidelines
 * @desc    Mark that the artisan has read and accepted the platform guidelines
 * @access  Private (Artisan only)
 */
router.post(
  '/accept-guidelines',
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ error: 'Access denied' });
    }
    await User.findByIdAndUpdate(req.user._id, { hasAcceptedGuidelines: true });
    res.status(200).json({ success: true, message: 'Guidelines accepted.' });
  })
);

/**
 * @route   GET /api/artisan/status
 * @desc    Get the current artisan's verification status
 * @access  Private (Artisan only)
 */
router.get(
  '/status',
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ error: 'Access denied', message: 'Only artisans can access this endpoint' });
    }

    const user = await User.findById(req.user._id).select('verification');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const status = user.verification?.status || 'none';
    const hasSubmitted = !['none', 'not_submitted'].includes(status);

    res.status(200).json({
      success: true,
      status,
      hasSubmitted,
      submittedAt: user.verification?.submittedAt || null,
      feedback: user.verification?.feedback || null,
    });
  })
);

module.exports = router;
