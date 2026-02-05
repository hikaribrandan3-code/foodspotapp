import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../config/menuData.js'
import { getGuestToken } from '../../utils/guestToken.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import OrderStatusEmpty from '../../components/OrderStatusEmpty.jsx'
import ItemCard from '../../components/ItemCard'

// Check icon for completed steps
const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
)

// Status step definitions (Uber-style 4-step)
const STEPS = [
    { id: 1, label: 'Recibido', icon: '📋' },
    { id: 2, label: 'En Cocina', icon: '👨‍🍳' },
    { id: 3, label: 'En Camino', icon: '🚗' },
    { id: 4, label: 'Entregado', icon: '✅' }
]

// Status to step mapping
const getStepFromStatus = (status) => {
    switch (status) {
        case 'pendiente':
        case 'pendiente_confirmacion':
        case 'esperando_pago':
            return 0 // Not yet started
        case 'confirmado':
        case 'en_preparacion':
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
            return 1
    }
}

const getStatusLabel = (status) => {
    switch (status) {
        case 'pendiente':
        case 'pendiente_confirmacion':
            return 'Esperando confirmación'
        case 'esperando_pago':
            return 'Esperando pago'
        case 'confirmado':
        case 'en_preparacion':
            return 'Confirmado'
        case 'en_cocina':
        case 'preparando':
            return 'En preparación'
        case 'en_camino':
            return 'En camino'
        case 'listo':
            return '¡Listo para recoger!'
        case 'entregado':
            return 'Entregado'
        default:
            return status
    }
}

const getStatusColor = (status) => {
    switch (status) {
        case 'pendiente':
        case 'pendiente_confirmacion':
        case 'esperando_pago':
            return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' } // Yellow
        case 'confirmado':
        case 'en_preparacion':
        case 'en_cocina':
        case 'preparando':
            return { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' } // Blue
        case 'en_camino':
            return { bg: '#E0E7FF', text: '#4338CA', border: '#6366F1' } // Indigo
        case 'listo':
        case 'entregado':
            return { bg: '#DCFCE7', text: '#166534', border: '#22C55E' } // Green
        default:
            return { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF' }
    }
}

function OrderStatus({ config: configProp, featuredItems = [] }) {
    const { businessId, tenantData } = useTenant()
    const config = configProp || tenantData?.app_config || {};
    const navigate = useNavigate()
    const { orderId } = useParams()
    const [searchParams] = useSearchParams()

    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Check for payment callback
    const paymentStatus = searchParams.get('payment')

    // 🛡️ FETCH ORDERS FROM SUPABASE (by guest token or specific order ID)
    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true)
            try {
                const guestToken = getGuestToken()
                const storedPhone = localStorage.getItem('fs_customer_phone')

                let query = supabase
                    .from('orders')
                    .select('*')
                    .eq('business_id', businessId)
                    .order('created_at', { ascending: false })
                    .limit(10)

                // If we have a specific order ID, fetch that
                if (orderId) {
                    query = supabase
                        .from('orders')
                        .select('*')
                        .eq('id', orderId)
                        .single()

                    const { data, error: fetchError } = await query
                    if (fetchError) throw fetchError
                    setOrders(data ? [data] : [])
                } else {
                    // Otherwise, fetch by guest token or phone
                    if (guestToken) {
                        query = query.eq('guest_token', guestToken)
                    } else if (storedPhone) {
                        query = query.eq('customer_phone', storedPhone)
                    }

                    const { data, error: fetchError } = await query
                    if (fetchError) throw fetchError

                    // Filter to today's orders or active orders
                    const today = new Date().toDateString()
                    const relevantOrders = (data || []).filter(order => {
                        const orderDate = new Date(order.created_at).toDateString()
                        return orderDate === today || order.status !== 'entregado'
                    })
                    setOrders(relevantOrders)
                }
            } catch (err) {
                console.error('Error fetching orders:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        if (businessId) {
            fetchOrders()
        }
    }, [businessId, orderId])

    // ⚡ REAL-TIME SUBSCRIPTION
    useEffect(() => {
        if (!businessId || orders.length === 0) return

        // Subscribe to changes on the orders we're tracking
        const orderIds = orders.map(o => o.id)

        const channel = supabase
            .channel('order-status-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: orderIds.length === 1
                        ? `id=eq.${orderIds[0]}`
                        : `id=in.(${orderIds.join(',')})`
                },
                (payload) => {
                    console.log('🔔 Order Updated:', payload)
                    setOrders(prev => prev.map(order =>
                        order.id === payload.new.id ? payload.new : order
                    ))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [businessId, orders.length])

    // Colors
    const primaryColor = tenantData?.primary_color || '#C4856A'
    const greenActive = '#22C55E'
    const grayMuted = '#9CA3AF'
    const grayLight = '#E5E7EB'

    const mostRecentOrder = orders[0]

    // Loading state
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FAFAF8'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>📦</div>
                    <p style={{ color: '#6B7280' }}>Cargando pedidos...</p>
                </div>
            </div>
        )
    }

    // Empty state
    if (orders.length === 0) {
        return <OrderStatusEmpty config={config} featuredItems={featuredItems} />
    }

    const currentStep = getStepFromStatus(mostRecentOrder.status)
    const statusColors = getStatusColor(mostRecentOrder.status)

    return (
        <div className="page" style={{
            padding: '0 20px',
            paddingTop: 24,
            paddingBottom: 100,
            backgroundColor: '#FAFAF8',
            minHeight: '100vh'
        }}>
            {/* Payment Status Banner */}
            {paymentStatus === 'success' && (
                <div style={{
                    background: '#ECFDF5',
                    border: '1px solid #22C55E',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    textAlign: 'center'
                }}>
                    <span style={{ fontSize: 24, marginRight: 8 }}>✅</span>
                    <span style={{ color: '#166534', fontWeight: 600 }}>¡Pago confirmado!</span>
                </div>
            )}
            {paymentStatus === 'failure' && (
                <div style={{
                    background: '#FEE2E2',
                    border: '1px solid #EF4444',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    textAlign: 'center'
                }}>
                    <span style={{ fontSize: 24, marginRight: 8 }}>❌</span>
                    <span style={{ color: '#DC2626', fontWeight: 600 }}>Error en el pago. Contacta al local.</span>
                </div>
            )}
            {paymentStatus === 'pending' && (
                <div style={{
                    background: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    textAlign: 'center'
                }}>
                    <span style={{ fontSize: 24, marginRight: 8 }}>⏳</span>
                    <span style={{ color: '#92400E', fontWeight: 600 }}>Pago pendiente de confirmación...</span>
                </div>
            )}

            {/* Main Order Card */}
            <div style={{
                background: 'white',
                borderRadius: 20,
                padding: '24px 20px',
                marginBottom: 16,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}>
                {/* Order Number + Status Badge */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 24
                }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#1F2937' }}>
                        Pedido #{String(mostRecentOrder.order_number || mostRecentOrder.orderNumber).padStart(3, '0')}
                    </span>
                    <span style={{
                        background: statusColors.bg,
                        color: statusColors.text,
                        border: `1px solid ${statusColors.border}`,
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 600
                    }}>
                        {getStatusLabel(mostRecentOrder.status)}
                    </span>
                </div>

                {/* 🚀 UBER-STYLE HORIZONTAL STEPPER */}
                <div style={{ marginBottom: 28 }}>
                    {/* Progress Line with Circles */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        position: 'relative',
                        marginBottom: 12
                    }}>
                        {STEPS.map((step, i) => {
                            const isCompleted = currentStep > step.id
                            const isCurrent = currentStep === step.id
                            const isActive = isCompleted || isCurrent

                            return (
                                <div key={step.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    flex: i < STEPS.length - 1 ? 1 : 'none'
                                }}>
                                    {/* Circle */}
                                    <div style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        background: isCompleted ? greenActive : (isCurrent ? primaryColor : grayLight),
                                        border: isCurrent ? `3px solid ${primaryColor}` : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: isActive ? 'white' : grayMuted,
                                        fontSize: isCompleted ? 14 : 18,
                                        fontWeight: 600,
                                        flexShrink: 0,
                                        transition: 'all 0.3s ease',
                                        boxShadow: isCurrent ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                                    }}>
                                        {isCompleted ? <CheckIcon /> : step.icon}
                                    </div>
                                    {/* Connecting Line */}
                                    {i < STEPS.length - 1 && (
                                        <div style={{
                                            flex: 1,
                                            height: 4,
                                            background: currentStep > step.id ? greenActive : grayLight,
                                            marginLeft: 8,
                                            marginRight: 8,
                                            borderRadius: 2,
                                            transition: 'background 0.3s ease'
                                        }} />
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Step Labels */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between'
                    }}>
                        {STEPS.map((step, i) => {
                            const isActive = currentStep >= step.id

                            return (
                                <span key={step.id} style={{
                                    fontSize: 11,
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? '#374151' : grayMuted,
                                    textAlign: i === 0 ? 'left' : (i === STEPS.length - 1 ? 'right' : 'center'),
                                    flex: 1,
                                    transition: 'all 0.3s ease'
                                }}>
                                    {step.label}
                                </span>
                            )
                        })}
                    </div>
                </div>

                {/* Waiting Message for Pending Orders */}
                {currentStep === 0 && (
                    <div style={{
                        background: '#FEF3C7',
                        padding: 16,
                        borderRadius: 12,
                        marginBottom: 20,
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                        <p style={{ color: '#92400E', fontSize: 14, fontWeight: 500, margin: 0 }}>
                            {mostRecentOrder.status === 'esperando_pago'
                                ? 'Esperando confirmación del pago...'
                                : 'El local está revisando tu pedido...'
                            }
                        </p>
                    </div>
                )}

                {/* Order Summary Line */}
                <div style={{
                    textAlign: 'center',
                    paddingTop: 16,
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    fontSize: 14,
                    color: '#6B7280'
                }}>
                    {mostRecentOrder.items?.length || '?'} items · Total: {formatPrice(mostRecentOrder.total)}
                </div>
            </div>

            {/* Itemized Order Card */}
            <div style={{
                background: 'white',
                borderRadius: 20,
                padding: 20,
                marginBottom: 24,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', marginBottom: 16 }}>
                    Detalle del pedido
                </h3>

                {/* Items Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 12, marginBottom: 16 }}>
                    {(mostRecentOrder.items || []).map((item, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                            <ItemCard item={item} readOnly={true} isPlaceholder={false} isOwnerMode={false} />
                            {item.quantity > 1 && (
                                <div style={{
                                    position: 'absolute', top: -6, right: -6, background: '#EF4444', color: 'white',
                                    fontSize: 11, fontWeight: 700, width: 20, height: 20, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    zIndex: 10, border: '2px solid white'
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
                        <span>{formatPrice(mostRecentOrder.subtotal || mostRecentOrder.total)}</span>
                    </div>
                    {mostRecentOrder.delivery_fee > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: '#6B7280' }}>
                            <span>Envío:</span>
                            <span>{formatPrice(mostRecentOrder.delivery_fee)}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, color: '#1F2937' }}>
                        <span>Total:</span>
                        <span style={{ color: primaryColor }}>{formatPrice(mostRecentOrder.total)}</span>
                    </div>
                </div>
            </div>

            {/* Delivery Info (if applicable) */}
            {mostRecentOrder.order_type === 'delivery' && mostRecentOrder.delivery_address && (
                <div style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 24,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', marginBottom: 12 }}>
                        📍 Dirección de entrega
                    </h3>
                    <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
                        {mostRecentOrder.delivery_address}
                    </p>
                    {mostRecentOrder.distance_km && (
                        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>
                            Distancia: {mostRecentOrder.distance_km}km
                        </p>
                    )}
                </div>
            )}

            {/* Help Text */}
            <p style={{
                textAlign: 'center',
                fontSize: 13,
                color: grayMuted,
                paddingBottom: 4,
                marginTop: 0
            }}>
                Mostrá este pedido en el local si es necesario
            </p>

            {/* Real-time indicator */}
            <div style={{
                position: 'fixed',
                bottom: 80,
                right: 20,
                background: 'white',
                borderRadius: 20,
                padding: '8px 14px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
            }}>
                <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#22C55E',
                    animation: 'pulse 2s infinite'
                }} />
                <span style={{ fontSize: 11, color: '#6B7280' }}>En vivo</span>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.9); }
                }
            `}</style>
        </div>
    )
}

export default OrderStatus
