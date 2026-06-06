import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatPrice } from '../../config/menuData.js'
import { supabase } from '../../lib/supabaseClient.js'
import { getScopedGuestToken } from '../../utils/storage.js'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import { useCart } from '../../contexts/CartContext.jsx'
import HeaderClamp from '../../components/HeaderClamp.jsx'
import { formatAddressForDisplay } from '../../utils/logistics.js' // Strike 17 Import
import {
    getCurrentOrder,
    updateItemQuantity,
    removeFromCurrentOrder,
    generateOrderNumber,
    incrementOrderCount
} from '../../utils/storage.js'
import {
    isDeliveryMode,
    validateDeliveryInfo,
    clearDeliveryMode,
    isWithinDeliveryRadius,
    buildWhatsAppSummary
} from '../../utils/deliveryUtils.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { handleCashPayment } from '../../services/offlinePayment.js'
import { isOrderPaid } from '../../utils/paymentStatus.js'
import { ORDER_STATUS } from '../../constants/database.js';

// ============================================
// 🛒 RESERVATION HELPERS
// ============================================
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

function formatDateDisplay(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('es-AR', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getCalendarMonth(year, month) {
    // Returns grid of weeks for given month (0-indexed month)
    const today = new Date(); today.setHours(0,0,0,0)
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    // Start from Monday
    const startDow = (firstDay.getDay() + 6) % 7 // 0=Mon
    const weeks = []
    let week = Array(startDow).fill(null)
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d)
        const yyyy = date.getFullYear()
        const mm = String(month + 1).padStart(2, '0')
        const dd = String(d).padStart(2, '0')
        week.push({ value: `${yyyy}-${mm}-${dd}`, day: d, past: date < today })
        if (week.length === 7) { weeks.push(week); week = [] }
    }
    if (week.length) { while (week.length < 7) week.push(null); weeks.push(week) }
    return weeks
}

// ============================================
// 🛒 ORDER.JSX - THE UNIVERSAL CHECKOUT ENGINE
// ============================================
// Supports: Dine-In (Table Service), Delivery, Pickup
// ============================================

// 🎨 PREMIUM UI COMPONENTS (Strike 11)
const InputGroup = ({ label, icon, value, onChange, placeholder, type = 'text', inputMode, pattern, isTextArea }) => (
    <div style={{ marginBottom: 16 }}>
        <label style={{
            fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.02em'
        }}>
            {label}
        </label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 16, top: isTextArea ? 16 : '50%', transform: isTextArea ? 'none' : 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }}>
                {icon}
            </div>
            {isTextArea ? (
                <textarea
                    value={value} onChange={onChange} placeholder={placeholder} rows={3}
                    style={{
                        width: '100%', padding: '14px 16px 14px 48px', borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 15, color: '#1F2937', background: '#FFFFFF', resize: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'border-color 0.2s', outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                    onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
            ) : (
                <input
                    type={type} value={value} onChange={onChange} placeholder={placeholder} inputMode={inputMode} pattern={pattern}
                    style={{
                        width: '100%', padding: '14px 16px 14px 48px', borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 15, color: '#1F2937', background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'border-color 0.2s', outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366F1'}
                    onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
            )}
        </div>
    </div>
)

const PaymentMethodCard = ({ id, selected, onClick, title, subtitle, icon, color }) => (
    <button
        onClick={onClick}
        style={{
            width: '100%', padding: '14px 0', marginBottom: 0,
            background: 'none', border: 'none', borderBottom: '1px solid #E5E7EB',
            cursor: 'pointer', transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', gap: 12,
            ':last-child': { borderBottom: 'none' }
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827', flexShrink: 0 }}>
            {icon}
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: selected ? 700 : 500, color: '#111827', marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{subtitle}</div>
        </div>
        <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: selected ? 'none' : '2px solid #D1D5DB',
            background: selected ? '#111827' : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.2s ease'
        }}>
            {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
        </div>
    </button>
)

const placeholderImages = [
    '', '', '', // No placeholder images — show empty space
]

function Order({ config: configProp }) {
    const { clearCart } = useCart()
    const { businessId, tenantData, serviceModes } = useTenant()
    const { t } = useLanguage()
    const config = configProp || tenantData?.app_config || {}
    const paymentMethods = config.payment_methods || { cash: true }
    const navigate = useNavigate()
    const { tenantSlug } = useParams()

    // 🏢 TENANT DATA EXTRACTION
    const storeCoords = useMemo(() => ({
        lat: tenantData?.store_lat || null,
        lon: tenantData?.store_lon || null
    }), [tenantData])

    const deliveryRadius = tenantData?.delivery_radius || 10
    const deliveryFee = tenantData?.delivery_fee || 0
    const freeDeliveryThreshold = tenantData?.free_delivery_threshold || 0
    const businessName = tenantData?.business_name || 'Local'
    const ownerPhone = tenantData?.whatsapp_number || tenantData?.app_config?.businessInfo?.whatsapp || tenantData?.business_info?.whatsapp || tenantData?.phone || null

    // --------------------------------------------
    // 🚦 SERVICE MODE LOGIC (Universal Mode)
    // --------------------------------------------
    const [orderType, setOrderType] = useState(() => {
        if (isDeliveryMode() && serviceModes?.delivery) return 'delivery'
        if (serviceModes?.pickup) return 'pickup'
        if (serviceModes?.delivery) return 'delivery'
        if (serviceModes?.dineIn) return 'dine_in'
        return 'pickup'
    })

    // Scroll to payment section ref
    const paymentSectionRef = useRef(null)

    // Auto-scroll to payment when switching from dine_in
    useEffect(() => {
        if (orderType !== 'dine_in' && paymentSectionRef.current) {
            setTimeout(() => {
                paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 100)
        }
    }, [orderType])

    // UI STATE
    const [order, setOrder] = useState(() => getCurrentOrder())
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    // 🔔 TOAST STATE
    const [toastMessage, setToastMessage] = useState(null)
    const showToast = (msg) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 4000)
    }

    // Customer info (Shared State)
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        phone: '',
        address: { street: '', number: '', floor: '', notes: '' }, // 🛡️ STRUCTURED ADDRESS (Strike 17)
        tableNumber: '', // Dine-In Only
        specialRequests: '', // Kitchen notes/special requests
        lat: null,
        lon: null
    })

    // Payment method
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [validationErrors, setValidationErrors] = useState([])

    // 🔄 PAYMENT RETRY STATE (Audit #7)
    const [isRetryMode, setIsRetryMode] = useState(false)
    const [pendingOrderId, setPendingOrderId] = useState(null)
    const [retryError, setRetryError] = useState(null)

    // 🔄 PAYMENT RETRY DETECTION (Audit #7)
    // Detect Mercado Pago failure from URL params on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const paymentStatus = urlParams.get('status')
        const orderId = urlParams.get('order_id')

        if ((paymentStatus === 'rejected' || paymentStatus === ORDER_STATUS.CANCELLED) && orderId) {
            console.log('💳 Payment failure detected, entering retry mode:', orderId)
            setIsRetryMode(true)
            setPendingOrderId(orderId)
            setRetryError('Payment was declined or cancelled. You can try again.')
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname)
        }
    }, [])

    // 📍 DISTANCE STATE (Delivery Only)
    const [distanceResult, setDistanceResult] = useState({ withinRadius: true, distanceKm: null })

    // 🍽️ RESERVATION STATE (Dine-In Only)
    const [reservationDate, setReservationDate] = useState('')
    const [reservationHour, setReservationHour] = useState('')
    const [reservationMin, setReservationMin] = useState('00')
    const [partySize, setPartySize] = useState(2)
    const [reservationNotes, setReservationNotes] = useState('')
    const [showReservation, setShowReservation] = useState(false)
    const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() } })
    const calWeeks = useMemo(() => getCalendarMonth(calMonth.year, calMonth.month), [calMonth])
    const reservationTime = reservationHour ? `${reservationHour}:${reservationMin}` : ''

    // Recalculate distance when coords change
    useEffect(() => {
        if (orderType === 'delivery' && customerInfo.lat && customerInfo.lon && storeCoords.lat && storeCoords.lon) {
            const result = isWithinDeliveryRadius(storeCoords, { lat: customerInfo.lat, lon: customerInfo.lon }, deliveryRadius)
            setDistanceResult(result)
        }
    }, [customerInfo.lat, customerInfo.lon, storeCoords, deliveryRadius, orderType])

    // Sync order state from storage on mount (CartContext handles the rest)
    useEffect(() => {
        setOrder(getCurrentOrder())
    }, [])

    // CALCULATIONS
    const calculateSubtotal = () => {
        return order?.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
    }

    const subtotal = calculateSubtotal()
    // Delivery Logic
    const isDelivery = orderType === 'delivery'
    const isFreeDelivery = isDelivery && freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold
    const actualDeliveryFee = isDelivery ? (isFreeDelivery ? 0 : deliveryFee) : 0
    const total = subtotal + actualDeliveryFee

    // 🚫 HARD FENCE
    const isOutOfRadius = isDelivery && !distanceResult.withinRadius && distanceResult.distanceKm !== null

    const handleQuantityChange = (index, delta) => {
        const newQuantity = (order.items[index]?.quantity || 1) + delta
        if (newQuantity <= 0) {
            removeFromCurrentOrder(index)
        } else {
            updateItemQuantity(index, newQuantity)
        }
        setOrder(getCurrentOrder())
    }

    const getItemImage = (item, index) => {
        const itemImage = item.image || item.image_url
        if (itemImage) return itemImage
        return placeholderImages[index % placeholderImages.length]
    }

    // ============================================
    // 🚀 THE SUBMISSION ENGINE (PERSISTENT-FIRST v2)
    // ============================================
    // Strategy: DB INSERT → WhatsApp Shadow Receipt → MP Attempt → Fallback
    // The order is NEVER lost, even if MP lags or crashes.
    // ============================================

    // 📲 WhatsApp link builder (extracted for reuse across branches)
    const buildWhatsAppUrl = (orderPayload) => {
        if (!ownerPhone) return null
        const mpAlias = config.payments?.mercadoPagoAlias || null
        const message = buildWhatsAppSummary(
            { ...orderPayload, orderNumber: orderPayload.order_number, customerInfo },
            businessName,
            orderPayload.payment_method,
            mpAlias
        )
        return `https://wa.me/${ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    }

    const handleSubmit = async () => {
        if (isSubmitting || submitted || !order?.items?.length) return
        if (tenantData?.is_paused || tenantData?.pause_orders) return
        if (isOutOfRadius) return

        // ─── STEP 1: VALIDATION ───────────────────────────
        const errors = []

        // 🛡️ NAME: Required for pickup/delivery, OPTIONAL for dine-in
        if (orderType !== 'dine_in' && (!customerInfo.name || customerInfo.name.length < 2)) {
            errors.push(t('required_fields'))
        }

        // 🛡️ P0 #2: Phone validation (strip non-digits, require 8+ digits)
        if (customerInfo.phone) {
            const digitsOnly = customerInfo.phone.replace(/\D/g, '')
            if (digitsOnly.length < 8) {
                errors.push(t('phone_invalid'))
            }
        }

        if (orderType === 'delivery') {
            if (!customerInfo.phone || customerInfo.phone.replace(/\D/g, '').length < 8) {
                errors.push(t('whatsapp_required'))
            }
            const validation = validateDeliveryInfo(customerInfo)
            if (!validation.valid) errors.push(...validation.errors)
        }

        // 🛡️ RESERVATION: Date/Time/Party required for Dine-In
        if (orderType === 'dine_in') {
            if (!reservationDate) errors.push('Por favor selecciona una fecha')
            if (!reservationTime) errors.push('Por favor selecciona una hora')
            if (!customerInfo.name || customerInfo.name.length < 2) errors.push('Por favor ingresa tu nombre')
        }

        if (errors.length > 0) {
            setValidationErrors(errors)
            showToast('⚠️ ' + t('required_fields'))
            return
        }

        setValidationErrors([])
        setIsSubmitting(true)

        const orderNumber = generateOrderNumber()
        const guestToken = getScopedGuestToken()
        // Dine-in always pays at the end — force cash so order goes straight to kitchen
        const effectivePaymentMethod = orderType === 'dine_in' ? 'cash' : paymentMethod
        const isCashPath = effectivePaymentMethod === 'cash' || effectivePaymentMethod === 'card_on_delivery' || effectivePaymentMethod === 'whatsapp'
        const isWhatsApp = effectivePaymentMethod === 'whatsapp'

        const isCash = effectivePaymentMethod === 'cash' || effectivePaymentMethod === 'card_on_delivery' || effectivePaymentMethod === 'whatsapp'
        const isDineInPayAfter = orderType === 'dine_in' && isCash
        const isDeliveryCash = orderType === 'delivery' && isCash
        const orderStatus = effectivePaymentMethod === 'mercado_pago'
            ? ORDER_STATUS.PENDING_PAYMENT
            : isDineInPayAfter
                ? ORDER_STATUS.RELEASED_TO_KITCHEN
                : isDeliveryCash
                    ? ORDER_STATUS.RELEASED_TO_KITCHEN
                    : isCash
                        ? ORDER_STATUS.PAID_UNRELEASED
                        : ORDER_STATUS.RELEASED_TO_KITCHEN

        const orderPaymentStatus = isDineInPayAfter ? 'unpaid' : 'pending'

        const newOrder = {
            business_id: businessId,
            guest_token: guestToken,
            order_number: orderNumber,
            items: order.items,
            subtotal: subtotal,
            delivery_fee: actualDeliveryFee,
            total: total,
            status: orderStatus,
            payment_status: orderPaymentStatus,
            payment_confirmed: isCash ? false : undefined,
            order_type: orderType,
            customer_name: customerInfo.name || null,
            customer_phone: customerInfo.phone || null,
            delivery_address: isDelivery ? (customerInfo.address || null) : null,
            table_number: orderType === 'dine_in' ? customerInfo.tableNumber : null,
            notes: customerInfo.specialRequests || null,
            payment_method: effectivePaymentMethod,
            distance_km: isDelivery ? distanceResult.distanceKm : null,
            created_at: new Date().toISOString()
        }

        // ─── STEP 2: WHATSAPP GATEWAY ( synchronous — must fire before any await ) ───────
        // Browsers block window.open after async gaps. Fire while user gesture is active.
        const whatsappUrl = buildWhatsAppUrl(newOrder)
        if (isWhatsApp && whatsappUrl && orderType !== 'dine_in') {
            window.open(whatsappUrl, '_blank')
        }

        try {
            // ─── STEP 3: PERSISTENT-FIRST DB INSERT ───────────
            // The order exists in Supabase BEFORE any external API call.
            // Even if the user's phone dies here, the owner sees the order.
            const { data: savedOrder, error } = await supabase
                .from('orders')
                .insert(newOrder)
                .select()
                .single()

            if (error) throw error

            // Store phone for recovery
            if (customerInfo?.phone) {
                localStorage.setItem('fs_customer_phone', customerInfo.phone)
            }
            // 💾 Remember order so customer can find it after closing tab
            localStorage.setItem(`fs_${tenantSlug}_last_order_id`, savedOrder.id)

            // 🍽️ SAVE RESERVATION (Dine-In Only)
            if (orderType === 'dine_in') {
                try {
                    await supabase
                        .from('reservations')
                        .insert({
                            business_id: businessId,
                            customer_name: customerInfo.name.trim(),
                            customer_phone: customerInfo.phone.trim(),
                            reservation_date: reservationDate,
                            reservation_time: reservationTime + ':00',
                            party_size: partySize,
                            notes: reservationNotes.trim() || null,
                            status: 'pending',
                            related_order_id: savedOrder.id
                        })
                } catch (resErr) {
                    console.warn('[Order] Reservation save failed (non-blocking):', resErr)
                }
            }

            // ─── STEP 4: PAYMENT ROUTING ──────────────────────
            if (effectivePaymentMethod === 'mercado_pago') {
                const mpKey = `fs_${tenantSlug}_mp_checkout`

                // Signal: preference is being created in background
                localStorage.setItem(mpKey, JSON.stringify({
                    orderId: savedOrder.id,
                    status: 'creating',
                    ts: Date.now(),
                    attempts: 0
                }))

                // Navigate immediately — same feel as cash order
                clearCart()
                incrementOrderCount()
                if (isDelivery) clearDeliveryMode()
                setSubmitted(true)
                setTimeout(() => {
                    if (isDelivery) {
                        navigate(`/${tenantSlug}/receipt?order_id=${savedOrder.id}`)
                    } else {
                        navigate(`/${tenantSlug}/status?orderId=${savedOrder.id}`)
                    }
                }, 1500)

                // Fire create-preference in background (non-blocking, aggressive retry)
                ;(async () => {
                    const MAX_RETRIES = 6 // 6 attempts = ~30sec total
                    const INITIAL_DELAY = 500

                    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                        try {
                            if (attempt > 0) {
                                // Exponential backoff: 500ms, 1s, 2s, 4s, 8s, 16s
                                const delayMs = INITIAL_DELAY * Math.pow(2, attempt - 1)
                                console.log(`[Order] MP attempt ${attempt + 1}/${MAX_RETRIES}, waiting ${delayMs}ms...`)
                                await new Promise(r => setTimeout(r, delayMs))
                            }

                            // Update attempt counter in localStorage
                            const current = JSON.parse(localStorage.getItem(mpKey) || '{}')
                            localStorage.setItem(mpKey, JSON.stringify({
                                ...current,
                                attempts: attempt + 1
                            }))

                            const { data: mpData, error: mpError } = await supabase.functions.invoke('create-preference', {
                                body: { order_id: savedOrder.id }
                            })

                            if (mpData?.init_point) {
                                console.log(`[Order] ✅ MP preference created on attempt ${attempt + 1}`)
                                localStorage.setItem(mpKey, JSON.stringify({
                                    orderId: savedOrder.id,
                                    status: 'ready',
                                    checkoutUrl: mpData.init_point,
                                    ts: Date.now(),
                                    attempts: attempt + 1
                                }))
                                return
                            }

                            // If error is "not configured", don't retry
                            if (mpData?.error === 'mp_not_configured') {
                                console.error('[Order] MP not configured for this tenant')
                                localStorage.setItem(mpKey, JSON.stringify({
                                    orderId: savedOrder.id,
                                    status: 'error',
                                    error: 'Mercado Pago no configurado. Contacta al restaurante.',
                                    ts: Date.now(),
                                    attempts: attempt + 1
                                }))
                                return
                            }

                            // If limit reached, don't retry
                            if (mpData?.error === 'mp_limit_reached') {
                                console.error('[Order] MP free tier limit reached')
                                localStorage.setItem(mpKey, JSON.stringify({
                                    orderId: savedOrder.id,
                                    status: 'error',
                                    error: mpData.message || 'Límite de pagos alcanzado. Contáctanos.',
                                    ts: Date.now(),
                                    attempts: attempt + 1
                                }))
                                return
                            }

                            // Retry on any other error (network, timeout, etc)
                            console.warn(`[Order] MP attempt ${attempt + 1} failed:`, mpError?.message || mpData?.error)

                        } catch (err) {
                            console.warn(`[Order] MP attempt ${attempt + 1} exception:`, err.message)
                        }
                    }

                    // All retries exhausted
                    console.error('[Order] ❌ MP preference creation failed after all retries')
                    localStorage.setItem(mpKey, JSON.stringify({
                        orderId: savedOrder.id,
                        status: 'error',
                        error: 'No se pudo conectar con Mercado Pago. Por favor, intenta de nuevo.',
                        ts: Date.now(),
                        attempts: MAX_RETRIES
                    }))
                })()

                return
            }

            // ─── STEP 5: FINALIZE IMMEDIATELY ────────────────
            // Order is saved — navigate now (ledger is non-blocking)
            clearCart()
            incrementOrderCount()
            if (isDelivery) clearDeliveryMode()

            setSubmitted(true)
            setTimeout(() => {
                if (isDelivery) {
                    navigate(`/${tenantSlug}/receipt?order_id=${savedOrder.id}`)
                } else {
                    navigate(`/${tenantSlug}/status?orderId=${savedOrder.id}`)
                }
            }, 1500)

            // ─── STEP 6: FIRE-AND-FORGET CASH LEDGER ─────────
            // Non-blocking: ledger creation happens in background (or queued offline)
            // 🛡️ DINE-IN PAY-AFTER: Skip cash ledger — payment happens after the meal
            if (isCashPath && savedOrder && !isDineInPayAfter) {
                handleCashPayment({
                    orderId: savedOrder.id,
                    amountCents: Math.round(savedOrder.total * 100),
                    businessId: businessId,
                    currency: 'ARS'
                }).catch((cashError) => {
                    console.warn('[Order] Cash ledger write queued offline:', cashError.message)
                    // Ledger failed online, will sync when connection returns
                })
                // Don't await — payment safeguarded by offline queue fallback
            }

        } catch (err) {
            console.error('[Order] Submission Error:', err)
            showToast('❌ Error al enviar el pedido: ' + err.message)
            setIsSubmitting(false)
        }
    }

    // 📲 WHATSAPP HYBRID: DB insert + open WhatsApp
    const handleWhatsAppSubmit = async () => {
        if (isSubmitting || submitted || !order?.items?.length) return
        if (tenantData?.is_paused || tenantData?.pause_orders) return
        if (isOutOfRadius) return

        // Validation (same as handleSubmit)
        const errors = []
        if (!customerInfo.name || customerInfo.name.length < 2) errors.push(t('required_fields'))
        if (customerInfo.phone) {
            const digitsOnly = customerInfo.phone.replace(/\D/g, '')
            if (digitsOnly.length < 8) errors.push(t('phone_invalid'))
        }
        if (orderType === 'delivery') {
            if (!customerInfo.phone || customerInfo.phone.replace(/\D/g, '').length < 8) {
                errors.push(t('whatsapp_required'))
            }
            const validation = validateDeliveryInfo(customerInfo)
            if (!validation.valid) errors.push(...validation.errors)
        } else if (orderType === 'dine_in') {
            if (!customerInfo.tableNumber) errors.push(t('table_number_required_error'))
        }
        if (errors.length > 0) {
            setValidationErrors(errors)
            showToast('⚠️ ' + t('required_fields'))
            return
        }

        setValidationErrors([])
        setIsSubmitting(true)

        const orderNumber = generateOrderNumber()
        const guestToken = getScopedGuestToken()

        const newOrder = {
            business_id: businessId,
            guest_token: guestToken,
            order_number: orderNumber,
            items: order.items,
            subtotal: subtotal,
            delivery_fee: actualDeliveryFee,
            total: total,
            status: ORDER_STATUS.PAID_UNRELEASED, // ALL orders require owner approval before kitchen starts
            payment_status: isDelivery ? 'unpaid' : 'pending',
            order_type: orderType,
            customer_name: customerInfo.name || null,
            customer_phone: customerInfo.phone || null,
            delivery_address: isDelivery ? (customerInfo.address || null) : null,
            table_number: orderType === 'dine_in' ? customerInfo.tableNumber : null,
            payment_method: 'cash',
            distance_km: isDelivery ? distanceResult.distanceKm : null,
            created_at: new Date().toISOString()
        }

        try {
            const { data: savedOrder, error } = await supabase
                .from('orders')
                .insert(newOrder)
                .select()
                .single()

            if (error) throw error

            if (customerInfo?.phone) {
                localStorage.setItem('fs_customer_phone', customerInfo.phone)
            }
            // 💾 Remember order so customer can find it after closing tab
            localStorage.setItem(`fs_${tenantSlug}_last_order_id`, savedOrder.id)

            // 🔒 MVP: Auto-open WhatsApp (Pedix style) — customer confirms order in chat
            const whatsappUrl = buildWhatsAppUrl(newOrder)
            if (whatsappUrl) {
                // Open WhatsApp immediately (don't wait)
                window.open(whatsappUrl, '_blank')
            } else {
                showToast('⚠️ WhatsApp number not configured')
            }

            clearCart()
            incrementOrderCount()
            if (isDelivery) clearDeliveryMode()

            setSubmitted(true)
            // Fast redirect to status/receipt (customer confirms in WhatsApp, follows here)
            setTimeout(() => {
                navigate(`/${tenantSlug}/status?orderId=${savedOrder.id}`)
            }, 800)
        } catch (err) {
            console.error('[Order] WhatsApp Submit Error:', err)
            showToast('❌ Error al enviar el pedido: ' + err.message)
            setIsSubmitting(false)
        }
    }

    // 🔄 PAYMENT RETRY HANDLERS (Audit #7)
    const handleRetryPayment = async () => {
        if (!pendingOrderId || !businessId) return

        setIsSubmitting(true)
        setRetryError(null)

        try {
            // SILO GUARD: Verify order belongs to this tenant
            const { data: order, error: fetchError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', pendingOrderId)
                .eq('business_id', businessId) // 🔒 SILO GUARD - REQUIRED
                .eq('status', ORDER_STATUS.PENDING_PAYMENT)
                .single()

            if (fetchError || !order) {
                setRetryError('Order not found or expired. Please create a new order.')
                setIsSubmitting(false)
                return
            }

            setRetryError('Cash orders cannot be retried. Please contact the restaurant.')
            setIsSubmitting(false)
            return

        } catch (err) {
            console.error('[Order] Retry payment error:', err)
            setRetryError('Connection error. Please check your internet and try again.')
            setIsSubmitting(false)
        }
    }

    const handleCancelRetry = async () => {
        if (pendingOrderId && businessId) {
            // SILO GUARD: Cancel the pending order
            await supabase
                .from('orders')
                .update({ status: ORDER_STATUS.CANCELLED, cancel_reason: 'payment_abandoned' })
                .eq('id', pendingOrderId)
                .eq('business_id', businessId) // 🔒 SILO GUARD
        }

        setIsRetryMode(false)
        setPendingOrderId(null)
        setRetryError(null)
        clearCart()
        navigate(`../menu`)
    }

    // ============================================
    // RENDER: RETRY MODE (Audit #7)
    // ============================================
    if (isRetryMode) {
        return (
            <div style={{ minHeight: '100vh', paddingBottom: 140, background: '#F8F9FA' }}>
                <HeaderClamp config={config} />

                <div style={{ margin: '0 14px', paddingTop: 20 }}>
                    <div className="retry-container">
                        <h3 className="retry-title">⚠️ Payment Failed</h3>

                        {retryError && <p className="retry-error">{retryError}</p>}

                        <p className="retry-message">
                            Your order is saved. Try payment again or cancel.
                        </p>

                        <div className="retry-actions">
                            <button
                                className="btn-retry"
                                onClick={handleRetryPayment}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Processing...' : '🔄 Reintentar Pago'}
                            </button>

                            <button
                                className="btn-retry-cancel"
                                onClick={handleCancelRetry}
                                disabled={isSubmitting}
                            >
                                Cancel Order
                            </button>
                        </div>

                        <p className="retry-order-id">
                            Order ID: {pendingOrderId?.slice(0, 8)}...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // ============================================
    // RENDER: SUBMITTED STATE
    // ============================================
    if (submitted) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                background: '#FAFAF8'
            }}>
                <div style={{
                    background: '#FFFFFF',
                    borderRadius: 20,
                    padding: '32px 28px',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
                    maxWidth: 320,
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px'
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1F2937', marginBottom: 8 }}>
                        {t('order_sent')}
                    </h2>
                    <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
                        {orderType === 'dine_in' ? t('notifying_kitchen') : t('redirecting_status')}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                        {[0, 1, 2].map(dot => (
                            <div key={dot} style={{
                                width: 8, height: 8, borderRadius: '50%', background: '#D1D5DB',
                                animation: `pulse 1.4s ease-in-out infinite`,
                                animationDelay: `${dot * 0.2}s`
                            }} />
                        ))}
                    </div>
                </div>
                <style>{`@keyframes pulse { 0%, 80%, 100% { opacity: 0.4; transform: scale(0.9); } 40% { opacity: 1; transform: scale(1); } }`}</style>
            </div>
        )
    }

    // ============================================
    // RENDER: EMPTY CART — Redirect to OrderStatusEmpty
    // ============================================
    if (!order?.items?.length) {
        navigate(`/${tenantSlug}/status`, { replace: true })
        return null
    }

    // ============================================
    // RENDER: MAIN CHECKOUT (Strike 11 Specs)
    // ============================================
    return (
        <div style={{ minHeight: '100vh', paddingBottom: 140, background: '#F8F9FA' }}>
            <HeaderClamp config={config} />


            <div style={{ margin: '0 14px' }}>
                <div style={{ marginBottom: 20 }}>
                    <div style={{ marginBottom: 12 }}>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
                            {t('your_order')}
                        </h1>
                        {/* Order type selector — only show when multiple modes are enabled */}
                        {(() => {
                            const modes = []
                            if (serviceModes?.pickup) modes.push({ id: 'pickup', label: t('pickup') || 'Take Out' })
                            if (serviceModes?.dineIn) modes.push({ id: 'dine_in', label: t('dine_in') || 'Dine In' })
                            if (serviceModes?.delivery) modes.push({ id: 'delivery', label: t('delivery') || 'Delivery' })
                            if (modes.length <= 1) return null
                            return (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {modes.map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setOrderType(mode.id)}
                                            style={{
                                                flex: 1, padding: '8px 12px', borderRadius: 10, border: 'none',
                                                background: orderType === mode.id ? '#111827' : '#F3F4F6',
                                                color: orderType === mode.id ? 'white' : '#4B5563',
                                                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>
                            )
                        })()}
                    </div>

                    {(tenantData?.is_paused || tenantData?.pause_orders) && (
                        <div style={{ background: '#FEF3C7', padding: 12, borderRadius: 12, marginBottom: 16, textAlign: 'center' }}>
                            <p style={{ color: '#92400E', fontSize: 14 }}>⏸️ {tenantData?.pause_message || 'Pedidos pausados'}</p>
                        </div>
                    )}
                </div>

                {/* 2. PREMIUM FORM SECTION */}
                <div style={{
                    background: 'white', borderRadius: 24, padding: 24,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.04)', marginBottom: 24
                }}>
                    {orderType !== 'dine_in' && (
                        <div style={{ marginBottom: 24 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>
                                {t('delivery_details')}
                            </h3>
                        </div>
                    )}

                    {/* Validation Errors */}
                    {validationErrors.length > 0 && (
                        <div style={{ background: '#FEE2E2', padding: 12, borderRadius: 12, marginBottom: 20 }}>
                            {validationErrors.map((err) => (
                                <p key={err} style={{ color: '#DC2626', fontSize: 14, fontWeight: 700, margin: '2px 0' }}>
                                    {err}
                                </p>
                            ))}
                        </div>
                    )}

                    {/* INPUT FIELDS */}
                    {orderType === 'delivery' ? (
                        <>
                            {isOutOfRadius && (
                                <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', padding: 16, borderRadius: 12, marginBottom: 20, textAlign: 'center' }}>
                                    <div style={{ fontSize: 24, marginBottom: 4 }}>🚫</div>
                                    <h4 style={{ color: '#DC2626', margin: 0 }}>Fuera de Radio ({deliveryRadius}km)</h4>
                                </div>
                            )}

                            <InputGroup
                                label={t('name_label')} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                                value={customerInfo.name}
                                onChange={(e) => setCustomerInfo(p => ({ ...p, name: e.target.value }))}
                                placeholder={t('name_placeholder')}
                            />
                            <InputGroup
                                label={t('phone_label')} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
                                value={customerInfo.phone}
                                onChange={(e) => setCustomerInfo(p => ({ ...p, phone: e.target.value }))}
                                placeholder={t('phone_label') + ' (ex: 1123456789)'}
                                type="tel"
                            />

                            {/* 🛡️ STRIKE 17: STRUCTURED ADDRESS GRID */}
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                                <InputGroup
                                    label={t('street_label')}
                                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>}
                                    value={customerInfo.address.street}
                                    onChange={(e) => setCustomerInfo(p => ({ ...p, address: { ...p.address, street: e.target.value } }))}
                                    placeholder={t('street_placeholder')}
                                />
                                <InputGroup
                                    label={t('number_label')}
                                    icon={<span style={{ fontSize: 16, fontWeight: 700 }}>#</span>}
                                    value={customerInfo.address.number}
                                    onChange={(e) => setCustomerInfo(p => ({ ...p, address: { ...p.address, number: e.target.value } }))}
                                    placeholder={t('number_placeholder')}
                                    inputMode="numeric"
                                />
                            </div>

                            <InputGroup
                                label={t('floor_label')}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18" /><rect x="5" y="3" width="14" height="14" rx="2" /></svg>}
                                value={customerInfo.address.floor}
                                onChange={(e) => setCustomerInfo(p => ({ ...p, address: { ...p.address, floor: e.target.value } }))}
                                placeholder={t('floor_placeholder')}
                            />

                            <InputGroup
                                label={t('notes_label')}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>}
                                value={customerInfo.address.notes}
                                onChange={(e) => setCustomerInfo(p => ({ ...p, address: { ...p.address, notes: e.target.value } }))}
                                placeholder={t('notes_placeholder')}
                                isTextArea={true}
                            />
                        </>
                    ) : orderType === 'dine_in' ? (
                        <>
                            {/* MESA # + NAME tucked in same row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12, marginBottom: 16 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Mesa</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12V14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V12Z" stroke="#111827" strokeWidth="1.5"/>
                                                <path d="M7 4V2.5" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
                                                <path d="M17 4V2.5" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
                                                <path d="M9 14.5L10.5 13V17" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M13 16V14C13 13.4477 13.4477 13 14 13C14.5523 13 15 13.4477 15 14V16C15 16.5523 14.5523 17 14 17C13.4477 17 13 16.5523 13 16Z" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
                                                <path d="M2.5 9H21.5" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
                                            </svg>
                                        </div>
                                        <input
                                            type="text" inputMode="numeric" pattern="[0-9]*"
                                            value={customerInfo.tableNumber}
                                            onChange={(e) => setCustomerInfo(p => ({ ...p, tableNumber: e.target.value }))}
                                            placeholder="#"
                                            style={{ width: '100%', padding: '13px 12px 13px 38px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 15, fontWeight: 700, color: '#1F2937', background: 'white', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>{t('name_label')}</label>
                                    <input
                                        type="text"
                                        value={customerInfo.name}
                                        onChange={(e) => setCustomerInfo(p => ({ ...p, name: e.target.value }))}
                                        placeholder={t('name_placeholder')}
                                        style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 15, color: '#1F2937', background: 'white', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            {/* RESERVAR — lowkey ghost button */}
                            <button
                                onClick={() => setShowReservation(r => !r)}
                                style={{
                                    width: '100%', padding: '11px 16px',
                                    borderRadius: 12, border: '1.5px solid #E5E7EB',
                                    background: 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    cursor: 'pointer', transition: 'all 0.2s', marginBottom: showReservation ? 20 : 0
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12V14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V12Z" stroke="#374151" strokeWidth="1.5"/>
                                        <path d="M7 4V2.5" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
                                        <path d="M17 4V2.5" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
                                        <path d="M9 14.5L10.5 13V17" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M13 16V14C13 13.4477 13.4477 13 14 13C14.5523 13 15 13.4477 15 14V16C15 16.5523 14.5523 17 14 17C13.4477 17 13 16.5523 13 16Z" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
                                        <path d="M2.5 9H21.5" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
                                    </svg>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                                        {reservationDate && reservationHour
                                            ? `${formatDateDisplay(reservationDate)} · ${reservationTime} · ${partySize} pers.`
                                            : 'Reservar'}
                                    </span>
                                </div>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5"
                                    style={{ transform: showReservation ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </button>

                            {/* PROGRESSIVE RESERVATION PANEL */}
                            {showReservation && (
                                <div style={{ marginTop: 4 }}>
                                    {/* STEP 1 — always show: MONTH CALENDAR */}
                                    <div style={{ marginBottom: 20 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                            <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() } })}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: 20, color: '#9CA3AF', lineHeight: 1 }}>‹</button>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1F2937', textTransform: 'capitalize' }}>
                                                {new Date(calMonth.year, calMonth.month).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                                            </span>
                                            <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() } })}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: 20, color: '#9CA3AF', lineHeight: 1 }}>›</button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
                                            {['Lu','Ma','Mi','Ju','Vi','Sa','Do'].map(d => (
                                                <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#9CA3AF', paddingBottom: 6 }}>{d}</div>
                                            ))}
                                        </div>
                                        {calWeeks.map((week, wi) => (
                                            <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
                                                {week.map((cell, di) => cell === null ? <div key={di} /> : (
                                                    <button key={di} disabled={cell.past} onClick={() => !cell.past && setReservationDate(cell.value)}
                                                        style={{
                                                            padding: '8px 0', border: 'none', borderRadius: 8,
                                                            background: reservationDate === cell.value ? '#111827' : 'transparent',
                                                            color: reservationDate === cell.value ? 'white' : cell.past ? '#D1D5DB' : '#111827',
                                                            fontWeight: reservationDate === cell.value ? 700 : 400,
                                                            fontSize: 13, cursor: cell.past ? 'default' : 'pointer',
                                                            textAlign: 'center', transition: 'all 0.15s'
                                                        }}
                                                    >{cell.day}</button>
                                                ))}
                                            </div>
                                        ))}
                                    </div>

                                    {/* STEP 2 — appears after date picked */}
                                    {reservationDate && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                                            <div>
                                                <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Hora</p>
                                                <select value={reservationHour} onChange={e => setReservationHour(e.target.value)}
                                                    style={{ width: '100%', padding: '11px 10px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 15, fontWeight: 700, color: '#1F2937', background: 'white', cursor: 'pointer', appearance: 'none', textAlign: 'center' }}>
                                                    <option value="">--</option>
                                                    {Array.from({length: 13}, (_,i) => i + 11).map(h => (
                                                        <option key={h} value={String(h).padStart(2,'0')}>{String(h).padStart(2,'0')}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Min</p>
                                                <select value={reservationMin} onChange={e => setReservationMin(e.target.value)}
                                                    style={{ width: '100%', padding: '11px 10px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 15, fontWeight: 700, color: '#1F2937', background: 'white', cursor: 'pointer', appearance: 'none', textAlign: 'center' }}>
                                                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 3 — appears after time picked */}
                                    {reservationDate && reservationHour && (
                                        <div style={{ marginBottom: 16 }}>
                                            <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Personas</p>
                                            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', height: 46 }}>
                                                <button onClick={() => setPartySize(p => Math.max(1, p - 1))}
                                                    style={{ flex: 1, border: 'none', background: 'white', fontSize: 20, color: '#6B7280', cursor: 'pointer' }}>−</button>
                                                <span style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 800, color: '#111827' }}>{partySize}</span>
                                                <button onClick={() => setPartySize(p => Math.min(30, p + 1))}
                                                    style={{ flex: 1, border: 'none', background: 'white', fontSize: 20, color: '#6B7280', cursor: 'pointer' }}>+</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 4 — appears after party size interacted */}
                                    {reservationDate && reservationHour && (
                                        <InputGroup
                                            label="Notas"
                                            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>}
                                            value={reservationNotes}
                                            onChange={(e) => setReservationNotes(e.target.value)}
                                            placeholder="Ocasión especial, alergias, preferencias..."
                                            isTextArea={true}
                                        />
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        /* pickup / takeout */
                        <>
                            <InputGroup
                                label={t('name_label')} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                                value={customerInfo.name}
                                onChange={(e) => setCustomerInfo(p => ({ ...p, name: e.target.value }))}
                                placeholder={t('name_placeholder')}
                            />
                            <InputGroup
                                label={t('phone_label')} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
                                value={customerInfo.phone}
                                onChange={(e) => setCustomerInfo(p => ({ ...p, phone: e.target.value }))}
                                placeholder={t('phone_label') + ' (ex: 1123456789)'}
                                type="tel"
                            />
                        </>
                    )}
                </div>

                {/* 3. PREMIUM PAYMENT SELECTOR — hidden for dine-in (pay at end, implied) */}
                {orderType !== 'dine_in' && (
                <div ref={paymentSectionRef} style={{
                    background: 'white', borderRadius: 24, padding: 24,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.04)', marginBottom: 24
                }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>
                        {t('payment_methods') || 'Payment Method'}
                    </h3>

                    {!paymentMethods.cash && (
                        <div style={{ padding: '16px', background: '#FEF2F2', borderRadius: 12, border: '1px solid #FECACA', textAlign: 'center' }}>
                            <p style={{ fontSize: 14, color: '#991B1B', fontWeight: 600, margin: 0 }}>
                                No payment methods available. Please contact the restaurant.
                            </p>
                        </div>
                    )}

                    {paymentMethods.cash && (
                        <PaymentMethodCard
                            id="efectivo"
                            selected={paymentMethod === 'cash'}
                            onClick={() => setPaymentMethod('cash')}
                            title={t('cash')}
                            subtitle={t('cash_delivery')}
                            color="#22C55E"
                            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
                        />
                    )}

                    {paymentMethods.whatsapp && (
                        <PaymentMethodCard
                            id="whatsapp"
                            selected={paymentMethod === 'whatsapp'}
                            onClick={() => setPaymentMethod('whatsapp')}
                            title={t('label_whatsapp') || 'WhatsApp'}
                            subtitle={'Confirmar por WhatsApp'}
                            color="#25D366"
                            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>}
                        />
                    )}

                    {paymentMethods.mercado_pago && (
                        <PaymentMethodCard
                            id="mercado_pago"
                            selected={paymentMethod === 'mercado_pago'}
                            onClick={() => setPaymentMethod('mercado_pago')}
                            title="Mercado Pago"
                            subtitle="Tarjeta de crédito/débito o billetera"
                            color="#0066FF"
                            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9zm0 2c-3.87 0-7 3.13-7 7s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7z"/></svg>}
                        />
                    )}
                </div>
                )}

                {/* 4. ORDER ITEMS */}
                <div style={{ background: 'white', borderRadius: 24, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>{t('summary')}</h3>
                    {order.items.map((item, index) => (
                        <div key={item.id ?? `item-${index}`} style={{
                            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
                            borderBottom: index < order.items.length - 1 ? '1px solid #F3F4F6' : 'none'
                        }}>
                            {getItemImage(item, index) && (
                                <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#F3F0EB' }}>
                                    <img src={getItemImage(item, index)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} />
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 15, fontWeight: 600, color: '#1F2937' }}>{item.name}</div>
                                <div style={{ fontSize: 14, color: '#6B7280' }}>{formatPrice(item.price)}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F9FAFB', padding: '4px 8px', borderRadius: 20 }}>
                                <button onClick={() => handleQuantityChange(index, -1)} style={{ border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', color: '#6B7280' }}>−</button>
                                <span style={{ fontSize: 14, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{item.quantity}</span>
                                <button onClick={() => handleQuantityChange(index, 1)} style={{ border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', color: '#111827' }}>+</button>
                            </div>
                        </div>
                    ))}

                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '2px dashed #E5E7EB' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 15 }}>
                            <span style={{ color: '#6B7280' }}>Subtotal</span>
                            <span style={{ fontWeight: 500 }}>{formatPrice(subtotal)}</span>
                        </div>
                        {isDelivery && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 15 }}>
                                <span style={{ color: '#6B7280' }}>Envío</span>
                                <span style={{ fontWeight: 500, color: isFreeDelivery ? '#22C55E' : 'inherit' }}>
                                    {isFreeDelivery ? 'Gratis' : formatPrice(actualDeliveryFee)}
                                </span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, alignItems: 'flex-end' }}>
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#1F2937' }}>Total</span>
                            <span style={{ fontSize: 24, fontWeight: 800, color: tenantData?.confirmation_color || '#C4856A' }}>{formatPrice(total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* FLOATING ACTION BUTTONS */}
            <div style={{
                position: 'fixed', bottom: '70px', left: 0, right: 0,
                padding: '12px 20px',
                paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(0,0,0,0.05)',
                marginBottom: '10px',
                zIndex: 40,
                display: 'flex', flexDirection: 'column', gap: 8
            }}>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || tenantData?.is_paused || tenantData?.pause_orders || isOutOfRadius}
                    style={{
                        width: '100%', padding: 18,
                        background: isOutOfRadius ? '#EF4444' : (tenantData?.confirmation_color || '#C4856A'),
                        color: 'white', border: 'none', borderRadius: 16,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontSize: 18, fontWeight: 700,
                        cursor: isOutOfRadius ? 'not-allowed' : 'pointer',
                        opacity: (isSubmitting || tenantData?.is_paused || tenantData?.pause_orders) ? 0.6 : 1,
                        boxShadow: '0 8px 24px -4px rgba(0,0,0,0.2)',
                        transform: 'translateZ(0)'
                    }}
                >
                    <span>{isSubmitting ? t('order_processing') : (isOutOfRadius ? t('out_of_delivery_radius') : (orderType === 'dine_in' && showReservation && reservationDate ? 'Confirmar Reservación' : t('confirm_order')))}</span>
                    {!isSubmitting && !isOutOfRadius && <span>➜</span>}
                </button>

            </div>

            {toastMessage && (
                <div style={{
                    position: 'fixed', bottom: 120, left: '50%', transform: 'translateX(-50%)',
                    background: '#1F2937', color: 'white', padding: '12px 24px',
                    borderRadius: 30, fontSize: 14, fontWeight: 600, zIndex: 9999,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    animation: 'slideUpToast 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {toastMessage}
                </div>
            )}
            <style>{`@keyframes slideUpToast { from { transform: translate(-50%, 40px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`}</style>
        </div>
    )
}

export default Order
// v1776796921
