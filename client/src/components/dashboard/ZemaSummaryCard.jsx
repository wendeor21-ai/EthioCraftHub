/**
 * Zema Summary Card Component
 * 
 * Displays a quick greeting and total sales summary
 * Fetches data from orders collection
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SparklesIcon, CurrencyDollarIcon, TrendingUpIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const ZemaSummaryCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    totalRevenue: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setSalesData(prev => ({ ...prev, loading: false, error: 'Not authenticated' }));
        return;
      }

      const response = await fetch('http://localhost:5000/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      
      // Calculate totals
      const orders = data.orders || [];
      const totalSales = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);

      setSalesData({
        totalSales,
        totalRevenue,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching sales data:', error);
      setSalesData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user?.profile?.firstName || 'Artisan';
    
    if (hour < 12) return `Good morning, ${firstName}! ☀️`;
    if (hour < 18) return `Good afternoon, ${firstName}! 🌤️`;
    return `Good evening, ${firstName}! 🌙`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-lg shadow-lg p-6 border-2 border-purple-200">
      {/* Header with Zema Branding */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">ZemaAI Insights</h3>
            <p className="text-xs text-gray-600">Your AI Business Assistant</p>
          </div>
        </div>
        
        <button
          onClick={() => navigate('/zema-ai')}
          className="px-3 py-1 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
        >
          Ask Zema
        </button>
      </div>

      {/* Greeting */}
      <div className="mb-6">
        <p className="text-xl font-semibold text-gray-800">
          {getGreeting()}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Here's a quick summary of your business performance
        </p>
      </div>

      {/* Sales Summary */}
      {salesData.loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : salesData.error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">Unable to load sales data</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Total Sales */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUpIcon className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-medium text-gray-600">Total Sales</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {salesData.totalSales}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {salesData.totalSales === 1 ? 'order' : 'orders'} completed
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
            <div className="flex items-center space-x-2 mb-2">
              <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              <span className="text-xs font-medium text-gray-600">Total Revenue</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(salesData.totalRevenue)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {salesData.totalSales > 0 
                ? `Avg: ${formatCurrency(salesData.totalRevenue / salesData.totalSales)}`
                : 'No sales yet'}
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestion */}
      <div className="mt-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 border border-purple-200">
        <div className="flex items-start space-x-3">
          <SparklesIcon className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              💡 Zema's Quick Tip
            </p>
            <p className="text-xs text-gray-700">
              {salesData.totalSales === 0 
                ? "Start by adding high-quality photos to your products. Visual appeal increases sales by 40%!"
                : salesData.totalSales < 5
                ? "You're off to a great start! Consider promoting your best-selling items on social media."
                : "Great momentum! Ask me about pricing strategies to maximize your revenue."}
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={() => navigate('/zema-ai', { 
          state: { 
            initialMessage: 'Analyze my sales performance and give me actionable recommendations.' 
          } 
        })}
        className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg"
      >
        Get Detailed AI Analysis →
      </button>
    </div>
  );
};

export default ZemaSummaryCard;
