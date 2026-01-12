/**
 * ProtectedRoute - Role-based route protection with Supabase Auth
 * 
 * Now handles async session fetch with loading state.
 * Respects AdminIntentContext for Super Admin role simulation.
 */
import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { getSession, hasRole, getLoginRedirect, getDashboardRedirect } from '../utils/auth.js'
import { useAdminIntent } from '../contexts/AdminIntentContext.jsx'

// Role hierarchy for local checks
const ROLE_HIERARCHY = ['staff', 'owner', 'superadmin']

function ProtectedRoute({ children, requiredRole }) {
    const [session, setSession] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    // Get Simulation Intent (Role Lens)
    const { activeRoleView, isSimulated } = useAdminIntent()

    // Fetch session on mount
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const sessionData = await getSession()
                setSession(sessionData)
            } catch {
                setSession(null)
            } finally {
                setIsLoading(false)
            }
        }
        fetchSession()
    }, [])

    // Loading state - show minimal spinner
    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'var(--canvas-bg, #fff)'
            }}>
                <div style={{
                    width: 32,
                    height: 32,
                    border: '3px solid #E5E7EB',
                    borderTopColor: '#3B82F6',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        )
    }

    // Not authenticated
    if (!session) {
        return <Navigate to={getLoginRedirect(requiredRole)} replace />
    }

    // Determine Effective Role (simulation or real)
    const realRole = session.role
    const effectiveRole = isSimulated ? activeRoleView : realRole

    // Role Hierarchy Check
    const userLevel = ROLE_HIERARCHY.indexOf(effectiveRole)
    const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole)

    // Invalid roles or insufficient permission
    if (userLevel === -1 || requiredLevel === -1 || userLevel < requiredLevel) {
        return <Navigate to={getDashboardRedirect(effectiveRole)} replace />
    }

    return children
}

export default ProtectedRoute
