import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { Calendar, MapPin, Users, DollarSign, Ticket, Plus, ArrowLeft, Edit, QrCode, ChevronRight, Clock, Tag } from 'lucide-react'

export default function OwnerEventsView({ businessId, tenantSlug, lang, onBack }) {
  const [view, setView] = useState('list') // list | create | detail
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [dateRange, setDateRange] = useState('all')

  // Fetch events
  useEffect(() => {
    if (!businessId) return
    fetchEvents()
  }, [businessId])

  const fetchEvents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('business_id', businessId)
      .order('start_date', { ascending: false })

    if (!error && data) {
      setEvents(data)
    }
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

  if (view === 'create') {
    return <CreateEventView businessId={businessId} lang={lang} onBack={() => setView('list')} onSuccess={handleCreateSuccess} />
  }

  if (view === 'detail' && selectedEvent) {
    return <EventDetailView event={selectedEvent} lang={lang} onBack={() => setView('list')} />
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Events</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Manage your events and track performance</p>
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
          <Plus size={16} /> Create Event
        </button>
      </div>

      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Revenue" value={`$${events.reduce((sum, e) => sum + (e.total_revenue || 0), 0).toLocaleString()}`} color="#10B981" icon={DollarSign} />
        <StatCard label="Tickets Sold" value={events.reduce((sum, e) => sum + (e.tickets_sold || 0), 0).toString()} color="#3B82F6" icon={Ticket} />
        <StatCard label="Active Events" value={events.filter(e => e.status === 'live').length.toString()} color="#8B5CF6" icon={Calendar} />
        <StatCard label="Avg Check-ins" value={`${events.length > 0 ? Math.round(events.reduce((sum, e) => sum + (e.checkins || 0), 0) / events.length) : 0}%`} color="#F59E0B" icon={Users} />
      </div>

      {/* Events List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <p>Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#111827' }}>No events yet</h3>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6B7280' }}>Create your first event to start selling tickets</p>
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

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{
      padding: 16, background: '#fff', borderRadius: 16,
      border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: color + '15', color: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{value}</div>
      </div>
    </div>
  )
}

function EventListCard({ event, onClick }) {
  const isLive = event.status === 'live'
  const eventDate = new Date(event.start_date)
  const now = new Date()
  const isPast = eventDate < now

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB',
        overflow: 'hidden', cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', padding: 16, gap: 16 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 12,
          background: event.image_url ? `url(${event.image_url}) center/cover` : '#F3F4F6',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {!event.image_url && <Calendar size={24} color="#9CA3AF" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {event.name}
            </h3>
            {isLive && (
              <span style={{
                background: '#DCFCE7', color: '#16A34A',
                fontSize: 10, fontWeight: 700, padding: '2px 8px',
                borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em',
                flexShrink: 0
              }}>
                Live
              </span>
            )}
            {isPast && (
              <span style={{
                background: '#F3F4F6', color: '#6B7280',
                fontSize: 10, fontWeight: 700, padding: '2px 8px',
                borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em',
                flexShrink: 0
              }}>
                Past
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} /> {eventDate.toLocaleDateString()}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} /> {event.venue_name}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: '#111827' }}>
              ${(event.total_revenue || 0).toLocaleString()}
              <span style={{ fontWeight: 400, color: '#6B7280', fontSize: 11 }}> revenue</span>
            </span>
            <span style={{ fontWeight: 700, color: '#111827' }}>
              {event.tickets_sold || 0}/{event.total_capacity || 0}
              <span style={{ fontWeight: 400, color: '#6B7280', fontSize: 11 }}> sold</span>
            </span>
          </div>
        </div>
        <ChevronRight size={20} color="#9CA3AF" style={{ flexShrink: 0, alignSelf: 'center' }} />
      </div>
    </div>
  )
}

function EventDetailView({ event, lang, onBack }) {
  const tiers = event.ticket_tiers || []
  const totalCapacity = tiers.reduce((sum, t) => sum + (t.capacity || 0), 0)
  const totalSold = tiers.reduce((sum, t) => sum + ((t.capacity || 0) - (t.remaining || 0)), 0)

  return (
    <div>
      {/* Back + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: '#6B7280',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0
          }}
        >
          <ArrowLeft size={18} /> Back to Events
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#F3F4F6', border: 'none', color: '#374151',
            padding: '8px 14px', borderRadius: 10, fontSize: 13,
            fontWeight: 600, cursor: 'pointer'
          }}>
            <Edit size={14} /> Edit
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#10B981', border: 'none', color: '#fff',
            padding: '8px 14px', borderRadius: 10, fontSize: 13,
            fontWeight: 600, cursor: 'pointer'
          }}>
            <QrCode size={14} /> Scan Tickets
          </button>
        </div>
      </div>

      {/* Event Image */}
      <div style={{
        width: '100%', height: 200, borderRadius: 16,
        background: event.image_url ? `url(${event.image_url}) center/cover` : '#F3F4F6',
        marginBottom: 20,
        display: 'flex', alignItems: 'flex-end', padding: 16,
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)',
          borderRadius: 16
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#fff' }}>{event.name}</h2>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={14} /> {new Date(event.start_date).toLocaleDateString()}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={14} /> {event.venue_name}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: 16, background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Total Revenue</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>${(event.total_revenue || 0).toLocaleString()}</div>
          <div style={{ fontSize: 12, color: '#10B981', fontWeight: 600, marginTop: 4 }}>+12% vs last</div>
        </div>
        <div style={{ padding: 16, background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Tickets Sold</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>{totalSold} <span style={{ fontSize: 14, color: '#6B7280', fontWeight: 400 }}>/ {totalCapacity}</span></div>
        </div>
        <div style={{ padding: 16, background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Check-ins</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>{event.checkins || 0}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{event.checkins && totalSold > 0 ? Math.round((event.checkins / totalSold) * 100) : 0}% arrival rate</div>
        </div>
        <div style={{ padding: 16, background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Rev / Ticket</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>${totalSold > 0 ? Math.round((event.total_revenue || 0) / totalSold) : 0}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Average yield</div>
        </div>
      </div>

      {/* Ticket Tiers Performance */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#111827' }}>Ticket Tiers Performance</h3>
        {tiers.length === 0 ? (
          <p style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: 20 }}>No ticket tiers defined</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tiers.map(tier => {
              const sold = (tier.capacity || 0) - (tier.remaining || 0)
              const percentage = tier.capacity > 0 ? (sold / tier.capacity) * 100 : 0
              const isSoldOut = tier.remaining === 0
              return (
                <div key={tier.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{tier.name}</span>
                      {isSoldOut && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: 20 }}>Sold Out</span>
                      )}
                    </div>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>
                      {sold} / {tier.capacity} sold
                      <span style={{ fontWeight: 700, color: '#111827', marginLeft: 8 }}>${tier.price}</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${percentage}%`, height: '100%',
                      background: isSoldOut ? '#DC2626' : '#10B981',
                      borderRadius: 4,
                      transition: 'width 0.3s'
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function CreateEventView({ businessId, lang, onBack, onSuccess }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'food',
    venue_name: '',
    address: '',
    start_date: '',
    end_date: '',
    is_free: false,
    ticket_tiers: [{ id: '1', name: 'General Admission', price: 0, capacity: 100, remaining: 100, description: '' }]
  })
  const [saving, setSaving] = useState(false)

  const categories = [
    { id: 'food', label: 'Food', icon: '🍔' },
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'art', label: 'Art', icon: '🎨' },
    { id: 'classes', label: 'Classes', icon: '📚' },
    { id: 'drinks', label: 'Drinks', icon: '🍹' },
  ]

  const handleAddTier = () => {
    setForm(prev => ({
      ...prev,
      ticket_tiers: [...prev.ticket_tiers, {
        id: String(prev.ticket_tiers.length + 1),
        name: '', price: 0, capacity: 100, remaining: 100, description: ''
      }]
    }))
  }

  const handleTierChange = (index, field, value) => {
    setForm(prev => {
      const tiers = [...prev.ticket_tiers]
      tiers[index] = { ...tiers[index], [field]: value }
      if (field === 'capacity') tiers[index].remaining = value
      return { ...prev, ticket_tiers: tiers }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('events').insert([{
      business_id: businessId,
      name: form.name,
      description: form.description,
      category: form.category,
      venue_name: form.venue_name,
      address: form.address,
      start_date: form.start_date,
      end_date: form.end_date,
      is_free: form.is_free,
      ticket_tiers: form.ticket_tiers,
      status: 'draft',
      total_capacity: form.ticket_tiers.reduce((sum, t) => sum + Number(t.capacity), 0),
      tickets_sold: 0,
      total_revenue: 0,
      checkins: 0
    }])
    setSaving(false)
    if (!error) onSuccess()
  }

  const totalCapacity = form.ticket_tiers.reduce((sum, t) => sum + Number(t.capacity), 0)

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
          <ArrowLeft size={18} /> Back
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: 32, height: 4, borderRadius: 2,
              background: s <= step ? '#10B981' : '#E5E7EB'
            }} />
          ))}
        </div>
      </div>

      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#111827' }}>
        {step === 1 && 'Create Event'}
        {step === 2 && 'Date & Venue'}
        {step === 3 && 'Ticket Tiers'}
      </h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B7280' }}>
        Step {step} of 3
      </p>

      {/* Step 1: Essentials */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormField label="Event Name">
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Summer Night Market"
              style={inputStyle}
            />
          </FormField>

          <FormField label="Description">
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what makes your event special..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </FormField>

          <FormField label="Categories">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setForm(prev => ({ ...prev, category: cat.id }))}
                  style={{
                    padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    border: '1px solid',
                    cursor: 'pointer',
                    background: form.category === cat.id ? '#10B981' : '#fff',
                    color: form.category === cat.id ? '#fff' : '#374151',
                    borderColor: form.category === cat.id ? '#10B981' : '#E5E7EB'
                  }}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </FormField>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#F9FAFB', borderRadius: 12 }}>
            <input
              type="checkbox"
              id="is_free"
              checked={form.is_free}
              onChange={e => setForm(prev => ({ ...prev, is_free: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: '#10B981' }}
            />
            <label htmlFor="is_free" style={{ fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
              This is a free event
            </label>
          </div>
        </div>
      )}

      {/* Step 2: Date & Venue */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormField label="Start Date & Time">
            <input
              type="datetime-local"
              value={form.start_date}
              onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))}
              style={inputStyle}
            />
          </FormField>

          <FormField label="End Date & Time">
            <input
              type="datetime-local"
              value={form.end_date}
              onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))}
              style={inputStyle}
            />
          </FormField>

          <FormField label="Venue Name">
            <input
              type="text"
              value={form.venue_name}
              onChange={e => setForm(prev => ({ ...prev, venue_name: e.target.value }))}
              placeholder="e.g., The Grand Plaza"
              style={inputStyle}
            />
          </FormField>

          <FormField label="Address">
            <input
              type="text"
              value={form.address}
              onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Full address for maps"
              style={inputStyle}
            />
          </FormField>
        </div>
      )}

      {/* Step 3: Ticket Tiers */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {form.is_free && (
            <div style={{ padding: 12, background: '#F0FDF4', borderRadius: 12, border: '1px solid #BBF7D0' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#16A34A', fontWeight: 600 }}>
                Free Event — Disable paid tickets for this event
              </p>
            </div>
          )}

          {form.ticket_tiers.map((tier, index) => (
            <div key={tier.id} style={{ padding: 16, background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Tier {index + 1}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <FormField label="Tier Name">
                  <input
                    type="text"
                    value={tier.name}
                    onChange={e => handleTierChange(index, 'name', e.target.value)}
                    placeholder="e.g., General Admission"
                    style={inputStyle}
                  />
                </FormField>
                {!form.is_free && (
                  <FormField label="Price ($)">
                    <input
                      type="number"
                      value={tier.price}
                      onChange={e => handleTierChange(index, 'price', Number(e.target.value))}
                      placeholder="0.00"
                      style={inputStyle}
                    />
                  </FormField>
                )}
                <FormField label="Capacity">
                  <input
                    type="number"
                    value={tier.capacity}
                    onChange={e => handleTierChange(index, 'capacity', Number(e.target.value))}
                    placeholder="100"
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Description (Optional)">
                  <input
                    type="text"
                    value={tier.description}
                    onChange={e => handleTierChange(index, 'description', e.target.value)}
                    placeholder="Includes one free drink..."
                    style={inputStyle}
                  />
                </FormField>
              </div>
            </div>
          ))}

          <button
            onClick={handleAddTier}
            style={{
              width: '100%', padding: 12, borderRadius: 12,
              border: '1px dashed #D1D5DB', background: '#fff',
              color: '#6B7280', fontSize: 14, fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Add Ticket Tier
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16, background: '#F9FAFB', borderRadius: 12 }}>
            <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>Total Capacity</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{totalCapacity} Attendees</span>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              border: '1px solid #E5E7EB', background: '#fff',
              color: '#374151', fontSize: 14, fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        )}
        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              border: 'none', background: '#111827',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              border: 'none', background: '#10B981',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Saving...' : 'Create Event'}
          </button>
        )}
      </div>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #E5E7EB',
  fontSize: 14,
  fontWeight: 500,
  color: '#111827',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box'
}
