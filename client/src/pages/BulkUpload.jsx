/**
 * Bulk Upload Page for EthioCraft Global
 * 
 * Allows artisans to upload multiple products at once via CSV/Excel
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const BulkUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [uploadStats, setUploadStats] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      // In a real app, parse CSV/Excel here for preview
      setPreview([
        { name: 'Traditional Basket', price: 45.00, category: 'Basketry', stock: 10 },
        { name: 'Handwoven Scarf', price: 35.00, category: 'Textiles', stock: 15 },
        { name: 'Ceramic Vase', price: 60.00, category: 'Pottery', stock: 8 }
      ]);
    }
  };

  const downloadTemplate = () => {
    // Create CSV template
    const template = `name,description,price,category,materials,dimensions,weight,stock,isAvailable,tags
Traditional Coffee Set,"Handcrafted ceramic coffee set",45.00,Pottery,"Clay, Natural Pigments","15cm x 10cm x 8cm",0.5,10,true,"handmade,traditional,coffee,ceramic"
Handwoven Basket,"Beautiful traditional basket",35.00,Basketry,"Natural Fibers","20cm x 20cm x 15cm",0.3,15,true,"handmade,basket,storage"`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ethiocraft_product_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock upload results
      setUploadStats({
        total: preview.length,
        successful: preview.length - 1,
        failed: 1,
        errors: [
          { row: 2, error: 'Invalid price format' }
        ]
      });
      
      setSuccess(`Successfully uploaded ${preview.length - 1} out of ${preview.length} products!`);
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload products. Please try again.');
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
          <h1 className="text-3xl font-bold text-gray-900">Bulk Product Upload</h1>
          <p className="text-gray-600 mt-2">Upload multiple products at once using CSV or Excel files</p>
        </div>

        {error && <ErrorMessage message={error} className="mb-6" />}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 How to Use Bulk Upload</h3>
              <ol className="list-decimal list-inside space-y-2 text-blue-800">
                <li>Download the CSV template below</li>
                <li>Fill in your product information</li>
                <li>Upload the completed file</li>
                <li>Review the preview and confirm</li>
              </ol>
            </div>

            {/* Template Download */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Download Template</h3>
              <button
                onClick={downloadTemplate}
                className="w-full bg-ethiopian-gold text-white px-6 py-3 rounded-lg hover:bg-ethiopian-earth transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download CSV Template
              </button>
              <p className="text-sm text-gray-600 mt-3">
                The template includes all required fields and example data to help you get started.
              </p>
            </div>

            {/* File Upload */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Upload Your File</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-gray-700 font-medium">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </span>
                  <span className="text-sm text-gray-500 mt-1">
                    CSV or Excel files only
                  </span>
                </label>
              </div>
            </div>

            {/* Preview */}
            {preview.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 3: Preview Products</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Price</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Category</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {preview.map((product, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{product.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">${product.price}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{product.category}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{product.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className="mt-6 w-full bg-ethiopian-green text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {loading && <LoadingSpinner size="small" className="mr-2" />}
                  {loading ? 'Uploading...' : 'Confirm and Upload'}
                </button>
              </div>
            )}

            {/* Upload Results */}
            {uploadStats && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Results</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{uploadStats.total}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{uploadStats.successful}</div>
                    <div className="text-sm text-gray-600">Successful</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{uploadStats.failed}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                </div>
                {uploadStats.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Errors:</h4>
                    <ul className="space-y-1">
                      {uploadStats.errors.map((err, index) => (
                        <li key={index} className="text-sm text-red-600">
                          Row {err.row}: {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tips Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Tips</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-ethiopian-gold mr-2">•</span>
                  <span>Keep product names under 100 characters</span>
                </li>
                <li className="flex items-start">
                  <span className="text-ethiopian-gold mr-2">•</span>
                  <span>Use comma-separated values for tags</span>
                </li>
                <li className="flex items-start">
                  <span className="text-ethiopian-gold mr-2">•</span>
                  <span>Prices should be in USD format (e.g., 45.00)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-ethiopian-gold mr-2">•</span>
                  <span>Stock must be a whole number</span>
                </li>
                <li className="flex items-start">
                  <span className="text-ethiopian-gold mr-2">•</span>
                  <span>Use "true" or "false" for availability</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Supported Fields</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li><span className="font-medium">Required:</span> name, price, category</li>
                <li><span className="font-medium">Optional:</span> description, materials, dimensions, weight, stock, tags</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;
