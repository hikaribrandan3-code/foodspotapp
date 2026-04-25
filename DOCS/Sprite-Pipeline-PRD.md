# 🎮 FoodSpot Sprite Pipeline — Mini PRD

## The Constraint = The Feature
Only 3 AI generations/month. That forces us to be intentional.

---

## Budget Allocation

| Slot | Use Case | Priority |
|------|----------|----------|
| 1 | Hero character (Burger mascot?) | P0 |
| 2 | Title/Logo treatment | P1 |
| 3 | Emergency / Seasonal asset | P2 |

---

## Build-It-Ourself Pipeline

### Tools
- **Aseprite** ($20) or **Pixilart** (free) — pixel art
- **Figma** — vector UI elements
- **Canvas API** — programmatic sprites (circles, rects, gradients)

### Sprite Categories

#### 1. Food Items (Build in Canvas)
- Burger patty, bun, lettuce, tomato, cheese
- Sushi pieces
- Pizza slices
- Bubble tea pearls
- Fries

**Approach:** Procedural drawing with simple shapes + gradients

#### 2. Characters (AI + Manual)
- 1 hero character from AI budget
- Variations by recoloring (tint canvas)
- Animations: 2-3 frame walk cycles

#### 3. UI/Particles (Canvas)
- Score popups
- Particle bursts
- Button states
- Background patterns

---

## Technical Specs

```javascript
// Sprite size guide
const SPRITE = {
  food: { w: 32, h: 32 },      // Ingredients
  hero: { w: 48, h: 48 },      // Player character
  enemy: { w: 40, h: 40 },     // Obstacles
  particle: { w: 8, h: 8 },    // Effects
};

// Color palette (FoodSpot brand)
const PALETTE = {
  bun: '#F4A460',
  patty: '#8B4513',
  lettuce: '#32CD32',
  cheese: '#FFD700',
  tomato: '#FF6347',
  primary: '#6B0FCC',  // FoodSpot purple
  accent: '#FF6B35',   // Orange
};
```

---

## File Structure

```
public/sprites/
├── generated/           # AI assets (3/month)
│   ├── hero-main.png
│   ├── logo-hero.png
│   └── emergency/
├── canvas/              # Code-generated
│   ├── food-sprites.js
│   ├── particles.js
│   └── ui-elements.js
├── manual/              # Hand-drawn
│   ├── tiles.png
│   └── decorations.png
└── atlas.json           # Sprite definitions
```

---

## Quick-Start Template

```javascript
// canvas/food-sprites.js
export function drawBurger(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  
  // Bun bottom
  ctx.fillStyle = '#F4A460';
  ctx.beginPath();
  ctx.ellipse(16, 28, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Patty
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(4, 20, 24, 6);
  
  // Cheese
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(4, 20);
  ctx.lineTo(28, 20);
  ctx.lineTo(26, 24);
  ctx.lineTo(22, 22);
  ctx.lineTo(18, 25);
  ctx.lineTo(14, 22);
  ctx.lineTo(10, 24);
  ctx.lineTo(6, 20);
  ctx.fill();
  
  // Lettuce
  ctx.fillStyle = '#32CD32';
  ctx.beginPath();
  ctx.moveTo(2, 18);
  ctx.quadraticCurveTo(16, 22, 30, 18);
  ctx.quadraticCurveTo(16, 14, 2, 18);
  ctx.fill();
  
  // Bun top
  ctx.fillStyle = '#F4A460';
  ctx.beginPath();
  ctx.arc(16, 12, 14, Math.PI, 0);
  ctx.fill();
  
  ctx.restore();
}
```

---

## Speech-to-Text Workflow

1. **Talk through the design** — describe the sprite verbally
2. **Capture notes** — STT app transcribes
3. **Code it** — Canvas drawing based on description
4. **Iterate fast** — tweak numbers, colors
5. **Commit** — Save to sprites/canvas/

---

## Next Steps

- [ ] Set up `public/sprites/` folder
- [ ] Create base `atlas.json` format
- [ ] Build 3 canvas food sprites (burger, sushi, pizza)
- [ ] Use 1 AI slot for hero character
- [ ] Test sprite loading in HikariBoy games

---

*This PRD is a living doc. Update as we build.*
