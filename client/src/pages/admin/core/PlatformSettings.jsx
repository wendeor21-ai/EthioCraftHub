import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';

const PlatformSettings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ currency: 'ETB', region: 'ET' });
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ fetchSettings(); }, []);

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
      alert('Settings saved');
    } catch (err) { console.error('save settings', err); alert('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <button onClick={() => navigate('/admin/dashboard')} className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center">← Back to Dashboard</button>
        <h1 className="text-2xl font-bold mb-2">Platform Settings</h1>
        <p className="text-gray-600 mb-4">Adjust currency and regional settings.</p>

        <div className="bg-white rounded-lg shadow p-6">
          <label className="block mb-3">
            <span className="text-sm text-gray-600">Currency</span>
            <select value={settings.currency} onChange={e=>setSettings({...settings, currency: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2">
              <option value="ETB">ETB</option>
              <option value="USD">USD</option>
            </select>
          </label>

          <label className="block mb-3">
            <span className="text-sm text-gray-600">Region</span>
            <select value={settings.region} onChange={e=>setSettings({...settings, region: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2">
              <option value="ET">Ethiopia</option>
              <option value="US">United States</option>
            </select>
          </label>

          <div className="flex justify-end">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-ethiopian-gold text-white rounded">{saving? 'Saving...' : 'Save Settings'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformSettings;
