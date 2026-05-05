import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { clearAuth } from '../../utils/storage.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../config/menuData.js'
import { getSession } from '../../utils/auth.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { ORDER_STATUS } from '../../constants/database.js'
import { PAYMENT_METHOD } from '../../constants/database.js'

function OwnerSummary() {
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const { businessId, tenantData, refreshTenantData } = useTenant()
    const { lang, t, changeLanguage } = useLanguage()
    const appConfig = tenantData?.app_config || {}

    const [orders, setOrders] = useState([])
    const [ordersLoading, setOrdersLoading] = useState(true)
    const [session, setSession] = useState(null)
    const [savingConfig, setSavingConfig] = useState(false)
    const [pendingLanguage, setPendingLanguage] = useState(null)
    const [languageSaving, setLanguageSaving] = useState(false)
    const [languageSaveStatus, setLanguageSaveStatus] = useState(null)
    const [mpAliasInput, setMpAliasInput] = useState('')
    const [mpAliasSaved, setMpAliasSaved] = useState(false)
    const [mpAliasSaving, setMpAliasSaving] = useState(false)
    const [discordWebhookInput, setDiscordWebhookInput] = useState('')
    const [discordWebhookSaved, setDiscordWebhookSaved] = useState(false)
    const [discordWebhookSaving, setDiscordWebhookSaving] = useState(false)
    const [showAuditor, setShowAuditor] = useState(false)

    const debounceTimerRef = useRef(null)
    const mpAliasInitialized = useRef(false)
    const discordWebhookInitialized = useRef(false)

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
                .neq('status', ORDER_STATUS.CANCELLED)
                .order('created_at', { ascending: false })

            if (!cancelled && !error && data) {
                setOrders(data)
            }
            if (!cancelled) setOrdersLoading(false)
        }

        fetchOrders()

        const subscription = supabase
            .channel(`summary-orders-${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `business_id=eq.${businessId}`
                },
                () => {
                    if (!cancelled) fetchOrders()
                }
            )
            .subscribe()

        const interval = setInterval(fetchOrders, 30000)
        return () => {
            cancelled = true
            clearInterval(interval)
            supabase.removeChannel(subscription)
        }
    }, [businessId])

    useEffect(() => {
        getSession().then(s => setSession(s)).catch(() => setSession(null))
    }, [])

    useEffect(() => {
        if (!mpAliasInitialized.current && appConfig?.payments?.mercadoPagoAlias !== undefined) {
            setMpAliasInput(appConfig.payments.mercadoPagoAlias || '')
            mpAliasInitialized.current = true
        }
    }, [appConfig?.payments?.mercadoPagoAlias])

    useEffect(() => {
        if (!discordWebhookInitialized.current && appConfig?.notifications?.discordWebhookUrl !== undefined) {
            setDiscordWebhookInput(appConfig.notifications?.discordWebhookUrl || '')
            discordWebhookInitialized.current = true
        }
    }, [appConfig?.notifications?.discordWebhookUrl])

    useEffect(() => {
        document.body.style.overflow = showAuditor ? 'hidden' : 'unset'
        return () => { document.body.style.overflow = 'unset' }
    }, [showAuditor])

    const stats = useMemo(() => {
        const today = new Date().toDateString()
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)

        const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today)
        const mpOrders = todayOrders.filter(o => o.payment_method === PAYMENT_METHOD.MERCADO_PAGO)
        const cashOrders = todayOrders.filter(o => o.payment_method === PAYMENT_METHOD.CASH)
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

    const handleLogout = async () => {
        await supabase.auth.signOut()
        clearAuth()
        window.location.href = `/${tenantSlug}`
    }

    const handleLanguageChange = (newLang) => {
        setPendingLanguage(newLang)
    }

    const saveLanguage = async () => {
        if (!pendingLanguage) return
        setLanguageSaving(true)
        setLanguageSaveStatus(null)

        try {
            await changeLanguage(pendingLanguage)
            setLanguageSaveStatus({ message: t('language_saved') || 'Idioma guardado', type: 'success' })
            setPendingLanguage(null)
            setTimeout(() => setLanguageSaveStatus(null), 3000)
        } catch (err) {
            console.error('Language save failed:', err)
            setLanguageSaveStatus({ message: t('save_error') || 'Error al guardar', type: 'error' })
            setTimeout(() => setLanguageSaveStatus(null), 3000)
        } finally {
            setLanguageSaving(false)
        }
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

    const updatePayments = (updates) => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = setTimeout(async () => {
            const updatedConfig = { ...appConfig, payments: { ...appConfig?.payments, ...updates } }
            await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
            await refreshTenantData()
        }, 1000)
    }

    const updateBrandingCloud = async (field, value) => {
        const columnMap = {
            mercadoPagoAccessToken: 'mp_access_token'
        }
        const column = columnMap[field]
        if (!column) return

        await supabase.from('branding').update({ [column]: value }).eq('business_id', businessId)
        await refreshTenantData()
    }

    return (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-900 min-h-screen">
            <BackendHeader
                title={t('summary')}
                onLogout={handleLogout}
                showDateSelector={false}
                showNotifications={false}
                showAvatar={false}
            />

            <main className="p-4 space-y-3 pb-24">
                {/* TOP BAR: Sync + Auditor buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            setOrdersLoading(true)
                            const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)
                            const { data } = await supabase.from('orders').select('id, total, status, payment_method, created_at').eq('business_id', businessId).gte('created_at', monthAgo.toISOString()).neq('status', ORDER_STATUS.CANCELLED).order('created_at', { ascending: false })
                            if (data) setOrders(data)
                            setOrdersLoading(false)
                        }}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                        🔄 {t('update')}
                    </button>
                    <button
                        onClick={() => setShowAuditor(true)}
                        className="flex-1 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                        📊 Backend Auditor
                    </button>
                </div>

                {/* KEY METRICS: Always visible */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Daily Revenue */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Daily Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(stats.totalToday)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats.todayOrders.length} orders</p>
                    </div>

                    {/* Sessions This Week */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">This Week</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.weekCount}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">orders</p>
                    </div>
                </div>

                {/* ACCORDION SECTIONS */}
                <AccordionSection title="Payment Breakdown" icon="💰">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Mercado Pago</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{stats.mpOrders.length} orders</p>
                            </div>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatPrice(stats.mpTotal)}</p>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Cash</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{stats.cashOrders.length} orders</p>
                            </div>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatPrice(stats.cashTotal)}</p>
                        </div>
                    </div>
                </AccordionSection>

                <AccordionSection title="Venue Info" icon="📍">
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">WhatsApp</label>
                            <input
                                type="text"
                                placeholder="ex: +54 9 351 123-4567"
                                defaultValue={appConfig?.businessInfo?.whatsapp || ''}
                                onChange={(e) => updateBusinessInfo('whatsapp', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Address</label>
                            <input
                                type="text"
                                defaultValue={appConfig?.businessInfo?.address || ''}
                                onChange={(e) => updateBusinessInfo('address', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Google Maps Link</label>
                            <input
                                type="text"
                                defaultValue={appConfig?.businessInfo?.mapsLink || ''}
                                onChange={(e) => updateBusinessInfo('mapsLink', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </AccordionSection>

                <AccordionSection title="External Links" icon="🔗">
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">📸 Instagram</label>
                            <input
                                type="text"
                                defaultValue={appConfig?.externalOrdering?.instagram || ''}
                                onChange={(e) => updateExternalOrdering({ instagram: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">🎵 TikTok</label>
                            <input
                                type="text"
                                defaultValue={appConfig?.externalOrdering?.tiktok || ''}
                                onChange={(e) => updateExternalOrdering({ tiktok: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">🧡 Rappi</label>
                            <input
                                type="text"
                                defaultValue={appConfig?.externalOrdering?.rappi || ''}
                                onChange={(e) => updateExternalOrdering({ rappi: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </AccordionSection>

                <AccordionSection title="Mercado Pago Setup" icon="💳">
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Access Token</label>
                            <input
                                type="password"
                                defaultValue={appConfig?.payments?.mercadoPagoAccessToken || ''}
                                onChange={(e) => updatePayments({ mercadoPagoAccessToken: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="APP_xxx..."
                            />
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="MP Alias (optional)"
                                value={mpAliasInput}
                                onChange={(e) => setMpAliasInput(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                                onClick={saveMpAlias}
                                disabled={mpAliasSaving}
                                className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                            >
                                {mpAliasSaving ? '...' : 'Save'}
                            </button>
                        </div>
                        {mpAliasSaved && <p className="text-xs text-green-600 dark:text-green-400">✓ Saved</p>}
                    </div>
                </AccordionSection>

                <AccordionSection title="Discord Webhook" icon="🤖">
                    <div className="space-y-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Send delivery notifications to Discord</p>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                placeholder="Webhook URL"
                                value={discordWebhookInput}
                                onChange={(e) => setDiscordWebhookInput(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                                onClick={saveDiscordWebhook}
                                disabled={discordWebhookSaving}
                                className="bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                            >
                                {discordWebhookSaving ? '...' : 'Save'}
                            </button>
                        </div>
                        {discordWebhookSaved && <p className="text-xs text-green-600 dark:text-green-400">✓ Saved</p>}
                    </div>
                </AccordionSection>

                <AccordionSection title="Language" icon="🌐">
                    <div className="flex gap-2 justify-center py-2">
                        {['en', 'es', 'pt'].map(lng => (
                            <button
                                key={lng}
                                onClick={() => handleLanguageChange(lng)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                    pendingLanguage === lng || lang === lng
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                {lng.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    {pendingLanguage && pendingLanguage !== lang && (
                        <button
                            onClick={saveLanguage}
                            disabled={languageSaving}
                            className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 mt-2"
                        >
                            {languageSaving ? t('saving') : 'Save Language'}
                        </button>
                    )}
                    {languageSaveStatus && <p className={`text-xs mt-2 ${languageSaveStatus.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{languageSaveStatus.message}</p>}
                </AccordionSection>
            </main>

            <BackendNav role="owner" useRoutes={true} />
        </div>
    )
}

function AccordionSection({ title, icon, children }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-lg">{icon}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
                </div>
                <svg
                    className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
            {isOpen && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/50">
                    {children}
                </div>
            )}
        </div>
    )
}

export default OwnerSummary
