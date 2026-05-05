import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Clock, Ticket, Zap, Info } from 'lucide-react';
import { VenueMap } from '../../../../components/VenueMap';
import { useLanguage } from '../../../../contexts/LanguageContext';

export default function EventDetail({ event, onBook, onBack }) {
  const { t } = useLanguage();
  const [selectedTier, setSelectedTier] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const eventDate = new Date(event.date);

  return (
    <div className="h-full overflow-y-auto">
      {/* Sticky Back Button */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-2">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full backdrop-blur-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: 'var(--surface-bg, #fff)', color: 'var(--canvas-text, #000)' }}
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Hero Image */}
      <div className="relative -mt-14">
        <div className="h-72 overflow-hidden">
          <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <span className="inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/90 backdrop-blur-md mb-3"
            style={{ color: 'var(--color-primary, #8B7355)' }}
          >
            {event.category}
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight leading-tight mb-2">{event.name}</h1>
          <div className="flex items-center gap-3 text-white/70">
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              <span className="text-[10px] font-bold">{event.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span className="text-[10px] font-bold">
                {eventDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span className="text-[10px] font-bold">{event.time}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8">
        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[32px] p-6 text-white relative overflow-hidden"
          style={{ backgroundColor: 'var(--color-primary, #8B7355)' }}
        >
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-3">{t('event_starts_in') || 'Event Starts In'}</p>
            <div className="flex gap-4">
              {['days','hours','minutes'].map(unit => (
                <div key={unit} className="flex-1">
                  <div className="text-3xl font-black">{unit === 'days' ? '12' : unit === 'hours' ? '04' : '32'}</div>
                  <div className="text-[9px] font-black uppercase tracking-wider opacity-60">{unit}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        </motion.div>

        {/* Description */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">{t('about') || 'About'}</h3>
          <p className="text-sm font-medium leading-relaxed opacity-80">{event.description}</p>
        </section>

        {/* Festival Lineup (if exists) */}
        {event.lineup && (
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-3">{t('lineup') || 'Festival Lineup'}</h3>
            <div className="space-y-3">
              {event.lineup.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-[24px] border"
                  style={{ backgroundColor: 'var(--surface-bg, #fff)', borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))' }}
                >
                  <div className="text-center min-w-[50px]">
                    <p className="text-xs font-black opacity-50">{item.time}</p>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-black">{item.artist}</h4>
                    <p className="text-[10px] font-bold opacity-40">{item.genre} • {item.stage} Stage</p>
                  </div>
                  {item.live && (
                    <span className="px-2 py-1 rounded-full bg-red-500 text-white text-[8px] font-black uppercase tracking-wider animate-pulse">Live</span>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Venue Map Toggle */}
        <section>
          <button
            onClick={() => setShowMap(!showMap)}
            className="w-full flex items-center justify-between p-4 rounded-[24px] border active:scale-[0.98] transition-transform"
            style={{ backgroundColor: 'var(--surface-bg, #fff)', borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-primary, #8B7355)', color: '#fff' }}
              >
                <Zap size={18} />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-black">{t('venue_map') || 'Venue Map'}</h4>
                <p className="text-[10px] font-bold opacity-40">{t('select_seating') || 'Select your seating zone'}</p>
              </div>
            </div>
            <div className={`transition-transform ${showMap ? 'rotate-180' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </button>
          {showMap && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
              <VenueMap selectedZone={selectedTier?.id || null} onSelectZone={(id) => {
                const tier = event.tiers.find(t => t.id === id);
                if (tier) setSelectedTier(tier);
              }} />
            </motion.div>
          )}
        </section>

        {/* Ticket Tiers */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-3">{t('select_tier') || 'Select Tier'}</h3>
          <div className="space-y-3">
            {event.tiers.map((tier) => (
              <motion.button
                key={tier.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedTier(tier)}
                className={`w-full p-5 rounded-[32px] border-2 text-left transition-all ${
                  selectedTier?.id === tier.id ? '' : ''
                }`}
                style={selectedTier?.id === tier.id ? {
                  borderColor: 'var(--color-primary, #8B7355)',
                  backgroundColor: 'var(--surface-bg, #fff)'
                } : {
                  borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))',
                  backgroundColor: 'var(--surface-bg, #fff)'
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedTier?.id === tier.id ? '' : ''
                    }`}
                    style={selectedTier?.id === tier.id ? { borderColor: 'var(--color-primary, #8B7355)' } : { borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))' }}
                    >
                      {selectedTier?.id === tier.id && (
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--color-primary, #8B7355)' }} />
                      )}
                    </div>
                    <h4 className="text-base font-black">{tier.name}</h4>
                  </div>
                  <span className="text-xl font-black" style={{ color: 'var(--color-primary, #8B7355)' }}>${tier.price}</span>
                </div>
                <p className="text-[10px] font-bold opacity-40 pl-8">{t('per_person') || 'Per person'}</p>
              </motion.button>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="pt-4 pb-8">
          <button
            onClick={() => selectedTier && onBook(selectedTier)}
            disabled={!selectedTier}
            className="w-full py-4 rounded-[24px] text-sm font-black uppercase tracking-widest text-white active:scale-[0.98] transition-transform disabled:opacity-30"
            style={{ backgroundColor: 'var(--color-primary, #8B7355)' }}
          >
            {selectedTier ? `${t('book_now') || 'Book Now'} — $${selectedTier.price}` : t('select_tier') || 'Select a Tier'}
          </button>
          <p className="text-center text-[9px] font-bold opacity-30 mt-3 flex items-center justify-center gap-1">
            <Info size={10} />
            {t('tickets_non_refundable') || 'Tickets are non-refundable'}
          </p>
        </div>
      </div>
    </div>
  );
}
