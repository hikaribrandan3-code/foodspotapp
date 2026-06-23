import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, BarChart3, Home, Volume2, VolumeX, SlidersHorizontal, Check, Sun, Moon,
} from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useAudioPref } from '@/hooks/useAudioPref';
import { useTheme } from '@/hooks/useTheme';
import { useBusiness } from '@/contexts/BusinessContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Order } from '@/types';
import { getWaitMinutes, getUrgencyLevel } from '@/types';

type Fulfillment = 'all' | 'delivery' | 'pickup' | 'dine_in';

const DARK = {
  screen: '#0b0b0d',
  headerBg: '#0b0b0d',
  headerBorder: 'rgba(255,255,255,0.08)',
  divider: 'rgba(255,255,255,0.07)',
  textPrimary: '#f5f5f7',
  textDim: '#8a8a92',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  blue: '#3b82f6',
  cardWhite: '#1e1e22',
  cardReady: '#16211a',
  cardInk: '#f4f4f5',
  cardInkDim: '#9a9aa8',
  footerBtnBg: 'rgba(255,255,255,0.06)',
  colBg: '#0b0b0d',
};

const LIGHT = {
  screen: '#f1f5f9',
  headerBg: '#ffffff',
  headerBorder: 'rgba(0,0,0,0.08)',
  divider: 'rgba(0,0,0,0.07)',
  textPrimary: '#0f172a',
  textDim: '#64748b',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  blue: '#3b82f6',
  cardWhite: '#ffffff',
  cardReady: '#f0fdf4',
  cardInk: '#18181b',
  cardInkDim: '#6b7280',
  footerBtnBg: 'rgba(0,0,0,0.06)',
  colBg: '#f1f5f9',
};

/* ── Main KDS View ── */
export default function KDSView() {
  const { theme, toggleTheme } = useTheme();
  const { language, t } = useLanguage();
  const C = theme === 'dark' ? DARK : LIGHT;

  const orderLabel = (o: Order): string => {
    const raw = o.orderNumber || o.id?.slice(-4) || '0000';
    const clean = String(raw).replace(/^#/, '');
    return `#${clean}`;
  };

  const fulfillmentTag = (o: Order): { label: string; color: string } => {
    switch (o.deliveryType) {
      case 'delivery': return { label: t('kds_delivery'), color: C.blue };
      case 'pickup': return { label: t('kds_pickup'), color: C.amber };
      case 'dine_in': return { label: t('kds_dine_in'), color: C.green };
      default: return { label: 'ORDER', color: C.textDim };
    }
  };

  const fulfillmentLine = (o: Order): string => {
    if (o.deliveryType === 'dine_in') return o.tableNumber ? `Dine-in / Table ${o.tableNumber}` : 'Dine-in';
    if (o.deliveryType === 'pickup') return 'Pickup';
    if (o.deliveryType === 'delivery') return 'Delivery';
    return 'Order';
  };

  const readyLabel = (o: Order): string => {
    if (o.deliveryType === 'delivery') return '[DELIVERY READY]';
    if (o.deliveryType === 'dine_in') return '[DINE-IN READY]';
    return '[PICKUP READY]';
  };

  const useElapsed = (createdAt: number): string => {
    const [, force] = useState(0);
    useEffect(() => {
      const id = setInterval(() => force(n => n + 1), 1000);
      return () => clearInterval(id);
    }, []);
    const totalSec = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const urgencyColor = (createdAt: number): string => {
    const u = getUrgencyLevel(createdAt);
    if (u === 'critical') return C.red;
    if (u === 'warning') return C.amber;
    return C.green;
  };

  const ItemLines = ({ o, dim }: { o: Order; dim?: boolean }) => (
    <div className="space-y-1">
      {o.items.map((it, i) => (
        <div key={it.id || i}>
          <p className="text-[15px] font-semibold leading-tight" style={{ color: dim ? C.cardInkDim : C.cardInk }}>
            • {it.name}{it.quantity > 1 ? ` x${it.quantity}` : ''}
          </p>
          {it.specialInstructions && (
            <p className="text-[13px] leading-tight pl-3" style={{ color: C.cardInkDim }}>
              {it.specialInstructions}
            </p>
          )}
        </div>
      ))}
    </div>
  );

  const PendingCard = ({ o, onAdvance }: { o: Order; onAdvance: () => void }) => {
    const elapsed = useElapsed(o.createdAt);
    const uc = urgencyColor(o.createdAt);
    const isUrgent = getUrgencyLevel(o.createdAt) === 'critical';

    return (
      <motion.button
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={onAdvance}
        className="w-full text-left rounded-2xl overflow-hidden shadow-lg active:scale-[0.98] transition-transform"
        style={{ background: C.cardWhite }}
      >
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: uc }}>
          <span className="text-[17px] font-black text-white tracking-tight">{orderLabel(o)}</span>
          {isUrgent && (
            <span className="text-[10px] font-black text-white tracking-widest px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.18)' }}>
              URGENT
            </span>
          )}
        </div>
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1"><ItemLines o={o} /></div>
            <span className="text-[15px] font-black font-mono-num shrink-0" style={{ color: uc }}>({elapsed})</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <span className="text-[12px] font-semibold" style={{ color: C.cardInkDim }}>{fulfillmentLine(o)}</span>
            <span className="text-[12px] font-bold tracking-wide" style={{ color: C.cardInk }}>TAP →</span>
          </div>
        </div>
      </motion.button>
    );
  };

  const PreparingCard = ({ o, onAdvance }: { o: Order; onAdvance: () => void }) => {
    const elapsed = useElapsed(o.createdAt);
    const tag = fulfillmentTag(o);

    return (
      <motion.button
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={onAdvance}
        className="w-full text-left rounded-2xl overflow-hidden shadow-lg active:scale-[0.98] transition-transform"
        style={{ background: C.cardWhite }}
      >
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <span className="text-[17px] font-black tracking-tight" style={{ color: C.cardInk }}>{orderLabel(o)}</span>
          <span className="text-[10px] font-black text-white tracking-widest px-2 py-0.5 rounded-md" style={{ background: tag.color }}>
            {tag.label}
          </span>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1"><ItemLines o={o} /></div>
            <span className="text-[15px] font-black font-mono-num shrink-0" style={{ color: C.cardInkDim }}>({elapsed})</span>
          </div>
          <div className="mt-2.5 text-right">
            <span className="text-[12px] font-bold tracking-wide" style={{ color: C.cardInk }}>TAP →</span>
          </div>
        </div>
      </motion.button>
    );
  };

  const ReadyCard = ({ o, onAdvance }: { o: Order; onAdvance: () => void }) => (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={onAdvance}
      className="w-full text-left rounded-2xl overflow-hidden shadow active:scale-[0.98] transition-transform"
      style={{ background: C.cardReady }}
    >
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[17px] font-black tracking-tight" style={{ color: C.cardInk }}>{orderLabel(o)}</span>
        <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: C.green }}>
          <Check size={14} strokeWidth={3} color="#fff" />
        </span>
      </div>
      <div className="px-4 pb-3">
        <ItemLines o={o} dim />
        <p className="text-[11px] font-black tracking-widest mt-2" style={{ color: C.cardInkDim }}>{readyLabel(o)}</p>
      </div>
    </motion.button>
  );

  const Column = ({
    title, count, countColor, children, divider, C: palette,
  }: { title: string; count: number; countColor: string; children: React.ReactNode; divider?: boolean; C: typeof DARK }) => (
    <div className="flex-1 min-w-0 flex flex-col h-full" style={divider ? { borderLeft: `1px solid ${palette.divider}` } : undefined}>
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-[20px] font-black tracking-tight" style={{ color: countColor }}>
          {title} <span style={{ color: countColor }}>({count})</span>
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-6 space-y-3">
        <AnimatePresence mode="popLayout">{children}</AnimatePresence>
      </div>
    </div>
  );
  const { state, advanceOrderStatus, setTab } = useOrders();
  const { tenantSlug } = useBusiness();
  const [audioEnabled, toggleAudio] = useAudioPref();
  const [filter, setFilter] = useState<Fulfillment>('all');
  const [autoClear, setAutoClear] = useState(true);
  const [nowTick, setNowTick] = useState(Date.now());

  // tick for auto-clear recompute
  useEffect(() => {
    if (!autoClear) return;
    const id = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(id);
  }, [autoClear]);

  const locationLabel = (tenantSlug || 'Kitchen').replace(/-/g, ' ');

  const matchFilter = (o: Order) =>
    filter === 'all' || o.deliveryType === filter;

  const pending = useMemo(
    () => state.orders.filter(o => o.status === 'TODO' && matchFilter(o)),
    [state.orders, filter],
  );
  const preparing = useMemo(
    () => state.orders.filter(o => o.status === 'PREP' && matchFilter(o)),
    [state.orders, filter],
  );
  const ready = useMemo(
    () => state.orders.filter(o => {
      if (o.status !== 'READY' || !matchFilter(o)) return false;
      // auto-clear: hide READY cards older than 5 min from the board (non-destructive)
      if (autoClear && getWaitMinutes(o.createdAt) >= 5) {
        void nowTick; // dependency
        return false;
      }
      return true;
    }),
    [state.orders, filter, autoClear, nowTick],
  );

  const cycleFilter = () => {
    const order: Fulfillment[] = ['all', 'delivery', 'pickup', 'dine_in'];
    setFilter(f => order[(order.indexOf(f) + 1) % order.length]);
  };
  const filterLabel = filter === 'all' ? 'All' : fulfillmentTag({ deliveryType: filter } as Order).label;

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: C.screen }}>
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-5 h-14 shrink-0"
        style={{ borderBottom: `1px solid ${C.headerBorder}`, background: C.headerBg }}
      >
        {/* Logo → exit home */}
        <button onClick={() => setTab('board')} className="flex items-center gap-2 group">
          <span className="w-7 h-7 rounded-full flex items-center justify-center font-black text-white text-sm" style={{ background: C.green }}>F</span>
          <span className="text-[16px] font-black" style={{ color: C.textPrimary }}>
            FoodSpot <span style={{ color: C.textDim }}>KDS</span>
          </span>
        </button>

        {/* Center: location */}
        <span className="text-[16px] font-bold capitalize" style={{ color: C.textPrimary }}>{locationLabel}</span>

        {/* Right controls */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5" style={{ color: C.textDim }}>
            <BarChart3 size={16} /><span className="text-[13px] font-semibold">{pending.length + preparing.length} active</span>
          </div>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: C.footerBtnBg, color: C.textDim }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => setTab('board')} className="flex items-center gap-1.5" style={{ color: C.textDim }}>
            <Home size={16} /><span className="text-[13px] font-semibold">{t('kds_exit')}</span>
          </button>
        </div>
      </header>

      {/* ── Columns ── */}
      <div className="flex-1 flex min-h-0" style={{ background: C.colBg }}>
        <Column title={t('kds_pending')} count={pending.length} countColor={C.textPrimary} C={C}>
          {pending.map(o => <PendingCard key={o.id} o={o} onAdvance={() => advanceOrderStatus(o.id)} />)}
        </Column>
        <Column title={t('kds_preparing')} count={preparing.length} countColor={C.textPrimary} divider C={C}>
          {preparing.map(o => <PreparingCard key={o.id} o={o} onAdvance={() => advanceOrderStatus(o.id)} />)}
        </Column>
        <Column title={t('kds_ready')} count={ready.length} countColor={C.green} divider C={C}>
          {ready.map(o => <ReadyCard key={o.id} o={o} onAdvance={() => advanceOrderStatus(o.id)} />)}
        </Column>
      </div>

      {/* ── Footer ── */}
      <footer
        className="flex items-center justify-between px-5 h-14 shrink-0"
        style={{ borderTop: `1px solid ${C.headerBorder}`, background: C.headerBg }}
      >
        <button
          onClick={toggleAudio}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: C.footerBtnBg, color: C.textDim }}
          aria-label={audioEnabled ? 'Mute alerts' : 'Unmute alerts'}
        >
          {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={cycleFilter}
            className="flex items-center gap-2 px-4 h-9 rounded-full text-[13px] font-semibold"
            style={{ background: C.footerBtnBg, color: C.textPrimary }}
          >
            <SlidersHorizontal size={15} /> {filterLabel}
          </button>
          <button
            onClick={() => setAutoClear(a => !a)}
            className="flex items-center gap-2 px-4 h-9 rounded-full text-[13px] font-semibold"
            style={{ background: C.footerBtnBg, color: C.textPrimary }}
          >
            {t('kds_auto_clear')}
            <span
              className="w-9 h-5 rounded-full relative transition-colors"
              style={{ background: autoClear ? C.green : C.footerBtnBg }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{ left: autoClear ? '18px' : '2px', background: autoClear ? '#fff' : C.textDim }}
              />
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}
