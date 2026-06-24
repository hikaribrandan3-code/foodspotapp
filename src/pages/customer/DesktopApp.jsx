import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { UtensilsCrossed, CalendarDays, Gamepad2, Info, ClipboardList, Search, ShoppingCart, MapPin, HelpCircle } from 'lucide-react'
import { useTenant } from '../../contexts/TenantContext'
import { useCart } from '../../contexts/CartContext'
import DesktopMenuTab from './desktop/DesktopMenuTab'
import DesktopCart from './desktop/DesktopCart'
import DesktopInfoTab from './desktop/DesktopInfoTab'
import DesktopStatusTab from './desktop/DesktopStatusTab'
import DesktopEventsTab from './desktop/DesktopEventsTab'
import { buildTenantSeo } from './desktop/useTenantSeo'

const NAV = [
    { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
    { id: 'events', label: 'Events', icon: CalendarDays },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'info', label: 'Info', icon: Info },
    { id: 'status', label: 'Status', icon: ClipboardList },
]

export default function DesktopApp() {
    const { tenantSlug } = useParams()
    const { tenantData } = useTenant()
    const { cart } = useCart()

    const [activeTab, setActiveTab] = useState('menu')
    const [cartOpen, setCartOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [menuCategories, setMenuCategories] = useState([])

    const cartCount = (cart?.items || []).reduce((sum, i) => sum + i.quantity, 0)

    const onCategoriesLoaded = useCallback((cats) => setMenuCategories(cats), [])

    const seo = buildTenantSeo(tenantData, tenantSlug, menuCategories)

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--canvas-bg)] text-[var(--canvas-text)]">
            {/* SEO head (Phase 1: client-rendered, JS-crawlable) */}
            <Helmet>
                <title>{seo.title}</title>
                <meta name="description" content={seo.description} />
                <link rel="canonical" href={seo.canonical} />
                <meta property="og:type" content="restaurant" />
                <meta property="og:title" content={seo.title} />
                <meta property="og:description" content={seo.description} />
                <meta property="og:url" content={seo.canonical} />
                {seo.image && <meta property="og:image" content={seo.image} />}
                <script type="application/ld+json">{JSON.stringify(seo.restaurantLd)}</script>
                {seo.menuLd && <script type="application/ld+json">{JSON.stringify(seo.menuLd)}</script>}
            </Helmet>

            {/* Sidebar — tenant brand color, 200px */}
            <nav
                className="w-[200px] shrink-0 flex flex-col py-4 px-3 gap-1"
                style={{ background: 'var(--color-primary)' }}
            >
                <button
                    onClick={() => window.location.href = `/${tenantSlug}`}
                    className="px-2 pb-4 text-white font-extrabold text-xl tracking-tight cursor-pointer hover:opacity-80 transition-opacity border-none bg-none text-left"
                >
                    FoodSpot
                </button>
                {NAV.map(({ id, label, icon: Icon }) => {
                    const active = activeTab === id
                    return (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-left ' +
                                (active ? 'bg-white' : 'text-white/70 hover:text-white hover:bg-white/10')
                            }
                            style={active ? { color: 'var(--color-primary)' } : undefined}
                        >
                            <Icon size={18} />
                            {label}
                        </button>
                    )
                })}
            </nav>

            {/* Main */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header
                    className="h-16 shrink-0 flex items-center gap-4 px-4 lg:px-6 border-b border-gray-100 z-40"
                    style={{ background: 'var(--header-bg, #ffffff)', color: 'var(--header-text, #1F2937)' }}
                >
                    <div className="relative flex-1 max-w-md">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for meals or categories..."
                            className="w-full pl-9 pr-3 py-2 rounded-full bg-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                        />
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                        <button className="hidden md:flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
                            <MapPin size={16} /> Locations
                        </button>
                        <button className="hidden md:flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
                            <HelpCircle size={16} /> Help
                        </button>
                        <button
                            onClick={() => setCartOpen(true)}
                            className="relative p-2 rounded-lg hover:bg-gray-100"
                            aria-label="Open cart"
                        >
                            <ShoppingCart size={20} className="text-gray-700" />
                            {cartCount > 0 && (
                                <span
                                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
                                    style={{ background: 'var(--color-primary)' }}
                                >
                                    {cartCount}
                                </span>
                            )}
                        </button>
                        <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" aria-label="Account" />
                    </div>
                </header>

                {/* Tab content */}
                <main className="flex-1 overflow-y-auto">
                    {activeTab === 'menu' && (
                        <DesktopMenuTab searchQuery={searchQuery} onCategoriesLoaded={onCategoriesLoaded} />
                    )}
                    {activeTab === 'events' && <DesktopEventsTab />}
                    {activeTab === 'games' && <ComingSoonStub label="Games" />}
                    {activeTab === 'info' && <DesktopInfoTab />}
                    {activeTab === 'status' && <DesktopStatusTab />}
                </main>
            </div>

            {/* Cart drawer (always mounted for slide animation) */}
            <DesktopCart isOpen={cartOpen} onClose={() => setCartOpen(false)} />
        </div>
    )
}

function ComingSoonStub({ label }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center">
            <p className="text-3xl mb-2">🚧</p>
            <p className="font-semibold text-[var(--canvas-text)]">{label} — Coming Soon</p>
        </div>
    )
}
