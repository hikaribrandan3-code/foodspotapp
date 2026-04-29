import { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { Order, OrderStatus, TabId } from '@/types';
import { queueAction, getQueuedActions, removeQueuedAction } from '@/lib/offlineQueue';
import { hapticForTransition } from '@/lib/haptic';
import * as audio from '@/lib/audio';
import { useToasts } from '@/components/ToastContainer';
import { useAudioPref } from '@/hooks/useAudioPref';
import { useBusiness } from '@/contexts/BusinessContext';
import { toDbStatus, mapDbOrderToKimi } from '@/lib/statusMap';
// @ts-ignore — JS module without type declarations
import { supabase, updateOrderCloud } from '../../lib/supabaseClient.js';

/* ------------------------------------------------------------------ */
/*  State                                                               */
/* ------------------------------------------------------------------ */

interface AppState {
  orders: Order[];
  currentTab: TabId;
  isOnline: boolean;
  selectedOrderId: string | null;
  handoffOrderId: string | null;
  driverPosition: { lat: number; lng: number } | null;
}

type Action =
  | { type: 'SET_TAB'; tab: TabId }
  | { type: 'ADVANCE_STATUS'; orderId: string }
  | { type: 'VERIFY_CASH'; orderId: string }
  | { type: 'CONFIRM_DELIVERY'; orderId: string }
  | { type: 'CONFIRM_PAYMENT'; orderId: string }
  | { type: 'CLAIM_DELIVERY'; orderId: string; staffName: string }
  | { type: 'CANCEL_ORDER'; orderId: string }
  | { type: 'SET_ONLINE'; online: boolean }
  | { type: 'SELECT_ORDER'; orderId: string | null }
  | { type: 'SET_HANDOFF'; orderId: string | null }
  | { type: 'RESET_HANDOFF' }
  | { type: 'ADD_ORDER'; order: Order }
  | { type: 'UPDATE_ORDER'; order: Order }
  | { type: 'REMOVE_ORDER'; orderId: string }
  | { type: 'HYDRATE_ORDERS'; orders: Order[] }
  | { type: 'SET_DRIVER_POSITION'; pos: { lat: number; lng: number } };

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  PENDING_VERIFICATION: 'TODO',
  TODO: 'PREP',
  PREP: 'READY',
  READY: 'DISPATCH',
  DISPATCH: 'DONE',
  DONE: null,
};

/** Compute next status respecting order type (pickup/dine-in skip dispatch) */
function getNextStatus(order: Order): OrderStatus | null {
  let next = STATUS_FLOW[order.status];
  if (!next) return null;
  // Pickup/dine-in skip DISPATCH — go directly to DONE
  if (order.status === 'READY' && order.deliveryType !== 'delivery') {
    next = 'DONE';
  }
  return next;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, currentTab: action.tab };

    case 'ADVANCE_STATUS': {
      const order = state.orders.find(o => o.id === action.orderId);
      if (!order) return state;
      const nextStatus = getNextStatus(order);
      if (!nextStatus) return state;
      hapticForTransition('status_advance');
      const newOrders = state.orders.map(o =>
        o.id === action.orderId
          ? { ...o, status: nextStatus, offlineQueued: !state.isOnline }
          : o,
      );
      let handoffId = state.handoffOrderId;
      if (order.status === 'READY' && nextStatus === 'DISPATCH') handoffId = action.orderId;
      return { ...state, orders: newOrders, handoffOrderId: handoffId };
    }

    case 'VERIFY_CASH': {
      hapticForTransition('verify_cash');
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.orderId
            ? { ...o, status: 'TODO' as OrderStatus, cashVerified: true, offlineQueued: !state.isOnline }
            : o,
        ),
      };
    }

    case 'CONFIRM_DELIVERY': {
      hapticForTransition('confirm_delivery');
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.orderId
            ? { ...o, status: 'DONE' as OrderStatus, deliveredAt: Date.now(), offlineQueued: !state.isOnline }
            : o,
        ),
      };
    }

    case 'CONFIRM_PAYMENT': {
      hapticForTransition('verify_cash');
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.orderId
            ? { ...o, paymentStatus: 'paid', offlineQueued: !state.isOnline }
            : o,
        ),
      };
    }

    case 'CLAIM_DELIVERY': {
      hapticForTransition('status_advance');
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.orderId
            ? { ...o, status: 'DISPATCH' as OrderStatus, assignedTo: action.staffName, offlineQueued: !state.isOnline }
            : o,
        ),
      };
    }

    case 'CANCEL_ORDER': {
      hapticForTransition('status_advance');
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.orderId
            ? { ...o, status: 'DONE' as OrderStatus }
            : o,
        ),
      };
    }

    case 'SET_ONLINE':     return { ...state, isOnline: action.online };
    case 'SELECT_ORDER':   return { ...state, selectedOrderId: action.orderId };
    case 'SET_HANDOFF':    return { ...state, handoffOrderId: action.orderId };
    case 'RESET_HANDOFF':  return { ...state, handoffOrderId: null };
    case 'ADD_ORDER': {
      // Prevent duplicate from Supabase realtime replay on reconnect
      if (state.orders.some(o => o.id === action.order.id)) return state;
      return { ...state, orders: [action.order, ...state.orders] };
    }
    case 'UPDATE_ORDER':   return { ...state, orders: state.orders.map(o => o.id === action.order.id ? action.order : o) };
    case 'REMOVE_ORDER':   return { ...state, orders: state.orders.filter(o => o.id !== action.orderId) };
    case 'HYDRATE_ORDERS': {
      // Deduplicate by ID — Supabase can return stale rows during polling overlap
      const byId = new Map();
      for (const o of action.orders) byId.set(o.id, o);
      return { ...state, orders: Array.from(byId.values()) };
    }
    case 'SET_DRIVER_POSITION': return { ...state, driverPosition: action.pos };
    default: return state;
  }
}

const initialState: AppState = {
  orders: [],
  currentTab: 'board',
  isOnline: true,
  selectedOrderId: null,
  handoffOrderId: null,
  driverPosition: null,
};

/* ------------------------------------------------------------------ */
/*  Context                                                             */
/* ------------------------------------------------------------------ */

interface OrderContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  advanceOrderStatus: (orderId: string) => void;
  verifyCash: (orderId: string) => void;
  confirmDelivery: (orderId: string) => void;
  confirmPayment: (orderId: string) => void;
  claimDelivery: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  refreshOrders: () => Promise<void>;
  setTab: (tab: TabId) => void;
  selectOrder: (orderId: string | null) => void;
  toggleOnline: () => void;
}

const OrderContext = createContext<OrderContextValue | null>(null);

/** Call the FSM RPC that validates and executes status transitions */
async function callAdvanceOrderStatusRpc(orderId: string, targetDbStatus: string) {
  const { data, error } = await supabase.rpc('advance_order_status', {
    p_order_id: orderId,
    p_target_status: targetDbStatus,
  });
  if (error) throw new Error(error.message);
  if (data && !data.success) {
    const msg = data.message || `FSM rejected: ${data.error || 'unknown'}`;
    throw new Error(msg);
  }
  return data;
}

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { addToast } = useToasts();
  const [audioEnabled] = useAudioPref();
  const watchIdRef = useRef<number | null>(null);
  const pendingOpsRef = useRef(new Set<string>());
  const { businessId } = useBusiness();

  /* ── Fetch real orders + subscribe to Supabase real-time ─────────── */
  useEffect(() => {
    if (!businessId) return;

    supabase
      .from('orders')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(100)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any[] | null }) => {
        if (data) dispatch({ type: 'HYDRATE_ORDERS', orders: data.map(mapDbOrderToKimi) });
      })
      .catch(() => {}); // Prevent unhandled rejection on initial load

    // Request browser notification permission on load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    let channel: any = null;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      channel = supabase
        .channel(`staff-ops-${businessId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => {
            const { eventType, new: newRow, old: oldRow } = payload;
            if (eventType === 'INSERT') {
              const order = mapDbOrderToKimi(newRow);
              dispatch({ type: 'ADD_ORDER', order });
              addToast({
                type: 'new_order',
                title: `New Order ${order.orderNumber}`,
                message: `${order.customerName} — ${order.items.length} item${order.items.length !== 1 ? 's' : ''}`,
                orderId: order.id,
              });
              if (audioEnabled) audio.alertNewOrder(order.priority);
              // Browser push notification (works even when tab is backgrounded)
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(`New Order ${order.orderNumber}`, {
                    body: `${order.customerName} — ${order.items.length} item${order.items.length !== 1 ? 's' : ''}`,
                    icon: '/pwa-icons/icon-192x192.png',
                    tag: order.id,
                    requireInteraction: true,
                  });
                } catch { /* noop */ }
              }
            } else if (eventType === 'UPDATE') {
              const updated = mapDbOrderToKimi(newRow);
              // Always keep done/cancelled orders in state so they stay in the Completed tab
              dispatch({ type: 'UPDATE_ORDER', order: updated });
            } else if (eventType === 'DELETE') {
              dispatch({ type: 'REMOVE_ORDER', orderId: oldRow.id });
            }
          },
        )
        .subscribe((status: string, err?: Error) => {
          if (err || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[useOrders] Realtime unavailable, falling back to polling:', status, err?.message);
            // Fallback: poll every 3 seconds for instant staff feedback
            pollInterval = setInterval(() => {
              supabase
                .from('orders')
                .select('*')
                .eq('business_id', businessId)
                .order('created_at', { ascending: false })
                .limit(100)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .then(({ data }: { data: any[] | null }) => {
                  if (data) dispatch({ type: 'HYDRATE_ORDERS', orders: data.map(mapDbOrderToKimi) });
                });
            }, 3000);
          }
        });
    } catch (err) {
      console.warn('[useOrders] Realtime init failed, using polling:', (err as Error)?.message);
      // Fallback: poll every 3 seconds
      pollInterval = setInterval(() => {
        supabase
          .from('orders')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(100)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then(({ data }: { data: any[] | null }) => {
            if (data) dispatch({ type: 'HYDRATE_ORDERS', orders: data.map(mapDbOrderToKimi) });
          });
      }, 3000);
    }

    return () => {
      try { if (channel) supabase.removeChannel(channel); } catch { /* WebSocket may already be closed on navigation */ }
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [businessId, addToast, audioEnabled]);

  /* ── Critical order monitor ──────────────────────────────────────── */
  useEffect(() => {
    const interval = setInterval(() => {
      state.orders.forEach(order => {
        if (order.status === 'DONE' || order.status === 'PENDING_VERIFICATION') return;
        const mins = Math.floor((Date.now() - order.createdAt) / 60000);
        if (mins === 10) {
          addToast({ type: 'critical', title: 'Critical order', message: `${order.customerName} — ${mins}m wait`, orderId: order.id });
          if (audioEnabled) audio.alertCritical();
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [state.orders, addToast, audioEnabled]);

  /* ── Real GPS tracking ───────────────────────────────────────────── */
  useEffect(() => {
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => dispatch({ type: 'SET_DRIVER_POSITION', pos: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
    }
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  /* ── Offline → online: replay queued actions ─────────────────────── */
  useEffect(() => {
    if (!state.isOnline) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getQueuedActions().then((actions: any[]) => {
      actions.forEach(async (qa) => {
        if (qa.type === 'status_advance') dispatch({ type: 'ADVANCE_STATUS', orderId: qa.orderId });
        else if (qa.type === 'verify_cash') dispatch({ type: 'VERIFY_CASH', orderId: qa.orderId });
        else if (qa.type === 'confirm_delivery') dispatch({ type: 'CONFIRM_DELIVERY', orderId: qa.orderId });
        else if (qa.type === 'cancel_order') dispatch({ type: 'CANCEL_ORDER', orderId: qa.orderId });
        await removeQueuedAction(qa.id);
      });
    });
  }, [state.isOnline]);

  /* ── Action creators ─────────────────────────────────────────────── */

  // Direct DB update — matches owner pattern exactly, no RPC
  const dbUpdate = useCallback((orderId: string, updates: Record<string, any>) => {
    return supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .then(() => {
        return supabase
          .from('orders')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(100)
          .then(({ data }: { data: any[] | null }) => {
            if (data) dispatch({ type: 'HYDRATE_ORDERS', orders: data.map(mapDbOrderToKimi) });
          });
      });
  }, [businessId]);

  const advanceOrderStatus = useCallback((orderId: string) => {
    if (pendingOpsRef.current.has(orderId)) return;

    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    const nextStatus = getNextStatus(order);
    if (!nextStatus) return;

    pendingOpsRef.current.add(orderId);
    if (!state.isOnline) queueAction({ orderId, type: 'status_advance', timestamp: Date.now() });
    dispatch({ type: 'ADVANCE_STATUS', orderId });

    if (state.isOnline) {
      dbUpdate(orderId, { status: toDbStatus(nextStatus) })
        .catch((e: Error) => addToast({ type: 'critical', title: 'Update Failed', message: e.message, orderId }))
        .finally(() => pendingOpsRef.current.delete(orderId));
    } else {
      pendingOpsRef.current.delete(orderId);
    }
  }, [state.isOnline, state.orders, dbUpdate, addToast]);

  const verifyCash = useCallback((orderId: string) => {
    if (pendingOpsRef.current.has(orderId)) return;

    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    pendingOpsRef.current.add(orderId);
    if (!state.isOnline) queueAction({ orderId, type: 'verify_cash', timestamp: Date.now() });
    dispatch({ type: 'VERIFY_CASH', orderId });

    if (state.isOnline) {
      dbUpdate(orderId, { status: 'released_to_kitchen', payment_confirmed: true, payment_status: 'paid' })
        .then(() => {
          addToast({ type: 'cash_verified', title: 'Cash Verified', message: `${order.customerName} — sent to kitchen`, orderId });
          if (audioEnabled) audio.alertCashVerified();
        })
        .catch((e: Error) => addToast({ type: 'critical', title: 'Verify Failed', message: e.message, orderId }))
        .finally(() => pendingOpsRef.current.delete(orderId));
    } else {
      addToast({ type: 'cash_verified', title: 'Cash Verified', message: `${order.customerName} — sent to kitchen`, orderId });
      if (audioEnabled) audio.alertCashVerified();
      pendingOpsRef.current.delete(orderId);
    }
  }, [state.isOnline, state.orders, dbUpdate, addToast, audioEnabled]);

  const confirmDelivery = useCallback((orderId: string) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    if (!state.isOnline) queueAction({ orderId, type: 'confirm_delivery', timestamp: Date.now() });
    dispatch({ type: 'CONFIRM_DELIVERY', orderId });

    if (state.isOnline) {
      dbUpdate(orderId, { status: 'delivered', delivered_at: new Date().toISOString() })
        .catch((e: Error) => addToast({ type: 'critical', title: 'Confirm Failed', message: e.message, orderId }));
    }

    addToast({ type: 'delivery_done', title: 'Delivered', message: `${order.customerName} — completed`, orderId });
    if (audioEnabled) audio.alertDeliveryConfirmed();
  }, [state.isOnline, state.orders, dbUpdate, addToast, audioEnabled]);

  const claimDelivery = useCallback((orderId: string) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order || order.deliveryType !== 'delivery') return;

    const staffMember = (() => { try { return JSON.parse(localStorage.getItem('fs_staff_member') || '{}'); } catch { return {}; } })();
    const staffName = staffMember?.name || 'Staff';
    dispatch({ type: 'CLAIM_DELIVERY', orderId, staffName });
    if (state.isOnline) {
      dbUpdate(orderId, { status: 'dispatched', assigned_to: staffName })
        .catch((e: Error) => addToast({ type: 'critical', title: 'Claim Failed', message: e.message, orderId }));
    }
    addToast({ type: 'cash_verified', title: 'Delivery Claimed', message: `${staffName} is taking this order`, orderId });
  }, [state.isOnline, state.orders, dbUpdate, addToast]);

  const cancelOrder = useCallback((orderId: string) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    if (!state.isOnline) {
      queueAction({ orderId, type: 'cancel_order', timestamp: Date.now() });
      dispatch({ type: 'REMOVE_ORDER', orderId });
      addToast({ type: 'order_cancelled', title: 'Order Deleted', message: `${order.customerName} — deleted`, orderId });
      return;
    }

    // Delete from DB first, THEN remove from UI only if successful
    supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .then(() => {
        dispatch({ type: 'REMOVE_ORDER', orderId });
        addToast({ type: 'order_cancelled', title: 'Order Deleted', message: `${order.customerName} — deleted`, orderId });
      })
      .catch((e: Error) => addToast({ type: 'critical', title: 'Cancel Failed', message: e.message, orderId }));
  }, [state.isOnline, state.orders, businessId, addToast]);

  const refreshOrders = useCallback(async () => {
    if (!businessId) return;
    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) dispatch({ type: 'HYDRATE_ORDERS', orders: data.map(mapDbOrderToKimi) });
    } catch (e) {
      console.error('[useOrders] Refresh failed:', e);
    }
  }, [businessId]);

  const confirmPayment = useCallback((orderId: string) => {
    if (pendingOpsRef.current.has(orderId)) return;

    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    pendingOpsRef.current.add(orderId);
    if (!state.isOnline) queueAction({ orderId, type: 'verify_cash', timestamp: Date.now() });
    dispatch({ type: 'CONFIRM_PAYMENT', orderId });

    if (state.isOnline) {
      dbUpdate(orderId, { payment_status: 'paid', payment_confirmed: true })
        .then(() => {
          addToast({ type: 'cash_verified', title: 'Payment Confirmed', message: `${order.customerName} — paid`, orderId });
          if (audioEnabled) audio.alertCashVerified();
        })
        .catch((e: Error) => addToast({ type: 'critical', title: 'Confirm Failed', message: e.message, orderId }))
        .finally(() => pendingOpsRef.current.delete(orderId));
    } else {
      addToast({ type: 'cash_verified', title: 'Payment Confirmed', message: `${order.customerName} — paid`, orderId });
      if (audioEnabled) audio.alertCashVerified();
      pendingOpsRef.current.delete(orderId);
    }
  }, [state.isOnline, state.orders, dbUpdate, addToast, audioEnabled]);

  const setTab = useCallback((tab: TabId) => dispatch({ type: 'SET_TAB', tab }), []);
  const selectOrder = useCallback((orderId: string | null) => dispatch({ type: 'SELECT_ORDER', orderId }), []);
  const toggleOnline = useCallback(() => dispatch({ type: 'SET_ONLINE', online: !state.isOnline }), [state.isOnline]);

  return (
    <OrderContext.Provider value={{
      state, dispatch, advanceOrderStatus, verifyCash,
      confirmDelivery, confirmPayment, claimDelivery, cancelOrder, refreshOrders, setTab, selectOrder, toggleOnline,
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders must be used within OrderProvider');
  return ctx;
}
