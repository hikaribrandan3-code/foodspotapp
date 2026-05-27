import { useRef } from 'react';
import { Package, Plus } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import MenuInventoryView from '../../../components/owner/MenuInventoryView';

export default function InventoryTab() {
  const { t, lang } = useLanguage();
  const inventoryRef = useRef(null);

  const scrollToInventory = () => {
    inventoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      {/* Hero Card — mirrors MenuTab header */}
      <div className="bg-white border-2 md:border border-stone-200 rounded-[2.5rem] md:rounded-2xl p-6 md:p-8 mb-12 md:mb-6 shadow-[0_20px_50px_rgba(28,25,23,0.03)] md:shadow-[0_8px_24px_rgba(28,25,23,0.04)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 md:p-4 opacity-5">
          <Package className="w-64 h-64 md:w-32 md:h-32 text-emerald-600 rotate-12" />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-4 relative z-10">
          <div className="max-w-2xl md:max-w-none">
            <div className="flex items-center gap-3 md:gap-2 mb-5 md:mb-2">
              <div className="h-6 md:h-5 w-1 bg-emerald-600 rounded-full" />
              <p className="text-emerald-600 font-black tracking-[0.3em] uppercase text-[10px]">
                {t('inventory_management_title') || 'Inventory Management'}
              </p>
            </div>
            <h2 className="font-['Outfit',sans-serif] text-4xl md:text-4xl text-stone-950 mb-6 md:mb-1.5 font-black tracking-tight leading-none italic">
              {t('inventory') || 'Stock & Supplies'}
            </h2>
            <p className="text-base md:text-sm text-stone-600 md:text-stone-500 leading-relaxed font-medium">
              {t('inventory_management_subtitle') || 'Track counts, scan barcodes, audit stock. Full visibility from shelf to kitchen—your way.'}
            </p>
          </div>
          <div className="flex gap-4 md:gap-3 w-full md:w-auto">
            <button
              onClick={scrollToInventory}
              className="flex-grow md:flex-none flex items-center justify-center gap-3 md:gap-2 px-12 md:px-6 h-16 md:h-10 bg-emerald-600 text-white font-black text-sm md:text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-500 transition-all shadow-2xl md:shadow-lg active:scale-95"
            >
              <Plus className="h-5 w-5 md:h-4 md:w-4" />
              {t('add_inventory_item') || 'Add Item'}
            </button>
          </div>
        </div>
      </div>

      {/* Existing Inventory Module */}
      <div ref={inventoryRef}>
        <MenuInventoryView lang={lang} />
      </div>
    </div>
  );
}
