// ProtectedRoute component for role-based route protection
import { Navigate } from 'react-router-dom'
import { getSession } from '../utils/auth.js'
import { useAdminIntent } from '../contexts/AdminIntentContext.jsx'

/**
 * Wraps a route to require authentication and a minimum role level.
 * 
 * ROLE LENS ENABLED:
 * This component respects the 'AdminIntentContext'.
 * If a Super Admin effectively simulates 'staff', they will be denied access to 'owner' routes.
 * 
 * Role hierarchy: superadmin > owner > staff
 */
function ProtectedRoute({ children, requiredRole }) {
    // 1. Get Real Session (Auth Source of Truth)
    const session = getSession()

    // 2. Get Simulation Intent (Role Lens)
    const { activeRoleView, isSimulated } = useAdminIntent()

    // 3. Determine Effective Role
    // If simulating, use the simulation view. usage: superadmin -> staff
    // If not simulating, use the real session role.
    const realRole = session?.role
    const effectiveRole = isSimulated ? activeRoleView : realRole

    // --- ACCESS LOGIC (Localized to avoid modifying services) ---
    const ROLE_HIERARCHY = ['staff', 'owner', 'superadmin']

    // Not authenticated at all (Real session check)
    if (!session) {
        const loginRoutes = {
            staff: '/staff',
            owner: '/owner',
            superadmin: '/admin'
        }
        return <Navigate to={loginRoutes[requiredRole] || '/staff'} replace />
    }

    // Role Hierarchy Check
    const userLevel = ROLE_HIERARCHY.indexOf(effectiveRole)
    const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole)

    // Invalid roles or insufficient permission
    if (userLevel === -1 || requiredLevel === -1 || userLevel < requiredLevel) {

        // Redirect Logic based on Effective Role
        // If I am effectively 'staff', I should go to staff dashboard
        const dashboardRoutes = {
            staff: '/staff/dashboard',
            owner: '/owner/menu',
            superadmin: '/admin'
        }

        // If I am effectively 'superadmin' but failed (shouldn't happen unless req role is invalid), go to admin
        return <Navigate to={dashboardRoutes[effectiveRole] || '/'} replace />
    }

    return children
}

export default ProtectedRoute
