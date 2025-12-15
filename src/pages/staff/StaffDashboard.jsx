import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, clearAuth, getOrders, updateOrder, addStamp } from '../../utils/storage.js'
import { getMenu, toggleItemAvailability, formatPrice } from '../../config/menuData.js'
import { getConfig, updateConfig } from '../../config/appConfig.js'

function StaffDashboard({ config }) {
    const navigate = useNavigate()
    const [orders, setOrders] = useState([])
    const [menu, setMenu] = useState(() => getMenu())
    const [activeTab, setActiveTab] = useState('orders')
    const [appConfig, setAppConfig] = useState(() => getConfig())
    const [paymentMethodSelect, setPaymentMethodSelect] = useState({}) // orderId -> 'cash' | 'mercado_pago'

    // Check auth
    useEffect(() => {
        const auth = getAuth()
        if (!auth.authenticated || auth.role !== 'staff') {
            navigate('/staff')
        }
    }, [navigate])

    // Load orders
    useEffect(() => {
        const loadData = () => {
            setOrders(getOrders())
            setMenu(getMenu())
            setAppConfig(getConfig())
        }
        loadData()
        const interval = setInterval(loadData, 2000)
        return () => clearInterval(interval)
    }, [])

    const handleLogout = () => {
        clearAuth()
        navigate('/')
    }

    const handleStatusChange = (orderId, newStatus) => {
        const order = orders.find(o => o.id === orderId)
        if (!order) return

        const orderMode = appConfig.orderMode || 'A1'

        // ============================================
        // MODE-SPECIFIC RULES
        // ============================================

        // MODE A2 (Café/Bakery): MUST have payment before preparing
        if (orderMode === 'A2' && newStatus === 'preparacion' && !order.paymentConfirmed) {
            alert('⚠️ Modo A2 (Café): Debés confirmar el pago ANTES de preparar.')
            return
        }

        // MODE A1/A2: Warn if delivering without payment
        if ((orderMode === 'A1' || orderMode === 'A2') && newStatus === 'entregado' && !order.paymentConfirmed) {
            if (!confirm('⚠️ Este pedido NO tiene pago confirmado. ¿Entregar igual?')) {
                return
            }
        }

        // MODE B: Payment happens AFTER delivery (no warning needed)
        // Fine dining flow: prepare → deliver → pay

        updateOrder(orderId, { status: newStatus })

        // Add stamp when order is delivered
        if (newStatus === 'entregado') {
            addStamp()

            // ============================================
            // FUTURE: MODE A2 (Café/Bakery) SELFIE HOOK
            // ============================================
            // if (orderMode === 'A2') {
            //     // Selfie prompt 3-4 seconds AFTER delivery
            //     setTimeout(() => {
            //         triggerFoodPicPrompt(orderId)
            //     }, 3500)
            // }
            // ============================================
        }

        setOrders(getOrders())
    }

    // Mode A: Payment confirmation with method (single source of truth)
    const handlePaymentConfirm = (orderId) => {
        const order = orders.find(o => o.id === orderId)
        if (!order) return

        // If already confirmed, toggle off
        if (order.paymentConfirmed) {
            updateOrder(orderId, {
                paymentConfirmed: false,
                paidAt: null,
                paymentMethod: null
            })
        } else {
            // Confirm with selected payment method (default: cash)
            const method = paymentMethodSelect[orderId] || 'cash'
            updateOrder(orderId, {
                paymentConfirmed: true,
                paidAt: new Date().toISOString(),
                paymentMethod: method
            })
        }

        // ============================================
        // FUTURE: SELFIE HOOK (MODE-SPECIFIC)
        // ============================================
        // MODE A1 (Budoni/Pre-Made): Trigger selfie AFTER payment confirmed
        // const orderMode = appConfig.orderMode || 'A1'
        // if (!order.paymentConfirmed && orderMode === 'A1') {
        //     // Wait 4 seconds after payment
        //     setTimeout(() => {
        //         triggerFoodPicPrompt(orderId)
        //     }, 4000)
        // }
        //
        // MODE A2 (Café/Bakery): Selfie triggers AFTER DELIVERY (see handleStatusChange)
        //
        // MODE B (Fine Dining): Selfie logic TBD
        // ============================================

        setOrders(getOrders())
    }

    const handleToggleAvailability = (categoryId, itemId) => {
        toggleItemAvailability(categoryId, itemId)
        setMenu(getMenu())
    }

    const handlePauseOrders = () => {
        updateConfig({ pauseOrders: !appConfig.pauseOrders })
        setAppConfig(getConfig())
    }

    const handleAddStamp = () => {
        addStamp()
        alert('¡Sello agregado!')
    }

    const getStatusInfo = (status) => {
        switch (status) {
            case 'enviado':
                return { label: 'Enviado', class: 'status-enviado', next: 'preparacion', nextLabel: 'Preparar' }
            case 'preparacion':
                return { label: 'En preparación', class: 'status-preparacion', next: 'listo', nextLabel: 'Listo' }
            case 'listo':
                return { label: '¡Listo!', class: 'status-listo', next: 'entregado', nextLabel: 'Entregar' }
            case 'entregado':
                return { label: '✅ Entregado', class: 'status-entregado', next: null, nextLabel: null }
            default:
                return { label: status, class: '', next: null, nextLabel: null }
        }
    }

    const activeOrders = orders.filter(o => o.status !== 'entregado')
    const todayOrders = orders.filter(o => {
        const today = new Date().toDateString()
        return new Date(o.createdAt).toDateString() === today
    })

    return (
        <div className="page" style={{ paddingBottom: 'var(--space-4)' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-4)'
            }}>
                <div>
                    <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                        👷 Staff
                    </h1>
                    <span style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-muted)',
                        background: 'var(--color-card)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)'
                    }}>
                        Modo {appConfig.orderMode || 'A1'}
                    </span>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={handleLogout}
                    style={{ padding: 'var(--space-2) var(--space-3)' }}
                >
                    Salir
                </button>
            </div>

            {/* Pause Orders Toggle */}
            <div className="admin-card" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="admin-row" style={{ paddingTop: 0, paddingBottom: 0 }}>
                    <div>
                        <p style={{ fontWeight: 'var(--font-weight-medium)' }}>Pausar pedidos</p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                            {appConfig.pauseOrders ? '⏸️ Pausado' : '▶️ Activo'}
                        </p>
                    </div>
                    <label className="toggle">
                        <input
                            type="checkbox"
                            checked={appConfig.pauseOrders}
                            onChange={handlePauseOrders}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('orders')}
                >
                    📋 Pedidos ({activeOrders.length})
                </button>
                <button
                    className={`tab ${activeTab === 'pagos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pagos')}
                >
                    💳 Pagos
                </button>
                <button
                    className={`tab ${activeTab === 'items' ? 'active' : ''}`}
                    onClick={() => setActiveTab('items')}
                >
                    🍽️ Stock
                </button>
                <button
                    className={`tab ${activeTab === 'rewards' ? 'active' : ''}`}
                    onClick={() => setActiveTab('rewards')}
                >
                    ⭐ Sellos
                </button>
            </div>

            {/* Orders Tab */}
            {activeTab === 'orders' && (
                <div>
                    {activeOrders.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <p className="empty-state-text">No hay pedidos activos</p>
                        </div>
                    ) : (
                        activeOrders.map(order => {
                            const statusInfo = getStatusInfo(order.status)
                            return (
                                <div key={order.id} className={`order-card ${statusInfo.class}`}>
                                    <div className="order-card-header">
                                        <span className="order-number" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>#{order.orderNumber}</span>
                                        <span className={`status-badge ${statusInfo.class}`}>
                                            {statusInfo.label}
                                        </span>
                                    </div>

                                    {/* Order Items */}
                                    <div style={{ marginBottom: 'var(--space-3)' }}>
                                        {order.items.map((item, idx) => (
                                            <div key={idx} style={{
                                                fontSize: 'var(--font-size-sm)',
                                                padding: 'var(--space-1) 0'
                                            }}>
                                                <span>{item.quantity}x {item.name}</span>
                                                {item.extras && item.extras.length > 0 && (
                                                    <span style={{ color: 'var(--color-text-muted)' }}>
                                                        {' '}(+{item.extras.map(e => e.name).join(', ')})
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Total & Time */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--color-text-muted)',
                                        marginBottom: 'var(--space-3)'
                                    }}>
                                        <span>{formatPrice(order.total)}</span>
                                        <span>{new Date(order.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                        {statusInfo.next && (
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleStatusChange(order.id, statusInfo.next)}
                                                style={{ flex: 1 }}
                                            >
                                                {statusInfo.nextLabel}
                                            </button>
                                        )}
                                        {/* Payment Method Selector (before confirm) */}
                                        {!order.paymentConfirmed && (
                                            <select
                                                className="form-input"
                                                value={paymentMethodSelect[order.id] || 'cash'}
                                                onChange={(e) => setPaymentMethodSelect(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                style={{ flex: 1, minWidth: 100 }}
                                            >
                                                <option value="cash">💵 Efectivo</option>
                                                <option value="mercado_pago">📱 MercadoPago</option>
                                            </select>
                                        )}
                                        <button
                                            className={`btn ${order.paymentConfirmed ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => handlePaymentConfirm(order.id)}
                                            style={{ minWidth: 120 }}
                                        >
                                            {order.paymentConfirmed ? `✅ ${order.paymentMethod === 'mercado_pago' ? 'MP' : 'Efe'}` : '💳 Confirmar'}
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}

                    {/* Today's summary */}
                    <div className="card" style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                            Pedidos hoy
                        </p>
                        <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
                            {todayOrders.length}
                        </p>
                    </div>
                </div>
            )}

            {/* Pagos Tab */}
            {activeTab === 'pagos' && (() => {
                // Calculate payment totals
                const confirmedOrders = todayOrders.filter(o => o.paymentConfirmed)
                const totalCash = confirmedOrders
                    .filter(o => o.paymentMethod === 'cash')
                    .reduce((sum, o) => sum + (o.total || 0), 0)
                const totalMP = confirmedOrders
                    .filter(o => o.paymentMethod === 'mercado_pago')
                    .reduce((sum, o) => sum + (o.total || 0), 0)

                return (
                    <div>
                        {/* Payment Totals */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 'var(--space-3)',
                            marginBottom: 'var(--space-4)'
                        }}>
                            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>💵 Efectivo</p>
                                <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-success)' }}>
                                    {formatPrice(totalCash)}
                                </p>
                            </div>
                            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>📱 MercadoPago</p>
                                <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
                                    {formatPrice(totalMP)}
                                </p>
                            </div>
                        </div>

                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
                            Pagos recientes (solo lectura)
                        </p>
                        {todayOrders.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">💳</div>
                                <p className="empty-state-text">No hay pedidos hoy</p>
                            </div>
                        ) : (
                            <div className="admin-card">
                                {todayOrders.map(order => (
                                    <div key={order.id} className="admin-row" style={{ borderBottom: '1px solid var(--color-card)' }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-lg)' }}>
                                                #{order.orderNumber}
                                            </p>
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                                {formatPrice(order.total)} • {new Date(order.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            {order.paymentConfirmed ? (
                                                <>
                                                    <p style={{ color: 'var(--color-success)', fontWeight: 'var(--font-weight-medium)' }}>
                                                        ✅ {order.paymentMethod === 'mercado_pago' ? 'MercadoPago' : 'Efectivo'}
                                                    </p>
                                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                                        {order.paidAt && new Date(order.paidAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </>
                                            ) : (
                                                <p style={{ color: 'var(--color-warning)' }}>⏳ Sin confirmar</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* Items Availability Tab */}
            {activeTab === 'items' && (
                <div>
                    {menu.categories.map(category => (
                        <div key={category.id} className="admin-section">
                            <h3 className="admin-section-title">
                                {category.icon} {category.name}
                            </h3>
                            <div className="admin-card">
                                {category.items.map(item => (
                                    <div key={item.id} className="admin-row">
                                        <div>
                                            <p style={{ fontWeight: 'var(--font-weight-medium)' }}>{item.name}</p>
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                                {formatPrice(item.price)}
                                            </p>
                                        </div>
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

            {/* Rewards/Stamps Tab */}
            {activeTab === 'rewards' && (
                <div>
                    <div className="card" style={{ textAlign: 'center' }}>
                        <h3 style={{ marginBottom: 'var(--space-3)' }}>Validar sello</h3>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
                            Usá esto para agregar un sello cuando un cliente comparte en Instagram o visita el local
                        </p>
                        <button
                            className="btn btn-primary btn-lg btn-block"
                            onClick={handleAddStamp}
                        >
                            ⭐ Agregar sello
                        </button>
                    </div>

                    <div className="card" style={{ marginTop: 'var(--space-4)' }}>
                        <h4 style={{ marginBottom: 'var(--space-2)' }}>Info</h4>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                            Los sellos también se agregan automáticamente cuando un pedido se marca como entregado.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default StaffDashboard
