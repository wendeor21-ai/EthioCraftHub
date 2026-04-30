import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { adminAPI } from '../utils/api';

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
  const [loading, setLoading] = useState(true);

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

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      homeConfig, 
      broadcasts, 
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
