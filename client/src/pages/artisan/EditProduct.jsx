/**
 * Edit Product Page for EthioCraft Global
 * 
 * Allows artisans to edit existing products
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../config/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import toast from 'react-hot-toast';

const EditProduct = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [videoWarning, setVideoWarning] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    materials: '',
    dimensions: '',
    craftingTime: '',
    story: '',
    careInstructions: '',
    weight: '',
    videoUrl: '',
    customizable: false,
    tags: '',
    stock: 10,
    status: 'active'
  });
  const [negativeStockWarning, setNegativeStockWarning] = useState(false);

  const categories = [
    'Textiles',
    'Jewelry',
    'Pottery',
    'Basketry',
    'Wood Crafts',
    'Leather Goods',
    'Metalwork',
    'Paintings'
  ];

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(API_ENDPOINTS.PRODUCTS.BY_ID(id), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch product');
      }

      const data = await response.json();
      const product = data.product || data;

      // Handle negative stock values: display as 0 in the UI and show a warning
      const rawStock = product.inventory?.quantity;
      const displayStock = (typeof rawStock === 'number' && rawStock < 0) ? 0 : (rawStock || 10);
      setNegativeStockWarning(typeof rawStock === 'number' && rawStock < 0);

      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        category: product.category || '',
        materials: product.materials || '',
        dimensions: product.dimensions || '',
        craftingTime: product.craftingTime || '',
        story: product.story || '',
        careInstructions: product.careInstructions || '',
        weight: product.weight || '',
        videoUrl: product.videoUrl || '',
        customizable: product.customizable || false,
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
        stock: displayStock,
        status: product.status || 'active'
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Failed to load product details');
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let parsed = value;
    if (type === 'number') {
      parsed = value === '' ? '' : parseFloat(value);
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parsed
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.price || !formData.category) {
      setError('Please fill in all required fields');
      toast.error('Please fill in all required fields');
      return;
    }
    if (videoWarning) {
      setError('Please fix the video URL before saving.');
      toast.error('Please fix the video URL before saving.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const token = localStorage.getItem('authToken');

      const productData = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price) || 0,
        category: formData.category,
        materials: formData.materials,
        dimensions: formData.dimensions,
        craftingTime: Number(formData.craftingTime) || 0,
        story: formData.story,
        careInstructions: formData.careInstructions,
        weight: Number(formData.weight) || 0,
        videoUrl: formData.videoUrl,
        customizable: formData.customizable,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        inventory: {
          quantity: parseInt(formData.stock) || 0
        },
        status: formData.status
      };

      const response = await fetch(API_ENDPOINTS.PRODUCTS.BY_ID(id), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product');
      }

      toast.success('Product updated successfully!');
      navigate('/artisan/products');
    } catch (error) {
      console.error('Error updating product:', error);
      setError(error.message || 'Failed to update product');
      toast.error(error.message || 'Failed to update product');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/artisan/products')}
            className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center"
          >
            ← Back to My Products
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
          <p className="text-gray-600 mt-2">Update your product details</p>
        </div>

        {error && <ErrorMessage message={error} className="mb-6" />}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          {/* Basic Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  placeholder="e.g., Traditional Handwoven Gabi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  placeholder="Describe your product in detail..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  />
                  {negativeStockWarning && (
                    <p className="text-sm text-red-600 mt-2">This product currently has negative stock in the database. Displaying 0 here — please correct the inventory value and save.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Materials
                </label>
                <input
                  type="text"
                  name="materials"
                  value={formData.materials}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  placeholder="e.g., Cotton, Wool, Leather"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dimensions
                  </label>
                  <input
                    type="text"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                    placeholder="e.g., 30cm x 40cm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight
                  </label>
                  <input
                    type="text"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                    placeholder="e.g., 500g"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crafting Time
                </label>
                <input
                  type="text"
                  name="craftingTime"
                  value={formData.craftingTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  placeholder="e.g., 2 weeks"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Story
                </label>
                <textarea
                  name="story"
                  value={formData.story}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  placeholder="Share the story behind this product..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Care Instructions
                </label>
                <textarea
                  name="careInstructions"
                  value={formData.careInstructions}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  placeholder="How should this item be washed or maintained?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video URL
                </label>
                <input
                  type="text"
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  placeholder="https://youtube.com/..."
                />
                {videoWarning && (
                  <p className="text-sm text-yellow-600 mt-1">{videoWarning}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  placeholder="e.g., handmade, traditional, eco-friendly"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="customizable"
                  checked={formData.customizable}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-ethiopian-gold focus:ring-ethiopian-gold border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  This product can be customized
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/artisan/products')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-ethiopian-gold text-white rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="small" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProduct;
