import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusiness } from '../contexts/BusinessContext';
import { translations } from '../lib/translations';
import { supabase } from '../../lib/supabaseClient';

interface InventoryStockListProps {
  externalItems?: any[];
}

export const InventoryStockList: React.FC<InventoryStockListProps> = ({ externalItems }) => {
  const { language } = useLanguage();
  const { businessId } = useBusiness();
  const t = (key: string) => (translations as any)[language]?.[key] || key;

  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(!externalItems);

  useEffect(() => {
    if (externalItems) {
      setStockItems(externalItems.map((it: any, idx: number) => ({
        id: it.id || String(idx),
        name: it.name || 'Unknown',
        cat: it.category || 'General',
        bin: it.location || '-',
        qty: it.qty ?? 0,
        min: it.min ?? 0,
        status: (it.qty ?? 0) <= (it.min ?? 0) / 2 ? 'critical' : (it.qty ?? 0) <= (it.min ?? 0) ? 'low_stock' : 'nominal'
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
      const items = data?.app_config?.inventory?.items || [];
      setStockItems(items.map((it: any, idx: number) => ({
        id: it.id || String(idx),
        name: it.name || 'Unknown',
        cat: it.category || 'General',
        bin: it.location || '-',
        qty: it.qty ?? 0,
        min: it.min ?? 0,
        status: (it.qty ?? 0) <= (it.min ?? 0) / 2 ? 'critical' : (it.qty ?? 0) <= (it.min ?? 0) ? 'low_stock' : 'nominal'
      })));
      setLoading(false);
    };
    load();
  }, [businessId, externalItems]);

  const statusStyles = (status: string) => {
    switch (status) {
      case 'critical': return { pill: 'bg-rose-50 text-rose-700', qty: 'text-rose-500', strip: 'bg-rose-400' };
      case 'low_stock': return { pill: 'bg-amber-50 text-amber-700', qty: 'text-amber-500', strip: 'bg-amber-400' };
      default: return { pill: 'bg-emerald-50 text-emerald-700', qty: 'text-slate-900', strip: 'bg-emerald-400' };
    }
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
      <main className="px-4 pt-2 flex flex-col gap-4">
        <div className="flex justify-between items-end mb-4">
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-md border transition-colors shadow-sm" style={{ backgroundColor: 'var(--filter-bg)', borderColor: 'var(--nav-border)' }}>
            <span className="text-[13px] font-medium text-[var(--text-primary)]">All Tags</span>
            <SlidersHorizontal size={18} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {stockItems.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {t('no_items') || 'No inventory items yet.'}
            </div>
          )}
          {stockItems.map(item => {
            const styles = statusStyles(item.status);
            return (
              <article
                key={item.id}
                className="inventory-card flex items-start gap-3"
              >
                {/* Status strip */}
                <div className={`w-1 shrink-0 rounded-full self-stretch ${styles.strip}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1 min-w-0">
                      <h2 className="text-[15px] font-semibold text-slate-900 truncate">{item.name}</h2>
                      <span className="text-[13px] text-slate-400">{item.cat} • {item.bin}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                      <span className={`text-[32px] font-bold leading-none ${styles.qty}`}>{item.qty}</span>
                      <span className={`status-pill ${styles.pill}`}>
                        {t(item.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
};
