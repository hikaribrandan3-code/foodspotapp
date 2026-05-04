import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, SlidersHorizontal, ArrowDown, Plus, Minus, X, Calendar, AlertCircle, Package, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusiness } from '../contexts/BusinessContext';
import { translations } from '../lib/translations';

export const InventoryAudit: React.FC = () => {
  const { language } = useLanguage();
  const { businessId } = useBusiness();
  const t = (key: string) => (translations as any)[language]?.[key] || key;

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [items, setItems] = useState([
    { id: '1', name: 'Organic Quinoa 5kg', cat: 'Dry Goods', bin: 'Bin A42', qty: 142, min: 50, max: 200, sku: 'QNB-5KG-01' },
    { id: '2', name: 'Almond Milk 1L', cat: 'Dairy Alt', bin: 'Fridge B', qty: 24, min: 30, max: 100, sku: 'ALM-1L-02' },
    { id: '3', name: 'Sourdough Loaves', cat: 'Bakery', bin: 'Rack 1', qty: 2, min: 15, max: 40, sku: 'SRD-LH-03' },
    { id: '4', name: 'Whole Bean Coffee 1kg', cat: 'Beverage', bin: 'Bin C12', qty: 88, min: 40, max: 120, sku: 'WBC-1KG-04' },
  ]);

  const getStatus = (item: any) => {
    if (item.qty <= item.min / 2) return 'critical';
    if (item.qty <= item.min) return 'low_stock';
    return 'nominal';
  };

  const updateQty = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, qty: Math.max(0, item.qty + delta) };
      }
      return item;
    }));
  };

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)' }}>
      <main className="px-4 flex flex-col">
        {/* Pull to refresh simulation */}
        <div className="w-full flex flex-col items-center justify-center py-4 opacity-60">
          <ArrowDown size={20} className="animate-bounce text-[var(--text-tertiary)]" />
          <span className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Pull to refresh</span>
        </div>

        <div className="flex justify-between items-end mb-6 pt-2">
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-md border transition-colors shadow-sm" style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)' }}>
            <span className="text-[15px] font-medium text-[var(--text-primary)]">{t('all_tags')}</span>
            <SlidersHorizontal size={18} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {items.map(item => (
            <article 
              key={item.id} 
              className="bento-card flex flex-col gap-3 shadow-sm active:opacity-80 transition-opacity cursor-pointer"
              onClick={() => setSelectedItem(item)}
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">{item.name}</h2>
                  <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>{item.cat} • {item.bin}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[34px] font-bold leading-none ${getStatus(item) === 'critical' ? 'text-red-500' : getStatus(item) === 'low_stock' ? 'text-orange-500' : 'text-[var(--text-primary)]'}`}>
                    {item.qty}
                  </span>
                  <span className={`status-badge ${getStatus(item) === 'nominal' ? 'in-stock' : 'low-stock'}`}>
                    {t(getStatus(item))}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center border-t pt-3 mt-1" style={{ borderColor: 'var(--nav-border)' }} onClick={(e) => e.stopPropagation()}>
                <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>{t('min')}: {item.min} / {t('max')}: {item.max}</span>
                <div className="flex items-center rounded-lg border overflow-hidden h-[44px]" style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)' }}>
                  <button 
                    onClick={() => updateQty(item.id, -1)}
                    className="w-11 h-full flex items-center justify-center text-[var(--accent)] border-r active:opacity-70"
                    style={{ borderColor: 'var(--nav-border)' }}
                  >
                    <Minus size={20} />
                  </button>
                  <span className="w-14 text-center font-bold text-[var(--text-primary)]">{item.qty}</span>
                  <button 
                    onClick={() => updateQty(item.id, 1)}
                    className="w-11 h-full flex items-center justify-center text-[var(--accent)] border-l active:opacity-70"
                    style={{ borderColor: 'var(--nav-border)' }}
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {selectedItem && (
          <AuditModal item={selectedItem} onClose={() => setSelectedItem(null)} t={t} />
        )}
      </AnimatePresence>
    </div>
  );
};

const AuditModal = ({ item, onClose, t }: { item: any, onClose: () => void, t: any }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full h-[813px] rounded-t-[32px] flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--app-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: 'var(--nav-border)' }} />
        </div>

        <div className="px-4 pb-3 border-b flex justify-between items-start mt-2" style={{ borderColor: 'var(--nav-border)' }}>
          <div className="flex flex-col gap-1">
            <span className="status-badge" style={{ backgroundColor: 'var(--filter-bg)', color: 'var(--text-primary)' }}>
              {item.cat.toUpperCase()}
            </span>
            <h1 className="text-[34px] font-bold tracking-tight text-[var(--text-primary)]">{item.name}</h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('sku')}: {item.sku || 'N/A'}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-tertiary)] active:opacity-70"
            style={{ backgroundColor: 'var(--filter-bg)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 no-scrollbar flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bento-card p-3 flex flex-col items-center text-center justify-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent)] opacity-20" />
              <Package size={20} className="text-[var(--text-tertiary)] mb-2" />
              <span className="text-[13px] mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('cur_stock')}</span>
              <span className="text-[34px] font-bold text-[var(--text-primary)]">{item.qty}</span>
            </div>
            <div className="bento-card p-3 flex flex-col items-center text-center justify-center">
              <Calendar size={20} className="text-[var(--text-tertiary)] mb-2" />
              <span className="text-[13px] mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('expiry_date')}</span>
              <span className="text-[17px] font-bold text-[var(--text-primary)] mt-1">Oct 2025</span>
            </div>
            <div className="p-3 flex flex-col items-center text-center justify-center rounded-xl border" style={{ backgroundColor: 'var(--badge-low-bg)', borderColor: 'var(--nav-border)' }}>
              <AlertCircle size={20} className="mb-2" style={{ color: 'var(--badge-low-text)' }} />
              <span className="text-[13px] mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('min_stock')}</span>
              <span className="text-[17px] font-bold mt-1" style={{ color: 'var(--badge-low-text)' }}>{item.min}</span>
              <span className="text-[10px] mt-1 uppercase font-bold" style={{ color: 'var(--badge-low-text)' }}>{t('below_target')}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button className="w-full h-[50px] text-white font-bold rounded-lg flex items-center justify-center gap-2 active:opacity-90 transition-opacity shadow-sm" style={{ backgroundColor: 'var(--accent)' }}>
              <Plus size={20} />
              {t('add_stock')}
            </button>
            <button className="w-full h-[50px] bg-red-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 active:bg-red-700 transition-colors shadow-sm">
              <Minus size={20} />
              {t('consume')}
            </button>
          </div>

          <div className="flex flex-col gap-3 pb-12">
            <div className="flex justify-between items-end mb-1">
              <h2 className="text-[17px] font-bold text-[var(--text-primary)]">{t('recent_movements')}</h2>
              <span className="text-[12px] flex items-center gap-1 uppercase font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                <RotateCcw size={14} />
                {t('swipe_delete')}
              </span>
            </div>

            <div className="bento-card p-0 overflow-hidden flex flex-col border-none">
              <MovementItem type="restock" title={t('restock')} source={t('central_warehouse')} val="+200" time="Today, 09:41 AM" />
              <MovementItem type="waste" title={t('waste')} source={t('expired')} val="-5" time="Yesterday, 14:22" />
              <MovementItem type="consume" title={t('consume')} source="Main Bar" val="-15" time="Oct 12, 08:15" />
              <MovementItem type="waste" title={t('waste')} source={t('damaged')} val="-2" time="Oct 10, 11:30" />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const MovementItem = ({ type, title, source, val, time }: any) => {
  const getColorClass = () => {
    if (type === 'restock') return 'text-blue-400';
    if (type === 'waste') return 'text-orange-400';
    return 'text-red-400';
  };
  const getBgClass = () => {
    if (type === 'restock') return 'bg-blue-900/20';
    if (type === 'waste') return 'bg-orange-900/20';
    return 'bg-red-900/20';
  };

  return (
    <div className="border-b last:border-0 p-3 flex justify-between items-start hover:opacity-80 cursor-pointer" style={{ borderColor: 'var(--nav-border)' }}>
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded flex items-center justify-center ${getBgClass()}`}>
          {type === 'restock' ? <Plus size={18} className="text-blue-400" /> : type === 'waste' ? <AlertCircle size={18} className="text-orange-400" /> : <Minus size={18} className="text-red-400" />}
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{title}</span>
          <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>{source}</span>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className={`text-[17px] font-bold ${getColorClass()}`}>{val}</span>
        <span className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{time}</span>
      </div>
    </div>
  );
};
