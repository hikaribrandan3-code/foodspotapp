import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, PackageCheck, MapPin, CheckCircle } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import OrderCard from '@/components/OrderCard';
import MapboxMap from '@/components/MapboxMap';

export default function LogisticsView() {
  const { state, claimDelivery, advanceOrderStatus } = useOrders();
  const [filter, setFilter] = useState<'READY' | 'DISPATCH' | 'DELIVERING'>('READY');

  const filteredOrders = state.orders.filter(o => o.status === filter && o.deliveryType !== 'dine_in');

  const readyCount = state.orders.filter(o => o.status === 'READY' && o.deliveryType !== 'dine_in').length;
  const dispatchCount = state.orders.filter(o => o.status === 'DISPATCH').length;
  const deliveringCount = state.orders.filter(o => o.status === 'DELIVERING').length;

  const handoffOrder = state.orders.find(o => o.id === state.handoffOrderId);

  // Orders with coords for the map (all active delivery states, excluding dine-in)
  const mapOrders = state.orders.filter(
    o => (o.status === 'READY' || o.status === 'DISPATCH' || o.status === 'DELIVERING') && o.deliveryCoords && o.deliveryType !== 'dine_in',
  );

  return (
    <div className="h-full w-full flex flex-col relative">
      {/* ── Scrollable content area (map + orders) ─────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">

        {/* Header */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <Bike size={20} style={{ color: 'var(--status-icon-dispatch)' }} />
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Logistics</h1>
          </div>

          {/* Filter tabs */}
          <div className="grid grid-cols-3 gap-2">
            <FilterTab active={filter === 'READY'} onClick={() => setFilter('READY')} label="Ready" count={readyCount} icon={<PackageCheck size={13} />} activeBorder="var(--status-icon-ready)" activeBg="var(--urgency-warning-bg)" activeText="var(--status-icon-ready)" />
            <FilterTab active={filter === 'DISPATCH'} onClick={() => setFilter('DISPATCH')} label="Dispatch" count={dispatchCount} icon={<Bike size={13} />} activeBorder="var(--status-icon-dispatch)" activeBg="rgba(16,185,129,0.08)" activeText="var(--status-icon-dispatch)" />
            <FilterTab active={filter === 'DELIVERING'} onClick={() => setFilter('DELIVERING')} label="Out" count={deliveringCount} icon={<MapPin size={13} />} activeBorder="var(--status-icon-delivering)" activeBg="rgba(168,85,247,0.08)" activeText="var(--status-icon-delivering)" />
          </div>
        </div>

        {/* ── Mapbox Map ─────────────────────────────────────────── */}
        <div className="px-4 pb-3">
          <MapboxMap orders={mapOrders} driverPosition={state.driverPosition} />
        </div>

        {/* Orders list */}
        <div className="px-4 pb-24">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.06 }}
              >
                {/* Handoff reception */}
                {handoffOrder?.id === order.id && filter === 'READY' && (
                  <motion.div
                    initial={{ opacity: 0, y: -40, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5, duration: 0.6 }}
                    className="mb-3"
                  >
                    <div className="rounded-xl px-4 py-2 flex items-center gap-2" style={{ backgroundColor: 'var(--reception-bg)', border: '1px solid var(--reception-border)' }}>
                      <CheckCircle size={14} style={{ color: 'var(--reception-text)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--reception-text)' }}>Order handed off from kitchen</span>
                    </div>
                  </motion.div>
                )}

                <OrderCard
                  order={order}
                  showLocation
                  showAdvanceButton={filter === 'READY'}
                  onAdvance={advanceOrderStatus}
                  showConfirmDelivery={filter === 'DELIVERING'}
                  showClaimButton={filter === 'READY' && !order.assignedTo && order.deliveryType === 'delivery'}
                  onClaim={claimDelivery}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredOrders.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <Bike size={48} className="mb-3" style={{ color: 'var(--empty-icon)' }} />
              <p className="text-sm">
                {filter === 'READY' ? 'No orders ready for pickup' :
                 filter === 'DISPATCH' ? 'No orders waiting for riders' :
                 'No deliveries in progress'}
              </p>
              <p className="text-xs mt-1 opacity-60">
                {filter === 'READY' ? 'Swipe up on ready orders to dispatch' :
                 filter === 'DISPATCH' ? 'Riders will be assigned automatically' :
                 'Deliveries update in real-time'}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterTab({
  active, onClick, label, count, icon, activeBorder, activeBg, activeText,
}: {
  active: boolean; onClick: () => void; label: string; count: number; icon: React.ReactNode;
  activeBorder: string; activeBg: string; activeText: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all duration-200"
      style={{
        borderColor: active ? activeBorder : 'transparent',
        backgroundColor: active ? activeBg : 'var(--filter-inactive-bg)',
        color: active ? activeText : 'var(--text-tertiary)',
        boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <span className="text-sm font-bold font-mono-num" style={{ color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
        {count}
      </span>
    </button>
  );
}
