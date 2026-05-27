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
      <div className="bg-white border border-stone-200 rounded-2xl p-4 md:p-8 mb-6 shadow-[0_8px_24px_rgba(28,25,23,0.04)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Package className="w-32 h-32 text-emerald-600 rotate-12" />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-1 bg-emerald-600 rounded-full" />
              <p className="text-emerald-600 font-black tracking-[0.3em] uppercase text-[10px]">
                {t('inventory_management_title') || 'Inventory Management'}
              </p>
            </div>
            <h2 className="font-['Outfit',sans-serif] text-2xl md:text-4xl text-stone-950 mb-1.5 font-black tracking-tight leading-none italic">
              {t('inventory') || 'Stock & Supplies'}
            </h2>
            <p className="text-xs md:text-sm text-stone-500 leading-relaxed font-medium">
              {t('inventory_management_subtitle') || 'Track counts, scan barcodes, audit stock. Full visibility from shelf to kitchen—your way.'}
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={scrollToInventory}
              className="flex-grow sm:flex-none flex items-center justify-center gap-2 px-6 h-10 bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-500 transition-all shadow-lg active:scale-95"
            >
              <Plus className="h-4 w-4" />
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
