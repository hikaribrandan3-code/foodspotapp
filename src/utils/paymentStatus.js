/**
 * 🛡️ Payment Status Helper
 * Centralises all "is this order paid?" logic.
 * Checks both MercadoPago-style payment_status and owner-confirmed cash payments.
 */
export function isOrderPaid(order) {
    if (!order) return false
    return order.payment_status === 'paid' || order.payment_confirmed === true
}
