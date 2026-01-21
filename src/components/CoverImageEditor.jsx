/**
 * CoverImageEditor.jsx - MOBILE TOUCH FIX
 * 
 * CRITICAL iOS FIXES:
 *   - touch-action: none on ALL layers
 *   - e.preventDefault() in ALL touch handlers
 *   - onTouchEnd explicitly handles button taps
 *   - Buttons use onTouchEnd instead of onClick (iOS Safari)
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTenant } from '../contexts/TenantContext.jsx'
import { uploadAsset, updateBranding } from '../lib/supabaseClient.js'
import { processAndStoreImage } from '../utils/imageOptimizer.js'
import Home from '../pages/customer/Home.jsx'
import { getConfig } from '../config/appConfig.v2.js'

// ============================================
// CONSTANTS
// ============================================
const COVER_HEIGHTS = { mobile: 220, tablet: 280 }
const SNAP_THRESHOLD = 8

function getBreakpoint() {
    return window.innerWidth >= 768 ? 'tablet' : 'mobile'
}

// ============================================
// RESTORED COVER IMAGE EDITOR (MOBILE FIXED)
// ============================================
function CoverImageEditor({ isOpen, onClose, onSave }) {
    const { tenantData, businessId, refreshTenant } = useTenant()

    const [step, setStep] = useState('edit')
    const [image, setImage] = useState(null)
    const [originalFile, setOriginalFile] = useState(null)
    const [scale, setScale] = useState(1)
    const [offsetX, setOffsetX] = useState(0)
    const [offsetY, setOffsetY] = useState(0)
    const [breakpoint, setBreakpoint] = useState(getBreakpoint())
    const [snappedX, setSnappedX] = useState(false)
    const [snappedY, setSnappedY] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Refs
    const isDragging = useRef(false)
    const lastTouch = useRef({ x: 0, y: 0 })
    const initialPinchDistance = useRef(0)
    const initialScale = useRef(1)
    const fileInputRef = useRef(null)
    const cropRef = useRef(null)

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
            if (tenantData?.hero_url && !image) {
                setImage(tenantData.hero_url)
            }
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
    // iOS TOUCH EVENT PREVENTION
    // ============================================
    useEffect(() => {
        if (!isOpen) return

        // Prevent all default touch behavior on body when editor is open
        const preventTouch = (e) => {
            if (e.target.closest('[data-crop-frame]')) {
                e.preventDefault()
            }
        }

        document.body.style.overflow = 'hidden'
        document.body.style.touchAction = 'none'
        document.addEventListener('touchmove', preventTouch, { passive: false })

        return () => {
            document.body.style.overflow = ''
            document.body.style.touchAction = ''
            document.removeEventListener('touchmove', preventTouch)
        }
    }, [isOpen])

    // ============================================
    // MAGNETIC SNAP
    // ============================================
    const applySnap = useCallback((newX, newY) => {
        let finalX = newX, finalY = newY

        if (Math.abs(newX) <= SNAP_THRESHOLD) {
            finalX = 0
            setSnappedX(true)
        } else {
            setSnappedX(false)
        }

        if (Math.abs(newY) <= SNAP_THRESHOLD) {
            finalY = 0
            setSnappedY(true)
        } else {
            setSnappedY(false)
        }

        return { finalX, finalY }
    }, [])

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
    // TOUCH HANDLERS (iOS FIXED)
    // ============================================
    const handleTouchStart = useCallback((e) => {
        e.preventDefault() // CRITICAL for iOS
        e.stopPropagation()

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
    }, [scale])

    const handleTouchMove = useCallback((e) => {
        e.preventDefault() // CRITICAL for iOS
        e.stopPropagation()

        if (e.touches.length === 2) {
            // Pinch zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const newScale = Math.min(3, Math.max(0.5, initialScale.current * (distance / initialPinchDistance.current)))
            setScale(newScale)
        } else if (e.touches.length === 1 && isDragging.current) {
            // Drag pan
            const dx = e.touches[0].clientX - lastTouch.current.x
            const dy = e.touches[0].clientY - lastTouch.current.y
            const { finalX, finalY } = applySnap(offsetX + dx, offsetY + dy)
            setOffsetX(finalX)
            setOffsetY(finalY)
            lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
    }, [offsetX, offsetY, applySnap])

    const handleTouchEnd = useCallback((e) => {
        e.preventDefault()
        isDragging.current = false
    }, [])

    // ============================================
    // MOUSE HANDLERS (Desktop)
    // ============================================
    const handleMouseDown = (e) => {
        isDragging.current = true
        lastTouch.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e) => {
        if (!isDragging.current) return
        const dx = e.clientX - lastTouch.current.x
        const dy = e.clientY - lastTouch.current.y
        const { finalX, finalY } = applySnap(offsetX + dx, offsetY + dy)
        setOffsetX(finalX)
        setOffsetY(finalY)
        lastTouch.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
        isDragging.current = false
    }

    // ============================================
    // BUTTON HANDLERS (iOS uses onTouchEnd)
    // ============================================
    const handleCancelTap = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (image?.startsWith('blob:')) URL.revokeObjectURL(image)
        setImage(null)
        setOriginalFile(null)
        onClose?.()
    }

    // Camera tap handler REMOVED - using label htmlFor instead

    const handleContinueTap = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (image) setStep('preview')
    }

    const handleBackTap = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setStep('edit')
    }

    const handleSaveTap = async (e) => {
        e.preventDefault()
        e.stopPropagation()

        if (!businessId || isSaving) return

        setIsSaving(true)

        try {
            let url = image

            if (originalFile) {
                const res = await uploadAsset(originalFile, businessId, 'branding')
                if (res.error) throw res.error
                url = res.url
            }

            const { error } = await updateBranding({
                hero_url: url,
                hero_mode: 'image',
                hero_settings: JSON.stringify({ scale, offsetX, offsetY }),
                updated_at: new Date().toISOString()
            }, businessId)

            if (error) throw error

            try { await refreshTenant?.() } catch (e) { /* ignore */ }

            onSave?.({ image: url, scale, offsetX, offsetY })
            onClose?.()

        } catch (err) {
            alert('Save Failed: ' + (err.message || 'Unknown error'))
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    // ============================================
    // RENDER: EDIT MODE
    // ============================================
    if (step === 'edit') {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: '#000',
                zIndex: 9999,
                touchAction: 'none', // CRITICAL
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none'
            }}>
                {/* Frozen Home */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.3 }}>
                    <Home config={getConfig()} />
                </div>

                {/* Dark Overlay Below */}
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

                {/* CROP FRAME */}
                <div
                    ref={cropRef}
                    data-crop-frame="true"
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
                        boxShadow: '0 0 0 4px rgba(34,197,94,0.4)',
                        touchAction: 'none', // CRITICAL
                        WebkitTouchCallout: 'none'
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
                            transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
                            willChange: 'transform',
                            pointerEvents: 'none'
                        }} />
                    ) : (
                        <label
                            htmlFor="hero-file-input"
                            style={{
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <span style={{ color: '#9CA3AF', fontSize: 14 }}>Tap to select image</span>
                        </label>
                    )}

                    {/* Snap Lines */}
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
                            zIndex: 10
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
                            zIndex: 10
                        }} />
                    )}
                </div>

                {/* File Input - VISIBLE via label, not programmatic click */}
                <input
                    ref={fileInputRef}
                    id="hero-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{
                        position: 'absolute',
                        width: 1,
                        height: 1,
                        opacity: 0,
                        pointerEvents: 'none'
                    }}
                />

                {/* FLOATING BUTTONS - onTouchEnd for iOS */}
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
                    zIndex: 100
                }}>
                    <button
                        onTouchEnd={handleCancelTap}
                        onClick={handleCancelTap}
                        style={{
                            minWidth: 44,
                            minHeight: 44,
                            padding: '8px 14px',
                            background: 'rgba(0,0,0,0.8)',
                            color: '#EF4444',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            touchAction: 'manipulation',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                    >
                        ✕ Cancel
                    </button>
                    {/* CAMERA BUTTON - Using label for iOS Safari */}
                    <label
                        htmlFor="hero-file-input"
                        style={{
                            minWidth: 44,
                            minHeight: 44,
                            padding: '8px 14px',
                            background: 'rgba(0,0,0,0.8)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 20,
                            cursor: 'pointer',
                            touchAction: 'manipulation',
                            WebkitTapHighlightColor: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        📷
                    </label>
                    <button
                        onTouchEnd={handleContinueTap}
                        onClick={handleContinueTap}
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
                            opacity: image ? 1 : 0.5,
                            touchAction: 'manipulation',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                    >
                        Continue →
                    </button>
                </div>

                {/* Zoom Indicator */}
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
                    pointerEvents: 'none'
                }}>
                    ↕ Drag • Pinch to zoom • {Math.round(scale * 100)}%
                </div>
            </div>
        )
    }

    // ============================================
    // RENDER: PREVIEW MODE
    // ============================================
    if (step === 'preview') {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'var(--canvas-bg, #fff)'
            }}>
                <Home config={getConfig()} />

                {/* Floating Buttons */}
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
                        onTouchEnd={handleBackTap}
                        onClick={handleBackTap}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.7)',
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
                        onTouchEnd={handleSaveTap}
                        onClick={handleSaveTap}
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
            </div>
        )
    }

    return null
}

export default CoverImageEditor
