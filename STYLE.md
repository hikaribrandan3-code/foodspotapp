# FoodSpot Style Guide — For Reviewing Work

## How our app should feel

**Dense, not cramped.** Every screen should show the user what they need in the first 3 seconds. No floating white space. No "something is coming soon" placeholders.

**Branded, not generic.** Every vendor's app looks like THEIR business. Not a FoodSpot template with their name swapped in. The logo, colors, and voice should feel native to them.

**Fast, never loading.** Every interaction should feel instant. If something takes longer than 200ms, it needs a skeleton or a progress indicator. Never a blank screen.

## The 3-second rule

When you open any screen, you should know where you are and what to do next in 3 seconds.

| Screen | What I should see in 3 seconds |
|--------|-------------------------------|
| Home | Vendor logo + the 2 big buttons (Menu, Order) |
| Menu | Categories + first items |
| Status | My order status OR the menu to browse while I wait |
| Cart | What I ordered + total + pay button |

If a screen fails this, it's wrong.

## Colors

| Name | Hex | Use for |
|------|-----|---------|
| Primary Green | `#22C55E` | Pay buttons, active states, success |
| Primary Purple | `#6B0FCC` | Arcade, games, fun stuff |
| Dark | `#1A1A2E` | Text, headers |
| Light | `#F5F5F5` | Backgrounds, cards |

Never use a color outside this list unless it's a vendor's brand color. No random reds, blues, or oranges that don't belong.

## Spacing

| Name | Size | Use for |
|------|------|---------|
| Tight | 4px | Inside buttons, between icon and text |
| Normal | 8px | Between related things (icon + label) |
| Roomy | 12px | Card padding, section gaps |
| Loose | 16px | Page margins, major sections |

If you see 20px, 24px, or 32px padding anywhere, question it. Probably too much.

## Components

Every reusable piece should look the same everywhere.

- **Cards:** White background, 12px padding, 12px border radius, soft shadow
- **Buttons:** Pill-shaped (fully rounded), bold text, 48px min height on mobile
- **Inputs:** Full width, 48px height, 12px padding, light border
- **Toggles:** Green when on, grey when off, smooth slide animation

If a new screen introduces a new card style, it should replace the old one everywhere. No "this screen is special."

## Text

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page title | 20px | 700 (bold) | Dark |
| Section header | 16px | 600 (semibold) | Dark |
| Body text | 14px | 400 (normal) | Dark |
| Caption / helper | 12px | 400 | Grey `#6B7280` |

Never use "light" font weight (300). Never use italic for emphasis. Bold or size change only.

## Error states

When something breaks, tell the user what happened and what to do.

| Bad | Good |
|-----|------|
| "Error" | "Payment failed. Check your card or try again." |
| "Loading..." | "Loading menu..." |
| "404" | "This page doesn't exist. Go back to the menu." |

## The "no" list

These are banned unless you ask me first:

- Modals inside modals
- More than 3 tabs in a row
- Scrollable content inside scrollable content
- "Coming soon" buttons that do nothing
- Placeholder text that looks real (Lorem ipsum, fake names)
- Red text for anything except errors
- Animations longer than 300ms

## How to use this guide

When you review work from KimiCode, Claude, or any assistant, check it against this. Does it feel like FoodSpot? Is it dense? Is it fast? Does it use the right colors and spacing?

If yes, ship it. If no, send it back with "this doesn't match the style guide" and point to the rule it broke.
