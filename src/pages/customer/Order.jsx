import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatPrice } from '../../config/menuData.js'
import { supabase, createOrderWithGuestToken } from '../../lib/supabaseClient.js'
import { getGuestToken } from '../../utils/guestToken.js'
import HeaderClamp from '../../components/HeaderClamp.jsx'
import { getDividerPreset } from '../../config/dividerPresets.js'
import {
    isDeliveryMode,
    isCashPaymentAllowed,
    validateDeliveryInfo,
    clearDeliveryMode,
    isWithinDeliveryRadius,
    buildWhatsAppSummary
} from '../../utils/deliveryUtils.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { useCart } from '../../contexts/CartContext.jsx'

// Placeholder food images for items without images
const placeholderImages = [
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=100&h=100&fit=crop',
]

function Order({ config: configProp }) {
    const { businessId, tenantData } = useTenant()
    const { cart, clearCart, cartTotal } = useCart()
    const config = configProp || tenantData?.app_config || {};
    const navigate = useNavigate()

    // 🏢 TENANT DATA EXTRACTION
    const storeCoords = useMemo(() => ({
        lat: tenantData?.store_lat || null,
        lon: tenantData?.store_lon || null
    }), [tenantData])

    const deliveryRadius = tenantData?.delivery_radius || 10 // Default 10km
    const deliveryFee = tenantData?.delivery_fee || 0
    const freeDeliveryThreshold = tenantData?.free_delivery_threshold || 0
    const businessName = tenantData?.business_name || 'Local'
    const ownerPhone = tenantData?.whatsapp_number || tenantData?.phone || null
    const mpAccessToken = tenantData?.mp_access_token || null

    // UI STATE
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [deliveryMode] = useState(() => isDeliveryMode())

    // Customer info for delivery orders
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        phone: '',
        address: '',
        lat: null,
        lon: null
    })

    // Payment method selection
    const [paymentMethod, setPaymentMethod] = useState('mercadopago')
    const [cashAvailable, setCashAvailable] = useState(() => isCashPaymentAllowed())
    const [cashFallbackNotice, setCashFallbackNotice] = useState(false)
    const [validationErrors, setValidationErrors] = useState([])

    // 📍 DISTANCE CALCULATION STATE
    const [distanceResult, setDistanceResult] = useState({ withinRadius: true, distanceKm: null })

    // Recalculate distance when customer coords change
    useEffect(() => {
        if (customerInfo.lat && customerInfo.lon && storeCoords.lat && storeCoords.lon) {
            const result = isWithinDeliveryRadius(storeCoords, { lat: customerInfo.lat, lon: customerInfo.lon }, deliveryRadius)
            setDistanceResult(result)
        }
    }, [customerInfo.lat, customerInfo.lon, storeCoords, deliveryRadius])

    // Cash availability check
    useEffect(() => {
        const interval = setInterval(() => {
            const nowCashAvailable = isCashPaymentAllowed()
            if (cashAvailable && !nowCashAvailable && paymentMethod === 'efectivo') {
                setPaymentMethod('mercadopago')
                setCashFallbackNotice(true)
                setTimeout(() => setCashFallbackNotice(false), 5000)
            }
            setCashAvailable(nowCashAvailable)
        }, 5000)
        return () => clearInterval(interval)
    }, [cashAvailable, paymentMethod])

    // CALCULATIONS
    const calculateSubtotal = () => {
        return cart?.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
    }

    const subtotal = calculateSubtotal()
    const isFreeDelivery = freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold
    const actualDeliveryFee = deliveryMode ? (isFreeDelivery ? 0 : deliveryFee) : 0
    const total = subtotal + actualDeliveryFee

    // 🚫 HARD FENCE: Is checkout blocked?
    const isOutOfRadius = deliveryMode && !distanceResult.withinRadius

    // HANDLERS
    const handleQuantityChange = (index, delta) => {
        // This should modify the cart context
        const item = cart.items[index]
        const newQuantity = item.quantity + delta
        if (newQuantity <= 0) {
            // Remove item logic would go here
        }
    }

    const generateOrderNumber = () => {
        return Math.floor(100 + Math.random() * 900)
    }

    const handleFinalSubmit = async () => {
        if (isSubmitting || submitted || !cart?.items?.length) return
        if (config.pauseOrders) return
        if (isOutOfRadius) return // HARD FENCE

        // Validate delivery info if in delivery mode
        if (deliveryMode) {
            const validation = validateDeliveryInfo(customerInfo)
            if (!validation.valid) {
                setValidationErrors(validation.errors)
                return
            }
        }

        setValidationErrors([])
        setIsSubmitting(true)

        const orderNumber = generateOrderNumber()
        const guestToken = getGuestToken()

        // Determine status based on payment method
        let initialStatus = 'pendiente'
        if (paymentMethod === 'mercadopago') {
            initialStatus = 'esperando_pago'
        } else if (paymentMethod === 'efectivo' || paymentMethod === 'tarjeta_envio') {
            initialStatus = 'pendiente' // Owner confirms manually
        }

        const newOrder = {
            order_number: orderNumber,
            business_id: businessId,
            guest_token: guestToken,
            items: cart.items,
            subtotal: subtotal,
            delivery_fee: actualDeliveryFee,
            total: total,
            status: initialStatus,
            order_type: deliveryMode ? 'delivery' : 'pickup',
            customer_name: customerInfo.name || null,
            customer_phone: customerInfo.phone || null,
            delivery_address: customerInfo.address || null,
            payment_method: paymentMethod,
            distance_km: distanceResult.distanceKm,
            created_at: new Date().toISOString()
        }

        try {
            // 🛡️ CLOUD-FIRST: Persist to Supabase
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

            // 💳 PAYMENT PATH ROUTING
            if (paymentMethod === 'mercadopago') {
                // MERCADO PAGO PATH
                if (mpAccessToken) {
                    try {
                        // Create preference via Mercado Pago API
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
                            clearCart()
                            if (deliveryMode) clearDeliveryMode()
                            // Redirect to Mercado Pago
                            window.location.href = mpData.init_point
                            return
                        } else {
                            throw new Error('No init_point received from Mercado Pago')
                        }
                    } catch (mpError) {
                        console.error('Mercado Pago Error:', mpError)
                        alert('Error con Mercado Pago. Redirigiendo a pago en efectivo.')
                        setPaymentMethod('efectivo')
                        setIsSubmitting(false)
                        return
                    }
                } else {
                    alert('Mercado Pago no está configurado. Por favor, selecciona otro método de pago.')
                    setIsSubmitting(false)
                    return
                }
            } else {
                // CASH / DEBIT AT DOOR PATH
                clearCart()
                if (deliveryMode) clearDeliveryMode()

                // Open WhatsApp deep-link with summary
                if (ownerPhone) {
                    const whatsappMessage = buildWhatsAppSummary(
                        { ...newOrder, orderNumber, customerInfo },
                        businessName,
                        paymentMethod
                    )
                    const whatsappUrl = `https://wa.me/${ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`
                    window.open(whatsappUrl, '_blank')
                }

                // Navigate to status page
                setSubmitted(true)
                setTimeout(() => {
                    navigate(`/status/${savedOrder.id}`)
                }, 1500)
            }
        } catch (err) {
            console.error('Order Error:', err)
            alert('Error al enviar el pedido: ' + err.message)
            setIsSubmitting(false)
        }
    }

    const getItemImage = (item, index) => {
        if (item.image) return item.image
        return placeholderImages[index % placeholderImages.length]
    }

    // Submitted state - Pedido Enviado Transition Screen
    if (submitted) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                paddingBottom: 80,
                background: '#FAFAF8'
            }}>
                <div style={{
                    background: '#FFFFFF',
                    borderRadius: 20,
                    padding: '32px 28px',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
                    width: '100%',
                    maxWidth: 320,
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: '#ECFDF5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px'
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1F2937', marginBottom: 8 }}>
                        ¡Pedido enviado!
                    </h2>
                    <p style={{ fontSize: 14, fontWeight: 400, color: '#6B7280', marginBottom: 24 }}>
                        Estamos preparando tu pedido
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D1D5DB', animation: 'pulse 1.4s ease-in-out infinite' }} />
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D1D5DB', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: '0.2s' }} />
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D1D5DB', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: '0.4s' }} />
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>
                        Redirigiendo al estado del pedido…
                    </p>
                </div>
                <style>{`@keyframes pulse { 0%, 80%, 100% { opacity: 0.4; transform: scale(0.9); } 40% { opacity: 1; transform: scale(1); } }`}</style>
            </div>
        )
    }

    // Empty cart state
    if (!cart?.items?.length) {
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

    return (
        <div style={{ minHeight: '100vh', paddingBottom: 120, background: '#FAFAF8' }}>
            {/* Header */}
            <HeaderClamp config={config} />

            {/* Divider Strip */}
            {(() => {
                const dividerPreset = getDividerPreset(config.dividerPresetId)
                return (
                    <div style={{ height: 64, margin: '0 14px 16px 14px', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                        {dividerPreset ? (
                            <img src={dividerPreset.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #F5F0E8 0%, #EDE8E0 100%)' }} />
                        )}
                    </div>
                )
            })()}

            {/* Main Card */}
            <div style={{ margin: '0 14px', position: 'relative' }}>
                <div style={{
                    background: 'white',
                    borderRadius: 20,
                    padding: 20,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                }}>
                    {/* Card Header */}
                    <div style={{ marginBottom: 20 }}>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>Tu Pedido</h1>
                        <p style={{ fontSize: 14, color: '#9CA3AF' }}>Revisá antes de confirmar</p>
                    </div>

                    {/* Pause Orders Warning */}
                    {config.pauseOrders && (
                        <div style={{ background: '#FEF3C7', padding: 12, borderRadius: 12, marginBottom: 16, textAlign: 'center' }}>
                            <p style={{ color: '#92400E', fontSize: 14 }}>⏸️ {config.pauseOrdersMessage || 'Pedidos pausados temporalmente'}</p>
                        </div>
                    )}

                    {/* Delivery Info Form */}
                    {deliveryMode && (
                        <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Datos de envío</h3>

                            {/* Validation Errors */}
                            {validationErrors.length > 0 && (
                                <div style={{ background: '#FEE2E2', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                                    {validationErrors.map((err, i) => (
                                        <p key={i} style={{ color: '#DC2626', fontSize: 13, margin: '2px 0' }}>{err}</p>
                                    ))}
                                </div>
                            )}

                            {/* 🚫 HARD FENCE: Out of Radius Warning */}
                            {isOutOfRadius && (
                                <div style={{
                                    background: '#FEE2E2',
                                    border: '2px solid #EF4444',
                                    padding: 16,
                                    borderRadius: 12,
                                    marginBottom: 16,
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 32, marginBottom: 8 }}>🚫</div>
                                    <h4 style={{ fontSize: 16, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>Fuera de Radio de Entrega</h4>
                                    <p style={{ fontSize: 14, color: '#7F1D1D' }}>
                                        Estás a <strong>{distanceResult.distanceKm}km</strong> del local.
                                        <br />Máximo: {deliveryRadius}km
                                    </p>
                                </div>
                            )}

                            {/* Distance Indicator (when within radius) */}
                            {!isOutOfRadius && distanceResult.distanceKm !== null && (
                                <div style={{
                                    background: '#ECFDF5',
                                    padding: 10,
                                    borderRadius: 8,
                                    marginBottom: 12,
                                    textAlign: 'center'
                                }}>
                                    <p style={{ color: '#166534', fontSize: 13, margin: 0 }}>
                                        📍 Estás a {distanceResult.distanceKm}km del local
                                    </p>
                                </div>
                            )}

                            {/* Name Field */}
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4 }}>Nombre completo *</label>
                                <input
                                    type="text"
                                    value={customerInfo.name}
                                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Tu nombre"
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* Phone Field */}
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4 }}>Teléfono *</label>
                                <input
                                    type="tel"
                                    value={customerInfo.phone}
                                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="+54 11 1234-5678"
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* Address Field */}
                            <div>
                                <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4 }}>Dirección de entrega *</label>
                                <textarea
                                    value={customerInfo.address}
                                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="Calle, número, piso, depto..."
                                    rows={2}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 15, resize: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Payment Method Selection */}
                    {deliveryMode && (
                        <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Método de pago</h3>

                            {/* Cash Fallback Notice */}
                            {cashFallbackNotice && (
                                <div style={{ background: '#FEF3C7', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                                    <p style={{ color: '#92400E', margin: 0 }}>
                                        ⏰ El pago en efectivo ya no está disponible (fuera de horario 10:00-18:00). Se seleccionó Mercado Pago.
                                    </p>
                                </div>
                            )}

                            {/* Mercado Pago Option */}
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '12px',
                                background: paymentMethod === 'mercadopago' ? '#EFF6FF' : 'white',
                                border: paymentMethod === 'mercadopago' ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                borderRadius: 10, cursor: 'pointer', marginBottom: 8
                            }}>
                                <input type="radio" name="paymentMethod" value="mercadopago" checked={paymentMethod === 'mercadopago'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ accentColor: '#3B82F6' }} />
                                <div>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1F2937' }}>Mercado Pago</span>
                                    <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>Transferencia o QR</p>
                                </div>
                            </label>

                            {/* Cash Option */}
                            {cashAvailable && (
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px',
                                    background: paymentMethod === 'efectivo' ? '#F0FDF4' : 'white',
                                    border: paymentMethod === 'efectivo' ? '2px solid #22C55E' : '1px solid #E5E7EB',
                                    borderRadius: 10, cursor: 'pointer', marginBottom: 8
                                }}>
                                    <input type="radio" name="paymentMethod" value="efectivo" checked={paymentMethod === 'efectivo'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ accentColor: '#22C55E' }} />
                                    <div>
                                        <span style={{ fontSize: 14, fontWeight: 500, color: '#1F2937' }}>Efectivo</span>
                                        <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>Pago en efectivo al recibir</p>
                                    </div>
                                </label>
                            )}

                            {/* Debit at Door Option */}
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '12px',
                                background: paymentMethod === 'tarjeta_envio' ? '#FEF3C7' : 'white',
                                border: paymentMethod === 'tarjeta_envio' ? '2px solid #F59E0B' : '1px solid #E5E7EB',
                                borderRadius: 10, cursor: 'pointer'
                            }}>
                                <input type="radio" name="paymentMethod" value="tarjeta_envio" checked={paymentMethod === 'tarjeta_envio'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ accentColor: '#F59E0B' }} />
                                <div>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1F2937' }}>Tarjeta (al recibir)</span>
                                    <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>Débito/Crédito en la puerta</p>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Order Items */}
                    <div style={{ marginBottom: 16 }}>
                        {cart.items.map((item, index) => (
                            <div key={index} style={{
                                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
                                borderBottom: index < cart.items.length - 1 ? '1px solid #F3F4F6' : 'none'
                            }}>
                                <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#F3F0EB' }}>
                                    <img src={getItemImage(item, index)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 15, fontWeight: 600, color: '#1F2937', marginBottom: 2, lineHeight: 1.3 }}>{item.name}</p>
                                    <p style={{ fontSize: 14, color: tenantData?.primary_color || '#C4856A', fontWeight: 500, margin: 0 }}>{formatPrice(item.price)}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', minWidth: 30, textAlign: 'center' }}>x{item.quantity}</span>
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

                        {deliveryMode && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ color: '#6B7280' }}>Envío</span>
                                <div style={{ textAlign: 'right' }}>
                                    {isFreeDelivery ? (
                                        <span style={{ color: '#22C55E', fontWeight: 600 }}>¡GRATIS!</span>
                                    ) : (
                                        <span style={{ fontWeight: 500 }}>{formatPrice(actualDeliveryFee)}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {isFreeDelivery && (
                            <div style={{
                                background: '#ECFDF5',
                                padding: '8px 12px',
                                borderRadius: 8,
                                marginBottom: 12,
                                textAlign: 'center'
                            }}>
                                <span style={{ color: '#166534', fontSize: 13, fontWeight: 500 }}>🎉 ¡Envío Gratis aplicado!</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                            <span style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>Total</span>
                            <span style={{ fontSize: 18, fontWeight: 700, color: tenantData?.primary_color || '#C4856A' }}>{formatPrice(total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Submit Button */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 20px',
                paddingBottom: 32,
                background: 'linear-gradient(to top, white 80%, transparent)',
                zIndex: 100
            }}>
                <button
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting || config.pauseOrders || isOutOfRadius}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: isOutOfRadius ? '#EF4444' : (tenantData?.primary_color || '#C4856A'),
                        color: 'white',
                        border: 'none',
                        borderRadius: 14,
                        fontSize: 17,
                        fontWeight: 700,
                        cursor: isOutOfRadius ? 'not-allowed' : 'pointer',
                        opacity: (isSubmitting || config.pauseOrders) ? 0.6 : 1,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                    }}
                >
                    {isSubmitting ? 'Enviando...' : (isOutOfRadius ? '🚫 Fuera de Radio' : `Confirmar Pedido · ${formatPrice(total)}`)}
                </button>
            </div>
        </div>
    )
}

export default Order
