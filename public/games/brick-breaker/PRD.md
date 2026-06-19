# Brick Breaker — Game PRD v1.0

**Game ID:** `brick-breaker`
**Slot:** Arcade Collection (game #8, alongside Burger Stack, Spice Invaders, Kanzo, Bubble Tea, Candyland Flip, Munchboy Billiards, Golden Crust)
**Status:** v1 — core logic first, NO power-ups
**Reference:** `/Users/daiskebrandan/Downloads/brickbreaker.png` (neon arcade Arkanoid/Breakout UI)

---

## 1. Goal

Ship a polished, colorful, classic brick-breaker that nails the reference UI 1:1 and runs flawlessly inside the HikariBoy emulator top screen. v1 is about **gameplay feel and depth through pure mechanics** — angle control, combos, ball speed curve, multi-hit bricks, stage progression — with **zero power-ups** so the core loop is rock solid before we layer extras.

## 2. Target Screen & Constraints

The game renders inside the HikariBoy emulator's `.hb-screen`:
- **Size:** 100% device width × **53% of container height** (the top screen). Portrait-ish rectangle (~430×494 on iPhone Pro Max).
- **Background:** pure black `#000`.
- **Aspect:** variable — game must FILL the iframe with no letterbox bars and no distortion.
- **Solution:** virtual coordinate system `VW=1000` fixed width; `VH` derived from real aspect (`VH = 1000 * H/W`). Uniform scale `S = W/VW`. All logic in virtual units, rendered ×S. DPR-aware canvas for crisp pixels.

## 3. Emulator Integration Contract

Matches the spice-invaders pattern exactly:
- `visualViewport`-based `resize()` (handles iOS address bar).
- HB Audio Unlock IIFE at top + listens for `AUDIO_UNLOCK` / `AUDIO_RESUME` postMessages.
- Controls via `window.message`:
  - `BUTTON_PRESS` / `BUTTON_RELEASE` with `e.data.button`: `dpad-left`/`left`, `dpad-right`/`right`, `a`/`A` (launch/confirm), `start` (confirm/pause).
- Keyboard fallback: Arrows (move), Space/Z (launch), Enter (start).
- Touch: drag to move paddle, tap to launch / advance screens.
- No external assets required (SFX synthesized via WebAudio). Self-contained `index.html`.

## 4. Visual Spec (match reference)

**HUD bar (top):** 5 stat blocks across the width, two-line (label + value):
- `SCORE` (orange `#ff9b21`), `HIGH` (yellow `#ffe000`), `LIVES` (red hearts `#ff3b3b`), `STAGE` (green `#35e85a`), `LEVEL` (cyan `#28e0e0` — shows `world-sub`, e.g. `2-3`).
- Font: **Press Start 2P** (Google Font), monospace fallback.

**Neon frame:** rounded-rect stroke around the playfield with cyan→purple glow (`shadowBlur`).

**Background:** dark navy starfield (`#0a0a2a`-ish) with twinkling dots + a few cyan `+` sparkles.

**Bricks:** 8 rainbow rows (top→bottom): magenta, red, orange, yellow, green, cyan, blue, purple. Rounded, bright border + darker fill + top highlight + subtle glow. ~11 columns.

**Ball:** white glowing orb with a fading motion trail.

**Paddle:** rounded bar — orange end caps + cyan center, slight glow.

**FX:** brick-destroy particle burst (orange/yellow) + expanding ring + floating `+points` popup. Small spark on non-fatal hits. Subtle shake on life lost.

## 5. Gameplay Mechanics (depth without power-ups)

- **Paddle english:** bounce angle = offset of hit point from paddle center (max ±60°). This is the core skill mechanic.
- **Ball speed curve:** base speed rises per stage (`480 + (stage-1)*35`, cap `720` virtual u/s); tiny bump on each paddle hit toward the cap.
- **Combo system:** consecutive bricks destroyed WITHOUT touching the paddle build a combo → score multiplier; resets on paddle contact. Combo tier popups.
- **Multi-hit bricks:** later stages introduce 2-HP bricks (darker, crack overlay) for layout depth.
- **Scoring:** top rows worth more (magenta 80 → purple 10) × combo multiplier.
- **Lives:** 3 hearts. Ball below paddle = lose a life. 0 = game over.
- **Stage progression:** clear all breakable bricks → STAGE CLEAR → next stage (new pattern, faster ball). Patterns: S1 full rainbow wall (the reference look), then gaps/checker/pyramid + hard bricks.
- **Hi-score:** persisted in `localStorage`.

## 6. Screens / State Machine

`start → ready → playing → (life_lost → ready) → stage_clear → ready(next) … → gameover → start`

- **START:** title "BRICK BREAKER", blinking "PRESS START / TAP TO PLAY", arcade neon.
- **READY:** ball stuck to paddle, "TAP / A TO LAUNCH".
- **PLAYING:** core loop.
- **STAGE CLEAR:** banner + brief bonus, advance on tap/A or timeout.
- **GAME OVER:** final score, hi-score, "TAP TO RETRY".

## 7. Audio (synthesized)

WebAudio blips: paddle bounce, brick hit, brick destroy (pitch up with combo), life lost, stage clear jingle. Created on unlock.

## 8. Out of Scope (v1)

- Power-ups (multiball, lasers, expand, sticky, slow) — **deferred to v2** once core feels right.
- Boss bricks, moving bricks, persistent meta-progression, leaderboards.

## 9. v2 Roadmap (after core is locked)

Power-up drops, brick variety (explosive, unbreakable, mystery), boss stage every N, FoodSpot-themed reskin (food bricks, branded paddle), tenant color theming via `--shell-color`.
