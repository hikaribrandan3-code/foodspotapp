import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTenant } from '../contexts/TenantContext'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabaseClient.js'
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
    const location = tenantData?.business_name || tenantData?.venue_name || 'Córdoba, AR'
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

    // Fetch featured items and categories
    useEffect(() => {
        const fetchData = async () => {
            if (!businessId) return

            try {
                // Fetch featured items from menu_items
                const { data: items, error: itemsError } = await supabase
                    .from('menu_items')
                    .select('id, name, description, price, image, category_id, is_featured, is_available')
                    .eq('business_id', businessId)
                    .eq('is_available', true)
                    .or('is_featured.eq.true,featured.eq.true')
                    .limit(4)

                if (itemsError) throw itemsError

                // If no featured items, fetch any available items
                let displayItems = items || []
                if (displayItems.length === 0) {
                    const { data: fallbackItems } = await supabase
                        .from('menu_items')
                        .select('id, name, description, price, image, category_id, is_available')
                        .eq('business_id', businessId)
                        .eq('is_available', true)
                        .limit(4)
                    displayItems = fallbackItems || []
                }

                setFeaturedItems(displayItems)

                // Fetch categories for the pills
                const { data: cats, error: catsError } = await supabase
                    .from('menu_categories')
                    .select('id, name, icon, sort_order')
                    .eq('business_id', businessId)
                    .order('sort_order', { ascending: true })
                    .limit(5)

                if (catsError) throw catsError
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
    const handleCategoryClick = (categoryName) => {
        const encodedCategory = encodeURIComponent(categoryName.toLowerCase())
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

    // Category icon mapping (Material Symbols)
    const getCategoryIcon = (categoryName, iconType) => {
        if (iconType) return iconType
        
        const name = categoryName?.toLowerCase() || ''
        if (name.includes('burger')) return 'lunch_dining'
        if (name.includes('fries') || name.includes('side')) return 'chips'
        if (name.includes('drink') || name.includes('bebida')) return 'local_bar'
        if (name.includes('sweet') || name.includes('postre') || name.includes('dessert')) return 'icecream'
        if (name.includes('pizza')) return 'local_pizza'
        if (name.includes('chicken') || name.includes('pollo')) return 'kebab_dining'
        if (name.includes('salad') || name.includes('ensalada')) return 'eco'
        return 'restaurant'
    }

    const formatPrice = (price) => {
        return `$${parseFloat(price).toFixed(2)}`
    }

    if (loading) {
        return (
            <div className="order-status-empty">
                <div className="ose-loading">
                    <div className="ose-loading-spinner"></div>
                    <p>{t('loading')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="order-status-empty">
            {/* Header */}
            <header className="ose-header">
                <div className="ose-header-content">
                    <div className="ose-location">
                        <span className="material-symbols-outlined ose-location-icon">location_on</span>
                        <h1 className="ose-location-text">{location}</h1>
                        <span className="material-symbols-outlined ose-location-arrow">expand_more</span>
                    </div>
                    <button 
                        className="ose-search-btn"
                        onClick={() => navigate(`/${tenantSlug}/menu`)}
                    >
                        <span className="material-symbols-outlined">search</span>
                    </button>
                </div>
            </header>

            <main className="ose-main">
                {/* Search Bar */}
                <section className="ose-search-section">
                    <form onSubmit={handleSearch} className="ose-search-form">
                        <span className="material-symbols-outlined ose-search-icon">search</span>
                        <input
                            type="text"
                            className="ose-search-input"
                            placeholder={t('search_placeholder') || 'Search for burgers, fries...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>

                    {/* Filter Pills */}
                    <div className="ose-filter-pills">
                        <button className="ose-pill">{t('pickup') || 'Pickup'}</button>
                        <button className="ose-pill">{t('under_20_min') || 'Under 20 min'}</button>
                        <button className="ose-pill">{t('price') || 'Price'}</button>
                        <button className="ose-pill">{t('rating') || 'Rating'}</button>
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
                {categories.length > 0 && (
                    <section className="ose-categories">
                        <h3 className="ose-section-title">{t('browse_categories') || 'Browse Categories'}</h3>
                        <div className="ose-categories-scroll">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    className="ose-category"
                                    onClick={() => handleCategoryClick(cat.name)}
                                >
                                    <div className="ose-category-icon">
                                        <span className="material-symbols-outlined">
                                            {getCategoryIcon(cat.name, cat.icon)}
                                        </span>
                                    </div>
                                    <span className="ose-category-name">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Featured Items Grid */}
                <section className="ose-featured">
                    <div className="ose-section-header">
                        <h3 className="ose-section-title">{t('recommended_for_you') || 'Recommended for you'}</h3>
                        <button 
                            className="ose-see-more"
                            onClick={() => navigate(`/${tenantSlug}/menu`)}
                        >
                            {t('see_more') || 'See More'}
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
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} loading="lazy" />
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
                                                <span className="material-symbols-outlined">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Fallback static items if no data
                            <>
                                <div className="ose-card" onClick={() => navigate(`/${tenantSlug}/menu`)}>
                                    <div className="ose-card-image ose-card-placeholder">
                                        <span>🍔</span>
                                    </div>
                                    <div className="ose-card-content">
                                        <h4 className="ose-card-title">Classic Beef Stack</h4>
                                        <p className="ose-card-desc">Double patty, cheddar</p>
                                        <div className="ose-card-footer">
                                            <span className="ose-card-price">$12.64</span>
                                            <button className="ose-card-add" style={{ backgroundColor: primaryColor }}>
                                                <span className="material-symbols-outlined">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="ose-card" onClick={() => navigate(`/${tenantSlug}/menu`)}>
                                    <div className="ose-card-image ose-card-placeholder">
                                        <span>🌶️</span>
                                    </div>
                                    <div className="ose-card-content">
                                        <h4 className="ose-card-title">Spicy Jalapeño</h4>
                                        <p className="ose-card-desc">Crispy chicken, zesty</p>
                                        <div className="ose-card-footer">
                                            <span className="ose-card-price">$10.99</span>
                                            <button className="ose-card-add" style={{ backgroundColor: primaryColor }}>
                                                <span className="material-symbols-outlined">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="ose-card" onClick={() => navigate(`/${tenantSlug}/menu`)}>
                                    <div className="ose-card-image ose-card-placeholder">
                                        <span>🍕</span>
                                    </div>
                                    <div className="ose-card-content">
                                        <h4 className="ose-card-title">Rustic Pepperoni</h4>
                                        <p className="ose-card-desc">Hand-tossed, 12-inch</p>
                                        <div className="ose-card-footer">
                                            <span className="ose-card-price">$14.50</span>
                                            <button className="ose-card-add" style={{ backgroundColor: primaryColor }}>
                                                <span className="material-symbols-outlined">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="ose-card" onClick={() => navigate(`/${tenantSlug}/menu`)}>
                                    <div className="ose-card-image ose-card-placeholder">
                                        <span>🍟</span>
                                    </div>
                                    <div className="ose-card-content">
                                        <h4 className="ose-card-title">Truffle Parm Fries</h4>
                                        <p className="ose-card-desc">Large portion, sea salt</p>
                                        <div className="ose-card-footer">
                                            <span className="ose-card-price">$6.25</span>
                                            <button className="ose-card-add" style={{ backgroundColor: primaryColor }}>
                                                <span className="material-symbols-outlined">add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </section>
            </main>

            {/* Spacer for bottom nav */}
            <div className="ose-bottom-spacer"></div>
        </div>
    )
}

// Helper to darken/lighten color for gradients
function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2))
}

export default OrderStatusEmpty
