import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { getConfig, HERO_ICON_DARK, HERO_DEFAULT } from './config/appConfig.v2.js'
import { incrementVisit, updateOrder, getOrders } from './utils/storage.js'
import { getSession } from './utils/auth.js'
import { AdminIntentProvider, useAdminIntent } from './contexts/AdminIntentContext.jsx'
import { useTenant } from './contexts/TenantContext.jsx'
import { supabase, getBranding, subscribeToOrders, getOrdersByGuestToken, getOrdersByPhone } from './lib/supabaseClient.js'

// Components
import BottomNav from './components/BottomNav.jsx'
import BackendNav from './components/BackendNav.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Customer Pages
import Home from './pages/customer/Home.jsx'
import Menu from './pages/customer/Menu.jsx'
import Order from './pages/customer/Order.jsx'
import OrderStatus from './pages/customer/OrderStatus.jsx'
import Rewards from './pages/customer/Rewards.jsx'
import ShareFood from './pages/customer/ShareFood.jsx'
import PerfectPour from './pages/customer/PerfectPour.jsx'
import Info from './pages/customer/Info.jsx'
import Promos from './pages/customer/Promos.jsx'

// Staff Pages
import StaffLogin from './pages/staff/StaffLogin.jsx'
import StaffDashboard from './pages/staff/StaffDashboard.jsx'

// Owner Pages
import OwnerLogin from './pages/owner/OwnerLogin.jsx'
import OwnerSummary from './pages/owner/OwnerSummary.jsx'
import MenuManager from './pages/owner/MenuManager.jsx'
import RewardsManager from './pages/owner/RewardsManager.jsx'
import Settings from './pages/owner/Settings.jsx'
import Analytics from './pages/owner/Analytics.jsx'
import DeliveryManager from './pages/owner/DeliveryManager.jsx'

// Admin Pages (Lazy-loaded)
const SuperAdmin = lazy(() => import('./pages/admin/SuperAdmin.jsx'))
import CoverPreview from './components/CoverPreview.jsx'

// Demo Pages (Lazy-loaded)
const DemoBackend = lazy(() => import('./pages/demo/DemoBackend.jsx'))
import Demo from './pages/demo/Demo.jsx'

// Auth Pages
import TrialSignup from './pages/auth/TrialSignup.jsx'

// Loading fallback for lazy components
const LazyFallback = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--canvas-bg, #fff)',
        color: 'var(--canvas-text, #000)',
        fontSize: 14,
        fontWeight: 500
    }}>
        Cargando...
    </div>
)

// Camera Suite
import Camera from './components/Camera/index.jsx'

// Route Area Wrapper - Forces unmount when switching between role areas
function RouteAreaWrapper({ children }) {
    const location = useLocation()
    const getRouteArea = () => {
        const path = location.pathname
        if (path.includes('/admin')) return 'admin'
        if (path.includes('/owner')) return 'owner'
        if (path.includes('/staff')) return 'staff'
        if (path.includes('/demo')) return 'demo'
        return 'customer'
    }
    const routeArea = getRouteArea()
    return <div key={routeArea}>{children}</div>
}

// Stacked Admin Badge Component
function StackedAdminBadge() {
    const [session, setSession] = useState(null)
    const [showMenu, setShowMenu] = useState(false)
    const { isSimulated, activeRoleView, exitSimulation } = useAdminIntent()
    const navigate = useNavigate()

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const sessionData = await getSession()
                setSession(sessionData)
            } catch {
                setSession(null)
            }
        }
        fetchSession()
    }, [])

    if (!session || session?.role !== 'superadmin') return null

    const handleNavigate = (path) => {
        setShowMenu(false)
        navigate(path, { replace: true })
        window.scrollTo(0, 0)
    }

    return (
        <>
            <div
                onClick={() => setShowMenu(!showMenu)}
                style={{
                    position: 'fixed', bottom: 90, left: 20, padding: '8px 12px',
                    background: 'rgba(26, 26, 26, 0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    color: '#00ff00', fontSize: 12, fontWeight: 700, borderRadius: 10, zIndex: 2000,
                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)', border: '1px solid rgba(0,255,0,0.2)', userSelect: 'none'
                }}
            >
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.5px' }}>🔧 SUPER ADMIN</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{showMenu ? '▼' : '▲'}</span>
            </div>
            {showMenu && (
                <>
                    <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 1999, background: 'rgba(0,0,0,0.2)' }} />
                    <div style={{
                        position: 'fixed', bottom: 130, left: 20, background: '#1a1a1a', borderRadius: 12, padding: 8,
                        zIndex: 2000, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 160
                    }}>
                        <div style={{ fontSize: 10, color: '#888', padding: '4px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Switch</div>
                        {[
                            { label: '🎛️ Admin Panel', path: '/admin', color: '#7C3AED' },
                            { label: '👤 Owner View', path: '/owner/summary', color: '#3B82F6' },
                            { label: '📋 Staff View', path: '/staff/dashboard', color: '#22C55E' }
                        ].map(item => (
                            <div
                                key={item.path}
                                onClick={() => handleNavigate(item.path)}
                                style={{
                                    padding: '10px 12px', color: '#fff', fontSize: 13, fontWeight: 500, borderRadius: 8, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                                {item.label}
                            </div>
                        ))}
                        {isSimulated && (
                            <div
                                onClick={() => { exitSimulation(); setShowMenu(false) }}
                                style={{
                                    padding: '10px 12px', color: '#EF4444', fontSize: 13, fontWeight: 500, borderRadius: 8, cursor: 'pointer',
                                    borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4
                                }}
                            >
                                ✕ Exit Simulation
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    )
}

function App() {
    // ============================================
    // 1. MANDATORY HOOK CHAIN (ALL HOOKS MUST BE TOP-LEVEL)
    // ============================================
    const location = useLocation();
    const navigate = useNavigate();
    const tenant = useTenant();

    const [config, setConfig] = useState(() => getConfig());
    const [orders, setOrders] = useState([]);
    const safeConfig = useMemo(() => config ?? { pauseOrders: false }, [config]);

    const businessId = tenant?.businessId;
    const tenantData = tenant?.tenantData;
    const trialExpired = tenant?.trialExpired;

    // ============================================
    // 2. EFFECT HOOKS (INTERNAL NULL GUARDS)
    // ============================================

    useEffect(() => { incrementVisit(); }, []);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                localStorage.removeItem('admin_intent');
                localStorage.removeItem('simulatedRole');
                localStorage.removeItem('activeRoleView');
            }
        });
        return () => authListener?.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const path = window.location.pathname;
        if (path === '/' || path.includes('start-trial')) return;
        if (!businessId) return;

        const loadCloudBranding = async () => {
            try {
                const { data: cloudBranding, error } = await getBranding(businessId);
                if (error || !cloudBranding) return;
                setConfig(prev => ({
                    ...prev,
                    businessName: cloudBranding.business_name || prev.businessName,
                    branding: {
                        ...prev.branding,
                        primaryColor: cloudBranding.primary_color || prev.branding?.primaryColor,
                        fontFamily: cloudBranding.font_family || prev.branding?.fontFamily,
                    },
                    colors: {
                        ...prev.colors,
                        primary: cloudBranding.primary_color || prev.colors?.primary,
                        secondary: cloudBranding.secondary_color || prev.colors?.secondary,
                    },
                    headerCover: cloudBranding.hero_url ? { ...prev.headerCover, image: cloudBranding.hero_url } : prev.headerCover,
                    logo: cloudBranding.logo_url || prev.logo,
                }));
            } catch { /* Silent */ }
        };
        loadCloudBranding();
    }, [businessId]);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
        }
        if ('caches' in window) {
            caches.keys().then(names => names.forEach(n => caches.delete(n)));
        }
    }, []);

    useEffect(() => {
        if (!config) return;
        const root = document.documentElement;
        const fontFamily = config.branding?.fontFamily || 'Inter';
        const fontWeight = config.branding?.fontWeight || '400';
        root.style.setProperty('--font-family-brand', `"${fontFamily}", system-ui, -apple-system, sans-serif`);
        root.style.setProperty('--font-weight-brand', fontWeight);
        document.body.style.fontFamily = `"${fontFamily}", system-ui, -apple-system, sans-serif`;
    }, [config.branding?.fontFamily, config.branding?.fontWeight]);

    useEffect(() => {
        if (!config) return;
        const root = document.documentElement;
        root.style.setProperty('--nav-primary-color', config.branding?.primaryColor || '#8B7355');
        root.style.setProperty('--nav-icon-color', config.branding?.iconColorMode === 'black' ? '#000000' : '#FFFFFF');
        const nav = document.querySelector('.bottom-nav');
        if (nav) { nav.style.opacity = '0.99'; requestAnimationFrame(() => { nav.style.opacity = '1'; }); }
    }, [config.branding?.primaryColor, config.branding?.iconColorMode]);

    useEffect(() => {
        if (!config) return;
        const root = document.documentElement;
        const heroIcons = config.heroIcons || {};
        const getHeroBg = (c) => (!c?.color || c.color === 'auto') ? 'var(--canvas-surface)' : c.color;
        const getHeroIcon = (c) => (!c?.iconColorMode || c.iconColorMode === 'auto') ? 'var(--canvas-surface-text)' : (c.iconColorMode === 'white' ? '#FFFFFF' : HERO_ICON_DARK);

        const menuC = heroIcons.menu || HERO_DEFAULT;
        root.style.setProperty('--hero-menu-bg', getHeroBg(menuC));
        root.style.setProperty('--hero-menu-icon', getHeroIcon(menuC));
        const delC = heroIcons.delivery || HERO_DEFAULT;
        root.style.setProperty('--hero-delivery-bg', getHeroBg(delC));
        root.style.setProperty('--hero-delivery-icon', getHeroIcon(delC));
        const promoC = { ...HERO_DEFAULT, ...(heroIcons.rewards || {}), ...(heroIcons.promos || {}) };
        root.style.setProperty('--hero-promos-bg', getHeroBg(promoC));
        root.style.setProperty('--hero-promos-icon', getHeroIcon(promoC));
        root.style.setProperty('--hero-rewards-bg', getHeroBg(promoC));
        root.style.setProperty('--hero-rewards-icon', getHeroIcon(promoC));
        const gameC = heroIcons.game || HERO_DEFAULT;
        root.style.setProperty('--hero-game-bg', getHeroBg(gameC));
        root.style.setProperty('--hero-game-icon', getHeroIcon(gameC));
    }, [config.heroIcons, config.canvasMode]);

    useEffect(() => {
        if (!config) return;
        const root = document.documentElement;
        const canvasMode = config.canvasMode || 'light';
        const headerMode = config.headerMode || 'auto';
        const DARK_TOKENS = { root: '#0E0E0F', surface: '#161618', surfaceRaised: '#1C1C1F', surfaceAlt: '#202024' };
        const LIGHT_TOKENS = { root: '#FFFFFF', surface: '#FFFFFF', surfaceRaised: '#FFFFFF', surfaceAlt: '#F9FAFB' };
        const tokens = canvasMode === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;

        root.style.setProperty('--canvas-bg', tokens.root);
        root.style.setProperty('--surface-bg', tokens.surface);
        root.style.setProperty('--surface-raised-bg', tokens.surfaceRaised);
        root.style.setProperty('--surface-alt-bg', tokens.surfaceAlt);

        if (canvasMode === 'dark') {
            root.style.setProperty('--canvas-text', '#FFFFFF');
            root.style.setProperty('--canvas-text-muted', '#A0A0A5');
            root.style.setProperty('--canvas-surface', tokens.surface);
            root.style.setProperty('--canvas-surface-text', '#FFFFFF');
            root.style.setProperty('--shadow-card', '0px 6px 18px rgba(0,0,0,0.45)');
            root.style.setProperty('--shadow-raised', '0px 12px 32px rgba(0,0,0,0.6)');
            root.style.setProperty('--border-subtle', 'rgba(255,255,255,0.04)');
            root.style.setProperty('--border-visible', 'rgba(255,255,255,0.06)');
            root.style.setProperty('--icon-primary', '#E5E7EB');
            root.style.setProperty('--icon-secondary', '#9CA3AF');
            root.style.setProperty('--icon-muted', '#6B7280');
        } else {
            root.style.setProperty('--canvas-text', '#000000');
            root.style.setProperty('--canvas-text-muted', '#666666');
            root.style.setProperty('--canvas-surface', '#FFFFFF');
            root.style.setProperty('--canvas-surface-text', '#000000');
            root.style.setProperty('--shadow-card', '0px 2px 8px rgba(0,0,0,0.08)');
            root.style.setProperty('--shadow-raised', '0px 8px 24px rgba(0,0,0,0.12)');
            root.style.setProperty('--border-subtle', 'rgba(0,0,0,0.06)');
            root.style.setProperty('--border-visible', 'rgba(0,0,0,0.10)');
            root.style.setProperty('--icon-primary', '#374151');
            root.style.setProperty('--icon-secondary', '#6B7280');
            root.style.setProperty('--icon-muted', '#9CA3AF');
        }

        root.style.setProperty('--radius-sm', '12px');
        root.style.setProperty('--radius-card', '16px');
        root.style.setProperty('--radius-modal', '20px');
        root.style.setProperty('--shadow-none', 'none');

        let headerBg, headerText;
        if (headerMode === 'locked-light') { headerBg = '#FFFFFF'; headerText = '#000000'; }
        else if (headerMode === 'locked-dark') { headerBg = DARK_TOKENS.root; headerText = '#FFFFFF'; }
        else { headerBg = canvasMode === 'dark' ? DARK_TOKENS.root : '#FFFFFF'; headerText = canvasMode === 'dark' ? '#FFFFFF' : '#000000'; }

        root.style.setProperty('--header-bg', headerBg);
        root.style.setProperty('--header-text', headerText);
        root.setAttribute('data-theme', canvasMode);
    }, [config.canvasMode, config.headerMode]);

    const refreshConfig = useCallback(async () => {
        if (window.location.pathname === '/' || window.location.pathname.includes('start-trial')) return;
        if (!businessId) return;
        const localConfig = getConfig();
        try {
            const { data: cloudBranding } = await getBranding(businessId);
            if (cloudBranding) {
                setConfig({ ...localConfig, branding: { ...localConfig.branding, primaryColor: cloudBranding.primary_color || localConfig.branding?.primaryColor }, colors: { ...localConfig.colors, primary: cloudBranding.primary_color || localConfig.colors?.primary, secondary: cloudBranding.secondary_color || localConfig.colors?.secondary }, headerCover: cloudBranding.hero_url ? { ...localConfig.headerCover, image: cloudBranding.hero_url } : localConfig.headerCover, logo: cloudBranding.logo_url || localConfig.logo });
            } else if (localConfig) { setConfig(localConfig); }
        } catch (err) { console.warn('[Supabase] Refresh failed', err); if (localConfig) setConfig(localConfig); }
        setOrders(getOrders());
    }, [businessId]);

    useEffect(() => {
        if (window.location.pathname === '/' || window.location.pathname === '/start-trial') return;
        if (!businessId) return;
        let realtimeChannel = null;
        const initCloudSync = async () => {
            const guestToken = localStorage.getItem('fs_guest_token');
            const customerPhone = localStorage.getItem('fs_customer_phone');
            if (guestToken) { try { const { data } = await getOrdersByGuestToken(guestToken, businessId); if (data?.length > 0) setOrders(data); } catch { } }
            else if (customerPhone) { try { const { data } = await getOrdersByPhone(customerPhone, businessId); if (data?.length > 0) setOrders(data); } catch { } }
            realtimeChannel = subscribeToOrders(businessId, (newOrder) => setOrders(prev => prev.some(o => o.id === newOrder.id) ? prev : [newOrder, ...prev]), (orderId, updatedData) => setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedData } : o)));
        };
        initCloudSync();
        const handleVisibility = () => { if (document.visibilityState === 'visible') refreshConfig(); };
        const handleStorage = (e) => { if (e.key === 'grub_config' || e.key === null) refreshConfig(); };
        const handleFrontend = () => refreshConfig();
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('storage', handleStorage);
        window.addEventListener('frontendSync', handleFrontend);
        return () => { if (realtimeChannel) realtimeChannel.unsubscribe(); document.removeEventListener('visibilitychange', handleVisibility); window.removeEventListener('storage', handleStorage); window.removeEventListener('frontendSync', handleFrontend); };
    }, [businessId, refreshConfig]);

    // ============================================
    // 3. 🛡️ THE HYDRATION SHIELD (SAFE POSITION)
    // ============================================
    if (!tenant) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#DB0007] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-white text-xs font-mono uppercase tracking-widest animate-pulse">Hydrating Silo...</p>
                </div>
            </div>
        );
    }

    // ============================================
    // 4. LOGIC INTERCEPTORS (NOW SAFE)
    // ============================================
    const path = location.pathname;

    if (path === '/login/owner' || path === '/login') {
        return <Routes><Route path="*" element={<OwnerLogin />} /></Routes>;
    }

    if (trialExpired) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '24px' }}>⏰</div>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px', background: 'linear-gradient(90deg, #ff6b6b, #ffa502)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Tu período de prueba terminó</h1>
                <p style={{ opacity: 0.8, maxWidth: '400px', marginBottom: '32px', lineHeight: 1.6 }}>El trial de <strong>{tenantData?.business_name || 'tu negocio'}</strong> ha expirado. Actualizá tu plan para seguir recibiendo pedidos.</p>
                <a href="https://wa.me/5491123456789?text=Quiero%20activar%20mi%20cuenta%20FoodSpot" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '16px 32px', background: 'linear-gradient(90deg, #25D366, #128C7E)', color: '#fff', fontWeight: 600, fontSize: '16px', borderRadius: '12px', textDecoration: 'none', boxShadow: '0 4px 20px rgba(37, 211, 102, 0.4)' }}>💬 Contactar Soporte</a>
            </div>
        );
    }

    if (config.maintenanceMode) {
        return (<div className="app-container"><div className="maintenance-overlay"><div className="maintenance-icon">🔧</div><h1 className="maintenance-title">En mantenimiento</h1><p className="maintenance-message">{config.maintenanceMessage}</p></div></div>);
    }

    // ============================================
    // 5. FINAL RENDER
    // ============================================
    return (
        <AdminIntentProvider>
            <div className="app-container">
                <RouteAreaWrapper>
                    <Routes>
                        <Route path="/" element={<TrialSignup />} />
                        <Route path="/start-trial" element={<TrialSignup />} />
                        <Route path="/login" element={<OwnerLogin />} />
                        <Route path="/login/owner" element={<OwnerLogin />} />
                        <Route path="/login/staff" element={<StaffLogin />} />

                        <Route path="/:tenantSlug" element={<Home config={safeConfig} />} />
                        <Route path="/:tenantSlug/menu" element={<Menu config={safeConfig} />} />
                        <Route path="/:tenantSlug/envios" element={<Menu config={safeConfig} deliveryMode={true} />} />
                        <Route path="/:tenantSlug/order" element={<Order config={safeConfig} />} />
                        <Route path="/:tenantSlug/status" element={<OrderStatus config={safeConfig} featuredItems={safeConfig.featuredPhotos || []} />} />
                        <Route path="/:tenantSlug/rewards" element={<Rewards config={safeConfig} />} />
                        <Route path="/:tenantSlug/share" element={<ShareFood config={safeConfig} />} />
                        <Route path="/:tenantSlug/game" element={<PerfectPour />} />
                        <Route path="/:tenantSlug/info" element={<Info config={safeConfig} />} />
                        <Route path="/:tenantSlug/promos" element={<Promos config={safeConfig} />} />

                        <Route path="/:tenantSlug/staff" element={<StaffLogin />} />
                        <Route path="/:tenantSlug/staff/dashboard" element={<ProtectedRoute requiredRole="staff"><StaffDashboard config={safeConfig} orders={orders} updateOrder={updateOrder} setOrders={setOrders} /></ProtectedRoute>} />

                        <Route path="/:tenantSlug/owner" element={<OwnerLogin />} />
                        <Route path="/:tenantSlug/owner/summary" element={<ProtectedRoute requiredRole="owner"><OwnerSummary config={safeConfig} /></ProtectedRoute>} />
                        <Route path="/:tenantSlug/owner/menu" element={<ProtectedRoute requiredRole="owner"><MenuManager config={safeConfig} /></ProtectedRoute>} />
                        <Route path="/:tenantSlug/owner/delivery" element={<ProtectedRoute requiredRole="owner"><DeliveryManager config={safeConfig} /></ProtectedRoute>} />
                        <Route path="/:tenantSlug/owner/rewards" element={<ProtectedRoute requiredRole="owner"><RewardsManager config={safeConfig} /></ProtectedRoute>} />
                        <Route path="/:tenantSlug/owner/settings" element={<ProtectedRoute requiredRole="owner"><Settings config={safeConfig} /></ProtectedRoute>} />
                        <Route path="/:tenantSlug/owner/analytics" element={<ProtectedRoute requiredRole="owner"><Analytics orders={orders} /></ProtectedRoute>} />
                        <Route path="/:tenantSlug/owner/branding" element={<ProtectedRoute requiredRole="owner"><Settings config={safeConfig} /></ProtectedRoute>} />

                        <Route path="/demo" element={<Demo />} />
                        <Route path="/demo/menu" element={<MenuManager config={safeConfig} demoMode={true} />} />
                        <Route path="/demo/branding" element={<Settings config={safeConfig} demoMode={true} />} />
                        <Route path="/demo/orders" element={<DeliveryManager config={safeConfig} demoMode={true} />} />
                        <Route path="/demo/analytics" element={<Analytics demoMode={true} />} />
                        <Route path="/demo/new" element={<Demo />} />
                        <Route path="/demo/backend/dashboard" element={<Suspense fallback={<LazyFallback />}><DemoBackend /></Suspense>} />
                        <Route path="/demo/backend" element={<Navigate to="/demo/backend/dashboard" replace />} />

                        <Route path="/admin" element={<Suspense fallback={<LazyFallback />}><SuperAdmin config={safeConfig} /></Suspense>} />
                        <Route path="/admin/cover-preview" element={<CoverPreview config={safeConfig} />} />
                        <Route path="/camera" element={<Camera />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </RouteAreaWrapper>

                {(() => {
                    const p = location.pathname;
                    const isBackendRoute = p.includes('/owner') || p.includes('/staff') || p.includes('/admin');
                    const isGlobalRoute = p === '/' || p.includes('start-trial') || p.includes('/login') || p.includes('/demo');
                    if (isBackendRoute) return <BackendNav role="owner" useRoutes={true} />;
                    if (!isGlobalRoute) return <BottomNav config={safeConfig} />;
                    return null;
                })()}

                <StackedAdminBadge />
            </div>
        </AdminIntentProvider>
    );
}

export default App
