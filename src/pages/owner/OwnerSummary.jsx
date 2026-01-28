import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAuth, clearAuth, getOrders } from '../../utils/storage.js'
import { updateConfig } from '../../config/appConfig.v2.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import { getSession } from '../../utils/auth.js'
import { useTenant } from '../../contexts/TenantContext.jsx'

/**
 * OwnerSummary - Summary dashboard for Owner (matches SuperAdmin Summary layout)
 * 
 * ARCHITECTURAL INVARIANT: Config MUST come from props, NOT getConfig().
 * This ensures Single Source of Truth from App.jsx.
 */
function OwnerSummary({ config: configProp }) {
    const config = configProp || {};
    const navigate = useNavigate()
    const { tenantSlug } = useParams() // 🏢 Get tenant from URL for logout redirect
    const [orders, setOrders] = useState(() => getOrders())
    const { tenantData } = useTenant() // 🛡️ Cloud Data Auditor
    const [showAuditor, setShowAuditor] = useState(false)

    // 🔓 GHOST WALL FIX: Manage body scroll when modal is open
    useEffect(() => {
        if (showAuditor) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showAuditor]);

    // NOTE: Auth check removed - ProtectedRoute handles authentication

    // Poll for order updates
    useEffect(() => {
        const interval = setInterval(() => {
            setOrders(getOrders())
        }, 5000)
        return () => clearInterval(interval)
    }, [])

    // 🔐 GHOST ADMIN: Fetch session to detect superadmin role
    const [session, setSession] = useState(null)
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

    // 🚀 SILO-AWARE LOGOUT: Redirect to customer-facing view of THIS tenant
    const handleLogout = async () => {
        await supabase.auth.signOut()
        clearAuth()
        // Redirect to customer home of this business, not landing page
        window.location.href = `/${tenantSlug}`
    }

    // Stats calculations
    const today = new Date().toDateString()
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today)
    const mpOrders = todayOrders.filter(o => o.paymentMethod === 'mercadopago')
    const cashOrders = todayOrders.filter(o => o.paymentMethod === 'efectivo' || !o.paymentMethod)
    const mpTotal = mpOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const cashTotal = cashOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const totalToday = mpTotal + cashTotal

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1)
    const weekOrders = orders.filter(o => new Date(o.createdAt) >= weekAgo)
    const monthOrders = orders.filter(o => new Date(o.createdAt) >= monthAgo)

    // Update business info
    const updateBusinessInfo = (field, value) => {
        const newInfo = { ...config?.businessInfo, [field]: value }
        updateConfig({ businessInfo: newInfo })
        window.dispatchEvent(new CustomEvent('frontendSync'))
    }

    // Card style helper
    const cardStyle = { background: 'white', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
    const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }
    const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F5F2EE', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <BackendHeader
                title="Summary"
                onLogout={handleLogout}
                showDateSelector={false}
                showNotifications={false}
                showAvatar={false}
            />

            {/* Sync Button */}
            <div style={{ padding: '12px 16px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: 8 }}>
                <button
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('frontendSync'))
                        setOrders(getOrders())
                        alert('✅ Frontend synced!')
                    }}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: '#3B82F6',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                    }}
                >
                    🔄 Actualizar
                </button>
                <button
                    onClick={() => setShowAuditor(true)}
                    style={{
                        padding: '10px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        border: '2px solid #1F2937',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: '#1F2937',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                    }}
                >
                    📊 Backend Auditor
                </button>
            </div>

            {/* Content - with bottom padding for BackendNav */}
            <div style={{ padding: 16, paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>

                {/* ==================== PAGOS DEL DÍA ==================== */}
                <h3 style={labelStyle}>💳 PAGOS DEL DÍA</h3>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#E0F2F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💳</div>
                            <div><p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>Mercado Pago</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{mpOrders.length} sesiones</p></div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>${mpTotal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💵</div>
                            <div><p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>Efectivo</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{cashOrders.length} sesiones</p></div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>${cashTotal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
                        <div><p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: 0 }}>Total del día</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{todayOrders.length} sesiones</p></div>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>${totalToday.toLocaleString()}</span>
                    </div>
                </div>

                {/* ==================== SESIONES ==================== */}
                <h3 style={labelStyle}>SESIONES</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{weekOrders.length}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Esta semana</p></div>
                    <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{monthOrders.length}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Este mes</p></div>
                </div>

                {/* ==================== INFORMACIÓN DEL LOCAL ==================== */}
                <h3 style={labelStyle}>📍 INFORMACIÓN DEL LOCAL</h3>
                <div style={cardStyle}>
                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>WhatsApp (contacto principal)</label>
                    <input type="text" placeholder="+54 11 1234-5678" value={config?.businessInfo?.whatsapp || ''} onChange={(e) => updateBusinessInfo('whatsapp', e.target.value)} style={inputStyle} />

                    {/* 📍 HYBRID LOCATION GROUP (Polished with 12px Visual Rhyme) */}
                    <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 12 }}>📍 Localización (Unificada)</label>

                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Dirección (Etiqueta)</label>
                        <input type="text" placeholder="Av. Corrientes 1234" value={config?.businessInfo?.address || ''} onChange={(e) => updateBusinessInfo('address', e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />

                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Google Maps Link (Acción)</label>
                        <input type="text" placeholder="https://maps.google.com/..." value={config?.businessInfo?.googleMapsLink || ''} onChange={(e) => updateBusinessInfo('googleMapsLink', e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                            ℹ️ Si ambos están presentes, se mostrará un botón con la dirección que abre el mapa.
                        </p>
                    </div>

                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Indicaciones / Notas</label>
                    <input type="text" placeholder="Timbre 2A, subir escaleras" value={config?.businessInfo?.directions || ''} onChange={(e) => updateBusinessInfo('directions', e.target.value)} style={inputStyle} />
                </div>

                {/* ==================== LINKS EXTERNOS ==================== */}
                <h3 style={labelStyle}>🔗 LINKS EXTERNOS</h3>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#374151' }}>🧡 Rappi</span>
                        <label className="toggle"><input type="checkbox" checked={config?.externalOrdering?.rappiEnabled ?? false} onChange={() => { const c = config?.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, rappiEnabled: !c.rappiEnabled } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} /><span className="toggle-slider"></span></label>
                    </div>
                    <input type="text" placeholder="Link de Rappi" value={config?.externalOrdering?.rappiUrl || ''} onChange={(e) => { const c = config?.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, rappiUrl: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={{ ...inputStyle, marginBottom: 14 }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#374151' }}>❤️ PedidosYa</span>
                        <label className="toggle"><input type="checkbox" checked={config?.externalOrdering?.pedidosYaEnabled ?? false} onChange={() => { const c = config?.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, pedidosYaEnabled: !c.pedidosYaEnabled } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} /><span className="toggle-slider"></span></label>
                    </div>
                    <input type="text" placeholder="Link de PedidosYa" value={config?.externalOrdering?.pedidosYaUrl || ''} onChange={(e) => { const c = config?.externalOrdering || {}; updateConfig({ externalOrdering: { ...c, pedidosYaUrl: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')) }} style={{ ...inputStyle, marginBottom: 14 }} />

                    {/* Mercado Pago Alias */}
                    <div style={{ paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                        <span style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>💳 Mercado Pago (Alias)</span>
                        <input
                            type="text"
                            placeholder="ej: grubclub.mp"
                            value={config?.payments?.mercadoPagoAlias || ''}
                            onChange={(e) => {
                                const c = config?.payments || {};
                                updateConfig({ payments: { ...c, mercadoPagoAlias: e.target.value } });
                                window.dispatchEvent(new CustomEvent('frontendSync'))
                            }}
                            style={inputStyle}
                        />
                        <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>Si está vacío, no aparece en Info</p>
                    </div>
                </div>

            </div>

            {/* 🔐 GHOST ADMIN: Hidden Super Admin Portal (superadmin only) */}
            {session?.role === 'superadmin' && (
                <div style={{ marginTop: 24 }}>
                    <button
                        onClick={() => navigate('/admin')}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            fontSize: 13,
                            fontWeight: 600,
                            border: '1px solid rgba(124, 58, 237, 0.3)',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: 'rgba(124, 58, 237, 0.1)',
                            color: '#7C3AED',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8
                        }}
                    >
                        🔧 System Admin
                    </button>
                </div>
            )}

            {/* Backend Navigation */}
            <BackendNav
                role="owner"
                useRoutes={true}
            />

            {/* 📊 Backend Auditor - Side Drawer */}
            {showAuditor && (
                <div
                    onClick={() => setShowAuditor(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'stretch',
                        justifyContent: 'flex-end',
                        pointerEvents: 'auto'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#1F2937',
                            width: '85%',
                            maxWidth: 400,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: '-4px 0 24px rgba(0,0,0,0.3)'
                        }}
                    >
                        <div style={{
                            padding: 16,
                            borderBottom: '1px solid #374151',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'relative',
                            zIndex: 10001
                        }}>
                            <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>📊 Cloud Vault</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAuditor(false);
                                }}
                                style={{
                                    background: '#EF4444',
                                    border: 'none',
                                    borderRadius: 8,
                                    padding: '8px 16px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    zIndex: 999999,
                                    position: 'absolute',
                                    top: 12,
                                    right: 12
                                }}
                            >
                                ✕ Close
                            </button>
                        </div>
                        <div style={{
                            flex: 1,
                            overflow: 'auto',
                            padding: 16,
                            WebkitOverflowScrolling: 'touch'
                        }}>
                            <pre style={{
                                color: '#10B981',
                                fontSize: 11,
                                fontFamily: 'monospace',
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}>
                                {JSON.stringify(tenantData, (key, value) => {
                                    // 🔒 TRUNCATE BASE64: Make Auditor usable
                                    if (typeof value === 'string' && value.length > 100) {
                                        if (value.startsWith('data:image')) {
                                            return `[BASE64 IMAGE - ${value.length} chars]`;
                                        }
                                        if (value.startsWith('http')) {
                                            return value.substring(0, 80) + '...';
                                        }
                                        return value.substring(0, 100) + '...';
                                    }
                                    return value;
                                }, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default OwnerSummary
