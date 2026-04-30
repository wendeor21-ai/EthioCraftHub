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
    // Initialize audio objects
    orderSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    alertSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');

    // Preload
    orderSound.current.load();
    alertSound.current.load();

    localStorage.setItem('artisan_sound_muted', JSON.stringify(isMuted));
  }, [isMuted]);

  const playOrderSound = () => {
    if (!isMuted && orderSound.current) {
      orderSound.current.currentTime = 0;
      orderSound.current.play().catch(err => console.log('Audio play blocked:', err));
    }
  };

  const playAlertSound = () => {
    if (!isMuted && alertSound.current) {
      alertSound.current.currentTime = 0;
      alertSound.current.play().catch(err => console.log('Audio play blocked:', err));
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
