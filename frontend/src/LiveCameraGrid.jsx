"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import CameraCard from './CameraCard';

export default function LiveCameraGrid({ isOpen, onClose, cameras }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-full h-full md:w-[95vw] md:h-[95vh] bg-black/60 border border-white/10 md:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/40 backdrop-blur-sm z-10 sticky top-0">
            <h2 className="text-3xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              Global Live Feeds
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-red-400 hover:bg-white/10 transition-colors p-2 rounded-full cursor-pointer border border-transparent hover:border-white/20"
            >
              <X size={28} strokeWidth={2.5} />
            </button>
          </div>

          {/* Grid Container */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent rounded-b-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cameras.map((camera) => (
                <CameraCard key={camera.id} camera={camera} />
              ))}
            </div>
            {cameras && cameras.length === 0 && (
              <div className="flex w-full h-64 items-center justify-center text-gray-400 text-lg">
                No cameras available.
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
