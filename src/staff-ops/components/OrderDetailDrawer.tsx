import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, User, Package, AlertCircle, MapPin, DollarSign, CreditCard, Globe, ChevronRight, MessageCircle, Phone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { getWaitMinutes, getUrgencyLevel, STATUS_LABELS } from '@/types';
import { formatPrice } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

function openWhatsApp(phone: string, customerName: string) {
  const clean = phone.replace(/\D/g, '');
  const msg = encodeURIComponent(`Hola ${customerName} 👋, tu pedido está en camino. ¡Gracias por tu compra!`);
  window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
}

function callPhone(phone: string) {
  window.open(`tel:${phone}`, '_self');
}

export default function OrderDetailDrawer() {
  const { state, selectOrder, verifyCash, confirmDelivery, advanceOrderStatus, confirmPayment } = useOrders();
  const order = state.orders.find(o => o.id === state.selectedOrderId);

  if (!order) return null;

  const urgency = getUrgencyLevel(order.createdAt);
  const waitMins = getWaitMinutes(order.createdAt);
  const isCashPending = order.status === 'PENDING_VERIFICATION';
  const isDelivering = order.status === 'DISPATCH' || order.status === 'DELIVERING';
  const isDone = order.status === 'DONE';

  // Next status label for the advance button — type-aware per FLOW_MAP
  const nextLabels: Record<string, string> = {
    TODO: '▶ Start Prep',
    PREP: '✓ Mark Ready',
    READY: order.deliveryType === 'dine_in' ? '🍽️ Mark Served' :
           order.deliveryType === 'delivery' ? '🚴 Assign Delivery' :
           '✋ Hand Over',
    DISPATCH: '📍 Mark Delivered',
    DONE: '',
  };
  const nextLabel = nextLabels[order.status];

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
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-[60]"
            style={{ backgroundColor: 'var(--drawer-backdrop)' }}
            onClick={() => selectOrder(null)}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 rounded-t-[24px] z-[70] max-h-[90%] flex flex-col shadow-2xl"
            style={{ backgroundColor: 'var(--detail-drawer-bg)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--card-border-strong)' }} />
            </div>

            {/* Header */}
            <div className="px-5 pt-2 pb-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{order.id.slice(0, 8)}…</span>
                  <h2 className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{order.customerName}</h2>
                </div>
                <button
                  onClick={() => selectOrder(null)}
                  className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                  style={{ backgroundColor: 'var(--btn-secondary-bg)' }}
                >
                  <X size={20} style={{ color: 'var(--text-tertiary)' }} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {!isCashPending && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: urgency === 'critical' ? 'var(--urgency-critical-bg)' : urgency === 'warning' ? 'var(--urgency-warning-bg)' : 'var(--btn-secondary-bg)', color: urgency === 'critical' ? 'var(--timer-critical)' : urgency === 'warning' ? 'var(--timer-warning)' : 'var(--timer-normal)' }}>
                    <Clock size={14} />{waitMins}m wait
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-muted)' }}>
                  <Package size={14} />{STATUS_LABELS[order.status]}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize"
                  style={{ backgroundColor: order.paymentMethod === 'cash' ? 'var(--urgency-warning-bg)' : 'var(--btn-secondary-bg)', color: order.paymentMethod === 'cash' ? 'var(--timer-warning)' : 'var(--text-muted)' }}>
                  <PaymentIcon />{order.paymentMethod}
                </span>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">
              {/* Items */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Order Items</h3>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <motion.div key={item.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                      className="rounded-xl p-3" style={{ backgroundColor: 'var(--detail-item-bg)', border: '1px solid var(--detail-item-border)' }}>
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                          style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}>
                          {item.quantity}
                        </span>
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                          {item.specialInstructions && (
                            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--has-notes)' }}>
                              <AlertCircle size={11} />{item.specialInstructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Delivery info */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Customer & Delivery</h3>
                <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--detail-item-bg)', border: '1px solid var(--detail-item-border)' }}>
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>{order.customerName}</span>
                  </div>

                  {order.deliveryAddress && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                      <span style={{ color: 'var(--text-muted)' }}>{order.deliveryAddress}</span>
                    </div>
                  )}

                  {/* Contact buttons */}
                  {order.customerPhone && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => openWhatsApp(order.customerPhone!, order.customerName)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                        style={{ backgroundColor: '#25D366', color: '#fff' }}
                      >
                        <MessageCircle size={16} />
                        WhatsApp
                      </button>
                      <button
                        onClick={() => callPhone(order.customerPhone!)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                        style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}
                      >
                        <Phone size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-5 py-4 space-y-2" style={{ borderTop: '1px solid var(--card-border)' }}>
              {/* Order Total */}
              {!isCashPending && (
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D' }}>
                  <p className="text-xs" style={{ color: '#92400E' }}>Total</p>
                  <p className="text-lg font-bold" style={{ color: '#D97706' }}>
                    {formatPrice(order.total)}
                  </p>
                </div>
              )}

              {/* Verify Cash */}
              {isCashPending && (
                <>
                  <div className="text-center mb-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total to collect</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--status-icon-ready)' }}>
                      {formatPrice(order.total)}
                    </p>
                  </div>
                  <button
                    onClick={() => { verifyCash(order.id); selectOrder(null); }}
                    className="w-full min-h-[52px] py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{ backgroundColor: 'var(--status-icon-ready)', color: '#1a1a1a' }}
                  >
                    <DollarSign size={16} strokeWidth={2.5} />
                    Verify Cash Payment
                  </button>
                </>
              )}

              {/* Advance status (TODO → PREP → READY → DISPATCH → DELIVERING, or dine-in READY → DONE) */}
              {nextLabel && !isCashPending && (
                <button
                  onClick={() => { advanceOrderStatus(order.id); if (!(order.deliveryType === 'dine_in' && order.status === 'READY')) selectOrder(null); }}
                  className="w-full min-h-[52px] py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--filter-active-bg)', color: 'var(--status-icon-prep)', border: '1px solid var(--status-icon-prep)' }}
                >
                  {nextLabel}
                  <ChevronRight size={16} />
                </button>
              )}

              {/* Dine-in payment confirmation (DONE + unpaid) */}
              {order.status === 'DONE' && order.deliveryType === 'dine_in' && !order.cashVerified && (
                <div className="mt-3 space-y-2">
                  {/* MP Alias Display */}
                  {order.alias && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Mercado Pago Alias</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{order.alias}</p>
                    </div>
                  )}
                  <p className="text-xs font-semibold text-center" style={{ color: 'var(--text-tertiary)' }}>
                    Confirm Payment
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { confirmPayment(order.id, 'cash'); selectOrder(null); }}
                      className="flex-1 min-h-[44px] py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                      style={{ backgroundColor: '#f3f4f6', color: '#0a0a0a' }}
                    >
                      💵 Cash
                    </button>
                    <button
                      onClick={() => { confirmPayment(order.id, 'mercado_pago'); selectOrder(null); }}
                      className="flex-1 min-h-[44px] py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                      style={{ backgroundColor: '#f3f4f6', color: '#0a0a0a' }}
                    >
                      📲 Alias
                    </button>
                  </div>
                </div>
              )}

              {isDone && (
                <div className="text-center text-sm py-2" style={{ color: 'var(--text-tertiary)' }}>
                  ✓ Order completed
                </div>
              )}

              <button
                onClick={() => selectOrder(null)}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-colors"
                style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)' }}
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
