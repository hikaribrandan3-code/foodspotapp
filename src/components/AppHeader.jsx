/**
 * AppHeader.jsx - UNIFIED HEADER COMPONENT
 * 
 * PATCH 3.7: Logo-first, no variants, binary theme only.
 * 
 * Rules:
 * - Fixed height: 64px
 * - Logo max height: 32px, centered
 * - Uses --canvas-bg and --canvas-text
 * - Text fallback if no logo
 * - No per-page differences
 */

import { getConfig } from '../config/appConfig.js'

function AppHeader() {
    const config = getConfig()
    const logo = config.logo || null
    const businessName = config.businessName || 'FoodSpot'

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
