import { useState } from 'react'
import ColorPickerModal from './ColorPickerModal.jsx' // Shared Modal

// Preset colors for quick selection (Existing)
const COLOR_PRESETS = [
    { value: '#8B7355', label: 'Café' },
    { value: '#2D3436', label: 'Carbón' },
    { value: '#1E3A5F', label: 'Marino' },
    { value: '#5D4E6D', label: 'Uva' },
    { value: '#1E5631', label: 'Bosque' },
    { value: '#8B0000', label: 'Vino' },
    { value: '#C4856A', label: 'Terracota' },
    { value: '#4A4A4A', label: 'Grafito' },
]

/**
 * BrandingColorPicker - Phase 1 Branding
 * Refactored to use shared ColorPickerModal
 */
export default function BrandingColorPicker({
    primaryColor = '#8B7355',
    iconColorMode = 'white',
    iconColorLabel = 'Color de íconos', // Allow customization of this label
    onColorPreview, // NEW: DOM injection
    onColorSave,    // NEW: Cloud Save
    onIconModeChange
}) {
    const [showPicker, setShowPicker] = useState(false)

    return (
        <div style={{ marginBottom: 13 }}>
            {/* Current Color Preview + Presets */}
            <div style={{
                background: 'white',
                borderRadius: 14,
                padding: 13,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                marginBottom: 13,
                borderLeft: '4px solid #10B981'
            }}>
                {/* Live Preview */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 11,
                    padding: 10,
                    background: '#F9FAFB',
                    borderRadius: 8
                }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: primaryColor,
                        border: '2px solid rgba(0,0,0,0.1)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                    }} />
                    <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#059669', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Color actual
                        </p>
                        <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0', fontFamily: 'monospace' }}>
                            {primaryColor?.toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* Preset Colors */}
                <p style={{ fontSize: 10, color: '#059669', marginBottom: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rápidos</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {COLOR_PRESETS.map(color => (
                        <button
                            key={color.value}
                            onClick={() => onColorSave?.(color.value)}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 6,
                                backgroundColor: color.value,
                                border: primaryColor === color.value
                                    ? '2px solid #10B981'
                                    : '1px solid #D1FAE5',
                                cursor: 'pointer',
                                transition: 'transform 0.1s',
                            }}
                            title={color.label}
                        />
                    ))}
                </div>

                {/* Personalizar Button */}
                <button
                    onClick={() => setShowPicker(true)}
                    style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#ECFDF5',
                        border: '2px dashed #10B981',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#059669',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'all 0.2s'
                    }}
                >
                    🎛️ Personalizar
                </button>
            </div>

            {/* Shared Picker Modal - UPGRADED: Live preview via onLiveChange */}
            {showPicker && (
                <ColorPickerModal
                    title="Selector de color"
                    initialColor={primaryColor}
                    onLiveChange={onColorPreview}  // Live preview: updates DOM only
                    onApply={(color) => {
                        onColorSave?.(color)    // Final confirmation: updates Config + Cloud
                        setShowPicker(false)
                    }}
                />
            )}

            {/* Icon Color Toggle - ALWAYS VISIBLE */}
            <div style={{
                background: 'white',
                borderRadius: 14,
                padding: 13,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                borderLeft: '4px solid #10B981'
            }}>
                <label style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#059669',
                    display: 'block',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    {iconColorLabel}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        onClick={() => {
                            onIconModeChange?.('white')
                            window.dispatchEvent(new CustomEvent('frontendSync'))
                        }}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: iconColorMode !== 'black'
                                ? '2px solid #10B981'
                                : '1px solid #D1FAE5',
                            background: '#1F2937',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 11,
                            transition: 'all 0.2s'
                        }}
                    >
                        ⚪ Blanco
                    </button>
                    <button
                        onClick={() => {
                            onIconModeChange?.('black')
                            window.dispatchEvent(new CustomEvent('frontendSync'))
                        }}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: iconColorMode === 'black'
                                ? '2px solid #10B981'
                                : '1px solid #D1FAE5',
                            background: '#FFFFFF',
                            color: '#1F2937',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 11,
                            transition: 'all 0.2s'
                        }}
                    >
                        ⚫ Negro
                    </button>
                </div>
                <p style={{ fontSize: 10, color: '#059669', marginTop: 6, opacity: 0.8, fontWeight: 500 }}>
                    Usa negro si el color de nav es claro
                </p>
            </div>
        </div>
    )
}
