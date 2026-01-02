/**
 * CoverImageEditor.jsx - Cover Image Edit Mode
 * 
 * Bug Fix Pass: Safari, no auto-zoom, route-based preview
 * 
 * Flow:
 * - Auto-enter Edit (file picker opens if no image)
 * - Continue → navigates to /admin/cover-preview (separate route)
 * - No inline preview, no timers
 * 
 * Cover Heights (LOCKED — NO LAYOUT CHANGES):
 * - Mobile (<768px): 220px
 * - Tablet (≥768px): 280px
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getConfig, updateConfig } from '../config/appConfig.v2.js'
import { processAndStoreImage } from '../utils/imageOptimizer.js'
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
            <NavItem icon="home" label="Home" active />
            <NavItem icon="menu" label="Menú" />
            <CameraButton />
            <NavItem icon="status" label="Estado" />
            <NavItem icon="info" label="Info" />
        </nav>
    )
}

function NavItem({ icon, label, active }) {
    const icons = {
        home: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />,
        menu: <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>,
        status: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
        info: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: active ? 1 : 0.5 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#111' : 'currentColor'} strokeWidth="2">
                {icons[icon]}
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

// Snap assist constants
const SNAP_THRESHOLD = 4 // ±4px for gentle snap

function CoverImageEditor({ isOpen, onClose, onSave, initialData, demoMode = false, config }) {
    const navigate = useNavigate()

    const [image, setImage] = useState(initialData?.image || null)
    const [scale, setScale] = useState(initialData?.scale || 1)
    const [offsetX, setOffsetX] = useState(initialData?.offsetX || 0)
    const [offsetY, setOffsetY] = useState(initialData?.offsetY || 0)
    const [breakpoint, setBreakpoint] = useState(getBreakpoint())
    const [snappedX, setSnappedX] = useState(false)
    const [snappedY, setSnappedY] = useState(false)

    // Gesture refs (no auto-zoom/snapback)
    const isDragging = useRef(false)
    const lastTouch = useRef({ x: 0, y: 0 })
    const initialPinchDistance = useRef(0)
    const initialScale = useRef(1)
    const fileInputRef = useRef(null)

    const coverHeight = COVER_HEIGHTS[breakpoint]

    // Snap assist helper — gently snaps to center when within threshold
    const applySnapAssist = (newOffsetX, newOffsetY) => {
        let finalX = newOffsetX
        let finalY = newOffsetY
        let isSnappedX = false
        let isSnappedY = false

        // Snap X to center (0) if within threshold
        if (Math.abs(newOffsetX) <= SNAP_THRESHOLD) {
            finalX = 0
            isSnappedX = true
        }

        // Snap Y to center (0) if within threshold
        if (Math.abs(newOffsetY) <= SNAP_THRESHOLD) {
            finalY = 0
            isSnappedY = true
        }

        setSnappedX(isSnappedX)
        setSnappedY(isSnappedY)
        return { finalX, finalY }
    }

    // Breakpoint resize listener
    useEffect(() => {
        const handleResize = () => setBreakpoint(getBreakpoint())
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Initialize state on open (NO auto-zoom/reset after interactions)
    useEffect(() => {
        if (isOpen) {
            // Only set initial values when opening, not on every render
            setImage(initialData?.image || null)
            setScale(initialData?.scale || 1)
            setOffsetX(initialData?.offsetX || 0)
            setOffsetY(initialData?.offsetY || 0)
            // Auto-open file picker if no image
            if (!initialData?.image) {
                setTimeout(() => fileInputRef.current?.click(), 150)
            }
        }
    }, [isOpen]) // Intentionally exclude initialData to prevent resets

    // File selection
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            // PATCH: Optimize image before loading to prevent localStorage quota errors in Safari
            const { dataURI } = await processAndStoreImage(file)
            setImage(dataURI)
            // Reset position for new image only
            setScale(1)
            setOffsetX(0)
            setOffsetY(0)
        } catch (error) {
            console.error('Error optimizing image:', error)
            alert('Error loading image. Please try a smaller file.')
        }
    }

    // ===== DRAG TO PAN (Safari + Chrome) =====
    const handleTouchStart = (e) => {
        e.preventDefault() // Prevent Safari scroll
        if (e.touches.length === 2) {
            // Pinch start
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy)
            initialScale.current = scale
        } else if (e.touches.length === 1) {
            // Drag start
            isDragging.current = true
            lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
    }

    const handleTouchMove = (e) => {
        e.preventDefault() // Prevent Safari scroll
        if (e.touches.length === 2) {
            // Pinch zoom — NO snapback, value LOCKS
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const newScale = Math.min(3, Math.max(0.5, initialScale.current * (distance / initialPinchDistance.current)))
            setScale(newScale)
        } else if (e.touches.length === 1 && isDragging.current) {
            // Drag pan with snap assist
            const dx = e.touches[0].clientX - lastTouch.current.x
            const dy = e.touches[0].clientY - lastTouch.current.y
            const newX = offsetX + dx
            const newY = offsetY + dy
            const { finalX, finalY } = applySnapAssist(newX, newY)
            setOffsetX(finalX)
            setOffsetY(finalY)
            lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
    }

    const handleTouchEnd = () => {
        isDragging.current = false
        // NO reset, NO snapback — transform LOCKS
    }

    // Mouse handlers (desktop)
    const handleMouseDown = (e) => {
        isDragging.current = true
        lastTouch.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e) => {
        if (!isDragging.current) return
        const dx = e.clientX - lastTouch.current.x
        const dy = e.clientY - lastTouch.current.y
        const newX = offsetX + dx
        const newY = offsetY + dy
        const { finalX, finalY } = applySnapAssist(newX, newY)
        setOffsetX(finalX)
        setOffsetY(finalY)
        lastTouch.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
        isDragging.current = false
    }

    // ===== CONTINUE → ROUTE TO PREVIEW (or save directly in demo mode) =====
    const handleContinue = () => {
        // DEMO MODE: Save directly without navigation or production config update
        if (demoMode) {
            onSave({ image, scale, offsetX, offsetY, breakpoint })
            onClose()
            return
        }

        // PRODUCTION MODE: Save to config and navigate to preview
        // Save current state to config
        updateConfig({ headerCover: { image, scale, offsetX, offsetY, breakpoint } })

        // 🛡️ CRITICAL: Dispatch frontendSync IMMEDIATELY to update parent (App.jsx)
        window.dispatchEvent(new CustomEvent('frontendSync'))

        // Save to parent
        onSave({ image, scale, offsetX, offsetY, breakpoint })

        // Safari-safe: verify save completed, retry once if needed
        setTimeout(() => {
            const savedConfig = getConfig()

            // Verify cover image was persisted
            if (savedConfig.headerCover?.image) {
                // Success — navigate to preview
                // PATCH: Pass return state if provided (for correct exit navigation)
                const returnState = initialData?.returnState || {}

                // 🛡️ FIX: Dispatch sync again and give React time to re-render
                // before closing editor to prevent gray screen
                window.dispatchEvent(new CustomEvent('frontendSync'))

                setTimeout(() => {
                    navigate('/admin/cover-preview', { state: { ...returnState, returnTo: window.location.pathname } })
                    onClose()
                }, 100) // Wait for React re-render
            } else {
                // Retry save once
                console.warn('Safari: Cover image not persisted, retrying...')
                updateConfig({ headerCover: { image, scale, offsetX, offsetY, breakpoint } })

                // Second verification after retry
                setTimeout(() => {
                    const retryConfig = getConfig()
                    if (retryConfig.headerCover?.image) {
                        const returnState = initialData?.returnState || {}
                        window.dispatchEvent(new CustomEvent('frontendSync'))
                        setTimeout(() => {
                            navigate('/admin/cover-preview', { state: { ...returnState, returnTo: window.location.pathname } })
                            onClose()
                        }, 100)
                    } else {
                        // Generic message for all browsers
                        alert('Saving image… please wait and try again.')
                    }
                }, 100)
            }
        }, 50)
    }

    if (!isOpen) return null

    // =============================================
    // EDIT MODE ONLY — Preview is separate route
    // =============================================
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: '#000',
            zIndex: 9999,
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none'
        }}>
            {/* Frozen Home (dimmed) */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.3 }}>
                <Home config={config} />
                <StaticBottomNav />
            </div>

            {/* Dark overlay below crop frame */}
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
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
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
                        transform: `translate(${offsetX}px, ${offsetY}px)`,
                        willChange: 'transform'
                    }} />
                ) : null}

                {/* Center Guidelines (Editor Only) */}
                {image && (
                    <>
                        {/* Vertical center line */}
                        <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            bottom: 0,
                            width: snappedX ? 2 : 1,
                            background: snappedX ? '#22C55E' : 'rgba(255,255,255,0.3)',
                            transform: 'translateX(-50%)',
                            pointerEvents: 'none',
                            zIndex: 10,
                            transition: 'all 0.1s ease'
                        }} />
                        {/* Horizontal center line */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: 0,
                            right: 0,
                            height: snappedY ? 2 : 1,
                            background: snappedY ? '#22C55E' : 'rgba(255,255,255,0.3)',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            zIndex: 10,
                            transition: 'all 0.1s ease'
                        }} />
                        {/* Center crosshair indicator */}
                        {(snappedX && snappedY) && (
                            <div style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: '#22C55E',
                                transform: 'translate(-50%, -50%)',
                                pointerEvents: 'none',
                                zIndex: 11,
                                boxShadow: '0 0 8px rgba(34,197,94,0.6)'
                            }} />
                        )}
                    </>
                )}

                {/* No image placeholder */}
                {!image && (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onTouchEnd={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
                        style={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ color: '#9CA3AF', fontSize: 14 }}>Tap to select image</span>
                    </div>
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {/* FLOATING CONTROLS */}
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
                    onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
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
                        pointerEvents: 'auto',
                        touchAction: 'manipulation'
                    }}
                >
                    ✕ Cancelar
                </button>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    onTouchEnd={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
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
                        pointerEvents: 'auto',
                        touchAction: 'manipulation'
                    }}
                >
                    📷
                </button>
                <button
                    onClick={handleContinue}
                    onTouchEnd={(e) => { e.preventDefault(); handleContinue(); }}
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
                        pointerEvents: 'auto',
                        touchAction: 'manipulation'
                    }}
                >
                    Continue →
                </button>
            </div>

            {/* Zoom indicator */}
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

export default CoverImageEditor
