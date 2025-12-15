import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getConfig } from '../../config/appConfig.js'

// SVG Icons for premium look
const WhatsAppIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
)

const LockIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
)

const LocationIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>
)

const ClockIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
)

const MapIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>
)

function Info() {
    const navigate = useNavigate()
    const [config, setConfig] = useState(() => getConfig())

    // Refresh config
    useEffect(() => {
        const interval = setInterval(() => {
            setConfig(getConfig())
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    const infoDisplay = config.infoDisplay || {}
    const businessInfo = config.businessInfo || {}
    const hasBusinessInfo = infoDisplay.showAddress || infoDisplay.showHours || infoDisplay.showMapLink

    // Warm terracotta color palette (matching wireframe)
    const primaryColor = '#C4856A' // Terracotta
    const cardBg = '#FAFAFA'
    const textMuted = '#9CA3AF'

    return (
        <div className="page" style={{
            paddingBottom: 'calc(var(--nav-height) + var(--space-4))',
            background: '#F9F7F5',
            paddingTop: 0
        }}>
            {/* Business Name Bar (slim top bar) */}
            <div style={{
                height: 52,
                display: 'flex',
                alignItems: 'center',
                background: 'var(--color-surface, #FFFFFF)',
                marginLeft: 'calc(-1 * var(--space-4))',
                marginRight: 'calc(-1 * var(--space-4))',
                marginTop: 'calc(-1 * var(--space-4))',
                paddingLeft: 'var(--space-4)',
                paddingRight: 'var(--space-4)',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                marginBottom: 'var(--space-4)'
            }}>
                <span style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#374151'
                }}>
                    {config.businessName || 'FoodSpot'}
                </span>
            </div>

            {/* Page Title */}
            <h1 style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                marginBottom: 'var(--space-4)',
                color: '#1F2937'
            }}>
                Info
            </h1>


            {/* 2. WHATSAPP (PRIMARY CTA) - Toggleable */}
            {infoDisplay.showWhatsApp && businessInfo.whatsapp && (
                <a
                    href={`https://wa.me/${businessInfo.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '14px 24px',
                        background: primaryColor,
                        color: 'white',
                        borderRadius: 28,
                        border: 'none',
                        fontSize: 16,
                        fontWeight: 500,
                        textDecoration: 'none',
                        marginBottom: 12,
                        cursor: 'pointer'
                    }}
                >
                    <WhatsAppIcon />
                    Escribinos por WhatsApp
                </a>
            )}

            {/* External Ordering: Rappi */}
            {config.externalOrdering?.rappiEnabled && config.externalOrdering?.rappiUrl && (
                <a
                    href={config.externalOrdering.rappiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        padding: '13px 24px',
                        background: '#FEF7F0',
                        color: '#B8562B',
                        borderRadius: 28,
                        border: '1px solid #FADCC8',
                        fontSize: 15,
                        fontWeight: 500,
                        textDecoration: 'none',
                        marginBottom: 10,
                        cursor: 'pointer'
                    }}
                >
                    Pedir por Rappi
                </a>
            )}

            {/* External Ordering: PedidosYa */}
            {config.externalOrdering?.pedidosYaEnabled && config.externalOrdering?.pedidosYaUrl && (
                <a
                    href={config.externalOrdering.pedidosYaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        padding: '13px 24px',
                        background: '#FFF5F5',
                        color: '#C41E3A',
                        borderRadius: 28,
                        border: '1px solid #FFD4D4',
                        fontSize: 15,
                        fontWeight: 500,
                        textDecoration: 'none',
                        marginBottom: 12,
                        cursor: 'pointer'
                    }}
                >
                    Pedir por PedidosYa
                </a>
            )}

            {/* 3. ADMIN ACCESS - Always visible, NOT toggleable */}
            <button
                onClick={() => navigate('/staff')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '12px 24px',
                    background: 'white',
                    color: '#6B7280',
                    borderRadius: 28,
                    border: '1px solid #E5E7EB',
                    fontSize: 15,
                    fontWeight: 500,
                    cursor: 'pointer',
                    marginBottom: 'var(--space-4)'
                }}
            >
                <LockIcon />
                Acceso administrador
            </button>

            {/* 4. BUSINESS INFO CARD - Toggle-driven */}
            {hasBusinessInfo && (
                <div style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 'var(--space-4)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    {/* Address */}
                    {infoDisplay.showAddress && businessInfo.address && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            paddingBottom: 16,
                            marginBottom: 16,
                            borderBottom: '1px solid #F3F4F6'
                        }}>
                            <div style={{ color: textMuted, marginTop: 2 }}>
                                <LocationIcon />
                            </div>
                            <div>
                                <p style={{
                                    fontWeight: 600,
                                    fontSize: 15,
                                    color: '#374151',
                                    marginBottom: 4
                                }}>
                                    Dirección:
                                </p>
                                <p style={{ fontSize: 14, color: '#6B7280' }}>
                                    {businessInfo.address}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Hours */}
                    {infoDisplay.showHours && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            paddingBottom: 16,
                            marginBottom: 16,
                            borderBottom: '1px solid #F3F4F6'
                        }}>
                            <div style={{ color: textMuted, marginTop: 2 }}>
                                <ClockIcon />
                            </div>
                            <div>
                                <p style={{
                                    fontWeight: 600,
                                    fontSize: 15,
                                    color: '#374151',
                                    marginBottom: 4
                                }}>
                                    Horarios:
                                </p>
                                <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 2 }}>
                                    Lun-Sáb 9:00-22:00
                                </p>
                                <p style={{ fontSize: 14, color: '#6B7280' }}>
                                    Dom 10:00-20:00
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Google Maps Link */}
                    {infoDisplay.showMapLink && businessInfo.googleMapsLink && (
                        <a
                            href={businessInfo.googleMapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                color: primaryColor,
                                textDecoration: 'none',
                                fontSize: 15,
                                fontWeight: 500
                            }}
                        >
                            <div style={{ color: textMuted }}>
                                <MapIcon />
                            </div>
                            Ver en Google Maps
                        </a>
                    )}
                </div>
            )}

            {/* 5. ATTRIBUTION (MANDATORY) - Always visible, NOT toggleable */}
            <p style={{
                textAlign: 'center',
                fontSize: 13,
                color: textMuted,
                marginTop: 'auto',
                paddingTop: 'var(--space-6)'
            }}>
                Powered by <a
                    href="https://instagram.com/foodspotapp"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: primaryColor, textDecoration: 'none' }}
                >@foodspotapp</a>
            </p>
        </div>
    )
}

export default Info
