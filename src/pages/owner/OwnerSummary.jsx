import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    User, CreditCard, Banknote, DollarSign, MapPin, Link as LinkIcon, Globe,
    Settings, Phone, ChevronRight, ChevronDown, RefreshCw, BarChart3,
    Shield, Check, X, Users, Moon, Sun, QrCode, Copy, Download, Gift
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { clearAuth } from '../../utils/storage.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import OnboardingModal from '../../components/Onboarding/OnboardingModal.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import { getLoyaltySettings, upsertLoyaltySettings, getLoyaltyFreeItems, saveLoyaltyFreeItems } from '../../lib/loyaltyClient.js'
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
    const { t, lang } = useLanguage()
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

    const [mapsInput, setMapsInput] = useState('')
    const mapsInitialized = useRef(false)

    const [googleReviewInput, setGoogleReviewInput] = useState('')
    const googleReviewInitialized = useRef(false)

    // MP Access Token local state
    const [mpTokenInput, setMpTokenInput] = useState('')
    const [mpTokenSaving, setMpTokenSaving] = useState(false)
    const [mpTokenSaved, setMpTokenSaved] = useState(false)
    const mpTokenInitialized = useRef(false)

    // MP User ID local state
    const [mpUserIdInput, setMpUserIdInput] = useState('')
    const [mpUserIdSaving, setMpUserIdSaving] = useState(false)
    const [mpUserIdSaved, setMpUserIdSaved] = useState(false)
    const mpUserIdInitialized = useRef(false)

    // Dine-In Reservations toggle
    const [dineInEnabled, setDineInEnabled] = useState(false)
    const dineInInitialized = useRef(false)
    useEffect(() => {
        if (!dineInInitialized.current && tenantData) {
            const fromConfig = tenantData?.app_config?.service_modes?.dineIn
            const fromColumn = tenantData?.dine_in_enabled
            setDineInEnabled(fromConfig ?? fromColumn ?? false)
            dineInInitialized.current = true
        }
    }, [tenantData])

    const toggleDineIn = async (value) => {
        setDineInEnabled(value)
        const updatedConfig = {
            ...appConfig,
            service_modes: { ...(appConfig?.service_modes || {}), dineIn: value }
        }
        await supabase.from('branding').update({
            dine_in_enabled: value,
            app_config: updatedConfig
        }).eq('business_id', businessId)
        await refreshTenantData()
        setAutoSaveStatus({ type: 'venue', timestamp: Date.now() })
        setTimeout(() => setAutoSaveStatus(null), 2000)
    }

    // Business Currency
    const [businessCurrency, setBusinessCurrency] = useState('ARS')
    const [currencySaving, setCurrencySaving] = useState(false)
    const businessCurrencyInitialized = useRef(false)

    const qrCanvasRef = useRef(null)
    const [urlCopied, setUrlCopied] = useState(false)
    const storeUrl = `${window.location.protocol}//${window.location.host}/${tenantSlug}`

    const downloadQR = () => {
        const canvas = qrCanvasRef.current
        if (!canvas) return
        const url = canvas.toDataURL('image/png')
        const a = document.createElement('a')
        a.href = url
        a.download = `qr-${tenantSlug}.png`
        a.click()
    }

    const copyStoreUrl = () => {
        navigator.clipboard.writeText(storeUrl)
        setUrlCopied(true)
        setTimeout(() => setUrlCopied(false), 2000)
    }

    // Collapsible sections
    const [openSections, setOpenSections] = useState({
        payments: true,
        venue: true,
        links: false,
        mp: false,
        currency: true,
        qr: false,
        language: true,
        team: false,
        loyalty: false,
    })
    const toggleSection = (key) => setOpenSections(p => ({ ...p, [key]: !p[key] }))

    // ─── LOYALTY REWARDS STATE ──────────────────────────────────────
    const [loyaltyEnabled, setLoyaltyEnabled] = useState(false)
    const [loyaltyMinOrder, setLoyaltyMinOrder] = useState('8000')
    const [loyaltyPointsPerOrder, setLoyaltyPointsPerOrder] = useState('50')
    const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState('100')
    const [loyaltyMenuItems, setLoyaltyMenuItems] = useState([])
    const [loyaltyFreeSlots, setLoyaltyFreeSlots] = useState(['', '', ''])
    const [loyaltyItemCosts, setLoyaltyItemCosts] = useState({})
    const [ugcPointsPerShare, setUgcPointsPerShare] = useState('10')
    const [referralPoints, setReferralPoints] = useState('100')
    const [loyaltySaving, setLoyaltySaving] = useState(false)
    const [loyaltySaved, setLoyaltySaved] = useState(false)
    const loyaltyInitialized = useRef(false)

    useEffect(() => {
        if (!businessId || loyaltyInitialized.current) return
        loyaltyInitialized.current = true

        const load = async () => {
            const [{ data: settings }, { data: freeItems }, { data: menuItems }] = await Promise.all([
                getLoyaltySettings(businessId),
                getLoyaltyFreeItems(businessId),
                supabase.from('menu_items').select('id, name, price').eq('business_id', businessId).eq('available', true).order('name'),
            ])
            if (settings) {
                setLoyaltyEnabled(settings.enabled ?? false)
                setLoyaltyMinOrder(String(Math.round((settings.min_order_cents ?? 800000) / 100)))
                setLoyaltyPointsPerOrder(String(settings.points_per_order ?? 50))
                setLoyaltyPointsToRedeem(String(settings.points_to_redeem ?? 100))
                setLoyaltyItemCosts(settings.item_point_costs ?? {})
                setUgcPointsPerShare(String(settings.ugc_points_per_share ?? 10))
                setReferralPoints(String(settings.referral_points ?? 100))
            }
            if (freeItems?.length) {
                const slots = ['', '', '']
                freeItems.forEach((item, i) => { if (i < 3) slots[i] = item.menu_item_id })
                setLoyaltyFreeSlots(slots)
            }
            if (menuItems) setLoyaltyMenuItems(menuItems)
        }
        load()
    }, [businessId])

    const saveLoyalty = async () => {
        if (!businessId) return
        setLoyaltySaving(true)
        const minCents = Math.round(parseFloat(loyaltyMinOrder || '0') * 100)
        await upsertLoyaltySettings({
            enabled: loyaltyEnabled,
            min_order_cents: minCents,
            points_per_order: parseInt(loyaltyPointsPerOrder || '50'),
            points_to_redeem: parseInt(loyaltyPointsToRedeem || '100'),
            item_point_costs: loyaltyItemCosts,
            ugc_points_per_share: parseInt(ugcPointsPerShare || '10'),
            referral_points: parseInt(referralPoints || '100'),
        }, businessId)
        const chosenItems = loyaltyFreeSlots
            .map(id => loyaltyMenuItems.find(m => m.id === id))
            .filter(Boolean)
            .map(m => ({ menu_item_id: m.id, menu_item_name: m.name }))
        await saveLoyaltyFreeItems(chosenItems, businessId)
        setLoyaltySaving(false)
        setLoyaltySaved(true)
        setTimeout(() => setLoyaltySaved(false), 2000)
    }

    // ☁️ CLOUD LEDGER STATE — permanent revenue source (survives order deletion)
    const [ledgerEntries, setLedgerEntries] = useState([])
    const [ordersLoading, setOrdersLoading] = useState(true)

    useEffect(() => {
        if (!businessId) return
        let cancelled = false

        const fetchLedger = async () => {
            setOrdersLoading(true)
            const monthAgo = new Date()
            monthAgo.setDate(monthAgo.getDate() - 30)

            const { data, error } = await supabase
                .from('transaction_ledger')
                .select('id, amount_gross_cents, payment_method, processed_at')
                .eq('business_id', businessId)
                .eq('transaction_type', 'payment')
                .eq('status', 'completed')
                .gte('processed_at', monthAgo.toISOString())
                .order('processed_at', { ascending: false })

            if (!cancelled && !error && data) {
                setLedgerEntries(data)
            }
            if (!cancelled) setOrdersLoading(false)
        }

        fetchLedger()

        const subscription = supabase
            .channel(`summary-ledger-${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'transaction_ledger',
                    filter: `business_id=eq.${businessId}`
                },
                () => {
                    if (!cancelled) fetchLedger()
                }
            )
            .subscribe()

        const interval = setInterval(fetchLedger, 30000)
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

    // Stats from transaction_ledger (permanent, delete-proof)
    const stats = useMemo(() => {
        const today = new Date().toDateString()
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)

        const todayEntries = ledgerEntries.filter(l => new Date(l.processed_at).toDateString() === today)
        const mpEntries = todayEntries.filter(l => l.payment_method !== 'cash')
        const cashEntries = todayEntries.filter(l => l.payment_method === 'cash')
        const mpTotal = mpEntries.reduce((sum, l) => sum + (l.amount_gross_cents || 0), 0) / 100
        const cashTotal = cashEntries.reduce((sum, l) => sum + (l.amount_gross_cents || 0), 0) / 100

        const weekEntries = ledgerEntries.filter(l => new Date(l.processed_at) >= weekAgo)

        return {
            todayOrders: todayEntries, mpOrders: mpEntries, cashOrders: cashEntries,
            mpTotal, cashTotal,
            totalToday: mpTotal + cashTotal,
            weekCount: weekEntries.length,
            monthCount: ledgerEntries.length
        }
    }, [ledgerEntries])

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
            }, 300)

            return next
        })
    }

    // 🚽 Flush debounced save immediately (used on blur to prevent lost digits)
    const flushBusinessInfoSave = async () => {
        if (businessInfoDebounceRef.current) {
            clearTimeout(businessInfoDebounceRef.current)
            businessInfoDebounceRef.current = null
        }
        const currentLocal = businessInfoLocalRef.current
        const newBusinessInfo = { ...appConfig?.businessInfo, ...currentLocal }
        const updatedConfig = { ...appConfig, businessInfo: newBusinessInfo }
        try {
            await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
            await refreshTenantData()
        } catch (e) {
            console.error('Flush save failed:', e)
        }
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

    useEffect(() => {
        if (!mapsInitialized.current && appConfig?.externalOrdering?.mapsLink !== undefined) {
            setMapsInput(appConfig.externalOrdering.mapsLink || '')
            mapsInitialized.current = true
        }
    }, [appConfig?.externalOrdering?.mapsLink])

    useEffect(() => {
        if (!googleReviewInitialized.current && appConfig?.externalOrdering?.googleReviewUrl !== undefined) {
            setGoogleReviewInput(appConfig.externalOrdering.googleReviewUrl || '')
            googleReviewInitialized.current = true
        }
    }, [appConfig?.externalOrdering?.googleReviewUrl])

    // Sync MP Token from server on first load
    useEffect(() => {
        if (!mpTokenInitialized.current && tenantData?.mp_access_token !== undefined) {
            setMpTokenInput(tenantData.mp_access_token || '')
            mpTokenInitialized.current = true
        }
    }, [tenantData?.mp_access_token])

    // Sync MP User ID from server on first load
    useEffect(() => {
        if (!mpUserIdInitialized.current && tenantData?.mp_user_id !== undefined) {
            setMpUserIdInput(tenantData.mp_user_id || '')
            mpUserIdInitialized.current = true
        }
    }, [tenantData?.mp_user_id])

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

    const saveLanguage = async (lang) => {
        if (!businessId) return
        try {
            await supabase.from('businesses').update({ language: lang }).eq('id', businessId)
            setAutoSaveStatus({ type: 'language', timestamp: Date.now() })
            setTimeout(() => setAutoSaveStatus(null), 2000)
        } catch (err) {
            console.error('[OwnerSummary] Failed to save language:', err)
        }
    }

    const instagramDebounceRef = useRef(null)
    const tiktokDebounceRef = useRef(null)
    const mapsDebounceRef = useRef(null)
    const googleReviewDebounceRef = useRef(null)

    const saveExternalLink = async (field, input) => {
        const refMap = {
            instagramUrl: instagramDebounceRef,
            tiktokUrl: tiktokDebounceRef,
            mapsLink: mapsDebounceRef,
            googleReviewUrl: googleReviewDebounceRef,
        }
        const ref = refMap[field]
        if (!ref) return
        if (ref.current) clearTimeout(ref.current)
        ref.current = setTimeout(async () => {
            try {
                const updates = { [field]: input }
                const updatedConfig = { ...appConfig, externalOrdering: { ...appConfig?.externalOrdering, ...updates } }
                await supabase.from('branding').update({ app_config: updatedConfig }).eq('business_id', businessId)
            } catch (err) {
                console.error('Failed to save:', err)
            }
        }, 600)
    }

    const saveMpToken = async () => {
        setMpTokenSaving(true)
        setMpTokenSaved(false)
        const { error } = await supabase.from('branding').update({ mp_access_token: mpTokenInput }).eq('business_id', businessId)
        if (error) {
            console.error('Failed to save MP token:', error)
            alert('Error al guardar token MP: ' + error.message)
        } else {
            setMpTokenSaved(true)
            setTimeout(() => setMpTokenSaved(false), 2000)
        }
        setMpTokenSaving(false)
    }

    const saveMpUserId = async () => {
        setMpUserIdSaving(true)
        setMpUserIdSaved(false)
        const { error } = await supabase.from('branding').update({ mp_user_id: mpUserIdInput }).eq('business_id', businessId)
        if (error) {
            console.error('Failed to save MP User ID:', error)
            alert('Error al guardar MP User ID: ' + error.message)
        } else {
            setMpUserIdSaved(true)
            setTimeout(() => setMpUserIdSaved(false), 2000)
        }
        setMpUserIdSaving(false)
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
            <main className="px-4 md:px-8 pt-5 md:pt-8 pb-28 space-y-5 md:space-y-6 max-w-3xl mx-auto w-full">

                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-2xl p-4 md:p-5 flex items-center gap-3 bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 shadow-[0_20px_50px_rgba(28,25,23,0.03)]"
                >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 shrink-0">
                        <User size={20} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-['Outfit',sans-serif] font-black text-base text-stone-950 dark:text-white truncate">
                            {tenantData?.venue_name || tenantData?.business_name || 'Owner'}
                        </h2>
                        <p className="text-xs capitalize text-stone-500 dark:text-white">Owner</p>
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
                    <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
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

                {/* Features */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
                    <SectionHeader icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    } title="Features" isOpen={true} />
                    <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                        <div className="flex items-center justify-between px-4 py-3.5">
                            <div className="flex items-center gap-3">
                                <span className="text-stone-400 dark:text-white">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>
                                </span>
                                <div>
                                    <p className="text-sm font-bold text-stone-950 dark:text-white">{t('dine_in_reservations')}</p>
                                    <p className="text-xs text-stone-400 dark:text-stone-400">{t('dine_in_reservations_desc')}</p>
                                </div>
                            </div>
                            <ToggleSwitch checked={dineInEnabled} onChange={() => toggleDineIn(!dineInEnabled)} />
                        </div>
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
                                <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
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
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 rounded-2xl p-4 md:p-5 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                            <p className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-['Outfit',sans-serif]">{stats.weekCount}</p>
                            <p className="text-[10px] text-stone-400 dark:text-white mt-1 font-bold uppercase tracking-widest">{t('this_week') || 'This Week'}</p>
                        </div>
                        <div className="bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 rounded-2xl p-4 md:p-5 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                            <p className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-['Outfit',sans-serif]">{stats.monthCount}</p>
                            <p className="text-[10px] text-stone-400 dark:text-white mt-1 font-bold uppercase tracking-widest">{t('this_month') || 'This Month'}</p>
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
                                <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 p-4 md:p-5 space-y-4 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                                    <div>
                                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] dark:text-emerald-400 block mb-2">
                                            {t('whatsapp_contact') || 'WhatsApp'}
                                        </label>
                                        <input
                                            type="text"
                                            value={businessInfoLocal?.whatsapp || ''}
                                            onFocus={() => { isTypingRef.current = true }}
                                            onChange={(e) => updateBusinessInfo('whatsapp', e.target.value)}
                                            onBlur={() => { isTypingRef.current = false; flushBusinessInfoSave(); showVenueSavedPill() }}
                                            placeholder={t('phone_placeholder') || '+1 (555) 000-0000'}
                                            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-300 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
                                        />
                                    </div>

                                    {/* WhatsApp Payment Toggle */}
                                    <div>
                                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] dark:text-emerald-400 block mb-3">
                                            ✅ WhatsApp Payment
                                        </label>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => updatePaymentMethods('whatsapp', true)}
                                                className={`flex-1 px-6 py-3 rounded-2xl font-semibold text-sm transition-all ${
                                                    paymentMethodsLocal?.whatsapp
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                                                        : 'bg-stone-100 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                                                }`}
                                            >
                                                {paymentMethodsLocal?.whatsapp ? '✓ Enabled' : 'Enable'}
                                            </button>
                                            <button
                                                onClick={() => updatePaymentMethods('whatsapp', false)}
                                                className={`flex-1 px-6 py-3 rounded-2xl font-semibold text-sm transition-all ${
                                                    !paymentMethodsLocal?.whatsapp
                                                        ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500 text-red-700 dark:text-red-400'
                                                        : 'bg-stone-100 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                                                }`}
                                            >
                                                {!paymentMethodsLocal?.whatsapp ? '✓ Disabled' : 'Disable'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-4 space-y-3 border border-stone-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
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
                                                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-300 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
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
                                            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-300 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
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
                                <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 p-4 md:p-5 space-y-4 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
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
                                            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-300 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
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
                                            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-300 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-2">{t('maps_link') || 'Google Maps'}</label>
                                        <input
                                            type="text"
                                            placeholder="https://maps.google.com/..."
                                            value={mapsInput}
                                            onChange={(e) => {
                                                setMapsInput(e.target.value)
                                                saveExternalLink('mapsLink', e.target.value)
                                            }}
                                            onBlur={showLinksSavedPill}
                                            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-300 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-2">{t('google_review_url') || 'Google Review Link'}</label>
                                        <input
                                            type="text"
                                            placeholder="https://g.page/.../review"
                                            value={googleReviewInput}
                                            onChange={(e) => {
                                                setGoogleReviewInput(e.target.value)
                                                saveExternalLink('googleReviewUrl', e.target.value)
                                            }}
                                            onBlur={showLinksSavedPill}
                                            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-300 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
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
                                <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 p-4 md:p-5 space-y-4 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                                    {/* MP Alias */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-2">{t('mp_alias_optional') || 'MP Alias (Optional)'}</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="yourstore.mp"
                                                value={mpAliasInput}
                                                onChange={(e) => setMpAliasInput(e.target.value)}
                                                className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-400 dark:placeholder-[#64748b] outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                            <motion.button
                                                whileTap={{ scale: 0.97 }}
                                                onClick={saveMpAlias}
                                                disabled={mpAliasSaving}
                                                className="px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-[0.15em] bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                {mpAliasSaved ? <Check size={16} /> : (mpAliasSaving ? '...' : 'Save')}
                                            </motion.button>
                                        </div>
                                        {mpAliasSaved && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><Check size={12} /> Alias saved</p>}
                                        {!mpAliasSaved && <p className="text-xs text-stone-400 dark:text-white mt-1">{t('mp_alias_info') || 'Your custom Mercado Pago alias'}</p>}
                                    </div>

                                    {/* MP Access Token */}
                                    <div className="border-t border-stone-100 dark:border-stone-700 pt-4">
                                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] dark:text-emerald-400 block mb-2">
                                            {t('mp_connect_mercado_pago') || 'Access Token'}
                                        </label>
                                        <div className="space-y-2">
                                            <div className="text-[11px] text-stone-600 dark:text-stone-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2.5 border border-emerald-200 dark:border-emerald-800">
                                                <p className="font-semibold text-emerald-900 dark:text-emerald-300 mb-1">{t('mp_api_token_how_to_title')}</p>
                                                <ol className="list-decimal list-inside space-y-0.5 text-emerald-800 dark:text-emerald-200">
                                                    <li>{t('mp_api_token_step_1')} <span className="font-mono text-[10px] bg-white dark:bg-black/30 px-1 rounded">mercadopago.com</span></li>
                                                    <li>{t('mp_api_token_step_2')}</li>
                                                    <li>{t('mp_api_token_step_3')}</li>
                                                    <li>{t('mp_api_token_step_4')} <span className="font-mono text-[10px]">APP_USR</span>)</li>
                                                    <li>{t('mp_api_token_step_5')}</li>
                                                </ol>
                                            </div>
                                            <div className="flex gap-2 items-end">
                                                <input
                                                    type="password"
                                                    placeholder="APP_USR_..."
                                                    value={mpTokenInput}
                                                    onChange={(e) => setMpTokenInput(e.target.value)}
                                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-400 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
                                                />
                                                <button
                                                    onClick={saveMpToken}
                                                    disabled={mpTokenSaving || !mpTokenInput.trim()}
                                                    className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${mpTokenSaved ? 'bg-green-500 text-white' : mpTokenSaving ? 'bg-stone-300 text-stone-600 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                                                >
                                                    {mpTokenSaved ? <><Check size={14} /> Saved</> : mpTokenSaving ? <><RefreshCw size={14} className="animate-spin" /> ...</> : 'Save'}
                                                </button>
                                            </div>
                                            {mpTokenInput && !mpTokenInput.startsWith('APP_USR_') && (
                                                <p className="text-xs text-amber-600 dark:text-amber-400">{t('mp_api_token_error_prefix')}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* MP User ID */}
                                    <div className="border-t border-stone-100 dark:border-stone-700 pt-4">
                                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] dark:text-emerald-400 block mb-2">
                                            {t('mp_user_id_label')}
                                        </label>
                                        <div className="space-y-2">
                                            <div className="text-[11px] text-stone-600 dark:text-stone-300 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5 border border-blue-200 dark:border-blue-800">
                                                <p className="font-semibold text-blue-900 dark:text-blue-300 mb-1">{t('mp_user_id_how_to_title')}</p>
                                                <ol className="list-decimal list-inside space-y-0.5 text-blue-800 dark:text-blue-200">
                                                    <li>{t('mp_user_id_step_1')} <span className="font-mono text-[10px] bg-white dark:bg-black/30 px-1 rounded">mercadopago.com</span></li>
                                                    <li>{t('mp_user_id_step_2')}</li>
                                                    <li>{t('mp_user_id_step_3')}</li>
                                                    <li>{t('mp_user_id_step_4')} <span className="font-mono text-[10px]">123456789</span>)</li>
                                                    <li>{t('mp_user_id_step_5')}</li>
                                                </ol>
                                            </div>
                                            <div className="flex gap-2 items-end">
                                                <input
                                                    type="text"
                                                    placeholder="123456789"
                                                    value={mpUserIdInput}
                                                    onChange={(e) => setMpUserIdInput(e.target.value)}
                                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-400 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
                                                />
                                                <button
                                                    onClick={saveMpUserId}
                                                    disabled={mpUserIdSaving || !mpUserIdInput.trim()}
                                                    className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${mpUserIdSaved ? 'bg-green-500 text-white' : mpUserIdSaving ? 'bg-stone-300 text-stone-600 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                                                >
                                                    {mpUserIdSaved ? <><Check size={14} /> Saved</> : mpUserIdSaving ? <><RefreshCw size={14} className="animate-spin" /> ...</> : 'Save'}
                                                </button>
                                            </div>
                                            {mpUserIdInput && !/^\d+$/.test(mpUserIdInput) && (
                                                <p className="text-xs text-amber-600 dark:text-amber-400">{t('mp_user_id_error_message')}</p>
                                            )}
                                        </div>
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
                                <div className="rounded-2xl bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 p-4 md:p-5 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                                    <select
                                        value={businessCurrency}
                                        onChange={(e) => handleCurrencyChange(e.target.value)}
                                        disabled={currencySaving}
                                        className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white outline-none focus:bg-white focus:border-emerald-600 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="ARS">ARS — Argentine Peso</option>
                                        <option value="BRL">BRL — Brazilian Real</option>
                                        <option value="CLP">CLP — Chilean Peso</option>
                                        <option value="COP">COP — Colombian Peso</option>
                                        <option value="MXN">MXN — Mexican Peso</option>
                                        <option value="PEN">PEN — Peruvian Sol</option>
                                        <option value="USD">USD — US Dollar</option>
                                        <option value="UYU">UYU — Uruguayan Peso</option>
                                    </select>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Language */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
                    <SectionHeader
                        icon={<Globe size={14} />}
                        title={t('language_section')}
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
                                <div className="rounded-2xl bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 p-4 md:p-5 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                                    <select
                                        value={lang}
                                        onChange={(e) => saveLanguage(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white outline-none focus:bg-white focus:border-emerald-600 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="es">Español</option>
                                        <option value="en">English</option>
                                        <option value="pt">Português</option>
                                    </select>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Team Management */}
                <TeamManagement businessId={businessId} t={t} primaryColor={tenantData?.confirmation_color} isOpen={openSections.team} onToggle={() => toggleSection('team')} onSaved={() => { setAutoSaveStatus({ type: 'team', timestamp: Date.now() }); setTimeout(() => setAutoSaveStatus(null), 2000) }} />

                {/* Promote Your Store / QR Code */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
                    <SectionHeader
                        icon={<QrCode size={14} />}
                        title={t('qr_code_section')}
                        isOpen={openSections.qr}
                        onToggle={() => toggleSection('qr')}
                    />
                    <AnimatePresence>
                        {openSections.qr && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="rounded-2xl bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 p-4 md:p-5 space-y-4 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-2">{t('your_store_link')}</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={storeUrl}
                                                className="flex-1 px-4 py-3 rounded-2xl text-sm bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white outline-none select-all"
                                            />
                                            <motion.button
                                                whileTap={{ scale: 0.97 }}
                                                onClick={copyStoreUrl}
                                                className="px-5 py-3 rounded-2xl text-sm font-black bg-stone-100 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-600 dark:text-white flex items-center gap-2 whitespace-nowrap"
                                            >
                                                {urlCopied ? <><Check size={14} /> {t('copied')}</> : <><Copy size={14} /> {t('copy')}</>}
                                            </motion.button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-4">
                                        <div className="p-4 bg-white rounded-2xl border border-stone-200 dark:border-white/10">
                                            <QRCodeCanvas
                                                ref={qrCanvasRef}
                                                value={storeUrl}
                                                size={160}
                                                bgColor="#ffffff"
                                                fgColor="#000000"
                                                level="H"
                                            />
                                        </div>
                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={downloadQR}
                                            className="w-full py-2.5 rounded-xl text-sm font-black uppercase tracking-[0.15em] bg-emerald-600 text-white flex items-center justify-center gap-2"
                                        >
                                            <Download size={16} />
                                            {t('download_qr')}
                                        </motion.button>
                                        <p className="text-xs text-stone-400 dark:text-stone-500 text-center leading-relaxed">
                                            {t('qr_section_note')}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Loyalty Rewards */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
                    <SectionHeader
                        icon={<Gift size={14} />}
                        title={t('loyaltySection') || 'Loyalty Rewards'}
                        isOpen={openSections.loyalty}
                        onToggle={() => toggleSection('loyalty')}
                    />
                    <AnimatePresence>
                        {openSections.loyalty && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="rounded-2xl bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 p-4 md:p-5 space-y-5 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
                                    {/* ON/OFF Toggle */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-stone-950 dark:text-white">{t('loyaltyEnabled') || 'Enable Rewards Program'}</p>
                                            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{t('loyaltyEnabledHint') || 'Customers earn points on qualifying orders'}</p>
                                        </div>
                                        <button
                                            onClick={() => setLoyaltyEnabled(v => !v)}
                                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${loyaltyEnabled ? 'bg-emerald-600' : 'bg-stone-200 dark:bg-stone-700'}`}
                                        >
                                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${loyaltyEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                                        </button>
                                    </div>

                                    {loyaltyEnabled && (
                                        <div className="space-y-4 pt-1 border-t border-stone-100 dark:border-white/5">
                                            {/* Min order */}
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-1.5">{t('loyaltyMinOrder') || 'Min. Order to Earn (ARS)'}</label>
                                                <input
                                                    type="number"
                                                    value={loyaltyMinOrder}
                                                    onChange={e => setLoyaltyMinOrder(e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white outline-none focus:border-emerald-600 transition-all"
                                                    placeholder="8000"
                                                />
                                                <p className="text-xs text-stone-400 mt-1">{t('loyaltyMinOrderHint') || 'Orders above this amount earn points'}</p>
                                            </div>

                                            {/* Points per order */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-1.5">{t('loyaltyPointsEarn') || 'Points per order'}</label>
                                                    <input
                                                        type="number"
                                                        value={loyaltyPointsPerOrder}
                                                        onChange={e => setLoyaltyPointsPerOrder(e.target.value)}
                                                        className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white outline-none focus:border-emerald-600 transition-all"
                                                        placeholder="50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-1.5">{t('loyaltyPointsRedeem') || 'Points to redeem'}</label>
                                                    <input
                                                        type="number"
                                                        value={loyaltyPointsToRedeem}
                                                        onChange={e => setLoyaltyPointsToRedeem(e.target.value)}
                                                        className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white outline-none focus:border-emerald-600 transition-all"
                                                        placeholder="100"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xs text-stone-400 -mt-2">
                                                {t('loyaltyPointsHint') || `Customers redeem ${loyaltyPointsToRedeem} pts for 1 free item`}
                                            </p>

                                            {/* Free Item Pickers */}
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-2">{t('loyaltyFreeItems') || 'Free Item Options (pick up to 3)'}</label>
                                                <div className="space-y-3">
                                                    {[0, 1, 2].map(i => {
                                                        const selectedItemId = loyaltyFreeSlots[i]
                                                        const selectedItem = loyaltyMenuItems.find(m => m.id === selectedItemId)
                                                        const itemCost = selectedItem ? (loyaltyItemCosts[selectedItem.name] ?? parseInt(loyaltyPointsToRedeem || '100')) : ''
                                                        return (
                                                            <div key={i} className="flex gap-2">
                                                                <select
                                                                    value={selectedItemId}
                                                                    onChange={e => {
                                                                        const next = [...loyaltyFreeSlots]
                                                                        next[i] = e.target.value
                                                                        setLoyaltyFreeSlots(next)
                                                                    }}
                                                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white outline-none focus:border-emerald-600 transition-all appearance-none cursor-pointer"
                                                                >
                                                                    <option value="">{t('loyaltySelectItem') || `— Item ${i + 1} —`}</option>
                                                                    {loyaltyMenuItems.map(item => (
                                                                        <option key={item.id} value={item.id}>{item.name}</option>
                                                                    ))}
                                                                </select>
                                                                {selectedItem && (
                                                                    <input
                                                                        type="number"
                                                                        value={itemCost}
                                                                        onChange={e => {
                                                                            const cost = parseInt(e.target.value) || 0
                                                                            setLoyaltyItemCosts(prev => ({
                                                                                ...prev,
                                                                                [selectedItem.name]: cost
                                                                            }))
                                                                        }}
                                                                        className="w-20 px-3 py-2.5 rounded-xl text-sm font-medium bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-stone-950 dark:text-white outline-none focus:border-emerald-600 transition-all"
                                                                        placeholder="100"
                                                                        min="1"
                                                                    />
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                                <p className="text-xs text-stone-400 mt-1.5">{t('loyaltyFreeItemsHint') || 'Set point cost for each item — like arcade games!'}</p>
                                            </div>

                                            {/* UGC Receipts */}
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-1.5">{t('ugcReceipts') || 'UGC Receipts'}</label>
                                                <input
                                                    type="number"
                                                    value={ugcPointsPerShare}
                                                    onChange={e => setUgcPointsPerShare(e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white outline-none focus:border-emerald-600 transition-all"
                                                    placeholder="10"
                                                    min="0"
                                                />
                                                <p className="text-xs text-stone-400 mt-1">{t('ugcReceiptsHint') || 'Reward per photo shared — drives viral moments & customer content'}</p>
                                            </div>

                                            {/* Share & Earn */}
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-1.5">{t('referralPoints') || 'Share & Earn Points'}</label>
                                                <input
                                                    type="number"
                                                    value={referralPoints}
                                                    onChange={e => setReferralPoints(e.target.value)}
                                                    className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white outline-none focus:border-emerald-600 transition-all"
                                                    placeholder="100"
                                                    min="0"
                                                />
                                                <p className="text-xs text-stone-400 mt-1">{t('referralPointsHint') || 'Points when a friend places first order'}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Save button */}
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={saveLoyalty}
                                        disabled={loyaltySaving}
                                        className="w-full py-2.5 rounded-3xl text-sm font-black uppercase tracking-[0.15em] bg-emerald-600 text-white flex items-center justify-center gap-2 disabled:opacity-60"
                                    >
                                        {loyaltySaved ? <><Check size={14} /> {t('saved') || 'Saved'}</> : loyaltySaving ? (t('saving') || 'Saving...') : <><Gift size={14} /> {t('saveLoyalty') || 'Save Loyalty'}</>}
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

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
            className="w-full flex items-center justify-between px-1 mb-3 md:mb-4"
            disabled={!onToggle}
        >
            <div className="flex items-center gap-2.5">
                <div className="h-5 w-1 bg-emerald-600 rounded-full" />
                <h3 className="font-['Outfit',sans-serif] font-black text-base md:text-lg italic tracking-tight text-stone-950 dark:!text-white">
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
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white placeholder-stone-300 dark:placeholder-[#64748b] outline-none focus:bg-white focus:border-emerald-600 transition-all"
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
    const [newStaff, setNewStaff] = useState({ name: '', username: '', pin: '', role: 'kitchen' })
    const [saving, setSaving] = useState(false)

    const fetchStaff = async () => {
        if (!businessId) return
        setLoading(true)
        console.log('📋 [Staff Fetch] Loading staff for business:', businessId)
        localStorage.setItem('fs_business_id', businessId)
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .eq('business_id', businessId)
            .neq('status', 'inactive')
            .order('name')

        if (error) {
            console.error('❌ [Staff Fetch Error]', error)
        } else {
            console.log('✅ [Staff Fetch] Loaded', data?.length || 0, 'staff members:', data)
            setStaffList(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        if (isOpen) fetchStaff()
    }, [isOpen, businessId])

    const handleAddStaff = async () => {
        if (!newStaff.name || !newStaff.username || !newStaff.pin) return
        if (!businessId) {
            alert('Business ID not found. Please refresh the page.')
            return
        }
        setSaving(true)
        console.log('🔐 [Staff Create] Starting insert for:', { name: newStaff.name, username: newStaff.username, role: newStaff.role, businessId })

        localStorage.setItem('fs_business_id', businessId)

        const simpleHash = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16);
        }

        const { data, error } = await supabase
            .from('staff')
            .insert({
                business_id: businessId,
                name: newStaff.name,
                username: newStaff.username.toLowerCase().trim(),
                pin: simpleHash(newStaff.pin),
                role: newStaff.role
            })
            .select()

        if (!error) {
            console.log('✅ [Staff Create] Insert successful!', data)
            setNewStaff({ name: '', username: '', pin: '', role: 'kitchen' })
            setShowAddForm(false)
            console.log('🔄 [Staff Create] Fetching updated list...')
            fetchStaff()
            onSaved?.()
        } else {
            console.error('❌ [Staff Insert Error]', error)
            console.error('Error code:', error?.code)
            console.error('Error message:', error?.message)
            console.error('Error details:', error?.details)
            if (error?.code === '23505') {
                alert(`Username "@${newStaff.username}" is already taken. Try a different username.`)
            } else {
                alert(`Failed to save staff: ${error?.message || 'Unknown error'}`)
            }
        }
        setSaving(false)
    }

    const handleDeleteStaff = async (staffId) => {
        if (!confirm(t('confirm_delete') || '¿Eliminar este miembro?')) return

        await supabase
            .from('staff')
            .delete()
            .eq('id', staffId)
            .eq('business_id', businessId)

        fetchStaff()
        onSaved?.()
    }

    const roles = [
        { id: 'manager', label: t('role_manager') || 'Manager' },
        { id: 'kitchen', label: t('role_cook') || 'Cocinero' },
        { id: 'cashier', label: t('role_cashier') || 'Cajero' },
        { id: 'driver', label: t('role_runner') || 'Entregador' }
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
                        <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#1e293b] border border-stone-200 dark:border-white/5 shadow-[0_20px_50px_rgba(28,25,23,0.03)]">
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
                                        value={newStaff.username}
                                        onChange={(e) => setNewStaff(p => ({ ...p, username: e.target.value }))}
                                        placeholder="juan_kitchen"
                                        autoComplete="off"
                                    />
                                    <InputField
                                        label={`PIN (${t('4_digits') || '4 digits'})`}
                                        type="password"
                                        value={newStaff.pin}
                                        onChange={(e) => setNewStaff(p => ({ ...p, pin: e.target.value }))}
                                        placeholder="1234"
                                        autoComplete="new-password"
                                    />
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-emerald-400 block mb-2">{t('role') || 'Role'}</label>
                                        <select
                                            value={newStaff.role}
                                            onChange={(e) => setNewStaff(p => ({ ...p, role: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-stone-50 dark:bg-[#334155] border border-stone-200 dark:border-white/10 text-stone-950 dark:text-white outline-none focus:bg-white focus:border-emerald-600 transition-all"
                                        >
                                            {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleAddStaff}
                                            disabled={saving || !newStaff.name || !newStaff.username || !newStaff.pin}
                                            className="flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-[0.15em] bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {saving ? '...' : (t('save') || 'Save')}
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => { setShowAddForm(false); setNewStaff({ name: '', username: '', pin: '', role: 'kitchen' }); }}
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
                                                <div className="text-xs text-stone-400 dark:text-white">@{staff.username} • {staff.role}</div>
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
