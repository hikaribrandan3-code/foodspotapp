
import React from 'react';
import { motion } from 'framer-motion';

export function VenueMap({ selectedZone, onSelectZone }) {
  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-[24px] p-3 border border-slate-100 dark:border-slate-800 shadow-[0_2px_15px_rgba(0,61,155,0.01)] overflow-hidden">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Venue Map</h3>
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[7px] font-bold text-emerald-600 uppercase">Real-time</span>
        </div>
      </div>

      <div className="relative aspect-[21/9] w-full">
        <svg viewBox="0 0 400 170" className="w-full h-full">
          <defs>
            <linearGradient id="vipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Stage - Compact & Stylized */}
          <motion.path
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            d="M 140 5 L 260 5 L 255 25 L 145 25 Z"
            fill="currentColor" className="text-slate-900 dark:text-white"
          />
          <text x="200" y="16" textAnchor="middle" className="text-[7px] font-black fill-white dark:fill-slate-900 uppercase tracking-widest">STAGE</text>

          {/* VIP Zone - Sleeker Perspective */}
          <motion.path
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            d="M 80 40 L 320 40 L 305 85 L 95 85 Z"
            className={`cursor-pointer transition-all duration-500 ${
              selectedZone === 'VIP' ? 'fill-[url(#vipGradient)]' : 'fill-emerald-50/50 dark:fill-emerald-900/10'
            }`}
            onClick={() => onSelectZone('VIP')}
            whileTap={{ scale: 0.98 }}
          />
          <text x="200" y="68" textAnchor="middle" className={`pointer-events-none text-[9px] font-black uppercase tracking-tighter transition-colors ${
            selectedZone === 'VIP' ? 'fill-white' : 'fill-emerald-600/40'
          }`}>VIP EXPERIENCE</text>

          {/* General Admission - Compressed */}
          <motion.path
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            d="M 40 95 L 360 95 L 375 160 L 25 160 Z"
            className={`cursor-pointer transition-all duration-500 ${
              selectedZone === 'General' ? 'fill-slate-900 dark:fill-white' : 'fill-slate-50 dark:fill-slate-800/30'
            }`}
            onClick={() => onSelectZone('General')}
            whileTap={{ scale: 0.98 }}
          />
          <text x="200" y="132" textAnchor="middle" className={`pointer-events-none text-[9px] font-black uppercase tracking-tighter transition-colors ${
            selectedZone === 'General' ? 'fill-white dark:fill-slate-900' : 'fill-slate-300 dark:fill-slate-600'
          }`}>GENERAL ACCESS</text>

          {/* Table Dots - Staggered & Glow Effect */}
          {[130, 165, 200, 235, 270].map((x, i) => (
            <motion.circle
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 + (i * 0.05) }}
              cx={x}
              cy="52"
              r="4"
              className={`transition-colors duration-500 ${selectedZone === 'VIP' ? 'fill-white/40' : 'fill-emerald-400/20'}`}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
