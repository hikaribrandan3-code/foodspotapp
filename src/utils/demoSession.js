// Demo Session Utilities
// ISOLATED from production auth - uses sessionStorage (clears on tab close)

const DEMO_SESSION_KEY = 'demo_session'

/**
 * Create a new demo session
 * @returns {Object} The created demo session
 */
export function createDemoSession() {
    const session = {
        isDemo: true,
        role: 'owner', // Default to owner view
        presetId: 'preset-1', // Default branding preset
        startedAt: Date.now(),
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
    }

    sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session))
    console.log('✅ Demo session created')
    return session
}

/**
 * Get current demo session (if valid)
 * @returns {Object|null} Demo session or null if expired/missing
 */
export function getDemoSession() {
    try {
        const stored = sessionStorage.getItem(DEMO_SESSION_KEY)
        if (!stored) return null

        const session = JSON.parse(stored)

        // Check if session is valid demo session
        if (!session.isDemo) return null

        // Check expiry
        if (Date.now() > session.expiresAt) {
            clearDemoSession()
            return null
        }

        return session
    } catch (e) {
        return null
    }
}

/**
 * Check if currently in demo mode
 * @returns {boolean}
 */
export function isInDemoMode() {
    return getDemoSession() !== null
}

/**
 * Update demo session (e.g., change role or preset)
 * @param {Object} updates - Fields to update
 */
export function updateDemoSession(updates) {
    const session = getDemoSession()
    if (!session) return null

    const updated = { ...session, ...updates }
    sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(updated))
    return updated
}

/**
 * Clear demo session (exit demo mode)
 */
export function clearDemoSession() {
    sessionStorage.removeItem(DEMO_SESSION_KEY)
    console.log('✅ Demo session cleared')
}

/**
 * Get effective role in demo mode
 * @returns {string} 'owner' or 'staff'
 */
export function getDemoRole() {
    const session = getDemoSession()
    return session?.role || 'owner'
}

/**
 * Toggle demo role between owner and staff
 */
export function toggleDemoRole() {
    const session = getDemoSession()
    if (!session) return

    const newRole = session.role === 'owner' ? 'staff' : 'owner'
    updateDemoSession({ role: newRole })
    return newRole
}
