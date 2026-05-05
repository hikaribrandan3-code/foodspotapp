import * as React from 'react';
const { useState, useEffect } = React;
import { MapPin, Calendar, ArrowRight, Cloud, Sun, Thermometer, Sparkles, Languages } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useTenant } from '../../../../contexts/TenantContext';

const EventCountdown = ({ startDate }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const calculate = () => {
      const difference = +new Date(startDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
        });
      }
    };
    calculate();
    const timer = setInterval(calculate, 60000);
    return () => clearInterval(timer);
  }, [startDate]);

  return (
    <div className="flex gap-1.5 items-center">
      <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 flex flex-col items-center min-w-[34px] shadow-sm">
        <span className="text-[10px] font-black text-white">{timeLeft.days}</span>
        <span className="text-[6px] font-bold uppercase text-white/60 tracking-tighter">Days</span>
      </div>
      <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 flex flex-col items-center min-w-[34px] shadow-sm">
        <span className="text-[10px] font-black text-white">{timeLeft.hours}</span>
        <span className="text-[6px] font-bold uppercase text-white/60 tracking-tighter">Hrs</span>
      </div>
      <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 flex flex-col items-center min-w-[34px] shadow-sm">
        <span className="text-[10px] font-black text-white">{timeLeft.minutes}</span>
        <span className="text-[6px] font-bold uppercase text-white/60 tracking-tighter">Mins</span>
      </div>
    </div>
  );
};

const WeatherWidget = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-[24px] p-3 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-emerald-600">
            <Sun size={16} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-tight text-emerald-900 dark:text-emerald-100">7-Day Forecast</h4>
            <p className="text-[8px] font-medium text-emerald-600 dark:text-emerald-400">Perfect weekend for events</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-emerald-900 dark:text-emerald-100 font-black text-xs">
            <Thermometer size={12} /> 24°C
          </div>
        </div>
      </div>
      <div className="flex justify-between px-1">
        {days.map((day, i) => (
          <div key={day} className="flex flex-col items-center gap-1">
            <span className="text-[7px] font-bold text-emerald-600/60 uppercase">{day}</span>
            {i % 2 === 0 ? <Sun size={10} className="text-orange-400" /> : <Cloud size={10} className="text-slate-400" />}
            <span className="text-[8px] font-black text-emerald-900 dark:text-emerald-100">{20 + i}°</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function EventDiscovery({ events, onSelectEvent, onViewTickets }) {
  const { t, language, setLanguage } = useLanguage();
  const { businessId } = useTenant();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Music', 'Exclusives', 'Free', 'Festivals', 'Pop-ups'];

  const languages = [
    { code: 'en', name: 'EN' },
    { code: 'es', name: 'ES' },
    { code: 'pt', name: 'PT' }
  ];

  // Multi-tenancy filter + category filter
  const filteredEvents = events
    .filter(e => !businessId || e.business_id === businessId)
    .filter(e => selectedCategory === 'All' || e.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  return (
    <div className="flex flex-col h-screen pb-20">
      <header className="px-6 pt-16 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-70">
              {t('welcome_to')}
            </span>
            <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
              {t('event_discovery')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const currentIndex = languages.findIndex(l => l.code === language);
                const nextIndex = (currentIndex + 1) % languages.length;
                setLanguage(languages[nextIndex].code);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[var(--border-color)] shadow-sm"
            >
              <Languages size={14} className="text-[var(--color-primary)]" />
              <span className="text-[10px] font-black text-[var(--text-primary)]">{languages.find(l => l.code === language)?.name || 'EN'}</span>
            </button>
            {onViewTickets && (
              <button
                onClick={onViewTickets}
                className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] shadow-sm active:scale-95 transition-all relative overflow-hidden group"
              >
                <Ticket size={20} className="relative z-10 transition-transform group-hover:-rotate-12" />
                <div className="absolute inset-0 bg-[var(--color-primary)] opacity-0 group-hover:opacity-5 transition-opacity" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="px-6">
        <WeatherWidget />
      </div>

      <div className="px-6 mb-2 flex gap-3 overflow-x-auto hide-scrollbar pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${
              selectedCategory === cat
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg'
              : 'bg-white dark:bg-slate-900 text-[var(--text-secondary)] border-[var(--border-color)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto px-6 space-y-6 hide-scrollbar">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">
            {t('all_events')}
          </h3>
          <span className="text-[9px] font-black text-[var(--color-primary)] uppercase tracking-tight bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-md">
            {filteredEvents.length} Events Near You
          </span>
        </div>

        {filteredEvents.map(event => (
          <div
            key={event.id}
            onClick={() => onSelectEvent(event)}
            className="bg-white dark:bg-slate-900 rounded-[32px] border border-[var(--border-color)] overflow-hidden shadow-sm active:scale-[0.98] transition-all cursor-pointer group"
          >
            <div className="relative h-56 overflow-hidden">
              <img
                src={event.image}
                alt={event.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />

              <div className="absolute top-4 left-4 flex gap-1.5">
                <EventCountdown startDate={event.date} />
              </div>

              <div className="absolute top-4 right-4 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-black text-[var(--color-primary)] shadow-lg border border-white/20">
                ${event.tiers[0]?.price || 0}
              </div>

              <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/95 via-black/40 to-transparent">
                <div className="flex items-center gap-4 text-white text-[10px] font-black uppercase tracking-widest">
                  <span className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10">
                    <Calendar size={12} className="text-[var(--color-primary)]" />
                    <span className="text-white drop-shadow-sm">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/40"></span>
                  <span className="bg-white/10 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-white font-black drop-shadow-sm">
                    {event.category}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-black text-lg leading-tight text-[var(--text-primary)] pr-4">
                  {event.name}
                </h4>
                <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] shrink-0 transition-transform group-hover:translate-x-1">
                  <ArrowRight size={18} />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[var(--text-secondary)] opacity-80">
                <MapPin size={14} className="shrink-0 text-[var(--color-primary)]" />
                <span className="text-[11px] font-black uppercase tracking-tight truncate">{event.venue_name}</span>
              </div>
            </div>
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-[32px] bg-[var(--border-color)]/30 flex items-center justify-center text-[var(--text-secondary)] mb-6 opacity-40">
              <Sparkles size={32} />
            </div>
            <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">{t('no_events_found')}</p>
          </div>
        )}
      </main>
    </div>
  );
}
