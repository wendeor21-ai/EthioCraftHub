/**
 * Order Detail Page
 *
 * Shows full order details for a single order (customer view)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { API_BASE_URL } from '../config/api';
import { ArrowLeft, Package, DollarSign, Calendar, CreditCard, Upload, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (id) fetchOrder(id);
  }, [id]);

  const fetchOrder = async (orderId) => {
    try {
      setLoading(true);
      const resp = await api.get(`/orders/${orderId}`);
      setOrder(resp.data.order);
    } catch (err) {
      console.error('Failed to load order:', err);
      toast.error('Order not found');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file); // Matching backend Multer field

      // Single step upload and link
      await api.put(`/orders/${id}/upload-receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Receipt uploaded successfully! Artisan will verify it shortly.');
      fetchOrder(id); // Refresh order data
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(err.response?.data?.message || 'Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'pending verification': return <Clock className="w-5 h-5 text-blue-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'unpaid': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-2">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <div>
              <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mt-2">
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Order Details</h1>
          <p className="text-gray-600">Order #{order.orderNumber || order._id?.slice(-8)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Package className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500">Items</p>
                <p className="font-semibold text-gray-800">{order.items?.length || 0} item(s)</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="font-semibold text-gray-800">{order.totals?.total?.toFixed(2) || '0.00'} ETB</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500">Order Date</p>
                <p className="font-semibold text-gray-800">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
            {/* Payment Status */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Payment Information</h4>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{order.payment?.method || 'CHAPA'}</p>
                    <p className="text-xs text-gray-500">Method</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-200">
                  {getStatusIcon(order.payment?.status)}
                  <span className={`text-sm font-semibold capitalize ${
                    order.payment?.status === 'paid' ? 'text-green-600' :
                    order.payment?.status === 'unpaid' ? 'text-red-600' :
                    'text-amber-600'
                  }`}>
                    {order.payment?.status === 'pending verification' ? 'Verification Needed' : (order.payment?.status || 'pending')}
                  </span>
                </div>
              </div>

              {/* Manual Receipt Upload */}
              {order.payment?.method === 'MANUAL' && (['pending', 'rejected'].includes(order.payment?.status) || !order.payment?.status) && (
                <div className="mt-4 p-4 border-2 border-dashed border-amber-200 rounded-lg bg-amber-50/50">
                  <div className="text-sm text-amber-800 mb-3 font-medium">
                    {order.payment?.status === 'rejected' ? 'Payment rejected. Please re-upload a clear receipt.' : 'Please upload your payment receipt (Telebirr/Bank Transfer).'}
                  </div>
                  <label className="flex flex-col items-center justify-center cursor-pointer hover:bg-amber-100/50 transition-colors p-4 rounded-lg border border-amber-300 bg-white">
                    <Upload className="w-8 h-8 text-amber-600 mb-2" />
                    <span className="text-sm text-amber-700 font-semibold">
                      {uploading ? 'Uploading...' : 'Choose Receipt File'}
                    </span>
                    <input type="file" className="hidden" onChange={handleReceiptUpload} disabled={uploading} accept="image/*,.pdf" />
                  </label>
                  {order.payment?.receipt && (
                    <div className="mt-2 text-center">
                      <a href={order.payment.receipt.startsWith('http') ? order.payment.receipt : `${API_BASE_URL.replace(/\/api$/, '')}${order.payment.receipt}`} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 underline">
                        View uploaded receipt
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shipping Address */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Shipping Address</h4>
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-bold text-gray-800">{order.shippingAddress?.firstName} {order.shippingAddress?.lastName}</p>
                <p className="text-gray-600">{order.shippingAddress?.street}</p>
                <p className="text-gray-600">{order.shippingAddress?.city}, {order.shippingAddress?.region}</p>
                <p className="text-gray-600">{order.shippingAddress?.country}</p>
                <p className="text-gray-600 font-medium mt-1">📞 {order.shippingAddress?.phone}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Items</h3>
          <div className="space-y-4">
            {order.items?.map((it) => {
              // item may have populated product: { name, images: [{url,..}], price }
              const product = it.product || {};
              // handle images stored as objects or strings
              let imgVal = undefined;
              if (Array.isArray(product.images) && product.images.length > 0) {
                const first = product.images[0];
                imgVal = typeof first === 'string' ? first : first?.url;
              } else if (product.image) {
                imgVal = product.image;
              }

              // if image is a relative path (starts with '/'), prefix backend origin
              const serverRoot = api.defaults.baseURL.replace(/\/api$/, '');
              let imageSrc = '/images/placeholder.png';

              if (order.isCustom && order.photos?.front) {
                const path = order.photos.front;
                imageSrc = path.startsWith('/') ? `${serverRoot}${path}` : path;
              } else if (imgVal) {
                imageSrc = imgVal.startsWith('/') ? `${serverRoot}${imgVal}` : imgVal;
              }

              return (
                <div key={it._id || product._id || Math.random()} className="flex items-center gap-4 border-b pb-3">
                  <img src={imageSrc} alt={product.name || it.name} className="w-16 h-16 object-cover rounded" />
                  <div>
                    <div className="font-semibold text-gray-800">{product.name || it.name}</div>
                    <div className="text-sm text-gray-500">Qty: {it.quantity} • {(it.price || product.price)?.toFixed?.(2) || (it.price || product.price)} ETB</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
