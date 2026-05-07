import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    User, CreditCard, Banknote, DollarSign, MapPin, Link as LinkIcon, Globe,
    Settings, Phone, ChevronRight, ChevronDown, RefreshCw, BarChart3,
    Shield, Check, X, Users, Moon, Sun
} from 'lucide-react'
import { clearAuth } from '../../utils/storage.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import { formatPrice } from '../../config/menuData.js'
import { getSession } from '../../utils/auth.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { useTheme } from '../../contexts/ThemeContext.jsx'
import { ORDER_STATUS } from '../../constants/database.js'
import { PAYMENT_METHOD } from '../../constants/database.js'

/**
 * OwnerSummary - Summary dashboard for Owner
 * P0 #11: Cloud-first — All stats from Supabase, no localStorage.
 */
function OwnerSummary() {
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const { businessId, tenantData, refreshTenantData } = useTenant()
    const { lang, t, changeLanguage } = useLanguage()
    const { theme, setTheme } = useTheme()
    const appConfig = tenantData?.app_config || {}
    const [businessInfoLocal, setBusinessInfoLocal] = useState({})
    const [showAuditor, setShowAuditor] = useState(false)
    const debounceTimerRef = useRef(null)
    const businessInfoDebounceRef = useRef(null)
    const [mpAliasInput, setMpAliasInput] = useState('')
    const [mpAliasSaved, setMpAliasSaved] = useState(false)
    const [mpAliasSaving, setMpAliasSaving] = useState(false)
    const mpAliasInitialized = useRef(false)
    const [discordWebhookInput, setDiscordWebhookInput] = useState('')
    const [discordWebhookSaved, setDiscordWebhookSaved] = useState(false)
    const [discordWebhookSaving, setDiscordWebhookSaving] = useState(false)
    const discordWebhookInitialized = useRef(false)

    // External Links local state
    const [instagramInput, setInstagramInput] = useState('')
    const [instagramSaving, setInstagramSaving] = useState(false)
    const [instagramSaved, setInstagramSaved] = useState(false)
    const instagramInitialized = useRef(false)

    const [tiktokInput, setTiktokInput] = useState('')
    const [tiktokSaving, setTiktokSaving] = useState(false)
    const [tiktokSaved, setTiktokSaved] = useState(false)
    const tiktokInitialized = useRef(false)

    const [rappiInput, setRappiInput] = useState('')
    const [rappiSaving, setRappiSaving] = useState(false)
    const [rappiSaved, setRappiSaved] = useState(false)
    const rappiInitialized = useRef(false)

    const [pedidosyaInput, setPedidosyaInput] = useState('')
    const [pedidosyaSaving, setPedidosyaSaving] = useState(false)
    const [pedidosyaSaved, setPedidosyaSaved] = useState(false)
    const pedidosyaInitialized = useRef(false)

    // MP Access Token local state
    const [mpTokenInput, setMpTokenInput] = useState('')
    const [mpTokenSaving, setMpTokenSaving] = useState(false)
    const [mpTokenSaved, setMpTokenSaved] = useState(false)
    const mpTokenInitialized = useRef(false)

    // Business Currency
    const [businessCurrency, setBusinessCurrency] = useState('ARS')
    const [currencySaving, setCurrencySaving] = useState(false)
    const [currencySaved, setCurrencySaved] = useState(false)
    const businessCurrencyInitialized = useRef(false)

    // Collapsible sections
    const [openSections, setOpenSections] = useState({
        payments: true,
        venue: true,
        links: false,
        mp: false,
        currency: true,
        language: false,
        team: false,
    })
    const toggleSection = (key) => setOpenSections(p => ({ ...p, [key]: !p[key] }))

    // 🌍 LANGUAGE SAVE STATE
    const [pendingLanguage, setPendingLanguage] = useState(null)
    const [languageSaving, setLanguageSaving] = useState(false)
    const [languageSaveStatus, setLanguageSaveStatus] = useState(null)

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
                .neq('status', ORDER_STATUS.CANCELLED)
                .order('created_at', { ascending: false })

            if (!cancelled && !error && data) {
                setOrders(data)
            }
            if (!cancelled) setOrdersLoading(false)
        }

        fetchOrders()

        // Subscribe to real-time changes (SILO-FILTERED)
        const subscription = supabase
            .channel(`summary-orders-${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `business_id=eq.${businessId}` // 🔐 SILO FILTER
                },
                () => {
                    if (!cancelled) fetchOrders()
                }
            )
            .subscribe()

        // Fallback poll every 30s if subscription fails
        const interval = setInterval(fetchOrders, 30000)
        return () => {
            cancelled = true
            clearInterval(interval)
            supabase.removeChannel(subscription)
        }
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

    // Stats calculations (from Supabase data)
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

    // ☁️ CLOUD SAVE for business info
    const [savingConfig, setSavingConfig] = useState(false)

    // Sync local businessInfo from server on mount
    useEffect(() => {
        setBusinessInfoLocal(appConfig?.businessInfo || {})
    }, [appConfig?.businessInfo])

    // Optimistic + debounced save
    const updateBusinessInfo = (field, value) => {
        setBusinessInfoLocal(prev => ({ ...prev, [field]: value }))

        if (businessInfoDebounceRef.current) clearTimeout(businessInfoDebounceRef.current)
        businessInfoDebounceRef.current = setTimeout(async () => {
            const newBusinessInfo = { ...appConfig?.businessInfo, [field]: value }
            const updatedConfig = { ...appConfig, businessInfo: newBusinessInfo }
            try {
                await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
            } catch (e) {
                console.error('Save failed:', e)
            }
        }, 800)
    }

    const updateExternalOrdering = async (updates) => {
        const updatedConfig = { ...appConfig, externalOrdering: { ...appConfig?.externalOrdering, ...updates } }
        await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
        await refreshTenantData()
    }

    // Sync mpAliasInput from server only on first load
    useEffect(() => {
        if (!mpAliasInitialized.current && appConfig?.payments?.mercadoPagoAlias !== undefined) {
            setMpAliasInput(appConfig.payments.mercadoPagoAlias || '')
            mpAliasInitialized.current = true
        }
    }, [appConfig?.payments?.mercadoPagoAlias])

    // Sync discordWebhookInput from server only on first load
    useEffect(() => {
        if (!discordWebhookInitialized.current && appConfig?.notifications?.discordWebhookUrl !== undefined) {
            setDiscordWebhookInput(appConfig.notifications?.discordWebhookUrl || '')
            discordWebhookInitialized.current = true
        }
    }, [appConfig?.notifications?.discordWebhookUrl])

    // Sync businessCurrency from app_config on first load (default: ARS)
    useEffect(() => {
        if (!businessCurrencyInitialized.current && appConfig?.businessCurrency !== undefined) {
            setBusinessCurrency(appConfig.businessCurrency || 'ARS')
            businessCurrencyInitialized.current = true
        } else if (!businessCurrencyInitialized.current && appConfig) {
            setBusinessCurrency('ARS')
            businessCurrencyInitialized.current = true
        }
    }, [appConfig?.businessCurrency, appConfig])

    // Sync external links from server on first load
    useEffect(() => {
        if (!instagramInitialized.current && appConfig?.externalOrdering?.instagramUrl !== undefined) {
            setInstagramInput(appConfig.externalOrdering.instagramUrl || '')
            instagramInitialized.current = true
        }
    }, [appConfig?.externalOrdering?.instagramUrl])

    useEffect(() => {
        if (!tiktokInitialized.current && appConfig?.externalOrdering?.tiktokUrl !== undefined) {
            setTiktokInput(appConfig.externalOrdering.tiktokUrl || '')
            tiktokInitialized.current = true
        }
    }, [appConfig?.externalOrdering?.tiktokUrl])

    useEffect(() => {
        if (!rappiInitialized.current && appConfig?.externalOrdering?.rappiUrl !== undefined) {
            setRappiInput(appConfig.externalOrdering.rappiUrl || '')
            rappiInitialized.current = true
        }
    }, [appConfig?.externalOrdering?.rappiUrl])

    useEffect(() => {
        if (!pedidosyaInitialized.current && appConfig?.externalOrdering?.pedidosYaUrl !== undefined) {
            setPedidosyaInput(appConfig.externalOrdering.pedidosYaUrl || '')
            pedidosyaInitialized.current = true
        }
    }, [appConfig?.externalOrdering?.pedidosYaUrl])

    // Sync MP Token from server on first load
    useEffect(() => {
        if (!mpTokenInitialized.current && tenantData?.mp_access_token !== undefined) {
            setMpTokenInput(tenantData.mp_access_token || '')
            mpTokenInitialized.current = true
        }
    }, [tenantData?.mp_access_token])

    const updatePayments = (updates) => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = setTimeout(async () => {
            const updatedConfig = { ...appConfig, payments: { ...appConfig?.payments, ...updates } }
            await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
            await refreshTenantData()
        }, 1000)
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

    const saveBusinessCurrency = async (currencyCode) => {
        setCurrencySaving(true)
        setCurrencySaved(false)
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

        try {
            const updatedConfig = { ...appConfig, businessCurrency: currencyCode }
            await supabase
                .from('branding')
                .update({ app_config: updatedConfig })
                .eq('business_id', businessId)

            await refreshTenantData()
            setBusinessCurrency(currencyCode)
            setCurrencySaved(true)

            setTimeout(() => setCurrencySaved(false), 2000)
        } catch (err) {
            console.error('[OwnerSummary] Failed to save business currency:', err)
        } finally {
            setCurrencySaving(false)
        }
    }

    const handleCurrencyChange = (currencyCode) => {
        setBusinessCurrency(currencyCode)
        saveBusinessCurrency(currencyCode)
    }

    const saveExternalLink = async (field, input, setSaving, setSaved) => {
        setSaving(true)
        setSaved(false)
        try {
            const updates = { [field]: input }
            const updatedConfig = { ...appConfig, externalOrdering: { ...appConfig?.externalOrdering, ...updates } }
            await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (err) {
            console.error('Failed to save:', err)
        } finally {
            setSaving(false)
        }
    }

    const saveMpToken = async () => {
        setMpTokenSaving(true)
        setMpTokenSaved(false)
        try {
            await supabase.from('branding').update({ mp_access_token: mpTokenInput }).eq('business_id', businessId)
            setMpTokenSaved(true)
            setTimeout(() => setMpTokenSaved(false), 2000)
        } catch (err) {
            console.error('Failed to save MP token:', err)
        } finally {
            setMpTokenSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-[#020617] font-sans antialiased">
            <BackendHeader
                title={t('summary')}
                onLogout={handleLogout}
                showDateSelector={false}
                showNotifications={false}
                showAvatar={false}
            />

            {/* Main Content */}
            <main className="px-4 md:px-12 pt-8 md:pt-16 pb-36 space-y-8 md:space-y-12 max-w-7xl mx-auto w-full">

                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-[2.5rem] p-6 md:p-8 flex items-center gap-4 bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 shadow-[0_20px_50px_rgba(28,25,23,0.03)]"
                >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 shrink-0">
                        <User size={28} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-['Outfit',sans-serif] font-black text-xl text-stone-950 dark:text-white truncate">
                            {tenantData?.venue_name || tenantData?.business_name || 'Owner'}
                        </h2>
                        <p className="text-sm capitalize text-stone-500 dark:text-white">Owner</p>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-[0.2em] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                Active
                            </span>
                            {ordersLoading && (
                                <span className="text-[10px] text-stone-400 dark:text-white">Syncing...</span>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Preferences */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                    <SectionHeader
                        icon={<Settings size={14} />}
                        title="Preferences"
                        isOpen={true}
                    />
                    <div className="rounded-[2.5rem] overflow-hidden bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="w-full flex items-center gap-3 px-4 py-3.5"
                        >
                            <span className="text-stone-400 dark:text-white">
                                {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                            </span>
                            <span className="text-sm font-medium text-stone-950 dark:text-white flex-1 text-left">Theme</span>
                            <span className="text-xs font-semibold px-2 py-1 rounded-md bg-stone-100 dark:bg-[#334155] text-stone-500 dark:text-white">
                                {theme === 'dark' ? 'Dark' : 'Light'}
                            </span>
                            <ChevronRight size={16} className="text-stone-300 dark:text-[#475569]" />
                        </button>
                    </div>
                </motion.div>

                {/* Payment Breakdown */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <SectionHeader
                        icon={<DollarSign size={14} />}
                        title={t('daily_payments') || 'Payment Breakdown'}
                        isOpen={openSections.payments}
                        onToggle={() => toggleSection('payments')}
                    />
                    <AnimatePresence>
                        {openSections.payments && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="rounded-[2.5rem] overflow-hidden bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                                    <MenuRow
                                        icon={<CreditCard size={18} />}
                                        label="Mercado Pago"
                                        subValue={`${stats.mpOrders.length} ${t('orders_count') || 'orders'}`}
                                        value={formatPrice(stats.mpTotal)}
                                        highlight
                                    />
                                    <MenuRow
                                        icon={<Banknote size={18} />}
                                        label={t(PAYMENT_METHOD.CASH) || 'Cash'}
                                        subValue={`${stats.cashOrders.length} ${t('orders_count') || 'orders'}`}
                                        value={formatPrice(stats.cashTotal)}
                                        highlight
                                    />
                                    <div className="flex items-center justify-between px-4 py-3.5 border-t border-stone-100 dark:border-white/10">
                                        <span className="text-sm font-semibold text-stone-950 dark:text-white">{t('total_day') || 'Total'}</span>
                                        <span className="text-base font-bold text-stone-950 dark:text-white">{formatPrice(stats.totalToday)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Sessions */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <SectionHeader
                        icon={<BarChart3 size={14} />}
                        title={t('sessions') || 'Sessions'}
                        isOpen={true}
                    />
                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div className="bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 rounded-[2.5rem] p-6 md:p-8 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                            <p className="text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-['Outfit',sans-serif]">{stats.weekCount}</p>
                            <p className="text-xs text-stone-400 dark:text-white mt-2 font-bold uppercase tracking-widest">{t('this_week') || 'This Week'}</p>
                        </div>
                        <div className="bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 rounded-[2.5rem] p-6 md:p-8 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                            <p className="text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-['Outfit',sans-serif]">{stats.monthCount}</p>
                            <p className="text-xs text-stone-400 dark:text-white mt-2 font-bold uppercase tracking-widest">{t('this_month') || 'This Month'}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Venue Info */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <SectionHeader
                        icon={<MapPin size={14} />}
                        title={t('venue_info') || 'Venue Info'}
                        isOpen={openSections.venue}
                        onToggle={() => toggleSection('venue')}
                    />
                    <AnimatePresence>
                        {openSections.venue && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="rounded-[2.5rem] overflow-hidden bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 p-6 md:p-8 space-y-6 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                                    <InputField
                                        label={t('whatsapp_contact') || 'WhatsApp'}
                                        value={businessInfoLocal?.whatsapp || ''}
                                        onChange={(e) => updateBusinessInfo('whatsapp', e.target.value)}
                                        placeholder={t('phone_placeholder') || '+1 (555) 000-0000'}
                                    />
                                    <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 md:p-8 space-y-4 border border-stone-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400">{t('location_label') || 'Location'}</p>
                                        <InputField
                                            label={t('address_label') || 'Address'}
                                            value={businessInfoLocal?.address || ''}
                                            onChange={(e) => updateBusinessInfo('address', e.target.value)}
                                            placeholder={t('address_placeholder') || '123 Main St'}
                                        />
                                        <InputField
                                            label={t('maps_link') || 'Google Maps'}
                                            value={businessInfoLocal?.googleMapsLink || ''}
                                            onChange={(e) => updateBusinessInfo('googleMapsLink', e.target.value)}
                                            placeholder={t('maps_placeholder') || 'https://maps.google.com/...'}
                                        />
                                        <p className="text-[11px] text-stone-400 dark:text-white">ℹ️ {t('maps_info') || 'Add a Google Maps link for directions'}</p>
                                    </div>
                                    <InputField
                                        label={t('notes') || 'Notes'}
                                        value={businessInfoLocal?.directions || ''}
                                        onChange={(e) => updateBusinessInfo('directions', e.target.value)}
                                        placeholder={t('notes_placeholder') || 'Additional directions...'}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* External Links */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <SectionHeader
                        icon={<LinkIcon size={14} />}
                        title={t('external_links') || 'External Links'}
                        isOpen={openSections.links}
                        onToggle={() => toggleSection('links')}
                    />
                    <AnimatePresence>
                        {openSections.links && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="rounded-[2.5rem] overflow-hidden bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 p-6 md:p-8 space-y-6 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-2">Instagram</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="https://instagram.com/yourrestaurant"
                                                value={instagramInput}
                                                onChange={(e) => setInstagramInput(e.target.value)}
                                                className="flex-1 px-4 py-3 rounded-2xl text-sm bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-400 dark:placeholder-[#64748b] outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                            <motion.button
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => saveExternalLink('instagramUrl', instagramInput, setInstagramSaving, setInstagramSaved)}
                                                disabled={instagramSaving}
                                                className="px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-[0.15em] bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                {instagramSaved ? <Check size={16} /> : (instagramSaving ? '...' : 'Save')}
                                            </motion.button>
                                        </div>
                                        {instagramSaved && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><Check size={12} /> Saved</p>}
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-2">TikTok</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="https://tiktok.com/@yourrestaurant"
                                                value={tiktokInput}
                                                onChange={(e) => setTiktokInput(e.target.value)}
                                                className="flex-1 px-4 py-3 rounded-2xl text-sm bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-400 dark:placeholder-[#64748b] outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                            <motion.button
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => saveExternalLink('tiktokUrl', tiktokInput, setTiktokSaving, setTiktokSaved)}
                                                disabled={tiktokSaving}
                                                className="px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-[0.15em] bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                {tiktokSaved ? <Check size={16} /> : (tiktokSaving ? '...' : 'Save')}
                                            </motion.button>
                                        </div>
                                        {tiktokSaved && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><Check size={12} /> Saved</p>}
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-white/5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-stone-950 dark:text-white">Rappi</span>
                                            <ToggleSwitch
                                                checked={appConfig?.externalOrdering?.rappiEnabled ?? false}
                                                onChange={() => updateExternalOrdering({ rappiEnabled: !(appConfig?.externalOrdering?.rappiEnabled) })}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder={t('rappi_placeholder') || 'Rappi URL'}
                                                value={rappiInput}
                                                onChange={(e) => setRappiInput(e.target.value)}
                                                className="flex-1 px-4 py-3 rounded-2xl text-sm bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-400 dark:placeholder-[#64748b] outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                            <motion.button
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => saveExternalLink('rappiUrl', rappiInput, setRappiSaving, setRappiSaved)}
                                                disabled={rappiSaving}
                                                className="px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-[0.15em] bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                {rappiSaved ? <Check size={16} /> : (rappiSaving ? '...' : 'Save')}
                                            </motion.button>
                                        </div>
                                        {rappiSaved && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><Check size={12} /> Saved</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-stone-950 dark:text-white">PedidosYa</span>
                                            <ToggleSwitch
                                                checked={appConfig?.externalOrdering?.pedidosYaEnabled ?? false}
                                                onChange={() => updateExternalOrdering({ pedidosYaEnabled: !(appConfig?.externalOrdering?.pedidosYaEnabled) })}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder={t('pedidosya_placeholder') || 'PedidosYa URL'}
                                                value={pedidosyaInput}
                                                onChange={(e) => setPedidosyaInput(e.target.value)}
                                                className="flex-1 px-4 py-3 rounded-2xl text-sm bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-400 dark:placeholder-[#64748b] outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                            <motion.button
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => saveExternalLink('pedidosYaUrl', pedidosyaInput, setPedidosyaSaving, setPedidosyaSaved)}
                                                disabled={pedidosyaSaving}
                                                className="px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-[0.15em] bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                {pedidosyaSaved ? <Check size={16} /> : (pedidosyaSaving ? '...' : 'Save')}
                                            </motion.button>
                                        </div>
                                        {pedidosyaSaved && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><Check size={12} /> Saved</p>}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Mercado Pago & Discord */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <SectionHeader
                        icon={<CreditCard size={14} />}
                        title={t('mp_connect_title') || 'Payments'}
                        isOpen={openSections.mp}
                        onToggle={() => toggleSection('mp')}
                    />
                    <AnimatePresence>
                        {openSections.mp && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="rounded-[2.5rem] overflow-hidden bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 p-6 md:p-8 space-y-6 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                                    {/* MP Setup Card */}
                                    <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-[2.5rem] p-6 md:p-8 border border-emerald-200 dark:border-emerald-500/20 space-y-3 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl">💳</span>
                                            <div>
                                                <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{t('mp_connect_title') || 'Connect Mercado Pago'}</h4>
                                                <p className="text-xs text-emerald-600/70 dark:text-emerald-300/70 mt-0.5">{t('mp_connect_subtitle') || 'Accept online payments'}</p>
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-4 border border-emerald-200 dark:border-emerald-500/10 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 mb-2">{t('mp_why_title') || 'Why connect?'}</p>
                                            <ul className="text-xs text-emerald-700/80 dark:text-emerald-300/70 space-y-1 list-disc pl-4">
                                                <li>{t('mp_benefit_1') || 'Instant payment confirmation'}</li>
                                                <li>{t('mp_benefit_2') || 'Automatic order status updates'}</li>
                                                <li>{t('mp_benefit_3') || 'Secure transactions'}</li>
                                            </ul>
                                        </div>
                                        <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-4 border border-emerald-200 dark:border-emerald-500/10 space-y-2 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 mb-2">{t('mp_how_to_title') || 'How to connect'}</p>
                                            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/70"><strong>1.</strong> {t('mp_step_1') || 'Go to Mercado Pago Developers'}</p>
                                            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/70"><strong>2.</strong> {t('mp_step_2') || 'Create an application'}</p>
                                            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/70"><strong>3.</strong> {t('mp_step_3') || 'Get your credentials'}</p>
                                            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/70"><strong>4.</strong> {t('mp_step_4') || 'Copy your Access Token'} <code className="bg-stone-100 dark:bg-[#1e293b] px-1 py-0.5 rounded text-[10px]">APP_</code></p>
                                            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/70"><strong>5.</strong> {t('mp_step_5') || 'Paste it below'}</p>
                                        </div>
                                    </div>

                                    {/* Access Token */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-2">{t('mp_access_token') || 'Access Token'}</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="password"
                                                placeholder="APP_1234567890abcdef..."
                                                value={mpTokenInput}
                                                onChange={(e) => setMpTokenInput(e.target.value)}
                                                className="flex-1 px-4 py-3 rounded-2xl text-sm bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-400 dark:placeholder-[#64748b] outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                            <motion.button
                                                whileTap={{ scale: 0.97 }}
                                                onClick={saveMpToken}
                                                disabled={mpTokenSaving}
                                                className="px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-[0.15em] bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                {mpTokenSaved ? <Check size={16} /> : (mpTokenSaving ? '...' : 'Save')}
                                            </motion.button>
                                        </div>
                                        {mpTokenSaved && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><Check size={12} /> Token saved</p>}
                                        {!mpTokenSaved && mpTokenInput && <p className="text-xs text-stone-400 dark:text-white mt-1">Click Save to update</p>}
                                        {!mpTokenSaved && !mpTokenInput && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{t('mp_token_required') || 'Token required for payments'}</p>}
                                    </div>

                                    {/* Alias */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-2">{t('mp_alias_optional') || 'MP Alias (Optional)'}</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="yourstore.mp"
                                                value={mpAliasInput}
                                                onChange={(e) => setMpAliasInput(e.target.value)}
                                                className="flex-1 px-4 py-3 rounded-2xl text-sm bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-400 dark:placeholder-[#64748b] outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                            <motion.button
                                                whileTap={{ scale: 0.97 }}
                                                onClick={saveMpAlias}
                                                disabled={mpAliasSaving}
                                                className="px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-[0.15em] bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                {mpAliasSaved ? <Check size={16} /> : (mpAliasSaving ? '...' : 'Save')}
                                            </motion.button>
                                        </div>
                                        {mpAliasSaved && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><Check size={12} /> Alias saved</p>}
                                        {!mpAliasSaved && <p className="text-xs text-stone-400 dark:text-white mt-1">{t('mp_alias_info') || 'Your custom Mercado Pago alias'}</p>}
                                    </div>

                                    {/* Discord Webhook */}
                                    <div className="border-t border-stone-100 dark:border-white/5 pt-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-2">Discord Webhook</label>
                                        <p className="text-xs text-stone-400 dark:text-white mb-2">Send payment requests to Discord when drivers deliver</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="password"
                                                placeholder="https://discord.com/api/webhooks/..."
                                                value={discordWebhookInput}
                                                onChange={(e) => setDiscordWebhookInput(e.target.value)}
                                                className="flex-1 px-4 py-3 rounded-2xl text-sm bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-400 dark:placeholder-[#64748b] outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                            <motion.button
                                                whileTap={{ scale: 0.97 }}
                                                onClick={saveDiscordWebhook}
                                                disabled={discordWebhookSaving}
                                                className="px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-[0.15em] bg-stone-900 text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                {discordWebhookSaved ? <Check size={16} /> : (discordWebhookSaving ? '...' : 'Save')}
                                            </motion.button>
                                        </div>
                                        {discordWebhookSaved && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><Check size={12} /> Webhook saved</p>}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Business Currency */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
                    <SectionHeader
                        icon={<Globe size={14} />}
                        title="Business Currency"
                        isOpen={openSections.currency}
                        onToggle={() => toggleSection('currency')}
                    />
                    <AnimatePresence>
                        {openSections.currency && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="rounded-[2.5rem] bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 p-6 md:p-8 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                                    <div className="grid grid-cols-3 md:grid-cols-3 gap-2.5">
                                        {[
                                            { code: 'ARS', flag: '🇦🇷' },
                                            { code: 'USD', flag: '💵' },
                                            { code: 'COP', flag: '🇨🇴' },
                                            { code: 'CLP', flag: '🇨🇱' },
                                            { code: 'PEN', flag: '🇵🇪' },
                                            { code: 'UYU', flag: '🇺🇾' }
                                        ].map((currency) => (
                                            <motion.button
                                                key={currency.code}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleCurrencyChange(currency.code)}
                                                disabled={currencySaving}
                                                className={`py-3 px-2 rounded-xl font-black text-sm transition-all border-2 flex flex-col items-center gap-1 ${
                                                    businessCurrency === currency.code
                                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                                                        : 'bg-stone-50 dark:bg-[#334155] border-stone-200 dark:border-white/5 text-stone-600 dark:text-white hover:border-emerald-300 dark:hover:border-emerald-500/30'
                                                }`}
                                            >
                                                <span className="text-base">{currency.flag}</span>
                                                <span>{currency.code}</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                    {currencySaved && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-3"
                                        >
                                            <Check size={12} /> Saved
                                        </motion.p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Language */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                    <SectionHeader
                        icon={<Globe size={14} />}
                        title={t('language_setting') || 'Language'}
                        isOpen={openSections.language}
                        onToggle={() => toggleSection('language')}
                    />
                    <AnimatePresence>
                        {openSections.language && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="rounded-[2.5rem] overflow-hidden bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 p-2 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                                    {['EN', 'ES', 'PT'].map((l) => {
                                        const isSelected = (pendingLanguage || lang) === l.toLowerCase()
                                        const isPending = pendingLanguage === l.toLowerCase()
                                        return (
                                            <button
                                                key={l}
                                                onClick={() => handleLanguageChange(l.toLowerCase())}
                                                className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium border-b border-stone-100 dark:border-white/5 last:border-0 transition-colors ${
                                                    isPending
                                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        : isSelected
                                                            ? 'text-stone-950 dark:text-white'
                                                            : 'text-stone-400 dark:text-white'
                                                }`}
                                            >
                                                <span>{l}</span>
                                                {isPending && <Check size={16} className="text-emerald-600 dark:text-emerald-400" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Team Management */}
                <TeamManagement businessId={businessId} t={t} primaryColor={tenantData?.primary_color} isOpen={openSections.team} onToggle={() => toggleSection('team')} />

                {/* Superadmin */}
                {session?.role === 'superadmin' && (
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/admin')}
                        className="w-full py-4 rounded-[2.5rem] flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.2em] bg-stone-950 dark:bg-violet-500/10 border border-stone-900 dark:border-violet-500/20 text-white dark:text-violet-400 hover:bg-stone-800 dark:hover:bg-violet-500/20 transition-colors shadow-lg"
                    >
                        <Shield size={16} />
                        {t('system_admin') || 'System Admin'}
                    </motion.button>
                )}

            </main>

            {/* Backend Navigation */}
            <BackendNav
                role="owner"
                useRoutes={true}
            />

            {/* 🌍 LANGUAGE SAVE TOAST */}
            <AnimatePresence>
                {languageSaveStatus && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg text-sm font-semibold text-white flex items-center gap-2 z-[9999] ${
                            languageSaveStatus.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                    >
                        {languageSaveStatus.type === 'error' ? <X size={14} /> : <Check size={14} />}
                        {languageSaveStatus.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🌍 LANGUAGE UNSAVED CHANGES BAR */}
            <AnimatePresence>
                {pendingLanguage && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-24 left-4 right-4 bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white px-5 py-4 rounded-2xl flex justify-between items-center shadow-2xl z-[10000]"
                    >
                        <span className="text-sm font-semibold">🌍 {t('unsaved_changes_warning') || 'Unsaved changes'}</span>
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={saveLanguage}
                            disabled={languageSaving}
                            className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-[0.15em] disabled:opacity-50"
                        >
                            {languageSaving ? (t('saving_btn') || 'Saving...') : (t('save') || 'Save')}
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 📊 Backend Auditor - Side Drawer */}
            <AnimatePresence>
                {showAuditor && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-[9999]"
                            onClick={() => setShowAuditor(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                            className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[400px] bg-white dark:bg-[#0f172a] border-l border-stone-200 dark:border-white/5 z-[10000] flex flex-col overflow-hidden"
                        >
                            <div className="px-5 py-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
                                <span className="text-stone-950 dark:text-white font-bold text-base flex items-center gap-2">
                                    <BarChart3 size={18} className="text-emerald-600 dark:text-emerald-400" />
                                    {t('cloud_vault') || 'Cloud Vault'}
                                </span>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setShowAuditor(false)}
                                    className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                                >
                                    <X size={18} />
                                </motion.button>
                            </div>
                            <div className="flex-1 overflow-auto p-4">
                                <pre className="text-emerald-600 dark:text-emerald-400 text-xs font-mono whitespace-pre-wrap break-words">
                                    {JSON.stringify(tenantData, (key, value) => {
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
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

/* ── Sub-components ── */

function SectionHeader({ icon, title, isOpen, onToggle }) {
    return (
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-1 mb-8 md:mb-12"
            disabled={!onToggle}
        >
            <div className="flex items-center gap-3">
                <div className="h-6 w-1 bg-emerald-600 rounded-full" />
                <h3 className="font-['Outfit',sans-serif] font-black text-xl md:text-2xl italic tracking-tight text-stone-950 dark:!text-white">
                    {title}
                </h3>
            </div>
            {onToggle && (
                <ChevronDown
                    size={16}
                    className={`text-stone-400 dark:text-emerald-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            )}
        </button>
    )
}

function MenuRow({ icon, label, subValue, value, highlight }) {
    return (
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-white/5 last:border-0">
            <div className="flex items-center gap-3">
                <span className="text-stone-400 dark:text-white">{icon}</span>
                <div>
                    <p className="text-sm font-bold text-stone-950 dark:text-white">{label}</p>
                    {subValue && <p className="text-xs text-stone-400 dark:text-white font-medium">{subValue}</p>}
                </div>
            </div>
            {value && (
                <span className={`text-sm font-black ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500 dark:text-white'}`}>
                    {value}
                </span>
            )}
        </div>
    )
}

function InputField({ label, value, onChange, placeholder, type = 'text' }) {
    return (
        <div>
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] dark:text-emerald-400 block mb-2">
                {label}
            </label>
            <input
                type={type}
                value={value || ''}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full px-6 py-4 rounded-2xl text-base font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-300 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
            />
        </div>
    )
}

function ToggleSwitch({ checked, onChange }) {
    return (
        <button
            onClick={onChange}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                checked ? 'bg-emerald-500' : 'bg-stone-200 dark:bg-[#334155]'
            }`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    )
}

function TeamManagement({ businessId, t, primaryColor, isOpen, onToggle }) {
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <SectionHeader
                icon={<Users size={14} />}
                title={t('team_management') || 'Team Management'}
                isOpen={isOpen}
                onToggle={onToggle}
            />
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="rounded-[2.5rem] overflow-hidden bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                            {!showAddForm ? (
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="w-full py-3.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 border-b border-stone-100 dark:border-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-colors"
                                >
                                    + {t('add_staff') || 'Add Staff Member'}
                                </button>
                            ) : (
                                <div className="p-4 space-y-3 border-b border-stone-100 dark:border-white/5">
                                    <InputField
                                        label={t('name') || 'Name'}
                                        value={newStaff.name}
                                        onChange={(e) => setNewStaff(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Juan García"
                                    />
                                    <InputField
                                        label={t('username') || 'Username'}
                                        value={newStaff.email}
                                        onChange={(e) => setNewStaff(p => ({ ...p, email: e.target.value }))}
                                        placeholder="juan_kitchen"
                                    />
                                    <InputField
                                        label={`PIN (${t('4_digits') || '4 digits'})`}
                                        type="password"
                                        value={newStaff.pin}
                                        onChange={(e) => setNewStaff(p => ({ ...p, pin: e.target.value }))}
                                        placeholder="1234"
                                    />
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-2">{t('role') || 'Role'}</label>
                                        <select
                                            value={newStaff.role}
                                            onChange={(e) => setNewStaff(p => ({ ...p, role: e.target.value }))}
                                            className="w-full px-6 py-4 rounded-2xl text-base font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white outline-none focus:bg-white focus:border-emerald-600 transition-all"
                                        >
                                            {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleAddStaff}
                                            disabled={saving || !newStaff.name || !newStaff.email || !newStaff.pin}
                                            className="flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-[0.15em] bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {saving ? '...' : (t('save') || 'Save')}
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => { setShowAddForm(false); setNewStaff({ name: '', email: '', pin: '', role: 'cook' }); }}
                                            className="flex-1 py-3 rounded-2xl text-sm font-bold bg-stone-100 dark:bg-[#334155] text-stone-600 dark:text-white hover:bg-stone-200 dark:hover:bg-[#475569] transition-colors"
                                        >
                                            {t('cancel') || 'Cancel'}
                                        </motion.button>
                                    </div>
                                </div>
                            )}

                            {loading ? (
                                <div className="text-center py-6 text-stone-400 dark:text-white text-sm">...</div>
                            ) : staffList.length === 0 ? (
                                <div className="text-center py-6 text-stone-400 dark:text-white text-sm">
                                    {t('no_staff') || 'No staff registered'}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-white/5">
                                    {staffList.map(staff => (
                                        <div key={staff.id} className="flex items-center justify-between px-4 py-3">
                                            <div>
                                                <div className="text-sm font-medium text-stone-950 dark:text-white">{staff.name}</div>
                                                <div className="text-xs text-stone-400 dark:text-white">@{staff.email} • {staff.role}</div>
                                            </div>
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleDeleteStaff(staff.id)}
                                                className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                                            >
                                                {t('remove') || 'Remove'}
                                            </motion.button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

export default OwnerSummary
