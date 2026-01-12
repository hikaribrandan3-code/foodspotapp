/**
 * Supabase Auth Service for FoodSpot
 * 
 * Cloud-Authoritative authentication using Supabase Auth.
 * Role is stored in user_metadata.role
 */

import { supabase } from '../lib/supabaseClient.js'

// Role hierarchy: higher index = more access
const ROLE_HIERARCHY = ['staff', 'owner', 'superadmin']

/**
 * Attempt to login with email/password via Supabase
 * Returns { success, role, error }
 */
export async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) {
            return { success: false, error: error.message }
        }

        const role = data.user?.user_metadata?.role || 'staff'
        return { success: true, role, user: data.user }
    } catch (err) {
        return { success: false, error: err.message }
    }
}

/**
 * Clear current session via Supabase
 */
export async function logout() {
    await supabase.auth.signOut()
}

/**
 * Get current session from Supabase
 * Returns { role, authenticated, user, email } or null
 */
export async function getSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
            return null
        }

        const user = session.user
        const role = user?.user_metadata?.role || 'staff'

        return {
            role,
            authenticated: true,
            user,
            email: user?.email,
            username: user?.email?.split('@')[0] || 'user'
        }
    } catch {
        return null
    }
}

/**
 * Synchronous session check for components that already have session data
 * Use getSession() for initial fetch, this is for role checks after fetch
 */
export function getSessionSync() {
    // This will be used by components that have already fetched the session
    // and cached it in their state. Fallback for legacy code.
    return null
}

/**
 * Check if user has access to a required role
 * superadmin > owner > staff
 */
export function hasRole(userRole, requiredRole) {
    if (!userRole) return false

    // superadmin always has access
    if (userRole === 'superadmin') return true

    const userLevel = ROLE_HIERARCHY.indexOf(userRole)
    const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole)

    if (userLevel === -1 || requiredLevel === -1) return false

    return userLevel >= requiredLevel
}

/**
 * Get redirect path for a role
 */
export function getLoginRedirect(role) {
    const routes = {
        staff: '/staff',
        owner: '/owner',
        superadmin: '/admin'
    }
    return routes[role] || '/staff'
}

/**
 * Get dashboard path for a role
 */
export function getDashboardRedirect(role) {
    const routes = {
        staff: '/staff/dashboard',
        owner: '/owner/menu',
        superadmin: '/admin'
    }
    return routes[role] || '/'
}

/**
 * Check if user is authenticated (any role)
 */
export async function isAuthenticated() {
    const session = await getSession()
    return session !== null
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            const role = session.user?.user_metadata?.role || 'staff'
            callback({
                role,
                authenticated: true,
                user: session.user,
                email: session.user?.email
            })
        } else {
            callback(null)
        }
    })
}
