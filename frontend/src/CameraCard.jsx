"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function CameraCard({ camera }) {
  const [isHovered, setIsHovered] = useState(false);

  // Parse stream URL to append autoplay and mute parameters for iframes
  const getStreamUrl = (url) => {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('autoplay', '1');
      urlObj.searchParams.set('mute', '1');
      return urlObj.toString();
    } catch (e) {
      if (url.includes('?')) {
        return `${url}&autoplay=1&mute=1`;
      }
      return `${url}?autoplay=1&mute=1`;
    }
  };

  return (
    <motion.div
      className="relative w-full aspect-video rounded-xl overflow-hidden cursor-pointer shadow-lg bg-black/40 border border-white/10"
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isHovered ? (
        <img
          src={camera.thumbnailUrl}
          alt={camera.title}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
      ) : (
        <iframe
          src={getStreamUrl(camera.streamUrl)}
          title={camera.title}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          className="w-full h-full object-cover border-none"
        ></iframe>
      )}

      {/* Sleek gradient overlay at the bottom */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
        <h3 className="text-white font-semibold text-lg drop-shadow-md truncate">
          {camera.title}
        </h3>
        <p className="text-gray-300 text-sm drop-shadow-md truncate">
          {camera.country}
        </p>
      </div>
    </motion.div>
  );
}
