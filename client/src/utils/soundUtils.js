/**
 * Sound Utility for Notifications
 * Provides a crisp, pleasant, professional harmonic chime ("ding-dong-chime")
 * using Web Audio API with zero latency and automatic user-interaction unlock.
 */

let sharedCtx = null;

const getAudioContext = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedCtx || sharedCtx.state === 'closed') {
      sharedCtx = new AudioCtx();
    }
    if (sharedCtx.state === 'suspended') {
      sharedCtx.resume().catch(() => {});
    }
    return sharedCtx;
  } catch (e) {
    return null;
  }
};

// Auto-unlock AudioContext on first user click or tap anywhere in the app
if (typeof window !== 'undefined') {
  const unlock = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch (_) {}
  };
  window.addEventListener('click', unlock, { passive: true, capture: true });
  window.addEventListener('touchstart', unlock, { passive: true, capture: true });
  window.addEventListener('keydown', unlock, { passive: true, capture: true });
}

/**
 * Plays a warm, attractive, professional 3-tone melodic chime (C5 -> E5 -> G5)
 * Soft, elegant, and non-intrusive.
 */
export const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playHarmonicChime = () => {
      try {
        const now = ctx.currentTime;

        // Notes for an elegant major triad chime: C5 (523Hz), E5 (659Hz), G5 (784Hz)
        const notes = [
          { freq: 523.25, time: 0.00, gain: 0.28, duration: 0.45 },
          { freq: 659.25, time: 0.09, gain: 0.32, duration: 0.50 },
          { freq: 783.99, time: 0.18, gain: 0.35, duration: 0.65 }
        ];

        notes.forEach(({ freq, time, gain, duration }) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + time);

          // Smooth attack and pleasant exponential release
          gainNode.gain.setValueAtTime(0.001, now + time);
          gainNode.gain.linearRampToValueAtTime(gain, now + time + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc.start(now + time);
          osc.stop(now + time + duration);
        });
      } catch (err) {
        console.warn("Chime generation notice:", err);
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(playHarmonicChime).catch(() => playHarmonicChime());
    } else {
      playHarmonicChime();
    }
  } catch (e) {
    // Non-blocking
  }
};

// Global deduplication cache across all components (Sidebar, MobileBottomNav, ManageOrders, Navbar)
const processedOrders = new Map();

/**
 * Checks if an order notification has already been triggered in the last `windowMs` (default 10s).
 * Prevents multiple simultaneous components from playing sound or popping duplicate toasts.
 */
export const shouldNotifyForOrder = (orderIdOrNumber, windowMs = 10000) => {
  if (!orderIdOrNumber) return true;
  const key = String(orderIdOrNumber);
  const now = Date.now();
  const lastTime = processedOrders.get(key);
  if (lastTime && (now - lastTime) < windowMs) {
    return false;
  }
  processedOrders.set(key, now);
  if (processedOrders.size > 200) {
    for (const [k, t] of processedOrders.entries()) {
      if (now - t > 60000) processedOrders.delete(k);
    }
  }
  return true;
};

