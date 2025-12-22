import { Link } from 'react-router-dom'
import { getMenu, formatPrice } from '../../config/menuData.js'

function Promos({ config }) {
    const menu = getMenu()

    // Get all promo/featured items
    const promoItems = []
    menu.categories?.forEach(cat => {
        cat.items?.forEach(item => {
            if (item.isPromo || item.featured) {
                promoItems.push({ ...item, categoryName: cat.name, categoryIcon: cat.icon })
            }
        })
    })

    return (
        <div style={{
            minHeight: '100vh',
            background: '#FAF8F5',
            paddingBottom: 100,
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Header */}
            <div style={{
                padding: '20px 16px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
            }}>
                <Link to="/" style={{
                    color: '#6B7280',
                    fontSize: 20,
                    textDecoration: 'none'
                }}>←</Link>
                <h1 style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: '#1F2937',
                    margin: 0
                }}>
                    Promos & Destacados
                </h1>
            </div>

            {/* Content */}
            <div style={{ padding: '0 16px' }}>
                {promoItems.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {promoItems.map((item, i) => (
                            <Link key={item.id || i} to="/menu" style={{
                                background: 'white',
                                borderRadius: 14,
                                overflow: 'hidden',
                                textDecoration: 'none',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                display: 'flex',
                                gap: 14
                            }}>
                                {/* Image placeholder */}
                                <div style={{
                                    width: 100,
                                    height: 100,
                                    background: `linear-gradient(135deg, #E8DFD3 0%, #C9B89A 100%)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 28,
                                    flexShrink: 0,
                                    position: 'relative'
                                }}>
                                    {item.isPromo && item.promoBadge && (
                                        <span style={{
                                            position: 'absolute',
                                            top: 6,
                                            left: 6,
                                            background: '#EF4444',
                                            color: 'white',
                                            fontSize: 9,
                                            fontWeight: 700,
                                            padding: '2px 5px',
                                            borderRadius: 4
                                        }}>
                                            {item.promoBadge}
                                        </span>
                                    )}
                                    {item.categoryIcon || '☕'}
                                </div>

                                {/* Details */}
                                <div style={{ padding: '12px 12px 12px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <p style={{ fontSize: 15, fontWeight: 600, color: '#1F2937', margin: 0, marginBottom: 4 }}>{item.name}</p>
                                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, marginBottom: 8 }}>{item.categoryName}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {item.isPromo && item.promoPrice ? (
                                            <>
                                                <span style={{ fontSize: 16, fontWeight: 700, color: '#22C55E' }}>{formatPrice(item.promoPrice)}</span>
                                                <span style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'line-through' }}>{formatPrice(item.price)}</span>
                                            </>
                                        ) : (
                                            <span style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>{formatPrice(item.price)}</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div style={{
                        background: 'white',
                        borderRadius: 14,
                        padding: 32,
                        textAlign: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
                        <p style={{ fontSize: 16, fontWeight: 500, color: '#374151', marginBottom: 6 }}>No hay promos activas</p>
                        <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>Pero siempre tenemos algo rico para vos</p>
                        <Link to="/menu" style={{
                            display: 'inline-block',
                            padding: '12px 24px',
                            background: '#8B7355',
                            color: 'white',
                            borderRadius: 24,
                            textDecoration: 'none',
                            fontSize: 14,
                            fontWeight: 600
                        }}>
                            Ver menú completo
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Promos
