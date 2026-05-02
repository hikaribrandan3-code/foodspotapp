import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const BANNER_AUTO_DISMISS_MS = 300_000;  // 5 minutes visible window
const COOLDOWN_BETWEEN_ACTIVATIONS_MS = 600_000; // 10 min cooldown if dismissed
const VISUAL_DELAY_MS = 1_500; // 1.5s when user is actively looking
const LS_KEY = 'fs_pending_donut';

/**
 * Hook that manages post-delivery camera activation state.
 * VISIBILITY-AWARE: shows donut when user is actually looking at the screen.
 *
 * @param {string} orderId – the order to watch
 * @param {string} userId  – current authenticated user
 * @param {string} orderType – 'delivery' | 'dine_in' | 'takeout'
 * @param {number} _delayMs – legacy param, kept for API compat (ignored, now visibility-driven)
 * @returns {object}
 *   - showBanner: boolean
 *   - dismissBanner: () => void
 *   - onCaptureComplete: () => void
 *   - activationStatus: 'pending' | 'waiting' | 'ready' | 'shown' | 'dismissed' | 'captured'
 */
export function useCameraActivation(orderId, userId, orderType = 'delivery', _delayMs = VISUAL_DELAY_MS) {
  const [activationStatus, setActivationStatus] = useState('pending');
  const timerRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const subscriptionRef = useRef(null);
  const hasTriggeredRef = useRef(false);
  const visibilityListenerRef = useRef(null);

  const effectiveUserId = userId || `guest_${orderId}`;

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearTimers();
    if (visibilityListenerRef.current) {
      document.removeEventListener('visibilitychange', visibilityListenerRef.current);
      visibilityListenerRef.current = null;
    }
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  }, [clearTimers]);

  // Load existing activation record (prevents duplicate triggers on re-mount)
  useEffect(() => {
    if (!orderId) return;
    let mounted = true;

    const loadState = async () => {
      const { data, error } = await supabase
        .from('ugc_activations')
        .select('status, delivered_at, banner_shown_at, captured_at')
        .eq('order_id', orderId)
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (!mounted) return;

      if (error && error.code !== 'PGRST116') {
        console.error('[useCameraActivation] loadState error:', error);
        return;
      }

      if (data) {
        if (['captured', 'shared'].includes(data.status)) {
          setActivationStatus('captured');
          return;
        }
        if (data.status === 'dismissed' && data.banner_shown_at) {
          const sinceDismiss = Date.now() - new Date(data.banner_shown_at).getTime();
          if (sinceDismiss < COOLDOWN_BETWEEN_ACTIVATIONS_MS) {
            setActivationStatus('dismissed');
            return;
          }
        }
      }
    };

    loadState();
    return () => { mounted = false; };
  }, [orderId, userId]);

  // Show banner (with visibility check)
  const showBannerNow = useCallback((isInstant = false) => {
    const delay = isInstant ? 0 : VISUAL_DELAY_MS;

    timerRef.current = setTimeout(() => {
      setActivationStatus('ready');
      supabase
        .from('ugc_activations')
        .update({ status: 'shown', banner_shown_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('user_id', effectiveUserId)
        .catch(err => console.error('[useCameraActivation] Failed to update banner_shown_at:', err));
    }, delay);
  }, [orderId, effectiveUserId]);

  // Check if there is a pending donut in localStorage (for when user returns to tab)
  const checkPendingDonut = useCallback(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const pending = JSON.parse(raw);
      if (pending.orderId !== orderId) return;

      // Check not stale (>5min old)
      if (Date.now() - pending.timestamp > 5 * 60 * 1000) {
        localStorage.removeItem(LS_KEY);
        return;
      }

      // Already in a terminal state? clear and bail
      if (['ready', 'shown', 'captured', 'dismissed'].includes(activationStatus)) {
        localStorage.removeItem(LS_KEY);
        return;
      }

      // Show instantly — they just came back!
      console.log('[camera] User returned to tab — showing pending donut instantly');
      showBannerNow(true);
      localStorage.removeItem(LS_KEY);
    } catch (e) {
      localStorage.removeItem(LS_KEY);
    }
  }, [orderId, activationStatus, showBannerNow]);

  // Main trigger: watch for order delivered/ready status
  useEffect(() => {
    if (!orderId || hasTriggeredRef.current) return;
    let mounted = true;

    const setupTrigger = async () => {
      const { data: order } = await supabase
        .from('orders')
        .select('status, delivered_at, created_at')
        .eq('id', orderId)
        .maybeSingle();

      if (!mounted) return;

      let shouldTrigger = false;
      let triggerTime = null;

      if (orderType === 'delivery' && order?.status === 'delivered') {
        shouldTrigger = true;
        triggerTime = order.delivered_at ? new Date(order.delivered_at).getTime() : Date.now();
      } else if (orderType === 'dine_in' && order?.status === 'ready') {
        shouldTrigger = true;
        triggerTime = Date.now();
      } else if (orderType === 'takeout' && order?.status === 'delivered') {
        shouldTrigger = true;
        triggerTime = order.delivered_at ? new Date(order.delivered_at).getTime() : Date.now();
      }

      if (shouldTrigger) {
        handleTriggered(triggerTime);
        return;
      }

      const channel = supabase
        .channel(`order-camera-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`,
          },
          (payload) => {
            const newStatus = payload.new.status;
            if (orderType === 'delivery' && newStatus === 'delivered') {
              handleTriggered(payload.new.delivered_at ? new Date(payload.new.delivered_at).getTime() : Date.now());
            } else if (orderType === 'dine_in' && newStatus === 'ready') {
              handleTriggered(Date.now());
            } else if (orderType === 'takeout' && newStatus === 'delivered') {
              handleTriggered(payload.new.delivered_at ? new Date(payload.new.delivered_at).getTime() : Date.now());
            }
          }
        )
        .subscribe();

      subscriptionRef.current = channel;
    };

    const handleTriggered = async (triggerTime) => {
      if (hasTriggeredRef.current || !mounted) return;
      hasTriggeredRef.current = true;

      const now = new Date().toISOString();
      await supabase.from('ugc_activations').upsert(
        {
          user_id: effectiveUserId,
          order_id: orderId,
          status: 'pending',
          delivered_at: new Date(triggerTime).toISOString(),
          order_type: orderType,
          delay_variant: VISUAL_DELAY_MS,
        },
        { onConflict: 'user_id,order_id' }
      );

      if (!mounted) return;
      setActivationStatus('waiting');

      // Write to localStorage so if user is away, we can catch them on return
      localStorage.setItem(LS_KEY, JSON.stringify({ orderId, timestamp: Date.now() }));

      if (document.visibilityState === 'visible') {
        // User is looking — brief delay then show
        console.log('[camera] User is visible — showing donut after 1.5s');
        showBannerNow(false);
      } else {
        // User is away — wait for them to come back
        console.log('[camera] User tab hidden — donut will show when they return');
      }

      // Set up visibility listener for the "they come back" case
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          checkPendingDonut();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      visibilityListenerRef.current = handleVisibilityChange;
    };

    setupTrigger();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [orderId, orderType, effectiveUserId, cleanup, showBannerNow, checkPendingDonut]);

  // Auto-dismiss after 5 minutes (skip for dine-in)
  useEffect(() => {
    if (activationStatus !== 'ready') return;
    if (orderType === 'dine_in') return;

    dismissTimerRef.current = setTimeout(() => {
      dismissBanner();
    }, BANNER_AUTO_DISMISS_MS);

    return () => clearTimers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activationStatus, orderType]);

  const dismissBanner = useCallback(async () => {
    clearTimers();
    setActivationStatus('dismissed');
    localStorage.removeItem(LS_KEY);

    if (orderId) {
      await supabase
        .from('ugc_activations')
        .update({ status: 'dismissed', banner_shown_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('user_id', effectiveUserId)
        .catch(err => console.error('[useCameraActivation] Failed to update dismissed:', err));
    }
  }, [orderId, clearTimers, effectiveUserId]);

  const onCaptureComplete = useCallback(async () => {
    clearTimers();
    setActivationStatus('captured');
    localStorage.removeItem(LS_KEY);

    if (orderId) {
      await supabase
        .from('ugc_activations')
        .update({ status: 'captured', captured_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('user_id', effectiveUserId)
        .catch(err => console.error('[useCameraActivation] Failed to update captured_at:', err));
    }
  }, [orderId, clearTimers, effectiveUserId]);

  const showBanner = activationStatus === 'ready';

  return {
    showBanner,
    dismissBanner,
    onCaptureComplete,
    activationStatus,
  };
}
