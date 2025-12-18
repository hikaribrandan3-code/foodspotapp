import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getConfig, reorderPrimaryActions, reorderFeaturedItems, defaultConfig } from '../../config/appConfig.js'
import { getMenu } from '../../config/menuData.js'
import { getUserMode } from '../../pages/admin/SuperAdmin.jsx'

// Long-press timing (1.8 seconds)
const LONG_PRESS_DURATION = 1800

// --- SVG ICONS (Render Match - Solid Filled) ---

// --- MENU: User Provided (Fork/Knife/Spoon)
const MenuIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M216,40V224a8,8,0,0,1-16,0V176H152a8,8,0,0,1-8-8,268.75,268.75,0,0,1,7.22-56.88c9.78-40.49,28.32-67.63,53.63-78.47A8,8,0,0,1,216,40Zm-96.11-1.31a8,8,0,1,0-15.78,2.63L111.89,88H88V40a8,8,0,0,0-16,0V88H48.11l7.78-46.68a8,8,0,1,0-15.78-2.63l-8,48A8.17,8.17,0,0,0,32,88a48.07,48.07,0,0,0,40,47.32V224a8,8,0,0,0,16,0V135.32A48.07,48.07,0,0,0,128,88a8.17,8.17,0,0,0-.11-1.31Z"></path>
    </svg>
)

// --- ENVÍOS: Delivery Icon
const OrderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256">
        <path d="M216,128a39.3,39.3,0,0,0-6.27.5L175.49,37.19A8,8,0,0,0,168,32H136a8,8,0,0,0,0,16h26.46l32.3,86.13a40.13,40.13,0,0,0-18,25.87H136.54l-25-66.81A8,8,0,0,0,104,88H24a8,8,0,0,0,0,16h8v13.39A56.12,56.12,0,0,0,0,168a8,8,0,0,0,8,8h8.8a40,40,0,0,0,78.4,0h81.6A40,40,0,1,0,216,128ZM56,192a24,24,0,0,1-22.62-16H78.62A24,24,0,0,1,56,192Zm160,0a24,24,0,0,1-15.43-42.36l7.94,21.17a8,8,0,0,0,15-5.62L215.55,144H216a24,24,0,0,1,0,48Z"></path>
    </svg>
)

// --- REWARDS: User Provided (Crown/Building)
const RewardsIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M240,124v68a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V124a4,4,0,0,1,4-4H56v64a8,8,0,0,0,8.53,8A8.17,8.17,0,0,0,72,183.73V120h40v20a4,4,0,0,0,4,4h24a4,4,0,0,0,4-4V120h40v64a8,8,0,0,0,8.53,8,8.17,8.17,0,0,0,7.47-8.25V120h36A4,4,0,0,1,240,124ZM184,40H72A56,56,0,0,0,16,96v4a4,4,0,0,0,4,4H56V64.27A8.17,8.17,0,0,1,63.47,56,8,8,0,0,1,72,64v40h40V92a4,4,0,0,1,4-4h24a4,4,0,0,1,4,4v12h40V64.27A8.17,8.17,0,0,1,191.47,56,8,8,0,0,1,200,64v40h36a4,4,0,0,0,4-4V96A56,56,0,0,0,184,40Z"></path>
    </svg>
)

// --- GAME: User Provided Controller
const GameIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M247.44,173.75a.68.68,0,0,0,0-.14L231.05,89.44c0-.06,0-.12,0-.18A60.08,60.08,0,0,0,172,40H83.89a59.88,59.88,0,0,0-59,49.52L8.58,173.61a.68.68,0,0,0,0,.14,36,36,0,0,0,60.9,31.71l.35-.37L109.52,160h37l39.71,45.09c.11.13.23.25.35.37A36.08,36.08,0,0,0,212,216a36,36,0,0,0,35.43-42.25ZM104,112H96v8a8,8,0,0,1-16,0v-8H72a8,8,0,0,1,0-16h8V88a8,8,0,0,1,16,0v8h8a8,8,0,0,1,0,16Zm40-8a8,8,0,0,1,8-8h24a8,8,0,0,1,0,16H152A8,8,0,0,1,144,104Zm84.37,87.47a19.84,19.84,0,0,1-12.9,8.23A20.09,20.09,0,0,1,198,194.31L167.8,160H172a60,60,0,0,0,51-28.38l8.74,45A19.82,19.82,0,0,1,228.37,191.47Z"></path>
    </svg>
)

// Action definitions
const ACTION_DEFINITIONS = {
    menu: { icon: MenuIcon, label: 'Menu', path: '/menu' },
    envios: { icon: OrderIcon, label: 'Envíos', path: '/envios' },
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
    const featuredItems = featuredItemIds
        .map(itemId => {
            for (const cat of (menu.categories || [])) {
                const item = cat.items?.find(i => i.id === itemId)
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

    const handleLongPressEnd = useCallback((e) => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
        // Block navigation on Chrome by preventing default during long-press detection
        if (shouldBlockClickRef.current && isOwnerMode) {
            e?.preventDefault?.()
            e?.stopPropagation?.()
        }
        // Allow clicks again after a short delay
        setTimeout(() => { shouldBlockClickRef.current = false }, 100)
    }, [isOwnerMode])

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

    // Styles
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
        color: '#4A4238',
        marginTop: 4
    }

    const iconColor = '#4A4036'

    return (
        <div className="page" style={{
            padding: '0 24px',
            paddingBottom: 90,
            backgroundColor: '#F7F4EF',
            minHeight: '100vh'
        }}>
            <header style={{
                padding: '24px 0 22px',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: 36,
                    fontWeight: 'var(--font-weight-brand)',
                    color: '#4A4238',
                    margin: 0,
                    letterSpacing: '-0.02em'
                }}>
                    {config.businessName || 'FoodSpot'}
                </h1>
            </header>

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
                            <span style={{ color: iconColor }}><Icon /></span>
                            <span style={tileTextStyle}>{action.label}</span>
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
                                onClick={() => !isEditMode && !shouldBlockClickRef.current && navigate(action.path)}
                                className={isEditMode ? 'menu-item-wiggle' : ''}
                                style={{
                                    ...tileStyle,
                                    cursor: isEditMode ? 'grab' : 'pointer',
                                    opacity: isDragging ? 0.3 : 1,
                                    background: isPlaceholder ? 'rgba(34, 197, 94, 0.15)' : '#FFFFFF',
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
                            style={tileStyle}
                        >
                            {tileContent}
                        </Link>
                    )
                })}
            </div>

            {/* Featured Feed Section */}
            <div
                ref={featuredGridRef}
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
                    // NOTE: Featured drag disabled per spec - only Top 4 dragable for now
                    if (isOwnerMode) {
                        return (
                            <div
                                key={item.id || index}
                                onTouchStart={!isEditMode ? handleLongPressStart : undefined}
                                onTouchEnd={!isEditMode ? handleLongPressEnd : undefined}
                                onTouchMove={!isEditMode ? handleLongPressMove : undefined}
                                onMouseDown={!isEditMode ? handleLongPressStart : undefined}
                                onMouseUp={!isEditMode ? handleLongPressEnd : undefined}
                                onMouseLeave={!isEditMode ? handleLongPressEnd : undefined}
                                onClick={() => !isEditMode && !shouldBlockClickRef.current && navigate('/menu')}
                                className={isEditMode ? 'menu-item-wiggle' : ''}
                                style={{
                                    ...cardStyle,
                                    cursor: isEditMode ? 'default' : 'pointer'
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
