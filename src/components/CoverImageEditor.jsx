/**
 * CoverImageEditor.jsx - Full-Screen Cover Image Editor
 * 
 * PATCH 4.8: FINAL — 3-State Editor with Live Preview
 * 
 * States:
 * - State A: EDIT — Greyed surroundings, visible crop frame, drag/zoom
 * - State B: PREVIEW — Real Home, no overlays, visual confirmation
 * - State C: DONE — Save and exit
 * 
 * Cover Heights (LOCKED):
 * - Mobile (<768px): 220px
 * - Tablet (≥768px): 280px
 */

import { useState, useRef, useEffect } from 'react'
import { getConfig, updateConfig } from '../config/appConfig.js'
import Home from '../pages/customer/Home.jsx'

// Breakpoint cover heights (LOCKED — do not change)
const COVER_HEIGHTS = {
    mobile: 220,
    tablet: 280
}

function getBreakpoint() {
    return window.innerWidth >= 768 ? 'tablet' : 'mobile'
}

function CoverImageEditor({ isOpen, onClose, onSave, initialData }) {
    // States: 'select' | 'edit' | 'preview'
    const [step, setStep] = useState('select')
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
    const fileInputRef = useRef(null)

    const coverHeight = COVER_HEIGHTS[breakpoint]

    // Update breakpoint on resize
    useEffect(() => {
        const handleResize = () => setBreakpoint(getBreakpoint())
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setImage(initialData?.image || null)
            setScale(initialData?.scale || 1)
            setOffsetX(initialData?.offsetX || 0)
            setOffsetY(initialData?.offsetY || 0)
            setStep(initialData?.image ? 'edit' : 'select')
        }
    }, [isOpen, initialData])

    // Auto-open file picker if no image
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
            setStep('edit')
        }
        reader.readAsDataURL(file)
    }

    // ===== DRAG TO PAN =====
    const handlePointerDown = (e) => {
        if (e.touches && e.touches.length > 1) return
        isDragging.current = true
        const point = e.touches ? e.touches[0] : e
        lastTouch.current = { x: point.clientX, y: point.clientY }
    }

    const handlePointerMove = (e) => {
        if (!isDragging.current) return
        if (e.touches && e.touches.length > 1) return
        const point = e.touches ? e.touches[0] : e
        setOffsetX(prev => prev + (point.clientX - lastTouch.current.x))
        setOffsetY(prev => prev + (point.clientY - lastTouch.current.y))
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
            const newScale = Math.min(3, Math.max(0.5, initialScale.current * (distance / initialPinchDistance.current)))
            setScale(newScale)
        } else {
            handlePointerMove(e)
        }
    }

    // ===== PREVIEW: Temporarily apply cover to see real result =====
    const enterPreview = () => {
        // Temporarily save current cover state so Home renders with it
        updateConfig({
            headerCover: { image, scale, offsetX, offsetY, breakpoint }
        })
        setStep('preview')
    }

    const exitPreview = () => {
        // Revert to initial data
        updateConfig({
            headerCover: initialData || { image: null, scale: 1, offsetX: 0, offsetY: 0 }
        })
        setStep('edit')
    }

    // ===== SAVE =====
    const handleSave = () => {
        onSave({ image, scale, offsetX, offsetY, breakpoint })
        onClose()
    }

    if (!isOpen) return null

    // =============================================
    // STATE A: SELECT IMAGE
    // =============================================
    if (step === 'select') {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: '#000',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column'
            }}>
                <Header
                    left={<CancelBtn onClick={onClose} />}
                    title="Select Cover Image"
                    right={<Spacer />}
                />
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
            </div>
        )
    }

    // =============================================
    // STATE B: EDIT MODE (Crop Frame + Gestures)
    // =============================================
    if (step === 'edit') {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: '#000',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column'
            }}>
                <Header
                    left={<CancelBtn onClick={onClose} />}
                    title="Position Cover"
                    right={<PreviewBtn onClick={enterPreview} />}
                />

                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    {/* Frozen Home (behind) */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        opacity: 0.4
                    }}>
                        <Home />
                    </div>

                    {/* Dimmed overlay BELOW cover area */}
                    <div style={{
                        position: 'absolute',
                        top: coverHeight,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        pointerEvents: 'none',
                        zIndex: 5
                    }} />

                    {/* Cover Edit Frame */}
                    <div
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
                            zIndex: 6,
                            border: '3px solid #22C55E',
                            boxShadow: '0 0 0 4px rgba(34,197,94,0.4), inset 0 0 30px rgba(0,0,0,0.4)'
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                width: '200%',
                                height: '200%',
                                left: '-50%',
                                top: '-50%',
                                backgroundImage: `url(${image})`,
                                backgroundSize: `${scale * 100}%`,
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                transform: `translate(${offsetX}px, ${offsetY}px)`
                            }}
                        />
                    </div>

                    {/* Instruction Pill */}
                    <div style={{
                        position: 'absolute',
                        top: coverHeight + 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#22C55E',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '6px 14px',
                        borderRadius: 20,
                        zIndex: 10,
                        whiteSpace: 'nowrap'
                    }}>
                        ↕ Drag to position • Pinch to zoom
                    </div>

                    {/* Zoom Indicator */}
                    <div style={{
                        position: 'absolute',
                        bottom: 24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.8)',
                        color: '#fff',
                        fontSize: 12,
                        padding: '8px 16px',
                        borderRadius: 20,
                        zIndex: 10
                    }}>
                        Zoom: {Math.round(scale * 100)}%
                    </div>
                </div>
            </div>
        )
    }

    // =============================================
    // STATE C: PREVIEW MODE (Real Home, No Overlays)
    // =============================================
    if (step === 'preview') {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'var(--canvas-bg, #fff)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Real Home Preview (with cover applied) */}
                <div style={{
                    flex: 1,
                    overflow: 'hidden',
                    pointerEvents: 'none'
                }}>
                    <Home />
                </div>

                {/* Preview Action Bar */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '16px 20px',
                    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
                    background: 'rgba(0,0,0,0.9)',
                    display: 'flex',
                    gap: 12,
                    zIndex: 10
                }}>
                    <button
                        onClick={exitPreview}
                        style={{
                            flex: 1,
                            padding: '14px',
                            background: '#374151',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        ← Back to Edit
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            flex: 1,
                            padding: '14px',
                            background: '#22C55E',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        ✓ Done
                    </button>
                </div>

                {/* Preview Label */}
                <div style={{
                    position: 'absolute',
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.8)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '8px 16px',
                    borderRadius: 20,
                    zIndex: 10
                }}>
                    👁 LIVE PREVIEW
                </div>
            </div>
        )
    }

    return null
}

// ===== UI Components =====

function Header({ left, title, right }) {
    return (
        <div style={{
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.95)',
            borderBottom: '1px solid #333',
            zIndex: 10
        }}>
            {left}
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{title}</span>
            {right}
        </div>
    )
}

function CancelBtn({ onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: 'none',
                border: 'none',
                color: '#EF4444',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '8px 12px'
            }}
        >
            ✕ Cancel
        </button>
    )
}

function PreviewBtn({ onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: '#3B82F6',
                border: 'none',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: 8,
                cursor: 'pointer'
            }}
        >
            👁 Preview
        </button>
    )
}

function Spacer() {
    return <div style={{ width: 80 }} />
}

export default CoverImageEditor
