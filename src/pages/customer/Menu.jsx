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

// 🍔 SEED DATA (FALLBACK)
// This ensures the menu is NEVER empty, even if the database is.
const SEED_MENU = {
    categories: [
        {
            id: 'cat-burgers',
            name: 'Hamburguesas',
            icon: '🍔',
            enabled: true,
            items: [
                { id: 'item-b1', name: 'Smash Doble', price: 6500, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80', available: true },
                { id: 'item-b2', name: 'Cheese Bacon', price: 7200, image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&q=80', available: true },
                { id: 'item-b3', name: 'Veggie King', price: 6100, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&q=80', available: true }
            ]
        },
        {
            id: 'cat-pizza',
            name: 'Pizzas',
            icon: '🍕',
            enabled: true,
            items: [
                { id: 'item-p1', name: 'Muzzarella', price: 8500, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80', available: true },
                { id: 'item-p2', name: 'Pepperoni', price: 9200, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&q=80', available: true }
            ]
        },
        {
            id: 'cat-drinks',
            name: 'Bebidas',
            icon: '🥤',
            enabled: true,
            items: [
                { id: 'item-d1', name: 'Coca Cola', price: 1500, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80', available: true },
                { id: 'item-d2', name: 'Cerveza IPA', price: 2800, image: 'https://images.unsplash.com/photo-1608270586620-2485246391d8?w=500&q=80', available: true }
            ]
        },
        {
            id: 'cat-sweet',
            name: 'Postres',
            icon: '🍰',
            enabled: true,
            items: [
                { id: 'item-s1', name: 'Cheesecake', price: 4500, image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500&q=80', available: true },
                { id: 'item-s2', name: 'Tiramisu', price: 4800, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&q=80', available: true }
            ]
        }
    ]
}

export default function Menu({ config: configProp }) {
    const { businessId, tenantData, isLoaded: tenantLoaded, loading: tenantLoading } = useTenant()
    const navigate = useNavigate()

    // =========================================================================
    // 1. DATA STATE (With Seed Fallback)
    // =========================================================================
    const [menu, setMenu] = useState({ categories: [] })
    const [isDataLoaded, setIsDataLoaded] = useState(false)

    useEffect(() => {
        if (tenantLoaded) {
            // Priority: 1. Cloud Data, 2. Seed Data
            if (tenantData?.menu_data && tenantData.menu_data.categories.length > 0) {
                console.log('[Menu] ☁️ Loading Cloud Data')
                setMenu(tenantData.menu_data)
            } else {
                console.log('[Menu] 🌱 Loading Seed Data (Fallback)')
                setMenu(SEED_MENU)
            }
            setIsDataLoaded(true)
        }
    }, [tenantLoaded, tenantData])

    // =========================================================================
    // 2. AUTH & OWNER MODE (HARDWIRED BYPASS)
    // =========================================================================
    const [isOwnerMode, setIsOwnerMode] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const modeParam = params.get('editMode') || params.get('editmode')

        // 🔓 HARDWIRE: If ?editmode=true is present, force verify OWNER + EDIT
        if (modeParam === 'true') {
            console.log("🚀 FORCE OWNER MODE ACTIVATED via URL")
            setIsOwnerMode(true)
            setIsEditMode(true) // Start in edit mode immediately
            if (navigator.vibrate) navigator.vibrate([30, 50, 30])
        } else {
            // Normal Check
            const checkOwnerStatus = async () => {
                if (!businessId) return
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('business_id')
                    .eq('id', user.id)
                    .single()

                if ((profile && profile.business_id === businessId) || (user.id === tenantData?.owner_id)) {
                    setIsOwnerMode(true)
                }
            }
            checkOwnerStatus()
        }
    }, [businessId, tenantData])

    // =========================================================================
    // 3. PHYSICS & 2.8S HOLD STATE
    // =========================================================================
    const [dragState, setDragState] = useState(null)
    const dragItemRef = useRef(null)
    const autoScrollRef = useRef(null)
    const blockRefreshRef = useRef(false)
    const longPressTimerRef = useRef(null)
    const [activeCategory, setActiveCategory] = useState('')
    const categoryRefs = useRef({})

    useEffect(() => {
        if (menu.categories?.length > 0 && !activeCategory) {
            setActiveCategory(menu.categories[0].id)
        }
    }, [menu, activeCategory])

    // =========================================================================
    // CONFIG BRIDGE
    // =========================================================================
    const config = useMemo(() => ({
        ...(tenantData?.app_config || configProp || {}),
        headerCover: {
            ...(tenantData?.app_config?.headerCover || {}),
            image: tenantData?.hero_url || tenantData?.app_config?.headerCover?.image
        }
    }), [tenantData, configProp])

    const effectiveDividerPresetId = tenantData?.app_config?.dividerPresetId || 'coffee-1'

    // =========================================================================
    // CLOUD SAVE (BATCH UPSERT)
    // =========================================================================
    const saveToCloud = async (newMenu, modifiedCategoryId) => {
        if (!businessId) return
        setMenu(newMenu) // Optimistic

        const category = newMenu.categories.find(c => c.id === modifiedCategoryId)
        if (!category) return

        const updates = category.items.map((item, index) => ({
            id: item.id,
            display_order: index,
            business_id: businessId
        }))

        // 🔥 UPSERT TO DB (This will create records if they were just Seed Data)
        const { error } = await supabase
            .from('menu_items')
            .upsert(updates, { onConflict: 'id' })

        if (error) {
            console.error("❌ Cloud Sync Failed:", error)
        } else {
            console.log('[Menu] ✅ BATCH UPSERT SUCCESS (Seed -> Real)')
        }
    }

    // =========================================================================
    // HELPERS
    // =========================================================================
    const formatPrice = (price) => {
        if (typeof price !== 'number') return '$0'
        return '$' + price.toLocaleString('es-AR')
    }

    const getItemImage = (item) => {
        if (item.image) return item.image
        return `https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop&q=80`
    }

    const scrollToCategory = (categoryId) => {
        setActiveCategory(categoryId)
        categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    // =========================================================================
    // 2.8S PHYSICS ENGINE
    // =========================================================================
    const handleTouchStart = (e, categoryId, item, itemIndex, availableItems) => {
        if (!isOwnerMode || !isEditMode) return

        longPressTimerRef.current = setTimeout(() => {
            console.log("⚡ JIGGLE TRIGGERED (2.8s)")
            if (navigator.vibrate) navigator.vibrate(50)
            initiateDrag(e, categoryId, item, itemIndex, availableItems)
        }, 2800)
    }

    const handleTouchEndOrMove = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
    }

    const initiateDrag = useCallback((e, categoryId, item, itemIndex, availableItems) => {
        blockRefreshRef.current = true
        document.body.style.overflow = 'hidden'

        const touch = e.touches?.[0] || e
        const target = e.currentTarget
        const rect = target.getBoundingClientRect()

        target.setAttribute('data-dragging', 'true')

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
        dragItemRef.current = target
    }, [])

    const handleDragMove = useCallback((e) => {
        if (!dragState) return
        e.preventDefault()
        e.stopPropagation()

        const touch = e.touches?.[0] || e
        const touchX = touch.clientX
        const touchY = touch.clientY

        // Auto-Scroll Logic
        if (ENABLE_AUTO_SCROLL) {
            const viewportHeight = window.innerHeight
            const topZone = viewportHeight * AUTO_SCROLL_ZONE_PERCENT
            const bottomZone = viewportHeight * (1 - AUTO_SCROLL_ZONE_PERCENT)

            if (autoScrollRef.current) {
                cancelAnimationFrame(autoScrollRef.current)
                autoScrollRef.current = null
            }

            if (touchY < topZone) {
                const scrollUp = () => { window.scrollBy(0, -AUTO_SCROLL_SPEED); autoScrollRef.current = requestAnimationFrame(scrollUp) }
                autoScrollRef.current = requestAnimationFrame(scrollUp)
            } else if (touchY > bottomZone) {
                const scrollDown = () => { window.scrollBy(0, AUTO_SCROLL_SPEED); autoScrollRef.current = requestAnimationFrame(scrollDown) }
                autoScrollRef.current = requestAnimationFrame(scrollDown)
            }
        }

        // Magnet Collision
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
        const MAGNET_THRESHOLD = 60

        if (closestItem && closestDistance < MAGNET_THRESHOLD) {
            const targetId = closestItem.getAttribute('data-item-id')
            if (closestCategoryId && closestCategoryId === dragState.categoryId) {
                const newIndex = dragState.items.indexOf(targetId)
                if (newIndex !== -1 && newIndex !== dragState.itemIndex) {
                    targetIndex = newIndex
                }
            }
        }

        setDragState(prev => ({ ...prev, currentX: touchX, currentY: touchY, targetIndex }))
    }, [dragState])

    const handleDragEnd = useCallback(() => {
        if (autoScrollRef.current) { cancelAnimationFrame(autoScrollRef.current); autoScrollRef.current = null }
        const capturedState = dragState
        setDragState(null)
        dragItemRef.current = null
        document.body.style.overflow = ''

        if (!capturedState) return
        const { categoryId, itemIndex, targetIndex, items } = capturedState
        if (itemIndex === targetIndex) return

        // Swap Logic
        const newOrderIds = [...items]
        const [movedId] = newOrderIds.splice(itemIndex, 1)
        newOrderIds.splice(targetIndex, 0, movedId)

        const newMenu = { ...menu }
        const catIndex = newMenu.categories.findIndex(c => c.id === categoryId)

        // Local Update & Cloud Save
        if (catIndex !== -1) {
            const allItems = [...newMenu.categories[catIndex].items]
            const reorderedItems = newOrderIds.map(id => allItems.find(i => i.id === id)).filter(Boolean)
            newMenu.categories[catIndex].items = reorderedItems
            saveToCloud(newMenu, categoryId)
        }
        setTimeout(() => { blockRefreshRef.current = false }, 500)
    }, [dragState, menu, businessId])

    // Global Listeners
    useEffect(() => {
        if (dragState) {
            let hadActiveDrag = true
            const handleMove = (e) => { e.preventDefault(); e.stopPropagation(); handleDragMove(e) }
            const handleEnd = (e) => {
                if (e && hadActiveDrag) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation() }
                hadActiveDrag = false; handleDragEnd()
            }
            document.addEventListener('touchmove', handleMove, { passive: false, capture: true })
            document.addEventListener('touchend', handleEnd, { passive: false, capture: true })
            document.addEventListener('mousemove', handleMove, { capture: true })
            document.addEventListener('mouseup', handleEnd, { capture: true })
            return () => {
                document.removeEventListener('touchmove', handleMove, { capture: true })
                document.removeEventListener('touchend', handleEnd, { capture: true })
                document.removeEventListener('mousemove', handleMove, { capture: true })
                document.removeEventListener('mouseup', handleEnd, { capture: true })
            }
        }
    }, [dragState, handleDragMove, handleDragEnd])

    if (tenantLoading || !isDataLoaded) return <MenuSkeleton />

    const visibleCategories = menu.categories.filter(c => c.enabled !== false || isOwnerMode)
    const enabledCategories = visibleCategories.filter(c => c.items?.length > 0)

    return (
        <div style={{ minHeight: '100vh', paddingBottom: 100, background: 'var(--color-bg, #F9FAFB)' }}>
            {/* Header */}
            <HeaderClamp config={tenantData?.app_config || {}} />

            {/* Edit Mode HUD */}
            {isOwnerMode && isEditMode && (
                <div style={{
                    position: 'fixed', top: 16, left: 16, right: 16, zIndex: 9998,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'white', padding: '8px 16px', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <span style={{ color: '#F59E0B', fontWeight: 600 }}>✏️ Modo Edición</span>
                    <button onClick={() => setIsEditMode(false)} style={{ background: '#22C55E', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600 }}>Done</button>
                </div>
            )}

            {/* Divider Pill */}
            {(() => {
                const dividerPreset = getDividerPreset(effectiveDividerPresetId)
                return (
                    <div style={{ height: 64, margin: '0 16px 12px 16px', borderRadius: 12, overflow: 'hidden' }}>
                        {dividerPreset ? (
                            <img src={dividerPreset.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : <div style={{ width: '100%', height: '100%', background: '#eee' }} />}
                    </div>
                )
            })()}

            {/* Category Rail (Sticky) */}
            {enabledCategories.length > 1 && (
                <div style={{
                    position: 'sticky', top: 52, zIndex: 900, background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(8px)', padding: '8px 0', margin: '0 0 16px 0', borderBottom: '1px solid rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
                        {enabledCategories.map(cat => (
                            <button key={cat.id} onClick={() => scrollToCategory(cat.id)} style={{
                                padding: '8px 16px', borderRadius: 20, border: activeCategory === cat.id ? 'none' : '1px solid #E5E7EB',
                                background: activeCategory === cat.id ? '#111827' : 'white', color: activeCategory === cat.id ? 'white' : '#374151',
                                fontWeight: 600, flexShrink: 0, boxShadow: activeCategory === cat.id ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                            }}>{cat.name}</button>
                        ))}
                    </div>
                </div>
            )}

            {/* Grid */}
            <div style={{ padding: '0 16px' }}>
                {enabledCategories.map(category => (
                    <div key={category.id} ref={el => categoryRefs.current[category.id] = el} data-category-id={category.id} style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 20, marginRight: 8 }}>{category.icon || '🍽️'}</span>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>{category.name}</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            {category.items.filter(i => isOwnerMode || i.available !== false).map((item, index) => {
                                const isHidden = dragState?.itemId === item.id
                                const shakeStyle = (isEditMode && !dragState) ? { animation: 'wiggle 0.3s infinite linear alternate', animationDelay: `${Math.random() * 0.1}s` } : {}

                                return (
                                    <div key={item.id} data-item-id={item.id}
                                        onTouchStart={isEditMode ? (e) => handleTouchStart(e, category.id, item, index, category.items) : undefined}
                                        onTouchEnd={handleTouchEndOrMove} onTouchMove={handleTouchEndOrMove}
                                        onMouseDown={isEditMode ? (e) => initiateDrag(e, category.id, item, index, category.items) : undefined}
                                        style={{
                                            opacity: isHidden ? 0 : 1, background: 'white', borderRadius: 12, overflow: 'hidden',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative', cursor: isEditMode ? 'grab' : 'pointer',
                                            touchAction: 'none', ...shakeStyle
                                        }}
                                    >
                                        <div style={{ width: '100%', aspectRatio: '1', background: '#E8E4DD' }}>
                                            <img src={getItemImage(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
                                        </div>
                                        <div style={{ padding: '8px 4px' }}>
                                            <p style={{ fontSize: 13, fontWeight: 500, color: '#1F2937', marginBottom: 2, lineHeight: 1.3 }}>{item.name}</p>
                                            <p style={{ fontSize: 12, color: '#6B7280' }}>{formatPrice(item.price)}</p>
                                        </div>
                                        {!item.available && isOwnerMode && (
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', fontWeight: 700, fontSize: 12 }}>AGOTADO</div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Owner Pill */}
            {isOwnerMode && !isEditMode && (
                <button onClick={() => setIsEditMode(true)} style={{
                    position: 'fixed', bottom: 100, right: 24, zIndex: 9999, background: '#22C55E', color: 'white', padding: '12px 20px',
                    borderRadius: 50, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontWeight: 700, fontSize: 14, display: 'flex',
                    alignItems: 'center', gap: 8, cursor: 'pointer'
                }}><span>⚡ Modo Dueño</span></button>
            )}

            {/* Drag Ghost */}
            {dragState && (() => {
                const category = enabledCategories.find(c => c.id === dragState.categoryId)
                const item = category?.items.find(i => i.id === dragState.itemId)
                if (!item) return null
                return (
                    <div style={{
                        position: 'fixed', left: dragState.currentX - dragState.offsetX, top: dragState.currentY - dragState.offsetY,
                        width: dragState.itemWidth, zIndex: 999999, pointerEvents: 'none', transform: 'scale(1.05)', opacity: 0.95
                    }}>
                        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                            <div style={{ width: '100%', aspectRatio: '1', background: '#E8E4DD' }}>
                                <img src={getItemImage(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ padding: '8px 4px' }}>
                                <p style={{ fontSize: 13, fontWeight: 500, color: '#1F2937' }}>{item.name}</p>
                            </div>
                        </div>
                    </div>
                )
            })()}

            <style>{`@keyframes wiggle { 0% { transform: rotate(-1.5deg); } 100% { transform: rotate(1.5deg); } }`}</style>
        </div>
    )
}
