import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';

const Reports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sales, setSales] = useState([]);
  const [artisans, setArtisans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [complaints, setComplaints] = useState({ counts: [], open: [] });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true); setError('');
      await Promise.all([fetchSales(), fetchArtisans(), fetchCustomers(), fetchComplaints()]);
    } catch (err) {
      console.error(err); setError('Failed to load reports');
    } finally { setLoading(false); }
  };

  const fetchSales = async () => {
    try {
      const res = await adminAPI.getSalesReport({ startDate, endDate, limit: 500 });
      setSales(res.data.orders || []);
    } catch (err) {
      console.error('sales', err);
    }
  };

  const fetchArtisans = async () => {
    try {
      const res = await adminAPI.getArtisanReport({ startDate, endDate, limit: 200 });
      setArtisans(res.data.artisans || []);
    } catch (err) { console.error('artisans', err); }
  };

  const fetchCustomers = async () => {
    try {
      const res = await adminAPI.getCustomerReport({ startDate, endDate, limit: 200 });
      setCustomers(res.data.customers || []);
    } catch (err) { console.error('customers', err); }
  };

  const fetchComplaints = async () => {
    try {
      const res = await adminAPI.getComplaintsReport();
      setComplaints(res.data || {});
    } catch (err) { console.error('complaints', err); }
  };

  const schedule = async () => {
    try {
      const res = await adminAPI.scheduleReport({ report: tab, enabled: scheduleEnabled, cron: '0 6 * * *' });
      toast.success('Schedule saved');
    } catch (err) {
      console.error(err); toast.error('Failed to save schedule');
    }
  };

  const exportExcel = async (type = 'sales') => {
    try {
      toast.loading('Preparing Excel...');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'EthioCraft Admin';

      if (type === 'sales') {
        const sheet = wb.addWorksheet('Sales');
        sheet.addRow(['Date','Order Number','Customer','Status','Payment Method','Subtotal','Tax','Total']);
        (sales || []).forEach(o => sheet.addRow([new Date(o.createdAt).toISOString().slice(0,10), o.orderNumber, (o.customer && (o.customer.profile?.firstName||'') + ' ' + (o.customer.profile?.lastName||'')) || (o.customer?.email||''), o.status, o.payment?.method || '', o.totals?.subtotal || 0, o.totals?.tax || 0, o.totals?.total || 0]));
        ['F','G','H'].forEach(c => sheet.getColumn(c).numFmt = '"ETB" #,##0.00');
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
      }

      if (type === 'artisans') {
        const sheet = wb.addWorksheet('Artisans');
        sheet.addRow(['Artisan','Orders','Quantity Sold','Revenue']);
        (artisans || []).forEach(a => sheet.addRow([a.artisanName || '', a.ordersCount || 0, a.qty || 0, a.revenue || 0]));
        sheet.getColumn('D').numFmt = '"ETB" #,##0.00';
      }

      if (type === 'customers') {
        const sheet = wb.addWorksheet('Customers');
        sheet.addRow(['Customer','Email','Orders','Total Spent','Avg Order','Last Order']);
        (customers || []).forEach(c => sheet.addRow([c.name||'', c.email||'', c.ordersCount||0, c.totalSpent||0, c.avgOrderValue||0, c.lastOrder ? new Date(c.lastOrder).toISOString().slice(0,10) : '']));
        sheet.getColumn('D').numFmt = '"ETB" #,##0.00';
      }

      if (type === 'complaints') {
        const sheet = wb.addWorksheet('Complaints');
        sheet.addRow(['Sender','Subject','Message','Status','Created At']);
        (complaints.open||[]).forEach(m => sheet.addRow([ (m.sender && (m.sender.profile?.firstName||'') + ' ' + (m.sender.profile?.lastName||'')) || m.sender?.email || '', m.subject, m.message, m.status, new Date(m.createdAt).toISOString().slice(0,10) ]));
      }

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `ethiocraft_report_${tab}_${new Date().toISOString().slice(0,10)}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      toast.dismiss(); toast.success('Excel exported');
    } catch (err) { console.error('exportExcel', err); toast.error('Export failed'); }
  };

  const exportCSV = (type = 'sales') => {
    try {
      const rows = [];
      if (type === 'sales') {
        rows.push(['Date','Order Number','Customer','Status','Payment Method','Subtotal','Tax','Total']);
        (sales||[]).forEach(o => rows.push([new Date(o.createdAt).toISOString().slice(0,10), o.orderNumber, (o.customer && (o.customer.profile?.firstName||'') + ' ' + (o.customer.profile?.lastName||'')) || (o.customer?.email||''), o.status, o.payment?.method || '', o.totals?.subtotal || 0, o.totals?.tax || 0, o.totals?.total || 0]));
      }
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ethiocraft_report_${tab}_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (err) { console.error(err); toast.error('Export failed'); }
  };

  const exportPDF = (type = 'sales') => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(12);
      doc.text(`EthioCraft - ${tab.toUpperCase()} Report`, 14, 20);
      doc.text('This PDF is a compact preview. Use Excel for full data.', 14, 28);
      doc.save(`ethiocraft_report_${tab}_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success('PDF exported');
    } catch (err) { console.error(err); toast.error('PDF export failed'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="large" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button onClick={() => navigate('/admin/dashboard')} className="text-ethiopian-gold hover:text-ethiopian-earth mb-2">← Back</button>
            <h1 className="text-2xl font-bold">Reports Module</h1>
            <p className="text-gray-600">Detailed operational reports and exports</p>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm">Start</label>
            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="border px-2 py-1 rounded" />
            <label className="text-sm">End</label>
            <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="border px-2 py-1 rounded" />
            <button onClick={() => { fetchAll(); }} className="px-3 py-2 bg-ethiopian-gold text-white rounded">Filter</button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex space-x-2">
            <button onClick={()=>setTab('sales')} className={`px-3 py-2 rounded ${tab==='sales'?'bg-ethiopian-gold text-white':'bg-white'}`}>Sales</button>
            <button onClick={()=>setTab('artisans')} className={`px-3 py-2 rounded ${tab==='artisans'?'bg-ethiopian-gold text-white':'bg-white'}`}>Artisans</button>
            <button onClick={()=>setTab('customers')} className={`px-3 py-2 rounded ${tab==='customers'?'bg-ethiopian-gold text-white':'bg-white'}`}>Customers</button>
            <button onClick={()=>setTab('complaints')} className={`px-3 py-2 rounded ${tab==='complaints'?'bg-ethiopian-gold text-white':'bg-white'}`}>Complaints</button>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <label className="inline-flex items-center"><input type="checkbox" checked={scheduleEnabled} onChange={e=>setScheduleEnabled(e.target.checked)} className="mr-2" />Schedule Report</label>
            <button onClick={schedule} className="ml-3 px-3 py-2 bg-gray-200 rounded">Save Schedule</button>
          </div>
          <div className="flex space-x-2">
            <button onClick={()=>exportCSV(tab)} className="px-3 py-2 bg-white rounded border">Export CSV</button>
            <button onClick={()=>exportExcel(tab)} className="px-3 py-2 bg-white rounded border">Export Excel</button>
            <button onClick={()=>exportPDF(tab)} className="px-3 py-2 bg-white rounded border">Export PDF</button>
          </div>
        </div>

        <div className="bg-white rounded shadow p-4">
          {tab === 'sales' && (
            <div>
              <h3 className="font-semibold mb-2">Order Summaries</h3>
              <div className="overflow-auto max-h-96">
                <table className="min-w-full divide-y">
                  <thead>
                    <tr className="text-left">
                      <th className="p-2">Date</th>
                      <th className="p-2">Order</th>
                      <th className="p-2">Customer</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Payment</th>
                      <th className="p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sales||[]).map(o=> (
                      <tr key={o._id} className="border-t">
                        <td className="p-2">{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td className="p-2">{o.orderNumber}</td>
                        <td className="p-2">{(o.customer && (o.customer.profile?.firstName||'') + ' ' + (o.customer.profile?.lastName||'')) || o.customer?.email}</td>
                        <td className="p-2">{o.status}</td>
                        <td className="p-2">{o.payment?.method}</td>
                        <td className="p-2">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(o.totals?.total||0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'artisans' && (
            <div>
              <h3 className="font-semibold mb-2">Artisan Performance</h3>
              <div className="overflow-auto max-h-96">
                <table className="min-w-full divide-y">
                  <thead>
                    <tr className="text-left"><th className="p-2">Artisan</th><th className="p-2">Orders</th><th className="p-2">Qty</th><th className="p-2">Revenue</th></tr>
                  </thead>
                  <tbody>
                    {(artisans||[]).map(a=> (
                      <tr key={a.artisanId} className="border-t">
                        <td className="p-2">{a.artisanName}</td>
                        <td className="p-2">{a.ordersCount}</td>
                        <td className="p-2">{a.qty}</td>
                        <td className="p-2">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(a.revenue||0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'customers' && (
            <div>
              <h3 className="font-semibold mb-2">Customer Activity</h3>
              <div className="overflow-auto max-h-96">
                <table className="min-w-full divide-y">
                  <thead>
                    <tr className="text-left"><th className="p-2">Customer</th><th className="p-2">Email</th><th className="p-2">Orders</th><th className="p-2">Total Spent</th><th className="p-2">Last Order</th></tr>
                  </thead>
                  <tbody>
                    {(customers||[]).map(c=> (
                      <tr key={c.customerId} className="border-t">
                        <td className="p-2">{c.name}</td>
                        <td className="p-2">{c.email}</td>
                        <td className="p-2">{c.ordersCount}</td>
                        <td className="p-2">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c.totalSpent||0)}</td>
                        <td className="p-2">{c.lastOrder ? new Date(c.lastOrder).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'complaints' && (
            <div>
              <h3 className="font-semibold mb-2">Complaints & Disputes</h3>
              <div className="mb-4">Open: {complaints.counts?.find(c=>c._id==='New')?.count || 0} • Resolved: {complaints.counts?.find(c=>c._id==='Replied')?.count || 0}</div>
              <div className="overflow-auto max-h-96">
                <table className="min-w-full divide-y">
                  <thead>
                    <tr className="text-left"><th className="p-2">Sender</th><th className="p-2">Subject</th><th className="p-2">Status</th><th className="p-2">Created</th></tr>
                  </thead>
                  <tbody>
                    {(complaints.open||[]).map(m=> (
                      <tr key={m._id} className="border-t">
                        <td className="p-2">{(m.sender && (m.sender.profile?.firstName||'') + ' ' + (m.sender.profile?.lastName||'')) || m.sender?.email}</td>
                        <td className="p-2">{m.subject}</td>
                        <td className="p-2">{m.status}</td>
                        <td className="p-2">{new Date(m.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Reports;
