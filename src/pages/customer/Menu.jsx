import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { normalizeTenantConfig } from '../../utils/configNormalizer'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useTenant } from '../../contexts/TenantContext'
import { defaultMenuData } from '../../config/menuData.js' // 🛡️ ULTIMATE SAFETY NET
import { MenuSkeleton } from '../../components/Shimmers.jsx'
import HeaderClamp from '../../components/HeaderClamp'

// ===== AUTO-SCROLL SAFETY TOGGLE =====
const ENABLE_AUTO_SCROLL = true
const AUTO_SCROLL_ZONE_PERCENT = 0.10
const AUTO_SCROLL_SPEED = 4

export default function Menu({ config: configProp }) {
    const { businessId, tenantData, isLoaded: tenantLoaded, loading: tenantLoading } = useTenant()
    const navigate = useNavigate()

    // 1. DATA STATE
    const [menu, setMenu] = useState({ categories: [] })
    const [isDataLoaded, setIsDataLoaded] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)

    // 🚀 PHASE 2: PHYSICS RESTORATION + DIRECT BLOB HOOK
    useEffect(() => {
        if (!tenantLoaded || !tenantData) return

        // 🎯 DIRECT HOOK: Point to the correct JSON drawer
        // The previous step (Phase 1) proved app_config isn't where the MENU lives.
        // The MENU lives in tenantData.menu_data directly.
        const cloudMenu = tenantData?.menu_data

        if (cloudMenu?.categories?.length > 0) {
            console.log('[Phase 2] 🚀 PHYSICS READY: Hydrating from tenantData.menu_data')
            setMenu(cloudMenu)
            setIsDataLoaded(true)
        } else {
            console.warn('[Phase 2] ⚠️ Cloud empty, using Default Seeds')
            setMenu(defaultMenuData)
            setIsDataLoaded(true)
        }
    }, [tenantLoaded, tenantData])

    // 2. AUTH & OWNER MODE
    const [isOwnerMode, setIsOwnerMode] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)

    useEffect(() => {
        const checkOwnerStatus = async () => {
            if (!businessId) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.id) return;
            const { data: profile } = await supabase
                .from('profiles')
                .select('business_id')
                .eq('id', user.id)
                .single();

            if (profile && profile.business_id === businessId) {
                setIsOwnerMode(true);
            }
        };
        checkOwnerStatus();
    }, [businessId]);

    // 3. 🛡️ PHYSICS ENGINE RESTORATION (Dec 19 Logic)
    // -----------------------------------------------------
    const [dragState, setDragState] = useState(null)
    const autoScrollRef = useRef(null)
    const categoryRefs = useRef({})
    const [activeCategory, setActiveCategory] = useState('')

    // Auto-Scroll Loop (60fps Moat)
    const processAutoScroll = useCallback(() => {
        if (!autoScrollRef.current) return

        const { direction, speed } = autoScrollRef.current
        window.scrollBy(0, direction * speed)

        requestAnimationFrame(processAutoScroll)
    }, [])

    const handleDragStart = useCallback((e, categoryId, item, index) => {
        if (!isEditMode) return // 🔒 Lock physics unless in Edit Mode

        // Prevent Pull-to-Refresh
        document.body.style.overscrollBehavior = 'none'

        const touch = e.touches?.[0] || e
        const rect = e.currentTarget.getBoundingClientRect()

        // Haptic Feedback check
        if (navigator.vibrate) navigator.vibrate(50)

        setDragState({
            categoryId,
            itemId: item.id,
            originalIndex: index,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            offsetX: touch.clientX - rect.left,
            offsetY: touch.clientY - rect.top,
            itemHeight: rect.height,
            itemWidth: rect.width,
            isDragging: true
        })
    }, [isEditMode])

    const handleDragMove = useCallback((e) => {
        if (!dragState || !isEditMode) return
        e.preventDefault() // Stop scrolling

        const touch = e.touches?.[0] || e

        // Auto-Scroll Logic
        if (ENABLE_AUTO_SCROLL) {
            const y = touch.clientY
            const vh = window.innerHeight
            const zone = vh * AUTO_SCROLL_ZONE_PERCENT

            if (y < zone) {
                autoScrollRef.current = { direction: -1, speed: AUTO_SCROLL_SPEED }
                processAutoScroll()
            } else if (y > vh - zone) {
                autoScrollRef.current = { direction: 1, speed: AUTO_SCROLL_SPEED }
                processAutoScroll()
            } else {
                autoScrollRef.current = null
            }
        }

        setDragState(prev => ({
            ...prev,
            currentX: touch.clientX,
            currentY: touch.clientY
        }))
    }, [dragState, isEditMode, processAutoScroll])

    const handleDragEnd = useCallback(() => {
        setDragState(null)
        autoScrollRef.current = null
        document.body.style.overscrollBehavior = 'auto' // Release Lock
    }, [])

    // Scroll Spy for Sticky Pills
    useEffect(() => {
        const handleScroll = () => {
            if (!categoryRefs.current) return

            // Find most visible category
            let current = ''
            let maxVisible = 0

            Object.entries(categoryRefs.current).forEach(([id, el]) => {
                if (!el) return
                const rect = el.getBoundingClientRect()
                // Simple heuristic logic
                if (rect.top < window.innerHeight / 2 && rect.bottom > 100) {
                    current = id
                }
            })

            if (current && current !== activeCategory) {
                setActiveCategory(current)
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [activeCategory])

    // Helpers
    const scrollToCategory = (categoryId) => {
        setActiveCategory(categoryId)
        categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    // 🏗️ ROBUST CONFIG NORMALIZER
    const config = useMemo(() => {
        const base = normalizeTenantConfig(configProp, tenantData)
        // 🛡️ FORCE HEADER COVER IF MISSING
        if (!base.headerCover?.image) {
            base.headerCover = {
                ...base.headerCover,
                image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000'
            }
        }
        return base
    }, [configProp, tenantData])

    // RENDER
    if (tenantLoading || !isDataLoaded) {
        return <MenuSkeleton />
    }

    const categories = menu?.categories || []
    const visibleCategories = categories.filter(c => isOwnerMode || c.enabled !== false)

    return (
        <div
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            style={{
                minHeight: '100vh',
                paddingBottom: 100,
                background: 'var(--color-bg, #F9FAFB)',
                touchAction: dragState ? 'none' : 'auto' // 🛡️ CRITICAL SCROLL LOCK
            }}
        >
            <HeaderClamp config={config} />

            {/* Sticky Pills */}
            {visibleCategories.length > 1 && (
                <div style={{
                    position: 'sticky', top: 52, zIndex: 900,
                    background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
                    padding: '8px 0', margin: '0 0 16px 0', borderBottom: '1px solid rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
                        {visibleCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => scrollToCategory(cat.id)}
                                style={{
                                    padding: '8px 16px', borderRadius: 20,
                                    border: activeCategory === cat.id ? 'none' : '1px solid #E5E7EB',
                                    background: activeCategory === cat.id ? '#111827' : 'white',
                                    color: activeCategory === cat.id ? 'white' : '#374151',
                                    fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                                    transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)'
                                }}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* The Grid */}
            <div style={{ padding: '0 16px' }}>
                {visibleCategories.length === 0 ? (
                    <div style={{
                        padding: 40,
                        textAlign: 'center',
                        color: '#6B7280',
                        fontSize: 18,
                        fontWeight: 500
                    }}>
                        No hay items en el menú.
                        <br />
                        <span style={{ fontSize: 14, opacity: 0.7 }}>Intenta contactar al negocio.</span>
                    </div>
                ) : (
                    visibleCategories.map(category => (
                        <div key={category.id} ref={el => categoryRefs.current[category.id] = el} style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                                <span style={{ fontSize: 20, marginRight: 8 }}>{category.icon}</span>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>{category.name}</h3>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                {category.items?.length === 0 ? (
                                    <div style={{ gridColumn: 'span 3', padding: 20, textAlign: 'center', background: '#f3f4f6', borderRadius: 12 }}>
                                        No hay items
                                    </div>
                                ) : (
                                    (category.items || []).map((item, index) => {
                                        // 🛡️ PUBLIC OVERRIDE: Show Everything (or restore owner check later)
                                        // if (!isOwnerMode && !item.available) return null

                                        // 👻 DRAG GHOST VARS
                                        const isDraggingThis = dragState && dragState.itemId === item.id

                                        return (
                                            <div
                                                key={item.id}
                                                onTouchStart={(e) => handleDragStart(e, category.id, item, index)}
                                                onClick={() => !isEditMode && setSelectedItem(item)} // 👆 CLICK ONLY IF NOT EDITING
                                                style={{
                                                    cursor: 'pointer',
                                                    transition: isDraggingThis ? 'none' : 'transform 0.1s',
                                                    transform: isDraggingThis
                                                        ? `translate(${dragState.currentX - dragState.startX}px, ${dragState.currentY - dragState.startY}px) scale(1.1)`
                                                        : 'none',
                                                    zIndex: isDraggingThis ? 999 : 1,
                                                    opacity: isDraggingThis ? 0.9 : 1
                                                }}
                                                className="menu-item-card"
                                            >
                                                <div style={{
                                                    width: '100%', aspectRatio: '1', borderRadius: 12, overflow: 'hidden',
                                                    background: '#F3F4F6', marginBottom: 6, position: 'relative',
                                                    boxShadow: isDraggingThis ? '0 20px 40px rgba(0,0,0,0.2)' : 'none'
                                                }}>
                                                    {item.image ? (
                                                        <img src={item.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🍽️</div>
                                                    )}
                                                </div>
                                                <div style={{ lineHeight: 1.2 }}>
                                                    <div style={{ fontWeight: 500, fontSize: 13, color: '#111827', marginBottom: 2 }}>{item.name}</div>
                                                    <div style={{ fontSize: 12, color: '#6B7280' }}>${item.price?.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 🛡️ BOTTOM SHEET (RESTORED FROM DEC 19 SPEC) */}
            {selectedItem && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'flex-end'
                }} onClick={() => setSelectedItem(null)}>
                    <div
                        style={{
                            background: 'white', width: '100%',
                            borderTopLeftRadius: 24, borderTopRightRadius: 24,
                            padding: '24px 24px 40px',
                            boxShadow: '0 -10px 40px rgba(0,0,0,0.1)',
                            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drag Handle */}
                        <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 2, margin: '0 auto 20px' }} />

                        <div style={{ display: 'flex', gap: 20 }}>
                            <div style={{
                                width: 100, height: 100, borderRadius: 16, overflow: 'hidden', background: '#F3F4F6',
                                flexShrink: 0
                            }}>
                                {selectedItem.image ? (
                                    <img src={selectedItem.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>🍽️</span>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>{selectedItem.name}</h2>
                                <p style={{ margin: '0 0 12px', fontSize: 14, color: '#6B7280', lineHeight: 1.4 }}>
                                    {selectedItem.description || "Delicioso y fresco."}
                                </p>
                                <div style={{ fontSize: 18, color: '#22C55E', fontWeight: 600 }}>
                                    ${selectedItem.price?.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <button style={{
                            width: '100%', padding: '16px',
                            background: '#111827', color: 'white',
                            border: 'none', borderRadius: 16,
                            marginTop: 24,
                            fontSize: 16, fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}>
                            <span>🛒</span> Agregar al Pedido
                        </button>
                    </div>
                </div>
            )}

            {/* Owner Toggle */}
            {isOwnerMode && (
                <button onClick={() => setIsEditMode(!isEditMode)} style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 9990,
                    background: isEditMode ? '#000' : '#22C55E', color: 'white',
                    padding: '12px 20px', borderRadius: 50, border: 'none',
                    fontWeight: 700, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                    {isEditMode ? '✅ Listo' : '⚡ Dueño'}
                </button>
            )}

            {/* CSS Animation for Bottom Sheet */}
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
