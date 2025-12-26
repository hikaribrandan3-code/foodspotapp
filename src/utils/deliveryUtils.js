/**
 * REFACTORED: Delivery Utils
 * Accepts 'config' as a parameter to ensure single-source-of-truth.
 * 
 * ARCHITECTURAL INVARIANT: These functions are PURE.
 * They do NOT call getConfig() — config must be passed in.
 */

// ============================================
// TIME-BASED UTILITIES (No config needed)
// ============================================

/**
 * Check if cash payment is currently allowed
 * Cash is ONLY allowed between 10:00 and 18:00 local device time
 * @returns {boolean}
 */
export function isCashPaymentAllowed() {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const currentTime = hours * 60 + minutes

    const startTime = 10 * 60  // 10:00 = 600 minutes
    const endTime = 18 * 60    // 18:00 = 1080 minutes

    return currentTime >= startTime && currentTime < endTime
}

/**
 * Get the cash payment time window for display
 * @returns {{ start: string, end: string }}
 */
export function getCashTimeWindow() {
    return {
        start: '10:00',
        end: '18:00'
    }
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

    if (!info.address || info.address.trim().length < 5) {
        errors.push('Dirección de entrega requerida')
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

/**
 * Check if delivery config can be changed (3× per month limit)
 * @param {Object} config - App configuration object
 * @returns {boolean}
 */
export function canChangeDeliveryConfig(config) {
    return getDeliveryChangesThisMonth(config) < 3
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
