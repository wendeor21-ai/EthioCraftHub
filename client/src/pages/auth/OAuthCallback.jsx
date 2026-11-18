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
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { ShieldCheck, ArrowRight, RefreshCw, Lock, ArrowLeft } from 'lucide-react';

// Must match routes registered in App.jsx
const ROLE_REDIRECTS = {
  admin:    '/admin/dashboard',
  artisan:  '/artisan/dashboard',
  customer: '/products',
};

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const [phase, setPhase] = useState('processing'); // 'processing' | 'otp' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [redirectDest, setRedirectDest] = useState(null);

  // OTP Verification state (for artisans and admins)
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const didRun = useRef(false);

  useEffect(() => {
    // Run EXACTLY ONCE — even across re-renders triggered by auth state changes
    if (didRun.current) return;
    didRun.current = true;

    const error        = searchParams.get('error');
    const requiresOtp  = searchParams.get('requiresOtp') === 'true';
    const emailParam   = searchParams.get('email');
    const roleParam    = searchParams.get('role');
    const tempTokenParam = searchParams.get('tempToken');

    // ── Error from backend ───────────────────────────────────────────────────
    if (error) {
      setErrorMsg(decodeURIComponent(error));
      setPhase('error');
      return;
    }

    // ── ROLE-BASED OTP: Artisan / Admin requires Email OTP verification ─────
    if (requiresOtp && emailParam && tempTokenParam) {
      setEmail(decodeURIComponent(emailParam));
      setRole(roleParam || 'artisan');
      setTempToken(tempTokenParam);
      setPhase('otp');
      toast.success('የማረጋገጫ ኮድ ወደ ኢሜይልዎ ተልኳል (Verification code sent to your email)');
      return;
    }

    const token        = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const userParam    = searchParams.get('user');

    // ── Missing params ───────────────────────────────────────────────────────
    if (!token || !userParam) {
      setErrorMsg('No authentication token was received. Please try signing in again.');
      setPhase('error');
      return;
    }

    // ── Parse user payload (Customer direct login) ───────────────────────────
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

    // ── STEP 1: Persist session to localStorage ─────────────────────────────
    try {
      localStorage.setItem('authToken',    token);
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
    const destination = ROLE_REDIRECTS[user.role] || '/products';
    setRedirectDest(destination);
    console.log(`✅ OAuth: ${user.email} (${user.role}) → ${destination}`);

    // ── STEP 3: Hard redirect ───────────────────────────────────────────────
    setPhase('success');
    window.location.replace(destination);

    // ── STEP 4: Hydrate AuthContext ─────────────────────────────────────────
    try {
      if (typeof loginWithToken === 'function') {
        loginWithToken(token, refreshToken, user);
      }
    } catch (ctxErr) {
      console.warn('⚠️ OAuth: AuthContext hydration note:', ctxErr);
    }
  }, [searchParams, loginWithToken]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (phase !== 'otp') return;
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, countdown]);

  // Handle OTP submission
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.error('እባክዎ 6-አሃዝ የማረጋገጫ ኮድ ያስገቡ (Please enter 6-digit code)');
      return;
    }

    try {
      setVerifying(true);
      const res = await authAPI.verifyGoogleLoginOtp(email, cleanOtp, tempToken);

      if (res.data?.success && res.data?.tokens) {
        const { tokens, user } = res.data;
        if (user.id && !user._id) user._id = user.id;
        if (user._id && !user.id) user.id = user._id;

        localStorage.setItem('authToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken || '');
        localStorage.setItem('user', JSON.stringify(user));

        try {
          if (typeof loginWithToken === 'function') {
            loginWithToken(tokens.accessToken, tokens.refreshToken, user);
          }
        } catch (ctxErr) {
          console.warn('⚠️ Context hydration:', ctxErr);
        }

        const destination = ROLE_REDIRECTS[user.role] || (user.role === 'admin' ? '/admin/dashboard' : '/artisan/dashboard');
        toast.success('በተሳካ ሁኔታ ተረጋግጧል! (Verified successfully)');
        setPhase('success');
        setRedirectDest(destination);
        window.location.replace(destination);
      } else {
        toast.error(res.data?.error || 'የተሳሳተ የማረጋገጫ ኮድ (Invalid code)');
      }
    } catch (err) {
      console.error('❌ OTP verification error:', err);
      const msg = err.response?.data?.error || 'የማረጋገጫ ኮዱ ልክ አይደለም ወይም ጊዜው አልፏል (Verification failed)';
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  // Handle OTP resend
  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    try {
      setResending(true);
      const res = await authAPI.resendGoogleLoginOtp(email, tempToken);
      if (res.data?.success) {
        toast.success('አዲስ የማረጋገጫ ኮድ ተልኳል (New code sent)');
        setCountdown(60);
      } else {
        toast.error(res.data?.error || 'ኮዱን መላክ አልተቻለም');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'ኮዱን በድጋሚ ለመላክ አልተቻለም');
    } finally {
      setResending(false);
    }
  };

  // Fallback: if still on this page after 4 seconds during success, show manual button
  useEffect(() => {
    if (phase !== 'success' || !redirectDest) return;
    const t = setTimeout(() => {
      window.location.replace(redirectDest);
    }, 3000);
    return () => clearTimeout(t);
  }, [phase, redirectDest]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] px-4 py-8 font-sans">
      <div className="w-full max-w-md mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block">
            <span className="text-2xl font-black text-gray-900 tracking-tight">
              EthioCraft<span className="text-amber-600">Global</span>
            </span>
          </Link>
        </div>

        {/* ── PHASE 1: OTP VERIFICATION (FOR ARTISAN & ADMIN) ── */}
        {phase === 'otp' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 transition-all">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600 shadow-sm border border-amber-100">
              <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {role === 'admin' ? 'የአስተዳዳሪ ደህንነት ማረጋገጫ' : 'የባለሙያ ደህንነት ማረጋገጫ'}
              </h2>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                በGoogle ሲገቡ መለያዎን ለማረጋገጥ የ 6-አሃዝ ኮድ ወደ <span className="font-semibold text-gray-800 break-all">{email}</span> ተልኳል።
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2 text-center">
                  የ 6-አሃዝ ማረጋገጫ ኮድ (Verification Code)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    placeholder="------"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-center tracking-[12px] text-2xl font-mono font-bold py-3.5 px-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:bg-white focus:outline-none transition-all"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={verifying || otp.trim().length !== 6}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>በማረጋገጥ ላይ...</span>
                  </>
                ) : (
                  <>
                    <span>አረጋግጥና ግባ (Verify & Login)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={countdown > 0 || resending}
                className="text-amber-600 hover:text-amber-800 font-semibold disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {resending ? 'በመላክ ላይ...' : countdown > 0 ? `ኮዱን በድጋሚ ለመላክ (${countdown}s)` : 'ኮዱ አልደረሰዎትም? በድጋሚ ላክ'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1 font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ወደ መግቢያ ተመለስ</span>
              </button>
            </div>
          </div>
        )}

        {/* ── PHASE 2: PROCESSING / SUCCESS ── */}
        {(phase === 'processing' || phase === 'success') && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center space-y-4">
            <div className="relative mx-auto w-14 h-14">
              <div className="absolute inset-0 rounded-full border-4 border-amber-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-amber-600 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-gray-700">
              {phase === 'processing'
                ? 'የGoogle መለያዎን በማረጋገጥ ላይ... (Verifying...)'
                : '✓ በተሳካ ሁኔታ ገብተዋል! ወደ ዳሽቦርድዎ እያዘዋወርን ነው...'}
            </p>
            {phase === 'success' && redirectDest && (
              <button
                onClick={() => window.location.replace(redirectDest)}
                className="mt-2 text-xs text-amber-600 underline hover:text-amber-700 transition-colors"
              >
                ወዲያውኑ ካላዘዋወረዎት እዚህ ይጫኑ (Click here)
              </button>
            )}
          </div>
        )}

        {/* ── PHASE 3: ERROR ── */}
        {phase === 'error' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left space-y-1.5">
              <p className="text-sm font-bold text-red-700">የመግባት ሂደት አልተሳካም (Sign-in Failed)</p>
              <p className="text-xs text-red-600 leading-relaxed">{errorMsg}</p>
            </div>
            <Link
              to="/login"
              className="block w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl text-center transition-all duration-200 text-sm shadow-sm"
            >
              ← ወደ መግቢያ ገጽ ተመለስ (Back to Login)
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
