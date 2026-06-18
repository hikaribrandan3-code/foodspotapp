import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { useCurrency } from '../../hooks/useCurrency.js'
import { PAYMENT_METHOD } from '../../constants/database.js'
import MercadoPagoAliasQR from '../../components/MercadoPagoAliasQR.jsx'
import HeaderClamp from '../../components/HeaderClamp.jsx'
import BurgerLoader from '../../components/BurgerLoader'

// ============================================
// ORDERPAYMENT.JSX - South American MVP Payment Flow
// ============================================
// Shows 3 payment options after order submission:
// 1. Cash at Pickup
// 2. WhatsApp Owner
// 3. Mercado Pago Alias (QR)
// ============================================

const PaymentOptionCard = ({ selected, onClick, title, subtitle, icon, color, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '100%',
      position: 'relative',
      padding: 18,
      marginBottom: 12,
      background: selected ? `${color}10` : '#FFFFFF',
      border: selected ? `2px solid ${color}` : '1px solid #E5E7EB',
      borderRadius: 16,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: selected ? `0 4px 12px ${color}20` : '0 2px 4px rgba(0,0,0,0.02)',
      opacity: disabled ? 0.6 : 1,
      textAlign: 'left',
      fontFamily: 'inherit',
    }}
  >
    <div style={{
      width: 48,
      height: 48,
      borderRadius: 12,
      background: selected ? 'white' : '#F3F4F6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: color,
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#6B7280' }}>{subtitle}</div>
    </div>
    <div style={{
      width: 24,
      height: 24,
      borderRadius: '50%',
      border: selected ? `6px solid ${color}` : '2px solid #D1D5DB',
      background: 'white',
      transition: 'all 0.2s ease',
      flexShrink: 0,
    }} />
  </button>
)

export default function OrderPayment({ config: configProp }) {
  const navigate = useNavigate()
  const { tenantSlug } = useParams()
  const [searchParams] = useSearchParams()
  const { businessId, tenantData } = useTenant()
  const fmt = useCurrency()
  const { t } = useLanguage()
  const config = configProp || tenantData?.app_config || {}

  const orderId = searchParams.get('orderId')

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [showQr, setShowQr] = useState(false)

  const mpAlias = tenantData?.app_config?.payments?.mercadoPagoAlias || null
  const ownerPhone = tenantData?.whatsapp_number || tenantData?.phone || null
  const primaryColor = tenantData?.confirmation_color || '#C4856A'

  // Fetch order on mount
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError('No order ID provided')
        setLoading(false)
        return
      }

      try {
        let query = supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
        if (businessId) query = query.eq('business_id', businessId)
        const { data, error: fetchError } = await query.maybeSingle()

        if (fetchError) throw fetchError
        if (!data) throw new Error('Order not found')

        setOrder(data)
      } catch (err) {
        console.error('[OrderPayment] Fetch error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  // Subscribe to real-time order updates
  useEffect(() => {
    if (!order?.id) return

    const channel = supabase
      .channel(`order-payment-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          setOrder(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [order?.id])

  const updateOrderPaymentMethod = async (method) => {
    if (!order?.id || !businessId) return { error: new Error('Missing order or business ID') }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_method: method,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('business_id', businessId)

    return { error: updateError }
  }

  const handleCash = async () => {
    if (processing) return
    setSelectedMethod(PAYMENT_METHOD.CASH)
    setProcessing(true)

    const { error: updateError } = await updateOrderPaymentMethod(PAYMENT_METHOD.CASH)
    if (updateError) {
      console.error('[OrderPayment] Cash update failed:', updateError)
      setProcessing(false)
      return
    }

    navigate(`/${tenantSlug}/status?orderId=${order.id}`)
  }

  const handleWhatsApp = async () => {
    if (processing || !ownerPhone) return
    setSelectedMethod(PAYMENT_METHOD.WHATSAPP)
    setProcessing(true)

    const { error: updateError } = await updateOrderPaymentMethod(PAYMENT_METHOD.WHATSAPP)
    if (updateError) {
      console.error('[OrderPayment] WhatsApp update failed:', updateError)
      setProcessing(false)
      return
    }

    const message = `Order #${order.order_number} - Awaiting confirmation`
    const whatsappUrl = `https://wa.me/${ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')

    navigate(`/${tenantSlug}/status?orderId=${order.id}`)
  }

  const handleAlias = async () => {
    if (processing) return
    setSelectedMethod(PAYMENT_METHOD.ALIAS)
    setProcessing(true)

    const { error: updateError } = await updateOrderPaymentMethod(PAYMENT_METHOD.ALIAS)
    if (updateError) {
      console.error('[OrderPayment] Alias update failed:', updateError)
      setProcessing(false)
      return
    }

    setShowQr(true)
    setProcessing(false)
  }

  const handleDoneWithQr = () => {
    navigate(`/${tenantSlug}/status?orderId=${order.id}`)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F9FA' }}>
        <HeaderClamp config={config} />
        <BurgerLoader />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F9FA', paddingBottom: 140 }}>
        <HeaderClamp config={config} />
        <div style={{ margin: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>
            {error || 'Order not found'}
          </h2>
          <button
            onClick={() => navigate(`/${tenantSlug}`)}
            style={{
              marginTop: 20,
              padding: '14px 24px',
              background: primaryColor,
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Back to Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 140, background: '#F8F9FA' }}>
      <HeaderClamp config={config} />

      <div style={{ margin: '0 14px', paddingTop: 20 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#111827',
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}>
            Choose Payment
          </h1>
          <p style={{
            fontSize: 15,
            color: '#6B7280',
            margin: 0,
          }}>
            Order #{String(order.order_number).padStart(3, '0')} · {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Order Summary Card */}
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          marginBottom: 24,
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#6B7280',
            margin: '0 0 12px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Summary
          </h3>
          {(order.items || []).map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 14,
              color: '#374151',
              padding: '4px 0',
            }}>
              <span>{item.quantity}× {item.name}</span>
              <span style={{ color: '#6B7280', fontWeight: 500 }}>{fmt(item.price * item.quantity)}</span>
            </div>
          ))}
          {order.delivery_fee > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 14,
              color: '#374151',
              padding: '4px 0',
              marginTop: 8,
            }}>
              <span>Delivery</span>
              <span style={{ color: '#6B7280', fontWeight: 500 }}>{fmt(order.delivery_fee)}</span>
            </div>
          )}
          <div style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '2px dashed #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: primaryColor }}>
              {fmt(order.total)}
            </span>
          </div>
        </div>

        {/* QR Modal / Inline */}
        {showQr ? (
          <div style={{ marginBottom: 24 }}>
            <MercadoPagoAliasQR alias={mpAlias} size={200} />
            <button
              onClick={handleDoneWithQr}
              style={{
                width: '100%',
                marginTop: 16,
                padding: 16,
                background: primaryColor,
                color: 'white',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}
            >
              Done — Go to Order Status
            </button>
          </div>
        ) : (
          <>
            <h3 style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#6B7280',
              margin: '0 0 12px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Payment Method
            </h3>

            {/* Cash */}
            <PaymentOptionCard
              selected={selectedMethod === PAYMENT_METHOD.CASH}
              onClick={handleCash}
              disabled={processing}
              title="Cash at Pickup"
              subtitle="Pay when you collect your order"
              color="#22C55E"
              icon={(
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              )}
            />

            {/* WhatsApp */}
            <PaymentOptionCard
              selected={selectedMethod === PAYMENT_METHOD.WHATSAPP}
              onClick={handleWhatsApp}
              disabled={processing || !ownerPhone}
              title="WhatsApp Owner"
              subtitle={ownerPhone ? "Confirm and pay via chat" : "Not available"}
              color="#25D366"
              icon={(
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              )}
            />

            {/* Mercado Pago Alias */}
            <PaymentOptionCard
              selected={selectedMethod === PAYMENT_METHOD.ALIAS}
              onClick={handleAlias}
              disabled={processing || !mpAlias}
              title="Mercado Pago Alias"
              subtitle={mpAlias ? "Scan QR to pay instantly" : "Alias not configured"}
              color="#009EE3"
              icon={(
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              )}
            />
          </>
        )}
      </div>
    </div>
  )
}
