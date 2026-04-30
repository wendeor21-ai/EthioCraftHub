/**
 * Settings Page for EthioCraft Global
 * Enhanced with Security and Appearance sections
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { Shield, Palette, User, Bell, Lock, Mail, Check } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Profile Settings
  const [profileData, setProfileData] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    email: user?.email || '',
    phone: user?.profile?.phone || '',
    bio: user?.profile?.bio || ''
  });

  // Security Settings
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    verificationEmail: user?.email || ''
  });

  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  // Appearance Settings
  const [appearanceData, setAppearanceData] = useState({
    primaryColor: localStorage.getItem('primaryColor') || '#D4AF37',
    fontFamily: localStorage.getItem('fontFamily') || 'Inter',
    darkMode: localStorage.getItem('darkMode') === 'true'
  });

  // Notification Settings
  const [notificationData, setNotificationData] = useState({
    emailNotifications: true,
    orderUpdates: true,
    messageAlerts: true,
    marketingEmails: false
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  const colorOptions = [
    { name: 'Ethiopian Gold', value: '#D4AF37' },
    { name: 'Ethiopian Green', value: '#228B22' },
    { name: 'Ethiopian Red', value: '#DC143C' },
    { name: 'Ethiopian Blue', value: '#4169E1' },
    { name: 'Ethiopian Brown', value: '#8B4513' }
  ];

  const fontOptions = [
    { name: 'Inter (Default)', value: 'Inter' },
    { name: 'Roboto', value: 'Roboto' },
    { name: 'Open Sans', value: 'Open Sans' },
    { name: 'Lato', value: 'Lato' },
    { name: 'Poppins', value: 'Poppins' }
  ];

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        setMessage('Profile updated successfully!');
      } else {
        setError('Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Validate passwords
    if (securityData.newPassword !== securityData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (securityData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: securityData.currentPassword,
          newPassword: securityData.newPassword
        })
      });

      if (response.ok) {
        setMessage('Password updated successfully!');
        setSecurityData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          verificationEmail: user?.email || ''
        });
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to update password');
      }
    } catch (err) {
      console.error('Error updating password:', err);
      setError('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: securityData.verificationEmail
        })
      });

      if (response.ok) {
        setEmailVerificationSent(true);
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        setError('Failed to send verification email');
      }
    } catch (err) {
      console.error('Error sending verification email:', err);
      setError('Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleAppearanceUpdate = (e) => {
    e.preventDefault();
    
    // Save to localStorage
    localStorage.setItem('primaryColor', appearanceData.primaryColor);
    localStorage.setItem('fontFamily', appearanceData.fontFamily);
    localStorage.setItem('darkMode', appearanceData.darkMode);

    // Apply theme changes
    document.documentElement.style.setProperty('--primary-color', appearanceData.primaryColor);
    document.documentElement.style.setProperty('--font-family', appearanceData.fontFamily);
    
    if (appearanceData.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    setMessage('Appearance settings saved!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleNotificationUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/users/notifications`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationData)
      });

      if (response.ok) {
        setMessage('Notification preferences updated!');
      } else {
        setError('Failed to update notification preferences');
      }
    } catch (err) {
      console.error('Error updating notifications:', err);
      setError('Failed to update notification preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/artisan/dashboard')}
            className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account preferences</p>
        </div>

        {message && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center">
            <Check className="w-5 h-5 mr-2" />
            {message}
          </div>
        )}

        {error && <ErrorMessage message={error} className="mb-6" />}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <nav className="space-y-2">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-ethiopian-gold text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg p-8">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Information</h2>
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={profileData.firstName}
                          onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                        placeholder="Tell customers about yourself and your craft..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-ethiopian-gold text-white py-3 rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      {loading && <LoadingSpinner size="small" className="mr-2" />}
                      Save Profile
                    </button>
                  </form>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h2>
                  
                  {/* Password Reset Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Lock className="w-5 h-5 mr-2" />
                      Change Password
                    </h3>
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={securityData.currentPassword}
                          onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={securityData.newPassword}
                          onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                          required
                          minLength={8}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Must be at least 8 characters long
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={securityData.confirmPassword}
                          onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-ethiopian-gold text-white py-3 rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        {loading && <LoadingSpinner size="small" className="mr-2" />}
                        Update Password
                      </button>
                    </form>
                  </div>

                  {/* Email Verification Section */}
                  <div className="border-t border-gray-200 pt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Mail className="w-5 h-5 mr-2" />
                      Email Verification
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Verify your email address to enhance account security and receive important notifications.
                    </p>
                    <div className="flex items-center space-x-4">
                      <input
                        type="email"
                        value={securityData.verificationEmail}
                        onChange={(e) => setSecurityData({ ...securityData, verificationEmail: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                        placeholder="your@email.com"
                      />
                      <button
                        onClick={handleSendVerificationEmail}
                        disabled={loading || emailVerificationSent}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {emailVerificationSent ? 'Sent!' : 'Send Verification'}
                      </button>
                    </div>
                    {emailVerificationSent && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ Verification email sent! Please check your inbox.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Appearance Settings</h2>
                  <form onSubmit={handleAppearanceUpdate} className="space-y-6">
                    {/* Primary Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Primary Color
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {colorOptions.map(color => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setAppearanceData({ ...appearanceData, primaryColor: color.value })}
                            className={`flex items-center space-x-3 p-3 border-2 rounded-lg transition-all ${
                              appearanceData.primaryColor === color.value
                                ? 'border-gray-900 bg-gray-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div
                              className="w-8 h-8 rounded-full"
                              style={{ backgroundColor: color.value }}
                            />
                            <span className="text-sm font-medium">{color.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Family */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Font Family
                      </label>
                      <select
                        value={appearanceData.fontFamily}
                        onChange={(e) => setAppearanceData({ ...appearanceData, fontFamily: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                      >
                        {fontOptions.map(font => (
                          <option key={font.value} value={font.value}>
                            {font.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dark Mode Toggle */}
                    <div>
                      <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <div>
                          <span className="text-sm font-medium text-gray-900">Dark Mode</span>
                          <p className="text-xs text-gray-500 mt-1">
                            Switch between light and dark theme
                          </p>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={appearanceData.darkMode}
                            onChange={(e) => setAppearanceData({ ...appearanceData, darkMode: e.target.checked })}
                            className="sr-only"
                          />
                          <div
                            className={`w-14 h-8 rounded-full transition-colors ${
                              appearanceData.darkMode ? 'bg-ethiopian-gold' : 'bg-gray-300'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                                appearanceData.darkMode ? 'translate-x-7' : 'translate-x-1'
                              } mt-1`}
                            />
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Preview */}
                    <div className="border border-gray-200 rounded-lg p-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Preview</h4>
                      <div
                        className="p-6 rounded-lg"
                        style={{
                          backgroundColor: appearanceData.darkMode ? '#1F2937' : '#FFFFFF',
                          fontFamily: appearanceData.fontFamily
                        }}
                      >
                        <h3
                          className="text-xl font-bold mb-2"
                          style={{
                            color: appearanceData.darkMode ? '#FFFFFF' : appearanceData.primaryColor
                          }}
                        >
                          Sample Heading
                        </h3>
                        <p style={{ color: appearanceData.darkMode ? '#D1D5DB' : '#4B5563' }}>
                          This is how your text will appear with the selected settings.
                        </p>
                        <button
                          type="button"
                          className="mt-4 px-4 py-2 rounded-lg text-white"
                          style={{ backgroundColor: appearanceData.primaryColor }}
                        >
                          Sample Button
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-ethiopian-gold text-white py-3 rounded-lg hover:bg-ethiopian-earth transition-colors"
                    >
                      Save Appearance Settings
                    </button>
                  </form>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
                  <form onSubmit={handleNotificationUpdate} className="space-y-4">
                    <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <div>
                        <span className="text-sm font-medium text-gray-900">Email Notifications</span>
                        <p className="text-xs text-gray-500 mt-1">
                          Receive notifications via email
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationData.emailNotifications}
                        onChange={(e) => setNotificationData({ ...notificationData, emailNotifications: e.target.checked })}
                        className="w-5 h-5 text-ethiopian-gold focus:ring-ethiopian-gold"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <div>
                        <span className="text-sm font-medium text-gray-900">Order Updates</span>
                        <p className="text-xs text-gray-500 mt-1">
                          Get notified about new orders and status changes
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationData.orderUpdates}
                        onChange={(e) => setNotificationData({ ...notificationData, orderUpdates: e.target.checked })}
                        className="w-5 h-5 text-ethiopian-gold focus:ring-ethiopian-gold"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <div>
                        <span className="text-sm font-medium text-gray-900">Message Alerts</span>
                        <p className="text-xs text-gray-500 mt-1">
                          Receive alerts for new customer messages
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationData.messageAlerts}
                        onChange={(e) => setNotificationData({ ...notificationData, messageAlerts: e.target.checked })}
                        className="w-5 h-5 text-ethiopian-gold focus:ring-ethiopian-gold"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <div>
                        <span className="text-sm font-medium text-gray-900">Marketing Emails</span>
                        <p className="text-xs text-gray-500 mt-1">
                          Receive promotional emails and updates
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationData.marketingEmails}
                        onChange={(e) => setNotificationData({ ...notificationData, marketingEmails: e.target.checked })}
                        className="w-5 h-5 text-ethiopian-gold focus:ring-ethiopian-gold"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-ethiopian-gold text-white py-3 rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      {loading && <LoadingSpinner size="small" className="mr-2" />}
                      Save Notification Preferences
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
