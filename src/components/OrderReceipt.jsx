import React from 'react'
import { formatPrice } from '../config/menuData.js'
import './OrderReceipt.css'

/**
 * OrderReceipt - Dense receipt card for customer Status tab
 * 
 * Design: dense card, white bg, 12px radius, 12px padding, soft shadow
 * Shows full order breakdown with payment status banner
 */

const PaymentBanner = ({ paymentStatus, paymentMethod, onRetry }) => {
    // Map internal payment method values to display labels
    const isMercadoPago = paymentMethod === 'mercadopago'
    const isCash = paymentMethod === 'efectivo' || paymentMethod === 'cash'
    const isDineIn = paymentMethod === 'pay_at_counter' || paymentMethod === 'dine_in'

    if (paymentStatus === 'paid') {
        return (
            <div className="or-banner or-banner--green">
                <span className="or-banner__icon">✅</span>
                <span className="or-banner__text">Payment Confirmed</span>
            </div>
        )
    }

    if (paymentStatus === 'failed') {
        return (
            <div className="or-banner or-banner--red">
                <span className="or-banner__icon">❌</span>
                <span className="or-banner__text">Payment Failed</span>
                {isMercadoPago && onRetry && (
                    <button className="or-banner__action" onClick={onRetry}>
                        Retry Payment
                    </button>
                )}
            </div>
        )
    }

    // Pending
    if (isCash) {
        return (
            <div className="or-banner or-banner--blue">
                <span className="or-banner__icon">💵</span>
                <span className="or-banner__text">Cash Payment — Pay on pickup/delivery</span>
            </div>
        )
    }

    if (isDineIn) {
        return (
            <div className="or-banner or-banner--blue">
                <span className="or-banner__icon">🍽️</span>
                <span className="or-banner__text">Pay at Table</span>
            </div>
        )
    }

    // Default pending (Mercado Pago or unknown)
    return (
        <div className="or-banner or-banner--yellow">
            <span className="or-banner__icon">💳</span>
            <span className="or-banner__text">Payment Pending — Complete checkout to confirm</span>
            {isMercadoPago && onRetry && (
                <button className="or-banner__action" onClick={onRetry}>
                    Pay Now
                </button>
            )}
        </div>
    )
}

const PaymentMethodLine = ({ paymentMethod, paymentStatus }) => {
    const isMercadoPago = paymentMethod === 'mercadopago'
    const isCash = paymentMethod === 'efectivo' || paymentMethod === 'cash'
    const isDineIn = paymentMethod === 'pay_at_counter' || paymentMethod === 'dine_in'

    if (paymentStatus === 'paid') {
        if (isMercadoPago) {
            return <div className="or-payment-line">💳 Paid via Mercado Pago</div>
        }
        if (isCash) {
            return <div className="or-payment-line">💵 Cash — Collected</div>
        }
        if (isDineIn) {
            return <div className="or-payment-line">🍽️ Paid at Table</div>
        }
        return <div className="or-payment-line">✅ Payment Received</div>
    }

    if (isMercadoPago) {
        return <div className="or-payment-line">💳 Mercado Pago</div>
    }
    if (isCash) {
        return <div className="or-payment-line">💵 Cash on Delivery</div>
    }
    if (isDineIn) {
        return <div className="or-payment-line">🍽️ Pay at Table</div>
    }
    return <div className="or-payment-line">💳 Payment</div>
}

function OrderReceipt({ order, tenantData, paymentMethod, paymentStatus, onRetryPayment }) {
    if (!order) return null

    const isCancelled = order.status === 'cancelled' || order.status === 'refunded'
    const items = order.items || []
    const subtotal = order.subtotal || 0
    const deliveryFee = order.delivery_fee || 0
    const total = order.total || 0

    const businessName = tenantData?.business_name || 'Local'
    const businessAddress = tenantData?.address || ''
    const orderNumber = order.order_number || order.orderNumber || `#${order.id?.slice(0, 8)}`

    const createdAt = order.created_at
        ? new Date(order.created_at)
        : new Date()
    const dateStr = createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
    const timeStr = createdAt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    })

    return (
        <div className="order-receipt">
            {/* Status Banner */}
            {!isCancelled && (
                <PaymentBanner
                    paymentStatus={paymentStatus}
                    paymentMethod={paymentMethod}
                    onRetry={onRetryPayment}
                />
            )}

            {isCancelled && (
                <div className="or-banner or-banner--red">
                    <span className="or-banner__icon">❌</span>
                    <span className="or-banner__text">Order Cancelled</span>
                </div>
            )}

            {/* Receipt Header */}
            <div className="or-header">
                <div className="or-header__icon">🧾</div>
                <div className="or-header__title">ORDER RECEIPT</div>
                <div className="or-header__number">{orderNumber}</div>
                <div className="or-header__date">{dateStr} • {timeStr}</div>
            </div>

            {/* Business Info */}
            <div className="or-business">
                <div className="or-business__name">📍 {businessName}</div>
                {businessAddress && (
                    <div className="or-business__address">{businessAddress}</div>
                )}
            </div>

            {/* Divider */}
            <div className="or-divider" />

            {/* Items */}
            <div className="or-items">
                {items.length === 0 ? (
                    <div className="or-items__empty">No items</div>
                ) : (
                    items.map((item, index) => (
                        <div key={index} className="or-item">
                            <div className="or-item__left">
                                <span className="or-item__qty">{item.quantity}x</span>
                                <span className="or-item__name">{item.name}</span>
                            </div>
                            <div className="or-item__price">
                                {formatPrice(item.price * item.quantity)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Divider */}
            <div className="or-divider" />

            {/* Totals */}
            {!isCancelled && (
                <div className="or-totals">
                    <div className="or-total-row">
                        <span className="or-total-row__label">Subtotal</span>
                        <span className="or-total-row__value">{formatPrice(subtotal)}</span>
                    </div>
                    {deliveryFee > 0 && (
                        <div className="or-total-row">
                            <span className="or-total-row__label">Delivery</span>
                            <span className="or-total-row__value">{formatPrice(deliveryFee)}</span>
                        </div>
                    )}
                    <div className="or-divider or-divider--dashed" />
                    <div className="or-total-row or-total-row--grand">
                        <span className="or-total-row__label">TOTAL</span>
                        <span className="or-total-row__value">{formatPrice(total)}</span>
                    </div>
                </div>
            )}

            {/* Payment Method */}
            <div className="or-payment">
                <PaymentMethodLine paymentMethod={paymentMethod} paymentStatus={paymentStatus} />
            </div>

            {/* Footer */}
            <div className="or-footer">
                <div className="or-estimated">
                    ⏱️ Est. ready: 18 min
                </div>
                <button className="or-track-btn">
                    Track Order
                </button>
            </div>
        </div>
    )
}

export default OrderReceipt
