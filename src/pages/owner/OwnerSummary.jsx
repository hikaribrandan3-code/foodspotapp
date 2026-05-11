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
import OnboardingModal from '../../components/Onboarding/OnboardingModal.jsx'
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
    const [paymentMethodsLocal, setPaymentMethodsLocal] = useState({ cash: true, mercado_pago: true, whatsapp: false })
    const [showAuditor, setShowAuditor] = useState(false)
    const [showOnboarding, setShowOnboarding] = useState(false)
    const debounceTimerRef = useRef(null)
    const businessInfoDebounceRef = useRef(null)
    const [mpAliasInput, setMpAliasInput] = useState('')
    const [mpAliasSaved, setMpAliasSaved] = useState(false)
    const [mpAliasSaving, setMpAliasSaving] = useState(false)
    const mpAliasInitialized = useRef(false)

    // External Links local state
    const [instagramInput, setInstagramInput] = useState('')
    const instagramInitialized = useRef(false)

    const [tiktokInput, setTiktokInput] = useState('')
    const tiktokInitialized = useRef(false)

    // MP Access Token local state
    const [mpTokenInput, setMpTokenInput] = useState('')
    const [mpTokenSaving, setMpTokenSaving] = useState(false)
    const [mpTokenSaved, setMpTokenSaved] = useState(false)
    const mpTokenInitialized = useRef(false)

    // Business Currency
    const [businessCurrency, setBusinessCurrency] = useState('ARS')
    const [currencySaving, setCurrencySaving] = useState(false)
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

    // 🌍 LANGUAGE — now auto-saves via changeLanguage() directly

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

    // Check if onboarding is complete
    useEffect(() => {
        if (tenantData?.branding && !tenantData.branding.onboarding_data) {
            setShowOnboarding(true)
        }
    }, [tenantData?.branding?.onboarding_data])

    const handleOnboardingComplete = async (formData) => {
        try {
            await supabase
                .from('branding')
                .update({ onboarding_data: formData })
                .eq('business_id', businessId)
            setShowOnboarding(false)
            await refreshTenantData()
        } catch (err) {
            console.error('Failed to save onboarding:', err)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        clearAuth()
        window.location.href = `/${tenantSlug}`
    }

    const handleLanguageChange = async (newLang) => {
        try {
            await changeLanguage(newLang)
            setAutoSaveStatus({ type: 'language', timestamp: Date.now() })
            setTimeout(() => setAutoSaveStatus(null), 2000)
        } catch (err) {
            console.error('Language save failed:', err)
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
    const [autoSaveStatus, setAutoSaveStatus] = useState(null) // { type: 'venue'|'links'|'currency'|'language', timestamp }

    // Ref to always read latest businessInfoLocal inside async callbacks
    const businessInfoLocalRef = useRef(businessInfoLocal)
    useEffect(() => {
        businessInfoLocalRef.current = businessInfoLocal
    }, [businessInfoLocal])

    // Ref for payment methods
    const paymentMethodsLocalRef = useRef(paymentMethodsLocal)
    useEffect(() => {
        paymentMethodsLocalRef.current = paymentMethodsLocal
    }, [paymentMethodsLocal])

    // 🛡️ TYPING LOCK: Block server sync while user is actively editing
    const isTypingRef = useRef(false)

    // Sync local businessInfo from server on mount — ONLY when appConfig actually changes from server
    const lastSyncedAppConfigRef = useRef(null)
    useEffect(() => {
        if (isTypingRef.current) return // NEVER overwrite while user is typing
        const appConfigKey = JSON.stringify(appConfig?.businessInfo)
        if (lastSyncedAppConfigRef.current === appConfigKey) return
        lastSyncedAppConfigRef.current = appConfigKey
        setBusinessInfoLocal(appConfig?.businessInfo || {})
    }, [appConfig?.businessInfo])

    // Sync payment methods from server
    useEffect(() => {
        const paymentMethods = appConfig?.payment_methods || { cash: true, mercado_pago: true, whatsapp: false }
        setPaymentMethodsLocal(paymentMethods)
    }, [appConfig?.payment_methods])

    // Optimistic + debounced save
    const updateBusinessInfo = (field, value) => {
        setBusinessInfoLocal(prev => {
            const next = { ...prev, [field]: value }

            if (businessInfoDebounceRef.current) clearTimeout(businessInfoDebounceRef.current)
            businessInfoDebounceRef.current = setTimeout(async () => {
                const currentLocal = businessInfoLocalRef.current
                // Merge: server base + all local edits (ensures clears are preserved)
                const newBusinessInfo = { ...appConfig?.businessInfo, ...currentLocal }
                const updatedConfig = { ...appConfig, businessInfo: newBusinessInfo }
                try {
                    await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
                    await refreshTenantData()
                } catch (e) {
                    console.error('Save failed:', e)
                }
            }, 800)

            return next
        })
    }

    // Update payment methods
    const updatePaymentMethods = async (field, value) => {
        setPaymentMethodsLocal(prev => {
            const next = { ...prev, [field]: value }

            // Immediately save to database
            const updatedConfig = { ...appConfig, payment_methods: next }
            supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
                .then(() => {
                    refreshTenantData()
                    setAutoSaveStatus({ type: 'venue', timestamp: Date.now() })
                    setTimeout(() => setAutoSaveStatus(null), 2000)
                })
                .catch(e => console.error('Payment methods save failed:', e))

            return next
        })
    }

    // Trigger pill on blur
    const showVenueSavedPill = () => {
        setTimeout(() => {
            setAutoSaveStatus({ type: 'venue', timestamp: Date.now() })
            setTimeout(() => setAutoSaveStatus(null), 2000)
        }, 300)
    }

    const showLinksSavedPill = () => {
        setTimeout(() => {
            setAutoSaveStatus({ type: 'links', timestamp: Date.now() })
            setTimeout(() => setAutoSaveStatus(null), 2000)
        }, 300)
    }

    const showCurrencySavedPill = () => {
        setTimeout(() => {
            setAutoSaveStatus({ type: 'currency', timestamp: Date.now() })
            setTimeout(() => setAutoSaveStatus(null), 2000)
        }, 300)
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

    const saveBusinessCurrency = async (currencyCode) => {
        setCurrencySaving(true)
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

        try {
            const updatedConfig = { ...appConfig, businessCurrency: currencyCode }
            await supabase
                .from('branding')
                .update({ app_config: updatedConfig })
                .eq('business_id', businessId)

            setBusinessCurrency(currencyCode)
            setAutoSaveStatus({ type: 'currency', timestamp: Date.now() })
            setTimeout(() => setAutoSaveStatus(null), 2000)
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

    const saveExternalLink = async (field, input) => {
        try {
            const updates = { [field]: input }
            const updatedConfig = { ...appConfig, externalOrdering: { ...appConfig?.externalOrdering, ...updates } }
            await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
        } catch (err) {
            console.error('Failed to save:', err)
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
            <OnboardingModal isOpen={showOnboarding} onComplete={handleOnboardingComplete} />
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
                                    <div>
                                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] dark:text-emerald-400 block mb-2">
                                            {t('whatsapp_contact') || 'WhatsApp'}
                                        </label>
                                        <input
                                            type="text"
                                            value={businessInfoLocal?.whatsapp || ''}
                                            onFocus={() => { isTypingRef.current = true }}
                                            onChange={(e) => updateBusinessInfo('whatsapp', e.target.value)}
                                            onBlur={() => { isTypingRef.current = false; showVenueSavedPill() }}
                                            placeholder={t('phone_placeholder') || '+1 (555) 000-0000'}
                                            className="w-full px-6 py-4 rounded-2xl text-base font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-300 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
                                        />
                                    </div>

                                    {/* WhatsApp Payment Toggle */}
                                    <div>
                                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] dark:text-emerald-400 block mb-3">
                                            ✅ {t('whatsapp_payment') || 'Enable WhatsApp Payment'}
                                        </label>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => updatePaymentMethods('whatsapp', true)}
                                                className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                                                    paymentMethodsLocal?.whatsapp
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                                                        : 'bg-stone-100 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                                                }`}
                                            >
                                                {paymentMethodsLocal?.whatsapp ? '✓ Enabled' : 'Enable'}
                                            </button>
                                            <button
                                                onClick={() => updatePaymentMethods('whatsapp', false)}
                                                className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                                                    !paymentMethodsLocal?.whatsapp
                                                        ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500 text-red-700 dark:text-red-400'
                                                        : 'bg-stone-100 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                                                }`}
                                            >
                                                {!paymentMethodsLocal?.whatsapp ? '✓ Disabled' : 'Disable'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 md:p-8 space-y-4 border border-stone-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400">{t('location_label') || 'Location'}</p>
                                        <div>
                                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] dark:text-emerald-400 block mb-2">
                                                {t('address_label') || 'Address'}
                                            </label>
                                            <input
                                                type="text"
                                                value={businessInfoLocal?.address || ''}
                                                onFocus={() => { isTypingRef.current = true }}
                                                onChange={(e) => updateBusinessInfo('address', e.target.value)}
                                                onBlur={() => { isTypingRef.current = false; showVenueSavedPill() }}
                                                placeholder={t('address_placeholder') || '123 Main St'}
                                                className="w-full px-6 py-4 rounded-2xl text-base font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-300 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
                                            />
                                        </div>

                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] dark:text-emerald-400 block mb-2">
                                            {t('business_hours') || 'Business Hours'}
                                        </label>
                                        <input
                                            type="text"
                                            value={businessInfoLocal?.hours || ''}
                                            onFocus={() => { isTypingRef.current = true }}
                                            onChange={(e) => updateBusinessInfo('hours', e.target.value)}
                                            onBlur={() => { isTypingRef.current = false; showVenueSavedPill() }}
                                            placeholder={t('hours_placeholder') || 'Mon-Fri 9:00-21:00, Sat-Sun 10:00-18:00'}
                                            className="w-full px-6 py-4 rounded-2xl text-base font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-300 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
                                        />
                                    </div>
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
                                        <input
                                            type="text"
                                            placeholder="https://instagram.com/yourrestaurant"
                                            value={instagramInput}
                                            onChange={(e) => {
                                                setInstagramInput(e.target.value)
                                                saveExternalLink('instagramUrl', e.target.value)
                                            }}
                                            onBlur={showLinksSavedPill}
                                            className="w-full px-6 py-4 rounded-2xl text-base font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-300 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-2">TikTok</label>
                                        <input
                                            type="text"
                                            placeholder="https://tiktok.com/@yourrestaurant"
                                            value={tiktokInput}
                                            onChange={(e) => {
                                                setTiktokInput(e.target.value)
                                                saveExternalLink('tiktokUrl', e.target.value)
                                            }}
                                            onBlur={showLinksSavedPill}
                                            className="w-full px-6 py-4 rounded-2xl text-base font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-300 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
                                        />
                                    </div>


                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Mercado Pago */}
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
                                    {/* MP Alias only (access token nerfed for MVP) */}
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
                                        const isSelected = lang === l.toLowerCase()
                                        return (
                                            <button
                                                key={l}
                                                onClick={() => handleLanguageChange(l.toLowerCase())}
                                                className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium border-b border-stone-100 dark:border-white/5 last:border-0 transition-colors ${
                                                    isSelected
                                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                                                        : 'text-stone-400 dark:text-white hover:bg-stone-50 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <span>{l}</span>
                                                {isSelected && <Check size={16} className="text-emerald-600 dark:text-emerald-400" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Team Management */}
                <TeamManagement businessId={businessId} t={t} primaryColor={tenantData?.confirmation_color} isOpen={openSections.team} onToggle={() => toggleSection('team')} onSaved={() => { setAutoSaveStatus({ type: 'team', timestamp: Date.now() }); setTimeout(() => setAutoSaveStatus(null), 2000) }} />

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

            {/* ✅ GLOBAL AUTO-SAVE PILL */}
            <AnimatePresence>
                {autoSaveStatus && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-lg text-sm font-semibold text-white bg-emerald-600 flex items-center gap-2 z-[9999]"
                    >
                        <Check size={14} />
                        Saved
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🌍 Language now auto-saves — no manual save bar needed */}

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

function TeamManagement({ businessId, t, primaryColor, isOpen, onToggle, onSaved }) {
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
            onSaved?.()
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
        onSaved?.()
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
