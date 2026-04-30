/**
 * Withdrawal Request Modal
 * Allows artisans to request withdrawals with validation
 */

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const MINIMUM_WITHDRAWAL = 500;

const WithdrawalModal = ({ availableBalance, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount: '',
    method: 'telebirr',
    accountDetails: {
      phoneNumber: '',
      accountNumber: '',
      accountName: '',
      bankName: '',
    },
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('accountDetails.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        accountDetails: {
          ...prev.accountDetails,
          [field]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Clear error for this field
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    } else if (parseFloat(formData.amount) < MINIMUM_WITHDRAWAL) {
      newErrors.amount = `Minimum withdrawal is ${MINIMUM_WITHDRAWAL} ETB`;
    } else if (parseFloat(formData.amount) > availableBalance) {
      newErrors.amount = `Amount exceeds available balance (${availableBalance.toFixed(2)} ETB)`;
    }

    if (formData.method === 'telebirr' || formData.method === 'cbe_birr') {
      if (!formData.accountDetails.phoneNumber) {
        newErrors.phoneNumber = 'Phone number is required';
      } else if (!/^(\+251|0)?9\d{8}$/.test(formData.accountDetails.phoneNumber)) {
        newErrors.phoneNumber = 'Invalid Ethiopian phone number';
      }
    }

    if (formData.method === 'bank_transfer') {
      if (!formData.accountDetails.accountNumber) {
        newErrors.accountNumber = 'Account number is required';
      }
      if (!formData.accountDetails.accountName) {
        newErrors.accountName = 'Account name is required';
      }
      if (!formData.accountDetails.bankName) {
        newErrors.bankName = 'Bank name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    try {
      setLoading(true);
      await api.post('/earnings/withdraw', {
        amount: parseFloat(formData.amount),
        method: formData.method,
        accountDetails: formData.accountDetails,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Request Withdrawal</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Available Balance */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-700 mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-green-600">
              {availableBalance.toFixed(2)} ETB
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Withdrawal Amount (ETB) *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min={MINIMUM_WITHDRAWAL}
                max={availableBalance}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                placeholder={`Min: ${MINIMUM_WITHDRAWAL} ETB`}
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Minimum withdrawal: {MINIMUM_WITHDRAWAL} ETB
              </p>
            </div>

            {/* Withdrawal Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Withdrawal Method *
              </label>
              <select
                name="method"
                value={formData.method}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
              >
                <option value="telebirr">Telebirr</option>
                <option value="cbe_birr">CBE Birr</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            {/* Conditional Fields */}
            {(formData.method === 'telebirr' || formData.method === 'cbe_birr') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="accountDetails.phoneNumber"
                  value={formData.accountDetails.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  placeholder="09XXXXXXXX"
                />
                {errors.phoneNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
                )}
              </div>
            )}

            {formData.method === 'bank_transfer' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    name="accountDetails.bankName"
                    value={formData.accountDetails.bankName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                    placeholder="e.g., Commercial Bank of Ethiopia"
                  />
                  {errors.bankName && (
                    <p className="text-red-500 text-sm mt-1">{errors.bankName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    name="accountDetails.accountNumber"
                    value={formData.accountDetails.accountNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                    placeholder="Enter account number"
                  />
                  {errors.accountNumber && (
                    <p className="text-red-500 text-sm mt-1">{errors.accountNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    name="accountDetails.accountName"
                    value={formData.accountDetails.accountName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                    placeholder="Account holder name"
                  />
                  {errors.accountName && (
                    <p className="text-red-500 text-sm mt-1">{errors.accountName}</p>
                  )}
                </div>
              </>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Withdrawal requests are processed within 2-3 business days. 
                You'll receive a notification once your request is approved.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-ethiopian-gold text-white rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalModal;
