# Grub Club App — Implementation Plan

A mobile-first web application for cafés, bakeries, and food venues enabling menu browsing, order-ahead, rewards, and Instagram-driven marketing — all without logins or online payments.

## Reference Design

![Grub Club Design Mockup](/Users/daiskebrandan/.gemini/antigravity/brain/850b27af-1788-4728-9555-be075d5439df/uploaded_image_1765317802050.jpg)

---

## User Review Required

> [!IMPORTANT]
> **Technology Choice**: Planning to use **Vite + React** for component-based architecture with fast development. This matches the Court Club App approach for consistency. Please confirm or suggest an alternative.

> [!IMPORTANT]  
> **Design System**: The mockup shows a warm beige/cream palette with brown accents. I'll implement this exact aesthetic with:
> - Background: `#F5F0E8` (warm cream)
> - Cards: `#E8DFD3` (muted beige)
> - Accent: `#8B7355` (warm brown)
> - Text: `#4A3F35` (dark brown)

> [!WARNING]
> **No Backend**: All data persists in localStorage only. Closing/clearing browser storage will reset all data except the seeded menu.

---

## Proposed Changes

### Project Structure

```
/grub-club-app
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css              # Design system & global styles
│   ├── config/
│   │   ├── appConfig.js       # Business branding & feature toggles
│   │   └── menuData.js        # Seeded Argentine menu items
│   ├── utils/
│   │   ├── storage.js         # localStorage utilities
│   │   └── demoData.js        # Demo mode data generator
│   ├── hooks/
│   │   ├── useOrders.js       # Order management
│   │   ├── useRewards.js      # Rewards tracking
│   │   └── useAuth.js         # Simple password auth for staff/owner
│   ├── components/
│   │   ├── BottomNav.jsx      # 5-tab navigation
│   │   ├── QuickActions.jsx   # 6-button home grid
│   │   ├── MenuItem.jsx       # Menu item card
│   │   ├── OrderItem.jsx      # Order list item
│   │   ├── StampCard.jsx      # Rewards visual
│   │   └── StatusBadge.jsx    # Order status indicator
│   └── pages/
│       ├── customer/
│       │   ├── Home.jsx
│       │   ├── Menu.jsx
│       │   ├── Order.jsx
│       │   ├── Receipt.jsx
│       │   ├── OrderStatus.jsx
│       │   ├── Rewards.jsx
│       │   ├── ShareFood.jsx
│       │   └── PerfectPour.jsx
│       ├── staff/
│       │   ├── StaffLogin.jsx
│       │   └── StaffDashboard.jsx
│       ├── owner/
│       │   ├── OwnerLogin.jsx
│       │   ├── MenuManager.jsx
│       │   ├── RewardsManager.jsx
│       │   ├── Settings.jsx
│       │   └── Analytics.jsx
│       └── admin/
│           └── SuperAdmin.jsx
```

---

### Core Configuration

#### [NEW] [appConfig.js](file:///Users/daiskebrandan/.gemini/antigravity/scratch/grub-club-app/src/config/appConfig.js)

```javascript
export const appConfig = {
  businessName: "Grub Club",
  logo: null, // URL or data URI
  colors: {
    primary: "#8B7355",
    background: "#F5F0E8",
    card: "#E8DFD3",
    text: "#4A3F35"
  },
  features: {
    ordersEnabled: true,
    rewardsEnabled: true,
    gameEnabled: true,
    instagramSharingEnabled: true
  },
  demoMode: false, // Super Admin only
  maintenanceMode: false,
  pauseOrders: false,
  openingHours: {
    // Day-based schedule
  }
};
```

#### [NEW] [menuData.js](file:///Users/daiskebrandan/.gemini/antigravity/scratch/grub-club-app/src/config/menuData.js)

Pre-seeded Argentine café menu with all PRD items organized by category:
- **Bebidas Calientes**: Café solo ($1.500), Cortado ($1.700), etc.
- **Bebidas Frías**: Café frío ($2.300), Limonada ($2.000), etc.
- **Panadería**: Medialuna de manteca ($900), Croissant ($1.800), etc.
- **Postres**: Alfajor artesanal ($1.400), Brownie ($2.300), etc.

---

### Customer Features

#### [NEW] [Home.jsx](file:///Users/daiskebrandan/.gemini/antigravity/scratch/grub-club-app/src/pages/customer/Home.jsx)

- Brand logo and name header
- Dynamic greeting based on time of day
- 6-button quick action grid (matching mockup exactly):
  1. Ver menú
  2. Pedir para retirar
  3. Estado del pedido
  4. Recompensas
  5. Compartí tu comida
  6. Jugar (mini game)

#### [NEW] [Menu.jsx](file:///Users/daiskebrandan/.gemini/antigravity/scratch/grub-club-app/src/pages/customer/Menu.jsx)

- Category tabs (Bebidas, Panadería, Postres)
- Item cards with name, price, optional image
- Availability badges (Disponible/Agotado)
- "Recomendado del día" highlight

#### [NEW] [Order.jsx](file:///Users/daiskebrandan/.gemini/antigravity/scratch/grub-club-app/src/pages/customer/Order.jsx)

- Item selection with quantity controls
- Extras selection per item
- Order review before submission
- "Confirmar pedido" button (disables on submit)
- Visual confirmation "Pedido enviado ✅"

#### [NEW] [Receipt.jsx](file:///Users/daiskebrandan/.gemini/antigravity/scratch/grub-club-app/src/pages/customer/Receipt.jsx)

- Large order number (#XXX) fixed at top
- Receipt-style item list with extras
- Total amount display
- "Se paga en caja" / "Pagado en caja ✅" status

#### [NEW] [PerfectPour.jsx](file:///Users/daiskebrandan/.gemini/antigravity/scratch/grub-club-app/src/pages/customer/PerfectPour.jsx)

- Coffee-themed timing mini-game
- One-tap interaction
- 10-15 second rounds
- Near-miss feedback
- No rewards (engagement only)

---

### Staff Dashboard

#### [NEW] [StaffDashboard.jsx](file:///Users/daiskebrandan/.gemini/antigravity/scratch/grub-club-app/src/pages/staff/StaffDashboard.jsx)

Password-protected view with:
- Incoming orders list (newest first)
- Status change buttons: Enviado → En preparación → Listo → ✅ Entregado
- Payment validation toggle per order
- Quick item availability toggles
- Pause orders toggle

---

### Owner Dashboard

#### [NEW] [MenuManager.jsx](file:///Users/daiskebrandan/.gemini/antigravity/scratch/grub-club-app/src/pages/owner/MenuManager.jsx)

- Edit item names and prices
- Toggle item availability
- Set "Recomendado del día"
- Add/remove items

#### [NEW] [Analytics.jsx](file:///Users/daiskebrandan/.gemini/antigravity/scratch/grub-club-app/src/pages/owner/Analytics.jsx)

Numbers-only display (no charts):
- Orders: today / week / month
- Total visits
- Rewards redeemed
- Instagram shares

---

### Super Admin

#### [NEW] [SuperAdmin.jsx](file:///Users/daiskebrandan/.gemini/antigravity/scratch/grub-club-app/src/pages/admin/SuperAdmin.jsx)

Exclusive controls:
- Edit business name, logo, colors
- Feature toggles (orders, rewards, game, sharing)
- **Demo Mode toggle** (generates ~30 days of simulated data)
- "DEMO — datos simulados" indicator when active
- Full analytics access

---

## Data Architecture

### localStorage Keys

| Key | Description |
|-----|-------------|
| `grub_config` | Business settings & feature toggles |
| `grub_menu` | Menu items (seeded on first load) |
| `grub_orders` | All orders with status |
| `grub_rewards` | Customer reward stamps |
| `grub_analytics` | Visit/share counters |
| `grub_demo_mode` | Demo mode flag |
| `grub_demo_data` | Simulated demo data |

---

## Verification Plan

### Automated Browser Tests

Using the browser subagent, I will verify:

1. **Customer Flow**
   - Load app at `http://localhost:5173`
   - Navigate through all 6 quick actions
   - Browse menu categories
   - Add items to order and submit
   - Verify order number is displayed on receipt
   - Check order status updates

2. **Staff Flow**
   - Access staff login with password
   - View incoming orders
   - Change order status through all states
   - Toggle item availability

3. **Owner Flow**
   - Access owner dashboard
   - Edit menu item price
   - View analytics numbers

4. **Super Admin Flow**
   - Enable/disable demo mode
   - Verify demo indicator appears
   - Check demo data populates views

### Manual Verification (User)

After browser tests pass:

1. **Mobile Responsiveness**: Open in Chrome DevTools at 360×640 and verify:
   - All elements fit without horizontal scroll
   - Bottom navigation is easily tappable
   - Quick action buttons are properly sized

2. **localStorage Persistence**: 
   - Create an order
   - Refresh the page
   - Verify order persists

3. **Instagram Sharing**: Tap "Compartí tu comida" and confirm:
   - Instagram app/web opens (if available)
   - Fallback message if Instagram not available

---

## Build Commands

```bash
# Initialize project
cd /Users/daiskebrandan/.gemini/antigravity/scratch
npx -y create-vite@latest grub-club-app -- --template react

# Install dependencies
cd grub-club-app
npm install

# Start development server
npm run dev
```

---

## Timeline Estimate

| Phase | Effort |
|-------|--------|
| Project setup & design system | 1 session |
| Core data & state management | 1 session |
| Customer views (7 pages) | 2 sessions |
| Staff dashboard | 1 session |
| Owner dashboard | 1 session |
| Super Admin & Demo Mode | 1 session |
| Polish & testing | 1 session |

**Total: ~8 focused sessions**
