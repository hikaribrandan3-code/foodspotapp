import React from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, X, MapPin, Calendar, Clock, Ticket } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';

export default function EventTicket({ booking, onClose }) {
  const { t } = useLanguage();

  return (
    <div className="h-full overflow-y-auto px-6 pt-6 pb-24"
      style={{ backgroundColor: 'var(--canvas-bg)' }}
    >
      {/* Close */}
      <div className="flex justify-end mb-4">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: 'var(--surface-bg, #fff)', color: 'var(--canvas-text, #000)' }}
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Ticket Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[40px] overflow-hidden border-2 mb-6"
        style={{ backgroundColor: 'var(--surface-bg, #fff)', borderColor: 'var(--color-primary, #8B7355)' }}
      >
        {/* Image */}
        <div className="relative h-44">
          <img src={booking.image} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <span className="inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/90 backdrop-blur-md mb-2"
              style={{ color: 'var(--color-primary, #8B7355)' }}
            >
              {booking.tier_name}
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{booking.event_name}</h2>
          </div>
        </div>

        {/* Info */}
        <div className="p-6 space-y-4"
          style={{ backgroundColor: 'var(--surface-bg, #fff)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary, #8B7355)', color: '#fff' }}
            >
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-xs font-black">
                {new Date(booking.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-[10px] font-bold opacity-40">{booking.time}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary, #8B7355)', color: '#fff' }}
            >
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-xs font-black">{booking.venue_name}</p>
              <p className="text-[10px] font-bold opacity-40">Main Entrance</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary, #8B7355)', color: '#fff' }}
            >
              <Ticket size={18} />
            </div>
            <div>
              <p className="text-xs font-black">{booking.id}</p>
              <p className="text-[10px] font-bold opacity-40">Confirmation Code</p>
            </div>
          </div>
        </div>

        {/* Barcode Area */}
        <div className="px-6 pb-6">
          <div className="border-t-2 border-dashed pt-6"
            style={{ borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))' }}
          >
            <div className="h-16 rounded-xl overflow-hidden mb-2 opacity-80"
              style={{ background: 'repeating-linear-gradient(90deg, var(--canvas-text, #000) 0px, var(--canvas-text, #000) 2px, transparent 2px, transparent 6px)' }}
            />
            <p className="text-center text-[9px] font-black uppercase tracking-[0.3em] opacity-30">
              {t('scan_at_venue') || 'Scan at venue entrance'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          className="py-4 rounded-[24px] text-sm font-black uppercase tracking-widest border active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          style={{ borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))', color: 'var(--canvas-text, #000)' }}
        >
          <Download size={18} />
          {t('save') || 'Save'}
        </button>
        <button
          className="py-4 rounded-[24px] text-sm font-black uppercase tracking-widest border active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          style={{ borderColor: 'var(--border-subtle, rgba(0,0,0,0.06))', color: 'var(--canvas-text, #000)' }}
        >
          <Share2 size={18} />
          {t('share') || 'Share'}
        </button>
      </div>
    </div>
  );
}
