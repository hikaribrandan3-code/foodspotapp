import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { getAuth, clearAuth, getOrders, updateOrder } from '../../utils/storage.js'
import { verifyDeliveryCode, getPhoneLast4 } from '../../utils/deliveryUtils.js'
import { updateConfig, CONFIRMATION_COLORS } from '../../config/appConfig.v2.js'
import { canAdvanceOrder } from '../../utils/orderStateGuard.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'

/**
 * DELIVERY MANAGER
 * 
 * ARCHITECTURAL INVARIANT: Config MUST come from props, NOT getConfig().
 * Payment gate logic MUST use canAdvanceOrder() from orderStateGuard.js.
 */
function DeliveryManager({ config: configProp }) {
    const config = configProp || {};
    const navigate = useNavigate()
    const { tenantSlug } = useParams() // 🏢 Get tenant from URL for logout redirect
    const { t } = useLanguage()
    const [orders, setOrders] = useState(() => getOrders())
    const [deliveryConfirmCode, setDeliveryConfirmCode] = useState({})
    const [paymentMethodSelect, setPaymentMethodSelect] = useState({})

    // NOTE: Auth check removed - ProtectedRoute handles authentication

    // Poll for order updates
    useEffect(() => {
        const interval = setInterval(() => {
            setOrders(getOrders())
        }, 5000)
        return () => clearInterval(interval)
    }, [])

    // 🚀 SILO-AWARE LOGOUT: Redirect to customer-facing view of THIS tenant
    const handleLogout = async () => {
        await supabase.auth.signOut()
        clearAuth()
        window.location.href = `/${tenantSlug}`
    }

    // Helper for status info (reusing Staff logic)
    const getDeliveryStatusInfo = (status) => {
        const statusConfig = {
            pendiente: { label: t('pendent_status'), next: 'confirmado', nextLabel: t('confirm_action'), class: 'pending', bg: '#FEF3C7', color: '#B45309' },
            confirmado: { label: t('confirmed_status'), next: 'preparacion', nextLabel: t('to_kitchen_action'), class: 'confirmed', bg: '#DBEAFE', color: '#1D4ED8' },
            preparacion: { label: t('preparing_status'), next: 'listo', nextLabel: t('ready_action'), class: 'preparing', bg: '#EDE9FE', color: '#7C3AED' },
            listo: { label: t('ready_status'), next: 'en_camino', nextLabel: t('dispatch_action'), class: 'ready', bg: '#DCFCE7', color: '#15803D' },
            en_camino: { label: t('on_way_status'), next: 'entregado', nextLabel: t('delivered_action'), class: 'on-way', bg: '#FFEDD5', color: '#9A3412' },
            entregado: { label: t('delivered_status'), bg: '#F1F5F9', color: '#64748B' }
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

    // Handle payment confirmation
    const handlePaymentConfirm = (orderId) => {
        const method = paymentMethodSelect[orderId] || 'cash'
        updateOrder(orderId, { paymentConfirmed: true, paymentMethod: method })
        setOrders(getOrders())
    }

    // Demo mock orders - Total 12 orders (2 active + 10 delivered)
    const demoOrdersData = [
        // Active Orders
        {
            id: 'demo-1',
            orderType: 'delivery',
            status: 'pendiente',
            total: 4200,
            customerName: 'Juan Pérez',
            address: 'Av. Libertador 2400',
            phone: '1155556666',
            items: [{ name: 'Burger Grub', quantity: 2 }, { name: 'Papas Fritas', quantity: 1 }],
            createdAt: new Date().toISOString(),
            paymentConfirmed: false,
            paymentMethod: 'cash'
        },
        {
            id: 'demo-2',
            orderType: 'delivery',
            status: 'en_camino',
            total: 2800,
            customerName: 'Maria Garcia',
            address: 'Juramento 1500',
            phone: '1144447777',
            items: [{ name: 'Ensalada Caesar', quantity: 1 }, { name: 'Agua s/gas', quantity: 1 }],
            createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
            paymentConfirmed: true,
            paymentMethod: 'transfer'
        },
        // Delivered Orders (History)
        ...Array.from({ length: 10 }).map((_, i) => ({
            id: `demo-hist-${i}`,
            orderType: 'delivery',
            status: 'entregado',
            total: 3500 + (i * 100),
            customerName: `Cliente Demo ${i + 1}`,
            address: `Calle Demo ${100 + i}`,
            phone: '1133334444',
            items: [{ name: 'Combo Demo', quantity: 1 }],
            createdAt: new Date(Date.now() - (i + 2) * 3600000).toISOString(),
            paymentConfirmed: true,
            paymentMethod: 'mercado_pago',
            deliveryConfirmedAt: new Date().toISOString()
        }))
    ]

    const effectiveOrders = orders

    // Filter for active vs completed delivery orders
    const deliveryOrders = effectiveOrders.filter(o => o.orderType === 'delivery' && o.status !== 'entregado' && o.status !== 'cancelado')
    const completedOrders = effectiveOrders.filter(o => o.orderType === 'delivery' && (o.status === 'entregado' || o.status === 'cancelado'))

    // Today's delivery count
    const todayDeliveries = effectiveOrders.filter(o => o.orderType === 'delivery' && new Date(o.createdAt).toDateString() === new Date().toDateString()).length

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F9FAFB' }}>
            <BackendHeader
                title={t('deliveries')}
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
                                    <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>#{order.orderNumber} 🚚</span>
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
                                    {/* Customer Info */}
                                    {order.customerInfo && (
                                        <div style={{ fontSize: 13, color: '#4B5563', marginBottom: 12, background: '#F9FAFB', padding: 12, borderRadius: 10 }}>
                                            <p style={{ margin: 0, fontWeight: 600, color: '#374151' }}>📍 {order.customerInfo.name}</p>
                                            <p style={{ margin: '4px 0 0' }}>{order.customerInfo.address}</p>
                                            <p style={{ margin: '4px 0 0', color: '#6B7280' }}>{t('tel_label')}***{getPhoneLast4(order.customerInfo.phone)}</p>
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
                                            {new Date(order.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

                                        {/* Payment Section */}
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {!order.paymentConfirmed && (
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
                                                    background: order.paymentConfirmed ? '#10B981' : '#F59E0B',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: 8,
                                                    fontWeight: 600,
                                                    fontSize: 13
                                                }}
                                            >
                                                {order.paymentConfirmed ? `${t('paid_label')} (${order.paymentMethod === 'mercado_pago' ? t('mp_short') : t('cash_short')})` : t('confirm_payment')}
                                            </button>
                                        </div>

                                        {/* Delivery Confirmation Code Input - Only for en_camino */}
                                        {order.status === 'en_camino' && order.customerInfo && (
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
                                                    // Phone code verification for entregado
                                                    if (statusInfo.next === 'entregado' && order.customerInfo) {
                                                        const code = deliveryConfirmCode[order.id] || ''
                                                        if (!verifyDeliveryCode(order.customerInfo.phone, code)) {
                                                            alert(t('wrong_code'))
                                                            return
                                                        }
                                                        updateOrder(order.id, { deliveryConfirmedAt: new Date().toISOString() })
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

                {/* Today's delivery summary */}
                <div style={{ textAlign: 'center', marginTop: 24, color: '#9CA3AF', fontSize: 13 }}>
                    <p>{t('processed_today')}<strong style={{ color: '#F97316' }}>{todayDeliveries}</strong></p>
                </div>
            </div>

            {/* Backend Navigation */}
            <BackendNav
                role="owner"
                useRoutes={true}
            />
        </div>
    )
}

export default DeliveryManager
