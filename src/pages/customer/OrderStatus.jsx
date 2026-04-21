import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useLanguage } from '../../contexts/LanguageContext'
import { formatPrice } from '../../config/menuData.js'
import { getGuestToken } from '../../utils/guestToken.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { clearCurrentOrder, addToCurrentOrder } from '../../utils/storage.js'
import OrderStatusEmpty from '../../components/OrderStatusEmpty.jsx'
import ItemCard from '../../components/ItemCard'
import { QRCodeSVG } from 'qrcode.react'
import BurgerLoader from '../../components/BurgerLoader'
import HeaderClamp from '../../components/HeaderClamp.jsx'
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
const getSTEPS = (t) => [
    { id: 1, label: t('order_received'), icon: '📋' },
    { id: 2, label: t('order_in_kitchen'), icon: '👨‍🍳' },
    { id: 3, label: t('order_on_way'), icon: '🚗' },
    { id: 4, label: t('order_delivered'), icon: '✅' }
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

const getStatusLabel = (status, t) => {
    switch (status) {
        case 'pending_payment': return t('status_waiting_payment')
        case 'paid_unreleased': return t('status_payment_received')
        case 'released_to_kitchen': return t('status_confirmed')
        case 'preparing': return t('status_preparing')
        case 'ready': return t('status_ready_pickup')
        case 'dispatched': return t('status_on_way')
        case 'delivered': return t('status_delivered')
        case 'cancelled': return t('status_cancelled')
        case 'refunded': return t('status_refunded')
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
    const { t } = useLanguage()
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

    const [retrying, setRetrying] = useState(false)
    const [showTicket, setShowTicket] = useState(false)

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
        return <BurgerLoader />
    }

    // Empty
    if (!order) {
        return <OrderStatusEmpty config={config} featuredItems={featuredItems} />
    }

    const isDelivery = order.order_type === 'delivery'
    const whatsappNumber = tenantData?.whatsapp_number || ''
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hola, necesito ayuda con mi pedido #${order.order_number}`

    return (
        <>
            <HeaderClamp config={config} />
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
                {t('order_confirmed_title')}
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
                    ? t('order_on_way_sub')
                    : t('order_preparing_sub')}
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
                    {t('back_to_home')}
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
                    {t('reorder_same')}
                </button>
            </div>

            {/* 🎟️ TICKET BUTTON (if order has ticket items) */}
            {order && hasTicketItems(order) && (
                <div style={{ width: '100%', maxWidth: 320, marginTop: 16 }}>
                    <button
                        onClick={() => setShowTicket(true)}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: isTicketRedeemed(order) ? '#6B7280' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 12,
                            fontSize: 16,
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: isTicketRedeemed(order) ? 'none' : '0 4px 16px rgba(245,158,11,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}
                    >
                        {isTicketRedeemed(order) ? t('ticket_redeemed_status') : t('view_my_ticket')}
                    </button>
                </div>
            )}

            {/* 🎟️ DIGITAL TICKET OVERLAY */}
            {showTicket && order && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 200,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: 24,
                }}>
                    {/* Close */}
                    <button
                        onClick={() => setShowTicket(false)}
                        style={{
                            position: 'absolute', top: 20, right: 20,
                            background: 'rgba(255,255,255,0.1)', border: 'none',
                            color: '#FFF', fontSize: 24, width: 44, height: 44,
                            borderRadius: 12, cursor: 'pointer',
                        }}
                    >✕</button>

                    {/* Ticket Card */}
                    <div style={{
                        background: '#FFFFFF', borderRadius: 24,
                        padding: '32px 24px', maxWidth: 340, width: '100%',
                        textAlign: 'center', position: 'relative',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
                        border: '3px solid #F59E0B',
                    }}>
                        {/* Event Title */}
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
                            {tenantData?.business_name || 'FoodSpot'}
                        </p>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1F2937', margin: '0 0 4px' }}>
                            {getTicketItemName(order)}
                        </h3>
                        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
                            Pedido #{order.order_number} · {order.customer_name || 'Invitado'}
                        </p>

                        {/* QR Code */}
                        <div style={{
                            background: '#FFFFFF', padding: 16, borderRadius: 16,
                            display: 'inline-block',
                            border: '2px dashed #E5E7EB',
                        }}>
                            <QRCodeSVG
                                value={`FS-TICKET|${order.id}|${tenantSlug}`}
                                size={200}
                                level="H"
                                includeMargin={false}
                                bgColor="#FFFFFF"
                                fgColor="#1F2937"
                            />
                        </div>

                        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 16, margin: '16px 0 0' }}>
                            {t('ticket_redeem_instruction')}
                        </p>

                        {/* REDEEMED STAMP */}
                        {isTicketRedeemed(order) && (
                            <div style={{
                                position: 'absolute', top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%) rotate(-15deg)',
                                border: '4px solid #EF4444',
                                borderRadius: 12, padding: '8px 24px',
                                color: '#EF4444', fontSize: 28, fontWeight: 900,
                                letterSpacing: '0.1em', opacity: 0.8,
                                pointerEvents: 'none',
                            }}>
                                {t('ticket_redeemed_stamp')}
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                    {t('need_help_contact')}
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
                    {getStatusLabel(order.status, t)}
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
        </>
    )
}

// 🎟️ TICKET HELPERS
const hasTicketItems = (order) => {
    return order?.items?.some(item =>
        item.name?.startsWith('🎟️') || item.isTicket === true
    )
}

const getTicketItemName = (order) => {
    const ticket = order?.items?.find(item =>
        item.name?.startsWith('🎟️') || item.isTicket === true
    )
    return ticket?.name?.replace('🎟️ ', '') || 'Ticket'
}

const isTicketRedeemed = (order) => {
    return order?.mp_payment_data?.ticket_redeemed === true
}

export default OrderStatus
