import { useState } from 'react'
import ColorPickerModal from './ColorPickerModal.jsx'
import { HERO_ICONS, HERO_LABELS } from './HeroIcons.jsx'

/**
 * HeroIconPicker - Visual parity with Home hero tiles
 * Uses shared HeroIcons.jsx (same source as Home.jsx)
 */
export default function HeroIconPicker({
    iconId = 'menu',
    color = '#FFFFFF',
    iconColorMode = 'black',
    onColorPreview, // NEW: DOM injection
    onColorSave,    // NEW: Cloud Save
    onIconModeChange
}) {
    const [showPicker, setShowPicker] = useState(false)

    const displayColor = color || '#FFFFFF'
    const iconColor = iconColorMode === 'white' ? '#FFFFFF' : '#4A4036'
    const Icon = HERO_ICONS[iconId]
    const label = HERO_LABELS[iconId]

    return (
        <div>
            {/* Mini Hero Tile - Exact visual match to Home */}
            <button
                type="button"
                onClick={() => setShowPicker(true)}
                style={{
                    width: '100%',
                    aspectRatio: '1 / 0.85',
                    borderRadius: 28,
                    backgroundColor: displayColor,
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    padding: 16,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                    color: iconColor,
                    marginBottom: 8
                }}
            >
                {Icon && <Icon />}
                <span style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>{label}</span>
            </button>

            {/* Color Modal - UPGRADED: Live preview via onLiveChange */}
            {showPicker && (
                <ColorPickerModal
                    title={`Color: ${label}`}
                    initialColor={displayColor}
                    onLiveChange={onColorPreview}  // Live preview: updates DOM only
                    onApply={(newColor) => {
                        onColorSave?.(newColor)  // Final confirmation: Cloud Save
                        setShowPicker(false)
                    }}
                />
            )}

            {/* Oscuro / Claro Toggle Only */}
            <div style={{ display: 'flex', gap: 4 }}>
                <button
                    onClick={() => onIconModeChange?.('black')}
                    style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: 8,
                        border: iconColorMode === 'black' ? '2px solid #22C55E' : '1px solid #E5E7EB',
                        background: '#FFFFFF',
                        color: '#1F2937',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Oscuro
                </button>
                <button
                    onClick={() => onIconModeChange?.('white')}
                    style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: 8,
                        border: iconColorMode === 'white' ? '2px solid #22C55E' : '1px solid #E5E7EB',
                        background: '#1F2937',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Claro
                </button>
            </div>
        </div>
    )
}
