export const ORDER_STATUS_FLOW = {
    pending_payment: { label: 'Pending Payment', next: ORDER_STATUS.PAID_UNRELEASED, nextLabel: 'Confirm Payment →', class: 'status-pending-payment' },
    paid_unreleased: { label: 'Paid — Awaiting Release', next: ORDER_STATUS.RELEASED_TO_KITCHEN, nextLabel: 'Release to Kitchen →', class: 'status-paid-unreleased' },
    released_to_kitchen: { label: 'Released to Kitchen', next: ORDER_STATUS.PREPARING, nextLabel: 'Start Prep →', class: 'status-released' },
    preparing: { label: 'Preparing', next: ORDER_STATUS.READY, nextLabel: 'Ready →', class: 'status-preparing' },
    ready: {
        pickup: { label: 'Ready for Pickup', next: ORDER_STATUS.DELIVERED, nextLabel: 'Hand Over', class: 'status-ready' },
        delivery: { label: 'Ready for Dispatch', next: ORDER_STATUS.DISPATCHED, nextLabel: 'Dispatch', class: 'status-ready' }
    },
    dispatched: { label: 'Dispatched', next: ORDER_STATUS.DELIVERED, nextLabel: 'Confirm Delivery', class: 'status-dispatched' },
    delivered: { label: 'Delivered', next: null, nextLabel: null, class: 'status-delivered' },
    cancelled: { label: 'Cancelled', next: null, nextLabel: null, class: 'status-cancelled' },
    refunded: { label: 'Refunded', next: null, nextLabel: null, class: 'status-refunded' }
}

/**
 * Returns localized status info and next step based on status and order type.
 * @param {string} status - Order status (enum value)
 * @param {string} orderType - 'pickup' or 'delivery'
 */
export const getOrderStatusInfo = (status, orderType = 'pickup') => {
    const info = ORDER_STATUS_FLOW[status]
    if (!info) return { label: status, next: null, nextLabel: null, class: '' }

    // Handle split path for ORDER_STATUS.READY
    if (status === ORDER_STATUS.READY) {
        return info[orderType] || info.pickup
    }

    return info
}

/**
 * Logic Gate: Validates if an order can move to the next status.
 * 
 * @param {object} order - Order object with UUID id
 * @param {string} order.id - UUID string (from Supabase)
 * @param {string} order.orderType - 'pickup' or 'delivery'
 * @param {boolean} order.paymentConfirmed - Payment status
 * @param {string} newStatus - Target status
 * @param {object} config - App config with orderMode
 * @returns {{ allowed: boolean, reason?: string }}
 */
export const canAdvanceOrder = (order, newStatus, config) => {
    // Validate order has UUID id
    if (!order || typeof order.id !== 'string') {
        return {
            allowed: false,
            reason: '⚠️ Invalid order: missing UUID'
        }
    }

    const orderType = order.orderType || order.order_type
    const paymentConfirmed = order.paymentConfirmed ?? order.payment_confirmed ?? false
    const orderMode = config?.orderMode || 'A1'

    // ===========================================
    // RULE 1: P0 - DELIVERY PREPAYMENT BLOCK
    // ===========================================
    if (orderType === 'delivery') {
        if ((newStatus === ORDER_STATUS.PREPARING || newStatus === ORDER_STATUS.DISPATCHED) && !paymentConfirmed) {
            return {
                allowed: false,
                reason: '⚠️ REGLA DE DESPACHO: El pedido debe estar PAGADO antes de preparar o enviar.'
            }
        }
    }

    // ===========================================
    // RULE 2: MODE A2 (CAFÉ) - STRICT PREPAYMENT
    // ===========================================
    if (orderMode === 'A2') {
        if (newStatus === ORDER_STATUS.PREPARING && !paymentConfirmed) {
            return {
                allowed: false,
                reason: '⚠️ MODO CAFÉ (A2): Se requiere pago confirmado antes de marchar a cocina.'
            }
        }
    }

    return { allowed: true }
}

/**
 * ALIAS: Supabase-compatible Logic Gate.
 * @param {object} order - Order with UUID id
 * @param {string} newStatus - Target status
 * @param {string} orderMode - 'A1' or 'A2'
 */
export const validateOrderStatusTransition = (order, newStatus, orderMode = 'A1') => {
    return canAdvanceOrder(order, newStatus, { orderMode })
}

/**
 * Validate UUID format (Supabase order IDs)
 * @param {string} id - Potential UUID
 * @returns {boolean}
 */
export const isValidOrderId = (id) => {
    if (typeof id !== 'string') return false
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
}
