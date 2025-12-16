import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMenu, formatPrice } from '../../config/menuData.js'
import { addToCurrentOrder, getCurrentOrder, updateItemQuantity } from '../../utils/storage.js'
import { getConfig } from '../../config/appConfig.js'
import PageHeader from '../../components/PageHeader.jsx'

function Menu() {
    const navigate = useNavigate()
    const [menu, setMenu] = useState(() => getMenu())
    const [config] = useState(() => getConfig())
    const [cart, setCart] = useState(() => getCurrentOrder())
    const [addedItem, setAddedItem] = useState(null) // For visual feedback
    const categoryRefs = useRef({})

    // Only show enabled categories with available items
    const enabledCategories = menu.categories.filter(cat =>
        cat.enabled !== false && cat.items.some(item => item.available)
    )

    const [activeCategory, setActiveCategory] = useState(enabledCategories[0]?.id || '')

    // Refresh data periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setMenu(getMenu())
            setCart(getCurrentOrder())
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    // Tap-to-add: instantly add item
    const handleTapToAdd = (item) => {
        if (!item.available) return
        addToCurrentOrder(item, 1, [])
        setCart(getCurrentOrder())
        // Visual feedback
        setAddedItem(item.id)
        setTimeout(() => setAddedItem(null), 400)
    }

    // Remove/decrement item from order
    const handleRemoveItem = (itemIndex) => {
        const item = cart.items[itemIndex]
        if (item.quantity > 1) {
            updateItemQuantity(itemIndex, item.quantity - 1)
        } else {
            updateItemQuantity(itemIndex, 0) // This removes the item
        }
        setCart(getCurrentOrder())
    }

    // Scroll to category section
    const scrollToCategory = (categoryId) => {
        setActiveCategory(categoryId)
        categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const cartTotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const hasItems = cart.items.length > 0

    // Placeholder food images (3x3 grid visual variety)
    const placeholderImages = [
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=200&h=200&fit=crop',
    ]

    const getItemImage = (item, index) => {
        if (item.image) return item.image
        return placeholderImages[index % placeholderImages.length]
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#FAF9F7',
            paddingBottom: hasItems ? 220 : 100
        }}>
            {/* Header */}
            <PageHeader businessName={config.businessName} />

            {/* Slim Identity Strip (brand personality, not hero) */}
            <div style={{
                height: 64,
                margin: '0 16px 12px 16px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #F5F0E8 0%, #EDE8E0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
            }}>
                {/* Subtle pattern overlay */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.15,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundSize: '30px 30px'
                }} />
                {/* Simple line-art decoration */}
                <svg width="120" height="40" viewBox="0 0 120 40" fill="none" style={{ opacity: 0.3 }}>
                    <path d="M10 20 Q30 5, 60 20 T110 20" stroke="#8B7355" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <circle cx="20" cy="15" r="3" fill="#8B7355" opacity="0.5" />
                    <circle cx="60" cy="10" r="2" fill="#8B7355" opacity="0.4" />
                    <circle cx="100" cy="15" r="2.5" fill="#8B7355" opacity="0.5" />
                </svg>
            </div>

            {/* Wrapped Category Rail */}
            {enabledCategories.length > 1 && (
                <div style={{
                    margin: '0 16px 16px 16px',
                    padding: '6px',
                    background: '#F0EDE8',
                    borderRadius: 14,
                    position: 'sticky',
                    top: 52,
                    zIndex: 99
                }}>
                    <div style={{
                        display: 'flex',
                        gap: 6,
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}>
                        {enabledCategories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => scrollToCategory(category.id)}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: activeCategory === category.id ? 'white' : 'transparent',
                                    color: activeCategory === category.id ? '#1F2937' : '#6B7280',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s ease, color 0.15s ease',
                                    boxShadow: activeCategory === category.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                                }}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Menu Content - All Categories */}
            <div style={{ padding: '0 16px' }}>
                {enabledCategories.map(category => (
                    <div
                        key={category.id}
                        ref={el => categoryRefs.current[category.id] = el}
                        style={{ marginBottom: 24 }}
                    >
                        {/* Section Title */}
                        <h2 style={{
                            fontSize: 20,
                            fontWeight: 600,
                            color: '#1F2937',
                            marginBottom: 16
                        }}>
                            {category.name}
                        </h2>

                        {/* 3-Column Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 12
                        }}>
                            {category.items
                                .filter(item => item.available)
                                .map((item, index) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleTapToAdd(item)}
                                        style={{
                                            cursor: 'pointer',
                                            transform: addedItem === item.id ? 'scale(0.95)' : 'scale(1)',
                                            transition: 'transform 0.15s ease',
                                            opacity: addedItem === item.id ? 0.7 : 1
                                        }}
                                    >
                                        {/* Item Image */}
                                        <div style={{
                                            width: '100%',
                                            aspectRatio: '1',
                                            borderRadius: 12,
                                            overflow: 'hidden',
                                            background: '#E8E4DD',
                                            marginBottom: 8
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
                                        {/* Item Name */}
                                        <p style={{
                                            fontSize: 13,
                                            fontWeight: 500,
                                            color: '#1F2937',
                                            marginBottom: 2,
                                            lineHeight: 1.3
                                        }}>
                                            {item.name}
                                        </p>
                                        {/* Price */}
                                        <p style={{
                                            fontSize: 12,
                                            color: '#6B7280'
                                        }}>
                                            {formatPrice(item.price)}
                                        </p>
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Order Summary Bar (Receipt Style) */}
            {hasItems && (
                <div style={{
                    position: 'fixed',
                    bottom: 'calc(var(--nav-height, 60px) + 0px)',
                    left: 0,
                    right: 0,
                    background: '#FDFCFA',
                    borderTop: '1px dashed #E0DDD7',
                    padding: '14px 16px',
                    paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
                    zIndex: 100,
                    boxShadow: '0 -2px 12px rgba(0,0,0,0.06)'
                }}>
                    {/* Receipt Header */}
                    <div style={{
                        fontSize: 11,
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: 10,
                        textAlign: 'center'
                    }}>
                        Tu pedido
                    </div>

                    {/* Order Items List */}
                    <div style={{
                        maxHeight: 90,
                        overflowY: 'auto',
                        marginBottom: 10
                    }}>
                        {cart.items.map((item, index) => (
                            <div
                                key={`${item.id}-${index}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 6,
                                    paddingBottom: 6,
                                    borderBottom: '1px dotted #EBE8E3'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {/* Minus Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemoveItem(index)
                                        }}
                                        style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: 6,
                                            border: '1px solid #E0DDD7',
                                            background: '#FDFCFA',
                                            color: '#8B8680',
                                            fontSize: 14,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        −
                                    </button>
                                    <span style={{ fontSize: 14, color: '#374151', fontWeight: 450 }}>
                                        {item.name}
                                    </span>
                                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                                        ×{item.quantity}
                                    </span>
                                </div>
                                <span style={{ fontSize: 14, color: '#374151', fontFamily: 'system-ui' }}>
                                    {formatPrice(item.price * item.quantity)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Total Line */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 14,
                        paddingTop: 10,
                        borderTop: '1px solid #E0DDD7'
                    }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#1F2937' }}>Total</span>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#1F2937' }}>{formatPrice(cartTotal)}</span>
                    </div>

                    {/* Place Order Button */}
                    <button
                        onClick={() => navigate('/order')}
                        style={{
                            width: '100%',
                            padding: '14px 24px',
                            background: config.colors?.confirmation || '#22C55E',
                            color: 'white',
                            border: 'none',
                            borderRadius: 12,
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: 'pointer',
                            letterSpacing: '-0.01em'
                        }}
                    >
                        Confirmar Pedido
                    </button>
                </div>
            )}
        </div>
    )
}

export default Menu
