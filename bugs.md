# Known Issues - Post Launch

## Attendee Count Not Updating in Real-Time

**Status:** Deferred to post-launch  
**Priority:** Medium  
**Description:** After a successful check-in, the detail view shows "0/10" sold count and doesn't update immediately. The count only updates when the user manually clicks the "Attendees" tab.

**Current Behavior:**
- Check-in succeeds, guest checks in
- Detail view still shows "0/10" sold
- Must click "Attendees" tab to see updated count

**Expected Behavior:**
- After check-in, detail view should immediately show updated sold count (e.g., "1/10")
- No manual tab switching required

**Root Cause:**
- Window event listener fires and calls `fetchEvents()`
- `dbEvents` updates in the hook
- `selectedEvent` isn't automatically syncing with the updated `dbEvents`
- DetailView re-renders with stale `selectedEvent` data

**Potential Fix:**
- Ensure `useEffect` that watches `dbEvents` properly updates `selectedEvent` 
- May need to refactor to use real-time Supabase subscriptions instead of manual refetch
- Consider if the hook's `refetch` function is actually updating state correctly

**Files Involved:**
- `src/components/owner/OwnerEventsView.jsx` (CheckinView, EventDetailView)
- `src/hooks/useOwnerEvents.js` (event fetching logic)

**Test Case:**
1. Create test event with 1 ticket tier (capacity 10)
2. Enter owner check-in view
3. Scan/enter valid 6-digit code
4. Verify sold count updates immediately (0/10 → 1/10)
5. Verify attendee list shows new check-in without manual tab switch
