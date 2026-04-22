/**
 * Centralized haptic feedback utility.
 * Wraps navigator.vibrate with feature detection and fallback silence.
 */

const HAPTIC_PATTERNS: Record<string, number | number[]> = {
  /** Light tap — for minor UI interactions */
  tap: 15,
  /** Standard click — for button presses */
  click: 30,
  /** Heavy click — for state transitions */
  heavy: 60,
  /** Success confirmation — for completed actions */
  success: [40, 30, 60],
  /** Delivery confirmation — 100ms as specified */
  deliveryConfirm: 100,
  /** Error/denial feedback */
  error: [30, 20, 30, 20, 50],
  /** Offline queue acknowledgment */
  queued: 20,
};

export type HapticPattern = keyof typeof HAPTIC_PATTERNS;

/**
 * Trigger haptic feedback. Silently fails if not supported.
 */
export function haptic(pattern: HapticPattern = 'click'): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    const p = HAPTIC_PATTERNS[pattern];
    navigator.vibrate(Array.isArray(p) ? [...p] : p);
  } catch {
    // Silently fail — haptics are enhancement, not requirement
  }
}

/**
 * Trigger haptic for every state transition type.
 * Maps transition actions to their appropriate haptic feel.
 */
export function hapticForTransition(
  action: 'verify_cash' | 'start_prep' | 'mark_ready' | 'dispatch' | 'confirm_delivery' | 'status_advance',
): void {
  const map: Record<typeof action, HapticPattern> = {
    verify_cash: 'success',
    start_prep: 'heavy',
    mark_ready: 'heavy',
    dispatch: 'heavy',
    confirm_delivery: 'deliveryConfirm',
    status_advance: 'heavy',
  };
  haptic(map[action]);
}

export { HAPTIC_PATTERNS };
