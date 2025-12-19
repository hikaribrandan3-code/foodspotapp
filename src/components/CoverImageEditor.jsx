/**
 * CoverImageEditor.jsx - Full-Screen Cover Image Editor
 * 
 * PATCH 4.6: Wizard flow with frozen preview
 * 
 * 3-Step Flow:
 * - Step A: Image Selection (auto-advances)
 * - Step B: Live Edit on Frozen Preview (drag to pan, pinch to zoom)
 * - Step C: Done/Save
 * 
 * Features:
 * - Frozen Home preview (non-interactive)
 * - Drag to pan cover image
 * - Pinch to zoom cover image
 * - Clear crop boundaries (dimmed outside area)
 * - Responsive breakpoints (mobile/tablet)
 */

import { useState, useRef, useEffect } from 'react'
import { getConfig } from '../config/appConfig.js'

// Breakpoint cover heights
const COVER_HEIGHTS = {
    mobile: 220,  // < 768px
    tablet: 280   // >= 768px
}

function getBreakpoint() {
    return window.innerWidth >= 768 ? 'tablet' : 'mobile'
}

function CoverImageEditor({ isOpen, onClose, onSave, initialData }) {
    const [step, setStep] = useState('select') // 'select' | 'edit'
    const [image, setImage] = useState(initialData?.image || null)
    const [scale, setScale] = useState(initialData?.scale || 1)
    const [offsetX, setOffsetX] = useState(initialData?.offsetX || 0)
    const [offsetY, setOffsetY] = useState(initialData?.offsetY || 0)
    const [breakpoint, setBreakpoint] = useState(getBreakpoint())

    // Gesture refs
    const isDragging = useRef(false)
    const lastTouch = useRef({ x: 0, y: 0 })
    const initialPinchDistance = useRef(0)
    const initialScale = useRef(1)
    const coverRef = useRef(null)
    const fileInputRef = useRef(null)

    const config = getConfig()
    const coverHeight = COVER_HEIGHTS[breakpoint]

    // Update breakpoint on resize
    useEffect(() => {
        const handleResize = () => setBreakpoint(getBreakpoint())
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Auto-open file picker on mount if no image
    useEffect(() => {
        if (isOpen && step === 'select' && !image) {
            setTimeout(() => fileInputRef.current?.click(), 100)
        }
    }, [isOpen, step, image])

    // Handle file selection
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (ev) => {
            setImage(ev.target.result)
            setScale(1)
            setOffsetX(0)
            setOffsetY(0)
            setStep('edit') // Auto-advance
        }
        reader.readAsDataURL(file)
    }

    // ===== DRAG TO PAN =====
    const handlePointerDown = (e) => {
        if (e.touches && e.touches.length > 1) return // Pinch gesture
        isDragging.current = true
        const point = e.touches ? e.touches[0] : e
        lastTouch.current = { x: point.clientX, y: point.clientY }
    }

    const handlePointerMove = (e) => {
        if (!isDragging.current) return
        if (e.touches && e.touches.length > 1) return

        const point = e.touches ? e.touches[0] : e
        const deltaX = point.clientX - lastTouch.current.x
        const deltaY = point.clientY - lastTouch.current.y

        setOffsetX(prev => prev + deltaX)
        setOffsetY(prev => prev + deltaY)

        lastTouch.current = { x: point.clientX, y: point.clientY }
    }

    const handlePointerUp = () => {
        isDragging.current = false
    }

    // ===== PINCH TO ZOOM =====
    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy)
            initialScale.current = scale
        } else {
            handlePointerDown(e)
        }
    }

    const handleTouchMove = (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const scaleChange = distance / initialPinchDistance.current
            const newScale = Math.min(3, Math.max(0.5, initialScale.current * scaleChange))
            setScale(newScale)
        } else {
            handlePointerMove(e)
        }
    }

    // ===== SAVE =====
    const handleSave = () => {
        onSave({
            image,
            scale,
            offsetX,
            offsetY,
            breakpoint
        })
        onClose()
    }

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: '#000',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #333'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    ✕ Cancel
                </button>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                    {step === 'select' ? 'Select Image' : 'Adjust Cover'}
                </span>
                {step === 'edit' && (
                    <button
                        onClick={handleSave}
                        style={{
                            background: '#22C55E',
                            border: 'none',
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 600,
                            padding: '8px 16px',
                            borderRadius: 8,
                            cursor: 'pointer'
                        }}
                    >
                        ✓ Done
                    </button>
                )}
                {step === 'select' && <div style={{ width: 80 }} />}
            </div>

            {/* Step A: Select Image */}
            {step === 'select' && (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 40
                }}>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            width: '100%',
                            maxWidth: 300,
                            height: 200,
                            border: '3px dashed #444',
                            borderRadius: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            background: '#111'
                        }}
                    >
                        <span style={{ fontSize: 48, marginBottom: 16 }}>📷</span>
                        <span style={{ color: '#888', fontSize: 14 }}>Tap to select image</span>
                        <span style={{ color: '#666', fontSize: 12, marginTop: 8 }}>PNG or JPG</span>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                </div>
            )}

            {/* Step B: Live Edit */}
            {step === 'edit' && (
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    {/* Frozen Home Preview Background */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'var(--canvas-bg, #fff)',
                        opacity: 0.3,
                        pointerEvents: 'none'
                    }}>
                        {/* Simulated Home UI */}
                        <div style={{ padding: 16 }}>
                            {/* Hero tiles placeholder */}
                            <div style={{
                                marginTop: coverHeight + 20,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 12
                            }}>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} style={{
                                        height: 80,
                                        background: '#E5E7EB',
                                        borderRadius: 12
                                    }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Dimmed overlay ABOVE cover area */}
                    <div style={{
                        position: 'absolute',
                        top: coverHeight,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.6)',
                        pointerEvents: 'none',
                        zIndex: 2
                    }} />

                    {/* Cover Frame - THE EDIT ZONE */}
                    <div
                        ref={coverRef}
                        onMouseDown={handlePointerDown}
                        onMouseMove={handlePointerMove}
                        onMouseUp={handlePointerUp}
                        onMouseLeave={handlePointerUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handlePointerUp}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: coverHeight,
                            overflow: 'hidden',
                            cursor: 'move',
                            zIndex: 3,
                            border: '2px solid #22C55E',
                            boxShadow: '0 0 0 4px rgba(34,197,94,0.3)'
                        }}
                    >
                        {/* Cover Image */}
                        <div
                            style={{
                                position: 'absolute',
                                width: '200%',
                                height: '200%',
                                backgroundImage: `url(${image})`,
                                backgroundSize: `${scale * 100}%`,
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                transform: `translate(${offsetX}px, ${offsetY}px)`,
                                transformOrigin: 'center center',
                                left: '-50%',
                                top: '-50%'
                            }}
                        />
                    </div>

                    {/* Frame Label */}
                    <div style={{
                        position: 'absolute',
                        top: coverHeight + 8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#22C55E',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 12px',
                        borderRadius: 20,
                        zIndex: 4
                    }}>
                        ↕ Drag to position • Pinch to zoom
                    </div>

                    {/* Zoom indicator */}
                    <div style={{
                        position: 'absolute',
                        bottom: 80,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        fontSize: 12,
                        padding: '8px 16px',
                        borderRadius: 20,
                        zIndex: 4
                    }}>
                        Zoom: {Math.round(scale * 100)}%
                    </div>
                </div>
            )}
        </div>
    )
}

export default CoverImageEditor
