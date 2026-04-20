# The Auto Barber — Website PRD v2
## Premium Auto Detailing | Seattle, WA

---

## 1. BRAND FOUNDATION (Revised)

### The Logo Analysis
- **Style:** Circular badge/seal (classic barbershop + premium automotive)
- **Typography:** Bold, vintage-inspired, confident
- **Iconography:** Crossed tools (barber tool + detailing spray bottle)
- **Tagline:** "INVEST. PROTECT. ENJOY."
- **Color:** Black and white (with blue accent for digital)

### Brand Personality
- **Vibe:** Premium craftsman. Seal of quality. Established.
- **Tone:** Confident, direct, no fluff
- **Positioning:** You're not just getting a detail — you're getting the Barber's guarantee

### Revised Color Palette
```css
:root {
  /* Core (From Logo) */
  --barber-black: #0A0A0A;
  --barber-white: #FFFFFF;
  --barber-gray: #1A1A1A;
  --barber-gray-light: #888888;
  
  /* Accent (Digital Only) */
  --barber-blue: #0066FF;        /* CTA buttons, links */
  --barber-blue-hover: #0052CC;  /* Hover states */
  
  /* Metallic (Premium Feel) */
  --barber-chrome: #C0C0C0;
  --barber-gold: #D4AF37;        /* Optional premium accent */
}
```

### Typography (Match Logo Energy)
- **Headlines:** Bebas Neue or Oswald (condensed, bold like logo)
- **Body:** Inter or SF Pro (clean, modern contrast)
- **Accent:** Same font family as logo if identifiable

---

## 2. KEY BRAND ELEMENTS TO USE

### The Badge/Seal Motif
Use circular badge shapes throughout:
- Section labels ("OUR SERVICES" in a circular badge)
- Guarantee seals ("BARBER CERTIFIED")
- Process step numbers (01, 02, 03, 04 in circles)
- Footer logo large as trust seal

### The Tagline
**"INVEST. PROTECT. ENJOY."** — Feature this prominently:
- Below hero headline
- In footer with logo
- As section divider

### The Crossed Tools Icon
- Use as favicon
- Use as section icons (stylized versions)
- Use as bullet points
- Use as loading/transition element

---

## 3. REVISED SITE STRUCTURE

```
1. NAVIGATION
   └── Badge Logo (small) | Services | Gallery | About | Contact | Phone

2. HERO SECTION
   └── Large centered badge logo
   └── "INVEST. PROTECT. ENJOY." 
   └── Headline: "THE AUTO BARBER"
   └── Subhead: "Premium detailing for those who value their investment"
   └── CTAs: [Book Appointment] [Call (253) 893-9452]

3. THE PROMISE (New Section)
   └── 3 pillars matching tagline:
       ├── INVEST — "Your vehicle is an investment. We treat it that way."
       ├── PROTECT — "Premium coatings and tint that last."
       └── ENJOY — "Drive something that looks and feels new."

4. SERVICES (The "Menu")
   └── Badge-style section header
   └── 4 service cards with crossed-tools icons
   └── Interior | Exterior | Wax/Polish | Window Tint

5. THE CRAFTSMAN
   └── Headline: "THE BARBER'S STANDARD"
   └── 4 pillars with circular number badges:
       ├── ① Attention to Detail
       ├── ② Premium Products  
       ├── ③ Old School Work Ethic
       └── ④ Modern Protection

6. PROCESS
   └── 4 steps in horizontal timeline
   └── Each step has circular icon badge

7. PRICING (Optional/Nerf-able)
   └── "THE MENU" — 3 tiers with badge styling
   └── The Trim | The Cut | The Works

8. GALLERY
   └── "PROOF OF WORK" — masonry grid
   └── Before/After comparison tool

9. TESTIMONIALS
   └── Customer quotes with star badges

10. FAQ
    └── Accordion with badge icons

11. CONTACT
    └── Large badge logo
    └── "READY FOR THE BARBER'S TOUCH?"
    └── Form + Contact info + Map

12. FOOTER
    └── Large centered badge logo
    └── "INVEST. PROTECT. ENJOY."
    └── Links + Copyright
```

---

## 4. SECTION DETAILS (Elevated)

### HERO SECTION

**Layout:**
- Full viewport height
- Centered content
- Dark background (#0A0A0A)

**Content Stack:**
```
         ┌───────────────┐
         │   [LOGO]      │  ← Large badge (300px)
         │   (circular)  │
         └───────────────┘
              
    INVEST. PROTECT. ENJOY.
    ───────────────────────
    
         THE AUTO BARBER
    Premium detailing for those who
         value their investment
              
      [Book Appointment]
    (253) 893-9452
```

**Visual:**
- Background: Solid black OR subtle texture (barbershop floor tile pattern at 5% opacity)
- Logo: White version of badge, maybe subtle glow/pulse
- Optional: Parallax floating crossed-tools icons in background (very subtle)

---

### THE PROMISE SECTION (New)

**Headline:** THE PROMISE
**Layout:** 3 columns, each with circular icon

| Column | Icon | Headline | Body |
|--------|------|----------|------|
| 1 | Dollar sign/Shield | INVEST | "Your vehicle is an investment. We treat it that way. Every detail matters when protecting value." |
| 2 | Shield/Armor | PROTECT | "Premium coatings, ceramic, tint, and PPF. Protection that lasts years, not weeks." |
| 3 | Smile/Key | ENJOY | "Drive something that looks and feels new. The confidence of a freshly detailed ride." |

**Visual:** Each column has a circular badge icon above it

---

### SERVICES SECTION

**Section Header:** Circular badge with "SERVICES"

**4 Cards:**

```
┌─────────────────┐
│  [crossed       │
│   tools icon]   │
│                 │
│ INTERIOR        │
│ DETAILING       │
│                 │
│ Deep clean.     │
│ Leather treated.│
│ Like new.       │
│                 │
│ [Learn More]    │
└─────────────────┘
```

**Services:**
1. **Interior Detailing** — "Deep clean every surface. Leather treated. Carpets restored."
2. **Exterior Detailing** — "Hand wash, decon, paint correction. Mirror finish."
3. **Wax & Polish** — "Showroom shine. Premium protection that lasts."
4. **Window Tint** — "Precision cut. UV protection. Privacy. Style."

---

### THE CRAFTSMAN SECTION

**Headline:** THE BARBER'S STANDARD
**Subhead:** Four principles. One result. Perfection.

**Layout:** 2x2 Grid with large circular numbers

```
┌────────────────────┬────────────────────┐
│     ┌──────┐       │     ┌──────┐       │
│     │  ①   │       │     │  ②   │       │
│     └──────┘       │     └──────┘       │
│  ATTENTION TO      │  PREMIUM           │
│  DETAIL            │  PRODUCTS          │
│                    │                    │
│  No spot missed.   │  Only the best     │
│  Every crevice.    │  for your ride.    │
├────────────────────┼────────────────────┤
│     ┌──────┐       │     ┌──────┐       │
│     │  ③   │       │     │  ④   │       │
│     └──────┘       │     └──────┘       │
│  OLD SCHOOL        │  MODERN            │
│  WORK ETHIC        │  PROTECTION        │
│                    │                    │
│  Hand work.        │  Ceramic. PPF.     │
│  No shortcuts.     │  Years of defense. │
└────────────────────┴────────────────────┘
```

**Numbers:** Circular badges, outlined style, fill blue on hover

---

### PROCESS SECTION

**Headline:** THE PROCESS
**Subhead:** From intake to finish

**Timeline:**
```
    ●━━━━━━━━━━●━━━━━━━━━━●━━━━━━━━━━●
    ①          ②          ③          ④
    INSPECT    WASH       CUT        PROTECT
    & CONSULT  & DECON    & POLISH   & FINISH
```

**Steps:**
1. **Inspect & Consult** — "We assess condition and discuss your goals."
2. **Wash & Decontaminate** — "Thorough cleaning. Zero contaminants."
3. **Cut & Polish** — "Paint correction. Swirl removal. Mirror finish."
4. **Protect & Finish** — "Wax, ceramic, or PPF. Lasting defense."

---

### PRICING SECTION ("THE MENU")

**Headline:** THE MENU
**Subhead:** Straightforward. No surprises.

**3 Cards with Badge Headers:**

| Package | Badge | Price | Includes |
|---------|-------|-------|----------|
| **The Trim** | Basic | $150-250 | Interior vacuum, wipe down, exterior wash, tire dressing |
| **The Cut** ⭐ | Standard | $300-500 | Full interior detail, exterior detail, wax application, full protection |
| **The Works** | Premium | $600-900 | Everything + paint correction, ceramic coating, full inspection |

**Visual:** Each card has a badge in the corner indicating tier

---

### GALLERY SECTION

**Headline:** PROOF OF WORK
**Subhead:** Results that speak for themselves

**Layout:** Masonry grid or 3-column
**Treatment:** Photos in black and white with subtle blue tint on hover

---

### FAQ SECTION

**Headline:** QUESTIONS?
**Subhead:** Quick answers. Call for details.

**Accordion Items:**
1. How long does a full detail take?
2. Do I need an appointment?
3. What's the difference between wax and ceramic?
4. How long after tint can I wash?
5. Do you offer mobile service?

---

### CONTACT SECTION

**Layout:**
```
┌────────────────────┬────────────────────┐
│                    │                    │
│   READY FOR THE    │    [Contact Form]  │
│   BARBER'S TOUCH?  │                    │
│                    │    Name            │
│   📍 7418 St 126th │    Phone           │
│      Unit 1C       │    Email           │
│      Seattle, WA   │    Service         │
│      98178         │    [Book Now]      │
│                    │                    │
│   📞 (253) 893-9452│    ─────────────── │
│                    │    Hours:          │
│   Mon-Fri: 8-6     │    Mon-Fri 8-6     │
│   Sat: 9-4         │    Sat 9-4         │
│   Sun: Closed      │    Sun Closed      │
│                    │                    │
└────────────────────┴────────────────────┘
```

---

### FOOTER

**Layout:**
```
┌─────────────────────────────────────┐
│                                     │
│         [LARGE LOGO]                │
│         (badge, 200px)              │
│                                     │
│    INVEST. PROTECT. ENJOY.          │
│                                     │
│    Services | Gallery | Contact     │
│                                     │
│    © 2026 The Auto Barber           │
│                                     │
└─────────────────────────────────────┘
```

---

## 5. DESIGN SYSTEM

### Buttons
```css
/* Primary */
.btn-primary {
  background: var(--barber-blue);
  color: white;
  padding: 16px 32px;
  border-radius: 4px; /* Slight radius, not pill */
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Secondary (Outline) */
.btn-secondary {
  background: transparent;
  border: 2px solid white;
  color: white;
  padding: 16px 32px;
}
```

### Cards
```css
.card {
  background: var(--barber-gray);
  border: 1px solid #333;
  border-radius: 8px;
  padding: 32px;
}

.card:hover {
  border-color: var(--barber-blue);
  transform: translateY(-4px);
}
```

### Badges/Seals
```css
.badge {
  border: 2px solid white;
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-number {
  font-size: 32px;
  font-weight: 700;
}
```

---

## 6. NERF OPTIONS (For Brother)

| Feature | How to Nerf |
|---------|-------------|
| Pricing | Replace with "Call for Quote" buttons |
| Gallery | Reduce to 4 best photos |
| FAQ | Collapse to 3 questions |
| Process | Remove, keep only Services |
| The Promise | Remove, combine into hero |
| Booking Form | Simple contact form only |

---

## 7. ASSETS NEEDED

### From You
- [ ] Portfolio photos (6-8 shots, high res)
- [ ] Before/After pairs if available
- [ ] Hero background option (car photo, B&W)

### To Create
- [ ] Logo variations (white on dark, dark on light)
- [ ] Favicon (crossed tools icon)
- [ ] Service icons (stylized crossed tools variants)
- [ ] Social share image (logo + tagline)

---

## 8. SEO CHECKLIST

- [ ] Title: "The Auto Barber | Premium Auto Detailing Seattle"
- [ ] Meta: Include "Seattle", "auto detailing", "window tint", "ceramic coating"
- [ ] Local schema: LocalBusiness with address, phone, hours
- [ ] Google Maps embed
- [ ] Alt tags on all images

---

## 9. COPY TONE

### Use
- "Investment" (not "car")
- "Protection" (not "coating")
- "The Barber's Standard" (not "our service")
- "Proof of Work" (not "gallery")
- "The Menu" (not "pricing")

### Avoid
- "We are a company that..."
- "Our mission is to..."
- "State-of-the-art..."
- Corporate speak

---

**END PRD v2**
