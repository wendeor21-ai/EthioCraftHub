/**
 * Artisan Finance/Earnings Dashboard
 * Comprehensive earnings tracking and withdrawal management
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import {
  BanknotesIcon,
  WalletIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
  ExclamationCircleIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EarningsChart from '../../components/finance/EarningsChart';
import WithdrawalModal from '../../components/finance/WithdrawalModal';
import CommissionPayoutModal from '../../components/finance/CommissionPayoutModal';
import TransactionsTable from '../../components/finance/TransactionsTable';
import CommissionHistoryTable from '../../components/finance/CommissionHistoryTable';
import ZemaAIInsight from '../../components/finance/ZemaAIInsight';
import toast from 'react-hot-toast';

const Finance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, [refreshKey]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/earnings/dashboard');
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalSuccess = () => {
    setShowWithdrawalModal(false);
    setRefreshKey(prev => prev + 1);
    toast.success('Withdrawal request submitted successfully!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Failed to load earnings data</p>
      </div>
    );
  }

  const { balance, monthlyEarnings, earningsByCategory, insights } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/artisan/dashboard')} 
            className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Earnings Dashboard</h1>
          <p className="text-gray-600">Track your income, manage withdrawals, and view financial insights</p>
        </div>

        {/* ZemaAI Insight */}
        <ZemaAIInsight insights={insights} earningsByCategory={earningsByCategory} />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {/* Total Lifetime Earnings */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Lifetime Earnings</p>
              <ArrowTrendingUpIcon className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {balance.totalEarnings.toFixed(2)} <span className="text-lg text-gray-500">ETB</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">All-time revenue</p>
          </div>

          {/* Available Balance */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Available Balance</p>
              <WalletIcon className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              {balance.availableBalance.toFixed(2)} <span className="text-lg text-gray-500">ETB</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Ready to withdraw</p>
          </div>

          {/* Unpaid Commission */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500 ring-2 ring-red-50 ring-inset">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-red-900 uppercase tracking-tight">Unpaid Commission</p>
              <ExclamationCircleIcon className="w-8 h-8 text-red-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-red-700">
                {(balance.unpaidCommission || 0).toFixed(2)}
              </p>
              <span className="text-lg text-red-500 font-bold">ETB</span>
            </div>
            {balance.pendingCommissionAmount > 0 && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full w-fit animate-pulse">
                <ClockIcon className="w-3.5 h-3.5" />
                {balance.pendingCommissionAmount.toFixed(2)} ETB pending
              </div>
            )}
            <p className="text-xs text-red-400 mt-1 font-medium italic">Owed to platform</p>
          </div>

          {/* Paid Commission */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-emerald-900 uppercase tracking-tight">Paid Commission</p>
              <CheckBadgeIcon className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-emerald-700">
                {(balance.paidCommission || 0).toFixed(2)}
              </p>
              <span className="text-lg text-emerald-500 font-bold">ETB</span>
            </div>
            <p className="text-xs text-emerald-500 mt-1 font-medium italic">Total settled fees</p>
          </div>

          {/* Pending Payouts */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Pending Withdrawals</p>
              <ClockIcon className="w-8 h-8 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-yellow-600">
              {balance.pendingWithdrawals.toFixed(2)} <span className="text-lg text-gray-500">ETB</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {balance.pendingWithdrawalsCount} request{balance.pendingWithdrawalsCount !== 1 ? 's' : ''} in progress
            </p>
          </div>

          {/* Total Withdrawals */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Withdrawals</p>
              <BanknotesIcon className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {balance.totalWithdrawals.toFixed(2)} <span className="text-lg text-gray-500">ETB</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Lifetime withdrawals</p>
          </div>
        </div>

        {/* Actions Button */}
        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={() => setShowWithdrawalModal(true)}
            disabled={balance.availableBalance < 500}
            className="px-6 py-3 bg-ethiopian-gold text-white rounded-xl hover:bg-ethiopian-earth transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            Request Withdrawal
            {balance.availableBalance < 500 && (
              <span className="text-xs font-normal opacity-80">(Min: 500 ETB)</span>
            )}
          </button>

          <button
            onClick={() => setShowCommissionModal(true)}
            className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2 font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <BanknotesIcon className="w-5 h-5" />
            Pay Commission Debt
          </button>
        </div>

        {/* Earnings Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Monthly Revenue Trend</h2>
          <EarningsChart data={monthlyEarnings} />
        </div>

        {/* History Tables Section */}
        <div className="space-y-8">
          <TransactionsTable refreshKey={refreshKey} />
          <CommissionHistoryTable refreshKey={refreshKey} />
        </div>

        {/* Modals */}
        {showWithdrawalModal && (
          <WithdrawalModal
            availableBalance={balance.availableBalance}
            onClose={() => setShowWithdrawalModal(false)}
            onSuccess={handleWithdrawalSuccess}
          />
        )}

        {showCommissionModal && (
          <CommissionPayoutModal
            onClose={() => setShowCommissionModal(false)}
            onSuccess={() => setRefreshKey(prev => prev + 1)}
          />
        )}
      </div>
    </div>
  );
};

export default Finance;
