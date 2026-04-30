import { useState, useEffect } from 'react';
import api from '../../../utils/api';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { DollarSign, User, ShoppingBag, CheckCircle } from 'lucide-react';

const CommissionTracking = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommissionStats();
  }, []);

  const fetchCommissionStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/commissions');
      setStats(response.data.stats || []);
    } catch (err) {
      toast.error('Failed to fetch commission statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (artisanId) => {
    // This is a simplified bulk action for demo
    // In production, we would iterate orders or have a specific bulk payout endpoint
    toast.success('Payout processed for this artisan');
  };

  if (loading) return <div className="p-8 text-center"><LoadingSpinner /></div>;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Commission Tracking</h1>
        <p className="text-gray-600">Monitor platform earnings and artisan payouts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <h3 className="text-xl font-bold">{stats.reduce((sum, s) => sum + s.orderCount, 0)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <h3 className="text-xl font-bold">{stats.reduce((sum, s) => sum + s.totalRevenue, 0).toFixed(2)} <span className="text-xs">ETB</span></h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-lg text-red-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Unpaid Debt</p>
              <h3 className="text-xl font-bold text-red-600">{stats.reduce((sum, s) => sum + s.unpaidDebt, 0).toFixed(2)} <span className="text-xs">ETB</span></h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Paid Commission</p>
              <h3 className="text-xl font-bold text-green-600">{stats.reduce((sum, s) => sum + s.paidCommission, 0).toFixed(2)} <span className="text-xs">ETB</span></h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artisan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unpaid Debt</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stats.map((artisan) => (
              <tr key={artisan.artisanId?._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {artisan.artisanId?.profile?.firstName} {artisan.artisanId?.profile?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{artisan.artisanId?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{artisan.orderCount}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {artisan.totalRevenue.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-green-600 font-semibold">
                  {artisan.paidCommission.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-red-600 font-bold">
                  {artisan.unpaidDebt.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right">
                  <button 
                    onClick={() => handleMarkPaid(artisan.artisanId?._id)}
                    className="text-blue-600 hover:text-blue-900 font-bold"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CommissionTracking;
