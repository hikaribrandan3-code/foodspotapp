import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const BANNER_AUTO_DISMISS_MS = 300_000;  // 5 minutes visible window
const COOLDOWN_BETWEEN_ACTIVATIONS_MS = 600_000; // 10 min cooldown if dismissed

/**
 * Hook that manages post-delivery camera activation state.
 *
 * @param {string} orderId – the order to watch
 * @param {string} userId  – current authenticated user
 * @param {string} orderType – 'delivery' | 'dine_in' | 'takeout'
 * @param {number} delayMs – delay in milliseconds (45000, 60000, 90000 for variants)
 * @returns {object}
 *   - showBanner: boolean
 *   - dismissBanner: () => void
 *   - onCaptureComplete: () => void
 *   - activationStatus: 'pending' | 'waiting' | 'ready' | 'shown' | 'dismissed' | 'captured'
 */
export function useCameraActivation(orderId, userId, orderType = 'delivery', delayMs = 60000) {
  const [activationStatus, setActivationStatus] = useState('pending');
  const timerRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const subscriptionRef = useRef(null);
  const hasTriggeredRef = useRef(false);

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
        // If already captured, never show again
        if (['captured', 'shared'].includes(data.status)) {
          setActivationStatus('captured');
          return;
        }
        // If dismissed recently, respect cooldown
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
    return () => {
      mounted = false;
    };
  }, [orderId, userId]);

  // Main trigger: watch for order delivered status
  useEffect(() => {
    if (!orderId || !userId || hasTriggeredRef.current) return;

    let mounted = true;

    const setupTrigger = async () => {
      // Check current order status
      const { data: order } = await supabase
        .from('orders')
        .select('status, delivered_at, created_at')
        .eq('id', orderId)
        .maybeSingle();

      if (!mounted) return;

      // Determine trigger condition based on order type
      let shouldTrigger = false;
      let triggerTime = null;

      if (orderType === 'delivery' && order?.status === 'delivered') {
        shouldTrigger = true;
        triggerTime = order.delivered_at ? new Date(order.delivered_at).getTime() : Date.now();
      } else if (orderType === 'dine_in' && order?.status === 'ready') {
        // For dine-in, trigger when marked ready (food served)
        shouldTrigger = true;
        triggerTime = Date.now();
      } else if (orderType === 'takeout' && order?.status === 'delivered') {
        // For takeout, trigger when delivered (food picked up)
        shouldTrigger = true;
        triggerTime = order.delivered_at ? new Date(order.delivered_at).getTime() : Date.now();
      }

      if (shouldTrigger) {
        handleTriggered(triggerTime);
        return;
      }

      // Subscribe to order updates for future changes
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
            } else if ((orderType === 'dine_in' || orderType === 'takeout') && newStatus === 'ready') {
              handleTriggered(Date.now());
            }
          }
        )
        .subscribe();

      subscriptionRef.current = channel;
    };

    const handleTriggered = async (triggerTime) => {
      if (hasTriggeredRef.current || !mounted) return;
      hasTriggeredRef.current = true;

      // Upsert activation record
      const now = new Date().toISOString();
      await supabase.from('ugc_activations').upsert(
        {
          user_id: effectiveUserId,
          order_id: orderId,
          status: 'pending',
          delivered_at: new Date(triggerTime).toISOString(),
          order_type: orderType,
          delay_variant: delayMs,
        },
        { onConflict: 'user_id,order_id' }
      );

      if (!mounted) return;

      setActivationStatus('waiting');

      // Start countdown with the specified delay
      timerRef.current = setTimeout(() => {
        if (mounted) {
          setActivationStatus('ready');
          // Update DB to mark banner as shown
          supabase
            .from('ugc_activations')
            .update({ status: 'shown', banner_shown_at: new Date().toISOString() })
            .eq('order_id', orderId)
            .eq('user_id', effectiveUserId)
            .catch(err => console.error('[useCameraActivation] Failed to update banner_shown_at:', err));
        }
      }, delayMs);
    };

    setupTrigger();

    return () => {
      mounted = false;
      clearTimers();
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [orderId, effectiveUserId, orderType, delayMs, clearTimers]);

  const dismissBanner = useCallback(async () => {
    clearTimers();
    setActivationStatus('dismissed');

    if (orderId) {
      await supabase
        .from('ugc_activations')
        .update({ status: 'dismissed', banner_shown_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('user_id', effectiveUserId)
        .catch(err => console.error('[useCameraActivation] Failed to update dismissed:', err));
    }
  }, [orderId, effectiveUserId, clearTimers]);

  const onCaptureComplete = useCallback(async () => {
    clearTimers();
    setActivationStatus('captured');

    if (orderId) {
      await supabase
        .from('ugc_activations')
        .update({ status: 'captured', captured_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('user_id', effectiveUserId)
        .catch(err => console.error('[useCameraActivation] Failed to update captured_at:', err));
    }
  }, [orderId, effectiveUserId, clearTimers]);

  // Auto-dismiss banner after 5 minutes if still shown
  useEffect(() => {
    if (activationStatus !== 'ready') return;

    dismissTimerRef.current = setTimeout(() => {
      dismissBanner();
    }, BANNER_AUTO_DISMISS_MS);

    return () => clearTimers();
  }, [activationStatus, dismissBanner, clearTimers]);

  const showBanner = activationStatus === 'ready';

  return {
    showBanner,
    dismissBanner,
    onCaptureComplete,
    activationStatus,
  };
}
