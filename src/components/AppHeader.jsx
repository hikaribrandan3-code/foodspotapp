/**
 * AppHeader.jsx - UNIFIED HEADER COMPONENT
 * 
 * PATCH 3.7: Logo-first, no variants, binary theme only.
 * PATCH 3.8: Dual logo support (logoLight/logoDark auto-switch)
 * PATCH 4.0: Header Branding mode (text OR logo, never both)
 * PATCH 4.5: Cover mode (Facebook-style header image) — V1 default
 * PATCH 5.0: Cover viewport clamp (internal, mobile only)
 * 
 * Rules:
 * - Header height determined by mode (64px for logo/text, 220/280px for cover)
 * - Cover viewport clamps internally on mobile (60px)
 * - Header stays in normal document flow
 */

import { getConfig } from '../config/appConfig.js'

// Cover heights by breakpoint
const COVER_HEIGHTS = {
    mobile: 220,
    tablet: 280
}

function getBreakpoint() {
    if (typeof window === 'undefined') return 'mobile'
    return window.innerWidth >= 768 ? 'tablet' : 'mobile'
}

function AppHeader() {
    const config = getConfig()
    const canvasMode = config.canvasMode || 'light'
    const businessName = config.businessName || 'FoodSpot'
    const headerMode = config.headerBranding?.mode || 'cover'
    const breakpoint = getBreakpoint()
    const coverHeight = COVER_HEIGHTS[breakpoint]
    const useClamp = config.experimental?.headerClampMobile

    // ============================================
    // COVER MODE (V1 Default)
    // ============================================
    if (headerMode === 'cover') {
        const cover = config.headerCover || {}
        const scale = cover.scale || 1.0
        const offsetX = cover.offsetX || 0
        const offsetY = cover.offsetY || 0

        const coverContent = (
            <div className="cover-content" style={{
                position: 'absolute',
                width: '200%',
                height: '200%',
                left: '-50%',
                top: '-50%',
                backgroundImage: cover.image ? `url(${cover.image})` : 'none',
                backgroundSize: `${scale * 100}%`,
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                transform: `translate(${offsetX}px, ${offsetY}px)`
            }} />
        )

        const placeholder = (
            <div className="cover-content" style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <span style={{ color: 'var(--canvas-text)', opacity: 0.5, fontSize: 12 }}>
                    No cover image
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
                        height: useClamp ? undefined : coverHeight,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {cover.image ? coverContent : placeholder}
                </div>
            </header>
        )
    }

    // ============================================
    // LOGO MODE
    // ============================================
    if (headerMode === 'logo') {
        const logo = canvasMode === 'dark'
            ? (config.logoDark || config.logoLight || config.logo)
            : (config.logoLight || config.logoDark || config.logo)

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
