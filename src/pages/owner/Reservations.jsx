import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, Clock, Users, Phone, MessageSquare, Check, X, RefreshCw, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import BackendNav from '../../components/BackendNav.jsx'

const STATUS_COLORS = {
  pending:   { bg: '#FEF3C7', text: '#92400E', label: 'Pendiente' },
  approved:  { bg: '#D1FAE5', text: '#065F46', label: 'Aprobada' },
  rejected:  { bg: '#FEE2E2', text: '#991B1B', label: 'Rechazada' },
  no_show:   { bg: '#F3F4F6', text: '#6B7280', label: 'No se presentó' },
  completed: { bg: '#EDE9FE', text: '#5B21B6', label: 'Completada' },
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === tomorrow.toDateString()) return 'Mañana'
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatTime(t) { return t?.slice(0, 5) || '' }

export function ReservationsContent() {
  const { businessId } = useTenant()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [actioning, setActioning] = useState(null)

  const fetchReservations = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('business_id', businessId)
        .order('reservation_date', { ascending: true })
        .order('reservation_time', { ascending: true })
      if (!error && data) setReservations(data)
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { fetchReservations() }, [fetchReservations])

  // Realtime
  useEffect(() => {
    if (!businessId) return
    const channel = supabase
      .channel(`owner-reservations-${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations', filter: `business_id=eq.${businessId}` },
        () => fetchReservations())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [businessId, fetchReservations])

  const updateStatus = async (id, status) => {
    setActioning(id + status)
    try {
      await supabase
        .from('reservations')
        .update({ status, approved_at: status === 'approved' ? new Date().toISOString() : null })
        .eq('id', id)
        .eq('business_id', businessId)
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    } finally {
      setActioning(null)
    }
  }

  const filtered = reservations.filter(r => {
    if (filter === 'pending') return r.status === 'pending'
    if (filter === 'approved') return r.status === 'approved'
    if (filter === 'rejected') return r.status === 'rejected'
    return true
  })

  const pendingCount = reservations.filter(r => r.status === 'pending').length

  return (
    <div>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '20px 20px 0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Reservas</h1>
              {pendingCount > 0 && (
                <p style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600, margin: '2px 0 0' }}>
                  {pendingCount} pendiente{pendingCount > 1 ? 's' : ''} esperando confirmación
                </p>
              )}
            </div>
            <button onClick={fetchReservations}
              style={{ width: 36, height: 36, borderRadius: 20, border: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <RefreshCw size={15} color="#6B7280" />
            </button>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 0 }}>
            {[
              { id: 'pending', label: `Pendientes${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
              { id: 'approved', label: 'Aprobadas' },
              { id: 'rejected', label: 'Rechazadas' },
              { id: 'all', label: 'Todas' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: '8px 16px', borderRadius: 20, border: 'none', whiteSpace: 'nowrap',
                  background: filter === f.id ? '#111827' : 'transparent',
                  color: filter === f.id ? '#fff' : '#6B7280',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  borderBottom: filter === f.id ? '2px solid #111827' : '2px solid transparent',
                  transition: 'all 0.15s'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ maxWidth: 800, margin: '24px auto', padding: '0 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #10B981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <CalendarDays size={40} color="#D1D5DB" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#9CA3AF', fontSize: 15 }}>Sin reservas</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(r => {
              const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending
              const isPending = r.status === 'pending'
              return (
                <div key={r.id} style={{
                  background: '#fff', borderRadius: 16, padding: 20,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  border: isPending ? '2px solid #FCD34D' : '1px solid #E5E7EB'
                }}>
                  {/* Top: date/time + status badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CalendarDays size={15} color="#6B7280" />
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{formatDate(r.reservation_date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={14} color="#9CA3AF" />
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{formatTime(r.reservation_time)}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: sc.bg, color: sc.text }}>
                      {sc.label}
                    </span>
                  </div>

                  {/* Customer + party size */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{r.customer_name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Users size={14} color="#6B7280" />
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{r.party_size} personas</span>
                    </div>
                  </div>

                  {/* Phone */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: r.notes ? 8 : 0 }}>
                    <Phone size={13} color="#9CA3AF" />
                    <a href={`tel:${r.customer_phone}`} style={{ fontSize: 14, fontWeight: 600, color: '#3B82F6', textDecoration: 'none' }}>
                      {r.customer_phone}
                    </a>
                  </div>

                  {/* Notes */}
                  {r.notes && (
                    <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#F9FAFB', borderRadius: 10, marginTop: 8 }}>
                      <MessageSquare size={13} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
                      <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{r.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {isPending && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button
                        onClick={() => updateStatus(r.id, 'rejected')}
                        disabled={!!actioning}
                        style={{ flex: 1, padding: '10px 0', borderRadius: 20, border: 'none', background: '#FEE2E2', color: '#DC2626', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <X size={15} /> Rechazar
                      </button>
                      <button
                        onClick={() => updateStatus(r.id, 'approved')}
                        disabled={!!actioning}
                        style={{ flex: 2, padding: '10px 0', borderRadius: 20, border: 'none', background: '#D1FAE5', color: '#065F46', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Check size={15} /> {actioning === r.id + 'approved' ? 'Aprobando...' : 'Aprobar'}
                      </button>
                    </div>
                  )}

                  {r.status === 'approved' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={() => updateStatus(r.id, 'no_show')} disabled={!!actioning}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 20, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                        No se presentó
                      </button>
                      <button onClick={() => updateStatus(r.id, 'completed')} disabled={!!actioning}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 20, border: 'none', background: '#EDE9FE', color: '#5B21B6', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        ✓ Se presentó
                      </button>
                    </div>
                  )}

                  {/* Created at */}
                  <p style={{ fontSize: 11, color: '#D1D5DB', margin: '10px 0 0', textAlign: 'right' }}>
                    Solicitada {new Date(r.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

export default function Reservations() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', paddingBottom: 100 }}>
      <ReservationsContent />
      <BackendNav useRoutes={true} role="owner" />
    </div>
  )
}
