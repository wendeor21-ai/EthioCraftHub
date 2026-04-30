/**
 * Bank Details Confirmation Modal
 * Shows a confirmation dialog before saving bank details
 */

import { AlertCircle } from 'lucide-react';

const BankConfirmModal = ({ isOpen, onClose, onConfirm, bankData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirm Bank Details
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure these bank details are correct? Incorrect information may delay your payouts.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Bank Name:</span>
                  <span className="ml-2 text-gray-900">{bankData.bankName || 'Not provided'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Account Holder:</span>
                  <span className="ml-2 text-gray-900">{bankData.accountHolderName || 'Not provided'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Account Number:</span>
                  <span className="ml-2 text-gray-900">{bankData.accountNumber || 'Not provided'}</span>
                </div>
                {bankData.telebirrNumber && (
                  <div>
                    <span className="font-medium text-gray-700">Telebirr:</span>
                    <span className="ml-2 text-gray-900">{bankData.telebirrNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-ethiopian-gold text-white rounded-lg hover:bg-ethiopian-earth transition-colors"
            >
              Confirm & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankConfirmModal;
