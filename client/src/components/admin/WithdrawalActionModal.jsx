/**
 * Withdrawal Action Modal
 * Professional modal for approving/rejecting withdrawal requests
 */

import { useState } from 'react';
import { XMarkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const WithdrawalActionModal = ({ isOpen, onClose, onConfirm, withdrawal, action, loading }) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !withdrawal) return null;

  const isApprove = action === 'approve';
  const isReject = action === 'reject';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isReject && !reason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isApprove ? 'bg-green-100' : 'bg-red-100'}`}>
              {isApprove ? (
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              ) : (
                <XCircleIcon className="w-6 h-6 text-red-600" />
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {isApprove ? 'Approve Withdrawal' : 'Reject Withdrawal'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Withdrawal Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Artisan</p>
                <p className="font-semibold text-gray-900">
                  {withdrawal.artisan?.profile?.firstName} {withdrawal.artisan?.profile?.lastName}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Amount</p>
                <p className="font-semibold text-gray-900">
                  {Math.abs(withdrawal.netAmount).toFixed(2)} ETB
                </p>
              </div>
              <div>
                <p className="text-gray-600">Method</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {withdrawal.withdrawalMethod?.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Account</p>
                <p className="font-semibold text-gray-900 text-xs">
                  {withdrawal.withdrawalAccountDetails?.phoneNumber ||
                    withdrawal.withdrawalAccountDetails?.accountNumber ||
                    'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation Message */}
          <div className={`rounded-lg p-4 mb-4 ${isApprove ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`text-sm ${isApprove ? 'text-green-800' : 'text-red-800'}`}>
              {isApprove ? (
                <>
                  Are you sure you want to approve this withdrawal? The artisan's balance will be updated immediately.
                </>
              ) : (
                <>
                  Are you sure you want to reject this withdrawal? The amount will be returned to the artisan's available balance.
                </>
              )}
            </p>
          </div>

          {/* Reason Input (for rejection) */}
          {isReject && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Invalid account number, Insufficient documentation..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                required
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                isApprove
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? 'Processing...' : isApprove ? 'Approve & Process' : 'Reject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawalActionModal;
