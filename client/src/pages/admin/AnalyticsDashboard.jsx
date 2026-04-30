import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { adminAPI } from '../../utils/api';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('daily');
  const [range, setRange] = useState(30);
  const [data, setData] = useState({ overview: {}, salesData: [], userGrowth: [], topProducts: [], topCategories: [], traffic: {} });

  useEffect(() => { fetchAnalytics(); }, [view, range]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true); setError('');
      const res = await adminAPI.getAnalytics({ view, range });
      setData(res.data || res);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
      setError('Failed to load analytics');
    } finally { setLoading(false); }
  };

  const exportCSV = () => {
    try {
      const rows = [];
      rows.push(['Metric','Value']);
      rows.push(['Total Revenue', data.overview?.totalRevenue || 0]);
      rows.push(['Total Orders', data.overview?.totalOrders || 0]);
      rows.push([]);
      rows.push(['Sales Date','Revenue','Orders']);
      (data.salesData || []).forEach(s => rows.push([s._id, s.revenue || 0, s.orders || 0]));
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${view}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('CSV exported');
    } catch (e) {
      console.error(e); toast.error('Export failed');
    }
  };

  const salesChart = useMemo(() => {
    const labels = (data.salesData || []).map(d => d._id);
    const revenue = (data.salesData || []).map(d => d.revenue || 0);
    return {
      labels,
      datasets: [
        { label: 'Revenue', data: revenue, backgroundColor: 'rgba(245,158,11,0.6)', borderColor: 'rgba(245,158,11,1)', tension: 0.2 }
      ]
    };
  }, [data]);

  const usersChart = useMemo(() => {
    const labels = (data.userGrowth || []).map(d => d._id);
    const vals = (data.userGrowth || []).map(d => d.newUsers || 0);
    return { labels, datasets: [{ label: 'New Users', data: vals, backgroundColor: 'rgba(16,185,129,0.6)', borderColor: 'rgba(16,185,129,1)' }] };
  }, [data]);

        const exportExcel = async () => {
          try {
            toast.loading('Preparing Excel...');
            // Fetch detailed orders for selected period
            const ordersRes = await adminAPI.getAnalyticsOrders({ view, range });
            const orders = (ordersRes.data && ordersRes.data.orders) || [];

            const wb = new ExcelJS.Workbook();
            wb.creator = 'EthioCraft Admin';
            wb.created = new Date();

            // Overview sheet
            const sheetOverview = wb.addWorksheet('Overview');
            sheetOverview.properties.defaultRowHeight = 18;
            sheetOverview.addRow(['Metric', 'Value']);
            sheetOverview.addRow(['Total Revenue', data.overview?.totalRevenue || 0]);
            sheetOverview.addRow(['Total Orders', data.overview?.totalOrders || 0]);
            const avgOrderValue = (data.overview?.totalOrders ? (data.overview.totalRevenue / data.overview.totalOrders) : 0);
            sheetOverview.addRow(['Average Order Value', avgOrderValue]);
            // Active artisans - try to compute from topProducts artisan unique count or query not available; fall back to 0
            sheetOverview.addRow(['Total Active Artisans', data.stats?.activeArtisans || 0]);
            // Style header
            sheetOverview.getRow(1).font = { bold: true };
            sheetOverview.getRow(1).fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFF59E0B'} };
            sheetOverview.views = [{state: 'frozen', ySplit:1}];

            // Sales Details sheet
            const sheetSales = wb.addWorksheet('Sales Details');
            const salesHeader = ['Date', 'Order ID', 'Order Number', 'Customer Email', 'Subtotal', 'Tax', 'Total'];
            sheetSales.addRow(salesHeader);
            sheetSales.getRow(1).font = { bold: true };
            sheetSales.getRow(1).fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFBFBFBF'} };
            sheetSales.views = [{state: 'frozen', ySplit:1}];

            orders.forEach(o => {
              sheetSales.addRow([
                new Date(o.date),
                o.orderId,
                o.orderNumber || '',
                o.customerEmail,
                o.subtotal || 0,
                o.tax || 0,
                o.total || 0,
              ]);
            });

            // Format currency columns (E, F, G)
            ['E','F','G'].forEach(col => {
              sheetSales.getColumn(col).numFmt = '"ETB" #,##0.00';
            });

            // Artisan Growth sheet
            const sheetGrowth = wb.addWorksheet('Artisan Growth');
            sheetGrowth.addRow(['Period', 'New Users']);
            sheetGrowth.getRow(1).font = { bold: true };
            sheetGrowth.views = [{state: 'frozen', ySplit:1}];
            (data.userGrowth || []).forEach(u => sheetGrowth.addRow([u._id, u.newUsers || 0]));

            // Top Products sheet
            const sheetTop = wb.addWorksheet('Top Products');
            sheetTop.addRow(['Title', 'Category', 'Artisan', 'Quantity Sold', 'Revenue']);
            sheetTop.getRow(1).font = { bold: true };
            sheetTop.views = [{state: 'frozen', ySplit:1}];
            (data.topProducts || []).forEach(p => {
              sheetTop.addRow([p.name || '', p.category || '', p.artisanName || '', p.qty || 0, p.revenue || 0]);
            });
            sheetTop.getColumn('E').numFmt = '"ETB" #,##0.00';

            // Auto-size columns for all sheets
            [sheetOverview, sheetSales, sheetGrowth, sheetTop].forEach(sheet => {
              sheet.columns.forEach(col => {
                let maxLength = 10;
                col.eachCell({ includeEmpty: true }, cell => {
                  const v = cell.value;
                  const len = v ? v.toString().length : 0;
                  if (len > maxLength) maxLength = len;
                });
                col.width = Math.min(maxLength + 4, 60);
              });
            });

            const buf = await wb.xlsx.writeBuffer();
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ethiocraft_analytics_${view}_${new Date().toISOString().slice(0,10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.dismiss();
            toast.success('Excel exported');
          } catch (err) {
            console.error('Excel export failed', err);
            toast.error('Excel export failed');
          }
        };
  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="large" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <button onClick={() => navigate('/admin/dashboard')} className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center">← Back to Dashboard</button>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Platform performance and growth metrics</p>
        </div>

        {error && <ErrorMessage message={error} className="mb-6" />}

        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-2">
            <button onClick={() => { setView('daily'); setRange(30); }} className={`px-4 py-2 rounded ${view==='daily'?'bg-ethiopian-gold text-white':'bg-gray-100'}`}>Daily</button>
            <button onClick={() => { setView('monthly'); setRange(12); }} className={`px-4 py-2 rounded ${view==='monthly'?'bg-ethiopian-gold text-white':'bg-gray-100'}`}>Monthly</button>
            <button onClick={() => { setView('yearly'); setRange(3); }} className={`px-4 py-2 rounded ${view==='yearly'?'bg-ethiopian-gold text-white':'bg-gray-100'}`}>Yearly</button>
          </div>
          <div className="flex items-center space-x-2">
            <select value={range} onChange={e=>setRange(Number(e.target.value))} className="px-3 py-2 border rounded">
              {view==='daily' && [7,14,30,90].map(v=> <option key={v} value={v}>{v} days</option>)}
              {view==='monthly' && [3,6,12,24].map(v=> <option key={v} value={v}>{v} months</option>)}
              {view==='yearly' && [1,2,3,5].map(v=> <option key={v} value={v}>{v} years</option>)}
            </select>
             <button onClick={exportCSV} className="px-4 py-2 bg-ethiopian-gold text-white rounded">Export CSV</button>
             <button onClick={exportExcel} className="px-4 py-2 bg-ethiopian-gold text-white rounded">Export Excel</button>
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(data.overview?.totalRevenue||0)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-sm font-medium text-gray-600">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">{data.overview?.totalOrders||0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-sm font-medium text-gray-600">Total Visits</p>
            <p className="text-2xl font-bold text-gray-900">{data.traffic?.visits||0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
            <p className="text-2xl font-bold text-gray-900">{(data.traffic?.conversionRate||0).toFixed(2)}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Sales Trend</h3>
            <Line data={salesChart} />
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">New Users</h3>
            <Bar data={usersChart} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Top Products</h3>
            <div className="space-y-3">
              {(data.topProducts||[]).map((p,idx)=> (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-ethiopian-gold text-white rounded-full flex items-center justify-center text-sm font-bold">{idx+1}</div>
                    <div>
                      <div className="font-medium">{p.name||'—'}</div>
                      <div className="text-sm text-gray-600">{p.qty||0} sold</div>
                    </div>
                  </div>
                  <div className="font-semibold">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(p.revenue||0)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Top Categories</h3>
            <Pie data={{ labels: (data.topCategories||[]).map(c=>c._id||'Unknown'), datasets:[{ data:(data.topCategories||[]).map(c=>c.revenue||0), backgroundColor:[ '#F97316','#F59E0B','#10B981','#60A5FA','#A78BFA','#EF4444'] }] }} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsDashboard;
