import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useTenant } from '../../contexts/TenantContext'
import { MenuSkeleton } from '../../components/Shimmers.jsx'
import HeaderClamp from '../../components/HeaderClamp'
import { getDividerPreset } from '../../config/dividerPresets'

// ===== AUTO-SCROLL SAFETY TOGGLE =====
const ENABLE_AUTO_SCROLL = true
const AUTO_SCROLL_ZONE_PERCENT = 0.10
const AUTO_SCROLL_SPEED = 4

export default function Menu({ config: configProp }) {
    const { businessId, tenantData, isLoaded: tenantLoaded, loading: tenantLoading } = useTenant()
    const navigate = useNavigate()

    // 1. DATA STATE - Fed by TenantContext, NOT static imports
    const [menu, setMenu] = useState({ categories: [] })
    const [isDataLoaded, setIsDataLoaded] = useState(false)

    // 🔌 HYDRATE FROM TENANTCONTEXT (The Critical Bridge)
    useEffect(() => {
        if (tenantLoaded && tenantData?.menu_data) {
            console.log('[Menu] 🔌 HYDRATING FROM CLOUD:', tenantData.menu_data)
            setMenu(tenantData.menu_data)
            setIsDataLoaded(true)
        } else if (tenantLoaded) {
            console.log('[Menu] ⚠️ No menu_data in tenantData')
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
                console.log('[Menu] ✅ OWNER VERIFIED')
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

    useEffect(() => {
        if (menu.categories?.length > 0 && !activeCategory) {
            setActiveCategory(menu.categories[0].id)
        }
    }, [menu, activeCategory])

    // Config derived values - Wire to tenantData
    const config = tenantData?.app_config || configProp || {}
    const effectiveDividerPresetId = tenantData?.app_config?.dividerPresetId || config.dividerPresetId || 'coffee-1'

    // ==== 🔥 BATCH UPSERT CLOUD SAVE (Wired to menu_items table) ====
    const saveToCloud = async (newMenu, modifiedCategoryId) => {
        if (!businessId) return

        // 1. Optimistic Update
        setMenu(newMenu)

        // 2. Extract items from the modified category
        const category = newMenu.categories.find(c => c.id === modifiedCategoryId)
        if (!category) return

        // 3. Map to DB Schema (id, display_order, business_id)
        const updates = category.items.map((item, index) => ({
            id: item.id,
            display_order: index,
            business_id: businessId,
        }))

        // 4. Batch Upsert to 'menu_items'
        const { error } = await supabase
            .from('menu_items')
            .upsert(updates, { onConflict: 'id' })

        if (error) {
            console.error("❌ Cloud Sync Failed:", error)
        } else {
            console.log('[Menu] ✅ BATCH UPSERT SUCCESS')
        }
    }

    // Price formatter
    const formatPrice = (price) => {
        if (typeof price !== 'number') return '$0'
        return '$' + price.toLocaleString('es-AR')
    }

    // Get item image with fallback
    const getItemImage = (item) => {
        if (item.image) return item.image
        return `https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop&q=80`
    }

    // =========================================================================
    // ==== LEGACY DRAG & DROP PHYSICS (DEC 19 EXACT) ====
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

        // ==== MAGNET MATH: Distance-Based Detection ====
        const allItems = document.querySelectorAll('[data-item-id]')
        let closestItem = null
        let closestDistance = Infinity
        let closestCategoryId = null

        allItems.forEach(item => {
            if (item.getAttribute('data-dragging') === 'true') return
            const rect = item.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            const distance = Math.hypot(touchX - centerX, touchY - centerY)

            if (distance < closestDistance) {
                closestDistance = distance
                closestItem = item
                const catEl = item.closest('[data-category-id]')
                closestCategoryId = catEl?.getAttribute('data-category-id')
            }
        })

        let targetIndex = dragState.targetIndex
        let newCategoryId = dragState.categoryId
        const MAGNET_THRESHOLD = 60

        if (closestItem && closestDistance < MAGNET_THRESHOLD) {
            const targetId = closestItem.getAttribute('data-item-id')

            if (closestCategoryId && closestCategoryId !== dragState.categoryId) {
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
                const newIndex = dragState.items.indexOf(targetId)
                if (newIndex !== -1 && newIndex !== dragState.itemIndex) {
                    targetIndex = newIndex
                }
            }
        }

        setDragState(prev => ({
            ...prev,
            currentX: touchX,
            currentY: touchY,
            targetIndex,
            categoryId: newCategoryId
        }))
    }, [dragState, menu])

    const handleDragEnd = useCallback(() => {
        setIsDropping(true)

        const capturedState = dragState
        setDragState(null)
        dragItemRef.current = null

        if (dragItemRef.current) {
            dragItemRef.current.removeAttribute('data-dragging')
            dragItemRef.current.style.transform = ''
        }
        document.body.style.overflow = ''

        if (!capturedState) return
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
            const reorderedItems = newOrderIds.map(id => allItems.find(i => i.id === id)).filter(Boolean)
            newMenu.categories[catIndex].items = reorderedItems

            // 🔥 BATCH UPSERT (Pass categoryId for targeted update)
            saveToCloud(newMenu, categoryId)
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

    const visibleCategories = menu.categories.filter(c => isOwnerMode || c.enabled !== false)
    const enabledCategories = visibleCategories.filter(c => c.items?.length > 0)

    return (
        <div style={{
            minHeight: '100vh',
            paddingBottom: 100,
            background: 'var(--color-bg, #F9FAFB)'
        }}>
            {/* 1. Header */}
            <HeaderClamp config={tenantData?.app_config || {}} />

            {/* Edit Mode Header */}
            {isOwnerMode && isEditMode && (
                <div style={{
                    position: 'fixed',
                    top: 16,
                    left: 16,
                    right: 16,
                    zIndex: 9998,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'white',
                    padding: '8px 16px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <span style={{ color: '#F59E0B', fontWeight: 600, fontSize: 14 }}>
                        ✏️ Modo Edición
                    </span>
                    <button
                        onClick={() => setIsEditMode(false)}
                        style={{
                            background: '#22C55E',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px 16px',
                            fontWeight: 600,
                            fontSize: 14,
                            cursor: 'pointer'
                        }}
                    >
                        Done
                    </button>
                </div>
            )}

            {/* Slim Identity Strip - Divider Preset */}
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
                                </svg>
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* Category Rail */}
            {enabledCategories.length > 1 && (
                <div style={{
                    margin: '0 16px 16px 16px',
                    display: 'flex',
                    gap: 8,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch'
                }}>
                    {enabledCategories.map(cat => (
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
                                cursor: 'pointer'
                            }}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Categories & Items Grid */}
            <div style={{ padding: '0 16px' }}>
                {enabledCategories.map(category => (
                    <div
                        key={category.id}
                        ref={el => categoryRefs.current[category.id] = el}
                        data-category-id={category.id}
                        style={{ marginBottom: 24 }}
                    >
                        {/* Category Title */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 20, marginRight: 8 }}>{category.icon || '🍽️'}</span>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                                {category.name}
                            </h3>
                        </div>

                        {/* 3-Column Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 12
                        }}>
                            {category.items.filter(i => isOwnerMode || i.available !== false).map((item, index) => {
                                const isDraggingThis = dragState?.itemId === item.id
                                const isHidden = isDraggingThis
                                const shakeStyle = isEditMode ? {
                                    animation: `wiggle 0.3s infinite linear alternate`,
                                    animationDelay: `${Math.random() * 0.1}s`
                                } : {}

                                return (
                                    <div
                                        key={item.id}
                                        data-item-id={item.id}
                                        onTouchStart={isEditMode ? (e) => handleDragStart(e, category.id, item, index, category.items.filter(i => i.available !== false)) : undefined}
                                        onMouseDown={isEditMode ? (e) => handleDragStart(e, category.id, item, index, category.items.filter(i => i.available !== false)) : undefined}
                                        style={{
                                            opacity: isHidden ? 0 : 1,
                                            background: 'white',
                                            borderRadius: 12,
                                            overflow: 'hidden',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                            position: 'relative',
                                            cursor: isEditMode ? 'grab' : 'pointer',
                                            ...shakeStyle
                                        }}
                                    >
                                        {/* Image */}
                                        <div style={{
                                            width: '100%',
                                            aspectRatio: '1',
                                            background: '#E8E4DD',
                                            overflow: 'hidden'
                                        }}>
                                            <img
                                                src={getItemImage(item)}
                                                alt={item.name}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        </div>

                                        {/* Info */}
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

                                        {/* Unavailable Overlay */}
                                        {!item.available && isOwnerMode && (
                                            <div style={{
                                                position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 12, fontWeight: 700, color: '#EF4444'
                                            }}>
                                                AGOTADO
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* ⚡ OWNER PILL - THE CRITICAL BUTTON */}
            {isOwnerMode && !isEditMode && (
                <button
                    onClick={() => setIsEditMode(true)}
                    style={{
                        position: 'fixed',
                        bottom: 100,
                        right: 24,
                        zIndex: 9999,
                        background: '#22C55E',
                        color: 'white',
                        padding: '12px 20px',
                        borderRadius: 50,
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        fontWeight: 700,
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer'
                    }}
                >
                    <span>⚡ Modo Dueño</span>
                </button>
            )}

            {/* Floating Drag Card */}
            {dragState && (() => {
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
                            zIndex: 999999,
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
                                    src={getItemImage(item)}
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
