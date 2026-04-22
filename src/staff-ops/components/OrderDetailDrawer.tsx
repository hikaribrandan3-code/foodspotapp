import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, User, Package, AlertCircle, MapPin, DollarSign, CreditCard, Globe } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { getWaitMinutes, getUrgencyLevel, STATUS_LABELS } from '@/types';

export default function OrderDetailDrawer() {
  const { state, selectOrder, verifyCash, confirmDelivery } = useOrders();
  const order = state.orders.find(o => o.id === state.selectedOrderId);

  if (!order) return null;

  const urgency = getUrgencyLevel(order.createdAt);
  const waitMins = getWaitMinutes(order.createdAt);
  const isCashPending = order.status === 'PENDING_VERIFICATION';
  const isDelivering = order.status === 'DELIVERING';

  const PaymentIcon = () => {
    if (order.paymentMethod === 'cash') return <DollarSign size={14} />;
    if (order.paymentMethod === 'card') return <CreditCard size={14} />;
    return <Globe size={14} />;
  };

  return (
    <AnimatePresence>
      {state.selectedOrderId && (
        <>
          {/* Backdrop */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 z-[60]" style={{ backgroundColor: 'var(--drawer-backdrop)' }} onClick={() => selectOrder(null)} />

          {/* Drawer */}
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} className="absolute bottom-0 left-0 right-0 rounded-t-[24px] z-[70] max-h-[85%] flex flex-col shadow-2xl" style={{ backgroundColor: 'var(--detail-drawer-bg)' }}>
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--card-border-strong)' }} />
            </div>

            {/* Header */}
            <div className="px-5 pt-2 pb-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{order.id}</span>
                  <h2 className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{order.customerName}</h2>
                </div>
                <button onClick={() => selectOrder(null)} className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform" style={{ backgroundColor: 'var(--btn-secondary-bg)' }}>
                  <X size={20} style={{ color: 'var(--text-tertiary)' }} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {!isCashPending && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: urgency === 'critical' ? 'var(--urgency-critical-bg)' : urgency === 'warning' ? 'var(--urgency-warning-bg)' : 'var(--btn-secondary-bg)', color: urgency === 'critical' ? 'var(--timer-critical)' : urgency === 'warning' ? 'var(--timer-warning)' : 'var(--timer-normal)' }}>
                    <Clock size={14} />{waitMins}m wait
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-muted)' }}>
                  <Package size={14} />{STATUS_LABELS[order.status]}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize" style={{ backgroundColor: order.paymentMethod === 'cash' ? 'var(--urgency-warning-bg)' : 'var(--btn-secondary-bg)', color: order.paymentMethod === 'cash' ? 'var(--timer-warning)' : 'var(--text-muted)' }}>
                  <PaymentIcon />{order.paymentMethod}
                </span>
                {order.assignedTo && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'var(--reception-bg)', color: 'var(--reception-text)' }}>
                    <MapPin size={14} />{order.assignedTo}
                  </span>
                )}
              </div>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-hide">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Order Manifest</h3>
              {order.items.map((item, idx) => (
                <motion.div key={item.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="rounded-xl p-4" style={{ backgroundColor: 'var(--detail-item-bg)', border: '1px solid var(--detail-item-border)' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}>{item.quantity}</span>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                        {item.specialInstructions && (
                          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--has-notes)' }}><AlertCircle size={12} />{item.specialInstructions}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Delivery Info */}
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Delivery Info</h3>
                <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'var(--detail-item-bg)', border: '1px solid var(--detail-item-border)' }}>
                  <div className="flex items-center gap-2 text-sm"><User size={14} style={{ color: 'var(--text-tertiary)' }} /><span style={{ color: 'var(--text-muted)' }}>{order.customerName}</span></div>
                  <div className="flex items-center gap-2 text-sm"><MapPin size={14} style={{ color: 'var(--text-tertiary)' }} /><span style={{ color: 'var(--text-muted)' }}>42 West 24th St, Apt 3B</span></div>
                  {order.deliveryCoords && (
                    <div className="flex items-center gap-2 text-sm font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <MapPin size={14} />{order.deliveryCoords.lat.toFixed(4)}, {order.deliveryCoords.lng.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom action area */}
            <div className="px-5 py-4" style={{ borderTop: '1px solid var(--card-border)' }}>
              {/* Verify Cash button in drawer */}
              {isCashPending && (
                <button
                  onClick={() => { verifyCash(order.id); selectOrder(null); }}
                  className="w-full py-3.5 mb-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--status-icon-ready)', color: '#1a1a1a' }}
                >
                  <DollarSign size={16} strokeWidth={2.5} />
                  Verify Cash Payment
                </button>
              )}

              {/* Confirm Delivery button in drawer */}
              {isDelivering && (
                <button
                  onClick={() => { confirmDelivery(order.id); selectOrder(null); }}
                  className="w-full py-3.5 mb-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--reception-bg)', color: 'var(--reception-text)', border: '1px solid var(--reception-border)' }}
                >
                  <Package size={16} />
                  Confirm Delivery
                </button>
              )}

              <button onClick={() => selectOrder(null)} className="w-full py-3.5 rounded-xl font-semibold transition-colors" style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}>
                Close Details
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
