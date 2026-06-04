# FoodSpot Arcade Games: Rendering Architecture Analysis

## Executive Summary
**Beyblade GBScreen** and **FoodSpot's 5 arcade games** use fundamentally different rendering paradigms:
- **Beyblade**: Canvas-based, Game Boy emulator (160×144px), physics-driven, stateful React component
- **2048**: DOM-based, HTML divs + CSS, grid positioning system
- **Tetris**: Canvas-based, 2D context, procedural line/rect drawing
- **Snake**: Empty (not implemented)
- **Pacman**: Empty (not implemented)
- **Doodle Jump**: Empty (not implemented)

---

## 1. BEYBLADE GBSCREEN.JSX
**File**: `/tmp/beyblade-game-demo-/src/components/GBScreen.jsx`
**Type**: Canvas-based Game Boy emulator
**Resolution**: 160×144px (fixed, classic GB resolution)
**Framework**: React 19 functional component with hooks

### Rendering Model
```
requestAnimationFrame loop → gameLoop() → renderFrame(ctx) → canvas.getContext('2d')
```

### Key Characteristics
| Aspect | Implementation |
|--------|-----------------|
| **Canvas Size** | Fixed 160×144px (Game Boy) |
| **Render Loop** | `requestAnimationFrame` in `useEffect` |
| **Draw Method** | Direct 2D context: `ctx.fillRect()`, `ctx.arc()`, `ctx.fillText()` |
| **State Updates** | React hooks (`useState`) update on each frame |
| **Physics** | Complex collision, velocity, stamina system in `physicsRef` |
| **Particle System** | Yes - explosion particles, comic text floats |
| **Audio** | Web Audio API via `playSoundFX()` |
| **Game States** | 6 states: LOGO → TITLE → CUSTOM_PARTS → RIVAL_SELECT → BATTLE → RESULT |

### Code Structure
```javascript
const gameLoop = () => {
  if (screenState === "BATTLE" && !isPaused) {
    updateBattlePhysics();  // Modify physics state
  }
  renderFrame(ctx);         // Draw everything
  animId = requestAnimationFrame(gameLoop);
};

const renderFrame = (ctx) => {
  // Clear canvas
  ctx.fillStyle = currentPalette.background;
  ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  
  // Dispatch to screen-specific renderer
  if (screenState === "LOGO") drawLogo(ctx);
  else if (screenState === "TITLE") drawTitle(ctx);
  else if (screenState === "BATTLE") drawBattle(ctx);
  // ...
};
```

### Drawing Primitives Used
```javascript
// Shapes
ctx.fillRect(x, y, w, h);      // Filled rectangles (tiles)
ctx.strokeRect(x, y, w, h);    // Rectangle outlines (borders)
ctx.arc(x, y, r, 0, Math.PI*2);  // Circles (beyblades)
ctx.beginPath(); ctx.moveTo(); ctx.lineTo(); ctx.stroke(); // Lines

// Text
ctx.font = "bold 8px monospace";
ctx.fillText("TEXT", x, y);

// Transforms
ctx.save(); ctx.restore();      // State management
ctx.translate(x, y);            // Positioning
ctx.rotate(angle);              // Rotation
ctx.scale(sx, sy);              // Scaling
```

### Color System
```javascript
currentPalette = {
  background: "#E8D4B8",
  light: "#F0E8D8",
  dark: "#706030",
  darkest: "#201810",
  isFullColor: true/false,      // Full color vs monochrome
  
  // When full color (anime mode):
  primary: "#ff0055",           // Neon pink
  secondary: "#00f5ff",         // Cyber cyan
  accent: "#ffe600"             // Electric gold
}
```

### Physics Integration
```javascript
const physicsRef = useRef({
  player: { x, y, vx, vy, spin, stamina, integrity, ... },
  cpu: { ... },
  particles: [],
  shockwaves: [],
  comicTexts: [],
  burstParts: [],          // When blade bursts
  freezeFrame: 0,          // Pause rendering
  countdown: 5,            // Launch countdown
  ...
});
```

### State Management
- **React hooks**: screenState, logoProgress, currentPalette, launchPower, etc.
- **Refs**: physicsRef (persistent across renders, not re-created)
- **No Redux/Context**: Self-contained component

### Interaction Model
```
Keyboard Input
  ↓
handleKeyDown (arrow keys, Z/X/S/L/R)
  ↓
triggerButton(action) → updates state
  ↓
Next renderFrame() reflects new state
```

---

## 2. FOODSPOT 2048
**File**: `/Users/daiskebrandan/Downloads/foodspotapp-main/foodspot-arcade/games/2048/`
**Type**: DOM-based (HTML/CSS)
**Resolution**: Responsive (4×4 grid of tiles)
**Framework**: Vanilla JavaScript ES5

### Rendering Model
```
Game Logic (game_manager.js) → HTMLActuator.actuate()
  → DOM manipulation (createElement, appendChild)
  → CSS class application
  → requestAnimationFrame for CSS transitions
```

### Key Characteristics
| Aspect | Implementation |
|--------|-----------------|
| **Canvas** | None - DOM-based |
| **Render Method** | HTML divs with CSS positioning |
| **Tile Rendering** | Create `<div class="tile tile-128 tile-position-2-3">` per tile |
| **Animation** | CSS transitions (in `style/main.css`) |
| **State Update** | JavaScript object grid, then sync to DOM |
| **Physics** | None - pure tile merging logic |
| **Particle System** | None |
| **Audio** | None built-in |

### Code Structure
```javascript
function HTMLActuator() {
  this.tileContainer = document.querySelector(".tile-container");
  this.scoreContainer = document.querySelector(".score-container");
}

HTMLActuator.prototype.actuate = function(grid, metadata) {
  window.requestAnimationFrame(function() {
    self.clearContainer(self.tileContainer);
    
    grid.cells.forEach(column => {
      column.forEach(cell => {
        if (cell) self.addTile(cell);  // Create div for each tile
      });
    });
    
    self.updateScore(metadata.score);
  });
};

function addTile(tile) {
  var wrapper = document.createElement("div");
  var classes = ["tile", "tile-" + tile.value, "tile-position-" + (tile.x+1) + "-" + (tile.y+1)];
  wrapper.setAttribute("class", classes.join(" "));
  wrapper.appendChild(inner);
  this.tileContainer.appendChild(wrapper);
}
```

### HTML Structure
```html
<div class="tile-container">
  <!-- Generated by JavaScript -->
  <div class="tile tile-128 tile-position-2-3">
    <div class="tile-inner">128</div>
  </div>
  <div class="tile tile-64 tile-position-3-3">
    <div class="tile-inner">64</div>
  </div>
  <!-- ... -->
</div>
```

### CSS Animation
```css
.tile {
  position: absolute;
  background-color: #eee4da;
  transition: all 0.15s ease-out;
}

.tile-2 { background-color: #eee4da; color: #776e65; }
.tile-4 { background-color: #ede0c8; color: #776e65; }
.tile-128 { background-color: #f2b179; color: #f9f6f2; }

.tile-position-1-1 { transform: translate(0px, 0px); }
.tile-position-2-2 { transform: translate(60px, 60px); }
.tile-position-4-4 { transform: translate(180px, 180px); }

.tile-merged { box-shadow: 0 0 20px 10px rgba(0,0,0,0.2); }
```

### Rendering Pipeline
```
1. Game Manager calculates new grid state
2. HTMLActuator.actuate() is called
3. DOM is cleared and rebuilt each frame
4. CSS classes drive animations
5. Browser repaints on next frame
```

---

## 3. FOODSPOT TETRIS
**File**: `/Users/daiskebrandan/Downloads/foodspotapp-main/foodspot-arcade/games/tetris/index.html`
**Type**: Canvas-based (2D context)
**Resolution**: Responsive (10×20 grid of blocks)
**Framework**: Vanilla JavaScript ES5

### Rendering Model
```
Game Logic (inline) → update(idt) → requestAnimationFrame
  → drawBlocks(ctx) → ctx.fillRect() per block
  → ctx.drawText() for UI
```

### Key Characteristics
| Aspect | Implementation |
|--------|-----------------|
| **Canvas** | Yes - 2 canvases (main game + upcoming piece preview) |
| **Render Method** | 2D context: `ctx.fillRect()`, `ctx.strokeRect()` |
| **Grid Size** | 10×20 blocks (responsive chunk size) |
| **State Update** | 2D array `blocks[x][y]` = type, then render |
| **Physics** | Gravity, piece rotation, collision detection |
| **Particle System** | None |
| **Audio** | None built-in |
| **Piece Generation** | Predefined tetromino shapes |

### Code Structure
```javascript
var canvas = get('canvas');
var ctx = canvas.getContext('2d');
var dx, dy;  // pixel size of single block

function resize(event) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  dx = canvas.width / nx;    // 10 blocks wide
  dy = canvas.height / ny;   // 20 blocks tall
}

function update(idt) {
  if (playing) {
    handle(actions.shift());
    dt += idt;
    if (dt > step) {
      dt -= step;
      drop();  // Gravity: move piece down
    }
  }
}

function run() {
  var now = timestamp();
  var idt = (now - lastTime) / 1000.0;
  update(idt);
  render();
  lastTime = now;
  requestAnimationFrame(run);
}

function render() {
  draw();
  drawNext();
  drawScore();
  drawRows();
}
```

### Drawing Functions
```javascript
function draw() {
  if (invalid.board) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    for (x = 0; x <= nx; x++) {
      ctx.strokeStyle = "#ccc";
      ctx.beginPath();
      ctx.moveTo(x * dx + 0.5, 0);
      ctx.lineTo(x * dx + 0.5, canvas.height);
      ctx.stroke();
    }
    
    // Draw all blocks
    for (x = 0; x < nx; x++) {
      for (y = 0; y < ny; y++) {
        drawBlock(ctx, x, y, getBlock(x, y));
      }
    }
    
    // Draw current piece
    drawPiece(ctx, current.type, current.x, current.y, current.dir);
    
    invalid.board = false;
  }
}

function drawBlock(ctx, x, y, type) {
  ctx.fillStyle = type ? pieceColor(type) : "white";
  ctx.fillRect(x * dx, y * dy, dx, dy);
  ctx.strokeRect(x * dx, y * dy, dx, dy);
}

function drawNext() {
  // Preview canvas for next piece
  uctx.clearRect(0, 0, nu * dx, nu * dy);
  drawPiece(uctx, next.type, padding, padding, next.dir);
  uctx.strokeRect(0, 0, nu * dx - 1, nu * dy - 1);
}
```

### Block State Array
```javascript
blocks = [
  [null, null, null, null, ...],  // Column 0
  [null, 1, 1, null, ...],         // Column 1
  [null, 1, 2, 2, ...],            // Column 2
  ...
];
```

### Rendering Pipeline
```
1. Game Logic updates blocks array
2. Game Logic updates current/next piece positions
3. render() is called
4. draw() clears canvas and draws all blocks pixel-by-pixel
5. drawNext() draws preview
6. drawScore() updates DOM text
```

---

## 4. SNAKE & PACMAN & DOODLE-JUMP
**Files**: Empty implementations (only `index.html` files with no game code)

---

## SIDE-BY-SIDE COMPARISON

### Rendering Approach
| Feature | Beyblade | 2048 | Tetris |
|---------|----------|------|--------|
| **Technology** | Canvas 2D | DOM/CSS | Canvas 2D |
| **Frame Rate** | 60fps (rAF) | 60fps (rAF) | 60fps (rAF) |
| **State Storage** | React hooks + refs | JS objects | JS arrays |
| **Animation** | Procedural (physics) | CSS transitions | Procedural (gravity) |
| **Redraw Per Frame** | Full (clear + draw) | DOM rebuild | Conditional |
| **Interaction** | Keyboard → state → render | DOM events | Keyboard → array |
| **Complexity** | Very high (physics, particles) | Medium (grid logic) | Medium (collision) |

### Canvas vs DOM
| Aspect | Canvas Games (Beyblade, Tetris) | DOM Game (2048) |
|--------|--------------------------------|-----------------|
| **Pro** | Pixel-perfect control, smooth animations, built for games | Semantic HTML, CSS-driven, SEO-friendly |
| **Con** | No accessibility, text rendering is hard, no native text selection | Limited to rectangular elements, CPU-intensive with large numbers |
| **Text** | `ctx.fillText()` - limited fonts | Native HTML - full control |
| **Scaling** | Manual (resize canvas, adjust dx/dy) | Responsive via CSS |
| **Performance** | Fast redraw, 60fps easy | Fast until grid gets large (e.g., 100s of tiles) |

### Input Handling
| Game | Input Method | Latency | Queue |
|------|--------------|---------|-------|
| **Beyblade** | `keydown` → state → renderFrame | ~16ms | No (immediate) |
| **2048** | `keydown` → game_manager | ~0-50ms | No (applies immediately) |
| **Tetris** | `keydown` → actions array | ~0-50ms | Yes (queue shifts on update) |

---

## ARCHITECTURE RECOMMENDATIONS FOR FOODSPOT ARCADE

### For Snake (Canvas Recommended)
**Similarity**: Tetris (grid-based, physics-free)
```javascript
// Snake should use Canvas like Tetris
const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
let snake = [{x: 10, y: 10}, {x: 9, y: 10}, ...];
let food = {x: 15, y: 15};

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw food
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(food.x * blockSize, food.y * blockSize, blockSize, blockSize);
  
  // Draw snake
  ctx.fillStyle = "#00ff00";
  snake.forEach(segment => {
    ctx.fillRect(segment.x * blockSize, segment.y * blockSize, blockSize, blockSize);
  });
}
```

### For Pacman (Canvas Recommended)
**Similarity**: Beyblade (entity-based, moving objects)
```javascript
// Pacman could be Canvas-based with sprite rendering
let pacman = {x: 10, y: 10, vx: 1, vy: 0, mouthOpen: true};
let ghosts = [
  {x: 0, y: 0, color: "#ff0000"},  // Blinky
  {x: 28, y: 0, color: "#ffb6c1"},  // Pinky
  ...
];

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw maze (static)
  drawMaze();
  
  // Draw pacman
  drawPacman(pacman.x, pacman.y, pacman.mouthOpen);
  
  // Draw ghosts
  ghosts.forEach(ghost => {
    drawGhost(ghost.x, ghost.y, ghost.color);
  });
}
```

### For Doodle Jump (Canvas Recommended)
**Similarity**: Beyblade (physics, gravity, collision)
```javascript
// Doodle Jump needs physics like Beyblade
let doodler = {
  x: canvas.width / 2,
  y: canvas.height - 50,
  vx: 0,
  vy: 0,
  width: 16,
  height: 20,
  jumping: false
};

let platforms = [
  {x: 0, y: canvas.height - 30, width: 50, height: 8},
  ...
];

function updatePhysics() {
  doodler.vy += 0.2;  // Gravity
  doodler.y += doodler.vy;
  
  // Platform collision
  platforms.forEach(p => {
    if (checkCollision(doodler, p) && doodler.vy > 0) {
      doodler.vy = -12;  // Jump
    }
  });
}
```

---

## RENDERING FLOW DIAGRAM

### Beyblade (React-based Canvas)
```
┌─────────────────────────────────────┐
│  React Component (GBScreen.jsx)     │
│  - useState hooks                   │
│  - useRef (physicsRef)              │
│  - useEffect (gameLoop setup)       │
└────────────┬────────────────────────┘
             │
             ↓
    ┌─────────────────────┐
    │  requestAnimationFrame
    │  gameLoop()         │
    └──────────┬──────────┘
               │
       ┌───────┴───────┐
       ↓               ↓
  Update State    renderFrame()
  (if BATTLE)     (draw canvas)
       │               │
       └───────┬───────┘
               ↓
        Canvas 160×144px
```

### 2048 (DOM-based)
```
┌──────────────────────────────────┐
│  Game Logic (game_manager.js)    │
│  - Grid state array              │
│  - Tile objects                  │
└────────────┬─────────────────────┘
             │
             ↓
    ┌──────────────────────┐
    │  HTMLActuator.actuate
    │  (game state)        │
    └──────────┬───────────┘
               │
               ↓
    ┌──────────────────────┐
    │  Clear DOM           │
    │  Rebuild tile divs   │
    │  Apply CSS classes   │
    └──────────┬───────────┘
               │
               ↓
        Browser Repaints
```

### Tetris (Canvas-based)
```
┌──────────────────────────────┐
│  Game Loop (run())           │
│  requestAnimationFrame       │
└────────────┬─────────────────┘
             │
             ↓
    ┌─────────────────────┐
    │  update(idt)        │
    │  - Handle input     │
    │  - Update blocks[][]│
    │  - Gravity          │
    └──────────┬──────────┘
               │
               ↓
    ┌─────────────────────┐
    │  render()           │
    │  - draw()           │
    │  - drawNext()       │
    │  - drawScore()      │
    └──────────┬──────────┘
               │
               ↓
        Canvas 10×20 grid
```

---

## KEY INSIGHTS

### 1. Beyblade is "Over-Engineered" for Simple Games
- 160×144px fixed canvas (Game Boy aesthetic)
- Complex physics simulation with collisions, particles, comic text
- State machine with 6 different screens
- Particle system for visual effects
- **Good for**: Fighting games, physics-based games
- **Overkill for**: Simple grid games like Tetris, Snake

### 2. 2048's DOM Approach Works for Tile-Based Games
- Clean separation: game logic → actuator → DOM
- CSS animations smooth and performant
- Easy to modify styling without touching game logic
- **Limitation**: Doesn't scale to 100+ tiles

### 3. Tetris's Canvas Approach is the "Goldilocks"
- Full control over rendering
- Conditional redraw (only when `invalid.board` is true)
- Simple state array (`blocks[x][y]`)
- Fast, lightweight, performant
- **Best for**: Grid-based games (Snake, Tetris variants)

### 4. Missing Games (Snake, Pacman, Doodle Jump)
- Only empty `index.html` files exist
- Need implementation
- **Recommendation**: Use Tetris structure as template, not Beyblade

---

## NEXT STEPS FOR FOODSPOT

1. **Implement Snake** (Canvas, ~200 lines)
   - Copy Tetris structure
   - Replace grid logic with snake body array
   - Simpler than Tetris (no rotation)

2. **Implement Pacman** (Canvas, ~400 lines)
   - Copy Beyblade's entity-based approach (not Tetris grid)
   - Needs pathfinding AI for ghosts
   - Sprite rendering instead of box drawing

3. **Implement Doodle Jump** (Canvas, ~300 lines)
   - Copy Beyblade's physics approach
   - Simpler gravity & collision
   - Platform generation

4. **Keep 2048 & Tetris as-is**
   - Both work well
   - 2048 = DOM model (tile-based, UI-heavy)
   - Tetris = Canvas model (grid-based, physics-light)

---

## CODE TEMPLATE: Minimal Canvas Game (Snake)

```javascript
// index.html
<canvas id="gameCanvas" width="400" height="400"></canvas>

// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const blockSize = canvas.width / gridSize;

let snake = [{x: 10, y: 10}];
let food = {x: 15, y: 15};
let direction = {x: 1, y: 0};
let score = 0;

function update() {
  // Move snake
  const head = {x: snake[0].x + direction.x, y: snake[0].y + direction.y};
  snake.unshift(head);
  
  // Check food
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    food = {x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize)};
  } else {
    snake.pop();
  }
  
  // Check collision
  if (snake.slice(1).some(s => s.x === head.x && s.y === head.y)) {
    gameOver();
  }
}

function render() {
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw snake
  ctx.fillStyle = 'green';
  snake.forEach(segment => {
    ctx.fillRect(segment.x * blockSize, segment.y * blockSize, blockSize - 1, blockSize - 1);
  });
  
  // Draw food
  ctx.fillStyle = 'red';
  ctx.fillRect(food.x * blockSize, food.y * blockSize, blockSize - 1, blockSize - 1);
  
  // Draw score
  ctx.fillStyle = 'black';
  ctx.font = '16px Arial';
  ctx.fillText(`Score: ${score}`, 10, 20);
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && direction.y === 0) direction = {x: 0, y: -1};
  if (e.key === 'ArrowDown' && direction.y === 0) direction = {x: 0, y: 1};
  if (e.key === 'ArrowLeft' && direction.x === 0) direction = {x: -1, y: 0};
  if (e.key === 'ArrowRight' && direction.x === 0) direction = {x: 1, y: 0};
});

gameLoop();
```

---

**Document Generated**: 2026-06-03
**Analysis Scope**: Beyblade (React Canvas), 2048 (DOM), Tetris (Canvas), Snake/Pacman/DoodleJump (Not Implemented)
