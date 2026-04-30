import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AdminDashboard from './dashboards/AdminDashboard';
import ArtisanDashboard from './dashboards/ArtisanDashboard';
import Sidebar from '../components/common/Sidebar';
import { Bell, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { useCustomTranslation } from '../hooks/useCustomTranslation';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);

  useEffect(() => {
    if (user?.role === 'admin') {
      const fetch = () =>
        api.get('/admin/withdrawals?status=pending&limit=1000')
          .then(r => setPendingWithdrawals(r.data.data.withdrawals.length))
          .catch(() => {});
      fetch();
      const id = setInterval(fetch, 30000);
      return () => clearInterval(id);
    }
  }, [user]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="large" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Required</h2>
        <p className="text-gray-600 mb-6">Please log in to access your dashboard</p>
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-amber-500 text-white py-3 rounded-lg font-semibold hover:bg-amber-600 transition-colors"
        >
          Go to Login
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* New categorized sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page content */}
        <main className="flex-1 p-4 overflow-x-hidden">
          {user.role === 'admin'
            ? <AdminDashboard pendingWithdrawals={pendingWithdrawals} />
            : <ArtisanDashboard user={user} />
          }
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
