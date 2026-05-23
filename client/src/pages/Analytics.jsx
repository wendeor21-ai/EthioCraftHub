/**
 * Analytics Page for EthioCraft Global
 * 
 * Provides artisans with insights about their products and sales
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { ArrowLeft, DollarSign, ShoppingCart, Eye, ArrowUpRight, CreditCard, AlertCircle } from 'lucide-react';
import { useCustomTranslation } from '../hooks/useCustomTranslation';

// Charts
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const Analytics = () => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30days');
  const [analytics, setAnalytics] = useState({
    overview: {
      totalRevenue: 0,
      totalOrders: 0,
      totalViews: 0,
      conversionRate: 0,
      averageOrderValue: 0,
      returnRate: 0
    },
    salesData: [],
    topProducts: [],
    customerInsights: {
      repeatCustomers: 0,
      averageOrderValue: 0,
      topRegions: []
    }
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, user?._id]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const authToken = token || localStorage.getItem('authToken');
      const userId = user?._id || user?.id;

      if (!authToken || !userId) {
        setError('Authentication required');
        setAnalytics((prev) => prev);
        return;
      }

      const response = await fetch(API_ENDPOINTS.ANALYTICS.BY_ARTISAN(userId, timeRange), {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let message = 'Failed to load analytics data';
        try {
          const json = await response.json();
          message = json.message || json.error || message;
        } catch (e) {
          // ignore
        }

        console.error('Analytics API error:', response.status, message);

        if (response.status === 401) {
          setError(t('auth.login', 'Authentication required. Please login again.'));
        } else if (response.status === 403) {
          setError(t('common.error', 'Access forbidden. You do not have permission to view these analytics.'));
        } else {
          setError(t('common.error', message));
        }

        setAnalytics({
          overview: { totalRevenue: 0, totalOrders: 0, totalViews: 0, conversionRate: 0, averageOrderValue: 0, returnRate: 0 },
          salesData: [],
          topProducts: [],
          customerInsights: { repeatCustomers: 0, averageOrderValue: 0, topRegions: [] },
        });
      } else {
        const data = await response.json();

        // Normalize response to local state shape
        const traffic = data.trafficSources && Object.keys(data.trafficSources).length ? data.trafficSources : { 'Coming Soon': 100 };

        setAnalytics({
          overview: {
            totalRevenue: data.overview?.totalRevenue || 0,
            totalOrders: data.overview?.totalOrders || 0,
            totalViews: data.overview?.totalViews || 0,
            conversionRate: data.overview?.conversionRate || 0,
            averageOrderValue: data.overview?.averageOrderValue || 0,
            returnRate: data.overview?.returnRate || 0,
          },
          salesData: Array.isArray(data.salesData) ? data.salesData : [],
          topProducts: Array.isArray(data.topProducts)
            ? data.topProducts.map((p) => ({ name: p.name || p.productName || 'Product', revenue: p.revenue || p.total || 0 }))
            : [],
          topLocations: Array.isArray(data.topLocations) ? data.topLocations : [],
          peakHours: Array.isArray(data.peakHours) ? data.peakHours : [],
          loyalCustomers: Array.isArray(data.loyalCustomers) ? data.loyalCustomers : [],
          trafficSources: traffic,
          customerInsights: {
            repeatCustomers: data.customerInsights?.repeatCustomers || 0,
            averageOrderValue: data.overview?.averageOrderValue || 0,
            topRegions: data.customerInsights?.topRegions || [],
          },
        });
        setError('');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Unable to connect to server. Please ensure the backend is running.');
      setAnalytics({
        overview: { totalRevenue: 0, totalOrders: 0, totalViews: 0, conversionRate: 0, averageOrderValue: 0, returnRate: 0 },
        salesData: [],
        topProducts: [],
        peakHours: [],
        loyalCustomers: [],
        customerInsights: { repeatCustomers: 0, averageOrderValue: 0, topRegions: [] }
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return `0 ${t('product.price_unit', 'ETB')}`;
    return `${Number(amount).toFixed(2)} ${t('product.price_unit', 'ETB')}`;
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // derived metrics
  const avgOrderValue = analytics.overview.totalOrders
    ? analytics.overview.totalRevenue / analytics.overview.totalOrders
    : 0;

  const hasData = analytics.salesData.length || analytics.overview.totalOrders;

  // chart datasets (computed when data exists)
  const salesLabels = analytics.salesData.map((d) => new Date(d.date).toLocaleDateString());
  const salesValues = analytics.salesData.map((d) => d.revenue || 0);

  const salesChartData = {
    labels: salesLabels,
    datasets: [
      {
        label: t('artisan_panel.total_revenue', 'Revenue'),
        data: salesValues,
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15,118,110,0.08)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const topProductsData = {
    labels: (analytics.topProducts || []).map((p) => p.name || 'Product'),
    datasets: [
      {
        label: t('artisan_panel.total_revenue', 'Revenue'),
        data: (analytics.topProducts || []).map((p) => p.revenue || 0),
        backgroundColor: ['#10b981', '#0ea5a4', '#2563eb'], // Max top 3
      },
    ],
  };

  const trafficSources = analytics.trafficSources && Object.keys(analytics.trafficSources).length > 0 
    ? analytics.trafficSources 
    : { 'Local Area': 1 };
    
  const locationsData = {
    labels: Object.keys(trafficSources),
    datasets: [
      {
        data: Object.values(trafficSources),
        backgroundColor: ['#0ea5a4', '#2563eb', '#f59e0b', '#7c3aed', '#ef4444'],
      },
    ],
  };

  // Prepare Peak Hours Data
  const formatHour = (h) => {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  };

  const peakHoursData = analytics.peakHours || [];
  const hoursLabels = Array.from({ length: 24 }, (_, i) => formatHour(i));
  const hoursDataMap = {};
  peakHoursData.forEach(ph => {
    hoursDataMap[ph.hour] = ph.count;
  });
  
  const hourlyData = Array.from({ length: 24 }, (_, i) => hoursDataMap[i] || 0);
  
  const peakChartData = {
    labels: hoursLabels,
    datasets: [
      {
        label: t('nav.cart', 'Orders'),
        data: hourlyData,
        backgroundColor: '#f59e0b',
        borderRadius: 4,
      }
    ]
  };

  const top3Hours = [...peakHoursData].sort((a, b) => b.count - a.count).slice(0, 3);
  const top3Text = top3Hours.length > 0
    ? t('artisan_panel.busiest_at', `Busiest at {{hours}}`, { hours: top3Hours.map(h => formatHour(h.hour)).join(', ') })
    : t('errors.no_data', 'No data yet');

  return (
    <DashboardLayout hideSidebar title={t('artisan_panel.product_analytics', 'Business Analytics & Insights')}>
      <div className="w-full px-4 py-8">
        {/* top navigation + filter */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-6">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <button
              onClick={() => navigate('/artisan/dashboard')}
              className="flex items-center text-ethiopian-gold hover:text-ethiopian-earth transition"
            >
              <ArrowLeft size={20} className="mr-2" /> {t('common.back', 'Back to Dashboard')}
            </button>
            <h1 className="text-2xl font-bold">{t('artisan_panel.product_analytics', 'Business Analytics & Insights')}</h1>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
          >
            <option value="7days">{t('common.last_7_days', 'Last 7 Days')}</option>
            <option value="30days">{t('common.last_30_days', 'Last 30 Days')}</option>
            <option value="90days">{t('common.last_6_months', 'Last 6 Months')}</option>
            <option value="1year">{t('common.this_year', 'This Year')}</option>
          </select>
        </div>

        {error && <ErrorMessage message={error} className="mb-6" />}

        {!hasData && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2">
              {t('errors.generic', 'Keep selling! Your analytics will appear here as soon as you make your first sale.')}
            </h3>
            <p className="text-gray-600">{t('common.search', 'Start adding products and promoting your shop.')}</p>
          </div>
        )}

        {hasData && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-emerald-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('artisan_panel.total_revenue', 'Total Revenue')}</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(analytics.overview.totalRevenue)}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('artisan_panel.orders', 'Total Orders')}</p>
                    <p className="text-2xl font-bold text-blue-600">{analytics.overview.totalOrders}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-cyan-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('dashboard.store_views', 'Store Visits')}</p>
                    <p className="text-2xl font-bold text-cyan-600">{analytics.overview.totalViews.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-cyan-100 rounded-lg">
                    <Eye className="w-6 h-6 text-cyan-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-amber-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('dashboard.conversion_rate', 'Conversion Rate')}</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {formatPercentage(analytics.overview.conversionRate)}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <ArrowUpRight className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-teal-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('analytics.avg_order_value', 'Avg. Order Value')}</p>
                    <p className="text-2xl font-bold text-teal-600">{formatCurrency(analytics.overview.averageOrderValue)}</p>
                  </div>
                  <div className="p-3 bg-teal-100 rounded-lg">
                    <CreditCard className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('analytics.return_cancel_rate', 'Return & Cancel Rate')}</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatPercentage(analytics.overview.returnRate)}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Sales Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('artisan_panel.sales_trend', 'Sales Trend')}</h3>
            <div className="h-56 sm:h-64">
              <Line
                data={salesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
                }}
              />
            </div>
            <div className="mt-4 text-center">
              <span className="text-sm text-gray-600">{t('artisan_panel.daily_revenue', 'Daily Revenue (ETB)')}</span>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('artisan_panel.top_selling_products', 'Top Selling Products')}</h3>
            <div className="h-56 sm:h-64">
              <Bar
                data={topProductsData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
          </div>

          {/* Top Locations (Pie Chart) */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('artisan_panel.top_customer_locations', 'Top Customer Locations')}</h3>
            <div className="h-56 sm:h-64 flex items-center justify-center">
              <div className="w-48 h-48">
                <Doughnut
                  data={locationsData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600 text-center">
              {Object.entries(trafficSources).map(([k, v]) => `${k} (${v})`).join(' — ')}
            </div>
          </div>
        </div>

        {/* Customer Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Customers */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('artisan_panel.customer_loyalty', 'Customer Loyalty (Top 5)')}</h3>
            <div className="space-y-4">
              {analytics.loyalCustomers && analytics.loyalCustomers.length > 0 ? (
                analytics.loyalCustomers.map((customer, index) => (
                  <div key={index} className="flex justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-gray-800">{customer.name || 'Anonymous Valued Customer'}</p>
                      <p className="text-sm text-gray-500">{customer.email || 'Email not provided'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-ethiopian-gold">{formatCurrency(customer.totalSpent)}</p>
                      <p className="text-sm text-gray-600">{customer.orders} orders</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">{t('artisan_panel.no_loyal_customers', 'No loyal customers yet.')}</p>
              )}
            </div>
          </div>

          {/* Peak Shopping Hours */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('artisan_panel.peak_shopping_hours_title', 'Peak Shopping Hours')}</h3>
            <p className="text-sm text-gray-600 mb-4">{top3Text}</p>
            <div className="h-64">
              <Bar
                data={peakChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                }}
              />
            </div>
            {top3Hours.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-sm text-amber-800 font-medium flex items-center gap-2">💡 {t('artisan_panel.insight_tip', 'Insight')}</p>
                <p className="text-sm text-amber-700 mt-1">
                  {t('artisan_panel.peak_hour_suggestion', 'Your customers are most active around {{hour}}. Consider posting new products then!', { hour: formatHour(top3Hours[0]?.hour) })}
                </p>
              </div>
            )}
          </div>
        </div> {/* end customer insights grid */}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;