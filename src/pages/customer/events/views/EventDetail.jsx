import * as React from 'react';
const { useState, useEffect } = React;
import { ChevronLeft, MapPin, Calendar, Clock, Sparkles, Info, Tickets, Ban, Share2, Loader2 } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { VenueMap } from '../../../../components/VenueMap';
import EventShareCard from '../components/EventShareCard';
import { useEventShare } from '../hooks/useEventShare';

const EventCountdown = ({ startDate }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculate = () => {
      const difference = +new Date(startDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };
    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [startDate]);

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold text-[var(--color-primary)]">{timeLeft.days}</span>
        <span className="text-[7px] font-black uppercase tracking-[0.1em] opacity-40">Days</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold text-[var(--color-primary)]">{timeLeft.hours}</span>
        <span className="text-[7px] font-black uppercase tracking-[0.1em] opacity-40">Hrs</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold text-[var(--color-primary)]">{timeLeft.minutes}</span>
        <span className="text-[7px] font-black uppercase tracking-[0.1em] opacity-40">Mins</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold text-rose-500">{timeLeft.seconds}</span>
        <span className="text-[7px] font-black uppercase tracking-[0.1em] opacity-40">Secs</span>
      </div>
    </div>
  );
};

export default function EventDetail({ event, onBook, onBack }) {
  const { t } = useLanguage();
  const [selectedZone, setSelectedZone] = useState(null);
  const { shareCardRef, shareEvent, isSharing } = useEventShare(event);

  if (!event) return null;

  // Check if event has passed
  const eventDate = new Date(event.date);
  const now = new Date();
  const isExpired = eventDate < now;

  const handleZoneSelect = (zoneId) => {
    setSelectedZone(zoneId);
    // Find the tier that matches this zone and scroll to it or highlight it
    const matchingTier = event.tiers.find(t => t.id.includes(zoneId.toLowerCase()) || (zoneId === 'Tables' && t.name.toLowerCase().includes('table')));
    if (matchingTier) {
      // We could automatically select it or just highlight it
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-y-auto hide-scrollbar">
      {/* Hidden share card — captured off-screen by html2canvas */}
      <EventShareCard ref={shareCardRef} event={event} />

      <div className="relative h-[420px] shrink-0">
        <img
          src={event.image}
          alt={event.name}
          className="w-full h-full object-cover"
        />

        <button
          onClick={onBack}
          className="absolute top-12 left-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-[var(--text-primary)] shadow-xl active:scale-90 transition-all border border-white/20"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Share to Stories button */}
        <button
          onClick={shareEvent}
          disabled={isSharing}
          className="absolute top-12 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-[var(--text-primary)] shadow-xl active:scale-90 transition-all border border-white/20 disabled:opacity-60"
          aria-label="Share to Instagram Stories"
        >
          {isSharing
            ? <Loader2 size={20} className="animate-spin" />
            : <Share2 size={20} />
          }
        </button>

        <div className="absolute bottom-10 left-6 right-6">
          <div className="flex gap-2 mb-4 flex-wrap">
            {isExpired ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/30">
                <Ban size={10} />
                Event Ended
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20">
                <Sparkles size={10} />
                {t('exclusive')}
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest border border-white/20">
              {event.category}
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tight !text-white leading-tight" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>
            {event.name}
          </h1>
        </div>
      </div>

      <main className={`px-6 py-6 flex flex-col gap-6 pb-24 ${isExpired ? 'opacity-70' : ''}`}>
        <div className="bg-[var(--canvas-bg)] p-4 rounded-[28px] border border-[var(--border-color)] shadow-sm">
          {isExpired ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                <Ban size={20} />
              </div>
              <p className="text-sm font-black text-red-500 uppercase tracking-widest">This event has ended</p>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-50">No tickets are available for this event</p>
            </div>
          ) : (
            <>
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50 mb-3 text-center">Event Starts In</h3>
              <div className="flex justify-center">
                <EventCountdown startDate={event.date} />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between bg-[var(--canvas-bg)] p-5 rounded-[28px] border border-[var(--border-color)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center text-[var(--color-primary)] shadow-sm border border-[var(--border-color)]">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50">{t('date')}</p>
              <p className="text-sm font-black text-[var(--text-primary)]">{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          <div className="h-10 w-px bg-[var(--border-color)]"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center text-[var(--color-primary)] shadow-sm border border-[var(--border-color)]">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50">{t('time')}</p>
              <p className="text-sm font-black text-[var(--text-primary)]">{event.time}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50">{t('location')}</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 bg-[var(--canvas-bg)] p-4 rounded-3xl border border-[var(--border-color)]">
              <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                <MapPin size={16} />
              </div>
              <p className="text-sm font-bold text-[var(--text-secondary)] leading-relaxed">
                {event.location}
              </p>
            </div>

            {/* Secret Location Reveal Logic for Pop-ups */}
            {event.category === 'Pop-ups' && (
              <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-[28px] border border-amber-200 dark:border-amber-900/20 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-amber-600 shrink-0">
                  <Info size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-950 dark:text-amber-200 mb-1">{t('secret_location')}</h4>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-400 opacity-80 leading-relaxed">
                    {t('secret_location_desc')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Festival Lineup & Schedule */}
        {event.category === 'Festivals' && event.lineup && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50">{t('lineup_schedule')}</h3>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider">Live Now</span>
              </div>
            </div>
            
            <div className="relative space-y-4 px-2">
              {/* Timeline Line */}
              <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-900" />
              
              {event.lineup.map((slot, i) => (
                <div key={i} className="relative flex items-center gap-6 group">
                  {/* Time Marker */}
                  <div className={`relative z-10 w-12 h-12 flex flex-col items-center justify-center rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all ${
                    slot.live ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-[var(--border-color)]'
                  }`}>
                    <span className={`text-[10px] font-black ${slot.live ? 'text-emerald-600' : 'text-[var(--text-primary)]'}`}>{slot.time}</span>
                  </div>
                  
                  {/* Artist Card */}
                  <div className={`flex-1 p-4 rounded-3xl border transition-all ${
                    slot.live 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30' 
                    : 'bg-[var(--canvas-bg)] border-[var(--border-color)] group-hover:border-[var(--color-primary)]/30'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-primary)] opacity-60">{slot.stage}</span>
                      {slot.live && <Sparkles size={12} className="text-emerald-500" />}
                    </div>
                    <h4 className={`text-base font-black ${slot.live ? 'text-emerald-950 dark:text-emerald-100' : 'text-[var(--text-primary)]'}`}>
                      {slot.artist}
                    </h4>
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-50">{slot.genre}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50">About Event</h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
            {event.description}
          </p>
        </div>

        {/* Venue Layout Section for Festivals */}
        {event.category === 'Festivals' && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50 px-2">Venue Layout</h3>
            <VenueMap 
              selectedZone={selectedZone} 
              onSelectZone={handleZoneSelect} 
            />
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50">{t('select_tier')}</h3>
          <div className="grid gap-4">
            {event.tiers.map(tier => {
              const isSelected = selectedZone && (
                tier.id.toLowerCase().includes(selectedZone.toLowerCase()) ||
                (selectedZone === 'Tables' && tier.name.toLowerCase().includes('table')) ||
                (selectedZone === 'VIP_L' && tier.name.includes('VIP')) ||
                (selectedZone === 'VIP_R' && tier.name.includes('VIP'))
              );
              const remaining = (tier.qty || tier.capacity || 0) - (tier.sold || 0);
              const isSoldOut = tier.forced_sold_out || remaining <= 0;
              const isUnavailable = isExpired || isSoldOut;

              return (
              <button
                key={tier.id}
                onClick={() => !isUnavailable && onBook(tier)}
                disabled={isUnavailable}
                className={`group relative flex items-center justify-between p-6 rounded-[32px] bg-white dark:bg-slate-900 border transition-all text-left shadow-sm overflow-hidden ${
                  isUnavailable
                    ? 'border-[var(--border-color)] opacity-50 cursor-not-allowed'
                    : isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-4 ring-[var(--color-primary)]/10 scale-[1.02]'
                      : 'border-[var(--border-color)] hover:border-[var(--color-primary)]/30 active:scale-[0.98]'
                }`}
              >
                <div className="relative z-10 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    tier.name.toLowerCase().includes('table')
                      ? 'bg-purple-100 text-purple-600'
                      : tier.name.includes('VIP')
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Tickets size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-[var(--text-primary)] text-sm mb-0.5">{tier.name}</h4>
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-50">
                      {tier.name.toLowerCase().includes('table')
                        ? 'Includes reserved premium seating'
                        : 'Admission for 1 person'}
                    </p>
                  </div>
                </div>
                <div className="relative z-10 text-right">
                  <p className="text-xl font-black text-[var(--color-primary)]">${tier.price}</p>
                  <p className={`text-[9px] font-black uppercase tracking-tight ${isExpired ? 'text-red-500 opacity-100' : isSoldOut ? 'text-red-500 opacity-100' : 'text-[var(--text-secondary)] opacity-50'}`}>
                    {isExpired ? 'Event Ended' : isSoldOut ? 'Sold Out' : 'Available'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      </main>
    </div>
  );
}
