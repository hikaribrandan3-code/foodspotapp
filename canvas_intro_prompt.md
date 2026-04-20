# The Auto Barber — Canvas Intro Animation
## Ready-to-Send Prompt for Developer

---

## THE EXPERIENCE

User lands on site → **Vintage wax-sealed envelope** appears → **Seal stamps on** → **Seal cracks and splits** → **Envelope opens** → **Letter rises revealing brand** → **Fades to main site**

Total time: 5-7 seconds. Click anywhere to skip.

---

## VISUAL BREAKDOWN

### Frame 1: The Envelope
- Cream/off-white envelope (#F5F0E8), landscape 3:2 ratio
- Subtle paper grain texture
- Soft drop shadow, floating effect
- Dark background (#0A0A0A)

### Frame 2: The Wax Seal
- Deep red wax circle (#8B0000) stamps onto center
- Elastic bounce animation (scale 0→1 with wobble)
- 3D embossed look with highlight
- Center: Crossed tools icon (simplified from logo)

### Frame 3: The Unsealing
- Crack appears through seal center
- Left/right halves slide apart and fade
- Light bloom from inside

### Frame 4: The Letter Reveal
- Envelope flaps peel back
- Cream letter rises from inside
- Letter content:
```
THE AUTO BARBER
INVEST. PROTECT. ENJOY.
[Enter]
```
- Premium serif typography

### Frame 5: Transition
- Letter fades to white
- Site hero fades in
- Logo badge scales up
- "INVEST. PROTECT. ENJOY." appears

---

## TECHNICAL REQUIREMENTS

### Implementation
- **HTML5 Canvas 2D API**
- React component: `<IntroCanvas onComplete={handler} />`
- Full viewport (100vw x 100vh)
- 60fps animation

### Features
- **Skip**: Click/tap anywhere to fast-forward
- **Remember**: localStorage (show once per session)
- **Mobile**: Faster timing (4s max), touch skip
- **Fallback**: CSS version for low-end devices

### Assets Needed
1. **Paper texture** (PNG, 512x512 tileable)
2. **Wax seal SVG** (simplified logo, red)
3. **Crossed tools icon** (for seal center)

### Animation Easing
- Seal stamp: Elastic ease-out (bounce)
- Envelope open: Cubic ease-in-out
- Letter rise: Smooth ease-out
- Transitions: Fade with slight scale

---

## COLOR PALETTE

```css
--envelope: #F5F0E8;      /* Aged cream */
--wax: #8B0000;           /* Deep red */
--wax-highlight: #A52A2A; /* Lighter red for 3D */
--bg: #0A0A0A;            /* Black */
--text: #1A1A1A;          /* Near black */
```

---

## REFERENCE

- **Google Doodle wax seals** (animation style)
- **Vintage correspondence** (texture, color)
- **Premium invitation reveals** (pacing)

---

## READY-TO-COPY PROMPT

```
Build a canvas intro animation for The Auto Barber website.

SEQUENCE:
1. Dark screen with cream envelope center (3:2 landscape)
2. Red wax seal stamps on with elastic bounce (0→1 scale, wobble)
3. Seal cracks vertically, halves slide apart and fade
4. Envelope flaps open, cream letter rises
5. Letter displays "THE AUTO BARBER" and "INVEST. PROTECT. ENJOY."
6. Fades to white, then site hero fades in

TECHNICAL:
- HTML5 Canvas 2D API
- React component with onComplete callback
- 5-7 seconds total
- Click/tap to skip
- localStorage: show once per session
- Mobile optimized (faster, 4s max)

COLORS:
- Envelope: #F5F0E8 (cream)
- Wax: #8B0000 (deep red)
- Background: #0A0A0A (black)

STYLE:
- Vintage premium feel
- Subtle paper texture
- 3D embossed wax seal
- Smooth 60fps easing

ASSETS PROVIDED:
- Paper texture PNG
- Wax seal SVG (simplified logo)

REFERENCE: Google Doodle wax seal animations
```

---

## FILES FOR DEVELOPER

Include with prompt:
1. `theautobarber.png` — Logo (for seal reference)
2. `paper-texture.png` — Subtle grain texture
3. `seal-icon.svg` — Simplified crossed tools (center of seal)
4. `canvas_intro_spec.md` — Full technical specification

---

**SEND THIS PROMPT + THE LOGO FILE TO ANTI-GRAVITY**
