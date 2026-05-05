/**
 * Artisan Settings Controller
 * Handles store profile, bank setup, notifications, and security settings
 */

const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");
const bcrypt = require("bcryptjs");

/**
 * @route   GET /api/artisan/settings
 * @desc    Get artisan settings
 * @access  Private (Artisan)
 */
exports.getSettings = asyncHandler(async (req, res) => {
  const artisan = await User.findById(req.user._id).select("-password").lean();

  if (!artisan) {
    return res.status(404).json({
      success: false,
      error: "Artisan not found",
    });
  }

  res.json({
    success: true,
    data: {
      profile: artisan.profile,
      bankDetails: artisan.bankDetails || {},
      notifications: artisan.notificationPreferences || {},
      security: {
        twoFactorEnabled: artisan.twoFactorEnabled || false,
        lastPasswordChange: artisan.lastPasswordChange,
      },
      vacationMode: artisan.vacationMode || false,
      socialLinks: artisan.socialLinks || {},
    },
  });
});

/**
 * @route   PATCH /api/artisan/settings/profile
 * @desc    Update store profile with validation
 * @access  Private (Artisan)
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const {
    storeName,
    storeDescription,
    storeLogo,
    coverBanner,
    phone,
    address,
    experienceYears,
    totalProducts,
    traditionsPreserved,
    workshopGallery,
    isVerifiedArtisan,
  } = req.body;

  // Validation rules
  const errors = [];

  // Store Name validation (optional but if provided must be valid)
  if (storeName) {
    if (storeName.length < 3 || storeName.length > 50) {
      errors.push("Store name must be between 3 and 50 characters");
    }
  }

  // Phone validation (Ethiopian format)
  if (phone) {
    const phoneRegex = /^(\+2519|\+2517|09|07)\d{8}$/;
    if (!phoneRegex.test(phone)) {
      errors.push(
        "Phone number must be a valid Ethiopian phone number (e.g., +251912345678 or 0912345678)",
      );
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      errors: errors,
    });
  }

  const artisan = await User.findById(req.user._id);

  if (!artisan) {
    return res.status(404).json({
      success: false,
      error: "Artisan not found",
    });
  }

  // Update profile fields
  if (storeName !== undefined) artisan.profile.storeName = storeName;
  if (storeDescription !== undefined) artisan.profile.bio = storeDescription;
  if (storeLogo !== undefined) artisan.profile.storeLogo = storeLogo;
  if (coverBanner !== undefined) artisan.profile.coverBanner = coverBanner;
  if (phone !== undefined) {
    artisan.profile.phone = phone;
    artisan.profile.phoneNumber = phone; // sync both fields for consistency
  }
  if (address) {
    if (!artisan.profile.address) artisan.profile.address = {};
    if (address.street !== undefined) artisan.profile.address.street = address.street;
    if (address.city !== undefined) artisan.profile.address.city = address.city;
    if (address.region !== undefined) artisan.profile.address.region = address.region;
    if (address.country !== undefined) artisan.profile.address.country = address.country;
  }
  
  // Update new artisan fields
  if (experienceYears !== undefined) artisan.profile.experienceYears = experienceYears;
  if (totalProducts !== undefined) artisan.profile.totalProducts = totalProducts;
  if (traditionsPreserved !== undefined) artisan.profile.traditionsPreserved = traditionsPreserved;
  if (workshopGallery !== undefined) artisan.profile.workshopGallery = workshopGallery;
  if (isVerifiedArtisan !== undefined) artisan.profile.isVerifiedArtisan = isVerifiedArtisan;

  await artisan.save();

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: {
      profile: artisan.profile,
    },
  });
});

/**
 * @route   PATCH /api/artisan/settings/bank
 * @desc    Update bank details with strict validation
 * @access  Private (Artisan)
 */
exports.updateBankDetails = asyncHandler(async (req, res) => {
  const { bankName, accountHolderName, accountNumber, telebirrNumber, merchantId } =
    req.body;

  // Validation rules
  const errors = [];

  // Account Holder Name validation
  if (accountHolderName) {
    if (accountHolderName.length < 3) {
      errors.push("Account holder name must be at least 3 characters");
    }
    if (!/^[a-zA-Z\s]+$/.test(accountHolderName)) {
      errors.push("Account holder name must contain only letters");
    }
  }

  // Bank Name validation (must be from predefined list)
  const validBanks = [
    "Commercial Bank of Ethiopia (CBE)",
    "Abyssinia Bank",
    "Awash Bank",
    "Dashen Bank",
    "Bank of Abyssinia",
    "Wegagen Bank",
    "United Bank",
    "Nib International Bank",
    "Cooperative Bank of Oromia",
    "Lion International Bank",
    "Oromia International Bank",
    "Zemen Bank",
    "Bunna International Bank",
    "Berhan International Bank",
    "Abay Bank",
    "Addis International Bank",
    "Debub Global Bank",
    "Enat Bank",
    "Gadaa Bank",
    "Hijra Bank",
    "Shabelle Bank",
    "Siinqee Bank",
    "Tsehay Bank",
    "Telebirr",
  ];

  if (bankName && !validBanks.includes(bankName)) {
    errors.push("Please select a valid bank from the list");
  }

  // Account Number validation
  if (accountNumber) {
    if (!/^\d+$/.test(accountNumber)) {
      errors.push("Account number must contain only digits");
    }
    if (accountNumber.length < 10 || accountNumber.length > 15) {
      errors.push("Account number must be between 10 and 15 digits");
    }
  }

  // Telebirr Number validation (Ethiopian phone format)
  if (telebirrNumber) {
    const phoneRegex = /^(\+2519|\+2517|09|07)\d{8}$/;
    if (!phoneRegex.test(telebirrNumber)) {
      errors.push(
        "Telebirr number must be a valid Ethiopian phone number (e.g., +251912345678 or 0912345678)",
      );
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      errors: errors,
    });
  }

  const artisan = await User.findById(req.user._id);

  if (!artisan) {
    return res.status(404).json({
      success: false,
      error: "Artisan not found",
    });
  }

  // Update bank details
  artisan.bankDetails = {
    bankName: bankName || artisan.bankDetails?.bankName,
    accountHolderName:
      accountHolderName || artisan.bankDetails?.accountHolderName,
    accountNumber: accountNumber || artisan.bankDetails?.accountNumber,
    telebirrNumber: telebirrNumber || artisan.bankDetails?.telebirrNumber,
    merchantId: merchantId || artisan.bankDetails?.merchantId,
  };

  await artisan.save();

  res.json({
    success: true,
    message: "Bank details updated successfully",
    data: {
      bankDetails: artisan.bankDetails,
    },
  });
});

/**
 * @route   PATCH /api/artisan/settings/notifications
 * @desc    Update notification preferences
 * @access  Private (Artisan)
 */
exports.updateNotifications = asyncHandler(async (req, res) => {
  const { emailOnNewOrder, emailOnLowStock, emailOnReview, emailOnWithdrawal } =
    req.body;

  const artisan = await User.findById(req.user._id);

  if (!artisan) {
    return res.status(404).json({
      success: false,
      error: "Artisan not found",
    });
  }

  artisan.notificationPreferences = {
    emailOnNewOrder:
      emailOnNewOrder !== undefined
        ? emailOnNewOrder
        : artisan.notificationPreferences?.emailOnNewOrder,
    emailOnLowStock:
      emailOnLowStock !== undefined
        ? emailOnLowStock
        : artisan.notificationPreferences?.emailOnLowStock,
    emailOnReview:
      emailOnReview !== undefined
        ? emailOnReview
        : artisan.notificationPreferences?.emailOnReview,
    emailOnWithdrawal:
      emailOnWithdrawal !== undefined
        ? emailOnWithdrawal
        : artisan.notificationPreferences?.emailOnWithdrawal,
  };

  await artisan.save();

  res.json({
    success: true,
    message: "Notification preferences updated",
    data: {
      notifications: artisan.notificationPreferences,
    },
  });
});

/**
 * @route   POST /api/artisan/settings/change-password
 * @desc    Change password with strict validation
 * @access  Private (Artisan)
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: "Please provide current and new password",
    });
  }

  // Strict password validation
  const errors = [];

  if (newPassword.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(newPassword)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(newPassword)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(newPassword)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
    errors.push("Password must contain at least one special character");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: "Password validation failed",
      errors: errors,
    });
  }

  // Get user with password - use findById like auth endpoint does
  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  // Verify current password using comparePassword method like auth endpoint
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(401).json({
      success: false,
      error: "Current password is incorrect",
    });
  }

  // Update password - EXACT same way as auth endpoint
  user.password = newPassword;
  user.mustChangePassword = false;
  user.tempPasswordExpiry = undefined;
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastPasswordChange = new Date();
  await user.save();

  res.json({
    success: true,
    message: "Password changed successfully",
  });
});

/**
 * @route   PATCH /api/artisan/settings/vacation-mode
 * @desc    Toggle vacation mode
 * @access  Private (Artisan)
 */
exports.toggleVacationMode = asyncHandler(async (req, res) => {
  const { enabled } = req.body;

  const artisan = await User.findById(req.user._id);

  if (!artisan) {
    return res.status(404).json({
      success: false,
      error: "Artisan not found",
    });
  }

  artisan.vacationMode = enabled;

  await artisan.save();

  res.json({
    success: true,
    message: `Vacation mode ${enabled ? "enabled" : "disabled"}`,
    data: {
      vacationMode: artisan.vacationMode,
    },
  });
});

/**
 * @route   PATCH /api/artisan/settings/social-links
 * @desc    Update social media links
 * @access  Private (Artisan)
 */
exports.updateSocialLinks = asyncHandler(async (req, res) => {
  const { instagram, facebook, twitter, website } = req.body;

  const artisan = await User.findById(req.user._id);

  if (!artisan) {
    return res.status(404).json({
      success: false,
      error: "Artisan not found",
    });
  }

  artisan.socialLinks = {
    instagram: instagram || artisan.socialLinks?.instagram,
    facebook: facebook || artisan.socialLinks?.facebook,
    twitter: twitter || artisan.socialLinks?.twitter,
    website: website || artisan.socialLinks?.website,
  };

  await artisan.save();

  res.json({
    success: true,
    message: "Social links updated successfully",
    data: {
      socialLinks: artisan.socialLinks,
    },
  });
});
