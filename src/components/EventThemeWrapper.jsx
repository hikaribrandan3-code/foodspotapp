import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardList as Assignment, Ticket, Sun, Moon, ChevronLeft } from 'lucide-react';
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

export default function EventThemeWrapper() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const [view, setView] = useState('events'); // 'events' | 'status'
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
    // Sync dark class on body for scoped CSS overrides
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    // Add event-route class to body for isolated styling
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

  return (
    <div
      className={`${theme === 'dark' ? 'dark' : ''} min-h-[100dvh] relative`}
      style={{
        backgroundColor: style['--canvas-bg'],
        fontFamily: '"Outfit", ui-sans-serif, system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Back to Home */}
      <div className="fixed top-4 left-4 z-[160]">
        <button
          onClick={() => navigate(`/${tenantSlug || ''}`)}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-lg active:scale-95 transition-all"
          aria-label="Back to Home"
        >
          <ChevronLeft size={20} className="text-[var(--text-primary)]" />
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

      {/* Main Content Area */}
      <div className="pb-24">
        {view === 'events' && <EventsView />}
        {view === 'status' && <MyTickets />}
      </div>

      {/* Simplified Navigation for Events & Tickets */}
      <nav
        className="fixed bottom-0 w-full z-50 flex justify-around items-center h-20 pb-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t shadow-[0_-8px_30px_rgba(0,0,0,0.05)]"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <button
          onClick={() => setView('events')}
          className={`flex flex-col items-center gap-1 transition-all ${view === 'events' ? 'text-[var(--color-primary)] scale-110' : 'text-slate-300 dark:text-slate-600'}`}
        >
          <Ticket size={24} strokeWidth={view === 'events' ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Events</span>
        </button>
        <button
          onClick={() => setView('status')}
          className={`flex flex-col items-center gap-1 transition-all ${view === 'status' ? 'text-[var(--color-primary)] scale-110' : 'text-slate-300 dark:text-slate-600'}`}
        >
          <Assignment size={24} strokeWidth={view === 'status' ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">My Tickets</span>
        </button>
      </nav>
    </div>
  );
}
