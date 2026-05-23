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
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {/* Total Lifetime Earnings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-5 flex flex-col justify-between border-l-4 border-l-blue-500">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[9px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-wide truncate">Lifetime Earnings</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-base sm:text-2xl font-bold text-gray-900 truncate">{balance.totalEarnings.toFixed(2)}</p>
                  <span className="text-[9px] sm:text-sm text-gray-500 font-bold">ETB</span>
                </div>
                <p className="text-[9px] sm:text-xs text-gray-400 mt-1 truncate">All-time revenue</p>
              </div>
              <div className="hidden sm:flex p-2 bg-blue-50 rounded-lg shrink-0">
                <ArrowTrendingUpIcon className="w-4 h-4 sm:w-6 sm:h-6 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Available Balance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-5 flex flex-col justify-between border-l-4 border-l-green-500">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[9px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-wide truncate">Available Balance</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-base sm:text-2xl font-bold text-green-600 truncate">{balance.availableBalance.toFixed(2)}</p>
                  <span className="text-[9px] sm:text-sm text-green-500/70 font-bold">ETB</span>
                </div>
                <p className="text-[9px] sm:text-xs text-green-600/70 mt-1 truncate">Ready to withdraw</p>
              </div>
              <div className="hidden sm:flex p-2 bg-green-50 rounded-lg shrink-0">
                <WalletIcon className="w-4 h-4 sm:w-6 sm:h-6 text-green-500" />
              </div>
            </div>
          </div>

          {/* Unpaid Commission */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-5 flex flex-col justify-between border-l-4 border-l-red-500 ring-1 sm:ring-2 ring-red-50 ring-inset">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[9px] sm:text-[11px] text-red-900 font-bold uppercase tracking-wide truncate">Unpaid Comm.</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-base sm:text-2xl font-bold text-red-700 truncate">{(balance.unpaidCommission || 0).toFixed(2)}</p>
                  <span className="text-[9px] sm:text-sm text-red-500 font-bold">ETB</span>
                </div>
                {balance.pendingCommissionAmount > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-[8px] sm:text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded-full w-fit animate-pulse">
                    <ClockIcon className="w-3 h-3" />
                    {balance.pendingCommissionAmount.toFixed(0)} ETB pen.
                  </div>
                )}
                <p className="text-[9px] sm:text-xs text-red-400 mt-1 font-medium italic truncate">Owed to platform</p>
              </div>
              <div className="hidden sm:flex p-2 bg-red-50 rounded-lg shrink-0">
                <ExclamationCircleIcon className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Paid Commission */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-5 flex flex-col justify-between border-l-4 border-l-emerald-500">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[9px] sm:text-[11px] text-emerald-900 font-bold uppercase tracking-wide truncate">Paid Comm.</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-base sm:text-2xl font-bold text-emerald-700 truncate">{(balance.paidCommission || 0).toFixed(2)}</p>
                  <span className="text-[9px] sm:text-sm text-emerald-500 font-bold">ETB</span>
                </div>
                <p className="text-[9px] sm:text-xs text-emerald-500 mt-1 font-medium italic truncate">Total settled fees</p>
              </div>
              <div className="hidden sm:flex p-2 bg-emerald-50 rounded-lg shrink-0">
                <CheckBadgeIcon className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Pending Payouts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-5 flex flex-col justify-between border-l-4 border-l-yellow-500">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[9px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-wide truncate">Pending Withdraws</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-base sm:text-2xl font-bold text-yellow-600 truncate">{balance.pendingWithdrawals.toFixed(2)}</p>
                  <span className="text-[9px] sm:text-sm text-yellow-500/70 font-bold">ETB</span>
                </div>
                <p className="text-[9px] sm:text-xs text-gray-400 mt-1 truncate">
                  {balance.pendingWithdrawalsCount} reqs in progress
                </p>
              </div>
              <div className="hidden sm:flex p-2 bg-yellow-50 rounded-lg shrink-0">
                <ClockIcon className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-500" />
              </div>
            </div>
          </div>

          {/* Total Withdrawals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-5 flex flex-col justify-between border-l-4 border-l-purple-500">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[9px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-wide truncate">Total Withdrawals</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-base sm:text-2xl font-bold text-purple-600 truncate">{balance.totalWithdrawals.toFixed(2)}</p>
                  <span className="text-[9px] sm:text-sm text-purple-500/70 font-bold">ETB</span>
                </div>
                <p className="text-[9px] sm:text-xs text-gray-400 mt-1 truncate">Lifetime withdrawals</p>
              </div>
              <div className="hidden sm:flex p-2 bg-purple-50 rounded-lg shrink-0">
                <BanknotesIcon className="w-4 h-4 sm:w-6 sm:h-6 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Button */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={() => setShowWithdrawalModal(true)}
            disabled={balance.availableBalance < 500}
            className="flex-1 w-full px-4 sm:px-6 py-3 bg-ethiopian-gold text-white rounded-xl hover:bg-ethiopian-earth transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-bold shadow-sm text-sm sm:text-base"
          >
            <PlusIcon className="w-5 h-5" />
            Request Withdrawal
            {balance.availableBalance < 500 && (
              <span className="text-[10px] sm:text-xs font-normal opacity-80">(Min: 500 ETB)</span>
            )}
          </button>

          <button
            onClick={() => setShowCommissionModal(true)}
            className="flex-1 w-full px-4 sm:px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2 font-bold shadow-sm text-sm sm:text-base"
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
