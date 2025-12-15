import './SettingsSheet.css'

/**
 * SettingsSheet Component - Hikari CamTech Engine v3.1
 * Bottom slide-up settings panel per Gemini mock
 * z-index: 30 per PATCH 11 z-index audit
 */
export default function SettingsSheet({ toolPosition, onToolPositionChange, onClose }) {
    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-sheet" onClick={(e) => e.stopPropagation()}>
                {/* Handle */}
                <div className="settings-handle">
                    <div className="handle-bar" />
                </div>

                {/* Title */}
                <h2 className="settings-title">Settings</h2>

                {/* Tool Position Toggle */}
                <div className="settings-option">
                    <span className="option-label">Tool Position</span>
                    <div className="option-toggle">
                        <button
                            className={`toggle-button ${toolPosition === 'left' ? 'toggle-active' : ''}`}
                            onClick={() => onToolPositionChange('left')}
                        >
                            Left
                        </button>
                        <button
                            className={`toggle-button ${toolPosition === 'right' ? 'toggle-active' : ''}`}
                            onClick={() => onToolPositionChange('right')}
                        >
                            Right
                        </button>
                    </div>
                </div>

                {/* Version Info */}
                <div className="settings-version">
                    <span>Hikari CamTech Engine v3.1</span>
                </div>

                {/* Close Button */}
                <button className="settings-close" onClick={onClose}>
                    Done
                </button>
            </div>
        </div>
    )
}
