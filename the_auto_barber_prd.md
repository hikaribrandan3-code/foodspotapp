# The Auto Barber — Website PRD
## Professional Auto Detailing | Seattle, WA

---

## 1. BRAND FOUNDATION

### Business Details
| Field | Value |
|-------|-------|
| **Business Name** | The Auto Barber |
| **Tagline** | "Precision Cuts for Your Car" |
| **Location** | 7418 St 126th Unit 1C, Seattle, WA 98178 |
| **Phone** | (253) 893-9452 |
| **Service Area** | Seattle, Bellevue, Renton, Kent, Federal Way, Tacoma |

### Brand Personality
- **Vibe:** Old school barbershop meets premium auto care
- **Tone:** Classy, confident, craftsman-focused
- **Analogies:** Barber precision → Car detailing precision
- **Feel:** Walking into a classic barbershop, but for cars

### Color Palette
```css
:root {
  /* Primary */
  --barber-black: #0A0A0A;
  --barber-white: #F5F5F5;
  --barber-blue: #0066FF;        /* Electric accent */
  --barber-blue-glow: #00D4FF;   /* Hover/active states */
  
  /* Neutrals */
  --barber-gray-dark: #1A1A1A;
  --barber-gray: #2A2A2A;
  --barber-gray-light: #888888;
  
  /* Accents */
  --barber-chrome: #C0C0C0;      /* Metallic highlights */
  --barber-red: #CC0000;         /* Optional barber pole accent */
}
```

### Typography
- **Headlines:** Playfair Display (serif, classic barbershop feel)
- **Body:** Inter or Roboto (clean, readable)
- **Accents:** Bebas Neue or similar condensed (for labels, badges)

---

## 2. SITE STRUCTURE

### Page Flow (Based on Area 51 Architecture)

```
1. NAVIGATION
   └── Logo | Services | Gallery | About | Contact | Phone

2. HERO SECTION
   └── Background: Black + subtle barber pole animation or chrome sheen
   └── Headline: "Your Car Deserves the Finest Cut"
   └── Subhead: "Premium detailing, tint, and protection. Old school craftsmanship, modern results."
   └── CTAs: [Get a Quote] [Call Now]
   └── Scroll indicator

3. SERVICES SHOWCASE (The "Barber Menu")
   └── Visual: Split screen or 3-card layout
   └── Services:
       ├── Interior Detailing
       ├── Exterior Detailing  
       ├── Wax & Polish
       └── Window Tint

4. THE CRAFTSMAN SECTION (Why Choose Us)
   └── Headline: "The Barber's Touch"
   └── 4 pillars (numbered 01-04):
       ├── 01 — Attention to Detail
       ├── 02 — Premium Products
       ├── 03 — Old School Work Ethic
       └── 04 — Modern Protection

5. PROCESS SECTION
   └── 4 steps:
       ├── Inspect & Consult
       ├── Wash & Decontaminate
       ├── Cut & Polish (barber analogy)
       └── Protect & Finish

6. PRICING/PACKAGES (Optional — can nerf later)
   └── If included: 3 tiers
       ├── The Trim (Basic)
       ├── The Cut (Standard) ⭐
       └── The Works (Premium)

7. GALLERY/PORTFOLIO
   └── Before/After slider or grid
   └── 6-8 photos of work

8. TESTIMONIALS
   └── 3 reviews with star ratings
   └── Customer photos if available

9. FAQ
   └── 5 common questions (accordion)

10. CONTACT/QUOTE FORM
    └── Form fields: Name, Phone, Email, Service Select, Message
    └── Map embed (Seattle location)
    └── Hours, address, phone

11. FOOTER
    └── Links, social, copyright
```

---

## 3. SECTION DETAILS

### HERO SECTION

**Visual:**
- Background: Pure black (#0A0A0A) with subtle animated barber pole stripes (diagonal red/white/blue) at 5% opacity
- OR: High-end car photo with chrome reflection, black and white treatment with blue accent lighting

**Copy:**
```
H1: YOUR CAR DESERVES
     THE FINEST CUT

Subhead: Premium detailing, ceramic coating, and window tint.
         Old school craftsmanship. Modern protection.
         Seattle's trusted auto barber since [YEAR].

CTA Primary: BOOK APPOINTMENT
CTA Secondary: (253) 893-9452
```

**Animation:**
- Typewriter effect on headline OR
- Fade in with subtle chrome shine sweep

---

### SERVICES SECTION ("The Menu")

**Layout:** 4 cards in a row (desktop), 2x2 (tablet), stack (mobile)

**Card Design:**
- Background: Dark gray (#1A1A1A)
- Border: 1px solid #2A2A2A, turns blue on hover
- Icon: Line art style (barber tools reimagined for cars)

**Services:**

| Service | Icon Idea | Description |
|---------|-----------|-------------|
| **Interior Detail** | Barber brush → Detailing brush | "Deep clean every surface. Leather treated. Carpets restored. Like new inside." |
| **Exterior Detail** | Barber razor → Clay bar | "Hand wash, decontamination, and paint correction. Mirror finish." |
| **Wax & Polish** | Barber strop → Polishing pad | "Showroom shine that lasts. Premium wax protection." |
| **Window Tint** | Barber mirror → Tinted window | "Precision cut, premium film. UV protection + privacy." |

---

### THE CRAFTSMAN SECTION

**Headline:** THE BARBER'S TOUCH
**Subhead:** Four reasons Seattle trusts The Auto Barber

**4 Pillars (2x2 Grid):**

```
┌─────────────────┬─────────────────┐
│ 01              │ 02              │
│ ATTENTION TO    │ PREMIUM         │
│ DETAIL          │ PRODUCTS        │
│                 │                 │
│ No spot missed. │ Only the best   │
│ Every crevice,  │ for your        │
│ every surface.  │ investment.     │
├─────────────────┼─────────────────┤
│ 03              │ 04              │
│ OLD SCHOOL      │ MODERN          │
│ WORK ETHIC      │ PROTECTION      │
│                 │                 │
│ Hand work.      │ Ceramic. PPF.   │
│ No shortcuts.   │ Lasting defense.│
└─────────────────┴─────────────────┘
```

**Visual:** Large numbers (01, 02, 03, 04) in outline style, blue accent on hover

---

### PROCESS SECTION

**Headline:** THE PROCESS
**Subhead:** From intake to finish, every step matters

**4 Steps (Horizontal Timeline):**

1. **INSPECT & CONSULT** 🎯
   - "We assess your vehicle's condition and discuss your goals."

2. **WASH & DECONTAMINATE** 🧼
   - "Thorough cleaning to remove dirt, grime, and surface contaminants."

3. **CUT & POLISH** ✨
   - "Paint correction removes swirls and scratches. Mirror finish achieved."

4. **PROTECT & FINISH** 🛡️
   - "Premium wax, ceramic, or PPF applied. Your car stays perfect longer."

**Visual:** Horizontal line connecting steps, blue dot at current step

---

### PRICING SECTION (NERF-ABLE)

**Headline:** SERVICE MENU
**Subhead:** Straightforward pricing. No surprises.

**3 Tiers (Barber Theme):**

| Tier | Name | Price Range | Best For |
|------|------|-------------|----------|
| Basic | THE TRIM | $150-250 | Maintenance wash, interior vacuum, wipe down |
| Standard | THE CUT ⭐ | $300-500 | Full interior/exterior detail, wax, tire dress |
| Premium | THE WORKS | $600-900 | Paint correction, ceramic coating, full protection |

**Note:** If brother wants to hide pricing, this section becomes "REQUEST A QUOTE" with service checkboxes instead.

---

### GALLERY SECTION

**Headline:** THE CHAIR
**Subhead:** Recent work from the shop

**Layout:** Masonry grid or 2-column before/after sliders

**Photos Needed:**
- 6-8 photos of detailed cars
- Mix of interior shots (clean leather, dashboards) and exterior (shiny paint, reflections)
- Black and white treatment with optional blue tint overlay

---

### FAQ SECTION

**Headline:** COMMON QUESTIONS
**Subhead:** Quick answers. Call for details.

**Questions (Accordion):**

1. **How long does a full detail take?**
   - "Most details take 3-5 hours depending on condition. The Works package can take a full day."

2. **Do you come to me or do I come to you?**
   - "We operate from our Seattle shop at 7418 St 126th. This ensures the best results with our full setup."

3. **What's the difference between wax and ceramic coating?**
   - "Wax lasts 2-3 months. Ceramic lasts 2-5 years and provides superior protection."

4. **How long before I can wash my car after tint?**
   - "Wait 3-5 days for the film to fully cure. We'll give you complete care instructions."

5. **Do you take walk-ins?**
   - "Appointments preferred to ensure quality. Call (253) 893-9452 to schedule."

---

### CONTACT SECTION

**Headline:** BOOK YOUR APPOINTMENT
**Subhead:** Ready for the finest cut?

**Left Side — Form:**
- Name (required)
- Phone (required)
- Email (required)
- Service (dropdown: Interior Detail, Exterior Detail, Wax & Polish, Window Tint, The Works)
- Preferred Date (date picker)
- Message (textarea)
- Submit: "REQUEST APPOINTMENT"

**Right Side — Info:**
```
📍 LOCATION
7418 St 126th Unit 1C
Seattle, WA 98178

📞 PHONE
(253) 893-9452

🕐 HOURS
Mon-Fri: 8:00 AM - 6:00 PM
Saturday: 9:00 AM - 4:00 PM
Sunday: Closed
```

**Map:** Google Maps embed (Seattle location)

---

## 4. NERF LIST (Post-Launch Modifications)

Tell your brother these can be removed/simplified after launch:

| Feature | Nerf Option | Why |
|---------|-------------|-----|
| Pricing display | Hide prices, show "Call for Quote" | If he prefers phone calls |
| Online booking | Simple form → Just contact info | If he wants to qualify leads first |
| Gallery | Reduce to 3-4 best photos | If he wants to curate heavily |
| FAQ | Remove entirely | If he prefers phone conversations |
| Process section | Collapse to 2 steps | Simpler page |
| Service cards | Remove descriptions, keep titles | Cleaner look |

---

## 5. TECHNICAL SPECS

### Based On
- **Source:** Area 51 Detailing codebase
- **Framework:** React (Vite) or Next.js
- **Styling:** CSS Modules or Tailwind (your call)
- **Animations:** Framer Motion or CSS transitions

### Pages
- `/` — Home (all sections)
- `/services` — Services detail (optional)
- `/gallery` — Extended gallery (optional)
- `/contact` — Contact page (optional)

### SEO Requirements
- Title: "The Auto Barber | Premium Auto Detailing Seattle"
- Meta: Description with keywords (auto detailing, window tint, Seattle)
- Local SEO: Schema markup for LocalBusiness
- Google Maps embed for location authority

### Assets Needed
| Asset | Status | Notes |
|-------|--------|-------|
| Logo | Need to create | Barbershop pole + car silhouette? |
| Hero background | Need photo or design | Black/white car with blue accent |
| Service icons | Use Lucide or custom | Barber tool metaphors |
| Portfolio photos | You have these | 6-8 photos, B&W treatment |
| Favicon | Create from logo | Simple barber pole or scissors |

---

## 6. COPY TONE EXAMPLES

### Good (Old School, Classy)
- "Your car deserves the finest cut."
- "Old school craftsmanship. Modern protection."
- "No spot missed. Every detail matters."
- "Seattle's trusted auto barber."

### Avoid (Too Corporate)
- "We provide comprehensive automotive detailing services..."
- "Our mission is to deliver excellence..."
- "State-of-the-art facility..."

### Barber Analogies to Use
- "The Chair" = Gallery/Portfolio
- "The Menu" = Services/Pricing
- "The Cut" = Detailing service
- "The Barber's Touch" = Craftsmanship/quality

---

## 7. ANIMATION NOTES

### Subtle Animations (Keep It Classy)
- **Hero:** Subtle barber pole stripe animation (diagonal scroll, slow)
- **Scroll:** Fade-up sections as they enter viewport
- **Hover:** Blue glow on cards, buttons lift slightly
- **Numbers:** Count-up animation on "The Craftsman" section
- **Form:** Input focus → blue border glow

### Avoid (Too Flashy)
- No spinning elements
- No sound effects
- No parallax (unless subtle)
- No loading screens

---

## 8. MOBILE CONSIDERATIONS

- **Hero:** Stack headline, reduce font size
- **Services:** Single column cards
- **Process:** Vertical timeline instead of horizontal
- **Form:** Full width inputs
- **Phone:** Sticky call button at bottom
- **Gallery:** Swipeable carousel

---

## 9. DELIVERABLES CHECKLIST

### Phase 1: Core Site
- [ ] Clone Area 51 structure
- [ ] Apply The Auto Barber theme (colors, fonts)
- [ ] Replace all content with Barber copy
- [ ] Update contact info, location, phone
- [ ] Add portfolio photos (B&W treatment)

### Phase 2: Polish
- [ ] Barber pole animation in hero
- [ ] All hover states and transitions
- [ ] Mobile responsiveness
- [ ] Form validation
- [ ] SEO meta tags

### Phase 3: Nerf Options Ready
- [ ] Toggle to hide/show pricing
- [ ] Simplified form option
- [ ] Reduced gallery version

---

## 10. COMPETITIVE DIFFERENTIATORS

### vs. Generic Detailers
- **The Barber Brand:** Memorable, stands out
- **Old School Positioning:** Craftsmanship over volume
- **Visual Identity:** Black/white/blue is distinctive

### vs. High-End Shops
- **Accessibility:** Not intimidating
- **Transparent:** Clear process, fair pricing
- **Local:** Seattle-focused, neighborhood feel

---

**END PRD**
