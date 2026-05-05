import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../utils/api';
import { getFileUrl } from '../../../utils/getFileUrl';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import {
  DollarSign, HandCoins, AlertCircle, Filter, Eye, CheckCircle,
  ExternalLink, X, ShieldAlert, FileDown, Package, CreditCard,
  Truck, User, Flag, ShieldCheck, Landmark, History, RefreshCcw,
  ClipboardList, FileX, Search, Clock
} from 'lucide-react';
import CommissionHistoryModal from '../../../components/admin/CommissionHistoryModal';
import CommissionPayoutModal from '../../../components/admin/CommissionPayoutModal';
import { useCustomTranslation } from '../../../hooks/useCustomTranslation';

// ─── Order Detail Modal ─────────────────────────────────────────────────────
const OrderDetailModal = ({ order, onClose }) => {
  const { t } = useCustomTranslation();
  if (!order) return null;

  const payStatusColor = {
    Paid: 'bg-green-100 text-green-800',
    Completed: 'bg-emerald-100 text-emerald-800',
    Pending: 'bg-amber-100 text-amber-800',
    'Pending Verification': 'bg-blue-100 text-blue-800',
    Rejected: 'bg-red-100 text-red-800',
  };

  const Section = ({ icon: Icon, title, children }) => (
    <div className="mb-5">
      <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 pb-1 border-b border-gray-100">
        <Icon className="w-4 h-4" />{title}
      </div>
      <div className="space-y-2 text-sm text-gray-700">{children}</div>
    </div>
  );

  const Row = ({ label, value, className = '' }) => (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={`font-semibold text-right ${className}`}>{value || '—'}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-black text-gray-900">
              Order #{order.orderNumber}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(order.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {order.isDisputed && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                <Flag className="w-3 h-3" /> {t('admin_panel.flag_order')}
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${payStatusColor[order.payment?.status] || 'bg-gray-100 text-gray-700'}`}>
              {order.payment?.status}
            </span>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-1">
          {/* Parties */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><User className="w-3 h-3"/>{t('common.customer')}</p>
              <p className="font-bold text-gray-900">{order.customer?.profile?.firstName} {order.customer?.profile?.lastName}</p>
              <p className="text-xs text-gray-500">{order.customer?.email}</p>
              <p className="text-xs text-gray-500">{order.customer?.profile?.phone}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/>{t('artisan_panel.artisan_info', 'Artisan')}</p>
              <p className="font-bold text-gray-900">
                {order.items?.[0]?.artisan?.businessProfile?.businessName ||
                 `${order.items?.[0]?.artisan?.profile?.firstName || ''} ${order.items?.[0]?.artisan?.profile?.lastName || ''}`}
              </p>
              <p className="text-xs text-gray-500">{order.items?.[0]?.artisan?.email}</p>
              {order.items?.[0]?.artisan?.bankDetails && (
                <div className="mt-2 pt-2 border-t border-amber-200">
                  <p className="text-[10px] font-bold text-amber-600 uppercase">Bank Details</p>
                  <p className="text-xs font-semibold">{order.items[0].artisan.bankDetails.bankName}</p>
                  <p className="text-xs">{order.items[0].artisan.bankDetails.accountName}</p>
                  <p className="text-xs font-mono">{order.items[0].artisan.bankDetails.accountNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Financials */}
          <Section icon={CreditCard} title={t('checkout.billing_details', 'Financials')}>
            <Row label={t('checkout.payment_method')} value={order.payment?.method} />
            <Row label={t('checkout.total')} value={`${order.totals?.total?.toFixed(2)} ETB`} className="text-gray-900" />
            <Row label={t('artisan_panel.paid_commission', 'Platform Commission (10%)')} value={`${(order.totals?.platformCommission || order.totals?.total * 0.1)?.toFixed(2)} ETB`} className="text-amber-600" />
            <Row label={t('artisan_panel.your_balance', 'Artisan Earning (90%)')} value={`${(order.totals?.artisanEarning || order.totals?.total * 0.9)?.toFixed(2)} ETB`} className="text-green-700" />
            <Row label={t('common.status', 'Commission Status')} value={order.commissionStatus || 'Pending'} className="capitalize" />
            <Row label={t('admin_panel.payouts', 'Payout Status')} value={order.payoutStatus || 'Pending'} className="capitalize" />
            {order.payment?.receipt && (
              <div className="flex justify-between items-center pt-1">
                <span className="text-gray-400">{t('admin_panel.verify_receipt')}</span>
                <a
                  href={getFileUrl(order.payment.receipt)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline font-semibold text-xs flex items-center gap-1"
                >
                  {t('admin_panel.verify_receipt')} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </Section>

          {/* Shipping Address */}
          <Section icon={Truck} title={t('checkout.shipping_address')}>
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-xs text-gray-700 leading-relaxed">
              <p className="font-bold text-gray-900 mb-1">
                {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}
              </p>
              <p>{order.shippingAddress?.street}</p>
              <p>{order.shippingAddress?.city}, {order.shippingAddress?.region}</p>
              <p>{order.shippingAddress?.country} {order.shippingAddress?.postalCode}</p>
              <p className="mt-2 font-semibold">📞 {order.shippingAddress?.phone}</p>
            </div>
          </Section>

          {/* Order Items */}
          <Section icon={Package} title={t('nav.cart', 'Items')}>
            <div className="space-y-2">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  {(() => {
                    const imgSrc = item.productImage || item.product?.images?.[0]?.url || item.product?.images?.[0];
                    let finalUrl = 'https://placehold.co/100x100/f3f4f6/a1a1aa?text=No+Image';
                    if (imgSrc && typeof imgSrc === 'string') {
                      if (imgSrc.startsWith('http')) {
                        finalUrl = imgSrc;
                      } else {
                        const path = imgSrc.startsWith('/uploads/') ? imgSrc : `/uploads/${imgSrc.replace(/^\//, '')}`;
                        finalUrl = getFileUrl(path);
                      }
                    }
                    return (
                      <img 
                        src={finalUrl}
                        alt={item.product?.name || 'Product Image'} 
                        className="w-12 h-12 rounded-lg object-cover bg-white border border-gray-200 shadow-sm"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/100x100/f3f4f6/a1a1aa?text=No+Image';
                        }}
                      />
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.product?.name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity} × {item.price?.toFixed(2)} ETB</p>
                  </div>
                  <span className="font-bold text-gray-900 text-sm shrink-0">{(item.quantity * item.price)?.toFixed(2)} ETB</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Delivery */}
          <Section icon={Truck} title={t('product.specifications', 'Delivery Status')}>
            <Row label={t('common.status', 'Current Status')} value={order.status} className="capitalize font-bold text-blue-600" />
            <Row label="Delivery Step" value={order.shipping?.deliveryStatus || order.status} className="capitalize" />
            <Row label="Carrier" value={order.shipping?.carrier} />
            <Row label="Tracking #" value={order.shipping?.trackingNumber} />
            <Row label="Estimated Delivery" value={order.shipping?.estimatedDelivery
              ? new Date(order.shipping.estimatedDelivery).toLocaleDateString()
              : undefined} />
            <Row label="Delivered At" value={order.completionDate || order.shipping?.deliveredAt
              ? new Date(order.completionDate || order.shipping.deliveredAt).toLocaleString()
              : undefined} />
            {order.deliveryEfficiencyDays && (
              <Row label="Delivery Efficiency" value={`${order.deliveryEfficiencyDays} day${order.deliveryEfficiencyDays > 1 ? 's' : ''} (from order)`} className="text-emerald-600 font-bold bg-emerald-50 rounded px-2" />
            )}
          </Section>

          {/* Notes */}
          {order.notes && (
            <Section icon={AlertCircle} title="Notes">
              <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg break-words">{order.notes}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main TradeLedger Component ─────────────────────────────────────────────
const TradeLedger = () => {
  const { t } = useCustomTranslation();
  const [orders, setOrders] = useState([]);
  const [artisansWithDebt, setArtisansWithDebt] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [modalOrder, setModalOrder] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' or 'commissions'
  const [globalStats, setGlobalStats] = useState({ totalRevenue: 0, platformCommissionOwed: 0, totalEarnings: 0 });
  const [commissionSummary, setCommissionSummary] = useState({ totalUnpaidDebt: 0, totalPaidCommission: 0, pendingVerificationCount: 0 });
  const [historyModalArtisanId, setHistoryModalArtisanId] = useState(null);
  const [payoutModalArtisan, setPayoutModalArtisan] = useState(null);
  const [pendingCommissionPayments, setPendingCommissionPayments] = useState([]);
  const [proofModalPayment, setProofModalPayment] = useState(null);

  // Debouncing effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // reset pagination when search changes
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchLedgerData();
  }, [debouncedSearch, paymentStatusFilter, deliveryStatusFilter, paymentMethodFilter]);

  // Auto-refresh commissions tab every 30 seconds to catch artisan submissions
  useEffect(() => {
    if (activeTab !== 'commissions') return;
    const interval = setInterval(() => fetchCommissionsOnly(), 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchCommissionsOnly = async () => {
    try {
      const [debtRes, pendingRes, summaryRes] = await Promise.all([
        api.get('/admin/commission/balances'),
        api.get('/admin/commission/pending'),
        api.get('/admin/commissions/summary')
      ]);
      setArtisansWithDebt(debtRes.data.artisans || []);
      setPendingCommissionPayments(pendingRes.data.payments || []);
      if (summaryRes.data.summary) setCommissionSummary(summaryRes.data.summary);
    } catch (err) {
      // Silent refresh — don't show error toasts for background polls
      console.warn('Commission refresh failed:', err.message);
    }
  };

  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (paymentStatusFilter !== 'All') params.append('paymentStatus', paymentStatusFilter);
      if (deliveryStatusFilter !== 'All') params.append('deliveryStatus', deliveryStatusFilter);
      if (paymentMethodFilter !== 'All') params.append('paymentMethod', paymentMethodFilter);

      const [paymentsRes, debtRes, pendingRes, summaryRes] = await Promise.all([
        api.get(`/admin/payments?${params.toString()}`),
        api.get('/admin/commission/balances'),
        api.get('/admin/commission/pending'),
        api.get('/admin/commissions/summary')
      ]);
      setOrders(paymentsRes.data.transactions || []);
      setArtisansWithDebt(debtRes.data.artisans || []);
      setPendingCommissionPayments(pendingRes.data.payments || []);
      if (debtRes.data.globalStats) setGlobalStats(debtRes.data.globalStats);
      if (summaryRes.data.summary) setCommissionSummary(summaryRes.data.summary);
    } catch (err) {
      toast.error('Failed to fetch ledger data');
    } finally {
      setLoading(false);
    }
  };

  // Optimistically update a row in-place after an action
  const patchOrder = useCallback((orderId, patch) => {
    setOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...patch } : o));
  }, []);

  // ── View Details ───────────────────────────────────────────────────────────
  const handleViewDetails = async (orderNumber) => {
    try {
      setModalLoading(true);
      setModalOrder('loading'); // show modal shell immediately
      const res = await api.get(`/admin/orders/${orderNumber}`);
      setModalOrder(res.data.order);
    } catch (err) {
      toast.error(t('common.error'));
      setModalOrder(null);
    } finally {
      setModalLoading(false);
    }
  };

  // ── Mark as Delivered ─────────────────────────────────────────────────────
  const handleMarkAsDelivered = async (order) => {
    if (!window.confirm(`Mark Order #${order.orderNumber} as Delivered? This will record 10% commission debt for Manual/COD orders.`)) return;
    try {
      await api.put(`/orders/${order._id}/deliver`);
      toast.success('Order marked as Delivered!');
      fetchLedgerData(); // Refresh to update debt balances
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark as delivered');
    }
  };

  // ── Confirm COD Commission (Retained for compatibility) ─────────────────────
  const handleConfirmCOD = async (order) => {
    if (!window.confirm(`Confirm 10% platform commission received from Artisan for Order #${order.orderNumber}?`)) return;
    try {
      await api.put(`/admin/orders/${order._id}/confirm-cod`);
      patchOrder(order._id, { commissionStatus: 'Paid', status: 'Completed' });
      toast.success('COD commission confirmed!');
      fetchLedgerData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm COD');
    }
  };

  // ── Verify Manual Payment ──────────────────────────────────────────────────
  const handleVerifyPayment = async (order) => {
    if (!window.confirm(`Approve manual payment for Order #${order.orderNumber}?`)) return;
    try {
      await api.put(`/admin/orders/${order._id}/approve-payment`);
      patchOrder(order._id, { status: 'Paid', payoutStatus: 'Ready' });
      toast.success('Payment approved! Artisan address now visible.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to verify payment');
    }
  };

  // ── Release Artisan Payout ─────────────────────────────────────────────────
  const handleReleasePayout = async (order) => {
    if (!window.confirm(`Release 90% payout to Artisan for Order #${order.orderNumber}?`)) return;
    try {
      await api.put(`/orders/${order._id}/pay-artisan`);
      patchOrder(order._id, { payoutStatus: 'Paid' });
      toast.success('Payout released to Artisan successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to release payout');
    }
  };

  // ── Clear Artisan Debt ─────────────────────────────────────────────────────
  const handleClearDebt = async (artisan) => {
    if (!window.confirm(`Confirm payment of ${artisan.unpaidCommission.toFixed(2)} ETB commission from ${artisan.profile?.firstName} ${artisan.profile?.lastName}?`)) return;
    try {
      await api.put(`/admin/commission/clear/${artisan._id}`);
      toast.success('Commission payment confirmed successfully');
      fetchLedgerData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear debt');
    }
  };

  // ── Flag / Dispute ─────────────────────────────────────────────────────────
  const handleFlagOrder = async (order) => {
    const action = order.isDisputed ? 'Remove dispute flag from' : 'Flag as disputed';
    const reason = order.isDisputed ? '' : (prompt(`Reason for flagging Order #${order.orderNumber}:`) || 'Admin dispute');
    if (order.isDisputed ? !window.confirm(`${action} Order #${order.orderNumber}?`) : reason === null) return;
    try {
      await api.put(`/admin/orders/${order._id}/flag`, { reason });
      patchOrder(order._id, { isDisputed: !order.isDisputed });
      toast.success(order.isDisputed ? 'Dispute flag removed' : 'Order flagged as disputed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to flag order');
    }
  };

  // ── Download Invoice PDF ───────────────────────────────────────────────────
  const handleDownloadInvoice = (order) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const goldColor = [212, 160, 23];
    const darkColor = [30, 30, 30];

    // Header bar
    doc.setFillColor(...goldColor);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('EthioCraft Global', 14, 13);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Admin Trade Invoice', 14, 21);

    // Order number right
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order #${order.orderNumber || order._id?.slice(-8)}`, 196, 13, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(order.createdAt).toLocaleDateString('en-US', { dateStyle: 'long' }), 196, 21, { align: 'right' });

    doc.setTextColor(...darkColor);

    // Parties
    let y = 38;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER', 14, y);
    doc.text('ARTISAN', 110, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(order.customer?.profile?.firstName
      ? `${order.customer.profile.firstName} ${order.customer.profile.lastName}`
      : 'N/A', 14, y);
    doc.text(order.artisanName || 'Artisan Hub', 110, y);

    // Divider
    y += 8;
    doc.setDrawColor(230, 230, 230);
    doc.line(14, y, 196, y);
    y += 8;

    // Financials table
    const tableHeaders = ['Description', 'Amount'];
    const rows = [
      ['Subtotal', `${order.amount?.toFixed(2) || '0.00'} ETB`],
      ['Platform Commission (10%)', `${order.commission?.toFixed(2) || '0.00'} ETB`],
      ['Artisan Earning (90%)', `${(order.earning || (order.amount * 0.9))?.toFixed(2) || '0.00'} ETB`],
    ];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setFillColor(245, 245, 245);
    doc.rect(14, y - 4, 182, 7, 'F');
    doc.text(tableHeaders[0], 16, y);
    doc.text(tableHeaders[1], 190, y, { align: 'right' });
    y += 5;
    doc.setFont('helvetica', 'normal');

    rows.forEach(([label, val]) => {
      doc.text(label, 16, y);
      doc.text(val, 190, y, { align: 'right' });
      y += 6;
      doc.setDrawColor(245, 245, 245);
      doc.line(14, y - 1, 196, y - 1);
    });

    // Status block
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Payment Method: ${order.method || 'N/A'}`, 14, y);
    doc.text(`Payment Status: ${order.status || 'N/A'}`, 100, y);
    y += 6;
    doc.text(`Payout Status: ${order.payoutStatus || 'Pending'}`, 14, y);
    doc.text(`Commission Status: ${order.commissionStatus || 'Pending'}`, 100, y);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated by EthioCraft Global Admin System', 105, 285, { align: 'center' });
    doc.text(`${new Date().toISOString()}`, 105, 290, { align: 'center' });

    doc.save(`EthioCraft_Invoice_${order.orderNumber || order._id?.slice(-8)}.pdf`);
    toast.success('Invoice downloaded!');
  };

  // ── Filters & Stats ────────────────────────────────────────────────────────
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [orders, currentPage, itemsPerPage]);

  if (loading) return <div className="p-8 text-center"><LoadingSpinner /></div>;

  // ── Render ─────────────────────────────────────────────────────────────────
  const methodColors = {
    Online: 'bg-green-100 text-green-800',
    CHAPA: 'bg-green-100 text-green-800',
    stripe: 'bg-purple-100 text-purple-800',
    Manual: 'bg-amber-100 text-amber-800',
    COD: 'bg-blue-100 text-blue-800',
  };

  return (
    <>
      {/* ── Detail Modal ── */}
      {modalOrder && modalOrder !== 'loading' && (
        <OrderDetailModal order={modalOrder} onClose={() => setModalOrder(null)} />
      )}
      {modalOrder === 'loading' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white p-8 rounded-2xl shadow-2xl">
            <LoadingSpinner />
            <p className="text-sm text-gray-500 mt-3 text-center">{t('common.loading')}</p>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* ── Page Header ── */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <nav className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('ledger')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'ledger' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t('admin_panel.trade_ledger')}
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'commissions' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t('admin_panel.artisan_commissions')}
                {commissionSummary.pendingVerificationCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {commissionSummary.pendingVerificationCount}
                  </span>
                )}
              </button>
            </nav>

            <button 
              onClick={fetchLedgerData}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Refresh Data"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {activeTab === 'ledger' && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin_panel.search_artisan')}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={paymentStatusFilter}
                onChange={(e) => { setPaymentStatusFilter(e.target.value); setCurrentPage(1); }}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Payment Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
              <select
                value={deliveryStatusFilter}
                onChange={(e) => { setDeliveryStatusFilter(e.target.value); setCurrentPage(1); }}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Delivery Status</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <select
                value={paymentMethodFilter}
                onChange={(e) => { setPaymentMethodFilter(e.target.value); setCurrentPage(1); }}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Methods</option>
                <option value="COD">COD</option>
                <option value="MANUAL">MANUAL</option>
                <option value="CHAPA">CHAPA</option>
              </select>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setPaymentStatusFilter('All');
                  setDeliveryStatusFilter('All');
                  setPaymentMethodFilter('All');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-900 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {[
            {
              icon: HandCoins,
              color: 'orange',
              label: t('artisan_panel.unpaid_debt'),
              value: `${(commissionSummary.totalUnpaidDebt || 0).toFixed(2)} ETB`,
              sub: t('artisan_panel.accumulated_debt')
            },
            {
              icon: Landmark,
              color: 'green',
              label: t('artisan_panel.paid_commission'),
              value: `${(commissionSummary.totalPaidCommission || 0).toFixed(2)} ETB`,
              sub: t('success')
            },
            {
              icon: ClipboardList,
              color: 'blue',
              label: 'PENDING VERIFICATION',
              value: commissionSummary.pendingVerificationCount || 0,
              sub: 'Artisan payment submissions'
            },
          ].map(({ icon: Icon, color, label, value, sub }) => (
            <div key={label} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full bg-${color}-50 flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 text-${color}-600`} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Content ── */}
        {activeTab === 'ledger' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {[t('common.order_id', 'Order'), t('common.customer', 'Parties'), t('checkout.total', 'Amount'), t('artisan_panel.paid_commission', 'Commission'), t('common.status'), t('common.action')].map(h => (
                      <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {paginatedOrders.map((order) => (
                    <tr
                      key={order._id}
                      className={`hover:bg-gray-50/60 transition-colors ${order.isDisputed ? 'bg-red-50/40' : ''}`}
                    >
                      {/* Order # */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-gray-900">
                            #{order.orderNumber || order._id.slice(-8)}
                          </span>
                          {order.isDisputed && (
                            <span title="Disputed" className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold">
                              <Flag className="w-2.5 h-2.5" />DISPUTE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Parties */}
                      <td className="px-5 py-4">
                        <div className="text-xs text-gray-400 font-semibold uppercase">Artisan</div>
                        <div className="text-sm font-medium text-gray-900">{order.artisanName || 'Artisan Hub'}</div>
                        <div className="text-xs text-gray-400 font-semibold uppercase mt-1">Customer</div>
                        <div className="text-sm text-gray-700">
                          {order.customer?.profile?.firstName || 'N/A'}
                        </div>
                      </td>

                      {/* Amount / Method */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{order.amount?.toFixed(2)} ETB</div>
                        <span className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${methodColors[order.method] || 'bg-gray-100 text-gray-700'}`}>
                          {order.method}
                        </span>
                      </td>

                      {/* Commission */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-amber-600 bg-amber-50 inline-block px-2 py-1 rounded-lg">
                          {(order.commission || 0).toFixed(2)} ETB
                        </div>
                        <div className={`text-[10px] font-bold mt-1 ${order.commissionStatus === 'Paid' ? 'text-green-600' : 'text-gray-400'}`}>
                          {order.commissionStatus || 'Pending'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="space-y-1 mt-1">
                          <div className="text-xs flex items-center">
                            <span className="text-gray-400 mr-1.5 flex items-center gap-1">
                              <CreditCard className="w-3 h-3" /> Payment:
                            </span>
                            <span className={`font-bold ${['Paid', 'Completed', 'Delivered'].includes(order.status) ? 'text-green-600' : 'text-amber-600'}`}>
                              {['Manual', 'COD'].includes(order.method) && ['Paid', 'Completed', 'Delivered'].includes(order.status) 
                                ? '[Recv. by Artisan]' 
                                : order.status}
                            </span>
                          </div>
                          <div className="text-[10px] flex items-center text-gray-500">
                            <span className="text-gray-400 mr-1.5 flex items-center gap-1">
                              <Truck className="w-3 h-3" /> Delivery:
                            </span>
                            <span className="font-semibold uppercase">{order.deliveryStatus || 'Pending'}</span>
                          </div>
                          {order.deliveryEfficiencyDays && (
                            <div className="text-[10px] flex items-center text-emerald-600 bg-emerald-50 max-w-fit px-1.5 py-0.5 rounded mt-0.5 font-bold shadow-sm">
                              <Clock className="w-3 h-3 mr-1" />
                              {order.deliveryEfficiencyDays} day{order.deliveryEfficiencyDays > 1 ? 's' : ''} avg
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* View Details */}
                          <button
                            onClick={() => handleViewDetails(order.orderNumber || order._id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Approve Manual Payment */}
                          {order.method === 'Manual' && !['Paid', 'Completed'].includes(order.status) && (
                            <button
                              onClick={() => handleVerifyPayment(order)}
                              className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                              title="Approve Manual Payment"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}

                          {/* Mark as Delivered */}
                          {(['Shipped', 'shipped'].includes(order.status)) && (
                            <button
                              onClick={() => handleMarkAsDelivered(order)}
                              className="flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                              title="Mark as Delivered"
                            >
                              <Package className="w-3.5 h-3.5" /> Mark Delivered
                            </button>
                          )}

                          {/* Flag / Dispute */}
                          <button
                            onClick={() => handleFlagOrder(order)}
                            className={`p-1.5 rounded-lg transition-colors ${order.isDisputed ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                            title={order.isDisputed ? 'Remove Dispute' : 'Flag as Disputed'}
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>

                          {/* Download Invoice */}
                          <button
                            onClick={() => handleDownloadInvoice(order)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            title={t('common.view_details')}
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {orders.length === 0 ? (
              <div className="p-16 flex flex-col items-center text-gray-400">
                <Filter className="w-10 h-10 opacity-30 mb-3" />
                <p className="font-semibold text-gray-600">{t('errors.generic')}</p>
                <p className="text-sm mt-1">{t('common.search')}</p>
              </div>
            ) : (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                <span className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, orders.length)} of {orders.length} entries
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-4 py-1.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="px-4 py-1.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-orange-500" />
                {t('admin_panel.artisan_commissions')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{t('artisan_panel.accumulated_debt')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('artisan_panel.artisan_info', 'Artisan')}</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('artisan_panel.stock_status', 'Bank Details')}</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('artisan_panel.paid_commission')}</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('artisan_panel.unpaid_debt')}</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">{t('common.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {artisansWithDebt.map((artisan) => (
                    <tr key={artisan._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900">{artisan.profile?.firstName} {artisan.profile?.lastName}</div>
                        <div className="text-xs text-gray-500">{artisan.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        {artisan.bankDetails ? (
                          <div className="text-xs">
                            <div className="font-bold">{artisan.bankDetails.bankName}</div>
                            <div>{artisan.bankDetails.accountNumber}</div>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-bold text-green-600">
                          {(artisan.paidCommission || 0).toFixed(2)} ETB
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-lg font-black text-orange-600">
                          {(artisan.unpaidCommission || 0).toFixed(2)} ETB
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setHistoryModalArtisanId(artisan._id)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1.5 border border-blue-100"
                          >
                            <Eye className="w-4 h-4" /> View Details
                          </button>
                          
                          {(() => {
                            const pendingPayment = pendingCommissionPayments.find(p => p.artisan?._id?.toString() === artisan._id?.toString());
                            if (pendingPayment) {
                              return (
                                <button
                                  onClick={() => setProofModalPayment(pendingPayment)}
                                  className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm font-bold border border-orange-200 hover:bg-orange-200 transition-all flex items-center gap-1.5 animate-pulse"
                                >
                                  <ClipboardList className="w-4 h-4" /> View Proof
                                </button>
                              );
                            }
                            return (
                              <span className="text-xs font-bold text-gray-400 italic px-3">
                                {t('common.status')}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {artisansWithDebt.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-16 text-center text-gray-400">
                        <ShieldCheck className="w-10 h-10 opacity-30 mb-3 mx-auto" />
                        <p className="font-semibold text-gray-600">{t('success')}</p>
                        <p className="text-sm mt-1">{t('artisan_panel.unpaid_debt')}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {historyModalArtisanId && (
        <CommissionHistoryModal
          artisanId={historyModalArtisanId}
          onClose={() => setHistoryModalArtisanId(null)}
        />
      )}

      {proofModalPayment && (
        <ProofViewerModal
          payment={proofModalPayment}
          onClose={() => setProofModalPayment(null)}
          onRefresh={fetchLedgerData}
        />
      )}
    </>
  );
};

// ─── ProofViewerModal Component ─────────────────────────────────────────────
const ProofViewerModal = ({ payment, onClose, onRefresh }) => {
  const { t } = useCustomTranslation();
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (!window.confirm(`Confirm receipt of ${payment.amount.toFixed(2)} ETB? This will settle associated debts.`)) return;
    try {
      setLoading(true);
      await api.put(`/admin/commission/approve-payment/${payment._id}`, {
        artisanId: payment.artisan?._id || payment.artisan,
        paymentAmount: payment.amount
      });
      toast.success('Commission receipt confirmed!');
      onRefresh();
      onClose();
    } catch (err) {
      toast.error('Failed to confirm receipt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-slideUp">
        <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Eye className="w-5 h-5 text-orange-500" /> {t('modals.confirm_receipt')}
            </h2>
            <p className="text-gray-400 text-xs mt-1">{t('modals.verify_receipt_instruction')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="aspect-video w-full bg-gray-100 rounded-2xl overflow-hidden border border-gray-100 shadow-inner group relative">
            {payment.receiptImage ? (
              <>
                <img 
                  src={getFileUrl(payment.receiptImage)} 
                  alt="Payment Receipt" 
                  className="w-full h-full object-contain" 
                />
                <a 
                  href={getFileUrl(payment.receiptImage)} 
                  target="_blank" 
                  rel="noreferrer"
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold"
                >
                  Click to Open Full Image
                </a>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <FileX className="w-12 h-12 opacity-20 mb-2" />
                <p className="text-sm font-semibold uppercase tracking-widest opacity-50">{t('errors.generic')}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Amount Paid</p>
              <p className="text-2xl font-black text-gray-900">{payment.amount.toFixed(2)} <span className="text-sm">ETB</span></p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Method</p>
              <p className="text-lg font-bold text-gray-800">{payment.paymentMethod}</p>
            </div>
          </div>

          {payment.notes && (
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">{t('product.description')}</p>
              <p className="text-sm text-gray-700 italic">"{payment.notes}"</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex-[2] py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {loading ? 'Confirming...' : 'Confirm Commission Receipt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeLedger;
