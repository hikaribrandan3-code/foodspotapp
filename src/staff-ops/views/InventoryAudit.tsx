import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, SlidersHorizontal, ArrowDown, Plus, Minus, X, Calendar, AlertCircle, Package, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusiness } from '../contexts/BusinessContext';
import { translations } from '../lib/translations';
import { supabase } from '../../lib/supabaseClient';

interface InventoryAuditProps {
  externalItems?: any[];
}

export const InventoryAudit: React.FC<InventoryAuditProps> = ({ externalItems }) => {
  const { language } = useLanguage();
  const { businessId } = useBusiness();
  const t = (key: string) => (translations as any)[language]?.[key] || key;

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(!externalItems);

  useEffect(() => {
    if (externalItems) {
      setItems(externalItems.map((it: any, idx: number) => ({
        id: it.id || String(idx),
        name: it.name || 'Unknown',
        cat: it.category || 'General',
        bin: it.location || '-',
        qty: it.qty ?? 0,
        min: it.min ?? 0,
        max: it.max ?? 0,
        sku: it.barcode || '-'
      })));
      setLoading(false);
      return;
    }
    if (!businessId) return;
    const load = async () => {
      const { data } = await supabase
        .from('branding')
        .select('app_config')
        .eq('business_id', businessId)
        .maybeSingle();
      const rawItems = data?.app_config?.inventory?.items || [];
      setItems(rawItems.map((it: any, idx: number) => ({
        id: it.id || String(idx),
        name: it.name || 'Unknown',
        cat: it.category || 'General',
        bin: it.location || '-',
        qty: it.qty ?? 0,
        min: it.min ?? 0,
        max: it.max ?? 0,
        sku: it.barcode || '-'
      })));
      setLoading(false);
    };
    load();
  }, [businessId, externalItems]);

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

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen pb-20 items-center justify-center" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)' }}>
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('loading') || 'Loading...'}</span>
      </div>
    );
  }

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
            <span className="text-[15px] font-medium text-[var(--text-primary)]">All Tags</span>
            <SlidersHorizontal size={18} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {items.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {t('no_items') || 'No inventory items yet.'}
            </div>
          )}
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
                    <Minus size={18} />
                  </button>
                  <span className="w-12 text-center text-[15px] font-semibold">{item.qty}</span>
                  <button 
                    onClick={() => updateQty(item.id, 1)}
                    className="w-11 h-full flex items-center justify-center text-[var(--accent)] border-l active:opacity-70"
                    style={{ borderColor: 'var(--nav-border)' }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
};
