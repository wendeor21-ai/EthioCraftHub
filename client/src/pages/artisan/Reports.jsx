/**
 * Professional Artisan Sales & Performance Reports
 * Enhanced with charts, analytics, and export functionality
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  Package, 
  DollarSign,
  Users,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const Reports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState('sales');

  useEffect(() => {
    fetchReportData();
  }, [dateRange, reportType]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      // Fetch real data from earnings and orders
      const [transactionsRes, ordersRes] = await Promise.all([
        api.get('/earnings/transactions'),
        api.get('/orders')
      ]);

      const transactions = transactionsRes.data.transactions || [];
      const orders = ordersRes.data.orders || [];

      // Filter completed orders in date range
      const completedOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        return o.status === 'completed' && orderDate >= start && orderDate <= end;
      });

      // Calculate summary
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totals?.total || 0), 0);
      const platformFees = totalRevenue * 0.15;
      const netIncome = totalRevenue - platformFees;

      // Group by product
      const productSales = {};
      completedOrders.forEach(order => {
        order.items?.forEach(item => {
          const productId = item.product?._id || item.product;
          const productName = item.product?.name || 'Unknown Product';
          if (!productSales[productId]) {
            productSales[productId] = {
              productName,
              quantity: 0,
              revenue: 0,
              stock: item.product?.inventory?.quantity || 0
            };
          }
          productSales[productId].quantity += item.quantity;
          productSales[productId].revenue += item.price * item.quantity;
        });
      });

      // Group by category
      const categorySales = {};
      completedOrders.forEach(order => {
        order.items?.forEach(item => {
          const category = item.product?.category || 'Uncategorized';
          if (!categorySales[category]) {
            categorySales[category] = 0;
          }
          categorySales[category] += item.price * item.quantity;
        });
      });

      // Group by month
      const monthlySales = {};
      completedOrders.forEach(order => {
        const month = new Date(order.createdAt).toISOString().slice(0, 7);
        if (!monthlySales[month]) {
          monthlySales[month] = 0;
        }
        monthlySales[month] += order.totals?.total || 0;
      });

      // Top customers
      const customerSpending = {};
      completedOrders.forEach(order => {
        const customerId = order.customer?._id;
        const customerName = `${order.customer?.profile?.firstName || ''} ${order.customer?.profile?.lastName || ''}`.trim() || 'Anonymous';
        if (!customerSpending[customerId]) {
          customerSpending[customerId] = {
            name: customerName,
            orders: 0,
            totalSpent: 0
          };
        }
        customerSpending[customerId].orders += 1;
        customerSpending[customerId].totalSpent += order.totals?.total || 0;
      });

      const topCustomers = Object.values(customerSpending)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      setReportData({
        summary: {
          totalRevenue,
          platformFees,
          netIncome,
          totalOrders: completedOrders.length,
          totalProducts: Object.keys(productSales).length,
          averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0
        },
        salesByProduct: Object.values(productSales).sort((a, b) => b.revenue - a.revenue),
        salesByCategory: categorySales,
        monthlySales,
        topCustomers
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Add logo/header
    doc.setFontSize(20);
    doc.setTextColor(217, 119, 6); // ethiopian-gold
    doc.text('EthioCraft Global', 14, 20);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Sales & Performance Report', 14, 30);
    
    // Report details
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Artisan: ${user?.profile?.firstName} ${user?.profile?.lastName}`, 14, 40);
    doc.text(`Period: ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`, 14, 46);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 52);
    
    // Summary section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Summary', 14, 65);
    
    const summaryData = [
      ['Total Revenue', `${reportData.summary.totalRevenue.toFixed(2)} ETB`],
      ['Platform Fees (15%)', `${reportData.summary.platformFees.toFixed(2)} ETB`],
      ['Net Income', `${reportData.summary.netIncome.toFixed(2)} ETB`],
      ['Total Orders', reportData.summary.totalOrders.toString()],
      ['Products Sold', reportData.summary.totalProducts.toString()],
      ['Average Order Value', `${reportData.summary.averageOrderValue.toFixed(2)} ETB`]
    ];
    
    doc.autoTable({
      startY: 70,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6] }
    });
    
    // Product performance
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Product Performance', 14, 20);
    
    const productData = reportData.salesByProduct.map(p => [
      p.productName,
      p.quantity.toString(),
      `${p.revenue.toFixed(2)} ETB`,
      p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'
    ]);
    
    doc.autoTable({
      startY: 25,
      head: [['Product Name', 'Units Sold', 'Revenue', 'Stock Status']],
      body: productData,
      theme: 'striped',
      headStyles: { fillColor: [217, 119, 6] }
    });
    
    // Top customers
    if (reportData.topCustomers.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Top Customers', 14, 20);
      
      const customerData = reportData.topCustomers.map(c => [
        c.name,
        c.orders.toString(),
        `${c.totalSpent.toFixed(2)} ETB`
      ]);
      
      doc.autoTable({
        startY: 25,
        head: [['Customer Name', 'Total Orders', 'Total Spent']],
        body: customerData,
        theme: 'striped',
        headStyles: { fillColor: [217, 119, 6] }
      });
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    doc.save(`sales-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`);
    toast.success('PDF report generated successfully');
  };

  const generateCSV = () => {
    const csvRows = [];
    
    // Header
    csvRows.push('EthioCraft Global - Sales Report');
    csvRows.push(`Artisan: ${user?.profile?.firstName} ${user?.profile?.lastName}`);
    csvRows.push(`Period: ${dateRange.startDate} to ${dateRange.endDate}`);
    csvRows.push(`Generated: ${new Date().toISOString()}`);
    csvRows.push('');
    
    // Summary
    csvRows.push('SUMMARY');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Revenue,${reportData.summary.totalRevenue.toFixed(2)}`);
    csvRows.push(`Platform Fees (15%),${reportData.summary.platformFees.toFixed(2)}`);
    csvRows.push(`Net Income,${reportData.summary.netIncome.toFixed(2)}`);
    csvRows.push(`Total Orders,${reportData.summary.totalOrders}`);
    csvRows.push(`Products Sold,${reportData.summary.totalProducts}`);
    csvRows.push(`Average Order Value,${reportData.summary.averageOrderValue.toFixed(2)}`);
    csvRows.push('');
    
    // Product performance
    csvRows.push('PRODUCT PERFORMANCE');
    csvRows.push('Product Name,Units Sold,Revenue,Stock Status');
    reportData.salesByProduct.forEach(p => {
      csvRows.push(`"${p.productName}",${p.quantity},${p.revenue.toFixed(2)},${p.stock > 0 ? p.stock + ' in stock' : 'Out of stock'}`);
    });
    csvRows.push('');
    
    // Category breakdown
    csvRows.push('CATEGORY BREAKDOWN');
    csvRows.push('Category,Revenue');
    Object.entries(reportData.salesByCategory).forEach(([category, revenue]) => {
      csvRows.push(`"${category}",${revenue.toFixed(2)}`);
    });
    csvRows.push('');
    
    // Top customers
    csvRows.push('TOP CUSTOMERS');
    csvRows.push('Customer Name,Total Orders,Total Spent');
    reportData.topCustomers.forEach(c => {
      csvRows.push(`"${c.name}",${c.orders},${c.totalSpent.toFixed(2)}`);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('CSV report exported successfully');
  };

  const formatCurrency = (amount) => {
    return `${amount.toFixed(2)} ETB`;
  };

  // Prepare chart data
  const monthlyChartData = reportData ? {
    labels: Object.keys(reportData.monthlySales).sort(),
    datasets: [{
      label: 'Monthly Revenue (ETB)',
      data: Object.keys(reportData.monthlySales).sort().map(month => reportData.monthlySales[month]),
      backgroundColor: 'rgba(217, 119, 6, 0.8)',
      borderColor: 'rgba(217, 119, 6, 1)',
      borderWidth: 1
    }]
  } : null;

  const categoryChartData = reportData ? {
    labels: Object.keys(reportData.salesByCategory),
    datasets: [{
      label: 'Revenue by Category (ETB)',
      data: Object.values(reportData.salesByCategory),
      backgroundColor: [
        'rgba(217, 119, 6, 0.8)',
        'rgba(139, 69, 19, 0.8)',
        'rgba(255, 193, 7, 0.8)',
        'rgba(76, 175, 80, 0.8)',
        'rgba(33, 150, 243, 0.8)',
        'rgba(156, 39, 176, 0.8)'
      ],
      borderWidth: 1
    }]
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/artisan/dashboard')}
            className="text-ethiopian-gold hover:text-ethiopian-earth mb-4"
          >
            ← Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales & Performance Reports</h1>
              <p className="text-gray-600 mt-2">Comprehensive analytics and insights</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={generatePDF}
                disabled={!reportData || loading}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 shadow-lg disabled:opacity-50"
              >
                <FileText className="w-5 h-5" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={generateCSV}
                disabled={!reportData || loading}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 shadow-lg disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
              >
                <option value="sales">Sales Report</option>
                <option value="inventory">Inventory Report</option>
                <option value="tax">Tax Summary</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        ) : reportData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                      {formatCurrency(reportData.summary.totalRevenue)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Net Income</p>
                    <p className="text-2xl font-bold text-ethiopian-gold mt-2">
                      {formatCurrency(reportData.summary.netIncome)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">After 15% platform fee</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <TrendingUp className="w-6 h-6 text-ethiopian-gold" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-blue-600 mt-2">
                      {reportData.summary.totalOrders}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                    <p className="text-2xl font-bold text-purple-600 mt-2">
                      {formatCurrency(reportData.summary.averageOrderValue)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Fee vs Net Income Tracker */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-ethiopian-gold" />
                Fee vs. Net Income Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Gross Revenue</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(reportData.summary.totalRevenue)}
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Platform Fees (15%)</p>
                  <p className="text-3xl font-bold text-red-600">
                    -{formatCurrency(reportData.summary.platformFees)}
                  </p>
                </div>
                <div className="text-center p-4 bg-ethiopian-gold bg-opacity-10 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Your Net Income</p>
                  <p className="text-3xl font-bold text-ethiopian-gold">
                    {formatCurrency(reportData.summary.netIncome)}
                  </p>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Monthly Income Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-ethiopian-gold" />
                  Monthly Income Trend
                </h3>
                {monthlyChartData && (
                  <Bar 
                    data={monthlyChartData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: false },
                        title: { display: false }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: (value) => `${value} ETB`
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>

              {/* Category Breakdown Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-ethiopian-gold" />
                  Category Sales Breakdown
                </h3>
                {categoryChartData && (
                  <Pie 
                    data={categoryChartData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'bottom' }
                      }
                    }}
                  />
                )}
              </div>
            </div>
            {/* Product Performance Table */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Product Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Units Sold
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Stock Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.salesByProduct.map((product, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {product.productName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {product.quantity}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          {formatCurrency(product.revenue)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {product.stock > 0 ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                              {product.stock} in stock
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                              Out of stock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Customers */}
            {reportData.topCustomers.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-ethiopian-gold" />
                  Top Customers
                </h3>
                <div className="space-y-4">
                  {reportData.topCustomers.map((customer, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-ethiopian-gold text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="text-sm text-gray-600">{customer.orders} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatCurrency(customer.totalSpent)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Avg: {formatCurrency(customer.totalSpent / customer.orders)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Report Data</h3>
            <p className="text-gray-600">
              Select a date range to generate your sales report
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
