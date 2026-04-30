/**
 * Transactions Table Component
 * Displays transaction history with filtering and sorting
 */

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  ArrowUpIcon, 
  ArrowDownIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

const TransactionsTable = ({ refreshKey }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, [filter, statusFilter, refreshKey]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('type', filter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await api.get(`/earnings/transactions?${params.toString()}`);
      setTransactions(response.data.data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (transaction) => {
    if (transaction.transactionType === 'withdrawal') {
      const status = transaction.withdrawalStatus;
      const colors = {
        completed: 'bg-green-100 text-green-800',
        processing: 'bg-yellow-100 text-yellow-800',
        pending: 'bg-blue-100 text-blue-800',
        failed: 'bg-red-100 text-red-800',
        cancelled: 'bg-gray-100 text-gray-800',
      };
      return (
        <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
          {status?.charAt(0).toUpperCase() + status?.slice(1)}
        </span>
      );
    }
    
    const status = transaction.status;
    const colors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 md:mb-0">Transaction History</h2>
          
          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="sale">Sales</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="refund">Refunds</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        {transaction.transactionType === 'sale' ? (
                          <ArrowDownIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowUpIcon className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm text-gray-900 capitalize">
                          {transaction.transactionType}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.description || 'N/A'}
                      {transaction.productId && (
                        <div className="text-xs text-gray-500 mt-1">
                          {transaction.productId.name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        transaction.netAmount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.netAmount >= 0 ? '+' : ''}
                        {transaction.netAmount.toFixed(2)} ETB
                      </span>
                      {transaction.platformFee > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Fee: {transaction.platformFee.toFixed(2)} ETB
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsTable;
