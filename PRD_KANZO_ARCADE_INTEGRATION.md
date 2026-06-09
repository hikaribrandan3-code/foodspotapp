# PRD: Kanzo — The Last Samurai → FoodSpot Arcade Integration
**Date:** 2026-06-09  
**Status:** Ready for Development  
**Priority:** High  

---

## OVERVIEW

Integrate "Kanzo — The Last Samurai" (an existing HTML5 canvas game) into the FoodSpot Arcade system as a new unlockable game. The game must match the exact format of existing arcade games (Burger Stack, Bubble Tea Blast, Hikari Billiards) — full-screen canvas on top, virtual controller on bottom.

---

## SOURCE FILES

**Game source:**
```
/tmp/natsucogamefolder/NatsuCo Final game host /Kanzothelastsamarui/Kanzothelastsamurifinal.html
```

**Existing arcade games (reference implementation):**
```
/Users/daiskebrandan/Downloads/foodspotapp-main/public/games/burger-stack/
/Users/daiskebrandan/Downloads/foodspotapp-main/public/games/bubble-tea/
/Users/daiskebrandan/Downloads/foodspotapp-main/public/games/pool/
```

**Arcade game registry:**
```
/Users/daiskebrandan/Downloads/foodspotapp-main/public/antigravity-registry.json
```

**Arcade launcher:**
```
/Users/daiskebrandan/Downloads/foodspotapp-main/foodspot-arcade/scripts/game-launcher.js
```

---

## CURRENT GAME STATE (What We See)

When opened in browser at localhost:8000, Kanzo currently shows:
- ✅ Game canvas (left ~40% of screen) — pixel art samurai game
- ✅ Working gameplay (Wave, Score, Ammo, HP HUD)
- ✅ Music running
- ❌ Built-in on-screen buttons (LIGHT/HEAVY/GUN/SPIN circles on right side)
- ❌ Built-in D-PAD arrows (bottom left)
- ❌ Black void on right side of screen (canvas too small)
- ❌ Player can walk off-screen (no boundary enforcement)
- ❌ Canvas not sized for arcade format

---

## TARGET STATE (What We Need)

Single self-contained `index.html` file at:
```
/Users/daiskebrandan/Downloads/foodspotapp-main/public/games/kanzo/index.html
```

That matches FoodSpot arcade format exactly like the other games.

---

## TECHNICAL REQUIREMENTS

### 1. FILE FORMAT
- **Single standalone HTML file** — no external dependencies
- **WebP game chip image** embedded or referenced as `cover.webp`
- **No React, no Vite, no TypeScript** — pure HTML/CSS/JS
- **Self-contained** — must work when served from any static host

### 2. CANVAS LAYOUT
```
┌─────────────────────────────────┐
│                                 │
│         GAME CANVAS             │  ← Top 55% of screen
│         (360 × 320px)           │
│                                 │
├─────────────────────────────────┤
│                                 │
│      VIRTUAL CONTROLLER         │  ← Bottom 45% of screen
│   [D-PAD]           [A] [B]    │
│              [LT] [RT]          │
│                                 │
└─────────────────────────────────┘
```

### 3. REMOVE FROM ORIGINAL GAME
- ❌ Remove: LIGHT/HEAVY/GUN/SPIN button circles (right side)
- ❌ Remove: Built-in D-PAD arrows (bottom left)
- ❌ Remove: Any built-in touch controls
- ✅ Keep: HUD (Wave, Score, Ammo, HP) — top-left positioning
- ✅ Keep: All game logic untouched
- ✅ Keep: Music/audio system

### 4. CONTROLLER WIRING

Build new virtual controller that sends these inputs to the game:

| Controller Button | Game Action | Original Key |
|---|---|---|
| D-PAD UP | Move up | ArrowUp |
| D-PAD DOWN | Move down | ArrowDown |
| D-PAD LEFT | Move left | ArrowLeft |
| D-PAD RIGHT | Move right | ArrowRight |
| A Button (red) | LIGHT attack | `z` or existing LIGHT touch |
| B Button (grey) | HEAVY attack | `x` or existing HEAVY touch |
| Left Trigger | GUN | `a` or existing GUN touch |
| Right Trigger | SPIN | `s` or existing SPIN touch |

**Implementation:** Wire by dispatching `KeyboardEvent` (keydown/keyup) OR by directly calling the game's existing touch handler functions — check which pattern the existing arcade games use.

### 5. PLAYER BOUNDARY FIX
- Player character must not walk off the visible canvas area
- Canvas width: 360px, Canvas height: 320px
- Add boundary clamp: `playerX = Math.max(0, Math.min(360, playerX))`
- Add boundary clamp: `playerY = Math.max(0, Math.min(320, playerY))`

### 6. CANVAS SCALING
- Original game: 360×640 (portrait, full phone screen)
- Target: 360×320 (top half only)
- Scale game world: `scaleY = 320/640 = 0.5`
- OR: Use CSS transform `scale(0.5)` on canvas with `transform-origin: top left`
- OR: Change canvas render height and let game reflow
- **Check existing games** for which scaling method they use — match exactly

### 7. HUD ADJUSTMENT
After canvas resize, ensure:
- Wave/Score/Ammo/HP text stays visible and doesn't clip
- Font size stays readable at new scale
- No HUD elements hidden behind controller area

---

## CONTROLLER UI SPEC

Match the exact visual style of existing FoodSpot arcade controllers. Reference:
```
/Users/daiskebrandan/Downloads/foodspotapp-main/public/games/burger-stack/index.html
```

**D-PAD:**
- Cross-shaped, 4 directional buttons
- Dark background (#1a1a2e or match existing)
- Chevron icons for arrows
- Positioned bottom-left

**Action Buttons (A/B):**
- A = Red circle, large, labeled "A"
- B = Dark grey circle, large, labeled "B"  
- Diagonal layout (B lower-left, A upper-right)
- Positioned bottom-right

**Triggers (LT/RT):**
- Two rectangular buttons above action buttons
- LT = Left Trigger
- RT = Right Trigger
- Smaller than A/B buttons
- Labeled "LT" and "RT"

---

## GAME CARD / CHIP IMAGE

**File:** `cover.webp` (user will provide this)  
**Location:** `public/games/kanzo/cover.webp`  
**Usage:** Shown in arcade game selection carousel  
**Format:** WebP (for fast loading)

---

## ARCADE REGISTRY ENTRY

Add to `public/antigravity-registry.json`:
```json
{
  "id": "kanzo",
  "title": "Kanzo: Last Samurai",
  "description": "Survive endless waves as the last samurai standing",
  "category": "arcade",
  "cover": "/games/kanzo/cover.webp",
  "path": "/games/kanzo/index.html",
  "unlocked": true,
  "controls": {
    "dpad": true,
    "buttons": ["A", "B"],
    "triggers": ["LT", "RT"]
  }
}
```

---

## ACCEPTANCE CRITERIA

- [ ] Game loads at `public/games/kanzo/index.html` with no errors
- [ ] Canvas fits in top 55% of screen (360×320)
- [ ] Virtual controller renders in bottom 45%
- [ ] D-PAD moves player correctly (up/down/left/right)
- [ ] A button triggers LIGHT attack
- [ ] B button triggers HEAVY attack
- [ ] LT button fires GUN
- [ ] RT button triggers SPIN
- [ ] Player cannot walk off visible canvas
- [ ] HUD (Wave/Score/Ammo/HP) is visible and readable
- [ ] Music plays on first interaction
- [ ] No built-in buttons visible (original controls removed)
- [ ] Loads in < 2 seconds (no large external dependencies)
- [ ] Works on mobile (375px width minimum)
- [ ] Game chip image shows in arcade carousel
- [ ] Arcade registry updated with Kanzo entry

---

## REFERENCE FILES TO CHECK BEFORE CODING

Before writing any code, read these files to match existing patterns:

1. `public/games/burger-stack/index.html` — controller layout reference
2. `public/games/bubble-tea/index.html` — canvas sizing reference  
3. `public/antigravity-registry.json` — registry format
4. `foodspot-arcade/scripts/game-launcher.js` — how games are loaded
5. `NatsuCo Final game host /Kanzothelastsamarui/Kanzothelastsamurifinal.html` — source game

---

## OUT OF SCOPE

- No music changes (keep original soundtrack)
- No art changes (keep original pixel art)
- No game logic changes (keep waves, enemies, scoring as-is)
- No new game mechanics
- No leaderboard integration (Phase 2)
- No other NatsuCo games (Chocapinto, Motochoro, Tokotoko = separate PRDs)

---

## NOTES

- The game currently has a **black void** on the right side in desktop view — this is fine, mobile is the target
- Original game uses **360×640 portrait** format — we're splitting it to top half only
- Existing FoodSpot arcade games are all **standalone HTML** — match this exactly
- Game chip image will be provided by user as **WebP format**
