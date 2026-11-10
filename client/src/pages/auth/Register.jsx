/**
 * Register Page for EthioCraft Global
 * 
 * Features:
 * - User registration with role selection
 * - Form validation and error handling
 * - Ethiopian-inspired design
 * - Integration with AuthContext
 * - Role-based redirection after registration
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    profile: {
      firstName: '',
      lastName: '',
      phone: ''
    }
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, loading, isAuthenticated, getRedirectPath } = useAuth();
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated when landing on the page (e.g. navigating back after login)
  // Do NOT trigger on fresh registration — handleSubmit handles that redirect
  const [registrationInProgress, setRegistrationInProgress] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !registrationInProgress) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location, registrationInProgress]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('profile.')) {
      const profileField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [profileField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear field error when user starts typing
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

    // Email validation
    if (!formData.email) {
      newErrors.email = t('errors.email_required', 'Email is required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('errors.email_invalid', 'Email is invalid');
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = t('errors.password_required', 'Password is required');
    } else if (formData.password.length < 8) {
      newErrors.password = t('errors.password_too_short', 'Password must be at least 8 characters');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = t('errors.password_complexity_failure', 'Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('errors.confirm_password_required', 'Please confirm your password');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('errors.passwords_not_match', 'Passwords do not match');
    }

    // Profile validation
    if (!formData.profile.firstName) {
      newErrors['profile.firstName'] = t('errors.first_name_required', 'First name is required');
    }

    if (!formData.profile.lastName) {
      newErrors['profile.lastName'] = t('errors.last_name_required', 'Last name is required');
    }

    if (formData.profile.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.profile.phone)) {
      newErrors['profile.phone'] = t('errors.phone_invalid', 'Please enter a valid phone number');
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

    const { confirmPassword, ...registrationData } = formData;
    setRegistrationInProgress(true);
    const result = await register(registrationData);
    
    if (result.success) {
      const redirectPath = getRedirectPath(result.user.role, result.user);
      navigate(redirectPath, { replace: true });
    } else {
      setRegistrationInProgress(false);
      setErrors({ general: result.error });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {t('auth.join_title', 'Join EthioCraft Global')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('auth.join_subtitle', 'እንኳን ደህና መጡ! Create your account')}
          </p>
        </div>

        {/* Registration Form */}
        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg" onSubmit={handleSubmit}>
          {/* Global Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {errors.general}
            </div>
          )}

          <div className="space-y-4">
            {/* Role Selection */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                {t('auth.join_as', 'I want to join as')}
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="customer">{t('auth.customer_role', 'Customer - Buy authentic Ethiopian crafts')}</option>
                <option value="artisan">{t('auth.artisan_role', 'Artisan - Sell my traditional crafts')}</option>
              </select>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  {t('auth.first_name', 'First Name')}
                </label>
                <input
                  id="firstName"
                  name="profile.firstName"
                  type="text"
                  required
                  value={formData.profile.firstName}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors['profile.firstName'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('auth.first_name', 'First Name')}
                />
                {errors['profile.firstName'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['profile.firstName']}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  {t('auth.last_name', 'Last Name')}
                </label>
                <input
                  id="lastName"
                  name="profile.lastName"
                  type="text"
                  required
                  value={formData.profile.lastName}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors['profile.lastName'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('auth.last_name', 'Last Name')}
                />
                {errors['profile.lastName'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['profile.lastName']}</p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth.email_address', 'Email Address')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={t('auth.enter_email', 'Enter your email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                {t('auth.phone_number_optional', 'Phone Number (Optional)')}
              </label>
              <input
                id="phone"
                name="profile.phone"
                type="tel"
                value={formData.profile.phone}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors['profile.phone'] ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="+251 9XX XXX XXX"
              />
              {errors['profile.phone'] && (
                <p className="mt-1 text-sm text-red-600">{errors['profile.phone']}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.password', 'Password')}
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('auth.create_strong_password', 'Create a strong password')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {t('auth.confirm_password', 'Confirm Password')}
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={t('auth.confirm_password_placeholder', 'Confirm your password')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
              {t('auth.agree_terms', 'I agree to the')}{' '}
              <Link to="/terms" className="text-orange-600 hover:text-orange-500">
                {t('auth.terms_service', 'Terms of Service')}
              </Link>{' '}
              {t('common.and', 'and')}{' '}
              <Link to="/privacy" className="text-orange-600 hover:text-orange-500">
                {t('auth.privacy_policy', 'Privacy Policy')}
              </Link>
            </label>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-ethiopian-red to-ethiopian-orange hover:from-ethiopian-red hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <LoadingSpinner size="small" color="white" />
              ) : (
                t('auth.create_account_btn', 'Create Account')
              )}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {t('auth.already_account', 'Already have an account?')}{' '}
              <Link
                to="/login"
                className="font-medium text-orange-600 hover:text-orange-500"
              >
                {t('auth.sign_in_here', 'Sign in here')}
              </Link>
            </p>
          </div>
        </form>

        {/* Role Information */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('auth.choose_role', 'Choose Your Role')}</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-3">
              <span className="text-ethiopian-gold">🛍️</span>
              <div>
                <strong>{t('sidebar.customer', 'Customer')}:</strong> {t('auth.customer_desc', 'Discover and purchase authentic Ethiopian crafts, learn about cultural heritage, and support local artisans')}
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-ethiopian-green">🎨</span>
              <div>
                <strong>{t('sidebar.artisan', 'Artisan')}:</strong> {t('auth.artisan_desc', 'Showcase your traditional crafts, share your cultural stories, and reach customers worldwide')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
