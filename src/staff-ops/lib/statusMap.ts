import type { Order, OrderItem, OrderStatus } from '@/types';

// ── DB (Spanish) → UI (Kimi) ────────────────────────────────────────────────

export function toKimiStatus(
  dbStatus: string,
  paymentMethod?: string,
  paymentConfirmed?: boolean,
): OrderStatus {
  // Cash orders that haven't been physically verified sit in PENDING_VERIFICATION
  if (dbStatus === 'pendiente' && paymentMethod === 'cash' && !paymentConfirmed) {
    return 'PENDING_VERIFICATION';
  }
  switch (dbStatus) {
    case 'pendiente':
    case 'confirmado':
      return 'TODO';
    case 'preparacion':
      return 'PREP';
    case 'listo':
      return 'READY';
    case 'despachado':
      return 'DISPATCH';
    case 'en_camino':
      return 'DELIVERING';
    case 'entregado':
      return 'DONE';
    default:
      return 'TODO';
  }
}

// ── UI (Kimi) → DB (Spanish) ─────────────────────────────────────────────────

export function toDbStatus(kimiStatus: OrderStatus): string {
  switch (kimiStatus) {
    case 'PENDING_VERIFICATION':
      return 'pendiente';
    case 'TODO':
      return 'confirmado';
    case 'PREP':
      return 'preparacion';
    case 'READY':
      return 'listo';
    case 'DISPATCH':
      return 'despachado';
    case 'DELIVERING':
      return 'en_camino';
    case 'DONE':
      return 'entregado';
  }
}

// ── Payment method mapping ────────────────────────────────────────────────────

function mapPaymentMethod(dbMethod: string | null): 'cash' | 'card' | 'online' {
  switch (dbMethod) {
    case 'cash':
      return 'cash';
    case 'card_on_delivery':
      return 'card';
    case 'mercado_pago':
    case 'transfer':
    default:
      return 'online';
  }
}

// ── DB order row → Kimi Order ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDbOrderToKimi(dbOrder: any): Order {
  const paymentMethod = mapPaymentMethod(dbOrder.payment_method);
  const paymentConfirmed = dbOrder.payment_confirmed ?? false;

  const status = toKimiStatus(dbOrder.status, paymentMethod, paymentConfirmed);

  const rawItems: { name: string; quantity: number; price?: number; specialInstructions?: string }[] =
    Array.isArray(dbOrder.items) ? dbOrder.items : [];

  const items: OrderItem[] = rawItems.map((item, idx) => ({
    id: `${dbOrder.id}-${idx}`,
    name: item.name,
    quantity: item.quantity,
    specialInstructions: item.specialInstructions,
  }));

  const createdAt = dbOrder.created_at
    ? new Date(dbOrder.created_at).getTime()
    : Date.now();

  // Derive priority from wait time: >8 min = high
  const waitMins = (Date.now() - createdAt) / 60000;
  const priority: 'normal' | 'high' = waitMins >= 8 ? 'high' : 'normal';

  // Parse delivery coordinates from PostGIS point or JSON
  let deliveryCoords: { lat: number; lng: number } | undefined;
  if (dbOrder.delivery_lat && dbOrder.delivery_lng) {
    deliveryCoords = { lat: Number(dbOrder.delivery_lat), lng: Number(dbOrder.delivery_lng) };
  } else if (dbOrder.delivery_coords) {
    try {
      const c = typeof dbOrder.delivery_coords === 'string'
        ? JSON.parse(dbOrder.delivery_coords)
        : dbOrder.delivery_coords;
      if (c?.lat && c?.lng) deliveryCoords = { lat: Number(c.lat), lng: Number(c.lng) };
    } catch {}
  }

  return {
    id: dbOrder.id,
    customerName: dbOrder.customer_name || 'Cliente',
    customerPhone: dbOrder.customer_phone ?? dbOrder.phone ?? undefined,
    items,
    status,
    createdAt,
    priority,
    assignedTo: dbOrder.assigned_to ?? undefined,
    paymentMethod,
    cashVerified: paymentConfirmed,
    offlineQueued: false,
    deliveryAddress: dbOrder.delivery_address ?? dbOrder.address ?? undefined,
    deliveryCoords,
    deliveryType: dbOrder.delivery_type ?? dbOrder.order_type ?? undefined,
  };
}
