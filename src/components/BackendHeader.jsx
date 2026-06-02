/**
 * BackendHeader.jsx - Cleaned Backend Dashboard Header
 * 
 * Used by: Owner, Staff, Demo
 * 
 * ✅ MISSION COMPLETE: Generic SVG icons PURGED
 * ✅ Logo/Text toggle ACTIVE via headerMode
 * ✅ Role dropdown with Vista de Staff
 * 
 * 🏢 SILO-AWARE: All navigation uses tenantSlug from URL
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTenant } from '../contexts/TenantContext.jsx'
import { useLanguage } from '../contexts/LanguageContext.jsx'
import { supabase } from '../lib/supabaseClient.js'

function BackendHeader({ title, onLogout }) {
    const params = useParams()
    const navigate = useNavigate()
    const { tenantData, branding, slug: contextSlug, businessId: contextBusinessId } = useTenant()
    const { t } = useLanguage()

    // 🛡️ HARD-WIRE: Prioritize context slug over URL params to prevent "undefined" links
    const tenantSlug = contextSlug || params.tenantSlug
    const [showRoleDropdown, setShowRoleDropdown] = useState(false)
    const [userRole, setUserRole] = useState(null)
    const dropdownRef = useRef(null)

    // 🎛️ HEADER MODE: Use branding.headerMode (default to 'text')
    const headerMode = branding?.headerMode || tenantData?.branding?.headerMode || 'text'
    const businessName = title || tenantData?.venue_name || tenantData?.business_name || 'FoodSpot'
    const logoUrl = branding?.logoURL || tenantData?.logo_url || tenantData?.branding?.logoURL

    // 🔐 ROLE DETECTION: Check current user role for bidirectional nav
    const isOwner = userRole === 'owner' || userRole === 'superadmin'
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    const isInStaffView = currentPath.includes('/staff')

    // Fetch user role on mount
    useEffect(() => {
        const fetchRole = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                setUserRole(session.user.user_metadata?.role || null)
            }
        }
        fetchRole()
    }, [])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowRoleDropdown(false)
            }
        }
        if (showRoleDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showRoleDropdown])

    // Handle signOut
    const handleSignOut = async () => {
        setShowRoleDropdown(false)
        if (onLogout) {
            onLogout()
        } else {
            await supabase.auth.signOut()
            navigate('/login/owner')
        }
    }

    // Navigate to staff view — owner previewing staff ops
    const handleGoToStaff = async () => {
        setShowRoleDropdown(false)
        if (!tenantSlug) return
        // Staff-ops main.tsx requires fs_staff_member to render.
        // Owners don't go through staff login, so we synthesize entries here.
        const businessId = contextBusinessId || localStorage.getItem('fs_business_id') || ''
        const { data: { session } } = await supabase.auth.getSession()
        const ownerEntry = {
            id: session?.user?.id || 'owner',
            business_id: businessId,
            name: tenantData?.venue_name || session?.user?.email || 'Owner',
            role: 'owner',
            email: session?.user?.email || ''
        }
        localStorage.setItem('fs_staff_member', JSON.stringify(ownerEntry))
        localStorage.setItem('fs_business_id', businessId)
        localStorage.setItem('fs_current_shift', JSON.stringify({
            id: `owner-preview-${Date.now()}`,
            staff_id: ownerEntry.id,
            business_id: businessId,
            clock_in_at: new Date().toISOString(),
            status: 'active'
        }))
        navigate(`/${tenantSlug}/staff/dashboard`)
    }

    // Navigate back to owner view
    const handleGoToOwner = () => {
        setShowRoleDropdown(false)
        if (tenantSlug) {
            navigate(`/${tenantSlug}/owner/summary`)
        }
    }

    // Navigate to customer store with edit mode enabled
    const handleViewStore = () => {
        if (tenantSlug) {
            // 🚀 OWNER START: Go to Home, show Pill, NO Jiggle yet.
            // Added timestamp to bust PWA cache
            window.open(`/${tenantSlug}/home?ownerStart=true&t=${Date.now()}`, '_blank')
        }
    }

    // Force refresh (hardware-level cache purge)
    const handleRefreshApp = () => {
        window.location.reload(true)
    }

    return (
        <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between gap-3 min-h-[56px] sticky top-0 z-50 shadow-[0_2px_20px_rgba(28,25,23,0.04)]">
            {/* LEFT: Business Identity (Logo or Text) */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {headerMode === 'logo' && logoUrl ? (
                    <img
                        src={logoUrl}
                        alt={businessName}
                        className="h-9 w-auto max-w-[120px] object-contain"
                    />
                ) : (
                    <span className="font-['Outfit',sans-serif] text-lg font-black text-stone-950 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                        {businessName}
                    </span>
                )}
            </div>

            {/* RIGHT: Actions — hidden on desktop (sidebar handles these) */}
            <div className="flex items-center gap-3 flex-shrink-0 md:hidden">
                {/* Ver Tienda Button */}
                {tenantSlug && (
                    <button
                        onClick={handleViewStore}
                        className="px-4 py-2 text-[11px] font-black uppercase tracking-[0.05em] text-white bg-emerald-600 border-none rounded-2xl cursor-pointer whitespace-nowrap hover:bg-emerald-500 transition-colors shadow-sm"
                    >
                        {t('view_store')}
                    </button>
                )}

                {/* Role Dropdown */}
                <div ref={dropdownRef} className="relative">
                    <button
                        onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                        className="flex items-center gap-1 px-3 py-2 text-[11px] font-black uppercase tracking-[0.05em] text-stone-700 bg-stone-100 border-none rounded-2xl cursor-pointer hover:bg-stone-200 transition-colors"
                    >
                        {isInStaffView ? 'STAFF' : 'OWNER'}
                        <span className="text-[10px]">▾</span>
                    </button>

                    {showRoleDropdown && (
                        <div className="absolute top-full right-0 mt-2 bg-white border border-stone-200 rounded-2xl shadow-[0_20px_50px_rgba(28,25,23,0.08)] min-w-[200px] overflow-hidden z-[1000]">
                            {/* Section Header */}
                            <div className="px-4 py-3 border-b border-stone-100">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                                    {t('change_view')}
                                </span>
                            </div>

                            {/* Bidirectional Navigation: Owner ↔ Staff */}
                            {isOwner && isInStaffView && tenantSlug && (
                                <button
                                    onClick={handleGoToOwner}
                                    className="flex items-center gap-3 px-4 py-3.5 w-full bg-none border-none cursor-pointer text-sm font-bold text-emerald-600 text-left hover:bg-stone-50 transition-colors"
                                >
                                    👑 {t('back_to_owner')}
                                </button>
                            )}

                            {isOwner && !isInStaffView && tenantSlug && (
                                <button
                                    onClick={handleGoToStaff}
                                    className="flex items-center gap-3 px-4 py-3.5 w-full bg-none border-none cursor-pointer text-sm font-bold text-stone-700 text-left hover:bg-stone-50 transition-colors"
                                >
                                    {t('staff_view')}
                                </button>
                            )}

                            {/* Divider */}
                            <div className="border-t border-stone-100" />

                            {/* Logout */}
                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-3 px-4 py-3.5 w-full bg-none border-none cursor-pointer text-sm font-bold text-red-500 text-left hover:bg-red-50 transition-colors"
                            >
                                {t('logout')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

export default BackendHeader
