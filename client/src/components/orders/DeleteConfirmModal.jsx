/**
 * DeleteConfirmModal Component
 * Professional confirmation modal for deleting orders
 */

import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, orderCount = 1, loading = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Confirm Deletion</h2>
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
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            {orderCount === 1 ? (
              <>
                Are you sure you want to permanently delete this order? This action{' '}
                <span className="font-semibold text-red-600">cannot be undone</span>.
              </>
            ) : (
              <>
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold text-red-600">{orderCount} orders</span>?
                This action <span className="font-semibold text-red-600">cannot be undone</span>.
              </>
            )}
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">Warning:</span> Only rejected and cancelled
              orders can be deleted. This will permanently remove all order data from the
              database.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
