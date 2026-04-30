import React, { useState } from 'react';
import { 
  X, 
  Ruler, 
  User, 
  Calendar, 
  Camera, 
  CheckCircle, 
  XCircle,
  Download,
  Scissors
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { getFileUrl } from '../../utils/getFileUrl';

const CustomOrderDetailModal = ({ order, onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(order.price || '');
  const [rejectionReason, setRejectionReason] = useState('');

  if (!order) return null;

  const handleStatusUpdate = async (status) => {
    let finalStatus = status;
    if (status === 'accepted' && !price) {
      toast.error('Please set a price before accepting');
      return;
    }
    if (status === 'accepted') finalStatus = 'price_quoted';
    
    if (status === 'rejected' && !rejectionReason) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/custom-orders/${order._id}/status`, {
        status: finalStatus,
        price: status === 'accepted' ? price : undefined,
        rejectionReason: status === 'rejected' ? rejectionReason : undefined
      });
      toast.success(`Order status updated successfully`);
      onRefresh();
      onClose();
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Scissors className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Custom Design Request</h2>
              <p className="text-amber-100 text-xs font-medium">#{order._id.slice(-8).toUpperCase()} • Received {new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Left: Customer & Measurements */}
            <div className="space-y-8">
              <section>
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Details
                </h3>
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <p className="text-lg font-bold text-gray-900">{order.customer?.profile?.firstName} {order.customer?.profile?.lastName}</p>
                  <p className="text-sm text-gray-500">{order.customer?.email}</p>
                  <div className="mt-4 flex gap-2">
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase">{order.gender}</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-[10px] font-black uppercase">{order.itemType}</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Body Measurements (CM)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(order.measurements || {}).map(([key, val]) => (
                    val && (
                      <div key={key} className="bg-white border border-gray-100 rounded-xl p-4 flex justify-between items-center shadow-sm">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="text-sm font-black text-amber-600">{val} cm</span>
                      </div>
                    )
                  ))}
                </div>
              </section>

              {order.description && (
                <section>
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Instructions</h3>
                  <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 italic text-amber-900 text-sm">
                    "{order.description}"
                  </div>
                </section>
              )}
            </div>

            {/* Right: Photos & Actions */}
            <div className="space-y-8">
              <section>
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Reference Photos
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {['front', 'back'].map(type => (
                    <div key={type} className="group relative aspect-[4/5] bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
                      {order.photos?.[type] ? (
                        <>
                          <img 
                            src={getFileUrl(order.photos[type])} 
                            alt={type} 
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                          />
                          <a 
                            href={getFileUrl(order.photos[type])} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="text-white w-8 h-8" />
                          </a>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] font-black uppercase">
                          No {type} Photo
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {order.status === 'pending' ? (
                <section className="bg-gray-50 rounded-3xl p-6 border border-gray-200 space-y-6">
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">Set Custom Price (ETB)</label>
                    <input 
                      type="number" 
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Enter total price for this design..."
                      className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 font-bold"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleStatusUpdate('accepted')}
                      disabled={loading}
                      className="flex-1 bg-gray-900 text-white p-4 rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Accept Order
                    </button>
                    <button 
                      onClick={() => {
                        const reason = window.prompt("Reason for rejection:");
                        if (reason) {
                          setRejectionReason(reason);
                          handleStatusUpdate('rejected');
                        }
                      }}
                      disabled={loading}
                      className="px-4 py-4 bg-white border border-gray-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </section>
              ) : (
                <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 text-center">
                  <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">Status</p>
                  <p className="text-2xl font-black text-amber-900 capitalize">{order.status}</p>
                  {order.price && <p className="text-lg font-bold text-amber-700 mt-2">Price: {order.price} ETB</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomOrderDetailModal;
