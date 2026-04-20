# The Auto Barber — Build Brief
## For Antigravity

---

## WHAT THIS IS

Clone the **Area 51 Detailing** site structure. Same sections, same layout, same components. Reskin with The Auto Barber brand (black/white/blue, barbershop vibes).

The intro animation is **already built** — just drop it in.

---

## BRAND DNA

**Name:** The Auto Barber  
**Location:** Seattle, WA (7418 St 126th Unit 1C)  
**Phone:** (253) 893-9452  
**Tagline:** INVEST. PROTECT. ENJOY.

**Vibe:** Old school barbershop meets premium auto care. Craftsman. Confident. No corporate fluff.

**Logo:** Circular badge with crossed tools (provided). Use it as the hero centerpiece and footer seal.

---

## COLORS

```css
--bg: #0A0A0A          /* Deep black */
--surface: #141414     /* Card backgrounds */
--text: #FFFFFF        /* White */
--text-muted: #888888  /* Gray */
--accent: #0066FF      /* Electric blue (CTAs, links, hover) */
--accent-hover: #0052CC
```

**Rule:** 95% black/white. Blue is for **action only** (buttons, links, hover states).

---

## TYPOGRAPHY

- **Headlines:** Bebas Neue or Oswald (condensed, bold — matches logo energy)
- **Body:** Inter (clean, readable)
- **Accent/Tagline:** All caps, wide letter-spacing (0.2em)

---

## TONE OF VOICE

| Use This | Not This |
|----------|----------|
| "Your car deserves the finest cut." | "We provide comprehensive automotive services..." |
| "The Barber's Standard" | "Our commitment to excellence" |
| "Proof of work" | "Gallery" |
| "The Menu" | "Pricing" |
| "Investment" | "Vehicle" |
| "Protection" | "Coating service" |

**Voice:** Direct. Confident. Craftsman-to-client. No mission statements.

---

## SECTIONS (Copy Area 51 Structure Exactly)

### 1. Hero
- Large centered **badge logo**
- "INVEST. PROTECT. ENJOY." below it
- Headline: "THE AUTO BARBER"
- Subhead: "Premium detailing for those who value their investment"
- Two CTAs: [Book Appointment] [Call (253) 893-9452]
- **Add:** Intro animation component (provided) plays first

### 2. Services (4 Cards)
Same layout as Area 51 pricing cards, but for services:

| Service | Description |
|---------|-------------|
| **Interior Detailing** | "Deep clean every surface. Leather treated. Carpets restored. Like new inside." |
| **Exterior Detailing** | "Hand wash, decon, paint correction. Mirror finish." |
| **Wax & Polish** | "Showroom shine. Premium protection that lasts." |
| **Window Tint** | "Precision cut. UV protection. Privacy. Style." |

**Visual:** Dark cards with blue hover border. Crossed-tools icon on each.

### 3. The Craftsman (4 Pillars)
Same as Area 51 "Why PPF" section. 2x2 grid:

```
① ATTENTION TO DETAIL     ② PREMIUM PRODUCTS
No spot missed.           Only the best for your ride.

③ OLD SCHOOL ETHIC        ④ MODERN PROTECTION  
Hand work. No shortcuts.  Ceramic. PPF. Years of defense.
```

**Numbers:** Circular badges (outlined, fill blue on hover).

### 4. Process (4 Steps)
Horizontal timeline (vertical on mobile):

1. **Inspect & Consult** — "Assess condition. Discuss goals."
2. **Wash & Decon** — "Thorough cleaning. Zero contaminants."
3. **Cut & Polish** — "Paint correction. Mirror finish."
4. **Protect & Finish** — "Wax, ceramic, or tint. Lasting defense."

### 5. Pricing ("The Menu")
Same 3-card layout as Area 51:

| Package | Price | Includes |
|---------|-------|----------|
| **The Trim** | $150-250 | Interior vacuum, wipe down, wash, tire dressing |
| **The Cut** ⭐ | $300-500 | Full interior/exterior detail, wax, full protection |
| **The Works** | $600-900 | Everything + paint correction, ceramic coating |

**Note:** If he wants to hide prices later, we'll swap for "Call for Quote" buttons. Build it with prices for now.

### 6. Gallery ("Proof of Work")
Same masonry grid as Area 51. 6-8 photos (provided). Black & white treatment with blue hover overlay.

### 7. FAQ
Accordion, 5 questions:

1. How long does a full detail take?
2. Do I need an appointment?
3. What's the difference between wax and ceramic?
4. How long after tint can I wash my car?
5. Do you offer mobile service?

### 8. Contact
- Form: Name, Phone, Email, Service (dropdown), Message
- Info: Address, phone, hours
- Map embed (Seattle)
- Large badge logo above form

### 9. Footer
- Large centered badge logo
- "INVEST. PROTECT. ENJOY."
- Quick links
- Copyright

---

## COMPONENTS TO REUSE FROM AREA 51

1. **Pricing/service cards** — same structure, new colors
2. **Section headers** — circular badge style labels
3. **Mobile sticky CTA** — floating call button
4. **Form styling** — dark inputs, blue focus states
5. **Animation patterns** — fade-up on scroll, hover lifts

---

## INTRO ANIMATION

**Already built.** Just integrate:

```jsx
import AutoBarberIntro from './AutoBarberIntro';

function App() {
  const [showSite, setShowSite] = useState(false);
  
  return (
    <>
      {!showSite && <AutoBarberIntro onComplete={() => setShowSite(true)} />}
      <main className={showSite ? 'opacity-100' : 'opacity-0'}>
        {/* All site content here */}
      </main>
    </>
  );
}
```

---

## ASSETS PROVIDED

1. `theautobarber.png` — Logo (badge, circular)
2. Portfolio photos — 6-8 detail shots (send separately)
3. `AutoBarberIntro.jsx` — Canvas intro component (done)

---

## SEO REQUIREMENTS

- **Title:** The Auto Barber | Premium Auto Detailing Seattle
- **Meta:** Seattle auto detailing, window tint, ceramic coating, paint correction
- **Schema:** LocalBusiness with address, phone, hours
- **Map:** Google Maps embed of 7418 St 126th Unit 1C, Seattle, WA 98178

---

## NERF OPTIONS (For Later)

These can be stripped post-launch if needed:

- [ ] Hide pricing (swap for "Call for Quote")
- [ ] Reduce gallery to 4 photos
- [ ] Collapse FAQ to 3 questions
- [ ] Remove Process section
- [ ] Simplify form (name/phone only)

---

## DELIVERABLES

1. Single-page React site (Vite or Next.js)
2. All 9 sections above
3. Mobile responsive
4. Intro animation integrated
5. Form with validation (Netlify Forms or Formspree)
6. Deployed to Vercel

---

## DO NOT

- Use Tailwind (use CSS Modules or styled-components)
- Add animations that aren't in Area 51 reference
- Use stock photos (wait for our portfolio shots)
- Write corporate speak
- Over-design — let the badge/logo be the hero

---

**Questions?** Ping Hikari.

**Deadline:** TBD

**Reference site:** https://area51detailing-hl9es0sji-hikari-brandans-projects.vercel.app/services/protective/ppf
