import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { normalizeTenantConfig } from '../../utils/configNormalizer'
import { defaultConfig, HERO_ICON_DARK, HERO_DEFAULT } from '../../config/appConfig.v2.js'
import { supabase } from '../../lib/supabaseClient'
// 🛡️ CLOUD-ONLY: getMenu removed (Anti-Gravity V3.0)
import { getSession } from '../../utils/auth.js'
// import { isInDemoMode } from '../../utils/demoSession.js' // REMOVED: File deleted
const isInDemoMode = () => false; // STUB: Demo mode disabled for now
import { MenuIcon, DeliveryIcon, PromosIcon, GameIcon } from '../../components/HeroIcons.jsx'
import HeaderClamp from '../../components/HeaderClamp.jsx'
import { useTenant } from '../../contexts/TenantContext'

// Long-press timing (1.8 seconds)
const LONG_PRESS_DURATION = 1800

// Action definitions (using shared HeroIcons)
// 🛡️ SILO-AWARE: Paths are now relative, tenantSlug is prepended at runtime
const ACTION_DEFINITIONS = {
    menu: { icon: MenuIcon, label: 'Menu', path: 'menu' },
    envios: { icon: DeliveryIcon, label: 'Envíos', path: 'envios' },
    promos: { icon: PromosIcon, label: 'Promos', path: 'promos' },
    game: { icon: GameIcon, label: 'Mini Game', path: 'game' }
}

// --- MAIN COMPONENT ---

function Home({ config: configProp }) {
    const navigate = useNavigate()
    const location = useLocation()
    // 🛡️ CLOUD-ONLY: Local menu removed. Using tenantData exclusively.

    // 🌉 THE DATA BRIDGE: Connect TenantContext to existing config-based logic
    const { branding, tenantData, loading, slug: tenantSlug, businessId, refreshTenant } = useTenant()

    // 🛡️ SAFETY GUARD: Prevent white screen during tenant resolution
    if (loading || !tenantData) {
        return (
            <div className="page" style={{
                padding: '0 24px',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F5F0E8'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 16 }}>🍽️</div>
                    <p style={{ color: '#7A6F65', fontSize: 14 }}>Cargando...</p>
                </div>
            </div>
        )
    }

    // 🌉 BRIDGE: Use centralized config normalizer (Phase 2 Alignment)
    // 🛡️ MOAT PROTECTION: useMemo guards against re-renders for drag physics
    const config = useMemo(() =>
        normalizeTenantConfig(configProp, tenantData),
        [configProp, tenantData])

    // Owner/SuperAdmin/Demo mode detection - all can edit home icons
    const session = getSession()
    // 🛡️ VAULT-SEAL FIX: Owner Mode Persistence
    // Survives polls by checking localStorage 'foodspot_owner_mode'
    const [isOwnerMode, setIsOwnerMode] = useState(
        session?.role === 'superadmin' ||
        session?.role === 'owner' ||
        isInDemoMode() ||
        localStorage.getItem('foodspot_owner_mode') === 'true'
    )

    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false)
    const longPressTimerRef = useRef(null)
    const longPressStartRef = useRef(null)
    const [hasChanges, setHasChanges] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Detect 'Ver Tienda' edit intent from URL
    // Detect 'Ver Tienda' edit intent from URL (Case-Insensitive Hardened)
    // Detect 'Ver Tienda' edit intent from URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        // 🛡️ PARAMS: 'ownerStart' detects owner but stays calm. 'editMode' forces jiggle.
        const ownerStart = params.get('ownerStart') === 'true'
        const forceEdit = params.get('editMode') === 'true' || params.get('editmode') === 'true'

        if (ownerStart || forceEdit) {
            console.log("🚀 OWNER MODE ACTIVE (Home via URL)")
            setIsOwnerMode(true)
            // Note: isOwnerMode is derived from session, but we also trust the URL for the visual 'Start' signal if needed
            // Actually, isOwnerMode logic in Home is strictly session-based.
            // But if we came from Backend, we ARE owner.

            if (forceEdit) {
                console.log("🚀 ANTIGRAVITY ACTIVATED")
                if (navigator.vibrate) navigator.vibrate([30, 50])
                setIsEditMode(true)
            }
        }
    }, [isOwnerMode])

    // CRITICAL: Global drag lock to prevent navigation corruption
    const isDraggingRef = useRef(false)
    const navigationBlockedRef = useRef(false)

    // Drag state
    const [dragState, setDragState] = useState(null)
    const actionsGridRef = useRef(null)
    const featuredGridRef = useRef(null)

    // Get home config with defaults
    const homeConfig = config?.homeConfig || defaultConfig.homeConfig || {}

    // ====== OPTIMISTIC STATE: LOCAL OWNERSHIP OF ORDER ======
    // These states are the SOURCE OF TRUTH for UI rendering
    // They update INSTANTLY on drop, before storage is written
    const [localPrimaryActions, setLocalPrimaryActions] = useState(
        () => homeConfig?.primaryActions || ['menu', 'envios', 'rewards', 'game']
    )

    // Sync from config prop when it changes (but NOT during drag or edit)
    // 🛡️ SNAPBACK FIX: Do NOT re-run when isEditMode changes
    useEffect(() => {
        if (!isDraggingRef.current && !isEditMode) {
            const newActions = homeConfig?.primaryActions || ['menu', 'envios', 'rewards', 'game']
            setLocalPrimaryActions(newActions)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [homeConfig?.primaryActions]) // Removed isEditMode to prevent snapback

    // Fallback images
    const placeholderImages = {
        'flat-white': 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&q=80',
        'cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',
        'brownie-nuez': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80',
        'medialuna-manteca': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80'
    }

    // Featured items with LOCAL STATE for optimistic updates
    // 🛡️ CLOUD-FIRST ALIGNMENT: Source of truth is tenantData.featuredPhotos
    // This removes the "ghost data" fallback to Latte/Seed.
    const featuredPhotos = tenantData?.featured_photos || config?.featuredPhotos || []

    const buildFeaturedItems = useCallback((photos) => {
        // Enforce exactly 4 slots, populated strictly from the DB or null
        return [0, 1, 2, 3].map(slotIndex => {
            const slot = photos[slotIndex] || {}
            // 🛡️ STRICT SYNC: If it's not in the DB, it's empty. No defaults.
            return {
                id: `featured-slot-${slotIndex}`,
                name: slot.name || 'Destacado', // Only default string if DB has empty string but slot exists
                image: (slot.image && !slot.image.startsWith('blob:')) ? slot.image : null,
                price: slot.price || 0
            }
        })
    }, [])

    const [localFeaturedItems, setLocalFeaturedItems] = useState(
        () => buildFeaturedItems(featuredPhotos)
    )

    // Sync featured items from config prop or tenantData when they change (but NOT during drag or edit)
    // 🛡️ SNAPBACK FIX: Do NOT re-run when isEditMode changes
    useEffect(() => {
        if (!isDraggingRef.current && !isEditMode) {
            setLocalFeaturedItems(buildFeaturedItems(featuredPhotos))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [featuredPhotos, buildFeaturedItems]) // Removed isEditMode to prevent snapback

    // CRITICAL: Reset drag state on route change
    useEffect(() => {
        isDraggingRef.current = false
        navigationBlockedRef.current = false
        setDragState(null)
        setIsEditMode(false)
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
    }, [location.pathname])

    // Safe navigation wrapper
    const safeNavigate = useCallback((path) => {
        if (isDraggingRef.current || isEditMode) {
            console.log('[DRAG SAFETY] Navigation blocked - drag/edit in progress')
            return false
        }
        navigate(path)
        return true
    }, [navigate, isEditMode])

    // PHYSICS ENGINE REFS
    const dragItemRef = useRef(null)
    const autoScrollRef = useRef(null)
    const blockRefreshRef = useRef(false)

    // =========================================================================
    // PHYSICS ENGINE (ADAPTED FOR HOME GRIDS)
    // =========================================================================

    // 1. TOUCH START (Detect 1.8s Hold or Instant Edit Drag)
    const handleTouchStart = (e, gridType, itemId, index, availableItems) => {
        // If not owner, do nothing
        if (!isOwnerMode) return

        // If ALREADY in edit mode, drag immediately (no wait)
        if (isEditMode) {
            initiateDrag(e, gridType, itemId, index, availableItems)
            return
        }

        // Otherwise, wait 1.8s to enter edit mode
        longPressStartRef.current = { x: e.touches?.[0]?.clientX, y: e.touches?.[0]?.clientY }
        longPressTimerRef.current = setTimeout(() => {
            console.log("⚡ JIGGLE TRIGGERED (Home 1.8s)")
            if (navigator.vibrate) navigator.vibrate(50)
            setIsEditMode(true)
            initiateDrag(e, gridType, itemId, index, availableItems)
        }, 1800)
    }

    const handleTouchEndOrMove = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
    }

    const initiateDrag = useCallback((e, gridType, itemId, index, availableItems) => {
        blockRefreshRef.current = true
        isDraggingRef.current = true
        document.body.style.overflow = 'hidden'

        const touch = e.touches?.[0] || e
        const target = e.currentTarget
        const rect = target.getBoundingClientRect()

        target.setAttribute('data-dragging', 'true')

        setDragState({
            gridType,
            itemId,
            itemIndex: index,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            offsetX: touch.clientX - rect.left,
            offsetY: touch.clientY - rect.top,
            items: availableItems,
            targetIndex: index
        })
        dragItemRef.current = target
    }, [])

    const handleDragMove = useCallback((e) => {
        if (!dragState) return
        e.preventDefault()
        e.stopPropagation()

        const touch = e.touches?.[0] || e
        const touchX = touch.clientX
        const touchY = touch.clientY

        // Auto-Scroll
        const viewportHeight = window.innerHeight
        const topZone = viewportHeight * 0.10
        const bottomZone = viewportHeight * 0.90

        if (autoScrollRef.current) {
            cancelAnimationFrame(autoScrollRef.current)
            autoScrollRef.current = null
        }
        if (touchY < topZone) {
            const scrollUp = () => { window.scrollBy(0, -5); autoScrollRef.current = requestAnimationFrame(scrollUp) }
            autoScrollRef.current = requestAnimationFrame(scrollUp)
        } else if (touchY > bottomZone) {
            const scrollDown = () => { window.scrollBy(0, 5); autoScrollRef.current = requestAnimationFrame(scrollDown) }
            autoScrollRef.current = requestAnimationFrame(scrollDown)
        }

        // Magnet Collision (Grid-Specific)
        const gridSelector = dragState.gridType === 'actions' ? '[data-grid-type="actions"] [data-item-id]' : '[data-grid-type="featured"] [data-item-id]'
        const potentialTargets = document.querySelectorAll(gridSelector)

        let closestItem = null
        let closestDistance = Infinity

        potentialTargets.forEach(item => {
            if (item.getAttribute('data-dragging') === 'true') return
            const rect = item.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            const distance = Math.hypot(touchX - centerX, touchY - centerY)

            if (distance < closestDistance) {
                closestDistance = distance
                closestItem = item
            }
        })

        let targetIndex = dragState.targetIndex
        const MAGNET_THRESHOLD = 60

        if (closestItem && closestDistance < MAGNET_THRESHOLD) {
            const targetId = closestItem.getAttribute('data-item-id')
            // Find index in the items array
            // Note: items is array of IDs for actions, or objects for featured
            // We need to normalize or just use the DOM order?
            // safest is to use the original array passed in dragState.items
            const newIndex = dragState.items.indexOf(targetId) // This works for actions (strings)
            // For featured, items are objects... wait. 
            // Correction: buildFeaturedItems returns objects with IDs.
            // I'll make sure to pass IDs array or handle objects.

            // Dynamic check:
            const foundIndex = dragState.items.findIndex(i => (typeof i === 'string' ? i : i.id) === targetId)

            if (foundIndex !== -1 && foundIndex !== dragState.itemIndex) {
                targetIndex = foundIndex
            }
        }

        setDragState(prev => ({ ...prev, currentX: touchX, currentY: touchY, targetIndex }))
    }, [dragState])



    // ====== OPTIMISTIC DRAG END: STATE FIRST, STORAGE LATER ======
    const handleDragEnd = useCallback((e) => {
        // 🛡️ HITBOX RELEASE: Remove data-dragging so element can be targeted again
        if (dragItemRef.current) {
            dragItemRef.current.removeAttribute('data-dragging')
        }

        if (!dragState) {
            isDraggingRef.current = false
            navigationBlockedRef.current = false
            return
        }

        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }

        document.body.style.overflow = ''

        const { gridType, itemIndex, targetIndex, items } = dragState

        if (itemIndex !== targetIndex) {
            // Calculate new order
            const newOrder = [...items]
            const [movedItem] = newOrder.splice(itemIndex, 1)
            newOrder.splice(targetIndex, 0, movedItem)

            console.log('[DRAG] OPTIMISTIC UPDATE:', newOrder)

            // ====== STEP 1: UPDATE STATE INSTANTLY (OPTIMISTIC) ======
            if (gridType === 'actions') {
                // 🛡️ FORENSIC FIX: Functional update for infinite swaps
                setLocalPrimaryActions(prev => {
                    const next = [...newOrder]
                    return next
                })
            } else {
                // For featured items, reorder the local state
                setLocalFeaturedItems(prevItems => {
                    const reordered = [...prevItems]
                    const [moved] = reordered.splice(itemIndex, 1)
                    reordered.splice(targetIndex, 0, moved)
                    // Deep clone to ensure React diffing catches it
                    return reordered.map(item => ({ ...item }))
                })
            }

            // ====== ATOMIC UPDATE: LOCAL STATE ONLY ======
            // Logic: We trust the local state (Optimistic). 
            // We DO NOT save to cloud here. We just flag 'hasChanges'.

            // 1. Flag as dirty
            setHasChanges(true)

            // 2. Dispatch haptic feedback for success
            if (navigator.vibrate) navigator.vibrate(10)

            // 3. Log
            console.log('[DRAG] Local Drop Successful. Waiting for User Save.')

        } else {
            console.log('[DRAG] No movement detected, skipping save')
        }

        // Clear drag state immediately (ghost disappears)
        setDragState(null)

        // Delay unblocking to prevent ghost clicks (reduced from 150ms for faster readiness)
        setTimeout(() => {
            isDraggingRef.current = false
            navigationBlockedRef.current = false
        }, 50)
    }, [dragState])

    // Cancel handler for edge cases
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

            document.addEventListener('touchmove', handleMove, { passive: false, capture: true })
            document.addEventListener('touchend', handleEnd, { passive: false, capture: true })
            document.addEventListener('touchcancel', handleCancel, { capture: true })
            document.addEventListener('mousemove', handleMove, { capture: true })
            document.addEventListener('mouseup', handleEnd, { capture: true })

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

    // Direct hero color helpers
    const getHeroBg = useCallback((actionId) => {
        const iconKey = actionId === 'envios' ? 'delivery' : actionId
        const heroConfig = config?.heroIcons?.[iconKey] || HERO_DEFAULT
        const color = heroConfig?.color

        if (!color || color === 'auto') {
            return config?.canvasMode === 'dark' ? '#000000' : '#FFFFFF'
        }
        return color
    }, [config?.heroIcons, config?.canvasMode])

    const getHeroIcon = useCallback((actionId) => {
        const iconKey = actionId === 'envios' ? 'delivery' : actionId
        const heroConfig = config?.heroIcons?.[iconKey] || HERO_DEFAULT

        // 1. Check specific icon override (rare)
        // 2. Check global DB mode (hero_icon_mode)
        // 3. Fallback to 'auto' logic
        const mode = heroConfig?.iconColorMode || config?.hero_icon_mode

        if (!mode || mode === 'auto') {
            return config?.canvasMode === 'dark' ? '#FFFFFF' : '#000000'
        }
        return mode === 'white' ? '#FFFFFF' : HERO_ICON_DARK
    }, [config?.heroIcons, config?.canvasMode, config?.hero_icon_mode])

    const tileStyle = {
        borderRadius: 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: '1 / 0.9', // V1 Hero Dominance
        gap: 12,
        textDecoration: 'none',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        padding: 16
    }

    const getTileTextStyle = (actionId) => ({
        fontSize: 14,
        fontWeight: 500,
        color: getHeroIcon(actionId),
        marginTop: 4
    })

    // Click handler that respects drag lock
    // 🛡️ SILO-AWARE: Prepend tenantSlug to path
    const handleTileClick = useCallback((e, path) => {
        if (isDraggingRef.current || isEditMode) {
            e.preventDefault()
            e.stopPropagation()
            return
        }

        // 🛡️ SILO GUARD: Prevent navigation if slug is undefined or loading
        if (!tenantSlug) {
            console.error('[SILO GUARD] Navigation blocked - tenantSlug is undefined')
            return
        }

        // Navigate with tenant-scoped path
        navigate(`/${tenantSlug}/${path}`)
    }, [navigate, isEditMode, tenantSlug])

    // ====== THE MISSING ATOMIC SEAL (HOME) ======
    const handlePlatformSave = async () => {
        if (!businessId) return
        setIsSaving(true)

        try {
            const currentAppConfig = tenantData?.app_config || {}

            // Construct the full configuration snapshot
            const updatePayload = {
                app_config: {
                    ...currentAppConfig,
                    homeConfig: {
                        ...(currentAppConfig.homeConfig || {}),
                        primaryActions: localPrimaryActions // Your reordered icons
                    },
                    featuredPhotos: localFeaturedItems // Your reordered featured grid
                }
            }

            console.log('[PLATFORM SAVE] Sealing Home Vault:', updatePayload)

            const { error } = await supabase
                .from('branding')
                .update(updatePayload)
                .eq('business_id', businessId)

            if (error) throw error

            // Success: Clear dirty state and notify OS
            setHasChanges(false)

            // 🛡️ FORENSIC FIX: Prevent Snapback by refreshing context immediately
            if (refreshTenant) await refreshTenant()

            // 🛡️ PHYSICS RESET: Force clear locks to prevent 'One-Shot' glitch
            isDraggingRef.current = false
            navigationBlockedRef.current = false
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current)
                longPressTimerRef.current = null
            }
            setDragState(null) // Ensure ghost is gone

            if (navigator.vibrate) navigator.vibrate([50, 50])
            window.dispatchEvent(new Event('frontendSync'))
            console.log('[PLATFORM SAVE] Success: Home Order Persisted')

        } catch (err) {
            console.error('[PLATFORM SAVE] Critical Failure:', err)
            alert('Error al guardar cambios: ' + err.message)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div
            className={`page ${isEditMode ? 'home-edit-mode' : ''}`}
            onContextMenu={(e) => { if (isEditMode) { e.preventDefault(); e.stopPropagation() } }}
            style={{
                maxWidth: '100%',
                margin: '0 auto',
                padding: '0 12px', /* The Invisible Grid (12px Rule) */
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
                        Listo
                    </button>
                </div>
            )}

            {/* Main 2x2 Navigation Grid - Uses LOCAL STATE */}
            <div
                ref={actionsGridRef}
                className="actions-grid"
                data-grid-type="actions"
                style={{
                    position: 'relative',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    marginBottom: 0, /* Let the wrapper handle the gap */
                    width: '99%', /* Hero Authority: V1 Scale */
                    margin: '40px auto 0 auto' /* Rhythm: 40px from Top (5x8) */
                }}
            >
                {localPrimaryActions.map((actionId, index) => {
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

                    if (isOwnerMode) {
                        return (
                            <div
                                key={actionId}
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                }}
                                data-item-id={actionId}
                                onTouchStart={(e) => handleTouchStart(e, 'actions', actionId, index, localPrimaryActions)}
                                onTouchEnd={handleTouchEndOrMove}
                                onTouchMove={handleTouchEndOrMove}
                                onMouseDown={(e) => {
                                    if (isEditMode) initiateDrag(e, 'actions', actionId, index, localPrimaryActions)
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

                    return (
                        <Link
                            key={actionId}
                            to={`/${tenantSlug}/${action.path}`}
                            style={{ ...tileStyle, backgroundColor: getHeroBg(actionId) }}
                        >
                            {tileContent}
                        </Link>
                    )
                })}

                {/* Role Badges - Centered in Grid */}
                {isInDemoMode() && session?.role !== 'superadmin' && session?.role !== 'owner' && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        background: '#F59E0B',
                        color: '#FFFFFF',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: 9,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        pointerEvents: 'none',
                        letterSpacing: 0.5,
                        whiteSpace: 'nowrap'
                    }}>
                        DEMO
                    </div>
                )}

                {session?.role === 'superadmin' && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        background: '#0F172A',
                        color: '#FFFFFF',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: 9,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        pointerEvents: 'none',
                        letterSpacing: 0.5,
                        whiteSpace: 'nowrap'
                    }}>
                        SUPER
                    </div>
                )}

                {session?.role === 'owner' && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        background: '#3B82F6',
                        color: '#FFFFFF',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: 9,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        pointerEvents: 'none',
                        letterSpacing: 0.5,
                        whiteSpace: 'nowrap'
                    }}>
                        OWNER
                    </div>
                )}
            </div>

            {/* Featured Feed Section - Apple Path "Productos Destacados" */}
            <div style={{
                padding: '0 4px',
                marginTop: 48, /* Rhythm: 48px from Icons (6x8) - The Reset */
                marginBottom: 16, /* Rhythm: 16px to cards (2x8) - Tight Grouping */
                textAlign: 'center'
            }}>
                <h2 style={{
                    fontSize: 18,
                    fontWeight: 600, /* Semi-Bold */
                    color: '#333333', /* Deep Charcoal */
                    letterSpacing: '0.02em',
                    margin: 0,
                    textWrap: 'balance'
                }}>
                    Productos Destacados
                </h2>
                {/* Section Anchor: Structural Hairline */}
                <div style={{
                    width: '30%', /* The Whisper: 30% width */
                    height: 0.5, /* Hairline: 0.5px */
                    backgroundColor: 'rgba(0,0,0,0.1)', /* Border Subtle */
                    margin: '8px auto 0 auto' /* Rhythm: 8px from Title */
                }} />
            </div>

            <div
                ref={featuredGridRef}
                className="featured-grid"
                data-grid-type="featured"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
            >
                {localFeaturedItems.slice(0, 4).map((item, index) => {
                    const isDragging = dragState?.gridType === 'featured' && dragState?.itemId === item.id
                    const isPlaceholder = dragState?.gridType === 'featured' && dragState?.targetIndex === index && !isDragging

                    const cardStyle = {
                        textDecoration: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: isPlaceholder ? 'rgba(34, 197, 94, 0.15)' : '#FFFFFF',
                        borderRadius: 16,
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)', // 3. Global Depth
                        opacity: isDragging ? 0.3 : 1,
                        border: isPlaceholder ? '2px dashed #22C55E' : 'none',
                        touchAction: isEditMode ? 'none' : 'auto',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        WebkitTouchCallout: isEditMode ? 'none' : 'default'
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
                                    lineHeight: 1.1
                                }}>
                                    {item.name}
                                </div>
                                <div style={{
                                    fontSize: 12,
                                    color: '#22C55E',
                                    fontWeight: 600
                                }}>
                                    ${item.price?.toLocaleString('es-AR')}
                                </div>
                            </div>
                        </>
                    )

                    if (isOwnerMode) {
                        return (
                            <div
                                key={item.id}
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                }}
                                data-item-id={item.id}
                                onTouchStart={(e) => handleTouchStart(e, 'featured', item.id, index, localFeaturedItems)}
                                onTouchEnd={handleTouchEndOrMove}
                                onTouchMove={handleTouchEndOrMove}
                                onMouseDown={(e) => {
                                    if (isEditMode) initiateDrag(e, 'featured', item.id, index, localFeaturedItems)
                                }}
                                onClick={(e) => handleTileClick(e, 'menu')}
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

                    return (
                        <Link
                            key={item.id}
                            to={`/${tenantSlug}/menu`}
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
                    const item = localFeaturedItems.find(i => i.id === dragState.itemId)
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
            {/* Owner Pill (Home) */}
            {isOwnerMode && !isEditMode && config?.homeConfig?.allowEditing !== false && (
                <button onClick={() => setIsEditMode(true)} style={{
                    position: 'fixed', bottom: 100, right: 24, zIndex: 9999, background: '#22C55E', color: 'white', padding: '12px 20px',
                    borderRadius: 50, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontWeight: 700, fontSize: 14, display: 'flex',
                    alignItems: 'center', gap: 8, cursor: 'pointer'
                }}><span>⚡ Modo Dueño</span></button>
            )}

            {/* Edit Mode HUD */}
            {isOwnerMode && isEditMode && (
                <div style={{
                    position: 'fixed', top: 16, left: 16, right: 16, zIndex: 9998,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'white', padding: '8px 16px', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <span style={{ color: '#F59E0B', fontWeight: 600 }}>✏️ Home Editor</span>
                    <button onClick={() => setIsEditMode(false)} style={{ background: '#22C55E', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600 }}>Done</button>
                </div>
            )}

            {/* FLOATING SAVE BAR (Atomic Seal) */}
            {hasChanges && (
                <div style={{
                    position: 'fixed',
                    bottom: 95,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10000,
                    display: 'flex',
                    gap: 12,
                    background: '#1F2937',
                    padding: '8px 16px',
                    borderRadius: 100,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                    alignItems: 'center',
                    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <span style={{
                        color: '#F3F4F6',
                        fontSize: 13,
                        fontWeight: 600,
                        paddingRight: 8,
                        borderRight: '1px solid #374151',
                        whiteSpace: 'nowrap'
                    }}>
                        Cambios sin guardar
                    </span>

                    <button
                        onClick={handlePlatformSave}
                        disabled={isSaving}
                        style={{
                            background: isSaving ? '#9CA3AF' : '#22C55E',
                            color: 'white',
                            border: 'none',
                            borderRadius: 20,
                            padding: '6px 16px',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: isSaving ? 'wait' : 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 10px rgba(34, 197, 94, 0.3)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {isSaving ? 'GUARDANDO...' : 'GUARDAR'}
                    </button>
                    <style>{`
                        @keyframes slideUp {
                            from { transform: translate(-50%, 20px); opacity: 0; }
                            to { transform: translate(-50%, 0); opacity: 1; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    )
}

export default Home
