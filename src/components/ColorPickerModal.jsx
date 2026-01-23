import React, { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

/**
 * 🛡️ OPERATION VAULT-SEAL: STRIKE 4.0 (THE COMPLETE PICKER)
 * ColorPickerModal - Hardware-Optimized Console with Power Presets
 * 
 * FEATURES:
 * 1. POINTER LOCK: Overlay blocks ALL background touches
 * 2. BUTTON ISOLATION: Each button has pointerEvents: 'auto'
 * 3. TOUCH SAFE: touch-action: none on overlay prevents scroll bleed
 * 4. 8 POWER PRESETS: Quick branding color selection
 */

// 🎨 POWER PRESET COLORS
const PRESET_COLORS = [
    '#8B7355', // Warm Brown (Default)
    '#2D3436', // Dark Slate
    '#1E3A5F', // Navy Blue
    '#1E5631', // Forest Green
    '#8B0000', // Dark Red
    '#C4856A', // Terracotta
    '#22C55E', // Success Green
    '#FFFFFF', // Pure White
];

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

    // Lock body scroll while modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, []);

    const handleColorChange = (newColor) => {
        setColor(newColor);
        if (onLiveChange) onLiveChange(newColor);
    };

    const handlePresetClick = (presetColor) => {
        setColor(presetColor);
        if (onLiveChange) onLiveChange(presetColor);
    };

    const handleConfirm = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onApply) onApply(color);
    };

    const handleClose = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onClose) onClose();
    };

    const handleBackdropClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.target === e.currentTarget) {
            if (onClose) onClose();
        }
    };

    const handleModalClick = (e) => {
        e.stopPropagation();
    };

    return (
        <div
            role="presentation"
            inputMode="none"
            data-form-type="other"
            onClick={handleBackdropClick}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '20px',
                pointerEvents: 'auto',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none'
            }}
        >
            <div
                onClick={handleModalClick}
                style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '340px',
                    padding: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    animation: 'modalScale 0.2s ease-out',
                    pointerEvents: 'auto',
                    touchAction: 'auto'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
                        {title}
                    </h3>
                    <button
                        type="button"
                        onClick={handleClose}
                        style={{
                            border: 'none',
                            background: 'rgba(0,0,0,0.08)',
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: '#6B7280',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* 1. THE VISUAL WHEEL */}
                <div style={{ marginBottom: '16px', borderRadius: '12px', overflow: 'hidden' }}>
                    <HexColorPicker
                        color={color}
                        onChange={handleColorChange}
                        style={{ width: '100%', height: '180px' }}
                    />
                </div>

                {/* 2. POWER PRESETS ROW */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: '16px',
                    padding: '8px 0'
                }}>
                    {PRESET_COLORS.map((presetColor) => (
                        <div
                            key={presetColor}
                            onClick={() => handlePresetClick(presetColor)}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: presetColor,
                                border: color.toUpperCase() === presetColor.toUpperCase()
                                    ? '3px solid #3B82F6'
                                    : presetColor === '#FFFFFF'
                                        ? '2px solid #E5E7EB'
                                        : '2px solid transparent',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                                transition: 'transform 0.15s ease',
                                transform: color.toUpperCase() === presetColor.toUpperCase() ? 'scale(1.15)' : 'scale(1)',
                                pointerEvents: 'auto'
                            }}
                        />
                    ))}
                </div>

                {/* 3. THE HARDWARE FALLBACK (Native Picker + Hex Input) */}
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
                            background: 'transparent',
                            pointerEvents: 'auto'
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
                                color: '#1F2937',
                                pointerEvents: 'auto'
                            }}
                        />
                    </div>
                </div>

                {/* 4. THE GREEN CHECK (The Save Signal) */}
                <button
                    type="button"
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
                        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                        pointerEvents: 'auto'
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
                .react-colorful__interactive { touch-action: none !important; }
            `}</style>
        </div>
    );
}
