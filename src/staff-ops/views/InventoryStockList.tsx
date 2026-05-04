import React, { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusiness } from '../contexts/BusinessContext';
import { translations } from '../lib/translations';

export const InventoryStockList: React.FC = () => {
  const { language } = useLanguage();
  const { businessId } = useBusiness();
  const t = (key: string) => (translations as any)[language]?.[key] || key;

  const stockItems = [
    { id: '1', name: 'Organic Quinoa 5kg', cat: 'Dry Goods', bin: 'Bin A42', qty: 142, status: 'nominal' },
    { id: '2', name: 'Almond Milk 1L', cat: 'Dairy Alt', bin: 'Fridge B', qty: 24, status: 'low_stock' },
    { id: '3', name: 'Sourdough Loaves', cat: 'Bakery', bin: 'Rack 1', qty: 2, status: 'critical' },
    { id: '4', name: 'Whole Bean Coffee 1kg', cat: 'Beverage', bin: 'Bin C12', qty: 88, status: 'nominal' },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'critical': return 'text-red-600';
      case 'low_stock': return 'text-orange-600';
      default: return 'text-[#181c23]';
    }
  };

  const getBadgeStyles = (status: string) => {
    switch(status) {
      case 'critical': return 'bg-[#ffdad6] text-[#93000a]';
      case 'low_stock': return 'bg-[#ffdbcc] text-[#7c2e00]';
      default: return 'bg-[#e0e2ed] text-[#181c23]';
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)' }}>
      <main className="px-4 pt-2 flex flex-col gap-4">
        <div className="flex justify-between items-end mb-4">
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-md border transition-colors shadow-sm" style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)' }}>
            <span className="text-[13px] font-medium text-[var(--text-primary)]">{t('all_tags')}</span>
            <SlidersHorizontal size={18} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {stockItems.map(item => (
            <article 
              key={item.id} 
              className="bento-card flex flex-col gap-3 shadow-sm active:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">{item.name}</h2>
                  <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>{item.cat} • {item.bin}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[34px] font-bold leading-none ${getStatusColor(item.status)}`}>{item.qty}</span>
                  <span className={`status-badge ${item.status === 'nominal' ? 'in-stock' : 'low-stock'}`}>
                    {t(item.status)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
};
