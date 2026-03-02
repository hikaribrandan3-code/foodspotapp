import React, { useState, useCallback, useMemo } from 'react'
import MenuCanvas, { DIVIDER_STYLES } from './MenuCanvas.jsx'
import { THEMES, FONT_PAIRINGS, getThemeById, getFontPairing } from './themes.js'
import './EditorStyles.css'

/**
 * DesignWorkspace — The FoodSpot Editor V2
 * Desktop: Sidebar (left) + Live A4 Canvas (right)
 * Mobile: Full-screen Canvas + Collapsible Bottom-Sheet (Canva-style)
 */

// Quick-access color presets for mobile
const QUICK_COLORS = [
    '#3B82F6', '#E74C3C', '#F0C040', '#4CAF50', '#8B4513', '#1A1A1A'
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
    onPrint,
    onSaveState
}) {
    // ============================
    // DESIGN STATE
    // ============================
    const [activeThemeId, setActiveThemeId] = useState('bistro')
    const [fontPairingId, setFontPairingId] = useState('playfair')
    const [colorOverrides, setColorOverrides] = useState({ bg: null, accent: null, text: null })
    const [logoSize, setLogoSize] = useState(100)
    const [qrPosition, setQrPosition] = useState('bottom-right')
    const [showCurrency, setShowCurrency] = useState(true)
    const [showQR, setShowQR] = useState(true)
    const [tagline, setTagline] = useState(localConfig?.tagline || '')
    const [dividerStyle, setDividerStyle] = useState('line')

    // Logo mode: 'image' (from hero/branding) or 'text' (business name only)
    const [logoMode, setLogoMode] = useState(logoUrl ? 'image' : 'text')

    // Mobile bottom-sheet tab & collapse state
    const [activeTab, setActiveTab] = useState('quick')
    const [sheetOpen, setSheetOpen] = useState(true)

    const theme = getThemeById(activeThemeId)

    // QR URL placeholder (Mercado Pago or business link)
    const qrUrl = useMemo(() => {
        if (!showQR) return null
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
        setColorOverrides({ bg: null, accent: null, text: null })
    }, [])

    const handleColorChange = useCallback((key, value) => {
        setColorOverrides(prev => ({ ...prev, [key]: value }))
    }, [])

    const handlePrint = useCallback(() => {
        if (onSaveState) {
            onSaveState({
                theme: activeThemeId,
                fontPairing: fontPairingId,
                colors: colorOverrides,
                logoSize,
                logoMode,
                qrPosition,
                showCurrency,
                showQR,
                tagline
            })
        }
        if (onPrint) onPrint()
        else window.print()
    }, [onPrint, onSaveState, activeThemeId, fontPairingId, colorOverrides, logoSize, logoMode, qrPosition, showCurrency, showQR, tagline])

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
                        style={{ background: t.bg, border: `2px solid ${t.accent}` }}
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
                { key: 'bg', label: 'Fondo', fallback: theme.bg },
                { key: 'accent', label: 'Acento', fallback: theme.accent },
                { key: 'text', label: 'Texto', fallback: theme.text }
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

    const renderLogoControls = () => (
        <div className="editor-sidebar-section">
            <div className="editor-sidebar-label">Logo / Encabezado</div>
            {/* Logo Mode Toggle */}
            <div className="editor-toggle-row">
                <span className="editor-toggle-label">Modo</span>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button
                        className={`editor-mode-btn ${logoMode === 'image' ? 'active' : ''}`}
                        onClick={() => setLogoMode('image')}
                        disabled={!logoUrl}
                        style={{ opacity: logoUrl ? 1 : 0.4 }}
                    >
                        🖼️ Imagen
                    </button>
                    <button
                        className={`editor-mode-btn ${logoMode === 'text' ? 'active' : ''}`}
                        onClick={() => setLogoMode('text')}
                    >
                        Aa Texto
                    </button>
                </div>
            </div>
            {/* Logo Size (only when image mode) */}
            {logoMode === 'image' && logoUrl && (
                <>
                    <div className="editor-sidebar-label" style={{ marginTop: 12 }}>Tamaño Logo</div>
                    <input
                        type="range"
                        min="30"
                        max="200"
                        value={logoSize}
                        onChange={(e) => setLogoSize(Number(e.target.value))}
                        className="editor-range"
                    />
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{logoSize}px</div>
                </>
            )}
        </div>
    )

    const renderToggles = () => (
        <>
            {/* Logo Controls */}
            {renderLogoControls()}

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
                                background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB',
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
                        width: '100%', padding: '10px 12px', background: '#F9FAFB',
                        border: '1px solid #D1D5DB', borderRadius: 8, color: '#374151',
                        fontSize: 13, boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif'
                    }}
                />
            </div>

            {/* Category Dividers */}
            <div className="editor-sidebar-section">
                <div className="editor-sidebar-label">Separador</div>
                <div className="editor-font-toggle">
                    {Object.entries(DIVIDER_STYLES).map(([key, style]) => (
                        <div
                            key={key}
                            className={`editor-font-option ${dividerStyle === key ? 'active' : ''}`}
                            onClick={() => setDividerStyle(key)}
                        >
                            {style.label}
                        </div>
                    ))}
                </div>
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
                    <span>Editor</span>
                </div>
                <div className="editor-topbar-actions">
                    <button className="editor-btn editor-btn-ghost" onClick={onClose}>
                        ← Volver
                    </button>
                    <button className="editor-btn editor-btn-primary" onClick={handlePrint}>
                        🖨️ Imprimir
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
                        <div className="editor-sidebar-label">Temas</div>
                        {renderThemePicker(false)}
                    </div>

                    {/* Fonts */}
                    <div className="editor-sidebar-section">
                        <div className="editor-sidebar-label">Tipografía</div>
                        {renderFontPicker()}
                    </div>

                    {/* Colors */}
                    <div className="editor-sidebar-section">
                        <div className="editor-sidebar-label">Colores</div>
                        {renderColorPickers()}
                    </div>

                    {/* Elements / Toggles */}
                    {renderToggles()}
                </div>

                {/* CANVAS VIEWPORT */}
                <div className={`editor-canvas-viewport ${sheetOpen ? '' : 'sheet-collapsed'}`}>
                    <MenuCanvas
                        menu={menu}
                        businessName={businessName}
                        logoUrl={logoUrl}
                        logoMode={logoMode}
                        theme={theme}
                        fontPairingId={fontPairingId}
                        colorOverrides={colorOverrides}
                        logoSize={logoSize}
                        qrPosition={qrPosition}
                        showCurrency={showCurrency}
                        qrUrl={qrUrl}
                        tagline={tagline}
                        dividerStyle={dividerStyle}
                    />
                </div>
            </div>

            {/* MOBILE BOTTOM SHEET — Collapsible Canva-Style */}
            <div className={`editor-bottom-sheet ${sheetOpen ? 'expanded' : 'collapsed'}`}>
                {/* Drag Handle — toggles sheet */}
                <div
                    className="editor-sheet-handle"
                    onClick={() => setSheetOpen(prev => !prev)}
                />

                {sheetOpen ? (
                    <>
                        <div className="editor-sheet-tabs">
                            <button
                                className={`editor-sheet-tab ${activeTab === 'quick' ? 'active' : ''}`}
                                onClick={() => setActiveTab('quick')}
                            >
                                Diseño
                            </button>
                            <button
                                className={`editor-sheet-tab ${activeTab === 'settings' ? 'active' : ''}`}
                                onClick={() => setActiveTab('settings')}
                            >
                                Ajustes
                            </button>
                            <button
                                className={`editor-sheet-tab ${activeTab === 'save' ? 'active' : ''}`}
                                onClick={() => setActiveTab('save')}
                            >
                                Guardar
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

                                    {/* Color Pickers (Full) */}
                                    <div style={{ marginTop: 16 }}>
                                        {renderColorPickers()}
                                    </div>
                                </>
                            ) : activeTab === 'settings' ? (
                                <>
                                    {/* Logo Controls */}
                                    {renderLogoControls()}

                                    {/* Psychological Pricing Toggle */}
                                    <div className="editor-toggle-row" style={{ marginTop: 12 }}>
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

                                    {/* Tagline */}
                                    <div style={{ marginTop: 12 }}>
                                        <div className="editor-sidebar-label">Subtítulo</div>
                                        <input
                                            type="text"
                                            value={tagline}
                                            onChange={(e) => setTagline(e.target.value)}
                                            placeholder="Ej: Est. 2023"
                                            style={{
                                                width: '100%', padding: '10px 12px', background: '#F9FAFB',
                                                border: '1px solid #D1D5DB', borderRadius: 8, color: '#374151',
                                                fontSize: 13, boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif'
                                            }}
                                        />
                                    </div>

                                    {/* Font Picker */}
                                    <div style={{ marginTop: 16 }}>
                                        <div className="editor-sidebar-label">Tipografía</div>
                                        {renderFontPicker()}
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

                                    {/* Save & Print */}
                                    <button className="editor-mobile-save-btn" onClick={handlePrint}>
                                        🖨️ Guardar e Imprimir
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    /* COLLAPSED: Mini toolbar */
                    <div className="editor-mini-toolbar">
                        {THEMES.map(t => (
                            <div
                                key={t.id}
                                className={`editor-mini-theme ${activeThemeId === t.id ? 'active' : ''}`}
                                style={{ background: t.bg, border: `2px solid ${t.accent}` }}
                                onClick={() => selectTheme(t.id)}
                            >
                                {t.icon}
                            </div>
                        ))}
                        <button className="editor-mini-print" onClick={handlePrint}>
                            🖨️
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
