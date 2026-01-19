import React, { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

/**
 * 🛡️ OPERATION VAULT-SEAL: STRIKE 2.5 (THE PICKER)
 * ColorPickerModal - Hardware-Optimized Console
 */
export default function ColorPickerModal({
    title,
    initialColor,
    onLiveChange,
    onApply,
    onClose
}) {
    const [color, setColor] = useState(initialColor || '#8B7355');

    useEffect(() => {
        if (initialColor) setColor(initialColor);
    }, [initialColor]);

    const handleColorChange = (newColor) => {
        setColor(newColor);
        // 🚀 INSTANT PREVIEW: Direct-DOM update via parent callback
        if (onLiveChange) onLiveChange(newColor);
    };

    const handleConfirm = () => {
        // 💾 COMMIT: Final save only on Green Check
        if (onApply) onApply(color);
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999, // 🛡️ Blocks all background interference
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            padding: '20px'
        }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '340px',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                animation: 'modalScale 0.2s ease-out'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer', color: '#9CA3AF' }}
                    >
                        ✕
                    </button>
                </div>

                {/* 1. THE VISUAL WHEEL */}
                <div style={{ marginBottom: '20px', borderRadius: '12px', overflow: 'hidden' }}>
                    <HexColorPicker
                        color={color}
                        onChange={handleColorChange}
                        style={{ width: '100%', height: '200px' }}
                    />
                </div>

                {/* 2. THE HARDWARE FALLBACK (Native Logic) */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#F3F4F6',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    marginBottom: '20px'
                }}>
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => handleColorChange(e.target.value)}
                        style={{
                            width: '44px',
                            height: '44px',
                            border: '2px solid #FFFFFF',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            padding: 0,
                            background: 'transparent'
                        }}
                    />
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '10px', color: '#6B7280', margin: '0 0 2px 2px', textTransform: 'uppercase' }}>Hex Code</p>
                        <input
                            type="text"
                            value={color.toUpperCase()}
                            onChange={(e) => handleColorChange(e.target.value)}
                            style={{
                                width: '100%',
                                border: 'none',
                                background: 'transparent',
                                padding: '0',
                                fontSize: '16px',
                                fontWeight: '600',
                                fontFamily: 'monospace',
                                color: '#1F2937'
                            }}
                        />
                    </div>
                </div>

                {/* 3. THE GREEN CHECK (The Save Signal) */}
                <button
                    onClick={handleConfirm}
                    style={{
                        width: '100%',
                        padding: '16px',
                        backgroundColor: '#22C55E',
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                    }}
                >
                    <span style={{ fontSize: '20px' }}>✓</span> CONFIRMAR COLOR
                </button>
            </div>

            <style>{`
                @keyframes modalScale {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                .react-colorful { width: 100% !important; }
            `}</style>
        </div>
    );
}
