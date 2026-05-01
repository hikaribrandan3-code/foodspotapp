import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import { ORDER_STATUS } from '../../constants/database.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import AuditorOverlay from '../../components/AuditorOverlay.jsx'

export default function OwnerSummary() {
    const navigate = useNavigate()
    const { t } = useLanguage()
    const { businessId, tenantData, refreshTenantData } = useTenant()
    const appConfig = tenantData?.app_config || {}

    // Local state for inputs that need debouncing or immediate feedback
    const [mpTokenInput, setMpTokenInput] = useState('')
    const [mpTokenSaving, setMpTokenSaving] = useState(false)
    const [mpTokenSaved, setMpTokenSaved] = useState(false)
    const [mpAliasInput, setMpAliasInput] = useState('')
    const [mpAliasSaving, setMpAliasSaving] = useState(false)
    const [mpAliasSaved, setMpAliasSaved] = useState(false)
    const [discordWebhookInput, setDiscordWebhookInput] = useState('')
    const [discordWebhookSaving, setDiscordWebhookSaving] = useState(false)
    const [discordWebhookSaved, setDiscordWebhookSaved] = useState(false)
    const [orders, setOrders] = useState([])
    const [ordersLoading, setOrdersLoading] = useState(false)
    const [showAuditor, setShowAuditor] = useState(false)

    const mpAliasInitialized = useRef(false)
    const discordWebhookInitialized = useRef(false)
    const mpTokenInitialized = useRef(false)
    const debounceTimerRef = useRef(null)

    // Initialize local state from tenantData
    useEffect(() => {
        if (!mpTokenInitialized.current && tenantData?.mp_access_token !== undefined) {
            setMpTokenInput(tenantData.mp_access_token || '')
            mpTokenInitialized.current = true
        }
    }, [tenantData?.mp_access_token])

    useEffect(() => {
        if (!mpAliasInitialized.current && appConfig?.payments?.mercadoPagoAlias !== undefined) {
            setMpAliasInput(appConfig.payments.mercadoPagoAlias || '')
            mpAliasInitialized.current = true
        }
    }, [appConfig?.payments?.mercadoPagoAlias])

    useEffect(() => {
        if (!discordWebhookInitialized.current && appConfig?.notifications?.discordWebhookUrl !== undefined) {
            setDiscordWebhookInput(appConfig.notifications.discordWebhookUrl || '')
            discordWebhookInitialized.current = true
        }
    }, [appConfig?.notifications?.discordWebhookUrl])

    const handleLogout = () => {
        localStorage.removeItem('fs_owner_auth')
        navigate('/owner/login')
    }

    const updateBusinessInfo = async (field, value) => {
        const newInfo = { ...appConfig?.businessInfo, [field]: value }
        const updatedConfig = { ...appConfig, businessInfo: newInfo }
        await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
        await refreshTenantData()
    }

    const updateExternalOrdering = async (updates) => {
        const updatedConfig = { ...appConfig, externalOrdering: { ...appConfig?.externalOrdering, ...updates } }
        await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
        await refreshTenantData()
    }

    const saveMpAlias = async () => {
        setMpAliasSaving(true)
        setMpAliasSaved(false)
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        try {
            const updatedConfig = { ...appConfig, payments: { ...appConfig?.payments, mercadoPagoAlias: mpAliasInput } }
            await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
            await refreshTenantData()
            setMpAliasSaved(true)
            setTimeout(() => setMpAliasSaved(false), 3000)
        } catch (err) {
            console.error('Failed to save MP Alias:', err)
        } finally {
            setMpAliasSaving(false)
        }
    }

    const saveDiscordWebhook = async () => {
        setDiscordWebhookSaving(true)
        setDiscordWebhookSaved(false)
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        try {
            const updatedConfig = { ...appConfig, notifications: { ...appConfig?.notifications, discordWebhookUrl: discordWebhookInput } }
            await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
            await refreshTenantData()
            setDiscordWebhookSaved(true)
            setTimeout(() => setDiscordWebhookSaved(false), 3000)
        } catch (err) {
            console.error('Failed to save Discord Webhook:', err)
        } finally {
            setDiscordWebhookSaving(false)
        }
    }

    // 🛡️ DEBOUNCED SAVE for MP Access Token
    const saveMpToken = async (value) => {
        if (!businessId) return
        setMpTokenSaving(true)
        setMpTokenSaved(false)
        try {
            await supabase.from('branding').update({ mp_access_token: value }).eq('business_id', businessId)
            await refreshTenantData()
            setMpTokenSaved(true)
            setTimeout(() => setMpTokenSaved(false), 3000)
        } catch (err) {
            console.error('Failed to save MP Access Token:', err)
        } finally {
            setMpTokenSaving(false)
        }
    }

    const handleMpTokenChange = (e) => {
        const value = e.target.value
        setMpTokenInput(value)
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = setTimeout(() => {
            saveMpToken(value)
        }, 800)
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
                        const { data } = await supabase.from('orders').select('id, total, status, payment_method, created_at').eq('business_id', businessId).gte('created_at', monthAgo.toISOString()).neq('status', ORDER_STATUS.CANCELLED).order('created_at', { ascending: false })
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
                        background: '#FFFFFF',
                        color: '#1F2937'
                    }}
                >
                    🔍 Auditor
                </button>
            </div>

            <div style={{ padding: '16px', maxWidth: 720, margin: '0 auto' }}>
                {/* Business Info Card */}
                <div style={cardStyle}>
                    <div style={labelStyle}>
                        <span>🏪</span>
                        <span>{t('business_info')}</span>
                    </div>
                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>{t('phone')}</label>
                    <input type="text" placeholder={t('phone_placeholder')} value={appConfig?.businessInfo?.whatsapp || ''} onChange={(e) => updateBusinessInfo('whatsapp', e.target.value)} style={inputStyle} />
                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>{t('address')}</label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input type="text" placeholder={t('address_placeholder')} value={appConfig?.businessInfo?.address || ''} onChange={(e) => updateBusinessInfo('address', e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
                    </div>
                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Google Maps</label>
                    <input type="text" placeholder={t('maps_placeholder')} value={appConfig?.businessInfo?.googleMapsLink || ''} onChange={(e) => updateBusinessInfo('googleMapsLink', e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>{t('directions')}</label>
                    <input type="text" placeholder={t('notes_placeholder')} value={appConfig?.businessInfo?.directions || ''} onChange={(e) => updateBusinessInfo('directions', e.target.value)} style={inputStyle} />
                </div>

                {/* Payment Setup Card */}
                <div style={cardStyle}>
                    <div style={labelStyle}>
                        <span>💳</span>
                        <span>{t('payment_setup')}</span>
                    </div>

                    {/* Mercado Pago Token */}
                    <div style={{ background: '#EFF6FF', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 20 }}>🇦🇷</span>
                            <strong style={{ fontSize: 14, color: '#0369A1' }}>Mercado Pago Argentina</strong>
                        </div>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px 0' }}>
                            {t('mp_setup_desc')}
                        </p>

                        {/* Steps */}
                        <div style={{ fontSize: 11, color: '#4B5563', marginBottom: 12, background: '#FFFFFF', borderRadius: 8, padding: 10 }}>
                            <div style={{ marginBottom: 6 }}><strong>1.</strong> {t('mp_step_1')}</div>
                            <div style={{ marginBottom: 6 }}><strong>2.</strong> {t('mp_step_2')}</div>
                            <div style={{ marginBottom: 6 }}><strong>3.</strong> {t('mp_step_3')}</div>
                            <div style={{ marginBottom: 8 }}><strong>4.</strong> {t('mp_step_4')} <code style={{ background: '#F5F5F5', padding: '2px 6px', borderRadius: 4 }}>APP_</code></div>
                            <div><strong>5.</strong> {t('mp_step_5')}</div>
                        </div>

                        {/* Input Field */}
                        <label style={{ fontSize: 12, color: '#0369A1', display: 'block', marginBottom: 6, fontWeight: 600 }}>{t('mp_access_token')}</label>
                        <input
                            type="password"
                            placeholder="APP_1234567890abcdef..."
                            value={mpTokenInput}
                            onChange={handleMpTokenChange}
                            style={{ ...inputStyle, borderColor: tenantData?.mp_access_token ? '#10B981' : '#E5E7EB' }}
                        />
                        {mpTokenSaving && <p style={{ fontSize: 11, color: '#3B82F6', margin: 0, marginBottom: 12 }}>⏳ Saving...</p>}
                        {mpTokenSaved && <p style={{ fontSize: 11, color: '#059669', margin: 0, marginBottom: 12 }}>{t('mp_token_saved')}</p>}
                        {!tenantData?.mp_access_token && !mpTokenSaving && !mpTokenSaved && <p style={{ fontSize: 11, color: '#DC2626', margin: 0, marginBottom: 12 }}>{t('mp_token_required')}</p>}

                        {/* Alias (Optional) */}
                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, fontWeight: 500 }}>{t('mp_alias_optional')}</label>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                            <input
                                type="text"
                                placeholder="yourstore.mp"
                                value={mpAliasInput}
                                onChange={(e) => setMpAliasInput(e.target.value)}
                                style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                            />
                            <button
                                onClick={saveMpAlias}
                                disabled={mpAliasSaving}
                                style={{
                                    padding: '12px 16px',
                                    border: 'none',
                                    borderRadius: 10,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: mpAliasSaving ? 'not-allowed' : 'pointer',
                                    background: mpAliasSaved ? '#10B981' : '#3B82F6',
                                    color: '#fff',
                                    opacity: mpAliasSaving ? 0.7 : 1,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {mpAliasSaved ? '✓' : 'Save'}
                            </button>
                        </div>
                        {mpAliasSaved && <p style={{ fontSize: 11, color: '#10B981', margin: 0, marginBottom: 12 }}>✓ Alias saved</p>}
                        {!mpAliasSaved && <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, marginBottom: 12 }}>{t('mp_alias_info')}</p>}

                        {/* Discord Webhook for Delivery Payments */}
                        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginTop: 14 }}>
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, fontWeight: 500 }}>🤖 Discord Webhook (Delivery Payments)</label>
                            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 8px 0' }}>Send payment requests to Discord channel when drivers deliver</p>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                <input
                                    type="password"
                                    placeholder="https://discord.com/api/webhooks/..."
                                    value={discordWebhookInput}
                                    onChange={(e) => setDiscordWebhookInput(e.target.value)}
                                    style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                                />
                                <button
                                    onClick={saveDiscordWebhook}
                                    disabled={discordWebhookSaving}
                                    style={{
                                        padding: '12px 16px',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        border: 'none',
                                        borderRadius: 10,
                                        cursor: discordWebhookSaving ? 'not-allowed' : 'pointer',
                                        background: discordWebhookSaved ? '#10B981' : '#3B82F6',
                                        color: '#fff',
                                        opacity: discordWebhookSaving ? 0.7 : 1,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {discordWebhookSaved ? '✓' : 'Save'}
                                </button>
                            </div>
                            {discordWebhookSaved && <p style={{ fontSize: 11, color: '#10B981', margin: 0 }}>✓ Webhook saved</p>}
                        </div>
                    </div>
                </div>

                {/* Orders Card */}
                <div style={cardStyle}>
                    <div style={labelStyle}>
                        <span>📋</span>
                        <span>{t('recent_orders')}</span>
                    </div>
                    {ordersLoading ? (
                        <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>⏳ {t('loading')}...</p>
                    ) : orders.length === 0 ? (
                        <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>{t('no_orders')}</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {orders.slice(0, 5).map(order => (
                                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F9FAFB', borderRadius: 8 }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>#{order.id.slice(-6).toUpperCase()}</div>
                                        <div style={{ fontSize: 11, color: '#6B7280' }}>{new Date(order.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>${order.total.toFixed(2)}</div>
                                        <div style={{ fontSize: 11, color: order.status === 'paid' ? '#059669' : '#6B7280' }}>{order.status}</div>
                                    </div>
                                </div>
                            ))}
                            {orders.length > 5 && (
                                <p style={{ fontSize: 12, color: '#3B82F6', textAlign: 'center', margin: '8px 0 0 0', cursor: 'pointer' }} onClick={() => navigate('/owner/orders')}>
                                    {t('view_all_orders')} ({orders.length})
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Auditor Overlay */}
            {showAuditor && <AuditorOverlay onClose={() => setShowAuditor(false)} />}
        </div>
    )
}
