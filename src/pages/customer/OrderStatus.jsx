import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { useCart } from '../../contexts/CartContext.jsx'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { addToCurrentOrder, getScopedGuestToken } from '../../utils/storage.js'
import { isOrderPaid } from '../../utils/paymentStatus.js'
import OrderStatusEmpty from '../../components/OrderStatusEmpty.jsx'
import BurgerLoader from '../../components/BurgerLoader'
import HeaderClamp from '../../components/HeaderClamp.jsx'
import CameraTrigger from '../../components/Camera/CameraTrigger'
import { ORDER_STATUS } from '../../constants/database.js';
import { PAYMENT_METHOD } from '../../constants/database.js';
import mapboxgl from 'mapbox-gl';



function OrderStatus({ config: configProp, featuredItems = [] }) {
    const { clearCart } = useCart()
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
    const mapContainer = useRef(null)
    const map = useRef(null)

    const primaryColor = tenantData?.primary_color || '#DC2626'

    // A/B test variant assignment for camera activation delay (45s, 60s, or 90s for delivery)
    const orderType = order?.order_type || (!order?.delivery_address ? 'takeout' : 'delivery')

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
                    const guestToken = getScopedGuestToken()
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

    useEffect(() => {
        if (order?.status === ORDER_STATUS.DELIVERED || order?.status === ORDER_STATUS.CANCELLED) {
            // 🧹 Clear remembered order once it's done
            if (tenantSlug) {
                localStorage.removeItem(`fs_${tenantSlug}_last_order_id`)
            }
            // Only auto-redirect dine_in orders. Takeout/delivery users get camera activation on 'delivered'.
            if (order?.status === ORDER_STATUS.DELIVERED && order?.order_type === 'dine_in') {
                const timer = setTimeout(() => {
                    if (tenantSlug) {
                        navigate(`/${tenantSlug}`)
                    } else {
                        navigate('/')
                    }
                }, 15000)
                return () => clearTimeout(timer)
            }
        }
    }, [order?.status, tenantSlug, navigate])

    useEffect(() => {
        const isDelivery = order?.order_type === 'delivery'
        const isDispatched = order?.status === ORDER_STATUS.DISPATCHED

        if (!isDelivery || !isDispatched || !mapContainer.current) return

        if (!mapboxgl.accessToken) {
            mapboxgl.accessToken = 'pk.eyJ1IjoiZm9vZHNwb3QiLCJhIjoiY201MDM0OWR6MmI1YTJqbXhqemY1bjdlaCJ9.1p8t9k5m3z5q9w2x5r8u'
        }

        if (map.current) return

        // Use coordinates from order if available, otherwise fallback
        const businessLat = -34.6037
        const businessLng = -58.3816

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [businessLng, businessLat],
            zoom: 14,
        })

        new mapboxgl.Marker({ color: '#22c55e' })
            .setLngLat([businessLng, businessLat])
            .setPopup(new mapboxgl.Popup().setText('Restaurant'))
            .addTo(map.current)

        return () => {
            if (map.current) {
                map.current.remove()
                map.current = null
            }
        }
    }, [order?.status, order?.order_type])

    const handleReorder = () => {
        if (!order || !order.items) return

        clearCart()
        // Re-read after clear to guarantee fresh cart before adding
        let addedCount = 0
        order.items.forEach(item => {
            addToCurrentOrder({ ...item, quantity: 1 }, item.quantity, item.extras || [], item.variants || [])
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
        return <OrderStatusEmpty config={config} featuredItems={featuredItems} tenantSlug={tenantSlug} />
    }

    const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const isDelivery = order.order_type === 'delivery'
    const whatsappNumber = tenantData?.whatsapp_number || ''
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hola, necesito ayuda con mi pedido #${order.order_number}`

    const orderDate = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const orderTime = new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    const calculateETA = () => {
        const distanceKm = order?.distance_km || 0
        const minPerKm = 5
        return Math.ceil(distanceKm * minPerKm)
    }

    const subtotal = order.items?.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0) || 0
    const tax = order.tax || 0.01
    const deliveryFee = isDelivery ? (order.delivery_fee || 0) : null
    const total = order.total || (subtotal + (deliveryFee || 0) + tax)

    const getStatusText = () => {
        if (order.status === ORDER_STATUS.CANCELLED) return t('status_cancelled')
        if (order.status === ORDER_STATUS.DELIVERED) {
            if (order.order_type === 'dine_in' && !paid) return 'Served — Awaiting Payment'
            return order.order_type === 'dine_in' ? 'Served' : t('status_delivered')
        }
        if (order.status === ORDER_STATUS.READY) return isDelivery ? t('status_on_the_way') : t('status_ready_pickup')
        if (order.status === ORDER_STATUS.DISPATCHED) return t('status_on_the_way')
        if (paid) return '✅ ' + t('status_payment_received')
        if (order.order_type === 'dine_in') return 'Preparing'
        return isDelivery ? t('status_awaiting_delivery') : t('status_awaiting_pickup')
    }

    const getPaymentDisplay = () => {
        if (order.payment_method === PAYMENT_METHOD.CASH) return t(PAYMENT_METHOD.CASH)
        if (order.payment_method === PAYMENT_METHOD.CARD_ON_DELIVERY || order.payment_method === PAYMENT_METHOD.CARD_ON_DELIVERY) return t(PAYMENT_METHOD.CARD_ON_DELIVERY)
        if (order.payment_method === PAYMENT_METHOD.MERCADO_PAGO) {
            const lastFour = order.mp_card_last4 || '****'
            return t('card_last4').replace('{last4}', lastFour)
        }
        if (order.payment_method === PAYMENT_METHOD.CASH || order.payment_method === 'dine_in') return t('pay_at_table')
        return order.payment_method || t(PAYMENT_METHOD.CASH)
    }

    const isCashMethod = order.payment_method === PAYMENT_METHOD.CASH
    const paid = isOrderPaid(order)

    return (
      <CameraTrigger orderId={order.id} orderType={orderType} delayMs={1000}>
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
                justifyContent: 'flex-start',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
            }}>
                <div style={{
                    width: '90%',
                    maxWidth: 540,
                    background: '#fff',
                    border: '1px solid #e5e5e5',
                    borderRadius: '2px',
                    padding: '60px 32px 48px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    position: 'relative',
                    overflow: 'visible'
                }}>
                    {/* Top torn edge */}
                    <svg style={{position:'absolute',top:-10,left:0,width:'100%',height:12,display:'block'}} viewBox="0 0 100 12" preserveAspectRatio="none">
                        <path d="M0,12 L5,0 L10,12 L15,0 L20,12 L25,0 L30,12 L35,0 L40,12 L45,0 L50,12 L55,0 L60,12 L65,0 L70,12 L75,0 L80,12 L85,0 L90,12 L95,0 L100,12" fill="#fff" stroke="#999" strokeWidth="0.8"/>
                    </svg>

                    {/* Bottom torn edge */}
                    <svg style={{position:'absolute',bottom:-10,left:0,width:'100%',height:12,display:'block'}} viewBox="0 0 100 12" preserveAspectRatio="none">
                        <path d="M0,0 L5,12 L10,0 L15,12 L20,0 L25,12 L30,0 L35,12 L40,0 L45,12 L50,0 L55,12 L60,0 L65,12 L70,0 L75,12 L80,0 L85,12 L90,0 L95,12 L100,0" fill="#fff" stroke="#999" strokeWidth="0.8"/>
                    </svg>
                    <div style={{
                        fontSize: 12, color: '#a3a3a3', fontWeight: 500,
                        letterSpacing: 0.3,
                        marginBottom: 8
                    }}>
                        {tenantData?.business_name || 'Foodspot'}
                    </div>

                    <h1 style={{
                        fontSize: 32,
                        lineHeight: 1.1,
                        fontWeight: 700,
                        color: order.status === ORDER_STATUS.CANCELLED ? '#dc2626' : '#0a0a0a',
                        letterSpacing: -0.8,
                        margin: '8px 0 0'
                    }}>
                        {order.status === ORDER_STATUS.DELIVERED ? (order.order_type === 'dine_in' ? 'Order Served' : t('heading_order_delivered'))
                            : order.status === ORDER_STATUS.CANCELLED ? t('heading_order_cancelled')
                            : order.status === ORDER_STATUS.READY ? (isDelivery ? t('status_on_the_way') : t('status_ready_pickup'))
                            : order.status === ORDER_STATUS.DISPATCHED ? t('status_on_the_way')
                            : order.status === 'released_to_kitchen' ? 'Prepping! 👨‍🍳'
                            : isCashMethod && !paid ? t('heading_confirmed_unpaid')
                            : t('heading_order_confirmed')}
                    </h1>

                    <div style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: '#737373',
                        fontFamily: 'monospace',
                        fontVariantNumeric: 'tabular-nums'
                    }}>
                        {t('order_number')} {order.order_number || 'N/A'} · {orderDate} · {orderTime}
                    </div>

                    <div style={{ height: 1, background: '#e5e5e5', margin: '18px 0 16px' }} />

                    {order.status === ORDER_STATUS.CANCELLED ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#dc2626', fontSize: 14 }}>
                            This order has been cancelled and cannot be completed.
                        </div>
                    ) : !paid && !isCashMethod ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#737373', fontSize: 14 }}>
                            Completing payment... your receipt will appear here.
                        </div>
                    ) : (
                        <>
                            <div>
                                {order.items?.map((item, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex', alignItems: 'baseline', gap: 8,
                                        padding: '6px 0',
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

                            <div style={{ height: 1, background: '#e5e5e5', margin: '16px 0' }} />

                    <div>
                        <div style={{
                            display: 'flex', alignItems: 'baseline',
                            padding: '4px 0', marginTop: 0,
                        }}>
                            <span style={{
                                fontSize: 13,
                                fontWeight: 400,
                                color: '#525252',
                            }}>
                                {t('subtotal')}
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
                                    {t('shipping')}
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
                                    {deliveryFee === 0 ? t('free_label') : `$${fmt(deliveryFee)}`}
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
                                {t('tax')}
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
                                {t('total')}
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

                    <div style={{ height: 1, background: '#e5e5e5', margin: '16px 0' }} />

                    <div>
                        {isDelivery && order.delivery_address && (
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                                gap: 12, padding: '3px 0', fontSize: 13,
                            }}>
                                <span style={{ color: '#737373' }}>{t('delivery_address')}</span>
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
                                <span style={{ color: '#737373' }}>{t('table')}</span>
                                <span style={{ color: '#0a0a0a' }}>{t('table')} {order.table_number}</span>
                            </div>
                        )}
                        {order.notes && (
                            <div style={{
                                padding: '8px 10px', marginTop: 6, marginBottom: 2,
                                background: '#f5f5f5', borderRadius: 4, fontSize: 13,
                            }}>
                                <span style={{ color: '#737373', fontWeight: 500 }}>📝 Special Requests: </span>
                                <span style={{ color: '#0a0a0a' }}>{order.notes}</span>
                            </div>
                        )}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                            gap: 12, padding: '3px 0', fontSize: 13,
                        }}>
                            <span style={{ color: '#737373' }}>{t('payment_method')}</span>
                            <span style={{ color: '#0a0a0a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {getPaymentDisplay()}
                                {paid && (
                                    <span style={{
                                        background: '#DCFCE7', color: '#16A34A',
                                        fontSize: 11, fontWeight: 700,
                                        padding: '2px 8px', borderRadius: 4,
                                        letterSpacing: 0.3
                                    }}>PAID ✓</span>
                                )}
                            </span>
                        </div>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                            gap: 12, padding: '3px 0', fontSize: 13,
                        }}>
                            <span style={{ color: '#737373' }}>{t('status')}</span>
                            <span style={{ color: '#0a0a0a' }}>{getStatusText()}</span>
                        </div>
                    </div>
                        </>
                    )}

                    <div style={{ height: 1, background: '#e5e5e5', margin: '16px 0' }} />

                    {isDelivery && order.status === ORDER_STATUS.DISPATCHED && (
                        <>
                            <div style={{
                                background: '#fef8f0',
                                border: '1px solid #fed7aa',
                                borderRadius: 8,
                                padding: 16,
                                marginBottom: 16
                            }}>
                                <div style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#b45309',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    marginBottom: 8
                                }}>
                                    🚴 On the Way
                                </div>
                                <div style={{
                                    fontSize: 24,
                                    fontWeight: 700,
                                    color: '#0a0a0a',
                                    marginBottom: 12
                                }}>
                                    {calculateETA()} min
                                </div>
                                <div style={{
                                    fontSize: 13,
                                    color: '#737373',
                                    marginBottom: 12
                                }}>
                                    {order?.distance_km?.toFixed(1)} km · Driver is on the way
                                </div>
                                {!paid && (
                                    <div style={{
                                        display: 'inline-block',
                                        background: '#fee2e2',
                                        color: '#b91c1c',
                                        padding: '6px 10px',
                                        borderRadius: 4,
                                        fontSize: 12,
                                        fontWeight: 600
                                    }}>
                                        💳 Payment pending at door
                                    </div>
                                )}
                            </div>
                            <div
                                ref={mapContainer}
                                style={{
                                    width: '100%',
                                    height: 300,
                                    borderRadius: 8,
                                    marginBottom: 16,
                                    border: '1px solid #e5e5e5',
                                    overflow: 'hidden'
                                }}
                            />
                        </>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button
                            onClick={() => navigate(`/${tenantSlug}`)}
                            style={{
                                width: '100%', height: 50, border: 'none',
                                background: primaryColor, color: '#fff',
                                fontFamily: 'inherit', fontSize: 16, fontWeight: 700,
                                letterSpacing: 0.1, cursor: 'pointer',
                                borderRadius: 6,
                            }}
                        >
                            {t('back_to_home')}
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
                                borderRadius: 6,
                            }}
                        >
                            {t('order_again')}
                        </button>
                    </div>

                    <div style={{
                        textAlign: 'center',
                        fontSize: 12, color: '#a3a3a3',
                        marginTop: 18,
                    }}>
                        {t('need_help')}{' '}
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
      </CameraTrigger>
    )
}

export default OrderStatus
