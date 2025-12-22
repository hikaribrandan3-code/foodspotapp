import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createDemoSession } from '../../utils/demoSession.js'
import HeaderClamp from '../../components/HeaderClamp.jsx'

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

function Info({ config }) {
    const navigate = useNavigate()

    // INVARIANT: config prop is ALREADY normalized and includes demo branding
    // DO NOT merge demo branding here - it bypasses normalizeConfig()

    const infoDisplay = config?.infoDisplay || {}
    const businessInfo = config?.businessInfo || {}
    const hasBusinessInfo = infoDisplay.showAddress || infoDisplay.showHours || infoDisplay.showMapLink

    // INFO PILL COLORS — Read directly from normalized config
    const pillColors = config?.infoPills || {}
    const defaultPillColors = {
        whatsapp: { bgColor: '#C4856A', textColor: 'white' },
        mercadoPago: { bgColor: '#FFE600', textColor: '#009EE3' },
        rappi: { bgColor: '#FF5A00', textColor: 'white' },
        pedidosYa: { bgColor: '#E31837', textColor: 'white' },
        adminAccess: { bgColor: 'var(--surface-alt-bg)', textColor: 'var(--canvas-text)', borderColor: 'var(--border-subtle)' },
        demo: { bgColor: '#84CC16', textColor: 'white' },
        custom: { bgColor: '#6366F1', textColor: 'white' }
    }
    const getPillStyle = (pillId) => {
        const pill = pillColors[pillId] || defaultPillColors[pillId] || {}
        return {
            backgroundColor: pill.bgColor || defaultPillColors[pillId]?.bgColor,
            color: pill.textColor || defaultPillColors[pillId]?.textColor,
            borderColor: pill.borderColor || 'transparent'
        }
    }

    // Powered by color from normalized config
    const effectivePoweredByColor = config?.branding?.poweredByColor || '#C4856A'

    // Theme-aware colors (use CSS tokens that switch for light/dark mode)
    const primaryColor = 'var(--icon-primary)'
    const textMuted = 'var(--icon-muted)'

    return (
        <div className="page info-root" style={{
            padding: '0 24px',
            paddingTop: 24,
            paddingBottom: 90,
            minHeight: '100vh'
        }}>
            <HeaderClamp />

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
                        backgroundColor: getPillStyle('whatsapp').backgroundColor,
                        color: getPillStyle('whatsapp').color,
                        borderRadius: 28,
                        border: 'none',
                        fontSize: 16,
                        fontWeight: 500,
                        textDecoration: 'none',
                        marginBottom: 12,
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                    }}
                >
                    <WhatsAppIcon />
                    Escribinos por WhatsApp
                </a>
            )}

            {/* Mercado Pago - Copy Alias */}
            {config.payments?.mercadoPagoAlias && (
                <button
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(config.payments.mercadoPagoAlias)
                            const btn = document.getElementById('mp-copy-btn')
                            const originalText = btn.textContent
                            btn.textContent = '✓ Alias copiado'
                            setTimeout(() => { btn.textContent = originalText }, 2000)
                        } catch (err) {
                            alert(`Alias: ${config.payments.mercadoPagoAlias}`)
                        }
                    }}
                    id="mp-copy-btn"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '14px 24px',
                        backgroundColor: getPillStyle('mercadoPago').backgroundColor,
                        color: getPillStyle('mercadoPago').color,
                        borderRadius: 28,
                        border: 'none',
                        fontSize: 16,
                        fontWeight: 600,
                        textDecoration: 'none',
                        marginBottom: 12,
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                    }}
                >
                    Pagar con Mercado Pago
                </button>
            )}

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
                        backgroundColor: getPillStyle('rappi').backgroundColor,
                        color: getPillStyle('rappi').color,
                        borderRadius: 28,
                        border: 'none',
                        fontSize: 15,
                        fontWeight: 500,
                        textDecoration: 'none',
                        marginBottom: 10,
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                    }}
                >
                    Pedir por Rappi
                </a>
            )}

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
                        backgroundColor: getPillStyle('pedidosYa').backgroundColor,
                        color: getPillStyle('pedidosYa').color,
                        borderRadius: 28,
                        border: 'none',
                        fontSize: 15,
                        fontWeight: 500,
                        textDecoration: 'none',
                        marginBottom: 12,
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                    }}
                >
                    Pedir por PedidosYa
                </a>
            )}

            <button
                onClick={() => navigate('/staff')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '12px 24px',
                    backgroundColor: getPillStyle('adminAccess').backgroundColor,
                    color: getPillStyle('adminAccess').color,
                    borderRadius: 28,
                    border: `1px solid ${getPillStyle('adminAccess').borderColor}`,
                    fontSize: 14,
                    fontWeight: 400,
                    cursor: 'pointer',
                    marginBottom: 10,
                    boxSizing: 'border-box'
                }}
            >
                <LockIcon />
                Acceso administrador
            </button>

            {/* Demo Mode Entry Button */}
            <button
                onClick={() => {
                    createDemoSession()
                    navigate('/demo/backend/dashboard')
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    padding: '12px 24px',
                    backgroundColor: getPillStyle('demo').backgroundColor,
                    color: getPillStyle('demo').color,
                    borderRadius: 28,
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    marginBottom: 20,
                    boxSizing: 'border-box'
                }}
            >
                DEMO
            </button>

            {hasBusinessInfo && (
                <div style={{
                    backgroundColor: 'var(--surface-bg)',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 20,
                    boxShadow: 'var(--shadow-card)'
                }}>
                    {infoDisplay.showAddress && businessInfo.address && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            paddingBottom: 16,
                            marginBottom: 16,
                            borderBottom: '1px solid var(--border-subtle)'
                        }}>
                            <div style={{ color: textMuted, marginTop: 2 }}>
                                <LocationIcon />
                            </div>
                            <div>
                                <p style={{
                                    fontWeight: 600,
                                    fontSize: 15,
                                    color: 'var(--canvas-text)',
                                    marginBottom: 4
                                }}>
                                    Dirección:
                                </p>
                                <p style={{ fontSize: 14, color: 'var(--canvas-text-muted)', margin: 0 }}>
                                    {businessInfo.address}
                                </p>
                            </div>
                        </div>
                    )}

                    {infoDisplay.showHours && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            paddingBottom: 16,
                            marginBottom: 16,
                            borderBottom: '1px solid var(--border-subtle)'
                        }}>
                            <div style={{ color: textMuted, marginTop: 2 }}>
                                <ClockIcon />
                            </div>
                            <div>
                                <p style={{
                                    fontWeight: 600,
                                    fontSize: 15,
                                    color: 'var(--canvas-text)',
                                    marginBottom: 4
                                }}>
                                    Horarios:
                                </p>
                                <p style={{ fontSize: 14, color: 'var(--canvas-text-muted)', margin: 0, marginBottom: 2 }}>
                                    Lun-Sáb 9:00-22:00
                                </p>
                                <p style={{ fontSize: 14, color: 'var(--canvas-text-muted)', margin: 0 }}>
                                    Dom 10:00-20:00
                                </p>
                            </div>
                        </div>
                    )}

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

            <div style={{
                textAlign: 'center',
                paddingTop: 32,
                paddingBottom: 16
            }}>
                <p style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: 'var(--canvas-text)',
                    margin: 0,
                    marginBottom: 4
                }}>
                    Powered by
                </p>
                <a
                    href="https://instagram.com/foodspotapp"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: effectivePoweredByColor,
                        textDecoration: 'none'
                    }}
                >
                    @foodspotapp
                </a>
            </div>
        </div>
    )
}

export default Info
