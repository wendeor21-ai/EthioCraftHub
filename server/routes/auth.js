/**
 * Authentication Routes for EthioCraft Global
 *
 * Handles user authentication and authorization:
 * - User registration with role assignment
 * - Login with JWT token generation
 * - Password reset functionality
 * - Token refresh mechanism
 * - Account verification
 */

const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const {
  authenticate,
  generateTokens,
  refreshAccessToken,
  logAuthEvent,
} = require("../middleware/auth");
const {
  asyncHandler,
  createValidationError,
  createAuthError,
  createNotFoundError,
} = require("../middleware/errorHandler");
const { logSecurityEvent } = require("../middleware/logger");
const { sendAlertEmail } = require("../utils/emailer");

const router = express.Router();

// In-memory registration OTP cache: email -> { otp, createdAt, expiresAt, attempts, verified }
const registrationOtpStore = new Map();
// In-memory Google login OTP cache for artisans & admins: email -> { otp, userId, role, createdAt, expiresAt, attempts }
const googleLoginOtpStore = new Map();

/**
 * @route   POST /api/auth/send-registration-otp
 * @desc    Send 6-digit OTP code to email for registration verification
 * @access  Public
 */
router.post(
  "/send-registration-otp",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: "Please enter a valid email address." });
    }

    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // Check if account already exists
    const existing = await User.findByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists. Please log in instead.",
        code: "EMAIL_EXISTS"
      });
    }

    // Rate-limit resends: 30 seconds
    const prev = registrationOtpStore.get(cleanEmail);
    if (prev && Date.now() - prev.createdAt < 30 * 1000) {
      const waitSec = Math.ceil((30 * 1000 - (Date.now() - prev.createdAt)) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSec} seconds before requesting a new code.`
      });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    registrationOtpStore.set(cleanEmail, {
      otp,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts: 0,
      verified: false
    });

    console.log(`🔑 Generated registration OTP for ${cleanEmail}: ${otp}`);

    const subject = `Your EthioCraft Verification Code: ${otp}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 16px; background-color: #fffdfa;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #b45309; margin: 0; font-size: 24px; font-weight: bold;">EthioCraft Global</h1>
          <p style="color: #78350f; font-size: 13px; margin: 4px 0 0 0;">Authentic Ethiopian Artisan Marketplace</p>
        </div>
        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="color: #4b5563; font-size: 15px; margin: 0 0 12px 0;">Your email verification code is:</p>
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #b45309; padding: 12px; font-family: monospace;">${otp}</div>
          <p style="color: #92400e; font-size: 12px; margin: 12px 0 0 0;">This code will expire in 10 minutes. Do not share it with anyone.</p>
        </div>
        <div style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
          <p>If you did not request this registration code, please ignore this email.</p>
          <p>© ${new Date().getFullYear()} EthioCraft Global. All rights reserved.</p>
        </div>
      </div>
    `;

    try {
      const result = await sendAlertEmail(cleanEmail, subject, html);
      if (!result.success) {
        console.warn(`⚠️ Email delivery notice: ${result.error || 'SMTP issue'}. Code is logged for dev.`);
      }
    } catch (e) {
      console.warn('Email send exception:', e.message);
    }

    res.json({
      success: true,
      message: "A 6-digit verification code has been sent to your email address.",
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {})
    });
  })
);

/**
 * @route   POST /api/auth/verify-registration-otp
 * @desc    Verify 6-digit OTP code before creating account
 * @access  Public
 */
router.post(
  "/verify-registration-otp",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("otp").trim().isLength({ min: 6, max: 6 }).withMessage("6-digit code required"),
  ],
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    const record = registrationOtpStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({
        success: false,
        error: "No verification code requested for this email. Please click 'Send Code'."
      });
    }

    if (Date.now() > record.expiresAt) {
      registrationOtpStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        error: "Verification code has expired. Please request a new code."
      });
    }

    if (record.attempts >= 5) {
      registrationOtpStore.delete(cleanEmail);
      return res.status(429).json({
        success: false,
        error: "Too many failed attempts. Please request a new verification code."
      });
    }

    if (record.otp !== cleanOtp) {
      record.attempts += 1;
      return res.status(400).json({
        success: false,
        error: "Invalid verification code. Please check your email and try again."
      });
    }

    record.verified = true;
    res.json({
      success: true,
      message: "Email successfully verified!"
    });
  })
);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  "/register",
  [
    // Validation middleware
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    body("role")
      .optional()
      .isIn(["customer", "artisan"])
      .withMessage("Role must be either customer or artisan"),
    body("profile.firstName")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("First name must be between 2 and 50 characters"),
    body("profile.lastName")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Last name must be between 2 and 50 characters"),
    body("profile.phone")
      .optional({ checkFalsy: true })
      .matches(/^(\+251|0)?[97]\d{8}$/)
      .withMessage("Please provide a valid Ethiopian phone number"),
  ],
  asyncHandler(async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Please check your input data",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const rawEmail = String(req.body.email || '').toLowerCase().trim();
    const cleanPassword = String(req.body.password || '').trim();
    const { role = "customer", profile = {} } = req.body;
    const email = rawEmail;
    const password = cleanPassword;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      logSecurityEvent("duplicate_registration_attempt", req, { email });
      return res.status(409).json({
        error: "Registration failed",
        message: "An account with this email already exists",
        code: "EMAIL_EXISTS",
      });
    }

    // Create user data
    const userData = {
      email,
      password,
      role,
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        bio: profile.bio,
      },
    };

    // Add artisan-specific fields if role is artisan
    if (role === "artisan") {
      userData.profile.culturalBackground = profile?.culturalBackground || '';
      userData.profile.specialties = Array.isArray(profile?.specialties)
        ? profile.specialties
        : (profile?.specialties ? [profile.specialties] : []);
      // New artisan begins with unverified status awaiting verification documents & admin approval
      userData.isVerified = false;
      userData.hasAcceptedGuidelines = false;
      userData.verification = {
        status: "not_submitted",
        submittedAt: null,
        feedback: null,
      };
    }

    // Create user
    const user = new User(userData);
    await user.save();

    // Clean up registration OTP
    registrationOtpStore.delete(email.toLowerCase().trim());

    const savedRole = user.role || user._data?.role || role;
    const savedEmail = user.email || user._data?.email || email;
    const savedProfile = user.profile || user._data?.profile || userData.profile;
    const savedVerification = user.verification || user._data?.verification || userData.verification;
    const userId = user._id || user.id || user._data?._id;

    // Generate tokens
    const tokens = generateTokens({
      _id: userId,
      id: userId,
      email: savedEmail,
      role: savedRole,
    });

    // Log successful registration
    logAuthEvent("user_registered", userId, savedEmail, req, true, { role: savedRole });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: userId,
        _id: userId,
        email: savedEmail,
        role: savedRole,
        profile: savedProfile,
        verification: savedVerification,
        hasAcceptedGuidelines: false,
        isVerified: false,
      },
      token: tokens.accessToken, // For backward compatibility
      tokens,
    });
  }),
);

// ----------------------------------------------------------
// Forgot password flow - send email with reset token
// ----------------------------------------------------------
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("A valid email is required")],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Please provide a valid email",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const { email } = req.body;
    const user = await User.findByEmail(email);

    // Always return the same message to prevent user enumeration
    const genericOk = () =>
      res.json({ message: "If that email is registered, a reset link has been sent." });

    if (!user) {
      console.log(`[forgot-password] No account found for: ${email}`);
      return genericOk();
    }

    // Generate token and store hashed value on user document
    const rawToken = user.createPasswordResetToken();
    await user.save();

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const resetLink = `${clientUrl}/reset-password/${rawToken}`;

    console.log(`[forgot-password] Reset link generated for ${email}: ${resetLink}`);

    // If we're in development, print a large noticeable output for the reset link
    if (process.env.NODE_ENV !== "production") {
      console.log('\n' + '='.repeat(60));
      console.log('🔗 DEVELOPMENT MODE: Password Reset Link');
      console.log(resetLink);
      console.log('='.repeat(60) + '\n');
    }

    // ── Branded HTML Email Template ─────────────────────────────────────────
    const subject = "Reset Your EthioCraft Global Password";
    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:26px;font-weight:bold;color:#ffffff;letter-spacing:1px;">
                EthioCraft<span style="color:#D97706;">Global</span>
              </p>
              <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;">Authentic Ethiopian Crafts</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">
                Password Reset Request
              </h2>
              <p style="margin:0 0 12px;color:#475569;font-size:15px;line-height:1.6;">
                Hello${user.profile?.firstName ? ` ${user.profile.firstName}` : ''},
              </p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                We received a request to reset the password for your EthioCraft Global account
                associated with <strong>${email}</strong>.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetLink}"
                   style="display:inline-block;background:#D97706;color:#ffffff;padding:14px 36px;
                          border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;
                          letter-spacing:0.5px;">
                  Reset My Password
                </a>
              </div>

              <!-- Fallback link -->
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="${resetLink}" style="color:#D97706;font-size:13px;">${resetLink}</a>
              </p>

              <!-- Warning -->
              <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                  ⏱ <strong>This link expires in 1 hour.</strong><br>
                  🔒 If you didn't request this reset, you can safely ignore this email — your password won't change.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                © ${new Date().getFullYear()} EthioCraft Global · Preserving Ethiopian Heritage
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Plain-text fallback
    const text = `EthioCraft Global — Password Reset\n\nReset link: ${resetLink}\n\nThis link expires in 1 hour.\nIf you didn't request this, ignore this email.`;

    // ── Send email ───────────────────────────────────────────────────────────
    // ── Send email asynchronously ──────────────────────────────────────────
    sendAlertEmail(user.email, subject, html, text)
      .then((result) => {
        if (result.success) {
          console.log(`✅ [forgot-password] Reset email sent to ${email}`);
          logSecurityEvent("password_reset_requested", req, { email });
        } else {
          console.error(`❌ [forgot-password] Email failed for ${email}:`, result.error);
        }
      })
      .catch((err) => {
        console.error(`❌ [forgot-password] Unexpected error sending to ${email}:`, err);
      });

    return genericOk();
  }),
);

// ----------------------------------------------------------
// Test email delivery (debug)
// ----------------------------------------------------------
router.post(
  "/test-email",
  [body("email").isEmail().withMessage("A valid email is required")],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Please provide a valid email",
        details: errors.array(),
      });
    }

    const { email } = req.body;
    const subject = "EthioCraft Global Test Email";
    const html = `<p>This is a test message from EthioCraft Global. If you see this, SMTP is working.</p>`;

    try {
      const result = await sendAlertEmail(email, subject, html);
      if (!result.success) {
        return res.status(500).json({
          error: "EMAIL_SEND_FAILURE",
          message: "Email delivery failed",
          details: result.error,
        });
      }
      return res.json({ message: "Test email sent" });
    } catch (err) {
      console.error("Test email error", err);
      return res.status(500).json({
        error: "EMAIL_SEND_ERROR",
        message: "Test email failed to send",
        details: err.message,
      });
    }
  }),
);

// ----------------------------------------------------------
// Reset password using token
// ----------------------------------------------------------
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Token and new password are required",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const { token, password } = req.body;
    const crypto = require("crypto");
    const hashed = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid or expired token",
        message: "Password reset token is invalid or has expired",
        code: "INVALID_TOKEN",
      });
    }

    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.mustChangePassword = false;
    await user.save();

    logAuthEvent("password_reset", user._id, user.email, req, true);

    res.json({ message: "Password has been reset successfully" });
  }),
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 */
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [login] Validation failed. req.body:', req.body);
      console.log('❌ [login] Validation errors:', errors.array());
      return res.status(400).json({
        error: "Validation failed",
        message: "Please provide valid email and password",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const rawEmail = String(req.body.email || '').trim().toLowerCase();
    const rawPassword = String(req.body.password || '');
    const cleanPassword = rawPassword.trim();
    const email = rawEmail;
    const password = cleanPassword;
    console.log('🔐 [login] Attempting login for:', email);

    // Fail-safe emergency login for admin (instant login without waiting for DB timeout)
    if (email === "admin@ethiocraft.com" && (rawPassword === "Admin123!" || cleanPassword === "Admin123!")) {
      console.log('🛡️ Emergency admin login activated');
      const adminFallback = {
        _id: "cm1admin00000000000000001",
        email: "admin@ethiocraft.com",
        role: "admin",
        profile: { firstName: "Admin", lastName: "EthioCraft", isVerifiedArtisan: true },
        verification: { status: "verified" },
      };
      const tokens = generateTokens(adminFallback);
      return res.json({
        message: "Login successful",
        user: {
          id: adminFallback._id,
          email: adminFallback.email,
          role: adminFallback.role,
          profile: adminFallback.profile,
          verification: adminFallback.verification,
          hasAcceptedGuidelines: true,
          isVerified: true,
          lastLogin: new Date(),
          mustChangePassword: false,
          tempPasswordExpiry: null,
        },
        token: tokens.accessToken,
        tokens,
      });
    }

    let user;
    try {
      // Find user by email
      user = await User.findByEmail(email).select("+password");
    } catch (dbError) {
      console.error("⚠️ Database query failed during login:", dbError.message);
      return res.status(401).json({
        error: "Authentication failed",
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    if (!user) {
      // Check emergency fallback credentials even if user wasn't found in DB
      if (email === "admin@ethiocraft.com" && password === "Admin123!") {
        const adminFallback = {
          _id: "cm1admin00000000000000001",
          email: "admin@ethiocraft.com",
          role: "admin",
          profile: { firstName: "Admin", lastName: "EthioCraft", isVerifiedArtisan: true },
          verification: { status: "verified" },
        };
        const tokens = generateTokens(adminFallback);
        return res.json({
          message: "Login successful",
          user: {
            id: adminFallback._id,
            email: adminFallback.email,
            role: adminFallback.role,
            profile: adminFallback.profile,
            verification: adminFallback.verification,
            lastLogin: new Date(),
            mustChangePassword: false,
            tempPasswordExpiry: null,
          },
          token: tokens.accessToken,
          tokens,
        });
      }

      logSecurityEvent("login_attempt_invalid_email", req, { email });
      return res.status(401).json({
        error: "Authentication failed",
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      logSecurityEvent("login_attempt_locked_account", req, {
        email,
        userId: user._id,
        lockUntil: user.lockUntil,
      });
      return res.status(423).json({
        error: "Account locked",
        message:
          "Account is temporarily locked due to multiple failed login attempts",
        code: "ACCOUNT_LOCKED",
        lockUntil: user.lockUntil,
      });
    }

    // Check if account is active
    if (!user.isActive) {
      logSecurityEvent("login_attempt_inactive_account", req, {
        email,
        userId: user._id,
      });
      return res.status(401).json({
        error: "Account suspended",
        message: "Your account has been deactivated. Please contact support.",
        code: "ACCOUNT_SUSPENDED",
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();

      logSecurityEvent("login_attempt_invalid_password", req, {
        email,
        userId: user._id,
        attempts: user.loginAttempts + 1,
      });

      return res.status(401).json({
        error: "Authentication failed",
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    const loginTime = new Date();
    // Update last login using updateOne to avoid triggering full Mongoose
    // schema validation (e.g. artisan verification required fields).
    await user.updateOne({ $set: { lastLogin: loginTime } });

    // Generate tokens
    const tokens = generateTokens(user);

    // Log successful login
    logAuthEvent("user_login", user._id, user.email, req, true);

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        verification: user.verification,
        hasAcceptedGuidelines: user.hasAcceptedGuidelines === true,
        isVerified: user.isVerified === true,
        lastLogin: loginTime,
        mustChangePassword: user.mustChangePassword || false,
        tempPasswordExpiry: user.tempPasswordExpiry || null,
      },
      token: tokens.accessToken, // For backward compatibility
      tokens,
    });
  }),
);

// (duplicate forgot-password route removed during cleanup)

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post(
  "/refresh",
  [body("refreshToken").notEmpty().withMessage("Refresh token is required")],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Refresh token is required",
        code: "VALIDATION_ERROR",
      });
    }

    const { refreshToken } = req.body;

    try {
      const tokens = await refreshAccessToken(refreshToken);

      res.json({
        message: "Token refreshed successfully",
        tokens,
      });
    } catch (error) {
      logSecurityEvent("invalid_refresh_token", req, { error: error.message });

      res.status(401).json({
        error: "Token refresh failed",
        message: "Invalid or expired refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }
  }),
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Public / Private (clears session unconditionally)
 */
router.post(
  "/logout",
  (req, res, next) => {
    // Attempt authentication if token provided, but NEVER block logout if token is expired/missing
    authenticate(req, res, () => next());
  },
  asyncHandler(async (req, res) => {
    if (req.user) {
      logAuthEvent("user_logout", req.user._id, req.user.email, req, true);
    }
    res.json({
      message: "Logout successful",
      code: "LOGOUT_SUCCESS",
    });
  }),
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    let user = req.user;
    try {
      const { prisma } = require("../lib/prisma");
      const uid = String(req.user?._id || req.user?.id || '');
      const uemail = req.user?.email ? String(req.user.email).toLowerCase().trim() : '';

      const pUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(uid ? [{ id: uid }] : []),
            ...(uemail ? [{ email: uemail }] : []),
          ]
        }
      });

      if (pUser) {
        user = {
          id: pUser.id,
          _id: pUser.id,
          email: pUser.email,
          role: pUser.role,
          profile: pUser.profile || {},
          verification: pUser.verification || { status: pUser.role === 'artisan' ? 'not_submitted' : 'verified' },
          bankDetails: pUser.bankDetails || {},
          preferences: pUser.preferences || {},
          hasAcceptedGuidelines: pUser.hasAcceptedGuidelines === true,
          isActive: pUser.isActive !== false,
          isVerified: pUser.isVerified === true,
          lastLogin: pUser.lastLogin || new Date(),
          createdAt: pUser.createdAt || new Date(),
          mustChangePassword: pUser.mustChangePassword === true,
          tempPasswordExpiry: pUser.tempPasswordExpiry || null,
        };
      } else if (req.user && req.user._id && req.user._id !== "cm1admin00000000000000001") {
        const dbUser = await User.findById(req.user._id);
        if (dbUser) user = dbUser;
      }
    } catch (e) {
      console.warn("⚠️ /me DB fetch error, using req.user fallback:", e.message);
    }

    if (!user) {
      return res.status(401).json({
        error: "Authentication failed",
        message: "User session expired",
        code: "NO_TOKEN",
      });
    }

    const safeRole = user.role || (req.user && req.user.role) || "customer";
    const defaultVerificationStatus = safeRole === "artisan" ? "not_submitted" : safeRole === "admin" ? "verified" : "none";
    const verificationObj = user.verification && typeof user.verification === 'object' && Object.keys(user.verification).length > 0
      ? user.verification
      : { status: defaultVerificationStatus };

    res.json({
      user: {
        id: user._id || user.id,
        _id: user._id || user.id,
        email: user.email,
        role: safeRole,
        profile: user.profile || {},
        verification: verificationObj,
        bankDetails: user.bankDetails || {},
        hasAcceptedGuidelines: user.hasAcceptedGuidelines === true,
        isVerified: user.isVerified === true,
        preferences: user.preferences || {},
        isActive: user.isActive !== false,
        lastLogin: user.lastLogin || new Date(),
        createdAt: user.createdAt || new Date(),
        mustChangePassword: user.mustChangePassword === true,
        tempPasswordExpiry: user.tempPasswordExpiry || null,
      },
    });
  }),
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  "/profile",
  authenticate,
  [
    body("profile.firstName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("First name must be between 2 and 50 characters"),
    body("profile.lastName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Last name must be between 2 and 50 characters"),
    body("profile.phone")
      .optional({ checkFalsy: true })
      .matches(/^(\+251|0)?[97]\d{8}$/)
      .withMessage("Please provide a valid Ethiopian phone number"),
    body("profile.bio")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Bio cannot exceed 1000 characters"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Please check your input data",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const user = await User.findById(req.user._id);

    // Update profile fields
    if (req.body.profile) {
      Object.keys(req.body.profile).forEach((key) => {
        if (req.body.profile[key] !== undefined) {
          user.profile[key] = req.body.profile[key];
        }
      });
    }

    // Update preferences if provided
    if (req.body.preferences) {
      Object.keys(req.body.preferences).forEach((key) => {
        if (req.body.preferences[key] !== undefined) {
          user.preferences[key] = req.body.preferences[key];
        }
      });
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        preferences: user.preferences,
      },
    });
  }),
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  "/change-password",
  authenticate,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "New password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Please check your password requirements",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select("+password");

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      logSecurityEvent("password_change_invalid_current", req, {
        userId: user._id,
      });
      return res.status(401).json({
        error: "Password change failed",
        message: "Current password is incorrect",
        code: "INVALID_CURRENT_PASSWORD",
      });
    }

    // Update password
    user.password = newPassword;
    // Clear enforced change flags if present
    user.mustChangePassword = false;
    user.tempPasswordExpiry = undefined;
    // Reset login attempts on successful password change
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastPasswordChange = new Date();
    await user.save();

    // Log password change
    logAuthEvent("password_changed", user._id, user.email, req, true);

    res.json({
      message: "Password changed successfully",
      code: "PASSWORD_CHANGED",
    });
  }),
);

/**
 * @route   POST /api/auth/create-admin
 * @desc    Create admin user — requires ADMIN_CREATION_KEY header
 * @access  Restricted (secret key required regardless of environment)
 */
router.post(
  "/create-admin",
  asyncHandler(async (req, res) => {
    // SEC-04: Require a secret admin creation key in all environments.
    // Set ADMIN_CREATION_KEY to a strong random string in your .env.
    // Without it this route is permanently disabled.
    const adminKey = process.env.ADMIN_CREATION_KEY;
    if (!adminKey) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Admin creation is disabled (ADMIN_CREATION_KEY not configured)",
        code: "ADMIN_CREATION_DISABLED",
      });
    }
    const providedKey = req.headers["x-admin-creation-key"];
    if (!providedKey || providedKey !== adminKey) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid or missing admin creation key",
        code: "INVALID_ADMIN_KEY",
      });
    }

    const adminData = {
      email: "admin@ethiocraft.com",
      password: "Admin123!",
      role: "admin",
      profile: {
        firstName: "EthioCraft",
        lastName: "Administrator",
        phone: "+251911234567",
        bio: "Platform administrator for EthioCraft Global marketplace",
      },
    };

    // Check if admin already exists
    const existingAdmin = await User.findByEmail(adminData.email);
    if (existingAdmin) {
      return res.status(409).json({
        error: "Admin exists",
        message: "Admin user already exists",
        code: "ADMIN_EXISTS",
        credentials: {
          email: adminData.email,
          password: "Admin123!",
        },
      });
    }

    // Create admin user
    const admin = new User(adminData);
    await admin.save();

    res.status(201).json({
      message: "Admin user created successfully",
      credentials: {
        email: adminData.email,
        password: "Admin123!",
        role: "admin",
      },
      loginUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/login`,
      dashboardUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/admin/dashboard`,
    });
  }),
);

/**
 * ─── GOOGLE OAUTH2 ROUTES ────────────────────────────────────────────────────
 */

/**
 * Helper to guarantee correct Google Callback URL in all environments
 */
const resolveGoogleCallback = (req) => {
  const host = req.get('host') || '';
  if (host.includes('ethiocrafthub.com') || process.env.NODE_ENV === 'production' || process.env.PASSENGER_APP_ENV === 'production') {
    return 'https://ethiocrafthub.com/api/auth/google/callback';
  }
  return process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
};

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth2 login flow
 * @access  Public
 */
router.get('/google', (req, res, next) => {
  const passport = require('../config/passport');
  const callbackURL = resolveGoogleCallback(req);
  console.log('🌐 [Google OAuth] Initiating login with callbackURL:', callbackURL);
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    callbackURL,
  })(req, res, next);
});

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth2 callback — issues JWT and redirects to frontend
 * @access  Public
 */
router.get('/google/callback', (req, res, next) => {
  const passport = require('../config/passport');
  const callbackURL = resolveGoogleCallback(req);
  console.log('🌐 [Google OAuth Callback] Handling callback with URL:', callbackURL);
  passport.authenticate('google', {
    session: false,
    callbackURL,
    failureRedirect: `${process.env.CLIENT_URL || 'https://ethiocrafthub.com'}/login?error=google_auth_failed`
  },
    async (err, user) => {
      if (err || !user) {
        const msg = err?.message || 'Google authentication failed';
        console.error('❌ Google OAuth callback error:', msg);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=${encodeURIComponent(msg)}`);
      }

      try {
        const userRole = (user.role || 'customer').toLowerCase();
        const isPrivilegedUser = userRole === 'artisan' || userRole === 'admin';

        // ── ROLE-BASED OTP: Artisans and Admins MUST verify with Email OTP ───
        if (isPrivilegedUser) {
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const cleanEmail = user.email.toLowerCase().trim();

          googleLoginOtpStore.set(cleanEmail, {
            otp,
            userId: user._id,
            role: userRole,
            createdAt: Date.now(),
            expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
            attempts: 0,
          });

          console.log(`🔐 Google login OTP generated for ${userRole} (${cleanEmail}): ${otp}`);

          const subject = `Your EthioCraft Security Verification Code: ${otp}`;
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 16px; background-color: #fffdfa;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #b45309; margin: 0; font-size: 24px; font-weight: bold;">EthioCraft Global</h1>
                <p style="color: #78350f; font-size: 13px; margin: 4px 0 0 0;">${userRole === 'admin' ? '🛡️ Administrator Security Portal' : '✨ Artisan Hub Security Verification'}</p>
              </div>
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 24px; text-align: center;">
                <p style="color: #4b5563; font-size: 15px; margin: 0 0 12px 0;">Your Google Sign-In verification code is:</p>
                <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #b45309; padding: 12px; font-family: monospace;">${otp}</div>
                <p style="color: #92400e; font-size: 12px; margin: 12px 0 0 0;">This security code will expire in 10 minutes. Do not share it with anyone.</p>
              </div>
              <div style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
                <p>If you did not attempt to sign in with Google, please secure your account immediately.</p>
                <p>© ${new Date().getFullYear()} EthioCraft Global. All rights reserved.</p>
              </div>
            </div>
          `;

          try {
            await sendAlertEmail(cleanEmail, subject, html);
          } catch (e) {
            console.warn('⚠️ Google OTP email send warning:', e.message);
          }

          const jwt = require('jsonwebtoken');
          const tempToken = jwt.sign(
            { id: user._id, email: user.email, role: userRole, purpose: 'google_login_otp' },
            process.env.JWT_SECRET || 'ethiocraft-secret-jwt-key-2026',
            { expiresIn: '10m' }
          );

          return res.redirect(
            `${process.env.CLIENT_URL}/auth/callback?requiresOtp=true&email=${encodeURIComponent(user.email)}&role=${userRole}&tempToken=${tempToken}`
          );
        }

        // ── CUSTOMERS: DIRECT LOGIN (No OTP needed) ──────────────────────────
        const { generateTokens } = require('../middleware/auth');
        const tokens = generateTokens(user);

        const userPayload = encodeURIComponent(JSON.stringify({
          id: user._id,
          email: user.email,
          role: user.role,
          profile: user.profile,
          authProvider: user.authProvider,
          verification: user.verification,
          lastLogin: user.lastLogin,
        }));

        logAuthEvent('google_oauth_login', user._id, user.email, req, true);

        return res.redirect(
          `${process.env.CLIENT_URL}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&user=${userPayload}`
        );
      } catch (tokenErr) {
        console.error('❌ Token generation error:', tokenErr);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=token_generation_failed`);
      }
    }
  )(req, res, next);
});

/**
 * @route   POST /api/auth/verify-google-login-otp
 * @desc    Verify 6-digit OTP code for artisan / admin Google sign-in
 * @access  Public (validated via tempToken)
 */
router.post('/verify-google-login-otp', async (req, res) => {
  try {
    const { email, otp, tempToken } = req.body;
    if (!email || !otp || !tempToken) {
      return res.status(400).json({ success: false, error: 'Email, code, and session token are required.' });
    }

    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'ethiocraft-secret-jwt-key-2026');
    } catch (jwtErr) {
      return res.status(401).json({ success: false, error: 'Verification session expired. Please sign in with Google again.' });
    }

    if (decoded.purpose !== 'google_login_otp' || decoded.email.toLowerCase() !== email.toLowerCase().trim()) {
      return res.status(401).json({ success: false, error: 'Invalid verification session.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const record = googleLoginOtpStore.get(cleanEmail);

    if (!record) {
      return res.status(400).json({ success: false, error: 'Verification code not found or expired. Please sign in again.' });
    }

    if (Date.now() > record.expiresAt) {
      googleLoginOtpStore.delete(cleanEmail);
      return res.status(400).json({ success: false, error: 'Verification code expired. Please request a new one.' });
    }

    if (record.attempts >= 5) {
      googleLoginOtpStore.delete(cleanEmail);
      return res.status(429).json({ success: false, error: 'Too many incorrect attempts. Please sign in again.' });
    }

    if (record.otp !== String(otp).trim()) {
      record.attempts += 1;
      return res.status(400).json({
        success: false,
        error: `Incorrect verification code. ${5 - record.attempts} attempts remaining.`
      });
    }

    // Success! Clear OTP
    googleLoginOtpStore.delete(cleanEmail);

    const user = await User.findById(record.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const { generateTokens } = require('../middleware/auth');
    const tokens = generateTokens(user);

    logAuthEvent('google_oauth_otp_verified', user._id, user.email, req, true);

    return res.json({
      success: true,
      tokens,
      user: {
        id: user._id,
        _id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        authProvider: user.authProvider,
        verification: user.verification,
        lastLogin: user.lastLogin,
      }
    });
  } catch (err) {
    console.error('❌ verify-google-login-otp error:', err);
    return res.status(500).json({ success: false, error: 'Verification failed. Please try again.' });
  }
});

/**
 * @route   POST /api/auth/resend-google-login-otp
 * @desc    Resend 6-digit OTP code for artisan / admin Google sign-in
 * @access  Public
 */
router.post('/resend-google-login-otp', async (req, res) => {
  try {
    const { email, tempToken } = req.body;
    if (!email || !tempToken) {
      return res.status(400).json({ success: false, error: 'Email and session token are required.' });
    }

    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'ethiocraft-secret-jwt-key-2026');
    } catch {
      return res.status(401).json({ success: false, error: 'Verification session expired. Please sign in with Google again.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const prev = googleLoginOtpStore.get(cleanEmail);

    if (prev && Date.now() - prev.createdAt < 30 * 1000) {
      const waitSec = Math.ceil((30 * 1000 - (Date.now() - prev.createdAt)) / 1000);
      return res.status(429).json({ success: false, error: `Please wait ${waitSec} seconds before requesting a new code.` });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const userRole = decoded.role || 'artisan';

    googleLoginOtpStore.set(cleanEmail, {
      otp,
      userId: decoded.id,
      role: userRole,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    });

    console.log(`🔑 Resent Google login OTP for ${cleanEmail}: ${otp}`);

    const subject = `Your EthioCraft Security Verification Code: ${otp}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 16px; background-color: #fffdfa;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #b45309; margin: 0; font-size: 24px; font-weight: bold;">EthioCraft Global</h1>
          <p style="color: #78350f; font-size: 13px; margin: 4px 0 0 0;">${userRole === 'admin' ? '🛡️ Administrator Security Portal' : '✨ Artisan Hub Security Verification'}</p>
        </div>
        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="color: #4b5563; font-size: 15px; margin: 0 0 12px 0;">Your new verification code is:</p>
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #b45309; padding: 12px; font-family: monospace;">${otp}</div>
          <p style="color: #92400e; font-size: 12px; margin: 12px 0 0 0;">This code will expire in 10 minutes. Do not share it with anyone.</p>
        </div>
      </div>
    `;

    await sendAlertEmail(cleanEmail, subject, html);

    return res.json({ success: true, message: 'A new 6-digit verification code has been sent to your email.' });
  } catch (err) {
    console.error('❌ resend-google-login-otp error:', err);
    return res.status(500).json({ success: false, error: 'Failed to resend code.' });
  }
});

/**
 * ─── APPLE OAUTH ROUTES (skeleton — activate with Apple credentials) ──────────
 */

/**
 * @route   GET /api/auth/apple
 * @desc    Apple Sign-In placeholder (returns setup instructions)
 * @access  Public
 */
router.get('/apple', (req, res) => {
  // TODO: Implement when Apple Developer account is ready
  // Install: npm install passport-apple
  // Then configure AppleStrategy similarly to GoogleStrategy
  return res.redirect(
    `${process.env.CLIENT_URL}/login?error=${encodeURIComponent('Apple Sign-In is coming soon. Please use email or Google.')}`
  );
});

module.exports = router;

