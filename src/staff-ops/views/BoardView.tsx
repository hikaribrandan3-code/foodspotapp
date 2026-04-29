import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, LayoutDashboard, Clock, ChefHat, PackageCheck, Bike, DollarSign, CheckCircle2 } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useLanguage } from '@/contexts/LanguageContext';
import OrderCard from '@/components/OrderCard';
import type { OrderStatus } from '@/types';

export default function BoardView() {
  const { state, toggleOnline, advanceOrderStatus, verifyCash, claimDelivery, confirmDelivery } = useOrders();
  const { t } = useLanguage();
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  // Active orders (excluding DONE)
  const activeOrders = useMemo(() => {
    return state.orders
      .filter(o => {
        // Keep in active if not DONE, OR if it's a DONE dine-in order that hasn't been paid
        if (o.status !== 'DONE') return true;
        if (o.deliveryType === 'dine_in' && o.paymentStatus !== 'paid') return true;
        return false;
      })
      .sort((a, b) => {
        const urgencyA = (Date.now() - a.createdAt) / 60000;
        const urgencyB = (Date.now() - b.createdAt) / 60000;
        return urgencyB - urgencyA;
      });
  }, [state.orders]);

  // Completed orders
  const completedOrders = useMemo(() => {
    return state.orders
      .filter(o => {
        if (o.status !== 'DONE') return false;
        if (o.deliveryType === 'dine_in' && o.paymentStatus !== 'paid') return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [state.orders]);

  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus, number> = {
      PENDING_VERIFICATION: 0, TODO: 0, PREP: 0, READY: 0,
      DISPATCH: 0, DONE: 0,
    };
    state.orders.forEach(o => { counts[o.status]++; });
    return counts;
  }, [state.orders]);

  const criticalCount = activeOrders.filter(o =>
    o.status !== 'PENDING_VERIFICATION' && (Date.now() - o.createdAt) / 60000 >= 10,
  ).length;

  const cashPendingCount = statusCounts.PENDING_VERIFICATION;

  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Status bar */}
      <div
        className="h-7 w-full flex items-center justify-between px-4 text-[10px] font-semibold tracking-wide border-b transition-colors duration-300"
        style={{
          backgroundColor: state.isOnline ? 'var(--status-bar-online-bg)' : 'var(--status-bar-offline-bg)',
          borderColor: state.isOnline ? 'var(--status-bar-online-border)' : 'var(--status-bar-offline-border)',
          color: state.isOnline ? 'var(--status-bar-online-text)' : 'var(--status-bar-offline-text)',
        }}
      >
        <div className="flex items-center gap-1.5">
          {state.isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{state.isOnline ? t('online') : t('offline')}</span>
        </div>
        <button onClick={toggleOnline} className="underline opacity-70">{state.isOnline ? 'Test offline' : 'Restore'}</button>
      </div>

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <LayoutDashboard size={20} style={{ color: 'var(--status-icon-prep)' }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('board_title')}</h1>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('active_orders_summary', { count: activeOrders.length })} &bull; 
          {t('cash_pending_summary', { count: cashPendingCount })} &bull; 
          {t('critical_summary', { count: criticalCount })} &bull; 
          {t('delivered_summary', { count: statusCounts.DONE })}
        </p>
      </div>

      {/* Status counters */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-5 gap-2">
          <StatusBadge icon={<DollarSign size={14} />} label={t('cash')} count={cashPendingCount} color="var(--status-icon-ready)" />
          <StatusBadge icon={<Clock size={14} />} label={t('todo')} count={statusCounts.TODO} color="var(--status-icon-todo)" />
          <StatusBadge icon={<ChefHat size={14} />} label={t('prep')} count={statusCounts.PREP} color="var(--status-icon-prep)" />
          <StatusBadge icon={<PackageCheck size={14} />} label={t('ready')} count={statusCounts.READY} color="var(--status-icon-ready)" />
          <StatusBadge icon={<Bike size={14} />} label={t('out')} count={statusCounts.DISPATCH} color="var(--status-icon-dispatch)" />
        </div>
      </div>

      {/* Active / Completed tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-2">
          <TabButton active={tab === 'active'} onClick={() => setTab('active')} label="Active" count={activeOrders.length} />
          <TabButton active={tab === 'completed'} onClick={() => setTab('completed')} label="Completed" count={completedOrders.length} />
        </div>
      </div>

      {/* Order stream */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 scrollbar-hide">
        {tab === 'active' ? (
          <div className="space-y-1">
            {activeOrders.map((order, idx) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04, duration: 0.3 }}>
                <OrderCard
                  order={order}
                  compact={false}
                  showAdvanceButton={order.status !== 'PENDING_VERIFICATION'}
                  onAdvance={advanceOrderStatus}
                  showClaimButton={order.status === 'READY' && !order.assignedTo && order.deliveryType === 'delivery'}
                  onClaim={claimDelivery}
                  showConfirmDelivery={order.status === 'DISPATCH'}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {completedOrders.map((order, idx) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04, duration: 0.3 }}>
                <OrderCard order={order} compact={false} />
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'active' && activeOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--text-secondary)' }}>
            <PackageCheck size={48} className="mb-3" style={{ color: 'var(--empty-icon)' }} />
            <p className="text-sm">{t('all_orders_cleared')}</p>
          </div>
        )}

        {tab === 'completed' && completedOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={48} className="mb-3" style={{ color: 'var(--empty-icon)' }} />
            <p className="text-sm">No completed orders yet</p>
          </div>
        )}
      </div>

    </div>
  );
}

function StatusBadge({ icon, label, count, color }: {
  icon: React.ReactNode; label: string; count: number; color: string;
}) {
  return (
    <div className="rounded-xl px-2 py-2.5 flex flex-col items-center" style={{ backgroundColor: 'var(--counter-bg)', border: '1px solid var(--counter-border)' }}>
      <span className="mb-1" style={{ color }}>{icon}</span>
      <span className="text-base font-bold font-mono-num" style={{ color: 'var(--counter-count)' }}>{count}</span>
      <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
    </div>
  );
}

function TabButton({ active, onClick, label, count }: {
  active: boolean; onClick: () => void; label: string; count: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
      style={{
        backgroundColor: active ? 'var(--filter-active-bg)' : 'var(--counter-bg)',
        color: active ? 'var(--filter-active-text)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--filter-active-border, var(--card-border))' : 'var(--counter-border)'}`,
      }}
    >
      {label} ({count})
    </button>
  );
}
