import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  User,
  Settings,
  Shield,
  Edit,
  ShoppingBag,
  Package,
  MapPin,
  Heart,
  HelpCircle,
  MessageCircle,
  FileQuestion,
  LogOut,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const UserAccountDropdown = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleNavigate = (path) => {
    console.log('🔗 Navigating to:', path);
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    onClose();
  };

  const getInitials = () => {
    const firstName = user?.profile?.firstName || user?.email?.charAt(0) || 'U';
    const lastName = user?.profile?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:relative md:inset-auto">
      <div className="fixed inset-0 bg-black bg-opacity-30 md:hidden" onClick={onClose}></div>
      <div
        ref={dropdownRef}
        className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl md:absolute md:right-0 md:top-full md:mt-2 md:h-auto md:rounded-xl md:border md:border-gray-200 animate-slide-in-right md:animate-fade-in overflow-y-auto"
      >
        <div className="bg-gradient-to-r from-green-600 via-amber-400 to-red-600 p-4 md:rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-amber-600 text-xl font-bold shadow-lg">
              {getInitials()}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg">
                {user?.profile?.firstName || 'User'}
              </h3>
              <p className="text-white text-sm opacity-90">{user?.email}</p>
            </div>
          </div>
        </div>
        <div className="p-2">
          <div className="mb-2">
            <button
              onClick={() => toggleSection('account')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-gray-800 text-lg">ACCOUNT</span>
              </div>
              {expandedSection === 'account' ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
            {expandedSection === 'account' && (
              <div className="mt-2 ml-4 space-y-1 animate-fade-in">
                <button
                  onClick={() => handleNavigate('/profile')}
                  className="w-full flex items-center space-x-3 p-3 text-gray-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium">Edit Profile</span>
                </button>
                <button
                  onClick={() => handleNavigate('/account-settings')}
                  className="w-full flex items-center space-x-3 p-3 text-gray-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium">Account Settings</span>
                </button>
                <button
                  onClick={() => handleNavigate('/security')}
                  className="w-full flex items-center space-x-3 p-3 text-gray-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium">Security (Change Password)</span>
                </button>
              </div>
            )}
          </div>
          <div className="mb-2">
            <button
              onClick={() => toggleSection('shopping')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-gray-800 text-lg">SHOPPING</span>
              </div>
              {expandedSection === 'shopping' ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
            {expandedSection === 'shopping' && (
              <div className="mt-2 ml-4 space-y-1 animate-fade-in">
                <button
                  onClick={() => handleNavigate('/orders')}
                  className="w-full flex items-center space-x-3 p-3 text-gray-700 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">My Orders</span>
                </button>
                <button
                  onClick={() => handleNavigate('/orders/track')}
                  className="w-full flex items-center space-x-3 p-3 text-gray-700 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Package className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Order Tracking</span>
                </button>
                <button
                  onClick={() => handleNavigate('/wishlist')}
                  className="w-full flex items-center space-x-3 p-3 text-gray-700 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Wishlist</span>
                </button>
                <button
                  onClick={() => handleNavigate('/shipping-addresses')}
                  className="w-full flex items-center space-x-3 p-3 text-gray-700 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Shipping Addresses</span>
                </button>
              </div>
            )}
          </div>
          <div className="mb-2">
            <button
              onClick={() => toggleSection('help')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-gray-800 text-lg">HELP & SUPPORT</span>
              </div>
              {expandedSection === 'help' ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
            {expandedSection === 'help' && (
              <div className="mt-2 ml-4 space-y-1 animate-fade-in">
                <button
                  onClick={() => handleNavigate('/help-center')}
                  className="w-full flex items-center space-x-3 p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Help Center</span>
                </button>
                <button
                  onClick={() => handleNavigate('/contact-support')}
                  className="w-full flex items-center space-x-3 p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Contact Support</span>
                </button>
                <button
                  onClick={() => handleNavigate('/faqs')}
                  className="w-full flex items-center space-x-3 p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  <FileQuestion className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">FAQs</span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-3 p-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg group cursor-pointer"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-lg">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserAccountDropdown;
