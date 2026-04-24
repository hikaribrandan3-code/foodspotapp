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

    const queryOrderId = searchParams.get('orderId')
    const orderId = paramOrderId || queryOrderId

    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const primaryColor = tenantData?.primary_color || '#DC2626'

    useEffect(() => {
        const fetchOrder = async () => {
            setLoading(true)
            try {
                if (orderId) {
                    const { data, error: fetchError } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('id', orderId)
                        .single()

                    if (fetchError) throw fetchError
                    setOrder(data)
                } else {
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
                    console.log('Order Updated:', payload.new.status)
                    setOrder(payload.new)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [order?.id])

    const handleReorder = () => {
        if (!order || !order.items) return

        clearCurrentOrder()
        let addedCount = 0
        order.items.forEach(item => {
            addToCurrentOrder(item, item.quantity, item.extras || [], item.variants || [])
            addedCount++
        })

        if (addedCount > 0) {
            if (tenantSlug) {
                window.location.href = `/${tenantSlug}/menu?reorder=true`
            } else {
                window.location.href = `/menu?reorder=true`
            }
        }
    }

    if (loading) {
        return <BurgerLoader />
    }

    if (!order) {
        return <OrderStatusEmpty config={config} featuredItems={featuredItems} />
    }

    const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const isDelivery = order.order_type === 'delivery'
    const whatsappNumber = tenantData?.whatsapp_number || ''
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hola, necesito ayuda con mi pedido #${order.order_number}`

    const orderDate = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const orderTime = new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    const subtotal = order.items?.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0) || 0
    const tax = order.tax || 0.01
    const deliveryFee = isDelivery ? (order.delivery_fee || 0) : null
    const total = order.total || (subtotal + (deliveryFee || 0) + tax)

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
            <div style={{
                background: '#fff',
                minHeight: '100vh',
                padding: '24px 20px',
                paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
            }}>
                <div style={{
                    width: 340,
                    background: '#fff',
                    border: '1px solid #e5e5e5',
                    padding: '24px 22px 20px'
                }}>
                    <div style={{
                        fontSize: 11, color: '#a3a3a3', fontWeight: 400,
                        letterSpacing: 0.2,
                        marginBottom: 6
                    }}>
                        {tenantData?.business_name || 'Foodspot'}
                    </div>

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

                    <div style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: '#737373',
                        fontFamily: 'monospace',
                        fontVariantNumeric: 'tabular-nums'
                    }}>
                        Order #{order.order_number || 'N/A'} · {orderDate} · {orderTime}
                    </div>

                    <div style={{ height: 1, background: '#e5e5e5', margin: '16px 0 14px' }} />

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
                                    ${fmt(item.price || 0)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div style={{ height: 1, background: '#e5e5e5', margin: '14px 0' }} />

                    <div>
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
                                ${fmt(subtotal)}
                            </span>
                        </div>

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
                                    {deliveryFee === 0 ? 'Free' : `$${fmt(deliveryFee)}`}
                                </span>
                            </div>
                        )}

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
                                ${fmt(tax)}
                            </span>
                        </div>

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
                                ${fmt(total)}
                            </span>
                        </div>
                    </div>

                    <div style={{ height: 1, background: '#e5e5e5', margin: '14px 0' }} />

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

                    <div style={{ height: 1, background: '#e5e5e5', margin: '16px 0' }} />

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
