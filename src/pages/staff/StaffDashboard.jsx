import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, clearAuth, getOrders, updateOrder, addStamp } from '../../utils/storage.js'
import { getMenu, toggleItemAvailability, formatPrice } from '../../config/menuData.js'
import { updateConfig } from '../../config/appConfig.js'
import { getPhoneLast4, verifyDeliveryCode } from '../../utils/deliveryUtils.js'

function StaffDashboard({ config }) {
    const navigate = useNavigate()
    const [orders, setOrders] = useState([])
    const [menu, setMenu] = useState(() => getMenu())
    const [activeTab, setActiveTab] = useState('orders')
    // INVARIANT: Use config prop from App.jsx (single source of truth)
    // Do NOT call getConfig() locally - breaks invariant during saves
    const [paymentMethodSelect, setPaymentMethodSelect] = useState({}) // orderId -> 'cash' | 'mercado_pago'
    const [deliveryConfirmCode, setDeliveryConfirmCode] = useState({}) // orderId -> 4-digit code

    // Check auth
    useEffect(() => {
        const auth = getAuth()
        if (!auth.authenticated || (auth.role !== 'staff' && auth.role !== 'superadmin')) {
            navigate('/staff')
        }
    }, [navigate])

    // Load orders
    useEffect(() => {
        const loadData = () => {
            setOrders(getOrders())
            setMenu(getMenu())
            // NOTE: config comes from props, no getConfig() here
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

        const orderMode = config.orderMode || 'A1'

        // ============================================
        // PREPAYMENT ENFORCEMENT (P0 - V1 SHIP BLOCKER)
        // ============================================
        // ALL delivery orders require payment before preparation and dispatch
        if (order.orderType === 'delivery') {
            if ((newStatus === 'preparacion' || newStatus === 'en_camino') && !order.paymentConfirmed) {
                alert('⚠️ Debe confirmar el pago antes de preparar o enviar el pedido.')
                return
            }
        }

        // ============================================
        // MODE-SPECIFIC RULES (Pickup orders)
        // ============================================

        // MODE A2 (Café/Bakery): MUST have payment before preparing
        if (orderMode === 'A2' && newStatus === 'preparacion' && !order.paymentConfirmed) {
            alert('⚠️ Modo A2 (Café): Debés confirmar el pago ANTES de preparar.')
            return
        }

        // MODE A1/A2: Warn if delivering without payment (pickup only, delivery already blocked above)
        if (order.orderType !== 'delivery' && (orderMode === 'A1' || orderMode === 'A2') && newStatus === 'entregado' && !order.paymentConfirmed) {
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
        updateConfig({ pauseOrders: !config.pauseOrders })
        // Config will update via App.jsx frontendSync - no local state needed
        window.dispatchEvent(new CustomEvent('frontendSync'))
    }

    const handleAddStamp = () => {
        addStamp()
        alert('¡Sello agregado!')
    }

    const getStatusInfo = (status, orderType = 'pickup') => {
        switch (status) {
            case 'enviado':
                return { label: 'Enviado', class: 'status-enviado', next: 'preparacion', nextLabel: 'Preparar' }
            case 'preparacion':
                return { label: 'En preparación', class: 'status-preparacion', next: 'listo', nextLabel: 'Listo' }
            case 'listo':
                // For delivery orders, next step is "en_camino" (on the way)
                // For pickup orders, next step is "entregado" (delivered/picked up)
                if (orderType === 'delivery') {
                    return { label: '¡Listo!', class: 'status-listo', next: 'en_camino', nextLabel: 'En camino' }
                }
                return { label: '¡Listo!', class: 'status-listo', next: 'entregado', nextLabel: 'Entregar' }
            case 'en_camino':
                return { label: '🚴 En camino', class: 'status-en-camino', next: 'entregado', nextLabel: 'Confirmar entrega' }
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
        <div className="page backend-surface" style={{ paddingBottom: 'var(--space-4)' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-4)'
            }}>
                <div>
                    <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                        Staff
                    </h1>
                    <span style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-muted)',
                        background: 'var(--color-card)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)'
                    }}>
                        Modo {config.orderMode || 'A1'}
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
                            {config.pauseOrders ? '⏸️ Pausado' : '▶️ Activo'}
                        </p>
                    </div>
                    <label className="toggle">
                        <input
                            type="checkbox"
                            checked={config.pauseOrders}
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
                    Pedidos ({activeOrders.length})
                </button>
                <button
                    className={`tab ${activeTab === 'pagos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pagos')}
                >
                    Pagos
                </button>
                <button
                    className={`tab ${activeTab === 'items' ? 'active' : ''}`}
                    onClick={() => setActiveTab('items')}
                >
                    Stock
                </button>
                <button
                    className={`tab ${activeTab === 'rewards' ? 'active' : ''}`}
                    onClick={() => setActiveTab('rewards')}
                >
                    Sellos
                </button>
            </div>

            {/* Orders Tab */}
            {activeTab === 'orders' && (
                <div>
                    {/* Business Disclaimers - Shown when delivery orders exist */}
                    {activeOrders.some(o => o.orderType === 'delivery') && (
                        <div style={{
                            background: '#FEF3C7',
                            padding: 12,
                            borderRadius: 10,
                            marginBottom: 16,
                            fontSize: 12,
                            lineHeight: 1.5
                        }}>
                            <p style={{ fontWeight: 600, marginBottom: 6, color: '#92400E' }}>
                                📋 Recordatorio FoodSpot:
                            </p>
                            <ul style={{ margin: 0, paddingLeft: 16, color: '#78350F' }}>
                                <li>FoodSpot es software, no una empresa de delivery</li>
                                <li>El negocio es responsable de repartidores, seguros y habilitaciones</li>
                                <li>FoodSpot no procesa pagos</li>
                            </ul>
                        </div>
                    )}

                    {activeOrders.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <p className="empty-state-text">No hay pedidos activos</p>
                        </div>
                    ) : (
                        activeOrders.map(order => {
                            const statusInfo = getStatusInfo(order.status, order.orderType)
                            const isDeliveryOrder = order.orderType === 'delivery'
                            return (
                                <div key={order.id} className={`order-card ${statusInfo.class}`}>
                                    <div className="order-card-header">
                                        <span className="order-number" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>#{order.orderNumber}</span>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            {isDeliveryOrder && (
                                                <span style={{
                                                    fontSize: 10,
                                                    background: '#DBEAFE',
                                                    color: '#1D4ED8',
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    fontWeight: 500
                                                }}>
                                                    🚴 Envío
                                                </span>
                                            )}
                                            <span className={`status-badge ${statusInfo.class}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Delivery Customer Info - Only for delivery orders */}
                                    {isDeliveryOrder && order.customerInfo && (
                                        <div style={{
                                            background: '#F0FDF4',
                                            padding: 10,
                                            borderRadius: 8,
                                            marginBottom: 'var(--space-3)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}>
                                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                                📍 {order.customerInfo.name}
                                            </div>
                                            <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>
                                                {order.customerInfo.address}
                                            </div>
                                            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                                                Tel: ***{getPhoneLast4(order.customerInfo.phone)}
                                            </div>
                                        </div>
                                    )}

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
                                        {/* Delivery Confirmation Code Input - Only for delivery orders in "en_camino" */}
                                        {isDeliveryOrder && order.status === 'en_camino' && order.customerInfo && (
                                            <div style={{ width: '100%', marginBottom: 8 }}>
                                                <label style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                                                    Últimos 4 dígitos del teléfono para confirmar entrega
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength={4}
                                                    placeholder="****"
                                                    value={deliveryConfirmCode[order.id] || ''}
                                                    onChange={(e) => setDeliveryConfirmCode(prev => ({ ...prev, [order.id]: e.target.value.replace(/\D/g, '') }))}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        border: '1px solid #E5E7EB',
                                                        borderRadius: 8,
                                                        fontSize: 18,
                                                        textAlign: 'center',
                                                        letterSpacing: 6
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {statusInfo.next && (
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => {
                                                    // For delivery orders going to "entregado", verify the confirmation code
                                                    if (isDeliveryOrder && statusInfo.next === 'entregado' && order.customerInfo) {
                                                        const code = deliveryConfirmCode[order.id] || ''
                                                        if (!verifyDeliveryCode(order.customerInfo.phone, code)) {
                                                            alert('❌ Código incorrecto. Ingresá los últimos 4 dígitos del teléfono del cliente.')
                                                            return
                                                        }
                                                        // Update with confirmation timestamp
                                                        updateOrder(order.id, { deliveryConfirmedAt: new Date().toISOString() })
                                                    }
                                                    handleStatusChange(order.id, statusInfo.next)
                                                }}
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
                                            className="btn"
                                            onClick={() => handlePaymentConfirm(order.id)}
                                            style={{
                                                minWidth: 120,
                                                background: order.paymentConfirmed ? 'var(--color-primary)' : (config.colors?.confirmation || '#22C55E'),
                                                color: 'white',
                                                border: 'none'
                                            }}
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
