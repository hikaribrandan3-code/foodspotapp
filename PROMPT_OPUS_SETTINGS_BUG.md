# P0 Settings.jsx Color Revert Bug — Handoff to Opus 4.6

## Bug Summary
Settings.jsx color selectors work temporarily but revert:
- **Hero icons**: Change color → saves → reverts back to old color immediately
- **Navbar**: Change color → saves → sticks until reload → reverts on reload
- **Theme colors (primary, secondary, confirmation, powered_by)**: Same as navbar
- **Info pills**: Same as hero icons (reverts after save)

## All Previous Attempts (Failed)

### Attempt 1-3: CSS Variable Capture Strategy
- Tried capturing CSS variables before async operations
- Used getComputedStyle → switched to style.getPropertyValue
- Added debug logging
- **Result**: Still 400 errors and reverts

### Attempt 4-7: Local State Pattern ("Munchboy Pattern")
**Commits**: c68bee4, 4c3d19d, cd42ca6, df56a19

1. **Added `localThemeColors` state** — mirrors munchboy color pattern
2. **Added `justSavedRef`** — prevents useEffect from overwriting after save
3. **Updated ColorPillar** — reads from localThemeColors instead of tenant
4. **Updated navbarColor** — reads from localThemeColors
5. **Fixed hero_icons save** — builds payload from heroIconColors local state

**Result**: Still broken — same revert behavior

## Root Cause Hypotheses

### Hypothesis 1: `syncContext` Mutation
```javascript
const syncContext = (updates) => {
    window.dispatchEvent(new CustomEvent('frontendSync', { detail: updates }));
    if (tenant) {
        Object.assign(tenant, updates);  // ← Direct mutation!
    }
};
```
This mutates tenant directly. React doesn't know about it. But save reads from local state now, so shouldn't matter...

### Hypothesis 2: `refreshTenantData()` Updates Context
```javascript
const { tenantData: tenant, businessId, refreshTenantData } = useTenant();
```
After save, we call `refreshTenantData()` which updates `tenant` from DB. If Supabase returns stale data (replica lag), tenant now has old colors.

Even with `localThemeColors`, something is still reading from tenant.

### Hypothesis 3: Multiple State Sources
There are 3+ places colors live:
1. `tenant?.primary_color` (from useTenant context)
2. `localThemeColors.primary` (local state)
3. CSS variables `--color-primary` (DOM)
4. `localIdentity` (for name/font)
5. `heroIconColors` (for icons)
6. `colorPickerState` (for picker modal)

Some component or handler is reading from the wrong source.

### Hypothesis 4: useEffect Dependency Hell
The useEffect that syncs from tenant runs on every tenant change:
```javascript
useEffect(() => {
    if (tenant?.id) {
        // ... sync local state from tenant
        if (!hasChanges && !justSavedRef.current) {
            setLocalThemeColors({...})  // ← Overwrites local changes!
        }
    }
}, [tenant, hasChanges, businessId]);  // ← tenant changes = re-sync
```

After `refreshTenantData()`, tenant updates → useEffect runs → overwrites local state with stale data.

The `justSavedRef` should prevent this but doesn't seem to be working.

## Files Modified
- `/src/pages/owner/Settings.jsx` — Multiple changes across commits c68bee4 through df56a19

## Key Code Sections

### Local State Declaration
```javascript
// Line ~89
const [localThemeColors, setLocalThemeColors] = useState({
    navbar: '#1F2937',
    primary: '#B8956A',
    secondary: '#A89070',
    confirmation: '#22C55E',
    poweredBy: '#C4856A'
});

// Line ~121
const [heroIconColors, setHeroIconColors] = useState({
    menu: '#FFFFFF',
    delivery: '#FFFFFF',
    promos: '#FFFFFF',
    game: '#FFFFFF'
});
```

### Save Function
```javascript
const handlePlatformSave = async () => {
    setIsSaving(true);
    try {
        const currentPrimary = localThemeColors.primary;  // Using local state
        const heroIconsPayload = Object.entries(heroIconColors).reduce(...);  // From local
        
        const payload = {
            primary_color: currentPrimary,
            hero_icons: heroIconsPayload,
            // ... other fields
        };
        
        await updateBranding(payload, businessId);
        justSavedRef.current = true;  // Flag set
        await refreshTenantData();    // This updates tenant
        
        setHasChanges(false);  // This triggers useEffect
    } finally {
        setIsSaving(false);
    }
};
```

### useEffect That Overwrites
```javascript
useEffect(() => {
    if (tenant?.id) {
        // Sync local identity
        setLocalIdentity({...});
        
        // Sync hero icons
        setHeroIconColors({...});
        
        // Sync theme colors (CONDITIONAL)
        if (!hasChanges && !justSavedRef.current) {
            setLocalThemeColors({...});  // ← This shouldn't run after save
        }
        
        justSavedRef.current = false;  // Reset flag
    }
}, [tenant, hasChanges, businessId]);
```

### Color Picker Apply
```javascript
const handleColorPickerApply = (finalColor) => {
    if (colorPickerState.isHeroIcon) {
        handleHeroIconColorUpdate(colorPickerState.iconId, finalColor);
    } else if (colorPickerState.keyName.startsWith('info_pill_')) {
        // Info pills - same pattern as hero icons
        const pillId = colorPickerState.keyName.replace('info_pill_', '');
        const currentPills = tenant?.info_pills || {};
        const newPills = {...currentPills, [pillId]: { ...currentPills[pillId], bgColor: finalColor }};
        handleFieldUpdate('info_pills', newPills);  // ← Uses tenant as base!
    } else {
        handleFieldUpdate(colorPickerState.keyName, finalColor);
    }
};
```

### handleFieldUpdate
```javascript
const handleFieldUpdate = async (field, value) => {
    // Set CSS variables
    if (field === 'primary_color') document.documentElement.style.setProperty('--color-primary', value);
    
    // Update local state for theme colors
    if (field === 'primary_color') setLocalThemeColors(prev => ({ ...prev, primary: value }));
    
    syncContext({ [field]: value });  // ← Mutates tenant
    setHasChanges(true);
};
```

## Current State of Settings.jsx

The file has been modified 4 times in the last hour. Current issues:

1. **Hero icons revert after save** — even though save uses `heroIconColors` local state
2. **Navbar reverts on reload** — saves temporarily but not to DB?
3. **Theme colors same as navbar** — temporary save, reverts on reload
4. **Info pills revert after save** — similar to hero icons

## Supabase Schema
Table: `branding`
Key columns: `primary_color`, `secondary_color`, `confirmation_color`, `powered_by_color`, `navbar_color`, `hero_icons` (jsonb), `info_pills` (jsonb)

## The Ask

1. **Audit Settings.jsx** — Find why colors revert despite local state pattern
2. **Check updateBranding** — Verify it's actually persisting to Supabase
3. **Check RLS policies** — Ensure owner can update branding table
4. **Check payload structure** — Ensure it matches Supabase column names exactly
5. **Check useEffect dependencies** — The justSavedRef flag isn't working

Focus on: **Why does tenant context still have stale data after save?**

## Files to Review
- `/src/pages/owner/Settings.jsx` (current state with all 4 commits)
- `/src/lib/supabaseClient.js` — check updateBranding function
- `/src/contexts/TenantContext.jsx` — check refreshTenantData

## User's Request
> "send me the prompt" — User wants to copy-paste this to Opus 4.6

Ready for Opus 4.6 analysis.
