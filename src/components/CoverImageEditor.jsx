/**
 * CoverImageEditor.jsx - Full-Screen Cover Image Editor
 * 
 * FINAL: 1:1 WYSIWYG with Header Restore
 * 
 * States:
 * - State A: EDIT — Crop frame at top:0, floating controls, drag/zoom
 * - State B: PREVIEW — True 1:1 Home render, no overlays
 * 
 * Cover Heights (LOCKED):
 * - Mobile (<768px): 220px
 * - Tablet (≥768px): 280px
 */

import { useState, useRef, useEffect } from 'react'
import { getConfig, updateConfig } from '../config/appConfig.js'
import Home from '../pages/customer/Home.jsx'

const COVER_HEIGHTS = {
    mobile: 220,
    tablet: 280
}

function getBreakpoint() {
    return window.innerWidth >= 768 ? 'tablet' : 'mobile'
}

// Static Nav Bar (matches real BottomNav)
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
            <NavItem icon="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" label="Home" active />
            <NavItem icon="M3 6h18 M3 12h18 M3 18h18" label="Menú" />
            <CameraButton />
            <NavItem icon="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" label="Estado" />
            <NavItem icon="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 16v-4 M12 8h.01" label="Info" />
        </nav>
    )
}

function NavItem({ icon, label, active }) {
    const paths = icon.split(' M').map((p, i) => i === 0 ? p : 'M' + p)
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: active ? 1 : 0.5 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#111' : 'currentColor'} strokeWidth="2">
                {paths.map((d, i) => <path key={i} d={d} />)}
            </svg>
            <span style={{ fontSize: 10, color: active ? '#111' : '#666', marginTop: 2 }}>{label}</span>
        </div>
    )
}

function CameraButton() {
    return (
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -20 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
            </svg>
        </div>
    )
}

function CoverImageEditor({ isOpen, onClose, onSave, initialData }) {
    const [step, setStep] = useState('edit')
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
            setStep('edit')
            // Auto-open file picker if no image
            if (!initialData?.image) {
                setTimeout(() => fileInputRef.current?.click(), 100)
            }
        }
    }, [isOpen, initialData])

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            setImage(ev.target.result)
            setScale(1)
            setOffsetX(0)
            setOffsetY(0)
        }
        reader.readAsDataURL(file)
    }

    // Drag to pan
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

    // Pinch to zoom
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
    // STATE A: EDIT MODE — Crop frame at top:0
    // =============================================
    if (step === 'edit') {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: '#000',
                zIndex: 9999,
                touchAction: 'none'
            }}>
                {/* Frozen Home (dimmed, behind crop) */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.3 }}>
                    <Home />
                    <StaticBottomNav />
                </div>

                {/* Dark overlay BELOW crop frame */}
                <div style={{
                    position: 'absolute',
                    top: coverHeight,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.75)',
                    pointerEvents: 'none',
                    zIndex: 5
                }} />

                {/* Crop Frame — STARTS AT TOP:0 */}
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
                        boxShadow: '0 0 0 4px rgba(34,197,94,0.4), inset 0 0 30px rgba(0,0,0,0.3)',
                        touchAction: 'none'
                    }}
                >
                    {image ? (
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
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#9CA3AF', fontSize: 14 }}>Tap to select image</span>
                        </div>
                    )}
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                {/* FLOATING CONTROLS — Safe area aware */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    paddingTop: 'max(12px, env(safe-area-inset-top))',
                    paddingLeft: 12,
                    paddingRight: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    zIndex: 100,
                    pointerEvents: 'none'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            minWidth: 44,
                            minHeight: 44,
                            padding: '8px 14px',
                            background: 'rgba(0,0,0,0.7)',
                            color: '#EF4444',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            pointerEvents: 'auto'
                        }}
                    >
                        ✕ Cancel
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            minWidth: 44,
                            minHeight: 44,
                            padding: '8px 14px',
                            background: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            pointerEvents: 'auto'
                        }}
                    >
                        📷
                    </button>
                    <button
                        onClick={enterPreview}
                        disabled={!image}
                        style={{
                            minWidth: 44,
                            minHeight: 44,
                            padding: '8px 14px',
                            background: image ? '#3B82F6' : 'rgba(59,130,246,0.4)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: image ? 'pointer' : 'not-allowed',
                            pointerEvents: 'auto'
                        }}
                    >
                        Continue →
                    </button>
                </div>

                {/* Instruction + Zoom Indicator */}
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
                    ↕ Drag • Pinch to zoom • {Math.round(scale * 100)}%
                </div>
            </div>
        )
    }

    // =============================================
    // STATE B: PREVIEW — True 1:1 Home render
    // =============================================
    if (step === 'preview') {
        return (
            <>
                {/* Real Home — Direct render, no wrappers */}
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    background: 'var(--canvas-bg, #fff)'
                }}>
                    <Home />
                    <StaticBottomNav />
                </div>

                {/* Floating buttons — top right */}
                <div style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    paddingTop: 'max(12px, env(safe-area-inset-top))',
                    paddingRight: 12,
                    display: 'flex',
                    gap: 8,
                    zIndex: 10000
                }}>
                    <button
                        onClick={exitPreview}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            border: 'none',
                            fontSize: 18,
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
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: '#22C55E',
                            color: '#fff',
                            border: 'none',
                            fontSize: 20,
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
            </>
        )
    }

    return null
}

export default CoverImageEditor
