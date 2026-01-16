import { useState, useRef, useEffect, useCallback } from 'react'

// VIBRANT PRESETS — For sandbox play and demo experimentation
// Bright, fun colors that encourage creativity
const VIBRANT_PRESETS = [
    { value: '#FF6B6B', label: 'Coral' },
    { value: '#FF8E53', label: 'Mango' },
    { value: '#FFC93C', label: 'Sunshine' },
    { value: '#6BCB77', label: 'Mint' },
    { value: '#4D96FF', label: 'Sky' },
    { value: '#8B5CF6', label: 'Violet' },
    { value: '#EC4899', label: 'Fuchsia' },
    { value: '#14B8A6', label: 'Teal' },
]

// SUBDUED PRESETS — For professional brand colors
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

// HSV helpers
function hsvToHex(h, s, v) {
    const c = v * s
    const x = c * (1 - Math.abs((h / 60) % 2 - 1))
    const m = v - c
    let r, g, b
    if (h < 60) { r = c; g = x; b = 0 }
    else if (h < 120) { r = x; g = c; b = 0 }
    else if (h < 180) { r = 0; g = c; b = x }
    else if (h < 240) { r = 0; g = x; b = c }
    else if (h < 300) { r = x; g = 0; b = c }
    else { r = c; g = 0; b = x }
    const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function hexToHsv(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return { h: 0, s: 1, v: 0.5 }
    const r = parseInt(result[1], 16) / 255
    const g = parseInt(result[2], 16) / 255
    const b = parseInt(result[3], 16) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const v = max
    const d = max - min
    const s = max === 0 ? 0 : d / max
    let h = 0
    if (max !== min) {
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break
            case g: h = ((b - r) / d + 2) * 60; break
            case b: h = ((r - g) / d + 4) * 60; break
        }
    }
    return { h, s, v }
}

/**
 * ColorPickerModal - Bottom Sheet with Live Preview
 * 
 * UX UPGRADE:
 * - Bottom sheet (slides up, top 60% visible for context)
 * - Live preview (onLiveChange fires on every color change)
 * - Eyedropper support (Chrome/Edge only)
 * - Single "Done" button (no Apply/Cancel)
 */
export default function ColorPickerModal({
    initialColor,
    onApply,          // Called when user closes the sheet (Done or backdrop tap)
    onLiveChange,     // NEW: Called on every color change for instant preview
    onCancel,         // Deprecated but kept for backwards compatibility
    title = 'Selector de color'
}) {
    const [tempColor, setTempColor] = useState(initialColor)
    const [hsv, setHsv] = useState(() => hexToHsv(initialColor))
    const [hexInput, setHexInput] = useState(initialColor)
    const [isVisible, setIsVisible] = useState(false) // For slide-up animation

    const spectrumRef = useRef(null)
    const hueRef = useRef(null)
    const isDraggingSpectrum = useRef(false)
    const isDraggingHue = useRef(false)

    // Eyedropper API detection
    const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

    // Slide-in animation on mount
    useEffect(() => {
        requestAnimationFrame(() => setIsVisible(true))
    }, [])

    // Sync state when initialColor changes
    useEffect(() => {
        setTempColor(initialColor)
        setHexInput(initialColor)
        setHsv(hexToHsv(initialColor))
    }, [initialColor])

    // Update temp color when HSV changes + trigger live preview
    useEffect(() => {
        const newColor = hsvToHex(hsv.h, hsv.s, hsv.v)
        setTempColor(newColor)
        setHexInput(newColor)
        // LIVE PREVIEW: Notify parent immediately
        // NOTE: onLiveChange intentionally excluded from deps to prevent infinite
        // re-render loop when parent passes inline arrow function. The callback's
        // behavior remains stable; only its reference changes between renders.
        onLiveChange?.(newColor)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hsv])

    // Draw spectrum canvas
    const drawSpectrum = useCallback(() => {
        const canvas = spectrumRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const width = canvas.width
        const height = canvas.height

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const s = x / width
                const v = 1 - y / height
                ctx.fillStyle = hsvToHex(hsv.h, s, v)
                ctx.fillRect(x, y, 1, 1)
            }
        }

        const cursorX = hsv.s * width
        const cursorY = (1 - hsv.v) * height
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cursorX, cursorY, 8, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(cursorX, cursorY, 9, 0, Math.PI * 2)
        ctx.stroke()
    }, [hsv.h, hsv.s, hsv.v])

    // Draw hue slider
    const drawHueSlider = useCallback(() => {
        const canvas = hueRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const width = canvas.width
        const height = canvas.height

        const gradient = ctx.createLinearGradient(0, 0, width, 0)
        for (let i = 0; i <= 360; i += 60) {
            gradient.addColorStop(i / 360, hsvToHex(i, 1, 1))
        }
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)

        const cursorX = (hsv.h / 360) * width
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 2
        ctx.strokeRect(cursorX - 4, 0, 8, height)
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1
        ctx.strokeRect(cursorX - 5, -1, 10, height + 2)
    }, [hsv.h])

    useEffect(() => {
        drawSpectrum()
        drawHueSlider()
    }, [drawSpectrum, drawHueSlider])

    const handleSpectrumInteraction = (e) => {
        const canvas = spectrumRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x = Math.max(0, Math.min(canvas.width, (e.clientX || e.touches?.[0]?.clientX) - rect.left))
        const y = Math.max(0, Math.min(canvas.height, (e.clientY || e.touches?.[0]?.clientY) - rect.top))
        const s = x / canvas.width
        const v = 1 - y / canvas.height
        setHsv(prev => ({ ...prev, s, v }))
    }

    const handleHueInteraction = (e) => {
        const canvas = hueRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x = Math.max(0, Math.min(canvas.width, (e.clientX || e.touches?.[0]?.clientX) - rect.left))
        const h = (x / canvas.width) * 360
        setHsv(prev => ({ ...prev, h }))
    }

    const handleHexChange = (value) => {
        setHexInput(value)
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
            setHsv(hexToHsv(value))
        }
    }

    // Eyedropper handler
    const handleEyeDropper = async () => {
        if (!hasEyeDropper) return
        try {
            const eyeDropper = new window.EyeDropper()
            const result = await eyeDropper.open()
            const color = result.sRGBHex.toUpperCase()
            setHsv(hexToHsv(color))
        } catch {
            // User cancelled or error - ignore
        }
    }

    // Close handler (Done or backdrop tap) - NERVE REPAIR: No setTimeout race condition
    const handleClose = async (e) => {
        e?.stopPropagation() // Stop click from bubbling to backdrop

        // 1. Force Immediate Reactivity (The "2026 Snap")
        // Call the parent's apply function immediately without timeout
        if (onApply) {
            // If parent function is async (updateSettingsCloud), await it
            await onApply(tempColor)
        }

        // 2. Animate & Unmount
        setIsVisible(false)
        // Parent (BrandingColorPicker) handles the 'showPicker' state
    }

    // Backdrop tap = close with current color
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose()
        }
    }

    // Event handlers for dragging - 🚨 TOUCH REPAIR: preventDefault stops page scroll
    const onSpectrumDown = (e) => { e.preventDefault?.(); isDraggingSpectrum.current = true; handleSpectrumInteraction(e) }
    const onSpectrumMove = (e) => { e.preventDefault?.(); if (isDraggingSpectrum.current) handleSpectrumInteraction(e) }
    const onSpectrumUp = () => { isDraggingSpectrum.current = false }

    const onHueDown = (e) => { e.preventDefault?.(); isDraggingHue.current = true; handleHueInteraction(e) }
    const onHueMove = (e) => { e.preventDefault?.(); if (isDraggingHue.current) handleHueInteraction(e) }
    const onHueUp = () => { isDraggingHue.current = false }

    useEffect(() => {
        const handleGlobalUp = () => {
            isDraggingSpectrum.current = false
            isDraggingHue.current = false
        }
        window.addEventListener('mouseup', handleGlobalUp)
        window.addEventListener('touchend', handleGlobalUp)
        return () => {
            window.removeEventListener('mouseup', handleGlobalUp)
            window.removeEventListener('touchend', handleGlobalUp)
        }
    }, [])

    return (
        <div
            onClick={handleBackdropClick}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'flex-end', // BOTTOM SHEET: Align to bottom
                justifyContent: 'center',
                zIndex: 9999
            }}
        >
            <div style={{
                background: 'var(--surface-raised-bg, white)',
                borderRadius: 'var(--radius-modal, 20px) var(--radius-modal, 20px) 0 0',
                boxShadow: 'var(--shadow-raised, 0 -8px 32px rgba(0,0,0,0.12))',
                padding: '12px 20px 24px',
                width: '100%',
                maxWidth: 400,
                transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 0.2s ease-out',
                maxHeight: '60vh', // Top 40% visible for context
                overflow: 'auto'
            }}>
                {/* Drag Handle (visual) */}
                <div style={{
                    width: 36,
                    height: 4,
                    background: '#E5E7EB',
                    borderRadius: 2,
                    margin: '0 auto 12px'
                }} />

                {/* Header: Title + Green Checkmark - NERVE REPAIR */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16
                }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', margin: 0 }}>
                        {title}
                    </h3>

                    {/* THE NERVE REPAIR: Direct onClick binding without wrapper functions */}
                    <button
                        type="button"
                        onClick={handleClose}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 36,
                            height: 36,
                            background: '#22C55E',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                            cursor: 'pointer',
                            transition: 'transform 0.1s',
                            zIndex: 10001,
                            position: 'relative',
                            pointerEvents: 'auto'
                        }}
                        title="Confirmar y Guardar"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                </div>

                {/* VIBRANT PRESETS — Sandbox play (first row) */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {VIBRANT_PRESETS.map(preset => (
                        <button
                            key={preset.value}
                            onClick={() => handleHexChange(preset.value)}
                            style={{
                                width: 28, height: 28, borderRadius: 6,
                                backgroundColor: preset.value,
                                border: tempColor === preset.value
                                    ? '3px solid #22C55E'
                                    : '2px solid rgba(255,255,255,0.3)',
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                            }}
                            title={preset.label}
                        />
                    ))}
                </div>

                {/* SUBDUED PRESETS — Brand colors (second row) */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {COLOR_PRESETS.map(preset => (
                        <button
                            key={preset.value}
                            onClick={() => handleHexChange(preset.value)}
                            style={{
                                width: 28, height: 28, borderRadius: 6,
                                backgroundColor: preset.value,
                                border: tempColor === preset.value
                                    ? '3px solid #22C55E'
                                    : '2px solid #E5E7EB',
                                cursor: 'pointer'
                            }}
                            title={preset.label}
                        />
                    ))}
                </div>

                {/* Hue Strip (rainbow for fast targeting) */}
                <canvas
                    ref={hueRef}
                    width={280}
                    height={24}
                    style={{
                        width: '100%',
                        height: 24,
                        borderRadius: 8,
                        cursor: 'pointer',
                        marginBottom: 12,
                        touchAction: 'none'
                    }}
                    onMouseDown={onHueDown}
                    onMouseMove={onHueMove}
                    onMouseUp={onHueUp}
                    onTouchStart={onHueDown}
                    onTouchMove={onHueMove}
                    onTouchEnd={onHueUp}
                />

                {/* Spectrum (S/V) */}
                <canvas
                    ref={spectrumRef}
                    width={280}
                    height={120}
                    style={{
                        width: '100%',
                        height: 120,
                        borderRadius: 8,
                        cursor: 'crosshair',
                        marginBottom: 12,
                        touchAction: 'none'
                    }}
                    onMouseDown={onSpectrumDown}
                    onMouseMove={onSpectrumMove}
                    onMouseUp={onSpectrumUp}
                    onTouchStart={onSpectrumDown}
                    onTouchMove={onSpectrumMove}
                    onTouchEnd={onSpectrumUp}
                />

                {/* HEX Input + Eyedropper */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                        type="text"
                        value={hexInput}
                        onChange={(e) => handleHexChange(e.target.value.toUpperCase())}
                        style={{
                            flex: 1,
                            padding: '10px 12px',
                            border: '1px solid #E5E7EB',
                            borderRadius: 8,
                            fontFamily: 'monospace',
                            fontSize: 14
                        }}
                    />
                    {/* Color preview swatch */}
                    <div style={{
                        width: 40, height: 40,
                        borderRadius: 8,
                        backgroundColor: tempColor,
                        border: '2px solid #E5E7EB',
                        flexShrink: 0
                    }} />
                    {/* Eyedropper (only if supported) */}
                    {hasEyeDropper && (
                        <button
                            onClick={handleEyeDropper}
                            title="Seleccionar color de pantalla"
                            style={{
                                width: 40, height: 40,
                                borderRadius: 8,
                                border: '1px solid #E5E7EB',
                                background: '#F9FAFB',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 18,
                                flexShrink: 0
                            }}
                        >
                            💧
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
