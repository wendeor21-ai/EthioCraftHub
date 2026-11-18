/**
 * Customer & User Account Hub for EthioCraft Global
 * 
 * Features:
 * - 3 Unified Formal Amharic Tabs:
 *   1. አካውንት (Account & Personal Details, Edit Profile, Security)
 *   2. ግብይት (Transactions, Orders, Tracking, Wishlist)
 *   3. እርዳታ እና ድጋፍ (Help & Support, Messages, Zema AI, FAQs)
 * - Mobile-first, compact professional UI matching admin/artisan typography theme
 * - Minimal scroll time, compact buttons, responsive grid
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { userAPI, orderAPI } from '../utils/api';
import toast from 'react-hot-toast';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Edit2,
  Save,
  X,
  Camera,
  ShoppingBag,
  HelpCircle,
  Truck,
  Heart,
  ShoppingCart,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  MapPin,
  Lock
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab management: 'account', 'shopping', 'support'
  const initialTab = searchParams.get('tab') || 'account';
  const [activeTab, setActiveTab] = useState(
    ['account', 'shopping', 'support', 'orders', 'help'].includes(initialTab)
      ? (initialTab === 'orders' ? 'shopping' : initialTab === 'help' ? 'support' : initialTab)
      : 'account'
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'shopping' || tab === 'orders') setActiveTab('shopping');
    else if (tab === 'support' || tab === 'help') setActiveTab('support');
    else if (tab === 'account') setActiveTab('account');
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Orders State (for ግብይት Tab)
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Initialize profile data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user?.profile?.firstName || '',
        lastName: user?.profile?.lastName || '',
        email: user?.email || '',
        phone: user?.profile?.phone || ''
      });
      setPreviewImage(user?.profile?.profileImage || null);
    }
  }, [user]);

  // Fetch orders when entering ግብይት tab
  useEffect(() => {
    if (activeTab === 'shopping' && user) {
      setLoadingOrders(true);
      orderAPI.getOrders()
        .then(res => {
          const list = res.data?.data?.orders || res.data?.orders || (Array.isArray(res.data) ? res.data : []);
          setOrders(list);
        })
        .catch(err => {
          console.error('Failed to fetch orders:', err);
        })
        .finally(() => {
          setLoadingOrders(false);
        });
    }
  }, [activeTab, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('የምስሉ መጠን ከ 5MB መብለጥ የለበትም');
        return;
      }
      setProfileImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      let uploadedImageUrl = undefined;
      if (profileImageFile) {
        const uploadData = new FormData();
        uploadData.append('files', profileImageFile);
        try {
          const uploadRes = await userAPI.uploadFiles(uploadData);
          if (uploadRes.data?.files?.length > 0) {
            uploadedImageUrl = uploadRes.data.files[0];
          }
        } catch (uploadErr) {
          console.error('Image upload failed:', uploadErr);
          toast.error('ፎቶውን መጫን አልተቻለም፤ መረጃውን ብቻ በማስቀመጥ ላይ...');
        }
      }

      const response = await api.put('/users/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        ...(uploadedImageUrl && { profileImage: uploadedImageUrl })
      });

      if (response.data.success) {
        const updatedUser = {
          ...user,
          profile: {
            ...user.profile,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            ...(uploadedImageUrl && { profileImage: uploadedImageUrl })
          }
        };
        updateUser(updatedUser);
        toast.success('የግል መረጃዎ በተሳካ ሁኔታ ተሻሽሏል!');
        setIsEditing(false);
        setProfileImageFile(null);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'መረጃውን ማሻሻል አልተሳካም');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.profile?.firstName || '',
      lastName: user?.profile?.lastName || '',
      email: user?.email || '',
      phone: user?.profile?.phone || ''
    });
    setPreviewImage(user?.profile?.profileImage || null);
    setProfileImageFile(null);
    setIsEditing(false);
  };

  const getInitials = () => {
    const firstName = user?.profile?.firstName || user?.email?.charAt(0) || 'U';
    const lastName = user?.profile?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleAmharic = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'አስተዳዳሪ (Admin)';
      case 'artisan':
        return 'የእደ-ጥበብ ባለሙያ (Artisan)';
      case 'customer':
      default:
        return 'የተከበሩ ደንበኛ (Customer)';
    }
  };

  const getOrderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">ተጠናቋል (Delivered)</span>;
      case 'shipped':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">በመላክ ላይ (Shipped)</span>;
      case 'processing':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">በዝግጅት ላይ (Processing)</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">ተሰርዟል (Cancelled)</span>;
      case 'pending':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">በመጠባበቅ ላይ (Pending)</span>;
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-16">
      {/* Top Banner Accent */}
      <div className="h-1.5 bg-gradient-to-r from-green-600 via-amber-400 to-red-600 w-full" />

      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-4">
        {/* Navigation Tabs Bar — 3 Sections */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 mb-4">
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => handleTabChange('account')}
              className={`flex items-center justify-center space-x-1.5 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 ${
                activeTab === 'account'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>አካውንት</span>
            </button>

            <button
              onClick={() => handleTabChange('shopping')}
              className={`flex items-center justify-center space-x-1.5 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 ${
                activeTab === 'shopping'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>ግብይት</span>
            </button>

            <button
              onClick={() => handleTabChange('support')}
              className={`flex items-center justify-center space-x-1.5 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 ${
                activeTab === 'support'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>እርዳታ እና ድጋፍ</span>
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            TAB 1: አካውንት (Account & Profile Details)
           ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'account' && (
          <div className="space-y-4 animate-fadeIn">
            {/* User Compact Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  {/* Compact Avatar */}
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-md overflow-hidden border-2 border-white ring-2 ring-amber-200">
                      {previewImage ? (
                        <img
                          src={previewImage.startsWith('blob:') || previewImage.startsWith('http') ? previewImage : `${api.defaults.baseURL.replace('/api', '')}${previewImage}`}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials()
                      )}
                    </div>
                    {isEditing && (
                      <label className="absolute bottom-0 right-0 p-1.5 bg-amber-600 text-white rounded-full cursor-pointer hover:bg-amber-700 shadow transition-transform hover:scale-110 border-2 border-white">
                        <Camera className="w-3.5 h-3.5" />
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
                      </label>
                    )}
                  </div>

                  {/* Name and Role */}
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                      {user?.profile?.firstName || ''} {user?.profile?.lastName || ''}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        {getRoleAmharic(user?.role)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>

                {/* Edit / Save Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>መረጃ አሻሽል</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancel}
                        disabled={savingProfile}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>ሰርዝ</span>
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={savingProfile}
                        className="flex items-center space-x-1 px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingProfile ? 'በማስቀመጥ ላይ...' : 'አስቀምጥ'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Editable Form Inputs when Editing */}
              {isEditing && (
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ስም (First Name)</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                      placeholder="ስምዎን ያስገቡ"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">የአባት ስም (Last Name)</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                      placeholder="የአባት ስም ያስገቡ"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ስልክ ቁጥር (Phone Number)</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                      placeholder="+251 9..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ኢሜይል (Email - አይቀየርም)</label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full px-3 py-1.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 text-gray-400 rounded-lg cursor-not-allowed"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Profile Information Grid (View Mode) */}
            {!isEditing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Email Address */}
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-500 font-medium">የኢሜይል አድራሻ (Email)</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{user?.email}</p>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-500 font-medium">ስልክ ቁጥር (Phone)</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                      {user?.profile?.phone || 'አልተመዘገበም'}
                    </p>
                  </div>
                </div>

                {/* Account Role */}
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-500 font-medium">የመለያ አይነት (Role)</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{getRoleAmharic(user?.role)}</p>
                  </div>
                </div>

                {/* Member Since */}
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-500 font-medium">የተመዘገቡበት ቀን (Member Since)</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                      {new Date(user?.createdAt || Date.now()).toLocaleDateString('am-ET', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Account Quick Settings & Shortcuts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                የመለያ አገልግሎቶች (Account Services)
              </h3>
              <div className="divide-y divide-gray-100">
                <Link
                  to="/security"
                  className="flex items-center justify-between py-2.5 hover:bg-gray-50 px-2 rounded-lg transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-gray-800">የይለፍ ቃል እና ደህንነት (Security)</p>
                      <p className="text-[11px] text-gray-500">የይለፍ ቃልዎን ይቀይሩ፣ ደህንነትዎን ይጠብቁ</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition-colors" />
                </Link>

                <Link
                  to="/shipping-addresses"
                  className="flex items-center justify-between py-2.5 hover:bg-gray-50 px-2 rounded-lg transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 text-green-700 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-gray-800">የማድረሻ አድራሻዎች (Shipping Addresses)</p>
                      <p className="text-[11px] text-gray-500">ዕቃዎች የሚደርሱበትን አድራሻ ያስተዳድሩ</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors" />
                </Link>

                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                  className="w-full flex items-center justify-between py-2.5 hover:bg-red-50 px-2 rounded-lg transition-colors text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-red-600">ከመለያ ይውጡ (Sign Out)</p>
                      <p className="text-[11px] text-red-400">ወቅታዊ ክፍለ-ጊዜዎን በሰላም ያጠናቁ</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 2: ግብይት (Transactions, Orders, Tracking, Wishlist)
           ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'shopping' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Quick Shopping Shortcuts */}
            <div className="grid grid-cols-3 gap-2">
              <Link
                to="/orders/track"
                className="bg-white p-3 rounded-xl border border-gray-200 text-center hover:border-amber-400 hover:shadow-sm transition-all group"
              >
                <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Truck className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-gray-800">ትዕዛዝ መከታተያ</p>
                <p className="text-[10px] text-gray-500">Track Order</p>
              </Link>

              <Link
                to="/wishlist"
                className="bg-white p-3 rounded-xl border border-gray-200 text-center hover:border-amber-400 hover:shadow-sm transition-all group"
              >
                <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Heart className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-gray-800">የምኞት ዝርዝር</p>
                <p className="text-[10px] text-gray-500">Wishlist</p>
              </Link>

              <Link
                to="/cart"
                className="bg-white p-3 rounded-xl border border-gray-200 text-center hover:border-amber-400 hover:shadow-sm transition-all group"
              >
                <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-green-50 text-green-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-gray-800">የግዢ ጋሪ</p>
                <p className="text-[10px] text-gray-500">Shopping Cart</p>
              </Link>
            </div>

            {/* Orders Section Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-gray-900">የቅርብ ጊዜ ግብይቶች እና ትዕዛዞች</h3>
                </div>
                <Link
                  to="/orders"
                  className="text-xs text-amber-700 hover:text-amber-800 font-semibold"
                >
                  ሁሉንም እይ →
                </Link>
              </div>

              {loadingOrders ? (
                <div className="py-8 text-center">
                  <LoadingSpinner size="small" />
                  <p className="text-xs text-gray-500 mt-2">ትዕዛዞችዎን በማምጣት ላይ...</p>
                </div>
              ) : orders.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order._id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-gray-900">
                            #{order.orderNumber || order._id?.slice(-8)}
                          </span>
                          {getOrderStatusBadge(order.status)}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          ቀን: {new Date(order.createdAt).toLocaleDateString('am-ET')} • ዕቃዎች: {order.items?.length || 1}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <span className="text-xs sm:text-sm font-bold text-amber-700">
                          {Number(order.total || 0).toLocaleString()} ETB
                        </span>
                        <Link
                          to={`/orders/${order._id}`}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-900 text-xs font-semibold rounded-md transition-colors"
                        >
                          ዝርዝር
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <ShoppingBag className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-xs text-gray-600 font-medium">እስካሁን ያዘዙት ምንም አይነት ትዕዛዝ የለም</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">የእጅ ጥበብ ውጤቶችን በመጎብኘት ይሸምቱ</p>
                  <Link
                    to="/products"
                    className="inline-block mt-3 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    ምርቶችን ይጎብኙ
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 3: እርዳታ እና ድጋፍ (Help & Support Center)
           ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'support' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Quick Contact & Assistance Channels */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                የቀጥታ ድጋፍ መስመሮች (Support Channels)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Chat with Artisans / Admin */}
                <Link
                  to="/messages"
                  className="p-3.5 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50/30 transition-all flex items-start space-x-3 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900">ቀጥታ መልዕክት (Direct Chat)</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">ከእደ-ጥበብ ባለሙያዎች ወይም ከአስተዳዳሪው ጋር ይወያዩ</p>
                  </div>
                </Link>

                {/* Zema AI Assistant */}
                <Link
                  to="/zema-ai"
                  className="p-3.5 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50/30 transition-all flex items-start space-x-3 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900">ዜማ AI ረዳት (Zema AI)</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">ስለ ባህላዊ ጥበቦች እና ምርቶች በ AI ይጠይቁ</p>
                  </div>
                </Link>

                {/* FAQ */}
                <Link
                  to="/faqs"
                  className="p-3.5 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50/30 transition-all flex items-start space-x-3 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900">ተደጋግመው የሚጠየቁ ጥያቄዎች (FAQs)</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">ስለ ክፍያ፣ ማድረሻ እና ትዕዛዝ መልሶችን ያግኙ</p>
                  </div>
                </Link>

                {/* Contact Us */}
                <Link
                  to="/contact-support"
                  className="p-3.5 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50/30 transition-all flex items-start space-x-3 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900">የደንበኞች አገልግሎት (Contact Support)</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">በስልክ ወይም በኢሜይል ድጋፍ ያግኙ</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Platform Guarantee & Trust Information */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-amber-700" />
                <h4 className="text-xs sm:text-sm font-bold text-amber-900">
                  EthioCraft Global የጥራትና ደህንነት ዋስትና
                </h4>
              </div>
              <ul className="text-xs text-amber-800 space-y-1.5 pl-6 list-disc">
                <li>100% ትክክለኛ የኢትዮጵያ የእጅ ጥበብ እና ባህላዊ ምርቶች</li>
                <li>በታመኑ የመክፈያ ዘዴዎች (Chapa, CBE, Telebirr) የተረጋገጠ ክፍያ</li>
                <li>ፈጣን የማድረሻ ክትትልና የደንበኞች እርካታ ዋስትና</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
