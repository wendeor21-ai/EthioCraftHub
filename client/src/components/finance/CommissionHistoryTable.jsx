import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { getFileUrl } from '../../utils/getFileUrl';
import LoadingSpinner from '../common/LoadingSpinner';
import { Clock, CheckCircle2, XCircle, Receipt, ExternalLink } from 'lucide-react';

const CommissionHistoryTable = ({ refreshKey }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [refreshKey]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/earnings/commission-history');
      setHistory(response.data.data || []);
    } catch (error) {
      console.error('Error fetching commission history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statuses = {
      'Pending Admin Approval': {
        color: 'bg-blue-100 text-blue-800',
        icon: Clock,
        label: 'Pending Approval'
      },
      'Confirmed': {
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle2,
        label: 'Confirmed'
      },
      'Approved': {
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle2,
        label: 'Approved'
      },
      'Rejected': {
        color: 'bg-red-100 text-red-800',
        icon: XCircle,
        label: 'Rejected'
      }
    };

    const config = statuses[status] || { color: 'bg-gray-100 text-gray-800', icon: Clock, label: status };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  if (loading) return <div className="p-8 text-center"><LoadingSpinner /></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Commission Payment History</h2>
          <p className="text-sm text-gray-500 mt-1">Track your submitted platform fee proofs and their status</p>
        </div>
        <Receipt className="w-6 h-6 text-orange-500" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date Submitted</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount Paid</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Method</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {history.map((record) => (
              <tr key={record._id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(record.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-bold text-gray-900">{record.amount.toFixed(2)} ETB</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.paymentMethod}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(record.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {record.receiptImage ? (
                    <a 
                      href={getFileUrl(record.receiptImage)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      View Proof <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">No Image</span>
                  )}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">
                  No commission payment history found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CommissionHistoryTable;
