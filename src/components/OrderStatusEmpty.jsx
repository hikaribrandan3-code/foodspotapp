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
                paddingTop: 64,
                paddingBottom: 40,
                paddingLeft: 24,
                paddingRight: 24,
                textAlign: 'center'
            }}>
                <div style={{
                    width: 64,
                    height: 64,
                    background: '#FFFFFF',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(241, 245, 249, 1)'
                }}>
                    <span style={{ fontSize: 30 }}>📋</span>
                </div>
                <h2 style={{
                    color: '#94A3B8',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 4,
                    margin: 0
                }}>
                    Mis Pedidos
                </h2>
                <p style={{
                    color: '#0F172A',
                    fontSize: 18,
                    fontWeight: 700,
                    margin: '8px 0 0 0'
                }}>
                    No tenés pedidos activos
                </p>
            </div>

            {/* 2. SaaS Action Pills — Linked to Functional Logic */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                padding: '0 24px',
                marginBottom: 48
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
                    <span style={{ fontSize: 20 }}>🚚</span>
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
                    <span style={{ fontSize: 20 }}>🎁</span>
                    <span style={{ fontWeight: 700, color: '#334155' }}>Premios</span>
                </button>
            </div>

            {/* 3. Featured Products Grid (Mapped from Config Props) */}
            <div style={{ padding: '0 24px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    marginBottom: 24
                }}>
                    <h3 style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: '#0F172A',
                        lineHeight: 1,
                        margin: 0
                    }}>
                        Productos Destacados
                    </h3>
                    <button
                        onClick={() => navigate(menuPath)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563EB',
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            padding: 0
                        }}
                    >
                        Ver todo →
                    </button>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16
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
                        padding: '16px 0',
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
