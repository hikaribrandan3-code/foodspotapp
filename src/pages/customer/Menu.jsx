import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpring, animated, config as springConfig } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import HeaderClamp from '../../components/HeaderClamp.jsx'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { normalizeTenantConfig } from '../../utils/configNormalizer.js'

// 🛡️ PHYSICS CONSTANTS (Dec 19 Engine)
const SEED_DATA = { categories: [] } // Fallback only
const MOAT_HEIGHT = 160 // Height of the physics zone

const Menu = ({ config: configProp }) => {
    const navigate = useNavigate()

    // 🌉 DATA BRIDGE: Use the same successful pipeline as Home.jsx
    const { tenantData, loading, slug: tenantSlug } = useTenant()

    // 🛡️ DATA HYDRATION (The Alignment Strike)
    // We prioritize the Cloud Data (where your burgers are) over local seeds
    const menuData = tenantData?.menu_data || SEED_DATA

    // Normalize config for HeaderClamp
    const appConfig = normalizeTenantConfig(configProp, tenantData)

    // State
    const [activeCategory, setActiveCategory] = useState(null)
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [showProductSheet, setShowProductSheet] = useState(false)
    const [cart, setCart] = useState({})

    // 🌊 MOAT PHYSICS ENGINE
    const [{ y }, api] = useSpring(() => ({ y: 0, config: { tension: 300, friction: 30 } }))
    const scrollRef = useRef(0)
    const contentHeightRef = useRef(0)
    const containerRef = useRef(null)

    // Calculate dynamic boundaries
    useEffect(() => {
        if (containerRef.current) {
            contentHeightRef.current = containerRef.current.scrollHeight - window.innerHeight + MOAT_HEIGHT + 100
        }
    }, [menuData])

    const bind = useDrag(({ movement: [, my], velocity: [, vy], down, cancel }) => {
        if (!containerRef.current) return

        // Boundaries
        const bottomLimit = -contentHeightRef.current
        const topLimit = 0

        if (down) {
            // Drag logic
            const newY = scrollRef.current + my
            // Rubber banding
            if (newY > topLimit) return api.start({ y: newY * 0.3, immediate: true })
            if (newY < bottomLimit) return api.start({ y: bottomLimit + (newY - bottomLimit) * 0.3, immediate: true })
            api.start({ y: newY, immediate: true })
        } else {
            // Momentum logic
            scrollRef.current += my + vy * 200

            // Boundary checks (Bounce back)
            if (scrollRef.current > topLimit) scrollRef.current = topLimit
            if (scrollRef.current < bottomLimit) scrollRef.current = bottomLimit

            api.start({ y: scrollRef.current })
        }
    }, { filterTaps: true })

    // 🛍️ CART LOGIC
    const addToCart = (product) => {
        setCart(prev => {
            const current = prev[product.id] || { ...product, quantity: 0 }
            return { ...prev, [product.id]: { ...current, quantity: current.quantity + 1 } }
        })
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(50)
    }

    const removeFromCart = (productId) => {
        setCart(prev => {
            const current = prev[productId]
            if (!current) return prev
            if (current.quantity <= 1) {
                const { [productId]: _, ...rest } = prev
                return rest
            }
            return { ...prev, [productId]: { ...current, quantity: current.quantity - 1 } }
        })
    }

    const cartTotal = Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0)

    // 🛡️ SAFE LOADING & ERROR CHECK
    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
                <div style={{ color: '#94A3B8' }}>Cargando Menú...</div>
            </div>
        )
    }

    // 🛡️ EMPTY STATE (Should not happen if Sync worked)
    try {
        if (!menuData?.categories?.length) {
            return (
                <div style={{ height: '100vh', padding: 20, textAlign: 'center', paddingTop: 100 }}>
                    <h2>Menú en preparación</h2>
                    <p>El dueño está configurando los productos.</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: 20, padding: '10px 20px', borderRadius: 20, border: 'none', background: '#22C55E', color: 'white' }}
                    >
                        Recargar
                    </button>
                </div>
            )
        }
    } catch (err) {
        console.error("Critical rendering error in Menu:", err)
        return null
    }

    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#F8FAFC' }}>
            <HeaderClamp config={appConfig} />

            {/* 🌊 PHYSICS CONTAINER */}
            <animated.div
                {...bind()}
                ref={containerRef}
                style={{
                    y,
                    position: 'absolute',
                    top: 80, // Offset for header
                    left: 0,
                    right: 0,
                    touchAction: 'none', // Critical for useDrag
                    paddingBottom: 200
                }}
            >
                {/* CATEGORIES LOOP */}
                {menuData.categories.map((category) => (
                    (category.enabled !== false && category.items?.length > 0) && (
                        <div key={category.id} style={{ marginBottom: 32, padding: '0 16px' }}>
                            <h2 style={{
                                fontSize: 24,
                                fontWeight: 800,
                                color: '#1E293B',
                                marginBottom: 16,
                                textTransform: 'capitalize'
                            }}>
                                {category.name}
                            </h2>

                            <div style={{ display: 'grid', gap: 16 }}>
                                {category.items.map((item) => (
                                    (item.available !== false) && (
                                        <div
                                            key={item.id}
                                            onClick={() => {
                                                setSelectedProduct(item)
                                                setShowProductSheet(true)
                                            }}
                                            style={{
                                                background: 'white',
                                                borderRadius: 16,
                                                padding: 12,
                                                display: 'flex',
                                                gap: 16,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                                border: '1px solid #F1F5F9'
                                            }}
                                        >
                                            {/* IMAGE OR PLACEHOLDER */}
                                            <div style={{
                                                width: 80,
                                                height: 80,
                                                borderRadius: 12,
                                                background: item.image ? `url(${item.image}) center/cover` : '#E2E8F0',
                                                flexShrink: 0
                                            }} />

                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#0F172A' }}>
                                                    {item.name}
                                                </h3>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span style={{ fontSize: 15, fontWeight: 700, color: '#22C55E' }}>
                                                        ${item.price?.toLocaleString()}
                                                    </span>

                                                    {/* QUICK ADD BUTTON */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            addToCart(item)
                                                        }}
                                                        style={{
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: 16,
                                                            background: '#F1F5F9',
                                                            border: 'none',
                                                            color: '#22C55E',
                                                            fontSize: 18,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )
                ))}

                {/* SPACE FOR CART FOOTER */}
                <div style={{ height: 100 }} />
            </animated.div>

            {/* 🛍️ CART FLOATING FOOTER */}
            {cartTotal > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: 24,
                    left: 24,
                    right: 24,
                    background: '#0F172A',
                    padding: '16px 24px',
                    borderRadius: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    zIndex: 100
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
                            ${cartTotal.toLocaleString()}
                        </span>
                        <span style={{ color: '#94A3B8', fontSize: 12 }}>
                            Total estimado
                        </span>
                    </div>
                    <button
                        onClick={() => alert('Checkout Logic Here')}
                        style={{
                            background: '#22C55E',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: 16,
                            fontWeight: 600,
                            fontSize: 14
                        }}
                    >
                        Ver Pedido
                    </button>
                </div>
            )}

            {/* 📄 PRODUCT BOTTOM SHEET (Minimal) */}
            {showProductSheet && selectedProduct && (
                <div
                    onClick={() => setShowProductSheet(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'flex-end'
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'white',
                            width: '100%',
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            padding: 24,
                            animation: 'slideUp 0.3s ease-out'
                        }}
                    >
                        <div style={{ width: 40, height: 4, background: '#E2E8F0', borderRadius: 2, margin: '0 auto 24px' }} />

                        <div style={{
                            height: 200,
                            borderRadius: 16,
                            background: selectedProduct.image ? `url(${selectedProduct.image}) center/cover` : '#E2E8F0',
                            marginBottom: 20
                        }} />

                        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>{selectedProduct.name}</h2>
                        <p style={{ fontSize: 20, color: '#22C55E', fontWeight: 600, margin: '0 0 24px' }}>
                            ${selectedProduct.price?.toLocaleString()}
                        </p>

                        <button
                            onClick={() => {
                                addToCart(selectedProduct)
                                setShowProductSheet(false)
                            }}
                            style={{
                                width: '100%',
                                padding: 16,
                                background: '#0F172A',
                                color: 'white',
                                borderRadius: 16,
                                border: 'none',
                                fontWeight: 600,
                                fontSize: 16
                            }}
                        >
                            Agregar al pedido
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Menu
