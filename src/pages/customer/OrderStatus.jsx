import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useLanguage } from '../../contexts/LanguageContext'
import { getGuestToken } from '../../utils/guestToken.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { clearCurrentOrder, addToCurrentOrder } from '../../utils/storage.js'
import { isOrderPaid } from '../../utils/paymentStatus.js'
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

    useEffect(() => {
        if (order?.status === 'delivered') {
            const timer = setTimeout(() => {
                if (tenantSlug) {
                    navigate(`/${tenantSlug}`)
                } else {
                    navigate('/')
                }
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [order?.status, tenantSlug, navigate])

    const handleReorder = () => {
        if (!order || !order.items) return

        clearCurrentOrder()
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

    const subtotal = order.items?.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0) || 0
    const tax = order.tax || 0.01
    const deliveryFee = isDelivery ? (order.delivery_fee || 0) : null
    const total = order.total || (subtotal + (deliveryFee || 0) + tax)

    const getStatusText = () => {
        if (isCashMethod && !paid && order.status !== 'cancelled' && order.status !== 'delivered') {
            return isDelivery ? t('status_awaiting_delivery') : t('status_awaiting_pickup')
        }
        switch (order.status) {
            case 'pending_payment': return t('status_awaiting_confirmation')
            case 'paid_unreleased': return t('status_payment_received')
            case 'released_to_kitchen': return t('status_confirmed')
            case 'preparing': return t('status_preparing')
            case 'ready': return t('status_ready_pickup')
            case 'dispatched': return t('status_on_the_way')
            case 'delivered': return t('status_delivered')
            case 'cancelled': return t('status_cancelled')
            default: return t('status_preparing')
        }
    }

    const getPaymentDisplay = () => {
        if (order.payment_method === 'cash' || order.payment_method === 'efectivo') return t('cash')
        if (order.payment_method === 'card_on_delivery' || order.payment_method === 'tarjeta_envio') return t('card_on_delivery')
        if (order.payment_method === 'mercado_pago') {
            const lastFour = order.mp_card_last4 || '****'
            return t('card_last4').replace('{last4}', lastFour)
        }
        if (order.payment_method === 'pay_at_counter' || order.payment_method === 'dine_in') return t('pay_at_table')
        return order.payment_method || t('cash')
    }

    const isCashMethod = order.payment_method === 'efectivo' || order.payment_method === 'cash'
    const paid = isOrderPaid(order)

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
                    width: '90%',
                    maxWidth: 540,
                    background: '#fff',
                    border: '1px solid #e5e5e5',
                    padding: '40px 32px 32px'
                }}>
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
                        fontWeight: order.status === 'pending_payment' ? 500 : 700,
                        color: order.status === 'cancelled' ? '#dc2626' : order.status === 'pending_payment' ? '#525252' : '#0a0a0a',
                        letterSpacing: -0.8,
                        margin: '8px 0 0'
                    }}>
                        {order.status === 'delivered' ? t('heading_order_delivered')
                            : order.status === 'cancelled' ? t('heading_order_cancelled')
                            : order.status === 'pending_payment' ? t('heading_awaiting_confirmation')
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

                    {order.status === 'cancelled' ? (
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
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                            gap: 12, padding: '3px 0', fontSize: 13,
                        }}>
                            <span style={{ color: '#737373' }}>{t('payment_method')}</span>
                            <span style={{ color: '#0a0a0a' }}>{getPaymentDisplay()}</span>
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button
                            onClick={() => navigate(`/${tenantSlug}`)}
                            style={{
                                width: '100%', height: 50, border: 'none',
                                background: primaryColor, color: '#fff',
                                fontFamily: 'inherit', fontSize: 16, fontWeight: 700,
                                letterSpacing: 0.1, cursor: 'pointer',
                                borderRadius: 2,
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
                                borderRadius: 2,
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
    )
}

export default OrderStatus
