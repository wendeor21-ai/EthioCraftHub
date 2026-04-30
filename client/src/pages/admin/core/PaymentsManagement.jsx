import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, DollarSign, ExternalLink, RefreshCw } from 'lucide-react';

const PaymentsManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => { fetchTransactions(); }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/payments');
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this manual payment?')) return;
    try {
      await api.put(`/orders/${id}/approve-payment`);
      toast.success('Payment approved');
      fetchTransactions();
    } catch (err) {
      toast.error('Failed to approve payment');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      await api.put(`/orders/${id}/reject-payment`, { reason });
      toast.success('Payment rejected');
      fetchTransactions();
    } catch (err) {
      toast.error('Failed to reject payment');
    }
  };

  const handleCodPaid = async (id) => {
    if (!window.confirm('Mark this COD order as paid?')) return;
    try {
      await api.put(`/orders/${id}/mark-cod-paid`);
      toast.success('COD marked as Paid');
      fetchTransactions();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handlePayArtisan = async (id) => {
    if (!window.confirm('Process payout for this order?')) return;
    try {
      await api.put(`/orders/${id}/pay-artisan`);
      toast.success('Artisan paid successfully');
      fetchTransactions();
    } catch (err) {
      toast.error('Failed to process payout');
    }
  };

  const handleMarkCommissionPaid = async (id) => {
    if (!window.confirm('Mark platform commission as Paid?')) return;
    try {
      await api.put(`/orders/${id}/mark-commission-paid`);
      toast.success('Commission status updated');
      fetchTransactions();
    } catch (err) {
      toast.error('Failed to update commission');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <button onClick={() => navigate('/admin/dashboard')} className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center">← Back to Dashboard</button>
        <h1 className="text-2xl font-bold mb-2">Payments & Transactions</h1>
        <p className="text-gray-600 mb-4">Monitor transactions and detect failures in real-time.</p>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center"><LoadingSpinner size="large" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total / Comm</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method & Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map(tx => (
                    <tr key={tx._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        #{tx.orderNumber || tx._id.slice(-8)}
                        <p className="text-[10px] text-gray-400 font-normal">{new Date(tx.createdAt).toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {tx.customer?.profile?.firstName} {tx.customer?.profile?.lastName}
                        <p className="text-[10px]">{tx.customer?.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-bold text-gray-900">{tx.amount?.toFixed(2)} ETB</div>
                        <div className="text-[11px] text-amber-600">Fee: {tx.commission?.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-bold text-gray-500">{tx.method}</span>
                          <span className={`px-2 py-0.5 text-[10px] rounded-full inline-block w-fit ${
                            tx.status === 'Paid' ? 'bg-green-100 text-green-800' :
                            tx.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {tx.status}
                          </span>
                          {tx.receiptUrl && (
                            <a href={tx.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> View Receipt
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-0.5 text-[10px] rounded-full inline-block ${
                            tx.payoutStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                            tx.payoutStatus === 'Ready' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            Artisan: {tx.payoutStatus || 'Pending'}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] rounded-full inline-block ${
                            tx.commissionStatus === 'Paid' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            Platform: {tx.commissionStatus || 'Pending'}
                          </span>
                        </div>
                        {tx.payoutStatus === 'Ready' && (
                          <p className="text-[10px] text-blue-600 mt-1 font-medium">Earn: {tx.earning?.toFixed(2)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex flex-col gap-2">
                          {/* Manual Payment Actions */}
                          {tx.method === 'MANUAL' && tx.status === 'Pending' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleApprove(tx._id)} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 title='Approve'">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleReject(tx._id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Reject">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* COD Actions */}
                          {tx.method === 'COD' && tx.status === 'Unpaid' && (
                            <button onClick={() => handleCodPaid(tx._id)} className="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] rounded border border-amber-200 hover:bg-amber-100 flex items-center gap-1">
                              <DollarSign className="w-3 h-3" /> Mark Paid
                            </button>
                          )}

                          {tx.payoutStatus === 'Ready' && (
                            <button onClick={() => handlePayArtisan(tx._id)} className="px-2 py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700 flex items-center justify-center gap-1 shadow-sm">
                              <RefreshCw className="w-3 h-3" /> Pay Artisan
                            </button>
                          )}

                          {tx.commissionStatus !== 'Paid' && tx.status === 'Paid' && (
                            <button onClick={() => handleMarkCommissionPaid(tx._id)} className="px-2 py-1 bg-indigo-600 text-white text-[10px] rounded hover:bg-indigo-700 flex items-center justify-center gap-1 shadow-sm">
                              <DollarSign className="w-3 h-3" /> Mark Fee Collected
                            </button>
                          )}

                          <button onClick={() => navigate(`/orders/${tx._id}`)} className="text-gray-400 hover:text-gray-600 text-xs text-left underline">
                            Order Details
                          </button>
                        </div>
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

export default PaymentsManagement;
