import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { translations } from '../../utils/translations.js'
import { CheckCircle, Truck, Clock, Home, MapPin, CreditCard, Banknote, AlertCircle, Loader2, Package } from 'lucide-react'
import CameraTrigger from '../../components/Camera/CameraTrigger'

export default function Receipt() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { tenantSlug } = useParams()
  const { language } = useLanguage()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const t = (key) => translations[key]?.[language] || translations[key]?.en || key

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

    // Realtime subscription to update order status after delivery
    const channel = supabase
      .channel(`receipt-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          setOrder(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId])

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
        <p style={{ fontSize: 14 }}>{t('loading_receipt')}</p>
      </div>
    </div>
  )

  if (error || !order) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#EF4444', margin: '0 auto 16px' }} />
        <h2 style={{ fontWeight: 700, marginBottom: 8 }}>{t('receipt_error')}</h2>
        <p style={{ color: '#6B7280', marginBottom: 24 }}>{error || t('order_not_found')}</p>
        <button onClick={() => navigate(`/${tenantSlug}`)}
          style={{ width: '100%', padding: '12px', background: '#111827', color: '#fff', borderRadius: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          {t('back_to_home')}
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
              {isDelivered ? t('order_delivered') : paymentFailed ? t('payment_failed') : isPaid ? t('order_confirmed') : t('confirming_payment')}
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
                {isDeliveredCash ? t('paid_confirmed') : isCash ? t('cash_at_door') : paymentFailed ? t('payment_failed_mercado') : isPaid ? t('payment_confirmed_mercado') : t('payment_pending_confirming')}
              </p>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                {isDeliveredCash ? t('cash_payment_confirmed') : isCash ? t('pay_on_arrival') : paymentFailed ? t('payment_not_processed') : isPaid ? t('payment_processed_ok') : t('confirming_with_mp')}
              </p>
            </div>
          </div>

          {/* Delivery Address (no mapbox) */}
          {order.delivery_address && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <MapPin size={20} style={{ color: '#9CA3AF', marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{t('delivery_address_label')}</p>
                <p style={{ fontSize: 14, color: '#6B7280' }}>
                  {typeof order.delivery_address === 'string'
                    ? order.delivery_address
                    : `${order.delivery_address.street || ''} ${order.delivery_address.number || ''}`}
                </p>
              </div>
            </div>
          )}

          {/* Items */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <Package size={18} style={{ color: '#9CA3AF' }} />
              <h2 style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{t('your_order')}</h2>
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
                    ${(((item.price || 0) / 100) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #F3F4F6', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#111827' }}>{t('total_label')}</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>${(Number(order.total) / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
            <button
              onClick={() => navigate(`/${tenantSlug}/status?orderId=${order.id}`)}
              style={{ width: '100%', padding: '14px', background: '#10B981', color: '#fff', borderRadius: 14, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15 }}
            >
              <Truck size={18} />
              {t('track_order')}
            </button>
            <button
              onClick={() => navigate(`/${tenantSlug}`)}
              style={{ width: '100%', padding: '12px', background: '#F3F4F6', color: '#374151', borderRadius: 14, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Home size={18} />
              {t('back_to_home')}
            </button>
          </div>

        </div>
      </div>
    </CameraTrigger>
  )
}
