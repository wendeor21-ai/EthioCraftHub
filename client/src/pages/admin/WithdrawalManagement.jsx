/**
 * Admin Withdrawal Management
 * Process and manage artisan withdrawal requests
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import {
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import WithdrawalActionModal from '../../components/admin/WithdrawalActionModal';
import toast from 'react-hot-toast';

const WithdrawalManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchWithdrawals();
    }
  }, [user, filter]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/withdrawals?status=${filter}`);
      setWithdrawals(response.data.data.withdrawals);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (withdrawalId, newStatus, notes = '') => {
    try {
      setProcessing(true);
      await api.put(`/admin/withdrawals/${withdrawalId}`, {
        status: newStatus,
        notes,
      });
      
      toast.success(`Withdrawal ${newStatus} successfully`);
      fetchWithdrawals();
      setSelectedWithdrawal(null);
      setShowActionModal(false);
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error updating withdrawal:', error);
      toast.error(error.response?.data?.message || 'Failed to update withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (withdrawal, action) => {
    setSelectedWithdrawal(withdrawal);
    setActionType(action);
    setShowActionModal(true);
  };

  const handleActionConfirm = (reason) => {
    if (actionType === 'approve') {
      handleStatusChange(selectedWithdrawal._id, 'processing', 'Approved by admin');
    } else if (actionType === 'reject') {
      handleStatusChange(selectedWithdrawal._id, 'failed', reason);
    }
  };

  const openDetailModal = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const getMethodBadge = (method) => {
    const labels = {
      telebirr: 'Telebirr',
      cbe_birr: 'CBE Birr',
      bank_transfer: 'Bank Transfer',
    };
    return (
      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
        {labels[method] || method}
      </span>
    );
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-ethiopian-gold hover:text-ethiopian-earth mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Withdrawal Management
          </h1>
          <p className="text-gray-600">
            Process and manage artisan withdrawal requests
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-blue-600">
                  {withdrawals.filter(w => w.withdrawalStatus === 'pending').length}
                </p>
              </div>
              <ClockIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {withdrawals.filter(w => w.withdrawalStatus === 'processing').length}
                </p>
              </div>
              <BanknotesIcon className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {withdrawals.filter(w => w.withdrawalStatus === 'completed').length}
                </p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {withdrawals.filter(w => w.withdrawalStatus === 'failed').length}
                </p>
              </div>
              <XCircleIcon className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {['pending', 'processing', 'completed', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    filter === status
                      ? 'border-ethiopian-gold text-ethiopian-gold'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Withdrawals Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="large" />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-12">
              <BanknotesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No {filter} withdrawals found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Artisan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(withdrawal.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserIcon className="w-5 h-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {withdrawal.artisan?.email || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {withdrawal.artisan?.profile?.firstName} {withdrawal.artisan?.profile?.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {Math.abs(withdrawal.netAmount).toFixed(2)} ETB
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getMethodBadge(withdrawal.withdrawalMethod)}
                        <div className="text-xs text-gray-500 mt-1">
                          {withdrawal.withdrawalAccountDetails?.phoneNumber ||
                            withdrawal.withdrawalAccountDetails?.accountNumber ||
                            'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(withdrawal.withdrawalStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openDetailModal(withdrawal)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <EyeIcon className="w-4 h-4" />
                            View
                          </button>
                          {withdrawal.withdrawalStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => openActionModal(withdrawal, 'approve')}
                                className="text-green-600 hover:text-green-900 flex items-center gap-1"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => openActionModal(withdrawal, 'reject')}
                                className="text-red-600 hover:text-red-900 flex items-center gap-1"
                              >
                                <XCircleIcon className="w-4 h-4" />
                                Reject
                              </button>
                            </>
                          )}
                          {withdrawal.withdrawalStatus === 'processing' && (
                            <button
                              onClick={() => handleStatusChange(withdrawal._id, 'completed', 'Payment completed successfully')}
                              disabled={processing}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Withdrawal Details</h3>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                      </label>
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.abs(selectedWithdrawal.netAmount).toFixed(2)} ETB
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      {getStatusBadge(selectedWithdrawal.withdrawalStatus)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Artisan
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedWithdrawal.artisan?.profile?.firstName} {selectedWithdrawal.artisan?.profile?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{selectedWithdrawal.artisan?.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    {getMethodBadge(selectedWithdrawal.withdrawalMethod)}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Details
                    </label>
                    <div className="bg-gray-50 p-3 rounded border">
                      {selectedWithdrawal.withdrawalMethod === 'bank_transfer' ? (
                        <>
                          <p className="text-sm"><strong>Bank:</strong> {selectedWithdrawal.withdrawalAccountDetails?.bankName}</p>
                          <p className="text-sm"><strong>Account:</strong> {selectedWithdrawal.withdrawalAccountDetails?.accountNumber}</p>
                          <p className="text-sm"><strong>Name:</strong> {selectedWithdrawal.withdrawalAccountDetails?.accountName}</p>
                        </>
                      ) : (
                        <p className="text-sm"><strong>Phone:</strong> {selectedWithdrawal.withdrawalAccountDetails?.phoneNumber}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Request Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedWithdrawal.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedWithdrawal.withdrawalStatus === 'pending' && (
                  <div className="flex gap-3 mt-6 pt-6 border-t">
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        openActionModal(selectedWithdrawal, 'approve');
                      }}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      Approve & Process
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        openActionModal(selectedWithdrawal, 'reject');
                      }}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <XCircleIcon className="w-5 h-5" />
                      Reject
                    </button>
                  </div>
                )}

                {selectedWithdrawal.withdrawalStatus === 'processing' && (
                  <div className="flex gap-3 mt-6 pt-6 border-t">
                    <button
                      onClick={() => handleStatusChange(selectedWithdrawal._id, 'completed', 'Payment completed successfully')}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Mark as Completed
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        openActionModal(selectedWithdrawal, 'reject');
                      }}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Mark as Failed
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Modal */}
        <WithdrawalActionModal
          isOpen={showActionModal}
          onClose={() => {
            setShowActionModal(false);
            setSelectedWithdrawal(null);
          }}
          onConfirm={handleActionConfirm}
          withdrawal={selectedWithdrawal}
          action={actionType}
          loading={processing}
        />
      </div>
    </div>
  );
};

export default WithdrawalManagement;
