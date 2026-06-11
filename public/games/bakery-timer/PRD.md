# Bakery Timer Game — Product Requirements Document

## Overview
**Bakery Timer** is a casual arcade game where players manage a bread baking timer. Players must press the correct button at the exact right moment to pull the bread from the oven. Press too early, too late, or the wrong button, and the bread burns. Simple, addictive, one-minute gameplay.

---

## Game Mechanics

### Core Loop
1. **Game Start**: Timer appears showing "3:00" (3 minutes)
2. **Countdown**: Timer counts down visibly. Background color shifts from cool (blue) → warm (orange/red) as time runs out
3. **Sweet Spot**: Last 5 seconds, timer flashes yellow. This is the "golden window" to pull the bread
4. **Winning Condition**: Player presses **A button** during the 5-second yellow window → "PERFECT! Bread golden & crispy!"
5. **Losing Conditions**:
   - Press A button before yellow window → "TOO EARLY! Bread is raw!"
   - Press A button after timer reaches 0:00 → "TOO LATE! Bread is burnt!"
   - Press B button anytime (wrong button) → "WRONG BUTTON! Bread burns!"
   - Let timer reach 0:00 without pressing → "TOO LATE! Bread is burnt!"

### Visual Feedback
- **Timer Display**: Large, pixelated digital clock (MM:SS format)
- **Color Progression**:
  - 3:00 → 1:30: Cool blue background
  - 1:30 → 0:30: Warm orange background
  - 0:30 → 0:05: Hot red background
  - 0:05 → 0:00: Yellow pulsing flash (sweet spot)
- **Bread Visual**: Loaf icon changes state based on result
  - Normal: Yellow/golden loaf
  - Burnt: Dark brown/charred loaf
  - Raw: Light/pale loaf
  - Perfect: Shiny golden loaf with sparkles

### Game States
1. **Boot/Loading** → 2 sec fade-in
2. **Playing** → Countdown timer, listening for A/B button presses
3. **Result Screen** → Show outcome (Perfect/Burnt/Raw/Wrong), display +10/0 points
4. **Score Screen** → Total score, "Play Again?" prompt (press START to restart, MENU to quit)

---

## Screen Specifications

### HikariBoy Emulator Integration
```
Screen Dimensions:
  - Width: 100% of viewport (390px on iPhone 15)
  - Height: 53% of viewport (447px on iPhone 15)
  - Aspect Ratio: Flexible (game scales to fit)
  - Background: #000 (black)
  - Safe areas: Respected (notch/dynamic island padding)

Rendering Pipeline:
  1. Load HTML (index.html)
  2. Game canvas fills container (100% × 100%)
  3. Game receives button events via postMessage
  4. Signal GAME_LOADED when ready (removes spinner)

Button Mapping:
  - A Button: Pull bread from oven (CORRECT)
  - B Button: Wrong action (BURNS BREAD)
  - START: Restart game / Acknowledge result
  - MENU: Quit to arcade menu
  - D-Pad: Unused (disabled/ignored)
```

### Game Canvas
- **Native Resolution**: 320 × 240 pixels (8-bit arcade style)
- **Aspect Ratio**: 4:3 (will be letterboxed/pillarboxed to fit screen)
- **Rendering**: HTML5 Canvas (2D)
- **Pixel Perfect**: `image-rendering: pixelated` for retro look
- **Frame Rate**: 60 FPS

---

## Game Flow

```
┌─────────────────────────────────────────────┐
│ 1. BOOT SCREEN (2 sec)                      │
│    - Fade in "🍞 BAKERY TIMER"              │
│    - Show subtitle: "Pull at the right time!"│
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│ 2. PLAYING STATE (Timer 3:00 → 0:00)        │
│    - Large timer display (MM:SS)            │
│    - Bread icon center-screen               │
│    - Background color shifts with time      │
│    - Listen for A/B button press            │
│    - 0:05 → 0:00: Yellow flash (sweet spot) │
└────────────────┬────────────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
         ↓                ↓
    A Button         B Button / Timeout
    Pressed         / Wrong Time
         │                │
    ┌────┴────┐      ┌────┴────┐
    │          │      │         │
    ↓          ↓      ↓         ↓
PERFECT!  BURNT!   WRONG!   TOO LATE!
(raw)     (early)  (button) (timeout)
    │          │      │         │
    └────┬─────┴──────┴─────────┘
         │
         ↓
┌─────────────────────────────────────────────┐
│ 3. RESULT SCREEN (3 sec)                    │
│    - Large text: "PERFECT!" / "BURNT!" etc. │
│    - Bread animation (sparkle/smoke)        │
│    - Score: +10 / +0 points                 │
│    - "Press START to Play Again"            │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│ 4. SCORE SCREEN (Persistent)                │
│    - Total Score (can play multiple rounds) │
│    - Bread visual state (final)             │
│    - "Press START to restart"               │
│    - "Press MENU to quit"                   │
└─────────────────────────────────────────────┘
```

---

## Visual Design

### Color Palette
```
Background Gradients (over 3 minutes):
  3:00 - 1:30: #001f4d (dark blue) → #0033cc (blue)
  1:30 - 0:30: #0033cc (blue) → #ff9900 (orange)
  0:30 - 0:05: #ff9900 (orange) → #ff3300 (red)
  0:05 - 0:00: #ffff00 (yellow) PULSING at 2Hz

Text Colors:
  Timer: #ffffff (white) | Shadow: #000000
  Messages: #ffffff (white) | Glow: yellow/red depending on state

Bread States:
  Normal: #f4d03f (golden yellow)
  Burnt: #2c1810 (dark brown)
  Raw: #f5deb3 (wheat/pale)
  Perfect: #ffd700 (shiny gold) + sparkle particles
```

### UI Elements

**Timer Display**
```
┌─────────────────────┐
│                     │
│       3:00          │ ← 140px tall, monospace font
│                     │
│    🍞 BREAD 🍞      │ ← Bread icon (64×64px)
│                     │
└─────────────────────┘
```

**Bread Icon States**
```
Normal (Golden):     ╔════╗
                     ║ 🍞 ║ (stable)
                     ╚════╝

Burnt (Dark):        ╔════╗
                     ║ ◼️  ║ (smoking)
                     ╚════╝

Raw (Pale):          ╔════╗
                     ║ ░░ ║ (raw/pale)
                     ╚════╝

Perfect (Sparkle):   ╔════╗
                     ║✨🍞✨║ (shiny + sparkles)
                     ╚════╝
```

**Result Messages**
```
PERFECT!
(+10 points)

TOO EARLY!
Bread is raw...
(+0 points)

TOO LATE!
Bread is burnt...
(+0 points)

WRONG BUTTON!
Bread burns!
(+0 points)
```

---

## Gameplay Rules

### Timing Windows
```
Timeline:
├─ 3:00 to 0:06: PLAYING (A button press = TOO EARLY)
├─ 0:05 to 0:00: SWEET SPOT (A button press = PERFECT!)
└─ 0:00 onward:  BURNT (automatic loss if not pressed)

Scoring:
  - PERFECT (A during 0:05-0:00): +10 points
  - TOO EARLY (A during 3:00-0:06): +0 points, show "raw" bread
  - TOO LATE (no A by 0:00): +0 points, show "burnt" bread
  - WRONG BUTTON (B anytime): +0 points, show "burnt" bread immediately

Game Sessions:
  - Player can play infinite rounds
  - Score accumulates (total displayed on score screen)
  - Each round: 3-minute timer cycle
```

### Input Validation
```
A Button (Pull Bread):
  - Valid during PLAYING state: Check if in sweet spot (0:05-0:00)
  - Disable after first A press (prevent accidental re-press)
  - Show result immediately

B Button (Wrong):
  - Valid during PLAYING state: Instant loss (BURNT)
  - Ignore in other states

START Button:
  - During RESULT: Restart game (reset timer to 3:00, score persists)
  - During SCORE: Same as RESULT (restart)

MENU Button:
  - Anytime: Close game, return to arcade menu (postMessage to parent)

D-Pad:
  - Ignore (disabled for this game)

Other Buttons (SELECT, L, R):
  - Ignore (unused)
```

---

## Technical Implementation

### Architecture
```
File: public/games/bakery-timer/index.html

Structure:
  - HTML5 Canvas (320×240 native)
  - 2D Context rendering
  - requestAnimationFrame loop (60 FPS)
  - postMessage listener for button events
  - Canvas scaling to fit HikariBoy screen

Key Functions:
  - init() → Setup canvas, timer, listeners
  - update(deltaTime) → Update timer, animations, game state
  - render() → Draw background, timer, bread, messages
  - handleButtonEvent() → Listen for A/B button presses
  - startNewGame() → Reset timer to 3:00, state to PLAYING
  - endGame(result) → Show result screen, transition to score
```

### Game State Machine
```
States:
  BOOT → PLAYING → RESULT → SCORE → PLAYING (loop)
               ↘                  ↗
                → (MENU: close game)

State Transitions:
  BOOT (2 sec) → PLAYING
  PLAYING (button press or timeout) → RESULT
  RESULT (3 sec or START press) → SCORE
  SCORE (START press) → PLAYING (new round)
  SCORE/RESULT (MENU press) → Close (postMessage to parent)
```

### Animation Details
```
Pulsing Flash (0:05 range):
  - Frequency: 2 Hz (500ms on, 500ms off)
  - Opacity: 100% → 50% → 100%
  - Color: #ffff00 (yellow)

Sparkle Effect (PERFECT result):
  - 4-8 sparkle particles emitted from bread
  - Duration: 1 second
  - Fade out: Linear
  - Movement: Random X/Y velocity

Smoke Effect (BURNT result):
  - 3-5 smoke puffs rise from bread
  - Duration: 1.5 seconds
  - Color: #333333 (dark gray)
  - Fade: Opacity 1 → 0

Background Transition:
  - Smooth gradient shift over 3 minutes
  - No sudden color jumps
  - Easing: Linear (proportional to time)
```

---

## Assets Required

### Graphics (Pixel Art, 8-bit style)
- Bread loaf sprite (64×64): 4 states (normal, raw, burnt, perfect)
- Sparkle particles (8×8, 16×16): 4-frame animation
- Smoke puffs (16×16): 3-frame animation
- Font: Monospace pixel font (for timer display)
- Background: Solid color (generated via CSS/canvas gradient)

### Audio (Optional, but recommended)
- Oven door open (short, 0.2s): When A pressed during sweet spot
- Burn sizzle (1s): When bread burns
- Raw/undercooked sound (short, 0.3s): When A pressed too early
- Beep warning (0.1s): Each second in last 5 seconds
- Retro "victory" chime (1s): PERFECT result
- Game over buzz (0.5s): BURNT/WRONG result

---

## Success Criteria

### Functional
- [ ] Timer counts down accurately (3:00 → 0:00)
- [ ] A button press during 0:05-0:00 range registers as PERFECT
- [ ] A button press outside sweet spot registers as TOO EARLY/TOO LATE
- [ ] B button press anytime registers as WRONG BUTTON
- [ ] Background color transitions smoothly through 3-minute cycle
- [ ] Yellow flash pulses at 2 Hz during last 5 seconds
- [ ] Result screen displays correctly for all outcomes
- [ ] Score accumulates across multiple rounds
- [ ] START button restarts game (clears timer, keeps score)
- [ ] MENU button closes game and returns to arcade
- [ ] postMessage GAME_LOADED fires when ready

### UX
- [ ] Timer is readable (large, high contrast)
- [ ] Sweet spot is visually obvious (yellow flash)
- [ ] Result messages are clear and immediate
- [ ] Bread state changes are visually satisfying
- [ ] Animations are smooth (no jank at 60 FPS)
- [ ] Controls are responsive (< 100ms latency)
- [ ] Safe areas respected (no text/buttons cut off by notch)

### Performance
- [ ] Game runs at 60 FPS consistently
- [ ] No memory leaks (can play multiple rounds)
- [ ] Canvas scales correctly to fit HikariBoy screen
- [ ] postMessage latency < 50ms

---

## Deployment

### File Structure
```
public/games/bakery-timer/
├── index.html          (Main game file)
├── PRD.md              (This document)
└── assets/ (optional)
    ├── sprites.png     (Bread states, particles)
    └── audio/          (Sound effects)
```

### Integration with HikariBoy
1. Register in `src/components/HikariBoy/HikariBoy.jsx` GAMES array:
   ```javascript
   { id: 'bakery-timer', name: 'Bakery Timer', cover: '/games/bakery-timer/cover.webp', url: '/games/bakery-timer/index.html', proOnly: false }
   ```
2. Add cover image: `public/games/bakery-timer/cover.webp` (320×240px)
3. Deploy to `/public/games/bakery-timer/index.html`

### Testing Checklist
- [ ] Load game in HikariBoy emulator
- [ ] Timer counts down correctly
- [ ] A button during sweet spot triggers PERFECT
- [ ] B button triggers WRONG immediately
- [ ] Score persists across rounds
- [ ] MENU button closes game
- [ ] No console errors
- [ ] Tested on iPhone 12/13/14/15 (all sizes)
- [ ] Tested on Android Chrome
- [ ] Safe areas work correctly

---

## Development Notes

### Canvas Scaling Strategy
- **Native**: 320×240 (pixel-perfect retro aesthetic)
- **HikariBoy Screen**: Variable (390×447 on iPhone 15, scales with device)
- **Scaling Method**: Maintain aspect ratio, center on canvas, use `pixelated` rendering
- **Font**: Use monospace pixel font (system monospace or bitmap font)

### Timer Accuracy
- Use `performance.now()` for delta-time, not fixed frame rate
- Timer should drift < 100ms over 3 minutes
- Consider using `setInterval` as backup if canvas frame rate stutters

### Button Event Handling
```javascript
window.addEventListener('message', (e) => {
  const { type, button } = e.data;
  if (type === 'BUTTON_PRESS' && button === 'a') {
    // Check if in sweet spot
    if (timerSeconds >= 0 && timerSeconds <= 5) {
      endGame('PERFECT');
    } else if (timerSeconds > 5) {
      endGame('TOO_EARLY');
    }
  }
  if (type === 'BUTTON_PRESS' && button === 'b') {
    endGame('WRONG_BUTTON');
  }
});
```

### Signaling Game Load
```javascript
window.addEventListener('load', () => {
  // Game is ready, signal to parent
  window.parent.postMessage({ type: 'GAME_LOADED' }, '*');
});
```

---

## Future Enhancements (Post-MVP)

- [ ] Difficulty levels (faster timers, shorter sweet spot)
- [ ] Leaderboard (local high score storage)
- [ ] Multiple bread types (croissant, baguette, sourdough) with different timers
- [ ] Tutorial/how-to-play screen
- [ ] Sound effects (ding on perfect, sizzle on burnt)
- [ ] Combo system (consecutive perfects = bonus multiplier)
- [ ] Visual feedback for button presses (glow/flash on screen)

---

**Document Version**: 1.0  
**Status**: Ready for Development  
**Estimated Dev Time**: 4-6 hours (HTML5 Canvas, no external libraries)
