/**
 * AppHeader.jsx - UNIFIED HEADER COMPONENT
 * 
 * PATCH 3.7: Logo-first, no variants, binary theme only.
 * PATCH 3.8: Dual logo support (logoLight/logoDark auto-switch)
 * PATCH 4.0: Header Branding mode (text OR logo, never both)
 * PATCH 4.5: Cover mode (Facebook-style header image) — V1 default
 * 
 * Rules:
 * - Fixed height: 64px
 * - headerBranding.mode === "cover" → render cover image (V1 default)
 * - headerBranding.mode === "logo" → render logo only
 * - headerBranding.mode === "text" → render text only
 */

import { getConfig } from '../config/appConfig.js'

function AppHeader() {
    const config = getConfig()
    const canvasMode = config.canvasMode || 'light'
    const businessName = config.businessName || 'FoodSpot'
    const headerMode = config.headerBranding?.mode || 'cover'

    // ============================================
    // COVER MODE (V1 Default)
    // ============================================
    if (headerMode === 'cover') {
        const cover = config.headerCover || {}
        const scale = cover.scale || 1.0
        const offsetX = cover.offsetX || 0
        const offsetY = cover.offsetY || 0

        return (
            <header style={{
                height: 64,
                position: 'relative',
                overflow: 'hidden',
                background: 'var(--canvas-bg)',
                flexShrink: 0
            }}>
                {cover.image ? (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${cover.image})`,
                        backgroundSize: `${scale * 100}%`,
                        backgroundPosition: `${50 + offsetX}% ${50 + offsetY}%`,
                        backgroundRepeat: 'no-repeat'
                    }} />
                ) : (
                    // No cover image — show placeholder
                    <div style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <span style={{ color: 'var(--canvas-text)', opacity: 0.5, fontSize: 12 }}>
                            No cover image
                        </span>
                    </div>
                )}
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

        return (
            <header style={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--canvas-bg)',
                position: 'relative',
                flexShrink: 0
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
            </header>
        )
    }

    // ============================================
    // TEXT MODE
    // ============================================
    return (
        <header style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--canvas-bg)',
            position: 'relative',
            flexShrink: 0
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
        </header>
    )
}

export default AppHeader
