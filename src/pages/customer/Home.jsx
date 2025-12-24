import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { reorderPrimaryActions, reorderFeaturedItems, defaultConfig, HERO_ICON_DARK, HERO_DEFAULT } from '../../config/appConfig.js'
import { getMenu } from '../../config/menuData.js'
import { getSession } from '../../utils/auth.js'
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

function Home({ config }) {
    const navigate = useNavigate()
    const location = useLocation()
    const menu = getMenu()

    // INVARIANT: config prop is ALREADY normalized and includes demo branding
    // DO NOT merge demo branding here - it bypasses normalizeConfig()
    // All demo branding is handled in getConfig() → normalizeConfig()

    // Owner/SuperAdmin mode detection - both can edit home icons
    const session = getSession()
    const isOwnerMode = session?.role === 'superadmin' || session?.role === 'owner'

    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false)
    const longPressTimerRef = useRef(null)
    const longPressStartRef = useRef(null)

    // CRITICAL: Global drag lock to prevent navigation corruption
    const isDraggingRef = useRef(false)
    const navigationBlockedRef = useRef(false)

    // Drag state
    const [dragState, setDragState] = useState(null)
    const actionsGridRef = useRef(null)
    const featuredGridRef = useRef(null)

    // Get home config with defaults - DEFENSIVE: guard against undefined config
    const homeConfig = config?.homeConfig || defaultConfig.homeConfig || {}
    const primaryActions = homeConfig?.primaryActions || ['menu', 'envios', 'rewards', 'game']
    const featuredItemIds = homeConfig?.featuredItems || []

    // Fallback images
    const placeholderImages = {
        'flat-white': 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&q=80',
        'cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',
        'brownie-nuez': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80',
        'medialuna-manteca': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80'
    }

    // Featured items - read DIRECTLY from config (includes demo branding via getConfig)
    const featuredPhotos = config?.featuredPhotos || []
    const featuredItems = [0, 1, 2, 3].map(slotIndex => {
        const slot = featuredPhotos[slotIndex] || {}
        return {
            id: `featured-slot-${slotIndex}`,
            name: slot.name || '',        // Empty if not set in Branding
            image: slot.image || null,    // Image from Branding upload
            price: slot.price || 0
        }
    })

    // CRITICAL: Reset drag state on route change
    useEffect(() => {
        // Force reset all drag state when route changes
        isDraggingRef.current = false
        navigationBlockedRef.current = false
        setDragState(null)
        setIsEditMode(false)
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
    }, [location.pathname])

    // Safe navigation wrapper - only navigate if not in edit/drag mode
    const safeNavigate = useCallback((path) => {
        // Only block if actively dragging or in edit mode
        if (isDraggingRef.current || isEditMode) {
            console.log('[DRAG SAFETY] Navigation blocked - drag/edit in progress')
            return false
        }
        navigate(path)
        return true
    }, [navigate, isEditMode])

    // Long-press handlers for edit mode (owner only)
    // CRITICAL: Do NOT call preventDefault or block navigation here
    // Just start the timer - navigation happens via onClick if timer doesn't fire
    const handleLongPressStart = useCallback((e) => {
        if (!isOwnerMode || isEditMode) return

        longPressStartRef.current = {
            x: e.touches?.[0]?.clientX || e.clientX,
            y: e.touches?.[0]?.clientY || e.clientY
        }

        longPressTimerRef.current = setTimeout(() => {
            console.log('HOME EDIT MODE ACTIVATED — VIBRATE FIRED')
            if (navigator.vibrate) {
                navigator.vibrate(50)
            }
            setIsEditMode(true)
            // Now block navigation since we're in edit mode
            navigationBlockedRef.current = true
        }, LONG_PRESS_DURATION)
    }, [isOwnerMode, isEditMode])

    const handleLongPressEnd = useCallback((e) => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
        // Reset navigation block if timer didn't fire
        if (!isEditMode) {
            navigationBlockedRef.current = false
        }
    }, [isEditMode])

    const handleLongPressMove = useCallback((e) => {
        if (longPressStartRef.current && longPressTimerRef.current) {
            const currentX = e.touches?.[0]?.clientX || e.clientX
            const currentY = e.touches?.[0]?.clientY || e.clientY
            const deltaX = Math.abs(currentX - longPressStartRef.current.x)
            const deltaY = Math.abs(currentY - longPressStartRef.current.y)

            if (deltaX > 10 || deltaY > 10) {
                clearTimeout(longPressTimerRef.current)
                longPressTimerRef.current = null
                navigationBlockedRef.current = false
            }
        }
    }, [])

    // CRITICAL: Drag handlers with proper event blocking
    const handleDragStart = useCallback((e, gridType, itemId, itemIndex, items) => {
        if (!isOwnerMode || !isEditMode) return

        // CRITICAL: Set drag lock IMMEDIATELY
        isDraggingRef.current = true
        navigationBlockedRef.current = true

        // Prevent default to stop any link/navigation behavior
        e.preventDefault()
        e.stopPropagation()

        document.body.style.overflow = 'hidden'

        const touch = e.touches?.[0] || e
        const rect = e.currentTarget.getBoundingClientRect()

        setDragState({
            gridType,
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
        if (!dragState || !isDraggingRef.current) return

        // CRITICAL: Always prevent default during drag
        e.preventDefault()
        e.stopPropagation()

        const touch = e.touches?.[0] || e
        const grid = dragState.gridType === 'actions' ? actionsGridRef.current : featuredGridRef.current
        if (!grid) return

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

    const handleDragEnd = useCallback((e) => {
        if (!dragState) {
            isDraggingRef.current = false
            navigationBlockedRef.current = false
            return
        }

        // CRITICAL: Prevent any navigation events
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }

        document.body.style.overflow = ''

        if (dragState.itemIndex !== dragState.targetIndex) {
            const newOrder = [...dragState.items]
            const [movedItem] = newOrder.splice(dragState.itemIndex, 1)
            newOrder.splice(dragState.targetIndex, 0, movedItem)

            // DIAGNOSTIC: Try/catch to detect save failures
            try {
                if (dragState.gridType === 'actions') {
                    reorderPrimaryActions(newOrder)
                    console.log('[DRAG] SUCCESS: Primary actions reordered', newOrder)
                } else {
                    reorderFeaturedItems(newOrder)
                    console.log('[DRAG] SUCCESS: Featured items reordered', newOrder)
                }

                // Notify App.jsx to refresh config
                window.dispatchEvent(new Event('frontendSync'))
                console.log('[DRAG] SUCCESS: frontendSync dispatched')
            } catch (err) {
                console.error('[DRAG] FAILURE: Save error', err)
            }
        } else {
            console.log('[DRAG] No movement detected, skipping save')
        }

        // CRITICAL: Force ghost disappear by nullifying state
        setDragState(null)

        // CRITICAL: Delay unblocking to prevent ghost clicks
        setTimeout(() => {
            isDraggingRef.current = false
            navigationBlockedRef.current = false
        }, 150)
    }, [dragState])

    // CRITICAL: Cancel handler for edge cases
    const handleDragCancel = useCallback(() => {
        document.body.style.overflow = ''
        setDragState(null)
        isDraggingRef.current = false
        navigationBlockedRef.current = false
    }, [])

    // Global event listeners for drag
    useEffect(() => {
        if (dragState) {
            const handleMove = (e) => {
                e.preventDefault()
                handleDragMove(e)
            }
            const handleEnd = (e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDragEnd(e)
            }
            const handleCancel = () => {
                handleDragCancel()
            }

            // Add listeners with capture phase to intercept before any other handlers
            document.addEventListener('touchmove', handleMove, { passive: false, capture: true })
            document.addEventListener('touchend', handleEnd, { passive: false, capture: true })
            document.addEventListener('touchcancel', handleCancel, { capture: true })
            document.addEventListener('mousemove', handleMove, { capture: true })
            document.addEventListener('mouseup', handleEnd, { capture: true })

            // Block clicks globally during drag
            const blockClick = (e) => {
                if (isDraggingRef.current) {
                    e.preventDefault()
                    e.stopPropagation()
                    e.stopImmediatePropagation()
                    return false
                }
            }
            document.addEventListener('click', blockClick, { capture: true })

            return () => {
                document.removeEventListener('touchmove', handleMove, { capture: true })
                document.removeEventListener('touchend', handleEnd, { capture: true })
                document.removeEventListener('touchcancel', handleCancel, { capture: true })
                document.removeEventListener('mousemove', handleMove, { capture: true })
                document.removeEventListener('mouseup', handleEnd, { capture: true })
                document.removeEventListener('click', blockClick, { capture: true })
            }
        }
    }, [dragState, handleDragMove, handleDragEnd, handleDragCancel])

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current)
            }
            isDraggingRef.current = false
            navigationBlockedRef.current = false
        }
    }, [])

    // Direct hero color helpers (read from config, not CSS variables)
    // Config already includes demo branding via getConfig()
    const getHeroBg = useCallback((actionId) => {
        // Map actionId to heroIcons key
        const iconKey = actionId === 'envios' ? 'delivery' : actionId
        const heroConfig = config?.heroIcons?.[iconKey] || HERO_DEFAULT
        const color = heroConfig?.color

        // 'auto' or empty = use canvas surface color
        if (!color || color === 'auto') {
            return config?.canvasMode === 'dark' ? '#000000' : '#FFFFFF'
        }
        return color
    }, [config?.heroIcons, config?.canvasMode])

    const getHeroIcon = useCallback((actionId) => {
        const iconKey = actionId === 'envios' ? 'delivery' : actionId
        const heroConfig = config?.heroIcons?.[iconKey] || HERO_DEFAULT
        const mode = heroConfig?.iconColorMode

        // 'auto' or empty = use canvas surface text color
        if (!mode || mode === 'auto') {
            return config?.canvasMode === 'dark' ? '#FFFFFF' : '#000000'
        }
        return mode === 'white' ? '#FFFFFF' : HERO_ICON_DARK
    }, [config?.heroIcons, config?.canvasMode])

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
        color: getHeroIcon(actionId),
        marginTop: 4
    })

    // CRITICAL: Click handler that respects drag lock
    const handleTileClick = useCallback((e, path) => {
        // Only block if actively dragging or in edit mode
        if (isDraggingRef.current || isEditMode) {
            e.preventDefault()
            e.stopPropagation()
            console.log('[DRAG SAFETY] Click blocked - edit/drag mode active')
            return
        }
        // Navigate immediately
        navigate(path)
    }, [navigate, isEditMode])

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
            <HeaderClamp config={config} />

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
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsEditMode(false)
                            isDraggingRef.current = false
                            navigationBlockedRef.current = false
                        }}
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
                            <span style={{ color: getHeroIcon(actionId) }}><Icon /></span>
                            <span style={getTileTextStyle(actionId)}>{action.label}</span>
                        </>
                    )

                    // Owner mode: always use div (no Link navigation issues)
                    if (isOwnerMode) {
                        return (
                            <div
                                key={actionId}
                                onContextMenu={(e) => {
                                    // Prevent browser context menu on long-press
                                    e.preventDefault()
                                    e.stopPropagation()
                                }}
                                onTouchStart={(e) => {
                                    if (isEditMode) {
                                        handleDragStart(e, 'actions', actionId, index, primaryActions)
                                    } else {
                                        handleLongPressStart(e)
                                    }
                                }}
                                onTouchEnd={(e) => {
                                    if (!isEditMode) {
                                        handleLongPressEnd(e)
                                    }
                                }}
                                onTouchMove={(e) => {
                                    if (!isEditMode) {
                                        handleLongPressMove(e)
                                    }
                                }}
                                onMouseDown={(e) => {
                                    if (isEditMode) {
                                        handleDragStart(e, 'actions', actionId, index, primaryActions)
                                    } else {
                                        handleLongPressStart(e)
                                    }
                                }}
                                onMouseUp={(e) => {
                                    if (!isEditMode) {
                                        handleLongPressEnd(e)
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isEditMode) {
                                        handleLongPressEnd(e)
                                    }
                                }}
                                onClick={(e) => handleTileClick(e, action.path)}
                                className={isEditMode ? 'menu-item-wiggle' : ''}
                                style={{
                                    ...tileStyle,
                                    backgroundColor: getHeroBg(actionId),
                                    cursor: isEditMode ? 'grab' : 'pointer',
                                    opacity: isDragging ? 0.3 : 1,
                                    background: isPlaceholder ? 'rgba(34, 197, 94, 0.15)' : getHeroBg(actionId),
                                    border: isPlaceholder ? '2px dashed #22C55E' : 'none',
                                    touchAction: isEditMode ? 'none' : 'auto',
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    WebkitTouchCallout: isEditMode ? 'none' : 'default'
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
                            style={{ ...tileStyle, backgroundColor: getHeroBg(actionId) }}
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
                        touchAction: isEditMode ? 'none' : 'auto',
                        userSelect: 'none',
                        WebkitUserSelect: 'none'
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
                            </div>
                        </>
                    )

                    // Owner mode: always use div
                    if (isOwnerMode) {
                        return (
                            <div
                                key={item.id} // SNAPBACK FIX: Always use stable ID, never index fallback
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                }}
                                onTouchStart={(e) => {
                                    if (isEditMode) {
                                        handleDragStart(e, 'featured', item.id, index, featuredItems)
                                    } else {
                                        handleLongPressStart(e)
                                    }
                                }}
                                onTouchEnd={(e) => {
                                    if (!isEditMode) {
                                        handleLongPressEnd(e)
                                    }
                                }}
                                onTouchMove={(e) => {
                                    if (!isEditMode) {
                                        handleLongPressMove(e)
                                    }
                                }}
                                onMouseDown={(e) => {
                                    if (isEditMode) {
                                        handleDragStart(e, 'featured', item.id, index, featuredItems)
                                    } else {
                                        handleLongPressStart(e)
                                    }
                                }}
                                onMouseUp={(e) => {
                                    if (!isEditMode) {
                                        handleLongPressEnd(e)
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isEditMode) {
                                        handleLongPressEnd(e)
                                    }
                                }}
                                onClick={(e) => handleTileClick(e, '/menu')}
                                className={isEditMode ? 'menu-item-wiggle' : ''}
                                style={{
                                    ...cardStyle,
                                    cursor: isEditMode ? 'grab' : 'pointer',
                                    touchAction: isEditMode ? 'none' : 'auto',
                                    WebkitTouchCallout: isEditMode ? 'none' : 'default'
                                }}
                            >
                                {cardContent}
                            </div>
                        )
                    }

                    // Non-owner: standard Link
                    return (
                        <Link
                            key={item.id} // SNAPBACK FIX: Always use stable ID, never index fallback
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
                            backgroundColor: getHeroBg(dragState.itemId),
                            width: dragState.itemWidth,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                        }}>
                            <span style={{ color: getHeroIcon(dragState.itemId) }}><Icon /></span>
                            <span style={getTileTextStyle(dragState.itemId)}>{action.label}</span>
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
