import { useNavigate } from 'react-router-dom'
import { useTenant } from '../contexts/TenantContext'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * OrderStatusEmpty - Pre-Estado Empty State Component
 * 
 * Architectural Constraints:
 * - Battle 2: Must use config prop only (no getConfig/localStorage)
 * - Battle 5: All strings in Spanish
 * - Z-Index: Primary CTA at z-index 10 (below Camera at z-50+)
 */
const OrderStatusEmpty = ({ config: configProp, featuredItems = [] }) => {
    const config = configProp || {};
    const navigate = useNavigate()
    const { tenantData } = useTenant()
    const { t } = useLanguage()

    // 🛡️ DYNAMIC ROUTING: Ensure we stay within the tenant silo
    const menuPath = tenantData?.slug ? `/${tenantData.slug}/menu` : '/menu'
    const promosPath = tenantData?.slug ? `/${tenantData.slug}/promos` : '/promos'
    const enviosPath = tenantData?.slug ? `/${tenantData.slug}/envios` : '/envios'

    // INVARIANT: config MUST come from props (Battle 2: Single Source of Truth)
    if (!config) {
        console.error('[Status] config prop is missing — check App.jsx routing')
        return null
    }

    // Logic Gate: Use themeColor for the primary CTA but keep pills neutral SaaS style
    const primaryActionColor = config.branding?.primaryColor || '#10b981'

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            background: 'rgba(248, 250, 252, 0.4)',
            paddingBottom: 128
        }}>
            {/* 1. Header & Minimalist Empty State */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 32, /* Maintained */
                paddingBottom: 32, /* The Big Squeeze Gap: exactly 32px to tiles */
                paddingLeft: 12, /* 12px Gutter Sync */
                paddingRight: 12, /* 12px Gutter Sync */
                textAlign: 'center'
            }}>

                {/* Status Hero: Replaces Header & Card */}
                <p style={{
                    color: '#0F172A',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 18, /* Hero Authority: +20% (14 -> 18ish) */
                    fontWeight: 700, /* Bold */
                    textAlign: 'center',
                    margin: 0
                }}>
                    {t('no_active_orders')}
                </p>
            </div>

            {/* 2. SaaS Action Pills — Linked to Functional Logic */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                padding: '0 12px', /* 12px Gutter Sync */
                marginBottom: 24 /* Big Squeeze: 36 -> 24 (Combined with Title pull) */
            }}>
                <button
                    onClick={() => navigate(enviosPath)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '16px 0',
                        borderRadius: 12, /* Mute: Sync with Card Radius */
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease'
                    }}
                >
                    <span style={{ fontSize: 12, opacity: 0.7 }}>🚚</span> {/* Mute: 10% Reduction */}
                    <span style={{ fontWeight: 700, color: '#334155' }}>Delivery</span>
                </button>
                <button
                    onClick={() => navigate(promosPath)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '16px 0',
                        borderRadius: 12, /* Mute: Sync with Card Radius */
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease'
                    }}
                >
                    <span style={{ fontSize: 12, opacity: 0.7 }}>🎁</span> {/* Mute: 10% Reduction */}
                    <span style={{ fontWeight: 700, color: '#334155' }}>Promos</span>
                </button>
            </div>

            {/* 3. Featured Products Grid (Mapped from Config Props) */}
            <div style={{ padding: '0 12px' }}>
                <div style={{
                    marginBottom: 12, /* Big Squeeze: Reduced gap */
                    textAlign: 'center'
                }}>
                    <h2 style={{
                        fontSize: 18,
                        fontWeight: 600, /* Semi-Bold */
                        color: '#333333', /* Deep Charcoal */
                        letterSpacing: '0.02em',
                        marginTop: 0, /* Big Squeeze: Pull UP */
                        marginBottom: 0,
                        textWrap: 'balance'
                    }}>
                        {t('featured_products')}
                    </h2>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12 /* Grid Lock: 12px */
                }}>
                    {featuredItems.slice(0, 4).map((item, index) => (
                        <div
                            key={item.id || index}
                            onClick={() => navigate(menuPath)}
                            style={{
                                background: '#FFFFFF',
                                borderRadius: 24,
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                border: '1px solid rgba(241, 245, 249, 1)',
                                cursor: 'pointer',
                                transition: 'opacity 0.15s ease'
                            }}
                        >
                            <div style={{
                                aspectRatio: '1 / 1',
                                width: '100%',
                                position: 'relative'
                            }}>
                                {item.image ? (
                                    <img
                                        src={item.image}
                                        alt={item.name || 'Producto'}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        background: '#E5E0D8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <span style={{ fontSize: 32, opacity: 0.5 }}>🍽️</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ padding: 16, textAlign: 'center' }}>
                                <h4 style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: '#1E293B',
                                    margin: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {item.name || 'Producto'}
                                </h4>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. Primary CTA — Fixed and Z-Indexed below Camera */}
            <div style={{
                position: 'fixed',
                bottom: 96,
                left: '2%',
                right: '2%',
                zIndex: 10
            }}>
                <button
                    onClick={() => navigate(menuPath)}
                    style={{
                        width: '100%',
                        padding: '20px 0', /* CTA Dominance: The Boss */
                        background: primaryActionColor,
                        color: '#FFFFFF',
                        fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 900,
                        fontSize: 18,
                        border: 'none',
                        borderRadius: 16,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease'
                    }}
                >
                    {t('place_order')}
                </button>
            </div>
        </div>
    )
}

export default OrderStatusEmpty
