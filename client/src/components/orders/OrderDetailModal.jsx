/**
 * OrderDetailModal Component
 * Displays comprehensive order details in a modal
 */

import { XMarkIcon, TruckIcon, UserIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { getFileUrl } from '../../utils/getFileUrl';

const OrderDetailModal = ({ order, onClose }) => {
  const statusStyles = {
    pending: 'bg-blue-100 text-blue-800 border-blue-200',
    confirmed: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    processing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    shipped: 'bg-purple-100 text-purple-800 border-purple-200',
    delivered: 'bg-green-100 text-green-800 border-green-200',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
            <p className="text-sm text-gray-600 mt-1">
              Order #{order.orderNumber || order._id?.slice(-8)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status and Date */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Order Status</p>
              <span
                className={`px-4 py-2 inline-flex text-sm font-semibold rounded-full border ${
                  statusStyles[order.status] || 'bg-gray-100 text-gray-800 border-gray-200'
                }`}
              >
                {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Order Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <UserIcon className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium text-gray-900">
                  {order.customer?.profile?.firstName || ''}{' '}
                  {order.customer?.profile?.lastName || ''}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">
                  {order.customer?.email || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <TruckIcon className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Shipping Address</h3>
            </div>
            <div className="text-gray-700 space-y-1">
              <p>
                {['cod', 'cash_on_delivery'].includes((order.payment?.method || '').toLowerCase()) || 
                 ['paid', 'completed'].includes((order.payment?.status || '').toLowerCase())
                  ? order.shippingAddress?.street || ''
                  : <span className="text-blue-600 italic">[Street address hidden until payment is completed]</span>}
              </p>
              <p>
                {order.shippingAddress?.city || ''}, {order.shippingAddress?.region || ''}
              </p>
              <p>
                {order.shippingAddress?.country || ''}{' '}
                {order.shippingAddress?.postalCode || ''}
              </p>
              <p className="pt-2">
                <span className="text-gray-600">Phone:</span>{' '}
                <span className="font-medium">{order.shippingAddress?.phone || 'N/A'}</span>
              </p>
            </div>
          </div>

          {/* Tracking Information (if shipped) */}
          {order.shipping && order.shipping.trackingNumber && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Tracking Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Tracking Number</p>
                  <p className="font-mono font-medium text-gray-900">
                    {order.shipping.trackingNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Carrier</p>
                  <p className="font-medium text-gray-900">{order.shipping.carrier}</p>
                </div>
                {order.shipping.estimatedDelivery && (
                  <div>
                    <p className="text-sm text-gray-600">Estimated Delivery</p>
                    <p className="font-medium text-gray-900">
                      {new Date(order.shipping.estimatedDelivery).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {order.shipping.notes && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="text-gray-900">{order.shipping.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBagIcon className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
            </div>
            <div className="space-y-3">
              {(order.items || []).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-200"
                >
                  {(() => {
                    const imgSrc = item.productImage || item.product?.images?.[0]?.url || (typeof item.product?.images?.[0] === 'string' ? item.product.images[0] : null);
                    const finalUrl = getFileUrl(imgSrc);
                    return (
                      <img 
                        src={finalUrl || 'https://placehold.co/100x100/f3f4f6/a1a1aa?text=No+Image'}
                        alt={item.product?.name || 'Product Image'} 
                        className="w-16 h-16 object-cover rounded-lg bg-gray-50 border border-gray-200 shadow-sm"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/100x100/f3f4f6/a1a1aa?text=No+Image';
                        }}
                      />
                    );
                  })()}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {item.product?.name || 'Product'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Quantity: {item.quantity} × {item.price.toFixed(2)} ETB
                    </p>
                    {(item.color || item.size || (item.selectedOptions && item.selectedOptions.length > 0)) && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {item.color && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-100">
                            Color: {item.color}
                          </span>
                        )}
                        {item.size && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold border border-purple-100">
                            Size: {item.size}
                          </span>
                        )}
                        {item.selectedOptions && item.selectedOptions.map((opt, i) => (
                          <span key={i} className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full border border-gray-200 uppercase tracking-tighter">
                            {opt.name}: {opt.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {(item.price * item.quantity).toFixed(2)} ETB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>{order.totals?.subtotal?.toFixed(2) || '0.00'} ETB</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Tax</span>
                <span>{order.totals?.tax?.toFixed(2) || '0.00'} ETB</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Shipping</span>
                <span>{order.totals?.shipping?.toFixed(2) || '0.00'} ETB</span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-ethiopian-gold">
                    {order.totals?.total?.toFixed(2) || '0.00'} ETB
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          {order.payment && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Payment Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {order.payment.method || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {order.payment.status || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rejection/Cancellation Reason */}
          {(order.status === 'rejected' || order.status === 'cancelled') &&
            order.statusHistory && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  {order.status === 'rejected' ? 'Rejection' : 'Cancellation'} Reason
                </h3>
                <p className="text-red-800">
                  {order.statusHistory
                    .filter((h) => h.status === order.status)
                    .map((h) => h.note)
                    .join(', ') || 'No reason provided'}
                </p>
              </div>
            )}

          {/* Status History */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Status History</h3>
              <div className="space-y-3">
                {order.statusHistory.map((history, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-ethiopian-gold rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 capitalize">
                          {history.status}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(history.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {history.note && (
                        <p className="text-sm text-gray-600 mt-1">{history.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
