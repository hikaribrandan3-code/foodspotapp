import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getOrders } from '../../utils/storage.js';
import { getSession } from '../../utils/auth.js';
import { supabase, signOut, getCurrentUser, updateBranding, subscribeToOrders } from '../../lib/supabaseClient.js';
import { updateConfig } from '../../config/appConfig.v2.js';
import BackendHeader from '../../components/BackendHeader.jsx';
import BackendNav from '../../components/BackendNav.jsx';
import { useAdminIntent } from '../../contexts/AdminIntentContext.jsx';
import { useBusinessId } from '../../contexts/TenantContext.jsx';

// Tab Components
import SummaryTab from '../../components/admin/tabs/SummaryTab.jsx';
import MenuTab from '../../components/admin/tabs/MenuTab.jsx';
import BrandingTab from '../../components/admin/tabs/BrandingTab.jsx';
import OrdersTab from '../../components/admin/tabs/OrdersTab.jsx';
import AnalyticsTab from '../../components/admin/tabs/AnalyticsTab.jsx';
import AiManagementTab from '../../components/admin/tabs/AiManagementTab.jsx';
import CoverImageEditor from '../../components/CoverImageEditor.jsx';

const cardStyle = { background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14 };

function SuperAdmin({ config: configProp }) {
    const config = configProp || {};
    const navigate = useNavigate();
    const location = useLocation();
    const businessId = useBusinessId();

    const [menu, setMenu] = useState({ categories: [] });
    const [categories, setCategories] = useState([]);
    const [orders, setOrders] = useState(() => getOrders());
    const [activeTab, setActiveTab] = useState(() => location.state?.activeTab || 'summary');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [userRole, setUserRole] = useState('superadmin');
    const [error, setError] = useState('');
    const [showCoverEditor, setShowCoverEditor] = useState(() => location.state?.returnToEditor || false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [demoAnalytics, setDemoAnalytics] = useState(true);
    const [deliveryConfirmCode, setDeliveryConfirmCode] = useState({});
    const [paymentMethodSelect, setPaymentMethodSelect] = useState({});
    const menuImageInputRef = useRef(null);

    const { activeRoleView } = useAdminIntent();
    const currentMode = activeRoleView || 'superadmin';
    const canEdit = currentMode === 'owner' || currentMode === 'superadmin';

    // Demo data for analytics
    const demoData = Array.from({ length: 15 }, (_, i) => ({
        value: 1500 + Math.sin(i * 0.5) * 400 + Math.random() * 300
    }));
    const demoTotalSales = demoData.reduce((a, b) => a + b.value, 0);

    // Auth check
    useEffect(() => {
        const checkAuth = async () => {
            setAuthLoading(true);
            const { user } = await getCurrentUser();
            if (user) {
                setIsAuthenticated(true);
                setUserRole('superadmin');
            }
            setAuthLoading(false);
        };
        checkAuth();
    }, []);

    // Cloud orders sync
    useEffect(() => {
        if (!businessId) return;
        const loadCloudOrders = async () => {
            try {
                const { data: cloudOrders } = await supabase.from('orders').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
                if (cloudOrders?.length > 0) setOrders(cloudOrders);
            } catch { /* Silent fallback */ }
        };
        loadCloudOrders();
        const subscription = subscribeToOrders(businessId, (newOrder) => setOrders(prev => [newOrder, ...prev]), (orderId, updated) => setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o)));
        return () => subscription.unsubscribe();
    }, [businessId]);

    // Cloud write helpers
    const updateBusinessInfoCloud = async (field, value) => {
        const columnMap = { whatsapp: 'whatsapp', address: 'address', hours: 'hours', googleMapsLink: 'google_maps_link', directions: 'directions' };
        const column = columnMap[field];
        if (!column) return;
        if (!businessId) { updateConfig({ businessInfo: { ...config.businessInfo, [field]: value } }); window.dispatchEvent(new CustomEvent('frontendSync')); return; }
        setSaveStatus('saving');
        const { error } = await updateBranding({ [column]: value }, businessId);
        if (!error) { updateConfig({ businessInfo: { ...config.businessInfo, [field]: value } }); window.dispatchEvent(new CustomEvent('frontendSync')); setSaveStatus('saved'); setTimeout(() => setSaveStatus(null), 1500); }
        else { setSaveStatus('error'); setTimeout(() => setSaveStatus(null), 2000); }
    };

    const updateBrandingCloud = async (field, value) => {
        const columnMap = { businessName: 'business_name', primaryColor: 'primary_color', fontFamily: 'font_family', fontWeight: 'font_weight' };
        const column = columnMap[field];
        if (!column) return;
        if (!businessId) { updateConfig(field === 'businessName' ? { businessName: value } : { branding: { ...config.branding, [field]: value } }); window.dispatchEvent(new CustomEvent('frontendSync')); return; }
        setSaveStatus('saving');
        const { error } = await updateBranding({ [column]: value }, businessId);
        if (!error) { updateConfig(field === 'businessName' ? { businessName: value } : { branding: { ...config.branding, [field]: value } }); window.dispatchEvent(new CustomEvent('frontendSync')); setSaveStatus('saved'); setTimeout(() => setSaveStatus(null), 1500); }
        else { setSaveStatus('error'); setTimeout(() => setSaveStatus(null), 2000); }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    if (authLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando...</div>;
    if (!isAuthenticated) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8' }}>
            <div style={{ background: 'white', padding: 32, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '90%', maxWidth: 400 }}>
                <h2 style={{ textAlign: 'center', marginBottom: 24 }}>🔐 Super Admin</h2>
                {error && <p style={{ color: '#DC2626', fontSize: 14, marginBottom: 16 }}>{error}</p>}
                <button onClick={handleSignOut} style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: '#7C3AED', color: 'white', fontWeight: 600 }}>Volver al Login</button>
            </div>
        </div>
    );

    const tabButtons = [
        { id: 'summary', label: 'Resumen', icon: '📊' },
        { id: 'menu', label: 'Menú', icon: '🍽️', hidden: !canEdit },
        { id: 'branding', label: 'Branding', icon: '🎨', hidden: !canEdit },
        { id: 'orders', label: 'Pedidos', icon: '📋' },
        { id: 'analytics', label: 'Analytics', icon: '📈' },
        { id: 'ai', label: 'AI Swarm', icon: '🤖' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
            <BackendHeader title={currentMode === 'owner' ? 'Owner Dashboard' : 'Super Admin'} saveStatus={saveStatus} />

            <div style={{ padding: 16, paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>
                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 8 }}>
                    {tabButtons.filter(t => !t.hidden).map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: activeTab === tab.id ? '#7C3AED' : 'white', color: activeTab === tab.id ? 'white' : '#374151', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'summary' && <SummaryTab config={config} updateBusinessInfoCloud={updateBusinessInfoCloud} updateConfig={updateConfig} />}
                {activeTab === 'menu' && canEdit && <MenuTab menu={menu} setMenu={setMenu} categories={categories} setCategories={setCategories} businessId={businessId} />}
                {activeTab === 'branding' && canEdit && <BrandingTab config={config} updateBrandingCloud={updateBrandingCloud} updateConfig={updateConfig} setShowCoverEditor={setShowCoverEditor} />}
                {activeTab === 'orders' && <OrdersTab orders={orders} config={config} updateOrder={() => {}} setOrders={setOrders} deliveryConfirmCode={deliveryConfirmCode} setDeliveryConfirmCode={setDeliveryConfirmCode} paymentMethodSelect={paymentMethodSelect} setPaymentMethodSelect={setPaymentMethodSelect} />}
                {activeTab === 'analytics' && <AnalyticsTab orders={orders} userRole={userRole} demoAnalytics={demoAnalytics} setDemoAnalytics={setDemoAnalytics} demoData={demoData} demoTotalSales={demoTotalSales} />}
                {activeTab === 'ai' && <AiManagementTab businessId={businessId} />}
            </div>

            <BackendNav role={currentMode} />
            {showCoverEditor && <CoverImageEditor config={config} onClose={() => setShowCoverEditor(false)} onSave={() => setShowCoverEditor(false)} />}
        </div>
    );
}

export default SuperAdmin;
