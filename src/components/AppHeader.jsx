/**
 * AppHeader.jsx - UNIFIED HEADER COMPONENT
 * 
 * PATCH 3.7: Logo-first, no variants, binary theme only.
 * PATCH 3.8: Dual logo support (logoLight/logoDark auto-switch)
 * PATCH 4.0: Header Branding mode (text OR logo, never both)
 * 
 * Rules:
 * - Fixed height: 64px
 * - headerBranding.mode === "logo" → render logo only
 * - headerBranding.mode === "text" → render text only
 * - Text and logo NEVER render together
 */

import { getConfig } from '../config/appConfig.js'

function AppHeader() {
    const config = getConfig()
    const canvasMode = config.canvasMode || 'light'
    const businessName = config.businessName || 'FoodSpot'
    const headerMode = config.headerBranding?.mode || 'text'

    // Strict mode logic: text OR logo, never both
    if (headerMode === 'logo') {
        // Logo mode: render logo based on canvas mode
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
                            maxHeight: 48,
                            width: 'auto',
                            pointerEvents: 'none'
                        }}
                    />
                ) : (
                    // No logo available - empty header (mode is logo but no asset)
                    <span style={{ color: 'var(--canvas-text)', opacity: 0.5, fontSize: 12 }}>
                        No logo configured
                    </span>
                )}
            </header>
        )
    }

    // Text mode (default): render business name only
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
