# The Auto Barber — Canvas Intro Animation Spec
## "The Letter" — Wax Seal Opening Experience

---

## THE CONCEPT

Before the site loads, the user receives a **formal letter from The Auto Barber** — an old wax-sealed envelope that opens to reveal the brand. Think vintage correspondence, premium invitation, barbershop appointment card from 1920 but digital.

**Reference:** Google Doodle wax seal animations, vintage envelope opening, premium invitation reveals.

---

## ANIMATION SEQUENCE (5-7 seconds)

### Frame 1: The Envelope (0-1s)
**Visual:**
- Dark screen (#0A0A0A)
- Centered: Cream/off-white envelope (slight texture, like heavy cardstock)
- Envelope proportions: Landscape orientation, 3:2 ratio
- Subtle paper grain texture overlay

**Details:**
- Envelope color: #F5F0E8 (aged cream)
- Shadow: Soft drop shadow beneath (floating effect)
- Texture: Subtle noise/grain at 5% opacity

### Frame 2: The Wax Seal Appears (1-2s)
**Visual:**
- Dark red wax seal materializes in center of envelope
- Seal shape: Circular (matching The Auto Barber badge)
- The seal "stamps" onto the envelope with a subtle impact wobble

**Animation:**
- Scale from 0 → 1 with elastic easing (bounce)
- Slight envelope "thud" visual (1px scale down then up)
- Seal glows briefly after landing

**Seal Design:**
- Deep red wax: #8B0000 or #A52A2A
- Embossed texture: Subtle highlight/shadow to look 3D
- Center icon: Simplified crossed tools (from logo)
- Ring around edge: Dotted or lined border like real wax seal

### Frame 3: The Unsealing (2-4s)
**Visual:**
- Wax seal splits/breaks in the middle
- OR: Seal rotates and lifts off (like opening a letter)
- Chosen direction: **Seal splits vertically with a crack effect**

**Animation:**
- Crack line appears through center of seal
- Left half slides left, right half slides right
- Seal pieces fall away and fade
- Light bloom/glow from inside as seal opens

**Sound (Optional):**
- Wax crack sound
- Paper tear (subtle)

### Frame 4: The Letter Reveal (4-5s)
**Visual:**
- Envelope flaps open (top flap lifts, side flaps peel back)
- Cream-colored letter/card rises from inside
- Letter unfolds or scales up to fill screen

**Letter Content:**
```
THE AUTO BARBER

INVEST. PROTECT. ENJOY.

[Start Experience]
```

**Typography:**
- "THE AUTO BARBER" — Bold serif (Playfair Display), centered
- "INVEST. PROTECT. ENJOY." — Smaller, spaced letters
- [Start Experience] — Underlined link or button

**Letter Texture:**
- Cream background (#FDFCF8)
- Subtle paper grain
- Slight edge shadow (curl effect)

### Frame 5: Transition to Site (5-7s)
**Visual:**
- Letter fades to white
- White screen briefly
- Site hero section fades in
- Logo badge scales up from center
- "INVEST. PROTECT. ENJOY." types out or fades in

**Alternative:**
- Letter "folds" and transforms into the site background
- Camera zooms through the letter into the site

---

## TECHNICAL SPECIFICATIONS

### Canvas Setup
```javascript
const canvas = document.getElementById('intro-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Handle resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});
```

### Animation Approach
**Option A: Canvas 2D API (Recommended)**
- Full control over drawing
- Can use images for textures
- Smooth frame-by-frame animation

**Option B: CSS + WebGL (Overkill)**
- Only if 3D wax effects needed
- Probably too heavy for this

### Key Elements to Draw

1. **Envelope Shape**
```javascript
function drawEnvelope(ctx, x, y, width, height) {
  // Main body
  ctx.fillStyle = '#F5F0E8';
  ctx.fillRect(x, y, width, height);
  
  // Top flap (triangle)
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width/2, y + height/2);
  ctx.lineTo(x + width, y);
  ctx.closePath();
  ctx.fillStyle = '#EDE8E0'; // Slightly darker for flap
  ctx.fill();
}
```

2. **Wax Seal**
```javascript
function drawWaxSeal(ctx, x, y, radius) {
  // Base circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#8B0000';
  ctx.fill();
  
  // Highlight (top-left)
  ctx.beginPath();
  ctx.arc(x - radius*0.3, y - radius*0.3, radius*0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fill();
  
  // Inner ring
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.85, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Center icon (crossed tools)
  // Draw simplified SVG paths or use small image
}
```

3. **Paper Texture**
- Load PNG texture or generate noise
- Apply as overlay with `globalAlpha: 0.05`

### Animation Timing
```javascript
const timeline = {
  envelopeAppear: { start: 0, duration: 1000 },
  sealStamp: { start: 800, duration: 600 },
  sealBreak: { start: 2000, duration: 800 },
  letterReveal: { start: 2800, duration: 1000 },
  transition: { start: 4000, duration: 1500 }
};
```

### Easing Functions
```javascript
// Elastic for seal stamp
function easeOutElastic(x) {
  const c4 = (2 * Math.PI) / 3;
  return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
}

// Smooth for transitions
function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
```

---

## SKIP OPTION

**Always provide skip:**
```javascript
// Click anywhere to skip
canvas.addEventListener('click', skipIntro);

// Or small "Skip" text in corner
function skipIntro() {
  // Fade canvas out quickly
  canvas.style.transition = 'opacity 0.3s';
  canvas.style.opacity = '0';
  setTimeout(() => {
    canvas.remove();
    document.body.classList.add('intro-complete');
  }, 300);
}
```

**LocalStorage:** Remember if user has seen intro:
```javascript
if (localStorage.getItem('autoBarberIntroSeen')) {
  skipIntro();
} else {
  localStorage.setItem('autoBarberIntroSeen', 'true');
  playIntro();
}
```

---

## ALTERNATIVE: SIMPLER VERSION

If canvas is too heavy, CSS alternative:

```html
<div class="intro-envelope">
  <div class="envelope-body"></div>
  <div class="wax-seal">
    <img src="seal.svg" />
  </div>
  <div class="envelope-flap"></div>
</div>
```

```css
.wax-seal {
  animation: stampIn 0.6s ease-out 0.8s both;
}

.envelope-flap {
  animation: openFlap 0.8s ease-in-out 2s forwards;
  transform-origin: top center;
}

@keyframes stampIn {
  0% { transform: scale(3); opacity: 0; }
  50% { transform: scale(0.9); }
  70% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes openFlap {
  to { transform: rotateX(-180deg); }
}
```

---

## MOBILE CONSIDERATIONS

- **Touch to skip** — Single tap anywhere skips
- **Faster timing** — 4 seconds max on mobile
- **Simpler effects** — No texture on low-end devices
- **Portrait envelope** — Rotate design for mobile ratio

---

## DELIVERABLES FOR DEVELOPER

1. **Canvas intro component** (`IntroCanvas.jsx` or similar)
2. **Wax seal graphic** (SVG or PNG)
3. **Paper texture** (PNG tile, 512x512)
4. **Sound effects** (optional, MP3):
   - Wax stamp thud
   - Paper tear/crack
   - Envelope open

---

## PROMPT FOR ANTI-GRAVITY

"Build a canvas-based intro animation for The Auto Barber website. The experience:

1. Dark screen with cream-colored envelope in center
2. Red wax seal (matching the barber badge) stamps onto envelope with elastic bounce
3. Seal splits/cracks and falls away
4. Envelope opens, revealing letter that rises up
5. Letter displays 'THE AUTO BARBER' and 'INVEST. PROTECT. ENJOY.'
6. Fades to site hero section

**Technical:**
- Use HTML5 Canvas 2D API
- 5-7 second duration
- Click to skip
- Remember with localStorage (show once per session)
- Mobile-optimized (faster, touch skip)

**Style:**
- Vintage premium feel
- Cream paper (#F5F0E8)
- Deep red wax (#8B0000)
- Subtle textures and shadows
- Smooth easing, no jank

**Reference:** Google Doodle wax seal animations, vintage envelope openings.

Provide as React component that auto-mounts and calls `onComplete` callback when finished."

---

**END SPEC**
