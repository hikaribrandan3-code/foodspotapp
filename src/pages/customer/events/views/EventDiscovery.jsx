import * as React from 'react';
const { useState, useEffect } = React;
import { MapPin, Calendar, ArrowRight, Cloud, Sun, Droplets, Thermometer, Sparkles, Languages, Ticket } from 'lucide-react';
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

const getWeatherLabel = (code) => {
  if (code === 0) return 'Clear';
  if ([1, 2, 3].includes(code)) return 'Partly Cloudy';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Storm';
  return 'Cloudy';
};

const getWeatherIcon = (code, size = 10) => {
  if (code === 0) return <Sun size={size} className="text-orange-400" />;
  if ([1, 2, 3].includes(code)) return <Cloud size={size} className="text-yellow-400" />;
  if ([45, 48].includes(code)) return <Cloud size={size} className="text-slate-400" />;
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <Droplets size={size} className="text-blue-400" />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <Cloud size={size} className="text-sky-200" />;
  if ([95, 96, 99].includes(code)) return <Cloud size={size} className="text-purple-400" />;
  return <Cloud size={size} className="text-slate-400" />;
};

const WeatherWidget = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const DEFAULT_LAT = -31.4201, DEFAULT_LNG = -64.1888; // Córdoba

    const fetchForCoords = async (lat, lng, source) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,weather_code&temperature_unit=celsius&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        if (data.current && typeof data.current.temperature_2m === 'number') {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            humidity: data.current.relative_humidity_2m ?? null,
            condition: getWeatherLabel(data.current.weather_code),
            code: data.current.weather_code,
          });
          const daily = [];
          for (let i = 0; i < 7; i++) {
            daily.push({
              tempMax: data.daily.temperature_2m_max[i],
              code: data.daily.weather_code[i],
            });
          }
          setForecast(daily);
          console.log(`[WeatherWidget] ${source}:`, data.current.temperature_2m + '°C', data.current.relative_humidity_2m + '%', getWeatherLabel(data.current.weather_code));
          return true;
        }
      } catch (err) {
        console.error('[WeatherWidget] fetch failed (' + source + '):', err.message);
      }
      return false;
    };

    let cancelled = false;
    (async () => {
      // 1. Fetch with default coords immediately — no waiting
      const ok = await fetchForCoords(DEFAULT_LAT, DEFAULT_LNG, 'default');
      if (!cancelled) {
        setLoading(false);
        if (!ok) setError(true);
      }

      // 2. Background geolocation — if it succeeds with different coords, refetch
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          const { latitude, longitude } = pos.coords;
          const moved = Math.abs(latitude - DEFAULT_LAT) > 0.01 || Math.abs(longitude - DEFAULT_LNG) > 0.01;
          if (moved || !ok) {
            const geoOk = await fetchForCoords(latitude, longitude, 'geolocated');
            if (!geoOk && !ok) setError(true);
          }
        },
        (err) => {
          console.log('[WeatherWidget] Geolocation denied/failed, staying on default');
        },
        { timeout: 8000, enableHighAccuracy: false }
      );
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-[24px] p-3 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-emerald-600">
            {weather ? getWeatherIcon(weather.code, 16) : <Sun size={16} />}
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-tight text-emerald-900 dark:text-emerald-100">7-Day Forecast</h4>
            <p className="text-[8px] font-medium text-emerald-600 dark:text-emerald-400">
              {error ? 'Forecast unavailable' : (weather ? `${weather.condition} · ${weather.humidity}% humidity` : 'Loading…')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-emerald-900 dark:text-emerald-100 font-black text-xs">
            <Thermometer size={12} />
            {weather !== null ? weather.temp + '°C' : (loading ? '…' : '—')}
          </div>
        </div>
      </div>
      <div className="flex justify-between px-1">
        {days.map((day, i) => {
          const item = forecast[i];
          const temp = item ? Math.round(item.tempMax) : 20 + i;
          const code = item ? item.code : (i % 2 === 0 ? 0 : 3);
          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <span className="text-[7px] font-bold text-emerald-600/60 uppercase">{day}</span>
              {getWeatherIcon(code, 10)}
              <span className="text-[8px] font-black text-emerald-900 dark:text-emerald-100">{temp}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function EventDiscovery({ events, loading, error, onSelectEvent, onViewTickets }) {
  const { t, language, setLanguage } = useLanguage();
  const { businessId } = useTenant();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Music', 'Exclusives', 'Free', 'Festivals', 'Pop-ups'];

  const languages = [
    { code: 'en', name: 'EN' },
    { code: 'es', name: 'ES' },
    { code: 'pt', name: 'PT' }
  ];

  // Category filter
  const filteredEvents = events
    .filter(e => selectedCategory === 'All' || e.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  return (
    <div className="w-full">
      <header className="px-6 pt-10 pb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-70">
          {t('welcome_to')}
        </span>
        <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
          {t('event_discovery')}
        </h1>
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
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20' 
              : 'bg-white dark:bg-slate-900 text-[var(--text-secondary)] border-[var(--border-color)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <main className="px-6 space-y-6 pb-6">
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
              
              <div className="absolute top-4 left-4 flex gap-1.5 flex-col items-start">
                 <EventCountdown startDate={event.date} />
                 {event.referrable && (
                   <span className="bg-amber-500/90 backdrop-blur-md px-2 py-1 rounded-lg text-[7px] font-black text-white uppercase tracking-widest border border-white/20 shadow-lg flex items-center gap-1">
                     <Sparkles size={8} /> Refer & Earn $10
                   </span>
                 )}
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
                  {event.tiers.some(t => t.price > 0) && (
                    <span className="bg-white/10 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-white font-black drop-shadow-sm flex items-center gap-1.5">
                      <Ticket size={10} className="text-[var(--color-primary)]" />
                      Add-ons Available
                    </span>
                  )}
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

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin mb-4" />
            <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">Loading events…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-20 h-20 rounded-[32px] bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6">
               <Sparkles size={32} />
            </div>
            <p className="text-sm font-black text-rose-600 uppercase tracking-widest mb-2">Something went wrong</p>
            <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60">We couldn't load events for this restaurant. Please try again later.</p>
          </div>
        )}

        {!loading && !error && filteredEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-20 h-20 rounded-[32px] bg-[var(--border-color)]/30 flex items-center justify-center text-[var(--text-secondary)] mb-6 opacity-40">
               <Sparkles size={32} />
            </div>
            <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 mb-2">No events found</p>
            <p className="text-xs font-medium text-[var(--text-secondary)] opacity-40">Check back soon for upcoming events at this venue.</p>
          </div>
        )}
      </main>
    </div>
  );
}
