import { createContext, useContext, useState, useCallback } from 'react'

const AdminIntentContext = createContext(null)

export const AdminIntentProvider = ({ children }) => {
    // State shape defined in requirements
    const [activeRoleView, setActiveRoleView] = useState('superadmin') // 'superadmin' | 'owner' | 'staff'
    const [impersonatingBusinessId, setImpersonatingBusinessId] = useState(null)
    const [impersonatingUserId, setImpersonatingUserId] = useState(null)

    // Derived state
    const isSimulated = activeRoleView !== 'superadmin'

    // Actions
    const enterOwnerView = useCallback((businessId) => {
        setImpersonatingBusinessId(businessId)
        setActiveRoleView('owner')
        // Clean up staff state just in case
        setImpersonatingUserId(null)
    }, [])

    const enterStaffView = useCallback((userId, businessId) => {
        setImpersonatingBusinessId(businessId)
        setImpersonatingUserId(userId)
        setActiveRoleView('staff')
    }, [])

    const exitSimulation = useCallback(() => {
        setActiveRoleView('superadmin')
        setImpersonatingBusinessId(null)
        setImpersonatingUserId(null)
    }, [])

    const value = {
        activeRoleView,
        impersonatingBusinessId,
        impersonatingUserId,
        isSimulated,
        enterOwnerView,
        enterStaffView,
        exitSimulation
    }

    return (
        <AdminIntentContext.Provider value={value}>
            {children}
        </AdminIntentContext.Provider>
    )
}

export const useAdminIntent = () => {
    const context = useContext(AdminIntentContext)
    // 🛡️ NULL GUARD: Return safe fallback instead of throwing
    // This prevents crashes when component renders before provider mounts
    if (!context) {
        return {
            activeRoleView: 'superadmin',
            impersonatingBusinessId: null,
            impersonatingUserId: null,
            isSimulated: false,
            enterOwnerView: () => { },
            enterStaffView: () => { },
            exitSimulation: () => { }
        }
    }
    return context
}
