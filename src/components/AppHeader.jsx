/**
 * AppHeader.jsx - UNIFIED HEADER COMPONENT
 *
 * PATCH 3.7: Logo-first, no variants, binary theme only.
 * PATCH 3.8: Dual logo support (logoLight/logoDark auto-switch)
 * PATCH 4.0: Header Branding mode (text OR logo, never both)
 * PATCH 4.5: Cover mode (Facebook-style header image) — V1 default
 * PATCH 5.0: Cover viewport clamp (internal, mobile only)
 * PATCH 5.1: Config via prop (single source of truth invariant)
 * PATCH 5.2: Image optimization for logo & cover (fast load)
 *
 * Rules:
 * - Header height determined by mode (64px for logo/text, 220/280px for cover)
 * - Cover viewport clamps internally on mobile (60px)
 * - Header stays in normal document flow
 * - Config MUST be passed as prop, DO NOT call getConfig()
 * - All image URLs optimized for size (width, quality params)
 */
import { useParams, useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

// 🚀 IMAGE OPTIMIZATION: Reduce logo/cover load time
const getOptimizedImageUrl = (url, options = {}) => {
    if (!url || url.startsWith('blob:')) return url
    if (url.includes('unsplash.com')) {
        return url.includes('?') ? url : `${url}?w=600&q=80&fit=crop`
    }
    if (url.includes('width=') || url.includes('quality=')) return url
    const { width = 200, quality = 80, format = 'webp' } = options
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}width=${width}&quality=${quality}&format=${format}`
}

function getBreakpoint() {
    if (typeof window === 'undefined') return 'mobile'
    return window.innerWidth >= 768 ? 'tablet' : 'mobile'
}

// INVARIANT: config must come from prop, not getConfig()
function AppHeader({ config: configProp, isHomePage = false }) {
    const { tenantSlug } = useParams()
    const navigate = useNavigate()
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

        const hasImage = !!config?.headerCover?.image

        const coverContent = hasImage ? (
            <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                left: 0,
                top: 0,
                overflow: 'hidden'
            }}>
                <img
                    src={getOptimizedImageUrl(config.headerCover.image, { width: 800, quality: 80, format: 'webp' })}
                    alt={businessName}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: `${posX}% ${posY}%`,
                        display: 'block',
                        transform: `scale(${scale})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.1s ease-out'
                    }}
                    fetchPriority="high"
                    loading="eager"
                    decoding="async"
                />
            </div>
        ) : (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
            }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}>
                    No image uploaded
                </span>
            </div>
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
                        maxHeight: breakpoint === 'mobile' ? (isHomePage ? 220 : 180) : undefined,
                        position: 'relative',
                        overflow: 'hidden',
                        background: hasImage ? '#F1F5F9' : 'transparent'
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
                        src={getOptimizedImageUrl(logo, { width: 200, quality: 80 })}
                        alt={businessName}
                        style={{
                            height: 48,
                            maxHeight: 48,
                            width: 'auto',
                            objectFit: 'contain'
                        }}
                        loading="eager"
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
                <button
                    onClick={() => navigate(`/${tenantSlug}`)}
                    className={useClamp ? 'cover-viewport' : undefined}
                    style={{
                        height: useClamp ? undefined : (breakpoint === 'tablet' ? 96 : 64),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%',
                        padding: 0
                    }}
                >
                    {logoContent}
                </button>
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
            <button
                onClick={() => navigate(`/${tenantSlug}`)}
                className={useClamp ? 'cover-viewport' : undefined}
                style={{
                    height: useClamp ? undefined : (breakpoint === 'tablet' ? 96 : 64),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    padding: 0
                }}
            >
                {textContent}
            </button>
        </header>
    )
}

export default AppHeader
