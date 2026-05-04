import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { Calendar, MapPin, DollarSign, Ticket, Plus, ArrowLeft, Edit2, QrCode, ChevronRight, ImageIcon, Trash2, Users, MoreVertical, Check, AlertCircle, X } from 'lucide-react'

export default function OwnerEventsView({ businessId, tenantSlug, lang, onBack }) {
  const [view, setView] = useState('list') // 'list' | 'create' | 'detail' | 'edit' | 'attendees' | 'checkin' | 'refund'
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!businessId) return
    fetchEvents()
  }, [businessId])

  const fetchEvents = async () => {
    setLoading(true)
    // TODO: Wire Supabase query
    // const { data, error } = await supabase
    //   .from('events')
    //   .select(`
    //     *,
    //     event_orders(count)
    //   `)
    //   .eq('business_id', businessId)
    //   .order('start_date', { ascending: false })

    // Mock data for now
    const mockData = [
      {
        id: 'evt_001',
        business_id: businessId,
        name: 'Summer Night Market',
        description: 'Live music and local vendors',
        category: 'food',
        start_date: '2026-06-15T19:00:00',
        end_date: '2026-06-15T23:00:00',
        venue_name: 'Central Park',
        address: '123 Park Ave',
        image_url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800',
        is_free: false,
        status: 'live',
        ticket_tiers: [
          { id: 't1', name: 'General', price: 2500, capacity: 100, sold: 45, remaining: 55 },
          { id: 't2', name: 'VIP', price: 5000, capacity: 20, sold: 18, remaining: 2 }
        ],
        total_capacity: 120,
        tickets_sold: 63,
        total_revenue: 137500,
        checkins: 32,
        created_at: new Date().toISOString()
      }
    ]

    setEvents(mockData)
    setLoading(false)
  }

  const handleSelectEvent = (event) => {
    setSelectedEvent(event)
    setView('detail')
  }

  const handleCreateSuccess = () => {
    fetchEvents()
    setView('list')
  }

  const handleEditSuccess = () => {
    fetchEvents()
    setView('detail')
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure? This cannot be undone.')) return
    // TODO: Wire Supabase delete
    // await supabase.from('events').update({ status: 'archived' }).eq('id', selectedEvent.id)
    alert('Event archived successfully')
    fetchEvents()
    setView('list')
  }

  if (view === 'create') {
    return <CreateEventView businessId={businessId} onBack={() => setView('list')} onSuccess={handleCreateSuccess} />
  }

  if (view === 'edit' && selectedEvent) {
    return <EditEventView event={selectedEvent} businessId={businessId} onBack={() => setView('detail')} onSuccess={handleEditSuccess} />
  }

  if (view === 'detail' && selectedEvent) {
    return (
      <EventDetailView
        event={selectedEvent}
        onBack={() => setView('list')}
        onEdit={() => setView('edit')}
        onAttendees={() => setView('attendees')}
        onCheckin={() => setView('checkin')}
        onDelete={handleDelete}
        onRefresh={() => { setRefreshing(true); fetchEvents().then(() => setRefreshing(false)) }}
      />
    )
  }

  if (view === 'attendees' && selectedEvent) {
    return <AttendeeListView event={selectedEvent} onBack={() => setView('detail')} businessId={businessId} />
  }

  if (view === 'checkin' && selectedEvent) {
    return <CheckinView event={selectedEvent} onBack={() => setView('detail')} businessId={businessId} />
  }

  // List View
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>Events</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Manage and track event performance</p>
        </div>
        <button
          onClick={() => setView('create')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#10B981', color: '#fff', border: 'none',
            padding: '10px 16px', borderRadius: 12, fontSize: 13,
            fontWeight: 600, cursor: 'pointer'
          }}
        >
          <Plus size={16} strokeWidth={2} /> Create Event
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Revenue" value={`$${(events.reduce((sum, e) => sum + (e.total_revenue || 0), 0) / 100).toFixed(2)}`} color="#10B981" icon={DollarSign} />
        <StatCard label="Tickets Sold" value={events.reduce((sum, e) => sum + (e.tickets_sold || 0), 0).toString()} color="#3B82F6" icon={Ticket} />
        <StatCard label="Active Events" value={events.filter(e => e.status === 'live').length.toString()} color="#8B5CF6" icon={Calendar} />
        <StatCard label="Check-ins" value={events.reduce((sum, e) => sum + (e.checkins || 0), 0).toString()} color="#F59E0B" icon={Users} />
      </div>

      {/* Events List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <p>Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>No events yet</h3>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>Create your first event to start selling tickets</p>
          <button
            onClick={() => setView('create')}
            style={{
              background: '#10B981', color: '#fff', border: 'none',
              padding: '10px 20px', borderRadius: 12, fontSize: 14,
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            Create Event
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.map(event => (
            <EventListCard key={event.id} event={event} onClick={() => handleSelectEvent(event)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ===== LIST CARD =====
function EventListCard({ event, onClick }) {
  const eventDate = new Date(event.start_date)
  const now = new Date()
  const isPast = eventDate < now

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB',
        overflow: 'hidden', cursor: 'pointer', display: 'flex', padding: 16, gap: 16
      }}
    >
      <div style={{
        width: 80, height: 80, borderRadius: 12,
        background: event.image_url ? `url(${event.image_url}) center/cover` : '#F3F4F6',
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {!event.image_url && <Calendar size={24} color="#9CA3AF" strokeWidth={2} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {event.name}
          </h3>
          <span style={{
            background: event.status === 'live' ? '#DCFCE7' : '#F3F4F6',
            color: event.status === 'live' ? '#16A34A' : '#6B7280',
            fontSize: 10, fontWeight: 600, padding: '2px 8px',
            borderRadius: 20, textTransform: 'uppercase', flexShrink: 0
          }}>
            {event.status}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={12} strokeWidth={2} /> {eventDate.toLocaleDateString()}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} strokeWidth={2} /> {event.venue_name}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <span style={{ fontWeight: 600, color: '#111827' }}>
            ${(event.total_revenue / 100).toFixed(2)}
            <span style={{ fontWeight: 400, color: '#6B7280', fontSize: 11 }}> revenue</span>
          </span>
          <span style={{ fontWeight: 600, color: '#111827' }}>
            {event.tickets_sold}/{event.total_capacity}
            <span style={{ fontWeight: 400, color: '#6B7280', fontSize: 11 }}> sold</span>
          </span>
        </div>
      </div>
      <ChevronRight size={20} color="#9CA3AF" strokeWidth={2} style={{ flexShrink: 0, alignSelf: 'center' }} />
    </div>
  )
}

// ===== DETAIL VIEW =====
function EventDetailView({ event, onBack, onEdit, onAttendees, onCheckin, onDelete, onRefresh }) {
  const tiers = event.ticket_tiers || []
  const totalCapacity = tiers.reduce((sum, t) => sum + (t.capacity || 0), 0)
  const totalSold = tiers.reduce((sum, t) => sum + (t.sold || 0), 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: '#6B7280',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0
          }}
        >
          <ArrowLeft size={18} strokeWidth={2} /> Back
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onEdit}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#F3F4F6', border: 'none', color: '#374151',
              padding: '8px 14px', borderRadius: 10, fontSize: 13,
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            <Edit2 size={14} strokeWidth={2} /> Edit
          </button>
          <button
            onClick={onCheckin}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#10B981', border: 'none', color: '#fff',
              padding: '8px 14px', borderRadius: 10, fontSize: 13,
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            <QrCode size={14} strokeWidth={2} /> Scan
          </button>
        </div>
      </div>

      {/* Event Image & Title */}
      <div style={{
        width: '100%', height: 200, borderRadius: 16,
        background: event.image_url ? `url(${event.image_url}) center/cover` : '#F3F4F6',
        marginBottom: 20, display: 'flex', alignItems: 'flex-end', padding: 16,
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)',
          borderRadius: 16
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#fff' }}>{event.name}</h2>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={14} strokeWidth={2} /> {new Date(event.start_date).toLocaleDateString()}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={14} strokeWidth={2} /> {event.venue_name}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Revenue" value={`$${(event.total_revenue / 100).toFixed(2)}`} color="#10B981" icon={DollarSign} />
        <StatCard label="Tickets Sold" value={`${totalSold} / ${totalCapacity}`} color="#3B82F6" icon={Ticket} />
        <StatCard label="Check-ins" value={`${event.checkins || 0} (${totalSold > 0 ? Math.round((event.checkins || 0) / totalSold * 100) : 0}%)`} color="#8B5CF6" icon={Users} />
        <StatCard label="Avg Ticket" value={`$${totalSold > 0 ? ((event.total_revenue || 0) / totalSold / 100).toFixed(2) : '0'}`} color="#F59E0B" icon={Ticket} />
      </div>

      {/* Tier Performance */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>Ticket Tiers</h3>
          <button onClick={onAttendees} style={{ background: 'none', border: 'none', color: '#10B981', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={14} /> View Attendees
          </button>
        </div>
        {tiers.length === 0 ? (
          <p style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: 20, margin: 0 }}>No tiers</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tiers.map(tier => {
              const percentage = tier.capacity > 0 ? (tier.sold / tier.capacity) * 100 : 0
              const remaining = (tier.capacity || 0) - (tier.sold || 0)
              return (
                <div key={tier.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{tier.name}</span>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>
                      {tier.sold} / {tier.capacity} sold
                      <span style={{ fontWeight: 600, color: '#111827', marginLeft: 8 }}>${(tier.price / 100).toFixed(2)}</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${percentage}%`, height: '100%',
                      background: remaining === 0 ? '#DC2626' : '#10B981',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  {remaining < 5 && remaining > 0 && (
                    <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={12} /> Only {remaining} left
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div style={{ padding: 16, background: '#FEF2F2', borderRadius: 16, border: '1px solid #FEE2E2' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#DC2626' }}>Danger Zone</h4>
        <button
          onClick={onDelete}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            background: '#DC2626', color: '#fff', border: 'none',
            padding: '10px 14px', borderRadius: 10, fontSize: 13,
            fontWeight: 600, cursor: 'pointer'
          }}
        >
          <Trash2 size={14} strokeWidth={2} /> Archive Event
        </button>
      </div>
    </div>
  )
}

// ===== CREATE VIEW =====
function CreateEventView({ businessId, onBack, onSuccess }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', category: 'food',
    venue_name: '', address: '', start_date: '', end_date: '',
    is_free: false, image_url: '',
    ticket_tiers: [{ id: '1', name: 'General Admission', price: 0, capacity: 100 }]
  })

  const categories = [
    { id: 'food', label: 'Food' },
    { id: 'music', label: 'Music' },
    { id: 'art', label: 'Art' },
    { id: 'classes', label: 'Classes' },
    { id: 'drinks', label: 'Drinks' },
  ]

  const handleAddTier = () => {
    setForm(prev => ({
      ...prev,
      ticket_tiers: [...prev.ticket_tiers, {
        id: String(prev.ticket_tiers.length + 1),
        name: '', price: 0, capacity: 100
      }]
    }))
  }

  const handleTierChange = (index, field, value) => {
    setForm(prev => {
      const tiers = [...prev.ticket_tiers]
      tiers[index] = { ...tiers[index], [field]: value }
      return { ...prev, ticket_tiers: tiers }
    })
  }

  const handleSave = async (asDraft = false) => {
    if (!form.name.trim() || !form.start_date) {
      alert('Please fill in required fields')
      return
    }
    setSaving(true)

    // TODO: Wire Supabase insert
    // const { error } = await supabase.from('events').insert([{
    //   business_id: businessId,
    //   name: form.name,
    //   description: form.description,
    //   category: form.category,
    //   venue_name: form.venue_name,
    //   address: form.address,
    //   start_date: form.start_date,
    //   end_date: form.end_date,
    //   image_url: form.image_url,
    //   is_free: form.is_free,
    //   ticket_tiers: form.ticket_tiers,
    //   status: asDraft ? 'draft' : 'live',
    //   total_capacity: form.ticket_tiers.reduce((sum, t) => sum + Number(t.capacity), 0),
    //   tickets_sold: 0,
    //   total_revenue: 0,
    //   checkins: 0
    // }])

    setSaving(false)
    alert('Event created successfully!')
    onSuccess()
  }

  const totalCapacity = form.ticket_tiers.reduce((sum, t) => sum + Number(t.capacity), 0)

  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={18} strokeWidth={2} /> Back
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3].map(s => <div key={s} style={{ width: 28, height: 3, borderRadius: 2, background: s <= step ? '#10B981' : '#E5E7EB' }} />)}
        </div>
      </div>

      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 600, color: '#111827' }}>
        {step === 1 && 'Create Event'}{step === 2 && 'Date & Venue'}{step === 3 && 'Ticket Tiers'}
      </h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B7280' }}>Step {step} of 3</p>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20 }}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="Cover Image">
              <input type="text" placeholder="Image URL (16:9)" value={form.image_url} onChange={e => setForm(prev => ({ ...prev, image_url: e.target.value }))} style={inputStyle} />
            </FormField>
            <FormField label="Event Name">
              <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Summer Night Market" style={inputStyle} />
            </FormField>
            <FormField label="Description">
              <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="What makes your event special?" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </FormField>
            <FormField label="Category">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setForm(prev => ({ ...prev, category: cat.id }))}
                    style={{
                      padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                      border: '1px solid', cursor: 'pointer',
                      background: form.category === cat.id ? '#111827' : '#fff',
                      color: form.category === cat.id ? '#fff' : '#374151',
                      borderColor: form.category === cat.id ? '#111827' : '#E5E7EB'
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </FormField>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#F9FAFB', borderRadius: 12 }}>
              <input type="checkbox" id="free" checked={form.is_free} onChange={e => setForm(prev => ({ ...prev, is_free: e.target.checked }))} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              <label htmlFor="free" style={{ fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Free event</label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="Start Date & Time">
              <input type="datetime-local" value={form.start_date} onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))} style={inputStyle} />
            </FormField>
            <FormField label="End Date & Time">
              <input type="datetime-local" value={form.end_date} onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))} style={inputStyle} />
            </FormField>
            <FormField label="Venue Name">
              <input type="text" value={form.venue_name} onChange={e => setForm(prev => ({ ...prev, venue_name: e.target.value }))} placeholder="The Grand Plaza" style={inputStyle} />
            </FormField>
            <FormField label="Address">
              <input type="text" value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} placeholder="Full address" style={inputStyle} />
            </FormField>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {form.ticket_tiers.map((tier, idx) => (
              <div key={tier.id} style={{ padding: 14, background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>Tier {idx + 1}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <FormField label="Name">
                    <input type="text" value={tier.name} onChange={e => handleTierChange(idx, 'name', e.target.value)} placeholder="General Admission" style={inputStyle} />
                  </FormField>
                  {!form.is_free && (
                    <FormField label="Price (in cents)">
                      <input type="number" value={tier.price} onChange={e => handleTierChange(idx, 'price', Number(e.target.value))} placeholder="2500" style={inputStyle} />
                    </FormField>
                  )}
                  <FormField label="Capacity">
                    <input type="number" value={tier.capacity} onChange={e => handleTierChange(idx, 'capacity', Number(e.target.value))} placeholder="100" style={inputStyle} />
                  </FormField>
                </div>
              </div>
            ))}
            <button onClick={handleAddTier} style={{ padding: 12, borderRadius: 12, border: '1px dashed #D1D5DB', background: '#fff', color: '#6B7280', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              + Add Tier
            </button>
            <div style={{ padding: 12, background: '#F9FAFB', borderRadius: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>Total Capacity</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{totalCapacity} people</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} style={{ flex: 1, padding: '14px 16px', borderRadius: 14, border: '1px solid #E5E7EB', background: '#F3F4F6', color: '#374151', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} style={{ flex: step > 1 ? 1 : 'none', width: step > 1 ? undefined : '100%', padding: '14px 16px', borderRadius: 14, border: 'none', background: '#111827', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              Continue <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          ) : (
            <button onClick={() => handleSave(false)} disabled={saving} style={{ flex: 1, padding: '14px 16px', borderRadius: 14, border: 'none', background: '#10B981', color: '#fff', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving ? 'Creating...' : 'Create Event'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== EDIT VIEW (reuses Create form) =====
function EditEventView({ event, businessId, onBack, onSuccess }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(event)

  const handleSave = async () => {
    setSaving(true)
    // TODO: Wire Supabase update
    // await supabase.from('events').update(form).eq('id', event.id)
    setSaving(false)
    alert('Event updated!')
    onSuccess()
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 600, color: '#111827' }}>Edit Event</h2>

      <FormField label="Event Name">
        <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} style={inputStyle} />
      </FormField>
      <FormField label="Description">
        <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={4} style={{ ...inputStyle, resize: 'vertical', marginBottom: 16 }} />
      </FormField>
      <FormField label="Venue Name">
        <input type="text" value={form.venue_name} onChange={e => setForm(prev => ({ ...prev, venue_name: e.target.value }))} style={inputStyle} />
      </FormField>

      <div style={{ display: 'flex', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
        <button onClick={onBack} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#10B981', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ===== ATTENDEE LIST =====
function AttendeeListView({ event, onBack, businessId }) {
  const [attendees, setAttendees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Wire Supabase query
    // const fetchAttendees = async () => {
    //   const { data } = await supabase
    //     .from('event_orders')
    //     .select('id, customer_name, customer_email, customer_phone, tier_name, quantity, status, created_at')
    //     .eq('event_id', event.id)
    //     .order('created_at', { ascending: false })
    //   setAttendees(data || [])
    //   setLoading(false)
    // }
    // fetchAttendees()

    // Mock data
    setAttendees([
      { id: 'o1', customer_name: 'John Smith', customer_email: 'john@example.com', customer_phone: '555-1234', tier_name: 'VIP', quantity: 2, status: 'paid', created_at: new Date().toISOString() },
      { id: 'o2', customer_name: 'Jane Doe', customer_email: 'jane@example.com', customer_phone: '555-5678', tier_name: 'General', quantity: 1, status: 'paid', created_at: new Date().toISOString() },
    ])
    setLoading(false)
  }, [event.id])

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 600, color: '#111827' }}>Attendees</h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B7280' }}>{attendees.length} total</p>

      {loading ? (
        <p style={{ color: '#9CA3AF' }}>Loading...</p>
      ) : attendees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
          <Users size={32} style={{ margin: '0 auto 12px' }} />
          <p>No attendees yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {attendees.map(att => (
            <div key={att.id} style={{ padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{att.customer_name}</h4>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B7280' }}>{att.customer_email}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, background: '#DCFCE7', color: '#16A34A', padding: '4px 8px', borderRadius: 6 }}>
                  {att.tier_name}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280' }}>
                <span>{att.quantity}x ticket{att.quantity > 1 ? 's' : ''}</span>
                <span>{new Date(att.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== CHECKIN VIEW =====
function CheckinView({ event, onBack, businessId }) {
  const [checked, setChecked] = useState([])
  const [qrInput, setQrInput] = useState('')

  const handleQrScan = (ticketId) => {
    // TODO: Validate ticket QR and mark as checked in
    // Wire to event_checkins table
    if (!checked.includes(ticketId)) {
      setChecked(prev => [...prev, ticketId])
      alert('✓ Checked in!')
    } else {
      alert('Already checked in')
    }
    setQrInput('')
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ArrowLeft size={18} /> Back
      </button>
      <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 600, color: '#111827' }}>Check-in: {event.name}</h2>

      <div style={{ padding: 16, background: '#F0FDF4', borderRadius: 12, marginBottom: 20, border: '1px solid #BBF7D0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#16A34A', fontWeight: 600 }}>
          <Check size={16} /> {checked.length} checked in
        </div>
      </div>

      <FormField label="Scan QR Code">
        <input
          type="text"
          value={qrInput}
          onChange={e => setQrInput(e.target.value)}
          onKeyPress={e => {
            if (e.key === 'Enter') handleQrScan(qrInput)
          }}
          placeholder="Scan ticket QR code..."
          style={{ ...inputStyle, fontSize: 16 }}
          autoFocus
        />
      </FormField>

      <div style={{ padding: 12, background: '#FEF3C7', borderRadius: 12, border: '1px solid #FCD34D', fontSize: 12, color: '#92400E', marginTop: 16 }}>
        Point camera at QR code or paste scanned value above
      </div>
    </div>
  )
}

// ===== STAT CARD =====
function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{ padding: 16, background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: color + '15', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{value}</div>
      </div>
    </div>
  )
}

// ===== FORM FIELD =====
function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  border: '1px solid #E5E7EB', fontSize: 14,
  fontWeight: 500, color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box'
}
