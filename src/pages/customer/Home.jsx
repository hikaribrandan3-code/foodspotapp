import { Link } from 'react-router-dom'
import { getConfig } from '../../config/appConfig.js'
import { getMenu } from '../../config/menuData.js'

// --- SVG ICONS (Render Match - Solid Filled) ---

// --- MENU: Fork & Knife (Side-by-Side Parallel - Solid)
const MenuIcon = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
        {/* Knife */}
        <path d="M19.5 3C19.5 3 17 3 16 6C15.2 8.4 15.5 12 15.5 12L16.5 13L16 22H19V3H19.5Z" />
        {/* Fork */}
        <path d="M8.5 22L8 12C8 12 8.3 8.3 7.5 6C6.5 3 4 3 4 3H4.5V22H8.5Z" />
        <path d="M5.5 3V8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M7 3V8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        {/* Solid fill for parallel items */}
        <path d="M14 4.5C14 4.5 13.5 13 13.5 13L14.5 22H16.5L16 12.5C16 12.5 16 6 15.5 4.5H14Z" fill="currentColor" />
        <path d="M9.5 4.5H8L7.5 12.5L7 22H9L10 13C10 13 10.5 6 9.5 4.5Z" fill="currentColor" />

        {/* Clean simplified Parallel Fork & Knife */}
        <path d="M11 3v9c0 1.66-1.34 3-3 3h-1c-1.66 0-3-1.34-3-3V3h1v6h2V3h1v6h2V3h1zm5 19l-.97-10H14l1.4-8.8c.2-.99.98-1.2 1.6-.8 1.48 1.1 2 3.6 2 6.6V22h-3z" fill="currentColor" />
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

// --- GAME: Handheld Console (Switch Lite Style - Solid)
const GameIcon = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 8C22 6.89543 21.1046 6 20 6H4C2.89543 6 2 6.89543 2 8V16C2 17.1046 2.89543 18 4 18H20C21.1046 18 22 17.1046 22 16V8ZM7.5 10H8.5V11H9.5V12H8.5V13H7.5V12H6.5V11H7.5V10ZM17 11C17.5523 11 18 10.5523 18 10C18 9.44772 17.5523 9 17 9C16.4477 9 16 9.44772 16 10C16 10.5523 16.4477 11 17 11ZM15 13C15.5523 13 16 12.5523 16 12C16 11.4477 15.5523 11 15 11C14.4477 11 14 11.4477 14 12C14 12.5523 14.4477 13 15 13ZM18 14C18.5523 14 19 13.5523 19 13C19 12.4477 18.5523 12 18 12C17.4477 12 17 12.4477 17 13C17 13.5523 17.4477 14 18 14ZM5 8H19V16H5V8Z" fill="currentColor" />
        {/* Solid body with screen cutout - simpler path */}
        <path d="M22 9C22 7.34 20.66 6 19 6H5C3.34 6 2 7.34 2 9V15C2 16.66 3.34 18 5 18H19C20.66 18 22 16.66 22 15V9ZM6 12C6 11.45 6.45 11 7 11H7.5V10.5C7.5 9.95 7.95 9.5 8.5 9.5C9.05 9.5 9.5 9.95 9.5 10.5V11H10C10.55 11 11 11.45 11 12C11 12.55 10.55 13 10 13H9.5V13.5C9.5 14.05 9.05 14.5 8.5 14.5C7.95 14.5 7.5 14.05 7.5 13.5V13H7C6.45 13 6 12.55 6 12ZM19 12C19 12.55 18.55 13 18 13C17.45 13 17 12.55 17 12C17 11.45 17.45 11 18 11C18.55 11 19 11.45 19 12ZM17 14C17 14.55 16.55 15 16 15C15.45 15 15 14.55 15 14C15 13.45 15.45 13 16 13C16.55 13 17 13.45 17 14ZM16.5 10C16.5 10.55 16.05 11 15.5 11C14.95 11 14.5 10.55 14.5 10C14.5 9.45 14.95 9 15.5 9C16.05 9 16.5 9.45 16.5 10Z" fill="currentColor" fillRule="evenodd" />
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
