import React, { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

/**
 * 🛡️ OPERATION VAULT-SEAL: STRIKE 3.0 (THE SEALED PICKER)
 * ColorPickerModal - Hardware-Optimized Console
 * 
 * FIXES:
 * 1. POINTER LOCK: Overlay blocks ALL background touches
 * 2. BUTTON ISOLATION: Each button has pointerEvents: 'auto'
 * 3. TOUCH SAFE: touch-action: none on overlay prevents scroll bleed
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
        // Only close if clicking the backdrop itself
        if (e.target === e.currentTarget) {
            if (onClose) onClose();
        }
    };

    const handleModalClick = (e) => {
        // Stop propagation to prevent backdrop from catching it
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
                zIndex: 999999, // 🛡️ MAXIMUM Z-INDEX
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '20px',
                // 🛡️ POINTER LOCK
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
                <div style={{ marginBottom: '20px', borderRadius: '12px', overflow: 'hidden' }}>
                    <HexColorPicker
                        color={color}
                        onChange={handleColorChange}
                        style={{ width: '100%', height: '200px' }}
                    />
                </div>

                {/* 2. THE HARDWARE FALLBACK (Native Picker + Hex Input) */}
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

                {/* 3. THE GREEN CHECK (The Save Signal) */}
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
