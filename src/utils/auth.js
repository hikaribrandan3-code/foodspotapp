// Auth utilities for FoodSpot
// Simple role-based authentication using localStorage

import { getItem, setItem, removeItem, STORAGE_KEYS } from './storage.js'

// ============================================
// MVP CREDENTIALS - HARDCODED FOR NOW
// FUTURE: Replace with backend auth (Supabase Auth, etc.)
// ============================================
const CREDENTIALS = {
    staff: { username: 'staff', password: 'setup123' },
    owner: { username: 'owner', password: 'setup123' },
    superadmin: { username: 'hikariadmin', password: 'Aa39897828!' }
}

// Role hierarchy: higher index = more access
const ROLE_HIERARCHY = ['staff', 'owner', 'superadmin']

const AUTH_STORAGE_KEY = STORAGE_KEYS.AUTH

/**
 * Attempt to login with username/password
 * Returns { success, role, error }
 */
export function login(username, password) {
    // Check against each role's credentials
    for (const [role, creds] of Object.entries(CREDENTIALS)) {
        if (creds.username === username && creds.password === password) {
            const session = {
                role,
                authenticated: true,
                timestamp: Date.now(),
                username,
                // PATCH 3.9: Add email for Super Admin identity check
                email: role === 'superadmin' ? 'superadmin@foodspot.app' : null
            }
            setItem(AUTH_STORAGE_KEY, session)
            return { success: true, role }
        }
    }

    return { success: false, error: 'Invalid credentials' }
}

/**
 * Clear current session
 */
export function logout() {
    removeItem(AUTH_STORAGE_KEY)
}

/**
 * Get current session
 * Returns { role, authenticated, username } or null
 * Sessions expire after 20 minutes of inactivity
 */
const SESSION_DURATION_MS = 20 * 60 * 1000 // 20 minutes

export function getSession() {
    const session = getItem(AUTH_STORAGE_KEY)
    if (!session || !session.authenticated) {
        return null
    }

    // Check session expiry (20 minutes)
    const now = Date.now()
    const sessionAge = now - (session.timestamp || 0)

    if (sessionAge > SESSION_DURATION_MS) {
        // Session expired - clear it
        removeItem(AUTH_STORAGE_KEY)
        return null
    }

    // Optionally refresh timestamp on activity (sliding window)
    // Uncomment below for sliding window behavior:
    // session.timestamp = now
    // setItem(AUTH_STORAGE_KEY, session)

    return session
}

/**
 * Check if current user has access to a required role
 * superadmin > owner > staff
 * Returns true if user's role is >= required role
 */
export function hasRole(requiredRole) {
    const session = getSession()
    if (!session) return false

    // superadmin always has access
    if (session.role === 'superadmin') return true

    const userLevel = ROLE_HIERARCHY.indexOf(session.role)
    const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole)

    // Invalid roles
    if (userLevel === -1 || requiredLevel === -1) return false

    return userLevel >= requiredLevel
}

/**
 * Check if current user can access a route requiring a specific role
 * Returns { allowed, redirectTo }
 */
export function canAccessRoute(requiredRole) {
    const session = getSession()

    // Not authenticated at all
    if (!session) {
        // Redirect to appropriate login
        const loginRoutes = {
            staff: '/staff',
            owner: '/owner',
            superadmin: '/admin'
        }
        return { allowed: false, redirectTo: loginRoutes[requiredRole] || '/staff' }
    }

    // Check role hierarchy
    if (hasRole(requiredRole)) {
        return { allowed: true }
    }

    // User is authenticated but doesn't have permission
    // Redirect to their appropriate dashboard
    const dashboardRoutes = {
        staff: '/staff/dashboard',
        owner: '/owner/menu',
        superadmin: '/admin'
    }
    return { allowed: false, redirectTo: dashboardRoutes[session.role] || '/' }
}

/**
 * Get current user's role
 * Returns role string or null
 */
export function getCurrentRole() {
    const session = getSession()
    return session?.role || null
}

/**
 * Check if user is authenticated (any role)
 */
export function isAuthenticated() {
    return getSession() !== null
}
