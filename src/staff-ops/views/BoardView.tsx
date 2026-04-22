import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, LayoutDashboard, Clock, ChefHat, PackageCheck, Bike, DollarSign, Plus } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import OrderCard from '@/components/OrderCard';
import ManualOrderModal from '@/components/ManualOrderModal';
import type { OrderStatus } from '@/types';

export default function BoardView() {
  const { state, toggleOnline, advanceOrderStatus } = useOrders();
  const [manualOrderOpen, setManualOrderOpen] = useState(false);

  // Active orders (excluding DONE)
  const activeOrders = useMemo(() => {
    return state.orders
      .filter(o => o.status !== 'DONE')
      .sort((a, b) => {
        const urgencyA = (Date.now() - a.createdAt) / 60000;
        const urgencyB = (Date.now() - b.createdAt) / 60000;
        return urgencyB - urgencyA;
      });
  }, [state.orders]);

  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus, number> = {
      PENDING_VERIFICATION: 0, TODO: 0, PREP: 0, READY: 0,
      DISPATCH: 0, DELIVERING: 0, DONE: 0,
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
          <span>{state.isOnline ? 'ONLINE' : 'OFFLINE — Actions Queued'}</span>
        </div>
        <button onClick={toggleOnline} className="underline opacity-70">{state.isOnline ? 'Test offline' : 'Restore'}</button>
      </div>

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <LayoutDashboard size={20} style={{ color: 'var(--status-icon-prep)' }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Mission Control</h1>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{activeOrders.length} active &bull; {cashPendingCount} cash pending &bull; {criticalCount} critical</p>
      </div>

      {/* Status counters */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-5 gap-2">
          <StatusBadge icon={<DollarSign size={14} />} label="Cash" count={cashPendingCount} color="var(--status-icon-ready)" />
          <StatusBadge icon={<Clock size={14} />} label="To-Do" count={statusCounts.TODO} color="var(--status-icon-todo)" />
          <StatusBadge icon={<ChefHat size={14} />} label="Prep" count={statusCounts.PREP} color="var(--status-icon-prep)" />
          <StatusBadge icon={<PackageCheck size={14} />} label="Ready" count={statusCounts.READY} color="var(--status-icon-ready)" />
          <StatusBadge icon={<Bike size={14} />} label="Out" count={statusCounts.DISPATCH + statusCounts.DELIVERING} color="var(--status-icon-dispatch)" />
        </div>
      </div>

      {/* Order stream */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 scrollbar-hide">
        <div className="space-y-1">
          {activeOrders.map((order, idx) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04, duration: 0.3 }}>
              <OrderCard order={order} compact={false} onSwipeComplete={advanceOrderStatus} onAdvance={advanceOrderStatus} />
            </motion.div>
          ))}
        </div>

        {activeOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--text-secondary)' }}>
            <PackageCheck size={48} className="mb-3" style={{ color: 'var(--empty-icon)' }} />
            <p className="text-sm">All orders cleared</p>
          </div>
        )}
      </div>

      {/* Manual Order FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setManualOrderOpen(true)}
        className="absolute bottom-24 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        style={{ backgroundColor: 'var(--filter-active-bg)', color: 'var(--filter-active-text)' }}
        title="Create manual order"
      >
        <Plus size={22} />
      </motion.button>

      <ManualOrderModal open={manualOrderOpen} onClose={() => setManualOrderOpen(false)} />
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
