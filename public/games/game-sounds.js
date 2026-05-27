// 🎮 GameSoundEngine - Universal game audio (no external files)
const GameSound = {
  ctx: null,
  init: function() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) { console.warn('Audio not available'); }
  },
  
  // Resume after user interaction (browser autoplay policy)
  resume: function() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  
  // Play a tone
  play: function(freq, duration, type, vol) {
    if (!this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol || 0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (duration || 0.1));
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + (duration || 0.1));
  },
  
  // 🎵 Sound presets
  jump: function() { this.play(600, 0.1, 'square', 0.08); },
  shoot: function() { this.play(880, 0.08, 'sawtooth', 0.06); },
  hit: function() { this.play(220, 0.15, 'square', 0.1); },
  score: function() { this.play(1320, 0.12, 'sine', 0.1); },
  gameOver: function() { 
    this.play(400, 0.3, 'sawtooth', 0.1);
    setTimeout(() => this.play(300, 0.4, 'sawtooth', 0.1), 200);
  },
  start: function() {
    this.play(523, 0.1, 'sine', 0.1);
    setTimeout(() => this.play(659, 0.1, 'sine', 0.1), 100);
    setTimeout(() => this.play(784, 0.15, 'sine', 0.12), 200);
  },
  blip: function() { this.play(800, 0.05, 'sine', 0.05); },
  thud: function() { this.play(150, 0.1, 'square', 0.1); },
  pop: function() { this.play(1200, 0.08, 'sine', 0.08); },
  tick: function() { this.play(2000, 0.03, 'sine', 0.04); },
  
  // Background music loop
  musicInterval: null,
  startMusic: function(notes, tempo) {
    this.stopMusic();
    const n = notes || [440, 554, 659, 880];
    const t = tempo || 200;
    let i = 0;
    this.musicInterval = setInterval(() => {
      this.play(n[i], 0.12, 'triangle', 0.04);
      i = (i + 1) % n.length;
    }, 60000 / t);
  },
  stopMusic: function() {
    if (this.musicInterval) { clearInterval(this.musicInterval); this.musicInterval = null; }
  }
};

// Auto-init on first user interaction
document.addEventListener('click', function initAudio() {
  GameSound.init();
  document.removeEventListener('click', initAudio);
}, { once: true });

document.addEventListener('keydown', function initAudio() {
  GameSound.init();
  document.removeEventListener('keydown', initAudio);
}, { once: true });

// Sprite drawing system for games
const Spr = {
  enemy: function(cx, x, y, type, frame, flash, small, elite) {
    if(!cx) return;
    cx.save();
    if(flash) cx.globalAlpha = 0.5;
    cx.translate(x, y);
    cx.fillStyle = flash ? '#ffcccc' : '#fff';

    // Draw enemy UFO base
    const sz = small ? 8 : 12;
    cx.beginPath();
    cx.ellipse(0, 0, sz, sz*0.6, 0, 0, Math.PI*2);
    cx.fill();

    // Color based on type
    const colors = {'pepper':'#ff4444','jalapeno':'#ffaa00','onion':'#9944ff','carrot':'#ffaa44','broccoli':'#44ff44','mushroom':'#aaaaaa','tomato':'#ff6644'};
    cx.fillStyle = colors[type] || '#ffff44';
    cx.beginPath();
    cx.arc(0, -sz*0.4, sz*0.7, 0, Math.PI*2);
    cx.fill();

    if(elite) {
      cx.strokeStyle = '#ffff00';
      cx.lineWidth = 2;
      cx.beginPath();
      cx.arc(0, 0, sz+4, 0, Math.PI*2);
      cx.stroke();
    }

    cx.restore();
  },

  boss: function(cx, x, y, type, hp, maxHp, frame) {
    if(!cx) return;
    cx.save();
    cx.translate(x, y);

    // Boss body
    cx.fillStyle = type==='chili'?'#ff3333':'#3333ff';
    cx.beginPath();
    cx.arc(0, 0, 30, 0, Math.PI*2);
    cx.fill();

    // Boss glow
    cx.strokeStyle = type==='chili'?'rgba(255,100,100,0.5)':'rgba(100,100,255,0.5)';
    cx.lineWidth = 3;
    cx.beginPath();
    cx.arc(0, 0, 35 + Math.sin(frame*0.1)*3, 0, Math.PI*2);
    cx.stroke();

    // Health bar
    const hpPercent = Math.max(0, hp/maxHp);
    cx.fillStyle = '#333';
    cx.fillRect(-25, 35, 50, 6);
    cx.fillStyle = hpPercent>0.3?'#00ff00':hpPercent>0.15?'#ffff00':'#ff0000';
    cx.fillRect(-25, 35, 50*hpPercent, 6);

    cx.restore();
  }
};

// Hook into start buttons
window.addEventListener('load', function() {
  const startBtn = document.querySelector('.start-button, .start-btn, #start, #start-btn, button[onclick*="start"]');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      GameSound.init();
      GameSound.start();
    });
  }
});
