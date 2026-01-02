/**
 * BackendHeader.jsx - Shared Backend Dashboard Header
 * 
 * Used by: Owner, Staff, Demo, Super Admin
 * 
 * Design: Compact SaaS-style header shell
 * - Logo (FoodSpot default, or business logo if exists)
 * - Optional date selector (local-only)
 * - Profile avatar (cosmetic, local-first)
 * - Notification icon (visual placeholder)
 * 
 * Constraints:
 * - No backend dependency
 * - No auth logic
 * - No blocking fetches
 * - Renders without any data
 * - Same behavior across all roles
 */

import { useState, useEffect } from 'react'

// Local storage keys (cosmetic only, no auth implications)
const AVATAR_KEY = 'foodspot_backend_avatar'
const BUSINESS_LOGO_KEY = 'foodspot_business_logo'

function BackendHeader({
    title = 'FoodSpot',
    onLogout,
    showDateSelector = false,
    showNotifications = true,
    showAvatar = true,
    extraActions = null // For role-specific buttons (e.g., mode switcher)
}) {
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

                {/* Avatar with upload */}
                {showAvatar && (
                    <label style={{
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
                        flexShrink: 0
                    }}>
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
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            style={{ display: 'none' }}
                        />
                    </label>
                )}

                {/* Logout Button */}
                {onLogout && (
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
