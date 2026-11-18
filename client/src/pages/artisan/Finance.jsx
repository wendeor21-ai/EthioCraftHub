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

const Finance = ({ insideDashboard = false, onSelectTab }) => {
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
    <div className={insideDashboard ? "pb-8" : "min-h-screen bg-gray-50 py-8"}>
      <div className={insideDashboard ? "w-full" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
        {/* Header */}
        <div className="mb-4">
          {!insideDashboard && (
            <button 
              onClick={() => navigate('/artisan/dashboard')} 
              className="text-ethiopian-gold hover:text-ethiopian-earth mb-2 flex items-center text-xs font-semibold"
            >
              ← Back to Dashboard
            </button>
          )}
          <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Earnings Dashboard</h1>
          <p className="text-xs text-gray-500">Track your income, manage withdrawals, and view financial insights</p>
        </div>

        {/* ZemaAI Insight */}
        <ZemaAIInsight insights={insights} earningsByCategory={earningsByCategory} />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-2.5 mb-4">
          {/* Total Lifetime Earnings */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-2.5 sm:p-3 flex flex-col justify-between border-l-[3px] border-l-blue-500 hover:shadow-xs transition-shadow">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-tight truncate">Lifetime Earnings</p>
                <div className="flex items-baseline gap-1 mt-0.5 min-w-0">
                  <span className="text-xs sm:text-sm xl:text-base font-black text-gray-900 whitespace-nowrap truncate">
                    {(balance.totalEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold shrink-0 whitespace-nowrap">ETB</span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 truncate">All-time revenue</p>
              </div>
              <div className="p-1 sm:p-1.5 bg-blue-50 rounded-lg shrink-0">
                <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Available Balance */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-2.5 sm:p-3 flex flex-col justify-between border-l-[3px] border-l-emerald-500 hover:shadow-xs transition-shadow">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-tight truncate">Available Balance</p>
                <div className="flex items-baseline gap-1 mt-0.5 min-w-0">
                  <span className="text-xs sm:text-sm xl:text-base font-black text-emerald-600 whitespace-nowrap truncate">
                    {(balance.availableBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-emerald-500/70 font-bold shrink-0 whitespace-nowrap">ETB</span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-emerald-600/70 mt-0.5 truncate">Ready to withdraw</p>
              </div>
              <div className="p-1 sm:p-1.5 bg-emerald-50 rounded-lg shrink-0">
                <WalletIcon className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            </div>
          </div>

          {/* Unpaid Commission */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-2.5 sm:p-3 flex flex-col justify-between border-l-[3px] border-l-red-500 hover:shadow-xs transition-shadow">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] text-red-900 font-bold uppercase tracking-tight truncate">Unpaid Comm.</p>
                <div className="flex items-baseline gap-1 mt-0.5 min-w-0">
                  <span className="text-xs sm:text-sm xl:text-base font-black text-red-600 whitespace-nowrap truncate">
                    {(balance.unpaidCommission || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-red-400 font-bold shrink-0 whitespace-nowrap">ETB</span>
                </div>
                {balance.pendingCommissionAmount > 0 && (
                  <div className="mt-0.5 flex items-center gap-1 text-[8px] text-red-600 font-bold bg-red-50 px-1 py-0.2 rounded w-fit animate-pulse">
                    <ClockIcon className="w-2.5 h-2.5" />
                    {(balance.pendingCommissionAmount || 0).toFixed(0)} pen.
                  </div>
                )}
                <p className="text-[9px] sm:text-[10px] text-red-400 mt-0.5 italic truncate">Owed to platform</p>
              </div>
              <div className="p-1 sm:p-1.5 bg-red-50 rounded-lg shrink-0">
                <ExclamationCircleIcon className="w-3.5 h-3.5 text-red-600" />
              </div>
            </div>
          </div>

          {/* Paid Commission */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-2.5 sm:p-3 flex flex-col justify-between border-l-[3px] border-l-teal-500 hover:shadow-xs transition-shadow">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] text-teal-900 font-bold uppercase tracking-tight truncate">Paid Comm.</p>
                <div className="flex items-baseline gap-1 mt-0.5 min-w-0">
                  <span className="text-xs sm:text-sm xl:text-base font-black text-teal-700 whitespace-nowrap truncate">
                    {(balance.paidCommission || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-teal-500 font-bold shrink-0 whitespace-nowrap">ETB</span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-teal-600 mt-0.5 italic truncate">Settled platform fees</p>
              </div>
              <div className="p-1 sm:p-1.5 bg-teal-50 rounded-lg shrink-0">
                <CheckBadgeIcon className="w-3.5 h-3.5 text-teal-600" />
              </div>
            </div>
          </div>

          {/* Pending Payouts */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-2.5 sm:p-3 flex flex-col justify-between border-l-[3px] border-l-amber-500 hover:shadow-xs transition-shadow">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-tight truncate">Pending Withdraws</p>
                <div className="flex items-baseline gap-1 mt-0.5 min-w-0">
                  <span className="text-xs sm:text-sm xl:text-base font-black text-amber-600 whitespace-nowrap truncate">
                    {(balance.pendingWithdrawals || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-amber-500/70 font-bold shrink-0 whitespace-nowrap">ETB</span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 truncate">
                  {balance.pendingWithdrawalsCount || 0} in progress
                </p>
              </div>
              <div className="p-1 sm:p-1.5 bg-amber-50 rounded-lg shrink-0">
                <ClockIcon className="w-3.5 h-3.5 text-amber-500" />
              </div>
            </div>
          </div>

          {/* Total Withdrawals */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-2.5 sm:p-3 flex flex-col justify-between border-l-[3px] border-l-purple-500 hover:shadow-xs transition-shadow">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-tight truncate">Total Withdrawals</p>
                <div className="flex items-baseline gap-1 mt-0.5 min-w-0">
                  <span className="text-xs sm:text-sm xl:text-base font-black text-purple-600 whitespace-nowrap truncate">
                    {(balance.totalWithdrawals || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-purple-500/70 font-bold shrink-0 whitespace-nowrap">ETB</span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 truncate">Lifetime withdrawals</p>
              </div>
              <div className="p-1 sm:p-1.5 bg-purple-50 rounded-lg shrink-0">
                <BanknotesIcon className="w-3.5 h-3.5 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Button */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={() => setShowWithdrawalModal(true)}
            disabled={!balance.availableBalance || balance.availableBalance < 500}
            className="flex-1 w-full px-3.5 py-2 sm:py-2.5 bg-ethiopian-gold text-white rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 font-bold shadow-2xs text-xs sm:text-sm active:scale-95"
          >
            <PlusIcon className="w-4 h-4" />
            Request Withdrawal
            {(!balance.availableBalance || balance.availableBalance < 500) && (
              <span className="text-[10px] font-normal opacity-80">(Min: 500 ETB)</span>
            )}
          </button>

          <button
            onClick={() => setShowCommissionModal(true)}
            className="flex-1 w-full px-3.5 py-2 sm:py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-1.5 font-bold shadow-2xs text-xs sm:text-sm active:scale-95"
          >
            <BanknotesIcon className="w-4 h-4" />
            Pay Commission Debt
          </button>
        </div>

        {/* Earnings Chart */}
        <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-3.5 sm:p-4 mb-4 sm:mb-6">
          <h2 className="text-xs sm:text-sm font-bold text-gray-900 mb-3 tracking-tight">Monthly Revenue Trend</h2>
          <EarningsChart data={monthlyEarnings} />
        </div>

        {/* History Tables Section */}
        <div className="space-y-4 sm:space-y-6">
          <TransactionsTable refreshKey={refreshKey} onUpdate={() => setRefreshKey(prev => prev + 1)} />
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
