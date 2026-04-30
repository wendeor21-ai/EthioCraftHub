import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  CloudArrowUpIcon, 
  CheckCircleIcon, 
  InformationCircleIcon,
  BanknotesIcon,
  UserIcon,
  HashtagIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const ReceiptUpload = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const orderNumber = location.state?.orderNumber;

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [order, setOrder] = useState(null);
  const [artisanDetails, setArtisanDetails] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${orderId}`);
      // GET /api/orders/:id returns { order } (no success wrapper)
      const orderData = response.data.order || response.data.data;
      if (orderData) {
        setOrder(orderData);
        
        // Fetch artisan details from the first item
        const artisanId = orderData.items?.[0]?.artisan?._id
          || orderData.items?.[0]?.artisan
          || orderData.items?.[0]?.product?.artisan?._id
          || orderData.items?.[0]?.product?.artisan;
        if (artisanId) {
          fetchArtisanDetails(artisanId);
        }
      } else {
        toast.error('Order details not found.');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error(error.response?.data?.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const fetchArtisanDetails = async (artisanId) => {
    try {
      const response = await fetch(`/api/users/artisan-public-details/${artisanId}`);
      const data = await response.json();
      if (data.success) {
        setArtisanDetails(data.data);
      }
    } catch (error) {
      console.error('Error fetching artisan details:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        toast.error('Please upload an image file (JPG, PNG)');
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a receipt image to upload');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file); // Use 'image' as requested

      const response = await api.put(`/orders/${orderId}/upload-receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success('Receipt uploaded successfully!');
        navigate('/order-success', { 
          state: { 
            order: order, // Pass full order object
            orderNumber: orderNumber || order?.orderId,
            total: order?.totals?.total || order?.amount,
            method: 'MANUAL'
          } 
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.response?.data?.message || 'Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner size="large" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-ethiopian-gold p-8 text-white text-center">
            <CheckCircleIcon className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold">Order Placed!</h1>
            <p className="mt-2 opacity-90">Please upload your payment receipt to finalize</p>
          </div>

          <div className="p-8">
            {/* Artisan Payment Details */}
            <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
              <h2 className="text-lg font-bold text-amber-900 border-b border-amber-200 pb-2 flex items-center">
                <ShieldCheckIcon className="w-5 h-5 mr-2" />
                Artisan Payment Recipient
              </h2>
              
              {artisanDetails ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-amber-800">
                  <div className="flex items-center gap-2">
                    <BanknotesIcon className="w-4 h-4 opacity-70" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-60">Bank Name</p>
                      <p className="font-semibold">{artisanDetails.bankName || 'CBE'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 opacity-70" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-60">A/C Holder</p>
                      <p className="font-semibold">{artisanDetails.accountHolderName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <HashtagIcon className="w-4 h-4 opacity-70" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-60">A/C Number</p>
                      <p className="font-semibold tracking-widest">{artisanDetails.accountNumber}</p>
                    </div>
                  </div>
                  {artisanDetails.merchantId && (
                    <div className="col-span-1 md:col-span-2 p-3 bg-amber-100 rounded-lg flex items-center justify-between mt-2 border border-amber-200">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider opacity-60">Telebirr Merchant ID</p>
                        <p className="font-bold text-amber-900 text-lg">{artisanDetails.merchantId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-amber-900">Amount Due:</p>
                        <p className="text-xl font-black text-amber-900">{(order?.amount || 0).toFixed(2)} ETB</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center italic text-amber-600">Retrieving recipient details...</div>
              )}
            </div>

            {/* Upload Section */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Upload Transaction Receipt (Screenshot)
                </label>
                
                {!preview ? (
                  <div className="relative group">
                    <input
                      type="file"
                      id="receipt"
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*"
                    />
                    <label
                      htmlFor="receipt"
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-amber-50 hover:border-ethiopian-gold transition-all"
                    >
                      <CloudArrowUpIcon className="w-12 h-12 text-gray-400 group-hover:text-ethiopian-gold" />
                      <p className="mt-2 text-sm text-gray-500">Click to select or drag and drop</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG or JPEG up to 5MB</p>
                    </label>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border-2 border-ethiopian-gold">
                    <img src={preview} alt="Receipt Preview" className="w-full h-64 object-contain bg-gray-100" />
                    <button
                      type="button"
                      onClick={() => {setFile(null); setPreview(null);}}
                      className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <InformationCircleIcon className="w-5 h-5 text-blue-500 shrink-0" />
                <p>
                  By submitting, you confirm that you have transferred the exact amount to the artisan. 
                  The artisan will verify your receipt before processing the shipment.
                </p>
              </div>

              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full py-4 bg-ethiopian-gold text-white rounded-xl font-bold text-lg shadow-lg hover:bg-ethiopian-earth transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
              >
                {uploading ? 'Processing Submission...' : 'Submit Payment'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptUpload;
