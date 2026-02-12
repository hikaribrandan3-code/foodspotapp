import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatPrice } from '../../config/menuData.js'
import { supabase } from '../../lib/supabaseClient.js'
import { getGuestToken } from '../../utils/guestToken.js'
import HeaderClamp from '../../components/HeaderClamp.jsx'
import { getDividerPreset } from '../../config/dividerPresets.js'
import {
    getCurrentOrder,
    clearCurrentOrder,
    updateItemQuantity,
    removeFromCurrentOrder,
    generateOrderNumber,
    incrementOrderCount
} from '../../utils/storage.js'
import {
    isDeliveryMode,
    isCashPaymentAllowed,
    validateDeliveryInfo,
    clearDeliveryMode,
    isWithinDeliveryRadius,
    buildWhatsAppSummary
} from '../../utils/deliveryUtils.js'
import { useTenant } from '../../contexts/TenantContext.jsx'

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
            background: selected ? (id === 'mercadopago' ? '#EFF6FF' : '#F0FDF4') : '#FFFFFF',
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
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=100&h=100&fit=crop',
]

function Order({ config: configProp }) {
    const { businessId, tenantData, serviceModes } = useTenant()
    const config = configProp || tenantData?.app_config || {}
    const navigate = useNavigate()

    // 🏢 TENANT DATA EXTRACTION
    const storeCoords = useMemo(() => ({
        lat: tenantData?.store_lat || null,
        lon: tenantData?.store_lon || null
    }), [tenantData])

    const deliveryRadius = tenantData?.delivery_radius || 10
    const deliveryFee = tenantData?.delivery_fee || 0
    const freeDeliveryThreshold = tenantData?.free_delivery_threshold || 0
    const businessName = tenantData?.business_name || 'Local'
    const ownerPhone = tenantData?.whatsapp_number || tenantData?.phone || null
    const mpAccessToken = tenantData?.mp_access_token || null

    // --------------------------------------------
    // 🚦 SERVICE MODE LOGIC (Universal Mode)
    // --------------------------------------------
    // Determine initial mode based on availability and session preference
    const [orderType, setOrderType] = useState(() => {
        // 1. If explicit delivery session exists, respect it
        if (isDeliveryMode() && serviceModes?.delivery) return 'delivery'

        // 2. Default to Dine-In if available
        if (serviceModes?.dineIn) return 'dine_in'

        // 3. Fallback to Delivery if Dine-In disabled
        if (serviceModes?.delivery) return 'delivery'

        // 4. Pickup as last resort
        return 'pickup'
    })

    // UI STATE
    const [order, setOrder] = useState(() => getCurrentOrder())
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    // 🔔 TOAST STATE
    const [toastMessage, setToastMessage] = useState(null)

    // Helper to show toast
    const showToast = (msg) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 4000)
    }

    // Customer info (Shared State)
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        phone: '',
        address: '',     // Delivery Only
        tableNumber: '', // Dine-In Only
        lat: null,
        lon: null
    })

    // Payment method
    const [paymentMethod, setPaymentMethod] = useState('mercadopago')
    const [cashAvailable, setCashAvailable] = useState(() => isCashPaymentAllowed())
    const [cashFallbackNotice, setCashFallbackNotice] = useState(false)
    const [validationErrors, setValidationErrors] = useState([])

    // 📍 DISTANCE STATE (Delivery Only)
    const [distanceResult, setDistanceResult] = useState({ withinRadius: true, distanceKm: null })

    // Recalculate distance when coords change
    useEffect(() => {
        if (orderType === 'delivery' && customerInfo.lat && customerInfo.lon && storeCoords.lat && storeCoords.lon) {
            const result = isWithinDeliveryRadius(storeCoords, { lat: customerInfo.lat, lon: customerInfo.lon }, deliveryRadius)
            setDistanceResult(result)
        }
    }, [customerInfo.lat, customerInfo.lon, storeCoords, deliveryRadius, orderType])

    // Poll order and cash availability
    useEffect(() => {
        const interval = setInterval(() => {
            setOrder(getCurrentOrder())
            const nowCashAvailable = isCashPaymentAllowed()
            if (cashAvailable && !nowCashAvailable && paymentMethod === 'efectivo') {
                setPaymentMethod('mercadopago')
                setCashFallbackNotice(true)
                setTimeout(() => setCashFallbackNotice(false), 5000)
            }
            setCashAvailable(nowCashAvailable)
        }, 1000)
        return () => clearInterval(interval)
    }, [cashAvailable, paymentMethod])

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
        if (item.image) return item.image
        return placeholderImages[index % placeholderImages.length]
    }

    // ============================================
    // 🚀 THE SUBMISSION ENGINE
    // ============================================
    const handleSubmit = async () => {
        if (isSubmitting || submitted || !order?.items?.length) return
        if (config.pauseOrders) return
        if (isOutOfRadius) return

        // 🛡️ VALIDATION
        const errors = []
        if (!customerInfo.name || customerInfo.name.length < 2) errors.push('Nombre requerido')

        if (orderType === 'delivery') {
            const validation = validateDeliveryInfo(customerInfo)
            if (!validation.valid) errors.push(...validation.errors)
        } else if (orderType === 'dine_in') {
            if (!customerInfo.tableNumber) errors.push('Número de mesa requerido')
        }

        if (errors.length > 0) {
            setValidationErrors(errors)
            showToast('⚠️ Completa los datos requeridos')
            return
        }

        setValidationErrors([])
        setIsSubmitting(true)

        const orderNumber = generateOrderNumber()
        const guestToken = getGuestToken()

        // 💎 STATUS 0: All orders start as 'awaiting_payment'
        // They are INVISIBLE to the Staff Dashboard until payment is confirmed
        const isCashPath = paymentMethod === 'efectivo' || paymentMethod === 'tarjeta_envio' || paymentMethod === 'pay_at_counter'
        const initialStatus = isCashPath ? 'pendiente_confirmacion' : 'awaiting_payment'

        const newOrder = {
            business_id: businessId,
            guest_token: guestToken,
            order_number: orderNumber,
            items: order.items,
            subtotal: subtotal,
            delivery_fee: actualDeliveryFee,
            total: total,
            status: initialStatus,
            order_type: orderType,
            customer_name: customerInfo.name || null,
            customer_phone: customerInfo.phone || null,
            // 🛡️ CRASH FIX: Only include delivery_address if isDelivery
            delivery_address: isDelivery ? (customerInfo.address || null) : null,
            table_number: orderType === 'dine_in' ? customerInfo.tableNumber : null,
            payment_method: paymentMethod,
            distance_km: isDelivery ? distanceResult.distanceKm : null,
            created_at: new Date().toISOString()
        }

        try {
            // 🛡️ CLOUD-FIRST: Create order in Supabase
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

            // 💳 PAYMENT ROUTING
            if (paymentMethod === 'mercadopago') {
                // ========== MERCADO PAGO PATH ==========
                if (mpAccessToken) {
                    try {
                        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${mpAccessToken}`
                            },
                            body: JSON.stringify({
                                items: [{
                                    title: `Pedido #${orderNumber} - ${businessName}`,
                                    quantity: 1,
                                    unit_price: total,
                                    currency_id: 'ARS'
                                }],
                                back_urls: {
                                    success: `${window.location.origin}/status/${savedOrder.id}?payment=success`,
                                    failure: `${window.location.origin}/status/${savedOrder.id}?payment=failure`,
                                    pending: `${window.location.origin}/status/${savedOrder.id}?payment=pending`
                                },
                                auto_return: 'approved',
                                external_reference: savedOrder.id,
                                notification_url: `${window.location.origin}/api/mp-webhook`
                            })
                        })

                        const mpData = await mpResponse.json()

                        if (mpData.init_point) {
                            clearCurrentOrder()
                            incrementOrderCount()
                            if (isDelivery) clearDeliveryMode()
                            window.location.href = mpData.init_point
                            return
                        } else {
                            throw new Error('No init_point from MP')
                        }
                    } catch (mpError) {
                        console.error('MP Error:', mpError)
                        // 🛡️ CRASH FIX: Fix broken .update chain
                        await supabase
                            .from('orders')
                            .update({ status: 'pendiente_confirmacion', payment_method: 'efectivo' })
                            .eq('id', savedOrder.id)

                        showToast('⚠️ Error con Mercado Pago. Se cambió a pago en efectivo.')
                        // Proceed to success screen as fallback
                        setSubmitted(true)
                        setTimeout(() => {
                            navigate(`/status/${savedOrder.id}`)
                        }, 1500)
                        return
                    }
                } else {
                    // No MP token - fall back to pending confirmation
                    await supabase
                        .from('orders')
                        .update({ status: 'pendiente_confirmacion' })
                        .eq('id', savedOrder.id)
                }
            }

            // ========== CASH / OTHER PATHS ==========
            // Open WhatsApp with order summary if needed
            if (ownerPhone && isCashPath) {
                const whatsappMessage = buildWhatsAppSummary(
                    { ...newOrder, orderNumber, customerInfo },
                    businessName,
                    paymentMethod
                )
                const whatsappUrl = `https://wa.me/${ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`

                // For dine-in, maybe we don't open WhatsApp automatically? 
                // Let's keep it for now as "Notify Waiter" fallback.
                if (orderType === 'delivery' || paymentMethod === 'efectivo') {
                    window.open(whatsappUrl, '_blank')
                }
            }

            // Cleanup
            clearCurrentOrder()
            incrementOrderCount()
            if (isDelivery) clearDeliveryMode()

            setSubmitted(true)
            setTimeout(() => {
                navigate(`/status/${savedOrder.id}`)
            }, 1500)

        } catch (err) {
            console.error('Order Error:', err)
            showToast('❌ Error al enviar el pedido: ' + err.message)
            setIsSubmitting(false)
        }
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
                        ¡Pedido enviado!
                    </h2>
                    <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
                        {orderType === 'dine_in' ? 'Avisando a cocina...' : 'Redirigiendo al estado...'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{
                                width: 8, height: 8, borderRadius: '50%', background: '#D1D5DB',
                                animation: `pulse 1.4s ease-in-out infinite`,
                                animationDelay: `${i * 0.2}s`
                            }} />
                        ))}
                    </div>
                </div>
                <style>{`@keyframes pulse { 0%, 80%, 100% { opacity: 0.4; transform: scale(0.9); } 40% { opacity: 1; transform: scale(1); } }`}</style>
            </div>
        )
    }

    // ============================================
    // RENDER: EMPTY CART
    // ============================================
    if (!order?.items?.length) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#FAF9F7',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20
            }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
                <p style={{ color: '#6B7280', marginBottom: 20 }}>Tu pedido está vacío</p>
                <button
                    onClick={() => navigate('/menu')}
                    style={{
                        padding: '14px 32px',
                        background: tenantData?.primary_color || '#C4856A',
                        color: 'white',
                        border: 'none',
                        borderRadius: 12,
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Ver menú
                </button>
            </div>
        )
    }

    // ============================================
    // RENDER: MAIN CHECKOUT (Strike 11 Specs)
    // ============================================
    return (
        <div style={{ minHeight: '100vh', paddingBottom: 140, background: '#F8F9FA' }}>
            {/* BRANDING HEADER UPDATE */}
            <HeaderClamp config={config} />

            {/* Divider Strip */}
            {(() => {
                const dividerPreset = getDividerPreset(config.dividerPresetId)
                return (
                    <div style={{ height: 64, margin: '0 14px 16px', borderRadius: 12, overflow: 'hidden' }}>
                        {dividerPreset ? (
                            <img src={dividerPreset.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #F5F0E8, #EDE8E0)' }} />
                        )}
                    </div>
                )
            })()}

            {/* Main Wrapper */}
            <div style={{ margin: '0 14px' }}>

                {/* 1. DYNAMIC HEADER & CONTEXT */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                            {orderType === 'dine_in' ? 'Para la mesa' : 'Tu Pedido'}
                        </h1>
                        {/* MODE TOGGLE */}
                        {serviceModes?.dineIn && serviceModes?.delivery && (
                            <button
                                onClick={() => setOrderType(prev => prev === 'dine_in' ? 'delivery' : 'dine_in')}
                                style={{
                                    fontSize: 12, padding: '6px 14px', borderRadius: 20,
                                    background: 'white', border: '1px solid #E5E7EB',
                                    color: '#4B5563', fontWeight: 600, cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            >
                                Cambiar a {orderType === 'dine_in' ? 'Delivery' : 'Mesa'}
                            </button>
                        )}
                    </div>

                    {/* Pause Warning */}
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
                    {/* Header based on Context */}
                    <div style={{ marginBottom: 24 }}>
                        {orderType === 'dine_in' ? (
                            // MESA BADGE (Reference IMG_9072)
                            <div style={{
                                background: '#1F2937', color: 'white',
                                padding: '16px 20px', borderRadius: 16,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <div>
                                    <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Ubicación</span>
                                    <div style={{ fontSize: 20, fontWeight: 700 }}>Comer en Mesa</div>
                                </div>
                                <div style={{
                                    background: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 12
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8" /><line x1="6" y1="6" x2="6" y2="6" /><line x1="6" y1="30" x2="6" y2="30" /></svg>
                                </div>
                            </div>
                        ) : (
                            // DELIVERY HEADER (Reference IMG_9069)
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>
                                Detalles de Entrega
                            </h3>
                        )}
                    </div>

                    {/* Validation Errors */}
                    {validationErrors.length > 0 && (
                        <div style={{ background: '#FEE2E2', padding: 12, borderRadius: 12, marginBottom: 20 }}>
                            {validationErrors.map((err, i) => (
                                <p key={i} style={{ color: '#DC2626', fontSize: 14, margin: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>⚠️</span> {err}
                                </p>
                            ))}
                        </div>
                    )}

                    {/* INPUT FIELDS */}
                    {orderType === 'delivery' ? (
                        <>
                            {/* Hard Fence Warning */}
                            {isOutOfRadius && (
                                <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', padding: 16, borderRadius: 12, marginBottom: 20, textAlign: 'center' }}>
                                    <div style={{ fontSize: 24, marginBottom: 4 }}>🚫</div>
                                    <h4 style={{ color: '#DC2626', margin: 0 }}>Fuera de Radio ({deliveryRadius}km)</h4>
                                </div>
                            )}

                            <InputGroup
                                label="Nombre" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                                value={customerInfo.name}
                                onChange={(e) => setCustomerInfo(p => ({ ...p, name: e.target.value }))}
                                placeholder="Tu nombre y apellido"
                            />
                            <InputGroup
                                label="Teléfono" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
                                value={customerInfo.phone}
                                onChange={(e) => setCustomerInfo(p => ({ ...p, phone: e.target.value }))}
                                placeholder="WhatsApp (ej: 11 1234 5678)"
                                type="tel"
                            />
                            <InputGroup
                                label="Dirección" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>}
                                value={customerInfo.address}
                                onChange={(e) => setCustomerInfo(p => ({ ...p, address: e.target.value }))}
                                placeholder="Calle, Altura, Piso / Depto"
                                isTextArea={true}
                            />
                        </>
                    ) : (
                        /* DINE-IN FIELDS */
                        <>
                            <InputGroup
                                label="Número de Mesa" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3z" /><path d="M21 9H3" /><path d="M21 15H3" /><path d="M9 3v18" /><path d="M15 3v18" /></svg>}
                                value={customerInfo.tableNumber}
                                onChange={(e) => setCustomerInfo(p => ({ ...p, tableNumber: e.target.value }))}
                                placeholder="Indica el número"
                                inputMode="numeric" pattern="[0-9]*"
                            />
                            <InputGroup
                                label="Nombre (Opcional)" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                                value={customerInfo.name}
                                onChange={(e) => setCustomerInfo(p => ({ ...p, name: e.target.value }))}
                                placeholder="Para llamarte"
                            />
                        </>
                    )}
                </div>

                {/* 3. PREMIUM PAYMENT SELECTOR (Cards) */}
                <div style={{
                    background: 'white', borderRadius: 24, padding: 24,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.04)', marginBottom: 24
                }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>
                        Método de Pago
                    </h3>

                    {/* MERCADO PAGO CARD */}
                    {(orderType === 'delivery' || serviceModes?.dineInPayment === 'before') && (
                        <PaymentMethodCard
                            id="mercadopago"
                            selected={paymentMethod === 'mercadopago'}
                            onClick={() => setPaymentMethod('mercadopago')}
                            title="Mercado Pago"
                            subtitle="Tarjetas, Débito, QR"
                            color="#009EE3"
                            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>}
                        />
                    )}

                    {/* CASH / COUNTER CARD */}
                    {(cashAvailable || serviceModes?.dineInPayment === 'after') && (
                        <PaymentMethodCard
                            id="efectivo"
                            selected={paymentMethod === 'efectivo' || paymentMethod === 'pay_at_counter'}
                            onClick={() => setPaymentMethod(orderType === 'dine_in' ? 'pay_at_counter' : 'efectivo')}
                            title={orderType === 'dine_in' ? 'Pagar al Final' : 'Efectivo'}
                            subtitle={orderType === 'dine_in' ? 'En caja o al mozo' : 'Pagar al recibir'}
                            color="#22C55E"
                            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
                        />
                    )}
                </div>

                {/* 4. ORDER ITEMS (Visual Clean) */}
                <div style={{ background: 'white', borderRadius: 24, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>Resumen</h3>
                    {order.items.map((item, index) => (
                        <div key={index} style={{
                            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
                            borderBottom: index < order.items.length - 1 ? '1px solid #F3F4F6' : 'none'
                        }}>
                            <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#F3F0EB' }}>
                                <img src={getItemImage(item, index)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} />
                            </div>
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

                    {/* Totals */}
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
                            <span style={{ fontSize: 24, fontWeight: 800, color: tenantData?.primary_color || '#C4856A' }}>{formatPrice(total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* FLOATING ACTION BUTTON */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                padding: '20px 20px',
                paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
                background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
                borderTop: '1px solid rgba(0,0,0,0.05)',
                zIndex: 100
            }}>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || config.pauseOrders || isOutOfRadius}
                    style={{
                        width: '100%', padding: 18,
                        background: isOutOfRadius ? '#EF4444' : (tenantData?.primary_color || '#C4856A'),
                        color: 'white', border: 'none', borderRadius: 16,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontSize: 18, fontWeight: 700,
                        cursor: isOutOfRadius ? 'not-allowed' : 'pointer',
                        opacity: (isSubmitting || config.pauseOrders) ? 0.6 : 1,
                        boxShadow: '0 8px 24px -4px rgba(0,0,0,0.2)',
                        transform: 'translateZ(0)' // HW accel
                    }}
                >
                    <span>{isSubmitting ? 'Procesando...' : (isOutOfRadius ? 'Fuera de Radio' : 'Confirmar Pedido')}</span>
                    {!isSubmitting && !isOutOfRadius && <span>➜</span>}
                </button>
            </div>

            {/* TOAST */}
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
