import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const BANNER_AUTO_DISMISS_MS = 300_000;   // 5 minutes visible window
const COOLDOWN_BETWEEN_ACTIVATIONS_MS = 600_000; // 10 min cooldown if dismissed
const VISUAL_DELAY_MS = 500;             // 0.5s — snappy for 2026 attention spans
const POLL_INTERVAL_MS = 3_000;          // 3s polling fallback
const LS_KEY = 'fs_pending_donut';

/**
 * Hook that manages post-delivery camera activation state.
 * VISIBILITY-AWARE + POLLING FALLBACK: shows donut when user is actually looking.
 *
 * @param {string} orderId
 * @param {string} userId
 * @param {string} orderType – 'delivery' | 'dine_in' | 'takeout'
 * @returns {object}
 */
export function useCameraActivation(orderId, userId, orderType = 'delivery') {
  const [activationStatus, setActivationStatus] = useState('pending');
  const timerRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const pollRef = useRef(null);
  const hasTriggeredRef = useRef(false);
  const effectiveUserId = userId || `guest_${orderId}`;

  /* ── helpers ── */
  const clearTimers = useCallback(() => {
    if (timerRef.current)  { clearTimeout(timerRef.current);  timerRef.current = null; }
    if (dismissTimerRef.current) { clearTimeout(dismissTimerRef.current); dismissTimerRef.current = null; }
    if (pollRef.current)   { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const showBannerNow = useCallback((isInstant = false) => {
    const delay = isInstant ? 0 : VISUAL_DELAY_MS;
    console.log(`[camera] showBannerNow — isInstant=${isInstant}, delay=${delay}ms`);

    timerRef.current = setTimeout(() => {
      console.log(`[camera] Timer fired → ready`);
      setActivationStatus('ready');
      supabase
        .from('ugc_activations')
        .update({ status: 'shown', banner_shown_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('user_id', effectiveUserId)
        .then(() => {})
        .then(() => {}).catch(() => {});
    }, delay);
  }, [orderId, effectiveUserId]);

  /* ── load existing activation (prevent dupes on refresh) ── */
  useEffect(() => {
    if (!orderId) return;
    let mounted = true;

    const loadState = async () => {
      const { data, error } = await supabase
        .from('ugc_activations')
        .select('status, banner_shown_at, captured_at')
        .eq('order_id', orderId)
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (!mounted) return;
      if (error) { console.log('[camera] loadState error:', error.message); return; }

      if (data) {
        if (['captured', 'shared'].includes(data.status)) {
          setActivationStatus('captured');
          hasTriggeredRef.current = true;
          return;
        }
        if (data.status === 'dismissed') {
          // Once user clicks "No", don't show again for this order
          setActivationStatus('dismissed');
          hasTriggeredRef.current = true;
          return;
        }
        if (data.status === 'shown') {
          // Already shown this session — don't re-show
          setActivationStatus('shown');
          hasTriggeredRef.current = true;
          return;
        }
      }
    };

    loadState();
    return () => { mounted = false; };
  }, [orderId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── main trigger engine ── */
  useEffect(() => {
    if (!orderId || hasTriggeredRef.current) return;
    let mounted = true;

    const markTriggered = () => { hasTriggeredRef.current = true; };

    const checkShouldTrigger = (status) => {
      if (orderType === 'delivery' && status === 'delivered') return true;
      if (orderType === 'dine_in'  && status === 'ready')    return true;
      if (orderType === 'takeout'  && status === 'delivered') return true;
      return false;
    };

    const handleTriggered = async () => {
      if (hasTriggeredRef.current || !mounted) return;
      markTriggered();
      clearTimers(); // stop polling

      console.log(`[camera] TRIGGERED — orderType=${orderType}`);

      await supabase.from('ugc_activations').upsert(
        {
          user_id: effectiveUserId,
          order_id: orderId,
          status: 'pending',
          delivered_at: new Date().toISOString(),
          order_type: orderType,
        },
        { onConflict: 'user_id,order_id' }
      );

      if (!mounted) return;
      setActivationStatus('waiting');
      localStorage.setItem(LS_KEY, JSON.stringify({ orderId, timestamp: Date.now() }));

      if (document.visibilityState === 'visible') {
        console.log(`[camera] visible → delay ${VISUAL_DELAY_MS}ms`);
        showBannerNow(false);
      } else {
        console.log(`[camera] hidden → waiting for visibility`);
      }
    };

    /* ── visibility listener ── */
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return;
        const p = JSON.parse(raw);
        if (p.orderId !== orderId) return;
        if (Date.now() - p.timestamp > 5 * 60 * 1000) { localStorage.removeItem(LS_KEY); return; }
        if (hasTriggeredRef.current) { localStorage.removeItem(LS_KEY); return; }
        console.log(`[camera] visibility→visible → instant donut`);
        showBannerNow(true);
        localStorage.removeItem(LS_KEY);
      } catch (e) { localStorage.removeItem(LS_KEY); }
    };
    document.addEventListener('visibilitychange', onVis);

    /* ── initial check ── */
    const initCheck = async () => {
      const { data } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .maybeSingle();
      if (!mounted) return;
      if (data && checkShouldTrigger(data.status)) {
        handleTriggered();
      }
    };
    initCheck();

    /* ── Realtime subscription ── */
    const channel = supabase
      .channel(`order-camera-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        if (checkShouldTrigger(payload.new.status)) handleTriggered();
      })
      .subscribe();

    /* ── Polling fallback ── */
    pollRef.current = setInterval(async () => {
      if (hasTriggeredRef.current) { clearTimers(); return; }
      const { data } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .maybeSingle();
      if (data && checkShouldTrigger(data.status)) handleTriggered();
    }, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      clearTimers();
      document.removeEventListener('visibilitychange', onVis);
      supabase.removeChannel(channel);
    };
  }, [orderId, orderType]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── auto-dismiss (skip dine-in) ── */
  useEffect(() => {
    if (activationStatus !== 'ready' || orderType === 'dine_in') return;
    dismissTimerRef.current = setTimeout(() => dismissBanner(), BANNER_AUTO_DISMISS_MS);
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activationStatus, orderType]);

  const dismissBanner = useCallback(async () => {
    clearTimers();
    setActivationStatus('dismissed');
    localStorage.removeItem(LS_KEY);
    await supabase
      .from('ugc_activations')
      .update({ status: 'dismissed', banner_shown_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('user_id', effectiveUserId)
      .then(() => {}).catch(() => {});
  }, [orderId, clearTimers, effectiveUserId]);

  const onCaptureComplete = useCallback(async () => {
    clearTimers();
    setActivationStatus('captured');
    localStorage.removeItem(LS_KEY);
    await supabase
      .from('ugc_activations')
      .update({ status: 'captured', captured_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('user_id', effectiveUserId)
      .then(() => {}).catch(() => {});
  }, [orderId, clearTimers, effectiveUserId]);

  const showBanner = activationStatus === 'ready';
  console.log(`[camera] render — showBanner=${showBanner}, status=${activationStatus}`);

  return { showBanner, dismissBanner, onCaptureComplete, activationStatus };
}
