import { useNavigate } from 'react-router-dom'
import { useTenant } from '../contexts/TenantContext'

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

    // 🛡️ DYNAMIC ROUTING: Ensure we stay within the tenant silo
    const menuPath = tenantData?.slug ? `/${tenantData.slug}/menu` : '/menu'

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
                paddingTop: 32, /* Push everything up */
                paddingBottom: 40,
                paddingLeft: 12, /* 12px Gutter Sync */
                paddingRight: 12, /* 12px Gutter Sync */
                textAlign: 'center'
            }}>

                <h2 style={{
                    color: '#0F172A', /* Darker, stronger */
                    fontSize: 24, /* Bigger letters */
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 8,
                    marginTop: 0
                }}>
                    Mis Pedidos
                </h2>
                {/* Structural Anchor: Card Center of Gravity */}
                <div style={{
                    marginTop: 16,
                    padding: '12px 16px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    display: 'inline-block'
                }}>
                    <p style={{
                        color: '#64748B',
                        fontSize: 14,
                        fontWeight: 600,
                        margin: 0
                    }}>
                        No tenés pedidos activos
                    </p>
                </div>
            </div>

            {/* 2. SaaS Action Pills — Linked to Functional Logic */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                padding: '0 12px', /* 12px Gutter Sync */
                marginBottom: 36 /* Vertical Squeeze: 48 -> 36 */
            }}>
                <button
                    onClick={() => navigate('/envios')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '16px 0',
                        borderRadius: 16,
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease'
                    }}
                >
                    <span style={{ fontSize: 13.5, opacity: 0.7 }}>🚚</span>
                    <span style={{ fontWeight: 700, color: '#334155' }}>Delivery</span>
                </button>
                <button
                    onClick={() => navigate('/rewards')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '16px 0',
                        borderRadius: 16,
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease'
                    }}
                >
                    <span style={{ fontSize: 13.5, opacity: 0.7 }}>🎁</span>
                    <span style={{ fontWeight: 700, color: '#334155' }}>Premios</span>
                </button>
            </div>

            {/* 3. Featured Products Grid (Mapped from Config Props) */}
            <div style={{ padding: '0 12px' }}>
                <div style={{
                    marginBottom: 16,
                    textAlign: 'center'
                }}>
                    <h2 style={{
                        fontSize: 18,
                        fontWeight: 600, /* Semi-Bold */
                        color: '#333333', /* Deep Charcoal */
                        letterSpacing: '0.02em',
                        margin: 0,
                        textWrap: 'balance'
                    }}>
                        Productos Destacados
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
                    Hacer un pedido
                </button>
            </div>
        </div>
    )
}

export default OrderStatusEmpty
