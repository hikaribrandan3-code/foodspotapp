import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addToCurrentOrder } from '../../utils/storage.js'
import { formatPrice } from '../../config/menuData.js'
import { useTenant } from '../../contexts/TenantContext.jsx'

// ============================================
// 🎯 PROMOS — CLOUD-FIRST (P1 #16)
// ============================================
// Data source: tenantData.app_config.promos
// Silo lock: useTenant() guarantees business isolation
// Architecture prep: CSS-var driven cards ready for
// 9:16 vertical "Flyer/Event Hub" conversion (next strike)
// ============================================

// --- Default fallback promos (shown if owner hasn't configured any) ---
const FALLBACK_PROMOS = [
    {
        id: 'promo-1',
        title: 'ESPECIAL DE LA SEMANA',
        name: 'Combo del Día',
        description: 'Plato principal + bebida + postre',
        price: 1499,
        originalPrice: 1899,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop',
        type: 'featured'
    },
    {
        id: 'promo-2',
        title: 'Happy Hour',
        name: '2x1 en Bebidas',
        description: 'Todos los días de 17 a 20hs',
        price: null,
        originalPrice: null,
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=400&fit=crop',
        type: 'bundle'
    }
]

function Promos() {
    const navigate = useNavigate()
    const { tenantSlug } = useParams()

    // ☁️ SILO LOCK: All data from useTenant() — no direct Supabase calls
    const { tenantData } = useTenant()
    const appConfig = tenantData?.app_config || {}
    const primaryColor = tenantData?.primary_color || '#C4856A'

    // Cloud promos (owner-configured) or fallback
    const promos = appConfig?.promos?.items || FALLBACK_PROMOS
    const promosEnabled = appConfig?.promos?.enabled !== false // default: enabled

    // Split promos by type for layout
    const featuredPromo = promos.find(p => p.type === 'featured') || promos[0]
    const bundlePromos = promos.filter(p => p !== featuredPromo)

    // Rewards config (for the bottom pill)
    const rewardsEnabled = appConfig?.features?.rewardsEnabled ?? false
    const stampsRequired = appConfig?.rewards?.stampsRequired || 10

    // Add item to cart handler
    const handleAddToCart = (item) => {
        if (!item.price) return // Skip items without price (info-only promos)
        const cartItem = {
            id: item.id,
            name: item.name || item.subtitle || item.title,
            price: item.price,
            quantity: 1,
            image: item.image
        }
        addToCurrentOrder(cartItem)
        navigate(`/${tenantSlug}/order`)
    }

    // ☁️ Empty state when promos disabled
    if (!promosEnabled) {
        return (
            <div style={styles.page}>
                <div style={styles.emptyState}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                    <p style={{ color: '#8C8476', textAlign: 'center', fontSize: 15, margin: 0 }}>
                        No hay promociones activas en este momento.
                    </p>
                    <p style={{ color: '#B8AFA4', textAlign: 'center', fontSize: 13, marginTop: 8 }}>
                        ¡Volvé pronto para enterarte de las ofertas!
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div style={styles.page}>
            {/* HEADER */}
            <header style={styles.header}>
                <h1 style={{ ...styles.title, color: primaryColor }}>Promos</h1>
                <p style={styles.subtitle}>Ofertas especiales para vos 🔥</p>
            </header>

            {/* === FEATURED PROMO (9:16-ready card) === */}
            {featuredPromo && (
                <div style={styles.featuredCard}>
                    {/* Hero Image — aspect-ratio ready for 9:16 flyer conversion */}
                    <div style={styles.featuredImageWrap}>
                        <img
                            src={featuredPromo.image}
                            alt={featuredPromo.name}
                            style={styles.featuredImage}
                        />

                        {/* Price Badge */}
                        {featuredPromo.price && (
                            <div style={styles.priceBadge}>
                                {featuredPromo.originalPrice && (
                                    <p style={styles.originalPrice}>
                                        {formatPrice(featuredPromo.originalPrice)}
                                    </p>
                                )}
                                <p style={{ ...styles.currentPrice, color: primaryColor }}>
                                    {formatPrice(featuredPromo.price)}
                                </p>
                            </div>
                        )}

                        {/* Add Button */}
                        {featuredPromo.price && (
                            <button
                                onClick={() => handleAddToCart(featuredPromo)}
                                style={{ ...styles.addButton, background: primaryColor }}
                            >
                                <span style={{ fontSize: 18, marginRight: 4 }}>+</span> AGREGAR
                            </button>
                        )}
                    </div>

                    {/* Info */}
                    <div style={styles.featuredInfo}>
                        <p style={styles.featuredLabel}>{featuredPromo.title}</p>
                        <p style={styles.featuredName}>{featuredPromo.name}</p>
                        <p style={styles.featuredDesc}>{featuredPromo.description}</p>
                    </div>
                </div>
            )}

            {/* === BUNDLE PROMOS (horizontal scroll, flyer-ready) === */}
            {bundlePromos.length > 0 && (
                <>
                    <h3 style={styles.sectionTitle}>Más ofertas</h3>
                    <div style={styles.scrollContainer}>
                        {bundlePromos.map((promo) => (
                            <div key={promo.id} style={styles.bundleCard}>
                                {/* Image */}
                                <div style={styles.bundleImageWrap}>
                                    <img
                                        src={promo.image}
                                        alt={promo.name}
                                        style={styles.bundleImage}
                                    />
                                </div>

                                {/* Info */}
                                <div style={styles.bundleInfo}>
                                    <p style={styles.bundleTitle}>{promo.title}</p>
                                    <p style={styles.bundleName}>{promo.name}</p>
                                    <p style={styles.bundleDesc}>{promo.description}</p>
                                    <div style={styles.bundleFooter}>
                                        {promo.price && (
                                            <p style={{ ...styles.bundlePrice, color: primaryColor }}>
                                                {formatPrice(promo.price)}
                                            </p>
                                        )}
                                        {promo.price && (
                                            <button
                                                onClick={() => handleAddToCart(promo)}
                                                style={{ ...styles.bundleAddBtn, background: primaryColor }}
                                            >
                                                + AGREGAR
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Bottom spacing for nav */}
            <div style={{ height: 100 }} />
        </div>
    )
}

// --- STYLES (Standard CSS, var(--color-primary) ready) ---
const styles = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#F7F4EF',
        paddingBottom: 24,
    },
    header: {
        textAlign: 'center',
        padding: '24px 16px 20px',
    },
    title: {
        fontSize: 28,
        fontWeight: 700,
        margin: 0,
        letterSpacing: '-0.02em',
    },
    subtitle: {
        fontSize: 14,
        color: '#8C8476',
        marginTop: 6,
        margin: '6px 0 0',
    },
    emptyState: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 40,
        margin: '40px 16px',
        textAlign: 'center',
    },

    // Featured Promo (9:16 flyer-ready)
    featuredCard: {
        margin: '0 16px 20px',
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    },
    featuredImageWrap: {
        position: 'relative',
        aspectRatio: '16 / 10', // Swap to 9/16 for flyer mode
        overflow: 'hidden',
    },
    featuredImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
    },
    priceBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        borderRadius: 10,
        padding: '6px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    originalPrice: {
        fontSize: 11,
        color: '#9CA3AF',
        textDecoration: 'line-through',
        margin: 0,
    },
    currentPrice: {
        fontSize: 18,
        fontWeight: 700,
        margin: 0,
    },
    addButton: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        color: 'white',
        fontWeight: 700,
        fontSize: 13,
        padding: '10px 20px',
        borderRadius: 24,
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
    },
    featuredInfo: {
        padding: '14px 16px 18px',
    },
    featuredLabel: {
        fontSize: 11,
        fontWeight: 700,
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        margin: '0 0 4px',
    },
    featuredName: {
        fontSize: 20,
        fontWeight: 700,
        color: '#1F2937',
        margin: '0 0 4px',
    },
    featuredDesc: {
        fontSize: 13,
        color: '#6B7280',
        margin: 0,
    },

    // Section
    sectionTitle: {
        fontSize: 16,
        fontWeight: 700,
        color: '#4A4238',
        margin: '0 16px 12px',
    },

    // Bundle cards (horizontal scroll)
    scrollContainer: {
        display: 'flex',
        gap: 14,
        overflowX: 'auto',
        padding: '0 16px 16px',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x mandatory',
    },
    bundleCard: {
        flexShrink: 0,
        width: 180,
        scrollSnapAlign: 'start',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    bundleImageWrap: {
        aspectRatio: '1 / 1',
        overflow: 'hidden',
    },
    bundleImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
    },
    bundleInfo: {
        padding: 12,
    },
    bundleTitle: {
        fontSize: 10,
        fontWeight: 700,
        color: '#9CA3AF',
        textTransform: 'uppercase',
        margin: '0 0 2px',
    },
    bundleName: {
        fontSize: 14,
        fontWeight: 700,
        color: '#1F2937',
        margin: '0 0 2px',
    },
    bundleDesc: {
        fontSize: 11,
        color: '#6B7280',
        margin: '0 0 8px',
    },
    bundleFooter: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bundlePrice: {
        fontSize: 15,
        fontWeight: 700,
        margin: 0,
    },
    bundleAddBtn: {
        color: 'white',
        fontSize: 10,
        fontWeight: 700,
        padding: '6px 12px',
        borderRadius: 16,
        border: 'none',
        cursor: 'pointer',
    },
}

export default Promos
