import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { clearAuth } from '../../utils/storage.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../config/menuData.js'
import { getSession } from '../../utils/auth.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'

/**
 * OwnerSummary - Summary dashboard for Owner
 * P0 #11: Cloud-first — All stats from Supabase, no localStorage.
 */
function OwnerSummary() {
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const { businessId, tenantData, refreshTenantData } = useTenant()
    const { lang, t, changeLanguage } = useLanguage()
    const appConfig = tenantData?.app_config || {}
    const [showAuditor, setShowAuditor] = useState(false)

    // ☁️ CLOUD ORDERS STATE (replaces getOrders() localStorage)
    const [orders, setOrders] = useState([])
    const [ordersLoading, setOrdersLoading] = useState(true)

    // Fetch today's + recent orders from Supabase
    useEffect(() => {
        if (!businessId) return
        let cancelled = false

        const fetchOrders = async () => {
            setOrdersLoading(true)
            const monthAgo = new Date()
            monthAgo.setDate(monthAgo.getDate() - 30)

            const { data, error } = await supabase
                .from('orders')
                .select('id, total, status, payment_method, created_at')
                .eq('business_id', businessId)
                .gte('created_at', monthAgo.toISOString())
                .neq('status', 'cancelado')
                .order('created_at', { ascending: false })

            if (!cancelled && !error && data) {
                setOrders(data)
            }
            if (!cancelled) setOrdersLoading(false)
        }

        fetchOrders()

        // Refresh every 30s instead of polling localStorage
        const interval = setInterval(fetchOrders, 30000)
        return () => { cancelled = true; clearInterval(interval) }
    }, [businessId])

    // Ghost Wall scroll lock
    useEffect(() => {
        document.body.style.overflow = showAuditor ? 'hidden' : 'unset'
        return () => { document.body.style.overflow = 'unset' }
    }, [showAuditor])

    // Session for superadmin detection
    const [session, setSession] = useState(null)
    useEffect(() => {
        getSession().then(s => setSession(s)).catch(() => setSession(null))
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        clearAuth()
        window.location.href = `/${tenantSlug}`
    }

    // Stats calculations (from Supabase data)
    const stats = useMemo(() => {
        const today = new Date().toDateString()
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)

        const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today)
        const mpOrders = todayOrders.filter(o => o.payment_method === 'mercadopago')
        const cashOrders = todayOrders.filter(o => o.payment_method === 'efectivo' || o.payment_method === 'pay_at_counter')
        const mpTotal = mpOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
        const cashTotal = cashOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

        const weekOrders = orders.filter(o => new Date(o.created_at) >= weekAgo)

        return {
            todayOrders, mpOrders, cashOrders, mpTotal, cashTotal,
            totalToday: mpTotal + cashTotal,
            weekCount: weekOrders.length,
            monthCount: orders.length
        }
    }, [orders])

    // ☁️ CLOUD SAVE for business info
    const [savingConfig, setSavingConfig] = useState(false)
    const updateBusinessInfo = async (field, value) => {
        const newInfo = { ...appConfig?.businessInfo, [field]: value }
        const updatedConfig = { ...appConfig, businessInfo: newInfo }
        setSavingConfig(true)
        await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
        await refreshTenantData()
        setSavingConfig(false)
    }

    const updateExternalOrdering = async (updates) => {
        const updatedConfig = { ...appConfig, externalOrdering: { ...appConfig?.externalOrdering, ...updates } }
        await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
        await refreshTenantData()
    }

    const updatePayments = async (updates) => {
        const updatedConfig = { ...appConfig, payments: { ...appConfig?.payments, ...updates } }
        await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
        await refreshTenantData()
    }

    // Card style helper
    const cardStyle = { background: 'white', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
    const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }
    const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F5F2EE', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <BackendHeader
                title={t('summary')}
                onLogout={handleLogout}
                showDateSelector={false}
                showNotifications={false}
                showAvatar={false}
            />

            {/* Sync Button */}
            <div style={{ padding: '12px 16px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: 8 }}>
                <button
                    onClick={async () => {
                        setOrdersLoading(true)
                        const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)
                        const { data } = await supabase.from('orders').select('id, total, status, payment_method, created_at').eq('business_id', businessId).gte('created_at', monthAgo.toISOString()).neq('status', 'cancelado').order('created_at', { ascending: false })
                        if (data) setOrders(data)
                        setOrdersLoading(false)
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
                    🔄 {t('update')}
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
                    📊 {t('auditor')}
                </button>
            </div>

            {/* Content - with bottom padding for BackendNav */}
            <div style={{ padding: 16, paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>

                {/* ==================== PAGOS DEL DÍA ==================== */}
                <h3 style={labelStyle}>💳 {t('daily_payments')}</h3>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#E0F2F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💳</div>
                            <div><p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>Mercado Pago</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{stats.mpOrders.length} {t('orders_count')}</p></div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>{formatPrice(stats.mpTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💵</div>
                            <div><p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>{t('cash')}</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{stats.cashOrders.length} {t('orders_count')}</p></div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>{formatPrice(stats.cashTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
                        <div><p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: 0 }}>{t('total_day')}</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{stats.todayOrders.length} {t('orders_count')}</p></div>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>{formatPrice(stats.totalToday)}</span>
                    </div>
                </div>

                {/* ==================== SESIONES ==================== */}
                <h3 style={labelStyle}>{t('sessions')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{stats.weekCount}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>{t('this_week')}</p></div>
                    <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{stats.monthCount}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>{t('this_month')}</p></div>
                </div>

                {/* ==================== INFORMACIÓN DEL LOCAL ==================== */}
                <h3 style={labelStyle}>📍 {t('venue_info')}</h3>
                <div style={cardStyle}>
                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>{t('whatsapp_contact')}</label>
                    <input type="text" placeholder={t('phone_placeholder')} value={appConfig?.businessInfo?.whatsapp || ''} onChange={(e) => updateBusinessInfo('whatsapp', e.target.value)} style={inputStyle} />

                    {/* 📍 HYBRID LOCATION GROUP */}
                    <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 12 }}>📍 {t('location_label')}</label>

                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>{t('address_label')}</label>
                        <input type="text" placeholder={t('address_placeholder')} value={appConfig?.businessInfo?.address || ''} onChange={(e) => updateBusinessInfo('address', e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />

                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>{t('maps_link')}</label>
                        <input type="text" placeholder={t('maps_placeholder')} value={appConfig?.businessInfo?.googleMapsLink || ''} onChange={(e) => updateBusinessInfo('googleMapsLink', e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                            ℹ️ {t('maps_info')}
                        </p>
                    </div>

                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>{t('notes')}</label>
                    <input type="text" placeholder={t('notes_placeholder')} value={appConfig?.businessInfo?.directions || ''} onChange={(e) => updateBusinessInfo('directions', e.target.value)} style={inputStyle} />
                </div>

                {/* ==================== LINKS EXTERNOS ==================== */}
                <h3 style={labelStyle}>🔗 {t('external_links')}</h3>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#374151' }}>🧡 Rappi</span>
                        <label className="toggle"><input type="checkbox" checked={appConfig?.externalOrdering?.rappiEnabled ?? false} onChange={() => updateExternalOrdering({ rappiEnabled: !(appConfig?.externalOrdering?.rappiEnabled) })} /><span className="toggle-slider"></span></label>
                    </div>
                    <input type="text" placeholder={t('rappi_placeholder')} value={appConfig?.externalOrdering?.rappiUrl || ''} onChange={(e) => updateExternalOrdering({ rappiUrl: e.target.value })} style={{ ...inputStyle, marginBottom: 14 }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#374151' }}>❤️ PedidosYa</span>
                        <label className="toggle"><input type="checkbox" checked={appConfig?.externalOrdering?.pedidosYaEnabled ?? false} onChange={() => updateExternalOrdering({ pedidosYaEnabled: !(appConfig?.externalOrdering?.pedidosYaEnabled) })} /><span className="toggle-slider"></span></label>
                    </div>
                    <input type="text" placeholder={t('pedidosya_placeholder')} value={appConfig?.externalOrdering?.pedidosYaUrl || ''} onChange={(e) => updateExternalOrdering({ pedidosYaUrl: e.target.value })} style={{ ...inputStyle, marginBottom: 14 }} />

                    {/* Mercado Pago Alias */}
                    <div style={{ paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                        <span style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>💳 {t('mp_alias_label')}</span>
                        <input
                            type="text"
                            placeholder={t('mp_alias_placeholder')}
                            value={appConfig?.payments?.mercadoPagoAlias || ''}
                            onChange={(e) => updatePayments({ mercadoPagoAlias: e.target.value })}
                            style={inputStyle}
                        />
                        <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>{t('empty_info')}</p>
                    </div>
                </div>

                {/* 🌎 LANGUAGE TOGGLE (High-End SaaS Style) */}
                <div style={{
                    marginTop: 32,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 24,
                    padding: '16px 0',
                    borderTop: '1px solid #E5E7EB'
                }}>
                    {['EN', 'ES', 'PT'].map((l) => (
                        <button
                            key={l}
                            onClick={() => changeLanguage(l.toLowerCase())}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: lang === l.toLowerCase() ? '#111827' : '#9CA3AF',
                                fontWeight: lang === l.toLowerCase() ? 700 : 500,
                                fontSize: 13,
                                letterSpacing: '0.1em',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {l}
                        </button>
                    ))}
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
                        {t('system_admin')}
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
                            <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>📊 {t('cloud_vault')}</span>
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
                                ✕ {t('close')}
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
