import { useState, useEffect, useRef } from 'react'

// Simple collapsible section — uses CSS vars, no theme dependency
function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 16, border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 16px', background: open ? 'var(--canvas-bg)' : 'transparent',
          border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)'
        }}
      >
        {title}
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '12px 16px 16px' }}>
          {children}
        </div>
      )}
    </div>
  )
}
import { motion, AnimatePresence } from 'framer-motion'
import { Html5Qrcode } from 'html5-qrcode'
import confetti from 'canvas-confetti'
import {
  Calendar, MapPin, DollarSign, Ticket as TicketIcon, Plus, ArrowLeft, Edit2,
  ChevronRight, Trash2, Users, Check, AlertCircle, X, Trophy, Clock,
  Tag, Share2, CheckCircle2, PartyPopper
} from 'lucide-react'
import { supabase, uploadAsset } from '../../lib/supabaseClient'
import { useOwnerEvents } from '../../hooks/useOwnerEvents'
import { EVENT_TEMPLATES } from '../../utils/eventTemplates'
import { useLanguage } from '../../contexts/LanguageContext'

// ── Theme tokens ──────────────────────────────────────────────────────────────
const theme = {
  primary:       '#10B981',
  textPrimary:   'var(--text-primary, #111827)',
  textSecondary: 'var(--text-secondary, #64748B)',
  border:        'var(--border-color, #E5E7EB)',
  bgWhite:       'var(--bg-white, #FFFFFF)',
  bgSurface:     'var(--bg-surface, #F9FAFB)',
  danger:        'var(--color-danger, #EF4444)',
}

// Convert ISO string from DB → datetime-local input value (local timezone)
function toDatetimeLocal(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d)) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Convert datetime-local input value → ISO string (respects local timezone)
function toISO(localDt) {
  if (!localDt) return null
  return new Date(localDt).toISOString()
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
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [statModal, setStatModal] = useState(null) // 'revenue' | 'tickets' | 'checkins' | null
  const [showTemplates, setShowTemplates] = useState(false)
  const { t } = useLanguage()

  const { events: dbEvents, loading, error, refetch: fetchEvents, removeEvent } = useOwnerEvents(businessId)

  const events = (() => {
    const allEvents = showTemplates
      ? [...EVENT_TEMPLATES, ...(dbEvents || [])]
      : (dbEvents || [])
    return allEvents.sort((a, b) => {
      const aDate = new Date(a.start_date || 0)
      const bDate = new Date(b.start_date || 0)
      return bDate - aDate
    })
  })()

  // Listen for check-in success, refetch events, and sync selectedEvent
  useEffect(() => {
    const handleCheckinSuccess = async () => {
      const updated = await fetchEvents()
      if (selectedEvent && updated?.length) {
        const fresh = updated.find(e => e.id === selectedEvent.id)
        if (fresh) setSelectedEvent(fresh)
      }
    }

    window.addEventListener('event-checkin-success', handleCheckinSuccess)
    return () => window.removeEventListener('event-checkin-success', handleCheckinSuccess)
  }, [fetchEvents, selectedEvent])

  // When dbEvents updates, refresh selectedEvent if it's in detail view
  useEffect(() => {
    if (selectedEvent && dbEvents && dbEvents.length > 0) {
      const updated = dbEvents.find(e => e.id === selectedEvent.id)
      if (updated) {
        setSelectedEvent(updated)
      }
    }
  }, [dbEvents])

  const handleDelete = async () => {
    if (!window.confirm(t('delete_confirm_event'))) return
    try {
      console.log('🔍 [DELETE] Starting delete. Event:', selectedEvent?.id, 'Business:', businessId)

      // Production-grade delete via RPC (bypasses RLS / trigger conflicts)
      const { data: deleted, error } = await supabase.rpc('delete_event', {
        p_event_id: selectedEvent.id,
        p_business_id: businessId
      })

      if (error) {
        console.error('🚨 [DELETE] RPC error:', error.code, error.message, error.details)
        alert(`Delete failed: ${error.message || JSON.stringify(error)}`)
        return
      }

      if (error) {
        console.error('🚨 [DELETE] RPC error:', error)
        alert('Delete failed: ' + (error.message || 'Unknown error'))
        return
      }

      console.log('✅ [DELETE] Success! Deleted event:', selectedEvent.id)

      // Wipe from local state immediately so it vanishes from the list
      removeEvent(selectedEvent.id)
      setSelectedEvent(null)
      setView('list')
    } catch (err) {
      console.error('💥 [DELETE] Exception:', err)
      alert(`Error deleting event: ${err?.message}`)
    }
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
      businessId={businessId}
      onBack={() => setView('list')}
      onEdit={() => setView('edit')}
      onAttendees={() => setView('attendees')}
      onCheckin={() => setView('checkin')}
      onPromos={() => setView('promos')}
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
  if (view === 'promos' && selectedEvent) return (
    <PromosView event={selectedEvent} businessId={businessId} onBack={() => setView('detail')} />
  )

  // ── Stat Modals ──────────────────────────────────────────────────────────────
  if (statModal === 'revenue') {
    const totalRev = events.reduce((a, e) => a + (e.total_revenue_cents || 0), 0)
    const revenueSplits = events.map(e => ({ name: e.name, amount: e.total_revenue_cents || 0 })).sort((a, b) => b.amount - a.amount)
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ paddingBottom: 40 }}>
        <button onClick={() => setStatModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: theme.textSecondary, fontWeight: 600, fontSize: 14, marginBottom: 20 }}>
          <ArrowLeft size={18} /> {t('back')}
        </button>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>{t('revenue_details')}</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: theme.textSecondary }}>Total: ${(totalRev / 100).toFixed(2)}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {revenueSplits.map(e => (
            <div key={e.name} style={{ padding: 14, background: theme.bgWhite, borderRadius: 12, border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: theme.textPrimary }}>{e.name}</span>
              <span style={{ fontWeight: 800, color: theme.primary, fontSize: 15 }}>${(e.amount / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </motion.div>
    )
  }

  if (statModal === 'tickets') {
    const ticketBreakdown = events.flatMap(e => e.ticket_tiers?.map(t => ({ eventName: e.name, tier: t.name, sold: t.sold, capacity: t.capacity })) || []).sort((a, b) => b.sold - a.sold)
    const totalSold = ticketBreakdown.reduce((a, t) => a + t.sold, 0)
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ paddingBottom: 40 }}>
        <button onClick={() => setStatModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: theme.textSecondary, fontWeight: 600, fontSize: 14, marginBottom: 20 }}>
          <ArrowLeft size={18} /> {t('back')}
        </button>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>{t('tickets_sold')}</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: theme.textSecondary }}>{totalSold} total tickets</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ticketBreakdown.map((t, i) => (
            <div key={i} style={{ padding: 12, background: theme.bgWhite, borderRadius: 12, border: `1px solid ${theme.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: theme.textPrimary }}>{t.tier}</span>
                <span style={{ fontWeight: 700, color: theme.primary }}>{t.sold}/{t.capacity}</span>
              </div>
              <div style={{ width: '100%', height: 6, background: theme.bgSurface, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(t.sold / t.capacity) * 100}%`, height: '100%', background: theme.primary, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>{t.eventName}</div>
            </div>
          ))}
        </div>
      </motion.div>
    )
  }

  if (statModal === 'checkins') {
    const checkInsList = [
      { name: 'John Smith', time: '6:32 PM', tier: 'VIP', event: 'Summer Night Market' },
      { name: 'Jane Doe', time: '6:28 PM', tier: 'General', event: 'Summer Night Market' },
      { name: 'Mike Johnson', time: '6:15 PM', tier: 'VIP', event: 'Summer Night Market' },
      { name: 'Sarah Lee', time: '6:05 PM', tier: 'General', event: 'Summer Night Market' },
      { name: 'Alex Chen', time: '5:58 PM', tier: 'VIP', event: 'Summer Night Market' },
    ]
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ paddingBottom: 40 }}>
        <button onClick={() => setStatModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: theme.textSecondary, fontWeight: 600, fontSize: 14, marginBottom: 20 }}>
          <ArrowLeft size={18} /> {t('back')}
        </button>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>{t('checkins')}</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: theme.textSecondary }}>{checkInsList.length} total</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {checkInsList.map((c, i) => (
            <div key={i} style={{ padding: 12, background: theme.bgWhite, borderRadius: 12, border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: theme.textPrimary }}>{c.name}</div>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{c.event} • {c.tier}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.primary }}>{c.time}</div>
            </div>
          ))}
        </div>
      </motion.div>
    )
  }

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
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.textPrimary }}>{t('events')}</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: theme.textSecondary }}>{t('events_subtitle')}</p>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => setView('create')} style={{ ...s.btnPrimary, background: '#3B82F6' }}>
          <Plus size={18} /> {t('create')}
        </motion.button>
      </div>

      {/* Template toggle */}
      <button
        onClick={() => setShowTemplates(!showTemplates)}
        style={{
          marginBottom: 16,
          padding: '8px 12px',
          background: showTemplates ? theme.primary : theme.bgWhite,
          color: showTemplates ? '#fff' : theme.textSecondary,
          border: `1px solid ${showTemplates ? theme.primary : theme.border}`,
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {showTemplates ? '✓ ' + t('hide_templates') : '+ ' + t('show_templates')}
      </button>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <StatCard label={t('revenue')} value={`$${(events.reduce((a, e) => a + (e.total_revenue_cents || 0), 0) / 100).toFixed(0)}`} color="#10B981" icon={DollarSign} onClick={() => setStatModal('revenue')} />
        <StatCard label={t('tickets_sold')} value={events.reduce((a, e) => a + (e.tickets_sold || 0), 0)} color="#3B82F6" icon={TicketIcon} onClick={() => setStatModal('tickets')} />
        <StatCard label={t('live_events')} value={events.filter(e => e.status === 'live').length} color="#8B5CF6" icon={Calendar} />
        <StatCard label={t('checkins')} value={events.reduce((a, e) => a + (e.checkins_count || 0), 0)} color="#F59E0B" icon={Users} onClick={() => setStatModal('checkins')} />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: theme.textSecondary }}>{t('loading')}</div>
      ) : events.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ ...s.card, textAlign: 'center', padding: 60 }}>
          <PartyPopper size={48} color={theme.textSecondary} style={{ margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: theme.textPrimary }}>{t('no_events_yet')}</h3>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: theme.textSecondary }}>{t('no_events_description')}</p>
          <button onClick={() => setView('create')} style={{ ...s.btnPrimary, background: '#3B82F6', margin: '0 auto', width: 'fit-content' }}>
            <Plus size={16} /> {t('create_event')}
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
  const isExpired = date < new Date()
  const displayStatus = isExpired && event.status === 'live' ? 'expired' : event.status
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
          background: displayStatus === 'live' ? '#DCFCE7' : displayStatus === 'expired' ? '#FEF2F2' : '#F3F4F6',
          color: displayStatus === 'live' ? '#16A34A' : displayStatus === 'expired' ? '#DC2626' : theme.textSecondary,
        }}>{displayStatus}</span>
        <span style={{ fontWeight: 800, fontSize: 15, color: theme.textPrimary }}>${(event.total_revenue_cents / 100).toFixed(0)}</span>
        <ChevronRight size={16} color={theme.textSecondary} />
      </div>
    </motion.div>
  )
}

// ── Detail View ───────────────────────────────────────────────────────────────
function EventDetailView({ event, businessId, onBack, onEdit, onAttendees, onCheckin, onPromos, onDelete, onRefresh }) {
  const { t } = useLanguage()
  const tiers = event.ticket_tiers || []
  const totalSold = tiers.reduce((a, t) => a + (t.sold || 0), 0)
  const totalCap  = tiers.reduce((a, t) => a + (t.capacity || 0), 0)

  const handleToggleSoldOut = async (tierId, currentlySoldOut) => {
    const updatedTiers = tiers.map(tier =>
      tier.id === tierId ? { ...tier, forced_sold_out: !currentlySoldOut } : tier
    )
    await supabase
      .from('events')
      .update({ ticket_tiers: updatedTiers })
      .eq('id', event.id)
      .eq('business_id', businessId)
    onRefresh()
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ paddingBottom: 40 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: theme.textSecondary, fontWeight: 600, fontSize: 14 }}>
          <ArrowLeft size={18} /> {t('back')}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onEdit} style={{ ...s.btnSecondary, padding: '8px 14px', fontSize: 13 }}>
            <Edit2 size={14} /> {t('edit')}
          </button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onCheckin} style={{ ...s.btnPrimary, background: '#3B82F6', padding: '8px 14px', fontSize: 13 }}>
            {t('check_in')}
          </motion.button>
        </div>
      </div>

      {/* Hero image */}
      <div style={{
        width: '100%', height: 200, borderRadius: 20, overflow: 'hidden',
        background: event.image_url ? `url(${event.image_url}) center/cover` : theme.bgSurface,
        position: 'relative', marginBottom: 20,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 45%, transparent 80%)', borderRadius: 20 }} />
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
        <StatCard label={t('revenue')}    value={`$${(event.total_revenue_cents / 100).toFixed(0)}`}                                                        color="#10B981" icon={DollarSign} />
        <StatCard label={t('sold')}       value={`${totalSold} / ${totalCap}`}                                                                        color="#3B82F6" icon={TicketIcon} />
        <StatCard label={t('checkins')}  value={`${event.checkins_count || 0} (${totalSold > 0 ? Math.round((event.checkins_count || 0) / totalSold * 100) : 0}%)`} color="#8B5CF6" icon={Users} />
        <StatCard label={t('avg_ticket')} value={`$${totalSold > 0 ? ((event.total_revenue_cents / totalSold) / 100).toFixed(0) : 0}`}                       color="#F59E0B" icon={Tag} />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onCheckin} style={{ ...s.btnPrimary, background: '#3B82F6', flex: 1, padding: 12, fontSize: 13 }}>
          {t('check_in')}
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onPromos} style={{ ...s.btnSecondary, flex: 1, padding: 12, fontSize: 13 }}>
          <Tag size={16} /> {t('promo_codes')}
        </motion.button>
      </div>

      {/* Tiers */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: theme.textPrimary }}>{t('ticket_tiers')}</h3>
          <button onClick={onAttendees} style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={14} /> {t('attendees')}
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
                    {tier.sold}/{tier.capacity} · <strong style={{ color: theme.textPrimary }}>${(tier.price_cents / 100).toFixed(0)}</strong>
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
                {rem < 5 && rem > 0 && !tier.forced_sold_out && (
                  <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={11} /> {t('only_left').replace('{count}', rem)}
                  </div>
                )}
                {(rem === 0 || tier.forced_sold_out) && (
                  <div style={{ fontSize: 11, color: theme.danger, marginTop: 4, fontWeight: 700 }}>{t('sold_out')}</div>
                )}
                <button
                  onClick={() => handleToggleSoldOut(tier.id, !!tier.forced_sold_out)}
                  style={{
                    marginTop: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                    background: tier.forced_sold_out ? '#FEE2E2' : '#F3F4F6',
                    color: tier.forced_sold_out ? theme.danger : theme.textSecondary,
                    borderRadius: 6, padding: '3px 8px'
                  }}
                >
                  {tier.forced_sold_out ? '↩ Reopen tier' : 'Force sold out'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ padding: 16, background: '#FEF2F2', borderRadius: 16, border: '1px solid #FEE2E2' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: theme.danger, textTransform: 'uppercase', letterSpacing: 1 }}>{t('danger_zone')}</h4>
        <button onClick={onDelete} style={{ ...s.btnPrimary, background: theme.danger, width: '100%', padding: 12 }}>
          <Trash2 size={15} /> {t('delete_event_permanently')}
        </button>
      </div>
    </motion.div>
  )
}

// ── Create Event (3-step wizard) ──────────────────────────────────────────────
function CreateEventView({ businessId, onBack, onSuccess }) {
  const { t } = useLanguage()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    name: '', description: '', category: 'Food',
    image_url: '', start_date: '', end_date: '',
    venue_name: '', address: '', is_free: false,
    ticket_tiers: [{ id: '1', name: 'General Admission', price: 25, capacity: 100 }],
    lineup: [],
  })
  const [imageUploading, setImageUploading] = useState(false)

  const handleSelectTemplate = (template) => {
    setForm({
      name: template.name,
      description: template.description,
      category: template.category,
      image_url: template.image_url,
      start_date: template.start_date,
      end_date: '',
      venue_name: template.venue_name,
      address: template.address,
      is_free: template.ticket_tiers.some(t => t.price === 0),
      ticket_tiers: template.ticket_tiers.map((t, i) => ({
        id: String(i + 1),
        name: t.name,
        price: t.price,
        capacity: t.capacity
      })),
    })
    setStep(1)
  }

  const categories = ['Food', 'Music', 'Art', 'Classes', 'Drinks', 'Sports', 'Games', 'Dating']

  const patch = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handlePublish = async () => {
    if (!form.name.trim() || !form.start_date) { alert('Name and start date are required'); return }
    setSaving(true)
    try {
      const ticketTiers = form.ticket_tiers.map(t => ({
        id: t.id || crypto.randomUUID(),
        name: t.name,
        price_cents: Math.round((parseFloat(t.price) || 0) * 100),
        capacity: Number(t.capacity),
        sold: 0
      }));

      const totalCapacity = ticketTiers.reduce((a, t) => a + t.capacity, 0);
      const eventPayload = {
        business_id: businessId,
          name: form.name.trim(),
          description: form.description,
          category: form.category,
          start_date: toISO(form.start_date),
          end_date: form.end_date ? toISO(form.end_date) : null,
          venue_name: form.venue_name,
          address: form.address,
          image_url: form.image_url,
          is_free: form.is_free,
          status: 'live',
          ticket_tiers: ticketTiers,
          total_capacity: totalCapacity,
          tickets_sold: 0,
          total_revenue_cents: 0,
          checkins_count: 0,
          lineup: ['Festivals', 'Music'].includes(form.category) ? form.lineup : undefined
      };
      const { error } = await supabase.from('events').insert([eventPayload]);

      if (error) {
        alert('Failed to create event: ' + error.message);
        setSaving(false);
        return;
      }

      setShowSuccess(true)
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.55 }, colors: ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'] })
      setTimeout(() => { setShowSuccess(false); onSuccess() }, 2800)
    } catch (err) {
      console.error('handlePublish exception:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setSaving(false)
    }
  }

  if (showSuccess) return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}
    >
      {/* Soft radial glow behind icon */}
      <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)',
          }}
        />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
          }}
        >
          <motion.div
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.4 }}
          >
            <CheckCircle2 size={36} color="#fff" strokeWidth={2.5} />
          </motion.div>
        </motion.div>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
        style={{ fontSize: 28, fontWeight: 800, margin: '24px 0 6px', color: theme.textPrimary }}
      >
        It's Live!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
        style={{ color: theme.textSecondary, fontSize: 15, margin: 0 }}
      >
        Your event is published.
      </motion.p>
    </motion.div>
  )

  // Template selection (step 0)
  if (step === 0) return (
    <div style={{ minHeight: '100vh', background: theme.bgSurface }}>
      <div style={{ padding: '18px 16px', background: theme.bgWhite, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={22} color={theme.textPrimary} />
        </button>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>Event Templates</span>
      </div>

      <div style={{ padding: '20px 16px 24px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>{t('use_template')}</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: theme.textSecondary }}>{t('template_subtitle')}</p>

        <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
          {EVENT_TEMPLATES.map(template => (
            <motion.button
              key={template.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectTemplate(template)}
              style={{
                display: 'flex',
                gap: 12,
                padding: 12,
                background: theme.bgWhite,
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                cursor: 'pointer',
                alignItems: 'flex-start',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = theme.primary;
                e.currentTarget.style.background = theme.bgSurface;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.background = theme.bgWhite;
              }}
            >
              <img src={template.image_url} alt={template.name} style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, marginBottom: 2 }}>{template.name}</div>
                <div style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 1.4 }}>{template.description.substring(0, 60)}...</div>
                <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>📍 {template.venue_name} • {template.category}</div>
              </div>
              <ChevronRight size={20} color={theme.textSecondary} style={{ flexShrink: 0, marginTop: 4 }} />
            </motion.button>
          ))}
        </div>

        <button
          onClick={() => setStep(1)}
          style={{
            width: '100%',
            padding: '16px',
            background: theme.bgWhite,
            border: `2px dashed ${theme.border}`,
            borderRadius: 12,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 700,
            color: theme.textSecondary,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = theme.textSecondary;
            e.currentTarget.style.background = theme.bgSurface;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = theme.border;
            e.currentTarget.style.background = theme.bgWhite;
          }}
        >
          ➕ {t('start_from_scratch')}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: theme.bgSurface }}>
      {/* Header */}
      <div style={{ padding: '18px 16px', background: theme.bgWhite, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={22} color={theme.textPrimary} />
        </button>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: theme.textPrimary }}>{t('create_event')}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3].map(n => (
            <motion.div
              key={n}
              animate={{ background: n <= step - 1 ? theme.primary : theme.border }}
              style={{ width: 32, height: 4, borderRadius: 2 }}
            />
          ))}
        </div>
        <span style={{ fontSize: 12, color: theme.textSecondary, fontWeight: 700, minWidth: 32 }}>{step - 1}/3</span>
      </div>

      <div style={{ padding: '20px 16px 24px' }}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>Event Details</h2>
              <Field label={t('event_name')}>
                <input style={s.input} placeholder="e.g. Taco Night" value={form.name} onChange={e => patch('name', e.target.value)} />
              </Field>
              <Field label={t('event_description')}>
                <textarea style={{ ...s.input, minHeight: 72, resize: 'none' }} placeholder="Tell us what makes this special…" value={form.description} onChange={e => patch('description', e.target.value)} />
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
              <Field label="Cover Image (16:9)">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setImageUploading(true)
                    try {
                      const { url, error } = await uploadAsset(file, businessId, 'assets')
                      if (error) throw error
                      patch('image_url', url)
                    } catch (err) {
                      console.error('Image upload failed:', err)
                      alert('Image upload failed: ' + (err.message || 'Unknown error'))
                    } finally {
                      setImageUploading(false)
                    }
                  }}
                />
                {form.image_url ? (
                  <motion.div
                    whileTap={{ scale: 0.97 }}
                    onClick={() => !imageUploading && fileInputRef.current?.click()}
                    style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', height: 140, cursor: imageUploading ? 'wait' : 'pointer', border: `2px solid ${theme.primary}`, opacity: imageUploading ? 0.6 : 1 }}
                  >
                    <img src={form.image_url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </motion.div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                    style={{ ...s.btnSecondary, width: '100%', justifyContent: 'center', padding: 16, opacity: imageUploading ? 0.6 : 1 }}
                  >
                    {imageUploading ? 'Uploading…' : '📸 Upload Image'}
                  </button>
                )}
              </Field>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: theme.bgSurface, borderRadius: 12, marginTop: 4 }}>
                <input type="checkbox" id="free" checked={form.is_free} onChange={e => {
                  patch('is_free', e.target.checked);
                  if (e.target.checked) {
                    const tiers = form.ticket_tiers.map(t => ({ ...t, price: 0 }));
                    patch('ticket_tiers', tiers);
                  }
                }} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: theme.primary }} />
                <label htmlFor="free" style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary, cursor: 'pointer' }}>Free event</label>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>{t('date_and_venue')}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <Field label={t('start_date')}>
                  <input type="datetime-local" style={s.input} value={form.start_date ? toDatetimeLocal(form.start_date) : ''} onChange={e => patch('start_date', e.target.value)} />
                </Field>
                <Field label={t('end_date')}>
                  <input type="datetime-local" style={s.input} value={form.end_date ? toDatetimeLocal(form.end_date) : ''} onChange={e => patch('end_date', e.target.value)} />
                </Field>
              </div>
              <Field label={t('venue_name')}>
                <input style={s.input} placeholder="The Grand Plaza" value={form.venue_name} onChange={e => patch('venue_name', e.target.value)} />
              </Field>
              <Field label={t('address_label')}>
                <input style={s.input} placeholder="Full address" value={form.address} onChange={e => patch('address', e.target.value)} />
              </Field>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>{t('ticket_tiers')}</h2>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: theme.textSecondary }}>{t('ticket_tiers_subtitle')}</p>

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
                    <div style={{ flex: 1 }}>
                      <label style={s.label}>Price ($)</label>
                      <input type="number" style={s.input} placeholder="25" value={tier.price} disabled={form.is_free} onChange={e => {
                        const tiers = [...form.ticket_tiers]; tiers[idx].price = Number(e.target.value); patch('ticket_tiers', tiers)
                      }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={s.label}>Capacity</label>
                      <input type="number" style={s.input} placeholder="100" min="1" value={tier.capacity || ''} onChange={e => {
                        const tiers = [...form.ticket_tiers]; tiers[idx].capacity = e.target.value === '' ? 0 : Math.max(1, parseInt(e.target.value) || 1); patch('ticket_tiers', tiers)
                      }} onBlur={e => {
                        if (!tier.capacity || tier.capacity < 1) { const tiers = [...form.ticket_tiers]; tiers[idx].capacity = 1; patch('ticket_tiers', tiers) }
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

              {['Festivals', 'Music'].includes(form.category) && (
                <>
                  <h2 style={{ margin: '24px 0 6px', fontSize: 18, fontWeight: 800, color: theme.textPrimary }}>Artist Schedule</h2>
                  <p style={{ margin: '0 0 16px', fontSize: 13, color: theme.textSecondary }}>Add DJs, artists, or performers</p>

                  {(form.lineup || []).map((artist, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...s.card, marginBottom: 12, background: theme.bgSurface }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={s.label}>Time (HH:MM)</label>
                          <input type="time" style={s.input} value={artist.time} onChange={e => {
                            const lineup = [...(form.lineup || [])]; lineup[idx].time = e.target.value; patch('lineup', lineup)
                          }} />
                        </div>
                        <div style={{ flex: 2 }}>
                          <label style={s.label}>Artist</label>
                          <input style={s.input} placeholder="e.g. Solar Flare" value={artist.artist} onChange={e => {
                            const lineup = [...(form.lineup || [])]; lineup[idx].artist = e.target.value; patch('lineup', lineup)
                          }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label style={s.label}>Genre</label>
                          <input style={s.input} placeholder="e.g. House" value={artist.genre} onChange={e => {
                            const lineup = [...(form.lineup || [])]; lineup[idx].genre = e.target.value; patch('lineup', lineup)
                          }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={s.label}>Stage</label>
                          <input style={s.input} placeholder="e.g. Main Stage" value={artist.stage} onChange={e => {
                            const lineup = [...(form.lineup || [])]; lineup[idx].stage = e.target.value; patch('lineup', lineup)
                          }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 6 }}>
                          <button onClick={() => patch('lineup', form.lineup.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: theme.danger, cursor: 'pointer', padding: 4 }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  <button
                    onClick={() => patch('lineup', [...(form.lineup || []), { time: '', artist: '', genre: '', stage: '' }])}
                    style={{ ...s.btnSecondary, width: '100%', borderStyle: 'dashed', marginBottom: 16 }}
                  >
                    <Plus size={16} /> Add Artist
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons — tight to content */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{ ...s.btnSecondary, flex: 1, borderRadius: 14, padding: '14px 16px', fontSize: 15 }}>Back</button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => step < 3 ? setStep(s => s + 1) : handlePublish()}
            disabled={step === 1 && (!form.name.trim() || !form.category || !form.image_url) || saving}
            style={{
              ...s.btnPrimary,
              background: '#3B82F6',
              flex: step > 1 ? 2 : 1,
              width: step > 1 ? undefined : '100%',
              borderRadius: 14,
              padding: '14px 16px',
              fontSize: 15,
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
              opacity: (step === 1 && (!form.name.trim() || !form.category || !form.image_url)) ? 0.5 : (saving ? 0.7 : 1),
              cursor: (step === 1 && (!form.name.trim() || !form.category || !form.image_url)) ? 'not-allowed' : 'pointer',
            }}
          >
            {step === 3 ? (saving ? t('publishing') || 'Publicando…' : t('publish_event')) : t('continue_btn')}
          </motion.button>
        </div>
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
    try {
      const { error } = await supabase
        .from('events')
        .update({
          name: form.name,
          description: form.description,
          venue_name: form.venue_name,
          address: form.address,
          image_url: form.image_url,
          start_date: toISO(form.start_date),
          end_date: form.end_date ? toISO(form.end_date) : null,
          updated_at: new Date().toISOString(),
          lineup: ['Festivals', 'Music'].includes(form.category) ? form.lineup : undefined
        })
        .eq('id', event.id);

      if (error) {
        console.error('handleSave error:', error);
        alert('Failed to save: ' + error.message);
      } else {
        onSuccess()
      }
    } catch (err) {
      console.error('handleSave exception:', err);
      alert('Something went wrong.');
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ paddingBottom: 40 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: theme.textSecondary, fontWeight: 600, fontSize: 14, marginBottom: 20 }}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>Edit Event</h2>

      <Collapsible title="Detalles del Evento" defaultOpen={true}>
        <Field label="Event Name">
          <input style={s.input} value={form.name} onChange={e => patch('name', e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea style={{ ...s.input, minHeight: 100, resize: 'none' }} value={form.description} onChange={e => patch('description', e.target.value)} />
        </Field>
        <Field label="Venue">
          <input style={s.input} value={form.venue_name} onChange={e => patch('venue_name', e.target.value)} />
        </Field>
        <Field label="Address">
          <input style={s.input} value={form.address || ''} onChange={e => patch('address', e.target.value)} />
        </Field>
        <Field label="Start Date">
          <input type="datetime-local" style={s.input} value={toDatetimeLocal(form.start_date)} onChange={e => patch('start_date', e.target.value)} />
        </Field>
        <Field label="End Date">
          <input type="datetime-local" style={s.input} value={toDatetimeLocal(form.end_date)} onChange={e => patch('end_date', e.target.value)} />
        </Field>
      </Collapsible>

      {['Festivals', 'Music'].includes(form.category) && (
        <Collapsible title="Artist Schedule" defaultOpen={false}>
          {(form.lineup || []).map((artist, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...s.card, marginBottom: 12, background: theme.bgSurface }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Time (HH:MM)</label>
                  <input type="time" style={s.input} value={artist.time} onChange={e => {
                    const lineup = [...(form.lineup || [])]; lineup[idx].time = e.target.value; patch('lineup', lineup)
                  }} />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={s.label}>Artist</label>
                  <input style={s.input} placeholder="e.g. Solar Flare" value={artist.artist} onChange={e => {
                    const lineup = [...(form.lineup || [])]; lineup[idx].artist = e.target.value; patch('lineup', lineup)
                  }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Genre</label>
                  <input style={s.input} placeholder="e.g. House" value={artist.genre} onChange={e => {
                    const lineup = [...(form.lineup || [])]; lineup[idx].genre = e.target.value; patch('lineup', lineup)
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Stage</label>
                  <input style={s.input} placeholder="e.g. Main Stage" value={artist.stage} onChange={e => {
                    const lineup = [...(form.lineup || [])]; lineup[idx].stage = e.target.value; patch('lineup', lineup)
                  }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 6 }}>
                  <button onClick={() => patch('lineup', form.lineup.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: theme.danger, cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          <button
            onClick={() => patch('lineup', [...(form.lineup || []), { time: '', artist: '', genre: '', stage: '' }])}
            style={{ ...s.btnSecondary, width: '100%', borderStyle: 'dashed', marginBottom: 8, marginTop: 4 }}
          >
            <Plus size={16} /> Add Artist
          </button>
        </Collapsible>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button onClick={onBack} style={{ ...s.btnSecondary, flex: 1 }}>Cancel</button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving} style={{ ...s.btnPrimary, background: '#3B82F6', flex: 2, opacity: saving ? 0.7 : 1 }}>
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
    const fetchAttendees = async () => {
      try {
        const { data, error } = await supabase
          .from('event_orders')
          .select('*')
          .eq('event_id', event.id)
          .eq('payment_status', 'paid')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('fetchAttendees error:', error);
          setAttendees([]);
        } else {
          setAttendees((data || []).map(o => ({
            id: o.id,
            customer_name: o.customer_name || 'Guest',
            customer_email: o.customer_email || '',
            tier_name: o.tier_snapshot?.name || 'General',
            quantity: o.quantity || 1,
            status: o.payment_status,
            created_at: o.created_at
          })));
        }
      } catch (err) {
        console.error('fetchAttendees exception:', err);
        setAttendees([]);
      }
      setLoading(false);
    };
    fetchAttendees();
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

// ── Check-in (Manual Code Entry) ───────────────────────────────────────────────
function CheckinView({ event, businessId, onBack }) {
  const [result, setResult] = useState(null)
  const [checkedIn, setCheckedIn] = useState(0)
  const [codeInput, setCodeInput] = useState('')
  const [loading, setLoading] = useState(false)

  // Fix 4: Load real check-in count from DB on mount — local state resets on navigate
  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from('event_checkins')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
      if (count !== null) setCheckedIn(count)
    }
    fetchCount()
  }, [event.id])

  const handleCheckin = async (code) => {
    if (!code.trim()) return
    setLoading(true)
    try {
      // 6-digit code: strip all non-digits
      const cleanCode = code.replace(/\D/g, '')

      if (cleanCode.length !== 6) {
        setResult({ success: false, code, message: 'Code must be 6 digits' })
        setLoading(false)
        setTimeout(() => setResult(null), 3000)
        return
      }

      // Query by ticket code directly — RLS handles business isolation
      const { data: order, error } = await supabase
        .from('event_orders')
        .select('id, event_id, customer_name, tier_snapshot, payment_status, total_cents')
        .eq('ticket_code', cleanCode)
        .eq('event_id', event.id)
        .maybeSingle()

      if (error || !order) {
        setResult({ success: false, code, message: 'Code not found' })
        setLoading(false)
        setTimeout(() => setResult(null), 3000)
        return
      }

      // Free tickets are valid regardless of payment_status
      const isFreeTicket = order.total_cents === 0 || order.tier_snapshot?.price_cents === 0
      if (order.payment_status !== 'paid' && !isFreeTicket) {
        setResult({ success: false, code, message: 'Payment pending' })
        setLoading(false)
        setTimeout(() => setResult(null), 3000)
        return
      }

      // Fix 5: use maybeSingle() — .single() throws PGRST116 on 0 rows which
      // is indistinguishable from an RLS block, causing duplicate check-ins.
      const { data: existingCheckin } = await supabase
        .from('event_checkins')
        .select('id')
        .eq('order_id', order.id)
        .eq('event_id', event.id)
        .maybeSingle()

      if (existingCheckin) {
        setResult({ success: false, code, message: 'Already checked in' })
        setLoading(false)
        setTimeout(() => setResult(null), 3000)
        return
      }

      const { error: insertError } = await supabase
        .from('event_checkins')
        .insert({
          event_id: event.id,
          order_id: order.id,
          checkin_method: 'manual'
        })

      // Duplicate key (23505) means RLS blocked the SELECT but the record exists
      if (insertError) {
        const alreadyDone = insertError.code === '23505'
        setResult({ success: false, code, message: alreadyDone ? 'Already checked in' : 'Check-in failed' })
        setLoading(false)
        setTimeout(() => setResult(null), 3000)
        return
      }

      setResult({
        success: true,
        code,
        name: order.customer_name || 'Guest',
        tier: order.tier_snapshot?.name || 'General'
      })
      setCheckedIn(n => n + 1)
      setCodeInput('')
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 }, colors: ['#10B981', '#3B82F6'] })
      setLoading(false)

      // Refetch event to update attendee count
      setTimeout(() => {
        setResult(null)
        // Update event's sold count in real-time by incrementing the tier
        if (event?.ticket_tiers) {
          const updatedTiers = event.ticket_tiers.map(t =>
            t.id === order.tier_snapshot?.id ? { ...t, sold: (t.sold || 0) + 1 } : t
          )
          // Trigger parent refetch via window event
          window.dispatchEvent(new Event('event-checkin-success'))
        }
      }, 3000)
    } catch (err) {
      console.error('handleCheckin error:', err)
      setResult({ success: false, code, message: 'Check-in failed' })
      setLoading(false)
      setTimeout(() => setResult(null), 3000)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingBottom: 40 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: theme.textSecondary, fontWeight: 600, fontSize: 14, marginBottom: 20 }}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>Check-in Guests</h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: theme.textSecondary }}>{event.name}</p>

      {/* Counter */}
      <div style={{ ...s.card, background: '#F0FDF4', border: '1px solid #BBF7D0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <CheckCircle2 size={24} color="#16A34A" />
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#16A34A' }}>{checkedIn}</div>
          <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>checked in today</div>
        </div>
      </div>

      {/* Code input */}
      <Field label="Code">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ ...s.input, flex: 1, fontSize: 18, letterSpacing: '0.2em', textTransform: 'uppercase' }}
            placeholder="123456"
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter' && codeInput) handleCheckin(codeInput) }}
            disabled={loading}
          />
          <button
            onClick={() => handleCheckin(codeInput)}
            disabled={!codeInput || loading}
            style={{ ...s.btnPrimary, background: '#3B82F6', padding: '14px 18px', flexShrink: 0, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '...' : <Check size={18} />}
          </button>
        </div>
      </Field>

      {/* Result toast */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: 120, left: 20, right: 20, background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', textAlign: 'center', zIndex: 200 }}
          >
            {result.success ? (
              <>
                <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 800, fontSize: 18, color: theme.textPrimary }}>{result.name} ✓</div>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>{result.tier}</div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#EF4444', marginBottom: 8 }}>✕ {result.message}</div>
                {result.ticketId && <div style={{ fontSize: 12, color: theme.textSecondary }}>{result.ticketId}</div>}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Promos View ──────────────────────────────────────────────────────────────────
function PromosView({ event, businessId, onBack }) {
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newPromo, setNewPromo] = useState({ code: '', discount_percent: 10, max_uses: 100 })

  useEffect(() => {
    const fetchPromos = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('event_promo_codes')
          .select('*')
          .eq('event_id', event.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('fetchPromos error:', error)
          setPromos([])
        } else {
          setPromos(data || [])
        }
      } catch (err) {
        console.error('fetchPromos exception:', err)
        setPromos([])
      }
      setLoading(false)
    }
    fetchPromos()
  }, [event.id])

  const handleCreatePromo = async () => {
    if (!newPromo.code.trim()) { alert('Code required'); return }
    try {
      const { data, error } = await supabase
        .from('event_promo_codes')
        .insert([{
          event_id: event.id,
          business_id: businessId,
          code: newPromo.code.trim().toUpperCase(),
          discount_percent: Math.max(0, Math.min(100, Number(newPromo.discount_percent) || 0)),
          max_uses: Math.max(1, Number(newPromo.max_uses) || 100),
          used_count: 0
        }])
        .select()
        .single()

      if (error) {
        console.error('handleCreatePromo error:', error)
        alert('Failed to create promo: ' + error.message)
        return
      }

      setPromos(prev => [data, ...prev])
      setNewPromo({ code: '', discount_percent: 10, max_uses: 100 })
      setShowForm(false)
    } catch (err) {
      console.error('handleCreatePromo exception:', err)
      alert('Something went wrong.')
    }
  }

  const handleDeletePromo = async (id) => {
    if (!window.confirm('Delete this promo code?')) return
    try {
      const { error } = await supabase
        .from('event_promo_codes')
        .delete()
        .eq('id', id)
        .eq('event_id', event.id)

      if (error) {
        console.error('handleDeletePromo error:', error)
        alert('Failed to delete promo: ' + error.message)
        return
      }

      setPromos(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('handleDeletePromo exception:', err)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ paddingBottom: 40 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: theme.textSecondary, fontWeight: 600, fontSize: 14, marginBottom: 20 }}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>Promo Codes</h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: theme.textSecondary }}>{event.name}</p>

      {showForm ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...s.card, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: theme.textPrimary }}>Create Promo Code</h3>

          <Field label="Code">
            <input
              style={s.input}
              placeholder="EARLYBIRD20"
              value={newPromo.code}
              onChange={e => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
            />
          </Field>

          <Field label="Discount %">
            <input
              type="number"
              style={s.input}
              min={1}
              max={100}
              value={newPromo.discount_percent}
              onChange={e => setNewPromo({ ...newPromo, discount_percent: Number(e.target.value) })}
            />
          </Field>

          <Field label="Usage Limit">
            <input
              type="number"
              style={s.input}
              min={1}
              placeholder="100"
              value={newPromo.max_uses}
              onChange={e => setNewPromo({ ...newPromo, max_uses: Number(e.target.value) })}
            />
          </Field>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setShowForm(false)} style={{ ...s.btnSecondary, flex: 1 }}>Cancel</button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleCreatePromo} style={{ ...s.btnPrimary, background: '#3B82F6', flex: 1 }}>
              Create Code
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowForm(true)} style={{ ...s.btnPrimary, background: '#3B82F6', width: '100%', padding: 14, marginBottom: 20, justifyContent: 'center' }}>
          <Plus size={18} /> New Promo Code
        </motion.button>
      )}

      {loading ? (
        <p style={{ color: theme.textSecondary }}>Loading promos…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {promos.map(promo => (
            <motion.div key={promo.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...s.card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: theme.primary, letterSpacing: 2 }}>{promo.code}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary, marginTop: 2 }}>
                    {promo.discount_percent}% off
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePromo(promo.id)}
                  style={{ background: 'none', border: 'none', color: theme.danger, cursor: 'pointer', padding: 4 }}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: theme.textSecondary, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Uses</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: theme.textPrimary }}>{promo.used_count} / {promo.max_uses}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: theme.textSecondary, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Created</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary }}>{new Date(promo.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              <div style={{ width: '100%', height: 6, background: theme.bgSurface, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: String(promo.max_uses > 0 ? (promo.used_count / promo.max_uses) * 100 : 0) + '%', height: '100%', background: theme.primary, borderRadius: 3 }} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: onClick ? 0.97 : 1 }}
      onClick={onClick}
      style={{ padding: 16, background: theme.bgWhite, borderRadius: 16, border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 12, cursor: onClick ? 'pointer' : 'default', textAlign: 'left', width: '100%' }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 12, background: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: theme.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: theme.textPrimary }}>{value}</div>
      </div>
    </motion.button>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  )
}
