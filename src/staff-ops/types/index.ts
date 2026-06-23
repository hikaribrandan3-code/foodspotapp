export type OrderStatus =
  | 'PENDING_VERIFICATION'
  | 'TODO'
  | 'PREP'
  | 'READY'
  | 'DISPATCH'
  | 'DELIVERING'
  | 'DONE';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  specialInstructions?: string;
}

export interface Order {
  id: string;
  orderNumber?: string; // e.g. "#001" for announcing to customers
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: number;
  priority: 'normal' | 'high';
  assignedTo?: string;
  offlineQueued?: boolean;
  paymentMethod: 'cash' | 'card' | 'online';
  cashVerified?: boolean;
  deliveredAt?: number;
  deliveryCoords?: { lat: number; lng: number };
  deliveryAddress?: string;
  deliveryType?: 'delivery' | 'pickup' | 'dine_in';
  tableNumber?: number;
  staffNotes?: string;
  /** Raw DB status — used for FSM-aware transitions */
  rawDbStatus?: string;
  paymentStatus?: string;
  /** Order total in dollars */
  total?: number;
}

export type TabId = 'board' | 'prep' | 'logistics' | 'order' | 'inventory' | 'reservations' | 'events' | 'kds';

export const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  PENDING_VERIFICATION: 'TODO',
  TODO: 'PREP',
  PREP: 'READY',
  READY: 'DISPATCH',
  DISPATCH: 'DONE',
  DELIVERING: 'DONE',
  DONE: null,
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_VERIFICATION: 'Verify Payment',
  TODO: 'To-Do',
  PREP: 'Prepping',
  READY: 'Ready',
  DISPATCH: 'Dispatched',
  DELIVERING: 'Delivering',
  DONE: 'Completed',
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING_VERIFICATION: 'text-amber-400 border-amber-400 bg-amber-400/10',
  TODO: 'text-slate-400 border-slate-400 bg-slate-400/10',
  PREP: 'text-blue-400 border-blue-400 bg-blue-400/10',
  READY: 'text-amber-400 border-amber-400 bg-amber-400/10',
  DISPATCH: 'text-emerald-400 border-emerald-400 bg-emerald-400/10',
  DELIVERING: 'text-purple-400 border-purple-400 bg-purple-400/10',
  DONE: 'text-slate-500 border-slate-500 bg-slate-500/10',
};

export interface QueuedAction {
  id: string;
  orderId: string;
  type: 'status_advance' | 'verify_cash' | 'confirm_delivery' | 'confirm_payment';
  payload?: Record<string, unknown>;
  timestamp: number;
}

export function getWaitMinutes(createdAt: number): number {
  return Math.floor((Date.now() - createdAt) / 60000);
}

export function getUrgencyLevel(createdAt: number): 'normal' | 'warning' | 'critical' {
  const mins = getWaitMinutes(createdAt);
  if (mins >= 10) return 'critical';
  if (mins >= 5) return 'warning';
  return 'normal';
}
