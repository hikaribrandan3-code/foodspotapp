import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { getAuth, clearAuth, getOrders, updateOrder } from '../../utils/storage.js'
import { handleCashPayment } from '../../services/offlinePayment.js'
import { verifyDeliveryCode, getPhoneLast4 } from '../../utils/deliveryUtils.js'
import { updateConfig, CONFIRMATION_COLORS } from '../../config/appConfig.v2.js'
import { canAdvanceOrder } from '../../utils/orderStateGuard.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { useTenant } from '../../contexts/TenantContext.jsx'

/**
 * DELIVERY MANAGER
 * 
 * STRIKE 16 FSM COMPLIANT: All statuses use English enum values.
 * SILO ENFORCED: All Supabase queries filter by business_id.
 * SCHEMA CORRECT: Uses snake_case field names matching Supabase.
 */
function DeliveryManager({ config: configProp, demoMode = false }) {
    const config = configProp || {};
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const { t } = useLanguage()
    const { businessId } = useTenant()
    const [orders, setOrders] = useState([])
    const [deliveryConfirmCode, setDeliveryConfirmCode] = useState({})
    const [paymentMethodSelect, setPaymentMethodSelect] = useState({})

    // 🏢 BUSINESS ID: Extract from config (tenant data) or localStorage fallback
    const businessId = config.businessId || config.business_id || localStorage.getItem('fs_business_id')

    // Fetch orders from Supabase for staff dashboard (real-time, SILO-FILTERED)
    useEffect(() => {
        if (demoMode) {
            setOrders(getOrders())
            return
        }

        if (!businessId) return

        const fetchSupabaseOrders = async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('business_id', businessId) // 🔐 SILO FILTER
                .order('created_at', { ascending: false })
                .limit(50)

            if (!error && data) {
                setOrders(data)
            }
        }

        // Fetch immediately
        fetchSupabaseOrders()

        // Subscribe to real-time changes (SILO-FILTERED)
        const subscription = supabase
            .channel(`delivery-orders-${businessId}`)
            .on(
                'postgres_changes',
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'orders',
                    filter: `business_id=eq.${businessId}` // 🔐 SILO FILTER
                },
                () => {
                    fetchSupabaseOrders()
                }
            )
            .subscribe()

        // Fallback poll every 5s if subscription fails
        const interval = setInterval(fetchSupabaseOrders, 5000)

        return () => {
            clearInterval(interval)
            subscription.unsubscribe()
        }
    }, [demoMode, businessId])

    // 🚀 SILO-AWARE LOGOUT: Redirect to customer-facing view of THIS tenant
    const handleLogout = async () => {
        await supabase.auth.signOut()
        clearAuth()
        window.location.href = demoMode ? '/' : `/${tenantSlug}`
    }

    // Helper for status info — STRIKE 16 ENGLISH FSM
    const getDeliveryStatusInfo = (status) => {
        const statusConfig = {
            pending_payment:    { label: t('pending_payment_status') || 'Pending Payment',    next: 'paid_unreleased',      nextLabel: t('confirm_payment') || 'Confirm Payment →',      class: 'pending-payment',    bg: '#FEF3C7', color: '#B45309' },
            paid_unreleased:    { label: t('paid_unreleased_status') || 'Paid — Unreleased',   next: 'released_to_kitchen',  nextLabel: t('release_kitchen') || 'Release to Kitchen →',   class: 'paid-unreleased',    bg: '#DBEAFE', color: '#1D4ED8' },
            released_to_kitchen:{ label: t('released_status') || 'In Kitchen',               next: 'preparing',            nextLabel: t('start_prep') || 'Start Prep →',                class: 'released',           bg: '#EDE9FE', color: '#7C3AED' },
            preparing:          { label: t('preparing_status') || 'Preparing',                 next: 'ready',                nextLabel: t('mark_ready') || 'Ready →',                      class: 'preparing',          bg: '#F3E8FF', color: '#7C3AED' },
            ready:              { label: t('ready_status') || 'Ready',                         next: 'dispatched',           nextLabel: t('dispatch') || 'Dispatch 🚴',                   class: 'ready',              bg: '#DCFCE7', color: '#15803D' },
            dispatched:         { label: t('dispatched_status') || 'Dispatched',               next: 'delivered',            nextLabel: t('confirm_delivery') || 'Confirm Delivery',       class: 'dispatched',         bg: '#FFEDD5', color: '#9A3412' },
            delivered:          { label: t('delivered_status') || 'Delivered',                 next: null,                   nextLabel: null,                                               class: 'delivered',          bg: '#F1F5F9', color: '#64748B' },
            cancelled:          { label: t('cancelled_status') || 'Cancelled',                 next: null,                   nextLabel: null,                                               class: 'cancelled',          bg: '#FEE2E2', color: '#DC2626' }
        }
        return statusConfig[status] || { label: status, next: null, nextLabel: null, class: '', bg: '#F3F4F6', color: '#6B7280' }
    }

    // Handle status change with centralized payment validation
    const handleDeliveryStatusChange = (orderId, newStatus, order) => {
        // Use centralized payment gate from orderStateGuard.js
        const validation = canAdvanceOrder(order, newStatus, config)
        if (!validation.allowed) {
            alert(validation.reason)
            return
        }
        updateOrder(orderId, { status: newStatus })
        setOrders(getOrders())
    }

    // Handle payment confirmation — writes to Supabase for real orders
    const handlePaymentConfirm = async (orderId) => {
        const method = paymentMethodSelect[orderId] || 'cash'
        const isRealOrder = !demoMode && !orderId.startsWith('demo-')

        if (isRealOrder && businessId) {
            if (method === 'cash') {
                const { data: dbOrder } = await supabase
                    .from('orders')
                    .select('id, total, business_id')
                    .eq('id', orderId)
                    .eq('business_id', businessId) // 🔐 SILO GUARD
                    .single()

                if (dbOrder) {
                    await handleCashPayment({
                        orderId,
                        amountCents: Math.round(dbOrder.total * 100),
                        businessId: dbOrder.business_id,
                        currency: 'ARS'
                    })
                }
            } else {
                // MP already handled by webhook — just confirm on our side
                await supabase
                    .from('orders')
                    .update({ payment_confirmed: true, paid_at: new Date().toISOString() })
                    .eq('id', orderId)
                    .eq('business_id', businessId) // 🔐 SILO GUARD
            }
        }

        updateOrder(orderId, { paymentConfirmed: true, paymentMethod: method })
        setOrders(getOrders())
    }

    // Demo mock orders — STRIKE 16 ENGLISH STATUSES, SNAKE_CASE FIELDS
    const demoOrdersData = [
        // Active Orders
        {
            id: 'demo-1',
            order_type: 'delivery',
            status: 'pending_payment',
            total: 4200,
            customer_name: 'Juan Pérez',
            delivery_address: 'Av. Libertador 2400',
            customer_phone: '1155556666',
            items: [{ name: 'Burger Grub', quantity: 2 }, { name: 'Papas Fritas', quantity: 1 }],
            created_at: new Date().toISOString(),
            payment_confirmed: false,
            payment_method: 'cash',
            order_number: 'D-001'
        },
        {
            id: 'demo-2',
            order_type: 'delivery',
            status: 'dispatched',
            total: 2800,
            customer_name: 'Maria Garcia',
            delivery_address: 'Juramento 1500',
            customer_phone: '1144447777',
            items: [{ name: 'Ensalada Caesar', quantity: 1 }, { name: 'Agua s/gas', quantity: 1 }],
            created_at: new Date(Date.now() - 30 * 60000).toISOString(),
            payment_confirmed: true,
            payment_method: 'transfer',
            order_number: 'D-002'
        },
        // Delivered Orders (History)
        ...Array.from({ length: 10 }).map((_, i) => ({
            id: `demo-hist-${i}`,
            order_type: 'delivery',
            status: 'delivered',
            total: 3500 + (i * 100),
            customer_name: `Cliente Demo ${i + 1}`,
            delivery_address: `Calle Demo ${100 + i}`,
            customer_phone: '1133334444',
            items: [{ name: 'Combo Demo', quantity: 1 }],
            created_at: new Date(Date.now() - (i + 2) * 3600000).toISOString(),
            payment_confirmed: true,
            payment_method: 'mercado_pago',
            delivered_at: new Date().toISOString(),
            order_number: `D-H${i}`
        }))
    ]

    const effectiveOrders = demoMode ? demoOrdersData : orders

    // Filter for active vs completed delivery orders — SNAKE_CASE + ENGLISH
    const deliveryOrders = effectiveOrders.filter(o => 
        o.order_type === 'delivery' && 
        o.status !== 'delivered' && 
        o.status !== 'cancelled'
    )
    const completedOrders = effectiveOrders.filter(o => 
        o.order_type === 'delivery' && 
        (o.status === 'delivered' || o.status === 'cancelled')
    )

    // Today's delivery count — SNAKE_CASE
    const todayDeliveries = effectiveOrders.filter(o => 
        o.order_type === 'delivery' && 
        new Date(o.created_at).toDateString() === new Date().toDateString()
    ).length

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F9FAFB' }}>
            <BackendHeader
                title={demoMode ? t('demo_orders') : t('deliveries')}
                onLogout={handleLogout}
            />

            <div style={{ padding: 16, maxWidth: 800, margin: '0 auto', paddingBottom: 100 }}>
                {/* Business Disclaimers */}
                <div style={{
                    background: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 20,
                    fontSize: 13
                }}>
                    <p style={{ fontWeight: 600, color: '#92400E', marginBottom: 4 }}>⚠️ {t('important_reminders')}</p>
                    <ul style={{ margin: 0, paddingLeft: 16, color: '#92400E' }}>
                        <li>{t('delivery_disclaimer_1')}</li>
                        <li>{t('delivery_disclaimer_2')}</li>
                    </ul>
                </div>

                {deliveryOrders.length === 0 ? (
                    <div style={{
                        background: 'white',
                        borderRadius: 12,
                        border: '1px solid #E5E7EB',
                        padding: 32,
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🚚</div>
                        <p style={{ color: '#6B7280', margin: 0, fontSize: 14 }}>{t('no_active_deliveries')}</p>
                    </div>
                ) : (
                    deliveryOrders.map(order => {
                        const statusInfo = getDeliveryStatusInfo(order.status)
                        return (
                            <div key={order.id} style={{
                                background: 'white',
                                borderRadius: 12,
                                border: '1px solid #E5E7EB',
                                marginBottom: 16,
                                overflow: 'hidden',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ padding: 16, borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>#{order.order_number || order.orderNumber} 🚚</span>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: 20,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        background: statusInfo.bg,
                                        color: statusInfo.color
                                    }}>
                                        {statusInfo.label}
                                    </span>
                                </div>

                                <div style={{ padding: 16 }}>
                                    {/* Customer Info — SNAKE_CASE */}
                                    {(order.customer_name || order.customerInfo) && (
                                        <div style={{ fontSize: 13, color: '#4B5563', marginBottom: 12, background: '#F9FAFB', padding: 12, borderRadius: 10 }}>
                                            <p style={{ margin: 0, fontWeight: 600, color: '#374151' }}>📍 {order.customer_name || order.customerInfo?.name}</p>
                                            <p style={{ margin: '4px 0 0' }}>{order.delivery_address || order.customerInfo?.address}</p>
                                            <p style={{ margin: '4px 0 0', color: '#6B7280' }}>{t('tel_label')}***{getPhoneLast4(order.customer_phone || order.customerInfo?.phone)}</p>
                                        </div>
                                    )}

                                    {/* Order Items */}
                                    <div style={{ fontSize: 14, color: '#374151', marginBottom: 12 }}>
                                        {order.items?.map((item, i) => (
                                            <div key={i} style={{ marginBottom: 4 }}>
                                                <span style={{ fontWeight: 500 }}>{item.quantity}x</span> {item.name}
                                                {item.extras && item.extras.length > 0 && <span style={{ color: '#6B7280', fontSize: 13 }}> (+{item.extras.map(e => e.name).join(', ')})</span>}
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingTop: 12,
                                        borderTop: '1px solid #F3F4F6',
                                        marginTop: 12
                                    }}>
                                        <span style={{ fontSize: 16, fontWeight: 700, color: '#10B981' }}>
                                            ${order.total?.toLocaleString()}
                                        </span>
                                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                                            {new Date(order.created_at || order.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

                                        {/* Payment Section */}
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {!order.payment_confirmed && !order.paymentConfirmed && (
                                                <select
                                                    value={paymentMethodSelect[order.id] || 'cash'}
                                                    onChange={(e) => setPaymentMethodSelect(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                    style={{
                                                        padding: '10px 12px',
                                                        border: '1px solid #E5E7EB',
                                                        borderRadius: 10,
                                                        fontSize: 13,
                                                        background: 'white',
                                                        minWidth: 110
                                                    }}
                                                >
                                                    <option value="cash">💵 {t('cash_short')}.</option>
                                                    <option value="mercado_pago">📱 {t('mp_short')}</option>
                                                </select>
                                            )}
                                            <button
                                                onClick={() => handlePaymentConfirm(order.id)}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    background: (order.payment_confirmed || order.paymentConfirmed) ? '#10B981' : '#F59E0B',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: 8,
                                                    fontWeight: 600,
                                                    fontSize: 13
                                                }}
                                            >
                                                {(order.payment_confirmed || order.paymentConfirmed) 
                                                    ? `${t('paid_label')} (${(order.payment_method || order.paymentMethod) === 'mercado_pago' ? t('mp_short') : t('cash_short')})` 
                                                    : t('confirm_payment')}
                                            </button>
                                        </div>

                                        {/* Delivery Confirmation Code Input — Only for dispatched */}
                                        {order.status === 'dispatched' && (order.customer_phone || order.customerInfo) && (
                                            <div>
                                                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>
                                                    {t('delivery_code_label')}
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength={4}
                                                    placeholder="0000"
                                                    value={deliveryConfirmCode[order.id] || ''}
                                                    onChange={(e) => setDeliveryConfirmCode(prev => ({ ...prev, [order.id]: e.target.value.replace(/\D/g, '') }))}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px',
                                                        border: '1px solid #D1D5DB',
                                                        borderRadius: 10,
                                                        fontSize: 18,
                                                        textAlign: 'center',
                                                        letterSpacing: 4,
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Status Advance Button */}
                                        {statusInfo.next && (
                                            <button
                                                onClick={() => {
                                                    // Phone code verification for delivered
                                                    if (statusInfo.next === 'delivered' && (order.customer_phone || order.customerInfo)) {
                                                        const code = deliveryConfirmCode[order.id] || ''
                                                        if (!verifyDeliveryCode(order.customer_phone || order.customerInfo?.phone, code)) {
                                                            alert(t('wrong_code'))
                                                            return
                                                        }
                                                        updateOrder(order.id, { delivered_at: new Date().toISOString() })
                                                    }
                                                    handleDeliveryStatusChange(order.id, statusInfo.next, order)
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    background: '#3B82F6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: 8,
                                                    fontWeight: 600,
                                                    fontSize: 14,
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                                                }}
                                            >
                                                {statusInfo.nextLabel}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}

                {/* DEMO ONLY: History Section to match Summary Stats */}
                {demoMode && completedOrders.length > 0 && (
                    <div style={{ marginTop: 32 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 12, textTransform: 'uppercase' }}>
                            {t('today_history_demo')}
                        </h3>
                        {completedOrders.map(order => (
                            <div key={order.id} style={{
                                background: 'white',
                                borderRadius: 10,
                                border: '1px solid #E5E7EB',
                                padding: 12,
                                marginBottom: 10,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                opacity: 0.7
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{order.customer_name || order.customerName}</div>
                                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                                        {order.items.length} items · ${order.total.toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{
                                        fontSize: 11,
                                        background: '#F1F5F9',
                                        color: '#64748B',
                                        padding: '2px 8px',
                                        borderRadius: 12
                                    }}>
                                        {t('delivered_status')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Today's delivery summary */}
                <div style={{ textAlign: 'center', marginTop: 24, color: '#9CA3AF', fontSize: 13 }}>
                    <p>{t('processed_today')}<strong style={{ color: '#F97316' }}>{todayDeliveries}</strong></p>
                </div>
            </div>

            {/* Backend Navigation */}
            <BackendNav
                role={demoMode ? 'demo' : 'owner'}
                useRoutes={true}
            />
        </div>
    )
}

export default DeliveryManager
