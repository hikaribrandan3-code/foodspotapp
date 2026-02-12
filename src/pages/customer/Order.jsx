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
    // RENDER: MAIN CHECKOUT
    // ============================================
    return (
        <div style={{ minHeight: '100vh', paddingBottom: 140, background: '#FAFAF8' }}>
            {/* BRANDING HEADER UPDATE (Modern Look) */}
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

            {/* Main Card */}
            <div style={{ margin: '0 14px' }}>
                <div style={{ background: 'white', borderRadius: 20, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>

                    {/* Header */}
                    <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>Tu Pedido</h1>
                            <p style={{ fontSize: 14, color: '#9CA3AF' }}>
                                {orderType === 'dine_in' ? 'Para comer aquí' : 'Para envío'}
                            </p>
                        </div>
                        {/* MODE TOGGLE (Only if both modes enabled) */}
                        {serviceModes?.dineIn && serviceModes?.delivery && (
                            <button
                                onClick={() => setOrderType(prev => prev === 'dine_in' ? 'delivery' : 'dine_in')}
                                style={{
                                    fontSize: 12, padding: '6px 12px', borderRadius: 20,
                                    background: '#F3F4F6', border: '1px solid #E5E7EB',
                                    color: '#4B5563', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                Cambiar
                            </button>
                        )}
                    </div>

                    {/* Pause Warning */}
                    {config.pauseOrders && (
                        <div style={{ background: '#FEF3C7', padding: 12, borderRadius: 12, marginBottom: 16, textAlign: 'center' }}>
                            <p style={{ color: '#92400E', fontSize: 14 }}>⏸️ {config.pauseOrdersMessage || 'Pedidos pausados'}</p>
                        </div>
                    )}

                    {/* DYNAMIC FORM (Universal) */}
                    <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                            {orderType === 'dine_in' ? 'Datos de Mesa' : 'Datos de Envío'}
                        </h3>

                        {/* Validation Errors */}
                        {validationErrors.length > 0 && (
                            <div style={{ background: '#FEE2E2', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                                {validationErrors.map((err, i) => (
                                    <p key={i} style={{ color: '#DC2626', fontSize: 13, margin: '2px 0' }}>{err}</p>
                                ))}
                            </div>
                        )}

                        {/* Order Type Specific Fields */}
                        {orderType === 'delivery' ? (
                            <>
                                {/* 🚫 HARD FENCE WARNING */}
                                {isOutOfRadius && (
                                    <div style={{
                                        background: '#FEE2E2', border: '2px solid #EF4444',
                                        padding: 16, borderRadius: 12, marginBottom: 16, textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: 32, marginBottom: 8 }}>🚫</div>
                                        <h4 style={{ fontSize: 16, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>
                                            Fuera de Radio de Entrega
                                        </h4>
                                        <p style={{ fontSize: 14, color: '#7F1D1D' }}>
                                            Máximo: {deliveryRadius}km
                                        </p>
                                    </div>
                                )}
                                {/* Name */}
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4 }}>Nombre *</label>
                                    <input
                                        type="text"
                                        value={customerInfo.name}
                                        onChange={(e) => setCustomerInfo(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Tu nombre"
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
                                    />
                                </div>
                                {/* Phone */}
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4 }}>Teléfono *</label>
                                    <input
                                        type="tel"
                                        value={customerInfo.phone}
                                        onChange={(e) => setCustomerInfo(p => ({ ...p, phone: e.target.value }))}
                                        placeholder="+54 11 1234-5678"
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
                                    />
                                </div>
                                {/* Address */}
                                <div>
                                    <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4 }}>Dirección *</label>
                                    <textarea
                                        value={customerInfo.address}
                                        onChange={(e) => setCustomerInfo(p => ({ ...p, address: e.target.value }))}
                                        placeholder="Calle, número, piso..."
                                        rows={2}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 15, resize: 'none', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </>
                        ) : (
                            /* DINE-IN FIELDS */
                            <>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4 }}>Nombre (Opcional)</label>
                                    <input
                                        type="text"
                                        value={customerInfo.name}
                                        onChange={(e) => setCustomerInfo(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Tu nombre"
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4 }}>Número de Mesa *</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={customerInfo.tableNumber}
                                        onChange={(e) => setCustomerInfo(p => ({ ...p, tableNumber: e.target.value }))}
                                        placeholder="Ej: 5"
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* DYNAMIC PAYMENT SELECTOR (Unified) */}
                    <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Método de pago</h3>

                        {/* Pay Before Logic (Mercado Pago) - Only if enabled for Dine-In or always for Delivery */}
                        {(orderType === 'delivery' || serviceModes?.dineInPayment === 'before') && (
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: 12,
                                background: paymentMethod === 'mercadopago' ? '#EFF6FF' : 'white',
                                border: paymentMethod === 'mercadopago' ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                borderRadius: 10, cursor: 'pointer', marginBottom: 8
                            }}>
                                <input type="radio" name="pay" value="mercadopago" checked={paymentMethod === 'mercadopago'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ accentColor: '#3B82F6' }} />
                                <div>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1F2937' }}>Mercado Pago</span>
                                    <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>Transferencia o QR</p>
                                </div>
                            </label>
                        )}

                        {/* Cash / Pay After Logic */}
                        {(cashAvailable || serviceModes?.dineInPayment === 'after') && (
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: 12,
                                background: (paymentMethod === 'efectivo' || paymentMethod === 'pay_at_counter') ? '#F0FDF4' : 'white',
                                border: (paymentMethod === 'efectivo' || paymentMethod === 'pay_at_counter') ? '2px solid #22C55E' : '1px solid #E5E7EB',
                                borderRadius: 10, cursor: 'pointer', marginBottom: 8
                            }}>
                                <input
                                    type="radio"
                                    name="pay"
                                    value={orderType === 'dine_in' ? 'pay_at_counter' : 'efectivo'}
                                    checked={paymentMethod === 'efectivo' || paymentMethod === 'pay_at_counter'}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    style={{ accentColor: '#22C55E' }}
                                />
                                <div>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1F2937' }}>
                                        {orderType === 'dine_in' ? 'Pagar al Final' : 'Efectivo'}
                                    </span>
                                    <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>
                                        {orderType === 'dine_in' ? 'En caja o al mozo' : 'Pago al recibir'}
                                    </p>
                                </div>
                            </label>
                        )}
                    </div>

                    {/* Order Items */}
                    <div style={{ marginBottom: 16 }}>
                        {order.items.map((item, index) => (
                            <div key={index} style={{
                                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
                                borderBottom: index < order.items.length - 1 ? '1px solid #F3F4F6' : 'none'
                            }}>
                                <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#F3F0EB' }}>
                                    <img src={getItemImage(item, index)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 15, fontWeight: 600, color: '#1F2937', marginBottom: 2 }}>{item.name}</p>
                                    <p style={{ fontSize: 14, color: tenantData?.primary_color || '#C4856A', fontWeight: 500, margin: 0 }}>{formatPrice(item.price)}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <button onClick={() => handleQuantityChange(index, -1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', fontSize: 16 }}>−</button>
                                    <span style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                                    <button onClick={() => handleQuantityChange(index, 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: tenantData?.primary_color || '#C4856A', color: 'white', cursor: 'pointer', fontSize: 16 }}>+</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div style={{ paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: '#6B7280' }}>Subtotal</span>
                            <span style={{ fontWeight: 500 }}>{formatPrice(subtotal)}</span>
                        </div>
                        {isDelivery && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ color: '#6B7280' }}>Envío</span>
                                <span style={{ fontWeight: 500, color: isFreeDelivery ? '#22C55E' : 'inherit' }}>
                                    {isFreeDelivery ? '¡GRATIS!' : formatPrice(actualDeliveryFee)}
                                </span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                            <span style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>Total</span>
                            <span style={{ fontSize: 18, fontWeight: 700, color: tenantData?.primary_color || '#C4856A' }}>{formatPrice(total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Submit Button (with Safe Area) */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                padding: '16px 20px',
                paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 20px))',
                background: 'linear-gradient(to top, white 85%, transparent)',
                zIndex: 100
            }}>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || config.pauseOrders || isOutOfRadius}
                    style={{
                        width: '100%', padding: 16,
                        background: isOutOfRadius ? '#EF4444' : (tenantData?.primary_color || '#C4856A'),
                        color: 'white', border: 'none', borderRadius: 14,
                        fontSize: 17, fontWeight: 700,
                        cursor: isOutOfRadius ? 'not-allowed' : 'pointer',
                        opacity: (isSubmitting || config.pauseOrders) ? 0.6 : 1,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                    }}
                >
                    {isSubmitting ? 'Procesando...' : (isOutOfRadius ? '🚫 Fuera de Radio' : `Confirmar Pedido · ${formatPrice(total)}`)}
                </button>
            </div>

            {/* 🍞 TOAST NOTIFICATION */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    bottom: 100,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1F2937', color: 'white', padding: '12px 20px',
                    borderRadius: 30, fontSize: 14, fontWeight: 500, zIndex: 9999,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    animation: 'slideUpToast 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    whiteSpace: 'nowrap'
                }}>
                    <span>{toastMessage}</span>
                </div>
            )}
            <style>{`@keyframes slideUpToast { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`}</style>
        </div>
    )
}

export default Order
