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
    onColorChange,
    onIconModeChange
}) {
    const [showPicker, setShowPicker] = useState(false)

    const handleApply = (newColor) => {
        onColorChange?.(newColor)
        setShowPicker(false)
    }

    const handleCancel = () => {
        setShowPicker(false)
    }

    return (
        <div style={{ marginBottom: 16 }}>
            {/* Section Title */}
            <h4 style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6
            }}>
                🎨 Color principal de la marca
            </h4>

            {/* Current Color Preview + Presets */}
            <div style={{
                background: 'white',
                borderRadius: 12,
                padding: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                marginBottom: 16
            }}>
                {/* Live Preview */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 16,
                    padding: 12,
                    background: '#F9FAFB',
                    borderRadius: 8
                }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        backgroundColor: primaryColor,
                        border: '2px solid rgba(0,0,0,0.1)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }} />
                    <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>
                            Color actual
                        </p>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0', fontFamily: 'monospace' }}>
                            {primaryColor?.toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* Preset Colors */}
                <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Colores rápidos</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {COLOR_PRESETS.map(color => (
                        <button
                            key={color.value}
                            onClick={() => onColorChange?.(color.value)}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                backgroundColor: color.value,
                                border: primaryColor === color.value
                                    ? '3px solid #22C55E'
                                    : '2px solid #E5E7EB',
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
                        padding: '10px 16px',
                        background: '#F3F4F6',
                        border: '1px solid #E5E7EB',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                    }}
                >
                    🎛️ Personalizar color
                </button>
            </div>

            {/* Shared Picker Modal - UPGRADED: Live preview via onLiveChange */}
            {showPicker && (
                <ColorPickerModal
                    title="Selector de color"
                    initialColor={primaryColor}
                    onLiveChange={onColorChange}  // Live preview: updates as user picks
                    onApply={(color) => {
                        onColorChange?.(color)    // Final confirmation
                        setShowPicker(false)
                    }}
                />
            )}

            {/* Icon Color Toggle - ALWAYS VISIBLE */}
            <div style={{
                background: 'white',
                borderRadius: 12,
                padding: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <label style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    display: 'block',
                    marginBottom: 10
                }}>
                    {iconColorLabel}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => {
                            onIconModeChange?.('white')
                            // 🚀 NERVE REPAIR: Dispatch Sync Event (Safety Net)
                            window.dispatchEvent(new CustomEvent('frontendSync'))
                        }}
                        style={{
                            flex: 1,
                            padding: '12px 16px',
                            borderRadius: 8,
                            border: iconColorMode !== 'black'
                                ? '2px solid #22C55E'
                                : '2px solid #E5E7EB',
                            background: '#1F2937',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 14
                        }}
                    >
                        ⚪ Blanco
                    </button>
                    <button
                        onClick={() => {
                            onIconModeChange?.('black')
                            // 🚀 NERVE REPAIR: Dispatch Sync Event (Safety Net)
                            window.dispatchEvent(new CustomEvent('frontendSync'))
                        }}
                        style={{
                            flex: 1,
                            padding: '12px 16px',
                            borderRadius: 8,
                            border: iconColorMode === 'black'
                                ? '2px solid #22C55E'
                                : '2px solid #E5E7EB',
                            background: '#FFFFFF',
                            color: '#1F2937',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 14
                        }}
                    >
                        ⚫ Negro
                    </button>
                </div>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
                    Usa negro si el color de navegación es claro
                </p>
            </div>
        </div>
    )
}
