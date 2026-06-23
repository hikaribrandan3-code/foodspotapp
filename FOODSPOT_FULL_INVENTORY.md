# FoodSpot — Complete Feature Inventory (Jun 2026)

---

## 🟢 CUSTOMER-FACING FEATURES

### Discovery & Browsing
- Multi-location hub page (Linktree-style) — brand logo, location cards, OPEN/CLOSED status
- Location switcher (bottom nav or sidebar on desktop)
- Menu browsing (categories + items with images, descriptions, prices in ARS cents)
- Search products (text search across menu)
- Dark mode toggle (system preference + manual override)
- 3 languages: Spanish (ES), English (EN), Portuguese (PT)
- Responsive design: mobile-first, tablet, desktop

### Ordering
- Add items to cart (quantity selector, notes field)
- Cart management (modify, delete items, apply discounts)
- Delivery address entry (address + coordinates validation)
- Contact info (phone, optional email)
- Payment via Mercado Pago (credit/debit, installments, transfers)
- Order confirmation ticket (receipt-style, 6-digit order code)
- Offline queue (mutations queue if network drops during checkout)

### Post-Order Tracking
- Live order status page (pending → paid → released_to_kitchen → ready → dispatched → delivered)
- Real-time updates via Supabase Realtime
- Estimated delivery time
- Driver location tracking (if applicable)
- Order receipt (printable/shareable)

### UGC (User-Generated Content)
- Camera suite post-delivery (portrait mode, editor, filters, stickers, annotations, drawing)
- Camera filters: Normal, B&W (mono true black & white), Sepia, HDR, Vivid, Cool
- Stickers: emoji, food icons, brand stickers
- Drawing tools: freehand pen, line, rectangle, circle, text
- Mode + zoom controls, AE/AF lock, shutter button
- Export: 4:3 ratio, 612KB average output
- Share to social (WhatsApp, Instagram, Facebook, Telegram, TikTok)
- Receipt trigger: UGC activates on OrderStatus + Receipt pages post-delivery
- Gallery access: browse camera roll for image upload

### Loyalty / Rewards
- Points system (phone-scoped globally across all owner locations)
- Earn per order (integer cents → points conversion)
- Redeem points for discounts
- Referral system (share unique code, friend orders → both get bonus)
- Referral blocking (same phone can't claim bonus twice)
- UGC receipt trigger unlocks extra points
- Shared across multi-location owner (loyalty doesn't split per location)

### Events
- Browse upcoming events (discovery page)
- Event details (tier selection: General, VIP, VIP Tables, etc.)
- Tier-based pricing (integer ARS cents)
- Checkout flow (same as food orders)
- Ticket confirmation (6-digit code, QR)
- Ticket receipt (event-style layout)
- Check-in via QR scan (staff side)

### Reservations (Experimental)
- Reserve time slot (date + time + party size + notes)
- Confirmation + status tracking
- Staff approval/rejection workflow

---

## 🟡 OWNER / BACKEND FEATURES

### Dashboard & Analytics
- Combined stats dashboard (multi-location view: total orders, revenue, weekly trends)
- 7-day rolling stats with trend arrows
- Orders table (date, customer, total, payment status, delivery status)
- Filter by date range
- Revenue trends chart (line graph, customizable period)
- Live order list (real-time Realtime updates)
- Export to PDF (analytics report)

### Menu Management
- Category CRUD (create, reorder, hide)
- Item CRUD (name, description, price in ARS cents, image upload)
- Image hosting (Supabase storage, auto-resizing)
- Bulk actions (hide/show categories/items)
- Search + filter by availability
- Reorder via drag-drop
- Clone menu on location creation (auto-copies categories + items with new UUIDs)

### Orders Management
- Live orders page (grouped by status)
- Order details modal (customer info, items, delivery address, notes)
- Status transitions (kitchen staff: mark ready; delivery staff: mark dispatched/delivered)
- Manual refund + note-taking
- Delivery mode toggle (pickup only, delivery + pickup, delivery-only)
- Print receipt (ESC/POS protocol, receipt-width format, UGC trigger indicator)

### Store Configuration
- Location management (multi-location hub setup)
  - Create linked location (auto-copies menu)
  - Delete location (soft-delete, preserves orders)
  - Location switcher (sidebar + mobile nav)
  - Set primary location (oldest by created_at)
- Pause orders + custom message (e.g., "Back in 20 min")
- Store hours (free text, no validation)
- Business info (name, address, phone, website)
- Social links (Instagram, TikTok, Google Maps, Google Review)

### Branding & Customization
- Business logo upload
- Primary color picker (navbar + accent colors throughout)
- Dark mode support (CSS vars injected on `<html>`)
- Font family selector (Inter, Outfit, Manrope, plus 6 others)
- Font weight selector (light, normal, bold, black)
- Background color (light/dark theme toggle)
- Store name + emoji support

### Location Config (per-location)
- Location label (e.g., "Central", "Downtown")
- Parent slug setup (for multi-location hub routing)
- Language override (owner can set tenant language globally)
- Delivery settings
  - Fee (integer ARS cents)
  - Radius (km)
  - Free threshold (integer ARS cents)
  - Pause delivery (independent per location)

### Payments & Finances
- Mercado Pago integration (MP API v2)
- Payment preference creation (one-time checkout)
- Split preference (shared revenue, e.g., delivery partner cut)
- Webhook verification (HMAC-signed, idempotent)
- Payment status tracking (pending → approved → paid)
- Refund handling (manual via Supabase, logged in orders)
- Currency: ARS (Argentine Peso), integer minor units (cents)

### Events Management (Owner)
- Create events (name, date, description, image)
- Tier management (add/remove tiers, set pricing)
- Attendance tracking (QR check-in, mark attended/no-show)
- Analytics (total tickets sold, revenue, attendance rate)
- Promo codes (create discount codes, % or fixed ARS)
- Attendee list with notes
- Event archive

### Customer Relationship Management (CRM)
- Contact list (customers across all locations for owner)
- Search by name or phone
- Add/edit contacts
- Reservation history
- Order history per contact
- Export contacts (CSV)
- Phone dial integration (tel: links)

### Staff Management
- Staff roster (invite, role assignment, schedule)
- Roles: Owner, Manager, Kitchen Staff, Delivery Driver
- Manager role: full menu access, CRM, event management
- Staff view preview (owner can clock in as staff to test)
- Clock in/out system (shift tracking)
- Shift history log

### Delivery Settings
- Enable/disable delivery mode
- Set fee + minimum order (integer ARS cents)
- Radius kilometers
- Free delivery threshold
- Pause delivery independently per location
- GPS validation on address entry

### Inventory (Experimental)
- Item stock levels (per-location)
- Low stock alerts
- Depletion tracking
- Bulk edit stock

### AI Assistant (FoodSpot AI)
- Chat interface (owner can ask business questions)
- Context from business data (orders, customers, revenue, events)
- Suggestions (pricing, promotions, event ideas based on data)
- Proactive insights ("you had 40% more orders on Friday, consider promo")
- Multi-language support (respects owner language setting)
- Rate-limited (Pro tier feature)

### Printing (ESC/POS)
- Network printer discovery (TCP/IP-first)
- Receipt format (80mm thermal width, tear line indicators)
- Print on order placement
- Print on delivery completion
- Include: order code, items, total, payment method, delivery address
- UGC trigger indicator (shows "📸 UGC Receipt" if eligible)
- Multiple printer support (kitchen vs. delivery)

---

## 🔵 TECHNICAL & INFRASTRUCTURE

### Database & Auth
- Supabase (PostgreSQL backend)
- Row-level security (RLS) on all tables
- Multi-tenant scoping via `business_id`
- Soft deletes (deleted_at column) for locations, users
- Role-based access control (auth.users with custom `user_role` claims)
- Custom RPCs:
  - `get_owner_locations()` — fetch all owner's locations (filtered deleted)
  - `delete_location()` — soft delete with primary location check
  - `create_linked_location()` — auto-copy menu + inherit Pro status
  - `get_locations_by_parent_slug()` — hub page location discovery
  - `transition_order_state()` — atomic status machine (locked state transitions)
  - `get_combined_stats()` — aggregate revenue across locations
  - `record_cash_payment()` — log cash orders (ledger-based)

### Frontend Stack
- React 18 (Hooks + Context API)
- Vite (fast build, HMR)
- Tailwind CSS v3
- Framer Motion (animations, page transitions)
- React Router v6 (multi-tenant routing)
- Lucide Icons (UI icons)
- Recharts (analytics charts, PDF export via library)

### State Management
- React Context:
  - `TenantContext` — multi-tenant slug routing, branding, businessId
  - `LanguageContext` — i18n (es/en/pt)
  - `AuthContext` — Supabase session state
- Local storage (guest tokens, staff shifts, UI preferences)
- Supabase Realtime (live order updates)

### Offline & Resilience
- Offline mutation queue (`offlineQueue.ts`) for staff-ops
- Guest session tokens (localStorage-scoped per tenant)
- Retry logic on failed requests
- Auto-refresh order status every 5s (fallback if Realtime drops)

### Internationalization (i18n)
- 3 languages: Spanish (ES), English (EN), Portuguese (PT)
- ~400+ translation keys (menu, orders, CRM, events, settings, errors)
- Owner can set tenant language globally (applies to all customers at that location)
- Fallback to English if key missing

### Responsive Design
- Mobile-first (375px viewport baseline)
- Tablet breakpoints (768px, 1024px)
- Desktop optimizations (sidebar nav, wider layouts)
- Touch-friendly button sizes (48px min)
- Safe area support (notch-aware for iOS)

### Dark Mode
- System preference detection
- Manual toggle (settings page)
- CSS variables for theming (`--color-primary`, `--text-primary`, `--canvas-bg`, etc.)
- Persistent user preference (localStorage)

### Build & Deployment
- Two Vite entries:
  - `index.html` — main app (customer + owner + admin)
  - `staff-ops.html` — isolated PWA (staff dashboard, TypeScript, shadcn/ui)
- Vercel deployment (auto-preview on PR, production on main)
- Build size: ~2MB gzipped (main.js)
- Asset optimization: image resizing, lazy loading

### Edge Functions (Supabase)
- `create-preference` — Mercado Pago checkout preference creation
- `create-split-preference` — MP split payments (delivery partner cut)
- `mp-webhook` — MP payment notification handler
- `mp-split-webhook` — MP split payment webhook
- HMAC verification on all webhooks (MP signature check)
- Idempotent (duplicate webhooks ignored)

---

## 🔴 MISSING / NOT BUILT (Competitive Gaps vs. Fudo/Pedix)

### Accounting & Taxes
- **AFIP integration** (Argentine tax authority)
- **Invoice generation** (A, B, C invoice types)
- **Tax reporting** (VAT, withholding, monthly/annual)
- **Ledger exports** (for accountants)
- **Expense tracking** (input costs, raw materials)
- **Profit/loss statements** (auto-calculated)

### Financial Tools
- **Payroll system** (staff salary tracking, deductions)
- **Commission tracking** (delivery driver earnings)
- **Subscription billing** (recurring charge management beyond MP)
- **Advanced splits** (fixed vs. % cuts, multiple parties)
- **Dunning** (retry failed payments, decline handling)

### AI & Automation
- **WhatsApp integration** (order placement + support chat via WhatsApp API)
- **WhatsApp AI agent** (chatbot for order status, FAQs, promo notifications)
- **Email campaigns** (bulk messaging to customer list)
- **SMS notifications** (order updates via SMS)
- **Proactive discounts** (AI recommends when/what to discount)

### Operations
- **Table management** (for dine-in restaurants)
- **Reservation calendar** (visual calendar, overbooking prevention)
- **Kitchen display system (KDS)** (iPad/tablet view of incoming orders)
- **Supply chain tracking** (inventory replenishment from suppliers)
- **Labor scheduling** (shift scheduler, labor cost calculator)

### Customer Engagement
- **Loyalty tiers** (bronze/silver/gold with escalating rewards)
- **Personalization** (recommend items based on order history)
- **SMS/Email blasts** (send to customer list)
- **Push notifications** (for upcoming promotions, new items)
- **Review/rating system** (collect feedback post-delivery)

### Integrations
- **Rappi API** (delivery order fulfillment) — **BLOCKED** (API not available to us)
- **Pedidos Ya API** (order aggregation) — **BLOCKED** (API not available to us)
- **Instagram Shopping** (sell directly from IG posts)
- **Google Business Profile** (orders via Google)
- **POS system** (Square, Toast, Clover sync)
- **ERP/Accounting software** (Zoho, QuickBooks, SAP)

### Analytics
- **Customer lifetime value (CLV)** (predict high-value customers)
- **Churn prediction** (identify at-risk customers)
- **Cohort analysis** (group customers by signup date, track retention)
- **A/B testing** (test different menu prices, promo messaging)
- **Forecasting** (predict demand, staffing needs)

### Compliance & Security
- **PCI DSS compliance** (we use MP, so partially handled)
- **GDPR/LGPD** (data export, deletion, consent tracking)
- **Fraud detection** (suspicious orders, chargebacks)
- **Two-factor auth** (2FA for owner login)
- **API keys management** (for third-party integrations)

---

## 📊 SUMMARY TABLE

| Category | FoodSpot | Fudo | Pedix | Notes |
|----------|----------|------|-------|-------|
| **Customer Ordering** | ✅ | ✅ | ✅ | Core feature, all have it |
| **Live Order Tracking** | ✅ | ✅ | ✅ | Real-time updates |
| **Multi-Location Hub** | ✅ | ✅ | ✅ | Linktree-style discovery |
| **UGC/Camera Module** | ✅ | ❌ | ❌ | **Our differentiator** |
| **Loyalty Points** | ✅ | ✅ | ✅ | Basic points system |
| **Events/Tickets** | ✅ | ❌ | ❌ | Emerging feature |
| **Dark Mode** | ✅ | ✅ | ✅ | UX standard |
| **3 Languages** | ✅ | ✅ | ✅ | ES/EN/PT |
| **AI Assistant** | ✅ | ✅ | ✅ | Business insights |
| **Invoice/AFIP** | ❌ | ✅ | ✅ | **We're missing this** |
| **Payroll** | ❌ | ✅ | ✅ | **We're missing this** |
| **WhatsApp AI** | ❌ | ✅ | ❌ | Fudo's edge |
| **Offline Orders** | ✅ | ❌ | ❌ | Queue system |
| **KDS (Kitchen Display)** | ❌ | ✅ | ✅ | **We're missing this** |
| **Delivery Aggregation** | ❌ | ✅ | ✅ | Rappi/PY (API blocked) |
| **Accounting Reports** | ❌ | ✅ | ✅ | **We're missing this** |

---

## 🎯 WHAT FUDO HAS THAT WE DON'T

1. **AFIP/Tax Invoicing** — automatic invoice generation, tax compliance
2. **WhatsApp AI agent** — place orders, check status, get support via WhatsApp
3. **Accounting module** — ledger, expense tracking, profit/loss statements
4. **KDS (Kitchen Display System)** — tablet interface for kitchen staff
5. **Payroll integration** — staff salary tracking, commission calculations
6. **Rappi/Pedidos Ya integration** — order aggregation from third-party apps

---

## 🎯 WHAT PEDIX HAS THAT WE DON'T

1. **AFIP/Invoice system** — legal invoicing for restaurants
2. **KDS (Kitchen Display System)** — real-time kitchen orders on tablet
3. **Advanced payroll** — complex commission + tip handling
4. **Accounting exports** — for external accountants
5. **Rappi/Pedidos Ya** — third-party order fulfillment

---

## 💡 BIGGEST OPPORTUNITY GAPS (Priority Order)

1. **AFIP + Invoice System** (high complexity, legal requirement in AR)
   - Required for any serious restaurant business
   - Opens door to SMB market
   
2. **WhatsApp AI + Chatbot** (medium complexity, high engagement)
   - Fudo's differentiator
   - Increases order volume, customer retention
   
3. **KDS (Kitchen Display System)** (low-medium complexity)
   - Staff-facing, critical for multi-item restaurants
   - Reduces order errors, speeds up kitchen
   
4. **Accounting Module** (high complexity)
   - Expensive integrations (QuickBooks, Zoho)
   - But essential for owner peace of mind
   
5. **Delivery Aggregation** (blocked by API access)
   - Not viable unless Rappi/Pedidos Ya grant us access

---

