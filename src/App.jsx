import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'

import { getConfig, normalizeConfig, HERO_ICON_DARK, HERO_DEFAULT } from './config/appConfig.v2.js'
import { incrementVisit, updateOrder, getOrders } from './utils/storage.js'
import { sanitizeForAdmin } from './utils/adminSanitize.js'
import { getSession } from './utils/auth.js'
import { AdminIntentProvider, useAdminIntent } from './contexts/AdminIntentContext.jsx'
import { useTenant } from './contexts/TenantContext.jsx'
import { CartProvider } from './contexts/CartContext.jsx'
import { supabase, getBranding, subscribeToOrders, getOrdersByGuestToken, getOrdersByPhone } from './lib/supabaseClient.js'
import { StrategyDraftProvider } from './contexts/StrategyDraftContext.jsx'
import { LanguageProvider } from './contexts/LanguageContext.jsx'
import { SessionProvider } from './contexts/SessionContext.jsx'
import { StaffProvider } from './contexts/StaffContext.jsx'

// Component
import BottomNav from './components/BottomNav.jsx'
import BackendNav from './components/BackendNav.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Customer Pages
import Home from './pages/customer/Home.jsx'
import Menu from './pages/customer/Menu.jsx'
import Envio from './pages/customer/Envio.jsx'
import Order from './pages/customer/Order.jsx'
import OrderStatus from './pages/customer/OrderStatus.jsx'
import Rewards from './pages/customer/Rewards.jsx'
import ShareFood from './pages/customer/ShareFood.jsx'
import PerfectPour from './pages/customer/PerfectPour.jsx'
import Info from './pages/customer/Info.jsx'
import Promos from './pages/customer/Promos.jsx'
import Wall from './pages/customer/Wall.jsx'
import Arcade from './pages/customer/Arcade.jsx'
import Session from './pages/customer/Session.jsx'

// Staff Pages
import StaffLogin from './pages/staff/StaffLogin.jsx'
import StaffDashboard from './pages/staff/StaffDashboard.jsx'
import StaffKDS from './pages/staff/StaffKDS.jsx'

// Owner Pages
import OwnerLogin from './pages/owner/OwnerLogin.jsx'
import OwnerSummary from './pages/owner/OwnerSummary.jsx'
import MenuManager from './pages/owner/MenuManager.jsx'
import RewardsManager from './pages/owner/RewardsManager.jsx'
import Settings from './pages/owner/Settings.jsx'
import Analytics from './pages/owner/Analytics.jsx'
import FoodSpotAI from './pages/owner/FoodSpotAI.jsx'
import DeliveryManager from './pages/owner/DeliveryManager.jsx'

// Admin Pages (Lazy-loaded)
const SuperAdmin = lazy(() => import('./pages/admin/SuperAdmin.jsx'))
import CoverPreview from './components/CoverPreview.jsx'
import AdminErrorBoundary from './components/Error/AdminErrorBoundary.jsx'

// Auth Pages
import TrialSignup from './pages/auth/TrialSignup.jsx'

// Loading fallback for lazy components
// Loading fallback for lazy components
const LazyFallback = () => {
    const { t } = useLanguage()
    return (
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
            {t('loading')}
        </div>
    )
}

// Camera Suite
import Camera from './components/Camera/index.jsx'

function RouteAreaWrapper({ children }) {
    const location = useLocation()
    const getRouteArea = () => {
        const path = location.pathname
        if (path.includes('/admin')) return 'admin'
        if (path.includes('/owner')) return 'owner'
        if (path.includes('/staff')) return 'staff'
        return 'customer'
    }
    const routeArea = getRouteArea()
    return <div key={routeArea}>{children}</div>
}

function App() {
    const location = useLocation();
    const navigate = useNavigate();
    const { tenantData, businessId } = useTenant();
    const [authUser, setAuthUser] = useState(null);

    // 🛡️ Safe pathname extraction - works with both useLocation and window.location
    const pathname = location?.pathname || (typeof window !== 'undefined' ? window.location.pathname : '/');

    // 🛡️ ZERO-FLASH CONFIG: Initialize from tenant data if available (from cache)
    // This prevents the "flash of defaults" that causes style degradation
    const [config, setConfig] = useState(() => {
        // If tenant data is already available (from sync cache), use it immediately
        if (tenantData?.app_config) {
            console.log('[App] ⚡ INSTANT CONFIG: Using cached app_config')
            return normalizeConfig({
                ...tenantData,
                ...tenantData.app_config,
                infoPills: tenantData.info_pills || tenantData.app_config.infoPills,
                businessInfo: tenantData.business_info || tenantData.app_config.businessInfo,
                featuredPhotos: tenantData.featuredPhotos || tenantData.app_config.featuredPhotos,
                businessName: tenantData.business_name || tenantData.app_config.businessName,
                headerCover: {
                    ...(tenantData.app_config.headerCover || {}),
                    image: tenantData.hero_url || tenantData.app_config.headerCover?.image
                },
                headerBranding: {
                    ...(tenantData.app_config.headerBranding || {}),
                    mode: tenantData.hero_mode || tenantData.app_config.headerBranding?.mode || 'cover'
                },
                branding: {
                    ...(tenantData.app_config.branding || {}),
                    primaryColor: tenantData.primary_color || tenantData.app_config.branding?.primaryColor,
                    navbar_color: tenantData.navbar_color || tenantData.app_config.branding?.navbar_color,
                    nav_icon_mode: tenantData.nav_icon_mode || tenantData.app_config.branding?.nav_icon_mode
                }
            })
        }
        // Fallback to empty defaults (first visit, no cache)
        return normalizeConfig({})
    });
    const [orders, setOrders] = useState(() => getOrders());


    // 🔥 HYDRATION V5: MASTER MERGE - Full app_config restoration
    // This merges the ENTIRE app_config blob from Cloud, not just specific fields
    useEffect(() => {
        if (tenantData) {
            const cloudAppConfig = tenantData.app_config || {};

            const merged = normalizeConfig({
                ...config,
                ...tenantData,
                ...cloudAppConfig,
                infoPills: tenantData.info_pills || cloudAppConfig.infoPills || config.infoPills,
                businessInfo: tenantData.business_info || cloudAppConfig.businessInfo || config.businessInfo,
                featuredPhotos: tenantData.featuredPhotos || cloudAppConfig.featuredPhotos || config.featuredPhotos,
                businessName: tenantData.business_name || cloudAppConfig.businessName || config.businessName,
                headerCover: {
                    ...config.headerCover,
                    ...(cloudAppConfig.headerCover || {}),
                    image: tenantData.hero_url || cloudAppConfig.headerCover?.image || config.headerCover?.image
                },
                headerBranding: {
                    ...config.headerBranding,
                    ...(cloudAppConfig.headerBranding || {}),
                    mode: tenantData.hero_mode || cloudAppConfig.headerBranding?.mode || 'cover'
                },
                colors: {
                    ...config.colors,
                    ...(cloudAppConfig.colors || {}),
                    primary: tenantData.colors?.primary || cloudAppConfig.colors?.primary || tenantData.primary_color || config.colors?.primary,
                    secondary: tenantData.colors?.secondary || cloudAppConfig.colors?.secondary || tenantData.secondary_color || config.colors?.secondary,
                    confirmation: tenantData.colors?.confirmation || cloudAppConfig.colors?.confirmation || tenantData.confirmation_color || config.colors?.confirmation,
                    powered: tenantData.colors?.powered || cloudAppConfig.colors?.powered || tenantData.powered_by_color || config.colors?.powered
                },
                branding: {
                    ...config.branding,
                    ...(cloudAppConfig.branding || {}),
                    fontFamily: cloudAppConfig.branding?.fontFamily || tenantData.font_family || config.branding?.fontFamily,
                    fontWeight: cloudAppConfig.branding?.fontWeight || tenantData.font_weight || config.branding?.fontWeight,
                    primaryColor: cloudAppConfig.branding?.primaryColor || tenantData.navbar_color || config.branding?.primaryColor,
                    iconColorMode: cloudAppConfig.branding?.iconColorMode || tenantData.nav_icon_mode || config.branding?.iconColorMode
                },
                homeConfig: cloudAppConfig.homeConfig || config.homeConfig,
                heroIcons: tenantData.hero_icons || cloudAppConfig.heroIcons || config.heroIcons
            });
            setConfig(merged);
            console.log('☁️ [App.jsx] HYDRATION V6 PRIORITY FIX:', {
                primaryColor: merged.colors?.primary,
                fontFamily: merged.branding?.fontFamily
            });
        }
    }, [tenantData]);

    // Listen for optimistic updates from Settings.jsx
    useEffect(() => {
        const handleSync = (e) => {
            setConfig(prev => normalizeConfig({ ...prev, ...e.detail }));
        };
        window.addEventListener('frontendSync', handleSync);
        return () => window.removeEventListener('frontendSync', handleSync);
    }, []);

    const safeConfig = useMemo(() => config ?? normalizeConfig({}), [config]);

    // tenantData and businessId already mapped from useTenant() above
    // 🛡️ TEMPORARY BYPASS: Force trial to be active for testing
    // TODO: REMOVE BEFORE PRODUCTION
    const trialExpired = false; // tenant?.trialExpired;


    // ============================================
    // 2. EFFECT HOOKS (INTERNAL NULL GUARDS)
    // ============================================

    useEffect(() => { incrementVisit(); }, []);

    // 🛑 HARD STOP: 100ms delay when entering Admin to flush tenant memory
    const [adminReady, setAdminReady] = useState(!pathname.startsWith('/admin'));
    useEffect(() => {
        if (pathname.startsWith('/admin')) {
            setAdminReady(false);
            sanitizeForAdmin();
            // Allow browser to completely flush tenant memory
            const timer = setTimeout(() => setAdminReady(true), 100);
            return () => clearTimeout(timer);
        } else {
            setAdminReady(true);
        }
    }, [pathname]);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setAuthUser(session?.user || null);
            
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                localStorage.removeItem('admin_intent');
                localStorage.removeItem('simulatedRole');
                localStorage.removeItem('activeRoleView');
            }

            // 🛡️ STRIKE 13.6: ACCESO ADMIN LOOP FIX
            // If user is signed in and has a slug, NEVER let them sit on /admin or /
            if (event === 'SIGNED_IN') {
                console.log("🔐 [App.jsx] Auth Event: SIGNED_IN", session?.user);
                console.log("🔐 [App.jsx] User Metadata:", session?.user?.user_metadata);

                if (session?.user?.user_metadata?.slug) {
                    const slug = session.user.user_metadata.slug;
                    const path = window.location.pathname;
                    console.log("🔐 [App.jsx] Slug found:", slug, "Current Path:", path);

                    if (path === '/admin' || path === '/') {
                        console.log("🚀 AUTH GUARD: Redirecting to owner dashboard:", slug);
                        window.location.assign(`/${slug}/owner/summary`);
                    }
                } else {
                    console.warn("⚠️ [App.jsx] User signed in but NO SLUG in metadata!");
                }
            }
        });
        return () => authListener?.subscription.unsubscribe();
    }, []);

    // 🗑️ REMOVED: loadCloudBranding double-fetch
    // TenantContext already provides branding data - no need to fetch again

    // Metadata Injection: Set document title and favicon from tenant branding
    // 🛡️ FUTURE-PROOF: Defaults to FoodSpot when tenant data missing, auto-swaps when available
    useEffect(() => {
        // Generator pattern: safe fallbacks prevent m[x] crash
        const title = tenantData?.business_name || 'FoodSpot';
        const icon = tenantData?.logo_url || '/favicon.ico';

        document.title = title;

        let favicon = document.querySelector("link[rel~='icon']");
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        favicon.href = icon;
    }, [tenantData?.business_name, tenantData?.logo_url]);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
        }
        if ('caches' in window) {
            caches.keys().then(names => names.forEach(n => caches.delete(n)));
        }
    }, []);

    // 🔥 DEEP REPAINT: UNIFIED CSS INJECTION
    // Listens to config changes AND manually forces values to root
    useEffect(() => {
        if (!config) return;
        const root = document.documentElement;

        // 1. TYPOGRAPHY
        const fontFamily = config.branding?.fontFamily || 'Inter';
        const fontWeight = config.branding?.fontWeight || '400';
        root.style.setProperty('--font-family-brand', `"${fontFamily}", system-ui, -apple-system, sans-serif`);
        root.style.setProperty('--font-weight-brand', fontWeight);
        document.body.style.fontFamily = `"${fontFamily}", system-ui, -apple-system, sans-serif`;

        // 2. THE BIG 4 COLORS
        const c = config.colors || {};
        root.style.setProperty('--color-primary', c.primary || '#8B7355');
        root.style.setProperty('--color-secondary', c.secondary || '#A89070');
        root.style.setProperty('--color-confirm', c.confirmation || '#22C55E');
        root.style.setProperty('--color-powered', c.powered || '#C4856A');

        // 3. LEGACY NAV SUPPORT
        root.style.setProperty('--nav-primary-color', config.branding?.primaryColor || '#8B7355');
        root.style.setProperty('--nav-icon-color', config.branding?.iconColorMode === 'black' ? '#000000' : '#FFFFFF');

        // 4. HERO ICONS (Manual Mapping)
        const heroIcons = config.heroIcons || {};
        const getHeroBg = (c) => (!c?.color || c.color === 'auto') ? 'var(--canvas-surface)' : c.color;
        const getHeroIcon = (c) => (!c?.iconColorMode || c.iconColorMode === 'auto') ? 'var(--canvas-surface-text)' : (c.iconColorMode === 'white' ? '#FFFFFF' : HERO_ICON_DARK);

        const menuC = heroIcons.menu || HERO_DEFAULT;
        root.style.setProperty('--hero-menu-bg', getHeroBg(menuC));
        root.style.setProperty('--hero-menu-icon', getHeroIcon(menuC));
        // 🛡️ VAULT-SEAL FIX: Sync Header Image for Menu Ghosting Prevention
        // Uses branding.hero_url from tenantData (via config normalization)
        if (config.headerCover?.image && !config.headerCover.image.startsWith('blob:')) {
            root.style.setProperty('--header-image', `url(${config.headerCover.image})`);
        } else {
            root.style.removeProperty('--header-image'); // Let CSS fallback take over
        }

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

        // 5. FORCE REPAINT
        const nav = document.querySelector('.bottom-nav');
        if (nav) {
            nav.style.display = 'none';
            nav.offsetHeight; // trigger reflow
            nav.style.display = 'flex';
        }

    }, [
        config.branding?.fontFamily,
        config.branding?.fontWeight,
        config.colors?.primary,
        config.colors?.secondary,
        config.heroIcons,
        config.branding?.primaryColor
    ]);

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
            realtimeChannel = subscribeToOrders(businessId, (newOrder) => {
                setOrders(prev => {
                    const updated = prev.some(o => o.id === newOrder.id) ? prev : [newOrder, ...prev];
                    // 🔄 COLD BOOT SYNC: Persist to localStorage for Staff Dashboard hydration
                    try { localStorage.setItem('foodspot_orders', JSON.stringify(updated.slice(0, 50))); } catch { }
                    return updated;
                });
            }, (orderId, updatedData) => {
                setOrders(prev => {
                    const updated = prev.map(o => o.id === orderId ? { ...o, ...updatedData } : o);
                    try { localStorage.setItem('foodspot_orders', JSON.stringify(updated.slice(0, 50))); } catch { }
                    return updated;
                });
            });
        };
        initCloudSync();
        // 🛡️ REMOVED: visibilitychange handler that called refreshConfig()
        // refreshConfig() only partially updates config (primaryColor, hero_url, logo)
        // and was OVERWRITING the correct cached config with incomplete data on resume.
        // TenantContext now handles resume correctly with the full app_config.

        const handleStorage = (e) => { if (e.key === 'grub_config' || e.key === null) refreshConfig(); };
        // 🚀 CLOUD-AWARE REACTIVITY: Prefer Cloud data, fallback to localStorage
        const handleFrontend = () => {
            if (tenantData) {
                // Cloud-First: Merge tenantData into existing config
                setConfig(prev => normalizeConfig({ ...prev, ...tenantData }));
            } else {
                // Fallback: localStorage (for demo mode or offline scenarios)
                setConfig(getConfig());
            }
        };
        // document.addEventListener('visibilitychange', handleVisibility); // ❌ REMOVED - Caused partial config overwrite
        window.addEventListener('storage', handleStorage);
        window.addEventListener('frontendSync', handleFrontend);
        return () => { if (realtimeChannel) realtimeChannel.unsubscribe(); window.removeEventListener('storage', handleStorage); window.removeEventListener('frontendSync', handleFrontend); };
    }, [businessId, refreshConfig]);

    // 🛡️ VAULT-SEAL: Hydration is now handled by TenantProvider parent.
    // App.jsx renders directly.

    // ============================================
    // 4. LOGIC INTERCEPTORS (NOW SAFE)
    // ============================================
    // Note: 'path' already declared above in Global Route Immunity

    // 🛡️ STRIKE 13.7: LOGIN INTERCEPTOR FIX
    // If user attempts to visit /login but is already authenticated with a slug,
    // bounce them to their dashboard instead of trapping them in the login screen.
    useEffect(() => {
        if ((pathname === '/login/owner' || pathname === '/login') && authUser?.user_metadata?.slug) {
            const slug = authUser.user_metadata.slug;
            console.log("🚀 [App.jsx] User already logged in. Redirecting to:", `/${slug}/owner/summary`);
            navigate(`/${slug}/owner/summary`, { replace: true });
        }
    }, [pathname, authUser, navigate]);

    // Show OwnerLogin only when on login routes and NOT authenticated
    const showOwnerLogin = (pathname === '/login/owner' || pathname === '/login') && !authUser?.user_metadata?.slug;

    // 🏢 FINAL RENDER: Single unified Routes tree - NO early returns
    return (
        <AdminIntentProvider>
            <StaffProvider>
                <LanguageProvider>
                    <StrategyDraftProvider>
                        <CartProvider>
                            <SessionProvider>
                                <div className="app-container">
                                    <RouteAreaWrapper>
                                        <Routes>
                                            {/* GLOBAL ROUTES */}
                                            <Route path="/" element={<TrialSignup />} />
                                            <Route path="/start-trial" element={<TrialSignup />} />
                                            <Route path="/login" element={<OwnerLogin />} />
                                            <Route path="/login/owner" element={<OwnerLogin />} />
                                            <Route path="/login/staff" element={<StaffLogin />} />
                                            <Route path="/admin" element={<AdminErrorBoundary><Suspense fallback={<LazyFallback />}><SuperAdmin config={safeConfig} /></Suspense></AdminErrorBoundary>} />
                                            <Route path="/admin/cover-preview" element={<CoverPreview config={safeConfig} />} />

                                            {/* TENANT ROUTES */}
                                            <Route path="/:tenantSlug" element={<Home config={safeConfig} />} />
                                            <Route path="/:tenantSlug/home" element={<Home config={safeConfig} />} />
                                            <Route path="/:tenantSlug/camera" element={<Camera />} />
                                            <Route path="/:tenantSlug/menu" element={<Menu config={safeConfig} />} />
                                            <Route path="/:tenantSlug/envios" element={<Envio config={safeConfig} />} />
                                            <Route path="/:tenantSlug/order" element={<Order config={safeConfig} />} />
                                            <Route path="/:tenantSlug/status" element={<OrderStatus config={safeConfig} featuredItems={safeConfig.featuredPhotos || []} />} />
                                            <Route path="/:tenantSlug/rewards" element={<Rewards />} />
                                            <Route path="/:tenantSlug/share" element={<ShareFood config={safeConfig} />} />
                                            <Route path="/:tenantSlug/game" element={<PerfectPour />} />
                                            <Route path="/:tenantSlug/arcade" element={<Arcade />} />
                                            <Route path="/:tenantSlug/info" element={<Info config={safeConfig} />} />
                                            <Route path="/:tenantSlug/promos" element={<Promos />} />
                                            <Route path="/:tenantSlug/wall" element={<Wall />} />
                                                <Route path="/:tenantSlug/session" element={<Session config={safeConfig} />} />
                                                <Route path="/:tenantSlug/session/:sessionId" element={<Session config={safeConfig} />} />

                                                <Route path="/:tenantSlug/staff" element={<StaffLogin />} />
                                                <Route path="/:tenantSlug/staff/dashboard" element={<StaffDashboard config={safeConfig} orders={orders} updateOrder={updateOrder} setOrders={setOrders} />} />
                                                <Route path="/:tenantSlug/staff/dashboard/:tab" element={<StaffDashboard config={safeConfig} orders={orders} updateOrder={updateOrder} setOrders={setOrders} />} />
                                                <Route path="/:tenantSlug/staff/kds" element={<StaffKDS config={safeConfig} />} />

                                                <Route path="/:tenantSlug/owner" element={<OwnerLogin />} />
                                                <Route path="/:tenantSlug/owner/summary" element={<ProtectedRoute requiredRole="owner"><OwnerSummary config={safeConfig} /></ProtectedRoute>} />
                                                <Route path="/:tenantSlug/owner/menu" element={<ProtectedRoute requiredRole="owner"><MenuManager config={safeConfig} /></ProtectedRoute>} />
                                                <Route path="/:tenantSlug/owner/delivery" element={<ProtectedRoute requiredRole="owner"><DeliveryManager config={safeConfig} /></ProtectedRoute>} />
                                                <Route path="/:tenantSlug/owner/rewards" element={<ProtectedRoute requiredRole="owner"><RewardsManager /></ProtectedRoute>} />
                                                <Route path="/:tenantSlug/owner/settings" element={<ProtectedRoute requiredRole="owner"><Settings config={safeConfig} /></ProtectedRoute>} />
                                                <Route path="/:tenantSlug/owner/analytics" element={<ProtectedRoute requiredRole="owner"><Analytics orders={orders} /></ProtectedRoute>} />
                                                <Route path="/:tenantSlug/owner/ai" element={<ProtectedRoute requiredRole="owner"><FoodSpotAI /></ProtectedRoute>} />
                                                <Route path="/:tenantSlug/owner/branding" element={<ProtectedRoute requiredRole="owner"><Settings config={safeConfig} /></ProtectedRoute>} />

                                                <Route path="*" element={<Navigate to="/" replace />} />
                                            </Routes>
                                        </RouteAreaWrapper>

                                        {pathname.startsWith('/admin') && <BackendNav role="owner" useRoutes={true} />}
                                        {pathname.startsWith('/owner') && <BackendNav role="owner" useRoutes={true} />}
                                        {pathname.startsWith('/staff') && <BackendNav role="staff" useRoutes={true} />}
                                        {!pathname.startsWith('/admin') && !pathname.startsWith('/login') && !pathname.startsWith('/start-trial') && !pathname.startsWith('/owner') && !pathname.startsWith('/staff') && <BottomNav config={safeConfig} />}
                                    </div>
                            </SessionProvider>
                        </CartProvider>
                    </StrategyDraftProvider>
                </LanguageProvider>
            </StaffProvider>
        </AdminIntentProvider>
    );
}

export default App
