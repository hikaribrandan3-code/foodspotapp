import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Globe, Building2, ChevronRight, Check, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient.js'
import { useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext.jsx'

const STEPS = ['basics', 'confirm']

export default function AddLocationModal({ onClose, currentBusiness, onCreated }) {
    const { t } = useLanguage()
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const [step, setStep] = useState(0)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [done, setDone] = useState(false)
    const [createdSlug, setCreatedSlug] = useState('')
    const [createdBusinessId, setCreatedBusinessId] = useState('')
    const [slugExists, setSlugExists] = useState(false)
    const slugCheckTimer = useRef(null)

    // Step 1 — basics
    const [locationName, setLocationName] = useState('')
    const [locationSlug, setLocationSlug] = useState('')
    const [locationLabel, setLocationLabel] = useState('')
    const [locationAddress, setLocationAddress] = useState('')
    const [locationHours, setLocationHours] = useState(currentBusiness?.hours || '')
    const [locationPhone, setLocationPhone] = useState('')

    // Auto-use current business branding (not editable, user can change in Hub Settings later)
    const parentBrandName = currentBusiness?.business_name || currentBusiness?.name || ''
    const parentSlug = currentBusiness?.parent_slug || slugify(currentBusiness?.business_name || currentBusiness?.name || '')
    const parentBrandLogo = currentBusiness?.logo_url || ''

    function slugify(str) {
        return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }

    const handleNameChange = (val) => {
        setLocationName(val)
        if (!locationSlug || locationSlug === slugify(locationName)) {
            setLocationSlug(slugify(val))
        }
    }

    // Check slug uniqueness with debounce
    useEffect(() => {
        if (!locationSlug) {
            setSlugExists(false)
            return
        }

        clearTimeout(slugCheckTimer.current)
        slugCheckTimer.current = setTimeout(async () => {
            try {
                const { count } = await supabase
                    .from('branding')
                    .select('*', { count: 'exact', head: true })
                    .eq('slug', locationSlug)
                setSlugExists(count > 0)
            } catch (err) {
                console.warn('Could not check slug uniqueness:', err)
            }
        }, 400)

        return () => clearTimeout(slugCheckTimer.current)
    }, [locationSlug])

    const handleCreate = async () => {
        if (!locationName || !locationSlug || slugExists) return
        setSaving(true)
        setError('')
        try {
            const { data, error: rpcError } = await supabase.rpc('create_linked_location', {
                p_location_name: locationName,
                p_location_slug: locationSlug,
                p_location_label: locationName,
                p_location_address: locationAddress || null,
                p_location_hours: locationHours || null,
                p_location_phone: locationPhone || null,
                p_parent_slug: parentSlug || null,
                p_parent_brand_name: parentBrandName || null,
                p_parent_brand_logo: parentBrandLogo || null,
            })
            if (rpcError) {
                console.error('[AddLocation] RPC Error:', rpcError)
                throw new Error(rpcError.message || JSON.stringify(rpcError))
            }
            if (!data || !data.business_id) {
                throw new Error('No business_id returned from location creation')
            }
            console.log('[AddLocation] Success:', data)
            setCreatedSlug(locationSlug)
            setCreatedBusinessId(data.business_id)
            localStorage.setItem('fs_business_id', data.business_id)
            localStorage.setItem('fs_last_active_slug', locationSlug)
            setDone(true)
            onCreated?.()
        } catch (err) {
            console.error('[AddLocation] Catch error:', err)
            setError(err.message || 'Failed to create location')
        }
        setSaving(false)
    }

    const inputCls = "w-full px-4 py-2.5 rounded-full bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-sm text-stone-800 dark:text-white placeholder-stone-300 dark:placeholder-white/20 outline-none focus:border-emerald-500 transition-colors"
    const labelCls = "text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400 dark:text-white/40 mb-1.5 block"

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="relative w-full max-w-md bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100 dark:border-white/5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#10B981' }}>
                            <MapPin size={14} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-stone-900 dark:text-white">
                                {t('add_location') || 'Add Location'}
                            </p>
                            {!done && (
                                <p className="text-[11px] text-stone-400 dark:text-white/40">
                                    {t('step') || 'Step'} {step + 1} / {STEPS.length}
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 dark:hover:bg-white/10 transition-colors">
                        <X size={16} className="text-stone-500 dark:text-white/40" />
                    </button>
                </div>

                {/* Progress bar */}
                {!done && (
                    <div className="h-0.5 bg-stone-100 dark:bg-white/5">
                        <div
                            className="h-full transition-all duration-300"
                            style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: '#10B981' }}
                        />
                    </div>
                )}

                <div className="p-5">
                    <AnimatePresence mode="wait">
                        {/* ── DONE ── */}
                        {done && (
                            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                                    <Check size={28} className="text-emerald-500" />
                                </div>
                                <p className="text-base font-bold text-stone-900 dark:text-white mb-1">
                                    {t('location_created') || 'Location created!'}
                                </p>
                                <p className="text-sm text-stone-400 dark:text-white/40 mb-6">
                                    {locationName} {t('is_ready') || 'is ready to set up'}
                                </p>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => navigate(`/${createdSlug}/owner/summary`)}
                                        className="w-full py-3 rounded-full text-sm font-bold text-white"
                                        style={{ background: '#10B981' }}
                                    >
                                        {t('setup_location') || 'Set Up Location'} →
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-full py-3 rounded-full text-sm font-semibold text-stone-500 dark:text-white/50 hover:bg-stone-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        {t('stay_here') || 'Stay Here'}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 1: BASICS ── */}
                        {!done && step === 0 && (
                            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                <div>
                                    <p className="text-sm font-semibold text-stone-700 dark:text-white/80 mb-4">
                                        {t('location_details') || 'Location details'}
                                    </p>
                                    <div className="space-y-3">
                                        <div>
                                            <label className={labelCls}>{t('location_name') || 'Location Name'} *</label>
                                            <input
                                                type="text"
                                                value={locationName}
                                                onChange={e => handleNameChange(e.target.value)}
                                                placeholder="La Cantina Belgrano"
                                                className={inputCls}
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('location_url') || 'URL Slug'} *</label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-stone-400 dark:text-white/30 shrink-0">app.com/</span>
                                                <input
                                                    type="text"
                                                    value={locationSlug}
                                                    onChange={e => setLocationSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                                    placeholder="lacantina-belgrano"
                                                    className={inputCls}
                                                />
                                            </div>
                                            {slugExists && (
                                                <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">
                                                    This URL is already taken
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('address') || 'Address'} <span className="text-stone-400">(optional)</span></label>
                                            <input
                                                type="text"
                                                value={locationAddress}
                                                onChange={e => setLocationAddress(e.target.value)}
                                                placeholder="Av. Cabildo 1234, Buenos Aires"
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('business_hours') || 'Hours'} <span className="text-stone-400">(optional)</span></label>
                                            <input
                                                type="text"
                                                value={locationHours}
                                                onChange={e => setLocationHours(e.target.value)}
                                                placeholder="Mon-Fri 9:00-21:00, Sat-Sun 10:00-18:00"
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('phone') || 'Phone'} <span className="text-stone-400">(optional)</span></label>
                                            <input
                                                type="text"
                                                value={locationPhone}
                                                onChange={e => setLocationPhone(e.target.value)}
                                                placeholder="+54 9 351 645 9100"
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setStep(1)}
                                    disabled={!locationName || !locationSlug || slugExists}
                                    className="w-full py-3 rounded-full text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                                    style={{ background: '#10B981' }}
                                >
                                    {t('next') || 'Next'} <ChevronRight size={16} />
                                </button>
                            </motion.div>
                        )}

                        {/* ── STEP 2: CONFIRM ── */}
                        {!done && step === 1 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                <p className="text-sm font-semibold text-stone-700 dark:text-white/80 mb-3">
                                    {t('confirm_location') || 'Confirm new location'}
                                </p>
                                <div className="rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 divide-y divide-stone-100 dark:divide-white/5">
                                    {[
                                        [t('location_name') || 'Name', locationName],
                                        [t('location_url') || 'URL', `/${locationSlug}`],
                                        locationAddress && [t('address') || 'Address', locationAddress],
                                        locationHours && [t('business_hours') || 'Hours', locationHours],
                                        locationPhone && [t('phone') || 'Phone', locationPhone],
                                        parentBrandName && [t('brand_name') || 'Brand', parentBrandName],
                                        parentSlug && [t('hub_url_slug') || 'Hub', `/${parentSlug}`],
                                    ].filter(Boolean).map(([label, value]) => (
                                        <div key={label} className="flex items-center justify-between px-4 py-2.5">
                                            <span className="text-[11px] text-stone-400 dark:text-white/40">{label}</span>
                                            <span className="text-sm font-medium text-stone-800 dark:text-white">{value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-3">
                                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                                        {t('new_location_menu_hint') || 'The new location starts with an empty menu — you\'ll build it separately after setup.'}
                                    </p>
                                </div>
                                {error && (
                                    <p className="text-xs text-red-500 dark:text-red-400 text-center">{error}</p>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setStep(0)}
                                        className="flex-1 py-3 rounded-full text-sm font-semibold text-stone-500 dark:text-white/50 bg-stone-50 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
                                    >
                                        {t('back') || 'Back'}
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={saving}
                                        className="flex-1 py-3 rounded-full text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-70"
                                        style={{ background: '#10B981' }}
                                    >
                                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                        {saving ? (t('creating') || 'Creating...') : (t('create_location') || 'Create Location')}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    )
}
