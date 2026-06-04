# Arcade Games Quick Reference Guide

## Game Architecture Decision Tree

```
START: "What game should I build?"
│
├─→ "Grid-based (Tetris, Snake, Pacman, Doodle Jump)"
│   │
│   ├─→ "Is it a simple moving grid pattern?" (Snake)
│   │   └─→ USE: Tetris Template
│   │       - 10x20 blocks array
│   │       - Movement = change x/y
│   │       - Canvas resize on update
│   │       - Input queue
│   │       - ~200 lines
│   │
│   ├─→ "Is it falling blocks?" (Tetris)
│   │   └─→ ALREADY EXISTS ✓
│   │
│   └─→ "Is it enemy AI?" (Pacman)
│       └─→ USE: Beyblade Lite
│           - Entity-based (pacman, ghosts)
│           - Pathfinding AI
│           - Sprite rendering
│           - ~300 lines
│
├─→ "Physics-based (Doodle Jump, platformer)"
│   │
│   └─→ USE: Beyblade Lite Physics
│       - useRef for entity state
│       - Velocity/acceleration
│       - Gravity simulation
│       - Collision response
│       - Platform generation
│       - ~300 lines
│
└─→ "Tile merging (2048 variant)"
    │
    └─→ USE: 2048 Template
        - DOM-based
        - Grid array
        - Actuator pattern
        - CSS transitions
        - ~150 lines
```

## 3-Game Architecture Comparison

### Technology Stack
```
┌──────────────────────────────────────────────────────────────┐
│                    TECHNOLOGY MATRIX                          │
├──────────────┬──────────────┬──────────────┬─────────────────┤
│   Feature    │  Beyblade    │    2048      │    Tetris       │
├──────────────┼──────────────┼──────────────┼─────────────────┤
│ Rendering    │ Canvas 2D    │ DOM/CSS      │ Canvas 2D       │
│ Framework    │ React Hooks  │ Vanilla JS   │ Vanilla JS      │
│ State        │ useRef       │ Objects      │ Global Vars     │
│ Resolution   │ 160x144 fix  │ Responsive   │ Responsive      │
│ Animation    │ Procedural   │ CSS Trans.   │ Procedural      │
│ FPS          │ 60           │ 60           │ 60              │
│ Code Lines   │ ~2000        │ ~500         │ ~400            │
│ Complexity   │ Very High    │ Medium       │ Medium          │
│ Best For     │ Physics      │ UI Tiles     │ Grid Logic      │
└──────────────┴──────────────┴──────────────┴─────────────────┘
```

### Rendering Flowchart
```
INPUT HANDLING
    │
    ├─ Beyblade: keydown → triggerButton() → setState()
    ├─ 2048:     keydown → GameManager.move/rotate
    └─ Tetris:   keydown → actions.push() → queue
    │
    ▼
GAME UPDATE
    │
    ├─ Beyblade: updateBattlePhysics() in game loop (physics ref)
    ├─ 2048:     GameManager methods mutate grid object
    └─ Tetris:   update(idt) mutates blocks array
    │
    ▼
STATE CHANGES
    │
    ├─ Beyblade: physicsRef.current updated (persistent)
    ├─ 2048:     Grid array + DOM state updated
    └─ Tetris:   blocks[][] + current/next piece updated
    │
    ▼
RENDER DISPATCH
    │
    ├─ Beyblade: renderFrame(ctx) dispatches to drawBattle/drawCustomize/etc
    ├─ 2048:     actuate() clears DOM and rebuilds tiles
    └─ Tetris:   draw() clears canvas and loops through grid
    │
    ▼
CANVAS/DOM PAINT
    │
    ├─ Beyblade: ctx.fillRect, ctx.arc, ctx.fillText (160x144)
    ├─ 2048:     DOM appendChild with CSS classes (CSS handles animation)
    └─ Tetris:   ctx.fillRect, ctx.strokeRect per block (10x20)
    │
    ▼
NEXT FRAME (16ms)
```

## Implementation Complexity Chart

```
                    COMPLEXITY vs FEATURES
                    ═══════════════════════

      2500 lines
      │         ╭─ Beyblade
      │         │ (physics, particles,
      │         │  state machine,
      2000 ─────┤  custom UI)
      │         │
      │        ╱
      1500 ───╱
      │     ╱
      1000 ╱  ╭─ 2048 (grid logic + DOM)
      │   ╱   │
       500─────┤ Tetris (grid + gravity)
      │ │
      └─────────────────────────────────
         LINES OF CODE

        FEATURES:
        
        Beyblade: ★★★★★ (everything)
        2048:     ★★☆☆☆ (UI + grid)
        Tetris:   ★★★☆☆ (physics + grid)
        Snake:    ★☆☆☆☆ (movement + collision)
        Pacman:   ★★★☆☆ (AI + grid)
        DoodleJ:  ★★★★☆ (physics + spawning)
```

## Code Copy Guide Matrix

```
             ┌──────────────────────────────────────────┐
             │ "WHAT TO COPY WHEN BUILDING GAMES"      │
             └──────────────────────────────────────────┘

SNAKE IMPLEMENTATION:
  ✓ Copy FROM Tetris:
    - Grid setup: nx=20, ny=20, blockSize
    - Movement: current.x += direction.x
    - Rendering loop: draw()
    - Collision detection pattern
    - requestAnimationFrame structure
    
  ✗ Don't copy FROM Beyblade:
    - Particle system
    - Physics simulation
    - State machine (LOGO → TITLE → etc)
    - Multiple screen renders
    
  ✗ Don't copy FROM 2048:
    - DOM structure (use canvas)
    - CSS animations

PACMAN IMPLEMENTATION:
  ✓ Copy FROM Beyblade:
    - Entity-based state (pacman, ghosts)
    - useRef structure (keeps data between renders)
    - handleKeyDown pattern
    - Multiple render functions (drawPacman, drawGhosts)
    
  ✓ Copy FROM Tetris:
    - Canvas structure
    - requestAnimationFrame
    - Grid setup (20x20 for maze)
    
  ✗ Don't copy:
    - Physics (not needed, grid-based)
    - Particle effects (not needed)
    - 2048 DOM (canvas is better)

DOODLE JUMP IMPLEMENTATION:
  ✓ Copy FROM Beyblade:
    - Physics simulation: vx, vy, gravity
    - Collision response (bounce off platform)
    - Entity structure: doodler = {x, y, vx, vy, ...}
    - useRef for state persistence
    - Particle effects on collision
    
  ✓ Copy FROM Tetris:
    - Canvas structure
    - Responsive sizing
    - Input handling
    
  ✗ Don't copy:
    - Grid-based logic (use coordinates)
    - 2048 DOM approach
```

## Game Features Matrix

```
┌────────────────┬────────────┬────────────┬─────────────┬──────────┐
│ Feature        │ Beyblade   │ 2048       │ Tetris      │ Template │
├────────────────┼────────────┼────────────┼─────────────┼──────────┤
│ Gravity        │ ✓✓✓        │ ✗          │ ✓✓          │ Snake: ✗ │
│ Collision      │ ✓✓✓        │ ✓          │ ✓✓          │ Pac: ✓✓  │
│ Rotation       │ ✓✓         │ ✗          │ ✓✓          │ Doodle: ✗│
│ Particles      │ ✓✓✓        │ ✗          │ ✗           │          │
│ AI Enemies     │ ✗          │ ✗          │ ✗           │ Pac: ✓✓✓ │
│ Score System   │ ✓✓         │ ✓✓✓        │ ✓✓          │ All: ✓   │
│ Sound Effects  │ ✓✓         │ ✗          │ ✗           │ Can add  │
│ Multiple Modes │ ✓✓✓        │ ✗          │ ✗           │          │
│ Leaderboard    │ ✓          │ ✓          │ ✗           │ Can add  │
│ Responsiveness │ Fixed      │ ✓✓✓        │ ✓✓          │          │
│ Mobile Touch   │ ✗          │ ✓✓         │ ✓           │ Can add  │
└────────────────┴────────────┴────────────┴─────────────┴──────────┘
```

## Size Comparison

```
Game               Files  Lines of Code  Est. Build Time
═══════════════════════════════════════════════════════
Beyblade           1      ~2500          (already done)
2048               12     ~500           < 30 min
Tetris             1      ~400           < 30 min
─ Snake            1      ~200           < 15 min ← START HERE
─ Pacman           1      ~400           < 45 min
─ Doodle Jump      1      ~350           < 40 min
```

## Priority Ranking

### TIER 1: Quick Wins (< 30 min each)
1. **Implement Snake** (copy Tetris structure)
   - Path: `/foodspot-arcade/games/snake/`
   - Template: Tetris with simplified logic
   - Status: 🟢 EASIEST

### TIER 2: Medium Effort (30-60 min each)
2. **Implement Doodle Jump** (copy Beyblade physics)
   - Path: `/foodspot-arcade/games/doodle-jump/`
   - Template: Beyblade Lite (physics only)
   - Status: 🟡 MEDIUM

3. **Implement Pacman** (blend Beyblade + Tetris)
   - Path: `/foodspot-arcade/games/pacman/`
   - Template: Entity-based with AI
   - Status: 🟡 MEDIUM

### TIER 3: Already Done
4. ✅ **2048** (working DOM-based)
5. ✅ **Tetris** (working Canvas-based)

## Recommended Build Order

```
PHASE 1: Complete Existing Games (DONE ✓)
  └─ 2048: ✓
  └─ Tetris: ✓

PHASE 2: Quick Implementations (2-3 hours)
  1. Snake (15 min) ← Copy Tetris template
  2. Doodle Jump (40 min) ← Copy Beyblade physics
  3. Pacman (45 min) ← Blend both approaches

PHASE 3: Polish (1-2 hours)
  1. Add sound effects (optional)
  2. Add high score persistence
  3. Add keyboard shortcuts overlay
  4. Add pause/resume
  5. Mobile touch controls

TOTAL TIME TO 5 WORKING GAMES: ~6-8 hours from now
```

## File Structure Needed

```
foodspot-arcade/
├── games/
│   ├── 2048/ ✓
│   ├── tetris/ ✓
│   ├── snake/
│   │   └── index.html (canvas + ~200 lines JS)
│   ├── doodle-jump/
│   │   └── index.html (canvas + ~350 lines JS)
│   └── pacman/
│       └── index.html (canvas + ~400 lines JS)
└── game-registry.json (update with 3 new entries)
```

## JavaScript Snippet Templates

### Minimal Snake Game (~150 lines)
```javascript
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const blockSize = canvas.width / gridSize;

let snake = [{x: 10, y: 10}];
let food = {x: 15, y: 15};
let direction = {x: 1, y: 0};
let nextDirection = {x: 1, y: 0};
let score = 0;
let gameOver = false;

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && direction.y === 0) nextDirection = {x: 0, y: -1};
  if (e.key === 'ArrowDown' && direction.y === 0) nextDirection = {x: 0, y: 1};
  if (e.key === 'ArrowLeft' && direction.x === 0) nextDirection = {x: -1, y: 0};
  if (e.key === 'ArrowRight' && direction.x === 0) nextDirection = {x: 1, y: 0};
});

function update() {
  direction = nextDirection;
  const head = {x: snake[0].x + direction.x, y: snake[0].y + direction.y};
  
  // Check bounds
  if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
    gameOver = true;
    return;
  }
  
  snake.unshift(head);
  
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    food = {x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize)};
  } else {
    snake.pop();
  }
  
  if (snake.slice(1).some(s => s.x === head.x && s.y === head.y)) {
    gameOver = true;
  }
}

function render() {
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = 'lime';
  snake.forEach(segment => {
    ctx.fillRect(segment.x * blockSize + 1, segment.y * blockSize + 1, blockSize - 2, blockSize - 2);
  });
  
  ctx.fillStyle = 'red';
  ctx.fillRect(food.x * blockSize + 1, food.y * blockSize + 1, blockSize - 2, blockSize - 2);
  
  ctx.fillStyle = 'black';
  ctx.font = '16px Arial';
  ctx.fillText(`Score: ${score}`, 10, 20);
  
  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
  }
}

function gameLoop() {
  if (!gameOver) update();
  render();
  requestAnimationFrame(gameLoop);
}

gameLoop();
```

---

## Next Actions

1. ✅ **Read This Document** (understanding complete)
2. 📋 **Choose Implementation Order** (Snake → Doodle Jump → Pacman)
3. 🔨 **Copy Template Code** (use snippets above as starting point)
4. 🎮 **Implement Snake** (~15 min)
5. 📤 **Test All 5 Games** in FoodSpot
6. 🚀 **Deploy to Production**

**Document Generated**: 2026-06-03  
**Scope**: Complete arcade game architecture analysis + implementation roadmap
