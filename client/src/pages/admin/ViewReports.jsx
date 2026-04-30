/**
 * View Reports Page for EthioCraft Global Admin
 * 
 * Provides comprehensive analytics and reports for platform management
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ViewReports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days');
  const [reportData, setReportData] = useState({
    overview: {
      totalRevenue: 12450.00,
      totalOrders: 234,
      totalUsers: 1234,
      activeArtisans: 89,
      growthRate: 15.3
    },
    revenueByMonth: [
      { month: 'Jan', revenue: 8500, orders: 145 },
      { month: 'Feb', revenue: 12450, orders: 234 }
    ],
    topArtisans: [
      {
        name: 'Sarah Bekele',
        products: 12,
        sales: 45,
        revenue: 2025.00,
        rating: 4.8
      },
      {
        name: 'Daniel Haile',
        products: 8,
        sales: 32,
        revenue: 1680.00,
        rating: 4.6
      },
      {
        name: 'Emma Tadesse',
        products: 5,
        sales: 28,
        revenue: 1260.00,
        rating: 4.9
      }
    ],
    topProducts: [
      { name: 'Traditional Coffee Set', sales: 45, revenue: 2025.00 },
      { name: 'Handwoven Basket', sales: 38, revenue: 1330.00 },
      { name: 'Leather Handbag', sales: 32, revenue: 2880.00 },
      { name: 'Ceramic Vase', sales: 28, revenue: 1680.00 }
    ],
    categoryBreakdown: [
      { category: 'Pottery', sales: 89, revenue: 4005.00, percentage: 32 },
      { category: 'Basketry', sales: 76, revenue: 2660.00, percentage: 21 },
      { category: 'Leather Goods', sales: 54, revenue: 4860.00, percentage: 39 },
      { category: 'Textiles', sales: 15, revenue: 925.00, percentage: 8 }
    ],
    userGrowth: {
      newUsers: 156,
      newArtisans: 12,
      newCustomers: 144,
      retentionRate: 78
    },
    regionalSales: [
      { region: 'Addis Ababa', orders: 98, revenue: 5220.00 },
      { region: 'Dire Dawa', orders: 45, revenue: 2340.00 },
      { region: 'Bahir Dar', orders: 38, revenue: 1980.00 },
      { region: 'Gondar', orders: 32, revenue: 1680.00 },
      { region: 'Other', orders: 21, revenue: 1230.00 }
    ]
  });

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeRange]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const exportReport = (format) => {
    alert(`Exporting report as ${format.toUpperCase()}...`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center"
          >
            ← Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Platform Reports</h1>
              <p className="text-gray-600 mt-2">Comprehensive analytics and insights</p>
            </div>
            <div className="flex space-x-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="1year">Last year</option>
              </select>
              <button
                onClick={() => exportReport('pdf')}
                className="bg-ethiopian-gold text-white px-4 py-2 rounded-lg hover:bg-ethiopian-earth transition-colors"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <div className="p-2 bg-green-100 rounded-full">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(reportData.overview.totalRevenue)}
            </p>
            <p className="text-sm text-green-600 mt-1">
              +{formatPercentage(reportData.overview.growthRate)} vs last period
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <div className="p-2 bg-blue-100 rounded-full">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{reportData.overview.totalOrders}</p>
            <p className="text-sm text-blue-600 mt-1">+12.3% vs last period</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <div className="p-2 bg-purple-100 rounded-full">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{reportData.overview.totalUsers}</p>
            <p className="text-sm text-purple-600 mt-1">+8.7% vs last period</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Active Artisans</p>
              <div className="p-2 bg-orange-100 rounded-full">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{reportData.overview.activeArtisans}</p>
            <p className="text-sm text-orange-600 mt-1">+5.2% vs last period</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <div className="p-2 bg-ethiopian-gold bg-opacity-20 rounded-full">
                <svg className="w-4 h-4 text-ethiopian-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(reportData.overview.totalRevenue / reportData.overview.totalOrders)}
            </p>
            <p className="text-sm text-ethiopian-gold mt-1">+3.1% vs last period</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            <div className="h-64 flex items-end justify-between space-x-2">
              {reportData.revenueByMonth.map((month, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div
                    className="bg-ethiopian-gold rounded-t w-full"
                    style={{
                      height: `${(month.revenue / Math.max(...reportData.revenueByMonth.map(m => m.revenue))) * 200}px`
                    }}
                  ></div>
                  <span className="text-xs text-gray-600 mt-2">{month.month}</span>
                  <span className="text-xs font-semibold text-gray-900">{formatCurrency(month.revenue)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h3>
            <div className="space-y-4">
              {reportData.categoryBreakdown.map((cat, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(cat.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-ethiopian-gold h-2 rounded-full"
                      style={{ width: `${cat.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">{cat.sales} sales</span>
                    <span className="text-xs text-gray-500">{cat.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Artisans */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Artisans</h3>
            <div className="space-y-4">
              {reportData.topArtisans.map((artisan, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-ethiopian-gold text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{artisan.name}</p>
                      <p className="text-sm text-gray-600">
                        {artisan.products} products • {artisan.sales} sales
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(artisan.revenue)}</p>
                    <p className="text-sm text-gray-600">⭐ {artisan.rating}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Best Selling Products</h3>
            <div className="space-y-4">
              {reportData.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-ethiopian-green text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.sales} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Regional Sales & User Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Regional Sales */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Region</h3>
            <div className="space-y-3">
              {reportData.regionalSales.map((region, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{region.region}</span>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(region.revenue)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-ethiopian-red h-2 rounded-full"
                        style={{ 
                          width: `${(region.orders / Math.max(...reportData.regionalSales.map(r => r.orders))) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{region.orders} orders</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Growth */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{reportData.userGrowth.newUsers}</p>
                <p className="text-sm text-gray-600 mt-1">New Users</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">{reportData.userGrowth.newArtisans}</p>
                <p className="text-sm text-gray-600 mt-1">New Artisans</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{reportData.userGrowth.newCustomers}</p>
                <p className="text-sm text-gray-600 mt-1">New Customers</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-3xl font-bold text-orange-600">{reportData.userGrowth.retentionRate}%</p>
                <p className="text-sm text-gray-600 mt-1">Retention Rate</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewReports;
