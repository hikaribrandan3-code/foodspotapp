/**
 * 🛡️ OPERATION VAULT-SEAL: STRIKE 3
 * App.jsx — The Global Handshake (CORRECTED WRAPPER)
 * 
 * ARCHITECTURE:
 * - AppWrapper: Provides Router & TenantContext
 * - AppContent: Consumes Context & Defines Routes
 * - TenantProvider is the SINGLE SOURCE OF TRUTH for branding
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { getOrders, updateOrder } from './utils/storage.js';
import { sanitizeForAdmin } from './utils/adminSanitize.js';
import { AdminIntentProvider } from './contexts/AdminIntentContext.jsx';
import { TenantProvider, useTenant } from './contexts/TenantContext.jsx';
import { supabase, subscribeToOrders, getOrdersByGuestToken, getOrdersByPhone } from './lib/supabaseClient.js';

// Components
import BottomNav from './components/BottomNav.jsx';
import BackendNav from './components/BackendNav.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Customer Pages
import Home from './pages/customer/Home.jsx';
import Menu from './pages/customer/Menu.jsx';
import Order from './pages/customer/Order.jsx';
import OrderStatus from './pages/customer/OrderStatus.jsx';
import Rewards from './pages/customer/Rewards.jsx';
import ShareFood from './pages/customer/ShareFood.jsx';
import PerfectPour from './pages/customer/PerfectPour.jsx';
import Info from './pages/customer/Info.jsx';
import Promos from './pages/customer/Promos.jsx';

// Staff Pages
import StaffLogin from './pages/staff/StaffLogin.jsx';
import StaffDashboard from './pages/staff/StaffDashboard.jsx';

// Owner Pages
import OwnerLogin from './pages/owner/OwnerLogin.jsx';
import OwnerSummary from './pages/owner/OwnerSummary.jsx';
import MenuManager from './pages/owner/MenuManager.jsx';
import RewardsManager from './pages/owner/RewardsManager.jsx';
import Settings from './pages/owner/Settings.jsx';
import Analytics from './pages/owner/Analytics.jsx';
import DeliveryManager from './pages/owner/DeliveryManager.jsx';

// Admin Pages (Lazy-loaded)
const SuperAdmin = lazy(() => import('./pages/admin/SuperAdmin.jsx'));
import CoverPreview from './components/CoverPreview.jsx';
import AdminErrorBoundary from './components/Error/AdminErrorBoundary.jsx';

// Auth Pages
import TrialSignup from './pages/auth/TrialSignup.jsx';

// Camera Suite
import Camera from './components/Camera/index.jsx';

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
);

function RouteAreaWrapper({ children }) {
    const location = useLocation();
    const getRouteArea = () => {
        const path = location.pathname;
        if (path.includes('/admin')) return 'admin';
        if (path.includes('/owner')) return 'owner';
        if (path.includes('/staff')) return 'staff';
        return 'customer';
    };
    const routeArea = getRouteArea();
    return <div key={routeArea}>{children}</div>;
}

// =========================================================
// 🧠 INTERNAL APP LOGIC (Consumes Context)
// =========================================================
function AppContent() {
    const location = useLocation();
    const tenant = useTenant(); // ✅ Safe to use here

    // Local State for Orders (Realtime)
    const [orders, setOrders] = useState(() => getOrders());

    const businessId = tenant?.businessId;
    const tenantData = tenant?.tenantData;
    const branding = tenant?.branding || {};
    const trialExpired = tenant?.trialExpired;

    // 🛑 ADMIN MEMORY FLUSH: 100ms delay when entering Admin
    const [adminReady, setAdminReady] = useState(!location.pathname.startsWith('/admin'));
    useEffect(() => {
        if (location.pathname.startsWith('/admin')) {
            setAdminReady(false);
            sanitizeForAdmin();
            const timer = setTimeout(() => setAdminReady(true), 100);
            return () => clearTimeout(timer);
        } else {
            setAdminReady(true);
        }
    }, [location.pathname]);

    // Auth state change cleanup
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

    // Metadata Injection
    useEffect(() => {
        const title = branding.businessName || tenantData?.business_name || 'FoodSpot';
        const icon = branding.logoUrl || tenantData?.logo_url || '/favicon.ico';

        document.title = title;

        let favicon = document.querySelector("link[rel~='icon']");
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        favicon.href = icon;
    }, [branding.businessName, branding.logoUrl, tenantData?.business_name, tenantData?.logo_url]);

    // PWA cleanup
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
        }
        if ('caches' in window) {
            caches.keys().then(names => names.forEach(n => caches.delete(n)));
        }
    }, []);

    // Realtime orders subscription
    useEffect(() => {
        if (window.location.pathname === '/' || window.location.pathname === '/start-trial') return;
        if (!businessId) return;

        let realtimeChannel = null;

        const initCloudSync = async () => {
            const guestToken = localStorage.getItem('fs_guest_token');
            const customerPhone = localStorage.getItem('fs_customer_phone');

            if (guestToken) {
                try {
                    const { data } = await getOrdersByGuestToken(guestToken, businessId);
                    if (data?.length > 0) setOrders(data);
                } catch { }
            } else if (customerPhone) {
                try {
                    const { data } = await getOrdersByPhone(customerPhone, businessId);
                    if (data?.length > 0) setOrders(data);
                } catch { }
            }

            realtimeChannel = subscribeToOrders(
                businessId,
                (newOrder) => {
                    setOrders(prev => {
                        const updated = prev.some(o => o.id === newOrder.id) ? prev : [newOrder, ...prev];
                        try { localStorage.setItem('foodspot_orders', JSON.stringify(updated.slice(0, 50))); } catch { }
                        return updated;
                    });
                },
                (orderId, updatedData) => {
                    setOrders(prev => {
                        const updated = prev.map(o => o.id === orderId ? { ...o, ...updatedData } : o);
                        try { localStorage.setItem('foodspot_orders', JSON.stringify(updated.slice(0, 50))); } catch { }
                        return updated;
                    });
                }
            );
        };

        initCloudSync();

        return () => {
            if (realtimeChannel) realtimeChannel.unsubscribe();
        };
    }, [businessId]);

    // ============================================
    // ROUTE GUARDS
    // ============================================
    const GLOBAL_PATHS = ['/', '/login', '/login/owner', '/admin', '/start-trial'];
    const path = location.pathname;
    const isGlobalPath = GLOBAL_PATHS.includes(path) || path.startsWith('/admin');

    // Login routes
    if (path === '/login/owner' || path === '/login') {
        return <Routes><Route path="*" element={<OwnerLogin />} /></Routes>;
    }

    // Trial expired
    if (trialExpired) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: '#fff',
                fontFamily: 'Inter, system-ui, sans-serif',
                padding: '24px',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '64px', marginBottom: '24px' }}>⏰</div>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
                    Tu período de prueba terminó
                </h1>
                <p style={{ opacity: 0.8, maxWidth: '400px', marginBottom: '32px', lineHeight: 1.6 }}>
                    El trial de <strong>{branding.businessName || 'tu negocio'}</strong> ha expirado.
                    Actualizá tu plan para seguir recibiendo pedidos.
                </p>
                <a
                    href="https://wa.me/5491123456789?text=Quiero%20activar%20mi%20cuenta%20FoodSpot"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '16px 32px',
                        background: 'linear-gradient(90deg, #25D366, #128C7E)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '16px',
                        borderRadius: '12px',
                        textDecoration: 'none'
                    }}
                >
                    💬 Contactar Soporte
                </a>
            </div>
        );
    }

    // Admin memory flush gate
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

    // ============================================
    // RENDER
    // ============================================

    // 🌐 GLOBAL ROUTES
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
                        <Route path="/admin" element={
                            <AdminErrorBoundary>
                                <Suspense fallback={<LazyFallback />}>
                                    <SuperAdmin />
                                </Suspense>
                            </AdminErrorBoundary>
                        } />
                        <Route path="/admin/cover-preview" element={<CoverPreview />} />
                        <Route path="/camera" element={<Camera />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    {location.pathname.startsWith('/admin') && <BackendNav role="owner" useRoutes={true} />}
                </div>
            </AdminIntentProvider>
        );
    }

    // 🏢 TENANT ROUTES
    return (
        <AdminIntentProvider>
            <div className="app-container">
                <RouteAreaWrapper>
                    <Routes>
                        {/* Customer Routes */}
                        <Route path="/:tenantSlug" element={<Home />} />
                        <Route path="/:tenantSlug/menu" element={<Menu />} />
                        <Route path="/:tenantSlug/envios" element={<Menu deliveryMode={true} />} />
                        <Route path="/:tenantSlug/order" element={<Order />} />
                        <Route path="/:tenantSlug/status" element={<OrderStatus />} />
                        <Route path="/:tenantSlug/rewards" element={<Rewards />} />
                        <Route path="/:tenantSlug/share" element={<ShareFood />} />
                        <Route path="/:tenantSlug/game" element={<PerfectPour />} />
                        <Route path="/:tenantSlug/info" element={<Info />} />
                        <Route path="/:tenantSlug/promos" element={<Promos />} />

                        {/* Staff Routes */}
                        <Route path="/:tenantSlug/staff" element={<StaffLogin />} />
                        <Route path="/:tenantSlug/staff/dashboard" element={
                            <StaffDashboard orders={orders} updateOrder={updateOrder} setOrders={setOrders} />
                        } />
                        <Route path="/:tenantSlug/staff/dashboard/:tab" element={
                            <StaffDashboard orders={orders} updateOrder={updateOrder} setOrders={setOrders} />
                        } />

                        {/* Owner Routes */}
                        <Route path="/:tenantSlug/owner" element={<OwnerLogin />} />
                        <Route path="/:tenantSlug/owner/summary" element={
                            <ProtectedRoute requiredRole="owner"><OwnerSummary /></ProtectedRoute>
                        } />
                        <Route path="/:tenantSlug/owner/menu" element={
                            <ProtectedRoute requiredRole="owner"><MenuManager /></ProtectedRoute>
                        } />
                        <Route path="/:tenantSlug/owner/delivery" element={
                            <ProtectedRoute requiredRole="owner"><DeliveryManager /></ProtectedRoute>
                        } />
                        <Route path="/:tenantSlug/owner/rewards" element={
                            <ProtectedRoute requiredRole="owner"><RewardsManager /></ProtectedRoute>
                        } />
                        <Route path="/:tenantSlug/owner/settings" element={
                            <ProtectedRoute requiredRole="owner"><Settings /></ProtectedRoute>
                        } />
                        <Route path="/:tenantSlug/owner/analytics" element={
                            <ProtectedRoute requiredRole="owner"><Analytics orders={orders} /></ProtectedRoute>
                        } />
                        <Route path="/:tenantSlug/owner/branding" element={
                            <ProtectedRoute requiredRole="owner"><Settings /></ProtectedRoute>
                        } />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </RouteAreaWrapper>

                {/* Navigation */}
                {(() => {
                    const p = location.pathname;
                    const isOwner = p.includes('/owner');
                    const isStaff = p.includes('/staff');

                    if (isOwner || isStaff) {
                        return <BackendNav role={isOwner ? "owner" : "staff"} useRoutes={true} />;
                    }

                    return <BottomNav />;
                })()}
            </div>
        </AdminIntentProvider>
    );
}

// ============================================
// 🧱 APP WRAPPER (The Fix)
// ============================================
function App() {
    return (
        <Router>
            <TenantProvider>
                <AppContent />
            </TenantProvider>
        </Router>
    );
}

export default App;
