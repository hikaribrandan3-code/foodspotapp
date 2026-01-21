/**
 * CoverImageEditor.jsx — SCROLL-LOCKED BUILD
 * * FIXES:
 *   - Global body lock: overflow=hidden, touchAction=none
 *   - Cleanup on unmount restores body scroll
 *   - Solid black background (no Home in edit mode)
 *   - Dec 19 physics intact
 */

import { useState, useRef, useEffect } from 'react'
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

    const isDragging = useRef(false)
    const lastTouch = useRef({ x: 0, y: 0 })
    const initialPinchDistance = useRef(0)
    const initialScale = useRef(1)
    const fileInputRef = useRef(null)

    const coverHeight = COVER_HEIGHTS[breakpoint]

    // ============================================
    // SCROLL LOCK (Global Body Trap)
    // ============================================
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            document.body.style.touchAction = 'none'
            document.body.style.position = 'fixed'
            document.body.style.width = '100%'
            document.body.style.height = '100%'
        } else {
            document.body.style.overflow = ''
            document.body.style.touchAction = ''
            document.body.style.position = ''
            document.body.style.width = ''
            document.body.style.height = ''
        }
        return () => {
            document.body.style.overflow = ''
            document.body.style.touchAction = ''
            document.body.style.position = ''
            document.body.style.width = ''
            document.body.style.height = ''
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
            setScale(1); setOffsetX(0); setOffsetY(0)
        } catch (err) { alert('Error loading image') }
    }

    // ============================================
    // DEC 19 PHYSICS
    // ============================================
    const handlePointerDown = (e) => {
        if (!image) return
        if (e.touches && e.touches.length > 1) return
        isDragging.current = true
        const point = e.touches ? e.touches[0] : e
        lastTouch.current = { x: point.clientX, y: point.clientY }
    }

    const handlePointerMove = (e) => {
        if (!image) return
        if (!isDragging.current || (e.touches && e.touches.length > 1)) return
        const point = e.touches ? e.touches[0] : e
        let newX = offsetX + (point.clientX - lastTouch.current.x)
        let newY = offsetY + (point.clientY - lastTouch.current.y)

        let isX = false, isY = false
        if (Math.abs(newX) < SNAP_THRESHOLD) {
            newX = 0; isX = true
            if (!snappedX && navigator.vibrate) navigator.vibrate(10)
        }
        if (Math.abs(newY) < SNAP_THRESHOLD) {
            newY = 0; isY = true
            if (!snappedY && navigator.vibrate) navigator.vibrate(10)
        }

        setSnappedX(isX); setSnappedY(isY)
        setOffsetX(newX); setOffsetY(newY)
        lastTouch.current = { x: point.clientX, y: point.clientY }
    }

    const handleTouchStart = (e) => {
        if (!image) return
        if (e.touches.length === 2) {
            e.preventDefault()
            e.stopPropagation()
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy)
            initialScale.current = scale
        } else {
            handlePointerDown(e)
        }
    }

    const handleTouchMove = (e) => {
        if (!image) return
        if (e.touches.length === 2) {
            e.preventDefault()
            e.stopPropagation()
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const distance = Math.sqrt(dx * dx + dy * dy)
            setScale(Math.min(3, Math.max(0.5, initialScale.current * (distance / initialPinchDistance.current))))
        } else {
            handlePointerMove(e)
        }
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
    // RENDER: EDIT MODE (Solid Black, No Home)
    // ============================================
    if (step === 'edit') {
        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: '#000',
                    zIndex: 99999,
                    touchAction: 'none',
                    overscrollBehavior: 'none',
                    WebkitOverflowScrolling: 'touch'
                }}
                onTouchMove={(e) => e.preventDefault()}
            >
                {/* CROP FRAME */}
                <div
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={() => isDragging.current = false}
                    onMouseLeave={() => isDragging.current = false}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => isDragging.current = false}
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
                        touchAction: 'none'
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

                    {image && snappedX && <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#22C55E', boxShadow: '0 0 12px #22C55E', zIndex: 11, transform: 'translateX(-50%)' }} />}
                    {image && snappedY && <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: '#22C55E', boxShadow: '0 0 12px #22C55E', zIndex: 11, transform: 'translateY(-50%)' }} />}
                    {image && snappedX && snappedY && <div style={{ position: 'absolute', top: '50%', left: '50%', width: 12, height: 12, background: '#22C55E', borderRadius: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 0 16px #22C55E', zIndex: 12 }} />}
                </div>

                {/* DARK MASK BELOW */}
                <div style={{ position: 'absolute', top: coverHeight, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 5 }} />

                {/* TOP BAR */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 16, paddingTop: 'max(16px, env(safe-area-inset-top))', display: 'flex', justifyContent: 'space-between', zIndex: 99999 }}>
                    <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.9)', color: '#ff6b6b', border: 'none', padding: '10px 18px', borderRadius: 24, fontWeight: '700', fontSize: 14 }}>✕ Cancel</button>
                    <button onClick={() => fileInputRef.current?.click()} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 24, fontWeight: '600', fontSize: 14 }}>📷</button>
                    <button onClick={() => setStep('preview')} disabled={!image} style={{ background: image ? '#3B82F6' : '#333', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 24, fontWeight: '700', fontSize: 14, opacity: image ? 1 : 0.4 }}>Continue →</button>
                </div>

                {image && (
                    <div style={{ position: 'absolute', top: coverHeight + 24, left: '50%', transform: 'translateX(-50%)', background: '#22C55E', color: '#fff', padding: '8px 20px', borderRadius: 24, fontSize: 12, fontWeight: 800, zIndex: 99999 }}>
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
            <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 99999, touchAction: 'none' }}>
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
                    pointerEvents: 'auto'
                }}>
                    <button
                        onClick={() => setStep('edit')}
                        style={{
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