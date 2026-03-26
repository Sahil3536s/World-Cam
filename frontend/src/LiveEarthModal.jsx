"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Map } from 'lucide-react';

export default function LiveEarthModal({ isOpen, onClose }) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-full h-full md:w-[95vw] md:h-[95vh] bg-black/40 border border-white/10 rounded-none md:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header Overlay */}
          <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 drop-shadow-md">
              <Map className="text-emerald-400" size={24} /> Live Earth & Weather
            </h2>
            <button
              onClick={onClose}
              className="pointer-events-auto p-2 bg-black/50 hover:bg-red-500/90 text-white rounded-full backdrop-blur-md transition-colors border border-white/10"
              title="Close Map"
            >
              <X size={24} strokeWidth={2.5} />
            </button>
          </div>

          {/* Embedded Windy Map */}
          <div className="w-[100%] h-[100%] flex-1">
            <iframe
              width="100%"
              height="100%"
              src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=3&overlay=wind&product=ecmwf&level=surface&lat=20&lon=0"
              frameBorder="0"
              title="Live Earth Windy Map"
              allowFullScreen
            ></iframe>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
