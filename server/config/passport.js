/**
 * Passport.js Configuration for EthioCraft Global
 *
 * Handles OAuth2 social authentication strategies.
 * Currently supports: Google
 * Coming soon: Apple (requires Apple Developer account)
 *
 * Flow:
 *   User clicks social button → redirected to provider → provider redirects
 *   back to callback → this strategy finds/creates user → generateTokens → JWT issued
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// ─── Google Strategy ──────────────────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: false,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email returned from Google'), null);
        }

        // 1. Try to find user by googleId (returning social user)
        let user = await User.findOne({ googleId: profile.id });

        // 2. Try to find by email (existing email/password user — link accounts)
        if (!user) {
          user = await User.findOne({ email: email.toLowerCase() });
          if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.authProvider = 'google';
            if (!user.profile.avatar && profile.photos?.[0]?.value) {
              user.profile.avatar = profile.photos[0].value;
            }
            await user.save();
          }
        }

        // 3. Create brand-new user (first-time Google sign-up)
        if (!user) {
          const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User';
          const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '';

          user = new User({
            email: email.toLowerCase(),
            googleId: profile.id,
            authProvider: 'google',
            // No password required for OAuth users
            password: require('crypto').randomBytes(32).toString('hex'),
            role: 'customer',
            profile: {
              firstName,
              lastName,
              avatar: profile.photos?.[0]?.value || '',
            },
            isActive: true,
          });
          await user.save();
          console.log(`✅ New user created via Google OAuth: ${email}`);
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        return done(null, user);
      } catch (error) {
        console.error('❌ Google OAuth strategy error:', error);
        return done(error, null);
      }
    }
  )
);

// Passport serialization (required by passport even if we don't use sessions long-term)
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
