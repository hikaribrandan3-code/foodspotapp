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
    const [resolvedBusinessId, setResolvedBusinessId] = useState(null)

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

    // Resolve businessId from URL slug (for guest/unauthenticated access)
    useEffect(() => {
        const resolveBusinessId = async () => {
            if (!tenantSlug) return

            try {
                const { data, error } = await supabase
                    .from('businesses')
                    .select('id')
                    .eq('slug', tenantSlug)
                    .single()

                if (!error && data) {
                    console.log('[OrderStatusEmpty] Resolved businessId from slug:', data.id)
                    setResolvedBusinessId(data.id)
                } else {
                    console.warn('[OrderStatusEmpty] Could not resolve businessId from slug:', tenantSlug, error)
                }
            } catch (err) {
                console.error('[OrderStatusEmpty] Error resolving businessId:', err)
            }
        }

        resolveBusinessId()
    }, [tenantSlug])

    // 🍔 FALLBACK: Use tenantData.menu_data if available (faster, always present)
    const menuDataCategories = tenantData?.menu_data?.categories || []
    const menuDataItems = React.useMemo(() => {
        const items = []
        if (tenantData?.menu_data?.categories) {
            for (const cat of tenantData.menu_data.categories) {
                if (cat.items?.length > 0) {
                    items.push({ ...cat.items[0], categoryName: cat.name })
                }
                if (items.length >= 4) break
            }
        }
        return items
    }, [tenantData?.menu_data])

    // Merge DB categories with menu_data fallback
    const displayCategories = categories.length > 0
        ? categories
        : menuDataCategories.length > 0
            ? menuDataCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon, slug: c.slug || c.name }))
            : [
                { id: 'cat-1', name: t('burger') !== 'burger' ? t('burger') : 'Burgers', slug: 'burger' },
                { id: 'cat-2', name: t('appetizers') !== 'appetizers' ? t('appetizers') : 'Appetizers', slug: 'appetizers' },
                { id: 'cat-3', name: t('drinks') !== 'drinks' ? t('drinks') : 'Drinks', slug: 'drinks' },
                { id: 'cat-4', name: t('desserts') !== 'desserts' ? t('desserts') : 'Desserts', slug: 'desserts' }
            ]

    // Merge DB items with menu_data fallback for the 4-square grid
    const displayItems = featuredItems.length > 0 ? featuredItems : menuDataItems

    // Fetch featured items and categories
    useEffect(() => {
        const fetchData = async () => {
            const effectiveBusinessId = resolvedBusinessId || businessId
            console.log('[OrderStatusEmpty] Starting fetch, businessId:', effectiveBusinessId, '(resolved:', resolvedBusinessId, ', authenticated:', businessId, ')')
            if (!effectiveBusinessId) {
                console.warn('[OrderStatusEmpty] No businessId — skipping fetch')
                setLoading(false)
                return
            }

            try {
                // 🍔 Fetch ANY items for this business — aggressive, no filters
                const { data: items, error: itemsError } = await supabase
                    .from('menu_items')
                    .select('id, name, description, price, image, image_url, category_id')
                    .eq('business_id', effectiveBusinessId)
                    .limit(20)

                console.log('[OrderStatusEmpty] Raw Supabase response:', { items, itemsError })

                if (itemsError) {
                    console.error('[OrderStatusEmpty] menu_items error:', itemsError)
                    throw itemsError
                }

                let displayItems = items || []
                // 🗑️ FILTER: Only exclude items with no name
                displayItems = displayItems.filter(item => {
                    const name = (item.name || '').toLowerCase().trim()
                    // Block only truly empty/generic placeholder names
                    const isGenericName = !name || name === '' || name === 'item' || name.startsWith('item ')
                    return !isGenericName
                })
                console.log('[OrderStatusEmpty] after filter:', displayItems.length, 'items')

                // Shuffle and pick 4 for variety
                const shuffled = displayItems.sort(() => 0.5 - Math.random())
                setFeaturedItems(shuffled.slice(0, 4))

                // 📂 Fetch categories for the pills
                const { data: cats, error: catsError } = await supabase
                    .from('categories')
                    .select('id, name, icon, sort_order')
                    .eq('business_id', effectiveBusinessId)
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
    }, [resolvedBusinessId, businessId])

    // Open maps with business address
    const handleLocationClick = () => {
        const address = rawAddress || displayCity
        if (address) {
            const query = encodeURIComponent(address)
            window.open(`https://maps.google.com/?q=${query}`, '_blank')
        }
    }

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
    // Uses deterministic position-based fallback to ensure unique icons per category
    const DRINK_EMOJIS = ['🥤', '🧃', '🥛', '🍹', '🧉', '☕', '🍵']
    const getCategoryEmoji = (categoryName, index = 0) => {
        const name = (categoryName || '').toLowerCase()
        
        // Unique food categories
        if (name.includes('burger') || name.includes('hamburg')) return '🍔'
        if (name.includes('fries') || name.includes('side') || name.includes('entrada') || name.includes('appetizer') || name.includes('starter') || name.includes('snack')) return '🍟'
        if (name.includes('cerveza') || name.includes('beer')) return '🍺'
        if (name.includes('alcohol') || name.includes('wine') || name.includes('vino') || name.includes('whisky') || name.includes('vodka')) return '🍷'
        if (name.includes('pizza')) return '🍕'
        if (name.includes('chicken') || name.includes('pollo')) return '🍗'
        if (name.includes('salad') || name.includes('ensalada') || name.includes('vegan')) return '🥗'
        if (name.includes('taco') || name.includes('burrito') || name.includes('mexican')) return '🌮'
        if (name.includes('pasta')) return '🍝'
        if (name.includes('sushi') || name.includes('japanese')) return '🍣'
        if (name.includes('coffee') || name.includes('cafe')) return '☕'
        if (name.includes('ice cream') || name.includes('helado')) return '🍦'
        if (name.includes('sandwich') || name.includes('wrap')) return '🥪'
        if (name.includes('steak') || name.includes('meat') || name.includes('carne') || name.includes('parrilla')) return '🥩'
        if (name.includes('breakfast') || name.includes('desayuno')) return '🍳'
        if (name.includes('bakery') || name.includes('pan') || name.includes('pastry')) return '🥐'
        if (name.includes('tarta') || name.includes('cake') || name.includes('pie')) return '🥧'
        if (name.includes('empanada')) return '🥟'
        if (name.includes('hot dog')) return '🌭'
        if (name.includes('soup') || name.includes('sopa')) return '🍲'
        if (name.includes('fish') || name.includes('pescado')) return '🐟'
        
        // Drinks/Bebidas — cycle through different emojis by index to guarantee uniqueness
        if (name.includes('drink') || name.includes('bebida') || name.includes('beverage') || name.includes('refresco') || name.includes('gaseosa')) {
            return DRINK_EMOJIS[index % DRINK_EMOJIS.length]
        }
        
        // Desserts
        if (name.includes('sweet') || name.includes('postre') || name.includes('dessert') || name.includes('dulce')) return '🍰'
        
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
                        <button className="ose-location" onClick={handleLocationClick}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ose-location-icon">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <h1 className="ose-location-text">{displayCity}</h1>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ose-location-arrow" style={{marginTop: 2}}>
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
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
            <section className="ose-categories">
                <h3 className="ose-section-title">{categoriesText}</h3>
                <div className="ose-categories-scroll">
                    {displayCategories.map((cat, idx) => (
                        <button
                            key={cat.id}
                            className="ose-category"
                            onClick={() => handleCategoryClick(cat.slug || cat.name)}
                        >
                            <div className="ose-category-icon">
                                <span style={{ fontSize: 24, paddingBottom: 2 }}>
                                    {getCategoryEmoji(cat.name, idx)}
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
                        {displayItems.length > 0 ? (
                            displayItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="ose-card"
                                    onClick={() => handleItemClick(item.id)}
                                >
                                    <div className="ose-card-image">
                                        {item.image || item.image_url ? (
                                            <img
                                                src={item.image || item.image_url}
                                                alt={item.name}
                                                loading="lazy"
                                                onError={(e) => {
                                                    e.target.style.display = 'none'
                                                    e.target.nextSibling.style.display = 'flex'
                                                }}
                                            />
                                        ) : null}
                                        <div className="ose-card-placeholder" style={{ display: (item.image || item.image_url) ? 'none' : 'flex' }}>
                                            <span>{getCategoryEmoji(item.categoryName || item.name, 0)}</span>
                                        </div>
                                    </div>
                                    <div className="ose-card-content">
                                        <h4 className="ose-card-title">{item.name}</h4>
                                        <p className="ose-card-desc">
                                            {item.description && item.description !== item.name
                                                ? item.description
                                                : item.categoryName || ''}
                                        </p>
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
                                <div className="ose-empty-icons">
                                    {displayCategories.slice(0, 4).map((cat, idx) => (
                                        <span key={idx}>{getCategoryEmoji(cat.name, idx)}</span>
                                    ))}
                                </div>
                                <p className="ose-empty-title">Something delicious is coming</p>
                                <p className="ose-empty-text">Our kitchen is stocking up. Check the full menu to see what's ready now.</p>
                                <button
                                    className="ose-empty-cta"
                                    style={{ backgroundColor: primaryColor }}
                                    onClick={() => navigate(`/${tenantSlug}/menu`)}
                                >
                                    See Full Menu →
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
