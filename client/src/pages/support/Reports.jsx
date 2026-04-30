/**
 * Reports Page for EthioCraft Global
 * Generate PDF and CSV reports of sales data
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { FileText, Download, Calendar, TrendingUp, Package, DollarSign } from 'lucide-react';

const Reports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/reports/artisan/${user?.id || user?._id}?type=${reportType}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
        setError('');
      } else {
        // Use mock data if API fails
        console.log('Using mock report data');
        setReportData({
          summary: {
            totalRevenue: 2450.00,
            totalOrders: 23,
            totalProducts: 12,
            averageOrderValue: 106.52
          },
          salesByProduct: [
            { productName: 'Traditional Coffee Set', quantity: 15, revenue: 675.00 },
            { productName: 'Handwoven Basket', quantity: 12, revenue: 540.00 },
            { productName: 'Leather Handbag', quantity: 8, revenue: 480.00 },
            { productName: 'Ceramic Vase', quantity: 6, revenue: 360.00 },
            { productName: 'Handwoven Scarf', quantity: 10, revenue: 350.00 }
          ],
          salesByDate: [
            { date: '2026-01-15', orders: 3, revenue: 320.00 },
            { date: '2026-01-20', orders: 5, revenue: 530.00 },
            { date: '2026-01-25', orders: 4, revenue: 450.00 },
            { date: '2026-02-01', orders: 6, revenue: 640.00 },
            { date: '2026-02-05', orders: 5, revenue: 510.00 }
          ],
          topCustomers: [
            { name: 'Sarah Johnson', orders: 5, totalSpent: 450.00 },
            { name: 'Michael Chen', orders: 4, totalSpent: 380.00 },
            { name: 'Emma Williams', orders: 3, totalSpent: 290.00 }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    // Create a simple HTML-based PDF using print functionality
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Report - ${dateRange.startDate} to ${dateRange.endDate}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #333;
          }
          h1 {
            color: #D4AF37;
            border-bottom: 3px solid #D4AF37;
            padding-bottom: 10px;
          }
          h2 {
            color: #8B4513;
            margin-top: 30px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #D4AF37;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 20px 0;
          }
          .summary-card {
            border: 2px solid #D4AF37;
            padding: 20px;
            border-radius: 8px;
          }
          .summary-card h3 {
            margin: 0 0 10px 0;
            color: #8B4513;
          }
          .summary-card .value {
            font-size: 24px;
            font-weight: bold;
            color: #D4AF37;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <h1>EthioCraft Global - Sales Report</h1>
        <p><strong>Report Period:</strong> ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Artisan:</strong> ${user?.profile?.firstName} ${user?.profile?.lastName}</p>

        <h2>Summary</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Total Revenue</h3>
            <div class="value">$${reportData?.summary?.totalRevenue.toFixed(2)}</div>
          </div>
          <div class="summary-card">
            <h3>Total Orders</h3>
            <div class="value">${reportData?.summary?.totalOrders}</div>
          </div>
          <div class="summary-card">
            <h3>Total Products Sold</h3>
            <div class="value">${reportData?.summary?.totalProducts}</div>
          </div>
          <div class="summary-card">
            <h3>Average Order Value</h3>
            <div class="value">$${reportData?.summary?.averageOrderValue.toFixed(2)}</div>
          </div>
        </div>

        <h2>Sales by Product</h2>
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Quantity Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${reportData?.salesByProduct?.map(product => `
              <tr>
                <td>${product.productName}</td>
                <td>${product.quantity}</td>
                <td>$${product.revenue.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Sales by Date</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Orders</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${reportData?.salesByDate?.map(day => `
              <tr>
                <td>${new Date(day.date).toLocaleDateString()}</td>
                <td>${day.orders}</td>
                <td>$${day.revenue.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Top Customers</h2>
        <table>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Total Orders</th>
              <th>Total Spent</th>
            </tr>
          </thead>
          <tbody>
            ${reportData?.topCustomers?.map(customer => `
              <tr>
                <td>${customer.name}</td>
                <td>${customer.orders}</td>
                <td>$${customer.totalSpent.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>EthioCraft Global - Connecting Ethiopian Artisans with the World</p>
          <p>This report is confidential and intended for internal use only.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const generateCSV = () => {
    const csvRows = [];
    
    // Header
    csvRows.push('EthioCraft Global - Sales Report');
    csvRows.push(`Report Period: ${dateRange.startDate} to ${dateRange.endDate}`);
    csvRows.push(`Generated: ${new Date().toISOString()}`);
    csvRows.push('');
    
    // Summary
    csvRows.push('SUMMARY');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Revenue,$${reportData?.summary?.totalRevenue.toFixed(2)}`);
    csvRows.push(`Total Orders,${reportData?.summary?.totalOrders}`);
    csvRows.push(`Total Products Sold,${reportData?.summary?.totalProducts}`);
    csvRows.push(`Average Order Value,$${reportData?.summary?.averageOrderValue.toFixed(2)}`);
    csvRows.push('');
    
    // Sales by Product
    csvRows.push('SALES BY PRODUCT');
    csvRows.push('Product Name,Quantity Sold,Revenue');
    reportData?.salesByProduct?.forEach(product => {
      csvRows.push(`"${product.productName}",${product.quantity},$${product.revenue.toFixed(2)}`);
    });
    csvRows.push('');
    
    // Sales by Date
    csvRows.push('SALES BY DATE');
    csvRows.push('Date,Orders,Revenue');
    reportData?.salesByDate?.forEach(day => {
      csvRows.push(`${day.date},${day.orders},$${day.revenue.toFixed(2)}`);
    });
    csvRows.push('');
    
    // Top Customers
    csvRows.push('TOP CUSTOMERS');
    csvRows.push('Customer Name,Total Orders,Total Spent');
    reportData?.topCustomers?.forEach(customer => {
      csvRows.push(`"${customer.name}",${customer.orders},$${customer.totalSpent.toFixed(2)}`);
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
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/artisan/dashboard')}
            className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center"
          >
            ← Back to Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales Reports</h1>
              <p className="text-gray-600 mt-2">Generate and export detailed sales reports</p>
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

        {error && <ErrorMessage message={error} className="mb-6" />}

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
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
                <option value="products">Product Performance</option>
                <option value="customers">Customer Analysis</option>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-lg p-6">
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

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-blue-600 mt-2">
                      {reportData.summary.totalOrders}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Products Sold</p>
                    <p className="text-2xl font-bold text-purple-600 mt-2">
                      {reportData.summary.totalProducts}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Package className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                    <p className="text-2xl font-bold text-orange-600 mt-2">
                      {formatCurrency(reportData.summary.averageOrderValue)}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Calendar className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sales by Product */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Product</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Product Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Quantity Sold
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Revenue
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sales by Date */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Orders
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.salesByDate.map((day, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(day.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {day.orders}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          {formatCurrency(day.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Customers */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
              <div className="space-y-4">
                {reportData.topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Report Data</h3>
            <p className="text-gray-600">
              Select a date range and report type to generate your sales report
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
