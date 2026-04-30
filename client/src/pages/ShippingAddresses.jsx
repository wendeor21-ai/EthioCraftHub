/**
 * Shipping Addresses Page for EthioCraft Global
 * 
 * Manage saved shipping addresses
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Check,
  X,
  Home
} from 'lucide-react';
import toast from 'react-hot-toast';

const ShippingAddresses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Ethiopia',
    isDefault: false
  });

  useEffect(() => {
    console.log('📍 ShippingAddresses component mounted, fetching addresses...');
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      // First try to get from API
      try {
        const response = await api.get('/users/shipping-addresses');
        if (response.data.addresses && response.data.addresses.length > 0) {
          setAddresses(response.data.addresses);
          // Also save to localStorage as backup
          localStorage.setItem('shippingAddresses', JSON.stringify(response.data.addresses));
          setLoading(false);
          return;
        }
      } catch (apiError) {
        console.log('API not available, using localStorage');
      }
      
      // Use localStorage as fallback or primary storage
      const saved = localStorage.getItem('shippingAddresses');
      if (saved) {
        const parsedAddresses = JSON.parse(saved);
        setAddresses(parsedAddresses);
      } else {
        setAddresses([]);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.fullName || !formData.phone || !formData.street || !formData.city) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      let updatedAddresses;
      
      if (editingId) {
        // Update existing address
        updatedAddresses = addresses.map(addr =>
          addr.id === editingId ? { ...formData, id: editingId } : addr
        );
        toast.success('Address updated successfully');
      } else {
        // Add new address
        const newAddress = { ...formData, id: Date.now().toString() };
        updatedAddresses = [...addresses, newAddress];
        toast.success('Address added successfully');
      }

      // If this is set as default, remove default from others
      if (formData.isDefault) {
        updatedAddresses = updatedAddresses.map(addr => ({
          ...addr,
          isDefault: addr.id === (editingId || updatedAddresses[updatedAddresses.length - 1].id)
        }));
      }

      setAddresses(updatedAddresses);
      localStorage.setItem('shippingAddresses', JSON.stringify(updatedAddresses));
      console.log('✅ Addresses saved to localStorage:', updatedAddresses);
      
      // Reset form
      setShowForm(false);
      setEditingId(null);
      setFormData({
        fullName: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Ethiopia',
        isDefault: false
      });
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Failed to save address');
    }
  };

  const handleEdit = (address) => {
    setFormData(address);
    setEditingId(address.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      const updated = addresses.filter(addr => addr.id !== id);
      setAddresses(updated);
      localStorage.setItem('shippingAddresses', JSON.stringify(updated));
      toast.success('Address deleted');
    }
  };

  const setAsDefault = (id) => {
    const updated = addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id
    }));
    setAddresses(updated);
    localStorage.setItem('shippingAddresses', JSON.stringify(updated));
    toast.success('Default address updated');
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      fullName: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Ethiopia',
      isDefault: false
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading addresses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Shipping Addresses</h1>
              <p className="text-gray-600">Manage your delivery addresses</p>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">Add New Address</span>
              </button>
            )}
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="+251 912 345 678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="123 Main Street, Apt 4B"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Addis Ababa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Region
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Addis Ababa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="1000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50"
                  readOnly
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleChange}
                  className="w-5 h-5 text-green-600 focus:ring-green-500 rounded"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">
                  Set as default address
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">{editingId ? 'Update' : 'Save'} Address</span>
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                  <span className="font-semibold">Cancel</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Addresses List */}
        {addresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${
                  address.isDefault ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div className={`h-2 ${
                  address.isDefault 
                    ? 'bg-gradient-to-r from-green-500 to-green-600' 
                    : 'bg-gradient-to-r from-green-600 via-amber-400 to-red-600'
                }`}></div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg font-bold text-gray-800">{address.fullName}</h3>
                    </div>
                    {address.isDefault && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-gray-600">{address.street}</p>
                    <p className="text-gray-600">
                      {address.city}{address.state && `, ${address.state}`} {address.zipCode}
                    </p>
                    <p className="text-gray-600">{address.country}</p>
                    <p className="text-gray-600 font-medium">{address.phone}</p>
                  </div>

                  <div className="flex gap-2">
                    {!address.isDefault && (
                      <button
                        onClick={() => setAsDefault(address.id)}
                        className="flex-1 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors text-sm font-semibold"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(address)}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showForm && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Home className="w-24 h-24 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No addresses saved</h3>
              <p className="text-gray-600 mb-6">
                Add a shipping address to make checkout faster
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
              >
                Add Your First Address
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ShippingAddresses;
