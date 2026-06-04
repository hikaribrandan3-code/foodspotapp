# 1:1 Rendering Architecture Comparison

## GBScreen.jsx vs FoodSpot Games: Side-by-Side

### RENDERING ENTRY POINT

```
BEYBLADE GBScreen.jsx              2048 (DOM)                    TETRIS (Canvas)
═════════════════════════          ═════════════                 ═══════════════════

export GBScreen({...}) {           function HTMLActuator() {     var canvas = get('canvas');
  const canvasRef = useRef();        this.tileContainer =        var ctx = canvas.getContext('2d');
  
  useEffect(() => {                    document.querySelector(   function run() {
    const gameLoop = () => {           ".tile-container");         var now = timestamp();
      if (screenState === "BATTLE"   }                           var idt = (now - lastTime)/1000;
        && !isPaused) {                                           
        updateBattlePhysics();       HTMLActuator.prototype      update(idt);
      }                              .actuate = function(grid) {  render();
      renderFrame(ctx);                window.requestAnimFrame(  
      animId = requestAnimFrame(       function() {               requestAnimFrame(run);
        gameLoop);                      self.clearContainer();    }
    };                                 grid.cells.forEach(...);   
                                       self.addTile(cell);        
    animId = requestAnimFrame(         self.updateScore();      function update(idt) {
      gameLoop);                     });                          if (playing) {
  }, [screenState, ...deps]);        }                             handle(actions.shift());
}                                                                  dt += idt;
                                                                   if (dt > step) {
```

### CANVAS INITIALIZATION

```
BEYBLADE                          TETRIS
════════════════════              ═══════════════════════════

const SCREEN_WIDTH = 160;         function resize(event) {
const SCREEN_HEIGHT = 144;          canvas.width = 
(fixed Game Boy size)               canvas.clientWidth;
                                    canvas.height = 
const canvas = canvasRef.current;   canvas.clientHeight;
const ctx = canvas.                 
  getContext("2d");                 dx = canvas.width / 10;
                                    dy = canvas.height / 20;
(automatic via ref)                 
                                    invalidate();
                                  }
```

### STATE STRUCTURE

```
BEYBLADE (React Hooks)            2048 (Plain Objects)          TETRIS (Arrays)
═══════════════════════════════   ═════════════════════════     ═══════════════════

const [screenState,               var blocks;  // 2D grid       var blocks;  // 2D grid
  setScreenState] = useState(        // each cell = value      // blocks[x][y] = type
  "LOGO");                        
                                  var actions = [];  // input  var actions = [];  // queue
const [launchPower,              var score = 0;              var current = piece;  // falling
  setLaunchPower] = useState(0);  var rows = 0;              var next = piece;  // preview
                                  var playing = false;        var dt = 0;  // time accumulator
const physicsRef = useRef({
  player: {                       MUTATED ON UPDATE:          MUTATED ON UPDATE:
    x, y, vx, vy,                blocks[x][y] = type;        blocks[x][y] = type;
    spin, stamina, ...            score += points;            current.x += 1;
  },
  cpu: {...},                     RENDERED VIA:               RENDERED VIA:
  particles: [],                  grid.cells.forEach(cell =>  ctx.clearRect();
  ...                               addTile(cell));           for (x,y) drawBlock();
});
```

### GAME LOOP - UPDATE PHASE

```
BEYBLADE PHYSICS                  2048 GRID UPDATE             TETRIS BLOCK UPDATE
═════════════════════════════════ ═════════════════════════    ═════════════════════

updateBattlePhysics() {           // Game manager handles       update(idt) {
  const state = physicsRef.       // move() & rotate() logic    if (playing) {
    current;                                                      handle(actions.shift());
                                  move(dir) {                   dt += idt;
  state.player.vx += accel;         var x = current.x;        
  state.player.vy += accel;         switch(dir) {              if (dt > step) {
                                      case DIR.RIGHT:            dt -= step;
  // Collision detection           x = x + 1; break;           drop();  // Gravity
  for (let i=0; i<blocks.         }                            }
    length; i++) {                 if (unoccupied(...)) {      }
    const b = blocks[i];            current.x = x;            
    const dx = b.x - ...;           invalidate();             function drop() {
    if (collision) {                return true;               if (!move(DIR.DOWN)) {
      b.vx = ... * elasticity;    }                             addScore(10);
    }                             }                             dropPiece();
  }                                                             removeLines();
                                  rotate() {                   setCurrentPiece(next);
  // Stamina decay                var newdir = (              }
  state.player.stamina -= 1;        current.dir == DIR.MAX   
                                    ? DIR.MIN                function move(dir) {
  // Particle updates               : current.dir + 1);       var x = current.x,
  state.particles = state.          if (unoccupied(...)) {     y = current.y;
    particles.map(p => {            current.dir = newdir;    switch(dir) {
    p.x += p.vx;                    invalidate();             case DIR.RIGHT:
    p.y += p.vy;                  }                            x = x + 1; break;
    p.life -= p.decay;            }                           case DIR.DOWN:
    return p;                                                  y = y + 1; break;
  });                                                        }
                                                           if (unoccupied(...)) {
  // Check win/lose                                         current.x = x;
  if (state.player.               current.y = y;
    stamina <= 0) {                invalidate();
    state.winner = "cpu";           return true;
  }                               }
}
```

### GAME LOOP - RENDER PHASE

```
BEYBLADE renderFrame()            2048 actuate()                TETRIS render()
═══════════════════════════════   ════════════════════════      ══════════════════════

const renderFrame = (ctx) => {    HTMLActuator.prototype        function render() {
  // Clear canvas                 .actuate = function(         draw();
  ctx.fillStyle = palette.bg;     grid, metadata) {             drawNext();
  ctx.fillRect(0, 0, 160, 144);     window.                     drawScore();
                                    requestAnimationFrame(() => drawRows();
  // Draw based on state          self.clearContainer(...);    }
  if (screenState === "TITLE") {
    drawTitle(ctx);                grid.cells.forEach(         function draw() {
  }                                 column => {                  if (invalid.board) {
  else if (screenState ===        column.forEach(cell => {      ctx.clearRect(0, 0, 
    "BATTLE") {                     if (cell)                    canvas.width,
    drawBattle(ctx);                self.addTile(cell);         canvas.height);
  }                                });
  // ...                          });                           // Grid background
};                                                             for (x = 0; x <= 10; x++)
                                  self.updateScore(             drawGridLine(x);
const drawBattle = (ctx) => {       metadata.score);           
  // Draw arena background        self.updateBestScore(...);    // All blocks
  ctx.fillStyle = palette.dark;   });                          for (x = 0; x < 10; x++)
  ctx.fillRect(...);              };                            for (y = 0; y < 20; y++)
                                                                drawBlock(..., x, y);
  // Draw beyblades
  drawBeyblade(ctx,               function addTile(tile) {      // Current piece
    state.player);                  var wrapper =               drawPiece(ctx, current);
  drawBeyblade(ctx,               document.createElement(      
    state.cpu);                     "div");                     invalid.board = false;
                                    var classes = [             }
  // Draw particles                "tile", "tile-" +         }
  state.particles.forEach(p => {    tile.value,
    ctx.fillStyle = p.color;        positionClass(...)];      function drawBlock(
    ctx.globalAlpha = p.life;       wrapper.setAttribute(       ctx, x, y, type) {
    ctx.fillRect(p.x, p.y,          "class", classes.join);    ctx.fillStyle = type ? 
      p.size, p.size);              wrapper.appendChild(        color(type) : "white";
  });                               inner);                     ctx.fillRect(x*dx, y*dy,
                                    this.tileContainer.         dx, dy);
  ctx.globalAlpha = 1.0;            appendChild(wrapper);       ctx.strokeRect(x*dx,
};                                }                             y*dy, dx, dy);
                                                              }
const drawBeyblade = (ctx,        // CSS does animation
  bey) => {
  ctx.save();
  ctx.translate(bey.x, bey.y);
  ctx.rotate(bey.angle);
  
  ctx.fillStyle = bey.color;
  ctx.arc(0, 0, bey.radius,
    0, Math.PI*2);
  ctx.fill();
  
  ctx.restore();
};
```

### INPUT HANDLING

```
BEYBLADE                          2048                          TETRIS
════════════════════════════════  ══════════════════════════    ═══════════════════════

useEffect(() => {                 document.addEventListener(   function keydown(ev) {
  const handleKeyDown = (e) => {   'keydown', function(e) {    var handled = false;
    let action = "";                if (e.keyCode === 37)      if (playing) {
                                      actions.push(...)        switch(ev.keyCode) {
    if (e.key === "ArrowUp")                                    case KEY.LEFT:
      action = "UP";               GameManager.move(dir);       actions.push(DIR.LEFT);
    else if (e.key.toLowerCase()   GameManager.rotate();       handled = true; break;
      === "z")                     GameManager.drop();        case KEY.SPACE:
      action = "A";                                             play();
                                 });                            handled = true; break;
    if (action) {                                             }
      e.preventDefault();          // No explicit queue!       if (handled)
      triggerButton(action);                                    e.preventDefault();
    }                            // Immediate mutation         }
  };
                                                             // Queue-based input!
  window.addEventListener(                                  // Processes one action
    "keydown", handleKeyDown);                              // per update() call
}, [screenState, ...deps]);
```

### STATE PERSISTENCE

```
BEYBLADE                          2048                          TETRIS
════════════════════════════════  ══════════════════════════    ═══════════════════════

DESTROYED & RECREATED:            PERSISTENT:                   PERSISTENT:
- screenState                     - blocks[][] array            - blocks[][] array
- launchPower                     - score variable              - current piece
- customSelectedIndex             - tiles objects in DOM        - next piece
- etc. (on each render)                                         - score variable

PERSISTENT (useRef):              NO REFS                       NO REFS
- physicsRef (entire state)       STATE LIVES IN:               STATE LIVES IN:
  - Survives re-renders             - JavaScript objects       - Global variables
  - Not recreated                    - DOM nodes                - Game manager scope

WHY: Can't mutate                 WHY: Changes to DOM
React state during render         trigger re-renders,
(physics is too fast for          which is desired for
setState calls)                   animations
```

### ANIMATION STRATEGY

```
BEYBLADE PROCEDURAL               2048 CSS-DRIVEN               TETRIS PROCEDURAL
════════════════════════════════  ════════════════════════      ═══════════════════════

requestAnimationFrame loop        requestAnimationFrame loop   requestAnimationFrame loop
(game responsible)                (browser responsible)        (game responsible)

Every 16ms:                       Every 16ms:                 Every 16ms:
1. Update physics                 1. Game logic runs           1. Game logic runs
2. Draw everything                2. If state changed:         2. If invalid flag set:
3. Render particles                  - Update DOM classes      3. Redraw canvas
4. Render transforms              3. CSS transition kicks in   4. Browser paints
5. Canvas paint                   4. Browser paints

Example:                          Example:                    Example:
const p = particles[0];           tile value changes:         blocks[5][10] = PIECE_TYPE;
p.x += p.vx;                      const classes =            then draw() clears canvas
p.y += p.vy;                        ["tile", "tile-128",       and redraws all blocks
ctx.fillRect(p.x, p.y, 2, 2);     "tile-position-2-3"];
                                  wrapper.setAttribute(       ctx.clearRect(...);
All drawing is IMMEDIATE          "class", classes.join);    for (let y=0; y<20; y++)
                                                              drawBlock(5, y);
                                  CSS handles the smooth
                                  translation:
                                  .tile {
                                    transition: all 0.15s;
                                  }
```

### PERFORMANCE CHARACTERISTICS

```
BEYBLADE                          2048                          TETRIS
════════════════════════════════  ════════════════════════════  ═══════════════════════

FPS: ~60 (constant)               FPS: ~60 (constant)          FPS: ~60 (constant)

Per-Frame Cost:                   Per-Frame Cost:              Per-Frame Cost:
1. Physics update: ~0.5ms         1. Game logic: ~0.1ms       1. Game logic: ~0.1ms
2. Render frame: ~2ms             2. DOM rebuild: ~0.5ms      2. Canvas redraw: ~0.5ms
3. Canvas draw: ~1ms              3. CSS calculate: ~0.2ms    3. Browser paint: ~1ms
4. Browser paint: ~2ms            4. Browser paint: ~1ms      4. Browser paint: ~0.5ms

TOTAL: ~5-6ms per frame           TOTAL: ~1-2ms per frame     TOTAL: ~2-3ms per frame

(headroom: 16ms - 5ms = 11ms)     (headroom: 16ms - 2ms =    (headroom: 16ms - 3ms =
                                  14ms)                        13ms)

Bottleneck: Physics               Bottleneck: DOM when         Bottleneck: Canvas
simulation with many              tile count > 50              draw when many blocks
particles

Memory: ~1-2MB                    Memory: ~500KB                Memory: ~500KB
(particles, beyblades,           (grid array, tile DOM       (blocks array, actions
comic texts, shockwaves)         nodes)                       queue)
```

---

## WHAT TO COPY FROM EACH GAME

### For Grid-Based Games (Snake)
```
✓ COPY FROM TETRIS:
  - Blocks array structure
  - Movement logic (change x/y)
  - Collision detection
  - Input queue system
  - Canvas resize on update
  
✗ DO NOT COPY FROM BEYBLADE:
  - Physics simulation (not needed)
  - Particle system (not needed)
  - Complex state machine
```

### For Physics-Heavy Games (Doodle Jump)
```
✓ COPY FROM BEYBLADE:
  - Entity-based state (useRef)
  - Velocity/acceleration
  - Collision response
  - Particle effects
  
✗ COPY PARTIALLY FROM TETRIS:
  - Canvas structure (yes)
  - Grid-based logic (no, use coords)
  
✗ DO NOT COPY FROM 2048:
  - DOM approach (canvas is better)
  - CSS animations (use code)
```

### For Tile-Based UI Games (2048 variant)
```
✓ COPY FROM 2048:
  - DOM structure
  - CSS classes for styling
  - HTMLActuator pattern
  - Game manager separation
  
✗ DO NOT COPY FROM BEYBLADE:
  - Overkill for simple games
  - Too much state management
```

---

## MINIMUM VIABLE GAME STRUCTURE

### Option A: Tetris Template (Grid-Based)
```javascript
// ~200 lines of code
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
let blocks = [];
let current = {};
let actions = [];

function update(idt) {
  // 1. Process one action
  // 2. Apply gravity
  // 3. Check collisions
  // 4. Check game over
}

function render() {
  ctx.clearRect(0, 0, w, h);
  // Draw grid
  // Draw all blocks
  // Draw current piece
  // Draw score
}

function gameLoop() {
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}
```

### Option B: Beyblade Lite (Physics-Based)
```javascript
// ~300 lines of code (minus particles)
let entity = {x: 0, y: 0, vx: 0, vy: 0, r: 10};
let enemies = [];
let state = "PLAYING";

function update() {
  // 1. Apply forces (gravity, etc.)
  // 2. Update position
  // 3. Collision check
  // 4. Check win/lose
}

function render() {
  ctx.clearRect(0, 0, w, h);
  // Draw background
  // Draw all entities
  // Draw UI
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}
```

---

**Key Insight**: Don't copy Beyblade's entire structure for simple games. Use its patterns (physics, refs, state machines) only when needed.
