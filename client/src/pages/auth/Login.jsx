/**
 * Login Page for EthioCraft Global
 * Modern, minimalist design with Ethiopian-inspired accents
 * Full-width form layout with premium aesthetics
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login, loading, isAuthenticated, getRedirectPath, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [socialLoading, setSocialLoading] = useState(null); // 'google' | 'apple' | null

  // Read ?error= from URL (e.g., from failed OAuth callback)
  const searchParams = new URLSearchParams(location.search);
  const urlError = searchParams.get('error');

  // Load saved email if exists
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
        return;
      }

      if (user) {
        const redirect = getRedirectPath(user.role, user);
        navigate(redirect, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, navigate, location, user, getRedirectPath]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (rememberMe) {
      localStorage.setItem('rememberedEmail', formData.email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    const result = await login(formData);

    if (result.success) {
      const redirectPath = getRedirectPath(result.user.role, result.user);
      navigate(redirectPath, { replace: true });
    } else {
      let errorMessage = result.error;
      if (!result.locked) {
        if (errorMessage.includes('Invalid') || errorMessage.includes('password')) {
          errorMessage = 'Invalid email or password. Please verify your credentials.';
        }
      }
      setErrors({ general: errorMessage });
    }
  };

  // ── Social Auth Handlers ──────────────────────────────────────────────────
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const handleGoogleLogin = () => {
    setSocialLoading('google');
    // Redirect to backend — Passport picks it up and forwards to Google
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleAppleLogin = () => {
    // Apple Sign-In skeleton — redirect to backend which returns a "coming soon" message
    setSocialLoading('apple');
    window.location.href = `${API_URL}/auth/apple`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf9f7] via-white to-[#f5f3ef] font-body flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-ethiopian-gold/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-ethiopian-gold/[0.02] to-transparent rounded-full blur-2xl"></div>
      </div>

      {/* Main Card Container */}
      <div className="relative w-full max-w-[480px]">
        {/* Subtle decorative pattern overlay */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-rule='evenodd'%3E%3Cpath d='M30 30l-5-5-5 5 5 5 5-5zm0-20l-5-5-5 5 5 5 5-5zm0 40l-5-5-5 5 5 5 5-5zm20-20l-5-5-5 5 5 5 5-5zm-40 0l-5-5-5 5 5 5 5-5z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '30px 30px'
          }}
        ></div>

        {/* Form Card */}
        <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 p-8 sm:p-10">
          {/* Header Section */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-6 group">
              <span className="text-3xl font-display font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-wide">
                EthioCraft<span className="text-ethiopian-gold bg-none">Global</span>
              </span>
            </Link>

            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-ethiopian-gold/10 to-amber-500/10 mb-4">
              <svg className="w-8 h-8 text-ethiopian-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-slate-500 text-sm">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Google */}
            <button
              type="button"
              id="btn-google-login"
              onClick={handleGoogleLogin}
              disabled={!!socialLoading || loading}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {socialLoading === 'google' ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              <span className="text-xs font-semibold text-slate-600">
                {socialLoading === 'google' ? 'Redirecting…' : 'Google'}
              </span>
            </button>

            {/* Apple */}
            <button
              type="button"
              id="btn-apple-login"
              onClick={handleAppleLogin}
              disabled={!!socialLoading || loading}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {socialLoading === 'apple' ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.96.95-2.12 1.43-3.48 1.43-1.32 0-2.39-.42-3.23-1.43-1.32-1.39-2.38-4.22-2.38-6.17 0-3.32 1.83-5.24 3.94-5.24 1.1 0 1.96.44 2.58 1.43.46.73.69 1.61.69 2.62h-4.32c.11 1.5.83 2.15 1.7 2.15.54 0 1.1-.19 1.68-.57l.14-.14 1.8 1.5-.12.14zM12 4.02c0-1.67.63-2.5 1.9-2.5 1.25 0 2.15 1.05 2.15 2.45s-1 2.3-2.15 2.3c-1.12 0-1.9-.92-1.9-2.25z" />
                </svg>
              )}
              <span className="text-xs font-semibold text-slate-600">
                {socialLoading === 'apple' ? 'Redirecting…' : 'Apple'}
              </span>
            </button>
          </div>

          {/* URL Error Banner (from OAuth callback failures) */}
          {urlError && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm text-center">
              {decodeURIComponent(urlError)}
            </div>
          )}

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-slate-400">Or continue with email</span>
            </div>
          </div>

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* General Error Message */}
            {errors.general && (
              <div className="bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm animate-shake">
                {errors.general}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-4 w-4 text-slate-400 group-focus-within:text-ethiopian-gold transition-colors" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`block w-full pl-9 pr-3 py-3 bg-white border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-ethiopian-gold/20 focus:border-ethiopian-gold transition-all duration-200 text-sm placeholder:text-slate-300 ${errors.email ? 'border-red-300' : 'border-slate-200'
                    }`}
                  placeholder="admin@ethiocraft.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-medium text-ethiopian-gold hover:text-amber-600 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-4 w-4 text-slate-400 group-focus-within:text-ethiopian-gold transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full pl-9 pr-10 py-3 bg-white border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-ethiopian-gold/20 focus:border-ethiopian-gold transition-all duration-200 text-sm placeholder:text-slate-300 ${errors.password ? 'border-red-300' : 'border-slate-200'
                    }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-ethiopian-gold transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 text-ethiopian-gold focus:ring-ethiopian-gold/20 border-slate-300 rounded cursor-pointer"
                />
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">
                  Remember me
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-ethiopian-gold to-amber-600 hover:from-ethiopian-gold hover:to-amber-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ethiopian-gold disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-ethiopian-gold hover:text-amber-600 transition-colors"
              >
                Create account
              </Link>
            </p>
          </div>

          {/* Ethiopian Motto */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 tracking-wider">
              በእጅ ጥበብ የተሰራ • Handcrafted with Heritage
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;