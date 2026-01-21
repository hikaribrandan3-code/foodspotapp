/**
 * CoverImageEditor.jsx — RESTORED DEC 19 PHYSICS + V6 BACKEND
 * * CORE PHYSICS (Legacy):
 * - Uses 'handlePointer' events for Drag (Mouse/Touch hybrid)
 * - Uses 'handleTouch' events for Pinch (Zoom)
 * - Exact "Green Line" Snap Logic
 * * BACKEND (V6):
 * - Connected to Supabase uploadAsset / updateBranding
 * * FIXES:
 * - Added 'touch-action: none' to force browser to yield control
 * - Fixed Z-Index layering so buttons work
 */

import { useState, useRef, useEffect } from 'react'
import { useTenant } from '../contexts/TenantContext.jsx'
import { uploadAsset, updateBranding } from '../lib/supabaseClient.js'
import { processAndStoreImage } from '../utils/imageOptimizer.js'
import Home from '../pages/customer/Home.jsx'
import { getConfig } from '../config/appConfig.v2.js'

// ============================================
// CONSTANTS (Legacy Dec 19 Specs)
// ============================================
const COVER_HEIGHTS = { mobile: 220, tablet: 280 }
const SNAP_THRESHOLD = 10 // Pixels to snap

function getBreakpoint() {
    return window.innerWidth >= 768 ? 'tablet' : 'mobile'
}

// ============================================
// COMPONENT
// ============================================
function CoverImageEditor({ isOpen, onClose, onSave }) {
    const { tenantData, businessId, refreshTenant } = useTenant()

    // State
    const [step, setStep] = useState('edit')
    const [image, setImage] = useState(null)
    const [originalFile, setOriginalFile] = useState(null)

    // Physics State
    const [scale, setScale] = useState(1)
    const [offsetX, setOffsetX] = useState(0)
    const [offsetY, setOffsetY] = useState(0)
    const [breakpoint, setBreakpoint] = useState(getBreakpoint())

    // Visual State
    const [snappedX, setSnappedX] = useState(false)
    const [snappedY, setSnappedY] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Refs (The Engine)
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
            // Load current if exists
            if (tenantData?.hero_url && !image) {
                setImage(tenantData.hero_url)
            }
            // Auto-trigger select if empty
            if (!tenantData?.hero_url && !image) {
                setTimeout(() => fileInputRef.current?.click(), 200)
            }
        }
    }, [isOpen])

    useEffect(() => {
        // Cleanup blobs to prevent memory leaks
        return () => {
            if (image?.startsWith('blob:')) URL.revokeObjectURL(image)
        }
    }, [image])

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
            // Reset Physics
            setScale(1)
            setOffsetX(0)
            setOffsetY(0)
        } catch (err) {
            alert('Error loading image')
        }
    }

    // ============================================
    // PHYSICS: DRAG (Dec 19 Logic)
    // ============================================
    const handlePointerDown = (e) => {
        if (e.touches && e.touches.length > 1) return // Ignore multi-touch (let Zoom handle it)
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

        // Calculate new position
        let newX = offsetX + dx
        let newY = offsetY + dy

        // MAGNETIC SNAP LOGIC
        let isSnappedX = false
        let isSnappedY = false

        if (Math.abs(newX) < SNAP_THRESHOLD) {
            newX = 0
            isSnappedX = true
            // Haptic feedback if supported
            if (!snappedX && navigator.vibrate) navigator.vibrate(10)
        }
        if (Math.abs(newY) < SNAP_THRESHOLD) {
            newY = 0
            isSnappedY = true
            if (!snappedY && navigator.vibrate) navigator.vibrate(10)
        }

        setSnappedX(isSnappedX)
        setSnappedY(isSnappedY)
        setOffsetX(newX)
        setOffsetY(newY)

        lastTouch.current = { x: point.clientX, y: point.clientY }
    }

    const handlePointerUp = () => {
        isDragging.current = false
    }

    // ============================================
    // PHYSICS: ZOOM (Dec 19 Logic)
    // ============================================
    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            e.preventDefault() // Stop browser zoom
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
            e.preventDefault() // Stop browser zoom
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
    // V6 SAVE LOGIC (Supabase)
    // ============================================
    const handleSave = async () => {
        if (!businessId) {
            alert('System Error: No Business ID found. Please refresh.')
            return
        }
        setIsSaving(true)

        try {
            let finalUrl = image

            // 1. Upload if new file
            if (originalFile) {
                const res = await uploadAsset(originalFile, businessId, 'branding')
                if (res.error) throw res.error
                finalUrl = res.url
            }

            // 2. Update DB
            const updates = {
                hero_url: finalUrl,
                hero_mode: 'image', // FORCE IMAGE MODE
                hero_settings: JSON.stringify({ scale, offsetX, offsetY }),
                updated_at: new Date().toISOString()
            }

            const { error } = await updateBranding(updates, businessId)
            if (error) throw error

            // 3. Refresh Context
            await refreshTenant?.()

            // 4. Close
            onSave?.({ image: finalUrl, scale, offsetX, offsetY })
            onClose?.()

        } catch (err) {
            console.error(err)
            alert('Save Failed: ' + (err.message || 'Unknown error'))
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    // ============================================
    // RENDER: EDIT MODE (Stage 1)
    // ============================================
    if (step === 'edit') {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: '#000',
                zIndex: 9999,
                touchAction: 'none' // CRITICAL FIX
            }}>
                {/* 1. FROZEN HOME BACKGROUND (Context) */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    opacity: 0.3
                }}>
                    <Home config={getConfig()} />
                </div>

                {/* 2. DARK OVERLAY (Below Crop) */}
                <div style={{
                    position: 'absolute',
                    top: coverHeight,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    pointerEvents: 'none',
                    zIndex: 5
                }} />

                {/* 3. CROP FRAME (The Action Zone) */}
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
                        border: '2px solid #22C55E', // GREEN BORDER
                        boxShadow: '0 0 0 4px rgba(34,197,94,0.3)',
                        touchAction: 'none',
                        userSelect: 'none'
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
                            <span style={{ color: '#fff', fontSize: 16, fontWeight: 500 }}>
                                📷 Tap to select image
                            </span>
                        </div>
                    )}

                    {/* GREEN SNAP LINES */}
                    {snappedX && <div style={styles.snapLineV} />}
                    {snappedY && <div style={styles.snapLineH} />}
                    {(snappedX && snappedY) && <div style={styles.snapDot} />}
                </div>

                {/* 4. HIDDEN INPUT */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                {/* 5. CONTROLS (Floating Top Bar) */}
                <div style={styles.topBar}>
                    <button onClick={onClose} style={styles.btnCancel}>
                        ✕ Cancel
                    </button>

                    <button onClick={() => fileInputRef.current?.click()} style={styles.btnIcon}>
                        📷
                    </button>

                    <button
                        onClick={() => setStep('preview')}
                        disabled={!image}
                        style={styles.btnContinue(!!image)}
                    >
                        Continue →
                    </button>
                </div>

                {/* 6. INFO PILL */}
                <div style={styles.infoPill(coverHeight)}>
                    ↕ Drag • Pinch to zoom • {Math.round(scale * 100)}%
                </div>
            </div>
        )
    }

    // ============================================
    // RENDER: PREVIEW MODE (Stage 2)
    // ============================================
    if (step === 'preview') {
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#fff' }}>
                {/* Full Color Preview */}
                <Home config={getConfig()} />

                {/* Verification Buttons */}
                <div style={styles.previewControls}>
                    <button onClick={() => setStep('edit')} style={styles.btnBack}>
                        ← Back
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        style={styles.btnSave}
                    >
                        {isSaving ? 'Saving...' : '✓ Confirm'}
                    </button>
                </div>
            </div>
        )
    }

    return null
}

// ============================================
// STYLES
// ============================================
const styles = {
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        display: 'flex',
        justifyContent: 'space-between',
        zIndex: 100,
        pointerEvents: 'none' // Container passes clicks...
    },
    btnCancel: {
        pointerEvents: 'auto', // ...Button captures them
        background: 'rgba(0,0,0,0.6)',
        color: '#ff6b6b',
        border: 'none',
        padding: '8px 16px',
        borderRadius: 20,
        fontWeight: '600',
        backdropFilter: 'blur(4px)',
        cursor: 'pointer'
    },
    btnIcon: {
        pointerEvents: 'auto',
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        border: 'none',
        width: 40,
        height: 40,
        borderRadius: '50%',
        backdropFilter: 'blur(4px)',
        cursor: 'pointer',
        fontSize: 18
    },
    btnContinue: (active) => ({
        pointerEvents: 'auto',
        background: active ? '#3B82F6' : 'rgba(59,130,246,0.5)',
        color: '#fff',
        border: 'none',
        padding: '8px 16px',
        borderRadius: 20,
        fontWeight: '600',
        cursor: active ? 'pointer' : 'not-allowed'
    }),
    infoPill: (top) => ({
        position: 'absolute',
        top: top + 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#22C55E',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        zIndex: 10
    }),
    snapLineV: {
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        width: 2,
        background: '#22C55E',
        transform: 'translateX(-50%)',
        boxShadow: '0 0 10px #22C55E',
        pointerEvents: 'none',
        zIndex: 20
    },
    snapLineH: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: 2,
        background: '#22C55E',
        transform: 'translateY(-50%)',
        boxShadow: '0 0 10px #22C55E',
        pointerEvents: 'none',
        zIndex: 20
    },
    snapDot: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 12,
        height: 12,
        background: '#22C55E',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 0 15px #22C55E',
        pointerEvents: 'none',
        zIndex: 21
    },
    previewControls: {
        position: 'fixed',
        top: 0,
        right: 0,
        padding: '16px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        display: 'flex',
        gap: 8,
        zIndex: 10000
    },
    btnBack: {
        background: 'rgba(0,0,0,0.5)',
        color: '#fff',
        border: 'none',
        padding: '10px 16px',
        borderRadius: 24,
        fontWeight: 600,
        cursor: 'pointer'
    },
    btnSave: {
        background: '#22C55E',
        color: '#fff',
        border: 'none',
        padding: '10px 20px',
        borderRadius: 24,
        fontWeight: 700,
        boxShadow: '0 4px 12px rgba(34,197,94,0.4)',
        cursor: 'pointer'
    }
}

export default CoverImageEditor