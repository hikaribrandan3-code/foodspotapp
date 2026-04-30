import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, User, Package, AlertCircle, MapPin, DollarSign, CreditCard, Globe, ChevronRight, MessageCircle, Phone } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '../../lib/supabaseClient.js';
import { getWaitMinutes, getUrgencyLevel, STATUS_LABELS } from '@/types';

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
  const { businessId } = useBusiness();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [showingAlias, setShowingAlias] = useState(false);
  const [mpAlias, setMpAlias] = useState<string | undefined>(undefined);
  const order = state.orders.find(o => o.id === state.selectedOrderId);

  useEffect(() => {
    if (!businessId) return;
    supabase
      .from('branding')
      .select('app_config')
      .eq('business_id', businessId)
      .single()
      .then(({ data }: { data: any }) => {
        const alias = data?.app_config?.payments?.mercadoPagoAlias;
        setMpAlias(alias || undefined);
      })
      .catch(() => setMpAlias(undefined));
  }, [businessId]);

  if (!order) return null;

  const urgency = getUrgencyLevel(order.createdAt);
  const waitMins = getWaitMinutes(order.createdAt);
  const isCashPending = order.status === 'PENDING_VERIFICATION';
  const isDispatch = order.status === 'DISPATCH';
  const isDone = order.status === 'DONE';
  const isDineIn = order.deliveryType === 'dine_in';
  const isUnpaid = order.paymentStatus !== 'paid';

  // Next status label for the advance button
  const isDeliveryOrder = order.deliveryType === 'delivery';
  const nextLabels: Record<string, string> = {
    TODO: '▶ Start Prep',
    PREP: '✓ Mark Ready',
    READY: isDeliveryOrder ? '🚴 Dispatch' : '✓ Mark Delivered',
    DISPATCH: '📦 Confirm Delivery',
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
                  <h2 className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{isDineIn ? `Table ${order.tableNumber}` : order.customerName}</h2>
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
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  {isDineIn ? 'Table Info' : 'Customer & Delivery'}
                </h3>
                <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--detail-item-bg)', border: '1px solid var(--detail-item-border)' }}>
                  {isDineIn ? (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} />
                      <span style={{ color: 'var(--text-muted)' }}>Table {order.tableNumber}</span>
                    </div>
                  ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>{order.customerName}</span>
                  </div>
                  )}

                  {order.deliveryAddress && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                      <span style={{ color: 'var(--text-muted)' }}>{order.deliveryAddress}</span>
                    </div>
                  )}

                  {/* Contact buttons */}
                  {!isDineIn && order.customerPhone && (
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
              {/* Verify Cash */}
              {isCashPending && (
                <button
                  onClick={() => { verifyCash(order.id); selectOrder(null); }}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: '#22C55E', color: '#fff' }}
                >
                  <DollarSign size={16} strokeWidth={2.5} />
                  Verify Cash Payment
                </button>
              )}

              {/* Advance status (TODO → PREP → READY → DISPATCH → DONE) */}
              {nextLabel && !isCashPending && (
                <button
                  onClick={() => { advanceOrderStatus(order.id); selectOrder(null); }}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--filter-active-bg)', color: 'var(--status-icon-prep)', border: '1px solid var(--status-icon-prep)' }}
                >
                  {nextLabel}
                  <ChevronRight size={16} />
                </button>
              )}

              {/* Confirm Delivery */}
              {isDispatch && (
                <button
                  onClick={() => { confirmDelivery(order.id); selectOrder(null); }}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--reception-bg)', color: 'var(--reception-text)', border: '1px solid var(--reception-border)' }}
                >
                  <Package size={16} />
                  Confirm Delivery ✓
                </button>
              )}

              {(isDone && isDineIn && isUnpaid) || (isDispatch && isDeliveryOrder && isUnpaid) ? (
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: '#f97316', color: '#fff' }}
                >
                  <DollarSign size={16} />
                  {isDispatch ? 'Collect Payment' : 'Confirm Payment'}
                </button>
              ) : null}

              {isDone && !(isDineIn && isUnpaid) && (
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

          {/* Payment method modal */}
          {paymentModalOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[80] flex items-center justify-center"
              style={{ backgroundColor: 'rgba(15, 27, 45, 0.4)' }}
              onClick={() => !paymentProcessing && !showingAlias && setPaymentModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="rounded-2xl shadow-2xl"
                style={{ backgroundColor: 'var(--detail-drawer-bg)', maxWidth: 380, padding: 32, border: '1px solid var(--line-2)' }}
              >
                {!showingAlias ? (
                  <>
                    <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)', fontSize: 18, margin: 0 }}>{isDispatch ? 'Collect Payment' : 'How did they pay?'}</h3>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)', margin: '0 0 24px 0' }}>Order #{order.orderNumber}{isDispatch && ' — At Door'}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={async () => {
                          setPaymentProcessing(true);
                          await confirmPayment(order.id, 'cash');
                          await new Promise(resolve => setTimeout(resolve, 800));
                          setPaymentModalOpen(false);
                          setPaymentProcessing(false);
                          setShowingAlias(false);
                        }}
                        disabled={paymentProcessing}
                        className="py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                        style={{ backgroundColor: '#E2F5EA', color: '#1F7A45', opacity: paymentProcessing ? 0.6 : 1, cursor: paymentProcessing ? 'not-allowed' : 'pointer' }}
                        onMouseEnter={(e) => !paymentProcessing && (e.currentTarget.style.backgroundColor = '#d4f5e9')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#E2F5EA')}
                      >
                        {paymentProcessing ? 'Processing...' : 'Cash'}
                      </button>
                      <button
                        onClick={() => setShowingAlias(true)}
                        disabled={paymentProcessing}
                        className="py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                        style={{ backgroundColor: '#fed7aa', color: '#b45309', opacity: paymentProcessing ? 0.6 : 1, cursor: paymentProcessing ? 'not-allowed' : 'pointer' }}
                        onMouseEnter={(e) => !paymentProcessing && (e.currentTarget.style.backgroundColor = '#feccaa')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fed7aa')}
                      >
                        MP Alias
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)', fontSize: 18, margin: 0 }}>Customer pays via Alias</h3>
                    <div className="mb-6 p-5 rounded-xl text-center" style={{ backgroundColor: '#fed7aa', border: '2px solid #f97316' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#92400e', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MP Alias</p>
                      <p className="text-2xl font-bold" style={{ color: '#b45309', margin: 0, fontFamily: 'monospace', fontSize: 28, fontWeight: 800 }}>{mpAlias}</p>
                    </div>
                    <button
                      onClick={async () => {
                        setPaymentProcessing(true);
                        await confirmPayment(order.id, 'mercado_pago');
                        await new Promise(resolve => setTimeout(resolve, 800));
                        setPaymentModalOpen(false);
                        setPaymentProcessing(false);
                        setShowingAlias(false);
                      }}
                      disabled={paymentProcessing}
                      className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 mb-2"
                      style={{ backgroundColor: '#E2F5EA', color: '#1F7A45', opacity: paymentProcessing ? 0.6 : 1, cursor: paymentProcessing ? 'not-allowed' : 'pointer' }}
                      onMouseEnter={(e) => !paymentProcessing && (e.currentTarget.style.backgroundColor = '#d4f5e9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#E2F5EA')}
                    >
                      {paymentProcessing ? 'Verified…' : '✓ Verified'}
                    </button>
                    <button
                      onClick={() => setShowingAlias(false)}
                      disabled={paymentProcessing}
                      className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
                      style={{ backgroundColor: '#f3f4f6', color: 'var(--text-primary)', border: '1px solid var(--line-2)', cursor: paymentProcessing ? 'not-allowed' : 'pointer' }}
                      onMouseEnter={(e) => !paymentProcessing && (e.currentTarget.style.backgroundColor = '#e5e7eb')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                    >
                      ← Back
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
