
import React from 'react';

export function FoodspotFooter() {
  return (
    <footer className="py-6 flex flex-col items-center justify-center opacity-40 hover:opacity-100 transition-opacity">
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Powered By</span>
        <div className="flex items-center gap-1.5 mt-[-2px]">
           <span className="text-lg font-black text-slate-900 dark:text-white tracking-tighter italic">FoodSpot OS</span>
        </div>
      </div>
    </footer>
  );
}
