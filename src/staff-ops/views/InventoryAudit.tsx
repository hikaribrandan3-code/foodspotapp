import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, SlidersHorizontal, ArrowDown, Plus, Minus, X, Calendar, AlertCircle, Package, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusiness } from '../contexts/BusinessContext';
import { translations } from '../lib/translations';
import { supabase, updateBranding } from '../../lib/supabaseClient';
import { deepMergeAppConfig } from '../../utils/appConfig';

interface InventoryAuditProps {
  externalItems?: any[];
  onUpdateQty?: (id: string, delta: number) => void;
}

export const InventoryAudit: React.FC<InventoryAuditProps> = ({ externalItems, onUpdateQty }) => {
  const isEmbedded = !!externalItems;
  const { language } = useLanguage();
  const { businessId } = useBusiness();
  const t = (key: string) => (translations as any)[language]?.[key] || key;

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [rawItems, setRawItems] = useState<any[]>([]);
  const [cachedAppConfig, setCachedAppConfig] = useState<any>({});
  const [loading, setLoading] = useState(!isEmbedded);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ message: string; error?: boolean } | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from DB in standalone mode
  useEffect(() => {
    if (isEmbedded) {
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
      const loadedRaw = data?.app_config?.inventory?.items || [];
      setRawItems(loadedRaw);
      setCachedAppConfig(data?.app_config || {});
      setLoading(false);
    };
    load();
  }, [businessId, isEmbedded]);

  // Auto-hide save pill
  useEffect(() => {
    if (!saveStatus) return;
    const timer = setTimeout(() => setSaveStatus(null), saveStatus.error ? 3000 : 2000);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  // Display items: mapped from external (Owner) or raw (Staff)
  const items = useMemo(() => {
    const source = isEmbedded ? externalItems : rawItems;
    return (source || []).map((it: any, idx: number) => ({
      id: it.id || String(idx),
      name: it.name || 'Unknown',
      cat: it.category || 'General',
      bin: it.location || '-',
      qty: it.qty ?? 0,
      min: it.min ?? 0,
      max: it.max ?? 0,
      sku: it.barcode || '-'
    }));
  }, [externalItems, rawItems, isEmbedded]);

  const getStatus = (item: any) => {
    if (item.qty <= item.min / 2) return 'critical';
    if (item.qty <= item.min) return 'low_stock';
    return 'nominal';
  };

  const statusStyles = (status: string) => {
    switch (status) {
      case 'critical': return { pill: 'bg-rose-50 text-rose-700', qty: 'text-rose-500', strip: 'bg-rose-400' };
      case 'low_stock': return { pill: 'bg-amber-50 text-amber-700', qty: 'text-amber-500', strip: 'bg-amber-400' };
      default: return { pill: 'bg-emerald-50 text-emerald-700', qty: 'text-slate-900', strip: 'bg-emerald-400' };
    }
  };

  const updateQty = (id: string, delta: number) => {
    if (onUpdateQty) {
      onUpdateQty(id, delta);
    } else {
      setRawItems(prev => prev.map((raw, idx) => {
        const rawId = raw.id || String(idx);
        if (rawId === id) {
          return { ...raw, qty: Math.max(0, (raw.qty ?? 0) + delta) };
        }
        return raw;
      }));
      setIsDirty(true);
    }
    setPulseId(id);
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => setPulseId(null), 600);
  };

  // Standalone auto-save
  useEffect(() => {
    if (isEmbedded || !businessId || !isDirty) return;
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      setSaveStatus({ message: t('saving') || 'Saving...' });
      const payload = {
        app_config: deepMergeAppConfig(cachedAppConfig || {}, {
          inventory: { items: rawItems }
        })
      };
      updateBranding(payload, businessId)
        .then(() => {
          setSaveStatus({ message: t('saved') || 'Saved' });
          setIsDirty(false);
        })
        .catch(err => {
          console.error('[InventoryAudit] Save failed:', err);
          setSaveStatus({ error: true, message: t('save_failed') || 'Save failed' });
        });
    }, 1000);
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, [rawItems, businessId, isDirty, isEmbedded, cachedAppConfig, t]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen pb-20 items-center justify-center" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)' }}>
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('loading') || 'Loading...'}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--text-primary)' }}>
      {/* Save Status Pill */}
      <AnimatePresence>
        {saveStatus && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 rounded-full text-[13px] font-semibold text-white shadow-xl pointer-events-none"
            style={{
              bottom: isEmbedded ? 80 : 24,
              background: saveStatus.error ? '#EF4444' : '#22C55E',
            }}
          >
            {saveStatus.message}
          </motion.div>
        )}
      </AnimatePresence>

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

        <div className="flex flex-col gap-3">
          {items.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {t('no_items') || 'No inventory items yet.'}
            </div>
          )}
          {items.map(item => {
            const status = getStatus(item);
            const styles = statusStyles(status);
            const isPulsing = pulseId === item.id;
            return (
              <article
                key={item.id}
                className={`inventory-card flex flex-col gap-3 cursor-pointer ${isPulsing ? 'ring-2 ring-emerald-400/30' : ''}`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex items-start gap-3">
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
                          {t(status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 rounded-2xl p-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[13px] text-slate-400 pl-2">{t('min')}: {item.min} / {t('max')}: {item.max}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="stepper-btn bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="w-10 text-center text-[15px] font-semibold text-slate-800">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="stepper-btn bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      <Plus size={18} />
                    </button>
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
