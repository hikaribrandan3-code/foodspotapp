export const ORDER_STATUS_FLOW = {
    pendiente: { label: 'Pendiente', next: 'confirmado', nextLabel: 'Confirmar →', class: 'status-pendiente' },
    confirmado: { label: 'Confirmado', next: 'preparacion', nextLabel: 'A cocina →', class: 'status-confirmado' },
    preparacion: { label: 'En preparación', next: 'listo', nextLabel: 'Listo →', class: 'status-preparacion' },
    listo: {
        pickup: { label: 'Listo para retirar', next: 'entregado', nextLabel: 'Entregar', class: 'status-listo' },
        delivery: { label: 'Listo para envío', next: 'en_camino', nextLabel: 'Despachar 🚴', class: 'status-listo' }
    },
    en_camino: { label: 'En camino', next: 'entregado', nextLabel: 'Confirmar Entrega', class: 'status-en-camino' },
    entregado: { label: 'Entregado', next: null, nextLabel: null, class: 'status-entregado' }
}

/**
 * Returns localized status info and next step based on status and order type.
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
 * Returns { allowed: boolean, reason?: string }
 */
export const canAdvanceOrder = (order, newStatus, config) => {
    const { orderType, paymentConfirmed } = order
    const orderMode = config?.orderMode || 'A1'

    // ===========================================
    // RULE 1: P0 - DELIVERY PREPAYMENT BLOCK
    // ===========================================
    // Strictly NO prep or dispatch for delivery without confirmed payment.
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
    // In Mode A2, EVERYTHING (Pickup & Delivery) must be paid before prep.
    if (orderMode === 'A2') {
        if (newStatus === 'preparacion' && !paymentConfirmed) {
            return {
                allowed: false,
                reason: '⚠️ MODO CAFÉ (A2): Se requiere pago confirmado antes de marchar a cocina.'
            }
        }
    }

    // ===========================================
    // RULE 3: SAFARI COMPATIBILITY (Informational)
    // ===========================================
    // While logic allows it, frontend should use window.confirm for un-paid pickups in A1 mode
    // (This is handled in the UI layer, but good to note here for context)

    return { allowed: true }
}
