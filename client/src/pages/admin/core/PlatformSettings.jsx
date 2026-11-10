import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { Download, Percent, ArrowLeft, RefreshCw } from 'lucide-react';

const PlatformSettings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ currency: 'ETB', region: 'ET', commissionRate: 5, vatRate: 15 });
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [updatingRates, setUpdatingRates] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/platform-settings');
      setSettings(res.data.settings || settings);
    } catch (err) { console.error('fetch platform settings', err); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/admin/platform-settings', settings);
      toast.success('Platform settings saved successfully');
    } catch (err) { console.error('save settings', err); toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleDownloadBackup = async () => {
    try {
      setBackingUp(true);
      const res = await api.get('/admin/backup/download', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ethiocraft-global-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Database backup downloaded successfully!');
    } catch (err) {
      console.error('Backup error:', err);
      toast.error('Failed to download database backup');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRecalculateRates = async () => {
    try {
      setUpdatingRates(true);
      const res = await api.post('/admin/recalculate-rates', {
        vatRate: parseFloat(settings.vatRate) || 15,
        commissionRate: parseFloat(settings.commissionRate) || 5
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Rates updated across all products!');
        setSettings(prev => ({
          ...prev,
          vatRate: res.data.vatRate,
          commissionRate: res.data.commissionRate
        }));
      }
    } catch (err) {
      console.error('Recalculate error:', err);
      toast.error('Failed to update rates and recalculate products');
    } finally {
      setUpdatingRates(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <button onClick={() => navigate('/admin/dashboard')} className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center gap-1 font-bold">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <h1 className="text-2xl font-black text-gray-900 mb-1">Platform Settings & Data Governance</h1>
        <p className="text-gray-600 mb-6 text-sm">Manage tax rates (VAT), platform commission, currency localization, and full database backups.</p>

        {/* Full Database Backup Action Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-2xl p-6 text-white mb-6 shadow-md border border-emerald-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-2xl">💾</span>
              <h3 className="text-lg font-black tracking-tight">Full System Database Backup</h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">MySQL / Prisma</span>
            </div>
            <p className="text-xs text-emerald-100/90 max-w-xl leading-relaxed">
              Export all system records (Users, Products, Orders, Custom Orders, Settings, and Audit Logs) into a secure, timestamped JSON snapshot archive.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={backingUp}
            className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-950 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 flex-shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{backingUp ? 'Generating Backup...' : 'Backup All Data (.JSON)'}</span>
          </button>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900 border-b pb-3">Financial Rates & Calculations</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Platform VAT Rate (%)</span>
              <input 
                type="number" 
                value={settings.vatRate !== undefined ? settings.vatRate : 15} 
                onChange={e => setSettings({ ...settings, vatRate: parseFloat(e.target.value) || 0 })} 
                className="mt-1 block w-full border border-gray-300 rounded-xl px-3 py-2 font-bold text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ethiopian-gold focus:outline-none transition-all" 
                step="0.5"
                min="0"
                max="100"
              />
              <span className="text-[10px] text-gray-400 italic">Standard Ethiopian VAT is 15%.</span>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Platform Commission (%)</span>
              <input 
                type="number" 
                value={settings.commissionRate !== undefined ? settings.commissionRate : 5} 
                onChange={e => setSettings({ ...settings, commissionRate: parseFloat(e.target.value) || 0 })} 
                className="mt-1 block w-full border border-gray-300 rounded-xl px-3 py-2 font-bold text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ethiopian-gold focus:outline-none transition-all" 
                step="0.5"
                min="0"
                max="100"
              />
              <span className="text-[10px] text-gray-400 italic">Platform commission fee on craft sales.</span>
            </label>
          </div>

          {/* Live Calculation Preview & Auto-Recalculate Button */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>📊</span> Live Rate Preview (1,000 ETB Product)
              </span>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-mono font-bold">Auto-Recalculation</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center my-3">
              <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">VAT ({settings.vatRate ?? 15}%)</span>
                <span className="text-sm font-black text-blue-600 font-mono">+{((1000 * (Number(settings.vatRate ?? 15) / 100))).toFixed(2)} ETB</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Commission ({settings.commissionRate ?? 5}%)</span>
                <span className="text-sm font-black text-purple-600 font-mono">-{(1000 * (Number(settings.commissionRate ?? 5) / 100)).toFixed(2)} ETB</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Artisan Net</span>
                <span className="text-sm font-black text-emerald-600 font-mono">{(1000 - (1000 * (Number(settings.commissionRate ?? 5) / 100))).toFixed(2)} ETB</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleRecalculateRates} 
              disabled={updatingRates}
              className="w-full py-2.5 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {updatingRates ? (
                <span>⏳ Recalculating all products...</span>
              ) : (
                <>
                  <Percent className="w-4 h-4" />
                  <span>Apply Rates & Automatically Recalculate All Products (%)</span>
                </>
              )}
            </button>
          </div>

          <h2 className="text-base font-bold text-gray-900 border-b pb-3 pt-2">Localization</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Currency</span>
              <select value={settings.currency} onChange={e=>setSettings({...settings, currency: e.target.value})} className="mt-1 block w-full border rounded-xl px-3 py-2 bg-gray-50">
                <option value="ETB">ETB (Ethiopian Birr)</option>
                <option value="USD">USD ($)</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Region</span>
              <select value={settings.region} onChange={e=>setSettings({...settings, region: e.target.value})} className="mt-1 block w-full border rounded-xl px-3 py-2 bg-gray-50">
                <option value="ET">Ethiopia</option>
                <option value="US">United States</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-ethiopian-gold hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformSettings;
