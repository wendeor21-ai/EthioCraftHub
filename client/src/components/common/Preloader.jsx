import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Premium Preloader for EthioCraft Global
 * Features smooth animated loading, gold circular spinner, and logo shimmer.
 */
const Preloader = ({ onLoadingComplete }) => {
  const [loadingState, setLoadingState] = useState('loading'); // 'loading', 'completing', 'done'

  useEffect(() => {
    // Elegant, short initial load duration since it only shows once per session
    const timer = setTimeout(() => {
      setLoadingState('completing');
      
      // Clean fade out and unmount trigger
      setTimeout(() => {
        setLoadingState('done');
        onLoadingComplete();
      }, 800);
    }, 1500); // 1.5 seconds loading experience

    return () => clearTimeout(timer);
  }, [onLoadingComplete]);

  return (
    <AnimatePresence>
      {loadingState !== 'done' && (
        <motion.div 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-amber-50/40 to-amber-100/30 overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          animate={{ opacity: loadingState === 'completing' ? 0 : 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Subtle Background Tilet Pattern overlay (if desired, using CSS radial gradients works as a premium fallback) */}
          <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>

          {/* Central Logo & Animation container */}
          <div className="relative flex flex-col items-center z-10">
            
            {/* Elegant Spinning Outer Highlights */}
            <motion.div 
              className="absolute -inset-10 border border-amber-200/50 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />
            <motion.div 
              className="absolute -inset-10 border-t border-[#CFA66E] rounded-full opacity-60"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Inner Brand Pulse Icon */}
            <motion.div 
              className="w-16 h-16 bg-[#CFA66E]/5 rounded-full flex items-center justify-center mb-6 shadow-inner"
              animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
               <span className="text-2xl opacity-90 drop-shadow-sm">🏔️</span>
            </motion.div>

            {/* Premium Typography Brand with Shimmer */}
            <motion.h1 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              className="relative text-4xl text-gray-800 tracking-wide font-['Playfair_Display',serif] overflow-hidden px-2 py-1"
            >
              Ethio<span className="text-[#CFA66E] font-semibold">Craft</span>
              
              {/* Magic Shimmer Effect */}
              <motion.div 
                className="absolute top-0 left-0 w-full h-full skew-x-12"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="text-xs uppercase tracking-[0.4em] text-[#CFA66E]/80 mt-3 font-['Inter',sans-serif]"
            >
              Global Artisans
            </motion.p>
          </div>

          {/* Elegant Circular Spinner replacing the old line */}
          <div className="absolute bottom-24 flex flex-col items-center gap-4">
             <motion.div
               className="w-8 h-8 rounded-full border-[3px] border-[#CFA66E]/20 border-t-[#CFA66E]"
               animate={{ rotate: 360 }}
               transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
             />
             <motion.p 
               initial={{ opacity: 0 }}
               animate={{ opacity: [0.3, 1, 0.3] }}
               transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
               className="text-[10px] uppercase tracking-[0.2em] text-[#CFA66E] font-medium"
             >
               Curating Experience
             </motion.p>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Preloader;
