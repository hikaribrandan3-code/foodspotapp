import { useState } from 'react'
import ColorPickerModal from './ColorPickerModal.jsx'

// Icons matching Home.jsx exactly
const HERO_ICONS = {
    menu: (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    delivery: (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18.5" cy="17.5" r="3.5" />
            <circle cx="5.5" cy="17.5" r="3.5" />
            <polyline points="15 6 15 10 20 10 20 14" />
            <path d="M6 10v4H2V9a1 1 0 0 1 1-1h13V6H6" />
        </svg>
    ),
    rewards: (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    ),
    game: (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <line x1="6" y1="12" x2="10" y2="12" />
            <line x1="8" y1="10" x2="8" y2="14" />
            <circle cx="17" cy="10" r="1" fill="currentColor" />
            <circle cx="17" cy="14" r="1" fill="currentColor" />
        </svg>
    )
}

const LABELS = {
    menu: 'Menú',
    delivery: 'Envíos',
    rewards: 'Rewards',
    game: 'Juego'
}

/**
 * HeroIconPicker - Visual parity with Home hero tiles
 * Shows exact mini tile preview + Oscuro/Claro toggle only
 */
export default function HeroIconPicker({
    iconId = 'menu',
    color = '#FFFFFF',
    iconColorMode = 'black',
    onColorChange,
    onIconModeChange
}) {
    const [showPicker, setShowPicker] = useState(false)

    const displayColor = color || '#FFFFFF'
    const iconColor = iconColorMode === 'white' ? '#FFFFFF' : '#4A4036'
    const Icon = HERO_ICONS[iconId] || HERO_ICONS.menu
    const label = LABELS[iconId] || 'Menú'

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
                {Icon}
                <span style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>{label}</span>
            </button>

            {/* Color Modal (Same as BrandingColorPicker) */}
            {showPicker && (
                <ColorPickerModal
                    title={`Color: ${label}`}
                    initialColor={displayColor}
                    onApply={(newColor) => {
                        onColorChange?.(newColor)
                        setShowPicker(false)
                    }}
                    onCancel={() => setShowPicker(false)}
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
