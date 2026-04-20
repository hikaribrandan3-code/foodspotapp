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

            {/* TEAM MANAGEMENT SECTION */}
            <TeamManagement businessId={businessId} t={t} primaryColor={tenantData?.primary_color} />

            {/* VIBE BOOST SECTION */}
            <VibeBoost businessId={businessId} lang={tenantData?.language || 'es'} primaryColor={tenantData?.primary_color} />
        </div>
    )
}

function VibeBoost({ businessId, lang, primaryColor }) {
    const [loading, setLoading] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    const handleVibeBoost = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.functions.invoke('vibe-boost', {
                body: {
                    business_id: businessId,
                    amount_cents: 100000, // $1000 in cents
                    locale: lang
                }
            })

            if (error) throw error

            const msg = lang === 'en' 
                ? `🎉 Vibe Boost applied! ${data.updated} cards updated.`
                : `🎉 ¡Vibe Boost aplicado! ${data.updated} tarjetas actualizadas.`;
            alert(msg)
            setShowConfirm(false)
        } catch (e) {
            alert(lang === 'en' ? 'Failed to apply boost' : 'Error al aplicar boost')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ marginTop: 24, padding: 20, background: '#F9FAFB', borderRadius: 16 }}>
            <div style={{
                border: '2px solid',
                borderColor: '#8B5CF6',
                borderRadius: 12,
                padding: 16,
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🚀</div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
                    {lang === 'en' ? 'Vibe Boost Marketing' : 'Marketing Vibe Boost'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 16 }}>
                    {lang === 'en' 
                        ? 'Add $1000 credit to every active festival card'
                        : 'Agregar $1000 de crédito a cada tarjeta activa del festival'}
                </div>
                {!showConfirm ? (
                    <button
                        onClick={() => setShowConfirm(true)}
                        style={{
                            padding: '12px 24px',
                            background: '#FFF',
                            color: '#8B5CF6',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                    >
                        {lang === 'en' ? 'Trigger Vibe Boost ($1000)' : 'Activar Vibe Boost ($1000)'}
                    </button>
                ) : (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8 }}>
                        <div style={{ color: '#FFF', fontSize: 13, marginBottom: 12 }}>
                            {lang === 'en' 
                                ? 'This will add credit to EVERY active card. Proceed?'
                                : 'Esto agregará crédito a TODAS las tarjetas activas. ¿Proceder?'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button
                                onClick={handleVibeBoost}
                                disabled={loading}
                                style={{
                                    padding: '10px 20px',
                                    background: '#22C55E',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontWeight: 600,
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? '...' : (lang === 'en' ? 'Confirm' : 'Confirmar')}
                            </button>
                            <button
                                onClick={() => setShowConfirm(false)}
                                style={{
                                    padding: '10px 20px',
                                    background: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                {lang === 'en' ? 'Cancel' : 'Cancelar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function TeamManagement({ businessId, t, primaryColor }) {
    const [showTeamPanel, setShowTeamPanel] = useState(false)
    const [staffList, setStaffList] = useState([])
    const [loading, setLoading] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    const [newStaff, setNewStaff] = useState({ name: '', email: '', pin: '', role: 'cook' })
    const [saving, setSaving] = useState(false)

    const fetchStaff = async () => {
        if (!businessId) return
        setLoading(true)
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .eq('business_id', businessId)
            .order('name')
        
        if (!error && data) setStaffList(data)
        setLoading(false)
    }

    useEffect(() => {
        if (showTeamPanel) fetchStaff()
    }, [showTeamPanel, businessId])

    const handleAddStaff = async () => {
        if (!newStaff.name || !newStaff.email || !newStaff.pin) return
        setSaving(true)
        
        const simpleHash = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16);
        }

        const { error } = await supabase
            .from('staff')
            .insert({
                business_id: businessId,
                name: newStaff.name,
                email: newStaff.email.toLowerCase().trim(),
                pin: simpleHash(newStaff.pin),
                role: newStaff.role,
                status: 'active'
            })

        if (!error) {
            setNewStaff({ name: '', email: '', pin: '', role: 'cook' })
            setShowAddForm(false)
            fetchStaff()
        }
        setSaving(false)
    }

    const handleDeleteStaff = async (staffId) => {
        if (!confirm(t('confirm_delete') || '¿Eliminar este miembro?')) return
        
        await supabase
            .from('staff')
            .update({ status: 'inactive' })
            .eq('id', staffId)
        
        fetchStaff()
    }

    const roles = [
        { id: 'admin', label: t('role_admin') || 'Admin' },
        { id: 'manager', label: t('role_manager') || 'Manager' },
        { id: 'cook', label: t('role_cook') || 'Cocinero' },
        { id: 'cashier', label: t('role_cashier') || 'Cajero' },
        { id: 'runner', label: t('role_runner') || 'Runner' }
    ]

    return (
        <div style={{ marginTop: 32, padding: 20, background: '#F9FAFB', borderRadius: 16 }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '12px 0'
            }}
            onClick={() => setShowTeamPanel(!showTeamPanel)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>👥</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>
                        {t('team_management') || 'Gestión de Equipo'}
                    </span>
                </div>
                <span style={{ fontSize: 20, transform: showTeamPanel ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }}>▼</span>
            </div>

            {showTeamPanel && (
                <div style={{ paddingTop: 16 }}>
                    {!showAddForm ? (
                        <button
                            onClick={() => setShowAddForm(true)}
                            style={{
                                width: '100%',
                                padding: 14,
                                background: primaryColor || '#C4856A',
                                color: 'white',
                                border: 'none',
                                borderRadius: 12,
                                fontSize: 15,
                                fontWeight: 600,
                                cursor: 'pointer',
                                marginBottom: 16
                            }}
                        >
                            + {t('add_staff') || 'Agregar Personal'}
                        </button>
                    ) : (
                        <div style={{ background: 'white', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                            <input
                                type="text"
                                placeholder={t('name') || 'Nombre'}
                                value={newStaff.name}
                                onChange={(e) => setNewStaff(p => ({ ...p, name: e.target.value }))}
                                style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid #E5E7EB' }}
                            />
                            <input
                                type="text"
                                placeholder={t('email') || 'Email/Usuario'}
                                value={newStaff.email}
                                onChange={(e) => setNewStaff(p => ({ ...p, email: e.target.value }))}
                                style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid #E5E7EB' }}
                            />
                            <input
                                type="password"
                                placeholder="PIN (4 dígitos)"
                                value={newStaff.pin}
                                onChange={(e) => setNewStaff(p => ({ ...p, pin: e.target.value }))}
                                maxLength={4}
                                style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid #E5E7EB' }}
                            />
                            <select
                                value={newStaff.role}
                                onChange={(e) => setNewStaff(p => ({ ...p, role: e.target.value }))}
                                style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid #E5E7EB' }}
                            >
                                {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={handleAddStaff}
                                    disabled={saving || !newStaff.name || !newStaff.email || !newStaff.pin}
                                    style={{ flex: 1, padding: 10, background: '#22C55E', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                                >
                                    {saving ? '...' : (t('save') || 'Guardar')}
                                </button>
                                <button
                                    onClick={() => { setShowAddForm(false); setNewStaff({ name: '', email: '', pin: '', role: 'cook' }); }}
                                    style={{ flex: 1, padding: 10, background: '#E5E7EB', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                                >
                                    {t('cancel') || 'Cancelar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 20, color: '#6B7280' }}>...</div>
                    ) : staffList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 20, color: '#6B7280' }}>
                            {t('no_staff') || 'No hay personal registrado'}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {staffList.map(staff => (
                                <div key={staff.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 12,
                                    background: 'white',
                                    borderRadius: 10,
                                    border: '1px solid #E5E7EB'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#1F2937' }}>{staff.name}</div>
                                        <div style={{ fontSize: 12, color: '#6B7280' }}>{staff.role} • {staff.email}</div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteStaff(staff.id)}
                                        style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                                    >
                                        {t('remove') || 'Eliminar'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default OwnerSummary
