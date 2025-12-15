import { Link } from 'react-router-dom'
import { getConfig } from '../../config/appConfig.js'
import { getMenu } from '../../config/menuData.js'

// --- SVG ICONS (Render Match - Solid Filled) ---

// --- MENU: Fork & Knife (Parallel - User Provided)
const MenuIcon = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
        <path d="M5 3C5 2.44772 5.44772 2 6 2C6.55228 2 7 2.44772 7 3V7H9V3C9 2.44772 9.44772 2 10 2C10.5523 2 11 2.44772 11 3V8C11 9.87827 9.68953 11.4534 7.91776 11.8953L8 21C8 21.5523 7.55228 22 7 22C6.44772 22 6 21.5523 6 21L5.91776 11.8953C4.31047 11.4534 3 9.87827 3 8V3C3 2.44772 3.44772 2 4 2C4.55228 2 5 2.44772 5 3V7H5V3Z" fill="currentColor" />
        <path d="M15 2C13.8954 2 13 2.89543 13 4V21C13 21.5523 13.4477 22 14 22H16C16.5523 22 17 21.5523 17 21V12C18.6569 12 20 10.6569 20 9V4C20 2.89543 19.1046 2 18 2H15Z" fill="currentColor" />
    </svg>
)

// --- ORDER: Shopping Bag (Solid, handle cutout)
const OrderIcon = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M16 6V5C16 3.34315 14.6569 2 13 2H11C9.34315 2 8 3.34315 8 5V6H5C3.34315 6 2 7.34315 2 9V19C2 20.6569 3.34315 22 5 22H19C20.6569 22 22 20.6569 22 19V9C22 7.34315 20.6569 6 19 6H16ZM10 6H14V5C14 4.44772 13.5523 4 13 4H11C10.4477 4 10 4.44772 10 5V6Z" />
    </svg>
)

// --- REWARDS: Star (Chunky, Rounded)
const RewardsIcon = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.9274 3.0539C12.6366 2.28585 11.3634 2.28585 11.0726 3.05389L8.78441 9.09846L2.34005 9.47167C1.52737 9.51873 1.18733 10.5184 1.83842 10.9472L6.87873 14.2662L5.18342 20.575C4.96667 21.3816 5.86595 22.0223 6.55088 21.5458L12 17.7547L17.4491 21.5458C18.1341 22.0223 19.0333 21.3816 18.8166 20.575L17.1213 14.2662L22.1616 10.9472C22.8127 10.5184 22.4726 9.51873 21.6599 9.47167L15.2156 9.09846L12.9274 3.0539Z" />
    </svg>
)

// --- GAME: Handheld Console (User Provided)
const GameIcon = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M2 10C2 7.79086 3.79086 6 6 6H18C20.2091 6 22 7.79086 22 10V14C22 16.2091 20.2091 18 18 18H6C3.79086 18 2 16.2091 2 14V10ZM6 10C6 9.44772 6.44772 9 7 9H9C9.55228 9 10 9.44772 10 10V14C10 14.5523 9.55228 15 9 15H7C6.44772 15 6 14.5523 6 14V10ZM16.5 10C17.3284 10 18 10.6716 18 11.5C18 12.3284 17.3284 13 16.5 13C15.6716 13 15 12.3284 15 11.5C15 10.6716 15.6716 10 16.5 10ZM14.5 12.5C14.5 11.6716 13.8284 11 13 11C12.1716 11 11.5 11.6716 11.5 12.5C11.5 13.3284 12.1716 14 13 14C13.8284 14 14.5 13.3284 14.5 12.5Z" fill="currentColor" />
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
