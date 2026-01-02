/**
 * AppHeader.jsx - UNIFIED HEADER COMPONENT
 * 
 * PATCH 3.7: Logo-first, no variants, binary theme only.
 * PATCH 3.8: Dual logo support (logoLight/logoDark auto-switch)
 * PATCH 4.0: Header Branding mode (text OR logo, never both)
 * PATCH 4.5: Cover mode (Facebook-style header image) — V1 default
 * PATCH 5.0: Cover viewport clamp (internal, mobile only)
 * PATCH 5.1: Config via prop (single source of truth invariant)
 * PATCH 5.2: No-Blink Stabilizer (skeleton + opacity fade)
 * 
 * Rules:
 * - Header height determined by mode (64px for logo/text, 220/280px for cover)
 * - Cover viewport clamps internally on mobile (60px)
 * - Header stays in normal document flow
 * - Config MUST be passed as prop, DO NOT call getConfig()
 */

import { useState, useEffect } from 'react'

// Cover heights by breakpoint
const COVER_HEIGHTS = {
    mobile: 220,
    tablet: 280
}

function getBreakpoint() {
    if (typeof window === 'undefined') return 'mobile'
    return window.innerWidth >= 768 ? 'tablet' : 'mobile'
}

// INVARIANT: config must come from prop, not getConfig()
function AppHeader({ config }) {
    const canvasMode = config?.canvasMode || 'light'
    const businessName = config?.businessName || 'FoodSpot'
    const headerMode = config?.headerBranding?.mode || 'cover'
    const breakpoint = getBreakpoint()
    const coverHeight = COVER_HEIGHTS[breakpoint]
    const useClamp = config?.experimental?.headerClampMobile && breakpoint === 'mobile'

    // 🛡️ NO-BLINK STABILIZER: Track image loading state
    const [imageLoaded, setImageLoaded] = useState(false)
    const cover = config?.headerCover || {}
    const coverImage = cover.image

    // Reset loading state when image URL changes
    useEffect(() => {
        setImageLoaded(false)
    }, [coverImage])

    // ============================================
    // COVER MODE (V1 Default) - With No-Blink Stabilizer
    // ============================================
    if (headerMode === 'cover') {
        const scale = cover.scale || 1.0
        const offsetX = cover.offsetX || 0
        const offsetY = cover.offsetY || 0

        return (
            <header style={{
                position: 'relative',
                background: 'var(--canvas-bg)',
                flexShrink: 0
            }}>
                <div
                    className={useClamp ? 'cover-viewport' : undefined}
                    style={{
                        height: useClamp ? undefined : coverHeight,
                        minHeight: coverHeight, // 🛡️ RIGID HEIGHT - Prevents collapse
                        position: 'relative',
                        overflow: 'hidden',
                        background: '#E5E7EB' // Skeleton base color
                    }}
                >
                    {/* 1. SKELETON PLACEHOLDER - Always visible until image loads */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%)',
                            backgroundSize: '200% 100%',
                            animation: imageLoaded ? 'none' : 'shimmer 1.5s infinite',
                            opacity: imageLoaded ? 0 : 1,
                            transition: 'opacity 300ms ease-out'
                        }}
                    />

                    {/* 2. COVER IMAGE - Fades in after load */}
                    {coverImage ? (
                        <img
                            src={coverImage}
                            alt="Cover"
                            onLoad={() => setImageLoaded(true)}
                            style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: `calc(50% + ${offsetX}px) calc(50% + ${offsetY}px)`,
                                transform: `scale(${scale})`,
                                opacity: imageLoaded ? 1 : 0,
                                transition: 'opacity 500ms ease-in-out'
                            }}
                        />
                    ) : (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <span style={{ color: 'var(--canvas-text)', opacity: 0.5, fontSize: 12 }}>
                                No cover image
                            </span>
                        </div>
                    )}
                </div>

                {/* CSS Keyframes for shimmer animation */}
                <style>{`
                    @keyframes shimmer {
                        0% { background-position: -200% 0; }
                        100% { background-position: 200% 0; }
                    }
                `}</style>
            </header>
        )
    }

    // ============================================
    // LOGO MODE
    // ============================================
    if (headerMode === 'logo') {
        const logo = canvasMode === 'dark'
            ? (config?.logoDark || config?.logoLight || config?.logo)
            : (config?.logoLight || config?.logoDark || config?.logo)

        const logoContent = (
            <div className="cover-content" style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {logo ? (
                    <img
                        src={logo}
                        alt={businessName}
                        style={{
                            height: 48,
                            maxHeight: 48,
                            width: 'auto',
                            objectFit: 'contain',
                            pointerEvents: 'none'
                        }}
                    />
                ) : (
                    <span style={{ color: 'var(--canvas-text)', opacity: 0.5, fontSize: 12 }}>
                        No logo configured
                    </span>
                )}
            </div>
        )

        return (
            <header style={{
                position: 'relative',
                background: 'var(--canvas-bg)',
                flexShrink: 0
            }}>
                <div
                    className={useClamp ? 'cover-viewport' : undefined}
                    style={{
                        height: useClamp ? undefined : (breakpoint === 'tablet' ? 96 : 64),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {logoContent}
                </div>
            </header>
        )
    }

    // ============================================
    // TEXT MODE
    // ============================================
    const textContent = (
        <div className="cover-content" style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <span style={{
                fontSize: 24,
                fontWeight: 'var(--font-weight-brand)',
                color: 'var(--canvas-text)',
                letterSpacing: '-0.02em',
                pointerEvents: 'none'
            }}>
                {businessName}
            </span>
        </div>
    )

    return (
        <header style={{
            position: 'relative',
            background: 'var(--canvas-bg)',
            flexShrink: 0
        }}>
            <div
                className={useClamp ? 'cover-viewport' : undefined}
                style={{
                    height: useClamp ? undefined : (breakpoint === 'tablet' ? 96 : 64),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {textContent}
            </div>
        </header>
    )
}

export default AppHeader
