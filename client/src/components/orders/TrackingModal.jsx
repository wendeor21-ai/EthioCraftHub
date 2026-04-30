/**
 * TrackingModal Component
 * Modal for entering/updating tracking information when shipping orders
 */

import { useState, useEffect } from 'react';
import { XMarkIcon, TruckIcon } from '@heroicons/react/24/outline';

const TrackingModal = ({ order, onClose, onSubmit, isUpdate = false }) => {
  const [formData, setFormData] = useState({
    trackingNumber: '',
    carrier: '',
    estimatedDelivery: '',
    notes: '',
  });

  useEffect(() => {
    if (isUpdate && order.shipping) {
      setFormData({
        trackingNumber: order.shipping.trackingNumber || '',
        carrier: order.shipping.carrier || '',
        estimatedDelivery: order.shipping.estimatedDelivery
          ? new Date(order.shipping.estimatedDelivery).toISOString().split('T')[0]
          : '',
        notes: order.shipping.notes || '',
      });
    }
  }, [isUpdate, order]);

  const carriers = [
    'Ethiopian Postal Service',
    'DHL Ethiopia',
    'FedEx',
    'UPS',
    'Aramex',
    'Other',
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.trackingNumber.trim()) {
      alert('Tracking number is required');
      return;
    }
    
    if (!formData.carrier) {
      alert('Please select a carrier');
      return;
    }

    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TruckIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isUpdate ? 'Update Tracking Information' : 'Ship Order'}
              </h2>
              <p className="text-sm text-gray-600">
                Order #{order.orderNumber || order._id?.slice(-8)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tracking Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tracking Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="trackingNumber"
              value={formData.trackingNumber}
              onChange={handleChange}
              placeholder="Enter tracking number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          {/* Carrier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shipping Carrier <span className="text-red-500">*</span>
            </label>
            <select
              name="carrier"
              value={formData.carrier}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="">Select a carrier</option>
              {carriers.map((carrier) => (
                <option key={carrier} value={carrier}>
                  {carrier}
                </option>
              ))}
            </select>
          </div>

          {/* Estimated Delivery */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Delivery Date
            </label>
            <input
              type="date"
              name="estimatedDelivery"
              value={formData.estimatedDelivery}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any special instructions or notes..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Customer Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Shipping Address
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium">
                {order.customer?.profile?.firstName || ''}{' '}
                {order.customer?.profile?.lastName || ''}
              </p>
              <p>{order.shippingAddress?.street || ''}</p>
              <p>
                {order.shippingAddress?.city || ''},{' '}
                {order.shippingAddress?.region || ''}
              </p>
              <p>
                {order.shippingAddress?.country || ''}{' '}
                {order.shippingAddress?.postalCode || ''}
              </p>
              <p>Phone: {order.shippingAddress?.phone || 'N/A'}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              {isUpdate ? 'Update Tracking' : 'Ship Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrackingModal;
