import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { useSettings } from '../../../contexts/SettingsContext';

const NotificationsCenter = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [active, setActive] = useState(null);
  const { refresh } = useSettings();

  useEffect(()=>{ fetchActive(); }, []);

  const fetchActive = async () => {
    try {
      const res = await api.get('/notifications/broadcasts');
      const list = res.data.broadcasts || [];
      setActive(list[0] || null);
    } catch (err) { console.error('fetch broadcasts', err); }
  };

  const sendBroadcast = async () => {
    if (!message.trim()) return alert('Enter a message');
    setSending(true);
    try {
      await api.post('/admin/notifications/broadcast', { message });
      alert('Broadcast sent');
      setMessage('');
      // refresh global state so banner updates immediately
      try { await refresh(); } catch (e) { console.warn('refresh after send', e); }
      fetchActive();
    } catch (err) { console.error('send broadcast', err); alert('Failed to send'); }
    finally { setSending(false); }
  };

  const clearActive = async () => {
    if (!active) return alert('No active broadcast');
    if (!window.confirm('Clear active broadcast?')) return;
    try {
      await api.delete(`/admin/notifications/broadcasts/${active._id}`);
      alert('Broadcast cleared');
      setActive(null);
      try { await refresh(); } catch (e) { console.warn('refresh after clear', e); }
    } catch (err) { console.error('clear broadcast', err); alert('Failed to clear'); }
  };

  const completelyRemove = async () => {
    // delete active broadcast and clear compose box
    if (active) {
      if (!window.confirm('Completely remove active broadcast and clear compose?')) return;
      try {
        await api.delete(`/admin/notifications/broadcasts/${active._id}`);
        setActive(null);
      } catch (err) { console.error('remove broadcast', err); alert('Failed to remove'); return; }
    }
    setMessage('');
    try { await refresh(); } catch (e) { console.warn('refresh after remove', e); }
    alert('Broadcast removed and compose cleared');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <button onClick={() => navigate('/admin/dashboard')} className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center">← Back to Dashboard</button>
        <h1 className="text-2xl font-bold mb-2">Notifications Center</h1>
        <p className="text-gray-600 mb-4">Send platform-wide announcements or alerts.</p>

        <div className="bg-white rounded-lg shadow p-6">
          <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Write announcement..." className="w-full border rounded p-3 h-32" />
          <div className="mt-3">
            {active && (
              <div className="mb-3 p-3 bg-amber-50 border rounded">
                <div className="font-medium">Active Broadcast</div>
                <div className="text-sm text-gray-700">{active.message}</div>
                <div className="text-xs text-gray-500">{new Date(active.createdAt).toLocaleString()}</div>
                <div className="mt-2">
                  <button onClick={clearActive} className="px-3 py-1 bg-red-600 text-white rounded text-sm">Clear Active Broadcast</button>
                  <button onClick={completelyRemove} className="ml-2 px-3 py-1 bg-red-800 text-white rounded text-sm">Completely Remove</button>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end mt-3">
            <button onClick={sendBroadcast} disabled={sending} className="px-4 py-2 bg-ethiopian-gold text-white rounded">{sending? 'Sending...' : 'Send Broadcast'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsCenter;
