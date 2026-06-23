import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useTenant } from '../../../contexts/TenantContext'
import { useCart } from '../../../contexts/CartContext'
import { useCurrency } from '../../../hooks/useCurrency'
import { MenuSkeleton } from '../../../components/Shimmers.jsx'
import ItemDetailModal from '../../../components/ItemDetailModal'
import { getOptimizedImageUrl } from '../../../utils/imageUrl'

const FALLBACK_IMG =
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=450&fit=crop&q=80'

// ── Shared sessionStorage cache (same key as mobile Menu.jsx) ────────────────
const MENU_CACHE_TTL = 5 * 60 * 1000
function readMenuCache(businessId) {
    try {
        const raw = sessionStorage.getItem(`fs_menu_v2_${businessId}`)
        if (!raw) return null
        const { data, ts } = JSON.parse(raw)
        return Date.now() - ts < MENU_CACHE_TTL ? data : null
    } catch { return null }
}
function writeMenuCache(businessId, data) {
    try {
        sessionStorage.setItem(`fs_menu_v2_${businessId}`, JSON.stringify({ data, ts: Date.now() }))
    } catch { /* quota / private mode — silent */ }
}

// Group flat menu_items into categories. Mirrors Menu.jsx groupItemsByCategory.
function groupItemsByCategory(items, categoryList = [], menuDataCategories = []) {
    const categoryMap = {}
    categoryList.forEach((cat) => { categoryMap[cat.id] = cat })

    const fallbackNameMap = {}
    const fallbackSortMap = {}
    menuDataCategories.forEach((cat, idx) => {
        if (cat.id) fallbackNameMap[cat.id] = cat.name
        if (cat.name) fallbackNameMap[`name:${cat.name}`] = cat.name
        fallbackSortMap[cat.id || cat.name] = cat.sort_order ?? idx
    })

    const grouped = {}
    items.forEach((item) => {
        const dbCat = categoryMap[item.category_id]
        const fallbackName = fallbackNameMap[item.category_id] || fallbackNameMap[`name:${item.category_name}`]
        const catName = (dbCat?.name) || fallbackName || item.category_name || 'Otros'
        const catId = dbCat?.id || item.category_id || `cat-${catName.toLowerCase().replace(/\s+/g, '-')}`
        const sortOrder = dbCat?.sort_order ?? fallbackSortMap[item.category_id] ?? fallbackSortMap[catName] ?? 999

        if (!grouped[catName]) {
            grouped[catName] = { id: catId, name: catName, icon: dbCat?.icon || '🍽️', sort_order: sortOrder, items: [] }
        }
        grouped[catName].items.push({
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image_url || item.image,
            available: item.available !== false,
            description: item.description || '',
            calories: item.calories || item.kcal || 0,
            is_vegan: item.is_vegan || false,
            is_gluten_free: item.is_gluten_free || false,
            is_spicy: item.is_spicy || false,
            featured: item.featured || false,
            display_order: item.display_order ?? 0,
            sort_order: item.sort_order ?? 0,
        })
    })

    return Object.values(grouped)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((cat) => ({ ...cat, items: cat.items.sort((a, b) => a.display_order - b.display_order) }))
}

export default function DesktopMenuTab({ searchQuery = '', onCategoriesLoaded }) {
    const { businessId, tenantData, isLoaded: tenantLoaded } = useTenant()
    const { addToCart } = useCart()
    const fmt = useCurrency()

    const [categories, setCategories] = useState([])
    const [activeCategory, setActiveCategory] = useState('all')
    const [selectedItem, setSelectedItem] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [addedId, setAddedId] = useState(null)

    // Dynamic promo banner from tenant config (hidden if unset)
    const promo = tenantData?.app_config?.promo || tenantData?.promo_banner || null

    const fetchMenu = useCallback(async () => {
        if (!tenantLoaded || !businessId) return
        setError(null)

        const cached = readMenuCache(businessId)
        if (cached) {
            setCategories(cached)
            setIsLoading(false)
        }

        try {
            const [{ data: items, error: itemsError }, { data: cats, error: catError }] = await Promise.all([
                supabase.from('menu_items').select('*').eq('business_id', businessId).order('display_order', { ascending: true }).limit(200),
                supabase.from('categories').select('id, name, sort_order').eq('business_id', businessId).order('sort_order', { ascending: true, nullsFirst: false }),
            ])
            if (itemsError) throw itemsError
            if (catError) console.warn('[DesktopMenu] categories error:', catError.message)

            if (items && items.length > 0) {
                const grouped = groupItemsByCategory(items, cats || [], tenantData?.menu_data?.categories || [])
                setCategories(grouped)
                writeMenuCache(businessId, grouped)
            } else if (tenantData?.menu_data?.categories?.length > 0) {
                setCategories(tenantData.menu_data.categories)
            } else if (!cached) {
                setCategories([])
            }
        } catch (err) {
            console.error('[DesktopMenu] fetch error:', err)
            if (!cached) setError(err.message || 'Failed to load menu')
        } finally {
            setIsLoading(false)
        }
    }, [tenantLoaded, businessId, tenantData])

    useEffect(() => { fetchMenu() }, [fetchMenu])

    // Surface categories to parent (for Menu JSON-LD) once resolved
    useEffect(() => {
        if (categories.length && onCategoriesLoaded) onCategoriesLoaded(categories)
    }, [categories, onCategoriesLoaded])

    const handleAdd = useCallback((item) => {
        addToCart(item, 1, [])
        setAddedId(item.id)
        setTimeout(() => setAddedId((cur) => (cur === item.id ? null : cur)), 150)
    }, [addToCart])

    // Category filter + live search (client-side, no extra queries)
    const visibleCategories = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        let cats = activeCategory === 'all' ? categories : categories.filter((c) => c.id === activeCategory)
        if (q) {
            cats = cats
                .map((c) => ({ ...c, items: c.items.filter((it) => it.name.toLowerCase().includes(q)) }))
                .filter((c) => c.items.length > 0)
        }
        return cats
    }, [categories, activeCategory, searchQuery])

    const totalResults = useMemo(
        () => visibleCategories.reduce((n, c) => n + c.items.length, 0),
        [visibleCategories]
    )

    // ── Terminal states ──────────────────────────────────────────────────────
    if (isLoading) return <div className="p-6"><MenuSkeleton /></div>

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-20">
                <p className="text-4xl mb-3">⚠️</p>
                <p className="font-semibold text-[var(--canvas-text)] mb-1">Couldn’t load the menu</p>
                <p className="text-sm text-gray-500 mb-5 max-w-sm">{error}</p>
                <button
                    onClick={() => { setIsLoading(true); fetchMenu() }}
                    className="px-5 py-2.5 rounded-lg text-white text-sm font-bold"
                    style={{ background: 'var(--color-primary)' }}
                >
                    Retry
                </button>
            </div>
        )
    }

    if (!categories.length) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-20 text-gray-400">
                <p className="text-4xl mb-3">🍽️</p>
                <p className="font-semibold mb-1">No items available yet</p>
                <p className="text-sm max-w-sm">This menu is being set up. Check back soon.</p>
            </div>
        )
    }

    let imgIndex = 0 // global eager/lazy counter across categories

    return (
        <div>
            {/* Promo banner — dynamic, hidden if unset */}
            {promo?.enabled && (
                <div className="bg-[#10B981] text-white text-sm font-semibold px-4 py-3 text-center">
                    {promo.text}
                    {promo.code && <span> — Code: {promo.code}</span>}
                </div>
            )}

            {/* Category filter rail (sticky below the 64px header) */}
            <div
                className="sticky top-0 z-30 bg-[var(--canvas-bg)] border-b border-gray-100 px-4 lg:px-6 py-3 flex gap-2 overflow-x-auto"
            >
                <FilterPill label="All" active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} />
                {categories.map((cat) => (
                    <FilterPill
                        key={cat.id}
                        label={`${cat.icon ? cat.icon + ' ' : ''}${cat.name}`}
                        active={activeCategory === cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                    />
                ))}
            </div>

            {/* Empty search result (data exists, query matched nothing) */}
            {searchQuery.trim() && totalResults === 0 && (
                <p className="text-sm text-gray-500 px-6 pt-6">
                    No results for “{searchQuery.trim()}”.
                </p>
            )}

            {/* Product grid, grouped by category */}
            <div className="p-4 lg:p-6">
                {visibleCategories.map((cat) => (
                    <section key={cat.id} className="mb-8">
                        <h2 className="text-lg font-bold text-[var(--canvas-text)] mb-3">{cat.name}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
                            {cat.items.map((item) => {
                                const eager = imgIndex < 4
                                imgIndex += 1
                                return (
                                    <ProductCard
                                        key={item.id}
                                        item={item}
                                        eager={eager}
                                        fmt={fmt}
                                        flashing={addedId === item.id}
                                        onOpen={() => setSelectedItem(item)}
                                        onAdd={() => handleAdd(item)}
                                    />
                                )
                            })}
                        </div>
                    </section>
                ))}
            </div>

            {/* Detail modal — nav-height zeroed so it isn't offset by mobile bottom nav */}
            <div style={{ '--nav-height': '0px' }}>
                <ItemDetailModal
                    item={selectedItem}
                    isOpen={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onAddToCart={(item, qty) => addToCart(item, qty, [])}
                />
            </div>
        </div>
    )
}

function FilterPill({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={
                'whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ' +
                (active
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50')
            }
        >
            {label}
        </button>
    )
}

function ProductCard({ item, eager, fmt, flashing, onOpen, onAdd }) {
    const src = item.image && !String(item.image).startsWith('blob:')
        ? getOptimizedImageUrl(item.image, { width: 600, quality: 80 })
        : FALLBACK_IMG

    return (
        <div
            onClick={onOpen}
            className="cursor-pointer overflow-hidden bg-[var(--canvas-surface)] shadow-sm hover:shadow-md transition-shadow"
            style={{ borderRadius: 'var(--radius-card, 16px)' }}
        >
            <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                <img
                    src={src}
                    alt={item.name}
                    loading={eager ? 'eager' : 'lazy'}
                    decoding={eager ? 'auto' : 'async'}
                    fetchpriority={eager ? 'high' : 'auto'}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMG }}
                />
            </div>
            <div className="p-3">
                <h3 className="font-semibold text-sm text-[var(--canvas-text)] truncate">{item.name}</h3>
                {item.description && (
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>
                )}
                <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="font-bold text-sm text-[var(--canvas-text)]">{fmt(item.price)}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAdd() }}
                        className="px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-transform"
                        style={{
                            background: 'var(--color-primary)',
                            transform: flashing ? 'scale(0.95)' : 'scale(1)',
                        }}
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    )
}
