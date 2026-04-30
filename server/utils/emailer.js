/**
 * Emailer Utility — EthioCraft Global
 *
 * Sends transactional emails using Nodemailer + Gmail SMTP.
 *
 * Configuration (in .env):
 *   EMAIL_HOST=smtp.gmail.com
 *   EMAIL_PORT=587
 *   EMAIL_SECURE=false
 *   EMAIL_USER=youraddress@gmail.com
 *   EMAIL_PASS=xxxxxxxxxxxx  ← 16-char App Password, NO SPACES
 *   EMAIL_FROM="EthioCraft Global <youraddress@gmail.com>"
 *
 * Gmail App Password:
 *   Google Account → Security → 2-Step Verification → App Passwords
 *   Select "Mail" + "Windows Computer" → copy the 16-char password (strip spaces)
 *
 * IMPORTANT: Transporter is created lazily (on first send) so that .env changes
 * take effect without needing a module cache invalidation.
 */

const nodemailer = require('nodemailer');

let _transporter = null;

/**
 * Build (or return cached) Nodemailer transporter.
 * Throws if required env vars are missing.
 */
function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const secure = process.env.EMAIL_SECURE === 'true' || port === 465;
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error('Email not configured: EMAIL_USER and EMAIL_PASS must be set in .env');
  }

  if (!host) {
    throw new Error('Email not configured: EMAIL_HOST must be set in .env');
  }

  // Strip accidental spaces from App Password (common copy-paste mistake)
  const cleanPass = pass.replace(/\s+/g, '');

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: cleanPass },
    // Gmail-specific: allow self-signed certs in dev, enforce in prod
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  return _transporter;
}

/**
 * Verify SMTP connectivity — called at server startup for fast failure detection.
 */
async function verifySmtp() {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('✅ SMTP transporter verified — ready to send emails');
    return true;
  } catch (err) {
    console.error('❌ SMTP verification failed:', err.message);
    console.error('   → Check EMAIL_USER, EMAIL_PASS (no spaces!), and EMAIL_HOST in .env');
    return false;
  }
}

/**
 * Send an email.
 *
 * @param {string} to        Recipient address
 * @param {string} subject   Email subject
 * @param {string} html      HTML body
 * @param {string} [text]    Plain-text fallback (optional)
 * @returns {{ success: boolean, info?: object, error?: string }}
 */
async function sendAlertEmail(to, subject, html, text) {
  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.EMAIL_USER ||
    'no-reply@ethiocraft.com';

  let transporter;
  try {
    transporter = getTransporter();
  } catch (configErr) {
    console.error('❌ Email config error:', configErr.message);
    return { success: false, error: configErr.message };
  }

  const mailOptions = {
    from,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent:', {
      to,
      subject,
      messageId: info.messageId,
      accepted:  info.accepted,
      rejected:  info.rejected,
    });
    console.log('Email sent: ' + info.response);

    // Log to DB (non-blocking, non-fatal)
    _logEmailToDb({ to, subject, html, success: true, meta: info }).catch(() => {});

    return { success: true, info };
  } catch (err) {
    console.error('❌ Email send error:', err.message);

    // Provide actionable hints for common Gmail errors
    if (err.message?.includes('Username and Password not accepted')) {
      console.error(
        '   → Gmail rejected the App Password. Check:\n' +
        '     1. EMAIL_PASS has NO spaces (should be 16 chars)\n' +
        '     2. 2-Step Verification is enabled on the Gmail account\n' +
        '     3. The App Password was generated for "Mail"\n' +
        '     4. The Gmail account has not revoked the App Password'
      );
    }

    if (err.message?.includes('connect ECONNREFUSED') || err.message?.includes('EHOSTUNREACH')) {
      console.error('   → Cannot reach SMTP server. Check EMAIL_HOST and network connectivity.');
    }

    // Log failure to DB (non-blocking)
    _logEmailToDb({ to, subject, html, success: false, error: String(err) }).catch(() => {});

    return { success: false, error: err.message };
  }
}

/** Internal: persist email attempt to AlertLog (if model available) */
async function _logEmailToDb({ to, subject, html, success, meta, error }) {
  try {
    const AlertLog = require('../models/AlertLog');
    await AlertLog.create({
      type:    'email',
      level:   'critical',
      to,
      subject,
      message: html,
      success,
      ...(meta  ? { metadata: { accepted: meta.accepted, rejected: meta.rejected, response: meta.response } } : {}),
      ...(error ? { error }                                                                                    : {}),
    });
  } catch {
    // AlertLog is optional — don't break email delivery if it fails
  }
}

// Verify on startup (non-fatal if it fails — app still boots)
verifySmtp();

module.exports = { sendAlertEmail, verifySmtp, getTransporter };
