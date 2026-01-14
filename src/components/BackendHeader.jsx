/**
 * BackendHeader.jsx - Shared Backend Dashboard Header
 * 
 * Used by: Owner, Staff, Demo, Super Admin
 * 
 * Design: Compact SaaS-style header shell
 * - Logo (FoodSpot default, or business logo if exists)
 * - "Ver Tienda" button (opens customer view in new tab)
 * - Profile dropdown with "Panel de Staff" link
 * - Notification icon (visual placeholder)
 * 
 * 🏢 SILO-AWARE: All navigation uses tenantSlug from URL
 * 
 * Constraints:
 * - No backend dependency
 * - No auth logic
 * - No blocking fetches
 * - Renders without any data
 * - Same behavior across all roles
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

// Local storage keys (cosmetic only, no auth implications)
const AVATAR_KEY = 'foodspot_backend_avatar'
const BUSINESS_LOGO_KEY = 'foodspot_business_logo'

function BackendHeader({
    title = 'FoodSpot',
    onLogout,
    showDateSelector = false,
    showNotifications = true,
    showAvatar = true,
    showStoreLink = true, // New: Show "Ver Tienda" button
    showStaffLink = true, // New: Show "Panel de Staff" in dropdown
    extraActions = null // For role-specific buttons (e.g., mode switcher)
}) {
    const { tenantSlug } = useParams() // 🏢 SILO-AWARE: Get tenant from URL
    const navigate = useNavigate()

    // Dropdown state
    const [showProfileMenu, setShowProfileMenu] = useState(false)

    // Local-first avatar (cosmetic)
    const [avatar, setAvatar] = useState(() => {
        try {
            return localStorage.getItem(AVATAR_KEY) || null
        } catch { return null }
    })

    // Business logo (local-first, fallback to FoodSpot)
    const [businessLogo, setBusinessLogo] = useState(() => {
        try {
            return localStorage.getItem(BUSINESS_LOGO_KEY) || null
        } catch { return null }
    })

    // 🛡️ FIX: Listen for frontendSync to refresh logo when it changes
    // This fixes the Google App cache issue where logo doesn't update after upload
    useEffect(() => {
        const handleSync = () => {
            try {
                setBusinessLogo(localStorage.getItem(BUSINESS_LOGO_KEY) || null)
                setAvatar(localStorage.getItem(AVATAR_KEY) || null)
            } catch (e) { /* ignore */ }
        }
        window.addEventListener('frontendSync', handleSync)
        // Also listen for storage changes from other tabs
        window.addEventListener('storage', handleSync)
        return () => {
            window.removeEventListener('frontendSync', handleSync)
            window.removeEventListener('storage', handleSync)
        }
    }, [])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setShowProfileMenu(false)
        if (showProfileMenu) {
            document.addEventListener('click', handleClickOutside)
            return () => document.removeEventListener('click', handleClickOutside)
        }
    }, [showProfileMenu])

    // Local date state (cosmetic, no sync)
    const [selectedDate, setSelectedDate] = useState(() => {
        return new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    })

    // Avatar upload handler (cosmetic, local-only)
    const handleAvatarUpload = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const dataUrl = event.target?.result
            if (dataUrl) {
                try {
                    localStorage.setItem(AVATAR_KEY, dataUrl)
                    setAvatar(dataUrl)
                } catch (err) {
                    console.warn('Failed to save avatar:', err)
                }
            }
        }
        reader.readAsDataURL(file)
    }

    // 🏢 SILO-AWARE: Open customer store in new tab
    const handleViewStore = () => {
        if (tenantSlug) {
            window.open(`/${tenantSlug}`, '_blank')
        }
    }

    // 🏢 SILO-AWARE: Navigate to staff dashboard
    const handleGoToStaff = () => {
        if (tenantSlug) {
            navigate(`/${tenantSlug}/staff/dashboard`)
        }
        setShowProfileMenu(false)
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
            minHeight: 56
        }}>
            {/* Left: Logo + Title */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flex: 1,
                minWidth: 0
            }}>
                {/* Logo */}
                <div style={{
                    width: 36,
                    height: 36,
                    background: businessLogo ? 'transparent' : '#1E3A5F',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden'
                }}>
                    {businessLogo ? (
                        <img
                            src={businessLogo}
                            alt="Logo"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <span style={{
                            color: '#FFFFFF',
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: '-0.02em'
                        }}>
                            FS
                        </span>
                    )}
                </div>

                {/* Title */}
                <span style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: '#1F2937',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {title}
                </span>
            </div>

            {/* Center: Date Selector (optional) */}
            {showDateSelector && (
                <button style={{
                    padding: '6px 12px',
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap'
                }}>
                    {selectedDate}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 4L5 7L8 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            )}

            {/* Right: Actions */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0
            }}>
                {/* Extra actions slot (role-specific buttons) */}
                {extraActions}

                {/* 🏪 Ver Tienda Button - Opens customer view in new tab */}
                {showStoreLink && tenantSlug && (
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
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        Ver Tienda
                    </button>
                )}

                {/* Notification Bell (placeholder) */}
                {showNotifications && (
                    <button style={{
                        width: 36,
                        height: 36,
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 10,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {/* Notification dot */}
                        <span style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            width: 6,
                            height: 6,
                            background: '#EF4444',
                            borderRadius: '50%',
                            border: '1.5px solid white'
                        }} />
                    </button>
                )}

                {/* Profile Avatar with Dropdown */}
                {showAvatar && (
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowProfileMenu(!showProfileMenu)
                            }}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: avatar ? 'transparent' : '#E5E7EB',
                                border: '2px solid #E5E7EB',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0,
                                padding: 0
                            }}
                        >
                            {avatar ? (
                                <img
                                    src={avatar}
                                    alt="Avatar"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            )}
                        </button>

                        {/* Dropdown Menu */}
                        {showProfileMenu && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
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
                                }}
                            >
                                {/* Avatar Upload */}
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    color: '#374151',
                                    borderBottom: '1px solid #F3F4F6'
                                }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                        <circle cx="12" cy="13" r="4" />
                                    </svg>
                                    Cambiar foto
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            handleAvatarUpload(e)
                                            setShowProfileMenu(false)
                                        }}
                                        style={{ display: 'none' }}
                                    />
                                </label>

                                {/* Staff Dashboard Link */}
                                {showStaffLink && tenantSlug && (
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
                                            borderBottom: '1px solid #F3F4F6',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                        Panel de Staff
                                    </button>
                                )}

                                {/* Logout */}
                                {onLogout && (
                                    <button
                                        onClick={() => {
                                            setShowProfileMenu(false)
                                            onLogout()
                                        }}
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
                                            textAlign: 'left'
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                            <polyline points="16 17 21 12 16 7" />
                                            <line x1="21" y1="12" x2="9" y2="12" />
                                        </svg>
                                        Salir
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Fallback Logout Button (if no avatar/dropdown) */}
                {!showAvatar && onLogout && (
                    <button
                        onClick={onLogout}
                        style={{
                            padding: '8px 14px',
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#6B7280',
                            background: '#F3F4F6',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Salir
                    </button>
                )}
            </div>
        </header>
    )
}

export default BackendHeader

