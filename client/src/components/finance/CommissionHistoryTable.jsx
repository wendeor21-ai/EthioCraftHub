/**
 * Commission Payment History Table Component
 * Displays submitted platform fee proofs with filter, sort, pagination and mobile-friendly compact design
 */

import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { getFileUrl } from '../../utils/getFileUrl';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Receipt, 
  ExternalLink,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';

const CommissionHistoryTable = ({ refreshKey }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  // Pagination State - 25 default
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Preview Modal
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [refreshKey]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/earnings/commission-history');
      setHistory(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching commission history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract distinct payment methods from data
  const paymentMethods = useMemo(() => {
    const set = new Set();
    history.forEach(item => {
      if (item.paymentMethod) set.add(item.paymentMethod);
    });
    return Array.from(set);
  }, [history]);

  // Filter & Sort processed data
  const processedData = useMemo(() => {
    let result = [...history];

    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(item => {
        const s = (item.status || '').toLowerCase();
        if (statusFilter === 'pending') return s.includes('pending');
        if (statusFilter === 'confirmed') return s.includes('confirm') || s.includes('approv');
        if (statusFilter === 'rejected') return s.includes('reject');
        return s === statusFilter.toLowerCase();
      });
    }

    // Method Filter
    if (methodFilter !== 'all') {
      result = result.filter(item => item.paymentMethod === methodFilter);
    }

    // Search Term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        (item.paymentMethod || '').toLowerCase().includes(term) ||
        (item.notes || '').toLowerCase().includes(term) ||
        (item.status || '').toLowerCase().includes(term) ||
        (item.amount || '').toString().includes(term)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'date-asc') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'amount-desc') return (b.amount || 0) - (a.amount || 0);
      if (sortBy === 'amount-asc') return (a.amount || 0) - (b.amount || 0);
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
      return 0;
    });

    return result;
  }, [history, statusFilter, methodFilter, searchTerm, sortBy]);

  // Pagination slice
  const totalCount = processedData.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * limit;
    return processedData.slice(start, start + limit);
  }, [processedData, page, limit]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, methodFilter, searchTerm, sortBy, limit]);

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('pending')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-2.5 h-2.5" />
          Pending Approval
        </span>
      );
    }
    if (s.includes('confirm') || s.includes('approv')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-2.5 h-2.5" />
          Confirmed
        </span>
      );
    }
    if (s.includes('reject')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-2.5 h-2.5" />
          Rejected
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-50 text-gray-700 border border-gray-200">
        <Clock className="w-2.5 h-2.5" />
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-2xs border border-gray-100 overflow-hidden mt-4 sm:mt-6">
      {/* Header & Controls */}
      <div className="p-3 sm:p-4 border-b border-gray-100">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">Commission Payment History</h2>
            <p className="text-[11px] text-gray-400">Track and verify your platform fee settlement proofs</p>
          </div>
          <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
        </div>

        {/* Filter and Sort Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search amount, method..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Approval</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all">All Methods</option>
            {paymentMethods.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1 bg-gray-50/80 px-2 py-1 rounded-lg border border-gray-200">
            <ArrowUpDown className="w-3 h-3 text-gray-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
              <option value="status">Status</option>
            </select>
          </div>

          {/* Rows Per Page */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50/80 px-2.5 py-1 rounded-lg border border-gray-200">
            <span className="text-[11px] font-semibold text-gray-600">Rows:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <LoadingSpinner size="small" />
        </div>
      ) : paginatedData.length === 0 ? (
        <div className="text-center py-10 px-4">
          <p className="text-xs text-gray-400 italic">No commission payment records found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Date Submitted
                </th>
                <th className="px-3 py-2 text-left text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Amount Paid
                </th>
                <th className="px-3 py-2 text-left text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-3 py-2 text-left text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-2 text-right text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Receipt Proof
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {paginatedData.map((record) => (
                <tr key={record._id} className="hover:bg-amber-50/30 transition-colors">
                  {/* Date */}
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                    {new Date(record.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>

                  {/* Amount Paid */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-xs font-bold text-gray-900">
                      {(record.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                    </span>
                  </td>

                  {/* Method */}
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100/80 font-medium text-[11px] text-gray-700 capitalize">
                      {record.paymentMethod || 'Manual'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {getStatusBadge(record.status)}
                  </td>

                  {/* Receipt Proof View */}
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    {record.receiptImage ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(getFileUrl(record.receiptImage))}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors active:scale-95"
                          title="Quick preview"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        <a 
                          href={getFileUrl(record.receiptImage)} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Open original file"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">No receipt</span>
                    )}
                  </td>
                </tr>
              ))}
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
          <span> records</span>
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-4 border border-gray-200 relative animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900">Commission Payment Proof</h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-gray-50 rounded-lg p-2">
              <img 
                src={previewImage} 
                alt="Payment receipt proof" 
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-xs" 
              />
            </div>
            <div className="mt-3 flex justify-end">
              <a
                href={previewImage}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <span>Open Full Size</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionHistoryTable;
