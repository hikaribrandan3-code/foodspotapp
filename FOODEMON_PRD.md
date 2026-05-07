# FOODEMON - Product Requirements Document
## A Food-Themed Creature Collection Battle Game

**Version:** 1.0  
**Date:** 2026-05-06  
**Status:** Ready for AI Studio Implementation  
**Target Platform:** Web (Canvas-based, responsive 320x240 or 480x272)

---

## EXECUTIVE SUMMARY

Foodemon is a food-themed creature collection and battle game inspired by Pokémon Emerald with modern enhancements. Players capture, train, and battle food-type creatures across a grid-based world. Core gameplay loop: explore → capture with pokéballs → build team → battle opponents → evolve creatures.

**Primary Goal:** Ship a fully playable single-player demo with 25 creatures, capture mechanics, 4-move combat system, and creature swapping within 6-8 weeks.

---

## TECHNICAL STACK (EXACT SPECIFICATIONS)

### Frontend Framework
- **Engine:** Canvas (HTML5) + Vanilla JavaScript (no frameworks initially)
- **Build Tool:** Vite (same as main app)
- **Resolution:** 320x240 (pixel-perfect, Game Boy Advance-era) with 2x scaling for modern screens = 640x480 displayed
- **Alternative:** 480x272 if more visual detail needed (up to team preference)
- **Responsive:** CSS media queries to scale for mobile/tablet/desktop

### State Management
- **Pattern:** Vanilla JS object-based state (no Redux/Zustand needed at this scope)
- **Persistence:** localStorage for save game data (creature roster, items, progress)
- **Data Format:** JSON serialization for creature stats, moves, inventory

### Graphics & Animation
- **Sprite Format:** PNG with transparency, 32x32 or 64x64 base sprites (depending on resolution choice)
- **Animation Library:** None required - use frame-by-frame sprite sheets + requestAnimationFrame for movement/attack animations
- **UI Rendering:** Canvas-based or lightweight HTML/CSS overlay for menus
- **Art Style:** Pokémon Emerald-inspired (16-bit pixel art) with potential for 32-bit modern pixel art if budget allows

### Audio
- **Format:** WebAudio API for sound effects (buzzer for menu, chime for capture, attack sounds)
- **Music:** Background loop (1 track for exploration, 1 for battle) - simple synthesized or royalty-free
- **Implementation:** Lazy-load audio on first user gesture (iOS Safari compatibility)

### Game Logic Libraries
- **None required** - build collision, turn-based battle, AI decision-making from scratch
- **Optional:** Use simple easing functions for animations (cubic-bezier via CSS or requestAnimationFrame)

### Backend Integration
- **Save Sync:** Optional Supabase integration (same project as foodspotapp) for cloud saves
- **Leaderboard:** Not in initial MVP (local storage only)
- **Analytics:** Track creature captures via Supabase edge function (non-blocking)

### Development Environment
- **Language:** JavaScript (ES2020+ syntax supported)
- **Testing:** Manual QA + simple debug console
- **Deployment:** Served from `/public/games/foodemon/index.html` in Vite build
- **Performance Target:** 60 FPS at 320x240, <2MB bundle size

---

## GAME OVERVIEW

### Setting & Narrative
- **World:** Food Kingdom - a colorful dimension inhabited by sentient food creatures
- **Objective:** Catch 25 unique Foodemon, train them, and defeat 5 gym leaders
- **Progression:** Linear → 5 areas → 5 gym leaders → final boss (Champion)

### Core Loop
1. **Explore** - Move through grid-based world (arrow keys / D-pad)
2. **Encounter** - Random wild Foodemon appear during exploration
3. **Catch** - Use pokéballs to capture (accuracy-based mechanic)
4. **Train** - Level up captured creatures, learn new moves
5. **Battle** - Turn-based 1v1 fights vs wild Foodemon or gym leaders
6. **Swap** - Switch active Foodemon mid-battle or in party
7. **Repeat** - Continue until all 5 gym leaders defeated

### Battle System
- **Turn-Based:** Player selects move/swap/item/run each turn
- **Accuracy:** Each move has 70-100% hit chance (shown in UI)
- **Type Advantage:** (Optional MVP) Food types don't have traditional rock-paper-scissors; focus on move effects instead
- **Status Effects:** Possible (burn, poison) - keep simple for MVP
- **HP System:** Whole numbers, no fractional HP
- **Experience:** Win = +50-100 XP, level up every 100 XP (levels 1-50 max)

### Capture Mechanic
- **Probability:** Based on current HP of wild Foodemon
  - HP < 30% = 60% catch chance
  - HP 30-60% = 40% catch chance
  - HP > 60% = 20% catch chance
- **Pokéball Types:** (3 variants)
  - Standard: 1x multiplier
  - Great: 1.5x multiplier
  - Ultra: 2x multiplier
- **Shaking Animation:** 3 shake frames, catch or escape on 4th frame
- **Audio:** Chime on successful catch, buzz on escape

---

## CREATURES (FOODEMON) - FULL LIST (25 TOTAL)

### Format Per Creature:
- **Name** | Type | Rarity | Base Stats (HP/ATK/DEF/SPA/SPD) | Signature Move | Locations

---

### TYPE 1: BREAD (5 creatures)

1. **Crumbkin** | Bread | Common | 35/40/35/25/35 | Crumb Toss (Normal) | Forest, Meadow
2. **Toastling** | Bread | Common | 45/45/40/30/40 | Toast Bite (Normal) | Meadow, Village
3. **Bagueton** | Bread | Uncommon | 55/60/50/35/45 | Crust Strike (Normal) | Forest, Mountain
4. **Loafure** | Bread | Uncommon | 60/55/55/40/50 | Soft Touch (Normal) | Mountain, Castle
5. **🌟 Sourdough Supreme** | Bread | SUPER RARE (1% encounter) | 85/75/80/70/65 | Golden Crust (Special) | Any location (ultra-rare)

---

### TYPE 2: FRUIT (5 creatures)

1. **Strawbud** | Fruit | Common | 38/35/38/32/40 | Berry Peck (Normal) | Orchard, Meadow
2. **Applecore** | Fruit | Common | 42/42/42/35/42 | Seed Bomb (Grass) | Orchard, Forest
3. **Bananion** | Fruit | Uncommon | 52/65/48/40/50 | Peel Slash (Normal) | Orchard, Mountain
4. **Citrusian** | Fruit | Uncommon | 58/45/52/62/58 | Acid Spray (Special) | Coast, Orchard
5. **🌟 Tropical Oasis** | Fruit | SUPER RARE (1% encounter) | 88/70/75/85/70 | Harvest Storm (Special) | Any location (ultra-rare)

---

### TYPE 3: MEAT (5 creatures)

1. **Chickling** | Meat | Common | 40/45/38/28/38 | Peck Strike (Normal) | Farm, Village
2. **Beefcalf** | Meat | Common | 48/58/42/32/40 | Horn Charge (Normal) | Farm, Mountain
3. **Piggston** | Meat | Uncommon | 54/62/50/35/48 | Tusks Swipe (Normal) | Farm, Forest
4. **Lambwise** | Meat | Uncommon | 62/58/55/45/52 | Wool Shield (Defense) | Pasture, Mountain
5. **🌟 Prime Cut Executioner** | Meat | SUPER RARE (1% encounter) | 90/95/70/55/65 | Carnage (Physical) | Any location (ultra-rare)

---

### TYPE 4: SWEETS (5 creatures)

1. **Candybud** | Sweets | Common | 35/25/35/50/40 | Sugar Rush (Special) | Candy Shop, Village
2. **Chocolate Nugget** | Sweets | Common | 42/40/45/55/42 | Fudge Beam (Special) | Candy Shop, Town
3. **Caramelion** | Sweets | Uncommon | 52/48/55/65/50 | Melted Flow (Special) | Candy Shop, Desert
4. **Macaronoir** | Sweets | Uncommon | 58/50/60/70/55 | Almond Dust (Special) | Desert, Town
5. **🌟 Royal Tiramisu** | Sweets | SUPER RARE (1% encounter) | 92/60/80/95/75 | Decadence (Special) | Any location (ultra-rare)

---

### TYPE 5: BEVERAGE (5 creatures)

1. **Droplette** | Beverage | Common | 40/30/40/45/38 | Splash (Water) | Lake, River
2. **Bubbly** | Beverage | Common | 42/35/42/52/48 | Fizz Pop (Special) | Lake, Coast
3. **Chillshake** | Beverage | Uncommon | 54/42/50/60/55 | Freeze Slush (Special) | Lake, Glacier
4. **Espressolade** | Beverage | Uncommon | 60/48/45/70/65 | Energy Surge (Special) | City, Café
5. **🌟 Mythical Matcha Elixir** | Beverage | SUPER RARE (1% encounter) | 88/55/75/92/88 | Ancient Brew (Special) | Any location (ultra-rare)

---

## CORE MECHANICS

### 1. MOVEMENT & EXPLORATION
- **Grid-Based:** 16x12 tile world (320x240) or 20x15 (480x272)
- **Input:** Arrow keys or D-pad (gamepad support for HikariBoy shell)
- **Speed:** 1 tile = ~200ms walk animation
- **Collision:** Solid tiles (trees, buildings) block movement
- **Random Encounters:** 20% chance per step in tall grass/caves (1-3 second cooldown between encounters)

### 2. BATTLE SYSTEM (DETAILED)

#### Turn Structure
1. **Player Action Selection** (2 second timeout if no input)
   - Move 1-4: Execute attack
   - Swap: Switch active Foodemon
   - Item: Use from inventory
   - Run: Escape wild battle only (80% success vs gym leaders = 100% if faster)

2. **AI Decision** (opponent picks move)
   - Simple AI: 50% use best move, 30% random move, 20% status move

3. **Speed Check:** Higher SPD stat goes first (if tied, coin flip)

4. **Resolve Actions:**
   - Damage = (Attacker ATK × Move Power ÷ Defender DEF) × accuracy
   - Apply status effect if move has effect
   - Check faint condition
   - Award XP if opponent fainted

#### Move System (4 moves max per creature)
Each move has:
- **Name** (string)
- **Power** (15-120, physical or special)
- **Accuracy** (70-100%)
- **PP** (Power Points: 10-35 uses per battle)
- **Effect** (damage, status, stat change, or heal)
- **Animation Frame Count** (4-12 frames for attack animation)

**Example Moves:**
- Crumb Toss (15 PWR, 100 ACC, Normal type, animation: 6 frames)
- Tackle (40 PWR, 100 ACC, Normal type, animation: 8 frames)
- Ember (50 PWR, 100 ACC, Fire type, applies burn (30% chance), animation: 10 frames)
- Synthesis (0 PWR, heal 50% HP, animation: 8 frames)

### 3. POKÉBALL CAPTURE MECHANIC

#### Capture Attempt
1. Select pokéball from inventory
2. Enter mini-game: Press A button 3 times during shake animation
   - Timing window: ±200ms per button (5 frames @ 60FPS)
3. Shake sequence: 3 shakes, final "click" sound
4. Outcome:
   - Success → Creature added to roster, remove 1 pokéball
   - Fail → Pokéball consumed, creature breaks free, escapes

#### Probability Calculation
```
catch_chance = (base_catch_rate × hp_modifier × ball_modifier) / 255
- base_catch_rate = 45 (default for most creatures)
- hp_modifier = 1.0 (HP > 60%), 1.5 (HP 30-60%), 2.0 (HP < 30%)
- ball_modifier = 1.0 (standard), 1.5 (great), 2.0 (ultra)
```

### 4. CREATURE SWAPPING
- **In Battle:** Select Swap action, choose from roster (alive creatures only if in gym battle)
- **In Party Menu:** Drag/click to reorder active team
- **Active Team Limit:** 6 creatures max (like Pokémon)

### 5. ITEMS & INVENTORY
- **Pokéballs:** Standard, Great, Ultra (consumable)
- **Potions:** Restore 20/50/100 HP
- **Revive:** Restore fainted creature with 50% HP
- **Status Healers:** Antidote (poison), Burn Heal, etc.
- **Inventory Limit:** 99 of each item type
- **Acquisition:** Find in overworld (chest sprites), defeat gym leaders, or buy at Poké Mart (if implemented)

### 6. LEVEL UP & EVOLUTION
- **XP Gain:** +50 XP per wild battle, +100 XP per gym leader battle
- **Level Up:** Every 100 XP = +1 level (max 50)
- **Stat Growth:** Fixed growth per level (no IVs/EVs for MVP)
- **New Moves:** Learn 1-2 new moves at levels 10, 20, 30, 40, 50
- **Evolution:** (Optional MVP) Skip for initial release; add in v1.1
- **Rare Evolution Path:** 🌟 creatures don't evolve (already final form)

---

## USER INTERFACE

### Main Menu
- **New Game** button
- **Continue** button (if save exists)
- **Settings** (volume, fullscreen toggle)
- **Credits**
- Render: Simple centered buttons with food-themed background art

### Overworld HUD
- **Top-Left:** Party display (6 creature icons + current HP bar)
- **Top-Right:** Money counter, pokéball count
- **Bottom:** Current tile type, FPS counter (debug only)
- **Minimal:** No quest log or map (keep simple for MVP)

### Battle UI
- **Left Side:** Player's active creature (sprite, name, HP bar, level)
- **Right Side:** Opponent's active creature (sprite, name, HP bar)
- **Bottom:** 4 move buttons OR Swap/Item/Run options
- **Center-Top:** Floating damage numbers (pop-up text during attacks)
- **Message Box:** "Crumbkin used Crumb Toss!" style text

### Pokéball Capture Screen
- **Center:** Wild creature sprite + name + level
- **Bottom:** "Press A! Press A! Press A!" (3 shake frames)
- **Audio Cue:** Click-click-click during shakes

### Menus (Party, Items, Settings)
- **Grid or List Layout:** 8px padding, 12px font size
- **Selection Indicator:** Highlighted cell with color inversion or arrow
- **Navigation:** Arrow keys, Enter/A to select, Escape/B to back

---

## GRAPHICS & ANIMATION SPECIFICATIONS

### Art Direction
- **Style:** Pokémon Emerald-inspired 16-bit pixel art (32x32 or 64x64 sprites)
- **Alternative:** Modern 32-bit pixel art if time permits (cleaner lines, more detail)
- **Palette:** Vibrant food colors (strawberry red, banana yellow, bread brown, etc.)
- **World Tiles:** 16x16 grass, forest, mountain, water, building tiles

### Sprite Sheets
- **Creature Idle:** 4-frame loop (standing, slight sway)
- **Creature Walk:** 6-frame loop (left leg, center, right leg, center, repeat)
- **Creature Attack:** 4-8 frame animation (windup, strike, return)
- **Creature Faint:** 4-frame fade-out animation
- **Player Character:** 16-frame walk animation (4 directions × 4 frames each)

### Attack Animations
- **Melee (Crumb Toss, Peck Strike):** Projectile sprite flies across screen (12 frames)
- **Special (Sugar Rush, Ember):** Particle effect burst at opponent (8 frames)
- **Healing (Synthesis):** Green glow around creature (6 frames)
- **Status (Burn):** Small flame icon appears on opponent (persistent until healed)

### UI Assets Needed
- 5×5 pokéball icon variants (standard, great, ultra, empty, plus sign)
- 25 creature portrait icons (64x64 for party display)
- 25 full battle sprites (128x128 for left/right battle positions)
- Menu cursors, buttons, backgrounds
- Tile set for 5 biomes (grass, forest, mountain, water, building)

---

## AUDIO SPECIFICATIONS

### Sound Effects (16 required)
1. **Menu Navigation:** Beep (100ms sine wave, 800Hz)
2. **Menu Confirm:** Chime (200ms, 3-note rising)
3. **Battle Start:** Dramatic chord (500ms)
4. **Attack Hit:** Impact sound (150ms, white noise burst)
5. **Attack Miss:** Whoosh (200ms, descending pitch)
6. **Creature Faint:** Sad trombone (300ms)
7. **Pokéball Shake:** Click × 3 (100ms each)
8. **Pokéball Catch:** Success jingle (400ms, major chord)
9. **Pokéball Escape:** Escape buzz (300ms, descending)
10. **XP Gain:** Ding (100ms, rising pitch)
11. **Level Up:** Fanfare (500ms, 4-note major scale)
12. **HP Restore:** Sparkle (200ms, gentle chime)
13. **Damage Taken:** Hurt sound (150ms, low tone)
14. **Status Applied:** Tick-tick (100ms × 2)
15. **Menu Back:** Soft beep (150ms)
16. **Item Use:** Shimmer (200ms)

### Music (2 tracks minimum)
1. **Exploration Theme:** 60-90 second loop, upbeat, food-themed, 8-bit style
2. **Battle Theme:** 60-90 second loop, intense, epic, 8-bit style

**Format:** Web Audio API synthesis (generate via code) OR pre-recorded .ogg/.mp3 files (8-bit synthesized to match art style)

---

## PERFORMANCE REQUIREMENTS

- **Target:** 60 FPS at 320x240 (640x480 scaled 2x)
- **Bundle Size:** <2 MB gzipped (including sprites, sounds, fonts)
- **Memory:** <50 MB total (creatures, world, assets in RAM)
- **Load Time:** <2 seconds from initial load to playable menu
- **No Canvas Flicker:** Use double-buffering (drawImage to offscreen canvas, then blit to main)
- **Collision Detection:** Simple AABB (axis-aligned bounding box) per tile
- **Rendering:** Dirty rect optimization (only redraw changed tiles)

---

## SAVE GAME FORMAT

```json
{
  "playerName": "Trainer",
  "level": 15,
  "money": 2500,
  "playTime": "4:32",
  "badges": 2,
  "party": [
    {
      "id": "crumbkin-1",
      "name": "Crumbkin",
      "baseCreature": "crumbkin",
      "level": 18,
      "currentHP": 45,
      "maxHP": 50,
      "exp": 1200,
      "moves": ["crumb-toss", "tackle", "rest"],
      "status": "none"
    }
    // ... 5 more creatures
  ],
  "roster": [
    // All caught creatures not in active party
    { "name": "Toastling", "level": 10, "exp": 200 }
  ],
  "inventory": {
    "pokeballs": 20,
    "great-balls": 5,
    "ultra-balls": 2,
    "potion": 3,
    "revive": 1
  },
  "locationX": 5,
  "locationY": 7,
  "mapID": "meadow",
  "islandProgress": [
    { "name": "Breadlands", "completed": true, "leader": "Baker Blanche" },
    { "name": "Fruit Valley", "completed": true, "leader": "Orchardist Owen" }
  ]
}
```

---

## DELIVERABLES & TIMELINE

### Phase 1: Core Foundation (Weeks 1-2)
- [ ] Canvas engine setup + tile rendering
- [ ] Player movement (grid-based, collision detection)
- [ ] Random encounter system
- [ ] Save/load system (localStorage)

### Phase 2: Battle System (Weeks 2-3)
- [ ] Turn-based battle loop
- [ ] Move selection + execution
- [ ] Damage calculation + HP tracking
- [ ] Battle UI rendering
- [ ] AI opponent decision-making

### Phase 3: Capture & Creatures (Weeks 3-4)
- [ ] Pokéball capture mini-game
- [ ] Creature roster management
- [ ] Creature swapping mechanic
- [ ] 25 creature data definitions + stats balancing

### Phase 4: Graphics & Animation (Weeks 4-5)
- [ ] Sprite rendering (idle, walk, attack animations)
- [ ] Attack animation sequences
- [ ] UI asset rendering (buttons, menus, HUD)
- [ ] Particle effects for status + moves

### Phase 5: Audio & Polish (Weeks 5-6)
- [ ] Sound effects (16 total)
- [ ] Background music loops
- [ ] Menu navigation sounds
- [ ] Battle SFX integration
- [ ] Audio context unlock for iOS

### Phase 6: Levels & Content (Weeks 6-7)
- [ ] 5 world maps (biomes)
- [ ] 5 gym leader encounters
- [ ] Item placement + Poké Marts (optional)
- [ ] Level progression tuning

### Phase 7: Testing & Refinement (Week 7-8)
- [ ] QA pass (balance, difficulty, bugs)
- [ ] Mobile responsiveness testing (iPhone, Android)
- [ ] Performance profiling + optimization
- [ ] Final polish (menus, transitions, feedback)

---

## STRETCH GOALS (Post-MVP)

1. **Creature Evolution:** Add 10-15 evolved forms
2. **Type Advantage System:** Rock-paper-scissors food type matchups
3. **Move Learning:** Creatures learn moves from TMs (Technical Machines)
4. **Trading:** (Requires backend) Trade creatures with other players
5. **Multiplayer Battles:** (Requires backend) Real-time PvP
6. **Leaderboard:** Track top trainers (requires Supabase integration)
7. **Creatures Evolution Tree Display:** Show all possible evolutions
8. **Held Items:** Creatures hold items that boost stats or trigger abilities
9. **Ability System:** Each creature has a passive ability (e.g., "Overgrow" = +50% Grass move power at low HP)
10. **Status Moves:** Non-damaging moves like "Toxic Spikes," "Stealth Rock"

---

## TECHNICAL NOTES FOR AI STUDIO

### Key Constraints
- **No External Dependencies:** Use vanilla Canvas + Web Audio API only (no Phaser, Babylon, Three.js)
- **Accessibility:** Keyboard + Gamepad support (for HikariBoy shell integration)
- **Responsive:** Scale gracefully to 320x240, 480x272, and 1920x1080
- **Offline:** Game runs entirely client-side (optional cloud save to Supabase)
- **Browser Compat:** Chrome, Safari, Firefox (no IE11)

### Code Structure Recommendation
```
/public/games/foodemon/
├── index.html              (entry point)
├── style.css               (responsive UI)
├── game.js                 (main game loop, state)
├── battle.js               (battle system logic)
├── creatures.js            (25 creature definitions)
├── moves.js                (all move definitions)
├── world.js                (map data, collision, NPCs)
├── render.js               (Canvas drawing functions)
├── audio.js                (sound + music engine)
├── save.js                 (localStorage persistence)
├── assets/
│   ├── sprites/            (creature + player sprites)
│   ├── tiles/              (world tileset)
│   ├── ui/                 (buttons, menus, icons)
│   └── sounds/             (SFX + music files)
└── data/
    ├── creatures.json      (creature stats)
    ├── moves.json          (move definitions)
    └── maps.json           (world data)
```

### Performance Profiling Checklist
- [ ] 60 FPS at 320x240 (use Chrome DevTools performance tab)
- [ ] Memory <50 MB (measure during gameplay)
- [ ] No garbage collection spikes (GC pause < 16ms)
- [ ] Load time <2 seconds (with preloading)
- [ ] Battle turn resolution < 100ms

---

## APPENDIX: CREATURE STAT EXAMPLES

### Stat Ranges (for AI to understand balance)
- **HP:** 35-92 (growth: +0.5-1.5 per level)
- **Attack:** 25-95 (physical move users)
- **Defense:** 35-80 (tank creatures)
- **Sp. Atk:** 25-95 (special move users)
- **Speed:** 35-90 (determines turn order)

### Stat Distribution Examples
- **Attacker:** Beefcalf (48/58/42/32/40) = Physical glass cannon
- **Defender:** Loafure (60/55/55/40/50) = Tanky balanced
- **Special:** Espressolade (60/48/45/70/65) = Sp. Atk + Speed focus
- **Speed:** Bubbly (42/35/42/52/48) = Fast special attacker

---

## SUCCESS METRICS

**MVP Success = Fully playable, 0 critical bugs, 60 FPS**

- [ ] All 25 creatures catchable and battleable
- [ ] All 5 gym leaders defeatable with smart strategy
- [ ] Save/load works without data loss
- [ ] Pokéballs capture with intended probability
- [ ] Animations smooth (no frame drops)
- [ ] Audio plays without lag or distortion
- [ ] Mobile gameplay (portrait orientation) works smoothly

---

**Ready to transfer to AI Studio. Use this PRD verbatim for maximum coherence across AI implementations.**

---

**END OF DOCUMENT**
