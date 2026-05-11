# Category Delete Bug - Confirmation Not Showing

## The Bug
After holding a category pill for 1.3 seconds (it turns red with "🗑️ Delete"), tapping the red pill does NOT show the Yes/No confirmation buttons.

## What Should Happen
1. User holds category for 1.3s → `heldCategoryId` state is set → button turns red
2. User taps the red button → `confirmingCategoryId` state is set → Yes/No confirmation div should render below the button
3. User taps Yes → category is deleted

## What's Actually Happening
Steps 1 works fine. Step 2: Red button appears, but tapping it does nothing - the Yes/No confirmation never appears.

## What We Tried (Failed)

### Attempt 1: Removed Double-Tap Detection
**Theory:** Double-tap detection is unreliable on mobile, causing the confirmation to not trigger.

**What was changed:**
- Removed `lastTapRef` initialization
- Removed `handleCategoryDoubleTap()` function
- Changed onClick from calling `handleCategoryDoubleTap(cat.id)` to directly calling `setConfirmingCategoryId(cat.id)`

**Result:** Still doesn't work. The Yes/No confirmation doesn't appear.

### Attempt 2: Added stopPropagation to onClick
**Theory:** Event bubbling is preventing the click handler from firing or setting state.

**What was changed:**
```jsx
onClick={(e) => {
  if (heldCategoryId === cat.id) {
    e.stopPropagation();  // Added this
    setConfirmingCategoryId(cat.id);
  } else {
    onSelectCategory(cat.id);
  }
}}
```

**Result:** Still doesn't work. Confirmation still doesn't appear when tapping the red button.

## Current Code State

**File:** `src/pages/owner/MenuManager/MenuTab.jsx`

Category button rendering:
```jsx
<button
  onMouseDown={(e) => handleCategoryPress(cat.id, e)}
  onMouseUp={(e) => handleCategoryRelease(e)}
  onMouseLeave={(e) => handleCategoryRelease(e)}
  onTouchStart={(e) => handleCategoryPress(cat.id, e)}
  onTouchEnd={(e) => handleCategoryRelease(e)}
  onContextMenu={(e) => e.preventDefault()}
  onClick={(e) => {
    if (heldCategoryId === cat.id) {
      e.stopPropagation();
      setConfirmingCategoryId(cat.id);
    } else {
      onSelectCategory(cat.id);
    }
  }}
  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all select-none ${
    heldCategoryId === cat.id
      ? 'bg-red-100 text-red-700 border border-red-300'
      : activeCategory === cat.id
      ? 'bg-emerald-600 text-white shadow-lg'
      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
  }`}
>
  {heldCategoryId === cat.id ? '🗑️ Delete' : `${cat.name} (${cat.count})`}
</button>

{confirmingCategoryId === cat.id && (
  <div className="absolute top-full mt-2 left-0 flex gap-2 z-50" onClick={(e) => e.stopPropagation()}>
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleCategoryDelete(cat.id, cat.name);
      }}
      className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-all"
    >
      Yes
    </button>
    <button
      onClick={(e) => {
        e.stopPropagation();
        setConfirmingCategoryId(null);
        setHeldCategoryId(null);
      }}
      className="px-2 py-1 rounded-full text-xs font-bold bg-stone-300 text-stone-700 hover:bg-stone-400 transition-all"
    >
      No
    </button>
  </div>
)}
```

Event handlers:
```jsx
const handleCategoryPress = (categoryId, e) => {
  if (e?.type?.includes('touch')) {
    e.preventDefault();
  }
  longPressTimerRef.current = setTimeout(() => {
    setHeldCategoryId(categoryId);
  }, 1300);
};

const handleCategoryRelease = (e) => {
  if (e?.type?.includes('touch')) {
    e.preventDefault();
  }
  if (longPressTimerRef.current) {
    clearTimeout(longPressTimerRef.current);
  }
};
```

## Debugging Notes
- The red button DOES appear when held (heldCategoryId is being set correctly)
- The Yes/No buttons ARE in the DOM (verified via accessibility tree)
- But they're not responding to clicks / not visible to user
- React state `confirmingCategoryId` may not be getting set on click
- Could be a React synthetic event issue
- Could be the onMouseUp/onTouchEnd handlers interfering
- Could be CSS visibility/overflow issue with positioning

## Test Environment
- Mobile viewport (375x812)
- React 18 + Vite
- Tailwind CSS
- Tested in dev server at localhost:5173

## Files to Check
- `src/pages/owner/MenuManager/MenuTab.jsx` - Main component with the bug
- `src/pages/owner/MenuManager/MenuManager.jsx` - Parent component that calls onDeleteCategory

## What Needs to Happen
Figure out why `confirmingCategoryId` state is not being set when the red delete button is clicked, OR why the confirmation div is not visible even if the state is being set.
