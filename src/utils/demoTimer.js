/**
 * Demo Timer Utility
 * Manages 5-minute timer for demo email popup
 * Uses sessionStorage only (clears on tab close)
 */

// Timer duration: 10 seconds in dev, 5 minutes in production
const DEMO_TIMER_MS = import.meta.env.DEV
    ? 10_000           // 10 seconds for testing
    : 5 * 60 * 1000    // 5 minutes in production

// Storage keys
const TIMER_START_KEY = 'demo_timer_start'
const TIMER_PAUSED_KEY = 'demo_timer_paused'
const TIMER_PAUSED_AT_KEY = 'demo_timer_paused_at'
const TIMER_ELAPSED_WHEN_PAUSED_KEY = 'demo_timer_elapsed_when_paused'
const POPUP_SHOWN_KEY = 'demo_popup_shown'
const EMAIL_SENT_KEY = 'demo_email_sent'

/**
 * Start the demo timer (called when entering demo mode)
 * Only starts if not already started
 */
export function startDemoTimer() {
    const existing = sessionStorage.getItem(TIMER_START_KEY)
    if (!existing) {
        sessionStorage.setItem(TIMER_START_KEY, Date.now().toString())
        sessionStorage.setItem(TIMER_PAUSED_KEY, 'false')
        console.log(`[DEMO TIMER] Started. Duration: ${DEMO_TIMER_MS / 1000}s`)
    }
}

/**
 * Pause the timer (called when entering an editor)
 * Stores elapsed time so we can resume correctly
 */
export function pauseDemoTimer() {
    const isPaused = sessionStorage.getItem(TIMER_PAUSED_KEY) === 'true'
    if (isPaused) return // Already paused

    const startTime = parseInt(sessionStorage.getItem(TIMER_START_KEY) || '0')
    if (!startTime) return // Timer not started

    const elapsed = Date.now() - startTime
    sessionStorage.setItem(TIMER_PAUSED_KEY, 'true')
    sessionStorage.setItem(TIMER_PAUSED_AT_KEY, Date.now().toString())
    sessionStorage.setItem(TIMER_ELAPSED_WHEN_PAUSED_KEY, elapsed.toString())
    console.log(`[DEMO TIMER] Paused at ${elapsed / 1000}s elapsed`)
}

/**
 * Resume the timer (called when exiting an editor)
 * Adjusts start time to account for paused duration
 */
export function resumeDemoTimer() {
    const isPaused = sessionStorage.getItem(TIMER_PAUSED_KEY) === 'true'
    if (!isPaused) return // Not paused

    const pausedAt = parseInt(sessionStorage.getItem(TIMER_PAUSED_AT_KEY) || '0')
    const elapsedWhenPaused = parseInt(sessionStorage.getItem(TIMER_ELAPSED_WHEN_PAUSED_KEY) || '0')

    if (!pausedAt) return

    // Calculate new start time to preserve elapsed time
    const pauseDuration = Date.now() - pausedAt
    const originalStart = parseInt(sessionStorage.getItem(TIMER_START_KEY) || '0')
    const newStart = originalStart + pauseDuration

    sessionStorage.setItem(TIMER_START_KEY, newStart.toString())
    sessionStorage.setItem(TIMER_PAUSED_KEY, 'false')
    sessionStorage.removeItem(TIMER_PAUSED_AT_KEY)
    sessionStorage.removeItem(TIMER_ELAPSED_WHEN_PAUSED_KEY)

    console.log(`[DEMO TIMER] Resumed. Paused for ${pauseDuration / 1000}s`)
}

/**
 * Get elapsed time in milliseconds (accounting for pauses)
 */
export function getElapsedTime() {
    const isPaused = sessionStorage.getItem(TIMER_PAUSED_KEY) === 'true'

    if (isPaused) {
        // Return elapsed time when paused
        return parseInt(sessionStorage.getItem(TIMER_ELAPSED_WHEN_PAUSED_KEY) || '0')
    }

    const startTime = parseInt(sessionStorage.getItem(TIMER_START_KEY) || '0')
    if (!startTime) return 0

    return Date.now() - startTime
}

/**
 * Check if timer has completed (5 minutes elapsed)
 */
export function isDemoTimerComplete() {
    return getElapsedTime() >= DEMO_TIMER_MS
}

/**
 * Check if popup should be shown
 * Returns true only if:
 * - Timer is complete
 * - Not currently paused (not editing)
 * - Popup hasn't been shown yet
 * - Email hasn't been sent yet
 */
export function shouldShowPopup() {
    const isPaused = sessionStorage.getItem(TIMER_PAUSED_KEY) === 'true'
    const popupShown = sessionStorage.getItem(POPUP_SHOWN_KEY) === 'true'
    const emailSent = sessionStorage.getItem(EMAIL_SENT_KEY) === 'true'

    if (isPaused || popupShown || emailSent) {
        return false
    }

    return isDemoTimerComplete()
}

/**
 * Mark popup as shown (prevents reappearing)
 */
export function markPopupShown() {
    sessionStorage.setItem(POPUP_SHOWN_KEY, 'true')
    console.log('[DEMO TIMER] Popup marked as shown')
}

/**
 * Mark email as sent
 */
export function markEmailSent() {
    sessionStorage.setItem(EMAIL_SENT_KEY, 'true')
    console.log('[DEMO TIMER] Email marked as sent')
}

/**
 * Check if email was already sent
 */
export function wasEmailSent() {
    return sessionStorage.getItem(EMAIL_SENT_KEY) === 'true'
}

/**
 * Check if popup was already shown
 */
export function wasPopupShown() {
    return sessionStorage.getItem(POPUP_SHOWN_KEY) === 'true'
}

/**
 * Reset timer (for testing only)
 */
export function resetDemoTimer() {
    sessionStorage.removeItem(TIMER_START_KEY)
    sessionStorage.removeItem(TIMER_PAUSED_KEY)
    sessionStorage.removeItem(TIMER_PAUSED_AT_KEY)
    sessionStorage.removeItem(TIMER_ELAPSED_WHEN_PAUSED_KEY)
    sessionStorage.removeItem(POPUP_SHOWN_KEY)
    sessionStorage.removeItem(EMAIL_SENT_KEY)
    console.log('[DEMO TIMER] Reset')
}
