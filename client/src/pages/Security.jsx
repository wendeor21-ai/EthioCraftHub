/**
 * Security Page for EthioCraft Global
 * 
 * Dedicated page for security settings:
 * - Change password
 * - Password strength indicator
 * - Logout from all devices
 * - Last login activity
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  Shield, 
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  LogOut,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const Security = () => {
  const { user, logout, updateUser, getRedirectPath } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Password strength calculation
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 12.5;
    if (/[^a-zA-Z\d]/.test(password)) strength += 12.5;
    return Math.min(strength, 100);
  };

  const passwordStrength = calculatePasswordStrength(formData.newPassword);

  const getStrengthColor = () => {
    if (passwordStrength < 25) return 'bg-red-500';
    if (passwordStrength < 50) return 'bg-orange-500';
    if (passwordStrength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (passwordStrength < 25) return 'Weak';
    if (passwordStrength < 50) return 'Fair';
    if (passwordStrength < 75) return 'Good';
    return 'Strong';
  };

  // Password requirements
  const requirements = [
    { text: 'At least 8 characters', met: formData.newPassword.length >= 8 },
    { text: 'Contains uppercase letter', met: /[A-Z]/.test(formData.newPassword) },
    { text: 'Contains lowercase letter', met: /[a-z]/.test(formData.newPassword) },
    { text: 'Contains number', met: /\d/.test(formData.newPassword) },
    { text: 'Contains special character', met: /[^a-zA-Z\d]/.test(formData.newPassword) }
  ];

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (passwordStrength < 50) {
      toast.error('Please choose a stronger password');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      if (response.data.message || response.data.code === 'PASSWORD_CHANGED') {
        toast.success('Password changed successfully!');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        // Refresh auth state from server and update context so mustChangePassword is cleared
        try {
          const me = await api.get('/auth/me');
          if (me.data && me.data.user) {
            updateUser(me.data.user);
          }
        } catch (err) {
          console.warn('Failed to refresh user after password change', err);
        }

        // Redirect to the appropriate landing page for the user
        const redirect = getRedirectPath(user?.role);
        navigate(redirect);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle logout from all devices
  const handleLogoutAllDevices = async () => {
    if (!window.confirm('Are you sure you want to logout? You will need to login again.')) {
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/logout');
      toast.success('Logged out successfully');
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      // Even if API fails, logout locally
      logout();
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Security Settings</h1>
          <p className="text-gray-600">Manage your password and security preferences</p>
        </div>

        {/* Change Password Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="h-2 bg-gradient-to-r from-green-600 via-amber-400 to-red-600"></div>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <Lock className="w-6 h-6 mr-3 text-red-600" />
              Change Password
            </h2>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.newPassword && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-600">Password Strength:</span>
                      <span className={`text-xs font-semibold ${
                        passwordStrength < 50 ? 'text-red-600' : 
                        passwordStrength < 75 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {getStrengthText()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Password Requirements */}
                {formData.newPassword && (
                  <div className="mt-4 space-y-2">
                    {requirements.map((req, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        {req.met ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={`text-xs ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || formData.newPassword !== formData.confirmPassword}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="font-semibold">Changing Password...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span className="font-semibold">Change Password</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Last Login Activity Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="h-2 bg-gradient-to-r from-green-600 via-amber-400 to-red-600"></div>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <Clock className="w-6 h-6 mr-3 text-blue-600" />
              Last Login Activity
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Login</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Not available'}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Account Created</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(user?.createdAt).toLocaleString()}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Logout from All Devices Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-green-600 via-amber-400 to-red-600"></div>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <LogOut className="w-6 h-6 mr-3 text-orange-600" />
              Logout
            </h2>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-900">Logout from this Device</p>
                  <p className="text-xs text-orange-700 mt-1">
                    This will sign you out from this device. 
                    You'll need to login again to access your account.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogoutAllDevices}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-semibold">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security;
