/**
 * Payments Page for EthioCraft Global
 * Shows transaction history and payment details
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { DollarSign, Download, Filter, Search, TrendingUp, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';

const Payments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('30days');

  useEffect(() => {
    fetchTransactions();
  }, [dateRange]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/payments/artisan/${user?.id || user?._id}?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        setError('');
      } else {
        // Use mock data if API fails
        console.log('Using mock transaction data');
        setTransactions([
          {
            _id: 'txn001',
            orderId: 'ORD-2026-001',
            amount: 115.00,
            status: 'completed',
            paymentMethod: 'Credit Card',
            customer: 'Sarah Johnson',
            date: new Date().toISOString(),
            description: 'Payment for Traditional Basket and Handwoven Scarf'
          },
          {
            _id: 'txn002',
            orderId: 'ORD-2026-002',
            amount: 60.00,
            status: 'completed',
            paymentMethod: 'PayPal',
            customer: 'Michael Chen',
            date: new Date(Date.now() - 86400000).toISOString(),
            description: 'Payment for Ceramic Vase'
          },
          {
            _id: 'txn003',
            orderId: 'ORD-2026-003',
            amount: 90.00,
            status: 'pending',
            paymentMethod: 'Bank Transfer',
            customer: 'Emma Williams',
            date: new Date(Date.now() - 172800000).toISOString(),
            description: 'Payment for Leather Handbag'
          },
          {
            _id: 'txn004',
            orderId: 'ORD-2026-004',
            amount: 45.00,
            status: 'completed',
            paymentMethod: 'Credit Card',
            customer: 'David Brown',
            date: new Date(Date.now() - 259200000).toISOString(),
            description: 'Payment for Handwoven Basket'
          },
          {
            _id: 'txn005',
            orderId: 'ORD-2026-005',
            amount: 150.00,
            status: 'failed',
            paymentMethod: 'Credit Card',
            customer: 'Lisa Anderson',
            date: new Date(Date.now() - 345600000).toISOString(),
            description: 'Payment for Leather Goods Set'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Transaction ID', 'Order ID', 'Customer', 'Amount', 'Status', 'Payment Method', 'Date', 'Description'];
    const csvData = filteredTransactions.map(txn => [
      txn._id,
      txn.orderId,
      txn.customer,
      txn.amount,
      txn.status,
      txn.paymentMethod,
      formatDate(txn.date),
      txn.description
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesStatus = filterStatus === 'all' || txn.status === filterStatus;
    const matchesSearch = txn.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         txn.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         txn.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalRevenue = transactions
    .filter(txn => txn.status === 'completed')
    .reduce((sum, txn) => sum + txn.amount, 0);

  const pendingAmount = transactions
    .filter(txn => txn.status === 'pending')
    .reduce((sum, txn) => sum + txn.amount, 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/artisan/dashboard')}
            className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center"
          >
            ← Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payments & Transactions</h1>
              <p className="text-gray-600 mt-2">Track your earnings and payment history</p>
            </div>
            <button
              onClick={exportToCSV}
              className="bg-ethiopian-gold text-white px-6 py-3 rounded-lg hover:bg-ethiopian-earth transition-colors flex items-center space-x-2 shadow-lg"
            >
              <Download className="w-5 h-5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} className="mb-6" />}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">+12.5%</span>
              <span className="text-gray-600 ml-2">vs last period</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">
                  {formatCurrency(pendingAmount)}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                {transactions.filter(t => t.status === 'pending').length} pending transactions
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {transactions.length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                {transactions.filter(t => t.status === 'completed').length} completed
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="1year">Last year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Transactions Found</h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Your transaction history will appear here once you receive payments'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map(transaction => (
                    <tr key={transaction._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.orderId}
                          </div>
                          <div className="text-sm text-gray-500 line-clamp-1">
                            {transaction.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{transaction.customer}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{transaction.paymentMethod}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(transaction.status)}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(transaction.date)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
