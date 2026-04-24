import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useLanguage } from '../../contexts/LanguageContext'
import { getGuestToken } from '../../utils/guestToken.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { clearCurrentOrder, addToCurrentOrder } from '../../utils/storage.js'
import OrderStatusEmpty from '../../components/OrderStatusEmpty.jsx'
import BurgerLoader from '../../components/BurgerLoader'
import HeaderClamp from '../../components/HeaderClamp.jsx'

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
    const [retryingPayment, setRetryingPayment] = useState(false)

    const urlPaymentStatus = searchParams.get('payment')
    const primaryColor = tenantData?.primary_color || '#C4856A'

    // Retry payment handler (for pending MP orders)
    const handleRetryPayment = async () => {
        if (!order?.id || retryingPayment) return
        setRetryingPayment(true)
        try {
            const { data: prefData, error: prefError } = await supabase.functions.invoke('create-preference', {
                body: { order_id: order.id }
            })
            if (prefError) throw prefError
            if (prefData?.init_point) {
                window.location.href = prefData.init_point
                return
            }
            throw new Error('No init_point returned')
        } catch (err) {
            console.error('[OrderStatus] Retry payment error:', err)
            alert('Could not restart payment. Please contact support.')
        } finally {
            setRetryingPayment(false)
        }
    }

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

    // Format price helper
    const formatPrice = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    // Determine order variant for status display
    const getOrderVariant = () => {
        if (order.status === 'delivered') return 'delivered'
        if (order.status === 'pending_payment') return 'pending'
        if (isDelivery) return 'delivery'
        return 'dinein'
    }

    const orderVariant = getOrderVariant()
    const orderDate = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const orderTime = new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    // Calculate totals
    const subtotal = order.items?.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0) || 0
    const tax = order.tax || 0.01
    const deliveryFee = isDelivery ? (order.delivery_fee || 0) : null
    const total = order.total || (subtotal + (deliveryFee || 0) + tax)

    // Map status for display
    const getStatusText = () => {
        switch (order.status) {
            case 'pending_payment': return 'Awaiting confirmation'
            case 'paid_unreleased': return 'Payment received'
            case 'released_to_kitchen': return 'Confirmed'
            case 'preparing': return 'In Kitchen'
            case 'ready': return 'Ready'
            case 'dispatched': return 'On the way'
            case 'delivered': return 'Delivered'
            case 'cancelled': return 'Cancelled'
            default: return 'In Kitchen'
        }
    }

    const getPaymentDisplay = () => {
        if (order.payment_method === 'cash') return 'Cash'
        if (order.payment_method === 'card_on_delivery') return 'Card on Delivery'
        if (order.payment_method === 'mercado_pago') {
            const lastFour = order.mp_card_last4 || '****'
            return `Card · ${lastFour}`
        }
        return order.payment_method || 'Cash'
    }

    return (
        <>
            <HeaderClamp config={config} />
            <div className="page" style={{
                background: '#f5f5f4',
                minHeight: '100vh',
                padding: '24px 20px',
                paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
            }}>

            {/* RECEIPT CARD */}
            <div style={{
                width: 340,
                background: '#fff',
                border: '1px solid #e5e5e5',
                padding: '24px 22px 20px'
            }}>
<<<<<<< HEAD
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

            {/* 🧾 ORDER RECEIPT */}
            {order && !['cancelled', 'refunded'].includes(order.status) && (
                <div style={{ width: '100%', maxWidth: 400, marginTop: 24 }}>
                    <OrderReceipt
                        order={order}
                        tenantData={tenantData}
                        paymentMethod={order.payment_method || order.paymentMethod}
                        paymentStatus={order.payment_status || 'pending'}
                        onRetryPayment={handleRetryPayment}
                    />
                </div>
            )}

            {/* Cancelled order receipt (without total) */}
            {order && ['cancelled', 'refunded'].includes(order.status) && (
                <div style={{ width: '100%', maxWidth: 400, marginTop: 24 }}>
                    <OrderReceipt
                        order={order}
                        tenantData={tenantData}
                        paymentMethod={order.payment_method || order.paymentMethod}
                        paymentStatus={order.payment_status || 'pending'}
                        onRetryPayment={handleRetryPayment}
                    />
                </div>
            )}

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

                {/* Business name */}
                <div style={{
                    fontSize: 11, color: '#a3a3a3', fontWeight: 400,
                    letterSpacing: 0.2,
                    marginBottom: 6
                }}>
                    {tenantData?.business_name || 'Foodspot'}
                </div>

                {/* Hero headline */}
                <h1 style={{
                    fontSize: 28,
                    lineHeight: 1.1,
                    fontWeight: order.status === 'pending_payment' ? 500 : 700,
                    color: order.status === 'pending_payment' ? '#525252' : '#0a0a0a',
                    letterSpacing: -0.8,
                    margin: 0
                }}>
                    {order.status === 'delivered' ? 'Order Delivered' : order.status === 'pending_payment' ? 'Awaiting Confirmation' : 'Order Confirmed'}
                </h1>

                {/* Metadata */}
                <div style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: '#737373',
                    fontFamily: 'monospace',
                    fontVariantNumeric: 'tabular-nums'
                }}>
                    Order #{order.order_number || 'N/A'} · {orderDate} · {orderTime}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#e5e5e5', margin: '16px 0 14px' }} />

                {/* Items */}
                <div>
                    {order.items?.map((item, idx) => (
                        <div key={idx} style={{
                            display: 'flex', alignItems: 'baseline', gap: 8,
                            padding: '4px 0',
                        }}>
                            <span style={{ fontSize: 14, color: '#0a0a0a', fontWeight: 500, minWidth: 20 }}>
                                {item.quantity}×
                            </span>
                            <span style={{ flex: 1, fontSize: 14, color: '#525252', lineHeight: 1.35 }}>
                                {item.name}
                            </span>
                            <span style={{
                                fontFamily: 'monospace', fontSize: 13.5, color: '#0a0a0a',
                                fontVariantNumeric: 'tabular-nums', fontWeight: 500,
                            }}>
                                ${formatPrice(item.price || 0)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#e5e5e5', margin: '14px 0' }} />

                {/* Pricing */}
                <div>
                    {/* Subtotal */}
                    <div style={{
                        display: 'flex', alignItems: 'baseline',
                        padding: '3px 0', marginTop: 0,
                    }}>
                        <span style={{
                            fontSize: 13,
                            fontWeight: 400,
                            color: '#525252',
                        }}>
                            Subtotal
                        </span>
                        <span style={{
                            flex: 1, margin: '0 6px',
                            borderBottom: '1.5px dotted #d4d4d4',
                            transform: 'translateY(-3px)',
                        }} />
                        <span style={{
                            fontFamily: 'monospace', fontSize: 13,
                            fontWeight: 500, color: '#0a0a0a',
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            ${formatPrice(subtotal)}
                        </span>
                    </div>

                    {/* Delivery Fee */}
                    {deliveryFee !== null && (
                        <div style={{
                            display: 'flex', alignItems: 'baseline',
                            padding: '3px 0',
                        }}>
                            <span style={{
                                fontSize: 13,
                                fontWeight: 400,
                                color: '#525252',
                            }}>
                                Delivery fee
                            </span>
                            <span style={{
                                flex: 1, margin: '0 6px',
                                borderBottom: '1.5px dotted #d4d4d4',
                                transform: 'translateY(-3px)',
                            }} />
                            <span style={{
                                fontFamily: 'monospace', fontSize: 13,
                                fontWeight: 500, color: '#0a0a0a',
                                fontVariantNumeric: 'tabular-nums',
                            }}>
                                {deliveryFee === 0 ? 'Free' : `$${formatPrice(deliveryFee)}`}
                            </span>
                        </div>
                    )}

                    {/* Tax */}
                    <div style={{
                        display: 'flex', alignItems: 'baseline',
                        padding: '3px 0',
                    }}>
                        <span style={{
                            fontSize: 13,
                            fontWeight: 400,
                            color: '#525252',
                        }}>
                            Tax
                        </span>
                        <span style={{
                            flex: 1, margin: '0 6px',
                            borderBottom: '1.5px dotted #d4d4d4',
                            transform: 'translateY(-3px)',
                        }} />
                        <span style={{
                            fontFamily: 'monospace', fontSize: 13,
                            fontWeight: 500, color: '#0a0a0a',
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            ${formatPrice(tax)}
                        </span>
                    </div>

                    {/* Total */}
                    <div style={{
                        display: 'flex', alignItems: 'baseline',
                        padding: '8px 0 0', marginTop: 4,
                    }}>
                        <span style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#0a0a0a',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                        }}>
                            Total
                        </span>
                        <span style={{
                            flex: 1, margin: '0 6px',
                            borderBottom: '1.5px dotted #d4d4d4',
                            transform: 'translateY(-3px)',
                        }} />
                        <span style={{
                            fontFamily: 'monospace', fontSize: 18,
                            fontWeight: 700, color: primaryColor,
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: -0.2,
                        }}>
                            ${formatPrice(total)}
                        </span>
                    </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#e5e5e5', margin: '14px 0' }} />

                {/* Order details */}
                <div>
                    {isDelivery && order.delivery_address && (
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                            gap: 12, padding: '3px 0', fontSize: 13,
                        }}>
                            <span style={{ color: '#737373' }}>Delivery address</span>
                            <span style={{ color: '#0a0a0a', textAlign: 'right', maxWidth: '70%', fontSize: 13 }}>
                                {typeof order.delivery_address === 'object'
                                    ? `${order.delivery_address.street} ${order.delivery_address.number}${order.delivery_address.floor ? ', ' + order.delivery_address.floor : ''}`
                                    : order.delivery_address}
                            </span>
                        </div>
                    )}
                    {!isDelivery && order.table_number && (
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                            gap: 12, padding: '3px 0', fontSize: 13,
                        }}>
                            <span style={{ color: '#737373' }}>Table</span>
                            <span style={{ color: '#0a0a0a' }}>Table {order.table_number}</span>
                        </div>
                    )}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                        gap: 12, padding: '3px 0', fontSize: 13,
                    }}>
                        <span style={{ color: '#737373' }}>Payment</span>
                        <span style={{ color: '#0a0a0a' }}>{getPaymentDisplay()}</span>
                    </div>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                        gap: 12, padding: '3px 0', fontSize: 13,
                    }}>
                        <span style={{ color: '#737373' }}>Status</span>
                        <span style={{ color: '#0a0a0a' }}>{getStatusText()}</span>
                    </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#e5e5e5', margin: '16px 0' }} />

                {/* Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                        onClick={() => navigate(`/${tenantSlug}`)}
                        style={{
                            width: '100%', height: 46, border: 'none',
                            background: primaryColor, color: '#fff',
                            fontFamily: 'inherit', fontSize: 16, fontWeight: 700,
                            letterSpacing: 0.1, cursor: 'pointer',
                            borderRadius: 2,
                        }}
                    >
                        Back to Home
                    </button>
                    <button
                        onClick={handleReorder}
                        style={{
                            width: '100%', height: 46,
                            background: 'transparent',
                            border: '1px solid #d4d4d4',
                            color: '#0a0a0a',
                            fontFamily: 'inherit', fontSize: 16, fontWeight: 600,
                            cursor: 'pointer',
                            borderRadius: 2,
                        }}
                    >
                        Order Again
                    </button>
                </div>

                {/* Help footer */}
                <div style={{
                    textAlign: 'center',
                    fontSize: 12, color: '#a3a3a3',
                    marginTop: 18,
                }}>
                    ¿Necesitas ayuda?{' '}
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            color: '#525252',
                            textDecoration: 'underline',
                            textUnderlineOffset: 2,
                            fontWeight: 500,
                        }}
                    >
                        WhatsApp
                    </a>
                </div>
            </div>
            </div>
        </>
    )
}

export default OrderStatus
