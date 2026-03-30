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
    const rawAddress = tenantData?.address || ''
    const extractedCity = rawAddress.includes(',') ? rawAddress.split(',')[0] : rawAddress
    const displayCity = extractedCity || tenantData?.city || ''

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
        // Use 'search' param instead of 'category' so it correctly finds items even if actual DB categories aren't meticulously set up yet
        navigate(`/${tenantSlug}/menu?search=${encodedCategory}`)
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
                            { id: 'cat-1', name: 'Burger', icon: 'lunch_dining', staticEmoji: '🍔' },
                            { id: 'cat-2', name: 'Fries', icon: 'chips', staticEmoji: '🍟' },
                            { id: 'cat-3', name: 'Drinks', icon: 'local_bar', staticEmoji: '🍸' },
                            { id: 'cat-4', name: 'Sweets', icon: 'icecream', staticEmoji: '🍦' },
                            { id: 'cat-5', name: 'Pizza', icon: 'local_pizza', staticEmoji: '🍕' }
                        ]).map((cat) => (
                            <button
                                key={cat.id}
                                className="ose-category"
                                onClick={() => handleCategoryClick(cat.name)}
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
                            // Fallback static items if no data (using requested placeholders)
                            <>
                                <div className="ose-card" onClick={() => navigate(`/${tenantSlug}/menu`)}>
                                    <div className="ose-card-image">
                                        <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAWWiBLsK1nG_Zs8Cs49OrPq2QJveck7-TN1iTpscNGt-fwJEw9vQK58KSKis6n5EytONT6JaxPbkB8dxrricAW7GrsaCKOfuoja3HM-c_B83d0bJsHxJy8kAosEuyru7EXNrtoxDBIyE-WaRnB6PmfervykO1sXBLpnLDZO8DpPn-V4gSxhD-WRjEgQzWzC1sxmETnytSnOjSuMQJ0O_rieloz2zc14aHaFpditC1tBijrkmPISFLzohr448R6Jwd-i3_Vuu_L2PE" alt="Classic Beef Stack" />
                                    </div>
                                    <div className="ose-card-content">
                                        <h4 className="ose-card-title">Margarita Special</h4>
                                        <p className="ose-card-desc">15-20 min • $2.00 fee</p>
                                        <div className="ose-card-footer">
                                            <span className="ose-card-price">$12.64</span>
                                            <button className="ose-card-add" style={{ backgroundColor: primaryColor }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="ose-card" onClick={() => navigate(`/${tenantSlug}/menu`)}>
                                    <div className="ose-card-image">
                                        <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqekU5dfVWOw4ZP0b4v-KSVHl2YPgoBkCP31w2D6utoMxXNrMe6T1DpgujbI_VW9zSiC3AC2a1CrApwx8vwV0biz68cOJfxaqWE0CVvZvcQIr4Ib3gckl67g6vwCsOOVeRAahLhiVZ8W9IkQI9h4okdC8QDGA8u3dNpfjmiluCTxVzSGxLo8XGJgjvJsCsG9hPlIFvOJLmimm20sBKQc-LxIwCQbhojAFgTcoSQpCe3Smkp6aohHK3jmOMzoTGNSY7ZjRu4VjPq7xE" alt="Spicy Jalapeño" />
                                    </div>
                                    <div className="ose-card-content">
                                        <h4 className="ose-card-title">Green Buddha Bowl</h4>
                                        <p className="ose-card-desc">20-25 min • Free</p>
                                        <div className="ose-card-footer">
                                            <span className="ose-card-price">$9.50</span>
                                            <button className="ose-card-add" style={{ backgroundColor: primaryColor }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="ose-card" onClick={() => navigate(`/${tenantSlug}/menu`)}>
                                    <div className="ose-card-image">
                                        <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSzl9rpOS_OdScAw4s70QODXMRHlQgJs-jyAC2czIXNUHLRVEoTaufzc7WBInzEMTxMzvikN7EBDYiCkM8lX7ziUCKgNnposqj5j9XEbBe8QotBjH2sxT-7FxwwhErqwqY3anNa8IGdWJ1VYx8zQfb24TLqd9eTGBq5ZETK9ANzJU4H4iyr9MJAq-B0BdgZEw6_iiLHAqARuxOZ9bE1JUNWOrvntob8KovOHY-xVZ-DOFwfrZDMGN22vZtz-fGmf5yMoJgq2tii_4A" alt="Rustic Pepperoni" />
                                    </div>
                                    <div className="ose-card-content">
                                        <h4 className="ose-card-title">Street Tacos Trio</h4>
                                        <p className="ose-card-desc">10-15 min • $1.50 fee</p>
                                        <div className="ose-card-footer">
                                            <span className="ose-card-price">$11.20</span>
                                            <button className="ose-card-add" style={{ backgroundColor: primaryColor }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="ose-card" onClick={() => navigate(`/${tenantSlug}/menu`)}>
                                    <div className="ose-card-image">
                                        <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwY3tF3soi0VSxERslFKaR4h5bHFl5ZmIk01SJf4nvstRi8G-O22Y4KUmZm106pBII-jxXhE-2nCCX8oCe4bkmcYWnbsKZMUo4ICAK63BZUe9m1htvu4uPx4QF1KHGcG_5Fsyd1ssJsaYigozp3utvNkUJvNJcCaG3g763uAZtqvaEREXHfwA9N205f0VsNvHqNqbaoDluoEfHfxFgwyPixKobeia5-0ihXtkrYNBofXf7GtOY3p4p8NoYnY6Vx6b9g1bziVoDZ_93" alt="Truffle Parm Fries" />
                                    </div>
                                    <div className="ose-card-content">
                                        <h4 className="ose-card-title">Choco Lava Cake</h4>
                                        <p className="ose-card-desc">15 min • Free</p>
                                        <div className="ose-card-footer">
                                            <span className="ose-card-price">$6.75</span>
                                            <button className="ose-card-add" style={{ backgroundColor: primaryColor }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
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
