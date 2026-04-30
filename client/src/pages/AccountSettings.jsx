/**
 * Account Settings Page for EthioCraft Global
 * 
 * Dedicated page for managing account preferences:
 * - Email address
 * - Phone number
 * - Language preference
 * - Notification preferences
 * - Privacy settings
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { 
  Mail, 
  Phone, 
  Globe, 
  Bell, 
  Shield, 
  Save, 
  ArrowLeft,
  Check,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const AccountSettings = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    language: 'en',
    emailNotifications: true,
    smsNotifications: false,
    orderUpdates: true,
    promotionalEmails: false,
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false
  });

  console.log('✅ AccountSettings component loaded');

  // Initialize form data
  useEffect(() => {
    if (user) {
      // Load from localStorage or use defaults
      const savedLanguage = localStorage.getItem('userLanguage') || 'en';
      const savedEmailNotif = localStorage.getItem('emailNotifications') !== 'false';
      const savedSmsNotif = localStorage.getItem('smsNotifications') === 'true';
      const savedOrderUpdates = localStorage.getItem('orderUpdates') !== 'false';
      const savedPromoEmails = localStorage.getItem('promotionalEmails') === 'true';
      const savedProfileVis = localStorage.getItem('profileVisibility') || 'public';
      const savedShowEmail = localStorage.getItem('showEmail') === 'true';
      const savedShowPhone = localStorage.getItem('showPhone') === 'true';

      setFormData({
        email: user?.email || '',
        phone: user?.profile?.phone || '',
        language: savedLanguage,
        emailNotifications: savedEmailNotif,
        smsNotifications: savedSmsNotif,
        orderUpdates: savedOrderUpdates,
        promotionalEmails: savedPromoEmails,
        profileVisibility: savedProfileVis,
        showEmail: savedShowEmail,
        showPhone: savedShowPhone
      });
    }
  }, [user]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Save phone number to backend
      const response = await api.put('/users/profile', {
        phone: formData.phone
      });

      if (response.data.success) {
        // Update user in context
        const updatedUser = {
          ...user,
          profile: {
            ...user.profile,
            phone: formData.phone
          }
        };
        updateUser(updatedUser);
        
        // Save preferences to localStorage
        localStorage.setItem('userLanguage', formData.language);
        localStorage.setItem('emailNotifications', formData.emailNotifications);
        localStorage.setItem('smsNotifications', formData.smsNotifications);
        localStorage.setItem('orderUpdates', formData.orderUpdates);
        localStorage.setItem('promotionalEmails', formData.promotionalEmails);
        localStorage.setItem('profileVisibility', formData.profileVisibility);
        localStorage.setItem('showEmail', formData.showEmail);
        localStorage.setItem('showPhone', formData.showPhone);
        
        toast.success('Account settings updated successfully!');
      }
    } catch (error) {
      console.error('Error updating account settings:', error);
      toast.error(error.response?.data?.message || 'Failed to update settings');
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
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Account Settings</h1>
          <p className="text-gray-600">Manage your account preferences and privacy settings</p>
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              Language, notification, and privacy preferences are saved locally in your browser. 
              Phone number changes are saved to your account.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information Section */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-600 via-amber-400 to-red-600"></div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Mail className="w-6 h-6 mr-3 text-amber-600" />
                Contact Information
              </h2>

              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="w-full px-4 py-3 pl-11 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                    <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Email cannot be changed for security reasons
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="+251 912 345 678"
                    />
                    <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Language Preference Section */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-600 via-amber-400 to-red-600"></div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Globe className="w-6 h-6 mr-3 text-green-600" />
                Language Preference
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Language
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="am">አማርኛ (Amharic)</option>
                  <option value="om">Afaan Oromoo (Oromo)</option>
                  <option value="ti">ትግርኛ (Tigrinya)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification Preferences Section */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-600 via-amber-400 to-red-600"></div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Bell className="w-6 h-6 mr-3 text-blue-600" />
                Notification Preferences
              </h2>

              <div className="space-y-4">
                {/* Email Notifications */}
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Email Notifications</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Receive important updates via email
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      name="emailNotifications"
                      checked={formData.emailNotifications}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div
                      className={`w-14 h-8 rounded-full transition-colors ${
                        formData.emailNotifications ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                          formData.emailNotifications ? 'translate-x-7' : 'translate-x-1'
                        } mt-1`}
                      />
                    </div>
                  </div>
                </label>

                {/* SMS Notifications */}
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="text-sm font-medium text-gray-900">SMS Notifications</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Receive text messages for urgent updates
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      name="smsNotifications"
                      checked={formData.smsNotifications}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div
                      className={`w-14 h-8 rounded-full transition-colors ${
                        formData.smsNotifications ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                          formData.smsNotifications ? 'translate-x-7' : 'translate-x-1'
                        } mt-1`}
                      />
                    </div>
                  </div>
                </label>

                {/* Order Updates */}
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Order Updates</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Get notified about order status changes
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      name="orderUpdates"
                      checked={formData.orderUpdates}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div
                      className={`w-14 h-8 rounded-full transition-colors ${
                        formData.orderUpdates ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                          formData.orderUpdates ? 'translate-x-7' : 'translate-x-1'
                        } mt-1`}
                      />
                    </div>
                  </div>
                </label>

                {/* Promotional Emails */}
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Promotional Emails</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Receive special offers and promotions
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      name="promotionalEmails"
                      checked={formData.promotionalEmails}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div
                      className={`w-14 h-8 rounded-full transition-colors ${
                        formData.promotionalEmails ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                          formData.promotionalEmails ? 'translate-x-7' : 'translate-x-1'
                        } mt-1`}
                      />
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Privacy Settings Section */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-600 via-amber-400 to-red-600"></div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Shield className="w-6 h-6 mr-3 text-purple-600" />
                Privacy Settings
              </h2>

              <div className="space-y-4">
                {/* Profile Visibility */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Visibility
                  </label>
                  <select
                    name="profileVisibility"
                    value={formData.profileVisibility}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="public">Public - Anyone can view</option>
                    <option value="registered">Registered Users Only</option>
                    <option value="private">Private - Hidden from search</option>
                  </select>
                </div>

                {/* Show Email */}
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Show Email on Profile</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Allow others to see your email address
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    name="showEmail"
                    checked={formData.showEmail}
                    onChange={handleChange}
                    className="w-5 h-5 text-purple-600 focus:ring-purple-500 rounded"
                  />
                </label>

                {/* Show Phone */}
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Show Phone on Profile</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Allow others to see your phone number
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    name="showPhone"
                    checked={formData.showPhone}
                    onChange={handleChange}
                    className="w-5 h-5 text-purple-600 focus:ring-purple-500 rounded"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span className="font-semibold">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span className="font-semibold">Save Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountSettings;
