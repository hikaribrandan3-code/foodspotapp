import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import HeaderClamp from '../../components/HeaderClamp.jsx'
import { normalizeTenantConfig } from '../../utils/configNormalizer'
import ReservationIcon from '../../components/ReservationIcons.jsx'

function generateTimeSlots(openTime = '11:00', closeTime = '23:00') {
    const slots = []
    const [openH, openM] = openTime.split(':').map(Number)
    const [closeH, closeM] = closeTime.split(':').map(Number)
    let h = openH, m = openM
    while (h < closeH || (h === closeH && m < closeM)) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
        m += 30
        if (m >= 60) { m = 0; h++ }
    }
    return slots
}

function getAvailableDates() {
    const dates = []
    const today = new Date()
    for (let i = 1; i <= 14; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() + i)
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')
        dates.push({ value: `${yyyy}-${mm}-${dd}`, dayName, dayNum: d.getDate(), monthName: d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '') })
    }
    return dates
}

function formatDateDisplay(dateStr, lang = 'es') {
    if (!dateStr) return ''
    const locale = lang === 'pt' ? 'pt-BR' : lang === 'en' ? 'en-US' : 'es-AR'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default function ReservationPage() {
    const { tenantSlug } = useParams()
    const navigate = useNavigate()
    const { tenantData, businessId } = useTenant()
    const { t, language } = useLanguage()
    const config = useMemo(() => normalizeTenantConfig(tenantData?.app_config, tenantData), [tenantData])

    const [mode, setMode] = useState('table') // 'table' | 'custom'

    // Shared fields
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [notes, setNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [done, setDone] = useState(false)

    // Table fields
    const [step, setStep] = useState(1)
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedTime, setSelectedTime] = useState('')
    const [partySize, setPartySize] = useState(2)

    // Custom order fields
    const [itemDesc, setItemDesc] = useState('')
    const [occasion, setOccasion] = useState('')
    const [pickupOrDelivery, setPickupOrDelivery] = useState('pickup')
    const [customDate, setCustomDate] = useState('')
    const [customTime, setCustomTime] = useState('')

    const availableDates = useMemo(() => getAvailableDates(), [])
    const timeSlots = useMemo(() => generateTimeSlots('11:00', '23:00'), [])
    const ownerPhone = tenantData?.whatsapp_number || tenantData?.app_config?.businessInfo?.whatsapp || tenantData?.phone || null
    const businessName = tenantData?.business_name || 'FoodSpot'
    const primary = tenantData?.confirmation_color || 'var(--color-primary)'

    const inputStyle = {
        width: '100%', padding: '13px 16px', borderRadius: 12,
        border: '1.5px solid #E5E7EB', fontSize: 15, outline: 'none',
        boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit'
    }
    const labelStyle = { fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

    // ── TABLE SUBMIT ──────────────────────────────────────────
    const handleTableSubmit = async () => {
        if (!customerName.trim() || customerName.length < 2) { setError(t('res_err_name')); return }
        if (customerPhone.replace(/\D/g, '').length < 8) { setError(t('res_err_phone')); return }
        setIsSubmitting(true); setError(null)
        try {
            const { data: saved, error: dbErr } = await supabase
                .from('reservations')
                .insert({
                    business_id: businessId,
                    customer_name: customerName.trim(),
                    customer_phone: customerPhone.trim(),
                    notes: notes.trim() || null,
                    reservation_date: selectedDate,
                    reservation_time: selectedTime + ':00',
                    party_size: partySize,
                    status: 'pending',
                    reservation_type: 'table'
                })
                .select().single()
            if (dbErr) throw dbErr
            if (ownerPhone) {
                const msg =
                    `📅 *NUEVA RESERVA - ${businessName}*\n\n` +
                    `👤 ${customerName.trim()}\n` +
                    `📱 ${customerPhone.trim()}\n` +
                    `📆 ${formatDateDisplay(selectedDate, language)}\n` +
                    `🕐 ${selectedTime}\n` +
                    `👥 ${partySize} ${t('res_guests')}\n` +
                    (notes.trim() ? `📝 ${notes.trim()}\n` : '') +
                    `\n_ID: ${saved.id.slice(0, 8)}_`
                window.open(`https://wa.me/${ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
            }
            setDone(true)
        } catch (err) {
            setError(t('res_err_submit'))
        } finally {
            setIsSubmitting(false)
        }
    }

    // ── CUSTOM ORDER SUBMIT ───────────────────────────────────
    const handleCustomSubmit = async () => {
        if (!customerName.trim() || customerName.length < 2) { setError(t('res_err_name')); return }
        if (customerPhone.replace(/\D/g, '').length < 8) { setError(t('res_err_phone')); return }
        if (!itemDesc.trim()) { setError(t('res_err_desc')); return }
        if (!customDate) { setError(t('res_err_date')); return }
        setIsSubmitting(true); setError(null)
        try {
            const { data: saved, error: dbErr } = await supabase
                .from('reservations')
                .insert({
                    business_id: businessId,
                    customer_name: customerName.trim(),
                    customer_phone: customerPhone.trim(),
                    notes: notes.trim() || null,
                    reservation_date: customDate,
                    reservation_time: customTime ? customTime + ':00' : null,
                    party_size: 1,
                    status: 'pending',
                    reservation_type: 'custom',
                    custom_item_description: itemDesc.trim(),
                    occasion: occasion.trim() || null,
                    pickup_or_delivery: pickupOrDelivery
                })
                .select().single()
            if (dbErr) throw dbErr
            if (ownerPhone) {
                const msg =
                    `🎂 *NUEVO PEDIDO ESPECIAL - ${businessName}*\n\n` +
                    `👤 ${customerName.trim()}\n` +
                    `📱 ${customerPhone.trim()}\n` +
                    `📦 *Pedido:* ${itemDesc.trim()}\n` +
                    (occasion.trim() ? `🎉 *Ocasión:* ${occasion.trim()}\n` : '') +
                    `📆 *Fecha:* ${formatDateDisplay(customDate, language)}\n` +
                    (customTime ? `🕐 *Hora:* ${customTime}\n` : '') +
                    `🚗 *${pickupOrDelivery === 'pickup' ? t('res_pickup') : t('res_delivery')}*\n` +
                    (notes.trim() ? `📝 ${notes.trim()}\n` : '') +
                    `\n_ID: ${saved.id.slice(0, 8)}_`
                window.open(`https://wa.me/${ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
            }
            setDone(true)
        } catch (err) {
            setError(t('res_err_submit'))
        } finally {
            setIsSubmitting(false)
        }
    }

    // ── SUCCESS SCREEN ────────────────────────────────────────
    if (done) {
        return (
            <div style={{ minHeight: '100vh', background: '#F8F9FA', display: 'flex', flexDirection: 'column' }}>
                <HeaderClamp config={config} />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#fff', borderRadius: 24, padding: '40px 28px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 10 }}>{t('res_sent_title')}</h2>
                        <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>
                            {mode === 'table' ? t('res_sent_table') : t('res_sent_custom')}
                        </p>
                        <button onClick={() => navigate(`/${tenantSlug}`)}
                            style={{ width: '100%', padding: 16, background: primary, color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                            {t('res_back_home')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', background: '#F8F9FA', paddingBottom: 48 }}>
            <HeaderClamp config={config} />
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

                {/* Title */}
                <div style={{ marginBottom: 20 }}>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 2 }}>{t('make_reservation')}</h1>
                    <p style={{ fontSize: 14, color: '#9CA3AF' }}>{businessName}</p>
                </div>

                {/* Mode tabs */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                    {[
                        { id: 'table', label: t('res_tab_table'), icon: 'plate' },
                        { id: 'custom', label: t('res_tab_custom'), icon: 'cake' }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => { setMode(tab.id); setStep(1); setError(null) }}
                            style={{
                                flex: 1, padding: '10px 8px', borderRadius: 20, border: 'none',
                                background: mode === tab.id ? primary : '#f0f0f0',
                                color: mode === tab.id ? '#fff' : '#6B7280',
                                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                                transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                            }}>
                            <ReservationIcon name={tab.icon} size={16} color={mode === tab.id ? '#fff' : '#6B7280'} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── TABLE BOOKING FLOW ── */}
                {mode === 'table' && (
                    <>
                        {/* Step dots */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                            {[1, 2, 3].map(s => (
                                <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: step >= s ? primary : '#E5E7EB', transition: 'background 0.3s' }} />
                            ))}
                        </div>

                        {/* Step 1: Date */}
                        {step === 1 && (
                            <div>
                                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 16 }}>{t('res_what_day')}</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 28 }}>
                                    {availableDates.map(d => (
                                        <button key={d.value} onClick={() => setSelectedDate(d.value)}
                                            style={{
                                                padding: '10px 4px', borderRadius: 14, border: 'none',
                                                background: selectedDate === d.value ? primary : '#fff',
                                                color: selectedDate === d.value ? '#fff' : '#374151',
                                                fontWeight: 600, cursor: 'pointer',
                                                boxShadow: selectedDate === d.value ? `0 4px 12px rgba(0,0,0,0.15)` : '0 1px 3px rgba(0,0,0,0.08)',
                                                transition: 'all 0.15s'
                                            }}>
                                            <div style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.7, marginBottom: 2 }}>{d.dayName}</div>
                                            <div style={{ fontSize: 20, fontWeight: 800 }}>{d.dayNum}</div>
                                            <div style={{ fontSize: 10, opacity: 0.7 }}>{d.monthName}</div>
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => { if (selectedDate) setStep(2) }} disabled={!selectedDate}
                                    style={{ width: '100%', padding: 18, background: selectedDate ? primary : '#E5E7EB', color: selectedDate ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 16, fontSize: 17, fontWeight: 700, cursor: selectedDate ? 'pointer' : 'not-allowed' }}>
                                    {t('res_continue')} →
                                </button>
                            </div>
                        )}

                        {/* Step 2: Time + party */}
                        {step === 2 && (
                            <div>
                                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{t('res_what_time')}</h3>
                                <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>{formatDateDisplay(selectedDate, language)}</p>

                                <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                    <div style={labelStyle}>{t('res_how_many')}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                                        <button onClick={() => setPartySize(Math.max(1, partySize - 1))}
                                            style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #E5E7EB', background: '#fff', fontSize: 22, cursor: 'pointer', fontWeight: 700 }}>−</button>
                                        <span style={{ fontSize: 32, fontWeight: 800, color: '#111827', minWidth: 40, textAlign: 'center' }}>{partySize}</span>
                                        <button onClick={() => setPartySize(Math.min(30, partySize + 1))}
                                            style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #E5E7EB', background: '#fff', fontSize: 22, cursor: 'pointer', fontWeight: 700 }}>+</button>
                                    </div>
                                </div>

                                <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                    <div style={labelStyle}>{t('res_what_time')}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                        {timeSlots.map(slot => (
                                            <button key={slot} onClick={() => setSelectedTime(slot)}
                                                style={{
                                                    padding: '10px 4px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
                                                    background: selectedTime === slot ? primary : '#F3F4F6',
                                                    color: selectedTime === slot ? '#fff' : '#374151',
                                                    cursor: 'pointer', transition: 'all 0.15s'
                                                }}>
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => setStep(1)} style={{ flex: 1, padding: 16, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>← {t('res_back')}</button>
                                    <button onClick={() => { if (selectedTime) setStep(3) }} disabled={!selectedTime}
                                        style={{ flex: 2, padding: 16, background: selectedTime ? primary : '#E5E7EB', color: selectedTime ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: selectedTime ? 'pointer' : 'not-allowed' }}>
                                        {t('res_continue')} →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Contact */}
                        {step === 3 && (
                            <div>
                                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{t('res_your_info')}</h3>
                                <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>
                                    {formatDateDisplay(selectedDate, language)} · {selectedTime} · {partySize} {t('res_guests')}
                                </p>
                                <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div>
                                        <label style={labelStyle}>{t('res_name')}</label>
                                        <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={t('res_name')} autoComplete="name"
                                            style={inputStyle} onFocus={e => e.target.style.borderColor = primary} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>{t('res_phone')}</label>
                                        <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Ej: 1123456789" autoComplete="tel"
                                            style={inputStyle} onFocus={e => e.target.style.borderColor = primary} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>{t('res_notes')}</label>
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('res_notes_hint')} rows={3}
                                            style={{ ...inputStyle, resize: 'none' }} onFocus={e => e.target.style.borderColor = primary} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                                    </div>
                                </div>
                                {error && <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}><p style={{ color: '#DC2626', fontSize: 14, margin: 0 }}>⚠️ {error}</p></div>}
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => setStep(2)} style={{ flex: 1, padding: 16, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>← {t('res_back')}</button>
                                    <button onClick={handleTableSubmit} disabled={isSubmitting}
                                        style={{ flex: 2, padding: 16, background: isSubmitting ? '#E5E7EB' : primary, color: isSubmitting ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                                        {isSubmitting ? t('res_sending') : `✓ ${t('res_confirm')}`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ── CUSTOM ORDER FLOW ── */}
                {mode === 'custom' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <p style={{ fontSize: 14, color: '#6B7280', marginTop: -8, marginBottom: 4, lineHeight: 1.5 }}>
                            {t('res_custom_title')}
                        </p>

                        <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 14 }}>

                            {/* What they need */}
                            <div>
                                <label style={labelStyle}>{t('res_what_you_need')} *</label>
                                <textarea value={itemDesc} onChange={e => setItemDesc(e.target.value)} placeholder={t('res_item_hint')} rows={3}
                                    style={{ ...inputStyle, resize: 'none' }} onFocus={e => e.target.style.borderColor = primary} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                            </div>

                            {/* Occasion */}
                            <div>
                                <label style={labelStyle}>{t('res_occasion')}</label>
                                <input type="text" value={occasion} onChange={e => setOccasion(e.target.value)} placeholder={t('res_occasion_hint')}
                                    style={inputStyle} onFocus={e => e.target.style.borderColor = primary} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                            </div>

                            {/* Date needed */}
                            <div>
                                <label style={labelStyle}>{t('res_needed_by')} *</label>
                                <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
                                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                    style={inputStyle} onFocus={e => e.target.style.borderColor = primary} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                            </div>

                            {/* Time needed */}
                            <div>
                                <label style={labelStyle}>{t('res_time_needed')}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                    {timeSlots.filter((_, i) => i % 2 === 0).map(slot => (
                                        <button key={slot} onClick={() => setCustomTime(slot)}
                                            style={{
                                                padding: '10px 4px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 600,
                                                background: customTime === slot ? primary : '#F3F4F6',
                                                color: customTime === slot ? '#fff' : '#374151',
                                                cursor: 'pointer', transition: 'all 0.15s'
                                            }}>
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Pickup or Delivery */}
                            <div>
                                <label style={labelStyle}>{t('res_pickup_delivery')}</label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {['pickup', 'delivery'].map(opt => (
                                        <button key={opt} onClick={() => setPickupOrDelivery(opt)}
                                            style={{
                                                flex: 1, padding: '12px 0', borderRadius: 12, border: '2px solid',
                                                borderColor: pickupOrDelivery === opt ? primary : '#E5E7EB',
                                                background: pickupOrDelivery === opt ? primary + '15' : '#fff',
                                                color: pickupOrDelivery === opt ? primary : '#6B7280',
                                                fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                            }}>
                                            <>
                                                <ReservationIcon name="home" size={16} color={pickupOrDelivery === opt ? primary : '#6B7280'} />
                                                {opt === 'pickup' ? t('res_pickup') : t('res_delivery')}
                                            </>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{ height: 1, background: '#F3F4F6' }} />

                            {/* Name */}
                            <div>
                                <label style={labelStyle}>{t('res_name')} *</label>
                                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={t('res_name')} autoComplete="name"
                                    style={inputStyle} onFocus={e => e.target.style.borderColor = primary} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                            </div>

                            {/* Phone */}
                            <div>
                                <label style={labelStyle}>{t('res_phone')} *</label>
                                <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Ej: 1123456789" autoComplete="tel"
                                    style={inputStyle} onFocus={e => e.target.style.borderColor = primary} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                            </div>

                            {/* Extra notes */}
                            <div>
                                <label style={labelStyle}>{t('res_notes')}</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('res_notes_hint')} rows={2}
                                    style={{ ...inputStyle, resize: 'none' }} onFocus={e => e.target.style.borderColor = primary} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                            </div>
                        </div>

                        {error && <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '12px 14px' }}><p style={{ color: '#DC2626', fontSize: 14, margin: 0 }}>⚠️ {error}</p></div>}

                        <button onClick={handleCustomSubmit} disabled={isSubmitting}
                            style={{ width: '100%', padding: 18, background: isSubmitting ? '#E5E7EB' : primary, color: isSubmitting ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 16, fontSize: 17, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                            {isSubmitting ? t('res_sending') : t('res_send_whatsapp')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
