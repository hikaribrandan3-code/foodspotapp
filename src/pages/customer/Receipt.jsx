import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { CheckCircle, Truck, Clock, Home, MapPin, CreditCard, Banknote, AlertCircle, Loader2, Package } from 'lucide-react'
import CameraTrigger from '../../components/Camera/CameraTrigger'

export default function Receipt() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { tenantSlug } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // A/B test variant assignment for camera activation delay (45s, 60s, or 90s for delivery, 2s for dine-in)
  const delayVariant = useMemo(() => {
    const variants = [45000, 60000, 90000];
    return variants[Math.floor(Math.random() * variants.length)];
  }, [])

  const dineinDelayVariant = 2000 // Show banner immediately when food served (2s)

  const orderId = searchParams.get('order_id') || searchParams.get('orderId')

  useEffect(() => {
    if (!orderId) { setError('No order ID'); setLoading(false); return }

    async function fetchOrder() {
      try {
        const { data, error: e } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (e) {
          console.error('[Receipt] Order lookup error:', e)
          if (e.code === 'PGRST116') {
            setError('Order not found or access denied')
          } else {
            setError('Unable to load order. Please try again.')
          }
        } else if (!data) {
          setError('Order not found')
        } else {
          setOrder(data)
        }
      } catch (err) {
        console.error('[Receipt] Unexpected error fetching order:', err)
        setError('Connection error. Please check your network and try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  const calculateETA = () => {
    if (!order?.distance_km) return '30-45 min'
    const mins = Math.round(order.distance_km * 5)
    const eta = new Date(Date.now() + mins * 60000)
    return `${mins} min (${eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
  }

  const isCash = order?.payment_method === 'cash'
  const isMp = order?.payment_method === 'mercado_pago'
  const isDelivered = order?.status === 'delivered'
  const isDeliveredCash = isDelivered && isCash
  const isPaid = order?.status === 'paid' || order?.status === 'paid_unreleased' || isDelivered
  const isPending = order?.status === 'pending' || order?.status === 'pending_payment'
  const paymentFailed = !isPaid && !isPending && !isCash && !isDelivered

  // Use actual order type from database, fallback to inferring from delivery address
  const orderType = order?.order_type || (!order?.delivery_address ? 'takeout' : 'delivery')
  // Flat 1s delay for all order types — banner appears 1s after delivery
  const finalDelayVariant = 1000

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ textAlign: 'center', color: '#6B7280' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14 }}>Loading receipt...</p>
      </div>
    </div>
  )

  if (error || !order) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#EF4444', margin: '0 auto 16px' }} />
        <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Receipt Error</h2>
        <p style={{ color: '#6B7280', marginBottom: 24 }}>{error || 'Order not found'}</p>
        <button onClick={() => navigate(`/${tenantSlug}`)}
          style={{ width: '100%', padding: '12px', background: '#111827', color: '#fff', borderRadius: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          Back to Home
        </button>
      </div>
    </div>
  )

  return (
    <CameraTrigger orderId={order.id} orderType={orderType} delayMs={finalDelayVariant}>
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '0px 16px' }}>
        <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Header */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: paymentFailed ? '#FEE2E2' : isPaid ? '#D1FAE5' : '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              {paymentFailed ? <AlertCircle size={32} style={{ color: '#EF4444' }} /> : isPaid ? <CheckCircle size={32} style={{ color: '#10B981' }} /> : <Clock size={32} style={{ color: '#F97316' }} />}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {isDelivered ? 'Pedido entregado ✓' : paymentFailed ? 'Pago fallido' : isPaid ? 'Order Confirmed!' : 'Confirmando pago...'}
            </h1>
            <p style={{ color: '#6B7280', fontSize: 14 }}>
              #{order.order_number ? String(order.order_number).padStart(3, '0') : order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          {/* Payment Status */}
          <div style={{ background: isDeliveredCash ? '#D1FAE5' : isCash ? '#FFFBEB' : paymentFailed ? '#FEF2F2' : isPaid ? '#EFF6FF' : '#FFF7ED', borderRadius: 16, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {isDeliveredCash ? <CheckCircle size={20} style={{ color: '#10B981', marginTop: 2, flexShrink: 0 }} /> : isCash ? <Banknote size={20} style={{ color: '#D97706', marginTop: 2, flexShrink: 0 }} /> : paymentFailed ? <AlertCircle size={20} style={{ color: '#DC2626', marginTop: 2, flexShrink: 0 }} /> : isPaid ? <CreditCard size={20} style={{ color: '#2563EB', marginTop: 2, flexShrink: 0 }} /> : <Clock size={20} style={{ color: '#F97316', marginTop: 2, flexShrink: 0 }} />}
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, color: isDeliveredCash ? '#10B981' : isCash ? '#D97706' : paymentFailed ? '#DC2626' : isPaid ? '#2563EB' : '#F97316' }}>
                {isDeliveredCash ? 'Pagado ✓' : isCash ? 'Efectivo en la puerta' : paymentFailed ? 'Pago fallido — Mercado Pago' : isPaid ? 'Pago confirmado — Mercado Pago' : 'Pago pendiente — Confirmando...'}
              </p>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                {isDeliveredCash ? 'Pago en efectivo confirmado' : isCash ? 'Tendrás que pagar cuando llegue tu pedido' : paymentFailed ? 'Tu pago no se procesó. Intenta con otro método.' : isPaid ? 'Tu pago fue procesado correctamente' : 'Estamos confirmando tu pago con Mercado Pago. Esto puede tomar unos segundos.'}
              </p>
            </div>
          </div>

          {/* ETA */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Clock size={20} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>Tiempo estimado de entrega</p>
              <p style={{ fontSize: 14, color: '#6B7280' }}>{calculateETA()}</p>
            </div>
          </div>

          {/* Delivery Address */}
          {order.delivery_address && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <MapPin size={20} style={{ color: '#9CA3AF', marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>Dirección de entrega</p>
                <p style={{ fontSize: 14, color: '#6B7280' }}>
                  {typeof order.delivery_address === 'string'
                    ? order.delivery_address
                    : `${order.delivery_address.street || ''} ${order.delivery_address.number || ''}`}
                </p>
                {order.distance_km && <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{Number(order.distance_km).toFixed(1)} km</p>}
              </div>
            </div>
          )}

          {/* Items */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <Package size={18} style={{ color: '#9CA3AF' }} />
              <h2 style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>Tu pedido</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {order.items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#F3F4F6', fontSize: 12, fontWeight: 500, color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.quantity}
                    </span>
                    <span style={{ fontSize: 14, color: '#374151' }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>
                    ${((item.price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #F3F4F6', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#111827' }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>${Number(order.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
            <button
              onClick={() => navigate(`/${tenantSlug}/track?order_id=${order.id}`)}
              style={{ width: '100%', padding: '14px', background: '#10B981', color: '#fff', borderRadius: 14, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15 }}
            >
              <Truck size={18} />
              Seguir mi pedido
            </button>
            <button
              onClick={() => navigate(`/${tenantSlug}`)}
              style={{ width: '100%', padding: '12px', background: '#F3F4F6', color: '#374151', borderRadius: 14, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Home size={18} />
              Volver al inicio
            </button>
          </div>

        </div>
      </div>
    </CameraTrigger>
  )
}
