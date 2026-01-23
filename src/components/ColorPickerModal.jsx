import React, { useState, useEffect, useRef } from 'react';

/**
 * 🛡️ ColorPickerModal - NATIVE IOS 3-IN-1 PICKER
 * 
 * Uses the native <input type="color"> which triggers iOS's beautiful
 * Grid/Spectrum/Sliders picker. Modal wrapper provides isolation from
 * background touches (Ghost Touch fix).
 */
export default function ColorPickerModal({
    title,
    initialColor,
    onLiveChange,
    onApply,
    onClose
}) {
    const [color, setColor] = useState(initialColor || '#8B7355');
    const inputRef = useRef(null);

    useEffect(() => {
        if (initialColor) setColor(initialColor);
    }, [initialColor]);

    // Lock body scroll while modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        // Auto-open the native picker after a short delay
        const timer = setTimeout(() => {
            inputRef.current?.click();
        }, 100);

        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            clearTimeout(timer);
        };
    }, []);

    const handleColorChange = (e) => {
        const newColor = e.target.value;
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
        if (e.target === e.currentTarget) {
            if (onClose) onClose();
        }
    };

    return (
        <div
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
                touchAction: 'none'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
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
                            justifyContent: 'center'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Native Color Picker - Triggers iOS 3-in-1 Picker */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '20px'
                }}>
                    {/* Large Color Preview */}
                    <div
                        style={{
                            width: '100%',
                            height: '120px',
                            borderRadius: '16px',
                            background: color,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onClick={() => inputRef.current?.click()}
                    >
                        <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(255,255,255,0.9)',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#1F2937'
                        }}>
                            Toca para editar
                        </div>
                    </div>

                    {/* Hidden Native Input - Triggers iOS Picker */}
                    <input
                        ref={inputRef}
                        type="color"
                        value={color}
                        onChange={handleColorChange}
                        style={{
                            position: 'absolute',
                            opacity: 0,
                            width: 1,
                            height: 1,
                            pointerEvents: 'none'
                        }}
                    />

                    {/* Hex Code Display */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: '#F3F4F6',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        width: '100%'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: color,
                            border: '2px solid white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }} />
                        <div>
                            <p style={{ fontSize: '10px', color: '#6B7280', margin: 0, textTransform: 'uppercase' }}>Hex Code</p>
                            <p style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'monospace', color: '#1F2937', margin: 0 }}>
                                {color.toUpperCase()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Confirm Button */}
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
            `}</style>
        </div>
    );
}
