/**
 * CoverImageEditor.jsx - Full-Screen Cover Image Editor
 * 
 * PATCH 4.9: TRUE WYSIWYG with Nav Bar + Final Preview
 * 
 * States:
 * - State A: SELECT — Image picker
 * - State B: EDIT — Greyed surroundings, crop frame, drag/zoom
 * - State C: PREVIEW — Real Home + Nav, no overlays, visual confirmation
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

// Static Nav Bar for Preview (matches real BottomNav exactly)
function StaticBottomNav() {
    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            borderTop: '1px solid #E5E7EB',
            paddingBottom: 'env(safe-area-inset-bottom)',
            zIndex: 1
        }}>
            {/* Home */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 1 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span style={{ fontSize: 10, color: '#111', marginTop: 2 }}>Home</span>
            </div>
            {/* Menú */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
                <span style={{ fontSize: 10, color: '#666', marginTop: 2 }}>Menú</span>
            </div>
            {/* Camera (center button) */}
            <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: -20
            }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                </svg>
            </div>
            {/* Estado */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <span style={{ fontSize: 10, color: '#666', marginTop: 2 }}>Estado</span>
            </div>
            {/* Info */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span style={{ fontSize: 10, color: '#666', marginTop: 2 }}>Info</span>
            </div>
        </nav>
    )
}

function CoverImageEditor({ isOpen, onClose, onSave, initialData }) {
    const [step, setStep] = useState('select')
    const [image, setImage] = useState(initialData?.image || null)
    const [scale, setScale] = useState(initialData?.scale || 1)
    const [offsetX, setOffsetX] = useState(initialData?.offsetX || 0)
    const [offsetY, setOffsetY] = useState(initialData?.offsetY || 0)
    const [breakpoint, setBreakpoint] = useState(getBreakpoint())

    const isDragging = useRef(false)
    const lastTouch = useRef({ x: 0, y: 0 })
    const initialPinchDistance = useRef(0)
    const initialScale = useRef(1)
    const fileInputRef = useRef(null)

    const coverHeight = COVER_HEIGHTS[breakpoint]

    useEffect(() => {
        const handleResize = () => setBreakpoint(getBreakpoint())
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setImage(initialData?.image || null)
            setScale(initialData?.scale || 1)
            setOffsetX(initialData?.offsetX || 0)
            setOffsetY(initialData?.offsetY || 0)
            setStep(initialData?.image ? 'edit' : 'select')
        }
    }, [isOpen, initialData])

    useEffect(() => {
        if (isOpen && step === 'select' && !image) {
            setTimeout(() => fileInputRef.current?.click(), 100)
        }
    }, [isOpen, step, image])

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

    const enterPreview = () => {
        updateConfig({ headerCover: { image, scale, offsetX, offsetY, breakpoint } })
        setStep('preview')
    }

    const exitPreview = () => {
        updateConfig({ headerCover: initialData || { image: null, scale: 1, offsetX: 0, offsetY: 0 } })
        setStep('edit')
    }

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
            <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
                <EditorHeader left={<CancelBtn onClick={onClose} />} title="Select Cover Image" right={<Spacer />} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{ width: '100%', maxWidth: 300, height: 200, border: '3px dashed #444', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#111' }}
                    >
                        <span style={{ fontSize: 48, marginBottom: 16 }}>📷</span>
                        <span style={{ color: '#888', fontSize: 14 }}>Tap to select image</span>
                        <span style={{ color: '#666', fontSize: 12, marginTop: 8 }}>PNG or JPG</span>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handleFileSelect} style={{ display: 'none' }} />
                </div>
            </div>
        )
    }

    // =============================================
    // STATE B: EDIT MODE
    // =============================================
    if (step === 'edit') {
        return (
            <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
                <EditorHeader left={<CancelBtn onClick={onClose} />} title="Position Cover" right={<PreviewBtn onClick={enterPreview} />} />

                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    {/* Frozen Home + Nav */}
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35 }}>
                        <Home />
                        <StaticBottomNav />
                    </div>

                    {/* Dark overlay below cover */}
                    <div style={{ position: 'absolute', top: coverHeight, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', pointerEvents: 'none', zIndex: 5 }} />

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
                        <div style={{
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
                        }} />
                    </div>

                    {/* Instructions */}
                    <div style={{ position: 'absolute', top: coverHeight + 12, left: '50%', transform: 'translateX(-50%)', background: '#22C55E', color: '#fff', fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 20, zIndex: 10, whiteSpace: 'nowrap' }}>
                        ↕ Drag to position • Pinch to zoom
                    </div>

                    {/* Zoom */}
                    <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: 12, padding: '8px 16px', borderRadius: 20, zIndex: 10 }}>
                        Zoom: {Math.round(scale * 100)}%
                    </div>
                </div>
            </div>
        )
    }

    // =============================================
    // STATE C: FINAL PREVIEW (TRUE 1:1 — Screenshot-Indistinguishable)
    // =============================================
    if (step === 'preview') {
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'var(--canvas-bg, #fff)', zIndex: 9999 }}>
                {/* Real Home (cover already applied) — TRUE SIZE */}
                <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
                    <Home />
                </div>

                {/* Static Nav Bar */}
                <StaticBottomNav />

                {/* Minimal Action Buttons — Top Right */}
                <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    display: 'flex',
                    gap: 8,
                    zIndex: 100
                }}>
                    <button
                        onClick={exitPreview}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            border: 'none',
                            fontSize: 16,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ←
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: '#22C55E',
                            color: '#fff',
                            border: 'none',
                            fontSize: 18,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(34,197,94,0.4)'
                        }}
                    >
                        ✓
                    </button>
                </div>
            </div>
        )
    }

    return null
}

function EditorHeader({ left, title, right }) {
    return (
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.95)', borderBottom: '1px solid #333', zIndex: 10 }}>
            {left}
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{title}</span>
            {right}
        </div>
    )
}

function CancelBtn({ onClick }) {
    return (
        <button onClick={onClick} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: '8px 12px' }}>
            ✕ Cancel
        </button>
    )
}

function PreviewBtn({ onClick }) {
    return (
        <button onClick={onClick} style={{ background: '#3B82F6', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}>
            👁 Preview
        </button>
    )
}

function Spacer() {
    return <div style={{ width: 80 }} />
}

export default CoverImageEditor
