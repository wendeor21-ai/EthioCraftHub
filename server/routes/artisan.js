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
    fileSize: 50 * 1024 * 1024 // 50MB for video and high-res media support
  },
  fileFilter: (req, file, cb) => {
    const allowedExt = /\.(jpe?g|png|webp|gif|jfif|heic|heif|bmp|tiff|pdf|mp4|mov|quicktime|webm|m4v|avi|mkv|3gp)$/i;
    const extMatch = allowedExt.test(path.extname(file.originalname).toLowerCase());
    const isMediaMime = !file.mimetype || 
                        file.mimetype.startsWith('image/') || 
                        file.mimetype.startsWith('video/') || 
                        file.mimetype === 'application/pdf' ||
                        file.mimetype === 'application/octet-stream';

    if (extMatch || isMediaMime) {
      return cb(null, true);
    } else {
      cb(new Error('Supported formats: JPG, PNG, WEBP, PDF, and Videos (MP4, MOV, WEBM)'));
    }
  }
});

// Safe multer wrapper with structured error response
const uploadVerificationDocs = (req, res, next) => {
  upload.fields([
    { name: 'identity', maxCount: 1 },
    { name: 'tradeLicense', maxCount: 1 },
    { name: 'tinCertificate', maxCount: 1 },
    { name: 'productPhotos', maxCount: 5 },
    { name: 'workVideos', maxCount: 2 }
  ])(req, res, (err) => {
    if (err) {
      console.error('❌ Multer verification upload error:', err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large',
          message: 'One or more files exceed the 50MB limit. Please upload a smaller video or photo.'
        });
      }
      return res.status(400).json({
        error: 'Upload error',
        message: err.message || 'Error processing uploaded files'
      });
    }
    next();
  });
};

/**
 * @route   POST /api/artisan/verify-submit
 * @desc    Submit artisan verification with comprehensive documents
 * @access  Private (Artisan only)
 */
router.post(
  '/verify-submit',
  authenticate,
  uploadVerificationDocs,
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

    // Find user to merge data and check existing documents if any
    let user = req.user;
    if (!user || !user.profile) {
      user = await User.findById(req.user._id) || (req.user.email ? await User.findByEmail(req.user.email) : null);
    }
    if (!user) return res.status(404).json({ error: 'User not found', message: 'User account not found' });
    const targetUserId = String(user._id || user.id || req.user._id || req.user.id);

    // Validation
    const hasIdentityFile = req.files?.identity && req.files.identity.length > 0;
    const hasTradeLicenseFile = req.files?.tradeLicense && req.files.tradeLicense.length > 0;
    const existingId = user.verification?.identityCard || user.verification?.documents?.[0];
    const existingLicense = user.verification?.tradeLicense;

    if (!hasIdentityFile && !existingId) {
      return res.status(400).json({ error: 'Validation failed', message: 'Identity document is required.' });
    }
    if (!hasTradeLicenseFile && !existingLicense) {
      return res.status(400).json({ error: 'Validation failed', message: 'Trade License is required to operate on EthioCraft Global.' });
    }

    // Bank account: digits only, 13–16 digits
    if (accountNumber) {
      const digits = String(accountNumber).replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 16) {
        return res.status(400).json({ error: 'Validation failed', message: 'Please enter a valid 13–16 digit Ethiopian bank account number.' });
      }
    }

    // Telebirr: must start with 09 or 07 and be exactly 10 digits
    if (telebirrNumber && !/^(09|07)\d{8}$/.test(telebirrNumber)) {
      return res.status(400).json({ error: 'Validation failed', message: 'Telebirr number must start with 09 or 07 and be exactly 10 digits.' });
    }

    // Get file paths helper
    const getPath = (field) => req.files?.[field]?.[0] ? `/uploads/verification/${req.files[field][0].filename}` : null;
    const getPaths = (field) => req.files?.[field] ? req.files[field].map(f => `/uploads/verification/${f.filename}`) : [];

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

    // Find the exact user in Prisma by ID or email
    const { prisma } = require('../lib/prisma');
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(targetUserId ? [{ id: targetUserId }] : []),
          ...(user.email ? [{ email: String(user.email).toLowerCase().trim() }] : []),
          ...(req.user?.email ? [{ email: String(req.user.email).toLowerCase().trim() }] : []),
        ]
      }
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found', message: 'User record not found in database' });
    }

    const actualDbId = dbUser.id;
    await prisma.user.update({
      where: { id: actualDbId },
      data: {
        profile: updatedProfile,
        bankDetails: updatedBankDetails,
        verification: updatedVerification,
      },
    });

    // Also update MongoCompat cache/document
    try {
      await User.findByIdAndUpdate(actualDbId, {
        profile: updatedProfile,
        bankDetails: updatedBankDetails,
        verification: updatedVerification,
      });
    } catch (mcErr) {}

    console.log('✅ Artisan verification updated successfully for user:', dbUser.email, 'Status: pending');

    res.status(200).json({
      success: true,
      message: 'Verification submitted successfully. Your account is now under review.',
      verification: updatedVerification,
      user: {
        id: dbUser.id,
        _id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        profile: updatedProfile,
        bankDetails: updatedBankDetails,
        verification: updatedVerification,
        hasAcceptedGuidelines: dbUser.hasAcceptedGuidelines === true,
      }
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
    const userId = String(req.user._id || req.user.id);
    const { prisma } = require('../lib/prisma');
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { hasAcceptedGuidelines: true }
      });
    } catch (pe) {
      console.warn('Prisma accept-guidelines fallback:', pe.message);
    }
    await User.findByIdAndUpdate(userId, { hasAcceptedGuidelines: true });
    res.status(200).json({ success: true, message: 'Guidelines accepted.', hasAcceptedGuidelines: true });
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
