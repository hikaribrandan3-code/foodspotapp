# FoodSpot-OS Print Menu PRD

## Overview
Printable physical menu for restaurants, food trucks, and pop-ups. Generates a clean, brandable PDF-style page that customers can view at tables, counters, or festival booths.

## Core Features

### 1. Header Section
- **Business name** (from `branding.name`) — large, bold, centered
- **Tagline** (optional, from `branding.tagline`) — smaller, muted text below name
- **Contact info** — phone number, address (from `branding` config)
- **NO logo** (MVP — logo printing is too complex for v1)

### 2. Menu Items
- **Category headers** — "Entradas", "Platos Principales", "Bebidas", etc.
- **Item rows** — Name + Price (right-aligned)
- **Description** — small, muted text below item name (optional field, show if exists)
- **Current state:** Our items don't have descriptions yet. Leave space for them, render empty if none.
- **Currency:** ARS format ($ 1.500,00)

### 3. Footer Section
- **QR code** — generated dynamically, links to `https://foodspotapp.vercel.app/{tenantSlug}`
- **Text below QR:** "Escaneá el código QR para ver el menú completo y ordenar"
- **Social media** (optional): Instagram handle from branding

### 4. Design System
- **A4 / Letter size** — portrait orientation for printing
- **Color palette** — configurable accent color from `branding.primaryColor` (default: #22C55E green)
- **Fonts:** 
  - Headers: Inter or system sans-serif, bold
  - Body: Inter or system sans-serif, regular
  - Prices: Monospace or tabular nums for alignment
- **Borders:** Simple 1px dividers between categories, subtle separator lines
- **Spacing:** Generous padding (20-24px), breathable layout
- **Background:** White for print, no gradients or images

### 5. Print Behavior
- **Print CSS:** `@media print` — hide UI chrome, show only menu content
- **Print button:** Floating "🖨️ Imprimir" button in top-right corner (hidden when printing)
- **Page breaks:** Avoid breaking items across pages (use `break-inside: avoid`)

### 6. Owner Backend Integration
- **Location:** Owner → Menu tab → "📄 Menú para Imprimir" section
- **Preview:** Live preview of how menu looks before printing
- **Regenerate:** Button to refresh with latest menu items
- **Download:** "Descargar como PDF" button (uses browser print-to-PDF)

## Data Requirements

### Props Needed
```typescript
interface PrintMenuProps {
  businessName: string;
  tagline?: string;
  phone?: string;
  address?: string;
  instagram?: string;
  primaryColor: string;
  menuItems: Array<{
    id: string;
    name: string;
    price: number;
    description?: string;
    category: string;
  }>;
  tenantSlug: string;
}
```

### Supabase Tables
- `branding` — business name, tagline, phone, address, primary_color
- `menu_items` — name, price, description (nullable), category_id
- `categories` — name, sort_order

## Future Features (v2)
- **Logo upload** — support for business logo in header
- **Item descriptions** — full descriptions with calories, allergens
- **Multi-language** — Spanish / English toggle
- **Photo menu** — small item images (requires photo upload)
- **Custom sections** — "Chef's Specials", "Today's Deals"
- **QR code styling** — branded QR codes with colors

## Success Criteria
- [ ] Menu prints cleanly on A4/Letter paper
- [ ] QR code scans correctly to digital menu
- [ ] Items with descriptions show them; items without don't break layout
- [ ] Accent color applies to headers and borders
- [ ] Print button works on iPad (primary staff device)
- [ ] Preview matches printed output exactly

## Build Notes
- Use `react-qr-code` or `qrcode.react` for QR generation
- Use CSS `@media print` for print-specific styles
- Test with `window.print()` on iPad Safari
- Ensure prices align correctly (tabular numbers)
- Keep it simple — no complex animations, no hover effects
