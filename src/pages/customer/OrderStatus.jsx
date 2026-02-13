import { useState, useEffect, useContext } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../config/menuData.js'
import { getGuestToken } from '../../utils/guestToken.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
// CartContext removed - using direct storage for reorder logic
import { clearCurrentOrder, addToCurrentOrder } from '../../utils/storage.js' // 🆕 Utils Import
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
        case 'pending_payment':
        case 'paid_unreleased':
            return 0 // Not yet visible to staff
        case 'released_to_kitchen':
            return 1 // Recibido
        case 'preparing':
            return 2 // En Cocina
        case 'ready':
        case 'dispatched':
            return 3 // En Camino / Listo
        case 'delivered':
            return 4 // Entregado
        case 'cancelled':
        case 'refunded':
            return -1 // Terminal
        default:
            return 0
    }
}

const getStatusLabel = (status) => {
    switch (status) {
        case 'pending_payment': return 'Esperando pago...'
        case 'paid_unreleased': return 'Pago recibido'
        case 'released_to_kitchen': return 'Pedido confirmado'
        case 'preparing': return 'En preparación'
        case 'ready': return '¡Listo para recoger!'
        case 'dispatched': return 'En camino'
        case 'delivered': return 'Entregado'
        case 'cancelled': return 'Cancelado'
        case 'refunded': return 'Reembolsado'
        default: return status
    }
}

const getStatusColor = (status) => {
    switch (status) {
        case 'pending_payment':
            return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' }
        case 'paid_unreleased':
        case 'released_to_kitchen':
        case 'preparing':
            return { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' }
        case 'ready':
            return { bg: '#CFFAFE', text: '#0E7490', border: '#06B6D4' }
        case 'dispatched':
            return { bg: '#E0E7FF', text: '#4338CA', border: '#6366F1' }
        case 'delivered':
            return { bg: '#DCFCE7', text: '#166534', border: '#22C55E' }
        case 'cancelled':
        case 'refunded':
            return { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' }
        default:
            return { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF' }
    }
}

function OrderStatus({ config: configProp, featuredItems = [] }) {
    const { businessId, tenantData } = useTenant()
    const config = configProp || tenantData?.app_config || {}
    const navigate = useNavigate()
    const { orderId: paramOrderId, tenantSlug } = useParams()
    const [searchParams] = useSearchParams()

    // Support both /status/:id (if added later) and /status?orderId=...
    const queryOrderId = searchParams.get('orderId')
    const orderId = paramOrderId || queryOrderId

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
    // 🔄 REORDER ENGINE (Strike 10)
    // ============================================
    // Using direct storage manipulation for reorder since we are redirecting anyway

    const handleReorder = () => {
        if (!order || !order.items) return

        // 1. Clear current cart to avoid mixing
        clearCurrentOrder()
        // Note: In a perfect world we'd use a context method clearCart(), 
        // but importing clearCurrentOrder from storage works for the engine.
        // However, we should try to use the Context if possible to trigger updates.
        // Since we are redirecting, the fresh mount of Order.jsx/Menu.jsx will read from storage.

        // 2. Clone items
        let addedCount = 0
        order.items.forEach(item => {
            // 🛡️ STRIKE 8 COMPATIBILITY: Pass metadata/variants
            // item.variants might be undefined in legacy orders, default to []
            addToCurrentOrder(item, item.quantity, item.extras || [], item.variants || [])
            addedCount++
        })

        // 3. Redirect
        if (addedCount > 0) {
            // Use tenantSlug if available for absolute clarity, else relative
            if (tenantSlug) {
                window.location.href = `/${tenantSlug}/menu?reorder=true`
            } else {
                window.location.href = `/menu?reorder=true`
            }
        }
    }

    // ... (keep retry logic) ...

    // Loading
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF'
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

    const isDelivery = order.order_type === 'delivery'
    const whatsappNumber = tenantData?.whatsapp_number || ''
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hola, necesito ayuda con mi pedido #${order.order_number}`

    return (
        <div className="page" style={{
            background: '#FFFFFF',
            minHeight: '100vh',
            padding: '24px 20px',
            paddingBottom: 'calc(40px + env(safe-area-inset-bottom))', // Safe Area
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}>

            {/* HERO ANIMATION */}
            <div style={{
                marginBottom: 24,
                position: 'relative',
                animation: 'float 6s ease-in-out infinite'
            }}>
                {/* Red Box / Plate Icon */}
                <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="48" fill="#FEF2F2" />
                    <path d="M30 35 L70 35 L70 75 L30 75 Z" stroke="#DC2626" strokeWidth="4" strokeLinejoin="round" fill="white" />
                    <path d="M30 35 L50 20 L90 20 L70 35" stroke="#DC2626" strokeWidth="4" strokeLinejoin="round" fill="white" />
                    <path d="M70 35 L90 20 L90 60 L70 75" stroke="#DC2626" strokeWidth="4" strokeLinejoin="round" fill="#FCA5A5" />
                    {/* Checkmark Badge */}
                    <circle cx="75" cy="75" r="20" fill="#DC2626" />
                    <path d="M65 75 L72 82 L85 68" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>

            {/* TITLE */}
            <h1 style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#111827',
                marginBottom: 8,
                textAlign: 'center',
                letterSpacing: '-0.02em'
            }}>
                ¡Pedido Confirmado!
            </h1>

            {/* DYNAMIC SUBTITLE */}
            <p style={{
                fontSize: 16,
                color: '#6B7280',
                textAlign: 'center',
                marginBottom: 40,
                maxWidth: 280,
                lineHeight: 1.5
            }}>
                {isDelivery
                    ? "Tu comida está en camino."
                    : "Estamos preparando tu pedido para la mesa."}
            </p>

            {/* ACTION BUTTONS */}
            <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* PRIMARY: Ver Detalles (Solid Red) */}
                <button
                    onClick={() => navigate('/menu')} // Placeholder for now, or toggle details
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: '#DC2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: 12,
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)'
                    }}
                >
                    Volver al Inicio
                </button>

                {/* SECONDARY: Pedir lo mismo (Ghost) */}
                <button
                    onClick={handleReorder}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: 'transparent',
                        color: '#4B5563',
                        border: '1px solid #E5E7EB',
                        borderRadius: 12,
                        fontSize: 16,
                        fontWeight: 500,
                        cursor: 'pointer'
                    }}
                >
                    Pedir lo mismo de nuevo
                </button>
            </div>

            {/* LINKS */}
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        fontSize: 14,
                        color: '#6B7280',
                        textDecoration: 'none',
                        borderBottom: '1px dotted #9CA3AF'
                    }}
                >
                    ¿Necesitas ayuda? Contáctanos
                </a>
            </div>

            {/* REAL-TIME STATUS PILL (Floats at top) */}
            <div style={{
                position: 'fixed',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(10px)',
                padding: '8px 16px',
                borderRadius: 20,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                zIndex: 50,
                border: '1px solid #F3F4F6'
            }}>
                <div style={{ width: 8, height: 8, background: '#22C55E', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    {getStatusLabel(order.status)}
                </span>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    )
}

export default OrderStatus
