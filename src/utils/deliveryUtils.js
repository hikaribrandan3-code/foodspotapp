// Delivery Utilities for FoodSpot v1.0
// Handles delivery-specific logic: payment time windows, validation, confirmation

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

/**
 * Validate required delivery information
 * @param {Object} info - Customer delivery info
 * @param {string} info.name - Full name (required)
 * @param {string} info.phone - Phone number (required)
 * @param {string} info.address - Delivery address (required)
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
