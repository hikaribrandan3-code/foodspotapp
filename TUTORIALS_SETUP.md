# Tutorials Infrastructure - Setup Complete

## What's Built

A complete tutorial system scaffold for both owner and staff with video player placeholders ready for Remotion integration.

### Owner Tutorials (4 videos)
1. **Add Menu Item** — Add items, photos, prices (2:30)
2. **Add Your Logo** — Upload branding, set colors (1:45)
3. **Kitchen Display System** — What staff sees when orders come in (3:15)
4. **View Orders & Revenue** — Check daily money (2:00)

**Route:** `/:tenantSlug/owner/tutorials`

### Staff Tutorials (1 video)
1. **KDS Workflow** — Accept orders, mark done, send to customer (3:45)

**Route:** `/:tenantSlug/staff/tutorials`

---

## Files Created

1. **`src/pages/owner/Tutorials.jsx`** — Owner tutorial page with card grid
2. **`src/pages/staff/Tutorials.jsx`** — Staff tutorial page with card grid

Both pages have:
- Tutorial list with play buttons
- Modal video player placeholder
- "Coming Soon" banner (videos not yet integrated)
- Responsive dark mode support
- Tailwind styling matching FoodSpot design system

---

## Files Modified

1. **`src/components/BackendNav.jsx`**
   - Added `tutorials` tab to `OWNER_TABS` and `STAFF_TABS`
   - Added tutorials routes to `getRouteMaps()`
   - Added tutorials icon (play/video icon)

2. **`src/App.jsx`**
   - Added lazy imports: `OwnerTutorials` and `StaffTutorials`
   - Added routes: `/:tenantSlug/owner/tutorials` and `/:tenantSlug/staff/tutorials`

---

## Navigation

### Desktop/Tablet Sidebar
Tutorials tab appears in the sidebar navigation for both owner and staff. Icon is a play button (video icon).

### Mobile
Not yet implemented — can be added to bottom nav later if needed.

---

## Next Steps: Remotion Integration

1. **Create video components** for each tutorial ID:
   - `OwnerMenuSetup.jsx` 
   - `OwnerAddLogo.jsx`
   - `OwnerKDSOverview.jsx`
   - `OwnerViewOrders.jsx`
   - `StaffKDSWorkflow.jsx`

2. **Build with Remotion** — vertical video format (9:16, mobile-first)

3. **Wire video player modal** in the tutorial pages:
   ```jsx
   {selectedTutorial && <VideoPlayer tutorialId={selectedTutorial} />}
   ```

4. **Add translations** to `src/lib/translations.js` if needed (currently English)

---

## Current State

✅ Routes wired  
✅ Navigation tabs added  
✅ UI component scaffold complete  
✅ Dark mode support  
✅ Responsive design  
❌ Remotion videos (next phase)  
❌ Video player integration (ready for videos)  
❌ Mobile bottom nav (optional later)

---

## Testing

**Owner:** Navigate to `/:tenantSlug/owner/tutorials` (requires owner login)  
**Staff:** Navigate to `/:tenantSlug/staff/tutorials`

Both pages show tutorial cards with "Coming Soon" message — ready for Remotion video content.
