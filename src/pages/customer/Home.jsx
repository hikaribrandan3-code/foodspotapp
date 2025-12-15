import { Link } from 'react-router-dom'
import { getConfig } from '../../config/appConfig.js'
import { getMenu } from '../../config/menuData.js'

// --- SVG ICONS (Phosphor Fill Style) ---

// --- MENU: ForkKnife (fill)
const MenuIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M72,88V40a8,8,0,0,1,16,0V88a8,8,0,0,1-16,0ZM216,40V224a8,8,0,0,1-16,0V176H152a8,8,0,0,1-8-8,268.75,268.75,0,0,1,7.22-56.88c9.78-40.49,28.32-67.63,53.63-78.47A8,8,0,0,1,216,40ZM56,88V40a8,8,0,0,0-16,0V88a8,8,0,0,0,16,0Zm48-48a8,8,0,0,0-16,0V88a8,8,0,0,0,16,0ZM88,216V120H64a32,32,0,0,1-32-32V40a24,24,0,0,1,48,0V88a24.05,24.05,0,0,1-8,17.89V216a8,8,0,0,1-16,0Z" />
    </svg>
)

// --- ORDER: ShoppingBag (fill)
const OrderIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M216,64H176a48,48,0,0,0-96,0H40A16,16,0,0,0,24,80V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm48,80a8,8,0,0,1-16,0V96a8,8,0,0,1,16,0Zm-80,0a8,8,0,0,1-16,0V96a8,8,0,0,1,16,0Z" />
    </svg>
)

// --- REWARDS: Star (fill)
const RewardsIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z" />
    </svg>
)

// --- GAME: GameController (fill)
const GameIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M176,112H152a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16ZM104,96H96V88a8,8,0,0,0-16,0v8H72a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0v-8h8a8,8,0,0,0,0-16Zm128,24v36a24,24,0,0,1-24,24H48a24,24,0,0,1-24-24V120A64,64,0,0,1,88,56h80a64,64,0,0,1,64,64Z" />
    </svg>
)

// --- MAIN COMPONENT ---

function Home() {
    const config = getConfig()
    const menu = getMenu()

    // Fallback images
    const placeholderImages = {
        'flat-white': 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&q=80',
        'cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',
        'brownie-nuez': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80',
        'medialuna-manteca': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80'
    }

    // Resolve featured items
    const featuredItems = (config.featuredPhotos || [])
        .filter(fp => fp.enabled && fp.menuItemId)
        .slice(0, 4)
        .map(fp => {
            for (const cat of (menu.categories || [])) {
                const item = cat.items?.find(i => i.id === fp.menuItemId)
                if (item) {
                    return {
                        ...item,
                        categoryName: cat.name,
                        image: item.image || placeholderImages[item.id] || null
                    }
                }
            }
            return null
        })
        .filter(Boolean)

    // Fill remaining slots
    if (featuredItems.length < 4) {
        const allItems = menu.categories?.flatMap(cat =>
            cat.items?.slice(0, 2).map(item => ({
                ...item,
                categoryName: cat.name,
                image: item.image || placeholderImages[item.id] || null
            }))
        ) || []
        for (const item of allItems) {
            if (featuredItems.length >= 4) break
            if (!featuredItems.find(f => f.id === item.id)) {
                featuredItems.push(item)
            }
        }
    }

    // Styles for the 2x2 Grid Tiles
    const tileStyle = {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: '1 / 0.85',
        gap: 12,
        textDecoration: 'none',
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        padding: 16
    }

    const tileTextStyle = {
        fontSize: 14,
        fontWeight: 500,
        color: '#4A4238', // Warm dark brownish-grey
        marginTop: 4
    }

    const iconColor = '#4A4036'

    return (
        <div className="page" style={{
            padding: '0 24px',
            paddingBottom: 90,
            backgroundColor: '#F7F4EF', // Soft beige background matches reference
            minHeight: '100vh'
        }}>
            {/* Header */}
            <header style={{
                padding: '24px 0 32px',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: 26,
                    fontWeight: 600,
                    color: '#4A4238',
                    margin: 0,
                    letterSpacing: '-0.02em',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    FoodSpot
                </h1>
            </header>

            {/* Main 2x2 Navigation Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 20
            }}>
                {/* 1. Menu */}
                <Link to="/menu" style={tileStyle}>
                    <span style={{ color: iconColor }}><MenuIcon /></span>
                    <span style={tileTextStyle}>Menu</span>
                </Link>

                {/* 2. Order */}
                <Link to="/order" style={tileStyle}>
                    <span style={{ color: iconColor }}><OrderIcon /></span>
                    <span style={tileTextStyle}>Order</span>
                </Link>

                {/* 3. Rewards */}
                <Link to="/rewards" style={tileStyle}>
                    <span style={{ color: iconColor }}><RewardsIcon /></span>
                    <span style={tileTextStyle}>Rewards</span>
                </Link>

                {/* 4. Mini Game */}
                <Link to="/game" style={tileStyle}>
                    <span style={{ color: iconColor }}><GameIcon /></span>
                    <span style={tileTextStyle}>Mini Game</span>
                </Link>
            </div>

            {/* Featured Feed Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {featuredItems.slice(0, 4).map((item, i) => (
                    <Link
                        key={item.id || i}
                        to="/menu"
                        style={{
                            textDecoration: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            backgroundColor: '#FFFFFF',
                            borderRadius: 16,
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}
                    >
                        {/* Image Top */}
                        <div style={{
                            height: 120,
                            width: '100%',
                            background: item.image
                                ? `url(${item.image}) center/cover no-repeat`
                                : '#E5E0D8'
                        }} />

                        {/* Content Bottom (Matches "Local photography" look) */}
                        <div style={{ padding: '10px 12px' }}>
                            <div style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#4A4238',
                                marginBottom: 4,
                                lineHeight: 1.2
                            }}>
                                {item.name}
                            </div>
                            <div style={{
                                fontSize: 10,
                                color: '#8C8476', // Muted warm grey
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                            }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                </svg>
                                Local Spot
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Pause Orders Message */}
            {config.pauseOrders && (
                <div style={{
                    marginTop: 20,
                    padding: 12,
                    textAlign: 'center',
                    borderRadius: 12,
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FEE2E2'
                }}>
                    <p style={{ fontSize: 12, color: '#DC2626', margin: 0, fontWeight: 500 }}>
                        {config.pauseOrdersMessage}
                    </p>
                </div>
            )}
        </div>
    )
}

export default Home
