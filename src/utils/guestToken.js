/**
 * Guest Token (Valet Ticket) Management
 *
 * The guest_token is the ONLY thing stored in localStorage.
 * All actual order data lives in Supabase.
 *
 * NOTE: This is the LEGACY global token. New code should use
 * getScopedGuestToken() from storage.js for tenant-scoped tokens.
 */

const GUEST_TOKEN_KEY = 'fs_guest_token'

function getCurrentTenantSlug() {
    const path = window.location.pathname
    const parts = path.split('/').filter(Boolean)
    return parts[0] || null
}

function getTenantTokenKey() {
    const tenantSlug = getCurrentTenantSlug()
    return tenantSlug ? `fs_guest_token_${tenantSlug}` : GUEST_TOKEN_KEY
}

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
 * Returns existing token or creates new one.
 * Prefers tenant-scoped token, falls back to legacy global key.
 */
export function getGuestToken() {
    // Prefer tenant-scoped token (set by storage.js migrateLegacyToken)
    const tenantKey = getTenantTokenKey()
    let token = localStorage.getItem(tenantKey)
    // Fall back to legacy global key
    if (!token) {
        token = localStorage.getItem(GUEST_TOKEN_KEY)
    }
    if (!token) {
        token = generateUUID()
        localStorage.setItem(tenantKey, token)
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
