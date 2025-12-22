import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrders } from '../../utils/storage.js'
import { formatPrice } from '../../config/menuData.js'

// Check icon for completed steps
const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
)

// Smiley icon for small orders thank-you
const SmileyIcon = () => (
    <svg width="20" height="20" viewBox="0 0 256 256" fill="#4A4036">
        <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM92,96a12,12,0,1,1-12,12A12,12,0,0,1,92,96Zm82.92,60c-10.29,17.79-27.39,28-46.92,28s-36.63-10.2-46.92-28a8,8,0,1,1,13.84-8c7.47,12.91,19.21,20,33.08,20s25.61-7.1,33.08-20a8,8,0,1,1,13.84,8ZM164,120a12,12,0,1,1,12-12A12,12,0,0,1,164,120Z"></path>
    </svg>
)

function OrderStatus({ config }) {
    const navigate = useNavigate()
    const [orders, setOrders] = useState([])

    useEffect(() => {
        const loadOrders = () => {
            const allOrders = getOrders()
            const today = new Date().toDateString()
            const relevant = allOrders.filter(order => {
                const orderDate = new Date(order.createdAt).toDateString()
                return orderDate === today || order.status !== 'entregado'
            }).slice(0, 10)
            setOrders(relevant)
        }

        loadOrders()
        const interval = setInterval(loadOrders, 2000)
        return () => clearInterval(interval)
    }, [])

    // Status mapping for progress tracker
    const getStepFromStatus = (status) => {
        switch (status) {
            case 'enviado': return 1
            case 'preparacion': return 2
            case 'listo':
            case 'entregado': return 3
            default: return 1
        }
    }

    const getStatusLabel = (status) => {
        switch (status) {
            case 'enviado': return 'Confirmado'
            case 'preparacion': return 'En preparación'
            case 'listo': return '¡Listo!'
            case 'entregado': return 'Entregado'
            default: return status
        }
    }

    // Colors
    const greenActive = '#22C55E'
    const greenLight = '#DCFCE7'
    const grayMuted = '#9CA3AF'
    const grayLight = '#E5E7EB'
    const cardBg = '#F5F3EF'

    const activeOrders = orders.filter(o => o.status !== 'entregado')
    const mostRecentOrder = activeOrders[0]

    return (
        <div className="page" style={{
            padding: '0 24px',
            paddingTop: 24,
            paddingBottom: 90,
            backgroundColor: '#FAFAF8',
            minHeight: '100vh'
        }}>
            {/* Header removed - Pedido # is now the primary header inside the card */}
            {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                    <p style={{ color: grayMuted, marginBottom: 20 }}>No tenés pedidos activos</p>
                    <button
                        onClick={() => navigate('/menu')}
                        style={{
                            padding: '12px 32px',
                            background: greenActive,
                            color: 'white',
                            border: 'none',
                            borderRadius: 24,
                            fontSize: 15,
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        Hacer un pedido
                    </button>
                </div>
            ) : mostRecentOrder && (
                <>
                    {/* Order Card (Primary Focus - wider, tighter) */}
                    <div style={{
                        background: cardBg,
                        borderRadius: 16,
                        padding: '20px 16px 16px 16px',
                        marginBottom: 12
                    }}>
                        {/* Order Number + Status Badge */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 20
                        }}>
                            <span style={{
                                fontSize: 18,
                                fontWeight: 600,
                                color: '#1F2937'
                            }}>
                                Pedido #{String(mostRecentOrder.orderNumber).padStart(3, '0')}
                            </span>
                            <span style={{
                                background: greenLight,
                                color: '#166534',
                                padding: '6px 14px',
                                borderRadius: 20,
                                fontSize: 13,
                                fontWeight: 500
                            }}>
                                {getStatusLabel(mostRecentOrder.status)}
                            </span>
                        </div>

                        {/* 3. Progress Tracker */}
                        <div style={{ marginBottom: 20 }}>
                            {/* Progress Line with Circles */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                position: 'relative',
                                marginBottom: 8
                            }}>
                                {[1, 2, 3].map((step, i) => {
                                    const currentStep = getStepFromStatus(mostRecentOrder.status)
                                    const isCompleted = currentStep > step
                                    const isCurrent = currentStep === step
                                    const isActive = isCompleted || isCurrent

                                    return (
                                        <div key={step} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            flex: i < 2 ? 1 : 'none'
                                        }}>
                                            {/* Circle - increased weight */}
                                            <div style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                background: isCompleted ? greenActive : (isCurrent ? 'white' : grayLight),
                                                border: isCurrent ? `3px solid ${greenActive}` : 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: isCompleted ? 'white' : grayMuted,
                                                flexShrink: 0
                                            }}>
                                                {isCompleted && <CheckIcon />}
                                            </div>
                                            {/* Connecting Line - increased weight */}
                                            {i < 2 && (
                                                <div style={{
                                                    flex: 1,
                                                    height: 4,
                                                    background: currentStep > step ? greenActive : grayLight,
                                                    marginLeft: 4,
                                                    marginRight: 4,
                                                    borderRadius: 2
                                                }} />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Step Labels */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                {['Confirmado', 'Preparando', 'Listo'].map((label, i) => {
                                    const currentStep = getStepFromStatus(mostRecentOrder.status)
                                    const step = i + 1
                                    const isActive = currentStep >= step

                                    return (
                                        <span key={label} style={{
                                            fontSize: 12,
                                            fontWeight: isActive ? 600 : 400,
                                            color: isActive ? '#374151' : grayMuted,
                                            textAlign: i === 0 ? 'left' : (i === 2 ? 'right' : 'center'),
                                            flex: 1
                                        }}>
                                            {label}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 4. Order Summary Line */}
                        <div style={{
                            textAlign: 'center',
                            paddingTop: 16,
                            borderTop: '1px solid rgba(0,0,0,0.06)',
                            fontSize: 14,
                            color: '#6B7280'
                        }}>
                            {mostRecentOrder.items.length} items · Total: {formatPrice(mostRecentOrder.total)}
                        </div>
                    </div>

                    {/* 5. Itemized Order Card */}
                    <div style={{
                        background: 'white',
                        borderRadius: 16,
                        padding: 20,
                        marginBottom: 24
                    }}>
                        {/* Items List */}
                        {mostRecentOrder.items.map((item, index) => (
                            <div key={index} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 12,
                                fontSize: 15,
                                color: '#374151'
                            }}>
                                <span>{item.name} ({item.quantity})</span>
                                <span>{formatPrice(item.price * item.quantity)}</span>
                            </div>
                        ))}

                        {/* Divider */}
                        <div style={{
                            borderTop: '1px solid #E5E7EB',
                            margin: '16px 0',
                            paddingTop: 16
                        }}>
                            {/* Subtotal */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 8,
                                fontSize: 14,
                                color: '#6B7280'
                            }}>
                                <span>Subtotal:</span>
                                <span>{formatPrice(mostRecentOrder.total)}</span>
                            </div>

                            {/* Impuestos */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 12,
                                fontSize: 14,
                                color: '#6B7280'
                            }}>
                                <span>Impuestos:</span>
                                <span>$0.00</span>
                            </div>

                            {/* Total */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 16,
                                fontWeight: 600,
                                color: '#1F2937'
                            }}>
                                <span>Total:</span>
                                <span>{formatPrice(mostRecentOrder.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Thank You (only for small orders < 5 items) */}
                    {mostRecentOrder.items.length < 5 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            marginTop: 16,
                            marginBottom: 8
                        }}>
                            <SmileyIcon />
                            <span style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: '#5A4A3A'
                            }}>
                                Gracias por tu negocio
                            </span>
                        </div>
                    )}

                    {/* Helper Text */}
                    <p style={{
                        textAlign: 'center',
                        fontSize: 13,
                        color: grayMuted,
                        paddingBottom: 4,
                        marginTop: 0
                    }}>
                        Mostrá este pedido en el local si es necesario
                    </p>
                </>
            )}
        </div>
    )
}

export default OrderStatus
