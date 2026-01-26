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

    // Hydrate from Relational Tables (Phase 4: Data Hook) + Hybrid Fallback + Universal Adapter
    useEffect(() => {
        if (!businessId) return

        const fetchMenuData = async () => {
            try {
                // STEP 1: Attempt Relational Fetch (SQL)
                // 🛡️ PUBLIC OVERRIDE: Removed is_enabled filter to see ALL data
                let { data: categoriesData, error: catError } = await supabase
                    .from('categories')
                    .select('*')
                    .eq('business_id', businessId)
                    .order('sort_order', { ascending: true })

                if (catError) {
                    console.warn('⚠️ Cat fetch error:', catError)
                }

                // 2. CHECK FOR EMPTY RELATIONAL DATA (TRIGGER HYBRID FEED)
                const isRelationalEmpty = !categoriesData || categoriesData.length === 0

                if (isRelationalEmpty) {
                    // 🚨 STEP 2: Check for Legacy JSON Blob (Burger Photos)
                    if (tenantData?.menu_data?.categories?.length > 0) {
                        console.log('[Hybrid] 🍔 Hydrating Burger Data from JSON Blob')
                        setMenu(tenantData.menu_data)
                        setIsDataLoaded(true)
                        return
                    }

                    // 🚨 STEP 3: Default Seed Fallback (The Ultimate Safety Net)
                    console.warn('[Hybrid] ⚠️ Relational AND JSON empty. Loading Default Seeds.')
                    setMenu(defaultMenuData)
                    setIsDataLoaded(true)
                    return
                }

                // 3. Fetch Menu Items (Relational Success Path)
                // 🛡️ PUBLIC OVERRIDE: Removed is_available filter
                const { data: itemsData, error: itemError } = await supabase
                    .from('menu_items')
                    .select('*')
                    .eq('business_id', businessId)

                if (itemError) throw itemError

                // 🛡️ DEBUG LOGGING
                console.log('[Menu] SQL Raw Items:', itemsData)

                // 4. Map & Nest
                const nestedCategories = (categoriesData || []).map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    icon: cat.icon,
                    // Map items to this category
                    items: (itemsData || [])
                        .filter(item => item.category_id === cat.id)
                        .map(item => ({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            description: item.description,
                            // 📸 RELATIONAL IMAGE HOOK + FALLBACK
                            image: item.image_url || 'https://via.placeholder.com/150?text=No+Image',
                            available: item.is_available,
                            featured: item.is_featured
                        }))
                }))

                // 5. Update State
                setMenu({ categories: nestedCategories })
                setIsDataLoaded(true)

            } catch (err) {
                console.error('❌ Menu Hydration Failed:', err)
                // Final safety net: try legacy even on error
                if (tenantData?.menu_data?.categories?.length > 0) {
                    console.warn('[Hybrid] ⚠️ Error in SQL fetch. Recovering with Legacy JSON.')
                    setMenu(tenantData.menu_data)
                } else {
                    console.warn('[Hybrid] ⚠️ Critical Failure. Using Defaults.')
                    setMenu(defaultMenuData)
                }
                setIsDataLoaded(true)
            }
        }

        fetchMenuData()
    }, [businessId, tenantData])

    // 2. AUTH & OWNER MODE (SYNC-LOCK STABILIZED)
    const [isOwnerMode, setIsOwnerMode] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)

    useEffect(() => {
        const checkOwnerStatus = async () => {
            // 🛡️ GUARD 1: If we don't even have a businessId yet, stop.
            if (!businessId) return;

            // Fetch the current session
            const { data: { user } } = await supabase.auth.getUser();

            // 🛡️ GUARD 2: If no one is logged in, stop immediately.
            // This prevents the 404 for regular customers.
            if (!user || !user.id) return;

            // 🛡️ GUARD 3: Only query profiles using the authenticated user.id
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

    // 3. LEGACY PHYSICS STATE (Preserved)
    const [dragState, setDragState] = useState(null)
    const dragItemRef = useRef(null)
    const autoScrollRef = useRef(null)
    const blockRefreshRef = useRef(false)
    const [isDropping, setIsDropping] = useState(false)
    const [menuVersion, setMenuVersion] = useState(0)
    const categoryRefs = useRef({})
    const [activeCategory, setActiveCategory] = useState('')

    useEffect(() => {
        if (menu.categories?.length > 0 && !activeCategory) {
            setActiveCategory(menu.categories[0].id)
        }
    }, [menu, activeCategory])

    const saveToCloud = async (newMenu) => {
        // Placeholder for legacy save
    }

    // (Re-implementing minimal drag stub to avoid crashes if referenced in render)
    const handleDragStart = useCallback(() => { }, [])
    const handleDragMove = useCallback(() => { }, [])
    const handleDragEnd = useCallback(() => { }, [])

    // Helpers
    const scrollToCategory = (categoryId) => {
        setActiveCategory(categoryId)
        categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const config = useMemo(() => normalizeTenantConfig(configProp, tenantData), [configProp, tenantData])

    // RENDER
    if (tenantLoading || !isDataLoaded) {
        return <MenuSkeleton />
    }

    const categories = menu?.categories || []
    const visibleCategories = categories.filter(c => isOwnerMode || c.enabled !== false)

    return (
        <div style={{
            minHeight: '100vh',
            paddingBottom: 100,
            background: 'var(--color-bg, #F9FAFB)'
        }}>
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
                                    fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0
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
                                        return (
                                            <div key={item.id}>
                                                <div style={{
                                                    width: '100%', aspectRatio: '1', borderRadius: 12, overflow: 'hidden',
                                                    background: '#F3F4F6', marginBottom: 6, position: 'relative'
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

            {/* Owner Toggle */}
            {isOwnerMode && (
                <button onClick={() => setIsEditMode(!isEditMode)} style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
                    background: isEditMode ? '#000' : '#22C55E', color: 'white',
                    padding: '12px 20px', borderRadius: 50, border: 'none',
                    fontWeight: 700, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                    {isEditMode ? '✅ Listo' : '⚡ Dueño'}
                </button>
            )}
        </div>
    )
}
