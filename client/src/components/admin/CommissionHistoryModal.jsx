import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Filter, DollarSign } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner';

const CommissionHistoryModal = ({ artisanId, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'month', 'week', 'custom'
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (artisanId) fetchHistory();
  }, [artisanId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/commission/history/${artisanId}`);
      if (res.data?.success) setHistory(res.data.history || []);
    } catch (err) {
      toast.error('Failed to load commission history');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    const now = new Date();
    return history.filter(item => {
      const date = new Date(item.date);
      if (filter === 'month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      if (filter === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        return date >= weekAgo;
      }
      if (filter === 'custom' && dateRange.start && dateRange.end) {
        return date >= new Date(dateRange.start) && date <= new Date(dateRange.end);
      }
      return true; // 'all'
    });
  }, [history, filter, dateRange]);

  const totalOwed = useMemo(() => filteredHistory.reduce((sum, item) => sum + item.commissionOwed, 0), [filteredHistory]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              Commission Transaction History
            </h2>
            <p className="text-sm text-gray-500 mt-1">Review all manual and COD orders for this artisan.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 shrink-0 flex flex-wrap gap-4 items-center">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {['all', 'month', 'week', 'custom'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all capitalize ${filter === f ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {f === 'all' ? 'All-Time' : f === 'month' ? 'This Month' : f === 'week' ? 'This Week' : 'Custom'}
              </button>
            ))}
          </div>

          {filter === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" className="border rounded-lg px-3 py-1.5 text-sm" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
              <span className="text-gray-400 text-sm">to</span>
              <input type="date" className="border rounded-lg px-3 py-1.5 text-sm" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-20 text-center"><LoadingSpinner /></div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Filter className="w-12 h-12 opacity-20 mx-auto mb-4" />
              <p className="font-semibold text-gray-600">No transactions found</p>
              <p className="text-sm">Try adjusting your date filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Total Amount</th>
                  <th className="pb-3 text-center">Payment Method</th>
                  <th className="pb-3 text-right">Commission (10%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredHistory.map((item, idx) => (
                  <tr key={item._id || idx} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-4 text-sm font-semibold text-gray-900">#{item.orderId}</td>
                    <td className="py-4 text-sm text-gray-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 opacity-50" />
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-sm font-medium text-gray-900 text-right">{item.totalAmount?.toFixed(2)} ETB</td>
                    <td className="py-4 text-center">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold uppercase">{item.paymentMethod}</span>
                    </td>
                    <td className="py-4 text-sm font-black text-amber-600 text-right">
                      {item.commissionOwed?.toFixed(2)} ETB
                      <div className={`text-[10px] uppercase font-bold mt-1 ${item.commissionStatus === 'Paid' ? 'text-green-500' : 'text-gray-400'}`}>
                        {item.commissionStatus === 'Paid' ? 'Settled' : 'Pending'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Summary */}
        <div className="p-6 bg-gray-900 rounded-b-2xl border-t border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-gray-400 text-sm font-semibold">Dynamic Summary</p>
            <p className="text-white text-xs opacity-70">Total un-filtered calculations</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-white">{totalOwed.toFixed(2)} ETB</p>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">Total Platform Fee</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionHistoryModal;
