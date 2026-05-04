
import { useState } from 'react';
import { Search, SlidersHorizontal as Tune, MessageCircle, Utensils, Music, MapPin, ArrowLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext.jsx';
import { eventTranslations } from '../../../lib/eventTranslations.js';
import EventCountdown from '../../../components/events/EventCountdown.jsx';
import WeatherWidget from '../../../components/events/WeatherWidget.jsx';
import { FoodspotFooter } from '../../../components/events/FoodspotFooter.jsx';

const MOCK_EVENTS = [
  {
    id: '1',
    business_id: 'foodspot-hq',
    name: 'Downtown Culinary Showcase',
    description: 'A vibrant outdoor food festival scene at sunset with soft warm lighting.',
    category: 'Food & Drink',
    venue_name: 'Market Square',
    address: 'Market Square, City Center',
    start_date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    end_date: new Date(Date.now() + 86400000 * 2 + 14400000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop',
    is_free: true,
    coordinates: { lat: -34.6037, lng: -58.3816 },
    ticket_tiers: [
      { id: 't3', name: 'Standard Seat', price: 0, capacity: 500, remaining: 200 },
      { id: 't-vip1', name: 'VIP Front Row', price: 85, capacity: 10, remaining: 4 }
    ]
  },
  {
    id: '2',
    business_id: 'foodspot-hq',
    name: 'Jazz & Wine Under the Stars',
    description: 'An atmospheric indoor live music event in an upscale venue.',
    category: 'Live Music',
    venue_name: 'The Grand Terrace Rooftop',
    address: 'The Grand Terrace Rooftop',
    start_date: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
    end_date: new Date(Date.now() + 86400000 * 5 + 10800000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?q=80&w=800&auto=format&fit=crop',
    is_free: false,
    min_price: 45,
    coordinates: { lat: -34.5037, lng: -58.4816 },
    ticket_tiers: [
      { id: 't1', name: 'General Admission', price: 45, capacity: 100, remaining: 50 },
      { id: 't2', name: 'VIP Pass', price: 120, capacity: 20, remaining: 5 },
      { id: 't-vip2', name: 'VIP Table (4 Persons)', price: 480, capacity: 10, remaining: 2 }
    ]
  }
];

export default function EventDiscovery({ onSelectEvent, businessId }) {
  const { lang } = useLanguage();
  const t = (key) => eventTranslations[key][lang] || key;

  const [activeFilter, setActiveFilter] = useState('This Month');
  const filters = ['This Month', 'This Weekend', 'Free Events'];

  // TODO: Fetch real events from Supabase using businessId
  // const [events, setEvents] = useState([]);
  // useEffect(() => {
  //   if (!businessId) return;
  //   supabase.from('events').select('*').eq('business_id', businessId)...
  // }, [businessId]);

  return (
    <div className="pb-24 relative">
      {/* Floating Back Widget */}
      <motion.button
        initial={{ scale: 1 }}
        animate={{
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 3,
          ease: "easeInOut",
          times: [0, 0.5, 1],
          repeat: 0
        }}
        onClick={() => window.history.back()}
        className="fixed top-20 left-6 z-[60] w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white"
        aria-label="Go Back"
      >
        <ArrowLeft size={18} />
      </motion.button>
      {/* Header */}
      <header className="sticky top-0 w-full z-50 flex items-center justify-between px-6 h-20 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Welcome to</span>
          <h1 className="text-xl font-extrabold tracking-tight text-[#1e293b] dark:text-white">FoodSpot Events</h1>
        </div>
      </header>

      <main className="px-5 pt-0 pb-6">
        {/* Weather Forecast Bar */}
        <div className="mb-3 overflow-hidden">
          <WeatherWidget variant="forecast" />
        </div>

        {/* Filter Chips - Glassmorphism Style */}
        <div className="mb-8 p-1.5 bg-white/40 dark:bg-slate-800/20 backdrop-blur-md rounded-[28px] border border-white/50 dark:border-slate-800/10 shadow-sm overflow-hidden">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar px-1 py-1">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`filter-chip transition-all whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  activeFilter === filter
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md scale-[1.02]'
                  : 'bg-white/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 backdrop-blur-sm'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Event Cards - Tactile & Vibrant */}
        <div className="grid gap-6">
          {MOCK_EVENTS.map((event) => (
            <article
              key={event.id}
              onClick={() => onSelectEvent(event)}
              className="event-card bg-white dark:bg-slate-900 rounded-[24px] overflow-hidden border border-[#f1f5f9] dark:border-slate-800 shadow-sm relative cursor-pointer active:scale-[0.98] transition-all transform"
            >
              <div className="h-32 w-full relative bg-slate-100 dark:bg-slate-800">
                <img
                  alt={event.name}
                  className="w-full h-full object-cover opacity-90 dark:opacity-80"
                  src={event.image_url}
                />
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                   <span className="bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-black px-3 py-1 rounded-full shadow-sm w-fit">
                      {event.category}
                   </span>
                   <EventCountdown startDate={event.start_date} />
                </div>
                <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-extrabold text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-slate-800">
                  {event.is_free ? 'FREE' : `$${event.min_price}.00`}
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-sm leading-tight text-slate-800 dark:text-slate-100 pr-4">{event.name}</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-tighter shrink-0">
                    {event.venue_name}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase">
                    {new Date(event.start_date).toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event);
                    }}
                    className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest border-b-2 border-slate-900/10 dark:border-white/10 hover:border-emerald-500/50 transition-all flex items-center gap-1"
                  >
                    Learn More
                    <ChevronRight size={10} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Floating Action Button - WhatsApp */}
      <a
        href="https://wa.me/yournumberhere"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 right-6 w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl z-[60] active:scale-95 transition-all hover:rotate-12"
      >
        <MessageCircle size={28} fill="white" />
      </a>

      <FoodspotFooter />

    </div>
  );
}
