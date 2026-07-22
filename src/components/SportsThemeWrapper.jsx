import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Trophy, ShoppingBag, Swords, User, Sun, Moon, Home, Camera } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import TorneosView from '../pages/customer/sports/TorneosView';
import EquiposView from '../pages/customer/sports/EquiposView';
import MisPartidosView from '../pages/customer/sports/MisPartidosView';
import MiPerfilView from '../pages/customer/sports/MiPerfilView';

const LIGHT_TOKENS = {
  '--color-primary': '#10b981',
  '--color-accent': '#84cc16',
  '--text-primary': '#1e293b',
  '--text-secondary': '#64748b',
  '--border-color': '#e2e8f0',
  '--canvas-bg': '#f0fdf4',
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
  '--color-accent': '#a3e635',
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

/* ─── Responsive nav constants (single source of truth, 4-tab + center FAB) ─── */
const NAV_HEIGHT = 'clamp(80px, 12vh, 110px)';
const NAV_PB = 'clamp(12px, 2vh, 24px)';
const ICON_SIZE = 'clamp(24px, 3.6vw, 32px)';
const LABEL_SIZE = 'clamp(9px, 1.2vw, 13px)';
const BTN_GAP = 'clamp(5px, 1.2vh, 10px)';
const BTN_PY = 'clamp(10px, 1.8vh, 20px)';
const FAB_OFFSET = 'clamp(26px, 5vh, 38px)';
const DROP_H = 'clamp(8px, 2vh, 12px)';
const DROP_BLUR = 'clamp(16px, 3vw, 32px)';
const SIDE_MARGIN = 'clamp(4px, 3vw, 20px)';

const TABS = [
  { id: 'torneos', label: 'Torneos', icon: Trophy },
  { id: 'equipos', label: 'Equipos', icon: ShoppingBag },
  { id: 'partidos', label: 'Mis Partidos', icon: Swords },
  { id: 'perfil', label: 'Mi Perfil', icon: User },
];

export default function SportsThemeWrapper() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const { businessId } = useTenant();
  const [searchParams] = useSearchParams();
  // Mercado Pago returns to /deportes?...&kind=tournament|rental — open the
  // matching tab so the confirmation screen (handled inside that view) is visible.
  const [tab, setTab] = useState(() => (searchParams.get('kind') === 'rental' ? 'equipos' : 'torneos'));
  const [stage, setStage] = useState('list'); // tracks nested sub-stage to hide HOME on detail screens
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sports-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('sports-theme', theme);
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    document.body.classList.add('sports-route');
    return () => {
      document.body.classList.remove('sports-route');
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

  const changeTab = (id) => {
    setTab(id);
    setStage('list');
  };

  const navBtnBase = 'flex flex-col items-center transition-all';
  const navBtnActive = 'text-[var(--color-primary)]';
  const navBtnInactive = 'text-slate-300 dark:text-slate-600';

  const leftTabs = TABS.slice(0, 2);
  const rightTabs = TABS.slice(2);

  return (
    <div
      className={`${theme === 'dark' ? 'dark' : ''} min-h-[100dvh] relative`}
      style={{
        backgroundColor: style['--canvas-bg'],
        fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Home Button — only on top-level list screens */}
      {stage === 'list' && (
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
      )}

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
        {tab === 'torneos' && <TorneosView businessId={businessId} onStageChange={setStage} />}
        {tab === 'equipos' && <EquiposView businessId={businessId} onStageChange={setStage} />}
        {tab === 'partidos' && <MisPartidosView businessId={businessId} onStageChange={setStage} />}
        {tab === 'perfil' && <MiPerfilView businessId={businessId} onStageChange={setStage} />}
      </div>

      {/* Bottom Navigation: Torneos | Equipos | Camera | Mis Partidos | Mi Perfil */}
      <nav
        className="fixed bottom-0 w-full z-50 flex justify-between items-center px-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t shadow-[0_-8px_30px_rgba(0,0,0,0.05)]"
        style={{
          borderColor: 'var(--border-color)',
          height: NAV_HEIGHT,
          paddingBottom: `calc(${NAV_PB} + env(safe-area-inset-bottom))`,
        }}
      >
        <div className="flex items-center" style={{ marginLeft: SIDE_MARGIN, gap: 'clamp(8px, 3vw, 24px)' }}>
          {leftTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => changeTab(id)}
              className={`${navBtnBase} ${tab === id ? navBtnActive : navBtnInactive}`}
              style={{ gap: BTN_GAP, paddingTop: BTN_PY, paddingBottom: BTN_PY, minWidth: 44, minHeight: 44 }}
            >
              <Icon style={{ width: ICON_SIZE, height: ICON_SIZE }} strokeWidth={tab === id ? 2.5 : 2} />
              <span className="font-bold uppercase whitespace-nowrap" style={{ fontSize: LABEL_SIZE, letterSpacing: 'clamp(0.03em, 0.08vw, 0.1em)' }}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Center Camera Button — elevated inside the nav row */}
        <div
          className="flex justify-center relative"
          style={{ width: 'clamp(68px, 10vw, 88px)', transform: `translateY(-${FAB_OFFSET})` }}
        >
          <div
            className="absolute inset-x-0 bg-black/20 rounded-full opacity-40"
            style={{ bottom: -10, height: DROP_H, filter: `blur(${DROP_BLUR})` }}
          />
          <button
            onClick={openCamera}
            className="flex items-center justify-center transition-all duration-500 active:scale-95 cursor-pointer overflow-hidden relative group bg-[var(--color-primary)] text-white"
            style={{
              width: 'clamp(65px, 9vw, 76px)',
              height: 'clamp(65px, 9vw, 76px)',
              borderRadius: '50%',
              border: `clamp(4px, 0.6vw, 5px) solid var(--canvas-bg)`,
              boxShadow: theme === 'dark'
                ? '0 4px 14px rgba(0,0,0,0.25), 0 0 24px rgba(16, 185, 129, 0.35)'
                : '0 4px 14px rgba(0,0,0,0.25)',
              minWidth: 56,
              minHeight: 56,
            }}
            aria-label="Camera"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Camera
              style={{ width: 'clamp(28px, 3.6vw, 32px)', height: 'clamp(28px, 3.6vw, 32px)' }}
              strokeWidth={2.5}
              className="relative z-10"
            />
          </button>
        </div>

        <div className="flex items-center" style={{ marginRight: SIDE_MARGIN, gap: 'clamp(8px, 3vw, 24px)' }}>
          {rightTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => changeTab(id)}
              className={`${navBtnBase} ${tab === id ? navBtnActive : navBtnInactive}`}
              style={{ gap: BTN_GAP, paddingTop: BTN_PY, paddingBottom: BTN_PY, minWidth: 44, minHeight: 44 }}
            >
              <Icon style={{ width: ICON_SIZE, height: ICON_SIZE }} strokeWidth={tab === id ? 2.5 : 2} />
              <span className="font-bold uppercase whitespace-nowrap" style={{ fontSize: LABEL_SIZE, letterSpacing: 'clamp(0.03em, 0.08vw, 0.1em)' }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
