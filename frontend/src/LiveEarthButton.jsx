"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Map } from 'lucide-react';

export default function LiveEarthButton({ onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title="Live Earth Map"
      className="flex items-center justify-center p-[6px] rounded-full bg-emerald-500/20 text-emerald-400 hover:text-white border border-emerald-500/30 hover:bg-emerald-500/60 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer ml-1 mr-1"
    >
      <Map size={18} strokeWidth={2.5} />
    </motion.button>
  );
}
