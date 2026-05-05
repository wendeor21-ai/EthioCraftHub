/**
 * Professional Artisan Settings & Profile Management
 * Comprehensive settings page with tabs for profile, bank, notifications, and security
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api, { artisanAPI, userAPI } from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import BankConfirmModal from '../../components/settings/BankConfirmModal';
import {
  Store,
  CreditCard,
  Bell,
  Shield,
  Globe,
  Plane,
  CheckCircle,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Upload,
  User as UserIcon,
  Award,
  Users,
  History
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  validateEthiopianPhone,
  validateAccountHolderName,
  validateBankName,
  validateAccountNumber,
  validatePassword,
  validateStoreName,
  validateBankDetails,
  VALID_BANKS
} from '../../utils/validation';

const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBankConfirmModal, setShowBankConfirmModal] = useState(false);

  // Validation errors state
  const [profileErrors, setProfileErrors] = useState({});
  const [bankErrors, setBankErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  // Profile state
  const [profileData, setProfileData] = useState({
    storeName: '',
    storeDescription: '',
    storeLogo: '',
    coverBanner: '',
    phone: '',
    experienceYears: 0,
    totalProducts: 0,
    traditionsPreserved: 0,
    workshopGallery: [],
    isVerifiedArtisan: false,
    address: {
      street: '',
      city: '',
      region: '',
      country: 'Ethiopia'
    }
  });

  // Bank details state
  const [bankData, setBankData] = useState({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    telebirrNumber: '',
    merchantId: ''
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailOnNewOrder: true,
    emailOnLowStock: true,
    emailOnReview: true,
    emailOnWithdrawal: true
  });

  // Security state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Social links
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    facebook: '',
    twitter: '',
    website: ''
  });

  // Vacation mode
  const [vacationMode, setVacationMode] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/artisan/settings');
      const data = response.data.data;
      
      // Populate profile data
      if (data.profile) {
        setProfileData({
          storeName: data.profile.storeName || '',
          storeDescription: data.profile.bio || '',
          storeLogo: data.profile.storeLogo || '',
          coverBanner: data.profile.coverBanner || '',
          phone: data.profile.phone || '',
          experienceYears: data.profile.experienceYears || 0,
          totalProducts: data.profile.totalProducts || 0,
          traditionsPreserved: data.profile.traditionsPreserved || 0,
          workshopGallery: data.profile.workshopGallery || [],
          isVerifiedArtisan: data.profile.isVerifiedArtisan || false,
          address: data.profile.address || {
            street: '',
            city: '',
            region: '',
            country: 'Ethiopia'
          }
        });
      }

      // Populate bank data
      if (data.bankDetails) {
        setBankData(data.bankDetails);
      }

      // Populate notifications
      if (data.notifications) {
        setNotifications(data.notifications);
      }

      // Populate social links
      if (data.socialLinks) {
        setSocialLinks(data.socialLinks);
      }

      // Set vacation mode
      setVacationMode(data.vacationMode || false);

    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    // Validate profile data
    const errors = {};
    
    if (profileData.storeName) {
      const storeNameValidation = validateStoreName(profileData.storeName);
      if (!storeNameValidation.valid) {
        errors.storeName = storeNameValidation.error;
      }
    }
    
    if (profileData.phone) {
      const phoneValidation = validateEthiopianPhone(profileData.phone);
      if (!phoneValidation.valid) {
        errors.phone = phoneValidation.error;
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      toast.error('Please fix validation errors before saving');
      return;
    }
    
    setProfileErrors({});
    
    try {
      setSaving(true);
      await api.patch('/artisan/settings/profile', profileData);
      toast.success('Profile updated successfully');
      
      // Update user context if store name changed
      if (profileData.storeName) {
        updateUser({ ...user, profile: { ...user.profile, storeName: profileData.storeName } });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMsg = error.response?.data?.errors?.join(', ') || error.response?.data?.error || 'Failed to update profile';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const saveBankDetails = async () => {
    // Validate bank details
    const validation = validateBankDetails(bankData);
    
    if (!validation.valid) {
      setBankErrors(validation.errors);
      toast.error('Please fix validation errors before saving');
      return;
    }
    
    setBankErrors({});
    
    // Show confirmation modal
    setShowBankConfirmModal(true);
  };
  
  const confirmBankDetailsSave = async () => {
    setShowBankConfirmModal(false);
    
    try {
      setSaving(true);
      await api.patch('/artisan/settings/bank', bankData);
      toast.success('Bank details updated successfully');
    } catch (error) {
      console.error('Error saving bank details:', error);
      const errorMsg = error.response?.data?.errors?.join(', ') || error.response?.data?.error || 'Failed to update bank details';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    try {
      setSaving(true);
      await api.patch('/artisan/settings/notifications', notifications);
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast.error('Failed to update notifications');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    // Validate passwords
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else {
      const passwordValidation = validatePassword(passwordData.newPassword);
      if (!passwordValidation.valid) {
        errors.newPassword = passwordValidation.error;
      }
    }
    
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      toast.error('Please fix validation errors before saving');
      return;
    }
    
    setPasswordErrors({});

    try {
      setSaving(true);
      await api.post('/artisan/settings/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      toast.success('Password changed successfully! Logging out...');
      
      // Clear password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Logout and redirect to login after a short delay
      setTimeout(async () => {
        await logout();
        navigate('/login', { 
          state: { message: 'Password changed successfully. Please log in with your new password.' }
        });
      }, 1500);
      
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMsg = error.response?.data?.errors?.join(', ') || error.response?.data?.error || 'Failed to change password';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const toggleVacationMode = async () => {
    try {
      const newMode = !vacationMode;
      await api.patch('/artisan/settings/vacation-mode', { enabled: newMode });
      setVacationMode(newMode);
      toast.success(`Vacation mode ${newMode ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling vacation mode:', error);
      toast.error('Failed to toggle vacation mode');
    }
  };

  const saveSocialLinks = async () => {
    try {
      setSaving(true);
      await api.patch('/artisan/settings/social-links', socialLinks);
      toast.success('Social links updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to update profile';
      const detailErrors = error.response?.data?.errors;
      
      if (detailErrors && Array.isArray(detailErrors)) {
        toast.error(`${errorMsg}: ${detailErrors.join(', ')}`);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Store Profile', icon: Store },
    { id: 'bank', label: 'Bank & Payment', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'social', label: 'Social & More', icon: Globe }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/artisan/dashboard')}
            className="text-ethiopian-gold hover:text-ethiopian-earth mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your store profile, payments, and preferences</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px space-x-8 overflow-x-auto px-6">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-ethiopian-gold text-ethiopian-gold'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <ProfileTab 
                data={profileData}
                setData={setProfileData}
                onSave={saveProfile}
                saving={saving}
                errors={profileErrors}
                setErrors={setProfileErrors}
              />
            )}

            {activeTab === 'bank' && (
              <BankTab 
                data={bankData}
                setData={setBankData}
                onSave={saveBankDetails}
                saving={saving}
                verificationStatus={user?.verification?.status}
                errors={bankErrors}
                setErrors={setBankErrors}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsTab 
                data={notifications}
                setData={setNotifications}
                onSave={saveNotifications}
                saving={saving}
              />
            )}

            {activeTab === 'security' && (
              <SecurityTab 
                data={passwordData}
                setData={setPasswordData}
                onChangePassword={changePassword}
                saving={saving}
                errors={passwordErrors}
                setErrors={setPasswordErrors}
              />
            )}

            {activeTab === 'social' && (
              <SocialTab 
                socialLinks={socialLinks}
                setSocialLinks={setSocialLinks}
                vacationMode={vacationMode}
                onToggleVacation={toggleVacationMode}
                onSaveSocial={saveSocialLinks}
                saving={saving}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Bank Confirmation Modal */}
      <BankConfirmModal
        isOpen={showBankConfirmModal}
        onClose={() => setShowBankConfirmModal(false)}
        onConfirm={confirmBankDetailsSave}
        bankData={bankData}
      />
    </div>
  );
};

// Profile Tab Component
const ProfileTab = ({ data, setData, onSave, saving, errors, setErrors }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB");
      return;
    }

    const formData = new FormData();
    formData.append('files', file);

    try {
      setUploading(true);
      const response = await userAPI.uploadFiles(formData);
      
      const uploadedUrl = response.data.files?.[0];
      if (!uploadedUrl) throw new Error("No URL returned from server");

      if (type === 'logo') {
        setData({ ...data, storeLogo: uploadedUrl });
      } else if (type === 'banner') {
        setData({ ...data, coverBanner: uploadedUrl });
      } else if (type === 'gallery') {
        setData({ ...data, workshopGallery: [...data.workshopGallery, uploadedUrl].slice(0, 4) });
      }
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleStoreNameChange = (e) => {
    const value = e.target.value;
    setData({ ...data, storeName: value });
    if (value) {
      const validation = validateStoreName(value);
      if (!validation.valid) setErrors({ ...errors, storeName: validation.error });
      else {
        const newErrors = { ...errors };
        delete newErrors.storeName;
        setErrors(newErrors);
      }
    }
  };
  
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setData({ ...data, phone: value });
    if (value) {
      const validation = validateEthiopianPhone(value);
      if (!validation.valid) setErrors({ ...errors, phone: validation.error });
      else {
        const newErrors = { ...errors };
        delete newErrors.phone;
        setErrors(newErrors);
      }
    }
  };
  
  const isValid = !errors.storeName && !errors.phone;
  
  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Store Profile & Professional Branding</h3>
          <p className="text-sm text-gray-600">Represent your artisan heritage and brand to the world</p>
        </div>
        <div className="flex items-center gap-3 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
          <label className="text-xs font-black text-amber-700 uppercase tracking-widest">Verified Artisan</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={data.isVerifiedArtisan}
              onChange={(e) => setData({ ...data, isVerifiedArtisan: e.target.checked })}
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ethiopian-gold"></div>
          </label>
        </div>
      </div>

      {/* Visual Identity: Logo & Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Professional Headshot</label>
          <div className="relative group w-48 h-48 mx-auto lg:mx-0">
            <div className="w-full h-full rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-gray-50 flex items-center justify-center">
              {data.storeLogo ? (
                <img src={data.storeLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-16 h-16 text-gray-200" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                  <LoadingSpinner size="small" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 p-3 bg-ethiopian-gold text-white rounded-2xl shadow-lg cursor-pointer hover:scale-110 transition-all">
              <Camera className="w-5 h-5" />
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
            </label>
          </div>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Store Banner</label>
          <div className="relative h-48 rounded-3xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 group">
            {data.coverBanner ? (
              <img src={data.coverBanner} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
                <span className="text-sm font-medium">Upload wide workshop banner</span>
              </div>
            )}
            <label className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md rounded-xl shadow-md cursor-pointer hover:bg-white transition-all">
              <Upload className="w-4 h-4 text-gray-900" />
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'banner')} />
            </label>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Store Name</label>
          <input
            type="text"
            value={data.storeName}
            onChange={handleStoreNameChange}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-ethiopian-gold outline-none ${errors.storeName ? 'border-red-500' : 'border-gray-200'}`}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Public Phone</label>
          <input
            type="tel"
            value={data.phone}
            onChange={handlePhoneChange}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-ethiopian-gold outline-none ${errors.phone ? 'border-red-500' : 'border-gray-200'}`}
          />
        </div>
      </div>

      {/* Expanded Bio / Story */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Your Artisan Story</label>
        <textarea
          value={data.storeDescription}
          onChange={(e) => setData({ ...data, storeDescription: e.target.value })}
          rows="6"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ethiopian-gold outline-none text-gray-600 leading-relaxed"
          placeholder="Share your heritage, the techniques you use, and the community you serve..."
        />
      </div>

      {/* Experience & Impact Stats */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Artisan Statistics & Impact</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><History className="w-6 h-6" /></div>
            <div className="flex-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Years Experience</label>
              <input 
                type="number" 
                value={data.experienceYears} 
                onChange={(e) => setData({ ...data, experienceYears: parseInt(e.target.value) })}
                className="w-full bg-transparent font-bold text-gray-900 outline-none"
              />
            </div>
          </div>
          <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Award className="w-6 h-6" /></div>
            <div className="flex-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Total Products</label>
              <input 
                type="number" 
                value={data.totalProducts} 
                onChange={(e) => setData({ ...data, totalProducts: parseInt(e.target.value) })}
                className="w-full bg-transparent font-bold text-gray-900 outline-none"
              />
            </div>
          </div>
          <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><Users className="w-6 h-6" /></div>
            <div className="flex-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Traditions Preserved</label>
              <input 
                type="number" 
                value={data.traditionsPreserved} 
                onChange={(e) => setData({ ...data, traditionsPreserved: parseInt(e.target.value) })}
                className="w-full bg-transparent font-bold text-gray-900 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Workshop Gallery */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">Workshop Gallery</label>
          <span className="text-[10px] font-bold text-gray-400 uppercase">Max 4 photos</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.workshopGallery.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border border-gray-100">
              <img src={img} className="w-full h-full object-cover" />
              <button 
                onClick={() => setData({ ...data, workshopGallery: data.workshopGallery.filter((_, i) => i !== idx) })}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Upload className="w-3 h-3 rotate-45" />
              </button>
            </div>
          ))}
          {data.workshopGallery.length < 4 && (
            <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-ethiopian-gold hover:bg-amber-50 transition-all cursor-pointer">
              <Camera className="w-6 h-6 mb-2" />
              <span className="text-[10px] font-black uppercase">Add Photo</span>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'gallery')} />
            </label>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide text-gray-800 flex items-center gap-2">
            City <span className="text-gray-400 font-medium lowercase">/ Region</span>
          </label>
          <input
            type="text"
            value={data.address.city}
            onChange={(e) => setData({ ...data, address: { ...data.address, city: e.target.value } })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ethiopian-gold outline-none"
            placeholder="Addis Ababa"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Historical Origin</label>
          <select
            value={data.address.region}
            onChange={(e) => setData({ ...data, address: { ...data.address, region: e.target.value } })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ethiopian-gold outline-none bg-white font-medium"
          >
            <option value="">Select Region</option>
            {["Harar", "Gondar", "Axum", "Lalibela", "Jimma", "Arba Minch", "Debre Markos", "Dessie", "Bahar Dar", "Dire Dawa", "Addis Ababa"].map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving || !isValid}
          className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:shadow-2xl hover:shadow-gray-300 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <LoadingSpinner size="small" />}
          {saving ? 'Synchronizing...' : 'Save Artisan Profile'}
        </button>
      </div>
    </div>
  );
};

// Bank Tab Component
const BankTab = ({ data, setData, onSave, saving, verificationStatus, errors, setErrors }) => {
  const handleAccountHolderChange = (e) => {
    const value = e.target.value;
    setData({ ...data, accountHolderName: value });
    
    // Real-time validation
    if (value) {
      const validation = validateAccountHolderName(value);
      if (!validation.valid) {
        setErrors({ ...errors, accountHolderName: validation.error });
      } else {
        const newErrors = { ...errors };
        delete newErrors.accountHolderName;
        setErrors(newErrors);
      }
    }
  };
  
  const handleBankNameChange = (e) => {
    const value = e.target.value;
    setData({ ...data, bankName: value });
    
    // Real-time validation
    if (value) {
      const validation = validateBankName(value);
      if (!validation.valid) {
        setErrors({ ...errors, bankName: validation.error });
      } else {
        const newErrors = { ...errors };
        delete newErrors.bankName;
        setErrors(newErrors);
      }
    }
  };
  
  const handleAccountNumberChange = (e) => {
    const value = e.target.value;
    setData({ ...data, accountNumber: value });
    
    // Real-time validation
    if (value) {
      const validation = validateAccountNumber(value);
      if (!validation.valid) {
        setErrors({ ...errors, accountNumber: validation.error });
      } else {
        const newErrors = { ...errors };
        delete newErrors.accountNumber;
        setErrors(newErrors);
      }
    }
  };
  
  const handleTelebirrChange = (e) => {
    const value = e.target.value;
    setData({ ...data, telebirrNumber: value });
    
    // Real-time validation
    if (value) {
      const validation = validateEthiopianPhone(value);
      if (!validation.valid) {
        setErrors({ ...errors, telebirrNumber: validation.error });
      } else {
        const newErrors = { ...errors };
        delete newErrors.telebirrNumber;
        setErrors(newErrors);
      }
    }
  };

  const handleMerchantIdChange = (e) => {
    const value = e.target.value;
    setData({ ...data, merchantId: value });
  };
  
  const isValid = !errors.accountHolderName && !errors.bankName && !errors.accountNumber && !errors.telebirrNumber;
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank & Payment Setup</h3>
        <p className="text-sm text-gray-600 mb-6">Configure your payout methods for withdrawals</p>
        
        {verificationStatus === 'approved' && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Verified Account</span>
          </div>
        )}
        
        {verificationStatus === 'pending' && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Verification Pending</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bank Name <span className="text-red-500">*</span>
          </label>
          <select
            value={data.bankName}
            onChange={handleBankNameChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent ${
              errors.bankName ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select a bank</option>
            {VALID_BANKS.map(bank => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
          </select>
          {errors.bankName && (
            <p className="mt-1 text-sm text-red-600">{errors.bankName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Holder Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.accountHolderName}
            onChange={handleAccountHolderChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent ${
              errors.accountHolderName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Full Name (letters only)"
          />
          {errors.accountHolderName && (
            <p className="mt-1 text-sm text-red-600">{errors.accountHolderName}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.accountNumber}
            onChange={handleAccountNumberChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent ${
              errors.accountNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="10-15 digits"
          />
          {errors.accountNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.accountNumber}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telebirr Number
          </label>
          <input
            type="tel"
            value={data.telebirrNumber}
            onChange={handleTelebirrChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent ${
              errors.telebirrNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="+251 XXX XXX XXX"
          />
          {errors.telebirrNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.telebirrNumber}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Merchant ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.merchantId}
            onChange={handleMerchantIdChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
            placeholder="Telebirr/Bank Merchant ID"
            required
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving || !isValid}
          className="px-6 py-3 bg-ethiopian-gold text-white rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Bank Details'}
        </button>
      </div>
    </div>
  );
};

// Notifications Tab Component
const NotificationsTab = ({ data, setData, onSave, saving }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
      <p className="text-sm text-gray-600 mb-6">Choose what updates you want to receive</p>
    </div>

    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">New Order Alerts</p>
          <p className="text-sm text-gray-600">Get notified when you receive a new order</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={data.emailOnNewOrder}
            onChange={(e) => setData({ ...data, emailOnNewOrder: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ethiopian-gold/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ethiopian-gold"></div>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">Low Stock Alerts</p>
          <p className="text-sm text-gray-600">Get notified when products are running low</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={data.emailOnLowStock}
            onChange={(e) => setData({ ...data, emailOnLowStock: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ethiopian-gold/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ethiopian-gold"></div>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">Review Notifications</p>
          <p className="text-sm text-gray-600">Get notified when customers leave reviews</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={data.emailOnReview}
            onChange={(e) => setData({ ...data, emailOnReview: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ethiopian-gold/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ethiopian-gold"></div>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">Withdrawal Updates</p>
          <p className="text-sm text-gray-600">Get notified about withdrawal status changes</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={data.emailOnWithdrawal}
            onChange={(e) => setData({ ...data, emailOnWithdrawal: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ethiopian-gold/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ethiopian-gold"></div>
        </label>
      </div>
    </div>

    <div className="flex justify-end">
      <button
        onClick={onSave}
        disabled={saving}
        className="px-6 py-3 bg-ethiopian-gold text-white rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  </div>
);

// Security Tab Component
const SecurityTab = ({ data, setData, onChangePassword, saving, errors, setErrors }) => {
  const handleNewPasswordChange = (e) => {
    const value = e.target.value;
    setData({ ...data, newPassword: value });
    
    // Real-time validation
    if (value) {
      const validation = validatePassword(value);
      if (!validation.valid) {
        setErrors({ ...errors, newPassword: validation.error });
      } else {
        const newErrors = { ...errors };
        delete newErrors.newPassword;
        setErrors(newErrors);
      }
    }
    
    // Check if passwords match
    if (data.confirmPassword && value !== data.confirmPassword) {
      setErrors({ ...errors, confirmPassword: 'Passwords do not match' });
    } else if (data.confirmPassword && value === data.confirmPassword) {
      const newErrors = { ...errors };
      delete newErrors.confirmPassword;
      setErrors(newErrors);
    }
  };
  
  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setData({ ...data, confirmPassword: value });
    
    // Check if passwords match
    if (value && data.newPassword !== value) {
      setErrors({ ...errors, confirmPassword: 'Passwords do not match' });
    } else {
      const newErrors = { ...errors };
      delete newErrors.confirmPassword;
      setErrors(newErrors);
    }
  };
  
  const isValid = data.currentPassword && 
                  data.newPassword && 
                  data.confirmPassword && 
                  data.newPassword === data.confirmPassword &&
                  !errors.newPassword && 
                  !errors.confirmPassword;
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
        <p className="text-sm text-gray-600 mb-6">Manage your password and account security</p>
      </div>

      {/* Password Requirements Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Password Requirements:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Minimum 8 characters</li>
          <li>• At least one uppercase letter (A-Z)</li>
          <li>• At least one number (0-9)</li>
          <li>• At least one special character (!@#$%^&*...)</li>
        </ul>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={data.currentPassword}
            onChange={(e) => setData({ ...data, currentPassword: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
            placeholder="Enter current password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={data.newPassword}
            onChange={handleNewPasswordChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent ${
              errors.newPassword ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter new password"
          />
          {errors.newPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm New Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={data.confirmPassword}
            onChange={handleConfirmPasswordChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent ${
              errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Confirm new password"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onChangePassword}
          disabled={saving || !isValid}
          className="px-6 py-3 bg-ethiopian-gold text-white rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Changing...' : 'Change Password'}
        </button>
      </div>

      <div className="border-t border-gray-200 pt-6 mt-6">
        <h4 className="font-semibold text-gray-900 mb-2">Two-Factor Authentication</h4>
        <p className="text-sm text-gray-600 mb-4">Add an extra layer of security to your account</p>
        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
          Enable 2FA (Coming Soon)
        </button>
      </div>
    </div>
  );
};

// Social Tab Component
const SocialTab = ({ socialLinks, setSocialLinks, vacationMode, onToggleVacation, onSaveSocial, saving }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Links & Additional Settings</h3>
      <p className="text-sm text-gray-600 mb-6">Connect your social media and manage store availability</p>
    </div>

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Instagram
        </label>
        <input
          type="text"
          value={socialLinks.instagram}
          onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
          placeholder="https://instagram.com/yourstore"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Facebook
        </label>
        <input
          type="text"
          value={socialLinks.facebook}
          onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
          placeholder="https://facebook.com/yourstore"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Website
        </label>
        <input
          type="text"
          value={socialLinks.website}
          onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
          placeholder="https://yourwebsite.com"
        />
      </div>
    </div>

    <div className="flex justify-end">
      <button
        onClick={onSaveSocial}
        disabled={saving}
        className="px-6 py-3 bg-ethiopian-gold text-white rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save Social Links'}
      </button>
    </div>

    <div className="border-t border-gray-200 pt-6 mt-6">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <Plane className="w-6 h-6 text-gray-600" />
          <div>
            <p className="font-medium text-gray-900">Vacation Mode</p>
            <p className="text-sm text-gray-600">Temporarily hide your products from the marketplace</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={vacationMode}
            onChange={onToggleVacation}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ethiopian-gold/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ethiopian-gold"></div>
        </label>
      </div>
    </div>
  </div>
);

export default Settings;
