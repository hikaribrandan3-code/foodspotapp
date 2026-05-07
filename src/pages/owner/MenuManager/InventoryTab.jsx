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
    <div className="space-y-24 md:space-y-40">
      {/* Hero Card — mirrors MenuTab header */}
      <section className="mb-16 md:mb-32">
        <div className="bg-white border-2 border-stone-200 rounded-[2.5rem] p-6 md:p-16 mb-12 shadow-[0_20px_50px_rgba(28,25,23,0.03)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Package className="w-64 h-64 text-emerald-600 rotate-12" />
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 md:gap-12 relative z-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-6 w-1 bg-emerald-600 rounded-full" />
                <p className="text-emerald-600 font-black tracking-[0.3em] uppercase text-[10px] md:text-[12px]">
                  {t('inventory_management_title') || 'Inventory Management'}
                </p>
              </div>
              <h2 className="font-['Outfit',sans-serif] text-4xl md:text-7xl text-stone-950 mb-6 font-black tracking-tight leading-none italic">
                {t('inventory') || 'Stock & Supplies'}
              </h2>
              <p className="text-base md:text-xl text-stone-600 leading-relaxed font-medium">
                {t('inventory_management_subtitle') || 'Track counts, scan barcodes, audit stock. Full visibility from shelf to kitchen—your way.'}
              </p>
            </div>
            <div className="flex gap-4 w-full lg:w-auto">
              <button
                onClick={scrollToInventory}
                className="flex-grow lg:flex-none flex items-center justify-center gap-3 px-12 h-16 bg-emerald-600 text-white font-black text-sm md:text-base uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-500 transition-all shadow-2xl active:scale-95"
              >
                <Plus className="h-5 w-5" />
                {t('add_inventory_item') || 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Existing Inventory Module */}
      <div ref={inventoryRef} className="py-4">
        <MenuInventoryView lang={lang} />
      </div>
    </div>
  );
}
