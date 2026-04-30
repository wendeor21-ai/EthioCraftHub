/**
 * Order Shipping Manager Component
 * Allows artisans to update shipping information for orders
 */

import { useState } from 'react';
import { Truck, Package, MapPin, Calendar, Camera, FileText, Save, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const COURIER_OPTIONS = [
  'DHL',
  'FedEx',
  'Anbessa Bus',
  'Ethiopian Postal Service',
  'Local Courier',
  'Store Pickup',
  'Other'
];

const DELIVERY_STATUSES = [
  'Pending',
  'Processing',
  'Shipped',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Failed',
  'Returned'
];

const OrderShippingManager = ({ order, onUpdate }) => {
  const [saving, setSaving] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [shippingData, setShippingData] = useState({
    trackingNumber: order.shipping?.trackingNumber || '',
    courierName: order.shipping?.courierName || '',
    deliveryStatus: order.shipping?.deliveryStatus || 'Pending',
    notes: order.shipping?.notes || '',
    estimatedDelivery: order.shipping?.estimatedDelivery ? 
      new Date(order.shipping.estimatedDelivery).toISOString().split('T')[0] : '',
    deliveryProofPhoto: order.shipping?.deliveryProofPhoto || ''
  });

  const handleChange = (field, value) => {
    setShippingData({ ...shippingData, [field]: value });
  };

  const handleSave = async () => {
    // Validation
    if (shippingData.deliveryStatus === 'Shipped' && !shippingData.trackingNumber) {
      toast.error('Tracking number is required when status is set to Shipped');
      return;
    }

    try {
      setSaving(true);
      const response = await api.patch(`/orders/${order._id}/shipping`, shippingData);
      toast.success('Shipping information updated successfully');
      if (onUpdate) {
        onUpdate(response.data.data);
      }
    } catch (error) {
      console.error('Error updating shipping:', error);
      const errorMsg = error.response?.data?.error || 'Failed to update shipping information';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintLabel = async () => {
    try {
      const response = await api.get(`/orders/${order._id}/shipping-label`);
      const labelData = response.data.data;
      
      // Open print dialog with label data
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Shipping Label - ${labelData.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .label { border: 2px solid #000; padding: 20px; max-width: 600px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; margin-bottom: 5px; }
            .barcode { text-align: center; font-size: 24px; letter-spacing: 2px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 5px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">
              <h1>EthioCraft Global</h1>
              <h2>Shipping Label</h2>
            </div>
            
            <div class="section">
              <div class="section-title">Order Information:</div>
              <table>
                <tr><td><strong>Order Number:</strong></td><td>${labelData.orderNumber}</td></tr>
                <tr><td><strong>Order Date:</strong></td><td>${new Date(labelData.orderDate).toLocaleDateString()}</td></tr>
                <tr><td><strong>Shipping Method:</strong></td><td>${labelData.shipping.method}</td></tr>
                ${labelData.shipping.trackingNumber ? `<tr><td><strong>Tracking:</strong></td><td>${labelData.shipping.trackingNumber}</td></tr>` : ''}
              </table>
            </div>

            ${labelData.shipping.trackingNumber ? `
            <div class="barcode">
              ${labelData.shipping.trackingNumber}
            </div>
            ` : ''}

            <div class="section">
              <div class="section-title">Ship To:</div>
              <table>
                <tr><td><strong>Name:</strong></td><td>${labelData.customer.name}</td></tr>
                <tr><td><strong>Phone:</strong></td><td>${labelData.customer.phone}</td></tr>
                <tr><td><strong>Address:</strong></td><td>${labelData.customer.address.street}</td></tr>
                <tr><td></td><td>${labelData.customer.address.city}, ${labelData.customer.address.region}</td></tr>
                <tr><td></td><td>${labelData.customer.address.country} ${labelData.customer.address.postalCode || ''}</td></tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Items:</div>
              <table border="1">
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
                ${labelData.items.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.price} ETB</td>
                  </tr>
                `).join('')}
              </table>
            </div>

            <div class="section">
              <table>
                <tr><td><strong>Subtotal:</strong></td><td>${labelData.totals.subtotal} ETB</td></tr>
                <tr><td><strong>Shipping:</strong></td><td>${labelData.totals.shipping} ETB</td></tr>
              </table>
            </div>

            <div class="no-print" style="margin-top: 20px; text-align: center;">
              <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
                Print Label
              </button>
              <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">
                Close
              </button>
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating shipping label:', error);
      toast.error('Failed to generate shipping label');
    }
  };

  const handleUploadProof = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // In a real implementation, you would upload to a file storage service
    // For now, we'll just show a placeholder
    toast.info('File upload functionality would be implemented here');
    
    // Simulated upload
    // const formData = new FormData();
    // formData.append('photo', file);
    // const response = await api.post(`/orders/${order._id}/delivery-proof`, formData);
    // setShippingData({ ...shippingData, deliveryProofPhoto: response.data.data.photoUrl });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Truck className="w-5 h-5 text-ethiopian-gold" />
          Shipping & Delivery Management
        </h3>
        <button
          onClick={handlePrintLabel}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Print Shipping Label
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tracking Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tracking Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={shippingData.trackingNumber}
            onChange={(e) => handleChange('trackingNumber', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
            placeholder="e.g., DHL123456789"
          />
          <p className="text-xs text-gray-500 mt-1">Required when status is "Shipped"</p>
        </div>

        {/* Courier Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Courier Service
          </label>
          <select
            value={shippingData.courierName}
            onChange={(e) => handleChange('courierName', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
          >
            <option value="">Select courier...</option>
            {COURIER_OPTIONS.map(courier => (
              <option key={courier} value={courier}>{courier}</option>
            ))}
          </select>
        </div>

        {/* Delivery Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Status <span className="text-red-500">*</span>
          </label>
          <select
            value={shippingData.deliveryStatus}
            onChange={(e) => handleChange('deliveryStatus', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
          >
            {DELIVERY_STATUSES.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* Estimated Delivery */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estimated Delivery Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={shippingData.estimatedDelivery}
              onChange={(e) => handleChange('estimatedDelivery', e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
            />
            <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Shipping Notes */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Shipping Notes
          </label>
          <textarea
            value={shippingData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
            placeholder="Add any special instructions or notes about the shipment..."
          />
        </div>

        {/* Delivery Proof Upload */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Proof Photo
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
              <Camera className="w-4 h-4" />
              Upload Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadProof}
                className="hidden"
              />
            </label>
            {shippingData.deliveryProofPhoto && (
              <span className="text-sm text-green-600">✓ Photo uploaded</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Upload a photo of the package or delivery receipt as proof
          </p>
        </div>
      </div>

      {/* Warning for Shipped Status */}
      {shippingData.deliveryStatus === 'Shipped' && !shippingData.trackingNumber && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Tracking number required</p>
              <p>Please enter a tracking number before setting status to "Shipped"</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Shipping Info */}
      {order.shipping && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Current Shipping Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {order.shipping.shippedAt && (
              <div>
                <span className="text-gray-600">Shipped At:</span>
                <span className="ml-2 font-medium">{new Date(order.shipping.shippedAt).toLocaleString()}</span>
              </div>
            )}
            {order.shipping.deliveredAt && (
              <div>
                <span className="text-gray-600">Delivered At:</span>
                <span className="ml-2 font-medium">{new Date(order.shipping.deliveredAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-ethiopian-gold text-white rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Update Shipping Info'}
        </button>
      </div>
    </div>
  );
};

export default OrderShippingManager;
