import React, { useState } from 'react';
import { X, UploadCloud, CreditCard, ClipboardList, CheckCircle } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const CommissionPayoutModal = ({ artisan, onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: artisan.unpaidCommission || 0,
    paymentMethod: 'Bank Transfer',
    notes: ''
  });
  const [imageFile, setImageFile] = useState(null);

  const steps = [
    { label: 'Order Placed', status: 'completed' },
    { label: 'Commission Owed', status: 'completed' },
    { label: 'Payout Requested', status: 'current' },
    { label: 'Admin Confirmed', status: 'pending' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) return toast.error('Amount must be greater than 0');

    try {
      setLoading(true);
      const data = new FormData();
      data.append('artisanId', artisan._id);
      data.append('amount', formData.amount);
      data.append('paymentMethod', formData.paymentMethod);
      data.append('notes', formData.notes);
      if (imageFile) {
        data.append('receiptImage', imageFile);
      }

      await api.post('/admin/commission/payout', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Payout Request submitted for Admin Approval!');
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit payout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-2">
              <CreditCard className="w-6 h-6" /> Submit Payout Log
            </h2>
            <p className="text-orange-100 mt-1 opacity-90 text-sm">
              Record a received commission payment for {artisan.profile?.firstName} {artisan.profile?.lastName}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10 rounded-full"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[60%] h-1 bg-orange-500 -z-10 rounded-full"></div>
            
            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 bg-white px-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors ${step.status === 'completed' ? 'bg-orange-500 text-white' : step.status === 'current' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-gray-200 text-gray-400'}`}>
                  {step.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-800'}`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Outstanding Debt</label>
              <div className="relative">
                <input type="text" value={`${Number(artisan.unpaidCommission || 0).toFixed(2)} ETB`} readOnly className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 font-bold focus:outline-none" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Amount Being Paid</label>
              <div className="relative">
                <input type="number" step="0.01" min="0" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none shadow-sm" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">ETB</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Method</label>
            <select required value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-semibold focus:ring-2 focus:ring-orange-500 hover:border-orange-300 transition-all outline-none shadow-sm">
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Wallet">Wallet / Telebirr</option>
              <option value="Cash to Admin">Cash to Admin</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" /> Notes</label>
              <textarea placeholder="e.g. Paid via CBE to Admin account..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-600 text-sm h-32 resize-none focus:ring-2 focus:ring-orange-500 outline-none shadow-sm"></textarea>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1"><UploadCloud className="w-3.5 h-3.5" /> Receipt Screenshot</label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-orange-300 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {imageFile ? (
                    <p className="text-sm font-semibold text-orange-600">{imageFile.name}</p>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-gray-300 group-hover:text-orange-400 mb-2 transition-colors" />
                      <p className="text-xs text-gray-500 font-medium">Click to upload receipt (Optional)</p>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={e => setImageFile(e.target.files[0])} />
              </label>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-4 bg-gray-900 hover:bg-black text-white rounded-xl py-4 font-bold tracking-wide transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Submitting Request...' : 'Submit Payout Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommissionPayoutModal;
