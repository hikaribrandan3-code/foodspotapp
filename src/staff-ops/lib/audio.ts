/**
 * Kitchen Audio Alert System
 * Uses Web Audio API — no external files, works offline.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Play a sharp kitchen-bell style ping */
function playPing(frequency: number, duration: number, type: OscillatorType = 'sine') {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/**
 * Alert: New order arrived (urgent / high priority)
 * Sharp double-chime like a service bell
 */
export function alertNewOrder(priority: 'normal' | 'high' = 'normal') {
  if (priority === 'high') {
    // Aggressive triple ping for high-priority
    playPing(880, 0.15, 'square');
    setTimeout(() => playPing(1100, 0.15, 'square'), 120);
    setTimeout(() => playPing(1320, 0.25, 'square'), 240);
  } else {
    // Gentle single ping for normal
    playPing(660, 0.2, 'sine');
  }
}

/**
 * Alert: Order went critical (10+ min wait)
 * Lower, more insistent tone
 */
export function alertCritical() {
  playPing(440, 0.3, 'triangle');
  setTimeout(() => playPing(330, 0.4, 'triangle'), 200);
}

/**
 * Alert: Cash payment verified
 * Bright positive chime
 */
export function alertCashVerified() {
  playPing(523, 0.12, 'sine');  // C5
  setTimeout(() => playPing(659, 0.12, 'sine'), 100); // E5
  setTimeout(() => playPing(784, 0.2, 'sine'), 200);  // G5
}

/**
 * Alert: Delivery confirmed
 * Success tone
 */
export function alertDeliveryConfirmed() {
  playPing(587, 0.1, 'sine');  // D5
  setTimeout(() => playPing(784, 0.2, 'sine'), 100); // G5
}

/**
 * Silent — used when audio disabled in preferences
 */
export function alertSilent() {
  // No-op
}
