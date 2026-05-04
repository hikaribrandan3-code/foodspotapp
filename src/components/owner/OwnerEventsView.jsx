import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Html5Qrcode } from 'html5-qrcode'
import confetti from 'canvas-confetti'
import {
  Calendar, MapPin, DollarSign, Ticket, Plus, ArrowLeft, Edit2, QrCode,
  ChevronRight, Trash2, Users, Check, AlertCircle, X, Trophy, Clock,
  Tag, Share2, CheckCircle2, PartyPopper
} from 'lucide-react'

// ── Theme tokens ──────────────────────────────────────────────────────────────
const theme = {
  primary:       'var(--color-primary, #10B981)',
  textPrimary:   'var(--text-primary, #111827)',
  textSecondary: 'var(--text-secondary, #64748B)',
  border:        'var(--border-color, #E5E7EB)',
  bgWhite:       'var(--bg-white, #FFFFFF)',
  bgSurface:     'var(--bg-surface, #F9FAFB)',
  danger:        'var(--color-danger, #EF4444)',
}

const s = {
  card: {
    background: theme.bgWhite,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
  },
  label: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    marginBottom: 8,
    display: 'block',
    letterSpacing: '0.5px',
  },
  btnPrimary: {
    background: theme.primary,
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '12px 16px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  btnSecondary: {
    background: theme.bgWhite,
    color: theme.textSecondary,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: '12px 16px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    padding: '14px',
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    fontSize: 14,
    background: theme.bgWhite,
    color: theme.textPrimary,
    outline: 'none',
    boxSizing: 'border-box',
  },
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function OwnerEventsView({ businessId, tenantSlug, lang, onBack }) {
  const [view, setView] = useState('list')
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) return
    fetchEvents()
  }, [businessId])

  const fetchEvents = async () => {
    setLoading(true)
    // TODO: replace mock with real Supabase query
    // const { data } = await supabase.from('events').select('*, event_orders(count)').eq('business_id', businessId).order('start_date', { ascending: false })
    setEvents([
      {
        id: 'evt_001',
        business_id: businessId,
        name: 'Summer Night Market',
        description: 'Live music and local vendors — a night to remember.',
        category: 'Food',
        start_date: '2026-06-15T19:00:00',
        end_date: '2026-06-15T23:00:00',
        venue_name: 'Central Park',
        address: '123 Park Ave',
        image_url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800',
        is_free: false,
        status: 'live',
        ticket_tiers: [
          { id: 't1', name: 'General', price: 2500, capacity: 100, sold: 45, remaining: 55 },
          { id: 't2', name: 'VIP',     price: 5000, capacity: 20,  sold: 18, remaining: 2  },
        ],
        total_capacity: 120,
        tickets_sold: 63,
        total_revenue: 137500,
        checkins: 32,
        created_at: new Date().toISOString(),
      },
    ])
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Archive this event? This cannot be undone.')) return
    // TODO: await supabase.from('events').update({ status: 'archived' }).eq('id', selectedEvent.id)
    fetchEvents()
    setView('list')
  }

  if (view === 'create') return (
    <CreateEventView businessId={businessId} onBack={() => setView('list')} onSuccess={() => { fetchEvents(); setView('list') }} />
  )
  if (view === 'edit' && selectedEvent) return (
    <EditEventView event={selectedEvent} businessId={businessId} onBack={() => setView('detail')} onSuccess={() => { fetchEvents(); setView('detail') }} />
  )
  if (view === 'detail' && selectedEvent) return (
    <EventDetailView
      event={selectedEvent}
      onBack={() => setView('list')}
      onEdit={() => setView('edit')}
      onAttendees={() => setView('attendees')}
      onCheckin={() => setView('checkin')}
      onDelete={handleDelete}
      onRefresh={fetchEvents}
    />
  )
  if (view === 'attendees' && selectedEvent) return (
    <AttendeeListView event={selectedEvent} businessId={businessId} onBack={() => setView('detail')} />
  )
  if (view === 'checkin' && selectedEvent) return (
    <CheckinView event={selectedEvent} businessId={businessId} onBack={() => setView('detail')} />
  )

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
              <ArrowLeft size={22} color={theme.textPrimary} />
            </button>
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.textPrimary }}>Events</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: theme.textSecondary }}>Manage tickets & check-ins</p>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => setView('create')} style={s.btnPrimary}>
          <Plus size={18} /> Create
        </motion.button>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <StatCard label="Revenue" value={`$${(events.reduce((a, e) => a + (e.total_revenue || 0), 0) / 100).toFixed(0)}`} color="#10B981" icon={DollarSign} />
        <StatCard label="Tickets Sold" value={events.reduce((a, e) => a + (e.tickets_sold || 0), 0)} color="#3B82F6" icon={Ticket} />
        <StatCard label="Live Events" value={events.filter(e => e.status === 'live').length} color="#8B5CF6" icon={Calendar} />
        <StatCard label="Check-ins" value={events.reduce((a, e) => a + (e.checkins || 0), 0)} color="#F59E0B" icon={Users} />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: theme.textSecondary }}>Loading events…</div>
      ) : events.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ ...s.card, textAlign: 'center', padding: 60 }}>
          <PartyPopper size={48} color={theme.textSecondary} style={{ margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: theme.textPrimary }}>No events yet</h3>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: theme.textSecondary }}>Create your first event to start selling tickets</p>
          <button onClick={() => setView('create')} style={{ ...s.btnPrimary, margin: '0 auto', width: 'fit-content' }}>
            <Plus size={16} /> Create Event
          </button>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {events.map((event, i) => (
            <EventListCard key={event.id} event={event} delay={i * 0.05} onClick={() => { setSelectedEvent(event); setView('detail') }} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ── Event List Card ───────────────────────────────────────────────────────────
function EventListCard({ event, onClick, delay = 0 }) {
  const date = new Date(event.start_date)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{ ...s.card, padding: 0, overflow: 'hidden', cursor: 'pointer', display: 'flex', height: 110 }}
    >
      <div style={{
        width: 100, flexShrink: 0,
        background: event.image_url ? `url(${event.image_url}) center/cover` : theme.bgSurface,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!event.image_url && <Calendar size={28} color={theme.textSecondary} />}
      </div>

      <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: theme.primary, textTransform: 'uppercase', letterSpacing: 1 }}>{event.category}</span>
        <h3 style={{ margin: '3px 0', fontSize: 15, fontWeight: 700, color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {event.name}
        </h3>
        <div style={{ fontSize: 12, color: theme.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={11} /> {date.toLocaleDateString()} · {event.venue_name}
        </div>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase',
          background: event.status === 'live' ? '#DCFCE7' : '#F3F4F6',
          color: event.status === 'live' ? '#16A34A' : theme.textSecondary,
        }}>{event.status}</span>
        <span style={{ fontWeight: 800, fontSize: 15, color: theme.textPrimary }}>${(event.total_revenue / 100).toFixed(0)}</span>
        <ChevronRight size={16} color={theme.textSecondary} />
      </div>
    </motion.div>
  )
}

// ── Detail View ───────────────────────────────────────────────────────────────
function EventDetailView({ event, onBack, onEdit, onAttendees, onCheckin, onDelete, onRefresh }) {
  const tiers = event.ticket_tiers || []
  const totalSold = tiers.reduce((a, t) => a + (t.sold || 0), 0)
  const totalCap  = tiers.reduce((a, t) => a + (t.capacity || 0), 0)

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ paddingBottom: 40 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: theme.textSecondary, fontWeight: 600, fontSize: 14 }}>
          <ArrowLeft size={18} /> Back
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onEdit} style={{ ...s.btnSecondary, padding: '8px 14px', fontSize: 13 }}>
            <Edit2 size={14} /> Edit
          </button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onCheckin} style={{ ...s.btnPrimary, padding: '8px 14px', fontSize: 13 }}>
            <QrCode size={14} /> Scan
          </motion.button>
        </div>
      </div>

      {/* Hero image */}
      <div style={{
        width: '100%', height: 200, borderRadius: 20, overflow: 'hidden',
        background: event.image_url ? `url(${event.image_url}) center/cover` : theme.bgSurface,
        position: 'relative', marginBottom: 20,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)', borderRadius: 20 }} />
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#fff' }}>{event.name}</h2>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', display: 'flex', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {new Date(event.start_date).toLocaleDateString()}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {event.venue_name}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <StatCard label="Revenue"    value={`$${(event.total_revenue / 100).toFixed(0)}`}                                                        color="#10B981" icon={DollarSign} />
        <StatCard label="Sold"       value={`${totalSold} / ${totalCap}`}                                                                        color="#3B82F6" icon={Ticket} />
        <StatCard label="Check-ins"  value={`${event.checkins || 0} (${totalSold > 0 ? Math.round((event.checkins || 0) / totalSold * 100) : 0}%)`} color="#8B5CF6" icon={Users} />
        <StatCard label="Avg Ticket" value={`$${totalSold > 0 ? ((event.total_revenue / totalSold) / 100).toFixed(0) : 0}`}                       color="#F59E0B" icon={Tag} />
      </div>

      {/* Tiers */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: theme.textPrimary }}>Ticket Tiers</h3>
          <button onClick={onAttendees} style={{ background: 'none', border: 'none', color: theme.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={14} /> Attendees
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tiers.map(tier => {
            const pct = tier.capacity > 0 ? (tier.sold / tier.capacity) * 100 : 0
            const rem = (tier.capacity || 0) - (tier.sold || 0)
            return (
              <div key={tier.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: theme.textPrimary }}>{tier.name}</span>
                  <span style={{ fontSize: 13, color: theme.textSecondary }}>
                    {tier.sold}/{tier.capacity} · <strong style={{ color: theme.textPrimary }}>${(tier.price / 100).toFixed(0)}</strong>
                  </span>
                </div>
                <div style={{ width: '100%', height: 8, background: theme.bgSurface, borderRadius: 4, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{ height: '100%', background: rem === 0 ? theme.danger : theme.primary, borderRadius: 4 }}
                  />
                </div>
                {rem < 5 && rem > 0 && (
                  <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={11} /> Only {rem} left!
                  </div>
                )}
                {rem === 0 && (
                  <div style={{ fontSize: 11, color: theme.danger, marginTop: 4, fontWeight: 700 }}>SOLD OUT</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ padding: 16, background: '#FEF2F2', borderRadius: 16, border: '1px solid #FEE2E2' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: theme.danger, textTransform: 'uppercase', letterSpacing: 1 }}>Danger Zone</h4>
        <button onClick={onDelete} style={{ ...s.btnPrimary, background: theme.danger, width: '100%', padding: 12 }}>
          <Trash2 size={15} /> Archive Event
        </button>
      </div>
    </motion.div>
  )
}

// ── Create Event (3-step wizard) ──────────────────────────────────────────────
function CreateEventView({ businessId, onBack, onSuccess }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', category: 'Food',
    image_url: '', start_date: '', end_date: '',
    venue_name: '', address: '', is_free: false,
    ticket_tiers: [{ id: '1', name: 'General Admission', price: 25, capacity: 100 }],
  })

  const categories = ['Food', 'Music', 'Art', 'Classes', 'Drinks', 'Sport']

  const patch = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handlePublish = async () => {
    if (!form.name.trim() || !form.start_date) { alert('Name and start date are required'); return }
    setSaving(true)
    // TODO: await supabase.from('events').insert([{ business_id: businessId, ...form, status: 'live', tickets_sold: 0, total_revenue: 0, checkins: 0, total_capacity: form.ticket_tiers.reduce((a, t) => a + Number(t.capacity), 0) }])
    setSaving(false)
    setShowSuccess(true)
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.55 }, colors: ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'] })
    setTimeout(() => { setShowSuccess(false); onSuccess() }, 2800)
  }

  if (showSuccess) return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}
    >
      <Trophy size={80} color="#10B981" />
      <h2 style={{ fontSize: 32, fontWeight: 900, margin: '24px 0 8px', color: theme.textPrimary }}>It's Live! 🚀</h2>
      <p style={{ color: theme.textSecondary, fontSize: 15 }}>Your event is beautifully published.</p>
    </motion.div>
  )

  return (
    <div style={{ minHeight: '100vh', background: theme.bgSurface }}>
      {/* Header */}
      <div style={{ padding: '18px 16px', background: theme.bgWhite, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={22} color={theme.textPrimary} />
        </button>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>Create Event</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3].map(n => (
            <motion.div
              key={n}
              animate={{ background: n <= step ? theme.primary : theme.border }}
              style={{ width: 32, height: 4, borderRadius: 2 }}
            />
          ))}
        </div>
        <span style={{ fontSize: 12, color: theme.textSecondary, fontWeight: 700, minWidth: 32 }}>{step}/3</span>
      </div>

      <div style={{ padding: '24px 16px', paddingBottom: 110 }}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>Event Details</h2>
              <Field label="Event Name">
                <input style={s.input} placeholder="e.g. Taco Night" value={form.name} onChange={e => patch('name', e.target.value)} />
              </Field>
              <Field label="Description">
                <textarea style={{ ...s.input, minHeight: 100, resize: 'none' }} placeholder="Tell us what makes this special…" value={form.description} onChange={e => patch('description', e.target.value)} />
              </Field>
              <Field label="Category">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => patch('category', cat)}
                      style={{
                        padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                        background: form.category === cat ? theme.textPrimary : theme.bgWhite,
                        color:      form.category === cat ? '#fff'            : theme.textSecondary,
                        borderColor: form.category === cat ? theme.textPrimary : theme.border,
                        transition: 'all 0.15s',
                      }}
                    >{cat}</button>
                  ))}
                </div>
              </Field>
              <Field label="Cover Image URL">
                <input style={s.input} placeholder="https://…" value={form.image_url} onChange={e => patch('image_url', e.target.value)} />
                {form.image_url && (
                  <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', height: 140 }}>
                    <img src={form.image_url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </Field>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: theme.bgSurface, borderRadius: 12, marginTop: 4 }}>
                <input type="checkbox" id="free" checked={form.is_free} onChange={e => patch('is_free', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: theme.primary }} />
                <label htmlFor="free" style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary, cursor: 'pointer' }}>Free event (no tickets)</label>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>Date & Venue</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <Field label="Start Date">
                  <input type="date" style={s.input} value={form.start_date.split('T')[0] || ''} onChange={e => patch('start_date', e.target.value)} />
                </Field>
                <Field label="Start Time">
                  <input type="time" style={s.input} value={form.start_date.includes('T') ? form.start_date.split('T')[1] : ''} onChange={e => patch('start_date', (form.start_date.split('T')[0] || '') + 'T' + e.target.value)} />
                </Field>
              </div>
              <Field label="Venue Name">
                <input style={s.input} placeholder="The Grand Plaza" value={form.venue_name} onChange={e => patch('venue_name', e.target.value)} />
              </Field>
              <Field label="Address">
                <input style={s.input} placeholder="Full address" value={form.address} onChange={e => patch('address', e.target.value)} />
              </Field>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>Ticket Tiers</h2>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: theme.textSecondary }}>Set prices and capacity for each tier</p>

              {form.ticket_tiers.map((tier, idx) => (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ ...s.card, marginBottom: 12, background: theme.bgSurface }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                    Tier {idx + 1}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 2 }}>
                      <label style={s.label}>Name</label>
                      <input style={s.input} placeholder="General Admission" value={tier.name} onChange={e => {
                        const tiers = [...form.ticket_tiers]; tiers[idx].name = e.target.value; patch('ticket_tiers', tiers)
                      }} />
                    </div>
                    {!form.is_free && (
                      <div style={{ flex: 1 }}>
                        <label style={s.label}>Price ($)</label>
                        <input type="number" style={s.input} placeholder="25" value={tier.price} onChange={e => {
                          const tiers = [...form.ticket_tiers]; tiers[idx].price = Number(e.target.value); patch('ticket_tiers', tiers)
                        }} />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <label style={s.label}>Capacity</label>
                      <input type="number" style={s.input} placeholder="100" value={tier.capacity} onChange={e => {
                        const tiers = [...form.ticket_tiers]; tiers[idx].capacity = Number(e.target.value); patch('ticket_tiers', tiers)
                      }} />
                    </div>
                  </div>
                  {form.ticket_tiers.length > 1 && (
                    <button onClick={() => patch('ticket_tiers', form.ticket_tiers.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: theme.danger, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Trash2 size={12} /> Remove tier
                    </button>
                  )}
                </motion.div>
              ))}

              <button
                onClick={() => patch('ticket_tiers', [...form.ticket_tiers, { id: Date.now().toString(), name: '', price: 0, capacity: 100 }])}
                style={{ ...s.btnSecondary, width: '100%', borderStyle: 'dashed', marginBottom: 16 }}
              >
                <Plus size={16} /> Add Tier
              </button>

              <div style={{ padding: 14, background: theme.bgSurface, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: theme.textSecondary }}>Total Capacity</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: theme.textPrimary }}>
                  {form.ticket_tiers.reduce((a, t) => a + Number(t.capacity), 0)} people
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: theme.bgWhite, borderTop: `1px solid ${theme.border}`, display: 'flex', gap: 12, zIndex: 100 }}>
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} style={{ ...s.btnSecondary, flex: 1 }}>Back</button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => step < 3 ? setStep(s => s + 1) : handlePublish()}
          disabled={saving}
          style={{ ...s.btnPrimary, flex: 2, opacity: saving ? 0.7 : 1 }}
        >
          {step === 3 ? (saving ? 'Publishing…' : '🚀 Publish Event') : 'Continue →'}
        </motion.button>
      </div>
    </div>
  )
}

// ── Edit Event ────────────────────────────────────────────────────────────────
function EditEventView({ event, businessId, onBack, onSuccess }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...event })
  const patch = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    // TODO: await supabase.from('events').update(form).eq('id', event.id)
    setSaving(false)
    onSuccess()
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ paddingBottom: 40 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: theme.textSecondary, fontWeight: 600, fontSize: 14, marginBottom: 20 }}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>Edit Event</h2>

      <Field label="Event Name">
        <input style={s.input} value={form.name} onChange={e => patch('name', e.target.value)} />
      </Field>
      <Field label="Description">
        <textarea style={{ ...s.input, minHeight: 100, resize: 'none' }} value={form.description} onChange={e => patch('description', e.target.value)} />
      </Field>
      <Field label="Venue">
        <input style={s.input} value={form.venue_name} onChange={e => patch('venue_name', e.target.value)} />
      </Field>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button onClick={onBack} style={{ ...s.btnSecondary, flex: 1 }}>Cancel</button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving} style={{ ...s.btnPrimary, flex: 2, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Attendees ─────────────────────────────────────────────────────────────────
function AttendeeListView({ event, businessId, onBack }) {
  const [attendees, setAttendees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: real fetch from event_orders
    setAttendees([
      { id: 'o1', customer_name: 'John Smith', customer_email: 'john@example.com', tier_name: 'VIP',     quantity: 2, status: 'paid', created_at: new Date().toISOString() },
      { id: 'o2', customer_name: 'Jane Doe',   customer_email: 'jane@example.com', tier_name: 'General', quantity: 1, status: 'paid', created_at: new Date().toISOString() },
    ])
    setLoading(false)
  }, [event.id])

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ paddingBottom: 40 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: theme.textSecondary, fontWeight: 600, fontSize: 14, marginBottom: 20 }}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>Attendees</h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: theme.textSecondary }}>{attendees.length} registered</p>

      {loading ? <p style={{ color: theme.textSecondary }}>Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {attendees.map(att => (
            <motion.div key={att.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 700, color: theme.textPrimary }}>{att.customer_name}</h4>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: theme.textSecondary }}>{att.customer_email}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#DCFCE7', color: '#16A34A' }}>{att.tier_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.textSecondary }}>
                <span>{att.quantity}× ticket{att.quantity > 1 ? 's' : ''}</span>
                <span>{new Date(att.created_at).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ── Check-in (QR Scanner) ─────────────────────────────────────────────────────
function CheckinView({ event, businessId, onBack }) {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [checkedIn, setCheckedIn] = useState(0)
  const [manualInput, setManualInput] = useState('')
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)

  const startScanner = async () => {
    setScanning(true)
    setResult(null)
    try {
      const scanner = new Html5Qrcode('qr-reader')
      html5QrRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          scanner.stop()
          setScanning(false)
          handleCheckin(decodedText)
        },
        () => {}
      )
    } catch (e) {
      setScanning(false)
      alert('Camera unavailable — use manual input')
    }
  }

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop() } catch {}
      html5QrRef.current = null
    }
    setScanning(false)
  }

  const handleCheckin = (ticketId) => {
    // TODO: validate ticket against event_checkins in Supabase
    setResult({ success: true, ticketId })
    setCheckedIn(n => n + 1)
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 }, colors: ['#10B981', '#3B82F6'] })
    setTimeout(() => setResult(null), 3000)
  }

  useEffect(() => () => { stopScanner() }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingBottom: 40 }}>
      <button onClick={() => { stopScanner(); onBack() }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: theme.textSecondary, fontWeight: 600, fontSize: 14, marginBottom: 20 }}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>Check-in</h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: theme.textSecondary }}>{event.name}</p>

      {/* Counter */}
      <div style={{ ...s.card, background: '#F0FDF4', border: '1px solid #BBF7D0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <CheckCircle2 size={24} color="#16A34A" />
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#16A34A' }}>{checkedIn}</div>
          <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>checked in today</div>
        </div>
      </div>

      {/* QR scanner area */}
      {scanning ? (
        <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
          <div id="qr-reader" style={{ width: '100%' }} />
          <button onClick={stopScanner} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: 8, cursor: 'pointer' }}>
            <X size={20} color="#fff" />
          </button>
        </div>
      ) : (
        <motion.button whileTap={{ scale: 0.97 }} onClick={startScanner} style={{ ...s.btnPrimary, width: '100%', padding: 16, marginBottom: 16, fontSize: 15 }}>
          <QrCode size={20} /> Open Camera Scanner
        </motion.button>
      )}

      {/* Manual input */}
      <Field label="Or Enter Ticket ID Manually">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ ...s.input, flex: 1 }}
            placeholder="Paste ticket ID…"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && manualInput) { handleCheckin(manualInput); setManualInput('') } }}
          />
          <button
            onClick={() => { if (manualInput) { handleCheckin(manualInput); setManualInput('') } }}
            style={{ ...s.btnPrimary, padding: '14px 18px', flexShrink: 0 }}
          >
            <Check size={18} />
          </button>
        </div>
      </Field>

      {/* Result toast */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 40, left: 20, right: 20, background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', textAlign: 'center', zIndex: 200 }}
          >
            <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 800, fontSize: 18, color: theme.textPrimary }}>Ticket Verified! ✓</div>
            <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>{result.ticketId}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon }) {
  return (
    <motion.div whileTap={{ scale: 0.97 }} style={{ padding: 16, background: theme.bgWhite, borderRadius: 16, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: theme.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: theme.textPrimary }}>{value}</div>
      </div>
    </motion.div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  )
}
