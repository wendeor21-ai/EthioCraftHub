/**
 * Shipping & Delivery Management Page
 * Comprehensive order fulfillment and tracking for artisans
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Package,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Printer,
  Download,
  Eye,
  Calendar
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import OrderShippingManager from '../../components/shipping/OrderShippingManager';
import ShippingSettings from '../../components/shipping/ShippingSettings';

const ShippingDelivery = ({ insideDashboard = false, onSelectTab }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Debug: Log component mount
  useEffect(() => {
    console.log('ShippingDelivery component mounted');
    console.log('Active tab:', activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, filterStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('Fetching orders for tab:', activeTab);
      
      const endpoint = activeTab === 'active'
        ? '/artisan/shipping/active-orders'
        : '/orders';

      const response = await api.get(endpoint);
      console.log('API Response:', response.data);
      
      let fetchedOrders = response.data.data || response.data.orders || [];
      console.log('Fetched orders:', fetchedOrders);

      // Filter based on tab
      if (activeTab === 'active') {
        fetchedOrders = fetchedOrders.filter(order =>
          order.payment?.status === 'completed' &&
          order.shipping?.deliveryStatus !== 'Delivered'
        );
      } else if (activeTab === 'history') {
        fetchedOrders = fetchedOrders.filter(order =>
          order.shipping?.deliveryStatus === 'Delivered'
        );
      }

      console.log('Filtered orders:', fetchedOrders);
      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to load orders';
      toast.error(errorMsg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    if (!Array.isArray(orders)) {
      setFilteredOrders([]);
      return;
    }

    let filtered = [...orders];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.shippingAddress?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.shippingAddress?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.shipping?.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order =>
        order.shipping?.deliveryStatus === filterStatus
      );
    }

    setFilteredOrders(filtered);
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(order => order._id));
    }
  };

  const handleBulkMarkShipped = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders to mark as shipped');
      return;
    }

    try {
      const promises = selectedOrders.map(orderId =>
        api.patch(`/orders/${orderId}/shipping`, {
          deliveryStatus: 'Shipped'
        })
      );

      await Promise.all(promises);
      toast.success(`${selectedOrders.length} orders marked as shipped`);
      setSelectedOrders([]);
      fetchOrders();
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error('Failed to update some orders');
    }
  };

  const handleViewOrder = (order) => {
    console.log('Viewing order:', order);
    setSelectedOrder(order);
    setShowShippingModal(true);
  };

  const handlePrintLabel = async (order) => {
    try {
      console.log('Printing label for order:', order.orderNumber);
      const response = await api.get(`/orders/${order._id}/shipping-label`);
      const labelData = response.data.data;

      // Open print dialog
      const printWindow = window.open('', '_blank');
      printWindow.document.write(generateLabelHTML(labelData));
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating label:', error);
      toast.error('Failed to generate shipping label');
    }
  };

  const generateLabelHTML = (labelData) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shipping Label - ${labelData.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .label { border: 2px solid #000; padding: 20px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .section { margin-bottom: 15px; }
          .section-title { font-weight: bold; margin-bottom: 5px; }
          .barcode { text-align: center; font-size: 24px; letter-spacing: 2px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          td, th { padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; }
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
          
          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background-color: #B76E2E; color: white; border: none; border-radius: 4px; margin-right: 10px;">
              Print Label
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background-color: #6b7280; color: white; border: none; border-radius: 4px;">
              Close
            </button>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock },
      'Processing': { bg: 'bg-blue-100', text: 'text-blue-800', icon: Package },
      'Shipped': { bg: 'bg-purple-100', text: 'text-purple-800', icon: Truck },
      'In Transit': { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Truck },
      'Out for Delivery': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Truck },
      'Delivered': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      'Failed': { bg: 'bg-red-100', text: 'text-red-800', icon: Clock },
      'Returned': { bg: 'bg-orange-100', text: 'text-orange-800', icon: Package }
    };

    const config = statusConfig[status] || statusConfig['Pending'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.text}`}>
        <Icon className="w-2.5 h-2.5" />
        {status}
      </span>
    );
  };

  const tabs = [
    { id: 'active', label: 'Active Orders', icon: Package },
    { id: 'history', label: 'Delivery History', icon: CheckCircle },
    { id: 'settings', label: 'Shipping Settings', icon: Truck }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className={insideDashboard ? "pb-6" : "min-h-screen bg-gray-50 py-6"}>
      <div className={insideDashboard ? "w-full" : "max-w-7xl mx-auto px-3 sm:px-6 lg:px-8"}>
        {/* Header */}
        <div className="mb-4">
          {!insideDashboard && (
            <button
              onClick={() => navigate('/artisan/dashboard')}
              className="text-amber-600 hover:text-amber-800 mb-2 flex items-center gap-1 text-xs font-medium"
            >
              ← Back to Dashboard
            </button>
          )}
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-600" />
            Shipping & Delivery Management
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage order fulfillment, tracking, and delivery</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <div className="border-b border-gray-100 overflow-x-auto scrollbar-hide">
            <nav className="flex w-max -mb-px space-x-3 sm:space-x-6 px-3 sm:px-4">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 py-2.5 px-1 border-b-2 font-semibold text-xs whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'border-amber-500 text-amber-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-3.5 sm:p-4">
            {activeTab === 'settings' ? (
              <ShippingSettings />
            ) : (
               <div className="space-y-4">
                {/* Search and Filter Bar */}
                <div className="mb-3 flex flex-col sm:flex-row gap-2 sm:gap-2.5">
                  <div className="flex-1 relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by order number, customer name, or tracking..."
                      className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-xs bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="flex-1 sm:flex-none px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-xs bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>
                </div>

                {/* Bulk Actions */}
                {activeTab === 'active' && selectedOrders.length > 0 && (
                  <div className="mb-3 bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 sm:p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-900">
                        {selectedOrders.length} order(s) selected
                      </span>
                      <button
                        onClick={handleBulkMarkShipped}
                        className="px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors shadow-xs"
                      >
                        Mark as Shipped
                      </button>
                    </div>
                  </div>
                )}

                {/* Orders Table */}
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">
                      {activeTab === 'active' ? 'No Active Orders' : 'No Delivery History'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {activeTab === 'active'
                        ? 'Orders requiring fulfillment will appear here'
                        : 'Completed deliveries will appear here'}
                    </p>
                  </div>
                ) : (
                   <div className="space-y-3">
                     <div className="space-y-2.5 md:hidden">
                       {filteredOrders.map(order => (
                         <div key={order._id || order._1} className="bg-white rounded-xl border border-gray-100 shadow-2xs p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-xs font-bold text-gray-900">{order.orderNumber || 'N/A'}</p>
                              <p className="text-[11px] text-gray-500 mt-0.5">{order.shippingAddress?.firstName || ''} {order.shippingAddress?.lastName || ''}</p>
                            </div>
                            <div className="shrink-0">{getStatusBadge(order.shipping?.deliveryStatus || 'Pending')}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[10px] text-gray-500 mb-2.5 bg-gray-50/70 rounded-lg p-2 border border-gray-100">
                            <div>
                              <p className="font-bold text-gray-400 uppercase tracking-wide text-[9px]">Tracking</p>
                              <p className="mt-0.5 text-gray-900 font-semibold truncate">{order.shipping?.trackingNumber || '-'}</p>
                            </div>
                            <div>
                              <p className="font-bold text-gray-400 uppercase tracking-wide text-[9px]">Date</p>
                              <p className="mt-0.5 text-gray-900 font-semibold">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-gray-200 mt-0.5">
                              <p className="font-bold text-gray-400 uppercase tracking-wide text-[9px]">Courier</p>
                              <p className="mt-0.5 text-gray-900 font-semibold">{order.shipping?.courierName || 'Not set'}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={() => handleViewOrder(order)}
                              className="flex-1 px-2.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition shadow-xs"
                            >
                              Manage
                            </button>
                            <button
                              onClick={() => handlePrintLabel(order)}
                              className="px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition"
                            >
                              Label
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {activeTab === 'active' && (
                            <th className="px-3.5 py-2 text-left">
                              <input
                                type="checkbox"
                                checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                                onChange={handleSelectAll}
                                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                              />
                            </th>
                          )}
                          <th className="px-3.5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Order
                          </th>
                          <th className="px-3.5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-3.5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-3.5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Tracking
                          </th>
                          <th className="px-3.5 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-3.5 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredOrders.map(order => (
                          <tr key={order._id} className="hover:bg-gray-50/70 transition-colors">
                            {activeTab === 'active' && (
                              <td className="px-3.5 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedOrders.includes(order._id)}
                                  onChange={() => handleSelectOrder(order._id)}
                                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                              </td>
                            )}
                            <td className="px-3.5 py-2">
                              <div className="text-xs font-semibold text-gray-900">
                                {order.orderNumber || 'N/A'}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {order.totals?.total || 0} ETB
                              </div>
                            </td>
                            <td className="px-3.5 py-2">
                              <div className="text-xs font-medium text-gray-900">
                                {order.shippingAddress?.firstName || ''} {order.shippingAddress?.lastName || ''}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {order.shippingAddress?.city || ''}
                              </div>
                            </td>
                            <td className="px-3.5 py-2">
                              {getStatusBadge(order.shipping?.deliveryStatus || 'Pending')}
                            </td>
                            <td className="px-3.5 py-2">
                              <div className="text-xs font-medium text-gray-900">
                                {order.shipping?.trackingNumber || '-'}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {order.shipping?.courierName || 'Not set'}
                              </div>
                            </td>
                            <td className="px-3.5 py-2 text-xs text-gray-500">
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-3.5 py-2 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleViewOrder(order)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Manage Shipping"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handlePrintLabel(order)}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Print Label"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shipping Management Modal */}
      {showShippingModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Manage Shipping - {selectedOrder.orderNumber || 'Order'}
                </h2>
                <button
                  onClick={() => {
                    setShowShippingModal(false);
                    setSelectedOrder(null);
                    fetchOrders();
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <OrderShippingManager
                order={selectedOrder}
                onUpdate={() => {
                  fetchOrders();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingDelivery;