import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../config/menuData.js'
import { getGuestToken } from '../../utils/guestToken.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import OrderStatusEmpty from '../../components/OrderStatusEmpty.jsx'
import ItemCard from '../../components/ItemCard'

// ============================================
// 📊 ORDER STATUS - REAL-TIME LIVE TRACKER
// ============================================
// Uses Supabase Channels for instant updates
// Uber-style 4-step horizontal stepper
// ============================================

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)

// Status step definitions (4-step Uber style)
const STEPS = [
    { id: 1, label: 'Recibido', icon: '📋' },
    { id: 2, label: 'En Cocina', icon: '👨‍🍳' },
    { id: 3, label: 'En Camino', icon: '🚗' },
    { id: 4, label: 'Entregado', icon: '✅' }
]

// Map backend status to step number
const getStepFromStatus = (status) => {
    switch (status) {
        case 'awaiting_payment':
        case 'pendiente_confirmacion':
            return 0 // Not yet visible to staff
        case 'confirmado':
            return 1 // Recibido
        case 'en_cocina':
        case 'preparando':
            return 2 // En Cocina
        case 'en_camino':
        case 'listo':
            return 3 // En Camino
        case 'entregado':
            return 4 // Entregado
        default:
            return 0
    }
}

const getStatusLabel = (status) => {
    switch (status) {
        case 'awaiting_payment': return 'Esperando pago...'
        case 'pendiente_confirmacion': return 'Esperando confirmación...'
        case 'confirmado': return 'Pedido confirmado'
        case 'en_cocina': return 'En preparación'
        case 'preparando': return 'En preparación'
        case 'en_camino': return 'En camino'
        case 'listo': return '¡Listo para recoger!'
        case 'entregado': return 'Entregado'
        default: return status
    }
}

const getStatusColor = (status) => {
    switch (status) {
        case 'awaiting_payment':
        case 'pendiente_confirmacion':
            return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' }
        case 'confirmado':
        case 'en_cocina':
        case 'preparando':
            return { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' }
        case 'en_camino':
            return { bg: '#E0E7FF', text: '#4338CA', border: '#6366F1' }
        case 'listo':
        case 'entregado':
            return { bg: '#DCFCE7', text: '#166534', border: '#22C55E' }
        default:
            return { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF' }
    }
}

function OrderStatus({ config: configProp, featuredItems = [] }) {
    const { businessId, tenantData } = useTenant()
    const config = configProp || tenantData?.app_config || {}
    const navigate = useNavigate()
    const { orderId } = useParams()
    const [searchParams] = useSearchParams()

    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Retry Payment State
    const [retrying, setRetrying] = useState(false)

    const paymentStatus = searchParams.get('payment')
    const primaryColor = tenantData?.primary_color || '#C4856A'

    // ============================================
    // 🔍 FETCH ORDER FROM SUPABASE
    // ============================================
    useEffect(() => {
        const fetchOrder = async () => {
            setLoading(true)
            try {
                if (orderId) {
                    // Specific order by ID
                    const { data, error: fetchError } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('id', orderId)
                        .single()

                    if (fetchError) throw fetchError
                    setOrder(data)
                } else {
                    // Most recent order by guest token
                    const guestToken = getGuestToken()
                    const storedPhone = localStorage.getItem('fs_customer_phone')

                    let query = supabase
                        .from('orders')
                        .select('*')
                        .eq('business_id', businessId)
                        .order('created_at', { ascending: false })
                        .limit(1)

                    if (guestToken) {
                        query = query.eq('guest_token', guestToken)
                    } else if (storedPhone) {
                        query = query.eq('customer_phone', storedPhone)
                    }

                    const { data, error: fetchError } = await query
                    if (fetchError) throw fetchError
                    setOrder(data?.[0] || null)
                }
            } catch (err) {
                console.error('Fetch Order Error:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        if (businessId || orderId) {
            fetchOrder()
        }
    }, [businessId, orderId])

    // ============================================
    // ⚡ REAL-TIME SUBSCRIPTION
    // ============================================
    useEffect(() => {
        if (!order?.id) return

        const channel = supabase
            .channel(`order-${order.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `id=eq.${order.id}`
                },
                (payload) => {
                    console.log('🔔 Order Updated:', payload.new.status)
                    setOrder(payload.new)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [order?.id])

    // Handle MP payment callback - update order status
    // 🛡️ DUAL-WRITE PROTECTION: Removed client-side status update.
    // The Webhook is the SOLE authority for payment confirmation.
    // The Realtime subscription above handles the UI update.


    // ============================================
    // 🔄 RECOVERY ENGINE: RETRY PAYMENT
    // ============================================
    const handleRetryPayment = async () => {
        if (!order || !tenantData) return
        setRetrying(true)

        try {
            console.log('🔄 Initiating Payment Retry for Order:', order.id)

            // ⚠️ SECURITY NOTE: Ideally this should be an Edge Function call to avoid exposing the token.
            // However, adhering to the "Strike 2" instruction to call MP API directly here.
            // If the token was moved to 'branding_secrets', this might fail unless proxied.
            const mpToken = tenantData.mp_access_token

            if (!mpToken) {
                throw new Error('No configuration for payments found.')
            }

            const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${mpToken}`
                },
                body: JSON.stringify({
                    items: [{
                        title: `Pedido #${order.order_number} - Reintento`,
                        quantity: 1,
                        unit_price: order.total,
                        currency_id: 'ARS'
                    }],
                    // 🛡️ ZERO-DUPLICATE: Use EXISTING order ID
                    external_reference: order.id,
                    back_urls: {
                        success: `${window.location.origin}/status/${order.id}?payment=success`,
                        failure: `${window.location.origin}/status/${order.id}?payment=failure`,
                        pending: `${window.location.origin}/status/${order.id}?payment=pending`
                    },
                    auto_return: 'approved',
                    notification_url: `${window.location.origin}/api/mp-webhook`
                })
            })

            const data = await response.json()
            if (data.init_point) {
                console.log('✅ Preference Re-created:', data.id)
                window.location.href = data.init_point
            } else {
                throw new Error('Mercado Pago did not return an init_point')
            }

        } catch (err) {
            console.error('Retry Failed:', err)
            alert('Error al reintentar el pago. Por favor intenta de nuevo.')
        } finally {
            setRetrying(false)
        }
    }


    // Loading
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>📦</div>
                    <p style={{ color: '#6B7280' }}>Cargando pedido...</p>
                </div>
            </div>
        )
    }

    // Empty
    if (!order) {
        return <OrderStatusEmpty config={config} featuredItems={featuredItems} />
    }

    const currentStep = getStepFromStatus(order.status)
    const statusColors = getStatusColor(order.status)
    const greenActive = '#22C55E'
    const grayMuted = '#9CA3AF'
    const grayLight = '#E5E7EB'

    return (
        <div className="page" style={{
            padding: '0 20px',
            paddingTop: 24,
            paddingBottom: 100,
            backgroundColor: '#FAFAF8',
            minHeight: '100vh'
        }}>
            {/* Payment Status Banners */}
            {paymentStatus === 'success' && (
                <div style={{
                    background: '#ECFDF5', border: '1px solid #22C55E',
                    borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center'
                }}>
                    <span style={{ fontSize: 24, marginRight: 8 }}>✅</span>
                    <span style={{ color: '#166534', fontWeight: 600 }}>¡Pago confirmado!</span>
                </div>
            )}
            {paymentStatus === 'failure' && (
                <div style={{
                    background: '#FEE2E2', border: '1px solid #EF4444',
                    borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center'
                }}>
                    <div style={{ marginBottom: 12 }}>
                        <span style={{ fontSize: 24, marginRight: 8 }}>❌</span>
                        <span style={{ color: '#DC2626', fontWeight: 600 }}>Error en el pago</span>
                    </div>
                    {/* 🔄 RETRY BUTTON */}
                    <button
                        onClick={handleRetryPayment}
                        disabled={retrying}
                        style={{
                            background: primaryColor,
                            color: 'white',
                            border: 'none',
                            padding: '8px 24px',
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 14,
                            cursor: retrying ? 'not-allowed' : 'pointer',
                            opacity: retrying ? 0.7 : 1,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        {retrying ? 'Procesando...' : 'Intentar de nuevo'}
                    </button>
                </div>
            )}
            {paymentStatus === 'pending' && (
                <div style={{
                    background: '#FEF3C7', border: '1px solid #F59E0B',
                    borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center'
                }}>
                    <span style={{ fontSize: 24, marginRight: 8 }}>⏳</span>
                    <span style={{ color: '#92400E', fontWeight: 600 }}>Pago pendiente...</span>
                </div>
            )}

            {/* Main Order Card */}
            <div style={{
                background: 'white', borderRadius: 20, padding: '24px 20px',
                marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}>
                {/* Order Number + Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#1F2937' }}>
                        Pedido #{String(order.order_number).padStart(3, '0')}
                    </span>
                    <span style={{
                        background: statusColors.bg, color: statusColors.text,
                        border: `1px solid ${statusColors.border}`,
                        padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600
                    }}>
                        {getStatusLabel(order.status)}
                    </span>
                </div>

                {/* 🚀 UBER-STYLE HORIZONTAL STEPPER */}
                {currentStep > 0 && (
                    <div style={{ marginBottom: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            {STEPS.map((step, i) => {
                                const isCompleted = currentStep > step.id
                                const isCurrent = currentStep === step.id
                                const isActive = isCompleted || isCurrent

                                return (
                                    <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: '50%',
                                            background: isCompleted ? greenActive : (isCurrent ? primaryColor : grayLight),
                                            border: isCurrent ? `3px solid ${primaryColor}` : 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: isActive ? 'white' : grayMuted,
                                            fontSize: isCompleted ? 14 : 18, fontWeight: 600, flexShrink: 0,
                                            transition: 'all 0.3s ease',
                                            boxShadow: isCurrent ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                                        }}>
                                            {isCompleted ? <CheckIcon /> : step.icon}
                                        </div>
                                        {i < STEPS.length - 1 && (
                                            <div style={{
                                                flex: 1, height: 4,
                                                background: currentStep > step.id ? greenActive : grayLight,
                                                marginLeft: 8, marginRight: 8, borderRadius: 2, transition: 'background 0.3s ease'
                                            }} />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {STEPS.map((step, i) => (
                                <span key={step.id} style={{
                                    fontSize: 11, fontWeight: currentStep >= step.id ? 600 : 400,
                                    color: currentStep >= step.id ? '#374151' : grayMuted,
                                    textAlign: i === 0 ? 'left' : (i === STEPS.length - 1 ? 'right' : 'center'),
                                    flex: 1
                                }}>
                                    {step.label}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Waiting Message for Step 0 */}
                {currentStep === 0 && (
                    <div style={{ background: '#FEF3C7', padding: 16, borderRadius: 12, marginBottom: 20, textAlign: 'center' }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                        <p style={{ color: '#92400E', fontSize: 14, fontWeight: 500, margin: 0 }}>
                            {order.status === 'awaiting_payment'
                                ? 'Esperando confirmación del pago...'
                                : 'El local está revisando tu pedido...'}
                        </p>
                    </div>
                )}

                {/* Summary Line */}
                <div style={{ textAlign: 'center', paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: 14, color: '#6B7280' }}>
                    {order.items?.length || '?'} items · Total: {formatPrice(order.total)}
                </div>
            </div>

            {/* Itemized Card */}
            <div style={{ background: 'white', borderRadius: 20, padding: 20, marginBottom: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', marginBottom: 16 }}>Detalle del pedido</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 12, marginBottom: 16 }}>
                    {(order.items || []).map((item, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                            <ItemCard item={item} readOnly={true} isPlaceholder={false} isOwnerMode={false} />
                            {item.quantity > 1 && (
                                <div style={{
                                    position: 'absolute', top: -6, right: -6, background: '#EF4444', color: 'white',
                                    fontSize: 11, fontWeight: 700, width: 20, height: 20, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 10, border: '2px solid white'
                                }}>
                                    {item.quantity}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: '#6B7280' }}>
                        <span>Subtotal:</span>
                        <span>{formatPrice(order.subtotal || order.total)}</span>
                    </div>
                    {order.delivery_fee > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: '#6B7280' }}>
                            <span>Envío:</span>
                            <span>{formatPrice(order.delivery_fee)}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, color: '#1F2937' }}>
                        <span>Total:</span>
                        <span style={{ color: primaryColor }}>{formatPrice(order.total)}</span>
                    </div>
                </div>
            </div>

            {/* Delivery Address */}
            {order.order_type === 'delivery' && order.delivery_address && (
                <div style={{ background: 'white', borderRadius: 16, padding: 20, marginBottom: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', marginBottom: 12 }}>📍 Dirección de entrega</h3>
                    <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>{order.delivery_address}</p>
                    {order.distance_km && (
                        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>Distancia: {order.distance_km}km</p>
                    )}
                </div>
            )}

            {/* Help Text */}
            <p style={{ textAlign: 'center', fontSize: 13, color: grayMuted, marginTop: 0 }}>
                Mostrá este pedido en el local si es necesario
            </p>

            {/* Real-time Indicator */}
            <div style={{
                position: 'fixed', bottom: 80, right: 20, background: 'white',
                borderRadius: 20, padding: '8px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', gap: 8
            }}>
                <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#22C55E',
                    animation: 'livePulse 2s infinite'
                }} />
                <span style={{ fontSize: 11, color: '#6B7280' }}>En vivo</span>
            </div>

            <style>{`
                @keyframes livePulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.9); }
                }
                @keyframes pulse {
                    0%, 80%, 100% { opacity: 0.4; transform: scale(0.9); }
                    40% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    )
}

export default OrderStatus
