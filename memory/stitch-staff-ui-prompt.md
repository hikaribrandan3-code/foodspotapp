Redesign FoodSpot-OS staff backend UI/UX. We are a small business POS for food trucks, festivals, pop-ups in Argentina/LATAM. Staff are NOT tech people — they are cooks, runners, cashiers working fast under pressure.

## CURRENT STATE (SEE ATTACHED SCREENSHOTS)
Staff backend shows:
- Header bar with "En Vivo" indicator, active shift info
- Order cards in horizontal/vertical layout with customer name, address, phone, items, total
- Status flow: Pendiente → Confirmado → En Preparación → Listo → En Camino → Entregado
- Payment method selector (cash/MP) + "Confirmar Pago" button
- Broken QR scanner button (nerfed, don't include)
- Order action buttons at bottom of each card

## PROBLEMS WITH CURRENT UI
1. **Information density too high** — staff can't read a wall of text while cooking
2. **Status buttons unclear** — staff don't know which button advances the order
3. **Payment confirmation buried** — cash is 70% of orders, needs to be ONE TAP
4. **No visual hierarchy** — everything looks the same importance
5. **Order items hard to scan** — list format, not optimized for kitchen readability
6. **No timer/SLA indicator** — staff can't see which order is oldest
7. **Mobile-unfriendly** — tablets are primary device, buttons too small for greasy fingers
8. **No order priority** — all orders look the same, can't tell rush vs normal

## REAL-WORLD STAFF WORKFLOW (Design for this)

### Scenario A: Food Truck (Single staff, multitasking)
1. Customer orders at window → staff taps "New Order" or sees it appear
2. Staff glances at items (2-3 seconds max) → starts cooking
3. Customer pays cash → staff taps "💵 Paid" (ONE TAP, no dropdown, no confirm)
4. Food ready → staff taps "✅ Ready" → calls customer name
5. Done. Next customer.

### Scenario B: Festival Booth (2-3 staff, high volume)
1. Orders stream in from customer phones + staff tablet
2. Kitchen staff sees ONLY items + order number (no customer name, no address)
3. Runner sees full order details + customer location
4. Both see color-coded priority: 🔴 Late (>15min) 🟡 Due soon (>10min) 🟢 Normal
5. Cashier handles payment confirmation + change

### Scenario C: Quick-Service Restaurant (Counter + kitchen split)
1. Counter staff takes order → customer pays → order appears in kitchen
2. Kitchen staff sees ticket with items + modifications (no cheese, extra sauce)
3. Kitchen taps "Ready" → counter sees notification → calls order number
4. Runner delivers to table/counter

## REDESIGN REQUIREMENTS

### 1. KITCHEN DISPLAY SYSTEM (KDS) VIEW
Priority: HIGHEST. This is what kitchen staff stare at all day.
- Full-screen mode option (hide everything except active orders)
- Card layout: Order # | Items (bold, large font) | Mods (small, colored) | Timer | Action
- Color-coded by age: 🟢 <10min, 🟡 10-15min, 🔴 >15min, ⚫️ >30min (auto-cancel)
- ONE TAP to advance status (no dropdowns, no confirmations)
- Sound notification on new order (configurable)
- Auto-scroll: newest orders at top OR oldest at top (toggle)
- Group by order type: Delivery vs Pickup vs Dine-in (separate columns)

### 2. ORDER CARD REDESIGN
Current: Dense text block. New:
- Header strip: Order # + Timer (large) + Payment status icon
- Body: Items as chips/tags (not list). Each item: Name + Qty + Mods
- Footer: ONE primary action button (big, thumb-sized)
- Collapsed by default: Show summary. Tap to expand details (address, phone, full history)
- Swipe gestures: Swipe right = "Next Status", Swipe left = "Cancel/Refund"

### 3. PAYMENT UI (70% cash = FIRST CLASS)
- Cash button: 💵 (green, always visible, always ONE tap)
- MP button: 💳 (blue, shows "Pending" until webhook confirms)
- No dropdowns. No "Confirmar Pago" then select method. Direct action buttons.
- Change calculator: if cash, show "Customer paid: [input] → Change: $X" below order
- Auto-mark paid on cash orders after 5 minutes (assume they paid, configurable)

### 4. STAFF ROLE VIEWS
Not all staff need all info. Role-based tabs:
- **Kitchen:** Items only + order # + timer. No customer names, no addresses.
- **Runner:** Full details + customer location + phone + order #. No item prices.
- **Cashier:** Payment status + totals + change calculator. No item details.
- **Manager:** Everything + analytics + cancel/refund powers.

### 5. HEADER BAR REDESIGN
Current: Cluttered. New:
- Left: Active orders count (big number, updates realtime)
- Center: Time of day + "Shift: 2h 15m remaining" (subtle)
- Right: "En Vivo" pulse indicator (small, not distracting)
- Remove: Shift details (move to profile/menu), scanner button (nerfed), extra icons

### 6. EMPTY STATES
- No orders: "🎉 ¡Todo al día!" with celebratory icon (staff morale matters)
- One order: "1 orden activa" (singular, not "1 ordenes")
- Many orders: "🔥 12 órdenes — ¡Vamos!"

### 7. MOBILE/TABLET OPTIMIZATION
- Touch targets: minimum 48px (Apple HIG) or 56px for kitchen (greasy fingers)
- Font sizes: 16px minimum for items, 14px for details
- Contrast: high contrast mode option (kitchen lighting is variable)
- Landscape support: kitchen often mounts tablet horizontally
- Auto-lock prevention: screen stays on while shift active

## DESIGN TOKENS (Use these)
- Primary action: #22C55E (green — go, advance, confirm)
- Secondary action: #3B82F6 (blue — MP, info, details)
- Warning: #F59E0B (amber — pending, attention needed)
- Danger: #EF4444 (red — cancel, error, late order)
- Background: #F8FAFC (light gray canvas)
- Card background: #FFFFFF (white cards)
- Text primary: #1E293B (dark slate)
- Text secondary: #64748B (muted gray)
- Timer green: #10B981 (<10min)
- Timer amber: #F59E0B (10-15min)
- Timer red: #EF4444 (>15min)
- Timer black: #1E293B (>30min, strikethrough)

## WHAT TO AVOID
- No dropdowns for status changes (staff don't read while cooking)
- No modal confirmations ("Are you sure?" — yes they're sure, they just tapped)
- No scrollable lists inside cards (scroll the whole card, not inner areas)
- No tiny buttons (kitchen staff wear gloves, have wet hands)
- No blinking animations (distracting, annoying after 100 orders)
- No "Delete" near "Advance" (mis-taps happen, catastrophic)

## DELIVERABLES
1. **StaffDashboard.jsx** — main staff view with role selector
2. **KitchenView.jsx** — KDS full-screen kitchen display
3. **RunnerView.jsx** — delivery/pickup runner interface
4. **CashierView.jsx** — payment-focused counter view
5. **OrderCard.jsx** — redesigned order card component (shared across views)
6. **PaymentBar.jsx** — one-tap cash/MP payment component

Build for speed. Build for grease. Build for someone who hasn't slept and has 20 orders in queue.
