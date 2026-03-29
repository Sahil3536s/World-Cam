"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Map } from 'lucide-react';

export default function LiveEarthModal() {
  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-black/40">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 flex justify-between items-center bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3 drop-shadow-lg">
          <Map className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" size={28} /> Live Earth & Weather
        </h2>
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
    </div>
  );
}
