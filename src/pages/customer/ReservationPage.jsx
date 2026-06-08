import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import HeaderClamp from '../../components/HeaderClamp.jsx'

// Generate 30-min slots between open/close times
function generateTimeSlots(openTime = '11:00', closeTime = '23:00') {
    const slots = []
    const [openH, openM] = openTime.split(':').map(Number)
    const [closeH, closeM] = closeTime.split(':').map(Number)
    let h = openH, m = openM
    while (h < closeH || (h === closeH && m < closeM)) {
        const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        slots.push(label)
        m += 30
        if (m >= 60) { m = 0; h++ }
    }
    return slots
}

// Format date for display
function formatDateDisplay(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// Build next 14 days (today excluded — need 24hr advance notice)
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
        const dayNum = d.getDate()
        const monthName = d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')
        dates.push({ value: `${yyyy}-${mm}-${dd}`, dayName, dayNum, monthName })
    }
    return dates
}

export default function ReservationPage() {
    const { tenantSlug } = useParams()
    const navigate = useNavigate()
    const { tenantData, businessId } = useTenant()
    const { t } = useLanguage()
    const config = tenantData?.app_config || {}

    const [step, setStep] = useState(1) // 1=date, 2=time+party, 3=info, 4=success
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedTime, setSelectedTime] = useState('')
    const [partySize, setPartySize] = useState(2)
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [notes, setNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)

    const availableDates = useMemo(() => getAvailableDates(), [])
    const timeSlots = useMemo(() => generateTimeSlots('11:00', '23:00'), [])

    const ownerPhone = tenantData?.whatsapp_number || tenantData?.app_config?.businessInfo?.whatsapp || tenantData?.phone || null
    const businessName = tenantData?.business_name || 'El restaurante'
    const primaryColor = tenantData?.confirmation_color || '#10B981'

    const handleSubmit = async () => {
        if (!customerName.trim() || customerName.length < 2) {
            setError('Por favor ingresa tu nombre completo.')
            return
        }
        const digits = customerPhone.replace(/\D/g, '')
        if (digits.length < 8) {
            setError('Por favor ingresa un número de teléfono válido.')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            const { data: savedReservation, error: dbError } = await supabase
                .from('reservations')
                .insert({
                    business_id: businessId,
                    customer_name: customerName.trim(),
                    customer_phone: customerPhone.trim(),
                    notes: notes.trim() || null,
                    reservation_date: selectedDate,
                    reservation_time: selectedTime + ':00',
                    party_size: partySize,
                    status: 'pending'
                })
                .select()
                .single()

            if (dbError) throw dbError

            // Send WhatsApp to owner
            if (ownerPhone) {
                const dateDisplay = formatDateDisplay(selectedDate)
                const msg =
                    `📅 *NUEVA RESERVA - ${businessName}*\n\n` +
                    `👤 *Nombre:* ${customerName.trim()}\n` +
                    `📱 *Teléfono:* ${customerPhone.trim()}\n` +
                    `📆 *Fecha:* ${dateDisplay}\n` +
                    `🕐 *Hora:* ${selectedTime}\n` +
                    `👥 *Personas:* ${partySize}\n` +
                    (notes.trim() ? `📝 *Notas:* ${notes.trim()}\n` : '') +
                    `\n_ID: ${savedReservation.id.slice(0, 8)}_`

                const waUrl = `https://wa.me/${ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
                window.open(waUrl, '_blank')
            }

            setStep(4)
        } catch (err) {
            console.error('[Reservation] Submit error:', err)
            setError('Error al enviar la reserva. Por favor intentá de nuevo.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Step 4: Success screen
    if (step === 4) {
        return (
            <div style={{ minHeight: '100vh', background: '#F8F9FA', display: 'flex', flexDirection: 'column' }}>
                <HeaderClamp config={config} />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#fff', borderRadius: 24, padding: '40px 28px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>¡Reserva Enviada!</h2>
                    <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 8, lineHeight: 1.5 }}>
                        Tu reserva para <strong>{partySize} personas</strong> el <strong>{formatDateDisplay(selectedDate)}</strong> a las <strong>{selectedTime}</strong> fue enviada.
                    </p>
                    <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 28 }}>
                        El restaurante la confirmará pronto por WhatsApp.
                    </p>
                    <button
                        onClick={() => navigate(`/${tenantSlug}`)}
                        style={{ width: '100%', padding: 16, background: primaryColor, color: 'white', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
                    >
                        Volver al Inicio
                    </button>
                </div>
                </div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', background: '#F8F9FA', paddingBottom: 40 }}>
            <HeaderClamp config={config} />

            <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>
                {/* Title */}
                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Hacer una Reserva</h1>
                    <p style={{ fontSize: 14, color: '#6B7280' }}>{businessName}</p>
                </div>

                {/* Step Indicator */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            flex: 1, height: 4, borderRadius: 4,
                            background: step >= s ? primaryColor : '#E5E7EB',
                            transition: 'background 0.3s'
                        }} />
                    ))}
                </div>

                {/* STEP 1: Date */}
                {step === 1 && (
                    <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 16 }}>¿Qué día venís?</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 28 }}>
                            {availableDates.map(d => (
                                <button
                                    key={d.value}
                                    onClick={() => setSelectedDate(d.value)}
                                    style={{
                                        padding: '10px 4px', borderRadius: 14, border: 'none',
                                        background: selectedDate === d.value ? primaryColor : '#fff',
                                        color: selectedDate === d.value ? '#fff' : '#374151',
                                        fontWeight: 600, cursor: 'pointer',
                                        boxShadow: selectedDate === d.value ? `0 4px 12px ${primaryColor}40` : '0 1px 3px rgba(0,0,0,0.08)',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <div style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.7, marginBottom: 2 }}>{d.dayName}</div>
                                    <div style={{ fontSize: 20, fontWeight: 800 }}>{d.dayNum}</div>
                                    <div style={{ fontSize: 10, opacity: 0.7 }}>{d.monthName}</div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => { if (selectedDate) setStep(2) }}
                            disabled={!selectedDate}
                            style={{
                                width: '100%', padding: 18, background: selectedDate ? primaryColor : '#E5E7EB',
                                color: selectedDate ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 16,
                                fontSize: 17, fontWeight: 700, cursor: selectedDate ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s'
                            }}
                        >
                            Continuar →
                        </button>
                    </div>
                )}

                {/* STEP 2: Time + Party Size */}
                {step === 2 && (
                    <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 4 }}>¿A qué hora y cuántos son?</h3>
                        <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>{formatDateDisplay(selectedDate)}</p>

                        {/* Party size */}
                        <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Cantidad de Personas</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                                <button onClick={() => setPartySize(Math.max(1, partySize - 1))}
                                    style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #E5E7EB', background: '#fff', fontSize: 22, cursor: 'pointer', fontWeight: 700, color: '#374151' }}>−</button>
                                <span style={{ fontSize: 32, fontWeight: 800, color: '#111827', minWidth: 40, textAlign: 'center' }}>{partySize}</span>
                                <button onClick={() => setPartySize(Math.min(20, partySize + 1))}
                                    style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #E5E7EB', background: '#fff', fontSize: 22, cursor: 'pointer', fontWeight: 700, color: '#374151' }}>+</button>
                            </div>
                        </div>

                        {/* Time slots */}
                        <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Horario</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                {timeSlots.map(slot => (
                                    <button
                                        key={slot}
                                        onClick={() => setSelectedTime(slot)}
                                        style={{
                                            padding: '10px 4px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
                                            background: selectedTime === slot ? primaryColor : '#F3F4F6',
                                            color: selectedTime === slot ? '#fff' : '#374151',
                                            cursor: 'pointer', transition: 'all 0.15s'
                                        }}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setStep(1)}
                                style={{ flex: 1, padding: 16, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                                ← Atrás
                            </button>
                            <button
                                onClick={() => { if (selectedTime) setStep(3) }}
                                disabled={!selectedTime}
                                style={{
                                    flex: 2, padding: 16, background: selectedTime ? primaryColor : '#E5E7EB',
                                    color: selectedTime ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 14,
                                    fontSize: 15, fontWeight: 700, cursor: selectedTime ? 'pointer' : 'not-allowed'
                                }}
                            >
                                Continuar →
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Contact Info */}
                {step === 3 && (
                    <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Tus datos</h3>
                        <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>
                            {formatDateDisplay(selectedDate)} · {selectedTime} · {partySize} personas
                        </p>

                        <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Name */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Nombre</label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder="Tu nombre completo"
                                    autoComplete="name"
                                    style={{ width: '100%', padding: '13px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                                    onFocus={e => e.target.style.borderColor = primaryColor}
                                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Teléfono</label>
                                <input
                                    type="tel"
                                    value={customerPhone}
                                    onChange={e => setCustomerPhone(e.target.value)}
                                    placeholder="Ej: 1123456789"
                                    autoComplete="tel"
                                    style={{ width: '100%', padding: '13px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                                    onFocus={e => e.target.style.borderColor = primaryColor}
                                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Notas (opcional)</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Alergias, silla de bebé, ocasión especial..."
                                    rows={3}
                                    style={{ width: '100%', padding: '13px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 15, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                                    onFocus={e => e.target.style.borderColor = primaryColor}
                                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                                />
                            </div>
                        </div>

                        {error && (
                            <div style={{ background: '#FEE2E2', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                                <p style={{ color: '#DC2626', fontSize: 14, margin: 0 }}>⚠️ {error}</p>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setStep(2)}
                                style={{ flex: 1, padding: 16, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                                ← Atrás
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                style={{
                                    flex: 2, padding: 16, background: isSubmitting ? '#E5E7EB' : primaryColor,
                                    color: isSubmitting ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 14,
                                    fontSize: 15, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isSubmitting ? 'Enviando...' : '✓ Confirmar Reserva'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
