import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sun, Moon, ChevronLeft } from 'lucide-react';
import EventsView from '../pages/customer/events/EventsView';

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

      {/* Main Content — EventsView handles full flow internally */}
      <div className="pb-24">
        <EventsView />
      </div>
    </div>
  );
}
