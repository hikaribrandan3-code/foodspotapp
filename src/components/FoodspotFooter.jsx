import React from 'react';
import { useTenant } from '../contexts/TenantContext';

export function FoodspotFooter() {
  const { tenantData } = useTenant();
  const poweredByColor = tenantData?.powered_by_color || '#C4856A';

  return (
    <footer className="py-6 flex flex-col items-center justify-center opacity-40 hover:opacity-100 transition-opacity">
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: poweredByColor }}>Powered By</span>
        <div className="flex items-center gap-1.5 mt-[-2px]">
           <span className="text-lg font-black tracking-tighter italic" style={{ color: poweredByColor }}>FoodSpot OS</span>
        </div>
      </div>
    </footer>
  );
}
