import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Scissors, 
  TrendingUp, 
  DollarSign, 
  Eye, 
  X,
  CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

function CustomOrdersAnalytics() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ orders: [], stats: {} });
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/admin/custom-orders-analytics');
        if (response.data && response.data.success) {
          setData(response.data.data || { orders: [], stats: {} });
        } else if (response.data) {
          setData(response.data);
        }
      } catch (error) {
        console.warn('Custom orders analytics fetch:', error.message);
        setData({ orders: [], stats: { totalRevenue: 0, totalCommission: 0, totalEarning: 0, count: 0 } });
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A3018]"></div>
      </div>
    );
  }

  const { orders, stats } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 mt-16 font-['Inter',sans-serif]">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Playfair_Display',serif] text-neutral-900 border-l-4 border-[#CFA66E] pl-4">Custom Design Analytics</h1>
            <p className="mt-2 text-neutral-500">Monitor custom tailoring orders, transactions, and commission generation.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Total Custom Orders" value={orders.length} icon={<Scissors />} color="blue" />
          <StatCard title="Completed Transactions" value={stats.count || 0} icon={<TrendingUp />} color="emerald" />
          <StatCard title="Total Revenue (ETB)" value={stats.totalRevenue?.toFixed(2) || '0.00'} icon={<DollarSign />} color="indigo" />
          <StatCard title="Platform Commission (10%)" value={stats.totalCommission?.toFixed(2) || '0.00'} icon={<CreditCard />} color="amber" />
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-900">Recent Custom Requests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#4A3018]/5 text-neutral-600 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 rounded-tl-lg">Order Info</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Artisan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Financials</th>
                  <th className="px-6 py-4 rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-neutral-900">{order.gender} {order.itemType}</div>
                      <div className="text-neutral-500 text-xs">ID: {order._id.slice(-6)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{order.customer?.profile?.firstName}</div>
                      <div className="text-xs text-neutral-500">{order.customer?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{order.artisan?.profile?.firstName}</div>
                      <div className="text-xs text-neutral-500">{order.artisan?.businessProfile?.businessName || order.artisan?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                        order.status === 'price_quoted' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-neutral-900">{order.price} ETB</div>
                      <div className="text-xs text-[#8B6B40] font-medium mt-0.5">Fee: {order.commission} ETB</div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="text-[#4A3018] hover:bg-[#4A3018]/10 p-2 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-sm z-10">
                <h3 className="text-2xl font-bold font-['Playfair_Display',serif] text-neutral-900">Custom Design #{selectedOrder._id.slice(-8)}</h3>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><X/></button>
              </div>
              
              <div className="p-8 space-y-8">
                {/* Visuals */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-2">Front View</h4>
                    {selectedOrder.photos?.front ? (
                      <img src={selectedOrder.photos.front} alt="Front" className="w-full h-64 object-cover rounded-xl border border-neutral-200" />
                    ) : <div className="h-64 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-400">No Photo</div>}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-2">Back View</h4>
                    {selectedOrder.photos?.back ? (
                       <img src={selectedOrder.photos.back} alt="Back" className="w-full h-64 object-cover rounded-xl border border-neutral-200" />
                    ) : <div className="h-64 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-400">No Photo</div>}
                  </div>
                </div>

                {/* Measurements */}
                <div>
                   <h4 className="text-lg font-bold text-[#4A3018] border-b border-neutral-100 pb-2 mb-4">Measurements Provided</h4>
                   <div className="grid grid-cols-3 gap-4">
                     {Object.entries(selectedOrder.measurements || {}).map(([key, value]) => (
                        <div key={key} className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                          <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider block mb-1">{key}</span>
                          <span className="text-lg font-semibold text-neutral-900">{value} cm</span>
                        </div>
                     ))}
                   </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-[#4A3018]/5 rounded-2xl p-6 border border-[#4A3018]/10">
                   <h4 className="text-lg font-bold text-[#4A3018] mb-4">Transaction Details</h4>
                   <div className="space-y-3">
                      <div className="flex justify-between border-b border-[#4A3018]/10 pb-2">
                        <span className="text-neutral-600 font-medium">Customer Paid</span>
                        <span className="font-bold text-neutral-900 text-lg">{selectedOrder.price} ETB</span>
                      </div>
                      <div className="flex justify-between border-b border-[#4A3018]/10 pb-2">
                        <span className="text-[#8B6B40] font-bold uppercase text-xs tracking-wider">Platform Commission (10%)</span>
                        <span className="font-bold text-amber-700">{selectedOrder.commission} ETB</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-emerald-700 font-bold uppercase text-xs tracking-wider">Artisan Earning (90%)</span>
                        <span className="font-bold text-emerald-700">{selectedOrder.artisanEarning} ETB</span>
                      </div>
                      {selectedOrder.paymentMethod && (
                        <div className="flex justify-between mt-2 pt-2 border-t border-[#4A3018]/10">
                          <span className="text-neutral-500 font-medium text-sm">Payment Method</span>
                          <span className="font-semibold text-neutral-700">{selectedOrder.paymentMethod}</span>
                        </div>
                      )}
                      {selectedOrder.transactionId && (
                        <div className="flex justify-between mt-1 pt-1">
                          <span className="text-neutral-500 font-medium text-sm">Transaction ID</span>
                          <span className="font-semibold text-neutral-700">{selectedOrder.transactionId}</span>
                        </div>
                      )}
                   </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
        
      </div>
    </div>
  );
}

const StatCard = ({ title, value, icon, color }) => {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };

  return (
    <div className={`p-6 rounded-2xl border ${colorMap[color]} shadow-sm`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold opacity-80 mb-1">{title}</p>
          <h3 className="text-3xl font-black">{value}</h3>
        </div>
        <div className="p-3 bg-white/60 rounded-xl">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default CustomOrdersAnalytics;
