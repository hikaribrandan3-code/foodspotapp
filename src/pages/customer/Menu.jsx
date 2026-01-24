import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useTenant } from '../../contexts/TenantContext'
import { MenuSkeleton } from '../../components/Shimmers.jsx'
import HeaderClamp from '../../components/HeaderClamp'

// ===== AUTO-SCROLL SAFETY TOGGLE =====
const ENABLE_AUTO_SCROLL = true

// Auto-scroll config
const AUTO_SCROLL_ZONE_PERCENT = 0.10 // Top/bottom 10% of viewport
const AUTO_SCROLL_SPEED = 4 // Pixels per frame (slow and controlled)

export default function Menu({ config: configProp }) {
    const { businessId, tenantData, isLoaded: tenantLoaded, loading: tenantLoading } = useTenant()
    const navigate = useNavigate()

    // 1. DATA STATE
    const [menu, setMenu] = useState({ categories: [] })
    const [isDataLoaded, setIsDataLoaded] = useState(false)

    // Hydrate from TenantContext
    useEffect(() => {
        if (tenantLoaded && tenantData?.menu_data) {
            // DEFENSIVE: Ensure categories exists even if DB data is malformed
            const safeMenu = {
                ...tenantData.menu_data,
                categories: tenantData.menu_data.categories || []
            }
            setMenu(safeMenu)
            setIsDataLoaded(true)
        } else if (tenantLoaded) {
            setMenu({ categories: [] })
            setIsDataLoaded(true)
        }
    }, [tenantLoaded, tenantData])

    // 2. AUTH & OWNER MODE
    const [isOwnerMode, setIsOwnerMode] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)

    useEffect(() => {
        const checkOwnerStatus = async () => {
            if (!businessId) return

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 🛡️ SECURITY CHECK: Query profiles to verify ownership of THIS business
            const { data: profile } = await supabase
                .from('profiles')
                .select('business_id')
                .eq('id', user.id)
                .single()

            if (profile && profile.business_id === businessId) {
                setIsOwnerMode(true)
            }
        }

        checkOwnerStatus()
    }, [businessId])

    // 3. LEGACY PHYSICS STATE
    const [dragState, setDragState] = useState(null)
    const dragItemRef = useRef(null)
    const autoScrollRef = useRef(null)
    const blockRefreshRef = useRef(false)
    const [isDropping, setIsDropping] = useState(false)
    const [menuVersion, setMenuVersion] = useState(0)
    const categoryRefs = useRef({})

    // Active Category Tracking
    const [activeCategory, setActiveCategory] = useState('')

    // Set initial active category
    useEffect(() => {
        if (menu.categories?.length > 0 && !activeCategory) {
            setActiveCategory(menu.categories[0].id)
        }
    }, [menu, activeCategory])


    // ==== CLOUD SAVE FUNCTION ====
    const saveToCloud = async (newMenu) => {
        if (!businessId) return

        // 1. Optimistic Update
        setMenu(newMenu)

        // 2. Silent Sync
        const { error } = await supabase
            .from('branding')
            .update({
                menu_data: newMenu,
                updated_at: new Date()
            })
            .eq('business_id', businessId)

        if (error) {
            console.error("❌ Cloud Sync Failed:", error)
            // Ideally revert here, but for now we trust optimistic
        } else {
            // console.log("✅ Menu synced to cloud")
        }
    }


    // =========================================================================
    // ==== LEGACY DRAG & DROP PHYSICS (COPIED EXACTLY) ====
    // =========================================================================

    const handleDragStart = useCallback((e, categoryId, item, itemIndex, availableItems) => {
        if (!isOwnerMode || !isEditMode) return

        blockRefreshRef.current = true

        e.preventDefault()
        e.stopPropagation()

        if (navigator.vibrate) navigator.vibrate(30)
        document.body.style.overflow = 'hidden'

        const touch = e.touches?.[0] || e
        const rect = e.currentTarget.getBoundingClientRect()

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
            items: availableItems.map(i => i.id),
            targetIndex: itemIndex
        })

        dragItemRef.current = e.currentTarget
    }, [isOwnerMode, isEditMode])

    const handleDragMove = useCallback((e) => {
        if (!dragState) return

        e.preventDefault()
        e.stopPropagation()

        const touch = e.touches?.[0] || e
        const touchX = touch.clientX
        const touchY = touch.clientY

        // ===== HOT ZONE AUTO-SCROLL =====
        if (ENABLE_AUTO_SCROLL) {
            const viewportHeight = window.innerHeight
            const topZone = viewportHeight * AUTO_SCROLL_ZONE_PERCENT
            const bottomZone = viewportHeight * (1 - AUTO_SCROLL_ZONE_PERCENT)

            if (autoScrollRef.current) {
                cancelAnimationFrame(autoScrollRef.current)
                autoScrollRef.current = null
            }

            if (touchY < topZone) {
                const scrollUp = () => {
                    window.scrollBy(0, -AUTO_SCROLL_SPEED)
                    autoScrollRef.current = requestAnimationFrame(scrollUp)
                }
                autoScrollRef.current = requestAnimationFrame(scrollUp)
            } else if (touchY > bottomZone) {
                const scrollDown = () => {
                    window.scrollBy(0, AUTO_SCROLL_SPEED)
                    autoScrollRef.current = requestAnimationFrame(scrollDown)
                }
                autoScrollRef.current = requestAnimationFrame(scrollDown)
            }
        }

        // ==== COLLISION DETECTION ====
        const dragRect = {
            left: touchX - dragState.offsetX,
            top: touchY - dragState.offsetY,
            right: touchX - dragState.offsetX + dragState.itemWidth,
            bottom: touchY - dragState.offsetY + dragState.itemHeight,
            width: dragState.itemWidth,
            height: dragState.itemHeight
        }

        const allItems = document.querySelectorAll('[data-item-id]')
        let closestItem = null
        let maxOverlap = 0

        allItems.forEach(item => {
            if (item.getAttribute('data-dragging') === 'true') return
            const rect = item.getBoundingClientRect()
            const intersectionX = Math.max(0, Math.min(dragRect.right, rect.right) - Math.max(dragRect.left, rect.left))
            const intersectionY = Math.max(0, Math.min(dragRect.bottom, rect.bottom) - Math.max(dragRect.top, rect.top))
            const intersectionArea = intersectionX * intersectionY
            const itemArea = rect.width * rect.height
            const overlapRatio = intersectionArea / itemArea

            if (overlapRatio > 0.40 && overlapRatio > maxOverlap) {
                maxOverlap = overlapRatio
                closestItem = item
            }
        })

        let targetIndex = dragState.targetIndex

        if (closestItem && maxOverlap > 0.40) {
            const targetId = closestItem.getAttribute('data-item-id')
            const newIndex = dragState.items.indexOf(targetId)
            if (newIndex !== -1) {
                targetIndex = newIndex
            }
        }

        setDragState(prev => ({
            ...prev,
            currentX: touchX,
            currentY: touchY,
            targetIndex
        }))

    }, [dragState])

    const handleDragEnd = useCallback(() => {
        setIsDropping(true)

        if (autoScrollRef.current) {
            cancelAnimationFrame(autoScrollRef.current)
            autoScrollRef.current = null
        }

        const capturedState = dragState
        setDragState(null)

        if (dragItemRef.current) {
            dragItemRef.current.removeAttribute('data-dragging')
            dragItemRef.current.style.transform = ''
        }
        dragItemRef.current = null
        document.body.style.overflow = ''

        if (!capturedState) {
            setIsDropping(false)
            return
        }

        const { categoryId, itemIndex, targetIndex, items } = capturedState

        if (itemIndex === targetIndex) {
            setTimeout(() => setIsDropping(false), 100)
            return
        }

        // ==== THE REORDER ALGORITHM ====
        const newOrderIds = [...items]
        const [movedId] = newOrderIds.splice(itemIndex, 1)
        newOrderIds.splice(targetIndex, 0, movedId)

        // CALC NEW MENU
        const newMenu = { ...menu }
        const catIndex = newMenu.categories.findIndex(c => c.id === categoryId)

        if (catIndex !== -1) {
            const allItems = [...newMenu.categories[catIndex].items]

            // Reconstruct based on ID order
            const reorderedItems = newOrderIds.map(id => allItems.find(i => i.id === id)).filter(Boolean)

            newMenu.categories[catIndex].items = reorderedItems

            saveToCloud(newMenu)
        }

        setMenuVersion(v => v + 1)

        setTimeout(() => {
            blockRefreshRef.current = false
            setIsDropping(false)
        }, 2000)

    }, [dragState, menu, businessId])

    // Global listeners
    useEffect(() => {
        if (dragState) {
            let hadActiveDrag = true
            const handleMove = (e) => { e.preventDefault(); e.stopPropagation(); handleDragMove(e) }
            const handleEnd = (e) => {
                if (e && hadActiveDrag) {
                    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation()
                }
                hadActiveDrag = false
                handleDragEnd()
            }
            const handleCancel = () => {
                hadActiveDrag = false
                document.body.style.overflow = ''
                if (autoScrollRef.current) { cancelAnimationFrame(autoScrollRef.current); autoScrollRef.current = null }
                setDragState(null)
                dragItemRef.current = null
            }

            document.addEventListener('touchmove', handleMove, { passive: false, capture: true })
            document.addEventListener('touchend', handleEnd, { passive: false, capture: true })
            document.addEventListener('touchcancel', handleCancel, { capture: true })
            document.addEventListener('mousemove', handleMove, { capture: true })
            document.addEventListener('mouseup', handleEnd, { capture: true })
            const blockClick = (e) => {
                if (hadActiveDrag) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return false }
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


    // Helpers
    const scrollToCategory = (categoryId) => {
        setActiveCategory(categoryId)
        categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    // ===================================
    // RENDER
    // ===================================

    if (tenantLoading || !isDataLoaded) {
        return <MenuSkeleton />
    }

    // DEFENSIVE: Default to empty array if undefined
    const categories = menu?.categories || []
    const visibleCategories = categories.filter(c => isOwnerMode || c.enabled !== false)

    return (
        <div style={{
            minHeight: '100vh',
            paddingBottom: 100,
            background: 'var(--color-bg, #F9FAFB)'
        }}>
            {/* 1. Header */}
            <HeaderClamp config={tenantData?.app_config || {}} />

            {/* 2. Sticky Pills */}
            {visibleCategories.length > 1 && (
                <div style={{
                    position: 'sticky',
                    top: 52, // Adjust based on Header height
                    zIndex: 900,
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(8px)',
                    padding: '8px 0',
                    margin: '0 0 16px 0',
                    borderBottom: '1px solid rgba(0,0,0,0.05)'
                }}>
                    <div style={{
                        display: 'flex',
                        gap: 8,
                        overflowX: 'auto',
                        padding: '0 16px',
                        scrollbarWidth: 'none',
                        WebkitOverflowScrolling: 'touch'
                    }}>
                        {visibleCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => scrollToCategory(cat.id)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 20,
                                    border: activeCategory === cat.id ? 'none' : '1px solid #E5E7EB',
                                    background: activeCategory === cat.id ? '#111827' : 'white',
                                    color: activeCategory === cat.id ? 'white' : '#374151',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    transition: 'all 0.2s ease',
                                    boxShadow: activeCategory === cat.id ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                                }}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. The Grid */}
            <div style={{ padding: '0 16px' }}>
                {visibleCategories.map(category => (
                    <div
                        key={category.id}
                        ref={el => categoryRefs.current[category.id] = el}
                        style={{ marginBottom: 24 }}
                    >
                        {/* Category Title */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 20, marginRight: 8 }}>{category.icon}</span>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                                {category.name}
                            </h3>
                        </div>

                        {/* Items Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 12
                        }}>
                            {/* If category empty, show ghosts */}
                            {category.items?.length === 0 ? (
                                <>
                                    <div style={{ height: 100, background: '#F3F4F6', borderRadius: 12 }}></div>
                                    <div style={{ height: 100, background: '#F3F4F6', borderRadius: 12 }}></div>
                                    <div style={{ height: 100, background: '#F3F4F6', borderRadius: 12 }}></div>
                                </>
                            ) : (
                                (category.items || []).map((item, index) => {
                                    // Filter unavailable if not owner?
                                    if (!isOwnerMode && !item.available) return null

                                    // Drag visual props
                                    const isDraggingThis = dragState?.itemId === item.id
                                    const isHidden = isDraggingThis // Hide original when dragging

                                    // Edit Mode Shake
                                    const shakeStyle = isEditMode ? {
                                        animation: `wiggle 0.3s infinite linear alternate`,
                                        animationDelay: `${Math.random() * 0.1}s`
                                    } : {}

                                    return (
                                        <div
                                            key={item.id}
                                            data-item-id={item.id}
                                            onTouchStart={isEditMode ? (e) => handleDragStart(e, category.id, item, index, category.items) : undefined}
                                            onMouseDown={isEditMode ? (e) => handleDragStart(e, category.id, item, index, category.items) : undefined}
                                            style={{
                                                opacity: isHidden ? 0 : 1,
                                                cursor: isEditMode ? 'grab' : 'pointer',
                                                ...shakeStyle
                                            }}
                                        >
                                            {/* 1. Full-Width Image (Legacy Style) */}
                                            <div style={{
                                                width: '100%',
                                                aspectRatio: '1',
                                                borderRadius: 12,
                                                overflow: 'hidden',
                                                background: '#F3F4F6',
                                                marginBottom: 6,
                                                position: 'relative' // For overlay
                                            }}>
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, opacity: 0.5 }}>🍽️</div>
                                                )}

                                                {/* Unavailable Overlay (Inside Image) */}
                                                {!item.available && isOwnerMode && (
                                                    <div style={{
                                                        position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 11, fontWeight: 700, color: '#EF4444',
                                                        border: '2px solid #EF4444'
                                                    }}>
                                                        AGOTADO
                                                    </div>
                                                )}
                                            </div>

                                            {/* 2. Left-Aligned Details */}
                                            <div style={{ lineHeight: 1.2 }}>
                                                <div style={{ fontWeight: 500, fontSize: 13, color: '#111827', marginBottom: 2 }}>
                                                    {item.name}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#6B7280' }}>
                                                    ${item.price?.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* 4. Owner Pill */}
            {isOwnerMode && (
                <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 9999,
                        background: isEditMode ? '#000000' : '#22C55E',
                        color: 'white',
                        padding: '12px 20px',
                        borderRadius: 50,
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        fontWeight: 700,
                        fontSize: 14,
                        display: 'flex', alignItems: 'center', gap: 8,
                        cursor: 'pointer',
                        transform: 'scale(1)',
                        transition: 'transform 0.1s'
                    }}
                    onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                    onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <span>{isEditMode ? '✅ Listo' : '⚡ Modo Dueño'}</span>
                </button>
            )}

            {/* 5. Dragged Item Portal/Fixed Layer */}
            {dragState && (
                <div style={{
                    position: 'fixed',
                    left: 0, top: 0,
                    transform: `translate(${dragState.currentX - dragState.offsetX}px, ${dragState.currentY - dragState.offsetY}px)`,
                    width: dragState.itemWidth,
                    height: dragState.itemHeight,
                    zIndex: 10000,
                    pointerEvents: 'none',
                    background: 'white',
                    borderRadius: 12,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    display: 'flex', flexDirection: 'column', padding: 12,
                    alignItems: 'center'
                }}>
                    {/* Visual Clone of Card */}
                    <div style={{
                        width: '100%', aspectRatio: '1', // Clone size 
                        borderRadius: 10,
                        background: '#F3F4F6',
                        marginBottom: 8,
                        overflow: 'hidden'
                    }}>
                        {/* Simplified clone */}
                        <div style={{ width: '100%', height: '100%', background: '#eee' }}></div>
                    </div>
                    <div style={{ textAlign: 'center', width: '100%' }}>
                        <div style={{ height: 10, width: '80%', background: '#eee', marginBottom: 4 }}></div>
                        <div style={{ height: 10, width: '40%', background: '#eee' }}></div>
                    </div>
                </div>
            )}

            {/* Styles for Wiggle */}
            <style>{`
                @keyframes wiggle {
                    0% { transform: rotate(-2deg); }
                    100% { transform: rotate(2deg); }
                }
            `}</style>
        </div>
    )
}
