/**
 * SoundEngine - Web Audio API game sound system for FoodSpot
 * No external files. No dependencies. Browser-native.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5; // Master volume 50%
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
      console.log('[SoundEngine] Initialized - ctx.state:', this.ctx.state);
    } catch (e) {
      console.warn('[SoundEngine] AudioContext not available:', e);
    }
  }

  // Resume context (required after user interaction due to autoplay policy)
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn('[SoundEngine] Resume failed:', e));
    }
  }

  // 🔊 MUNCHBOY Boot Chime — C5 → C6 dual-tone GBA "bling"
  playBootChime() {
    console.log('[SoundEngine] playBootChime called - enabled:', this.enabled, 'initialized:', this.initialized);
    if (!this.enabled || !this.initialized) {
      console.warn('[SoundEngine] Cannot play - not initialized');
      return;
    }
    this.resume();

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(523.25, t);       // C5
    osc1.frequency.setValueAtTime(1046.50, t + 0.08); // C6

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, t + 0.05); // C6
    osc2.frequency.setValueAtTime(2093.00, t + 0.13); // C7

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.5);
    osc2.stop(t + 0.5);
    console.log('[SoundEngine] Boot chime scheduled');
  }

  // 🎮 Game SFX — short blip for UI/actions
  playBlip(freq = 880, duration = 0.1, type = 'sine') {
    if (!this.enabled || !this.initialized) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // 🎵 Background music — simple arpeggio loop (no files needed)
  startMusicLoop(notes = [523.25, 659.25, 783.99, 1046.50], tempo = 200) {
    if (!this.enabled || !this.initialized) return;
    this.resume();

    let noteIndex = 0;
    const interval = 60 / tempo * 1000;

    this.musicInterval = setInterval(() => {
      this.playBlip(notes[noteIndex], 0.15, 'triangle');
      noteIndex = (noteIndex + 1) % notes.length;
    }, interval);
  }

  stopMusicLoop() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  // Toggle
  setEnabled(on) {
    this.enabled = on;
    if (!on) this.stopMusicLoop();
    if (this.masterGain) {
      this.masterGain.gain.value = on ? 0.3 : 0;
    }
  }
}

// Singleton export
export const soundEngine = new SoundEngine();
export default SoundEngine;
