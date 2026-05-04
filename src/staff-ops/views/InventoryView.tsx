import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Package, Minus, Plus, AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusiness } from '@/contexts/BusinessContext';
// @ts-ignore
import { supabase } from '../../lib/supabaseClient.js';

interface InventoryItem {
  id: string;
  menu_item_id: string;
  quantity_available: number;
  reorder_level: number;
  updated_at: string;
  menu_item_name: string;
  menu_item_category: string;
}

export default function InventoryView() {
  const { t } = useLanguage();
  const { businessId } = useBusiness();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        id,
        menu_item_id,
        quantity_available,
        reorder_level,
        updated_at,
        menu_items!inventory_menu_item_id_fkey(name, category)
      `)
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setItems(data.map((row: any) => ({
        id: row.id,
        menu_item_id: row.menu_item_id,
        quantity_available: row.quantity_available,
        reorder_level: row.reorder_level ?? 10,
        updated_at: row.updated_at,
        menu_item_name: row.menu_items?.name ?? 'Unknown',
        menu_item_category: row.menu_items?.category ?? 'other',
      })));
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const adjustStock = async (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.quantity_available + delta);
    setUpdating(item.id);

    const { error } = await supabase
      .from('inventory')
      .update({ quantity_available: newQty, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (!error) {
      // log the transaction
      await supabase.from('inventory_transactions').insert({
        business_id: businessId,
        menu_item_id: item.menu_item_id,
        quantity_change: delta,
        notes: delta < 0 ? 'Staff adjustment (used)' : 'Staff adjustment (restock)',
      });

      setItems(prev =>
        prev.map(i => i.id === item.id ? { ...i, quantity_available: newQty } : i)
      );
    }
    setUpdating(null);
  };

  const filtered = items.filter(i =>
    i.menu_item_name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = items.filter(i => i.quantity_available <= i.reorder_level).length;

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: 'var(--app-bg)' }}>
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 border-b transition-colors duration-300"
        style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package size={18} strokeWidth={2.2} style={{ color: 'var(--text-primary)' }} />
            <span className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
              {t('inventory_title')}
            </span>
            {lowStockCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                <AlertTriangle size={10} />
                {lowStockCount} {t('low_stock')}
              </span>
            )}
          </div>
          <button
            onClick={fetchInventory}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <RefreshCw size={15} strokeWidth={2.2} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder={t('search_items')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl outline-none transition-colors"
            style={{
              backgroundColor: 'var(--filter-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--nav-border)',
            }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-20 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Package size={28} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {items.length === 0 ? t('no_inventory') : t('no_results')}
            </p>
          </div>
        ) : (
          filtered.map((item, i) => {
            const isLow = item.quantity_available <= item.reorder_level;
            const isOut = item.quantity_available === 0;
            const isBusy = updating === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors"
                style={{
                  backgroundColor: 'var(--card-bg, var(--nav-bg))',
                  border: `1px solid ${isOut ? 'rgb(239 68 68 / 0.4)' : isLow ? 'rgb(245 158 11 / 0.4)' : 'var(--nav-border)'}`,
                }}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.menu_item_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] capitalize" style={{ color: 'var(--text-tertiary)' }}>
                      {item.menu_item_category}
                    </span>
                    {isOut && (
                      <span className="text-[10px] font-bold text-red-400">{t('out_of_stock')}</span>
                    )}
                    {!isOut && isLow && (
                      <span className="text-[10px] font-bold text-amber-400">{t('low_stock')}</span>
                    )}
                  </div>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjustStock(item, -1)}
                    disabled={isBusy || item.quantity_available === 0}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-30"
                    style={{ backgroundColor: 'var(--filter-bg)', color: 'var(--text-primary)' }}
                  >
                    <Minus size={14} strokeWidth={2.5} />
                  </button>

                  <span
                    className="w-10 text-center text-base font-bold tabular-nums"
                    style={{ color: isOut ? 'rgb(248 113 113)' : isLow ? 'rgb(251 191 36)' : 'var(--text-primary)' }}
                  >
                    {isBusy ? '…' : item.quantity_available}
                  </span>

                  <button
                    onClick={() => adjustStock(item, 1)}
                    disabled={isBusy}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-30"
                    style={{ backgroundColor: 'var(--filter-bg)', color: 'var(--text-primary)' }}
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
