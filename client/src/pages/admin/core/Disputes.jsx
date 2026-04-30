import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const Disputes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);

  useEffect(()=>{ fetchCases(); }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/disputes');
      setCases(res.data.cases || []);
    } catch (err) { console.error('fetch disputes', err); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.post(`/admin/disputes/${id}/status`, { status });
      setCases(prev => prev.map(c => c._id === id ? { ...c, status } : c));
    } catch (err) { console.error('update status', err); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <button onClick={() => navigate('/admin/dashboard')} className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center">← Back to Dashboard</button>
        <h1 className="text-2xl font-bold mb-2">Disputes & Refunds</h1>
        <p className="text-gray-600 mb-4">Manage order disputes, refunds and resolution tracking.</p>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center"><LoadingSpinner size="large" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cases.map(c => (
                    <tr key={c._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(c.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{c.orderId}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{c.customerEmail || c.userEmail}</td>
                      <td className="px-6 py-4 text-sm text-gray-800 max-w-xs truncate">{c.reason}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${c.status==='open'?'bg-yellow-100 text-yellow-800': c.status==='resolved'?'bg-green-100 text-green-800':'bg-gray-100 text-gray-800'}`}>{c.status}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium flex gap-2">
                        <button onClick={()=> updateStatus(c._id, 'in_review')} className="px-2 py-1 bg-white border rounded text-sm">Mark In Review</button>
                        <button onClick={()=> updateStatus(c._id, 'resolved')} className="px-2 py-1 bg-green-600 text-white rounded text-sm">Resolve</button>
                        <button onClick={()=> updateStatus(c._id, 'refund_processed')} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Process Refund</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Disputes;
