import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusiness } from '../contexts/BusinessContext';
import { translations } from '../lib/translations';
import { supabase } from '../../lib/supabaseClient';

export const InventoryStockList: React.FC = () => {
  const { language } = useLanguage();
  const { businessId } = useBusiness();
  const t = (key: string) => (translations as any)[language]?.[key] || key;

  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [businessId]);

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
            <span className="text-[13px] font-medium text-[var(--text-primary)]">{t('all_tags')}</span>
            <SlidersHorizontal size={18} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {stockItems.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {t('no_items') || 'No inventory items yet.'}
            </div>
          )}
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
