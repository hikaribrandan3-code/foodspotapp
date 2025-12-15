// ProtectedRoute component for role-based route protection
import { Navigate } from 'react-router-dom'
import { canAccessRoute } from '../utils/auth.js'

/**
 * Wraps a route to require authentication and a minimum role level.
 * 
 * Usage:
 * <Route path="/staff/dashboard" element={
 *   <ProtectedRoute requiredRole="staff">
 *     <StaffDashboard />
 *   </ProtectedRoute>
 * } />
 * 
 * Role hierarchy: superadmin > owner > staff
 * - superadmin can access all routes
 * - owner can access owner + staff routes
 * - staff can only access staff routes
 */
function ProtectedRoute({ children, requiredRole }) {
    const { allowed, redirectTo } = canAccessRoute(requiredRole)

    if (!allowed) {
        return <Navigate to={redirectTo} replace />
    }

    return children
}

export default ProtectedRoute
