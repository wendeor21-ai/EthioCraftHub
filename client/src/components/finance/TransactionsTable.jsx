/**
 * Transactions Table Component
 * Displays transaction history with selection, deletion, pagination (25 default, 50, 100), and filtering
 */

import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

const TransactionsTable = ({ refreshKey, onUpdate }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State - 25 rows by default, options: 25, 50, 100
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selection & Batch Delete State
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState(null);

  useEffect(() => {
    fetchTransactions();
    // Reset selection on page or filter change
    setSelectedIds([]);
  }, [filter, statusFilter, page, limit, refreshKey]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('type', filter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', page);
      params.append('limit', limit);
      
      const response = await api.get(`/earnings/transactions?${params.toString()}`);
      const data = response.data?.data;
      setTransactions(data?.transactions || []);
      if (data?.pagination) {
        setTotalPages(data.pagination.pages || 1);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  // Filter by search term on client side for quick lookup
  const filteredTransactions = useMemo(() => {
    if (!searchTerm.trim()) return transactions;
    const term = searchTerm.toLowerCase();
    return transactions.filter(t => 
      t.description?.toLowerCase().includes(term) ||
      t.productId?.name?.toLowerCase().includes(term) ||
      t.transactionType?.toLowerCase().includes(term) ||
      t.amount?.toString().includes(term)
    );
  }, [transactions, searchTerm]);

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = filteredTransactions.map(t => t._id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllSelected = filteredTransactions.length > 0 && 
    filteredTransactions.every(t => selectedIds.includes(t._id));

  // Deletion logic
  const confirmDeleteSingle = (id) => {
    setSingleDeleteId(id);
    setShowConfirmModal(true);
  };

  const confirmDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setSingleDeleteId(null);
    setShowConfirmModal(true);
  };

  const handleDeleteExecute = async () => {
    setIsDeleting(true);
    try {
      if (singleDeleteId) {
        // Delete single
        await api.delete(`/earnings/transactions/${singleDeleteId}`);
        toast.success('Transaction record deleted successfully');
        setSelectedIds(prev => prev.filter(id => id !== singleDeleteId));
      } else {
        // Batch delete
        const res = await api.post('/earnings/transactions/delete-batch', { ids: selectedIds });
        toast.success(res.data?.message || `Deleted ${selectedIds.length} transactions`);
        setSelectedIds([]);
      }
      setShowConfirmModal(false);
      setSingleDeleteId(null);
      fetchTransactions();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete transaction record');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (transaction) => {
    if (transaction.transactionType === 'withdrawal') {
      const status = transaction.withdrawalStatus || 'pending';
      const styles = {
        completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        processing: 'bg-amber-50 text-amber-700 border-amber-200',
        pending: 'bg-blue-50 text-blue-700 border-blue-200',
        failed: 'bg-red-50 text-red-700 border-red-200',
        cancelled: 'bg-gray-50 text-gray-600 border-gray-200',
      };
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
          {status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5" />}
          {status === 'pending' && <Clock className="w-2.5 h-2.5" />}
          {status === 'failed' && <XCircle className="w-2.5 h-2.5" />}
          <span className="capitalize">{status}</span>
        </span>
      );
    }
    
    const status = transaction.status || 'completed';
    const styles = {
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      failed: 'bg-red-50 text-red-700 border-red-200',
      refunded: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
        {status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5" />}
        {status === 'pending' && <Clock className="w-2.5 h-2.5" />}
        {status === 'failed' && <XCircle className="w-2.5 h-2.5" />}
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-2xs border border-gray-100 overflow-hidden">
      {/* Header & Controls */}
      <div className="p-3 sm:p-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">Transaction History</h2>
            <p className="text-[11px] text-gray-400">View and manage all sales, withdrawals, and fee adjustments</p>
          </div>

          {/* Delete Batch Button */}
          {selectedIds.length > 0 && (
            <button
              onClick={confirmDeleteSelected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95 transition-all self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
        </div>

        {/* Toolbar: Search, Filters, Rows per page */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex-1 min-w-[150px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search description, product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all">All Types</option>
            <option value="sale">Sales</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="refund">Refunds</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>

          {/* Rows Per Page Selector (Default: 25, 50, 100) */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50/80 px-2.5 py-1 rounded-lg border border-gray-200">
            <span className="text-[11px] font-semibold text-gray-600">Rows:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Body / Loading */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="small" />
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-10 px-4">
          <p className="text-xs text-gray-400">No transactions found matching your criteria</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr>
                {/* Select All Checkbox */}
                <th className="w-8 px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-gray-300 cursor-pointer"
                    title="Select all on this page"
                  />
                </th>
                <th className="px-3 py-2 text-left text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 py-2 text-left text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-3 py-2 text-left text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Net Amount
                </th>
                <th className="px-3 py-2 text-left text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="w-12 px-3 py-2 text-right text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {filteredTransactions.map((transaction) => {
                const isSelected = selectedIds.includes(transaction._id);
                return (
                  <tr 
                    key={transaction._id} 
                    className={`hover:bg-amber-50/30 transition-colors ${isSelected ? 'bg-amber-50/50' : ''}`}
                  >
                    {/* Row Checkbox */}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(transaction._id)}
                        className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-gray-300 cursor-pointer"
                      />
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                      {formatDate(transaction.createdAt)}
                    </td>

                    {/* Type with Icon */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold capitalize text-gray-800">
                        {transaction.transactionType === 'sale' ? (
                          <span className="p-1 rounded bg-emerald-50 text-emerald-600">
                            <ArrowDownLeft className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="p-1 rounded bg-rose-50 text-rose-600">
                            <ArrowUpRight className="w-3 h-3" />
                          </span>
                        )}
                        <span>{transaction.transactionType}</span>
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-3 py-2 text-xs text-gray-700 max-w-[240px]">
                      <div className="truncate font-medium">{transaction.description || 'N/A'}</div>
                      {transaction.productId && (
                        <div className="text-[10px] text-gray-400 truncate">
                          {transaction.productId.name}
                        </div>
                      )}
                    </td>

                    {/* Net Amount */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className={`text-xs font-bold ${
                        transaction.netAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {transaction.netAmount >= 0 ? '+' : ''}
                        {(transaction.netAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                      </div>
                      {transaction.platformFee > 0 && (
                        <div className="text-[10px] text-gray-400">
                          Fee: {transaction.platformFee.toFixed(2)} ETB
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {getStatusBadge(transaction)}
                    </td>

                    {/* Action: Delete */}
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => confirmDeleteSingle(transaction._id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors active:scale-90"
                        title="Delete transaction record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="p-3 sm:p-3.5 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
        <div>
          <span>Showing </span>
          <span className="font-bold text-gray-900">
            {totalCount > 0 ? (page - 1) * limit + 1 : 0}
          </span>
          <span> to </span>
          <span className="font-bold text-gray-900">
            {Math.min(page * limit, totalCount)}
          </span>
          <span> of </span>
          <span className="font-bold text-gray-900">{totalCount}</span>
          <span> transactions</span>
        </div>

        {/* Page Nav */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          <span className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900">Confirm Deletion</h3>
                <p className="text-xs text-gray-600 mt-1">
                  {singleDeleteId 
                    ? 'Are you sure you want to delete this transaction record from your history?' 
                    : `Are you sure you want to delete the selected ${selectedIds.length} transaction record(s)?`}
                </p>
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setShowConfirmModal(false);
                      setSingleDeleteId(null);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteExecute}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-2xs active:scale-95 transition-all flex items-center gap-1"
                  >
                    {isDeleting ? <LoadingSpinner size="small" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsTable;
