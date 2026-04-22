import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, PackageCheck } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import OrderCard from '@/components/OrderCard';

export default function PrepView() {
  const { state, advanceOrderStatus } = useOrders();
  const [filter, setFilter] = useState<'TODO' | 'PREP'>('TODO');
  const [handoffId, setHandoffId] = useState<string | null>(null);

  // Kitchen only sees TODO and PREP — NEVER PENDING_VERIFICATION
  const filteredOrders = state.orders.filter(o => o.status === filter);

  const handleSwipeComplete = (orderId: string) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    if (order.status === 'PREP') {
      setHandoffId(orderId);
      setTimeout(() => {
        advanceOrderStatus(orderId);
        setTimeout(() => setHandoffId(null), 800);
      }, 400);
    } else {
      advanceOrderStatus(orderId);
    }
  };

  const todoCount = state.orders.filter(o => o.status === 'TODO').length;
  const prepCount = state.orders.filter(o => o.status === 'PREP').length;

  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <ChefHat size={20} style={{ color: 'var(--status-icon-prep)' }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Kitchen</h1>
        </div>

        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
          Cash orders hidden until verified by front desk.
        </p>

        {/* Filter tabs */}
        <div className="flex gap-2">
          <FilterTab active={filter === 'TODO'} onClick={() => setFilter('TODO')} label="To-Do" count={todoCount} icon={<Clock size={14} />} activeBorder="var(--status-icon-prep)" activeBg="var(--filter-active-bg)" activeText="var(--status-icon-prep)" />
          <FilterTab active={filter === 'PREP'} onClick={() => setFilter('PREP')} label="In Progress" count={prepCount} icon={<ChefHat size={14} />} activeBorder="var(--status-icon-ready)" activeBg="var(--urgency-warning-bg)" activeText="var(--status-icon-ready)" />
        </div>
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 scrollbar-hide pt-2">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map((order) => (
            <div key={order.id} className="relative">
              {/* Handoff ghost */}
              {handoffId === order.id && (
                <motion.div initial={{ opacity: 1, scale: 1 }} animate={{ opacity: 0, y: -300, scale: 0.6 }} transition={{ duration: 0.8, ease: 'easeIn' }} className="absolute inset-0 z-20 pointer-events-none">
                  <div className="w-full h-full backdrop-blur-sm rounded-xl border-2 border-dashed flex items-center justify-center" style={{ backgroundColor: 'var(--handoff-bg)', borderColor: 'var(--handoff-border)' }}>
                    <PackageCheck size={40} style={{ color: 'var(--handoff-text)' }} />
                  </div>
                </motion.div>
              )}

              <OrderCard order={order} swipeable swipeDirection="horizontal" onSwipeComplete={handleSwipeComplete} showAdvanceButton onAdvance={handleSwipeComplete} />
            </div>
          ))}
        </AnimatePresence>

        {filteredOrders.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            {filter === 'TODO' ? (
              <>
                <ChefHat size={48} className="mb-3" style={{ color: 'var(--empty-icon)' }} />
                <p className="text-sm">All caught up</p>
                <p className="text-xs mt-1 opacity-60">New orders appear here automatically</p>
              </>
            ) : (
              <>
                <PackageCheck size={48} className="mb-3" style={{ color: 'var(--empty-icon)' }} />
                <p className="text-sm">Nothing in progress</p>
                <p className="text-xs mt-1 opacity-60">Swipe right on To-Do orders to start prepping</p>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function FilterTab({ active, onClick, label, count, icon, activeBorder, activeBg, activeText }: {
  active: boolean; onClick: () => void; label: string; count: number; icon: React.ReactNode;
  activeBorder: string; activeBg: string; activeText: string;
}) {
  return (
    <button onClick={onClick} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all duration-200" style={{ borderColor: active ? activeBorder : 'transparent', backgroundColor: active ? activeBg : 'var(--filter-inactive-bg)', color: active ? activeText : 'var(--text-tertiary)', boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>
      {icon}
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs font-mono px-1.5 py-0.5 rounded-md" style={{ backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'var(--btn-secondary-bg)' }}>{count}</span>
    </button>
  );
}
