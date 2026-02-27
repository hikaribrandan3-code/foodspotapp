import React, { useMemo } from 'react'
import { getFontPairing } from './themes.js'

/**
 * MenuCanvas — The A4 Live Preview
 * Renders the printable menu using CSS variables for real-time theme switching.
 */

export default function MenuCanvas({
    menu,
    businessName,
    logoUrl,
    theme,
    fontPairingId,
    colorOverrides,
    logoSize,
    qrPosition,
    showCurrency,
    qrUrl,
    tagline
}) {
    const fonts = getFontPairing(fontPairingId || theme.fontPairing)

    // Merge theme defaults with user overrides
    const bg = colorOverrides?.bg || theme.bg
    const accent = colorOverrides?.accent || theme.accent
    const text = colorOverrides?.text || theme.text
    const categoryColor = colorOverrides?.accent || theme.categoryColor

    // Auto-density: count total items to decide layout
    const { totalItems, categories } = useMemo(() => {
        const cats = (menu?.categories || []).filter(c => c.enabled !== false)
        let count = 0
        cats.forEach(c => {
            count += (c.items || []).filter(i => i.available !== false).length
        })
        return { totalItems: count, categories: cats }
    }, [menu])

    // >15 items → 2-column text-only, scale down font
    const isDense = totalItems > 15
    const fontScale = isDense ? 0.9 : 1

    // Format price based on psychological pricing toggle
    const fmtPrice = (price) => {
        if (!price && price !== 0) return ''
        const formatted = price.toLocaleString('es-AR')
        return showCurrency ? `$${formatted}` : formatted
    }

    // CSS Variables for real-time theme override
    const cssVars = {
        '--editor-bg': bg,
        '--editor-accent': accent,
        '--editor-text': text,
        '--editor-category': categoryColor,
        '--editor-font-heading': fonts.heading,
        '--editor-font-body': fonts.body,
        '--editor-logo-size': `${logoSize || 60}px`,
        '--editor-font-scale': fontScale
    }

    return (
        <div className="menu-canvas-a4" style={cssVars}>
            {/* Background texture overlay */}
            <div className="menu-canvas-texture" style={{ background: theme.bgTexture }} />

            {/* QR Code (always white background for scannability) */}
            {qrUrl && (
                <div className={`menu-canvas-qr ${qrPosition === 'top-right' ? 'pos-top-right' : 'pos-bottom-right'}`}>
                    <img src={qrUrl} alt="QR Code" />
                    <span className="menu-canvas-qr-label">Escanear</span>
                </div>
            )}

            <div className="menu-canvas-content">
                {/* Header */}
                <div className="menu-canvas-header">
                    {logoUrl ? (
                        <img src={logoUrl} alt={businessName} className="menu-canvas-logo" />
                    ) : (
                        <div className="menu-canvas-logo-placeholder">
                            {theme.icon}
                        </div>
                    )}
                    <h1 className="menu-canvas-biz-name">
                        {businessName || 'Mi Negocio'}
                    </h1>
                    {tagline && (
                        <div className="menu-canvas-tagline">{tagline}</div>
                    )}
                </div>

                {/* Categories & Items */}
                {categories.map(cat => {
                    const items = (cat.items || []).filter(i => i.available !== false)
                    if (items.length === 0) return null

                    // For dense menus with images: use card layout in 2 cols
                    // For dense menus without images: use text-only dotted line layout
                    const hasImages = items.some(i => i.image)
                    const useCards = hasImages && !isDense

                    return (
                        <div key={cat.id} className="menu-canvas-category">
                            <h2 className="menu-canvas-cat-title">{cat.name}</h2>
                            <div className={`menu-canvas-items ${isDense ? 'cols-2' : (useCards ? 'cols-2' : 'cols-1')}`}>
                                {items.map(item => (
                                    useCards ? (
                                        // IMAGE CARD VARIANT
                                        <div key={item.id} className="menu-canvas-item-card">
                                            {item.image && (
                                                <img src={item.image} alt={item.name} className="menu-canvas-item-img" />
                                            )}
                                            <div className="menu-canvas-item-info">
                                                <div className="menu-canvas-item-top">
                                                    <p className="menu-canvas-item-name">{item.name}</p>
                                                    <span className="menu-canvas-item-price">{fmtPrice(item.price)}</span>
                                                </div>
                                                {item.description && (
                                                    <p className="menu-canvas-item-desc">{item.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        // TEXT-ONLY DOTTED VARIANT
                                        <div key={item.id} className="menu-canvas-item-text">
                                            <span className="name">{item.name}</span>
                                            <span className="dots" />
                                            <span className="price">{fmtPrice(item.price)}</span>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )
                })}

                {/* Footer */}
                <div className="menu-canvas-footer">
                    <p>Generado por FoodSpot • {new Date().toLocaleDateString('es-AR')}</p>
                </div>
            </div>
        </div>
    )
}
