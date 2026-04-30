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
      
      // Amazon Style Header
      doc.setFontSize(22);
      doc.setTextColor(31, 41, 55); // Gray 800
      doc.text(settings.name || 'EthioCraft Global', 14, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // Gray 500
      doc.text('ELECTRONIC ORDER CONFIRMATION', 14, 32);
      
      // Horizontal Line
      doc.setDrawColor(229, 231, 235);
      doc.line(14, 38, 196, 38);
      
      // Order Info Block
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('Order Details', 14, 48);
      doc.text('Shipping To', 105, 48);
      
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(10);
      doc.text(`Order Number: #${order.orderNumber}`, 14, 55);
      doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 14, 61);
      doc.text(`Payment: ${order.payment?.method || 'Manual'}`, 14, 67);
      
      const shipping = order.shippingAddress || {};
      doc.text(`${shipping.fullName || 'Valued Customer'}`, 105, 55);
      doc.text(`${shipping.addressLine1 || 'Ethiopia'}`, 105, 61);
      doc.text(`${shipping.city || ''} ${shipping.state || ''}`, 105, 67);
      
      // Prepare table data
      const tableData = (order.items || []).map(item => [
        item.product?.name || 'Handcrafted Item',
        item.quantity.toString(),
        formatCurrency(item.price),
        formatCurrency(item.price * item.quantity)
      ]);

      // Add table using autoTable
      autoTable(doc, {
        startY: 75,
        head: [['Product Description', 'Quantity', 'Unit Price', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 9, cellPadding: 5 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });

      let finalY = doc.lastAutoTable.finalY + 15;
      
      // Summary Box
      doc.setDrawColor(243, 244, 246);
      doc.setFillColor(249, 250, 251);
      doc.rect(130, finalY - 5, 66, 40, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text('Subtotal:', 135, finalY + 5);
      doc.text('Shipping:', 135, finalY + 12);
      doc.text('Tax (VAT 15%):', 135, finalY + 19);
      
      doc.setTextColor(31, 41, 55);
      doc.text(formatCurrency(order.totals?.subtotal), 190, finalY + 5, { align: 'right' });
      doc.text(formatCurrency(order.totals?.shipping), 190, finalY + 12, { align: 'right' });
      doc.text(formatCurrency(order.totals?.tax), 190, finalY + 19, { align: 'right' });
      
      doc.setDrawColor(229, 231, 235);
      doc.line(135, finalY + 24, 191, finalY + 24);
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Total:', 135, finalY + 31);
      doc.text(formatCurrency(order.totals?.total), 190, finalY + 31, { align: 'right' });
      
      // Thanks
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('This is a computer-generated confirmation and does not require a physical signature.', 105, 280, { align: 'center' });
      doc.text(`© ${new Date().getFullYear()} ${settings.name || 'EthioCraft Global'} — www.ethiocraft.com`, 105, 285, { align: 'center' });
      
      doc.save(`EthioCraft-Receipt-${order.orderNumber}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Unable to generate PDF. Please try printing instead.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center group">
          <div className="relative">
            <div className="h-20 w-20 border-4 border-ethiopian-gold/20 border-t-ethiopian-gold rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <ArchiveBoxIcon className="w-5 h-5 text-ethiopian-gold" />
              </div>
            </div>
          </div>
          <p className="mt-6 text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">Processing Mastery...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-md border border-gray-100">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <ArchiveBoxIcon className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Receipt Expired</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">The secure session for this order has ended. You can find your history in your dashboard.</p>
          <button onClick={() => navigate('/orders')} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all">
             View Order History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] py-12 px-4 font-['Inter',sans-serif]">
      <div className="max-w-4xl mx-auto">
        
        {/* Superior Top Bar Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 print:hidden">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/20">
                <CheckCircleIcon className="w-7 h-7 text-white" />
             </div>
             <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Order Confirmed</h1>
                <p className="text-gray-500 text-sm font-medium">Thank you for your purchase, {order.shippingAddress?.fullName?.split(' ')[0] || 'Abebe'}!</p>
             </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={downloadPDF}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-sm font-black text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
            >
              <ArrowDownTrayIcon className="w-4 h-4 text-ethiopian-gold" />
              DOWNLOAD PDF
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 rounded-xl text-sm font-black text-white hover:bg-black shadow-xl shadow-gray-900/10 transition-all"
            >
              <PrinterIcon className="w-4 h-4 text-white" />
              PRINT RECEIPT
            </button>
          </div>
        </div>

        {/* PROFESSIONAL RECEIPT (Amazon/Premium Inspired) */}
        <div 
          ref={receiptRef}
          className="bg-white shadow-[0_10px_50px_rgba(0,0,0,0.06)] rounded-[2.5rem] overflow-hidden border border-gray-100 relative print:shadow-none print:border-none"
        >
          {/* Subtle Aesthetic Accents */}
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
             <CheckBadgeIcon size={250} />
          </div>

          {/* Identity Header */}
          <div className="bg-[#1e293b] px-10 py-10 md:py-12 text-white flex flex-col md:flex-row justify-between items-center gap-8 print:py-6 print:px-8">
             <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-2xl p-2 border border-white/10 print:w-12 print:h-12 shadow-sm">
                   <img 
                    src={homeConfig?.headerLogo || "/logo1.png"} 
                    alt="Logo" 
                    className="w-full h-full object-contain" 
                    onError={(e) => { e.target.src = "https://cdn-icons-png.flaticon.com/512/825/825590.png"; }}
                   />
                </div>
                <div>
                   <h2 className="text-xl font-black tracking-tight print:text-lg">{settings.name || 'ETHIOCRAFT GLOBAL'}</h2>
                   <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] print:text-[8px]">{t('Official Order Receipt')}</p>
                </div>
             </div>
             <div className="text-center md:text-right">
                <div className="bg-green-500/10 text-green-400 border border-green-500/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 inline-block print:hidden">
                   Payment Approved
                </div>
                <p className="text-2xl font-black block tracking-tighter print:text-xl">ORDER #{order.orderNumber}</p>
                <p className="text-gray-400 text-xs font-medium print:text-[10px]">{new Date(order.createdAt).toLocaleString()}</p>
             </div>
          </div>

          {/* Shipping & Payment Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-b border-gray-100">
             <div className="p-10 border-r border-gray-100 print:p-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 print:mb-2">Shipping Destination</h4>
                <div className="space-y-1">
                   <p className="font-bold text-gray-900 text-lg print:text-base">{order.shippingAddress?.fullName?.toUpperCase() || 'VALUED CUSTOMER'}</p>
                   <p className="text-gray-600 text-sm print:text-xs">{order.shippingAddress?.addressLine1}</p>
                   <p className="text-gray-600 text-sm print:text-xs">{order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
                   <p className="text-gray-600 text-sm font-medium print:text-xs">{order.shippingAddress?.phone}</p>
                </div>
             </div>
             <div className="p-10 border-r border-gray-100 bg-gray-50/30 print:p-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 print:mb-2">Transaction Details</h4>
                <div className="flex items-center gap-4 mb-3 print:gap-2 print:mb-2">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm print:w-8 print:h-8">
                      <CreditCardIcon className="w-5 h-5 text-ethiopian-gold print:w-4 print:h-4" />
                   </div>
                   <div>
                      <p className="text-xs text-gray-400 font-bold uppercase print:text-[8px]">Method</p>
                      <p className="text-sm font-bold text-gray-900 uppercase print:text-[10px]">{order.payment?.method || 'CASH ON DELIVERY'}</p>
                   </div>
                </div>
                <div className="flex items-center gap-4 print:gap-2">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm print:w-8 print:h-8">
                      <ClockIcon className="w-5 h-5 text-ethiopian-gold print:w-4 print:h-4" />
                   </div>
                   <div>
                      <p className="text-xs text-gray-400 font-bold uppercase print:text-[8px]">Delivery Window</p>
                      <p className="text-sm font-bold text-gray-900 uppercase print:text-[10px]">Within 7-14 Days</p>
                   </div>
                </div>
             </div>
             <div className="p-10 flex flex-col justify-center bg-gray-50/50 print:p-6">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center md:text-left print:text-[8px]">Final Total Charged</h4>
                <p className="text-4xl font-black text-gray-900 tracking-tighter text-center md:text-left print:text-2xl">
                   {formatCurrency(order.totals?.total)}
                </p>
                <div className="mt-2 flex items-center justify-center md:justify-start gap-2 text-[10px] font-bold text-gray-400 uppercase print:text-[8px]">
                   <div className="w-2 h-2 rounded-full bg-green-500"></div>
                   Verified Transaction
                </div>
             </div>
          </div>

          {/* Items Explorer */}
          <div className="p-10 print:p-6">
             <table className="w-full">
                <thead>
                   <tr className="border-b-2 border-gray-100">
                      <th className="pb-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest print:pb-3 print:text-[8px]">{t('Purchased Items')}</th>
                      <th className="pb-6 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest w-24 print:pb-3 print:text-[8px]">Unit Price</th>
                      <th className="pb-6 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest w-24 print:pb-3 print:text-[8px]">Qty</th>
                      <th className="pb-6 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest w-32 print:pb-3 print:text-[8px]">{t('Line Total')}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {(order.items || []).map((item, idx) => (
                      <tr key={idx} className="group">
                         <td className="py-8 print:py-4">
                            <div className="flex items-center gap-6 print:gap-3">
                               <div className="w-20 h-20 bg-gray-50 rounded-[1.5rem] border border-gray-100 p-2 overflow-hidden flex-shrink-0 transition-transform group-hover:scale-105 print:w-12 print:h-12 print:rounded-lg">
                                  {item.product?.images?.[0]?.url ? (
                                    <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover rounded-xl print:rounded-md" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                                       <ArchiveBoxIcon className="w-8 h-8 print:w-4 print:h-4" />
                                    </div>
                                  )}
                               </div>
                               <div>
                                  <p className="text-lg font-black text-gray-900 tracking-tight leading-tight mb-1 print:text-sm">{item.product?.name || 'Handcrafted Masterpiece'}</p>
                                  <div className="flex items-center gap-3 print:gap-1">
                                     {item.size && <span className="text-[10px] font-black text-gray-400 uppercase border border-gray-200 px-2 py-0.5 rounded-md print:text-[8px]">Size: {item.size}</span>}
                                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest print:text-[8px]">SKU: {item.product?.sku || 'EC-ARTISAN'}</span>
                                  </div>
                               </div>
                            </div>
                         </td>
                         <td className="text-center font-bold text-gray-600 text-sm print:text-xs">{formatCurrency(item.price)}</td>
                         <td className="text-center">
                            <span className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto text-sm font-black text-gray-900 print:w-6 print:h-6 print:text-xs">
                               {item.quantity}
                            </span>
                         </td>
                         <td className="text-right text-lg font-black text-gray-900 tracking-tight print:text-base">{formatCurrency(item.price * item.quantity)}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>

          {/* Detailed Financial Calculation */}
          <div className="bg-gray-50/50 p-10 border-t border-gray-100 print:p-6">
             <div className="max-w-xs ml-auto space-y-4 print:space-y-2">
                <div className="flex justify-between items-center text-sm print:text-xs">
                   <span className="text-gray-500 font-medium">Subtotal</span>
                   <span className="text-gray-900 font-bold">{formatCurrency(order.totals?.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm print:text-xs">
                   <span className="text-gray-500 font-medium text-xs uppercase tracking-widest print:text-[8px]">Shipping</span>
                   <span className="text-gray-900 font-bold">{formatCurrency(order.totals?.shipping)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pb-4 border-b border-gray-200 print:pb-2 print:text-xs">
                   <span className="text-gray-500 font-medium">VAT (15%)</span>
                   <span className="text-gray-900 font-bold">{formatCurrency(order.totals?.tax)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                   <span className="text-lg font-black text-[#1e293b] uppercase tracking-tighter print:text-base">Grand Total</span>
                   <span className="text-2xl font-black text-gray-900 tracking-tighter print:text-xl">
                      {formatCurrency(order.totals?.total)}
                   </span>
                </div>
             </div>
          </div>

          {/* Cultural Footer Notes */}
          <div className="px-10 py-12 flex flex-col md:flex-row justify-between items-center gap-8 bg-white text-center md:text-left print:hidden">
             <div className="flex-1">
                <p className="text-sm font-black text-gray-900 mb-2 leading-tight uppercase tracking-tight">Support Authentic Craftsmanship</p>
                <p className="text-gray-500 text-xs leading-relaxed max-w-sm mx-auto md:mx-0">
                  Your purchase directly empowers local Ethiopian artisans and helps preserve traditional weaving, pottery, and jewelry techniques for generations to come.
                </p>
             </div>
             <div className="shrink-0 space-y-2">
                <div className="flex items-center justify-center md:justify-end gap-2">
                   <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <TruckIcon className="w-4 h-4 text-gray-400" />
                   </div>
                   <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <CreditCardIcon className="w-4 h-4 text-gray-400" />
                   </div>
                   <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <CheckBadgeIcon className="w-4 h-4 text-gray-400" />
                   </div>
                </div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest text-center md:text-right">Tracked & Insured Globally</p>
             </div>
          </div>
        </div>

        {/* Post-Purchase Actions */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 print:hidden">
          <Link
            to="/products"
            className="w-full sm:w-auto px-10 py-4 bg-gray-900 text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-2xl shadow-gray-900/20 text-center"
          >
            Explore More Treasures
          </Link>
          <Link
            to="/orders/track"
            className="w-full sm:w-auto px-10 py-4 bg-white border-2 border-gray-900 text-gray-900 text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all text-center"
          >
            Track My Order
          </Link>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            font-size: 11px !important;
          }
          .min-h-screen {
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .max-w-4xl {
            max-width: 100% !important;
            margin: 0 !important;
          }
          .shadow-xl, .shadow-md, .shadow-sm, .shadow-2xl {
            box-shadow: none !important;
            border: 1px solid #eee !important;
          }
          .rounded-[2.5rem], .rounded-3xl, .rounded-2xl {
             border-radius: 4px !important;
          }
          /* Compact Header */
          .bg-\[\#1e293b\], .bg-slate-900 {
             background-color: #1e293b !important;
             color: white !important;
             padding: 15px 25px !important;
          }
          .w-16.h-16 {
            width: 40px !important;
            height: 40px !important;
          }
          /* Remove large spacing */
          .p-10, .p-8 {
            padding: 12px !important;
          }
          .gap-8, .gap-6 {
            gap: 10px !important;
          }
          .mb-12, .mb-10, .mb-8 {
            margin-bottom: 8px !important;
          }
          .mt-12, .mt-10, .mt-8 {
            margin-top: 8px !important;
          }
          /* Table compacting */
          table th, table td {
            padding: 6px 10px !important;
          }
          .text-2xl { font-size: 16px !important; }
          .text-xl { font-size: 14px !important; }
          .text-lg { font-size: 12px !important; }
          
          .print\\:hidden, .no-print {
            display: none !important;
          }
          tr, div, section {
            page-break-inside: avoid !important;
          }
          .absolute { display: none !important; }
        }
        @page {
          size: A4;
          margin: 5mm;
        }
      `}} />
    </div>
  );
};

export default OrderSuccess;