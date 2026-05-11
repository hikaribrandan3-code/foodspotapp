import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../config/menuData.js'
import { getAuth, clearAuth, getOrders, updateOrder } from '../../utils/storage.js'
import { handleCashPayment } from '../../services/offlinePayment.js'
import { canAdvanceOrder } from '../../utils/orderStateGuard.js'
import { isOrderPaid } from '../../utils/paymentStatus.js'
// Delivery utils removed — verification code flow stripped for all order types
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { useTenant } from '../../contexts/TenantContext.jsx'
import BurgerLoader from '../../components/BurgerLoader'
import { ORDER_STATUS } from '../../constants/database.js';


// ============================================
// 🎯 OWNER ORDERS — KANBAN DASHBOARD
// Mimics StaffDashboard for visual consistency
// ============================================

// 🔄 FSM STATUS PIPELINE
const STATUS_PIPELINE = [
    { id: ORDER_STATUS.PENDING_PAYMENT,    label: 'Esperando Pago',    color: '#F59E0B', bg: '#FEF3C7' },
    { id: ORDER_STATUS.PAID_UNRELEASED,    label: 'Pago Recibido',     color: '#8B5CF6', bg: '#EDE9FE' },
    { id: ORDER_STATUS.RELEASED_TO_KITCHEN, label: 'Recibido',         color: '#C4856A', bg: '#C4856A22' },
    { id: ORDER_STATUS.PREPARING,          label: 'En Cocina',         color: '#F97316', bg: '#FFF7ED' },
    { id: ORDER_STATUS.READY,              label: 'Listo',             color: '#06B6D4', bg: '#CFFAFE' },
    { id: ORDER_STATUS.DISPATCHED,         label: 'En Camino',         color: '#6366F1', bg: '#E0E7FF' },
    { id: ORDER_STATUS.DELIVERED,          label: 'Entregado',         color: '#22C55E', bg: '#DCFCE7' },
    { id: ORDER_STATUS.CANCELLED,          label: 'Cancelado',         color: '#DC2626', bg: '#FEE2E2' }
]

const getStatusConfig = (status) => STATUS_PIPELINE.find(s => s.id === status) || { label: status, color: '#9CA3AF', bg: '#F3F4F6' }

// 🛡️ OWNER ACTION BUTTONS
const getActionForStatus = (status, orderType, paymentConfirmed) => {
    switch (status) {
        case ORDER_STATUS.PENDING_PAYMENT:
            return paymentConfirmed ? null : { label: 'CONFIRMAR PAGO', action: 'confirm_payment', color: '#22C55E' }

        case ORDER_STATUS.PAID_UNRELEASED:
            return paymentConfirmed
                ? { label: 'ACEPTAR PEDIDO', action: 'advance', targetStatus: ORDER_STATUS.RELEASED_TO_KITCHEN, color: '#22C55E' }
                : { label: 'CONFIRMAR PAGO', action: 'confirm_and_release', targetStatus: ORDER_STATUS.RELEASED_TO_KITCHEN, color: '#22C55E' }

        case ORDER_STATUS.RELEASED_TO_KITCHEN:
            return { label: 'ENVIAR A COCINA', action: 'advance', targetStatus: ORDER_STATUS.PREPARING, color: '#F97316' }

        case ORDER_STATUS.PREPARING:
            return { label: 'MARCAR LISTO', action: 'advance', targetStatus: ORDER_STATUS.READY, color: '#06B6D4' }

        case ORDER_STATUS.READY:
            if (orderType === 'delivery') {
                return { label: 'DESPACHAR', action: 'advance', targetStatus: ORDER_STATUS.DISPATCHED, color: '#6366F1' }
            } else {
                return { label: 'ENTREGAR', action: 'advance', targetStatus: ORDER_STATUS.DELIVERED, color: '#22C55E' }
            }

        case ORDER_STATUS.DISPATCHED:
            return { label: 'CONFIRMAR ENTREGA', action: 'advance', targetStatus: ORDER_STATUS.DELIVERED, color: '#22C55E' }

        default:
            return null
    }
}

function DeliveryManager({ config: configProp, demoMode = false }) {
    const config = configProp || {}
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const { t } = useLanguage()
    const { businessId } = useTenant()

    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(!demoMode)
    const [activeTab, setActiveTab] = useState('active')
    const [processingOrderId, setProcessingOrderId] = useState(null)
    const [errorMessage, setErrorMessage] = useState(null)
    const [paymentMethodSelect, setPaymentMethodSelect] = useState({})
    // deliveryConfirmCode state removed — no verification code gate

    // ============================================
    // 📡 FETCH ORDERS
    // ============================================
    useEffect(() => {
        if (demoMode) {
            setOrders(getOrders())
            setLoading(false)
            return
        }

        if (!businessId) return

        const fetchSupabaseOrders = async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*, owner_status')
                .eq('business_id', businessId)
                .order('created_at', { ascending: false })
                .limit(50)

            if (!error && data) {
                setOrders(data)
            }
            setLoading(false)
        }

        fetchSupabaseOrders()
        const interval = setInterval(fetchSupabaseOrders, 5000)
        return () => clearInterval(interval)
    }, [demoMode, businessId])

    // ============================================
    // 🗂️ FILTERS
    // ============================================
    const ACTIVE_STATUSES = [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.PAID_UNRELEASED, ORDER_STATUS.RELEASED_TO_KITCHEN, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.DISPATCHED]
    const TERMINAL_STATUSES = [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED]

    const filteredOrders = useMemo(() => {
        if (activeTab === 'active') {
            return orders.filter(o => ACTIVE_STATUSES.includes(o.status))
        } else {
            return orders.filter(o => TERMINAL_STATUSES.includes(o.status))
        }
    }, [orders, activeTab])

    const ordersByStatus = useMemo(() => {
        const groups = {}
        ACTIVE_STATUSES.forEach(s => { groups[s] = [] })
        filteredOrders.forEach(order => {
            if (groups[order.status]) groups[order.status].push(order)
        })
        return groups
    }, [filteredOrders])

    const kanbanColumns = STATUS_PIPELINE.filter(s => ACTIVE_STATUSES.includes(s.id))

    const stats = useMemo(() => ({
        active: orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length,
        completed: orders.filter(o => o.status === ORDER_STATUS.DELIVERED).length
    }), [orders])

    // ============================================
    // 🔄 ACTIONS
    // ============================================
    const handlePaymentConfirm = async (orderId) => {
        const method = paymentMethodSelect[orderId] || 'cash'
        const isRealOrder = !demoMode && !orderId.startsWith('demo-')

        if (isRealOrder && businessId) {
            if (method === 'cash') {
                const { data: dbOrder } = await supabase
                    .from('orders')
                    .select('id, total, business_id')
                    .eq('id', orderId)
                    .eq('business_id', businessId)
                    .maybeSingle()

                if (dbOrder) {
                    await handleCashPayment({
                        orderId,
                        amountCents: Math.round(dbOrder.total * 100),
                        businessId: dbOrder.business_id,
                        currency: 'ARS'
                    })
                }
            }
            await supabase
                .from('orders')
                .update({ payment_confirmed: true, payment_status: 'paid', paid_at: new Date().toISOString(), status: 'released_to_kitchen' })
                .eq('id', orderId)
                .eq('business_id', businessId)
        }

        updateOrder(orderId, { paymentConfirmed: true, paymentMethod: method })
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_confirmed: true } : o))
    }

    const handleConfirmAndRelease = async (order, targetStatus) => {
        if (processingOrderId) return
        setProcessingOrderId(order.id)

        // Step 1: Confirm payment
        const method = paymentMethodSelect[order.id] || 'cash'
        const isRealOrder = !demoMode && !order.id.startsWith('demo-')

        if (isRealOrder && businessId) {
            if (method === 'cash') {
                const { data: dbOrder } = await supabase
                    .from('orders')
                    .select('id, total, business_id')
                    .eq('id', order.id)
                    .eq('business_id', businessId)
                    .maybeSingle()

                if (dbOrder) {
                    await handleCashPayment({
                        orderId: order.id,
                        amountCents: Math.round(dbOrder.total * 100),
                        businessId: dbOrder.business_id,
                        currency: 'ARS'
                    })
                }
            }
            await supabase
                .from('orders')
                .update({ payment_confirmed: true, paid_at: new Date().toISOString() })
                .eq('id', order.id)
                .eq('business_id', businessId)
        }

        updateOrder(order.id, { paymentConfirmed: true, paymentMethod: method })
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, payment_confirmed: true } : o))

        // Step 2: Advance to target status (released_to_kitchen)
        const validation = canAdvanceOrder({ ...order, payment_confirmed: true }, targetStatus, config)
        if (!validation.allowed) {
            alert(validation.reason)
            setProcessingOrderId(null)
            return
        }

        if (isRealOrder && businessId) {
            const { data, error } = await supabase.rpc('advance_order_status', {
                p_order_id: order.id,
                p_target_status: targetStatus
            })

            if (error) {
                console.error('RPC Error:', error)
                alert('Error al actualizar pedido')
                setProcessingOrderId(null)
                return
            }

            if (data && !data.success) {
                console.warn('FSM Rejection:', data.error, data.message)
                alert(data.message || 'Error en transición')
                setProcessingOrderId(null)
                return
            }
        }

        updateOrder(order.id, { status: targetStatus })
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: targetStatus, owner_status: targetStatus, payment_confirmed: true } : o))
        setProcessingOrderId(null)
    }

    const handleAdvance = async (order, targetStatus) => {
        if (processingOrderId) return
        setProcessingOrderId(order.id)

        const validation = canAdvanceOrder(order, targetStatus, config)
        if (!validation.allowed) {
            alert(validation.reason)
            setProcessingOrderId(null)
            return
        }

        const isRealOrder = !demoMode && !order.id.startsWith('demo-')
        if (isRealOrder && businessId) {
            const { data, error } = await supabase.rpc('advance_order_status', {
                p_order_id: order.id,
                p_target_status: targetStatus
            })

            if (error) {
                console.error('RPC Error:', error)
                alert('Error al actualizar pedido')
                setProcessingOrderId(null)
                return
            }

            if (data && !data.success) {
                console.warn('FSM Rejection:', data.error, data.message)
                alert(data.message || 'Error en transición')
                setProcessingOrderId(null)
                return
            }
        }

        updateOrder(order.id, { status: targetStatus })
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: targetStatus, owner_status: targetStatus } : o))
        setProcessingOrderId(null)
    }

    const handleCancel = async (orderId) => {
        if (!confirm('¿Cancelar este pedido?')) return
        setProcessingOrderId(orderId)

        const isRealOrder = !demoMode && !orderId.startsWith('demo-')
        if (isRealOrder && businessId) {
            await supabase
                .from('orders')
                .update({ status: ORDER_STATUS.CANCELLED })
                .eq('id', orderId)
                .eq('business_id', businessId)
        }

        updateOrder(orderId, { status: ORDER_STATUS.CANCELLED })
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: ORDER_STATUS.CANCELLED } : o))
        setProcessingOrderId(null)
    }

    // ============================================
    // 🚀 LOGOUT
    // ============================================
    const handleLogout = async () => {
        await supabase.auth.signOut()
        clearAuth()
        window.location.href = demoMode ? '/' : `/${tenantSlug}`
    }

    // ============================================
    // RENDER
    // ============================================
    if (loading) return <BurgerLoader />

    return (
        <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            <BackendHeader title={demoMode ? t('demo_orders') : 'Pedidos'} onLogout={handleLogout} />

            {/* Error Toast */}
            {errorMessage && (
                <div style={{
                    position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
                    background: '#DC2626', color: 'white', padding: '12px 24px', borderRadius: 12,
                    fontWeight: 600, fontSize: 14, zIndex: 999,
                    boxShadow: '0 8px 25px rgba(220,38,38,0.4)'
                }}>
                    {errorMessage}
                </div>
            )}

            {/* Tabs */}
            <div style={{ padding: '16px 24px 0', display: 'flex', gap: 8 }}>
                <button onClick={() => setActiveTab('active')} style={{
                    padding: '10px 20px',
                    background: activeTab === 'active' ? '#111827' : '#FFFFFF',
                    color: activeTab === 'active' ? 'white' : '#4B5563',
                    border: '1px solid ' + (activeTab === 'active' ? '#111827' : '#E5E7EB'),
                    borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    boxShadow: activeTab === 'active' ? '0 4px 12px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    🔥 Activos ({stats.active})
                </button>
                <button onClick={() => setActiveTab('completed')} style={{
                    padding: '10px 20px',
                    background: activeTab === 'completed' ? '#111827' : '#FFFFFF',
                    color: activeTab === 'completed' ? 'white' : '#4B5563',
                    border: '1px solid ' + (activeTab === 'completed' ? '#111827' : '#E5E7EB'),
                    borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    boxShadow: activeTab === 'completed' ? '0 4px 12px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    ✅ Completados ({stats.completed})
                </button>
            </div>

            {/* KANBAN — Active Orders */}
            {activeTab === 'active' && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: window.innerWidth < 768 ? '1fr' : `repeat(${kanbanColumns.length}, 1fr)`,
                    gap: 16, padding: '16px 24px', minHeight: 'calc(100vh - 200px)', overflowX: 'auto'
                }}>
                    {kanbanColumns.map(status => (
                        <div key={status.id} style={{
                            background: '#F3F4F6', borderRadius: 16, padding: 16,
                            display: 'flex', flexDirection: 'column', minWidth: 260,
                            borderTop: `4px solid ${status.color}`, border: '1px solid #E5E7EB'
                        }}>
                            {/* Column Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: status.color, textTransform: 'uppercase' }}>
                                    {status.label}
                                </span>
                                <span style={{ background: status.bg, color: status.color, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                    {ordersByStatus[status.id]?.length || 0}
                                </span>
                            </div>

                            {/* Cards */}
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {(ordersByStatus[status.id] || []).map(order => {
                                    const action = getActionForStatus(order.status, order.order_type, order.payment_confirmed || order.paymentConfirmed)
                                    const isProcessing = processingOrderId === order.id
                                    const isPaid = isOrderPaid(order)

                                    return (
                                        <div key={order.id} style={{
                                            background: '#FFFFFF', borderRadius: 12, padding: 16,
                                            borderLeft: `4px solid ${status.color}`,
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                        }}>
                                            {/* Header: Order # + Time */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
                                                    #{String(order.order_number || order.orderNumber || order.id.slice(-4)).padStart(3, '0')}
                                                </span>
                                                <span style={{ fontSize: 12, color: '#6B7280' }}>
                                                    {new Date(order.created_at || order.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            {/* Items */}
                                            <div style={{ fontSize: 13, color: '#4B5563', marginBottom: 12 }}>
                                                {(order.items || []).slice(0, 3).map((item, i) => (
                                                    <div key={i}>{item.quantity}x {item.name}</div>
                                                ))}
                                                {(order.items?.length || 0) > 3 && (
                                                    <div style={{ color: '#9CA3AF', fontStyle: 'italic' }}>+{order.items.length - 3} más...</div>
                                                )}
                                            </div>

                                            {/* Customer */}
                                            {(order.customer_name || order.customerInfo?.name) && (
                                                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                                                    👤 <span style={{ fontWeight: 500, color: '#374151' }}>
                                                        {order.customer_name || order.customerInfo?.name}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Type + Total + Payment */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                                                <span style={{
                                                    background: order.order_type === 'delivery' ? '#3B82F6' : '#10B981',
                                                    color: 'white', padding: '2px 8px', borderRadius: 6,
                                                    fontSize: 11, fontWeight: 600
                                                }}>
                                                    {order.order_type === 'delivery' ? 'Delivery' : 'Take Out'}
                                                </span>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: status.color }}>
                                                    {formatPrice(order.total)}
                                                </span>
                                                <span style={{
                                                    background: isPaid ? '#DCFCE7' : '#FEF3C7',
                                                    color: isPaid ? '#15803D' : '#B45309',
                                                    padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600
                                                }}>
                                                    {isPaid ? 'Paid' : 'Pending'}
                                                </span>
                                            </div>

                                            {/* Payment Controls (owner only, pending cash) */}
                                            {order.status === ORDER_STATUS.PENDING_PAYMENT && !isPaid && (
                                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                                    <select
                                                        value={paymentMethodSelect[order.id] || 'cash'}
                                                        onChange={(e) => setPaymentMethodSelect(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                        style={{ padding: '8px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, background: 'white', minWidth: 100 }}
                                                    >
                                                        <option value="cash">Cash</option>
                                                        <option value="mercado_pago">📱 MP</option>
                                                    </select>
                                                    <button
                                                        onClick={() => handlePaymentConfirm(order.id)}
                                                        disabled={isProcessing}
                                                        style={{
                                                            flex: 1, padding: '8px 12px', background: '#F59E0B', color: 'white',
                                                            border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Confirmar
                                                    </button>
                                                </div>
                                            )}

                                            {/* Action Row — no verification code gate */}
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {action ? (
                                                    <button
                                                        onClick={() => {
                                                            if (action.action === 'confirm_payment') {
                                                                handlePaymentConfirm(order.id)
                                                            } else if (action.action === 'confirm_and_release') {
                                                                handleConfirmAndRelease(order, action.targetStatus)
                                                            } else if (action.action === 'advance') {
                                                                handleAdvance(order, action.targetStatus)
                                                            }
                                                        }}
                                                        disabled={isProcessing}
                                                        style={{
                                                            flex: 1, padding: '10px 14px',
                                                            background: isProcessing ? '#4B5563' : action.color,
                                                            color: 'white', border: 'none', borderRadius: 8,
                                                            fontWeight: 700, fontSize: 13,
                                                            cursor: isProcessing ? 'wait' : 'pointer',
                                                            opacity: isProcessing ? 0.6 : 1,
                                                            boxShadow: `0 2px 12px ${action.color}33`
                                                        }}
                                                    >
                                                        {isProcessing ? '⏳...' : action.label}
                                                    </button>
                                                ) : (
                                                    <div style={{
                                                        flex: 1, padding: '10px 14px', background: '#F9FAFB',
                                                        border: '1px dashed #D1D5DB', borderRadius: 8,
                                                        fontSize: 12, color: '#6B7280', textAlign: 'center', fontWeight: 500
                                                    }}>
                                                        {isPaid ? 'Pago confirmado' : 'Esperando pago'}
                                                    </div>
                                                )}

                                                {/* Cancel */}
                                                <button
                                                    onClick={() => handleCancel(order.id)}
                                                    disabled={isProcessing}
                                                    style={{
                                                        padding: '10px 12px', background: '#FEE2E2', color: '#DC2626',
                                                        border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13,
                                                        cursor: 'pointer', opacity: isProcessing ? 0.6 : 1
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}

                                {/* Empty State */}
                                {(!ordersByStatus[status.id] || ordersByStatus[status.id].length === 0) && (
                                    <div style={{ textAlign: 'center', padding: 32, color: '#6B7280', fontSize: 14 }}>
                                        Sin pedidos
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* COMPLETED LIST */}
            {activeTab === 'completed' && (
                <div style={{ padding: 24 }}>
                    <div style={{ display: 'grid', gap: 12 }}>
                        {filteredOrders.map(order => {
                            const statusConf = getStatusConfig(order.owner_status || order.status)
                            return (
                                <div key={order.id} style={{
                                    background: '#FFFFFF', borderRadius: 12, padding: 16,
                                    display: 'flex', alignItems: 'center', gap: 16,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E5E7EB'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: '#111827' }}>
                                            #{String(order.order_number || order.orderNumber || order.id.slice(-4)).padStart(3, '0')}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                                            {new Date(order.created_at || order.createdAt).toLocaleString('es-AR')}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: statusConf.color }}>{formatPrice(order.total)}</div>
                                        <div style={{
                                            background: statusConf.bg, color: statusConf.color,
                                            padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                                            display: 'inline-block', marginTop: 4
                                        }}>
                                            {statusConf.label}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {filteredOrders.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 48, color: '#6B7280' }}>
                                <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                                <p>No hay pedidos completados</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <BackendNav role={demoMode ? 'demo' : 'owner'} useRoutes={true} />
        </div>
    )
}

export default DeliveryManager