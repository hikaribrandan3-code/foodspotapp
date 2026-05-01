import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle, Truck, Clock, MapPin, ChefHat, Package, Phone, Navigation, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient.js'

const STATUS_STEPS = [
  { key: 'released_to_kitchen', label: 'En cocina', icon: ChefHat },
  { key: 'preparing',           label: 'Preparando', icon: Package },
  { key: 'ready',               label: 'Listo',      icon: CheckCircle },
  { key: 'dispatched',          label: 'Despachado', icon: Truck },
  { key: 'on_way',              label: 'En camino',  icon: Navigation },
  { key: 'delivered',           label: 'Entregado',  icon: CheckCircle },
]

const SIMULATED_DRIVERS = [
  { name: 'Carlos M.', vehicle: 'Honda Wave 110', phone: '11-3456-7890' },
  { name: 'Laura R.',  vehicle: 'Yamaha FZ',      phone: '11-4567-8901' },
  { name: 'Diego S.',  vehicle: 'Bajaj Boxer',    phone: '11-5678-9012' },
]

export default function DeliveryTracker() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { tenantSlug } = useParams()
  const orderId = searchParams.get('order_id') || searchParams.get('orderId')

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [etaText, setEtaText] = useState('Calculando...')
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const channelRef = useRef(null)

  const driver = SIMULATED_DRIVERS[(orderId?.length || 0) % SIMULATED_DRIVERS.length]

  const updateEta = (o) => {
    if (!o) return
    const distKm = o.distance_km || 5
    const etaMs = distKm * 5 * 60 * 1000
    if (o.status === 'delivered') { setEtaText('Entregado ✓'); return }
    if (o.status === 'on_way') {
      const elapsed = Date.now() - new Date(o.updated_at || Date.now()).getTime()
      const remaining = Math.max(0, Math.ceil((etaMs - elapsed) / 60000))
      setEtaText(`Tu repartidor llega en ~${remaining} min`)
      return
    }
    const eta = new Date(Date.now() + etaMs)
    setEtaText(`Llegada estimada: ${eta.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`)
  }

  useEffect(() => {
    if (!orderId) { setError('No order ID'); setLoading(false); return }

    supabase.from('orders').select('*').eq('id', orderId).single()
      .then(({ data, error: e }) => {
        if (e || !data) { setError('Pedido no encontrado'); setLoading(false); return }
        setOrder(data); updateEta(data); setLoading(false)
      })

    const channel = supabase
      .channel(`tracker-${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          setOrder(payload.new)
          setLastUpdated(new Date())
          updateEta(payload.new)
        })
      .subscribe()

    channelRef.current = channel
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [orderId])

  const getStepState = (stepKey) => {
    if (!order) return 'future'
    const currentIdx = STATUS_STEPS.findIndex(s => s.key === order.status)
    const stepIdx = STATUS_STEPS.findIndex(s => s.key === stepKey)
    if (stepIdx < currentIdx) return 'completed'
    if (stepIdx === currentIdx) return 'current'
    return 'future'
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center', color: '#6B7280' }}>
        <Loader2 size={32} style={{ margin: '0 auto 12px' }} />
        <p>Cargando seguimiento...</p>
      </div>
    </div>
  )

  if (error || !order) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#EF4444', margin: '0 auto 16px' }} />
        <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Pedido no encontrado</h2>
        <p style={{ color: '#6B7280', marginBottom: 24 }}>{error}</p>
        <button onClick={() => navigate(`/${tenantSlug}`)}
          style={{ width: '100%', padding: 12, background: '#111827', color: '#fff', borderRadius: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          Volver al inicio
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Header */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700 }}>
              Pedido #{order.order_number ? String(order.order_number).padStart(3, '0') : order.id.slice(0, 8).toUpperCase()}
            </h1>
            <span style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff',
              background: order.status === 'delivered' ? '#10B981' : order.status === 'on_way' ? '#6366F1' : '#3B82F6'
            }}>
              {STATUS_STEPS.find(s => s.key === order.status)?.label || order.status}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#6B7280', fontSize: 13 }}>
            <Clock size={14} />
            <span>{etaText}</span>
          </div>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            Actualizado: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        {/* Timeline */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Progreso del pedido</h2>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 19, top: 8, bottom: 8, width: 2, background: '#E5E7EB' }} />
            {STATUS_STEPS.map((step) => {
              const state = getStepState(step.key)
              const Icon = step.icon
              return (
                <div key={step.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', position: 'relative' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1, flexShrink: 0, border: '2px solid',
                    borderColor: state === 'future' ? '#D1D5DB' : '#10B981',
                    background: state === 'completed' ? '#10B981' : '#fff',
                    color: state === 'completed' ? '#fff' : state === 'current' ? '#10B981' : '#9CA3AF',
                  }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ paddingTop: 8 }}>
                    <p style={{ fontWeight: 500, fontSize: 14, color: state === 'future' ? '#9CA3AF' : '#111827' }}>{step.label}</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {state === 'completed' ? 'Completado' : state === 'current' ? 'En progreso...' : 'Pendiente'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Map Placeholder */}
        {(order.status === 'on_way' || order.status === 'dispatched') && (
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 8, alignItems: 'center' }}>
              <MapPin size={16} style={{ color: '#EF4444' }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Ubicación en vivo</span>
            </div>
            {/* Mapbox GL: swap this div for a map when Mapbox token is available */}
            <div style={{ height: 200, background: '#E5E7EB', position: 'relative', overflow: 'hidden' }}>
              <svg width="100%" height="100%" style={{ opacity: 0.3, position: 'absolute', inset: 0 }}>
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94A3B8" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
              <div style={{ position: 'absolute', top: '35%', left: '55%', transform: 'translate(-50%,-50%)' }}>
                <MapPin size={32} style={{ color: '#EF4444' }} />
                <p style={{ fontSize: 11, background: 'rgba(255,255,255,0.85)', padding: '2px 6px', borderRadius: 6, textAlign: 'center', marginTop: 2 }}>Tu dirección</p>
              </div>
              <div style={{ position: 'absolute', top: '65%', left: '25%' }}>
                <div style={{ width: 14, height: 14, background: '#10B981', borderRadius: '50%', animation: 'ping 1s infinite' }} />
                <p style={{ fontSize: 11, background: 'rgba(255,255,255,0.85)', padding: '2px 6px', borderRadius: 6, marginTop: 2 }}>Repartidor</p>
              </div>
            </div>
          </div>
        )}

        {/* Driver Card */}
        {order.status === 'on_way' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>Tu repartidor</h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🛵</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600 }}>{driver.name}</p>
                <p style={{ fontSize: 13, color: '#6B7280' }}>{driver.vehicle}</p>
              </div>
              <button
                onClick={() => window.open(`tel:${driver.phone}`, '_self')}
                style={{ padding: 10, background: '#D1FAE5', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex' }}
              >
                <Phone size={18} style={{ color: '#059669' }} />
              </button>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>Resumen del pedido</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: '#6B7280' }}>{item.name} x{item.quantity}</span>
                <span style={{ fontWeight: 500 }}>${((item.price || 0) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #F3F4F6', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>${Number(order.total).toFixed(2)}</span>
          </div>
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#6B7280' }}>Pago</span>
            <span style={{ fontWeight: 500 }}>
              {order.payment_method === 'mercado_pago' ? 'Mercado Pago' : 'Efectivo en la puerta'}
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate(`/${tenantSlug}`)}
          style={{ width: '100%', padding: '14px', background: '#111827', color: '#fff', borderRadius: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
