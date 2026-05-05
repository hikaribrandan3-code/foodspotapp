import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Ticket } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';

function getDaysLeft(dateString) {
  const eventDate = new Date(dateString);
  const now = new Date();
  const diff = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function getWeatherIcon(condition) {
  const c = condition?.toLowerCase() || '';
  if (c.includes('sun') || c.includes('clear')) return '☀️';
  if (c.includes('rain')) return '🌧️';
  if (c.includes('cloud')) return '☁️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('wind') || c.includes('breez')) return '💨';
  return '✨';
}

export default function EventDiscovery({ events, categories, activeFilter, onFilterChange, onEventSelect }) {
  const { t } = useLanguage();

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-14 pb-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{getWeatherIcon(events[0]?.weather?.condition)}</span>
              <div>
                <p className="text-xs font-black uppercase tracking-wider opacity-50">
                  {events[0]?.weather?.condition || 'Clear'} • {events[0]?.weather?.temp || 72}°
                </p>
                <p className="text-[10px] font-bold opacity-30">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            <h1 className="text-4xl font-black tracking-tight leading-none">
              {t('events') || 'Events'}
            </h1>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-primary, #8B7355)', color: '#fff' }}
          >
            <Ticket size={24} />
          </div>
        </div>
      </motion.header>

      {/* Category Filters */}
      <div className="px-6 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onFilterChange(cat)}
              className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                activeFilter === cat
                  ? ''
                  : 'opacity-40'
              }`}
              style={activeFilter === cat ? {
                backgroundColor: 'var(--color-primary, #8B7355)',
                color: '#fff',
                borderColor: 'var(--color-primary, #8B7355)'
              } : {
                backgroundColor: 'var(--surface-bg, #fff)',
                color: 'var(--canvas-text, #000)',
                borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events Feed */}
      <main className="px-6 pb-24 space-y-4">
        {events.length === 0 && (
          <div className="text-center py-20 opacity-40">
            <p className="text-sm font-bold">No events found</p>
          </div>
        )}

        {events.map((event, i) => {
          const daysLeft = getDaysLeft(event.date);
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onEventSelect(event)}
              className="group relative overflow-hidden rounded-[32px] cursor-pointer active:scale-[0.98] transition-transform"
              style={{ backgroundColor: 'var(--surface-bg, #fff)' }}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={event.image}
                  alt={event.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Floating Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/90 backdrop-blur-md"
                    style={{ color: 'var(--color-primary, #8B7355)' }}
                  >
                    {event.category}
                  </span>
                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-black/60 text-white backdrop-blur-md"
                  >
                    {daysLeft > 0 ? `${daysLeft} days left` : 'Today'}
                  </span>
                </div>

                {/* Title Overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-black text-white tracking-tight leading-tight mb-1">
                    {event.name}
                  </h3>
                  <div className="flex items-center gap-3 text-white/70">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} />
                      <span className="text-[10px] font-bold">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span className="text-[10px] font-bold">
                        {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Info Bar */}
              <div className="p-4 flex items-center justify-between"
                style={{ backgroundColor: 'var(--surface-bg, #fff)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider opacity-30">From</span>
                  <span className="text-lg font-black"
                    style={{ color: 'var(--color-primary, #8B7355)' }}
                  >
                    ${Math.min(...event.tiers.map(t => t.price))}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-primary, #8B7355)', color: '#fff' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.div>
          );
        })}
      </main>
    </div>
  );
}
