# Expired Events Feature Plan

## Overview
Prevent accidental ticket claims on past events by disabling booking, showing status, and greying out expired events.

## Implementation Strategy

### 1. Helper Function
Create utility to check if event is expired:
```js
const isEventExpired = (eventDate) => new Date(eventDate) < new Date()
```

### 2. Files to Modify

#### EventDetail.jsx
- Add expired check at top
- Show "Event Ended" badge if expired
- Disable all interactive elements
- Grey out event card (opacity: 0.5, filter: grayscale)

#### EventCheckout.jsx
- Add expired check
- If expired: show "Event Ended" message instead of checkout form
- Disable all book/claim buttons
- Grey out event details card

#### EventDiscovery.jsx (if list view exists)
- Grey out expired event cards in grid
- Add "Ended" label or reduced opacity
- Make cards non-clickable or show tooltip

### 3. Visual Changes

**Badge placement:** Top of event image (like "EXCLUSIVE" badge)
- Text: "EVENT ENDED"
- Style: Red/grey background, white text
- Position: Absolute, top-right area

**Card greying:**
- Opacity: 0.5
- Filter: `grayscale(1)` or `saturate(0.3)`
- Pointer-events: none (prevent accidental clicks)

**Button state:**
- Disabled: true
- Opacity: 0.5
- Cursor: not-allowed
- Show tooltip: "This event has ended"

### 4. Date Check Logic
```js
const eventDate = new Date(event.date)
const now = new Date()
const isExpired = eventDate < now
```

### 5. User Flow
1. User clicks expired event → sees "Event Ended" badge
2. All booking buttons are disabled/greyed
3. If they try to book → button is disabled, can't interact
4. Message shown: "This event has ended"

## Files Involved
- `src/pages/customer/events/views/EventDetail.jsx`
- `src/pages/customer/events/views/EventCheckout.jsx`
- `src/pages/customer/events/views/EventDiscovery.jsx` (optional, if grid view)
- `src/utils/eventHelpers.js` (new file for shared logic)

## Status
**Planned** — Ready to implement after current edits complete
