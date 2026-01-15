import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAuth, clearAuth, addStamp } from '../../utils/storage.js'
import { getMenu, toggleItemAvailability, formatPrice } from '../../config/menuData.js'
import { updateConfig } from '../../config/appConfig.v2.js'
import { getPhoneLast4, verifyDeliveryCode } from '../../utils/deliveryUtils.js'
import { canAdvanceOrder, getOrderStatusInfo } from '../../utils/orderStateGuard.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'

// High-pitched "Beep-Beep" equivalent (using a placeholder or standard sound)
// For now, we will use a reliable high-pitched beep sound.
const ALERT_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' // Placeholder Short Beep
// ideally we would use a local asset or a generated data URI for "Rush-Proof" speed.
// Using a short, sharp beep.

function StaffDashboard({ config: configProp, orders = [], updateOrder, setOrders }) {
    const config = configProp || {};
    const navigate = useNavigate()
    const { tenantSlug } = useParams() // 🏢 SILO-AWARE: Get tenant from URL
    const [menu, setMenu] = useState(() => getMenu())
    const [activeTab, setActiveTab] = useState('orders')

    // INVARIANT: Use config prop from App.jsx (single source of truth)
    const [paymentMethodSelect, setPaymentMethodSelect] = useState({}) // orderId -> 'cash' | 'mercado_pago'
    const [deliveryConfirmCode, setDeliveryConfirmCode] = useState({}) // orderId -> 4-digit code

    // Audio System Refs
    const audioRef = useRef(null)
    const prevOrdersLengthRef = useRef(0)

    // Pre-load Audio
    useEffect(() => {
        audioRef.current = new Audio(ALERT_SOUND_URL)
        audioRef.current.volume = 1.0 // Maximum volume
        audioRef.current.preload = 'auto'
    }, [])

    // NOTE: Auth check removed - ProtectedRoute handles authentication

    // AUDIO ALERT LOGIC: React to orders prop changes
    useEffect(() => {
        // Sort orders by newest first for display
        const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        // New 'enviado' (pending) order detection
        const currentPendingCount = sortedOrders.filter(o => o.status === 'enviado').length
        const prevPendingCount = prevOrdersLengthRef.current

        if (currentPendingCount > prevPendingCount) {
            // New order arrived! Trigger "Beep-Beep"
            if (audioRef.current) {
                audioRef.current.currentTime = 0
                audioRef.current.play().catch(e => console.log("Audio prevent:", e))
                setTimeout(() => {
                    if (audioRef.current) {
                        audioRef.current.currentTime = 0
                        audioRef.current.play().catch(e => console.log("Audio prevent:", e))
                    }
                }, 1000)
            }
        }
        prevOrdersLengthRef.current = currentPendingCount
    }, [orders])

    // Menu sync
    useEffect(() => {
        const interval = setInterval(() => setMenu(getMenu()), 2000)
        return () => clearInterval(interval)
    }, [])

    // Compute sorted orders for display
    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }, [orders])

    const handleLogout = () => {
        clearAuth()
        // 🏢 SILO-AWARE: Navigate to tenant-scoped login
        navigate(tenantSlug ? `/${tenantSlug}` : '/')
    }

    const handleStatusChange = (orderId, newStatus) => {
        const order = orders.find(o => o.id === orderId)
        if (!order) return

        // 1. LOGIC GATE VALIDATION
        const validation = canAdvanceOrder(order, newStatus, config)
        if (!validation.allowed) {
            alert(validation.reason)
            return
        }

        // 2. SAFARI CONFIRMATION FOR UNPAID PICKUP (Info only - Logic Gate handles strict blocks)
        // If Logic Gate allowed it (e.g. A1 Pickup), we still ask for confirmation if unpaid
        // to prevent accidental handouts.
        if (newStatus === 'entregado' && !order.paymentConfirmed && order.orderType !== 'delivery') {
            if (!window.confirm('⚠️ Este pedido NO tiene pago confirmado. ¿Entregar igual?')) {
                return
            }
        }

        updateOrder(orderId, { status: newStatus })

        if (newStatus === 'entregado') {
            addStamp()
        }

        window.dispatchEvent(new CustomEvent('frontendSync'))
    }

    const handlePaymentConfirm = (orderId) => {
        const order = orders.find(o => o.id === orderId)
        if (!order) return

        if (order.paymentConfirmed) {
            // OPTIONAL: Allow undoing payment? usually restricted but keeping for accidental clicks
            updateOrder(orderId, {
                paymentConfirmed: false,
                paidAt: null,
                paymentMethod: null
            })
        } else {
            const method = paymentMethodSelect[orderId] || 'cash'
            updateOrder(orderId, {
                paymentConfirmed: true,
                paidAt: new Date().toISOString(),
                paymentMethod: method
            })
        }
        window.dispatchEvent(new CustomEvent('frontendSync'))
    }

    const handleToggleAvailability = (categoryId, itemId) => {
        toggleItemAvailability(categoryId, itemId)
        setMenu(getMenu())
    }

    const handlePauseOrders = () => {
        updateConfig({ pauseOrders: !config.pauseOrders })
        window.dispatchEvent(new CustomEvent('frontendSync'))
    }

    const handleAddStamp = () => {
        addStamp()
        alert('¡Sello agregado!')
    }

    // PERF: Memoized for busy shifts - only re-filter when 'orders' array changes (v5 Audit)
    const activeOrders = useMemo(() =>
        orders.filter(o => o.status !== 'entregado'),
        [orders]
    )

    const todayOrders = useMemo(() => {
        const today = new Date().toDateString()
        return orders.filter(o => new Date(o.createdAt).toDateString() === today)
    }, [orders])

    const pendingDeliveries = useMemo(() =>
        orders.filter(o => o.orderType === 'delivery' && o.status !== 'entregado' && o.status !== 'cancelado'),
        [orders]
    )

    const navBadges = useMemo(() => ({
        orders: activeOrders.length,
        delivery: pendingDeliveries.length
    }), [activeOrders.length, pendingDeliveries.length])

    return (
        <div className="page backend-surface" style={{ paddingBottom: 'var(--space-4)' }}>
            <BackendHeader
                title="Staff"
                onLogout={handleLogout}
                showDateSelector={false}
                extraActions={null}
            />

            {/* CONTROL TOWER (Panel de Control) */}
            <div className="admin-card" style={{ marginBottom: 'var(--space-4)', background: '#EFF6FF', borderLeft: '4px solid #3B82F6' }}>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #DBEAFE' }}>
                    <h3 style={{ margin: 0, fontSize: 13, textTransform: 'uppercase', color: '#1E40AF', letterSpacing: '0.05em' }}>
                        Panel de Control
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1E40AF' }}>
                            Modo {config.orderMode || 'A1'}
                        </span>
                    </div>
                </div>

                <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Active Orders Count */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', borderRadius: 8, padding: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <span style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Activos</span>
                        <span style={{ fontSize: 20, fontWeight: 700, color: '#3B82F6' }}>{activeOrders.length}</span>
                    </div>

                    {/* Pause Toggle */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', borderRadius: 8, padding: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', items: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                                {config.pauseOrders ? 'PAUSADO' : 'RECIBIENDO'}
                            </span>
                        </div>
                        <label className="toggle" style={{ transform: 'scale(0.8)' }}>
                            <input
                                type="checkbox"
                                checked={config.pauseOrders}
                                onChange={handlePauseOrders}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>

            </div>

            <div style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>
                {activeTab === 'orders' && (
                    <div>
                        {/* Delivery Rules Reminder */}
                        {activeOrders.some(o => o.orderType === 'delivery') && (
                            <div style={{
                                background: '#FFF7ED',
                                border: '1px solid #FDBA74',
                                borderRadius: 8,
                                padding: '12px 16px',
                                marginBottom: 16
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                    <span style={{ fontSize: 14 }}>⚠️</span>
                                    <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#9A3412', textTransform: 'uppercase' }}>
                                        Reglas de Despacho
                                    </h4>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11, color: '#9A3412', lineHeight: '1.6' }}>
                                    <li><strong style={{ fontWeight: 700 }}>Confirmar pago antes de preparar.</strong></li>
                                    <li>FoodSpot no es responsable de repartidores ni seguros.</li>
                                </ul>
                            </div>
                        )}

                        {activeOrders.length === 0 ? (
                            <div className="empty-state">
                                <div style={{ fontSize: 48, marginBottom: 16 }}>🚚</div>
                                <p className="empty-state-text" style={{ fontSize: 16, fontWeight: 500 }}>No hay pedidos activos</p>
                                <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Todo tranquilo por ahora.</p>
                            </div>
                        ) : (
                            activeOrders.map(order => {
                                const statusInfo = getOrderStatusInfo(order.status, order.orderType)
                                const isDeliveryOrder = order.orderType === 'delivery'

                                // LOGIC GATE CHECK (Visual only - logic enforced in handler)
                                // If not allowed to advance, we disable the main button
                                const canAdvance = canAdvanceOrder(order, statusInfo.next, config).allowed

                                return (
                                    <div key={order.id} className={`order-card ${statusInfo.class}`} style={{ position: 'relative', borderLeftWidth: 4, overflow: 'hidden' }}>
                                        {/* Header */}
                                        <div className="order-card-header" style={{ alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                                    <span className="order-number" style={{ fontSize: 20 }}>#{order.orderNumber}</span>
                                                    {isDeliveryOrder && (
                                                        <span style={{ fontSize: 10, background: '#DBEAFE', color: '#1D4ED8', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                                                            DELIVERY
                                                        </span>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: 11, color: '#6B7280' }}>
                                                    {new Date(order.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <span className={`status-badge ${statusInfo.class}`} style={{ fontSize: 11 }}>
                                                {statusInfo.label}
                                            </span>
                                        </div>

                                        {/* Delivery Info */}
                                        {isDeliveryOrder && order.customerInfo && (
                                            <div style={{ background: '#F0FDF4', padding: '10px 12px', borderRadius: 8, marginBottom: 12, border: '1px solid #DCFCE7' }}>
                                                <div style={{ fontWeight: 600, fontSize: 13, color: '#166534', marginBottom: 2 }}>
                                                    📍 {order.customerInfo.name}
                                                </div>
                                                <div style={{ color: '#15803D', fontSize: 12 }}>
                                                    {order.customerInfo.address}
                                                </div>
                                                <div style={{ color: '#15803D', fontSize: 11, marginTop: 4 }}>
                                                    Tel: ***{getPhoneLast4(order.customerInfo.phone)}
                                                </div>
                                            </div>
                                        )}

                                        {/* Items */}
                                        <div style={{ marginBottom: 16 }}>
                                            {order.items.map((item, idx) => (
                                                <div key={idx} style={{ fontSize: 13, padding: '2px 0', borderBottom: '1px dashed #F3F4F6' }}>
                                                    <span style={{ fontWeight: 600 }}>{item.quantity}x</span> {item.name}
                                                    {item.extras && item.extras.length > 0 && (
                                                        <span style={{ color: '#6B7280', fontSize: 11 }}>
                                                            {' '}(+{item.extras.map(e => e.name).join(', ')})
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                            <div style={{ textAlign: 'right', marginTop: 12, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                                                {formatPrice(order.total)}
                                            </div>
                                        </div>

                                        {/* TRAFFIC LIGHT ACTIONS */}
                                        <div style={{ display: 'grid', gap: 10 }}>
                                            {/* 1. Payment Action (Traffic Light Base) */}
                                            {order.paymentConfirmed ? (
                                                <div style={{
                                                    background: '#DCFCE7', color: '#166534', padding: '8px',
                                                    borderRadius: 6, fontSize: 12, fontWeight: 700, textAlign: 'center',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                    border: '1px solid #86EFAC'
                                                }}>
                                                    <span>✅</span>
                                                    <span>PAGO CONFIRMADO {order.paymentMethod === 'mercado_pago' ? '(MP)' : '(EFECTIVO)'}</span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <select
                                                        className="form-input"
                                                        value={paymentMethodSelect[order.id] || 'cash'}
                                                        onChange={(e) => setPaymentMethodSelect(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                        style={{ width: '40%', fontSize: 12, padding: '8px' }}
                                                    >
                                                        <option value="cash">💵 Efectivo</option>
                                                        <option value="mercado_pago">📱 MP</option>
                                                    </select>
                                                    <button
                                                        className="btn"
                                                        onClick={() => handlePaymentConfirm(order.id)}
                                                        style={{
                                                            flex: 1,
                                                            background: config.colors?.confirmation || '#22C55E',
                                                            color: 'white',
                                                            border: 'none',
                                                            fontWeight: 600,
                                                            animation: 'pulse-orange 1.5s infinite'
                                                        }}
                                                    >
                                                        <span style={{ marginRight: 4 }}>💳</span> Confirmar Pago
                                                    </button>
                                                    {/* Inline style for pulse if not in CSS */}
                                                    <style>{`
                                                        @keyframes pulse-orange {
                                                            0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
                                                            70% { box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); }
                                                            100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
                                                        }
                                                    `}</style>
                                                </div>
                                            )}

                                            {/* 2. Advance Order Action */}
                                            {statusInfo.next && (
                                                <>
                                                    {/* Delivery Confirmation Input (En Camino -> Entregado) */}
                                                    {isDeliveryOrder && order.status === 'en_camino' && (
                                                        <div style={{ marginBottom: 4 }}>
                                                            <input
                                                                type="text"
                                                                maxLength={4}
                                                                placeholder="Código (últimos 4 dígitos)"
                                                                value={deliveryConfirmCode[order.id] || ''}
                                                                onChange={(e) => setDeliveryConfirmCode(prev => ({ ...prev, [order.id]: e.target.value.replace(/\D/g, '') }))}
                                                                style={{
                                                                    width: '100%', padding: '10px', fontSize: 15,
                                                                    border: '2px solid #E5E7EB', borderRadius: 8,
                                                                    textAlign: 'center', letterSpacing: 2
                                                                }}
                                                            />
                                                        </div>
                                                    )}

                                                    <button
                                                        className={`btn btn-primary ${!canAdvance ? 'btn-disabled' : ''}`}
                                                        disabled={!canAdvance}
                                                        onClick={() => {
                                                            if (isDeliveryOrder && statusInfo.next === 'entregado' && order.customerInfo) {
                                                                const code = deliveryConfirmCode[order.id] || ''
                                                                if (!verifyDeliveryCode(order.customerInfo.phone, code)) {
                                                                    alert('❌ Código incorrecto.')
                                                                    return
                                                                }
                                                                updateOrder(order.id, { deliveryConfirmedAt: new Date().toISOString() })
                                                            }
                                                            handleStatusChange(order.id, statusInfo.next)
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            opacity: canAdvance ? 1 : 0.5,
                                                            cursor: canAdvance ? 'pointer' : 'not-allowed',
                                                            background: canAdvance ? '#3B82F6' : '#9CA3AF'
                                                        }}
                                                    >
                                                        {statusInfo.nextLabel}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}

                        <div className="card" style={{ marginTop: 24, padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#6B7280', fontSize: 13 }}>Total pedidos hoy</span>
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{todayOrders.length}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delivery Tab */}
                {activeTab === 'delivery' && (
                    <div>
                        {(() => {
                            const deliveryOrders = orders.filter(o => o.orderType === 'delivery' && o.status !== 'entregado' && o.status !== 'cancelado')
                            if (deliveryOrders.length === 0) {
                                return (
                                    <div className="empty-state">
                                        <div style={{ fontSize: 48, marginBottom: 16 }}>🚚</div>
                                        <p className="empty-state-text">No hay envíos activos</p>
                                    </div>
                                )
                            }
                            return deliveryOrders.map(order => {
                                const statusInfo = getOrderStatusInfo(order.status, order.orderType)
                                const canAdvance = canAdvanceOrder(order, statusInfo.next, config).allowed
                                return (
                                    <div key={order.id} className={`order-card ${statusInfo.class}`} style={{ borderLeftWidth: 4 }}>
                                        <div className="order-card-header">
                                            <span className="order-number" style={{ fontSize: 20 }}>#{order.orderNumber}</span>
                                            <span className={`status-badge ${statusInfo.class}`}>{statusInfo.label}</span>
                                        </div>
                                        {order.customerInfo && (
                                            <div style={{ background: '#F0FDF4', padding: 8, borderRadius: 6, marginBottom: 10, fontSize: 12 }}>
                                                📍 {order.customerInfo.address}
                                            </div>
                                        )}

                                        {/* Simplified actions for delivery specific view */}
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {statusInfo.next && (
                                                <button
                                                    className="btn btn-primary"
                                                    disabled={!canAdvance}
                                                    onClick={() => {
                                                        if (statusInfo.next === 'entregado' && order.customerInfo) {
                                                            const code = deliveryConfirmCode[order.id] || ''
                                                            if (!verifyDeliveryCode(order.customerInfo.phone, code)) {
                                                                alert('❌ Código incorrecto.')
                                                                return
                                                            }
                                                            updateOrder(order.id, { deliveryConfirmedAt: new Date().toISOString() })
                                                        }
                                                        handleStatusChange(order.id, statusInfo.next)
                                                    }}
                                                    style={{ flex: 1, opacity: canAdvance ? 1 : 0.5 }}
                                                >
                                                    {statusInfo.nextLabel}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        })()}
                        <div className="card" style={{ marginTop: 24, padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#6B7280', fontSize: 13 }}>Envíos hoy</span>
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                                    {todayOrders.filter(o => o.orderType === 'delivery').length}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pagos Tab */}
                {activeTab === 'pagos' && (() => {
                    const confirmedOrders = todayOrders.filter(o => o.paymentConfirmed)
                    const totalCash = confirmedOrders
                        .filter(o => o.paymentMethod === 'cash')
                        .reduce((sum, o) => sum + (o.total || 0), 0)
                    const totalMP = confirmedOrders
                        .filter(o => o.paymentMethod === 'mercado_pago')
                        .reduce((sum, o) => sum + (o.total || 0), 0)

                    return (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                                <div className="card" style={{ textAlign: 'center', padding: 16 }}>
                                    <p style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>Efectivo</p>
                                    <p style={{ fontSize: 20, fontWeight: 700, color: '#10B981' }}>{formatPrice(totalCash)}</p>
                                </div>
                                <div className="card" style={{ textAlign: 'center', padding: 16 }}>
                                    <p style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>MercadoPago</p>
                                    <p style={{ fontSize: 20, fontWeight: 700, color: '#3B82F6' }}>{formatPrice(totalMP)}</p>
                                </div>
                            </div>

                            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Registros de solo lectura</h3>
                            <div className="admin-card">
                                {todayOrders.length === 0 && <p style={{ padding: 16, color: '#9CA3AF', fontSize: 13, textAlign: 'center' }}>No hay registros.</p>}
                                {todayOrders.map(order => (
                                    <div key={order.id} className="admin-row">
                                        <div>
                                            <span style={{ fontWeight: 700, fontSize: 14 }}>#{order.orderNumber}</span>
                                            <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 8 }}>{formatPrice(order.total)}</span>
                                        </div>
                                        <div style={{ fontSize: 12 }}>
                                            {order.paymentConfirmed ? (
                                                <span style={{ color: '#10B981', fontWeight: 600 }}>
                                                    {order.paymentMethod === 'mercado_pago' ? 'MP' : 'EFECTIVO'}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#F59E0B' }}>Pdte.</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })()}

                {/* Items Tab (Simplified) */}
                {activeTab === 'items' && (
                    <div>
                        {menu.categories.map(category => (
                            <div key={category.id} className="admin-section">
                                <h3 className="admin-section-title">{category.icon} {category.name}</h3>
                                <div className="admin-card">
                                    {category.items.map(item => (
                                        <div key={item.id} className="admin-row">
                                            <span style={{ fontWeight: 500 }}>{item.name}</span>
                                            <label className="toggle">
                                                <input
                                                    type="checkbox"
                                                    checked={item.available}
                                                    onChange={() => handleToggleAvailability(category.id, item.id)}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Rewards Tab */}
                {activeTab === 'rewards' && (
                    <div style={{ textAlign: 'center', padding: 24 }}>
                        <button className="btn btn-primary" onClick={handleAddStamp} style={{ width: '100%', padding: 16, fontSize: 16 }}>
                            ⭐ Agregar Sello Manual
                        </button>
                    </div>
                )}
            </div>

            <BackendNav
                role="staff"
                activeTab={activeTab}
                onTabChange={setActiveTab}
                badges={navBadges}
            />
        </div>
    )
}

export default StaffDashboard
