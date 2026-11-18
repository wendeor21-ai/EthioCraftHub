import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  CheckCircleIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  ArchiveBoxIcon,
  TruckIcon,
  CreditCardIcon,
  ClockIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../utils/api';
import { useCustomTranslation } from '../hooks/useCustomTranslation';

const OrderSuccess = () => {
  const { t } = useCustomTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, homeConfig } = useSettings();
  const receiptRef = useRef(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const stateData = location.state || {};
  const orderNumberFromState = stateData.orderNumber || stateData.order?.orderId || stateData.order?.orderNumber;

  useEffect(() => {
    const fetchOrder = async () => {
      const idOrNumber = orderNumberFromState;
      if (!idOrNumber) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/orders/${idOrNumber}`);
        if (response.data.success || response.data.order) {
          const fetchedOrder = response.data.order || response.data.data;
          setOrder(fetchedOrder);
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        if (stateData.order) {
          setOrder(stateData.order);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderNumberFromState]);

  useEffect(() => {
    if (!loading && !orderNumberFromState) {
      const timer = setTimeout(() => navigate('/'), 5000);
      return () => clearTimeout(timer);
    }
  }, [loading, orderNumberFromState, navigate]);

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '0.00 ETB';
    return `${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
  };

  const downloadPDF = () => {
    if (!order) return;
    
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55);
      doc.text(settings.name || 'EthioCraft Global', 14, 22);
      
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('ELECTRONIC ORDER CONFIRMATION / ደረሰኝ', 14, 29);
      
      // Horizontal Line
      doc.setDrawColor(229, 231, 235);
      doc.line(14, 34, 196, 34);
      
      // Order Info Block
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('Order Details', 14, 43);
      doc.text('Shipping To', 105, 43);
      
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(10);
      doc.text(`Order Number: #${order.orderNumber || order._id?.slice(-8)}`, 14, 50);
      doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 14, 56);
      doc.text(`Payment: ${order.payment?.method || 'Manual'}`, 14, 62);
      
      const shipping = order.shippingAddress || {};
      doc.text(`${shipping.fullName || `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim() || 'Valued Customer'}`, 105, 50);
      doc.text(`${shipping.addressLine1 || shipping.street || 'Ethiopia'}`, 105, 56);
      doc.text(`${shipping.city || ''} ${shipping.state || shipping.region || ''}`, 105, 62);
      
      // Prepare table data
      const tableData = (order.items || []).map(item => [
        item.product?.name || 'Handcrafted Item',
        item.quantity.toString(),
        formatCurrency(item.price),
        formatCurrency(item.price * item.quantity)
      ]);

      // Add table using autoTable
      autoTable(doc, {
        startY: 70,
        head: [['Product Description', 'Qty', 'Unit Price', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8.5, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 85 },
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });

      let finalY = doc.lastAutoTable.finalY + 10;
      
      // Summary Box
      doc.setDrawColor(243, 244, 246);
      doc.setFillColor(249, 250, 251);
      doc.rect(130, finalY - 4, 66, 36, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('Subtotal:', 135, finalY + 4);
      doc.text('Shipping:', 135, finalY + 10);
      doc.text('Tax (VAT 15%):', 135, finalY + 16);
      
      doc.setTextColor(31, 41, 55);
      doc.text(formatCurrency(order.totals?.subtotal), 190, finalY + 4, { align: 'right' });
      doc.text(formatCurrency(order.totals?.shipping), 190, finalY + 10, { align: 'right' });
      doc.text(formatCurrency(order.totals?.tax), 190, finalY + 16, { align: 'right' });
      
      doc.setDrawColor(229, 231, 235);
      doc.line(135, finalY + 20, 191, finalY + 20);
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Total:', 135, finalY + 27);
      doc.text(formatCurrency(order.totals?.total), 190, finalY + 27, { align: 'right' });
      
      // Footer text
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('EthioCraft Global — Authentic Ethiopian Artisan Marketplace', 105, 275, { align: 'center' });
      doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 280, { align: 'center' });
      
      doc.save(`EthioCraft-Receipt-${order.orderNumber || 'receipt'}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Unable to generate PDF. Please use the Print button instead.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                <ArchiveBoxIcon className="w-4 h-4 text-amber-600" />
              </div>
            </div>
          </div>
          <p className="mt-4 text-gray-500 font-bold text-xs uppercase tracking-wider">{t('common.loading', 'በማዘጋጀት ላይ...')}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center max-w-sm w-full border border-gray-100">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
             <ArchiveBoxIcon className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('orders.receipt_expired', 'ደረሰኙ ጊዜው አልፏል')}</h2>
          <p className="text-gray-500 text-xs sm:text-sm mb-6 leading-relaxed">
            {t('orders.receipt_expired_desc', 'ለዚህ ትዕዛዝ የተፈጠረው ደህንነቱ የተጠበቀ ጊዜ አልቋል። የቀደሙ ትዕዛዞችዎን በመቆጣጠሪያ ገጽዎ ላይ ማግኘት ይችላሉ።')}
          </p>
          <button 
            onClick={() => navigate('/orders')} 
            className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all text-sm"
          >
             {t('orders.view_history', 'የትዕዛዝ ታሪክን ይመልከቱ')}
          </button>
        </div>
      </div>
    );
  }

  const customerName = order.shippingAddress?.fullName || 
    `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim() || 
    'ደንበኛ';

  return (
    <div className="min-h-screen bg-[#f1f5f9] py-4 sm:py-10 px-2 sm:px-4 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto">
        
        {/* Sleek, Mobile-First Top Header & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 sm:mb-6 print:hidden bg-white/70 backdrop-blur-sm p-3 sm:p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md shadow-green-500/20 shrink-0">
                <CheckCircleIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
             </div>
             <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight leading-tight truncate">
                  {t('orders.confirmed', 'ትዕዛዝዎ ተረጋግጧል')}
                </h1>
                <p className="text-gray-500 text-xs sm:text-sm font-medium truncate">
                  {t('orders.thank_you', 'ስለ ግዢዎ እናመሰግናለን፣ {{name}}!', { name: customerName })}
                </p>
             </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={downloadPDF}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:px-5 sm:py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
            >
              <ArrowDownTrayIcon className="w-4 h-4 text-amber-600" />
              <span>{t('orders.download_pdf', 'PDF አውርድ')}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:px-5 sm:py-3 bg-gray-900 rounded-xl text-xs sm:text-sm font-bold text-white hover:bg-black shadow-md shadow-gray-900/10 transition-all"
            >
              <PrinterIcon className="w-4 h-4 text-white" />
              <span>{t('orders.print_receipt', 'ደረሰኝ አትም')}</span>
            </button>
          </div>
        </div>

        {/* OFFICIAL ORDER RECEIPT CARD (Targeted for single-page print and ultra-clean mobile display) */}
        <div 
          id="receipt-print-area"
          ref={receiptRef}
          className="bg-white shadow-lg rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-200/90 relative"
        >
          {/* Identity Header */}
          <div className="receipt-header bg-[#1e293b] px-4 py-4 sm:px-8 sm:py-6 text-white flex flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-2.5 sm:gap-4">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-xl p-1.5 border border-white/20 shadow-sm shrink-0 flex items-center justify-center">
                   <img 
                    src={homeConfig?.headerLogo || "/logo1.png"} 
                    alt="Logo" 
                    className="w-full h-full object-contain" 
                    onError={(e) => { e.target.src = "https://cdn-icons-png.flaticon.com/512/825/825590.png"; }}
                   />
                </div>
                <div>
                   <h2 className="text-base sm:text-xl font-black tracking-tight leading-tight">{settings.name || 'ETHIOCRAFT GLOBAL'}</h2>
                   <p className="text-amber-400 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider">{t('orders.official_receipt', 'ይፋዊ የትዕዛዝ ደረሰኝ')}</p>
                </div>
             </div>
             <div className="text-right">
                <div className="bg-green-500/20 text-green-300 border border-green-500/30 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wide mb-1 inline-block">
                   {t('orders.payment_approved', 'ክፍያው ጸድቋል')}
                </div>
                <p className="text-xs sm:text-base font-black tracking-tight text-white block">#{order.orderNumber || order._id?.slice(-8)}</p>
                <p className="text-gray-400 text-[10px] sm:text-xs font-normal">
                  {new Date(order.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
             </div>
          </div>

          {/* Shipping & Payment Grid (Compact on mobile, 3 columns on tablet/desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-gray-100 text-xs sm:text-sm divide-y sm:divide-y-0 sm:divide-x divide-gray-100 bg-gray-50/50">
             {/* Destination */}
             <div className="p-3.5 sm:p-5">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">{t('orders.shipping_dest', 'የማድረሻ አድራሻ')}</h4>
                <div className="space-y-0.5">
                   <p className="font-bold text-gray-900 text-sm">{customerName}</p>
                   <p className="text-gray-600 text-xs leading-relaxed">{order.shippingAddress?.addressLine1 || order.shippingAddress?.street || 'Ethiopia'}</p>
                   <p className="text-gray-600 text-xs">{order.shippingAddress?.city}{order.shippingAddress?.region ? `, ${order.shippingAddress.region}` : ''}</p>
                   <p className="text-gray-600 text-xs font-medium">{order.shippingAddress?.phone}</p>
                </div>
             </div>
             
             {/* Transaction Details */}
             <div className="p-3.5 sm:p-5">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">{t('orders.transaction_details', 'የግብይት ዝርዝሮች')}</h4>
                <div className="space-y-2">
                   <div className="flex items-center gap-2">
                      <CreditCardIcon className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                         <span className="text-[10px] text-gray-400 block font-medium leading-none">{t('orders.method', 'የክፍያ ዘዴ')}</span>
                         <span className="text-xs font-bold text-gray-800 uppercase">{order.payment?.method || 'CASH ON DELIVERY'}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                         <span className="text-[10px] text-gray-400 block font-medium leading-none">{t('orders.delivery_window', 'የማድረሻ ጊዜ')}</span>
                         <span className="text-xs font-bold text-gray-800">{t('orders.delivery_days', 'በ 7 - 14 ቀናት ውስጥ')}</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Total Highlight */}
             <div className="p-3.5 sm:p-5 flex flex-col justify-center bg-amber-50/30">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">{t('orders.final_total', 'ጠቅላላ የተከፈለ')}</h4>
                <p className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                   {formatCurrency(order.totals?.total)}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-green-700">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                   {t('orders.verified_transaction', 'የተረጋገጠ ግብይት')}
                </div>
             </div>
          </div>

          {/* Purchased Items Table */}
          <div className="p-3.5 sm:p-6 overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                   <tr className="border-b border-gray-200 text-gray-400 text-[10px] sm:text-xs font-black uppercase tracking-wider">
                      <th className="pb-2.5">{t('orders.purchased_items', 'የተገዙ እቃዎች')}</th>
                      <th className="pb-2.5 text-center w-20">{t('orders.unit_price', 'የአንዱ ዋጋ')}</th>
                      <th className="pb-2.5 text-center w-14">{t('orders.qty', 'ብዛት')}</th>
                      <th className="pb-2.5 text-right w-24">{t('orders.line_total', 'ድምር')}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {(order.items || []).map((item, idx) => (
                      <tr key={idx} className="receipt-row">
                         <td className="py-2.5 sm:py-3.5">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                               <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden flex-shrink-0">
                                  {item.product?.images?.[0]?.url ? (
                                    <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                       <ArchiveBoxIcon className="w-5 h-5" />
                                    </div>
                                  )}
                               </div>
                               <div className="min-w-0 flex-1">
                                  <p className="text-xs sm:text-sm font-bold text-gray-900 truncate leading-snug">
                                    {item.product?.name || 'የእጅ ጥበብ ውጤት'}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 text-[9px] sm:text-[10px] text-gray-500">
                                     {item.size && (
                                       <span className="border border-gray-200 px-1.5 py-0.2 rounded font-medium">
                                         {t('orders.size', 'መጠን')}: {item.size}
                                       </span>
                                     )}
                                     <span>{t('orders.sku', 'መለያ')}: {item.product?.sku || 'EC-ARTISAN'}</span>
                                  </div>
                               </div>
                            </div>
                         </td>
                         <td className="text-center font-medium text-gray-700 text-xs">{formatCurrency(item.price)}</td>
                         <td className="text-center">
                            <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-xs font-bold text-gray-800">
                               {item.quantity}
                            </span>
                         </td>
                         <td className="text-right text-xs sm:text-sm font-bold text-gray-900">{formatCurrency(item.price * item.quantity)}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>

          {/* Financial Calculation Breakdown */}
          <div className="bg-gray-50/80 px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-200">
             <div className="max-w-xs ml-auto space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                   <span className="text-gray-500 font-medium">{t('orders.subtotal', 'የእቃዎች ድምር')}</span>
                   <span className="text-gray-900 font-semibold">{formatCurrency(order.totals?.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-gray-500 font-medium">{t('orders.shipping', 'ማጓጓዣ')}</span>
                   <span className="text-gray-900 font-semibold">{formatCurrency(order.totals?.shipping)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                   <span className="text-gray-500 font-medium">{t('orders.vat', 'ተ.እ.ታ (15%)')}</span>
                   <span className="text-gray-900 font-semibold">{formatCurrency(order.totals?.tax)}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                   <span className="text-sm sm:text-base font-black text-gray-900 uppercase">{t('orders.grand_total', 'ጠቅላላ ድምር')}</span>
                   <span className="text-base sm:text-xl font-black text-amber-600">
                      {formatCurrency(order.totals?.total)}
                   </span>
                </div>
             </div>
          </div>

          {/* Single-Page Print Stamp & Barcode Footer */}
          <div className="hidden print:block p-4 border-t border-gray-200 text-center text-[9px] text-gray-500">
             <p className="font-bold text-gray-700">{settings.name || 'EthioCraft Global'} — www.ethiocrafthub.com</p>
             <p>ይህ የኤሌክትሮኒክስ ደረሰኝ በሲስተሙ የተዘጋጀ ሲሆን ህጋዊ ማህተም አያስፈልገውም። ስለመረጡን እናመሰግናለን!</p>
          </div>

          {/* Cultural Footer Notes (Hidden on Print for perfect single page layout) */}
          <div className="px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white text-center sm:text-left print:hidden border-t border-gray-100">
             <div className="flex-1">
                <p className="text-xs font-bold text-gray-900 mb-0.5 uppercase tracking-wide">{t('orders.support_craft', 'ትክክለኛ የእጅ ጥበብን ይደግፉ')}</p>
                <p className="text-gray-500 text-[11px] leading-relaxed max-w-lg">
                  {t('orders.support_craft_desc', 'ግዢዎ የኢትዮጵያ የሀገር ውስጥ የእጅ ጥበብ ባለሙያዎችን በቀጥታ ያበረታታል እንዲሁም ባህላዊ የሽመና፣ የሸክላ እና የጌጣጌጥ ጥበቦችን ለቀጣዩ ትውልድ ለማቆየት ይረዳል።')}
                </p>
             </div>
             <div className="shrink-0 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
                   <TruckIcon className="w-3.5 h-3.5" />
                </div>
                <span>{t('orders.tracked_insured', 'በአስተማማኝ ሁኔታ የሚደርስ')}</span>
             </div>
          </div>
        </div>

        {/* Post-Purchase Actions (Compact buttons to reduce vertical scroll) */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden">
          <Link
            to="/products"
            className="w-full sm:w-auto px-6 py-3 bg-gray-900 text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl hover:bg-black transition-all shadow-md text-center"
          >
            {t('orders.explore_more', 'ተጨማሪ ምርቶችን ይመልከቱ')}
          </Link>
          <Link
            to="/orders/track"
            className="w-full sm:w-auto px-6 py-3 bg-white border border-gray-300 text-gray-800 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl hover:bg-gray-50 transition-all text-center"
          >
            {t('orders.track_order', 'ትዕዛዜን ተከታተል')}
          </Link>
        </div>
      </div>

      {/* STRICT 1-PAGE PRINT STYLING */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 6mm 6mm 6mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            font-size: 10px !important;
            color: #111827 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .min-h-screen {
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }
          .max-w-4xl {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide non-print areas */
          .print\\:hidden, nav, header, footer, .backdrop-blur-sm {
            display: none !important;
          }
          /* Ensure Receipt Container Fits strictly on 1 Page */
          #receipt-print-area {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: 1px solid #d1d5db !important;
            border-radius: 6px !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
          }
          .receipt-header {
            background-color: #1e293b !important;
            color: #ffffff !important;
            padding: 8px 14px !important;
          }
          .receipt-header h2 {
            font-size: 14px !important;
            color: #ffffff !important;
          }
          .receipt-header p {
            color: #cbd5e1 !important;
          }
          .receipt-header img {
            max-height: 36px !important;
          }
          .grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          .p-3\\.5, .sm\\:p-5, .sm\\:p-6, .p-3, .p-4 {
            padding: 6px 10px !important;
          }
          .space-y-2 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 2px !important;
          }
          table {
            width: 100% !important;
            font-size: 9.5px !important;
            border-collapse: collapse !important;
          }
          th, td {
            padding: 4px 6px !important;
          }
          .receipt-row {
            page-break-inside: avoid !important;
          }
          .w-10.h-10, .w-12.h-12 {
            width: 28px !important;
            height: 28px !important;
          }
          .text-xl, .text-2xl {
            font-size: 14px !important;
          }
          .text-lg {
            font-size: 12px !important;
          }
        }
      `}} />
    </div>
  );
};

export default OrderSuccess;
