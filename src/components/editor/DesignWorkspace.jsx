import React, { useState, useCallback, useMemo } from 'react'
import MenuCanvas from './MenuCanvas.jsx'
import { THEMES, FONT_PAIRINGS, getThemeById, getFontPairing } from './themes.js'
import './EditorStyles.css'

/**
 * DesignWorkspace — The FoodSpot Editor
 * Desktop: Sidebar (left) + Live A4 Canvas (right)
 * Mobile: Full-screen Canvas + Fixed Bottom-Sheet
 */

// Quick-access color presets for mobile
const QUICK_COLORS = [
    '#3B82F6', '#E74C3C', '#F0C040', '#4CAF50', '#212121', '#FFFFFF'
]

export default function DesignWorkspace({
    menu,
    businessName,
    logoUrl,
    tenantData,
    localConfig,
    targetBusinessId,
    hasChanges,
    onClose,
    onPrint
}) {
    // ============================
    // DESIGN STATE
    // ============================
    const [activeThemeId, setActiveThemeId] = useState('burger')
    const [fontPairingId, setFontPairingId] = useState('oswald')
    const [colorOverrides, setColorOverrides] = useState({ bg: null, accent: null, text: null })
    const [logoSize, setLogoSize] = useState(60)
    const [qrPosition, setQrPosition] = useState('bottom-right')
    const [showCurrency, setShowCurrency] = useState(true)
    const [showQR, setShowQR] = useState(true)
    const [tagline, setTagline] = useState(localConfig?.tagline || '')

    // Mobile bottom-sheet tab
    const [activeTab, setActiveTab] = useState('quick')

    const theme = getThemeById(activeThemeId)

    // QR URL placeholder (Mercado Pago or business link)
    const qrUrl = useMemo(() => {
        if (!showQR) return null
        // Generate a QR code URL using a free API
        const menuUrl = `${window.location.origin}/${tenantData?.slug || 'menu'}`
        return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(menuUrl)}&bgcolor=FFFFFF&color=000000`
    }, [showQR, tenantData?.slug])

    // Sync warning check
    const isOutOfSync = hasChanges || (
        localConfig?.lastPrintedAt &&
        tenantData?.updated_at &&
        new Date(tenantData.updated_at) > new Date(localConfig.lastPrintedAt)
    )

    // ============================
    // HANDLERS
    // ============================
    const selectTheme = useCallback((id) => {
        setActiveThemeId(id)
        const t = getThemeById(id)
        setFontPairingId(t.fontPairing)
        // Reset color overrides when switching themes
        setColorOverrides({ bg: null, accent: null, text: null })
    }, [])

    const handleColorChange = useCallback((key, value) => {
        setColorOverrides(prev => ({ ...prev, [key]: value }))
    }, [])

    const handlePrint = useCallback(() => {
        if (onPrint) onPrint()
        else window.print()
    }, [onPrint])

    // ============================
    // SIDEBAR CONTROLS (Shared between desktop sidebar and mobile sheet)
    // ============================
    const renderThemePicker = (isMobile = false) => (
        <div className={isMobile ? 'editor-mobile-themes' : 'editor-theme-grid'}>
            {THEMES.map(t => (
                <div
                    key={t.id}
                    className={`${isMobile ? 'editor-mobile-theme-card' : 'editor-theme-card'} ${activeThemeId === t.id ? 'active' : ''}`}
                    onClick={() => selectTheme(t.id)}
                >
                    <div
                        className={isMobile ? 'editor-mobile-theme-icon' : 'editor-theme-thumb'}
                        style={{ background: t.bg }}
                    >
                        {t.icon}
                    </div>
                    <span className={isMobile ? 'editor-mobile-theme-label' : 'editor-theme-name'}>
                        {t.name}
                    </span>
                </div>
            ))}
        </div>
    )

    const renderFontPicker = () => (
        <div className="editor-font-toggle">
            {FONT_PAIRINGS.map(fp => (
                <div
                    key={fp.id}
                    className={`editor-font-option ${fontPairingId === fp.id ? 'active' : ''}`}
                    onClick={() => setFontPairingId(fp.id)}
                >
                    <span style={{ fontFamily: fp.heading, fontWeight: 700 }}>{fp.label.split(' & ')[0]}</span>
                    {' & '}
                    <span style={{ fontFamily: fp.body }}>{fp.label.split(' & ')[1]}</span>
                </div>
            ))}
        </div>
    )

    const renderColorPickers = () => (
        <div className="editor-color-row">
            {[
                { key: 'bg', label: 'Background', fallback: theme.bg },
                { key: 'accent', label: 'Accent', fallback: theme.accent },
                { key: 'text', label: 'Text', fallback: theme.text }
            ].map(({ key, label, fallback }) => (
                <div key={key} className="editor-color-group">
                    <label>{label}</label>
                    <div className="editor-color-swatch">
                        <input
                            type="color"
                            value={colorOverrides[key] || fallback}
                            onChange={(e) => handleColorChange(key, e.target.value)}
                        />
                        <span className="editor-color-hex">
                            {(colorOverrides[key] || fallback).toUpperCase()}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    )

    const renderToggles = () => (
        <>
            {/* Logo Size */}
            <div className="editor-sidebar-section">
                <div className="editor-sidebar-label">Logo Size</div>
                <input
                    type="range"
                    min="30"
                    max="120"
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                    className="editor-range"
                />
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{logoSize}px</div>
            </div>

            {/* QR Code */}
            <div className="editor-sidebar-section">
                <div className="editor-sidebar-label">QR Code</div>
                <div className="editor-toggle-row">
                    <span className="editor-toggle-label">Mostrar QR</span>
                    <label className="toggle">
                        <input type="checkbox" checked={showQR} onChange={(e) => setShowQR(e.target.checked)} />
                        <span className="toggle-slider" />
                    </label>
                </div>
                {showQR && (
                    <div className="editor-toggle-row">
                        <span className="editor-toggle-label">Posición</span>
                        <select
                            value={qrPosition}
                            onChange={(e) => setQrPosition(e.target.value)}
                            style={{
                                background: '#2A2A2A', color: '#E5E7EB', border: '1px solid #374151',
                                borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 600
                            }}
                        >
                            <option value="top-right">↗ Arriba Derecha</option>
                            <option value="bottom-right">↘ Abajo Derecha</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Psychological Pricing */}
            <div className="editor-sidebar-section">
                <div className="editor-sidebar-label">Precios</div>
                <div className="editor-toggle-row">
                    <span className="editor-toggle-label">Mostrar símbolo $</span>
                    <label className="toggle">
                        <input type="checkbox" checked={showCurrency} onChange={(e) => setShowCurrency(e.target.checked)} />
                        <span className="toggle-slider" />
                    </label>
                </div>
            </div>

            {/* Tagline */}
            <div className="editor-sidebar-section">
                <div className="editor-sidebar-label">Subtítulo</div>
                <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Ej: Est. 2023 | Artesanal"
                    style={{
                        width: '100%', padding: '10px 12px', background: '#1F1F1F',
                        border: '1px solid #374151', borderRadius: 8, color: '#E5E7EB',
                        fontSize: 13, boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif'
                    }}
                />
            </div>
        </>
    )

    // ============================
    // RENDER
    // ============================
    return (
        <div className="editor-overlay">
            {/* TOP BAR */}
            <div className="editor-topbar">
                <div className="editor-topbar-title">
                    <span className="brand">FoodSpot</span>
                    <span>Menu Editor</span>
                </div>
                <div className="editor-topbar-actions">
                    <button className="editor-btn editor-btn-ghost" onClick={onClose}>
                        ← Volver
                    </button>
                    <button className="editor-btn editor-btn-primary" onClick={handlePrint}>
                        🖨️ Save & Print
                    </button>
                </div>
            </div>

            {/* BODY: Sidebar + Canvas */}
            <div className="editor-body">
                {/* DESKTOP SIDEBAR */}
                <div className="editor-sidebar">
                    {/* Sync Warning */}
                    {isOutOfSync && (
                        <div className="editor-sync-warning">
                            <span className="icon">⚠️</span>
                            <p>
                                {hasChanges
                                    ? 'Tienes cambios sin guardar. El menú impreso podría no reflejar los precios actuales.'
                                    : 'El menú digital fue modificado desde la última impresión.'}
                            </p>
                        </div>
                    )}

                    {/* Themes */}
                    <div className="editor-sidebar-section">
                        <div className="editor-sidebar-label">Themes</div>
                        {renderThemePicker(false)}
                    </div>

                    {/* Fonts */}
                    <div className="editor-sidebar-section">
                        <div className="editor-sidebar-label">Fonts</div>
                        {renderFontPicker()}
                    </div>

                    {/* Colors */}
                    <div className="editor-sidebar-section">
                        <div className="editor-sidebar-label">Colors</div>
                        {renderColorPickers()}
                    </div>

                    {/* Elements / Toggles */}
                    {renderToggles()}
                </div>

                {/* CANVAS VIEWPORT */}
                <div className="editor-canvas-viewport">
                    <MenuCanvas
                        menu={menu}
                        businessName={businessName}
                        logoUrl={logoUrl}
                        theme={theme}
                        fontPairingId={fontPairingId}
                        colorOverrides={colorOverrides}
                        logoSize={logoSize}
                        qrPosition={qrPosition}
                        showCurrency={showCurrency}
                        qrUrl={qrUrl}
                        tagline={tagline}
                    />
                </div>
            </div>

            {/* MOBILE BOTTOM SHEET */}
            <div className="editor-bottom-sheet">
                <div className="editor-sheet-handle" />
                <div className="editor-sheet-tabs">
                    <button
                        className={`editor-sheet-tab ${activeTab === 'quick' ? 'active' : ''}`}
                        onClick={() => setActiveTab('quick')}
                    >
                        Quick Edits
                    </button>
                    <button
                        className={`editor-sheet-tab ${activeTab === 'save' ? 'active' : ''}`}
                        onClick={() => setActiveTab('save')}
                    >
                        Save & Print
                    </button>
                </div>

                <div className="editor-sheet-content">
                    {activeTab === 'quick' ? (
                        <>
                            {/* Theme Picker (Horizontal) */}
                            {renderThemePicker(true)}

                            {/* Quick Color Dots */}
                            <div className="editor-mobile-colors">
                                {QUICK_COLORS.map(color => (
                                    <div
                                        key={color}
                                        className={`editor-mobile-color-dot ${colorOverrides.accent === color ? 'active' : ''}`}
                                        style={{ background: color }}
                                        onClick={() => handleColorChange('accent', color)}
                                    />
                                ))}
                            </div>

                            {/* Psychological Pricing Toggle */}
                            <div className="editor-toggle-row" style={{ marginTop: 16 }}>
                                <span className="editor-toggle-label">Mostrar $</span>
                                <label className="toggle">
                                    <input type="checkbox" checked={showCurrency} onChange={(e) => setShowCurrency(e.target.checked)} />
                                    <span className="toggle-slider" />
                                </label>
                            </div>

                            {/* QR Toggle */}
                            <div className="editor-toggle-row">
                                <span className="editor-toggle-label">QR Code</span>
                                <label className="toggle">
                                    <input type="checkbox" checked={showQR} onChange={(e) => setShowQR(e.target.checked)} />
                                    <span className="toggle-slider" />
                                </label>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Sync Warning */}
                            {isOutOfSync && (
                                <div className="editor-sync-warning">
                                    <span className="icon">⚠️</span>
                                    <p>
                                        {hasChanges
                                            ? 'Guarda tus cambios primero para imprimir la versión final.'
                                            : 'El menú digital fue modificado. Vuelve a imprimir.'}
                                    </p>
                                </div>
                            )}

                            {/* Font Picker */}
                            <div style={{ marginBottom: 16 }}>
                                <div className="editor-sidebar-label">Tipografía</div>
                                {renderFontPicker()}
                            </div>

                            {/* Save & Print */}
                            <button className="editor-mobile-save-btn" onClick={handlePrint}>
                                Save & Print
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
