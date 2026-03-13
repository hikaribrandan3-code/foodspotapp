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
    const { tenantData, branding, slug: contextSlug } = useTenant()
    const { t } = useLanguage()

    // 🛡️ HARD-WIRE: Prioritize context slug over URL params to prevent "undefined" links
    const tenantSlug = contextSlug || params.tenantSlug
    const [showRoleDropdown, setShowRoleDropdown] = useState(false)
    const [userRole, setUserRole] = useState(null)
    const dropdownRef = useRef(null)

    // 🎛️ HEADER MODE: Use branding.headerMode (default to 'text')
    const headerMode = branding?.headerMode || tenantData?.branding?.headerMode || 'text'
    const businessName = title || tenantData?.business_name || 'FoodSpot'
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

    // Navigate to staff view
    const handleGoToStaff = () => {
        setShowRoleDropdown(false)
        if (tenantSlug) {
            navigate(`/${tenantSlug}/staff/dashboard`)
        }
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
        <header style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            minHeight: 56,
            position: 'sticky',
            top: 0,
            zIndex: 50
        }}>
            {/* LEFT: Business Identity (Logo or Text) */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flex: 1,
                minWidth: 0
            }}>
                {headerMode === 'logo' && logoUrl ? (
                    <img
                        src={logoUrl}
                        alt={businessName}
                        style={{
                            height: 36,
                            width: 'auto',
                            maxWidth: 120,
                            objectFit: 'contain'
                        }}
                    />
                ) : (
                    <span style={{
                        fontSize: 17,
                        fontWeight: 600,
                        color: '#1F2937',
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {businessName}
                    </span>
                )}
            </div>

            {/* RIGHT: Actions */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexShrink: 0
            }}>
                {/* Ver Tienda Button */}
                {tenantSlug && (
                    <button
                        onClick={handleViewStore}
                        style={{
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#FFFFFF',
                            background: '#3B82F6',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {t('view_store')} ⚡
                    </button>
                )}

                {/* Role Dropdown */}
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '8px 12px',
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#374151',
                            background: '#F3F4F6',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                        }}
                    >
                        {isInStaffView ? 'STAFF' : 'OWNER'}
                        <span style={{ fontSize: 10 }}>▾</span>
                    </button>

                    {showRoleDropdown && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: 8,
                            background: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: 12,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            minWidth: 180,
                            overflow: 'hidden',
                            zIndex: 1000
                        }}>
                            {/* Section Header */}
                            <div style={{
                                padding: '10px 16px',
                                borderBottom: '1px solid #F3F4F6',
                                fontSize: 10,
                                fontWeight: 600,
                                color: '#9CA3AF',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {t('change_view')}
                            </div>

                            {/* Bidirectional Navigation: Owner ↔ Staff */}
                            {isOwner && isInStaffView && tenantSlug && (
                                <button
                                    onClick={handleGoToOwner}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '12px 16px',
                                        width: '100%',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        color: '#3B82F6',
                                        fontWeight: 700,
                                        textAlign: 'left'
                                    }}
                                >
                                    👑 {t('back_to_owner')}
                                </button>
                            )}

                            {isOwner && !isInStaffView && tenantSlug && (
                                <button
                                    onClick={handleGoToStaff}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '12px 16px',
                                        width: '100%',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        color: '#374151',
                                        textAlign: 'left'
                                    }}
                                >
                                    🧑‍🍳 {t('staff_view')}
                                </button>
                            )}

                            {/* Divider */}
                            <div style={{ borderTop: '1px solid #F3F4F6' }} />

                            {/* Logout */}
                            <button
                                onClick={handleSignOut}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '12px 16px',
                                    width: '100%',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    color: '#EF4444',
                                    fontWeight: 600,
                                    textAlign: 'left'
                                }}
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
