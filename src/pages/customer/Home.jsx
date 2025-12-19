import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getConfig, reorderPrimaryActions, reorderFeaturedItems, defaultConfig, HERO_ICON_DARK } from '../../config/appConfig.js'
import { getMenu } from '../../config/menuData.js'
import { getUserMode } from '../../pages/admin/SuperAdmin.jsx'
import { MenuIcon, DeliveryIcon, RewardsIcon, GameIcon } from '../../components/HeroIcons.jsx'
import HeaderClamp from '../../components/HeaderClamp.jsx'

// Long-press timing (1.8 seconds)
const LONG_PRESS_DURATION = 1800

// Action definitions (using shared HeroIcons)
const ACTION_DEFINITIONS = {
    menu: { icon: MenuIcon, label: 'Menu', path: '/menu' },
    envios: { icon: DeliveryIcon, label: 'Envíos', path: '/envios' },
    rewards: { icon: RewardsIcon, label: 'Rewards', path: '/rewards' },
    game: { icon: GameIcon, label: 'Mini Game', path: '/game' }
}

// --- MAIN COMPONENT ---

function Home() {
    const navigate = useNavigate()
    const [config, setConfig] = useState(() => getConfig())
    const menu = getMenu()

    // Owner mode detection
    const isOwnerMode = getUserMode() === 'owner'

    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false)
    const longPressTimerRef = useRef(null)
    const longPressStartRef = useRef(null)
    const shouldBlockClickRef = useRef(false) // Prevent Chrome navigation on long-press

    // Drag state
    const [dragState, setDragState] = useState(null)
    const actionsGridRef = useRef(null)
    const featuredGridRef = useRef(null)

    // Get home config with defaults
    const homeConfig = config.homeConfig || defaultConfig.homeConfig
    const primaryActions = homeConfig.primaryActions || ['menu', 'envios', 'rewards', 'game']
    const featuredItemIds = homeConfig.featuredItems || []

    // Fallback images
    const placeholderImages = {
        'flat-white': 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&q=80',
        'cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',
        'brownie-nuez': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80',
        'medialuna-manteca': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80'
    }

    // Resolve featured items from IDs
    // Image priority: 1) Branding override (featuredPhotos) → 2) Menu item → 3) Placeholder
    const featuredPhotos = config.featuredPhotos || []
    const featuredItems = featuredItemIds
        .map(itemId => {
            for (const cat of (menu.categories || [])) {
                const item = cat.items?.find(i => i.id === itemId)
                if (item) {
                    // Check for branding image override first
                    const brandingOverride = featuredPhotos.find(fp => fp.menuItemId === itemId)
                    const brandingImage = brandingOverride?.image || null

                    return {
                        ...item,
                        categoryName: cat.name,
                        image: brandingImage || item.image || placeholderImages[item.id] || null
                    }
                }
            }
            return null
        })
        .filter(Boolean)
        .slice(0, 4)

    // Fill remaining slots if needed
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

    // Long-press handlers for edit mode (owner only)
    const handleLongPressStart = useCallback((e) => {
        if (!isOwnerMode || isEditMode) return

        longPressStartRef.current = {
            x: e.touches?.[0]?.clientX || e.clientX,
            y: e.touches?.[0]?.clientY || e.clientY
        }
        shouldBlockClickRef.current = true // Block navigation during long-press

        longPressTimerRef.current = setTimeout(() => {
            console.log('HOME EDIT MODE ACTIVATED — VIBRATE FIRED')
            if (navigator.vibrate) {
                navigator.vibrate(50)
            }
            setIsEditMode(true)
        }, LONG_PRESS_DURATION)
    }, [isOwnerMode, isEditMode])

    const handleLongPressEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
        // Reset click blocker immediately - click will fire after touchend
        shouldBlockClickRef.current = false
    }, [])

    const handleLongPressMove = useCallback((e) => {
        if (longPressStartRef.current && longPressTimerRef.current) {
            const currentX = e.touches?.[0]?.clientX || e.clientX
            const currentY = e.touches?.[0]?.clientY || e.clientY
            const deltaX = Math.abs(currentX - longPressStartRef.current.x)
            const deltaY = Math.abs(currentY - longPressStartRef.current.y)

            if (deltaX > 10 || deltaY > 10) {
                clearTimeout(longPressTimerRef.current)
                longPressTimerRef.current = null
            }
        }
    }, [])

    // Drag handlers
    const handleDragStart = useCallback((e, gridType, itemId, itemIndex, items) => {
        if (!isOwnerMode || !isEditMode) return

        // Haptic not on drag start (only on edit mode entry)
        document.body.style.overflow = 'hidden'

        const touch = e.touches?.[0] || e
        const rect = e.currentTarget.getBoundingClientRect()

        setDragState({
            gridType, // 'actions' or 'featured'
            itemId,
            itemIndex,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            offsetX: touch.clientX - rect.left,
            offsetY: touch.clientY - rect.top,
            itemWidth: rect.width,
            itemHeight: rect.height,
            items: items.map(i => typeof i === 'string' ? i : i.id),
            targetIndex: itemIndex
        })
    }, [isOwnerMode, isEditMode])

    const handleDragMove = useCallback((e) => {
        if (!dragState) return

        e.preventDefault()
        const touch = e.touches?.[0] || e

        // Get grid reference
        const grid = dragState.gridType === 'actions' ? actionsGridRef.current : featuredGridRef.current
        if (!grid) return

        const gridRect = grid.getBoundingClientRect()

        // Calculate target index based on position
        const gridItems = grid.children
        let targetIndex = dragState.itemIndex

        for (let i = 0; i < gridItems.length; i++) {
            const itemRect = gridItems[i].getBoundingClientRect()
            if (touch.clientX > itemRect.left && touch.clientX < itemRect.right &&
                touch.clientY > itemRect.top && touch.clientY < itemRect.bottom) {
                targetIndex = i
                break
            }
        }

        setDragState(prev => ({
            ...prev,
            currentX: touch.clientX,
            currentY: touch.clientY,
            targetIndex
        }))
    }, [dragState])

    const handleDragEnd = useCallback(() => {
        if (!dragState) return

        document.body.style.overflow = ''

        if (dragState.itemIndex !== dragState.targetIndex) {
            const newOrder = [...dragState.items]
            const [movedItem] = newOrder.splice(dragState.itemIndex, 1)
            newOrder.splice(dragState.targetIndex, 0, movedItem)

            // Save based on grid type
            if (dragState.gridType === 'actions') {
                reorderPrimaryActions(newOrder)
            } else {
                reorderFeaturedItems(newOrder)
            }

            // Refresh config
            setConfig(getConfig())
        }

        setDragState(null)
    }, [dragState])

    // Global event listeners for drag
    useEffect(() => {
        if (dragState) {
            const handleMove = (e) => handleDragMove(e)
            const handleEnd = () => handleDragEnd()

            document.addEventListener('touchmove', handleMove, { passive: false })
            document.addEventListener('touchend', handleEnd)
            document.addEventListener('mousemove', handleMove)
            document.addEventListener('mouseup', handleEnd)

            return () => {
                document.removeEventListener('touchmove', handleMove)
                document.removeEventListener('touchend', handleEnd)
                document.removeEventListener('mousemove', handleMove)
                document.removeEventListener('mouseup', handleEnd)
            }
        }
    }, [dragState, handleDragMove, handleDragEnd])

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current)
            }
        }
    }, [])

    // Styles - use CSS variables for hero icons (fully isolated from nav)
    // Map actionId to CSS variable names
    const heroVarMap = {
        menu: { bg: '--hero-menu-bg', icon: '--hero-menu-icon' },
        envios: { bg: '--hero-delivery-bg', icon: '--hero-delivery-icon' }, // envios maps to delivery
        rewards: { bg: '--hero-rewards-bg', icon: '--hero-rewards-icon' },
        game: { bg: '--hero-game-bg', icon: '--hero-game-icon' },
    }

    const getTileBgVar = (actionId) => `var(${heroVarMap[actionId]?.bg || '--hero-menu-bg'})`
    const getTileIconVar = (actionId) => `var(${heroVarMap[actionId]?.icon || '--hero-menu-icon'})`

    const tileStyle = {
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

    const getTileTextStyle = (actionId) => ({
        fontSize: 14,
        fontWeight: 500,
        color: getTileIconVar(actionId),
        marginTop: 4
    })

    return (
        <div
            className={`page ${isEditMode ? 'home-edit-mode' : ''}`}
            onContextMenu={(e) => { if (isEditMode) { e.preventDefault(); e.stopPropagation() } }}
            style={{
                padding: '0 24px',
                paddingBottom: 90,
                minHeight: '100vh'
            }}
        >
            <HeaderClamp />

            {/* Edit Mode Done Button (Owner only) */}
            {isEditMode && (
                <div style={{
                    position: 'fixed',
                    top: 'env(safe-area-inset-top, 0px)',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#22C55E' }}>
                        ✏️ Modo Edición
                    </span>
                    <button
                        onClick={() => setIsEditMode(false)}
                        style={{
                            padding: '8px 20px',
                            background: '#22C55E',
                            color: 'white',
                            border: 'none',
                            borderRadius: 20,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Done
                    </button>
                </div>
            )}

            {/* Main 2x2 Navigation Grid */}
            <div
                ref={actionsGridRef}
                className="actions-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    marginBottom: 20
                }}
            >
                {primaryActions.map((actionId, index) => {
                    const action = ACTION_DEFINITIONS[actionId]
                    if (!action) return null

                    const Icon = action.icon
                    const isDragging = dragState?.gridType === 'actions' && dragState?.itemId === actionId
                    const isPlaceholder = dragState?.gridType === 'actions' && dragState?.targetIndex === index && !isDragging

                    const tileContent = (
                        <>
                            <span style={{ color: getTileIconVar(actionId) }}><Icon /></span>
                            <span style={getTileTextStyle(actionId)}>{action.label}</span>
                        </>
                    )

                    // Owner mode: always use div (no Link navigation issues)
                    if (isOwnerMode) {
                        return (
                            <div
                                key={actionId}
                                onTouchStart={(e) => isEditMode
                                    ? handleDragStart(e, 'actions', actionId, index, primaryActions)
                                    : handleLongPressStart(e)
                                }
                                onTouchEnd={!isEditMode ? handleLongPressEnd : undefined}
                                onTouchMove={!isEditMode ? handleLongPressMove : undefined}
                                onMouseDown={(e) => isEditMode
                                    ? handleDragStart(e, 'actions', actionId, index, primaryActions)
                                    : handleLongPressStart(e)
                                }
                                onMouseUp={!isEditMode ? handleLongPressEnd : undefined}
                                onMouseLeave={!isEditMode ? handleLongPressEnd : undefined}
                                onClick={() => { if (!isEditMode && !shouldBlockClickRef.current) navigate(action.path) }}
                                className={isEditMode ? 'menu-item-wiggle' : ''}
                                style={{
                                    ...tileStyle,
                                    backgroundColor: getTileBgVar(actionId),
                                    cursor: isEditMode ? 'grab' : 'pointer',
                                    opacity: isDragging ? 0.3 : 1,
                                    background: isPlaceholder ? 'rgba(34, 197, 94, 0.15)' : getTileBgVar(actionId),
                                    border: isPlaceholder ? '2px dashed #22C55E' : 'none',
                                    touchAction: isEditMode ? 'none' : 'auto'
                                }}
                            >
                                {tileContent}
                            </div>
                        )
                    }

                    // Non-owner: standard Link
                    return (
                        <Link
                            key={actionId}
                            to={action.path}
                            style={{ ...tileStyle, backgroundColor: getTileBgVar(actionId) }}
                        >
                            {tileContent}
                        </Link>
                    )
                })}
            </div>

            {/* Featured Feed Section */}
            <div
                ref={featuredGridRef}
                className="featured-grid"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
            >
                {featuredItems.slice(0, 4).map((item, index) => {
                    const isDragging = dragState?.gridType === 'featured' && dragState?.itemId === item.id
                    const isPlaceholder = dragState?.gridType === 'featured' && dragState?.targetIndex === index && !isDragging

                    const cardStyle = {
                        textDecoration: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: isPlaceholder ? 'rgba(34, 197, 94, 0.15)' : '#FFFFFF',
                        borderRadius: 16,
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        opacity: isDragging ? 0.3 : 1,
                        border: isPlaceholder ? '2px dashed #22C55E' : 'none',
                        touchAction: isEditMode ? 'none' : 'auto'
                    }

                    const cardContent = (
                        <>
                            <div style={{
                                height: 120,
                                width: '100%',
                                background: item.image
                                    ? `url(${item.image}) center/cover no-repeat`
                                    : '#E5E0D8'
                            }} />
                            <div style={{ padding: '10px 12px' }}>
                                <div style={{
                                    fontSize: 12,
                                    fontWeight: 'var(--font-weight-brand)',
                                    color: '#4A4238',
                                    marginBottom: 4,
                                    lineHeight: 1.2
                                }}>
                                    {item.name}
                                </div>
                                <div style={{
                                    fontSize: 10,
                                    color: '#8C8476',
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
                        </>
                    )

                    // Owner mode: always use div (no Link navigation issues)
                    if (isOwnerMode) {
                        return (
                            <div
                                key={item.id || index}
                                onTouchStart={(e) => isEditMode
                                    ? handleDragStart(e, 'featured', item.id, index, featuredItems)
                                    : handleLongPressStart(e)
                                }
                                onTouchEnd={!isEditMode ? handleLongPressEnd : undefined}
                                onTouchMove={!isEditMode ? handleLongPressMove : undefined}
                                onMouseDown={(e) => isEditMode
                                    ? handleDragStart(e, 'featured', item.id, index, featuredItems)
                                    : handleLongPressStart(e)
                                }
                                onMouseUp={!isEditMode ? handleLongPressEnd : undefined}
                                onMouseLeave={!isEditMode ? handleLongPressEnd : undefined}
                                onClick={() => { if (!isEditMode && !shouldBlockClickRef.current) navigate('/menu') }}
                                className={isEditMode ? 'menu-item-wiggle' : ''}
                                style={{
                                    ...cardStyle,
                                    cursor: isEditMode ? 'grab' : 'pointer',
                                    opacity: isDragging ? 0.3 : 1,
                                    background: isPlaceholder ? 'rgba(34, 197, 94, 0.15)' : cardStyle.backgroundColor,
                                    border: isPlaceholder ? '2px dashed #22C55E' : 'none',
                                    touchAction: isEditMode ? 'none' : 'auto'
                                }}
                            >
                                {cardContent}
                            </div>
                        )
                    }

                    // Non-owner: standard Link
                    return (
                        <Link
                            key={item.id || index}
                            to="/menu"
                            style={cardStyle}
                        >
                            {cardContent}
                        </Link>
                    )
                })}
            </div>

            {/* Floating Drag Card */}
            {dragState && (() => {
                let draggedContent = null

                if (dragState.gridType === 'actions') {
                    const action = ACTION_DEFINITIONS[dragState.itemId]
                    if (!action) return null
                    const Icon = action.icon
                    draggedContent = (
                        <div style={{
                            ...tileStyle,
                            width: dragState.itemWidth,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                        }}>
                            <span style={{ color: iconColor }}><Icon /></span>
                            <span style={tileTextStyle}>{action.label}</span>
                        </div>
                    )
                } else {
                    const item = featuredItems.find(i => i.id === dragState.itemId)
                    if (!item) return null
                    draggedContent = (
                        <div style={{
                            width: dragState.itemWidth,
                            backgroundColor: '#FFFFFF',
                            borderRadius: 16,
                            overflow: 'hidden',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                        }}>
                            <div style={{
                                height: 120,
                                width: '100%',
                                background: item.image
                                    ? `url(${item.image}) center/cover no-repeat`
                                    : '#E5E0D8'
                            }} />
                            <div style={{ padding: '10px 12px' }}>
                                <div style={{
                                    fontSize: 12,
                                    fontWeight: 'var(--font-weight-brand)',
                                    color: '#4A4238'
                                }}>
                                    {item.name}
                                </div>
                            </div>
                        </div>
                    )
                }

                return (
                    <div
                        style={{
                            position: 'fixed',
                            left: dragState.currentX - dragState.offsetX,
                            top: dragState.currentY - dragState.offsetY,
                            zIndex: 9999,
                            pointerEvents: 'none',
                            transform: 'scale(1.05)',
                            opacity: 0.95
                        }}
                    >
                        {draggedContent}
                    </div>
                )
            })()}

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
