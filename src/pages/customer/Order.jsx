import { useState, useEffect, useMemo } from 'react'
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
import { PAYMENT_METHOD } from '../../constants/database.js';



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
    <div
        onClick={onClick}
        style={{
            position: 'relative', padding: 16, marginBottom: 12,
            background: selected ? '#F0FDF4' : '#FFFFFF',
            border: selected ? `2px solid ${color}` : '1px solid #E5E7EB',
            borderRadius: 16, cursor: 'pointer', transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', gap: 16,
            boxShadow: selected ? `0 4px 12px ${color}20` : '0 2px 4px rgba(0,0,0,0.02)'
        }}
    >
        <div style={{ width: 48, height: 48, borderRadius: 12, background: selected ? 'white' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, flexShrink: 0 }}>
            {icon}
        </div>
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{subtitle}</div>
        </div>
        <div style={{
            width: 24, height: 24, borderRadius: '50%',
            border: selected ? `6px solid ${color}` : '2px solid #D1D5DB',
            background: 'white', transition: 'all 0.2s ease'
        }} />
    </div>
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
    const [paymentMethod, setPaymentMethod] = useState(() => {
        return PAYMENT_METHOD.CASH  // Default to cash, no MP option
    })
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
        const message = buildWhatsAppSummary(
            { ...orderPayload, orderNumber: orderPayload.order_number, customerInfo },
            businessName,
            orderPayload.payment_method
        )
        return `https://wa.me/${ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    }

    const handleSubmit = async () => {
        if (isSubmitting || submitted || !order?.items?.length) return
        if (config.pauseOrders) return
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

        // 🛡️ TABLE NUMBER: Only required for Dine In
        if (orderType === 'dine_in' && !customerInfo.tableNumber) {
            errors.push(t('table_number_required'))
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
        const effectivePaymentMethod = orderType === 'dine_in' ? PAYMENT_METHOD.CASH : paymentMethod
        const isCashPath = effectivePaymentMethod === PAYMENT_METHOD.CASH || effectivePaymentMethod === PAYMENT_METHOD.CARD_ON_DELIVERY
        const isWhatsApp = effectivePaymentMethod === PAYMENT_METHOD.WHATSAPP

        // ALL orders require owner approval before kitchen starts (prevent customer anger)
        const isCash = effectivePaymentMethod === PAYMENT_METHOD.CASH || effectivePaymentMethod === PAYMENT_METHOD.CARD_ON_DELIVERY
        const isDineInPayAfter = orderType === 'dine_in' && isCash
        const orderStatus = ORDER_STATUS.PAID_UNRELEASED  // Simple: everyone waits for approval

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
            debugger
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

            // ─── STEP 4: PAYMENT ROUTING ──────────────────────
            if (effectivePaymentMethod === PAYMENT_METHOD.MERCADO_PAGO) {
                try {
                    const { data: mpData, error: mpError } = await supabase.functions.invoke('create-preference', {
                        body: { order_id: savedOrder.id }
                    })
                    if (mpError) throw mpError
                    const checkoutUrl = mpData?.sandbox_init_point || mpData?.init_point
                    if (checkoutUrl) {
                        window.location.href = checkoutUrl
                        return
                    }
                    // create-preference returns 200 with error field if MP not configured
                    if (mpData?.error) throw new Error(mpData.error)
                    throw new Error('No checkout URL returned')
                } catch (mpErr) {
                    console.error('[Order] MP Error:', mpErr)
                    showToast('❌ Error al procesar pago: ' + mpErr.message)
                    setIsSubmitting(false)
                    return
                }
            }

            // ─── STEP 5: CASH/OFFLINE PAYMENT HANDLING ────────
            // If cash payment, create ledger entry (with offline resilience)
            // 🛡️ DINE-IN PAY-AFTER: Skip cash ledger — payment happens after the meal
            if (isCashPath && savedOrder && !isDineInPayAfter) {
                try {
                    const cashResult = await handleCashPayment({
                        orderId: savedOrder.id,
                        amountCents: Math.round(savedOrder.total * 100),
                        businessId: businessId,
                        currency: 'ARS'
                    })
                    
                    if (cashResult.method === 'offline') {
                        showToast('💾 ' + t('cash_offline'))
                    } else {
                        console.log('[Order] Cash payment logged:', cashResult.data?.ledgerId)
                    }
                } catch (cashError) {
                    console.warn('[Order] Cash payment logging failed:', cashError)
                    // Don't block order - payment can be reconciled later
                }
            }

            // ─── STEP 6: FINALIZE ─────────────────────────────
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

        } catch (err) {
            console.error('[Order] Submission Error:', err)
            showToast('❌ Error al enviar el pedido: ' + err.message)
            setIsSubmitting(false)
        }
    }

    // 📲 WHATSAPP HYBRID: DB insert + open WhatsApp
    const handleWhatsAppSubmit = async () => {
        if (isSubmitting || submitted || !order?.items?.length) return
        if (config.pauseOrders) return
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
            payment_method: PAYMENT_METHOD.CASH,
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
                                                background: orderType === mode.id ? (tenantData?.confirmation_color || '#C4856A') : '#F3F4F6',
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

                    {config.pauseOrders && (
                        <div style={{ background: '#FEF3C7', padding: 12, borderRadius: 12, marginBottom: 16, textAlign: 'center' }}>
                            <p style={{ color: '#92400E', fontSize: 14 }}>⏸️ {config.pauseOrdersMessage || 'Pedidos pausados'}</p>
                        </div>
                    )}
                </div>

                {/* 2. PREMIUM FORM SECTION */}
                <div style={{
                    background: 'white', borderRadius: 24, padding: 24,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.04)', marginBottom: 24
                }}>
                    <div style={{ marginBottom: 24 }}>
                        {orderType === 'dine_in' ? (
                            <div style={{
                                background: '#1F2937', color: 'white',
                                padding: '16px 20px', borderRadius: 16,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <div>
                                    <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>{t('location_label')}</span>
                                    <div style={{ fontSize: 20, fontWeight: 700 }}>{t('dine_in_table')}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 12 }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8" /><line x1="6" y1="6" x2="6" y2="6" /><line x1="6" y1="30" x2="6" y2="30" /></svg>
                                </div>
                            </div>
                        ) : (
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>
                                {t('delivery_details')}
                            </h3>
                        )}
                    </div>

                    {/* Validation Errors */}
                    {validationErrors.length > 0 && (
                        <div style={{ background: '#FEE2E2', padding: 12, borderRadius: 12, marginBottom: 20 }}>
                            {validationErrors.map((err) => (
                                <p key={err} style={{ color: '#DC2626', fontSize: 14, margin: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>⚠️</span> {err}
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
                            <InputGroup
                                label={t('table_number_label')} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3z" /><path d="M21 9H3" /><path d="M21 15H3" /><path d="M9 3v18" /><path d="M15 3v18" /></svg>}
                                value={customerInfo.tableNumber}
                                onChange={(e) => setCustomerInfo(p => ({ ...p, tableNumber: e.target.value }))}
                                placeholder={t('table_number_placeholder')}
                                inputMode="numeric" pattern="[0-9]*"
                            />
                            <InputGroup
                                label={t('name_label')} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                                value={customerInfo.name}
                                onChange={(e) => setCustomerInfo(p => ({ ...p, name: e.target.value }))}
                                placeholder={t('name_placeholder')}
                            />
                            <InputGroup
                                label="Special Requests" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>}
                                value={customerInfo.specialRequests}
                                onChange={(e) => setCustomerInfo(p => ({ ...p, specialRequests: e.target.value }))}
                                placeholder="Allergies, preferences, special requests..."
                                isTextArea={true}
                            />
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

                {/* 3. PREMIUM PAYMENT SELECTOR */}
                {orderType === 'dine_in' ? (
                    /* Dine-in: no payment selector — pay at the end */
                    <div style={{
                        background: 'white', borderRadius: 24, padding: 24,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.04)', marginBottom: 24,
                        display: 'flex', alignItems: 'center', gap: 16,
                    }}>
                        <span style={{ fontSize: 32 }}>😊</span>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>{t('dine_in_pay_at_end_message')}</div>
                        </div>
                    </div>
                ) : (
                <div style={{
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
                            selected={paymentMethod === PAYMENT_METHOD.CASH}
                            onClick={() => setPaymentMethod(PAYMENT_METHOD.CASH)}
                            title={t(PAYMENT_METHOD.CASH)}
                            subtitle={t('cash_delivery')}
                            color="#22C55E"
                            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
                        />
                    )}

                    <PaymentMethodCard
                        id="whatsapp"
                        selected={paymentMethod === PAYMENT_METHOD.WHATSAPP}
                        onClick={() => setPaymentMethod(PAYMENT_METHOD.WHATSAPP)}
                        title={t('label_whatsapp') || 'WhatsApp'}
                        subtitle={'Confirmar por WhatsApp'}
                        color="#25D366"
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>}
                    />

                    {paymentMethods.mercado_pago && (
                        <PaymentMethodCard
                            id="mercado_pago"
                            selected={paymentMethod === PAYMENT_METHOD.MERCADO_PAGO}
                            onClick={() => setPaymentMethod(PAYMENT_METHOD.MERCADO_PAGO)}
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
                    disabled={isSubmitting || config.pauseOrders || isOutOfRadius}
                    style={{
                        width: '100%', padding: 18,
                        background: isOutOfRadius ? '#EF4444' : (tenantData?.confirmation_color || '#C4856A'),
                        color: 'white', border: 'none', borderRadius: 16,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontSize: 18, fontWeight: 700,
                        cursor: isOutOfRadius ? 'not-allowed' : 'pointer',
                        opacity: (isSubmitting || config.pauseOrders) ? 0.6 : 1,
                        boxShadow: '0 8px 24px -4px rgba(0,0,0,0.2)',
                        transform: 'translateZ(0)'
                    }}
                >
                    <span>{isSubmitting ? t('order_processing') : (isOutOfRadius ? t('out_of_delivery_radius') : t('confirm_order'))}</span>
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
