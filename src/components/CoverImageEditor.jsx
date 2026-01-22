/**
 * CoverImageEditor.jsx — INLINE-VIEW ARCHITECTURE v11.0
 * 
 * CORE LOGIC:
 * 1. INLINE VIEWS: No router navigation. Uses step state ('edit' | 'preview').
 *    - Eliminates TypeError crashes from unmount race conditions.
 * 
 * 2. GLASS OVERLAY: Transparent touch capture layer (z-index 10001).
 *    - No text/images = invisible to Safari's Form detection.
 *    - All gesture listeners live here, not on the image.
 * 
 * 3. PHYSICS: Dec 19 State-Based (Simple, Reliable).
 *    - Uses standard onTouchStart/Move/End on the glass overlay.
 *    - Trusts React State for coordinates.
 * 
 * 4. IDENTITY SEAL: Safari AutoFill Hardening.
 *    - Root container: role="presentation", inputMode="none", autoComplete="off".
 */

import { useState, useRef, useEffect } from 'react'
import { getConfig, updateConfig } from '../config/appConfig.v2.js'
import { processAndStoreImage } from '../utils/imageOptimizer.js'
import { uploadAsset, updateBranding } from '../lib/supabaseClient.js'
import Home from '../pages/customer/Home.jsx'
import { useTenant } from '../contexts/TenantContext.jsx'

const COVER_HEIGHTS = {
    mobile: 220,
    tablet: 280
}

function getBreakpoint() {
    return window.innerWidth >= 768 ? 'tablet' : 'mobile'
}

// Static Nav Bar (Visual Anchor)
function StaticBottomNav() {
    return (
        <nav style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, height: 64,
            background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-around',
            borderTop: '1px solid #E5E7EB', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 1
        }}>
            <div style={{ opacity: 1 }}><span style={{ fontSize: 20 }}>🏠</span></div>
            <div style={{ opacity: 0.5 }}><span style={{ fontSize: 20 }}>📋</span></div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#111', marginTop: -20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📷</div>
            <div style={{ opacity: 0.5 }}><span style={{ fontSize: 20 }}>📊</span></div>
            <div style={{ opacity: 0.5 }}><span style={{ fontSize: 20 }}>ℹ️</span></div>
        </nav>
    )
}

const SNAP_THRESHOLD = 4

function CoverImageEditor({ isOpen, onClose, onSave, initialData, demoMode = false, config, businessId, heroMode }) {
    // ============================================
    // 1. INLINE VIEW STATE (No Router)
    // ============================================
    const [step, setStep] = useState('edit') // 'edit' | 'preview'

    // ============================================
    // 2. STATE-BASED PHYSICS (The Dec 19 Fix)
    // ============================================
    const [image, setImage] = useState(initialData?.image || null)
    const [scale, setScale] = useState(initialData?.scale || 1)
    const [offsetX, setOffsetX] = useState(initialData?.offsetX || 0)
    const [offsetY, setOffsetY] = useState(initialData?.offsetY || 0)
    const [breakpoint, setBreakpoint] = useState(getBreakpoint())
    const [snappedX, setSnappedX] = useState(false)
    const [snappedY, setSnappedY] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Refs for Drag Logic only (Not for Position)
    const isDragging = useRef(false)
    const lastTouch = useRef({ x: 0, y: 0 })
    const initialPinchDistance = useRef(0)
    const initialScale = useRef(1)
    const fileInputRef = useRef(null)

    const coverHeight = COVER_HEIGHTS[breakpoint]

    // Initialize
    useEffect(() => {
        const handleResize = () => setBreakpoint(getBreakpoint())
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setStep('edit') // Reset to edit on open
            setImage(initialData?.image || null)
            setScale(initialData?.scale || 1)
            setOffsetX(initialData?.offsetX || 0)
            setOffsetY(initialData?.offsetY || 0)
            if (!initialData?.image) {
                setTimeout(() => fileInputRef.current?.click(), 150)
            }
            // Lock Scroll
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    const [originalFile, setOriginalFile] = useState(null)

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            setOriginalFile(file)
            const { dataURI } = await processAndStoreImage(file)
            setImage(dataURI)
            setScale(1); setOffsetX(0); setOffsetY(0)
        } catch (error) { alert('Error loading image.') }
    }

    // ============================================
    // 3. THE GLASS OVERLAY INTERACTION ENGINE
    // ============================================

    // Helper for Magnetic Snap
    const applySnapAssist = (newOffsetX, newOffsetY) => {
        let finalX = newOffsetX
        let finalY = newOffsetY
        let isSnappedX = false
        let isSnappedY = false
        if (Math.abs(newOffsetX) <= SNAP_THRESHOLD) { finalX = 0; isSnappedX = true }
        if (Math.abs(newOffsetY) <= SNAP_THRESHOLD) { finalY = 0; isSnappedY = true }
        setSnappedX(isSnappedX); setSnappedY(isSnappedY)
        return { finalX, finalY }
    }

    const handleTouchStart = (e) => {
        if (e.cancelable) e.preventDefault()

        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy)
            initialScale.current = scale
        } else if (e.touches.length === 1) {
            isDragging.current = true
            lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
    }

    const handleTouchMove = (e) => {
        if (e.cancelable) e.preventDefault()

        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const newScale = Math.min(3, Math.max(0.5, initialScale.current * (distance / initialPinchDistance.current)))
            setScale(newScale)
        } else if (e.touches.length === 1 && isDragging.current) {
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

    const handleTouchEnd = () => { isDragging.current = false }

    // Desktop Mouse Handlers
    const handleMouseDown = (e) => { isDragging.current = true; lastTouch.current = { x: e.clientX, y: e.clientY } }
    const handleMouseMove = (e) => {
        if (!isDragging.current) return
        const dx = e.clientX - lastTouch.current.x
        const dy = e.clientY - lastTouch.current.y
        const { finalX, finalY } = applySnapAssist(offsetX + dx, offsetY + dy)
        setOffsetX(finalX); setOffsetY(finalY)
        lastTouch.current = { x: e.clientX, y: e.clientY }
    }
    const handleMouseUp = () => { isDragging.current = false }

    // ============================================
    // 4. INLINE STEP HANDLERS
    // ============================================
    const handleNext = () => {
        if (!image) return
        // Commit to localStorage and config immediately
        const lsKey = `hero_${businessId}`
        const storageData = {
            image: image,
            scale: scale,
            offsetX: offsetX,
            offsetY: offsetY,
            updatedAt: Date.now()
        }
        localStorage.removeItem(lsKey)
        localStorage.setItem(lsKey, JSON.stringify(storageData))
        updateConfig({
            headerCover: {
                ...storageData,
                imageVersion: storageData.updatedAt
            }
        })
        window.dispatchEvent(new CustomEvent('frontendSync'))
        setStep('preview')
    }

    const handleBack = () => {
        setStep('edit')
    }

    const handleSave = async () => {
        try {
            setIsSaving(true)
            const storageData = {
                image: image,
                scale: scale,
                offsetX: offsetX,
                offsetY: offsetY,
                updatedAt: Date.now()
            }

            // Supabase Upload (Final Save)
            if (originalFile && !demoMode) {
                const { url, error } = await uploadAsset(originalFile, businessId, 'branding')
                if (!error) {
                    await updateBranding({ hero_url: url, hero_mode: 'image' }, businessId)
                }
            }

            onSave?.(storageData)
            onClose()
        } catch (err) {
            console.error("Save failed:", err)
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    // ============================================
    // 5. RENDER (Inline Views)
    // ============================================

    // PREVIEW STEP
    if (step === 'preview') {
        return (
            <div
                role="presentation"
                inputMode="none"
                autoComplete="off"
                contentEditable="false"
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: '#000',
                    zIndex: 9999,
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none'
                }}
            >
                {/* Preview Background */}
                <div style={{ position: 'absolute', inset: 0 }}>
                    <Home config={config} />
                    <StaticBottomNav />
                </div>

                {/* Preview Image */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: coverHeight,
                    overflow: 'hidden', zIndex: 6
                }}>
                    {image && (
                        <div style={{
                            position: 'absolute', width: '200%', height: '200%', left: '-50%', top: '-50%',
                            backgroundImage: `url(${image})`, backgroundSize: `${scale * 100}%`,
                            backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
                            transform: `translate(${offsetX}px, ${offsetY}px)`,
                            pointerEvents: 'none'
                        }} />
                    )}
                </div>

                {/* Preview Buttons */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    paddingTop: 'max(12px, env(safe-area-inset-top))', paddingLeft: 12, paddingRight: 12,
                    display: 'flex', justifyContent: 'space-between', zIndex: 100
                }}>
                    <button
                        onClick={handleBack}
                        onTouchEnd={(e) => { e.preventDefault(); handleBack() }}
                        style={{
                            minWidth: 44, minHeight: 44, padding: '8px 14px', background: 'rgba(0,0,0,0.7)',
                            color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        ← Back
                    </button>
                    <button
                        onClick={handleSave}
                        onTouchEnd={(e) => { e.preventDefault(); handleSave() }}
                        disabled={isSaving}
                        style={{
                            minWidth: 44, minHeight: 44, padding: '8px 14px',
                            background: isSaving ? 'rgba(34,197,94,0.5)' : '#22C55E',
                            color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                            cursor: isSaving ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isSaving ? 'Saving...' : '✓ Save'}
                    </button>
                </div>

                <div style={{
                    position: 'absolute', top: coverHeight + 12, left: '50%', transform: 'translateX(-50%)',
                    background: '#3B82F6', color: '#fff', fontSize: 12, fontWeight: 600,
                    padding: '8px 16px', borderRadius: 20, zIndex: 10, whiteSpace: 'nowrap'
                }}>
                    Preview — Tap Save to confirm
                </div>
            </div>
        )
    }

    // EDIT STEP
    return (
        <div
            role="presentation"
            inputMode="none"
            autoComplete="off"
            contentEditable="false"
            style={{
                position: 'fixed',
                inset: 0,
                background: '#000',
                zIndex: 9999,
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none'
            }}
        >
            {/* Background */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.3 }}>
                <Home config={config} />
                <StaticBottomNav />
            </div>

            <div style={{ position: 'absolute', top: coverHeight, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', pointerEvents: 'none', zIndex: 5 }} />

            {/* IMAGE LAYER (Visual Only) */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: coverHeight,
                overflow: 'hidden', zIndex: 6,
                border: '3px solid #22C55E',
                boxShadow: '0 0 0 4px rgba(34,197,94,0.4), inset 0 0 30px rgba(0,0,0,0.3)',
                pointerEvents: 'none'
            }}>
                {image ? (
                    <div
                        onContextMenu={(e) => e.preventDefault()}
                        style={{
                            position: 'absolute', width: '200%', height: '200%', left: '-50%', top: '-50%',
                            backgroundImage: `url(${image})`, backgroundSize: `${scale * 100}%`,
                            backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
                            transform: `translate(${offsetX}px, ${offsetY}px)`,
                            willChange: 'transform',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            WebkitTouchCallout: 'none'
                        }}
                    />
                ) : null}

                {/* Guidelines */}
                {image && (
                    <>
                        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: snappedX ? 2 : 1, background: snappedX ? '#22C55E' : 'rgba(255,255,255,0.3)', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 10 }} />
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: snappedY ? 2 : 1, background: snappedY ? '#22C55E' : 'rgba(255,255,255,0.3)', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 10 }} />
                    </>
                )}

                {!image && (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <span style={{ color: '#9CA3AF', fontSize: 14 }}>Tap 📷 to select image</span>
                    </div>
                )}
            </div>

            {/* GLASS OVERLAY (Touch Capture Layer) */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: coverHeight,
                    zIndex: 10001,
                    cursor: 'move',
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    background: 'transparent'
                }}
            />

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />

            {/* Buttons */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                paddingTop: 'max(12px, env(safe-area-inset-top))', paddingLeft: 12, paddingRight: 12,
                display: 'flex', justifyContent: 'space-between', zIndex: 10002, pointerEvents: 'none'
            }}>
                <button
                    onClick={onClose}
                    onTouchEnd={(e) => { e.preventDefault(); onClose() }}
                    style={{
                        minWidth: 44, minHeight: 44, padding: '8px 14px', background: 'rgba(0,0,0,0.7)',
                        color: '#EF4444', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', pointerEvents: 'auto'
                    }}
                >
                    ✕ Cancel
                </button>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    onTouchEnd={(e) => { e.preventDefault(); fileInputRef.current?.click() }}
                    style={{
                        minWidth: 44, minHeight: 44, padding: '8px 14px', background: 'rgba(0,0,0,0.7)',
                        color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', pointerEvents: 'auto'
                    }}
                >
                    📷
                </button>
                <button
                    onClick={handleNext}
                    onTouchEnd={(e) => { e.preventDefault(); handleNext() }}
                    disabled={!image}
                    style={{
                        minWidth: 44, minHeight: 44, padding: '8px 14px',
                        background: image ? '#3B82F6' : 'rgba(59,130,246,0.4)',
                        color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                        cursor: image ? 'pointer' : 'not-allowed', pointerEvents: 'auto'
                    }}
                >
                    Next →
                </button>
            </div>

            <div style={{ position: 'absolute', top: coverHeight + 12, left: '50%', transform: 'translateX(-50%)', background: '#22C55E', color: '#fff', fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 20, zIndex: 10, whiteSpace: 'nowrap' }}>
                ↕ Drag • Pinch to zoom • {Math.round(scale * 100)}%
            </div>
        </div>
    )
}

export default CoverImageEditor