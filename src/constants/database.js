/**
 * Single source of truth for all database enum values.
 * Import these instead of hardcoding strings anywhere in the app.
 */

export const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAID_UNRELEASED: 'paid_unreleased',
  RELEASED_TO_KITCHEN: 'released_to_kitchen',
  PREPARING: 'preparing',
  READY: 'ready',
  DISPATCHED: 'dispatched',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

export const PAYMENT_METHOD = {
  CASH: 'cash',
  MERCADO_PAGO: 'mercado_pago',
  CARD_ON_DELIVERY: 'card_on_delivery',
  WHATSAPP: 'whatsapp',
  ALIAS: 'alias',
};

// Legacy values (pre-migration): 'efectivo', 'mercadopago', 'pay_at_counter', 'tarjeta_envio'

export const ORDER_TYPE = {
  PICKUP: 'pickup',
  DELIVERY: 'delivery',
  DINE_IN: 'dine_in',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
};

/** Array of all active (non-terminal) order statuses */
export const ACTIVE_ORDER_STATUSES = [
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.PAID_UNRELEASED,
  ORDER_STATUS.RELEASED_TO_KITCHEN,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
  ORDER_STATUS.DISPATCHED,
];

/** Array of all terminal order statuses */
export const TERMINAL_ORDER_STATUSES = [
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.REFUNDED,
];
