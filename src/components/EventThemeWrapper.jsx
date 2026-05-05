import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardList as Assignment, Ticket as TicketIcon, Sun, Moon, Home, Camera } from 'lucide-react';
import EventsView from '../pages/customer/events/EventsView';
import MyTickets from '../pages/customer/events/views/MyTickets';

const LIGHT_TOKENS = {
  '--color-primary': '#10b981',
  '--text-primary': '#1e293b',
  '--text-secondary': '#64748b',
  '--border-color': '#e2e8f0',
  '--canvas-bg': '#f8fafc',
  '--canvas-text': '#1e293b',
  '--canvas-text-muted': '#64748b',
  '--canvas-surface': '#ffffff',
  '--canvas-surface-text': '#1e293b',
  '--icon-primary': '#374151',
  '--icon-secondary': '#6B7280',
  '--icon-muted': '#9CA3AF',
  '--border-subtle': 'rgba(0,0,0,0.06)',
  '--border-visible': 'rgba(0,0,0,0.10)',
  '--shadow-card': '0px 2px 8px rgba(0,0,0,0.08)',
  '--shadow-raised': '0px 8px 24px rgba(0,0,0,0.12)',
};

const DARK_TOKENS = {
  '--color-primary': '#10b981',
  '--text-primary': '#f1f5f9',
  '--text-secondary': '#94a3b8',
  '--border-color': '#1e293b',
  '--canvas-bg': '#020617',
  '--canvas-text': '#f1f5f9',
  '--canvas-text-muted': '#94a3b8',
  '--canvas-surface': '#0f172a',
  '--canvas-surface-text': '#f1f5f9',
  '--icon-primary': '#E5E7EB',
  '--icon-secondary': '#9CA3AF',
  '--icon-muted': '#6B7280',
  '--border-subtle': 'rgba(255,255,255,0.04)',
  '--border-visible': 'rgba(255,255,255,0.06)',
  '--shadow-card': '0px 6px 18px rgba(0,0,0,0.45)',
  '--shadow-raised': '0px 12px 32px rgba(0,0,0,0.6)',
};

/* ─── Responsive nav constants (single source of truth) ─── */
const NAV_HEIGHT = 'clamp(80px, 12vh, 110px)';
const NAV_GAP = 'clamp(24px, 4vw, 40px)';
const NAV_PB = 'clamp(12px, 2vh, 24px)';
const ICON_SIZE = 'clamp(28px, 4.2vw, 38px)';        // Events / My Tickets  +20%
const CAM_ICON_SIZE = 'clamp(28px, 4.2vw, 38px)';   // Camera icon  same +20% as events
const LABEL_SIZE = 'clamp(11px, 1.4vw, 16px)';
const BTN_GAP = 'clamp(5px, 1.2vh, 10px)';
const BTN_PY = 'clamp(10px, 1.8vh, 20px)';
const FAB_SIZE = 'clamp(56px, 8.568vw, 76px)';      // Camera button +2% larger
const FAB_OFFSET = 'clamp(20px, 4vh, 32px)';        // Elevated higher
const FAB_RADIUS = 'clamp(24px, 3.5vw, 34px)';
const FAB_BORDER = 'clamp(5px, 1vw, 8px)';
const DROP_H = 'clamp(8px, 2vh, 12px)';
const DROP_BLUR = 'clamp(16px, 3vw, 32px)';
const SIDE_MARGIN = 'clamp(12px, 10vw, 48px)';      // Push side buttons ~10% toward edges

export default function EventThemeWrapper() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const [view, setView] = useState('events'); // 'events' | 'my-tickets'
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('event-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('event-theme', theme);
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    document.body.classList.add('event-route');
    return () => {
      document.body.classList.remove('event-route');
      document.body.classList.remove('dark');
    };
  }, []);

  const style = useMemo(() => {
    const tokens = theme === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;
    return {
      fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif',
      ...tokens,
    };
  }, [theme]);

  const openCamera = () => {
    navigate(`/${tenantSlug || ''}/camera`);
  };

  const navBtnBase = 'flex flex-col items-center transition-all';
  const navBtnActive = 'text-[var(--color-primary)]';
  const navBtnInactive = 'text-slate-300 dark:text-slate-600';

  return (
    <div
      className={`${theme === 'dark' ? 'dark' : ''} min-h-[100dvh] relative`}
      style={{
        backgroundColor: style['--canvas-bg'],
        fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Green Home Button */}
      <div className="fixed top-4 right-4 z-[160]">
        <button
          onClick={() => navigate(`/${tenantSlug || ''}`)}
          className="flex flex-col items-center gap-0.5 active:scale-95 transition-all"
          aria-label="Home"
        >
          <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/20">
            <Home size={20} className="text-white" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Home</span>
        </button>
      </div>

      {/* Floating Theme Toggle */}
      <div className="fixed bottom-24 left-6 z-[160] flex flex-col gap-3">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl active:scale-95 transition-all"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? (
            <Sun size={20} className="text-orange-500" />
          ) : (
            <Moon size={20} className="text-blue-400" />
          )}
        </button>
      </div>

      {/* Main Content Area — fluid height minus responsive nav */}
      <div
        className="pt-4 overflow-y-auto"
        style={{ height: `calc(100dvh - ${NAV_HEIGHT})` }}
      >
        {view === 'events' && (
          <EventsView onViewTickets={() => setView('my-tickets')} />
        )}
        {view === 'my-tickets' && <MyTickets />}
      </div>

      {/* Bottom Navigation: Events | Camera | My Tickets */}
      <nav
        className="fixed bottom-0 w-full z-50 flex justify-between items-center px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t shadow-[0_-8px_30px_rgba(0,0,0,0.05)]"
        style={{
          borderColor: 'var(--border-color)',
          height: NAV_HEIGHT,
          paddingBottom: `calc(${NAV_PB} + env(safe-area-inset-bottom))`,
        }}
      >
        {/* Events Button */}
        <button
          onClick={() => setView('events')}
          className={`${navBtnBase} ${view === 'events' ? navBtnActive : navBtnInactive}`}
          style={{ gap: BTN_GAP, paddingTop: BTN_PY, paddingBottom: BTN_PY, minWidth: 44, minHeight: 44, marginLeft: SIDE_MARGIN }}
        >
          <TicketIcon
            style={{ width: ICON_SIZE, height: ICON_SIZE }}
            strokeWidth={view === 'events' ? 2.5 : 2}
          />
          <span
            className="font-bold uppercase"
            style={{ fontSize: LABEL_SIZE, letterSpacing: 'clamp(0.05em, 0.1vw, 0.15em)' }}
          >
            Events
          </span>
        </button>

        {/* Center Camera Button */}
        <div
          className="flex justify-center relative"
          style={{ width: 'clamp(72px, 10vw, 96px)', transform: `translateY(-${FAB_OFFSET})` }}
        >
          <div
            className="absolute inset-x-0 bg-black/20 rounded-full opacity-40"
            style={{ bottom: -12, height: DROP_H, filter: `blur(${DROP_BLUR})` }}
          />
          <button
            onClick={openCamera}
            className="flex items-center justify-center transition-all duration-500 active:scale-95 cursor-pointer overflow-hidden relative group bg-[var(--color-primary)] text-white"
            style={{
              width: FAB_SIZE,
              height: FAB_SIZE,
              borderRadius: FAB_RADIUS,
              border: `${FAB_BORDER} solid var(--canvas-bg)`,
              boxShadow: '0 clamp(12px, 2vh, 20px) clamp(24px, 4vh, 40px) rgba(0,0,0,0.3)',
              minWidth: 44,
              minHeight: 44,
            }}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Camera
              style={{ width: CAM_ICON_SIZE, height: CAM_ICON_SIZE }}
              strokeWidth={2.5}
              className="relative z-10"
            />
          </button>
        </div>

        {/* My Tickets Button */}
        <button
          onClick={() => setView('my-tickets')}
          className={`${navBtnBase} ${view === 'my-tickets' ? navBtnActive : navBtnInactive}`}
          style={{ gap: BTN_GAP, paddingTop: BTN_PY, paddingBottom: BTN_PY, minWidth: 44, minHeight: 44, marginRight: SIDE_MARGIN }}
        >
          <Assignment
            style={{ width: ICON_SIZE, height: ICON_SIZE }}
            strokeWidth={view === 'my-tickets' ? 2.5 : 2}
          />
          <span
            className="font-bold uppercase"
            style={{ fontSize: LABEL_SIZE, letterSpacing: 'clamp(0.05em, 0.1vw, 0.15em)' }}
          >
            My Tickets
          </span>
        </button>
      </nav>
    </div>
  );
}
