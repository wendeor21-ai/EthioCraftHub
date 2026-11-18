import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  ShoppingBag, 
  Palette, 
  CheckCircle2, 
  ShieldCheck, 
  Mail, 
  Phone, 
  User, 
  Lock, 
  ArrowRight, 
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';
import toast from 'react-hot-toast';

const CRAFT_SPECIALTIES = [
  { id: 'Textiles', labelEn: 'Textiles & Shemma (ሸማ/ጥልፍ)', icon: '🧵' },
  { id: 'Leather Goods', labelEn: 'Leathercraft (የቆዳ ስራ)', icon: '👜' },
  { id: 'Pottery', labelEn: 'Pottery & Ceramics (የሸክላ ስራ)', icon: '🏺' },
  { id: 'Jewelry', labelEn: 'Filigree & Jewelry (ወርቅና ብር)', icon: '💍' },
  { id: 'Wood Crafts', labelEn: 'Woodcarving (የእንጨት ቅርጻቅርጽ)', icon: '🪵' },
  { id: 'Basketry', labelEn: 'Basketry & Agelgel (የቅርጫት ስራ)', icon: '🧺' },
  { id: 'Paintings', labelEn: 'Traditional Painting (ስዕል)', icon: '🎨' },
];

const Register = () => {
  const { user, register, loading: authLoading, isAuthenticated, getRedirectPath } = useAuth();
  const { t, i18n } = useCustomTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const currentLang = i18n.language?.split('-')[0] || 'am';

  const [formData, setFormData] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const initialRole = searchParams.get('role') === 'artisan' ? 'artisan' : 'customer';
    return {
      email: '',
      password: '',
      confirmPassword: '',
      role: initialRole,
      profile: {
        firstName: '',
        lastName: '',
        phone: '',
        specialties: ['Textiles'],
        culturalBackground: 'Ethiopia'
      }
    };
  });

  // Sync role if ?role= URL search parameter changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const roleParam = searchParams.get('role');
    if (roleParam === 'artisan' || roleParam === 'customer') {
      setFormData(prev => ({ ...prev, role: roleParam }));
    }
  }, [location.search]);

  // OTP State
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Form UI state
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [registrationInProgress, setRegistrationInProgress] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && !registrationInProgress) {
      const from = location.state?.from?.pathname;
      if (from && from !== '/login' && from !== '/register') {
        navigate(from, { replace: true });
      } else {
        const dest = getRedirectPath(user?.role, user);
        navigate(dest, { replace: true });
      }
    }
  }, [isAuthenticated, navigate, location, registrationInProgress, user, getRedirectPath]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Handle generic input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('profile.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        profile: { ...prev.profile, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (name === 'email') {
        // Reset OTP if user changes email
        setIsEmailVerified(false);
        setIsOtpSent(false);
        setOtp('');
      }
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Select Role
  const handleRoleSelect = (role) => {
    setFormData(prev => ({ ...prev, role }));
  };

  // Toggle Specialty
  const handleSpecialtyToggle = (specId) => {
    setFormData(prev => {
      const current = prev.profile.specialties || [];
      const updated = current.includes(specId)
        ? current.filter(s => s !== specId)
        : [...current, specId];
      return {
        ...prev,
        profile: { ...prev.profile, specialties: updated.length ? updated : [specId] }
      };
    });
  };

  // Send OTP
  const handleSendOtp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address.' }));
      return;
    }

    setSendingOtp(true);
    setErrors(prev => ({ ...prev, email: '', otp: '' }));
    try {
      const res = await authAPI.sendRegistrationOtp(formData.email);
      if (res.data?.success) {
        setIsOtpSent(true);
        setOtpCountdown(60);
        toast.success(res.data.message || 'Verification code sent to your email!');
        // In development fallback
        if (res.data?.devOtp) {
          toast.success(`[Dev Code]: ${res.data.devOtp}`, { duration: 6000 });
        }
      } else {
        setErrors(prev => ({ ...prev, email: res.data?.error || 'Failed to send verification code.' }));
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Could not send verification code. Please try again.';
      setErrors(prev => ({ ...prev, email: msg }));
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp || otp.trim().length !== 6) {
      setErrors(prev => ({ ...prev, otp: 'Please enter the 6-digit verification code.' }));
      return;
    }

    setVerifyingOtp(true);
    setErrors(prev => ({ ...prev, otp: '' }));
    try {
      const res = await authAPI.verifyRegistrationOtp(formData.email, otp.trim());
      if (res.data?.success) {
        setIsEmailVerified(true);
        toast.success('Email successfully verified! ✓');
      } else {
        setErrors(prev => ({ ...prev, otp: res.data?.error || 'Invalid code.' }));
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Verification failed. Please check the code.';
      setErrors(prev => ({ ...prev, otp: msg }));
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Validate full form before submission
  const validateForm = () => {
    const errs = {};

    if (!formData.profile.firstName?.trim()) {
      errs['profile.firstName'] = 'First name is required.';
    }
    if (!formData.profile.lastName?.trim()) {
      errs['profile.lastName'] = 'Last name is required.';
    }
    if (!formData.email) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Invalid email address.';
    }

    if (!isEmailVerified) {
      errs.otp = 'Please verify your email address with the 6-digit code.';
    }

    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errs.password = 'Must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number.';
    }

    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (!agreeTerms) {
      errs.terms = 'You must agree to the Terms of Service to create an account.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      const firstError = Object.values(errors)[0];
      if (firstError) toast.error(firstError);
      return;
    }

    const { confirmPassword, ...registrationData } = formData;
    setRegistrationInProgress(true);
    const toastId = toast.loading('Creating your account...');

    try {
      const result = await register(registrationData);
      if (result.success) {
        const targetRole = result.user?.role || formData.role;
        toast.success(
          targetRole === 'artisan'
            ? 'Welcome, Artisan! Opening your dashboard...'
            : 'Welcome to EthioCraft Global!',
          { id: toastId }
        );

        // Immediate direct role-based redirection
        if (targetRole === 'artisan') {
          navigate('/artisan/verification', { replace: true });
        } else {
          navigate('/products', { replace: true });
        }
      } else {
        setRegistrationInProgress(false);
        setErrors({ general: result.error || 'Registration failed' });
        toast.error(result.error || 'Registration failed', { id: toastId });
      }
    } catch (err) {
      setRegistrationInProgress(false);
      setErrors({ general: err.message || 'An unexpected error occurred.' });
      toast.error('Registration failed. Please try again.', { id: toastId });
    }
  };

  // Password strength checker
  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return { score: 0, text: '', color: '' };
    let score = 0;
    if (p.length >= 8) score += 1;
    if (/[A-Z]/.test(p)) score += 1;
    if (/[a-z]/.test(p)) score += 1;
    if (/\d/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;

    if (score <= 2) return { score: 1, text: 'Weak', color: 'bg-red-500 text-red-600' };
    if (score <= 3) return { score: 2, text: 'Medium', color: 'bg-amber-500 text-amber-600' };
    return { score: 3, text: 'Strong', color: 'bg-green-600 text-green-600' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50/70 via-stone-50 to-orange-50/60 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <span className="text-xl font-display font-extrabold text-stone-900 tracking-tight block leading-tight">
                EthioCraft <span className="text-amber-600">Global</span>
              </span>
              <span className="text-[11px] font-medium text-stone-500 block">
                የኢትዮጵያ የእጅ ጥበብ ውጤቶች መድረክ
              </span>
            </div>
          </Link>

          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Create Your Account
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-600">
            Join thousands of artisans and craft lovers worldwide
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/60 border border-stone-100 p-5 sm:p-8">
          {/* General Error Banner */}
          {errors.general && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. ROLE SELECTION CARDS */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                1. Choose Account Type / የመለያ አይነት ይምረጡ
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Customer Role */}
                <button
                  type="button"
                  onClick={() => handleRoleSelect('customer')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                    formData.role === 'customer'
                      ? 'border-amber-500 bg-amber-50/40 shadow-sm ring-2 ring-amber-500/20'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    {formData.role === 'customer' && (
                      <CheckCircle2 className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">ገዢ (Customer)</h3>
                    <p className="text-[11px] text-stone-600 mt-1 leading-snug">
                      Discover & buy authentic Ethiopian crafts with secure delivery.
                    </p>
                  </div>
                </button>

                {/* Artisan Role */}
                <button
                  type="button"
                  onClick={() => handleRoleSelect('artisan')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                    formData.role === 'artisan'
                      ? 'border-amber-500 bg-amber-50/40 shadow-sm ring-2 ring-amber-500/20'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-800">
                      <Palette className="w-5 h-5" />
                    </div>
                    {formData.role === 'artisan' && (
                      <CheckCircle2 className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">ባለሙያ (Artisan)</h3>
                    <p className="text-[11px] text-stone-600 mt-1 leading-snug">
                      Sell your traditional crafts directly. Full access to Artisan Dashboard.
                    </p>
                  </div>
                </button>
              </div>

              {/* Artisan Rule Banner */}
              {formData.role === 'artisan' && (
                <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2 animate-fadeIn">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">የእጅ ጥበብ ባለሙያ መለያ፡</span> አካውንት እንደከፈቱ ወዲያውኑ ወደ <span className="font-semibold text-amber-700">Artisan Dashboard</span> ይገባሉ። እዚያም ምርቶችዎን መጫን፣ ትዕዛዞችን ማስተዳደር እና ሽያጭዎን መከታተል ይችላሉ።
                  </div>
                </div>
              )}
            </div>

            {/* 2. ARTISAN SPECIALTY (IF ARTISAN) */}
            {formData.role === 'artisan' && (
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/70 space-y-3 animate-fadeIn">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Select Your Craft Specialty / የእጅ ጥበብ ሙያዎ
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CRAFT_SPECIALTIES.map(item => {
                    const isSelected = formData.profile.specialties?.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSpecialtyToggle(item.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.labelEn}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    City / Cultural Origin (ከተማ / የባህል ክልል)
                  </label>
                  <input
                    type="text"
                    name="profile.culturalBackground"
                    value={formData.profile.culturalBackground}
                    onChange={handleChange}
                    placeholder="e.g. Addis Ababa, Dorze/Gamo, Gondar, Harar"
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* 3. NAME FIELDS */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                2. Personal Details / መረጃዎ
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">First Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      name="profile.firstName"
                      required
                      value={formData.profile.firstName}
                      onChange={handleChange}
                      placeholder="Abebe"
                      className={`w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none ${
                        errors['profile.firstName'] ? 'border-red-400 bg-red-50/20' : 'border-stone-200'
                      }`}
                    />
                  </div>
                  {errors['profile.firstName'] && (
                    <p className="text-[10px] text-red-600 mt-1">{errors['profile.firstName']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Last Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      name="profile.lastName"
                      required
                      value={formData.profile.lastName}
                      onChange={handleChange}
                      placeholder="Kebede"
                      className={`w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none ${
                        errors['profile.lastName'] ? 'border-red-400 bg-red-50/20' : 'border-stone-200'
                      }`}
                    />
                  </div>
                  {errors['profile.lastName'] && (
                    <p className="text-[10px] text-red-600 mt-1">{errors['profile.lastName']}</p>
                  )}
                </div>
              </div>

              {/* Phone Field */}
              <div className="mt-3">
                <label className="block text-xs font-medium text-stone-600 mb-1">Phone Number (Optional)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    name="profile.phone"
                    value={formData.profile.phone}
                    onChange={handleChange}
                    placeholder="+251 911 234567 or 0911234567"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. EMAIL & OTP VERIFICATION */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  3. Email & OTP Verification / ኢሜይል ማረጋገጫ
                </label>
                {isEmailVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    Verified ✓
                  </span>
                )}
              </div>

              {/* Email Input + Send Button */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    name="email"
                    required
                    disabled={isEmailVerified}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    className={`w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none ${
                      isEmailVerified
                        ? 'bg-stone-100 text-stone-500 border-stone-200 cursor-not-allowed'
                        : errors.email ? 'border-red-400 bg-red-50/20' : 'border-stone-200'
                    }`}
                  />
                </div>

                {!isEmailVerified && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || otpCountdown > 0 || !formData.email}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white rounded-xl text-xs font-bold transition-all shrink-0 shadow-sm"
                  >
                    {sendingOtp ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : otpCountdown > 0 ? (
                      <span>Resend in {otpCountdown}s</span>
                    ) : (
                      <span>{isOtpSent ? 'Resend Code' : 'Send Code'}</span>
                    )}
                  </button>
                )}

                {isEmailVerified && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEmailVerified(false);
                      setIsOtpSent(false);
                      setOtp('');
                    }}
                    className="px-3 py-2 text-xs text-amber-700 hover:text-amber-800 font-semibold underline"
                  >
                    Change
                  </button>
                )}
              </div>

              {errors.email && (
                <p className="text-[10px] text-red-600 mt-1">{errors.email}</p>
              )}

              {/* OTP Input Field */}
              {isOtpSent && !isEmailVerified && (
                <div className="mt-3 p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl animate-fadeIn space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">
                      Enter 6-digit Code (የማረጋገጫ ኮድ)
                    </span>
                    <span className="text-[10px] text-stone-500">Sent to {formData.email}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="flex-1 tracking-widest text-center text-sm font-bold border border-amber-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={verifyingOtp || otp.length !== 6}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white rounded-xl text-xs font-bold shadow-sm transition-all shrink-0"
                    >
                      {verifyingOtp ? 'Verifying...' : 'Verify Code'}
                    </button>
                  </div>

                  {errors.otp && (
                    <p className="text-[10px] text-red-600">{errors.otp}</p>
                  )}
                  <p className="text-[10px] text-amber-800">
                    💡 እባክዎ ኢሜይልዎን (Inbound ወይም Spam/Junk) ፈትሸው የተላከውን 6 ድጂት ኮድ ያስገቡ።
                  </p>
                </div>
              )}
            </div>

            {/* 5. PASSWORD & CONFIRM PASSWORD */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                4. Create Password / የይለፍ ቃል
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Password */}
                <div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="At least 8 characters"
                      className={`w-full pl-9 pr-9 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none ${
                        errors.password ? 'border-red-400 bg-red-50/20' : 'border-stone-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[10px] text-red-600 mt-1">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Repeat password"
                      className={`w-full pl-9 pr-9 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-amber-500 outline-none ${
                        errors.confirmPassword ? 'border-red-400 bg-red-50/20' : 'border-stone-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[10px] text-red-600 mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Password strength bar */}
              {formData.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 1 ? strength.color.split(' ')[0] : 'bg-stone-200'}`} />
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 2 ? strength.color.split(' ')[0] : 'bg-stone-200'}`} />
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 3 ? strength.color.split(' ')[0] : 'bg-stone-200'}`} />
                  </div>
                  <span className={`text-[10px] font-bold ${strength.color.split(' ')[1]}`}>
                    {strength.text}
                  </span>
                </div>
              )}
            </div>

            {/* 6. TERMS & CONDITIONS */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 text-amber-600 border-stone-300 rounded focus:ring-amber-500 mt-0.5 cursor-pointer"
                />
                <span className="text-xs text-stone-600 leading-snug">
                  I agree to the{' '}
                  <Link to="/terms" className="text-amber-700 font-semibold hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-amber-700 font-semibold hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {errors.terms && (
                <p className="text-[10px] text-red-600 mt-1">{errors.terms}</p>
              )}
            </div>

            {/* 7. SUBMIT BUTTON */}
            <div>
              <button
                type="submit"
                disabled={authLoading || registrationInProgress}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2 group"
              >
                {authLoading || registrationInProgress ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span>Creating your account...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {formData.role === 'artisan'
                        ? 'መለያ ፍጠርና ወደ Artisan Dashboard ግባ'
                        : 'መለያ ፍጠር (Create Account)'}
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Sign in link */}
          <div className="mt-6 pt-5 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-600">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-amber-700 hover:text-amber-800 underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
