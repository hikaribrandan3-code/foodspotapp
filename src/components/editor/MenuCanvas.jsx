import React, { useMemo, useRef, useEffect, useCallback } from 'react'
import { getFontPairing } from './themes.js'

/**
 * MenuCanvas — The A4 Live Preview V2
 * Renders the printable menu using CSS variables for real-time theme switching.
 * Supports logoMode toggle (image vs text) and decorative category dividers.
 */

// ─── DIVIDER DEFINITIONS ───────────────────────────────────────
const DIVIDER_STYLES = {
    none: { label: 'Ninguno', render: () => null },
    line: {
        label: 'Línea',
        render: (accent) => (
            <div className="menu-canvas-divider" style={{ borderBottom: `1px solid ${accent}`, opacity: 0.3, margin: '16px 0' }} />
        )
    },
    double: {
        label: 'Doble',
        render: (accent) => (
            <div className="menu-canvas-divider" style={{ borderBottom: `3px double ${accent}`, opacity: 0.3, margin: '16px 0' }} />
        )
    },
    dotted: {
        label: 'Puntos',
        render: (accent) => (
            <div className="menu-canvas-divider" style={{ borderBottom: `2px dotted ${accent}`, opacity: 0.35, margin: '16px 0' }} />
        )
    },
    dashed: {
        label: 'Guiones',
        render: (accent) => (
            <div className="menu-canvas-divider" style={{ borderBottom: `2px dashed ${accent}`, opacity: 0.3, margin: '16px 0' }} />
        )
    },
    ornament: {
        label: '◆ Diamante',
        render: (accent) => (
            <div className="menu-canvas-divider" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0', opacity: 0.4 }}>
                <span style={{ flex: 1, borderBottom: `1px solid ${accent}` }} />
                <span style={{ color: accent, fontSize: '10pt', lineHeight: 1 }}>◆</span>
                <span style={{ flex: 1, borderBottom: `1px solid ${accent}` }} />
            </div>
        )
    },
    flourish: {
        label: '✦ Ornamental',
        render: (accent) => (
            <div className="menu-canvas-divider" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '18px 0', opacity: 0.35 }}>
                <span style={{ flex: 1, borderBottom: `1px solid ${accent}` }} />
                <span style={{ color: accent, fontSize: '8pt', letterSpacing: '0.15em', lineHeight: 1 }}>✦ ── ✦</span>
                <span style={{ flex: 1, borderBottom: `1px solid ${accent}` }} />
            </div>
        )
    }
}

export { DIVIDER_STYLES }

export default function MenuCanvas({
    menu,
    businessName,
    theme,
    fontPairingId,
    colorOverrides,
    qrPosition,
    showCurrency,
    qrUrl,
    tagline,
    dividerStyle = 'none',
    onHeightChange
}) {
    // Ref for measuring actual canvas height (for multi-page scaling)
    const canvasRef = useRef(null)
    useEffect(() => {
        if (!canvasRef.current) return
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (onHeightChange) onHeightChange(entry.contentRect.height)
            }
        })
        observer.observe(canvasRef.current)
        return () => observer.disconnect()
    }, [onHeightChange])
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

    // Divider renderer
    const renderDivider = DIVIDER_STYLES[dividerStyle]?.render || (() => null)

    // CSS Variables for real-time theme override
    const cssVars = {
        '--editor-bg': bg,
        '--editor-accent': accent,
        '--editor-text': text,
        '--editor-category': categoryColor,
        '--editor-font-heading': fonts.heading,
        '--editor-font-body': fonts.body,
        '--editor-font-scale': fontScale
    }

    // The inline QR component to avoid absolute overlap
    const QRBlock = () => (qrUrl ? (
        <div className="menu-canvas-qr">
            <img src={qrUrl} alt="QR Code" />
            <span className="menu-canvas-qr-label">Escanear</span>
        </div>
    ) : null)

    return (
        <div className="menu-canvas-a4" ref={canvasRef} style={cssVars}>

            <div className="menu-canvas-content">
                {/* Header Row: Contains Text and optionally Top-Right QR */}
                <div className="menu-canvas-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div className="menu-canvas-header-text" style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h1 className="menu-canvas-biz-name">
                            {businessName || 'Mi Negocio'}
                        </h1>
                        {tagline && (
                            <div className="menu-canvas-tagline">{tagline}</div>
                        )}
                    </div>
                    {qrPosition === 'top-right' && <QRBlock />}
                </div>

                {/* Categories & Items */}
                {categories.map((cat, catIndex) => {
                    const items = (cat.items || []).filter(i => i.available !== false)
                    if (items.length === 0) return null

                    const hasImages = items.some(i => i.image)
                    const useCards = hasImages && !isDense

                    return (
                        <React.Fragment key={cat.id}>
                            {/* Decorative divider between categories */}
                            {catIndex > 0 && renderDivider(accent)}

                            <div className="menu-canvas-category">
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
                        </React.Fragment>
                    )
                })}

                {/* Footer Row: Contains Date and optionally Bottom-Right QR */}
                <div className="menu-canvas-footer" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0 }}>Precios actualizados al {new Date().toLocaleDateString('es-AR')}</p>
                    </div>
                    {qrPosition === 'bottom-right' && <QRBlock />}
                </div>
            </div>
        </div>
    )
}
