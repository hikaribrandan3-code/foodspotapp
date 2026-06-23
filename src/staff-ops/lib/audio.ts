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
function playPing(frequency: number, duration: number, type: OscillatorType = 'sine', initialGain: number = 0.3) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  gain.gain.setValueAtTime(initialGain, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/**
 * Alert: New order arrived — CHA CHINGGG! 💰
 * Money/cash register sound for every new order
 */
export function alertNewOrder(priority: 'normal' | 'high' = 'normal') {
  // CHA! - Initial cash register "cha" (bright, energetic)
  playPing(1320, 0.12, 'square');

  // CHING! - First coin drop (high)
  setTimeout(() => playPing(1100, 0.15, 'sine'), 130);

  // CHING! - Second coin drop (medium-high)
  setTimeout(() => playPing(880, 0.15, 'sine'), 280);

  // CHINGGG! - Final coin cascade (descending tones)
  setTimeout(() => playPing(740, 0.2, 'triangle'), 420);
  setTimeout(() => playPing(587, 0.2, 'sine'), 520);

  if (priority === 'high') {
    // Extra CHA! for high-priority orders (bigger sale!)
    setTimeout(() => playPing(1320, 0.15, 'square'), 680);
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
 * Alert: Kitchen order ready to cook — 3 fast LOUD beeps (1.8s total)
 * Quick, energetic, hard-hitting alert for new orders
 */
export function alert3Beep() {
  const LOUD = 0.85; // VERY LOUD (max safe without distortion)

  // Beep 1 — sharp, bright tone (800Hz), short & punchy
  playPing(800, 0.25, 'square', LOUD);

  // Beep 2 — medium-high (900Hz), starts 0.35s after beep 1
  setTimeout(() => playPing(900, 0.25, 'square', LOUD), 350);

  // Beep 3 — highest (1000Hz), starts 0.70s after beep 1
  setTimeout(() => playPing(1000, 0.25, 'square', LOUD), 700);
}

/**
 * Silent — used when audio disabled in preferences
 */
export function alertSilent() {
  // No-op
}
