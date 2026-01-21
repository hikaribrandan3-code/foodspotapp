/**
 * CoverImageEditor.jsx — UPLOAD-FIRST WORKFLOW
 * * PROTOCOL: Every action is a "Replace" action. No re-editing existing assets.
 * * ON OPEN:
 *   1. Image state resets to NULL
 *   2. Existing hero shown as darkened, non-interactive background
 *   3. User MUST upload new file to activate crop/zoom
 * * FIXES RETAINED:
 *   - e.preventDefault() on pinch-zoom
 *   - Haptic feedback on snap
 *   - Z-Index elevation
 *   - Preview mode isolation
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

    // Existing hero URL for background context (read-only)
    const existingHeroUrl = tenantData?.hero_url

    useEffect(() => {
        const handleResize = () => setBreakpoint(getBreakpoint())
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // ============================================
    // UPLOAD-FIRST INITIALIZATION
    // Force null state on every open. User MUST upload new.
    // ============================================
    useEffect(() => {
        if (isOpen) {
            setStep('edit')
            setImage(null)           // FORCE RESET
            setOriginalFile(null)    // FORCE RESET
            setScale(1)
            setOffsetX(0)
            setOffsetY(0)
            // Auto-prompt file picker after brief delay
            setTimeout(() => fileInputRef.current?.click(), 300)
        }
    }, [isOpen])

    // Cleanup blob URLs on unmount
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

    const handlePointerDown = (e) => {
        if (!image) return // Crop only works after upload
        if (e.touches && e.touches.length > 1) return
        isDragging.current = true
        const point = e.touches ? e.touches[0] : e
        lastTouch.current = { x: point.clientX, y: point.clientY }
    }

    const handlePointerMove = (e) => {
        if (!image) return // Crop only works after upload
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
        if (!image) return // Crop only works after upload
        if (e.touches.length === 2) {
            e.preventDefault()
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy)
            initialScale.current = scale
        } else handlePointerDown(e)
    }

    const handleTouchMove = (e) => {
        if (!image) return // Crop only works after upload
        if (e.touches.length === 2) {
            e.preventDefault()
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const distance = Math.sqrt(dx * dx + dy * dy)
            setScale(Math.min(3, Math.max(0.5, initialScale.current * (distance / initialPinchDistance.current))))
        } else handlePointerMove(e)
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

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 99999, touchAction: 'none' }}>
            {step === 'edit' && (
                <>
                    {/* STATIC CONTEXT BACKGROUND: Existing Hero (Darkened, Non-Interactive) */}
                    {existingHeroUrl && !image && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: `url(${existingHeroUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            opacity: 0.15,
                            filter: 'blur(4px)',
                            pointerEvents: 'none'
                        }} />
                    )}

                    {/* FROZEN HOME (Context only, if no existing hero) */}
                    {!existingHeroUrl && !image && (
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.2, overflow: 'hidden' }}>
                            <Home config={getConfig()} />
                        </div>
                    )}

                    {/* INTERACTION LAYER */}
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
                            border: image ? '3px solid #22C55E' : '3px dashed rgba(255,255,255,0.3)',
                            cursor: image ? 'move' : 'pointer'
                        }}
                        onClick={() => !image && fileInputRef.current?.click()}
                    >
                        {/* NEW IMAGE (After Upload) */}
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
                                willChange: 'transform'
                            }} />
                        )}

                        {/* UPLOAD PROMPT (Before Upload) */}
                        {!image && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 12,
                                background: 'rgba(0,0,0,0.5)'
                            }}>
                                <div style={{ fontSize: 48 }}>📷</div>
                                <p style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Tap to Upload New Image</p>
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>This will replace your current hero</p>
                            </div>
                        )}

                        {/* SNAP LINES */}
                        {image && snappedX && <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#22C55E', boxShadow: '0 0 12px #22C55E', zIndex: 11 }} />}
                        {image && snappedY && <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: '#22C55E', boxShadow: '0 0 12px #22C55E', zIndex: 11 }} />}
                    </div>

                    {/* DARK MASK BELOW VIEWPORT */}
                    <div style={{ position: 'absolute', top: coverHeight, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 5, pointerEvents: 'none' }} />

                    {/* TOP BAR */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 16, paddingTop: 'max(16px, env(safe-area-inset-top))', display: 'flex', justifyContent: 'space-between', zIndex: 99999 }}>
                        <button onClick={onClose} style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.8)', color: '#ff6b6b', border: 'none', padding: '8px 16px', borderRadius: 20, fontWeight: '700' }}>✕ Cancel</button>
                        <button onClick={() => fileInputRef.current?.click()} style={{ pointerEvents: 'auto', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 20, fontWeight: '600' }}>📷 Select</button>
                        <button onClick={() => setStep('preview')} disabled={!image} style={{ pointerEvents: 'auto', background: image ? '#3B82F6' : '#333', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 20, fontWeight: '700', opacity: image ? 1 : 0.5 }}>Continue →</button>
                    </div>

                    {/* INFO PILL */}
                    {image && (
                        <div style={{ position: 'absolute', top: coverHeight + 20, left: '50%', transform: 'translateX(-50%)', background: '#22C55E', color: '#fff', padding: '6px 18px', borderRadius: 20, fontSize: 11, fontWeight: 800, zIndex: 99999 }}>
                            ↕ Drag • Pinch to zoom • {Math.round(scale * 100)}%
                        </div>
                    )}
                </>
            )}

            {step === 'preview' && (
                <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 99999 }}>
                    <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
                        <Home config={getConfig()} />
                    </div>
                    <div style={{ position: 'absolute', top: 0, right: 0, padding: 16, paddingTop: 'max(16px, env(safe-area-inset-top))', display: 'flex', gap: 12, zIndex: 99999 }}>
                        <button onClick={() => setStep('edit')} style={{ background: '#444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 24, fontWeight: 600 }}>← Back</button>
                        <button onClick={handleSave} disabled={isSaving} style={{ background: '#22C55E', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 24, fontWeight: 700 }}>{isSaving ? 'Saving...' : '✓ Save'}</button>
                    </div>
                </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
        </div>
    )
}

export default CoverImageEditor