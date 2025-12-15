import { Link } from 'react-router-dom'
import { getConfig } from '../../config/appConfig.js'
import { getMenu } from '../../config/menuData.js'

// --- SVG ICONS (Render Match - Solid Filled) ---

// --- MENU: Empanada (Solid Style)
const MenuIcon = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 13C22 7.47715 17.5228 3 12 3C6.47715 3 2 7.47715 2 13V15C2 17.7614 4.23858 20 7 20H17C19.7614 20 22 17.7614 22 15V13ZM4 13C4 8.58172 7.58172 5 12 5C16.4183 5 20 8.58172 20 13V15C20 16.6569 18.6569 18 17 18H7C5.34315 18 4 16.6569 4 15V13Z" fill="currentColor" fillOpacity="0.5" />
        {/* Solid crimped edge filled body */}
        <path d="M12 2C6.5 2 2 6.5 2 12V16C2 18.2 3.8 20 6 20H18C20.2 20 22 18.2 22 16V12C22 6.5 17.5 2 12 2ZM5 12C5 8.1 8.1 5 12 5C15.9 5 19 8.1 19 12V16C19 16.6 18.6 17 18 17H6C5.4 17 5 16.6 5 16V12Z" fillRule="evenodd" clipRule="evenodd" fill="currentColor" />
        {/* Simple Solid Empanada Shape */}
        <path d="M12 3C6.477 3 2 7.477 2 13v3c0 1.657 1.343 3 3 3h14c1.657 0 3-1.343 3-3v-3c0-5.523-4.477-10-10-10z" fill="currentColor" />
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

// --- GAME: Game Controller (Solid, Chunky - Reverted)
const GameIcon = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.5 5H5.5C3.01472 5 1 7.01472 1 9.5V14.5C1 15.8719 1.70566 17.0911 2.8023 17.8182L4.54564 19.9974C5.10976 20.7025 6.13682 20.8198 6.84197 20.2556C7.54711 19.6915 7.66436 18.6644 7.10025 17.9593L6.08866 16.6948C6.39827 16.7874 6.72127 16.8526 7.05432 16.8859C8.61863 17.0423 10.2646 17.1667 12 17.1667C13.7354 17.1667 15.3814 17.0423 16.9457 16.8859C17.2787 16.8526 17.6017 16.7874 17.9113 16.6948L16.8998 17.9593C16.3356 18.6644 16.4529 19.6915 17.158 20.2556C17.8632 20.8198 18.8902 20.7025 19.4544 19.9974L21.1977 17.8182C22.2943 17.0911 23 15.8719 23 14.5V9.5C23 7.01472 20.9853 5 18.5 5ZM8 12.5C7.17157 12.5 6.5 11.8284 6.5 11C6.5 10.1716 7.17157 9.5 8 9.5C8.82843 9.5 9.5 10.1716 9.5 11C9.5 11.8284 8.82843 12.5 8 12.5ZM16.5 13C16.2239 13 16 12.7761 16 12.5C16 12.2239 16.2239 12 16.5 12C16.7761 12 17 12.2239 17 12.5C17 12.7761 16.7761 13 16.5 13ZM15 11.5C14.7239 11.5 14.5 11.2761 14.5 11C14.5 10.7239 14.7239 10.5 15 10.5C15.2761 10.5 15.5 10.7239 15.5 11C15.5 11.2761 15.2761 11.5 15 11.5ZM16.5 10C16.2239 10 16 9.77614 16 9.5C16 9.22386 16.2239 9 16.5 9C16.7761 9 17 9.22386 17 9.5C17 9.77614 16.7761 10 16.5 10ZM18 11.5C17.7239 11.5 17.5 11.2761 17.5 11C17.5 10.7239 17.7239 10.5 18 10.5C18.2761 10.5 18.5 10.7239 18.5 11C18.5 11.2761 18.2761 11.5 18 11.5Z" />
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
