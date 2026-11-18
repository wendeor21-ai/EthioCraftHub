import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const SoundContext = createContext();

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};

export const SoundProvider = ({ children }) => {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('artisan_sound_muted');
    return saved ? JSON.parse(saved) : false;
  });

  const orderSound = useRef(null);
  const alertSound = useRef(null);

  useEffect(() => {
    localStorage.setItem('artisan_sound_muted', JSON.stringify(isMuted));
  }, [isMuted]);

  // Lazy instantiate audio objects only when needed
  const isArtisanOrAdminPage = () => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname || '';
    return path.startsWith('/artisan') || path.startsWith('/admin');
  };

  const getOrderSound = () => {
    if (!orderSound.current) {
      orderSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    }
    return orderSound.current;
  };

  const getAlertSound = () => {
    if (!alertSound.current) {
      alertSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    }
    return alertSound.current;
  };

  const playOrderSound = () => {
    if (!isMuted && isArtisanOrAdminPage()) {
      try {
        const audio = getOrderSound();
        audio.currentTime = 0;
        audio.play().catch(err => console.log('Audio play blocked:', err));
      } catch (e) {}
    }
  };

  const playAlertSound = () => {
    if (!isMuted && isArtisanOrAdminPage()) {
      try {
        const audio = getAlertSound();
        audio.currentTime = 0;
        audio.play().catch(err => console.log('Audio play blocked:', err));
      } catch (e) {}
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  return (
    <SoundContext.Provider value={{ isMuted, toggleMute, playOrderSound, playAlertSound }}>
      {children}
    </SoundContext.Provider>
  );
};
