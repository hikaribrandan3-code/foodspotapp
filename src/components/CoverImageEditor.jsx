/**
 * CoverImageEditor.jsx — POINTER CAPTURE PHYSICS
 * * FIXES:
 *   - setPointerCapture() locks finger to element
 *   - posRef for synchronous position tracking (bypasses React lag)
 *   - Unified pointer events for mouse/touch
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTenant } from '../contexts/TenantContext.jsx'
import { uploadAsset, updateBranding } from '../lib/supabaseClient.js'
import { processAndStoreImage } from '../utils/imageOptimizer.js'
import Home from '../pages/customer/Home.jsx'
import { getConfig } from '../config/appConfig.v2.js'

const COVER_HEIGHTS = { mobile: 220, tablet: 280 }
const SNAP_THRESHOLD = 12

function getBreakpoint() {
    return window.innerWidth >= 768 ? 'tablet' : 'mobile'
}

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

    // Physics Refs (Synchronous, bypasses React render lag)
    const isDragging = useRef(false)
    const lastTouch = useRef({ x: 0, y: 0 })
    const initialPinchDistance = useRef(0)
    const initialScale = useRef(1)
    const fileInputRef = useRef(null)
    const posRef = useRef({ x: 0, y: 0, scale: 1 }) // LIVE PHYSICS STATE

    const coverHeight = COVER_HEIGHTS[breakpoint]

    // ============================================
    // SCROLL LOCK
    // ============================================
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            document.body.style.position = 'fixed'
            document.body.style.width = '100%'
            document.body.style.top = `-${window.scrollY}px`
        } else {
            const scrollY = document.body.style.top
            document.body.style.overflow = ''
            document.body.style.position = ''
            document.body.style.width = ''
            document.body.style.top = ''
            window.scrollTo(0, parseInt(scrollY || '0') * -1)
        }
        return () => {
            document.body.style.overflow = ''
            document.body.style.position = ''
            document.body.style.width = ''
            document.body.style.top = ''
        }
    }, [isOpen])

    useEffect(() => {
        const handleResize = () => setBreakpoint(getBreakpoint())
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setStep('edit')
            setImage(null)
            setOriginalFile(null)
            setScale(1)
            setOffsetX(0)
            setOffsetY(0)
            posRef.current = { x: 0, y: 0, scale: 1 } // RESET PHYSICS
            initialPinchDistance.current = 0
            setTimeout(() => fileInputRef.current?.click(), 300)
        }
    }, [isOpen])

    useEffect(() => {
        return () => {
            if (image?.startsWith('blob:')) URL.revokeObjectURL(image)
        }
    }, [image])

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
            posRef.current = { x: 0, y: 0, scale: 1 }
        } catch (err) { alert('Error loading image') }
    }

    // ============================================
    // POINTER CAPTURE PHYSICS (The Fix)
    // ============================================
    const handlePointerDown = (e) => {
        if (!image) return
        e.currentTarget.setPointerCapture(e.pointerId) // LOCK FINGER
        isDragging.current = true
        lastTouch.current = { x: e.clientX, y: e.clientY }
    }

    const handlePointerMove = (e) => {
        if (!image) return
        e.preventDefault()
        if (!isDragging.current) return

        // Calculate Delta
        const dx = e.clientX - lastTouch.current.x
        const dy = e.clientY - lastTouch.current.y

        // UPDATE REF (Immediate Physics)
        const newX = posRef.current.x + dx
        const newY = posRef.current.y + dy

        // Magnetic Snap Logic
        let finalX = newX
        let finalY = newY
        let isX = false, isY = false

        if (Math.abs(newX) < SNAP_THRESHOLD) {
            finalX = 0; isX = true
            if (!snappedX && navigator.vibrate) navigator.vibrate(10)
        }
        if (Math.abs(newY) < SNAP_THRESHOLD) {
            finalY = 0; isY = true
            if (!snappedY && navigator.vibrate) navigator.vibrate(10)
        }

        // Commit to Ref & State
        posRef.current.x = finalX
        posRef.current.y = finalY
        setOffsetX(finalX)
        setOffsetY(finalY)
        setSnappedX(isX)
        setSnappedY(isY)

        lastTouch.current = { x: e.clientX, y: e.clientY }
    }

    const handlePointerUp = (e) => {
        isDragging.current = false
        e.currentTarget.releasePointerCapture(e.pointerId) // UNLOCK
    }

    // ZOOM HANDLER (Separate for 2-Finger Pinch)
    const handleTouchMove = (e) => {
        if (!image) return
        if (e.touches.length === 2) {
            e.preventDefault()
            e.stopPropagation()
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (initialPinchDistance.current === 0) {
                initialPinchDistance.current = distance
                initialScale.current = posRef.current.scale
                return
            }
            const scaleFactor = distance / initialPinchDistance.current
            const newScale = Math.min(3, Math.max(0.5, initialScale.current * scaleFactor))

            setScale(newScale)
            posRef.current.scale = newScale
        }
    }

    const handleTouchEnd = () => {
        initialPinchDistance.current = 0
    }

    const handleSave = async () => {
        if (!businessId) return alert('No Business ID')
        if (!originalFile) return alert('No new image selected')
        setIsSaving(true)
        try {
            const res = await uploadAsset(originalFile, businessId, 'branding')
            if (res.error) throw res.error
            const finalUrl = res.url

            const { error } = await updateBranding({
                hero_url: finalUrl,
                hero_mode: 'image',
                hero_settings: JSON.stringify({ scale, offsetX, offsetY }),
                updated_at: new Date().toISOString()
            }, businessId)
            if (error) throw error

            try { await refreshTenant?.() } catch (e) { console.warn(e) }
            onSave?.({ image: finalUrl, scale, offsetX, offsetY })
            onClose?.()
        } catch (err) {
            alert('Save Failed: ' + err.message)
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
                zIndex: 99999
            }}>
                {/* CROP FRAME - Pointer Capture */}
                <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: coverHeight,
                        zIndex: 10000,
                        overflow: 'hidden',
                        border: image ? '3px solid #22C55E' : '3px dashed rgba(255,255,255,0.4)',
                        background: image ? '#111' : 'rgba(255,255,255,0.05)',
                        cursor: image ? 'move' : 'pointer',
                        touchAction: 'none',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        WebkitTouchCallout: 'none'
                    }}
                    onClick={() => !image && fileInputRef.current?.click()}
                >
                    {image && (
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
                            willChange: 'transform',
                            pointerEvents: 'none'
                        }} />
                    )}

                    {!image && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12
                        }}>
                            <div style={{ fontSize: 56 }}>📷</div>
                            <p style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Tap to Upload</p>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Replaces current hero</p>
                        </div>
                    )}

                    {image && snappedX && <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#22C55E', boxShadow: '0 0 12px #22C55E', zIndex: 11, transform: 'translateX(-50%)', pointerEvents: 'none' }} />}
                    {image && snappedY && <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: '#22C55E', boxShadow: '0 0 12px #22C55E', zIndex: 11, transform: 'translateY(-50%)', pointerEvents: 'none' }} />}
                    {image && snappedX && snappedY && <div style={{ position: 'absolute', top: '50%', left: '50%', width: 12, height: 12, background: '#22C55E', borderRadius: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 0 16px #22C55E', zIndex: 12, pointerEvents: 'none' }} />}
                </div>

                {/* DARK MASK BELOW */}
                <div style={{ position: 'absolute', top: coverHeight, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 5, pointerEvents: 'none' }} />

                {/* TOP BAR */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: 16,
                    paddingTop: 'max(16px, env(safe-area-inset-top))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    zIndex: 2147483647,
                    pointerEvents: 'none'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            pointerEvents: 'auto',
                            background: 'rgba(0,0,0,0.9)',
                            color: '#ff6b6b',
                            border: 'none',
                            padding: '12px 20px',
                            borderRadius: 24,
                            fontWeight: '700',
                            fontSize: 15,
                            cursor: 'pointer'
                        }}
                    >
                        ✕ Cancel
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            pointerEvents: 'auto',
                            background: 'rgba(255,255,255,0.2)',
                            color: '#fff',
                            border: 'none',
                            padding: '12px 20px',
                            borderRadius: 24,
                            fontWeight: '600',
                            fontSize: 20,
                            cursor: 'pointer'
                        }}
                    >
                        📷
                    </button>
                    <button
                        onClick={() => setStep('preview')}
                        disabled={!image}
                        style={{
                            pointerEvents: 'auto',
                            background: image ? '#3B82F6' : '#333',
                            color: '#fff',
                            border: 'none',
                            padding: '12px 20px',
                            borderRadius: 24,
                            fontWeight: '700',
                            fontSize: 15,
                            opacity: image ? 1 : 0.4,
                            cursor: image ? 'pointer' : 'not-allowed'
                        }}
                    >
                        Continue →
                    </button>
                </div>

                {image && (
                    <div style={{
                        position: 'absolute',
                        top: coverHeight + 24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#22C55E',
                        color: '#fff',
                        padding: '8px 20px',
                        borderRadius: 24,
                        fontSize: 12,
                        fontWeight: 800,
                        zIndex: 99999,
                        pointerEvents: 'none'
                    }}>
                        ↕ Drag • Pinch to zoom • {Math.round(scale * 100)}%
                    </div>
                )}

                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            </div>
        )
    }

    // ============================================
    // RENDER: PREVIEW MODE
    // ============================================
    if (step === 'preview') {
        return (
            <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 99999 }}>
                <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
                    <Home config={getConfig()} />
                </div>

                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: 16,
                    paddingTop: 'max(16px, env(safe-area-inset-top))',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 12,
                    zIndex: 2147483647,
                    pointerEvents: 'none'
                }}>
                    <button
                        onClick={() => setStep('edit')}
                        style={{
                            pointerEvents: 'auto',
                            background: 'rgba(0,0,0,0.8)',
                            color: '#fff',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: 28,
                            fontWeight: 700,
                            fontSize: 15,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            cursor: 'pointer'
                        }}
                    >
                        ← Back
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            pointerEvents: 'auto',
                            background: '#22C55E',
                            color: '#fff',
                            border: 'none',
                            padding: '12px 28px',
                            borderRadius: 28,
                            fontWeight: 800,
                            fontSize: 15,
                            boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
                            cursor: isSaving ? 'wait' : 'pointer',
                            opacity: isSaving ? 0.7 : 1
                        }}
                    >
                        {isSaving ? 'Saving...' : '✓ Save'}
                    </button>
                </div>
            </div>
        )
    }

    return null
}

export default CoverImageEditor