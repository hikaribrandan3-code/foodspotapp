import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ChevronLeft, ChevronRight, MapPin, Calendar, Copy, Share2, Download, Minus, Plus, ArrowLeft } from 'lucide-react'
import { useTenant } from '../../../contexts/TenantContext'
import { useEvents } from '../../../hooks/useEvents'
import EventCheckout from '../events/views/EventCheckout'
import { supabase } from '../../../lib/supabaseClient'

const CATEGORIES = ['All', 'Concerts', 'Music', 'Festivals', 'Social', 'Sports', 'Gaming', 'Exclusives', 'Workshops']

function normalizeEvent(event) {
  const startDate = new Date(event.start_date)
  return {
    id: event.id,
    name: event.name,
    date: event.start_date,
    time: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    description: event.description || '',
    location: event.address || event.venue_name || '',
    venue_name: event.venue_name || '',
    image: event.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
    category: event.category || 'All',
    business_id: event.business_id,
    tiers: (event.ticket_tiers || []).map(t => ({
      id: t.id,
      name: t.name,
      price: (t.price_cents || 0) / 100,
      qty: t.capacity || 0,
      sold: t.sold || 0,
      description: t.description || '',
    })),
    status: event.status || 'live',
  }
}

async function seedDemoEvents(businessId) {
  if (!businessId) return
  try {
    // Check if any live events exist already
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'live')
      .limit(1)
    if (existing && existing.length > 0) return

    // No id field — let Supabase generate UUIDs
    const demos = [
      { name: 'Córdoba Summer Fest', category: 'Concerts', image_url: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800', start_date: new Date(Date.now() + 7*24*3600*1000).toISOString(), venue_name: 'Toonshon', description: 'The biggest summer festival in Córdoba. Live music, food, and vibes.', ticket_tiers: [{id:'t1',name:'General',price_cents:2499,capacity:300,sold:0},{id:'t2',name:'VIP',price_cents:4999,capacity:50,sold:0}] },
      { name: 'Electronic Echoes Festival', category: 'Festivals', image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800', start_date: new Date(Date.now() + 14*24*3600*1000).toISOString(), venue_name: 'Starlight Stadium', description: 'International DJs and immersive light shows.', ticket_tiers: [{id:'t3',name:'General',price_cents:1500,capacity:5000,sold:0},{id:'t4',name:'VIP Lounge',price_cents:45000,capacity:50,sold:0}] },
      { name: 'Midnight Market Sessions', category: 'Music', image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800', start_date: new Date(Date.now() + 3*24*3600*1000).toISOString(), venue_name: 'The Velvet Lounge', description: 'Live jazz, craft cocktails, and the best night vibes in the city.', ticket_tiers: [{id:'t5',name:'General',price_cents:3000,capacity:100,sold:0},{id:'t6',name:'VIP',price_cents:7500,capacity:30,sold:0}] },
      { name: 'Social Evisss Concert', category: 'Social', image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800', start_date: new Date(Date.now() + 5*24*3600*1000).toISOString(), venue_name: 'The Roxy Bar', description: 'Meet people, great music, free first drink.', ticket_tiers: [{id:'t7',name:'Entry',price_cents:2500,capacity:100,sold:0}] },
      { name: 'Gourmet Food Truck Rally', category: 'Festivals', image_url: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?q=80&w=800', start_date: new Date(Date.now() + 10*24*3600*1000).toISOString(), venue_name: 'Riverside Park', description: '50+ premium food trucks, live music and local brews.', ticket_tiers: [{id:'t8',name:'Entry',price_cents:1500,capacity:1000,sold:0},{id:'t9',name:'Tasting Pass',price_cents:4500,capacity:500,sold:0}] },
      { name: 'Wirehovs and Concertss', category: 'Concerts', image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=800', start_date: new Date(Date.now() + 12*24*3600*1000).toISOString(), venue_name: 'Arena Norte', description: 'Indie bands, outdoor stage, all night long.', ticket_tiers: [{id:'t10',name:'General',price_cents:2000,capacity:500,sold:0}] },
    ].map(e => ({ ...e, business_id: businessId, status: 'live' }))

    const { error } = await supabase.from('events').insert(demos)
    if (error) console.warn('Seed error:', error.message)
  } catch (err) {
    console.warn('Demo seeding skipped:', err.message)
  }
}

// ── EVENT CARD ──────────────────────────────────────────────────────────────
function EventCard({ event, onClick }) {
  const minPrice = event.tiers.length > 0 ? Math.min(...event.tiers.map(t => t.price)) : 0
  const dateStr = new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <button
      onClick={() => onClick(event)}
      className="group text-left rounded-xl overflow-hidden bg-[var(--canvas-surface)] hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
      style={{ borderRadius: 'var(--radius-card)' }}
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={event.image}
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {dateStr}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <span
            className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
            style={{ background: 'var(--color-primary)' }}
          >
            {event.category}
          </span>
        </div>
      </div>
      <div className="p-3">
        <p className="font-bold text-sm text-[var(--canvas-text)] line-clamp-2 mb-1">{event.name}</p>
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
          <MapPin size={10} />
          <span className="truncate">{event.venue_name || event.location}</span>
        </div>
        <p className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
          {minPrice === 0 ? 'FREE' : `FROM $${minPrice.toFixed(2)}`}
        </p>
      </div>
    </button>
  )
}

// ── BROWSE VIEW ──────────────────────────────────────────────────────────────
function BrowseView({ events, loading, onSelectEvent }) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [heroIdx, setHeroIdx] = useState(0)

  const featured = events.slice(0, 5)
  const hero = featured[heroIdx] || events[0]

  const filtered = activeCategory === 'All'
    ? events
    : events.filter(e => e.category?.toLowerCase() === activeCategory.toLowerCase())

  const prevHero = useCallback(() => setHeroIdx(i => (i - 1 + featured.length) % featured.length), [featured.length])
  const nextHero = useCallback(() => setHeroIdx(i => (i + 1) % featured.length), [featured.length])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-gray-400">Loading events...</p>
      </div>
    )
  }

  if (!events.length) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center text-gray-400">
        <p className="text-lg mb-2">No events yet</p>
        <p className="text-sm">Events will appear here when published</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">

      {/* Hero Banner */}
      {hero && (
        <div
          className="relative h-56 lg:h-72 rounded-xl overflow-hidden cursor-pointer"
          style={{ borderRadius: 'var(--radius-card)' }}
          onClick={() => onSelectEvent(hero)}
        >
          <img src={hero.image} alt={hero.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Hero content */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <span
              className="text-xs font-bold text-white px-2.5 py-1 rounded-full mb-2 inline-block"
              style={{ background: 'var(--color-primary)' }}
            >
              {hero.category}
            </span>
            <h2 className="text-2xl lg:text-3xl font-black text-white leading-tight mb-1">{hero.name}</h2>
            <p className="text-white/80 text-sm flex items-center gap-2">
              <Calendar size={14} />
              {new Date(hero.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' · '}{hero.time}
              {hero.venue_name && <span>· {hero.venue_name}</span>}
            </p>
          </div>

          {/* Arrows */}
          {featured.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prevHero() }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); nextHero() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
              {/* Dots */}
              <div className="absolute bottom-3 right-5 flex gap-1">
                {featured.map((_, i) => (
                  <button key={i} onClick={e => { e.stopPropagation(); setHeroIdx(i) }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === heroIdx ? 'bg-white scale-125' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.filter(c => c === 'All' || events.some(e => e.category === c)).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeCategory === cat
                ? 'text-white'
                : 'bg-[var(--canvas-surface)] text-[var(--canvas-text)] hover:bg-gray-200'
            }`}
            style={activeCategory === cat ? { background: 'var(--color-primary)' } : {}}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Event Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">No {activeCategory} events found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(event => (
            <EventCard key={event.id} event={event} onClick={onSelectEvent} />
          ))}
        </div>
      )}

    </div>
  )
}

// ── DETAIL VIEW ──────────────────────────────────────────────────────────────
function DetailView({ event, events, onBack, onBook }) {
  const [quantities, setQuantities] = useState({})

  const related = events.filter(e => e.id !== event.id && e.category === event.category).slice(0, 3)
  const trending = events.filter(e => e.id !== event.id).slice(0, 6)

  const setQty = (tierId, delta) => {
    setQuantities(q => {
      const cur = q[tierId] || 1
      const next = Math.max(1, Math.min(10, cur + delta))
      return { ...q, [tierId]: next }
    })
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">

      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--canvas-text)] transition-colors">
        <ArrowLeft size={16} /> Back to Events
      </button>

      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">

        {/* Left: Event info */}
        <div>
          <div className="relative h-64 lg:h-80 rounded-xl overflow-hidden mb-5" style={{ borderRadius: 'var(--radius-card)' }}>
            <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4">
              <span className="text-xs font-bold text-white px-2.5 py-1 rounded-full" style={{ background: 'var(--color-primary)' }}>
                {event.category}
              </span>
            </div>
          </div>

          <h1 className="text-3xl font-black text-[var(--canvas-text)] mb-2">{event.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              {' at '}{event.time}
            </span>
            {event.venue_name && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} />
                {event.venue_name}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{event.description}</p>
        </div>

        {/* Right: Ticket tiers */}
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-[var(--canvas-text)]">Select Tickets</h3>
          {event.tiers.map((tier, idx) => {
            const qty = quantities[tier.id] || 1
            const isHighlighted = idx === 1
            return (
              <div
                key={tier.id}
                className="rounded-xl p-4 border-2 transition-all"
                style={{
                  borderRadius: 'var(--radius-card)',
                  borderColor: isHighlighted ? 'var(--color-primary)' : 'var(--border-color, #e5e7eb)',
                  background: isHighlighted ? 'color-mix(in srgb, var(--color-primary) 5%, transparent)' : 'var(--canvas-surface)',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-[var(--canvas-text)]">{tier.name}</p>
                      {isHighlighted && (
                        <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: 'var(--color-primary)' }}>
                          Popular
                        </span>
                      )}
                    </div>
                    {tier.description && <p className="text-xs text-gray-400 mt-0.5">{tier.description}</p>}
                  </div>
                  <p className="text-xl font-black" style={{ color: 'var(--color-primary)' }}>
                    {tier.price === 0 ? 'FREE' : `$${tier.price.toFixed(2)}`}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(tier.id, -1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100">
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-[var(--canvas-text)]">{qty}</span>
                    <button onClick={() => setQty(tier.id, +1)} className="w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: 'var(--color-primary)' }}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => onBook(tier, qty)}
                    className="px-4 py-2 rounded-lg text-white text-sm font-bold transition-opacity hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Related Events */}
      {related.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-[var(--canvas-text)] mb-3">More {event.category} Events</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map(e => <EventCard key={e.id} event={e} onClick={() => {}} />)}
          </div>
        </div>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-[var(--canvas-text)] mb-3">Trending Events</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trending.map(e => <EventCard key={e.id} event={e} onClick={() => {}} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── TICKET VIEW ──────────────────────────────────────────────────────────────
function TicketView({ booking, onMoreEvents }) {
  const copyCode = () => navigator.clipboard.writeText(booking.ticket_code || booking.id || '')

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`My ticket for ${booking.event_name}! Code: ${booking.ticket_code || booking.id}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  const qrValue = JSON.stringify({ ticket: booking.ticket_code || booking.id, event: booking.event_name })

  return (
    <div className="p-4 lg:p-6 flex flex-col items-center max-w-lg mx-auto">
      <button onClick={onMoreEvents} className="self-start flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--canvas-text)] mb-6 transition-colors">
        <ArrowLeft size={16} /> More Events
      </button>

      <div className="w-full bg-[var(--canvas-surface)] rounded-2xl overflow-hidden shadow-lg" style={{ borderRadius: 'var(--radius-card)' }}>
        {/* Event header */}
        {booking.image && (
          <div className="relative h-36 overflow-hidden">
            <img src={booking.image} alt={booking.event_name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-0 flex flex-col justify-center items-center text-white text-center px-4">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Your Ticket for</p>
              <h2 className="text-2xl font-black">{booking.event_name}</h2>
              {booking.date && (
                <p className="text-sm opacity-80 mt-1">
                  {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Ticket details */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
            {booking.tier_name && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Tier</p>
                <p className="font-bold text-[var(--canvas-text)]">{booking.tier_name}</p>
              </div>
            )}
            {booking.quantity && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Party Size</p>
                <p className="font-bold text-[var(--canvas-text)]">{booking.quantity}</p>
              </div>
            )}
            {booking.ticket_code && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">Ticket Code</p>
                <p className="font-mono font-black text-xl tracking-widest" style={{ color: 'var(--color-primary)' }}>
                  {booking.ticket_code}
                </p>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-5">
            <div className="p-3 bg-white rounded-xl">
              <QRCodeSVG value={qrValue} size={200} />
            </div>
          </div>
          <p className="text-xs text-center text-gray-400 mb-6">Show this QR code at the door</p>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={copyCode}
              className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}
            >
              <Copy size={16} /> Copy Code
            </button>
            <button
              onClick={shareWhatsApp}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border-2 text-[var(--canvas-text)]"
              style={{ borderColor: 'var(--color-primary)' }}
            >
              <Share2 size={16} /> Share to WhatsApp
            </button>
            <button
              onClick={onMoreEvents}
              className="w-full py-3 rounded-xl font-semibold text-sm text-gray-500 hover:text-[var(--canvas-text)] transition-colors"
            >
              Browse More Events
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function DesktopEventsTab() {
  const { tenantSlug } = useParams()
  const { businessId } = useTenant()
  const { events: rawEvents, loading, refetch } = useEvents(tenantSlug)

  const events = rawEvents.map(normalizeEvent)

  const [view, setView] = useState('browse') // 'browse' | 'detail' | 'checkout' | 'ticket'
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedTier, setSelectedTier] = useState(null)
  const [bookingData, setBookingData] = useState(null)

  useEffect(() => {
    if (businessId) {
      seedDemoEvents(businessId).then(() => refetch())
    }
  }, [businessId])

  const handleSelectEvent = (event) => {
    setSelectedEvent(event)
    setView('detail')
  }

  const handleBook = (tier) => {
    setSelectedTier(tier)
    setView('checkout')
  }

  const handleConfirm = (booking) => {
    setBookingData(booking)
    setView('ticket')
  }

  const handleBack = () => {
    if (view === 'detail') setView('browse')
    if (view === 'checkout') setView('detail')
    if (view === 'ticket') { setBookingData(null); setSelectedEvent(null); setView('browse') }
  }

  return (
    <div className="min-h-full bg-[var(--canvas-bg)]">
      {view === 'browse' && (
        <BrowseView events={events} loading={loading} onSelectEvent={handleSelectEvent} />
      )}
      {view === 'detail' && selectedEvent && (
        <DetailView event={selectedEvent} events={events} onBack={handleBack} onBook={handleBook} />
      )}
      {view === 'checkout' && selectedEvent && selectedTier && (
        <div className="p-4 lg:p-6 max-w-lg mx-auto">
          <EventCheckout
            event={selectedEvent}
            tier={selectedTier}
            onConfirm={handleConfirm}
            onBack={handleBack}
          />
        </div>
      )}
      {view === 'ticket' && bookingData && (
        <TicketView booking={bookingData} onMoreEvents={() => { setBookingData(null); setSelectedEvent(null); setView('browse') }} />
      )}
    </div>
  )
}
