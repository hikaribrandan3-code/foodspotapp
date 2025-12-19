/**
 * AppHeader.jsx - UNIFIED HEADER COMPONENT
 * 
 * PATCH 3.7: Logo-first, no variants, binary theme only.
 * PATCH 3.8: Dual logo support (logoLight/logoDark auto-switch)
 * 
 * Rules:
 * - Fixed height: 64px
 * - Logo max height: 32px, centered
 * - Uses --canvas-bg and --canvas-text
 * - Auto-selects logoLight or logoDark based on canvasMode
 * - Text fallback if no logo
 * - No per-page differences
 */

import { getConfig } from '../config/appConfig.js'

function AppHeader() {
    const config = getConfig()
    const canvasMode = config.canvasMode || 'light'
    const businessName = config.businessName || 'FoodSpot'

    // Select logo based on canvas mode
    // Dark mode = use logoDark (light logo on dark bg)
    // Light mode = use logoLight (dark logo on light bg)
    const logo = canvasMode === 'dark'
        ? (config.logoDark || config.logo || null)
        : (config.logoLight || config.logo || null)

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
                        maxHeight: 32,
                        width: 'auto',
                        pointerEvents: 'none' // Prevent drag/long-press issues
                    }}
                />
            ) : (
                <span style={{
                    fontSize: 24,
                    fontWeight: 'var(--font-weight-brand)',
                    color: 'var(--canvas-text)',
                    letterSpacing: '-0.02em',
                    pointerEvents: 'none'
                }}>
                    {businessName}
                </span>
            )}
        </header>
    )
}

export default AppHeader
