/**
 * CoverImageEditor.jsx - PROJECT RESTORATION
 * 
 * MERGE: Dec 19 UX + V6 Supabase Backend
 * 
 * FROM DEC 19:
 *   - Pinch-to-zoom + drag-to-pan gesture math
 *   - Magnetic snap lines (green when centered)
 *   - Frozen Home preview at 30% opacity
 *   - 220px mobile / 280px tablet dimensions
 * 
 * FROM V6:
 *   - uploadAsset(file, businessId, 'branding')
 *   - updateBranding(payload, businessId)
 *   - refreshTenant() with error handling
 * 
 * AUDIT FIXES:
 *   - touch-action: none on crop frame
 *   - pointer-events: auto on topBar buttons
 *   - try/catch around refreshTenant()
 */

import { useState, useRef, useEffect } from 'react'
import { useTenant } from '../contexts/TenantContext.jsx'
import { uploadAsset, updateBranding } from '../lib/supabaseClient.js'
import { processAndStoreImage } from '../utils/imageOptimizer.js'
import Home from '../pages/customer/Home.jsx'
import { getConfig } from '../config/appConfig.v2.js'

// ============================================
// CONSTANTS (Dec 19 Spec)
// ============================================
const COVER_HEIGHTS = { mobile: 220, tablet: 280 }
const SNAP_THRESHOLD = 8 // Magnetic snap distance

function getBreakpoint() {
    return window.innerWidth >= 768 ? 'tablet' : 'mobile'
}

// ============================================
// STATIC NAV BAR (Dec 19)
// ============================================
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

// ============================================
// RESTORED COVER IMAGE EDITOR
// ============================================
function CoverImageEditor({ isOpen, onClose, onSave }) {
    const { tenantData, businessId, refreshTenant } = useTenant()

    // Step State
    const [step, setStep] = useState('edit') // 'edit' | 'preview'

    // Image State
    const [image, setImage] = useState(null)
    const [originalFile, setOriginalFile] = useState(null)
    const [scale, setScale] = useState(1)
    const [offsetX, setOffsetX] = useState(0)
    const [offsetY, setOffsetY] = useState(0)
    const [breakpoint, setBreakpoint] = useState(getBreakpoint())

    // Snap State (Dec 19 Green Lines)
    const [snappedX, setSnappedX] = useState(false)
    const [snappedY, setSnappedY] = useState(false)

    // UI State
    const [isSaving, setIsSaving] = useState(false)

    // Gesture Refs (Dec 19 Core)
    const isDragging = useRef(false)
    const lastTouch = useRef({ x: 0, y: 0 })
    const initialPinchDistance = useRef(0)
    const initialScale = useRef(1)
    const fileInputRef = useRef(null)

    const coverHeight = COVER_HEIGHTS[breakpoint]

    // ============================================
    // LIFECYCLE
    // ============================================
    useEffect(() => {
        const handleResize = () => setBreakpoint(getBreakpoint())
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setStep('edit')
            // Load existing image from tenant
            if (tenantData?.hero_url && !image) {
                setImage(tenantData.hero_url)
            }
            // Auto-open file picker if no image
            if (!tenantData?.hero_url && !image) {
                setTimeout(() => fileInputRef.current?.click(), 150)
            }
        }
    }, [isOpen])

    useEffect(() => {
        return () => {
            if (image?.startsWith('blob:')) URL.revokeObjectURL(image)
        }
    }, [image])

    // ============================================
    // MAGNETIC SNAP LOGIC (Dec 19)
    // ============================================
    const applyMagneticSnap = (newX, newY) => {
        let finalX = newX
        let finalY = newY

        // Snap to center X
        if (Math.abs(newX) <= SNAP_THRESHOLD) {
            finalX = 0
            setSnappedX(true)
        } else {
            setSnappedX(false)
        }

        // Snap to center Y
        if (Math.abs(newY) <= SNAP_THRESHOLD) {
            finalY = 0
            setSnappedY(true)
        } else {
            setSnappedY(false)
        }

        return { finalX, finalY }
    }

    // ============================================
    // FILE HANDLER
    // ============================================
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setOriginalFile(file)
            const { dataURI } = await processAndStoreImage(file)
            setImage(dataURI)
            setScale(1)
            setOffsetX(0)
            setOffsetY(0)
        } catch (err) {
            alert('Error loading image')
        }
    }

    // ============================================
    // GESTURE: DRAG TO PAN (Dec 19 Math)
    // ============================================
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
        const dx = point.clientX - lastTouch.current.x
        const dy = point.clientY - lastTouch.current.y

        const { finalX, finalY } = applyMagneticSnap(offsetX + dx, offsetY + dy)
        setOffsetX(finalX)
        setOffsetY(finalY)

        lastTouch.current = { x: point.clientX, y: point.clientY }
    }

    const handlePointerUp = () => {
        isDragging.current = false
    }

    // ============================================
    // GESTURE: PINCH TO ZOOM (Dec 19 Math)
    // ============================================
    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            e.preventDefault()
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
            e.preventDefault()
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const newScale = Math.min(3, Math.max(0.5, initialScale.current * (distance / initialPinchDistance.current)))
            setScale(newScale)
        } else {
            handlePointerMove(e)
        }
    }

    // ============================================
    // STEP TRANSITIONS
    // ============================================
    const enterPreview = () => setStep('preview')
    const exitPreview = () => setStep('edit')

    // ============================================
    // V6 SUPABASE SAVE (with Stuck State Fix)
    // ============================================
    const handleSave = async () => {
        if (!businessId) {
            alert('Error: No business ID')
            return
        }

        setIsSaving(true)

        try {
            let url = image

            // Upload if we have a new file
            if (originalFile) {
                const res = await uploadAsset(originalFile, businessId, 'branding')
                if (res.error) throw res.error
                url = res.url
            }

            // Save to Supabase
            const { error } = await updateBranding({
                hero_url: url,
                hero_mode: 'image',
                hero_settings: JSON.stringify({ scale, offsetX, offsetY }),
                updated_at: new Date().toISOString()
            }, businessId)

            if (error) throw error

            // Refresh tenant (wrapped in try/catch to prevent stuck state)
            try {
                await refreshTenant?.()
            } catch (refreshErr) {
                console.warn('[CoverImageEditor] refreshTenant failed:', refreshErr)
            }

            onSave?.({ image: url, scale, offsetX, offsetY })
            onClose?.()

        } catch (err) {
            alert('Save Failed: ' + (err.message || 'Unknown error'))
        } finally {
            setIsSaving(false)
        }
    }

    // ============================================
    // CANCEL
    // ============================================
    const handleCancel = () => {
        if (image?.startsWith('blob:')) URL.revokeObjectURL(image)
        setImage(null)
        setOriginalFile(null)
        setStep('edit')
        onClose?.()
    }

    if (!isOpen) return null

    // ============================================
    // RENDER: EDIT MODE (Dec 19 UX)
    // ============================================
    if (step === 'edit') {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: '#000',
                zIndex: 9999
            }}>
                {/* Frozen Home (30% opacity - Dec 19) */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.3 }}>
                    <Home config={getConfig()} />
                    <StaticBottomNav />
                </div>

                {/* Dark Overlay Below Crop (Dec 19) */}
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

                {/* CROP FRAME (Dec 19 + touch-action fix) */}
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
                        touchAction: 'none', // AUDIT FIX: Prevent browser scroll
                        userSelect: 'none',
                        WebkitUserSelect: 'none'
                    }}
                >
                    {/* Image */}
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
                    ) : (
                        <div
                            onClick={() => fileInputRef.current?.click()}
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

                    {/* MAGNETIC SNAP LINES (Dec 19 Green) */}
                    {snappedX && (
                        <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            bottom: 0,
                            width: 2,
                            background: '#22C55E',
                            transform: 'translateX(-50%)',
                            pointerEvents: 'none',
                            zIndex: 10,
                            boxShadow: '0 0 8px rgba(34,197,94,0.6)'
                        }} />
                    )}
                    {snappedY && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: 0,
                            right: 0,
                            height: 2,
                            background: '#22C55E',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            zIndex: 10,
                            boxShadow: '0 0 8px rgba(34,197,94,0.6)'
                        }} />
                    )}
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
                            boxShadow: '0 0 12px rgba(34,197,94,0.8)'
                        }} />
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

                {/* FLOATING CONTROLS (pointer-events: auto fix) */}
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
                    pointerEvents: 'none' // Container: none
                }}>
                    <button
                        onClick={handleCancel}
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
                            pointerEvents: 'auto', // AUDIT FIX
                            touchAction: 'manipulation'
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
                            pointerEvents: 'auto', // AUDIT FIX
                            touchAction: 'manipulation'
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
                            pointerEvents: 'auto', // AUDIT FIX
                            touchAction: 'manipulation'
                        }}
                    >
                        Continue →
                    </button>
                </div>

                {/* Zoom Indicator (Dec 19) */}
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
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none'
                }}>
                    ↕ Drag • Pinch to zoom • {Math.round(scale * 100)}%
                </div>
            </div>
        )
    }

    // ============================================
    // RENDER: PREVIEW MODE (Dec 19 UX)
    // ============================================
    if (step === 'preview') {
        return (
            <>
                {/* Real Home (Full Color) */}
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    background: 'var(--canvas-bg, #fff)'
                }}>
                    <Home config={getConfig()} />
                    <StaticBottomNav />
                </div>

                {/* Floating Buttons (Top Right) */}
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
                            justifyContent: 'center',
                            touchAction: 'manipulation'
                        }}
                    >
                        ←
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: isSaving ? '#666' : '#22C55E',
                            color: '#fff',
                            border: 'none',
                            fontSize: 20,
                            fontWeight: 700,
                            cursor: isSaving ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(34,197,94,0.4)',
                            touchAction: 'manipulation'
                        }}
                    >
                        {isSaving ? '...' : '✓'}
                    </button>
                </div>
            </>
        )
    }

    return null
}

export default CoverImageEditor
