import React from 'react';
import { motion } from 'framer-motion';

interface VenueMapProps {
  selectedZone: string | null;
  onSelectZone: (zoneId: string) => void;
}

export function VenueMap({ selectedZone, onSelectZone }: VenueMapProps) {
  return (
    <div className="w-full bg-white dark:bg-slate-950 rounded-[32px] p-4 border border-slate-100 dark:border-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Interactive Site Map</h3>
          <p className="text-[9px] font-bold text-slate-900 dark:text-slate-100 opacity-60">Festival Grounds • North Stage</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/5 px-2 py-1 rounded-full border border-emerald-500/10">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live Availability</span>
        </div>
      </div>
      
      <div className="relative aspect-[16/10] w-full">
        <svg viewBox="0 0 400 250" className="w-full h-full drop-shadow-2xl">
          <defs>
            <pattern id="grass" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.5" fill="currentColor" className="text-slate-200 dark:text-slate-800" />
            </pattern>
            <linearGradient id="vipGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <filter id="glow">
               <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
               <feMerge>
                   <feMergeNode in="coloredBlur"/>
                   <feMergeNode in="SourceGraphic"/>
               </feMerge>
            </filter>
          </defs>

          {/* Background Field */}
          <rect width="400" height="250" rx="20" fill="url(#grass)" className="opacity-30" />

          {/* Main Stage */}
          <motion.g initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Stage Structure */}
            <rect x="120" y="5" width="160" height="40" rx="4" fill="currentColor" className="text-slate-950 dark:text-slate-50" />
            {/* Speaker Stacks */}
            <rect x="105" y="10" width="12" height="30" rx="2" fill="currentColor" className="text-slate-800 dark:text-slate-400" />
            <rect x="283" y="10" width="12" height="30" rx="2" fill="currentColor" className="text-slate-800 dark:text-slate-400" />
            <text x="200" y="30" textAnchor="middle" className="text-[10px] font-black fill-white dark:fill-slate-950 tracking-[0.3em] uppercase">MAIN STAGE</text>
            
            {/* Stage Lights/Effects (Decorative) */}
            <circle cx="150" cy="5" r="1.5" className="fill-amber-400 animate-pulse" />
            <circle cx="200" cy="5" r="1.5" className="fill-blue-400 animate-pulse" />
            <circle cx="250" cy="5" r="1.5" className="fill-purple-400 animate-pulse" />
          </motion.g>

          {/* Front Row / Pit (Part of VIP/Tables) */}
          <motion.path
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            d="M 120 50 L 280 50 L 290 80 L 110 80 Z"
            className={`cursor-pointer transition-all duration-300 ${
              selectedZone === 'Tables' ? 'fill-blue-500 fill-opacity-20 stroke-blue-500' : 'fill-slate-100 dark:fill-slate-800/40 hover:fill-slate-200'
            }`}
            strokeWidth="1"
            onClick={() => onSelectZone('Tables')}
          />
          <text x="200" y="68" textAnchor="middle" className={`pointer-events-none text-[8px] font-black uppercase transition-colors ${
            selectedZone === 'Tables' ? 'fill-blue-600' : 'fill-slate-400 opacity-40'
          }`}>TABLE SERVICE • PIT</text>

          {/* VIP Lounges (Left & Right) */}
          <g>
            <motion.path
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              d="M 20 60 L 90 60 L 100 130 L 20 130 Z"
              className={`cursor-pointer transition-all duration-300 ${
                selectedZone === 'VIP_L' ? 'fill-[url(#vipGold)]' : 'fill-amber-50 dark:fill-amber-900/10 stroke-amber-200'
              }`}
              onClick={() => onSelectZone('VIP_L')}
            />
            <text x="55" y="100" textAnchor="middle" className={`pointer-events-none text-[7px] font-black uppercase vertical-lr transition-colors ${
              selectedZone === 'VIP_L' ? 'fill-white' : 'fill-amber-600/40'
            }`}>VIP LOUNGE A</text>

            <motion.path
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              d="M 310 60 L 380 60 L 380 130 L 300 130 Z"
              className={`cursor-pointer transition-all duration-300 ${
                selectedZone === 'VIP_R' ? 'fill-[url(#vipGold)]' : 'fill-amber-50 dark:fill-amber-900/10 stroke-amber-200'
              }`}
              onClick={() => onSelectZone('VIP_R')}
            />
            <text x="345" y="100" textAnchor="middle" className={`pointer-events-none text-[7px] font-black uppercase transition-colors ${
              selectedZone === 'VIP_R' ? 'fill-white' : 'fill-amber-600/40'
            }`}>VIP LOUNGE B</text>
          </g>

          {/* Premium Tables (Individual Dots) */}
          {[130, 153, 176, 200, 223, 246, 270].map((x, i) => (
             <motion.circle
               key={i}
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ delay: 0.3 + (i * 0.05) }}
               cx={x}
               cy="62"
               r="3"
               className={`transition-colors duration-300 ${selectedZone === 'Tables' ? 'fill-blue-400' : 'fill-slate-300 dark:fill-slate-700'}`}
             />
          ))}

          {/* General Admission - The Field */}
          <motion.path
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            d="M 20 140 L 380 140 L 395 240 L 5 240 Z"
            className={`cursor-pointer transition-all duration-500 ${
              selectedZone === 'General' ? 'fill-slate-900 dark:fill-white' : 'fill-slate-50/80 dark:fill-slate-800/20'
            }`}
            onClick={() => onSelectZone('General')}
          />
          <text x="200" y="195" textAnchor="middle" className={`pointer-events-none text-[12px] font-black uppercase tracking-[0.2em] transition-colors ${
            selectedZone === 'General' ? 'fill-white dark:fill-slate-950' : 'fill-slate-300 dark:fill-slate-700'
          }`}>GENERAL ADMISSION FIELD</text>

          {/* Entrances/Details */}
          <path d="M 180 245 L 220 245" stroke="currentColor" strokeWidth="3" className="text-slate-300 dark:text-slate-800" strokeLinecap="round"/>
          <text x="200" y="240" textAnchor="middle" className="text-[6px] font-black fill-slate-400 uppercase tracking-widest">Main Entrance</text>
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { id: 'General', label: 'GA Field', color: 'bg-slate-400' },
          { id: 'VIP_L', label: 'VIP North', color: 'bg-amber-400' },
          { id: 'VIP_R', label: 'VIP South', color: 'bg-amber-400' },
          { id: 'Tables', label: 'Tables', color: 'bg-blue-400' },
        ].map(legend => (
          <div key={legend.id} className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${legend.color}`} />
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider">{legend.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
