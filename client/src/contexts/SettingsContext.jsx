import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import api, { adminAPI } from '../utils/api';
import { API_BASE_URL } from '../config/api';
import { playNotificationSound } from '../utils/soundUtils';
import toast from 'react-hot-toast';

const SettingsContext = createContext();

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({ name: 'EthioCraft', logoUrl: '', contactEmail: '', currency: 'ETB', region: 'ET' });
  const [homeConfig, setHomeConfig] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [dismissedBroadcastIds, setDismissedBroadcastIds] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('dismissed_broadcasts') || '[]');
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  const dismissBroadcast = (id) => {
    setDismissedBroadcastIds(prev => {
      const updated = [...new Set([...prev, String(id)])];
      try { sessionStorage.setItem('dismissed_broadcasts', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const fetchSettings = async () => {
    try {
      // Use public endpoint so non-admin users can read platform settings (logo, name)
      const res = await api.get('/notifications/platform-settings');
      if (res?.data?.settings) setSettings(res.data.settings);
    } catch (err) {
      console.warn('Failed to fetch platform settings', err?.message || err);
    }
  };

  const fetchHomeConfig = async () => {
    try {
      const res = await api.get('/settings/homepage');
      if (res.data.success) setHomeConfig(res.data.data);
    } catch (err) {
      console.warn('Failed to fetch home config', err?.message || err);
    }
  };

  const fetchBroadcasts = async () => {
    try {
      const res = await api.get('/notifications/broadcasts');
      setBroadcasts(res.data.broadcasts || []);
    } catch (err) {
      console.warn('Failed to fetch broadcasts', err?.message || err);
    }
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateHomeConfig = (newConfig) => {
    setHomeConfig(prev => ({ ...prev, ...newConfig }));
  };

  const refresh = async () => {
    setLoading(true);
    try {
      await Promise.allSettled([fetchSettings(), fetchHomeConfig(), fetchBroadcasts()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Real-time Socket.io listeners for live broadcasts & real-time cancellation
  useEffect(() => {
    const socket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('📡 SettingsContext: Connected to Socket.io for live broadcasts');
    });

    socket.on('newBroadcast', (newBroadcast) => {
      if (!newBroadcast || !newBroadcast.message) return;
      console.log('📢 SettingsContext: Live broadcast received:', newBroadcast);
      setBroadcasts(prev => [newBroadcast, ...prev.filter(b => b._id !== newBroadcast._id)]);
      
      // Play alert chime and show toast banner in real-time
      try { playNotificationSound(); } catch (e) {}
      toast((t) => (
        <div className="flex items-start gap-2.5">
          <span className="text-xl">📢</span>
          <div>
            <div className="font-bold text-xs uppercase tracking-wider text-amber-800">
              {newBroadcast.target === 'artisans' ? 'Artisan Announcement' : 'Platform Announcement'}
            </div>
            <div className="text-sm font-medium text-gray-800 mt-0.5">{newBroadcast.message}</div>
          </div>
        </div>
      ), { 
        duration: 9000, 
        style: { border: '2px solid #D97706', background: '#FEF3C7', color: '#92400E' } 
      });
    });

    socket.on('broadcastNotification', (newBroadcast) => {
      if (!newBroadcast) return;
      setBroadcasts(prev => [newBroadcast, ...prev.filter(b => b._id !== newBroadcast._id)]);
    });

    socket.on('broadcastDeleted', (data) => {
      console.log('📢 SettingsContext: Broadcast deleted in real-time:', data);
      if (data?.all || data?.id === 'all') {
        setBroadcasts([]);
      } else {
        setBroadcasts(prev => prev.filter(b => b._id !== data.id));
      }
    });

    socket.on('clearBroadcast', (data) => {
      if (data?.all || data?.id === 'all') {
        setBroadcasts([]);
      } else {
        setBroadcasts(prev => prev.filter(b => b._id !== data?.id));
      }
    });

    socket.on('broadcastCleared', () => {
      console.log('📢 SettingsContext: All broadcasts cleared in real-time');
      setBroadcasts([]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Filter out any broadcasts the current user explicitly dismissed in this session
  const activeVisibleBroadcasts = broadcasts.filter(b => !dismissedBroadcastIds.includes(String(b._id)));

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      homeConfig, 
      broadcasts: activeVisibleBroadcasts, 
      allBroadcasts: broadcasts,
      dismissBroadcast,
      refresh, 
      updateSettings,
      updateHomeConfig,
      loading 
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
