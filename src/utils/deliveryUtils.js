/**
 * REFACTORED: Delivery Utils
 * Accepts 'config' as a parameter to ensure single-source-of-truth.
 * 
 * ARCHITECTURAL INVARIANT: These functions are PURE.
 * They do NOT call getConfig() — config must be passed in.
 */

// ============================================
// 🌍 HAVERSINE DISTANCE CALCULATION (Pure JS)
// ============================================

/**
 * Calculate the distance between two points on Earth using Haversine formula.
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export const calculateHaversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

/**
 * Check if customer is within delivery radius.
 * @param {Object} storeCoords - { lat, lon } of the store
 * @param {Object} customerCoords - { lat, lon } of the customer
 * @param {number} radiusKm - Delivery radius in kilometers
 * @returns {{ withinRadius: boolean, distanceKm: number | null }}
 */
export const isWithinDeliveryRadius = (storeCoords, customerCoords, radiusKm) => {
    if (!storeCoords?.lat || !storeCoords?.lon || !customerCoords?.lat || !customerCoords?.lon) {
        return { withinRadius: true, distanceKm: null }; // Fallback: allow if no coords
    }
    const distanceKm = calculateHaversine(
        storeCoords.lat, storeCoords.lon,
        customerCoords.lat, customerCoords.lon
    );
    return {
        withinRadius: distanceKm <= radiusKm,
        distanceKm: Math.round(distanceKm * 10) / 10 // Round to 1 decimal
    };
};

// ============================================
// 📱 WHATSAPP SUMMARY BUILDER
// ============================================

/**
 * Build a WhatsApp summary string for an order (Cash/Manual path).
 * @param {Object} order - The order object
 * @param {string} businessName - The business name
 * @param {string} paymentMethod - Payment method (PAYMENT_METHOD.CASH | PAYMENT_METHOD.CARD_ON_DELIVERY)
 * @returns {string} WhatsApp-formatted summary
 */
export const buildWhatsAppSummary = (order, businessName, paymentMethod = PAYMENT_METHOD.CASH, t = null) => {
    const items = order.items.map(item =>
        `• ${item.quantity}x ${item.name} - $${item.price * item.quantity}`
    ).join('\n');

    const paymentNote = paymentMethod === PAYMENT_METHOD.CARD_ON_DELIVERY ? '\n\n⚠️ *TRAER POS*' : '';
    const paymentLabel = paymentMethod === PAYMENT_METHOD.CASH ? '💵 Efectivo' : '💳 Tarjeta';

    // 🛡️ STRUCTURED ADDRESS FORMATTER
    let addressDisplay = 'Retiro en local'
    if (order.customerInfo?.address) {
        const addr = order.customerInfo.address
        if (typeof addr === 'object') {
            const parts = []
            if (addr.street) parts.push(addr.street)
            if (addr.number) parts.push(addr.number)
            if (addr.floor) parts.push(`${t ? t('floor_label') : 'Piso'}: ${addr.floor}`)
            if (addr.notes) parts.push(`(${addr.notes})`)
            addressDisplay = parts.join(', ') || 'N/A'
        } else {
            addressDisplay = addr
        }
    }

    return `🍔 *NUEVO PEDIDO - ${businessName}*\n` +
        `📋 Pedido #${order.orderNumber}\n\n` +
        `*Items:*\n${items}\n\n` +
        `*Subtotal:* $${order.subtotal}\n` +
        `*Envío:* $${order.deliveryFee || 0}\n` +
        `*Total:* $${order.total}\n\n` +
        `💳 *Pago:* ${paymentLabel}\n` +
        `👤 *Cliente:* ${order.customerInfo?.name || 'N/A'}\n` +
        `📞 *Tel:* ${order.customerInfo?.phone || 'N/A'}\n` +
        `📍 *Dirección:* ${addressDisplay}` +
        paymentNote;
};

// ============================================
// TIME-BASED UTILITIES (No config needed)
// ============================================

/**
 * Check if cash payment is currently allowed
 * @returns {boolean}
 */
export function isCashPaymentAllowed() {
    return true
}

// ============================================
// VALIDATION UTILITIES (No config needed)
// ============================================

/**
 * Validate required delivery information
 * @param {Object} info - Customer delivery info
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateDeliveryInfo(info) {
    const errors = []

    if (!info.name || info.name.trim().length < 2) {
        errors.push('Nombre completo requerido')
    }

    if (!info.phone || info.phone.replace(/\D/g, '').length < 8) {
        errors.push('Número de teléfono válido requerido')
    }

    // 🛡️ STRUCTURED ADRESS VALIDATION (Strike 17)
    if (typeof info.address === 'object' && info.address !== null) {
        if (!info.address.street || info.address.street.trim().length < 2) {
            errors.push('Calle requerida')
        }
        if (!info.address.number || info.address.number.trim().length < 1) {
            errors.push('Altura/Número requerida')
        }
    } else {
        // Legacy String Validation
        if (!info.address || info.address.trim().length < 5) {
            errors.push('Dirección de entrega requerida')
        }
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * Get last 4 digits of phone number for delivery confirmation
 * @param {string} phone - Full phone number
 * @returns {string} Last 4 digits
 */
export function getPhoneLast4(phone) {
    if (!phone) return '----'
    const digits = phone.replace(/\D/g, '')
    return digits.slice(-4)
}

/**
 * Verify delivery confirmation code matches phone
 * @param {string} phone - Customer's full phone number
 * @param {string} code - 4-digit code entered by delivery staff
 * @returns {boolean}
 */
export function verifyDeliveryCode(phone, code) {
    const last4 = getPhoneLast4(phone)
    return last4 === code.replace(/\D/g, '')
}

// ============================================
// SESSION UTILITIES (No config needed)
// ============================================

/**
 * Check if currently in delivery mode (from session storage)
 * @returns {boolean}
 */
export function isDeliveryMode() {
    return sessionStorage.getItem('foodspot_delivery_mode') === 'true'
}

/**
 * Set delivery mode in session storage
 */
export function setDeliveryMode() {
    sessionStorage.setItem('foodspot_delivery_mode', 'true')
}

/**
 * Clear delivery mode from session
 */
export function clearDeliveryMode() {
    sessionStorage.removeItem('foodspot_delivery_mode')
}

/**
 * Get delivery mode display label
 * @returns {string}
 */
export function getDeliveryModeLabel() {
    return isDeliveryMode() ? 'Envío' : 'Recoger'
}

// ============================================
// CONFIG-DEPENDENT UTILITIES (REFACTORED)
// ============================================

/**
 * Get the delivery origin address (from config or businessInfo)
 * @param {Object} config - App configuration object
 * @returns {string}
 */
export function getDeliveryOriginAddress(config) {
    if (!config) return ''
    if (config.delivery?.originAddress) {
        return config.delivery.originAddress
    }
    return config.businessInfo?.address || ''
}

/**
 * Get configured delivery radius in km
 * @param {Object} config - App configuration object
 * @returns {number}
 */
export function getDeliveryRadius(config) {
    return config?.delivery?.radiusKm || 5
}

/**
 * Get configured flat delivery fee
 * @param {Object} config - App configuration object
 * @returns {number}
 */
export function getDeliveryFee(config) {
    return config?.delivery?.flatFee || 0
}

/**
 * Get free delivery threshold
 * @param {Object} config - App configuration object
 * @returns {number}
 */
export function getFreeDeliveryThreshold(config) {
    return config?.delivery?.freeDeliveryThreshold || 0
}

/**
 * Calculate delivery fee for an order total
 * @param {Object} config - App configuration object
 * @param {number} orderTotal - Order subtotal
 * @returns {number}
 */
export function calculateDeliveryFee(config, orderTotal) {
    const fee = getDeliveryFee(config)
    const threshold = getFreeDeliveryThreshold(config)

    if (threshold > 0 && orderTotal >= threshold) {
        return 0 // Free delivery
    }
    return fee
}

/**
 * Get number of delivery config changes this month
 * @param {Object} config - App configuration object
 * @returns {number}
 */
export function getDeliveryChangesThisMonth(config) {
    const history = config?.delivery?.changeHistory || []
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()

    return history.filter(change => {
        const changeDate = new Date(change.timestamp)
        return changeDate.getMonth() === thisMonth && changeDate.getFullYear() === thisYear
    }).length
}

export function canChangeDeliveryConfig(config) {
    return { allowed: true, message: 'Configuración habilitada' }; // Infinite autonomy enabled
}

/**
 * Record a delivery config change (returns new delivery object, doesn't mutate)
 * @param {Object} config - App configuration object
 * @param {string} field - Field that was changed
 * @param {*} oldValue - Previous value
 * @param {*} newValue - New value
 * @returns {Object} - New delivery config object with change recorded
 */
export function recordDeliveryConfigChange(config, field, oldValue, newValue) {
    const history = config?.delivery?.changeHistory || []
    const newChange = { field, oldValue, newValue, timestamp: new Date().toISOString() }
    return { ...config.delivery, changeHistory: [...history, newChange] }
}
