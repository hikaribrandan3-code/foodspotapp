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
  const ctx = getAudioContext();
  const LOUD = 0.85;
  const beepDuration = 0.2;
  const now = ctx.currentTime;

  // Schedule all 3 beeps using Web Audio API timing (more reliable than setTimeout)

  // Beep 1 @ 800Hz, starts at now
  playPingAt(800, beepDuration, 'square', LOUD, now);

  // Beep 2 @ 900Hz, starts 0.3s later
  playPingAt(900, beepDuration, 'square', LOUD, now + 0.3);

  // Beep 3 @ 1000Hz, starts 0.6s later
  playPingAt(1000, beepDuration, 'square', LOUD, now + 0.6);
}

/** Play a ping at a specific scheduled time (for coordinated multi-beep alerts) */
function playPingAt(frequency: number, duration: number, type: OscillatorType, gain: number, startTime: number) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Silent — used when audio disabled in preferences
 */
export function alertSilent() {
  // No-op
}
