import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMenu, formatPrice, reorderCategoryItems } from '../../config/menuData.js'
import { addToCurrentOrder, getCurrentOrder, updateItemQuantity } from '../../utils/storage.js'
import HeaderClamp from '../../components/HeaderClamp.jsx'
import { getDividerPreset } from '../../config/dividerPresets.js'
import { isDeliveryMode, clearDeliveryMode } from '../../utils/deliveryUtils.js'
import { getSession } from '../../utils/auth.js'

// ===== AUTO-SCROLL SAFETY TOGGLE =====
// Set to false to disable auto-scroll and revert to 2A behavior
const ENABLE_AUTO_SCROLL = true

// Auto-scroll config
const AUTO_SCROLL_ZONE_PERCENT = 0.10 // Top/bottom 10% of viewport
const AUTO_SCROLL_SPEED = 4 // Pixels per frame (slow and controlled)

// Long-press timing (1.8 seconds)
const LONG_PRESS_DURATION = 1800

function Menu({ config, deliveryMode: deliveryModeProp = false }) {
    const navigate = useNavigate()
    const [menu, setMenu] = useState(() => getMenu())
    const [cart, setCart] = useState(() => getCurrentOrder())
    const [addedItem, setAddedItem] = useState(null) // For visual feedback
    const categoryRefs = useRef({})

    // DEMO SIMULATION REMOVED: Always use real menu
    // No demo mode detection, no demo menu overlay

    // Use dividerPresetId from normalized config
    const effectiveDividerPresetId = config?.dividerPresetId

    // Owner mode detection (from auth session)
    const session = getSession()
    const isOwnerMode = session?.role === 'owner' || session?.role === 'superadmin'

    // Edit mode state (owner only)
    const [isEditMode, setIsEditMode] = useState(false)
    const longPressTimerRef = useRef(null)
    const longPressStartRef = useRef(null)

    // Drag state (for edit mode reordering)
    const [dragState, setDragState] = useState(null) // { categoryId, itemId, itemIndex, startX, startY, currentX, currentY, items }
    const dragItemRef = useRef(null)
    const autoScrollRef = useRef(null) // For auto-scroll interval

    // ==== THE SHIELD (COOLDOWN REF) ====
    // Blocks getMenu() polling for 2 seconds after drag ends to prevent snapback
    const blockRefreshRef = useRef(false)

    // ==== THE CSS SILENCER ====
    // When true, kills all CSS transitions to prevent "slow glide" on drop
    const [isDropping, setIsDropping] = useState(false)

    // ==== VISUAL DEBUGGER ====
    const [debugLog, setDebugLog] = useState('Debug Active... Waiting for touch')

    // ==== NUCLEAR RENDER ====
    // Incrementing this forces React to re-render the grid with fresh keys
    const [menuVersion, setMenuVersion] = useState(0)

    // ==== DEMO MODE DISABLED ====
    // Demo mode is handled elsewhere; this component always runs in production mode
    const isInDemoMode = () => false

    // Delivery mode: session is source of truth, route prop can set it
    // This ensures persistence across page refresh and back navigation
    const [deliveryMode, setDeliveryMode] = useState(() => {
        // Check session first, then route prop
        if (isDeliveryMode()) return true
        return deliveryModeProp
    })

    // If route prop sets delivery mode, persist to session
    useEffect(() => {
        if (deliveryModeProp) {
            sessionStorage.setItem('foodspot_delivery_mode', 'true')
            setDeliveryMode(true)
        }
    }, [deliveryModeProp])

    // Only show enabled categories with available items
    // Only show enabled categories with available items
    const enabledCategories = menu.categories.filter(cat =>
        cat.enabled !== false && cat.items.some(item => item.available)
    )

    const [activeCategory, setActiveCategory] = useState(enabledCategories[0]?.id || '')

    // Refresh data periodically
    // SNAPBACK FIX: Pause polling during drag/edit OR when shield is active
    useEffect(() => {
        const interval = setInterval(() => {
            // ==== THE GUARD ====
            // ABORT if any of these conditions are true:
            if (isEditMode) return
            if (dragState) return
            if (blockRefreshRef.current) return // THE SHIELD IS UP

            setMenu(getMenu())
            setCart(getCurrentOrder())
        }, 2000)

        // Listen for frontendSync to re-read menu
        const handleFrontendSync = () => {
            // Also respect the shield
            if (isEditMode || dragState || blockRefreshRef.current) return
            setMenu(getMenu())
        }
        window.addEventListener('frontendSync', handleFrontendSync)

        return () => {
            clearInterval(interval)
            window.removeEventListener('frontendSync', handleFrontendSync)
        }
    }, [isEditMode, dragState])

    // Long-press handlers for edit mode (owner only)
    const handleLongPressStart = useCallback((e) => {
        if (!isOwnerMode || isEditMode) return

        longPressStartRef.current = { x: e.touches?.[0]?.clientX || e.clientX, y: e.touches?.[0]?.clientY || e.clientY }

        longPressTimerRef.current = setTimeout(() => {
            // Haptic feedback if supported
            console.log('EDIT MODE ACTIVATED — VIBRATE FIRED', {
                hasVibrate: !!navigator.vibrate,
                duration: LONG_PRESS_DURATION
            })
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
    }, [])

    const handleLongPressMove = useCallback((e) => {
        // Cancel if moved too far (> 10px)
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

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current)
            }
        }
    }, [])

    // ===== DRAG & DROP HANDLERS (Edit Mode Only) =====
    const handleDragStart = useCallback((e, categoryId, item, itemIndex, availableItems) => {
        if (!isOwnerMode || !isEditMode) return

        // ==== RAISE THE SHIELD ====
        blockRefreshRef.current = true

        // SAFARI FIX: Aggressive event prevention
        e.preventDefault()
        e.stopPropagation()

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(30)
        }

        // Disable page scroll
        document.body.style.overflow = 'hidden'

        const touch = e.touches?.[0] || e
        const rect = e.currentTarget.getBoundingClientRect()

        // Mark the dragged element for easy identification
        e.currentTarget.setAttribute('data-dragging', 'true')

        setDragState({
            categoryId,
            itemId: item.id,
            itemIndex,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            offsetX: touch.clientX - rect.left,
            offsetY: touch.clientY - rect.top,
            itemWidth: rect.width,
            itemHeight: rect.height,
            items: availableItems.map(i => i.id), // Current order
            targetIndex: itemIndex
        })

        dragItemRef.current = e.currentTarget
    }, [isOwnerMode, isEditMode])

    const handleDragMove = useCallback((e) => {
        if (!dragState) return

        // SAFARI FIX: Aggressive event prevention
        e.preventDefault()
        e.stopPropagation()

        const touch = e.touches?.[0] || e
        const touchX = touch.clientX
        const touchY = touch.clientY

        // ==== TRACE LOG: MOVE EVENT ====
        console.log('[MOVE] Touch X:', touchX, 'Y:', touchY)

        // ===== HOT ZONE AUTO-SCROLL =====
        if (ENABLE_AUTO_SCROLL) {
            const viewportHeight = window.innerHeight
            const topZone = viewportHeight * AUTO_SCROLL_ZONE_PERCENT
            const bottomZone = viewportHeight * (1 - AUTO_SCROLL_ZONE_PERCENT)

            // Clear any existing auto-scroll
            if (autoScrollRef.current) {
                cancelAnimationFrame(autoScrollRef.current)
                autoScrollRef.current = null
            }

            // Check if in hot zone
            if (touchY < topZone) {
                // Scroll UP
                const scrollUp = () => {
                    window.scrollBy(0, -AUTO_SCROLL_SPEED)
                    autoScrollRef.current = requestAnimationFrame(scrollUp)
                }
                autoScrollRef.current = requestAnimationFrame(scrollUp)
            } else if (touchY > bottomZone) {
                // Scroll DOWN
                const scrollDown = () => {
                    window.scrollBy(0, AUTO_SCROLL_SPEED)
                    autoScrollRef.current = requestAnimationFrame(scrollDown)
                }
                autoScrollRef.current = requestAnimationFrame(scrollDown)
            }
        }

        // ==== MAGNET MATH: Distance-Based Detection ====
        // Instead of strict point-in-rect, find the CLOSEST item center
        const allItems = document.querySelectorAll('[data-item-id]')
        let closestItem = null
        let closestDistance = Infinity
        let closestCategoryId = null

        allItems.forEach(item => {
            // Skip the item being dragged
            if (item.getAttribute('data-dragging') === 'true') return

            const rect = item.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            const distance = Math.hypot(touchX - centerX, touchY - centerY)

            if (distance < closestDistance) {
                closestDistance = distance
                closestItem = item
                // Get the category this item belongs to
                const catEl = item.closest('[data-category-id]')
                closestCategoryId = catEl?.getAttribute('data-category-id')
            }
        })

        let targetIndex = dragState.targetIndex
        let newCategoryId = dragState.categoryId

        // MAGNET THRESHOLD: 120px is generous for mobile fingers
        const MAGNET_THRESHOLD = 120

        // ==== TRACE LOG: MAGNET MATH ====
        console.log('[MATH] Closest Item:', closestItem?.getAttribute('data-item-id'), 'Distance:', closestDistance.toFixed(1), 'Threshold:', MAGNET_THRESHOLD)

        if (closestItem && closestDistance < MAGNET_THRESHOLD) {
            const targetId = closestItem.getAttribute('data-item-id')
            console.log('[MATH] Within threshold! TargetId:', targetId)

            if (closestCategoryId && closestCategoryId !== dragState.categoryId) {
                // Cross-category drag
                const targetCategory = menu.categories.find(c => c.id === closestCategoryId)
                if (targetCategory) {
                    const targetCatItems = targetCategory.items.filter(i => i.available)
                    const newIndex = targetCatItems.findIndex(i => i.id === targetId)
                    if (newIndex !== -1) {
                        targetIndex = newIndex
                        newCategoryId = closestCategoryId
                    }
                }
            } else {
                // Same category
                const newIndex = dragState.items.indexOf(targetId)
                console.log('[MATH] indexOf result:', newIndex, 'Current itemIndex:', dragState.itemIndex)
                if (newIndex !== -1 && newIndex !== dragState.itemIndex) {
                    targetIndex = newIndex
                }
            }
        } else {
            console.log('[MATH] OUTSIDE threshold or no closestItem')
        }

        // ==== TRACE LOG: TARGET INDEX ====
        console.log('[MATH] Final targetIndex:', targetIndex, 'newCategoryId:', newCategoryId)

        // ==== VISUAL DEBUGGER UPDATE ====
        setDebugLog('MOVE: X:' + touchX.toFixed(0) + ' Y:' + touchY.toFixed(0) + '\nClosest: ' + (closestItem?.getAttribute('data-item-id') || 'none') + ' (Dist: ' + closestDistance.toFixed(0) + 'px)\nTarget: ' + targetIndex + ' | itemIndex: ' + dragState.itemIndex)

        // Check if anything changed
        const targetChanged = targetIndex !== dragState.targetIndex || newCategoryId !== dragState.categoryId

        // DIAGNOSTIC: Log category change
        if (newCategoryId !== dragState.categoryId) {
            console.log('[DRAG] CATEGORY CHANGE: From', dragState.categoryId, 'To', newCategoryId)
        }

        // Update drag state with new position and potentially new category
        setDragState(prev => ({
            ...prev,
            currentX: touchX,
            currentY: touchY,
            targetIndex,
            categoryId: newCategoryId
        }))

        // Trigger immediate visual reorder if target changed
        if (targetChanged) {
            setMenu(prevMenu => {
                const updatedCategories = prevMenu.categories.map(cat => {
                    if (cat.id !== dragState.categoryId && cat.id !== newCategoryId) return cat

                    // Reorder helper
                    const reorder = (list, startIndex, endIndex) => {
                        const result = Array.from(list)
                        const [removed] = result.splice(startIndex, 1)
                        result.splice(endIndex, 0, removed)
                        return result
                    }

                    if (cat.id === dragState.categoryId && newCategoryId === dragState.categoryId) {
                        // Same category reorder
                        const reorderedItems = reorder(
                            cat.items.filter(i => i.available),
                            dragState.itemIndex,
                            targetIndex
                        )
                        const unavailable = cat.items.filter(i => !i.available)
                        return { ...cat, items: [...reorderedItems, ...unavailable] }
                    }

                    // Cross-category moves not supported in live preview (too complex)
                    // Will only apply on dragEnd
                    return cat
                })

                // Force new array reference to trigger reflow
                return { ...prevMenu, categories: [...updatedCategories] }
            })
        }
    }, [dragState, menu])

    const handleDragEnd = useCallback(() => {
        setIsDropping(true)

        // Capture state
        const capturedState = dragState
        setDragState(null)
        dragItemRef.current = null

        // Cleanup DOM
        if (dragItemRef.current) {
            dragItemRef.current.removeAttribute('data-dragging')
            dragItemRef.current.style.transform = ''
        }
        document.body.style.overflow = ''

        if (!capturedState) return

        const { categoryId, itemIndex, targetIndex, items } = capturedState
        setDebugLog(`ENDED. Moving ${itemIndex} -> ${targetIndex}\nBlocker: ${blockRefreshRef.current}`)

        if (itemIndex === targetIndex) {
            setTimeout(() => setIsDropping(false), 100)
            return
        }

        // ==== BRUTE FORCE OPTIMISTIC UPDATE ====
        setMenu(prevMenu => {
            // 1. Clone the categories
            const newCategories = [...prevMenu.categories]

            // 2. Find the target category
            const catIndex = newCategories.findIndex(c => c.id === categoryId)
            if (catIndex === -1) return prevMenu

            // 3. Clone the items array safely
            const updatedItems = [...newCategories[catIndex].items]

            // 4. Identify the item to move (The one at the source index IN THE VISIBLE LIST)
            // Note: 'items' in drag state is just IDs. We need the real objects.
            const availableItems = updatedItems.filter(i => i.available)
            const itemToMove = availableItems[itemIndex]

            if (!itemToMove) {
                console.error("Critical: Item not found at index", itemIndex)
                return prevMenu
            }

            // 5. Remove from old spot (in the full list)
            const sourceRealIndex = updatedItems.findIndex(i => i.id === itemToMove.id)
            updatedItems.splice(sourceRealIndex, 1)

            // 6. Insert at new spot
            // We need to find where the "targetIndex" maps to in the FULL list (including unavailable items)
            // Strategy: Insert it before the item currently at targetIndex in the available list
            const targetAvailableItem = availableItems[targetIndex]

            if (targetAvailableItem) {
                // Insert before the target item
                const targetRealIndex = updatedItems.findIndex(i => i.id === targetAvailableItem.id)
                // If we are moving down, the index might have shifted after splice, but findIndex resolves that
                updatedItems.splice(targetRealIndex, 0, itemToMove)
            } else {
                // If no target item (dropped at end), push to end of available items
                // This is complex with hidden items, so we'll just append to the very end for safety
                updatedItems.push(itemToMove)
            }

            // 7. Update the category
            newCategories[catIndex] = { ...newCategories[catIndex], items: updatedItems }

            return { ...prevMenu, categories: newCategories }
        })

        // ==== NUCLEAR RENDER: Force React to see the change ====
        setMenuVersion(v => v + 1)

        // Persist
        // We use the 'items' ID list from drag state because it tracks the sort order purely
        const newOrderIds = [...items]
        const [movedId] = newOrderIds.splice(itemIndex, 1)
        newOrderIds.splice(targetIndex, 0, movedId)
        reorderCategoryItems(categoryId, newOrderIds)

        // Force Sync
        window.dispatchEvent(new CustomEvent('forceConfigUpdate', { detail: { menuUpdated: true } }))

        // Cooldown
        setTimeout(() => {
            blockRefreshRef.current = false
            setIsDropping(false)
        }, 2000)

    }, [dragState])

    // Global touch/mouse event listeners for drag
    useEffect(() => {
        if (dragState) {
            // Track if we had an active drag for the muzzle
            let hadActiveDrag = true

            const handleMove = (e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDragMove(e)
            }

            // ==== REQUIREMENT 5: THE MUZZLE (SAFARI FIX) ====
            const handleEnd = (e) => {
                // ==== TRACE LOG: TOUCH END ====
                console.log('[TOUCH END] Fired!')
                console.log('[TOUCH END] e.cancelable:', e?.cancelable)
                console.log('[TOUCH END] e.defaultPrevented:', e?.defaultPrevented)
                console.log('[TOUCH END] hadActiveDrag:', hadActiveDrag)

                if (e && hadActiveDrag) {
                    e.preventDefault()
                    e.stopPropagation()
                    e.stopImmediatePropagation() // CRITICAL: Prevents ghost clicks
                    console.log('[TOUCH END] Event prevention applied')
                }
                hadActiveDrag = false
                console.log('[TOUCH END] Calling handleDragEnd...')
                handleDragEnd()
                console.log('[TOUCH END] handleDragEnd returned')
            }

            const handleCancel = () => {
                hadActiveDrag = false
                document.body.style.overflow = ''
                setDragState(null)
                dragItemRef.current = null
            }

            // HERO ICON PATTERN: capture: true takes priority over browser
            document.addEventListener('touchmove', handleMove, { passive: false, capture: true })
            document.addEventListener('touchend', handleEnd, { passive: false, capture: true })
            document.addEventListener('touchcancel', handleCancel, { capture: true })
            document.addEventListener('mousemove', handleMove, { capture: true })
            document.addEventListener('mouseup', handleEnd, { capture: true })

            // Block ALL clicks globally during drag
            const blockClick = (e) => {
                if (hadActiveDrag) {
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
    }, [dragState, handleDragMove, handleDragEnd])

    // Tap-to-add: instantly add item
    const handleTapToAdd = (item) => {
        if (!item.available) return
        addToCurrentOrder(item, 1, [])
        setCart(getCurrentOrder())
        // Visual feedback
        setAddedItem(item.id)
        setTimeout(() => setAddedItem(null), 400)
    }

    // Remove/decrement item from order
    const handleRemoveItem = (itemIndex) => {
        const item = cart.items[itemIndex]
        if (item.quantity > 1) {
            updateItemQuantity(itemIndex, item.quantity - 1)
        } else {
            updateItemQuantity(itemIndex, 0) // This removes the item
        }
        setCart(getCurrentOrder())
    }

    // Scroll to category section
    const scrollToCategory = (categoryId) => {
        setActiveCategory(categoryId)
        categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const cartTotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const hasItems = cart.items.length > 0

    // Placeholder food images (3x3 grid visual variety)
    const placeholderImages = [
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=200&h=200&fit=crop',
    ]

    const getItemImage = (item, index) => {
        if (item.image) return item.image
        return placeholderImages[index % placeholderImages.length]
    }

    return (
        <div style={{
            minHeight: '100vh',
            paddingBottom: hasItems ? 220 : 100
        }}>
            {/* Header - Shows "FoodSpot · Envíos" in delivery mode */}
            <HeaderClamp config={config} />

            {/* ==== VISUAL DEBUGGER OVERLAY ==== */}
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0,
                padding: '10px',
                paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
                background: 'rgba(0,0,0,0.9)',
                color: '#00ff00',
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                zIndex: 9999999,
                pointerEvents: 'none',
                whiteSpace: 'pre-wrap',
                backdropFilter: 'blur(4px)'
            }}>
                {debugLog}
            </div>

            {/* Delivery Mode Context Badge */}
            {deliveryMode && !isEditMode && (
                <div style={{
                    position: 'fixed',
                    top: 'calc(16px + env(safe-area-inset-top, 0px))',
                    right: 16,
                    zIndex: 800, // Keep below modals
                    background: '#22C55E',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    pointerEvents: 'none',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)'
                }}>
                    <span style={{ fontSize: 14 }}>🛵</span>
                    <span>Envíos</span>
                </div>
            )}

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

            {/* Slim Identity Strip - Uses selected divider preset */}
            {(() => {
                const dividerPreset = getDividerPreset(effectiveDividerPresetId)
                return (
                    <div style={{
                        height: 64,
                        margin: '0 16px 12px 16px',
                        borderRadius: 12,
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        {dividerPreset ? (
                            <img
                                src={dividerPreset.url}
                                alt=""
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                                loading="lazy"
                            />
                        ) : (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(135deg, #F5F0E8 0%, #EDE8E0 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg width="120" height="40" viewBox="0 0 120 40" fill="none" style={{ opacity: 0.3 }}>
                                    <path d="M10 20 Q30 5, 60 20 T110 20" stroke="#8B7355" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                    <circle cx="20" cy="15" r="3" fill="#8B7355" opacity="0.5" />
                                    <circle cx="60" cy="10" r="2" fill="#8B7355" opacity="0.4" />
                                    <circle cx="100" cy="15" r="2.5" fill="#8B7355" opacity="0.5" />
                                </svg>
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* Wrapped Category Rail */}
            {enabledCategories.length > 1 && (
                <div style={{
                    margin: '0 16px 16px 16px',
                    padding: '6px',
                    background: '#F0EDE8',
                    borderRadius: 14,
                    position: 'sticky',
                    top: 52,
                    zIndex: 99
                }}>
                    <div style={{
                        display: 'flex',
                        gap: 6,
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}>
                        {enabledCategories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => scrollToCategory(category.id)}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: activeCategory === category.id ? 'white' : 'transparent',
                                    color: activeCategory === category.id ? '#1F2937' : '#6B7280',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s ease, color 0.15s ease',
                                    boxShadow: activeCategory === category.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                                }}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Menu Content - All Categories */}
            <div style={{ padding: '0 16px' }}>
                {enabledCategories.map(category => (
                    <div
                        key={category.id + '-' + menuVersion}
                        ref={el => categoryRefs.current[category.id] = el}
                        data-category-id={category.id}
                        style={{ marginBottom: 24 }}
                    >
                        {/* Section Title */}
                        <h2 style={{
                            fontSize: 20,
                            fontWeight: 600,
                            color: '#1F2937',
                            marginBottom: 16
                        }}>
                            {category.name}
                        </h2>

                        {/* 3-Column Grid */}
                        {(() => {
                            const availableItems = category.items.filter(item => item.available)
                            const isDraggingInCategory = dragState?.categoryId === category.id

                            return (
                                <div
                                    className="menu-grid"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: 12,
                                        position: 'relative'
                                    }}
                                >
                                    {availableItems.map((item, index) => {
                                        const isDragging = dragState?.itemId === item.id
                                        const isPlaceholder = isDraggingInCategory && dragState.targetIndex === index && !isDragging

                                        return (
                                            <div
                                                key={item.id}
                                                data-item-id={item.id}
                                                onClick={() => !isEditMode && !dragState && handleTapToAdd(item)}
                                                onTouchStart={(e) => {
                                                    if (isEditMode) {
                                                        handleDragStart(e, category.id, item, index, availableItems)
                                                    } else {
                                                        handleLongPressStart(e)
                                                    }
                                                }}
                                                onTouchEnd={!isEditMode ? handleLongPressEnd : undefined}
                                                onTouchMove={!isEditMode ? handleLongPressMove : undefined}
                                                onMouseDown={(e) => {
                                                    if (isEditMode) {
                                                        handleDragStart(e, category.id, item, index, availableItems)
                                                    } else {
                                                        handleLongPressStart(e)
                                                    }
                                                }}
                                                onMouseUp={!isEditMode ? handleLongPressEnd : undefined}
                                                onMouseLeave={!isEditMode ? handleLongPressEnd : undefined}
                                                className={isEditMode && !isDragging ? 'menu-item-wiggle' : ''}
                                                style={{
                                                    cursor: isEditMode ? 'grab' : 'pointer',
                                                    transform: addedItem === item.id ? 'scale(0.95)' : 'scale(1)',
                                                    // CSS SILENCER: Kill transitions during drop to prevent slow glide
                                                    transition: (isEditMode || isDropping) ? 'none' : 'transform 0.15s ease',
                                                    opacity: isDragging ? 0.3 : (addedItem === item.id ? 0.7 : 1),
                                                    boxShadow: isEditMode && !isDragging ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                                                    borderRadius: isEditMode ? 8 : 0,
                                                    background: isPlaceholder ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                                                    border: isPlaceholder ? '2px dashed #22C55E' : 'none',
                                                    touchAction: isEditMode ? 'none' : 'auto',
                                                    // CSS MUZZLE: Stop Safari from trying to select/save
                                                    userSelect: 'none',
                                                    WebkitUserSelect: 'none',
                                                    WebkitTouchCallout: isEditMode ? 'none' : 'default'
                                                }}
                                            >
                                                {/* Item Image */}
                                                <div style={{
                                                    width: '100%',
                                                    aspectRatio: '1',
                                                    borderRadius: 12,
                                                    overflow: 'hidden',
                                                    background: '#E8E4DD',
                                                    marginBottom: 8
                                                }}>
                                                    <img
                                                        src={getItemImage(item, index)}
                                                        alt={item.name}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            pointerEvents: 'none'
                                                        }}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none'
                                                        }}
                                                    />
                                                </div>
                                                {/* Item Name */}
                                                <p style={{
                                                    fontSize: 13,
                                                    fontWeight: 500,
                                                    color: 'var(--canvas-text)',
                                                    marginBottom: 2,
                                                    lineHeight: 1.3
                                                }}>
                                                    {item.name}
                                                </p>
                                                {/* Price */}
                                                <p style={{
                                                    fontSize: 12,
                                                    color: '#6B7280'
                                                }}>
                                                    {formatPrice(item.price)}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })()}
                    </div>
                ))}
            </div>

            {/* Order Summary Bar (Receipt Style) */}
            {hasItems && (
                <div style={{
                    position: 'fixed',
                    bottom: 'calc(var(--nav-height, 60px) + 0px)',
                    left: 0,
                    right: 0,
                    background: '#FDFCFA',
                    borderTop: '1px dashed #E0DDD7',
                    padding: '14px 16px',
                    paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
                    zIndex: 100,
                    boxShadow: '0 -2px 12px rgba(0,0,0,0.06)'
                }}>
                    {/* Receipt Header */}
                    <div style={{
                        fontSize: 11,
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: 10,
                        textAlign: 'center'
                    }}>
                        Tu pedido
                    </div>

                    {/* Order Items List */}
                    <div style={{
                        maxHeight: 90,
                        overflowY: 'auto',
                        marginBottom: 10
                    }}>
                        {cart.items.map((item, index) => (
                            <div
                                key={`${item.id}-${index}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 6,
                                    paddingBottom: 6,
                                    borderBottom: '1px dotted #EBE8E3'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {/* Minus Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemoveItem(index)
                                        }}
                                        style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: 6,
                                            border: '1px solid #E0DDD7',
                                            background: '#FDFCFA',
                                            color: '#8B8680',
                                            fontSize: 14,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        −
                                    </button>
                                    <span style={{ fontSize: 14, color: '#374151', fontWeight: 450 }}>
                                        {item.name}
                                    </span>
                                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                                        ×{item.quantity}
                                    </span>
                                </div>
                                <span style={{ fontSize: 14, color: '#374151', fontFamily: 'system-ui' }}>
                                    {formatPrice(item.price * item.quantity)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Total Line */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 14,
                        paddingTop: 10,
                        borderTop: '1px solid #E0DDD7'
                    }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#1F2937' }}>Total</span>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#1F2937' }}>{formatPrice(cartTotal)}</span>
                    </div>

                    {/* Place Order Button */}
                    <button
                        onClick={() => navigate('/order')}
                        style={{
                            width: '100%',
                            padding: '14px 24px',
                            background: config.colors?.confirmation || '#22C55E',
                            color: 'white',
                            border: 'none',
                            borderRadius: 12,
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: 'pointer',
                            letterSpacing: '-0.01em'
                        }}
                    >
                        Confirmar Pedido
                    </button>
                </div>
            )}

            {/* Floating Drag Card */}
            {dragState && (() => {
                // Find the dragged item
                const category = enabledCategories.find(c => c.id === dragState.categoryId)
                const item = category?.items.find(i => i.id === dragState.itemId)
                if (!item) return null

                return (
                    <div
                        data-floating-drag="true"
                        style={{
                            position: 'fixed',
                            left: dragState.currentX - dragState.offsetX,
                            top: dragState.currentY - dragState.offsetY,
                            width: dragState.itemWidth,
                            zIndex: 999999, // THE HIGHEST - above navbar/sidebar
                            pointerEvents: 'none',
                            transform: 'scale(1.05)',
                            opacity: 0.95
                        }}
                    >
                        <div style={{
                            background: 'white',
                            borderRadius: 12,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: '100%',
                                aspectRatio: '1',
                                borderRadius: 12,
                                overflow: 'hidden',
                                background: '#E8E4DD'
                            }}>
                                <img
                                    src={getItemImage(item, dragState.itemIndex)}
                                    alt={item.name}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            </div>
                            <div style={{ padding: '8px 4px' }}>
                                <p style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: '#1F2937',
                                    marginBottom: 2,
                                    lineHeight: 1.3
                                }}>
                                    {item.name}
                                </p>
                                <p style={{
                                    fontSize: 12,
                                    color: '#6B7280'
                                }}>
                                    {formatPrice(item.price)}
                                </p>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* Bottom Exit for Envíos (deliveryMode) */}
            {deliveryMode && (
                <div style={{
                    marginTop: 32,
                    marginBottom: 24,
                    display: 'flex',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={() => { clearDeliveryMode(); navigate('/') }}
                        style={{
                            background: '#22C55E',
                            color: '#FFFFFF',
                            fontSize: 15,
                            fontWeight: 600,
                            padding: '14px 32px',
                            borderRadius: 50,
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                            transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                        }}
                        onTouchStart={(e) => {
                            e.currentTarget.style.transform = 'scale(0.96)'
                            e.currentTarget.style.boxShadow = '0 1px 4px rgba(34, 197, 94, 0.2)'
                        }}
                        onTouchEnd={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(34, 197, 94, 0.3)'
                        }}
                        onMouseDown={(e) => {
                            e.currentTarget.style.transform = 'scale(0.96)'
                            e.currentTarget.style.boxShadow = '0 1px 4px rgba(34, 197, 94, 0.2)'
                        }}
                        onMouseUp={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(34, 197, 94, 0.3)'
                        }}
                    >
                        Salir de Envíos
                    </button>
                </div>
            )}
        </div>
    )
}

export default Menu
