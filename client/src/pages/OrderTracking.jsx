/**
 * Order Tracking Page for EthioCraft Global
 * 
 * Track order status and shipping progress with high-fidelity UI
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin,
  ArrowLeft,
  Search,
  Copy,
  Calendar,
  AlertCircle,
  ExternalLink,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCustomTranslation } from '../hooks/useCustomTranslation';

const OrderTracking = () => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [orderId, setOrderId] = useState(location.state?.orderId || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (location.state?.orderId) {
      trackOrder(location.state.orderId);
    }
  }, [location.state]);

  const trackOrder = async (id) => {
    if (!id) {
      toast.error(t('tracking.search_placeholder', 'Please enter an order ID or Tracking Number'));
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      const response = await api.get(`/orders/track/${id}`);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Error tracking order:', error);
      toast.error(t('tracking.order_not_found', 'Order not found. Please check your ID and try again.'));
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    trackOrder(orderId);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(t('common.success', 'Copied to clipboard!'));
  };

  const getStatusLabel = (status) => {
    const mapping = {
      'pending': t('common.status_pending', 'Order Placed'),
      'confirmed': t('common.status_pending', 'Order Confirmed'),
      'accepted': t('common.status_pending', 'Accepted'),
      'price_quoted': 'Price Quoted',
      'processing': t('common.status_processing', 'Preparing Order'),
      'shipped': t('common.status_shipped', 'In Transit'),
      'delivered': t('common.status_completed', 'Arrived / Completed'),
      'completed': t('common.status_completed', 'Completed'),
      'cancelled': t('common.status_cancelled', 'Cancelled'),
      'rejected': t('common.status_rejected', 'Rejected')
    };
    return mapping[status?.toLowerCase()] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-blue-100 text-blue-800 border-blue-200',
      'confirmed': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'accepted': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'price_quoted': 'bg-amber-100 text-amber-800 border-amber-200',
      'processing': 'bg-amber-100 text-amber-800 border-amber-200',
      'shipped': 'bg-purple-100 text-purple-800 border-purple-200',
      'delivered': 'bg-green-100 text-green-800 border-green-200',
      'completed': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200',
      'rejected': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getStatusMessage = (status) => {
    const messages = {
      'pending': t('tracking.order_status_msg', 'We have received your order and it is awaiting confirmation.'),
      'confirmed': t('tracking.order_status_msg', 'Your order has been confirmed! Our artisan is getting ready to start.'),
      'accepted': 'Your custom design has been reviewed! The artisan has quoted a final price. Please approve and pay to begin production.',
      'price_quoted': 'Your custom design has been reviewed! The artisan has quoted a final price. Please approve and pay to begin production.',
      'processing': t('tracking.order_status_msg', 'Your order is being carefully prepared by the artisan with traditional craftsmanship.'),
      'shipped': t('tracking.order_status_msg', 'Great news! Your package is on its way to you.'),
      'delivered': t('tracking.order_status_msg', 'Your order has been delivered. We hope you enjoy your authentic Ethiopian craft!'),
      'completed': t('tracking.order_status_msg', 'The order process is complete. Thank you for supporting our artisans!'),
      'cancelled': t('common.status_cancelled', 'This order has been cancelled.'),
      'rejected': t('common.status_rejected', 'This order was not accepted by the artisan. Please contact support if you have questions.')
    };
    return messages[status?.toLowerCase()] || t('common.loading', 'Tracking your order status...');
  };

  const getProgressSteps = () => {
    const status = order?.status?.toLowerCase() || 'pending';
    const steps = [
      { key: 'placed', label: t('common.status_pending', 'Order Placed'), icon: Package, statuses: ['pending', 'confirmed', 'accepted', 'price_quoted'] },
      { key: 'processing', label: t('common.status_processing', 'Preparing'), icon: Clock, statuses: ['processing', 'paid'] },
      { key: 'shipped', label: t('common.status_shipped', 'In Transit'), icon: Truck, statuses: ['shipped'] },
      { key: 'delivered', label: t('common.status_completed', 'Delivered'), icon: CheckCircle, statuses: ['delivered', 'completed'] }
    ];

    const statusFlow = ['pending', 'confirmed', 'accepted', 'price_quoted', 'paid', 'processing', 'shipped', 'delivered', 'completed'];
    const currentIndexInFlow = statusFlow.indexOf(status);

    return steps.map((step, index) => {
      const stepStatusIndices = step.statuses.map(s => statusFlow.indexOf(s));
      const maxStepStatusIndex = Math.max(...stepStatusIndices);
      
      const isCompleted = currentIndexInFlow >= maxStepStatusIndex;
      const isActive = step.statuses.includes(status);

      return {
        ...step,
        completed: isCompleted,
        active: isActive
      };
    });
  };

  const getFormattedDate = (dateString) => {
    if (!dateString) return t('common.status_pending', 'Pending');
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return t('common.status_pending', 'Pending');
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getEstimatedDelivery = () => {
    if (order?.shipping?.estimatedDelivery) {
      return getFormattedDate(order.shipping.estimatedDelivery);
    }
    
    // Fallback logic
    if (!order?.createdAt) return t('common.status_pending', 'Pending');
    const orderDate = new Date(order.createdAt);
    if (isNaN(orderDate.getTime())) return t('common.status_pending', 'Pending');
    
    const estimatedDate = new Date(orderDate);
    estimatedDate.setDate(estimatedDate.getDate() + 7);
    return getFormattedDate(estimatedDate);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-12 px-4 sm:px-6 font-sans">
      <div className="container mx-auto max-w-5xl">
        {/* Header Section */}
        <div className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="group flex items-center space-x-2 text-gray-500 hover:text-gray-900 mb-6 transition-all duration-300 font-medium"
            >
              <div className="p-2 rounded-full border border-gray-200 group-hover:bg-gray-100 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span>{t('common.continue_shopping', 'Back to Shopping')}</span>
            </button>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
              {t('nav.order_tracking', 'Order Tracking')}
            </h1>
            <p className="text-gray-500 mt-3 text-lg max-w-2xl">
              {t('tracking.subtitle', 'Stay updated on your journey to owning authentic Ethiopian craftsmanship.')}
            </p>
          </div>
          
          <div className="bg-[#FFFFFF] p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2 max-w-md w-full">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder={t('tracking.search_placeholder', 'Enter your Order ID')}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 transition-all outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {loading ? '...' : t('common.track_order', 'Track')}
              </button>
            </form>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="bg-[#FFFFFF] rounded-2xl shadow-xl p-20 text-center border border-gray-100">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-amber-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin"></div>
            </div>
            <p className="text-xl font-bold text-gray-800">{t('common.loading')}</p>
          </div>
        ) : order ? (
          <div className="space-y-8 animate-fadeIn">
            {/* Main Order Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                
                {/* Overview Card */}
                <div className="bg-[#FFFFFF] rounded-2xl shadow-xl p-8 md:p-10 border border-gray-100">
                  <div className="flex flex-col md:flex-row md:items-start justify-between mb-12 gap-6">
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 mb-3">
                        Order #{order.orderNumber || order._id?.slice(-8)}
                        <button 
                          onClick={() => copyToClipboard(order.orderNumber || order._id)}
                          className="ml-3 p-1.5 inline-flex text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all translate-y-[-2px]"
                          title="Copy Order ID"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                      </h2>
                      <div className="flex items-center flex-wrap gap-3">
                        <span className={`px-5 py-2 rounded-full text-base font-bold ${getStatusColor(order.status).replace('border', 'bg-opacity-20 border-none')}`}>
                          {getStatusLabel(order.status)}
                        </span>
                        <span className="text-gray-400 text-sm flex items-center gap-1 font-medium">
                          <Clock className="w-4 h-4" />
                          {t('dashboard.recent_activity', 'Updated')} {order.updatedAt && !isNaN(new Date(order.updatedAt).getTime()) 
                            ? new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : t('common.status_pending', 'Recently')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-left md:text-right bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">{t('tracking.estimated_delivery', 'Estimated Delivery')}</p>
                      <p className="text-xl font-black text-amber-600 flex items-center md:justify-end gap-2">
                        <Calendar className="w-5 h-5" />
                        {getEstimatedDelivery()}
                      </p>
                    </div>
                  </div>

                  {/* Modern Horizontal Stepper */}
                  <div className="relative pt-4 pb-8 px-2">
                    {/* Connecting Line */}
                    <div className="absolute top-10 left-[10%] right-[10%] h-1 bg-gray-100 rounded-full hidden sm:block">
                      <div 
                        className="h-full bg-amber-500 transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${Math.max(0, (getProgressSteps().filter(s => s.completed).length - 1) / (getProgressSteps().length - 1)) * 100}%` 
                        }}
                      />
                    </div>

                    {/* Steps */}
                    <div className="flex flex-col sm:flex-row justify-between relative z-10 gap-8 sm:gap-0">
                      {getProgressSteps().map((step, index) => {
                        const Icon = step.icon;
                        return (
                          <div key={step.key} className="flex flex-row sm:flex-col items-center gap-4 flex-1">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 border-[3px] ${
                              step.completed 
                                ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/30' 
                                : step.active
                                ? 'bg-white border-amber-500 text-amber-500 ring-4 ring-amber-50'
                                : 'bg-white border-gray-200 text-gray-300'
                            }`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col sm:items-center text-left sm:text-center mt-0 sm:mt-2">
                              <span className={`text-sm font-bold ${step.completed || step.active ? 'text-gray-900' : 'text-gray-400'}`}>
                                {step.label}
                              </span>
                              {step.active && (
                                <span className="text-amber-500 text-[10px] font-black uppercase tracking-widest mt-1">{t('tracking.current_stage', 'Current Stage')}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Shipping Details Card */}
                <div className="bg-[#FFFFFF] rounded-2xl shadow-xl p-8 border border-gray-100">
                  <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                    <Truck className="w-6 h-6 text-amber-500" />
                    <h3 className="text-xl font-black text-gray-900">{t('checkout.billing_details', 'Shipping Details')}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{t('tracking.carrier', 'Shipping Carrier')}</p>
                      <p className="text-lg font-medium text-gray-800">
                        {order.shipping?.carrier || t('common.status_pending', "Pending shipment details")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{t('tracking.tracking_number', 'Tracking Number')}</p>
                      {order.shipping?.trackingNumber ? (
                        <div className="flex items-center gap-3">
                          <p className="text-lg font-mono font-bold text-gray-900 break-all">{order.shipping.trackingNumber}</p>
                          <button 
                            onClick={() => copyToClipboard(order.shipping.trackingNumber)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-gray-50"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-lg text-gray-400 italic">{t('errors.no_data', 'Not available yet')}</p>
                      )}
                    </div>
                    <div className="md:col-span-2 bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">{t('tracking.additional_notes', 'Additional Notes')}</p>
                      <p className="text-gray-700 leading-relaxed">
                        {order.shipping?.notes || t('errors.no_data', "No additional tracking notes available for this order.")}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Sidebar Info */}
              <div className="space-y-8">
                {/* Delivery Address */}
                <div className="bg-[#FFFFFF] rounded-2xl shadow-xl p-8 border border-gray-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                    <MapPin className="w-32 h-32 text-gray-900" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-amber-500" />
                    {t('checkout.shipping_address', 'Delivery Address')}
                  </h3>
                  
                   {order.shippingAddress ? (
                    <div className="space-y-6 relative z-10">
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{t('tracking.recipient', 'Recipient')}</p>
                        <p className="text-lg font-bold text-gray-900">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                      </div>
                      <div className="flex gap-4">
                         <div className="w-1 h-full min-h-[40px] bg-amber-100 rounded-full"></div>
                         <div>
                           <p className="text-gray-800 font-medium">{order.shippingAddress.street}</p>
                           <p className="text-gray-600">{order.shippingAddress.city}, {order.shippingAddress.region}</p>
                           <p className="text-gray-600">{order.shippingAddress.country} {order.shippingAddress.postalCode}</p>
                         </div>
                      </div>
                      <div className="pt-4 border-t border-gray-50">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Contact Phone</p>
                        <p className="text-gray-800 font-medium">{order.shippingAddress.phone || 'N/A'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">{t('errors.no_data', 'Address details unavailable.')}</p>
                  )}
                </div>

                {/* Status Insight */}
                <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 relative overflow-hidden">
                  <div className="flex items-start gap-4 relative z-10">
                     <div className="p-2 bg-[#FFFFFF] rounded-lg shadow-sm text-amber-500 shrink-0">
                      <Info className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-amber-900 mb-1">{t('tracking.order_status_msg', 'Status Insight')}</h4>
                      <p className="text-amber-800/80 text-sm leading-relaxed font-medium">
                        {getStatusMessage(order.status)}
                      </p>
                      
                      {order.isCustom && (order.status === 'price_quoted' || order.status === 'accepted') && order.price > 0 && (
                        <div className="mt-5 bg-white rounded-xl p-5 shadow-sm border border-amber-200 text-center animate-fadeIn">
                          <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">Proposed Price</p>
                          <p className="text-4xl font-black text-gray-900 mb-4 tracking-tight">{order.price} <span className="text-lg text-gray-500 font-bold">ETB</span></p>
                          <button 
                            onClick={() => navigate('/checkout', { state: { customOrder: order } })}
                            className="bg-gray-900 text-white w-full py-4 rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                          >
                            Pay Artisan
                          </button>
                          <p className="text-[10px] text-gray-400 mt-3 uppercase tracking-widest font-bold">Secure Payment</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Support Card */}
                 <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-gray-100 shadow-xl text-center">
                  <p className="text-gray-600 mb-4 font-medium text-sm">{t('nav.help_support', 'Need help with your order?')}</p>
                  <button className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-md">
                    {t('nav.contact_support', 'Contact Support')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : searched ? (
          <div className="bg-[#FFFFFF] rounded-2xl shadow-xl p-20 text-center border border-gray-100 flex flex-col items-center animate-fadeIn">
             <div className="w-24 h-24 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-12 h-12" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4">{t('tracking.order_not_found', 'Order Not Found')}</h3>
            <p className="text-gray-500 max-w-sm text-lg mb-8 leading-relaxed">
              {t('tracking.order_not_found_sub', "We couldn't locate an order matching that ID. Please verify the tracking number and try again.")}
            </p>
             <button
              onClick={() => setSearched(false)}
              className="px-8 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              {t('tracking.try_another_search', 'Try Another Search')}
            </button>
          </div>
        ) : (
          /* Initial Empty State */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mt-10 animate-fadeIn">
            <div className="space-y-6">
              <div className="bg-[#FFFFFF] p-8 rounded-2xl shadow-xl border border-gray-100 transition-all hover:shadow-2xl">
                 <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6">
                  <Truck className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">{t('tracking.real_time_updates', 'Real-time Updates')}</h3>
                <p className="text-gray-600 leading-relaxed font-medium">
                  {t('tracking.subtitle', "Track your package from the artisan's workshop to your doorstep with our integrated shipping network.")}
                </p>
              </div>
              <div className="bg-[#FFFFFF] p-8 rounded-2xl shadow-xl border border-gray-100 transition-all hover:shadow-2xl">
                 <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                  <Package className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">{t('tracking.order_history', 'Order History')}</h3>
                <p className="text-gray-600 leading-relaxed font-medium">
                  {t('tracking.subtitle', 'Log in to your account to seamlessly see your full history and manage multiple deliveries in one place.')}
                </p>
              </div>
            </div>
            <div className="relative group flex justify-center">
              <div className="absolute inset-0 bg-amber-200 rounded-[2rem] blur-3xl opacity-20"></div>
               <div className="bg-[#FFFFFF] p-10 rounded-[2.5rem] shadow-xl border border-gray-100 w-full max-w-sm relative z-10 flex flex-col items-center justify-center min-h-[400px] text-center">
                 <Search className="w-16 h-16 text-gray-200 mb-6" />
                 <h4 className="text-2xl font-black text-gray-900 mb-2">{t('tracking.title', 'Ready to track?')}</h4>
                 <p className="text-gray-500 font-medium">{t('tracking.search_placeholder', 'Enter your Order ID above to see live status updates.')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
