/**
 * User Profile Page for EthioCraft Global
 * 
 * Editable profile view accessible from the Account dropdown
 * Allows users to edit their name, email, and phone number
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { userAPI } from '../utils/api';
import { User, Mail, Phone, Calendar, Edit2, Save, X, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Initialize form data when user loads
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

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setProfileImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let uploadedImageUrl = undefined;
      
      // If a new image was selected, upload it first
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
          toast.error('Failed to upload profile picture. Continuing to save text profile.');
        }
      }

      const response = await api.put('/users/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        ...(uploadedImageUrl && { profileImage: uploadedImageUrl })
      });

      if (response.data.success) {
        // Update user in context
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
        
        toast.success('Profile updated successfully!');
        setIsEditing(false);
        setProfileImageFile(null); // Clear pending upload state
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
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

  // Get user initials for avatar
  const getInitials = () => {
    const firstName = user?.profile?.firstName || user?.email?.charAt(0) || 'U';
    const lastName = user?.profile?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">My Profile</h1>
            <p className="text-gray-600">View and manage your EthioCraft Global account</p>
          </div>
          
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Edit2 className="w-5 h-5" />
              <span className="font-semibold">Edit Profile</span>
            </button>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
                <span className="font-semibold">Cancel</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                <span className="font-semibold">{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          {/* Ethiopian Flag Header */}
          <div className="h-2 bg-gradient-to-r from-green-600 via-amber-400 to-red-600"></div>
          
          <div className="p-8">
            <div className="flex items-center space-x-6 mb-8">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-4xl font-bold shadow-xl overflow-hidden border-4 border-white">
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
                  <label className="absolute bottom-0 right-0 p-2.5 bg-amber-500 rounded-full text-white cursor-pointer hover:bg-amber-600 shadow-lg transition-transform hover:scale-105 border-2 border-white ring-2 ring-transparent focus-within:ring-amber-300">
                    <Camera className="w-5 h-5" />
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
              
              {/* User Info */}
              <div className="flex-1">
                {!isEditing ? (
                  <>
                    <h2 className="text-3xl font-bold text-gray-800">
                      {user?.profile?.firstName} {user?.profile?.lastName}
                    </h2>
                    <p className="text-amber-600 font-semibold capitalize text-lg mt-1">
                      {user?.role}
                    </p>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="Enter first name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="Enter last name"
                        />
                      </div>
                    </div>
                    <p className="text-amber-600 font-semibold capitalize text-sm">
                      {user?.role}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Email */}
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg">
                <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium">Email Address</p>
                  {!isEditing ? (
                    <p className="font-semibold text-gray-800">{user?.email}</p>
                  ) : (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="w-full mt-1 px-3 py-1.5 bg-gray-100 border border-gray-300 rounded text-gray-500 cursor-not-allowed text-sm"
                      title="Email cannot be changed"
                    />
                  )}
                </div>
              </div>
              
              {/* Phone */}
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium">Phone Number</p>
                  {!isEditing ? (
                    <p className="font-semibold text-gray-800">
                      {user?.profile?.phone || 'Not provided'}
                    </p>
                  ) : (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      placeholder="Enter phone number"
                    />
                  )}
                </div>
              </div>

              {/* Account Type */}
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Account Type</p>
                  <p className="font-semibold text-gray-800 capitalize">{user?.role}</p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Member Since</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(user?.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Artisan Shop Info */}
        {user?.role === 'artisan' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-6">
            <div className="h-2 bg-gradient-to-r from-green-600 via-amber-400 to-red-600"></div>
            
            <div className="p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Shop Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Shop Name</label>
                  <p className="text-lg font-semibold text-gray-800">
                    {user?.profile?.shopName || 'Not set'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Bio</label>
                  <p className="text-gray-700">
                    {user?.profile?.bio || 'No bio provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
