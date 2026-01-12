/**
 * Guest Token (Valet Ticket) Management
 * 
 * The guest_token is the ONLY thing stored in localStorage.
 * All actual order data lives in Supabase.
 */

const GUEST_TOKEN_KEY = 'fs_guest_token'

/**
 * Generate a new UUID v4 guest token
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

/**
 * Get or create a guest token
 * Returns existing token or creates new one
 */
export function getGuestToken() {
    let token = localStorage.getItem(GUEST_TOKEN_KEY)
    if (!token) {
        token = generateUUID()
        localStorage.setItem(GUEST_TOKEN_KEY, token)
    }
    return token
}

/**
 * Clear guest token (on logout or order completion)
 */
export function clearGuestToken() {
    localStorage.removeItem(GUEST_TOKEN_KEY)
}

/**
 * Check if we have a guest token
 */
export function hasGuestToken() {
    return !!localStorage.getItem(GUEST_TOKEN_KEY)
}
