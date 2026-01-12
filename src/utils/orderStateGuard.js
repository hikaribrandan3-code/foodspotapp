export const ORDER_STATUS_FLOW = {
    pendiente: { label: 'Pendiente', next: 'confirmado', nextLabel: 'Confirmar →', class: 'status-pendiente' },
    confirmado: { label: 'Confirmado', next: 'preparacion', nextLabel: 'A cocina →', class: 'status-confirmado' },
    preparacion: { label: 'En preparación', next: 'listo', nextLabel: 'Listo →', class: 'status-preparacion' },
    listo: {
        pickup: { label: 'Listo para retirar', next: 'entregado', nextLabel: 'Entregar', class: 'status-listo' },
        delivery: { label: 'Listo para envío', next: 'en_camino', nextLabel: 'Despachar 🚴', class: 'status-listo' }
    },
    en_camino: { label: 'En camino', next: 'entregado', nextLabel: 'Confirmar Entrega', class: 'status-en-camino' },
    entregado: { label: 'Entregado', next: null, nextLabel: null, class: 'status-entregado' },
    cancelado: { label: 'Cancelado', next: null, nextLabel: null, class: 'status-cancelado' }
}

/**
 * Returns localized status info and next step based on status and order type.
 * @param {string} status - Order status (enum value)
 * @param {string} orderType - 'pickup' or 'delivery'
 */
export const getOrderStatusInfo = (status, orderType = 'pickup') => {
    const info = ORDER_STATUS_FLOW[status]
    if (!info) return { label: status, next: null, nextLabel: null, class: '' }

    // Handle split path for 'listo'
    if (status === 'listo') {
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

    const { orderType, paymentConfirmed } = order
    const orderMode = config?.orderMode || 'A1'

    // ===========================================
    // RULE 1: P0 - DELIVERY PREPAYMENT BLOCK
    // ===========================================
    if (orderType === 'delivery') {
        if ((newStatus === 'preparacion' || newStatus === 'en_camino') && !paymentConfirmed) {
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
        if (newStatus === 'preparacion' && !paymentConfirmed) {
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
