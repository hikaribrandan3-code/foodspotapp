import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTenant } from '../contexts/TenantContext'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabaseClient.js'
import { HikariBoy } from './HikariBoy/HikariBoy'
import BurgerLoader from './BurgerLoader'
import './OrderStatusEmpty.css'

/**
 * OrderStatusEmpty - Pre-Order Status Empty State
 *
 * Billion-dollar food app design:
 * - Hero banner with promo
 * - Category pills
 * - Featured items grid
 * - Clean, fast, familiar
 */

const OrderStatusEmpty = ({ config: configProp }) => {
    const config = configProp || {};
    const navigate = useNavigate()
    const { tenantData, businessId } = useTenant()
    const { t } = useLanguage()
    const { tenantSlug } = useParams()

    const [featuredItems, setFeaturedItems] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // Derived values from tenant config
    const rawAddress = tenantData?.address || ''
    const extractedCity = rawAddress.includes(',') ? rawAddress.split(',')[0] : rawAddress
    const displayCity = extractedCity || tenantData?.city || ''

    const [showArcade, setShowArcade] = useState(false)

    const primaryColor = config?.branding?.primaryColor || '#FF9500'
    const navBgColor = config?.branding?.navbar_color || primaryColor

    // Promo banner config (fallback to hardcoded)
    const promoConfig = {
        enabled: tenantData?.app_config?.promo_banner_enabled ?? true,
        text: tenantData?.app_config?.promo_banner_text || 'Free delivery on your first order.',
        subtext: tenantData?.app_config?.promo_banner_subtext || 'Up to 3 times per day',
        cta: tenantData?.app_config?.promo_banner_cta || 'Claim Now',
        image: tenantData?.app_config?.promo_banner_image || null
    }

    // Translation fallbacks to prevent raw keys like "search_placeholder" rendering literally
    const translatedSearch = t('search_placeholder')
    const searchPlaceholder = translatedSearch !== 'search_placeholder' ? translatedSearch : 'Search for burgers, fries...'

    const translatedRecommended = t('recommended_for_you')
    const recommendedText = translatedRecommended !== 'recommended_for_you' ? translatedRecommended : 'Recommended for you'

    const translatedSeeMore = t('see_more')
    const seeMoreText = translatedSeeMore !== 'see_more' ? translatedSeeMore : 'See More'

    const translatedCategories = t('browse_categories')
    const categoriesText = translatedCategories !== 'browse_categories' ? translatedCategories : 'Browse Categories'

    // Fetch featured items and categories
    useEffect(() => {
        const fetchData = async () => {
            if (!businessId) return

            try {
                // 🍔 Fetch ANY items for this business — aggressive, no filters
                const { data: items, error: itemsError } = await supabase
                    .from('menu_items')
                    .select('id, name, description, price, image, image_url, category_id')
                    .eq('business_id', businessId)
                    .limit(10)

                if (itemsError) {
                    console.error('[OrderStatusEmpty] menu_items error:', itemsError)
                    throw itemsError
                }

                let displayItems = items || []
                console.log('[OrderStatusEmpty] fetched items:', displayItems.length, displayItems)

                // Shuffle and pick 4 for variety
                const shuffled = displayItems.sort(() => 0.5 - Math.random())
                setFeaturedItems(shuffled.slice(0, 4))

                // 📂 Fetch categories for the pills
                const { data: cats, error: catsError } = await supabase
                    .from('menu_categories')
                    .select('id, name, icon, sort_order')
                    .eq('business_id', businessId)
                    .order('sort_order', { ascending: true })
                    .limit(5)

                if (catsError) {
                    console.error('[OrderStatusEmpty] categories error:', catsError)
                }
                setCategories(cats || [])

            } catch (err) {
                console.error('[OrderStatusEmpty] Fetch error:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [businessId])

    // Navigation helpers
    const handleCategoryClick = (categorySlugOrName) => {
        const encodedCategory = encodeURIComponent(categorySlugOrName.toLowerCase())
        // Professional Standard: Always pass the universal key (e.g., 'drinks') to the backend/Menu router
        navigate(`/${tenantSlug}/menu?category=${encodedCategory}`)
    }

    const handleItemClick = (itemId) => {
        navigate(`/${tenantSlug}/menu/${itemId}`)
    }

    const handleClaimPromo = () => {
        // Same endpoint as Promos (coming soon)
        navigate(`/${tenantSlug}/promos`)
    }

    const handleSearch = (e) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            navigate(`/${tenantSlug}/menu?search=${encodeURIComponent(searchQuery)}`)
        }
    }

    // Replace Material string icons with robust Emoji mapping
    const getCategoryEmoji = (categoryName) => {
        const name = categoryName?.toLowerCase() || ''
        if (name.includes('burger')) return '🍔'
        if (name.includes('fries') || name.includes('side')) return '🍟'
        if (name.includes('drink') || name.includes('bebida') || name.includes('beverage')) return '🍸'
        if (name.includes('sweet') || name.includes('postre') || name.includes('dessert')) return '🍦'
        if (name.includes('pizza')) return '🍕'
        if (name.includes('chicken') || name.includes('pollo')) return '🍗'
        if (name.includes('salad') || name.includes('ensalada') || name.includes('vegan')) return '🥗'
        if (name.includes('taco')) return '🌮'
        if (name.includes('pasta')) return '🍝'
        return '🍽️'
    }

    const formatPrice = (price) => {
        return `$${parseFloat(price).toFixed(2)}`
    }

    if (loading) {
        return (
            <div className="order-status-empty" style={{ display: 'flex', minHeight: '100vh', background: '#FAFAF8' }}>
                <BurgerLoader />
            </div>
        )
    }

    return (
        <div className="order-status-empty">
            {/* Header */}
            {displayCity && (
                <header className="ose-header">
                    <div className="ose-header-content">
                        <div className="ose-location">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ose-location-icon">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <h1 className="ose-location-text">{displayCity}</h1>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ose-location-arrow" style={{marginTop: 2}}>
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                        <button
                            className="ose-search-btn"
                            onClick={() => navigate(`/${tenantSlug}/menu`)}
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </button>
                    </div>
                </header>
            )}

            <main className="ose-main">
                {/* Search Bar */}
                <section className="ose-search-section">
                    <form onSubmit={handleSearch} className="ose-search-form">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ose-search-icon" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#999' }}>
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            className="ose-search-input"
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>

                    {/* Filter Pills */}
                    <div className="ose-filter-pills">
                        <button className="ose-pill" onClick={() => navigate(`/${tenantSlug}/menu?pickup=true`)}>{t('pickup') !== 'pickup' ? t('pickup') : 'Pickup'}</button>
                        <button className="ose-pill" onClick={() => navigate(`/${tenantSlug}/menu?sort=time`)}>Under 20 min</button>
                        <button className="ose-pill" onClick={() => navigate(`/${tenantSlug}/menu?sort=price_asc`)}>Price</button>
                        <button className="ose-pill" onClick={() => navigate(`/${tenantSlug}/menu?sort=popular`)}>Most Popular</button>
                    </div>
                </section>

                {/* Hero Banner */}
                {promoConfig.enabled && (
                    <section className="ose-hero" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -20)})` }}>
                        <div className="ose-hero-content">
                            <h2 className="ose-hero-title">{promoConfig.text}</h2>
                            <p className="ose-hero-subtext">{promoConfig.subtext}</p>
                            <button className="ose-hero-cta" onClick={handleClaimPromo}>
                                {promoConfig.cta}
                            </button>
                        </div>
                        <div className="ose-hero-image">
                            {promoConfig.image ? (
                                <img src={promoConfig.image} alt="Promo" />
                            ) : (
                                <span className="ose-hero-emoji">🍔</span>
                            )}
                        </div>
                    </section>
                )}

            {/* Categories */}
            {/* Fallback to static Emoji layout if DB empty (matches user layout screenshot) */}
            <section className="ose-categories">
                <h3 className="ose-section-title">{categoriesText}</h3>
                <div className="ose-categories-scroll">
                    {(categories.length > 0 ? categories : [
                        { id: 'cat-1', name: t('burger') !== 'burger' ? t('burger') : 'Burger', slug: 'burger', staticEmoji: '🍔' },
                        { id: 'cat-2', name: t('fries') !== 'fries' ? t('fries') : 'Fries', slug: 'sides', staticEmoji: '🍟' },
                        { id: 'cat-3', name: t('drinks') !== 'drinks' ? t('drinks') : 'Drinks', slug: 'drinks', staticEmoji: '🍸' },
                        { id: 'cat-4', name: t('sweets') !== 'sweets' ? t('sweets') : 'Sweets', slug: 'desserts', staticEmoji: '🍦' },
                        { id: 'cat-5', name: t('pizza') !== 'pizza' ? t('pizza') : 'Pizza', slug: 'pizza', staticEmoji: '🍕' }
                    ]).map((cat) => (
                        <button
                            key={cat.id}
                            className="ose-category"
                            onClick={() => handleCategoryClick(cat.slug || cat.name)}
                        >
                                <div className="ose-category-icon">
                                    <span style={{ fontSize: 24, paddingBottom: 2 }}>
                                        {cat.staticEmoji || getCategoryEmoji(cat.name)}
                                    </span>
                                </div>
                                <span className="ose-category-name">{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* MunchBoy Arcade Card */}
                <section className="ose-arcade" onClick={() => setShowArcade(true)}>
                    <div className="ose-arcade-content">
                        <span className="ose-arcade-icon">🎮</span>
                        <span className="ose-arcade-text">Play a game!</span>
                        <svg className="ose-arcade-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </div>
                </section>

                {/* Featured Items Grid */}
                <section className="ose-featured">
                    <div className="ose-section-header">
                        <h3 className="ose-section-title">{recommendedText}</h3>
                        <button
                            className="ose-see-more"
                            style={{ backgroundColor: primaryColor }}
                            onClick={() => navigate(`/${tenantSlug}/menu`)}
                        >
                            {seeMoreText}
                        </button>
                    </div>

                    <div className="ose-grid">
                        {featuredItems.length > 0 ? (
                            featuredItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="ose-card"
                                    onClick={() => handleItemClick(item.id)}
                                >
                                    <div className="ose-card-image">
                                        {item.image || item.image_url ? (
                                            <img src={item.image || item.image_url} alt={item.name} loading="lazy" />
                                        ) : (
                                            <div className="ose-card-placeholder">
                                                <span>🍽️</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="ose-card-content">
                                        <h4 className="ose-card-title">{item.name}</h4>
                                        <p className="ose-card-desc">{item.description || item.name}</p>
                                        <div className="ose-card-footer">
                                            <span className="ose-card-price">{formatPrice(item.price)}</span>
                                            <button className="ose-card-add" style={{ backgroundColor: primaryColor }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="ose-empty-menu">
                                <span className="ose-empty-emoji">🍽️</span>
                                <p className="ose-empty-text">Explore our full menu</p>
                                <button
                                    className="ose-empty-cta"
                                    style={{ backgroundColor: primaryColor }}
                                    onClick={() => navigate(`/${tenantSlug}/menu`)}
                                >
                                    Browse Menu
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Spacer for bottom nav */}
            <div className="ose-bottom-spacer"></div>

            {/* 🕹️ ARCADE OVERLAY */}
            {showArcade && (
                <HikariBoy
                    onClose={() => setShowArcade(false)}
                    controllerColor={tenantData?.primary_color || '#8B5CF6'}
                    userId={tenantData?.business_name || 'guest'}
                    munchboyShellColor={tenantData?.munchboy_shell_color}
                    munchboyAColor={tenantData?.munchboy_a_color}
                    munchboyBColor={tenantData?.munchboy_b_color}
                />
            )}
        </div>
    )
}

// Helper to darken/lighten color for gradients
function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2))
}

export default OrderStatusEmpty
