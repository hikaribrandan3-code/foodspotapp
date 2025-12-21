// Demo Events Utility
// Simulates backend-style webhook events for demo mode ONLY
// Storage: localStorage key 'foodspot_demo_events' (demo-isolated)

const DEMO_EVENTS_KEY = 'foodspot_demo_events'
const MAX_EVENTS = 100 // Cap to prevent storage bloat

/**
 * Generate a simple UUID for event IDs
 */
function generateId() {
    return 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9)
}

/**
 * Emit a demo event (webhook-style payload)
 * This function is designed to be easily replaced with a real backend call later.
 * 
 * @param {string} type - Event type (e.g., 'order.created', 'menu.updated')
 * @param {object} payload - Event-specific data
 * @returns {object} The created event
 */
export function emitDemoEvent(type, payload) {
    const event = {
        id: generateId(),
        type,
        timestamp: new Date().toISOString(),
        payload,
        delivery: {
            status: 200,
            message: 'OK'
        }
    }

    try {
        const events = getDemoEvents()
        events.unshift(event) // Add to beginning (newest first)

        // Cap at MAX_EVENTS to prevent storage bloat
        const trimmedEvents = events.slice(0, MAX_EVENTS)

        localStorage.setItem(DEMO_EVENTS_KEY, JSON.stringify(trimmedEvents))

        console.log(`[Demo Webhook] ${type}`, payload)
        return event
    } catch (e) {
        console.error('[Demo Webhook] Error storing event:', e)
        return event
    }
}

/**
 * Get all demo events (newest first)
 * @returns {Array} Array of event objects
 */
export function getDemoEvents() {
    try {
        const stored = localStorage.getItem(DEMO_EVENTS_KEY)
        return stored ? JSON.parse(stored) : []
    } catch (e) {
        console.error('[Demo Events] Error reading events:', e)
        return []
    }
}

/**
 * Clear all demo events
 */
export function clearDemoEvents() {
    try {
        localStorage.removeItem(DEMO_EVENTS_KEY)
        console.log('[Demo Webhook] Events cleared')
    } catch (e) {
        console.error('[Demo Webhook] Error clearing events:', e)
    }
}

/**
 * Get event count
 * @returns {number}
 */
export function getDemoEventCount() {
    return getDemoEvents().length
}
