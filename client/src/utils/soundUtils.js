/**
 * Sound Utility for Notifications
 * Provides a reliable, cross-browser chime sound using Web Audio API
 * with persistent AudioContext unlock and HTML5 Audio fallback.
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

// Auto-unlock AudioContext on first user interaction in the app
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

// Crisp base64 WAV chime
const NOTIFICATION_SOUND_B64 = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACBhYqFbF1fdJivrJBhNjVgodDbqWEzHSSa2/PLkF8vFSSU0+7eqWctEiCNz+rWn2cqDR+HyePVomgoDB1/w93Pn20rCBp5utnQoG8uBhh0s9HIpXYzBBRvqtDEpn85Aw9sodC/q4Q+AAtpm8m6r4hEAwhllcG0tY1JAwVfjr6usJJNAwVajbursZROAwRVibKps5dRAwNRg62mr5tTAwJOfaWeqp5WAwJLeJ2Rp6BZAgJEd5SNqqJcAgI9bYuFpqdgAgI5Z4N8oaljAgI0Ynx0n6pmAgItW3NrnKxnAQInUWlfm7BrAQIhTGBQla5vAQIaSldCj7NxAQIUSk03ibFzAQIOQ0Uqh7N2AQIIPj4diLV4AQIJPjcVgrR6AQIKPDIOfLN9AQIKOS0GenF+AQILOR0GZXSBAQIKNwYCW3OCAQILNQEBVXOFAQIKMwAAT3SGAQIKMQAAQ3SHAQIKOAAAA/91iAECCjQAAAH/dYkBAgo1AAAA/3WLAQIKNwAAAf91jAECCjkAAAH/dY4BAgo8AAAB/3WQAQIKPgAAAf91kgECCj8AAAH/dZQBAgpBAAAB/3WWAQIKQgAAAf91mAECCkMAAAH/dZoBAgpEAAAB/3WcAQIKRQAAAf91ngECCkUAAAH/daABAgpFAAAA//8=";

/**
 * Plays a loud, pleasant double-tone melodic notification chime ("ding-dong!")
 * Uses Web Audio API for 100% reliable, zero-latency audio playback.
 */
export const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const playChime = () => {
        try {
          const now = ctx.currentTime;

          // Tone 1: High crisp bell (880 Hz - A5)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(880, now);
          gain1.gain.setValueAtTime(0.6, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.6);

          // Tone 2: Warm harmonic chime (1318.5 Hz - E6) slightly delayed
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1318.5, now + 0.14);
          gain2.gain.setValueAtTime(0.7, now + 0.14);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now + 0.14);
          osc2.stop(now + 0.9);
        } catch (innerErr) {
          console.warn("Chime synthesis error:", innerErr);
        }
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(playChime).catch(() => playChime());
      } else {
        playChime();
      }
    }
  } catch (webAudioErr) {
    console.warn("Web Audio API chime error:", webAudioErr);
  }

  // Fallback / secondary: standard Audio element
  try {
    const audio = new Audio(NOTIFICATION_SOUND_B64);
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch (_) {}
};
