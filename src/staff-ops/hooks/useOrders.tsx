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
  DISPATCH: 'DELIVERING',
  DELIVERING: 'DONE',
  DONE: null,
};

/** Order-type-aware next status (pickup/dine-in skip DISPATCH) */
function getNextStatus(status: OrderStatus, deliveryType?: string): OrderStatus | null {
  if (status === 'READY') {
    return deliveryType === 'delivery' ? 'DISPATCH' : 'DONE';
  }
  return STATUS_FLOW[status] || null;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, currentTab: action.tab };

    case 'ADVANCE_STATUS': {
      const order = state.orders.find(o => o.id === action.orderId);
      if (!order) return state;
      const nextStatus = getNextStatus(order.status, order.deliveryType);
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
      hapticForTransition('confirm_delivery');
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.orderId
            ? { ...o, status: 'DONE' as OrderStatus, cashVerified: true, offlineQueued: !state.isOnline }
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
        orders: state.orders.filter(o => o.id !== action.orderId),
      };
    }

    case 'SET_ONLINE':     return { ...state, isOnline: action.online };
    case 'SELECT_ORDER':   return { ...state, selectedOrderId: action.orderId };
    case 'SET_HANDOFF':    return { ...state, handoffOrderId: action.orderId };
    case 'RESET_HANDOFF':  return { ...state, handoffOrderId: null };
    case 'ADD_ORDER':      return { ...state, orders: [action.order, ...state.orders] };
    case 'UPDATE_ORDER':   return { ...state, orders: state.orders.map(o => o.id === action.order.id ? action.order : o) };
    case 'REMOVE_ORDER':   return { ...state, orders: state.orders.filter(o => o.id !== action.orderId) };
    case 'HYDRATE_ORDERS': return { ...state, orders: action.orders };
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
  setTab: (tab: TabId) => void;
  selectOrder: (orderId: string | null) => void;
  toggleOnline: () => void;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { addToast } = useToasts();
  const [audioEnabled] = useAudioPref();
  const watchIdRef = useRef<number | null>(null);
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
                title: `New Order #${newRow.order_number ?? ''}`,
                message: `${order.customerName} — ${order.items.length} item${order.items.length !== 1 ? 's' : ''}`,
                orderId: order.id,
              });
              if (audioEnabled) audio.alertNewOrder(order.priority);
            } else if (eventType === 'UPDATE') {
              const updated = mapDbOrderToKimi(newRow);
              if (updated.status === 'DONE' || newRow.status === 'cancelled' || newRow.status === 'cancelado') {
                dispatch({ type: 'REMOVE_ORDER', orderId: updated.id });
              } else {
                dispatch({ type: 'UPDATE_ORDER', order: updated });
              }
            } else if (eventType === 'DELETE') {
              dispatch({ type: 'REMOVE_ORDER', orderId: oldRow.id });
            }
          },
        )
        .subscribe((status: string, err?: Error) => {
          if (err || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[useOrders] Realtime unavailable, falling back to polling:', status, err?.message);
            // Fallback: poll every 15 seconds
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
            }, 15000);
          }
        });
    } catch (err) {
      console.warn('[useOrders] Realtime init failed, using polling:', (err as Error)?.message);
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
      }, 15000);
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
        await removeQueuedAction(qa.id);
      });
    });
  }, [state.isOnline]);

  /* ── Action creators ─────────────────────────────────────────────── */

  const advanceOrderStatus = useCallback(async (orderId: string) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    const nextStatus = getNextStatus(order.status, order.deliveryType);
    if (!nextStatus) return;

    if (!state.isOnline) {
      queueAction({ orderId, type: 'status_advance', timestamp: Date.now() });
      dispatch({ type: 'ADVANCE_STATUS', orderId });
      return;
    }

    if (state.isOnline && businessId) {
      const targetDbStatus = toDbStatus(nextStatus);
      const { data, error } = await supabase.rpc('advance_order_status', {
        p_order_id: orderId,
        p_target_status: targetDbStatus,
      });
      if (error || !data?.success) {
        console.error('[StaffOps] advance RPC error:', error?.message || data?.message);
        addToast({ type: 'critical', title: 'Update Failed', message: data?.message || error?.message || 'Could not advance order', orderId });
        return;
      }
      dispatch({ type: 'ADVANCE_STATUS', orderId });
    }
  }, [state.isOnline, state.orders, businessId, addToast]);

  const verifyCash = useCallback(async (orderId: string) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    if (!state.isOnline) {
      queueAction({ orderId, type: 'verify_cash', timestamp: Date.now() });
      dispatch({ type: 'VERIFY_CASH', orderId });
      addToast({ type: 'cash_verified', title: 'Cash Verified', message: `${order.customerName} — sent to kitchen`, orderId });
      if (audioEnabled) audio.alertCashVerified();
      return;
    }

    if (state.isOnline && businessId) {
      // 1) Advance status via RPC (bypasses RLS)
      const { data: rpcData, error: rpcError } = await supabase.rpc('advance_order_status', {
        p_order_id: orderId,
        p_target_status: toDbStatus('TODO'),
      });
      if (rpcError || !rpcData?.success) {
        console.error('[StaffOps] verifyCash RPC error:', rpcError?.message || rpcData?.message);
        addToast({ type: 'critical', title: 'Update Failed', message: rpcData?.message || rpcError?.message || 'Could not verify cash', orderId });
        return;
      }
      // 2) Set payment flags via direct update (best-effort)
      updateOrderCloud(orderId, { payment_confirmed: true, payment_status: 'paid' }, businessId)
        .catch(() => {});
      dispatch({ type: 'VERIFY_CASH', orderId });
      addToast({ type: 'cash_verified', title: 'Cash Verified', message: `${order.customerName} — sent to kitchen`, orderId });
      if (audioEnabled) audio.alertCashVerified();
    }
  }, [state.isOnline, state.orders, businessId, addToast, audioEnabled]);

  const confirmPayment = useCallback(async (orderId: string, method?: string) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const now = new Date().toISOString();
    const paymentUpdates: Record<string, unknown> = {
      payment_confirmed: true,
      payment_status: 'paid',
      paid_at: now,
    };
    if (method) paymentUpdates.payment_method = method;

    if (!state.isOnline) {
      dispatch({ type: 'CONFIRM_PAYMENT', orderId });
      addToast({ type: 'delivery_done', title: 'Payment Confirmed', message: `${order.customerName} — dine-in complete`, orderId });
      if (audioEnabled) audio.alertDeliveryConfirmed();
      return;
    }

    if (state.isOnline && businessId) {
      const { data: rpcData, error: rpcError } = await supabase.rpc('advance_order_status', {
        p_order_id: orderId,
        p_target_status: toDbStatus('DONE'),
      });
      if (rpcError || !rpcData?.success) {
        console.error('[StaffOps] confirmPayment RPC error:', rpcError?.message || rpcData?.message);
        addToast({ type: 'critical', title: 'Update Failed', message: rpcData?.message || rpcError?.message || 'Could not confirm payment', orderId });
        return;
      }
      updateOrderCloud(orderId, paymentUpdates, businessId)
        .catch(() => {});
      dispatch({ type: 'CONFIRM_PAYMENT', orderId });
      addToast({ type: 'delivery_done', title: 'Payment Confirmed', message: `${order.customerName} — dine-in complete`, orderId });
      if (audioEnabled) audio.alertDeliveryConfirmed();
    }
  }, [state.isOnline, state.orders, businessId, addToast, audioEnabled]);

  const confirmDelivery = useCallback(async (orderId: string) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    if (!state.isOnline) {
      queueAction({ orderId, type: 'confirm_delivery', timestamp: Date.now() });
      dispatch({ type: 'CONFIRM_DELIVERY', orderId });
      addToast({ type: 'delivery_done', title: 'Delivered', message: `${order.customerName} — completed`, orderId });
      if (audioEnabled) audio.alertDeliveryConfirmed();
      return;
    }

    if (state.isOnline && businessId) {
      const { data, error } = await supabase.rpc('advance_order_status', {
        p_order_id: orderId,
        p_target_status: 'delivered',
      });
      if (error || !data?.success) {
        console.error('[StaffOps] confirmDelivery RPC error:', error?.message || data?.message);
        addToast({ type: 'critical', title: 'Update Failed', message: data?.message || error?.message || 'Could not confirm delivery', orderId });
        return;
      }
      dispatch({ type: 'CONFIRM_DELIVERY', orderId });
      addToast({ type: 'delivery_done', title: 'Delivered', message: `${order.customerName} — completed`, orderId });
      if (audioEnabled) audio.alertDeliveryConfirmed();
    }
  }, [state.isOnline, state.orders, businessId, addToast, audioEnabled]);

  const claimDelivery = useCallback(async (orderId: string) => {
    const staffMember = (() => { try { return JSON.parse(localStorage.getItem('fs_staff_member') || '{}'); } catch { return {}; } })();
    const staffName = staffMember?.name || 'Staff';

    if (!state.isOnline) {
      dispatch({ type: 'CLAIM_DELIVERY', orderId, staffName });
      addToast({ type: 'cash_verified', title: 'Delivery Claimed', message: `${staffName} is taking this order`, orderId });
      return;
    }

    if (state.isOnline && businessId) {
      const { data, error } = await supabase.rpc('advance_order_status', {
        p_order_id: orderId,
        p_target_status: 'dispatched',
      });
      if (error || !data?.success) {
        console.error('[StaffOps] claimDelivery RPC error:', error?.message || data?.message);
        addToast({ type: 'critical', title: 'Update Failed', message: data?.message || error?.message || 'Could not claim delivery', orderId });
        return;
      }
      dispatch({ type: 'CLAIM_DELIVERY', orderId, staffName });
      addToast({ type: 'cash_verified', title: 'Delivery Claimed', message: `${staffName} is taking this order`, orderId });
    }
  }, [state.isOnline, businessId, addToast]);

  const cancelOrder = useCallback(async (orderId: string) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    if (!state.isOnline) {
      queueAction({ orderId, type: 'cancel_order', timestamp: Date.now() });
      dispatch({ type: 'CANCEL_ORDER', orderId });
      addToast({ type: 'order_cancelled', title: 'Order Cancelled', message: `${order.customerName} — cancelled`, orderId });
      return;
    }

    if (state.isOnline && businessId) {
      const { data, error } = await supabase.rpc('advance_order_status', {
        p_order_id: orderId,
        p_target_status: 'cancelled',
      });
      if (error || !data?.success) {
        console.error('[StaffOps] cancelOrder RPC error:', error?.message || data?.message);
        addToast({ type: 'critical', title: 'Update Failed', message: data?.message || error?.message || 'Could not cancel order', orderId });
        return;
      }
      dispatch({ type: 'CANCEL_ORDER', orderId });
      addToast({ type: 'order_cancelled', title: 'Order Cancelled', message: `${order.customerName} — cancelled`, orderId });
    }
  }, [state.isOnline, state.orders, businessId, addToast]);

  const setTab = useCallback((tab: TabId) => dispatch({ type: 'SET_TAB', tab }), []);
  const selectOrder = useCallback((orderId: string | null) => dispatch({ type: 'SELECT_ORDER', orderId }), []);
  const toggleOnline = useCallback(() => dispatch({ type: 'SET_ONLINE', online: !state.isOnline }), [state.isOnline]);

  return (
    <OrderContext.Provider value={{
      state, dispatch, advanceOrderStatus, verifyCash, confirmDelivery, confirmPayment,
      claimDelivery, cancelOrder, setTab, selectOrder, toggleOnline,
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
