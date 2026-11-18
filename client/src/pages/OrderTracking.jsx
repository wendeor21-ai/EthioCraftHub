/**
 * Order Tracking Page for EthioCraft Global
 * Mobile-First, Highly Responsive with Complete Amharic & English Localization
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
      toast.error(t('tracking.search_placeholder', 'የትዕዛዝ መለያ ቁጥር (Order ID) ያስገቡ'));
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      const response = await api.get(`/orders/track/${id}`);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Error tracking order:', error);
      toast.error(t('tracking.order_not_found', 'ትዕዛዙ አልተገኘም። እባክዎ ቁጥሩን አስተካክለው እንደገና ይሞክሩ።'));
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
    toast.success(t('common.success', 'ተገልብጧል!'));
  };

  const getStatusLabel = (status) => {
    const mapping = {
      'pending': t('tracking.order_placed', 'ትዕዛዝ ተሰጥቷል'),
      'confirmed': t('orders.confirmed', 'ትዕዛዝ ተረጋግጧል'),
      'accepted': t('tracking.preparing', 'ተቀባይነት አግኝቷል'),
      'price_quoted': 'ዋጋ ተሰጥቷል',
      'processing': t('tracking.preparing', 'እየተዘጋጀ ነው'),
      'shipped': t('tracking.in_transit', 'በመንገድ ላይ ነው'),
      'delivered': t('tracking.delivered', 'ደርሷል / ተጠናቋል'),
      'completed': t('tracking.delivered', 'ተጠናቋል'),
      'cancelled': t('common.status_cancelled', 'ተሰርዟል'),
      'rejected': t('common.status_rejected', 'ውድቅ ተደርጓል')
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
      'pending': t('tracking.order_status_msg', 'ትዕዛዝዎ ደርሶናል፣ ማረጋገጫ በመጠባበቅ ላይ ነው።'),
      'confirmed': t('tracking.order_status_msg', 'ትዕዛዝዎ ተረጋግጧል! የእጅ ጥበብ ባለሙያው ስራውን ለመጀመር እየተዘጋጀ ነው።'),
      'accepted': 'ብጁ ትዕዛዝዎ ታይቷል! የመጨረሻው ዋጋ ተቀምጧል። እባክዎ አረጋግጠው ክፍያ ይፈጽሙ።',
      'price_quoted': 'ብጁ ትዕዛዝዎ ታይቷል! የመጨረሻው ዋጋ ተቀምጧል። እባክዎ አረጋግጠው ክፍያ ይፈጽሙ።',
      'processing': t('tracking.order_status_msg', 'ትዕዛዝዎ በባለሙያው በከፍተኛ ጥንቃቄ በእጅ እየተዘጋጀ ነው።'),
      'shipped': t('tracking.order_status_msg', 'ደስ የሚል ዜና! እቃዎ ወደ እርስዎ አድራሻ በመጓዝ ላይ ነው።'),
      'delivered': t('tracking.order_status_msg', 'ትዕዛዝዎ ደርሷል። በባህላዊ የኢትዮጵያ የእጅ ጥበብ ውጤት እንደሚደሰቱ ተስፋ እናደርጋለን!'),
      'completed': t('tracking.order_status_msg', 'የትዕዛዝ ሂደት ሙሉ በሙሉ ተጠናቋል። የሀገር ውስጥ ባለሙያዎችን ስለደገፉ እናመሰግናለን!'),
      'cancelled': t('common.status_cancelled', 'ይህ ትዕዛዝ ተሰርዟል።'),
      'rejected': t('common.status_rejected', 'ይህ ትዕዛዝ በባለሙያው አልተቀበለም። እባክዎ የደንበኞች አገልግሎትን ያነጋግሩ።')
    };
    return messages[status?.toLowerCase()] || t('common.loading', 'ሁኔታውን በመከታተል ላይ...');
  };

  const getProgressSteps = () => {
    const status = order?.status?.toLowerCase() || 'pending';
    const steps = [
      { key: 'placed', label: t('tracking.order_placed', 'ትዕዛዝ ተሰጥቷል'), icon: Package, statuses: ['pending', 'confirmed', 'accepted', 'price_quoted'] },
      { key: 'processing', label: t('tracking.preparing', 'እየተዘጋጀ ነው'), icon: Clock, statuses: ['processing', 'paid'] },
      { key: 'shipped', label: t('tracking.in_transit', 'በመንገድ ላይ'), icon: Truck, statuses: ['shipped'] },
      { key: 'delivered', label: t('tracking.delivered', 'ደርሷል'), icon: CheckCircle, statuses: ['delivered', 'completed'] }
    ];

    const statusFlow = ['pending', 'confirmed', 'accepted', 'price_quoted', 'paid', 'processing', 'shipped', 'delivered', 'completed'];
    const currentIndexInFlow = statusFlow.indexOf(status);

    return steps.map((step) => {
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
    if (!dateString) return t('common.status_pending', 'በመጠባበቅ ላይ');
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return t('common.status_pending', 'በመጠባበቅ ላይ');
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEstimatedDelivery = () => {
    if (order?.shipping?.estimatedDelivery) {
      return getFormattedDate(order.shipping.estimatedDelivery);
    }
    if (!order?.createdAt) return t('common.status_pending', 'በመጠባበቅ ላይ');
    const orderDate = new Date(order.createdAt);
    if (isNaN(orderDate.getTime())) return t('common.status_pending', 'በመጠባበቅ ላይ');
    
    const estimatedDate = new Date(orderDate);
    estimatedDate.setDate(estimatedDate.getDate() + 7);
    return getFormattedDate(estimatedDate);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-4 sm:py-10 px-3 sm:px-6 font-sans text-gray-800">
      <div className="container mx-auto max-w-5xl">
        
        {/* Header Section - Mobile Compact */}
        <div className="mb-4 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-6">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="group flex items-center space-x-2 text-gray-500 hover:text-gray-900 mb-2 sm:mb-4 transition-all font-medium text-xs sm:text-sm"
            >
              <div className="p-1.5 rounded-full border border-gray-200 group-hover:bg-gray-100 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span>{t('common.continue_shopping', 'ወደ ሱቅ ተመለስ')}</span>
            </button>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">
              {t('tracking.title', 'ትዕዛዝ መከታተያ')}
            </h1>
            <p className="text-gray-500 mt-1 text-xs sm:text-sm max-w-xl">
              {t('tracking.subtitle', 'የእጅ ጥበብ ስራዎችዎ ያሉበትን ደረጃ በቀጥታ ይከታተሉ')}
            </p>
          </div>
          
          <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2 max-w-md w-full">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder={t('tracking.search_placeholder', 'የትዕዛዝ መለያ ቁጥር (Order ID) ያስገቡ')}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-amber-500 transition-all outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {loading ? '...' : t('tracking.track_button', 'ፈልግ')}
              </button>
            </form>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
            <div className="relative w-12 h-12 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-amber-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin"></div>
            </div>
            <p className="text-sm font-bold text-gray-700">{t('common.loading', 'በመጫን ላይ...')}</p>
          </div>
        ) : order ? (
          <div className="space-y-4 sm:space-y-6 animate-fadeIn">
            {/* Main Order Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                
                {/* Overview Card */}
                <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-200/90">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 sm:mb-6 gap-3">
                    <div>
                      <h2 className="text-lg sm:text-2xl font-black text-gray-900 mb-1.5 flex items-center">
                        #{order.orderNumber || order._id?.slice(-8)}
                        <button 
                          onClick={() => copyToClipboard(order.orderNumber || order._id)}
                          className="ml-2 p-1 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-all"
                          title="Copy ID"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </h2>
                      <div className="flex items-center flex-wrap gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                        <span className="text-gray-400 text-xs flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {t('dashboard.recent_activity', 'የተዘመነው')} {order.updatedAt && !isNaN(new Date(order.updatedAt).getTime()) 
                            ? new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : t('common.status_pending', 'በቅርቡ')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-left sm:text-right bg-amber-50/50 rounded-xl p-2.5 sm:p-3 border border-amber-100/70">
                      <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">{t('tracking.estimated_delivery', 'የሚደርስበት ግምታዊ ቀን')}</p>
                      <p className="text-sm sm:text-base font-black text-amber-600 flex items-center sm:justify-end gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {getEstimatedDelivery()}
                      </p>
                    </div>
                  </div>

                  {/* Compact Stepper */}
                  <div className="relative pt-2 pb-2 px-1">
                    {/* Connecting Line for desktop */}
                    <div className="absolute top-7 left-[12%] right-[12%] h-1 bg-gray-100 rounded-full hidden sm:block">
                      <div 
                        className="h-full bg-amber-500 transition-all duration-700 ease-out"
                        style={{ 
                          width: `${Math.max(0, (getProgressSteps().filter(s => s.completed).length - 1) / (getProgressSteps().length - 1)) * 100}%` 
                        }}
                      />
                    </div>

                    {/* Steps */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-0 relative z-10">
                      {getProgressSteps().map((step) => {
                        const Icon = step.icon;
                        return (
                          <div key={step.key} className="flex sm:flex-col items-center gap-2 sm:gap-1.5 p-2 sm:p-0 rounded-xl bg-gray-50 sm:bg-transparent">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 shrink-0 ${
                              step.completed 
                                ? 'bg-amber-500 border-amber-500 text-white shadow-sm' 
                                : step.active
                                ? 'bg-white border-amber-500 text-amber-600 ring-2 ring-amber-100'
                                : 'bg-white border-gray-200 text-gray-300'
                            }`}>
                              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <div className="flex flex-col sm:items-center text-left sm:text-center min-w-0">
                              <span className={`text-xs font-bold leading-tight truncate ${step.completed || step.active ? 'text-gray-900' : 'text-gray-400'}`}>
                                {step.label}
                              </span>
                              {step.active && (
                                <span className="text-amber-600 text-[9px] font-black uppercase tracking-wider">{t('tracking.current_stage', 'የአሁኑ ደረጃ')}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Shipping Details Card */}
                <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-200/90">
                  <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-gray-100">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">{t('checkout.billing_details', 'የማጓጓዣ ዝርዝሮች')}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t('tracking.carrier', 'የማጓጓዣ ድርጅት')}</p>
                      <p className="font-semibold text-gray-800">
                        {order.shipping?.carrier || t('common.status_pending', "በቅርቡ ይገለጻል")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{t('tracking.tracking_number', 'የመከታተያ ቁጥር')}</p>
                      {order.shipping?.trackingNumber ? (
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-bold text-gray-900 break-all">{order.shipping.trackingNumber}</p>
                          <button 
                            onClick={() => copyToClipboard(order.shipping.trackingNumber)}
                            className="p-1 text-gray-400 hover:text-amber-600 rounded hover:bg-gray-50"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic">{t('errors.no_data', 'አልተሰጠም')}</p>
                      )}
                    </div>
                    <div className="sm:col-span-2 bg-gray-50 rounded-xl p-3 border border-gray-100 mt-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{t('tracking.additional_notes', 'ተጨማሪ ማስታወሻዎች')}</p>
                      <p className="text-gray-700 leading-relaxed text-xs">
                        {order.shipping?.notes || t('errors.no_data', "ተጨማሪ ማስታወሻ የለም።")}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Sidebar Info */}
              <div className="space-y-4 sm:space-y-6">
                {/* Delivery Address */}
                <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 border border-gray-200/90">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    {t('tracking.delivery_address', 'የማድረሻ አድራሻ')}
                  </h3>
                  
                   {order.shippingAddress ? (
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{t('tracking.recipient', 'ተቀባይ')}</p>
                        <p className="font-bold text-gray-900">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                      </div>
                      <div className="text-gray-600 space-y-0.5 text-xs">
                        <p>{order.shippingAddress.street || order.shippingAddress.addressLine1}</p>
                        <p>{order.shippingAddress.city}, {order.shippingAddress.region}</p>
                        <p>{order.shippingAddress.country} {order.shippingAddress.postalCode}</p>
                      </div>
                      <div className="pt-2 border-t border-gray-100 text-xs">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">{t('tracking.contact_phone', 'ስልክ ቁጥር')}</span>
                        <span className="font-semibold text-gray-800">{order.shippingAddress.phone || 'N/A'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic text-xs">{t('errors.no_data', 'የአድራሻ ዝርዝር አልተገኘም')}</p>
                  )}
                </div>

                {/* Status Insight */}
                <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200/70">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm text-amber-600 shrink-0">
                      <Info className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-amber-900 text-xs sm:text-sm mb-1">{t('tracking.status_insight', 'የትዕዛዝ ሁኔታ መረጃ')}</h4>
                      <p className="text-amber-800 text-xs leading-relaxed">
                        {getStatusMessage(order.status)}
                      </p>
                      
                      {order.isCustom && (order.status === 'price_quoted' || order.status === 'accepted') && order.price > 0 && (
                        <div className="mt-3 bg-white rounded-xl p-3 shadow-sm border border-amber-200 text-center">
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-0.5">የቀረበው ዋጋ</p>
                          <p className="text-xl font-black text-gray-900 mb-2">{order.price} <span className="text-xs text-gray-500 font-bold">ETB</span></p>
                          <button 
                            onClick={() => navigate('/checkout', { state: { customOrder: order } })}
                            className="bg-gray-900 text-white w-full py-2.5 rounded-lg font-bold hover:bg-black transition-all text-xs"
                          >
                            ክፈል
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Support Card */}
                <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-sm text-center">
                  <p className="text-gray-600 mb-2.5 font-medium text-xs">{t('tracking.need_help', 'እርዳታ ይፈልጋሉ?')}</p>
                  <button 
                    onClick={() => navigate('/support')}
                    className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-sm text-xs"
                  >
                    {t('tracking.contact_support', 'የደንበኞች አገልግሎት ያነጋግሩ')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : searched ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-12 text-center border border-gray-100 flex flex-col items-center animate-fadeIn max-w-md mx-auto">
             <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-3">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-1">{t('tracking.order_not_found', 'ትዕዛዙ አልተገኘም')}</h3>
            <p className="text-gray-500 text-xs sm:text-sm mb-4 leading-relaxed">
              {t('tracking.order_not_found_sub', 'በዚህ መለያ ቁጥር የተመዘገበ ትዕዛዝ ማግኘት አልተቻለም። እባክዎ ቁጥሩን አረጋግጠው እንደገና ይሞክሩ።')}
            </p>
             <button
              onClick={() => setSearched(false)}
              className="px-5 py-2 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all text-xs"
            >
              {t('tracking.try_another_search', 'እንደገና ፈልግ')}
            </button>
          </div>
        ) : (
          /* Initial Empty State */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-center mt-4 sm:mt-6 animate-fadeIn">
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200/90">
                 <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">{t('tracking.real_time_updates', 'የቀጥታ መከታተያ')}</h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                  {t('tracking.subtitle', 'ከባለሙያው የስራ ቦታ ጀምሮ እስከ ደጃፍዎ ድረስ ያለውን ጉዞ ይከታተሉ።')}
                </p>
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200/90">
                 <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">{t('tracking.order_history', 'የትዕዛዝ ታሪክ')}</h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                  {t('tracking.order_history_sub', 'ወደ አካውንትዎ በመግባት ሙሉ የትዕዛዝ ታሪክዎን በአንድ ቦታ ማየት ይችላሉ።')}
                </p>
              </div>
            </div>
            <div className="flex justify-center">
               <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200/90 w-full max-w-sm flex flex-col items-center justify-center text-center">
                 <Search className="w-10 h-10 text-amber-500/70 mb-3" />
                 <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1">{t('tracking.title', 'ትዕዛዝዎን መከታተል ይፈልጋሉ?')}</h4>
                 <p className="text-gray-500 text-xs">{t('tracking.search_placeholder', 'የትዕዛዝ መለያ ቁጥርዎን ከላይ ባለው ሳጥን ውስጥ ያስገቡ።')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
