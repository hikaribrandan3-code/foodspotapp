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
    // ============================================
    // 1. MANDATORY HOOK CHAIN (ALL HOOKS MUST BE TOP-LEVEL)
    // ============================================
    const location = useLocation();
    const navigate = useNavigate();
    const { tenant: tenantData, tenantId: businessId } = useTenant();

    // 🛡️ ZERO-FLASH CONFIG: Initialize from tenant data if available (from cache)
    // This prevents the "flash of defaults" that causes style degradation
    const [config, setConfig] = useState(() => {
        // If tenant data is already available (from sync cache), use it immediately
        if (tenant?.tenantData?.app_config) {
            console.log('[App] ⚡ INSTANT CONFIG: Using cached app_config')
            return normalizeConfig({
                ...tenant.tenantData,
                ...tenant.tenantData.app_config,
                infoPills: tenant.tenantData.info_pills || tenant.tenantData.app_config.infoPills,
                businessInfo: tenant.tenantData.business_info || tenant.tenantData.app_config.businessInfo,
                featuredPhotos: tenant.tenantData.featuredPhotos || tenant.tenantData.app_config.featuredPhotos,
                businessName: tenant.tenantData.business_name || tenant.tenantData.app_config.businessName,
                headerCover: {
                    ...(tenant.tenantData.app_config.headerCover || {}),
                    image: tenant.tenantData.hero_url || tenant.tenantData.app_config.headerCover?.image
                },
                headerBranding: {
                    ...(tenant.tenantData.app_config.headerBranding || {}),
                    mode: tenant.tenantData.hero_mode || tenant.tenantData.app_config.headerBranding?.mode || 'cover'
                },
                branding: {
                    ...(tenant.tenantData.app_config.branding || {}),
                    primaryColor: tenant.tenantData.primary_color || tenant.tenantData.app_config.branding?.primaryColor,
                    navbar_color: tenant.tenantData.navbar_color || tenant.tenantData.app_config.branding?.navbar_color,
                    nav_icon_mode: tenant.tenantData.nav_icon_mode || tenant.tenantData.app_config.branding?.nav_icon_mode
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
        if (tenant?.tenantData) {
            // 📦 MASTER MERGE: app_config is the source of truth for ALL branding
            const cloudAppConfig = tenant.tenantData.app_config || {};

            const merged = normalizeConfig({
                ...config,
                ...tenant.tenantData,
                // 🌟 FULL CONFIG INJECTION: Merge everything from app_config
                ...cloudAppConfig,
                // Ensure deep objects are preserved
                infoPills: tenant.tenantData.info_pills || cloudAppConfig.infoPills || config.infoPills,
                businessInfo: tenant.tenantData.business_info || cloudAppConfig.businessInfo || config.businessInfo,
                // 📸 HIGHLIGHT RECOVERY: ROOT > app_config > defaults
                featuredPhotos: tenant.tenantData.featuredPhotos || cloudAppConfig.featuredPhotos || config.featuredPhotos,
                // 🎨 DB FIELD MAPPINGS (flat fields from DB)
                businessName: tenant.tenantData.business_name || cloudAppConfig.businessName || config.businessName,
                headerCover: {
                    ...config.headerCover,
                    ...(cloudAppConfig.headerCover || {}),
                    image: tenant.tenantData.hero_url || cloudAppConfig.headerCover?.image || config.headerCover?.image
                },
                headerBranding: {
                    ...config.headerBranding,
                    ...(cloudAppConfig.headerBranding || {}),
                    mode: tenant.tenantData.hero_mode || cloudAppConfig.headerBranding?.mode || 'cover'
                },
                // 🎨 COLORS: ROOT > app_config > flat fields > defaults
                colors: {
                    ...config.colors,
                    ...(cloudAppConfig.colors || {}),
                    primary: tenant.tenantData.colors?.primary || cloudAppConfig.colors?.primary || tenant.tenantData.primary_color || config.colors?.primary,
                    secondary: tenant.tenantData.colors?.secondary || cloudAppConfig.colors?.secondary || tenant.tenantData.secondary_color || config.colors?.secondary,
                    confirmation: tenant.tenantData.colors?.confirmation || cloudAppConfig.colors?.confirmation || tenant.tenantData.confirmation_color || config.colors?.confirmation,
                    powered: tenant.tenantData.colors?.powered || cloudAppConfig.colors?.powered || tenant.tenantData.powered_by_color || config.colors?.powered
                },
                branding: {
                    ...config.branding,
                    ...(cloudAppConfig.branding || {}),
                    fontFamily: cloudAppConfig.branding?.fontFamily || tenant.tenantData.font_family || config.branding?.fontFamily,
                    fontWeight: cloudAppConfig.branding?.fontWeight || tenant.tenantData.font_weight || config.branding?.fontWeight,
                    primaryColor: cloudAppConfig.branding?.primaryColor || tenant.tenantData.navbar_color || config.branding?.primaryColor,
                    iconColorMode: cloudAppConfig.branding?.iconColorMode || tenant.tenantData.nav_icon_mode || config.branding?.iconColorMode
                },
                // 🏠 HOME CONFIG: Restore from app_config
                homeConfig: cloudAppConfig.homeConfig || config.homeConfig,
                // 🎮 HERO ICONS: ROOT > app_config > defaults
                heroIcons: tenant.tenantData.hero_icons || cloudAppConfig.heroIcons || config.heroIcons
            });
            setConfig(merged);
            console.log('☁️ [App.jsx] HYDRATION V6 PRIORITY FIX:', {
                primaryColor: merged.colors?.primary,
                fontFamily: merged.branding?.fontFamily
            });
        }
    }, [tenant?.tenantData]);

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
    const [adminReady, setAdminReady] = useState(!location.pathname.startsWith('/admin'));
    useEffect(() => {
        if (location.pathname.startsWith('/admin')) {
            setAdminReady(false);
            sanitizeForAdmin();
            // Allow browser to completely flush tenant memory
            const timer = setTimeout(() => setAdminReady(true), 100);
            return () => clearTimeout(timer);
        } else {
            setAdminReady(true);
        }
    }, [location.pathname]);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
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
            if (tenant?.tenantData) {
                // Cloud-First: Merge tenantData into existing config
                setConfig(prev => normalizeConfig({ ...prev, ...tenant.tenantData }));
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
    if (path === '/login/owner' || path === '/login') {
        const session = getSession(); // Synchronous check if available, or rely on effect
        // NOTE: getSession is async in utils/auth.js, so we might need a more robust check here.
        // For now, we'll let the onAuthStateChange listener handle the redirect if they ARE logged in.
        // But we should at least log that we are hitting this interceptor.
        console.log("🛑 [App.jsx] Intercepting Login Route. Auth State:", tenant?.session?.user ? "Logged In" : "Logged Out");

        // If we have a tenant session active, FORCE redirect
        if (tenant?.session?.user?.user_metadata?.slug) {
            const slug = tenant.session.user.user_metadata.slug;
            console.log("🚀 [App.jsx] User already logged in. Redirecting to:", `/${slug}/owner/summary`);
            return <Navigate to={`/${slug}/owner/summary`} replace />;
        }

        return <Routes><Route path="*" element={<OwnerLogin />} /></Routes>;
    }

    if (trialExpired) {
        return (
            // 🛡️ VISUAL DEBUG: White background to verify Hero renders behind
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#ffffff', color: '#000', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '24px' }}>⏰</div>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px', color: '#ef4444' }}>Tu período de prueba terminó</h1>
                <p style={{ opacity: 0.8, maxWidth: '400px', marginBottom: '32px', lineHeight: 1.6 }}>El trial de <strong>{tenantData?.business_name || 'tu negocio'}</strong> ha expirado. Actualizá tu plan para seguir recibiendo pedidos.</p>
                <a href="https://wa.me/5491123456789?text=Quiero%20activar%20mi%20cuenta%20FoodSpot" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '16px 32px', background: 'linear-gradient(90deg, #25D366, #128C7E)', color: '#fff', fontWeight: 600, fontSize: '16px', borderRadius: '12px', textDecoration: 'none', boxShadow: '0 4px 20px rgba(37, 211, 102, 0.4)' }}>💬 Contactar Soporte</a>
            </div>
        );
    }

    if (config.maintenanceMode) {
        return (<div className="app-container"><div className="maintenance-overlay"><div className="maintenance-icon">🔧</div><h1 className="maintenance-title">En mantenimiento</h1><p className="maintenance-message">{config.maintenanceMessage}</p></div></div>);
    }

    // ============================================
    // 5. FINAL RENDER - PARTITIONED BY CONTEXT
    // ============================================

    // 🛑 HARD STOP GATE: Don't render admin until memory is flushed
    if (location.pathname.startsWith('/admin') && !adminReady) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#1a1a2e',
                color: '#7C3AED'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🧹</div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>Cleaning memory...</div>
                </div>
            </div>
        );
    }

    // 🌐 GLOBAL ROUTES: Minimal tree, no tenant providers
    if (isGlobalPath) {
        return (
            <AdminIntentProvider>
                <div className="app-container">
                    <Routes>
                        <Route path="/" element={<TrialSignup />} />
                        <Route path="/start-trial" element={<TrialSignup />} />
                        <Route path="/login" element={<OwnerLogin />} />
                        <Route path="/login/owner" element={<OwnerLogin />} />
                        <Route path="/login/staff" element={<StaffLogin />} />
                        <Route path="/admin" element={<AdminErrorBoundary><Suspense fallback={<LazyFallback />}><SuperAdmin config={safeConfig} /></Suspense></AdminErrorBoundary>} />
                        <Route path="/admin/cover-preview" element={<CoverPreview config={safeConfig} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    {location.pathname.startsWith('/admin') && <BackendNav role="owner" useRoutes={true} />}
                </div>
            </AdminIntentProvider>
        );
    }

    // 🏢 TENANT ROUTES: Full provider tree with all context
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

                            {(() => {
                                const p = location.pathname;
                                const pathParts = p.split('/').filter(Boolean);

                                const isOwner = p.includes('/owner');
                                const isStaff = p.includes('/staff');

                                // Detect login routes (e.g. /:tenantSlug/owner or /:tenantSlug/staff)
                                const isOwnerLogin = pathParts.length === 2 && pathParts[1] === 'owner';
                                const isStaffLogin = pathParts.length === 2 && pathParts[1] === 'staff';

                                if (isOwnerLogin || isStaffLogin) {
                                    return null; // Hide all navigation on login screens
                                }

                                if (isOwner || isStaff) {
                                    return (
                                        <BackendNav
                                            role={isOwner ? "owner" : "staff"}
                                            useRoutes={true}
                                        />
                                    );
                                }

                                return <BottomNav config={safeConfig} />;
                            })()}
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
