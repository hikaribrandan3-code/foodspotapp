import { useState, useRef, useEffect, useCallback } from 'react'
import { HERO_ICON_DARK } from '../config/appConfig.js'

// Preset colors (Shared)
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

export default function ColorPickerModal({
    initialColor,
    onApply,
    onCancel,
    title = 'Selector de color'
}) {
    const [tempColor, setTempColor] = useState(initialColor)
    const [hsv, setHsv] = useState(() => hexToHsv(initialColor))
    const [hexInput, setHexInput] = useState(initialColor)

    const spectrumRef = useRef(null)
    const hueRef = useRef(null)
    const isDraggingSpectrum = useRef(false)
    const isDraggingHue = useRef(false)

    // Sync state when initialColor changes (if modal re-opens with new color)
    useEffect(() => {
        setTempColor(initialColor)
        setHexInput(initialColor)
        setHsv(hexToHsv(initialColor))
    }, [initialColor])

    // Update temp color when HSV changes
    useEffect(() => {
        const newColor = hsvToHex(hsv.h, hsv.s, hsv.v)
        setTempColor(newColor)
        setHexInput(newColor)
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

    const applyColor = () => {
        onApply(tempColor)
    }

    // Event handlers
    const onSpectrumDown = (e) => { isDraggingSpectrum.current = true; handleSpectrumInteraction(e) }
    const onSpectrumMove = (e) => { if (isDraggingSpectrum.current) handleSpectrumInteraction(e) }
    const onSpectrumUp = () => { isDraggingSpectrum.current = false }

    const onHueDown = (e) => { isDraggingHue.current = true; handleHueInteraction(e) }
    const onHueMove = (e) => { if (isDraggingHue.current) handleHueInteraction(e) }
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
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
        }}>
            <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 20,
                width: '100%',
                maxWidth: 320,
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', marginBottom: 16 }}>
                    {title}
                </h3>

                {/* Spectrum */}
                <canvas
                    ref={spectrumRef}
                    width={280}
                    height={150}
                    style={{
                        width: '100%',
                        height: 150,
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

                {/* Hue */}
                <canvas
                    ref={hueRef}
                    width={280}
                    height={20}
                    style={{
                        width: '100%',
                        height: 20,
                        borderRadius: 6,
                        cursor: 'pointer',
                        marginBottom: 16,
                        touchAction: 'none'
                    }}
                    onMouseDown={onHueDown}
                    onMouseMove={onHueMove}
                    onMouseUp={onHueUp}
                    onTouchStart={onHueDown}
                    onTouchMove={onHueMove}
                    onTouchEnd={onHueUp}
                />

                {/* Presets */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {COLOR_PRESETS.map(preset => (
                        <button
                            key={preset.value}
                            onClick={() => handleHexChange(preset.value)}
                            style={{
                                width: 24, height: 24, borderRadius: 4,
                                backgroundColor: preset.value,
                                border: '1px solid #E5E7EB',
                                cursor: 'pointer'
                            }}
                        />
                    ))}
                </div>

                {/* HEX Input */}
                <input
                    type="text"
                    value={hexInput}
                    onChange={(e) => handleHexChange(e.target.value.toUpperCase())}
                    style={{
                        width: '100%', padding: '10px',
                        border: '1px solid #E5E7EB', borderRadius: 8,
                        marginBottom: 16, fontFamily: 'monospace'
                    }}
                />

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1, padding: '12px', background: '#F3F4F6',
                            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={applyColor}
                        style={{
                            flex: 1, padding: '12px', background: '#22C55E', color: 'white',
                            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer'
                        }}
                    >
                        Aplicar
                    </button>
                </div>
            </div>
        </div>
    )
}
