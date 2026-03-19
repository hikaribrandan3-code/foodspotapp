# PICU SWEETS - Game PRD
## Match-3 Candy Crush for HikariBoy Emulator

---

## 1. VISUAL IDENTITY

### Color Palette (NEON PASTEL)
```css
--pink-glow: #FF69B4
--cyan-burst: #00FFFF
--lemon-zest: #FFF44F
--grape-pop: #9D00FF
--mint-fresh: #00FF9F
--coral-blast: #FF6B6B
--sugar-white: #FFF8FA
--cream-bg: #FFF0F5
```

### Visual Style (Copy Bubble Tea's Aesthetic)
- **Gradients:** All candies have radial gradients (center light, edges dark)
- **Glows:** Animated pulsing glow on matches (box-shadow animation)
- **Particles:** Confetti burst on match (multi-colored, gravity fall)
- **Background:** Soft pastel with floating sugar sparkles
- **UI:** Rounded corners, glossy finishes, anime-style energy lines

### Animation Requirements
1. **Candy Idle:** Gentle bob (sin wave, 2s cycle)
2. **Match Flash:** White flash → Scale up 1.3x → Explode particles
3. **Candy Fall:** Ease-in bounce on landing
4. **Combo Text:** "SWEET!", "TASTY!", "DELICIOUS!" with rainbow gradient + shake
5. **Fever Mode:** Screen tint shifts hue every frame, speed lines background

---

## 2. GAME MECHANICS

### Core Loop
```
8×8 Grid | 6 Candy Types | Match 3+ | Cascade Combos
```

### Candy Types (with Emoji Fallbacks)
| Type | Color | Shape | Glow Color |
|------|-------|-------|------------|
| Gummy Bear | Pink | Circle | #FF69B4 |
| Sour Worm | Green | Wave | #00FF9F |
| Lollipop | Purple | Swirl | #9D00FF |
| Jelly Bean | Orange | Oval | #FF9500 |
| Hard Candy | Cyan | Diamond | #00FFFF |
| Chocolate | Brown | Square | #8B4513 |

### Special Candies
| Name | Formation | Effect |
|------|-----------|--------|
| Striped (H) | 4-match | Clears entire row |
| Striped (V) | 4-match | Clears entire column |
| Wrapped | T/L shape | 3×3 explosion |
| Color Bomb | 5-match | Clears all of one color |
| Picu Blast | 2 special combo | Clears 5×5 + random color |

### Level System
```javascript
const LEVELS = [
  {id: 1, target: 1000, moves: 20, type: 'score'},
  {id: 2, target: 15, moves: 25, type: 'collect', collect: 'gummy'},
  {id: 3, target: 3, moves: 30, type: 'clear', obstacles: 'icing'},
  {id: 4, target: 2000, moves: 15, type: 'score', special: 'fever'},
  {id: 5, target: 25, moves: 35, type: 'drop', items: 'cherries'}
];
```

### Fever Mode (Every 5th Level or Combo ×10)
- Rainbow background animation
- All candies worth 3× points
- Special candies spawn 2× rate
- Music tempo increases (BPM +30)

---

## 3. UI SPECIFICATIONS

### Screen Layout (HikariBoy Safe Zone)
```
┌─────────────────────┐  y=0
│  SCORE: 12,450  ★   │  40px
├─────────────────────┤
│                     │
│    8×8 GRID (320px) │  centered
│    padding: 35px    │
│                     │
├─────────────────────┤
│  MOVES: 15  |  FEVER│  50px
└─────────────────────┘  y=447 (SAFE_H limit)
```

### Grid Specs
- Grid size: 320×320px
- Cell size: 40×40px
- Candy size: 34×34px (4px gap)
- Grid position: centered (x=35, y=80)
- Rounded corners on grid: 12px

### Score Panel
- Background: `rgba(255,255,255,0.15)` with blur
- Border: 2px solid white, 20px rounded
- Font: 'Arial Black', 900 weight
- Score: Gold gradient text with shadow
- Moves: Cyan pulse when < 5

---

## 4. HIKARIBOY INTEGRATION (CRITICAL)

### Detection & Constants
```javascript
const isHikariBoy = window.parent !== window;
const SAFE_H = isHikariBoy ? 844 * 0.53 : 844;  // 447px visible
const CAM_SHIFT = isHikariBoy ? -844 * 0.06 : 0; // -50px shift
```

### Game State
```javascript
let gameState = isHikariBoy ? 'playing' : 'start';
let currentLevel = 1;
let score = 0, moves = 20, target = 1000;
```

### Button Mapping (REQUIRED)
```javascript
window.addEventListener('message', e => {
  if (e.data?.type === 'BUTTON_PRESS') {
    const btn = e.data.button;
    
    // START: Pause/Resume or Start
    if (btn === 'start') {
      if (gameState === 'start') { initAudio(); startLevel(1); }
      else if (gameState === 'playing') gameState = 'paused';
      else if (gameState === 'paused') gameState = 'playing';
      else if (gameState === 'levelComplete') nextLevel();
      else if (gameState === 'gameOver') resetGame();
    }
    
    // A: Select/Confirm/Swap
    if (btn === 'a') {
      if (gameState === 'start') { initAudio(); startLevel(1); }
      else if (gameState === 'playing') handleSelect();
      else if (gameState === 'levelComplete') nextLevel();
      else if (gameState === 'gameOver') resetGame();
    }
    
    // SELECT: Exit to selector
    if (btn === 'select' && isHikariBoy) {
      window.parent.postMessage({type: 'GAME_EXIT', gameId: 'picu-sweets'}, '*');
    }
    
    // D-Pad: Navigation
    if (btn === 'dpad-up') moveCursor(0, -1);
    if (btn === 'dpad-down') moveCursor(0, 1);
    if (btn === 'dpad-left') moveCursor(-1, 0);
    if (btn === 'dpad-right') moveCursor(1, 0);
  }
});
```

### Cursor System (for Controller)
```javascript
let cursor = {x: 0, y: 0, selected: null}; // Grid coordinates 0-7

function moveCursor(dx, dy) {
  cursor.x = Math.max(0, Math.min(7, cursor.x + dx));
  cursor.y = Math.max(0, Math.min(7, cursor.y + dy));
}

function handleSelect() {
  if (!cursor.selected) {
    cursor.selected = {...cursor};
  } else {
    // Try swap
    attemptSwap(cursor.selected, cursor);
    cursor.selected = null;
  }
}
```

### Render with CAM_SHIFT
```javascript
function render() {
  ctx.save();
  if (CAM_SHIFT !== 0) ctx.translate(0, CAM_SHIFT);
  
  // Clear safe area only
  ctx.fillStyle = '#1a0a1a'; // Dark purple bg
  ctx.fillRect(0, 0, W, SAFE_H);
  
  // Draw background effects (clamped to SAFE_H)
  drawSugarSparkles();
  
  // Draw grid
  drawGrid();
  drawCandies();
  drawCursor(); // Highlight selected cell
  drawParticles();
  drawUI();
  
  // Safe zone indicator (debug, optional)
  if (isHikariBoy) {
    ctx.fillStyle = 'rgba(0,200,255,0.15)';
    ctx.fillRect(W/2-40, SAFE_H-14, 80, 12);
    ctx.fillStyle = 'rgba(0,200,255,0.7)';
    ctx.font = 'bold 7px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('▲ PICU SWEETS ▲', W/2, SAFE_H-5);
  }
  
  ctx.restore();
}
```

---

## 5. AUDIO SPECS

### Sound Effects
```javascript
const sfx = {
  select: () => playTone(880, 0.05, 'sine', 0.2),
  swap: () => playTone(440, 0.08, 'triangle', 0.15),
  match: () => { [523,659,784].forEach((f,i)=>setTimeout(()=>playTone(f,0.1),i*50)); },
  special: () => { [880,1100,1320,1760].forEach((f,i)=>setTimeout(()=>playTone(f,0.12),i*60)); },
  levelUp: () => { [523,784,1047,1568].forEach((f,i)=>setTimeout(()=>playTone(f,0.15),i*80)); },
  gameOver: () => playTone(200, 0.5, 'sawtooth', 0.2)
};
```

### Background Music
- BPM: 128 (fever: 158)
- Style: Bubblegum pop / Chiptune
- Instruments: Square wave melody, triangle bass
- Loop: 16 bars

---

## 6. PARTICLE SYSTEM

### Match Burst
```javascript
class CandyParticle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 12;
    this.vy = (Math.random() - 0.5) * 12 - 5;
    this.life = 1;
    this.color = color;
    this.size = Math.random() * 8 + 4;
    this.rotation = Math.random() * Math.PI * 2;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.4; // gravity
    this.life -= 0.02;
    this.rotation += 0.1;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
    ctx.restore();
  }
}
```

### Floating Text
- Text: "SWEET!", "TASTY!", "DELICIOUS!", "PICU BLAST!"
- Animation: Pop up, float, fade out
- Colors: Rainbow gradient, white stroke

---

## 7. LEVEL PROGRESSION

### Level Types
1. **Score Attack:** Reach target score in X moves
2. **Collect:** Gather N specific candies
3. **Clear:** Destroy all icing/chocolate obstacles
4. **Drop:** Bring N cherries to bottom
5. **Time Attack:** (Not for HikariBoy—no timer UI space)

### Difficulty Curve
- Level 1-3: Tutorial, simple matches
- Level 4-8: Introduce specials
- Level 9-15: Obstacles + combos required
- Level 16+: Fever mode activation

---

## 8. FILE STRUCTURE

```
/public/games/picu-sweets/
├── index.html      (Single file, all code inline)
└── cover.png       (390×520, chip style, "PICU SWEETS" title)
```

### Cover Image Spec
- Size: 390×520px (portrait)
- Style: Match Bubble Tea chip cover aesthetic
- Elements: Colorful candies, glowing "PICU SWEETS" text, sparkle effects
- File: <100KB for fast load

---

## 9. CODE PATTERNS

### State Machine
```javascript
const STATES = {
  START: 'start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ANIMATING: 'animating', // During cascade
  LEVEL_COMPLETE: 'levelComplete',
  GAME_OVER: 'gameOver'
};
```

### Grid Storage
```javascript
let grid = Array(8).fill(null).map(() => Array(8).fill(null));
// grid[y][x] = {type: 'gummy', special: null, anim: {scale: 1, offsetY: 0}}
```

### Match Detection
```javascript
function findMatches() {
  const matches = [];
  // Horizontal
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 6; x++) {
      const type = grid[y][x]?.type;
      if (type && grid[y][x+1]?.type === type && grid[y][x+2]?.type === type) {
        matches.push({x, y, length: 3, dir: 'h'});
      }
    }
  }
  // Vertical (similar)
  return matches;
}
```

---

## 10. HIKARIBOY CHECKLIST

- [ ] `isHikariBoy` detection at top
- [ ] `SAFE_H` used for all UI bounds
- [ ] `CAM_SHIFT` applied in render()
- [ ] `BUTTON_PRESS` handler for start/a/select/dpad
- [ ] Auto-start when `isHikariBoy` true
- [ ] SELECT button posts `GAME_EXIT`
- [ ] Cursor visible for controller navigation
- [ ] No touch/mouse required (optional support OK)
- [ ] All graphics within y < 447

---

**BUILD THIS EXACTLY.** No deviations. Test in HikariBoy before delivery.
