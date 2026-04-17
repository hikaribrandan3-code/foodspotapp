/**
 * AppHeader.jsx - UNIFIED HEADER COMPONENT
 * 
 * PATCH 3.7: Logo-first, no variants, binary theme only.
 * PATCH 3.8: Dual logo support (logoLight/logoDark auto-switch)
 * PATCH 4.0: Header Branding mode (text OR logo, never both)
 * PATCH 4.5: Cover mode (Facebook-style header image) — V1 default
 * PATCH 5.0: Cover viewport clamp (internal, mobile only)
 * PATCH 5.1: Config via prop (single source of truth invariant)
 * 
 * Rules:
 * - Header height determined by mode (64px for logo/text, 220/280px for cover)
 * - Cover viewport clamps internally on mobile (60px)
 * - Header stays in normal document flow
 * - Config MUST be passed as prop, DO NOT call getConfig()
 */
import { useLanguage } from '../contexts/LanguageContext'

function getBreakpoint() {
    if (typeof window === 'undefined') return 'mobile'
    return window.innerWidth >= 768 ? 'tablet' : 'mobile'
}

// INVARIANT: config must come from prop, not getConfig()
function AppHeader({ config: configProp }) {
    const { t } = useLanguage()
    const config = configProp || {};
    const canvasMode = config?.canvasMode || 'light'
    const businessName = config?.businessName || 'FoodSpot'
    const headerMode = config?.headerBranding?.mode || 'cover'
    const breakpoint = getBreakpoint()
    // Only clamp if explicitly enabled AND not in cover mode (cover needs full height)
    const useClamp = config?.experimental?.headerClampMobile && breakpoint === 'mobile' && headerMode !== 'cover' && headerMode !== 'image'

    // ============================================
    // 16:9 HERO COVER MODE (Universal Standard)
    // ============================================
    if (headerMode === 'cover' || headerMode === 'image') {
        const cover = config?.headerCover || {}
        
        // 🛡️ POSITIONING: Prefer percentages (posX/Y) for cross-device stability
        // Fallback to 50% (Center) if not provided
        const posX = cover.posX !== undefined ? cover.posX : 50;
        const posY = cover.posY !== undefined ? cover.posY : 50;

        // LEGACY SCALE: We still support scale for zoom, but fitment is driven by object-fit
        const scale = cover.scale || 1.0;

        const coverContent = (
            <div className="cover-content menu-header-bg" style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                left: 0,
                top: 0,
                backgroundImage: config?.headerCover?.image ? `url(${config.headerCover.image})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: `${posX}% ${posY}%`,
                backgroundRepeat: 'no-repeat',
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                transition: 'transform 0.1s ease-out, background-position 0.2s ease'
            }} />
        )

        return (
            <header style={{
                position: 'relative',
                background: 'var(--canvas-bg)',
                flexShrink: 0,
                width: '100%',
                overflow: 'hidden'
            }}>
                <div
                    style={{
                        width: '100%',
                        aspectRatio: '16 / 9',
                        position: 'relative',
                        overflow: 'hidden',
                        background: '#F1F5F9' // Clean skeleton background
                    }}
                >
                    {coverContent}
                </div>
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
                        {t('no_logo')}
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
            justifyContent: 'center',
            ...(config?.headerCover?.containerStyle || {})
        }}>
            <span style={{
                fontSize: 24,
                fontWeight: 'var(--font-weight-brand)',
                color: 'var(--canvas-text)',
                letterSpacing: '-0.02em',
                pointerEvents: 'none',
                ...(config?.headerCover?.titleStyle || {})
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
