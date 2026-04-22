import { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { Clock, AlertTriangle, PackageCheck, Circle, Bike, MapPin, ChevronRight, RefreshCw, DollarSign, CheckCircle2, Navigation } from 'lucide-react';
import type { Order } from '@/types';
import { getWaitMinutes, getUrgencyLevel, STATUS_LABELS } from '@/types';
import { useOrders } from '@/hooks/useOrders';

interface OrderCardProps {
  order: Order;
  swipeable?: boolean;
  swipeDirection?: 'horizontal' | 'vertical';
  onSwipeComplete?: (orderId: string) => void;
  compact?: boolean;
  showLocation?: boolean;
  showConfirmDelivery?: boolean;
  onAdvance?: (orderId: string) => void;
}

const SWIPE_THRESHOLD = 100;

function StatusIcon({ status }: { status: Order['status'] }) {
  const props = { size: 16, strokeWidth: 2.5 };
  switch (status) {
    case 'PENDING_VERIFICATION': return <DollarSign {...props} style={{ color: 'var(--status-icon-ready)' }} />;
    case 'TODO': return <Circle {...props} style={{ color: 'var(--status-icon-todo)' }} />;
    case 'PREP': return <Clock {...props} style={{ color: 'var(--status-icon-prep)' }} />;
    case 'READY': return <PackageCheck {...props} style={{ color: 'var(--status-icon-ready)' }} />;
    case 'DISPATCH': return <Bike {...props} style={{ color: 'var(--status-icon-dispatch)' }} />;
    case 'DELIVERING': return <MapPin {...props} style={{ color: 'var(--status-icon-delivering)' }} />;
    case 'DONE': return <CheckCircle2 {...props} style={{ color: 'var(--status-icon-done)' }} />;
  }
}

/** Deep-link to native maps using geo: scheme */
function openNativeMaps(lat: number, lng: number) {
  const url = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent('Delivery')})`;
  window.open(url, '_blank');
}

export default function OrderCard({
  order,
  swipeable = false,
  swipeDirection = 'horizontal',
  onSwipeComplete,
  compact = false,
  showLocation = false,
  showConfirmDelivery = false,
  onAdvance,
}: OrderCardProps) {
  const { selectOrder, verifyCash, confirmDelivery } = useOrders();
  const [isRemoving, setIsRemoving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const bgOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const bgOpacityVertical = useTransform(y, [0, -SWIPE_THRESHOLD], [0, 1]);
  const iconScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.8, 1.2]);
  const iconScaleVertical = useTransform(y, [0, -SWIPE_THRESHOLD], [0.8, 1.2]);

  const urgency = getUrgencyLevel(order.createdAt);
  const waitMins = getWaitMinutes(order.createdAt);

  const isCashPending = order.status === 'PENDING_VERIFICATION';
  const isDelivering = order.status === 'DELIVERING';

  const getCardStyles = () => {
    if (urgency === 'critical' && !isCashPending) return 'animate-urgent-pulse';
    if (urgency === 'warning' && !isCashPending) return 'animate-border-pulse';
    return '';
  };

  const cardBorderColor = isCashPending
    ? 'var(--status-icon-ready)'
    : urgency === 'critical'
    ? 'var(--urgency-critical-border)'
    : urgency === 'warning'
    ? 'var(--urgency-warning-border)'
    : 'var(--urgency-normal-border)';

  const cardBgColor = isCashPending
    ? 'rgba(245, 158, 11, 0.06)'
    : urgency === 'critical'
    ? 'var(--urgency-critical-bg)'
    : urgency === 'warning'
    ? 'var(--urgency-warning-bg)'
    : 'var(--card-bg)';

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (swipeDirection === 'horizontal' && info.offset.x > SWIPE_THRESHOLD) {
      setShowSuccess(true);
      setTimeout(() => {
        setIsRemoving(true);
        setTimeout(() => {
          onSwipeComplete?.(order.id);
          setIsRemoving(false);
          setShowSuccess(false);
        }, 300);
      }, 200);
    } else if (swipeDirection === 'vertical' && info.offset.y < -SWIPE_THRESHOLD) {
      setShowSuccess(true);
      setTimeout(() => {
        setIsRemoving(true);
        setTimeout(() => {
          onSwipeComplete?.(order.id);
          setIsRemoving(false);
          setShowSuccess(false);
        }, 300);
      }, 200);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
      animate(y, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  }, [swipeDirection, order.id, onSwipeComplete, x, y]);

  const handleTap = useCallback(() => {
    if (!swipeable || isCashPending) {
      selectOrder(order.id);
    }
  }, [swipeable, isCashPending, selectOrder, order.id]);

  const handleVerifyCash = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    verifyCash(order.id);
  }, [verifyCash, order.id]);

  const handleConfirmDelivery = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRemoving(true);
    setTimeout(() => {
      confirmDelivery(order.id);
      setIsRemoving(false);
    }, 300);
  }, [confirmDelivery, order.id]);

  const handleNavigate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (order.deliveryCoords) {
      openNativeMaps(order.deliveryCoords.lat, order.deliveryCoords.lng);
    }
  }, [order.deliveryCoords]);

  if (isRemoving) {
    return (
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0, scale: 0.8, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      />
    );
  }

  return (
    <motion.div
      layout="position"
      layoutId={`order-${order.id}`}
      drag={swipeable && !isCashPending && !showConfirmDelivery ? (swipeDirection === 'horizontal' ? 'x' : 'y') : false}
      dragConstraints={swipeDirection === 'horizontal' ? { left: 0, right: 200 } : { top: -200, bottom: 0 }}
      dragElastic={0.15}
      onDragEnd={handleDragEnd}
      style={swipeDirection === 'horizontal' ? { x } : { y }}
      onClick={handleTap}
      className={`relative w-full rounded-xl overflow-hidden mb-3 tap-highlight-transparent cursor-pointer shadow-sm ${getCardStyles()}`}
    >
      {/* ── Swipe background indicators ────────────────────────── */}
      {swipeable && !isCashPending && (
        <>
          {swipeDirection === 'horizontal' ? (
            <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0 flex items-center justify-end pr-6">
              <motion.div style={{ scale: iconScale }}>
                {showSuccess ? <PackageCheck size={32} style={{ color: 'var(--swipe-success)' }} /> : <ChevronRight size={32} style={{ color: 'var(--swipe-hint-text)' }} />}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div style={{ opacity: bgOpacityVertical }} className="absolute inset-0 flex items-start justify-center pt-4">
              <motion.div style={{ scale: iconScaleVertical }}>
                {showSuccess ? <Bike size={32} style={{ color: 'var(--swipe-success)' }} /> : <ChevronRight size={32} className="rotate-[-90deg]" style={{ color: 'var(--swipe-hint-text)' }} />}
              </motion.div>
            </motion.div>
          )}
        </>
      )}

      {/* ── Card content ───────────────────────────────────────── */}
      <div
        className="relative p-4 z-10"
        style={{
          backgroundColor: cardBgColor,
          borderLeftWidth: 4,
          borderLeftColor: cardBorderColor,
          borderTop: '1px solid var(--card-border)',
          borderRight: '1px solid var(--card-border)',
          borderBottom: '1px solid var(--card-border)',
        }}
      >
        {/* Top row: ID + Timer + Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusIcon status={order.status} />
            <span className="text-xs font-mono tracking-tight" style={{ color: 'var(--text-tertiary)' }}>{order.id}</span>
            {order.priority === 'high' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--badge-high-bg)', color: 'var(--badge-high-text)' }}>High</span>
            )}
            {isCashPending && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                Cash
              </span>
            )}
            {order.offlineQueued && (
              <RefreshCw size={12} style={{ color: 'var(--badge-queued)' }} className="animate-sync-spin" />
            )}
          </div>
          {!isCashPending && (
            <div className={`flex items-center gap-1.5 font-mono text-sm font-semibold font-mono-num ${urgency === 'critical' ? 'animate-number-pop' : ''}`} style={{ color: urgency === 'critical' ? 'var(--timer-critical)' : urgency === 'warning' ? 'var(--timer-warning)' : 'var(--timer-normal)' }}>
              {urgency === 'critical' && <AlertTriangle size={14} style={{ color: 'var(--timer-critical)' }} />}
              <Clock size={14} style={{ color: urgency === 'critical' ? 'var(--timer-critical)' : 'var(--text-tertiary)' }} />
              {waitMins}m
            </div>
          )}
        </div>

        {/* Customer + Items */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate" style={{ color: 'var(--text-primary)' }}>{order.customerName}</h3>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
              {order.items.some(i => i.specialInstructions) && <span className="ml-1.5 text-xs" style={{ color: 'var(--has-notes)' }}>&bull; has notes</span>}
            </p>
          </div>
          {showLocation && order.assignedTo && (
            <div className="text-right ml-2">
              <span className="text-xs font-medium" style={{ color: 'var(--status-icon-dispatch)' }}>{order.assignedTo}</span>
            </div>
          )}
        </div>

        {/* ── Verify Cash button (PENDING_VERIFICATION only) ───── */}
        {isCashPending && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
            <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>Payment must be verified before kitchen sees this order.</p>
            <button
              onClick={handleVerifyCash}
              className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ backgroundColor: 'var(--status-icon-ready)', color: '#1a1a1a' }}
            >
              <DollarSign size={16} strokeWidth={2.5} />
              Verify Cash Payment
            </button>
          </div>
        )}

        {/* ── Delivery action bar (DELIVERING only) ────────────── */}
        {showConfirmDelivery && isDelivering && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
            <div className="flex gap-2">
              {order.deliveryCoords && (
                <button
                  onClick={handleNavigate}
                  className="flex-1 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  style={{ backgroundColor: 'var(--filter-active-bg)', color: 'var(--status-icon-prep)' }}
                >
                  <Navigation size={15} />
                  Navigate
                </button>
              )}
              <button
                onClick={handleConfirmDelivery}
                className="flex-[2] py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                style={{ backgroundColor: 'var(--reception-bg)', color: 'var(--reception-text)', border: '1px solid var(--reception-border)' }}
              >
                <CheckCircle2 size={16} />
                Confirm Delivery
              </button>
            </div>
          </div>
        )}

        {/* ── Quick-advance button (non-swipeable, non-delivery, non-cash) */}
        {!compact && !isCashPending && !showConfirmDelivery && !swipeable && (() => {
          const nextLabels: Record<string, string> = {
            TODO: '▶ Start Prep',
            PREP: '✓ Mark Ready',
            READY: '🚴 Dispatch',
            DISPATCH: '📍 Delivering',
          };
          const label = nextLabels[order.status];
          return label ? (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
              <button
                onClick={(e) => { e.stopPropagation(); onAdvance?.(order.id); }}
                className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
                style={{ backgroundColor: 'var(--filter-active-bg)', color: 'var(--status-icon-prep)' }}
              >
                {label}
              </button>
            </div>
          ) : (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-tertiary)' }}>{STATUS_LABELS[order.status]}</span>
                <span className="text-xs" style={{ color: 'var(--tap-hint)' }}>Tap for details</span>
              </div>
            </div>
          );
        })()}

        {/* Compact / swipeable footer */}
        {!compact && !isCashPending && !showConfirmDelivery && swipeable && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-tertiary)' }}>{STATUS_LABELS[order.status]}</span>
              <span className="text-xs" style={{ color: 'var(--tap-hint)' }}>Swipe to advance</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
