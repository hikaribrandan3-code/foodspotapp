import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getConfig } from '../../config/appConfig.js'
import { formatPrice } from '../../config/menuData.js'
import {
    getCurrentOrder,
    clearCurrentOrder,
    updateItemQuantity,
    removeFromCurrentOrder,
    addOrder,
    generateOrderNumber,
    incrementOrderCount
} from '../../utils/storage.js'
import PageHeader from '../../components/PageHeader.jsx'
import { getDividerPreset } from '../../config/dividerPresets.js'

// Placeholder food images for items without images
const placeholderImages = [
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=100&h=100&fit=crop',
]

function Order() {
    const navigate = useNavigate()
    const [config] = useState(() => getConfig())
    const [order, setOrder] = useState(() => getCurrentOrder())
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    useEffect(() => {
        const interval = setInterval(() => {
            setOrder(getCurrentOrder())
        }, 500)
        return () => clearInterval(interval)
    }, [])

    const calculateItemTotal = (item) => {
        let total = item.price * item.quantity
        if (item.extras) {
            item.extras.forEach(e => total += e.price * item.quantity)
        }
        return total
    }

    const calculateTotal = () => {
        return order.items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
    }

    const handleQuantityChange = (index, delta) => {
        const newQuantity = order.items[index].quantity + delta
        if (newQuantity <= 0) {
            removeFromCurrentOrder(index)
        } else {
            updateItemQuantity(index, newQuantity)
        }
        setOrder(getCurrentOrder())
    }

    const handleSubmit = () => {
        if (isSubmitting || submitted || order.items.length === 0) return
        if (config.pauseOrders) return

        setIsSubmitting(true)

        const orderNumber = generateOrderNumber()
        const newOrder = {
            id: `order-${Date.now()}`,
            orderNumber,
            items: order.items,
            total: calculateTotal(),
            status: 'enviado',
            paymentConfirmed: false,
            paidAt: null,
            createdAt: new Date().toISOString()
        }

        addOrder(newOrder)
        incrementOrderCount()
        clearCurrentOrder()

        setTimeout(() => {
            setIsSubmitting(false)
            setSubmitted(true)
            setTimeout(() => {
                navigate('/status')
            }, 1500)
        }, 500)
    }

    const getItemImage = (item, index) => {
        if (item.image) return item.image
        return placeholderImages[index % placeholderImages.length]
    }

    // Submitted state - Pedido Enviado Transition Screen
    if (submitted) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#FAF9F7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                paddingBottom: 80
            }}>
                {/* Centered Card */}
                <div style={{
                    background: '#FFFFFF',
                    borderRadius: 20,
                    padding: '32px 28px',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
                    width: '100%',
                    maxWidth: 320,
                    textAlign: 'center'
                }}>
                    {/* Brand Header - Plain text only */}
                    <p style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: '#9CA3AF',
                        letterSpacing: '0.08em',
                        marginBottom: 24,
                        textTransform: 'uppercase'
                    }}>
                        GRUB CLUB
                    </p>

                    {/* Green Checkmark Icon */}
                    <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: '#ECFDF5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px'
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>

                    {/* Primary Text */}
                    <h2 style={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: '#1F2937',
                        marginBottom: 8
                    }}>
                        ¡Pedido enviado!
                    </h2>

                    {/* Secondary Text */}
                    <p style={{
                        fontSize: 14,
                        fontWeight: 400,
                        color: '#6B7280',
                        marginBottom: 24
                    }}>
                        Estamos preparando tu pedido
                    </p>

                    {/* Loading Indicator - Three dots */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 6,
                        marginBottom: 24
                    }}>
                        <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#D1D5DB',
                            animation: 'pulse 1.4s ease-in-out infinite',
                            animationDelay: '0s'
                        }} />
                        <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#D1D5DB',
                            animation: 'pulse 1.4s ease-in-out infinite',
                            animationDelay: '0.2s'
                        }} />
                        <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#D1D5DB',
                            animation: 'pulse 1.4s ease-in-out infinite',
                            animationDelay: '0.4s'
                        }} />
                    </div>

                    {/* Footer Helper Text */}
                    <p style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: '#9CA3AF'
                    }}>
                        Redirigiendo al estado del pedido…
                    </p>
                </div>

                {/* Inline keyframes for dot animation */}
                <style>{`
                    @keyframes pulse {
                        0%, 80%, 100% { opacity: 0.4; transform: scale(0.9); }
                        40% { opacity: 1; transform: scale(1); }
                    }
                `}</style>
            </div>
        )
    }

    // Empty cart state
    if (order.items.length === 0) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#FAF9F7',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20
            }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
                <p style={{ color: '#6B7280', marginBottom: 20 }}>Tu pedido está vacío</p>
                <button
                    onClick={() => navigate('/menu')}
                    style={{
                        padding: '14px 32px',
                        background: '#C4856A',
                        color: 'white',
                        border: 'none',
                        borderRadius: 12,
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Ver menú
                </button>
            </div>
        )
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#FAF9F7',
            paddingBottom: 120
        }}>
            {/* Clean Brand Header */}
            <PageHeader businessName={config.businessName} />

            {/* Slim Identity Strip - Uses selected divider preset */}
            {(() => {
                const dividerPreset = getDividerPreset(config.dividerPresetId)
                return (
                    <div style={{
                        height: 64,
                        margin: '0 14px 16px 14px',
                        borderRadius: 12,
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        {dividerPreset ? (
                            <img
                                src={dividerPreset.url}
                                alt=""
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                                loading="lazy"
                            />
                        ) : (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(135deg, #F5F0E8 0%, #EDE8E0 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg width="120" height="40" viewBox="0 0 120 40" fill="none" style={{ opacity: 0.3 }}>
                                    <path d="M10 20 Q30 5, 60 20 T110 20" stroke="#8B7355" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                    <circle cx="20" cy="15" r="3" fill="#8B7355" opacity="0.5" />
                                    <circle cx="60" cy="10" r="2" fill="#8B7355" opacity="0.4" />
                                    <circle cx="100" cy="15" r="2.5" fill="#8B7355" opacity="0.5" />
                                </svg>
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* Tu Pedido Card Container */}
            <div style={{
                margin: '0 14px',
                position: 'relative'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: 20,
                    padding: 20,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                }}>
                    {/* Card Header */}
                    <div style={{ marginBottom: 20 }}>
                        <h1 style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: '#1F2937',
                            marginBottom: 4
                        }}>
                            Tu Pedido
                        </h1>
                        <p style={{
                            fontSize: 14,
                            color: '#9CA3AF'
                        }}>
                            Revisá antes de confirmar
                        </p>
                    </div>

                    {/* Pause Orders Warning */}
                    {config.pauseOrders && (
                        <div style={{
                            background: '#FEF3C7',
                            padding: 12,
                            borderRadius: 12,
                            marginBottom: 16,
                            textAlign: 'center'
                        }}>
                            <p style={{ color: '#92400E', fontSize: 14 }}>
                                ⏸️ {config.pauseOrdersMessage || 'Pedidos pausados temporalmente'}
                            </p>
                        </div>
                    )}

                    {/* Order Items */}
                    <div style={{ marginBottom: 16 }}>
                        {order.items.map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 14,
                                    padding: '14px 0',
                                    borderBottom: index < order.items.length - 1 ? '1px solid #F3F4F6' : 'none'
                                }}
                            >
                                {/* Thumbnail */}
                                <div style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    background: '#F3F0EB'
                                }}>
                                    <img
                                        src={getItemImage(item, index)}
                                        alt={item.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                        onError={(e) => {
                                            e.target.style.display = 'none'
                                        }}
                                    />
                                </div>

                                {/* Item Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: '#1F2937',
                                        marginBottom: 2,
                                        lineHeight: 1.3
                                    }}>
                                        {item.name}
                                    </p>
                                    <p style={{
                                        fontSize: 14,
                                        color: '#C4856A',
                                        fontWeight: 500,
                                        margin: 0
                                    }}>
                                        {formatPrice(item.price)}
                                    </p>
                                </div>

                                {/* Quantity Controls */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12
                                }}>
                                    <button
                                        onClick={() => handleQuantityChange(index, -1)}
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            border: '1.5px solid #E5E7EB',
                                            background: 'white',
                                            color: '#6B7280',
                                            fontSize: 16,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        −
                                    </button>
                                    <span style={{
                                        fontSize: 16,
                                        fontWeight: 600,
                                        color: '#1F2937',
                                        minWidth: 20,
                                        textAlign: 'center'
                                    }}>
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => handleQuantityChange(index, 1)}
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            border: '1.5px solid #C4856A',
                                            background: '#C4856A',
                                            color: 'white',
                                            fontSize: 16,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 16,
                        borderTop: '1px solid #F3F4F6'
                    }}>
                        <span style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: '#1F2937'
                        }}>
                            Total
                        </span>
                        <span style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: '#1F2937'
                        }}>
                            {formatPrice(calculateTotal())}
                        </span>
                    </div>

                    {/* Confirmar Pedido Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || config.pauseOrders}
                        style={{
                            width: '100%',
                            padding: '16px 24px',
                            background: (isSubmitting || config.pauseOrders) ? '#D4B89E' : (config.colors?.confirmation || '#22C55E'),
                            color: 'white',
                            border: 'none',
                            borderRadius: 14,
                            fontSize: 17,
                            fontWeight: 600,
                            cursor: (isSubmitting || config.pauseOrders) ? 'not-allowed' : 'pointer',
                            marginTop: 20,
                            letterSpacing: '-0.01em'
                        }}
                    >
                        {isSubmitting ? 'Enviando...' : 'Confirmar pedido'}
                    </button>
                </div>

                {/* Secondary Action - Wrapped Button */}
                <button
                    onClick={() => navigate('/menu')}
                    style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'white',
                        border: '1.5px solid #E5E7EB',
                        borderRadius: 12,
                        color: '#6B7280',
                        fontSize: 15,
                        fontWeight: 500,
                        cursor: 'pointer',
                        marginTop: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}
                >
                    ← Volver al menú y seguir pidiendo
                </button>
            </div>
        </div>
    )
}

export default Order
