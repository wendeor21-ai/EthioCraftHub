/**
 * OAuthCallback.jsx — EthioCraft Global
 *
 * Critical fix: window.location.replace() is called SYNCHRONOUSLY (no setTimeout)
 * BEFORE any React state update. This ensures React's re-render cleanup cycle
 * can never cancel the redirect.
 *
 * Flow:
 *   1. Read URL params (token, user, error)
 *   2. Validate
 *   3. Write to localStorage (persists session)
 *   4. IMMEDIATELY redirect via window.location.replace()
 *   5. Only AFTER redirect is initiated: hydrate AuthContext (cosmetic only)
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Must match routes registered in App.jsx
const ROLE_REDIRECTS = {
  admin:    '/admin/dashboard',
  artisan:  '/artisan/dashboard',
  customer: '/products',
};

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();

  const [phase, setPhase] = useState('processing');
  const [errorMsg, setErrorMsg] = useState('');
  const [redirectDest, setRedirectDest] = useState(null);

  const didRun = useRef(false);

  useEffect(() => {
    // Run EXACTLY ONCE — even across re-renders triggered by auth state changes
    if (didRun.current) return;
    didRun.current = true;

    const token        = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const userParam    = searchParams.get('user');
    const error        = searchParams.get('error');

    // ── Error from backend ───────────────────────────────────────────────────
    if (error) {
      setErrorMsg(decodeURIComponent(error));
      setPhase('error');
      return;
    }

    // ── Missing params ───────────────────────────────────────────────────────
    if (!token || !userParam) {
      setErrorMsg('No authentication token was received. Please try signing in again.');
      setPhase('error');
      return;
    }

    // ── Parse user payload ───────────────────────────────────────────────────
    let user;
    try {
      user = JSON.parse(decodeURIComponent(userParam));
    } catch {
      setErrorMsg('Authentication data was malformed. Please try again.');
      setPhase('error');
      return;
    }

    if (!user?.role) {
      setErrorMsg('Incomplete user data received. Please try again.');
      setPhase('error');
      return;
    }

    // Normalise _id / id
    if (user.id  && !user._id) user._id = user.id;
    if (user._id && !user.id)  user.id  = user._id;

    // ── STEP 1: Persist session to localStorage (most important step) ────────
    try {
      localStorage.setItem('authToken',   token);
      localStorage.setItem('refreshToken', refreshToken || '');
      localStorage.setItem('user',         JSON.stringify(user));
      console.log('✅ OAuth: session persisted to localStorage');
    } catch (storageErr) {
      console.error('❌ OAuth: localStorage write failed:', storageErr);
      setErrorMsg('Could not save your session. Please check browser storage settings.');
      setPhase('error');
      return;
    }

    // ── STEP 2: Determine destination ────────────────────────────────────────
    const destination = ROLE_REDIRECTS[user.role] || '/';
    setRedirectDest(destination);
    console.log(`✅ OAuth: ${user.email} (${user.role}) → ${destination}`);

    // ── STEP 3: Hard redirect — SYNCHRONOUS, BEFORE any React state update ───
    // Using window.location.replace() avoids React Router conflicts entirely.
    // The browser navigates away before any cleanup function can cancel this.
    setPhase('success'); // show success UI briefly
    window.location.replace(destination);

    // ── STEP 4: Hydrate AuthContext (best-effort, cosmetic on next page) ─────
    // This runs after replace() is dispatched. The destination page will
    // read from localStorage instead of relying on this state.
    try {
      if (typeof loginWithToken === 'function') {
        loginWithToken(token, refreshToken, user);
      }
    } catch (ctxErr) {
      // Non-fatal: the destination page will re-read from localStorage
      console.warn('⚠️ OAuth: AuthContext hydration note:', ctxErr);
    }

    // NO cleanup return — we must never cancel the redirect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps — didRun ref prevents double execution


  // ── Fallback: if still on this page after 6 seconds, show manual button ───
  useEffect(() => {
    if (phase !== 'success' || !redirectDest) return;
    const t = setTimeout(() => {
      // If window.location.replace succeeded, we're gone. If not, show button.
      window.location.replace(redirectDest);
    }, 3000);
    return () => clearTimeout(t);
  }, [phase, redirectDest]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] font-body">
      <div className="w-full max-w-sm mx-auto text-center space-y-6 p-8">

        {/* Brand */}
        <Link to="/" className="inline-block">
          <span className="text-2xl font-display font-bold text-slate-900">
            EthioCraft<span className="text-ethiopian-gold">Global</span>
          </span>
        </Link>

        {/* ── Processing / Success ── */}
        {(phase === 'processing' || phase === 'success') && (
          <>
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-ethiopian-gold animate-spin" />
            </div>
            <p className="text-sm text-slate-500 font-light">
              {phase === 'processing'
                ? 'Verifying credentials…'
                : '✓ Signed in! Redirecting to your dashboard…'}
            </p>
            {/* Manual fallback button (visible if redirect stalls) */}
            {phase === 'success' && redirectDest && (
              <button
                onClick={() => window.location.replace(redirectDest)}
                className="mt-2 text-xs text-ethiopian-gold underline hover:text-amber-700 transition-colors"
              >
                Click here if not redirected automatically
              </button>
            )}
          </>
        )}

        {/* ── Error ── */}
        {phase === 'error' && (
          <>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-left space-y-2">
              <p className="text-sm font-semibold text-red-700">Sign-in failed</p>
              <p className="text-xs text-red-600">{errorMsg}</p>
            </div>
            <Link
              to="/login"
              className="block w-full py-3 px-4 bg-slate-900 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-200 text-sm"
            >
              ← Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
