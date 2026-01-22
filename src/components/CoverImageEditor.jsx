/**
 * CoverImageEditor.jsx — BULLETPROOF TOUCH v12.0
 * 
 * FIXES:
 * 1. NATIVE TOUCH EVENTS: addEventListener with { passive: false }
 *    - React onTouchXxx gets swallowed by Safari. Native events don't.
 * 
 * 2. REF-BASED POSITION: No stale closures.
 *    - All mutable values in refs, synced to state on touchend.
 * 
 * 3. SAFARI SEAL: Icon buttons + dynamic file input + data-form-type.
 * 
 * 4. INLINE VIEWS: No router. Step state ('edit' | 'preview').
 */

import { useState, useRef, useEffect, useCallback } from 'react'
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
    // 1. INLINE VIEW STATE
    // ============================================
    const [step, setStep] = useState('edit')
    const [breakpoint, setBreakpoint] = useState(getBreakpoint())
    const [isSaving, setIsSaving] = useState(false)
    const [originalFile, setOriginalFile] = useState(null)

    // ============================================
    // 2. REF-BASED POSITION (Avoids Stale Closures)
    // ============================================
    const posRef = useRef({
        image: initialData?.image || null,
        scale: initialData?.scale || 1,
        offsetX: initialData?.offsetX || 0,
        offsetY: initialData?.offsetY || 0
    })

    // State for React re-renders (synced from refs)
    const [image, setImage] = useState(posRef.current.image)
    const [scale, setScale] = useState(posRef.current.scale)
    const [offsetX, setOffsetX] = useState(posRef.current.offsetX)
    const [offsetY, setOffsetY] = useState(posRef.current.offsetY)
    const [snappedX, setSnappedX] = useState(false)
    const [snappedY, setSnappedY] = useState(false)

    // Touch tracking refs
    const glassRef = useRef(null)
    const isDragging = useRef(false)
    const lastTouch = useRef({ x: 0, y: 0 })
    const initialPinchDistance = useRef(0)
    const initialScale = useRef(1)

    const coverHeight = COVER_HEIGHTS[breakpoint]

    // ============================================
    // 3. NATIVE TOUCH EVENT HANDLERS
    // ============================================
    const handleTouchStart = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()

        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy)
            initialScale.current = posRef.current.scale
        } else if (e.touches.length === 1) {
            isDragging.current = true
            lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }

        // Lock body scroll
        document.body.style.overflow = 'hidden'
        document.body.style.touchAction = 'none'
    }, [])

    const handleTouchMove = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()

        if (e.touches.length === 2 && initialPinchDistance.current > 0) {
            // Pinch zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const newScale = Math.min(3, Math.max(0.5, initialScale.current * (distance / initialPinchDistance.current)))

            posRef.current.scale = newScale
            setScale(newScale)

        } else if (e.touches.length === 1 && isDragging.current) {
            // Pan
            const touch = e.touches[0]
            const dx = touch.clientX - lastTouch.current.x
            const dy = touch.clientY - lastTouch.current.y

            let newX = posRef.current.offsetX + dx
            let newY = posRef.current.offsetY + dy

            // Snap assist
            let isSnappedX = false
            let isSnappedY = false
            if (Math.abs(newX) <= SNAP_THRESHOLD) { newX = 0; isSnappedX = true }
            if (Math.abs(newY) <= SNAP_THRESHOLD) { newY = 0; isSnappedY = true }

            posRef.current.offsetX = newX
            posRef.current.offsetY = newY

            setOffsetX(newX)
            setOffsetY(newY)
            setSnappedX(isSnappedX)
            setSnappedY(isSnappedY)

            lastTouch.current = { x: touch.clientX, y: touch.clientY }
        }
    }, [])

    const handleTouchEnd = useCallback((e) => {
        e.preventDefault()
        isDragging.current = false
        initialPinchDistance.current = 0

        // Restore body
        document.body.style.overflow = ''
        document.body.style.touchAction = ''
    }, [])

    // ============================================
    // 4. ATTACH NATIVE LISTENERS
    // ============================================
    useEffect(() => {
        const glass = glassRef.current
        if (!glass || step !== 'edit') return

        glass.addEventListener('touchstart', handleTouchStart, { passive: false })
        glass.addEventListener('touchmove', handleTouchMove, { passive: false })
        glass.addEventListener('touchend', handleTouchEnd, { passive: false })
        glass.addEventListener('touchcancel', handleTouchEnd, { passive: false })

        // Mouse fallback for desktop testing
        const handleMouseDown = (e) => {
            isDragging.current = true
            lastTouch.current = { x: e.clientX, y: e.clientY }
        }
        const handleMouseMove = (e) => {
            if (!isDragging.current) return
            const dx = e.clientX - lastTouch.current.x
            const dy = e.clientY - lastTouch.current.y

            let newX = posRef.current.offsetX + dx
            let newY = posRef.current.offsetY + dy
            if (Math.abs(newX) <= SNAP_THRESHOLD) newX = 0
            if (Math.abs(newY) <= SNAP_THRESHOLD) newY = 0

            posRef.current.offsetX = newX
            posRef.current.offsetY = newY
            setOffsetX(newX)
            setOffsetY(newY)
            lastTouch.current = { x: e.clientX, y: e.clientY }
        }
        const handleMouseUp = () => { isDragging.current = false }

        glass.addEventListener('mousedown', handleMouseDown)
        glass.addEventListener('mousemove', handleMouseMove)
        glass.addEventListener('mouseup', handleMouseUp)
        glass.addEventListener('mouseleave', handleMouseUp)

        return () => {
            glass.removeEventListener('touchstart', handleTouchStart)
            glass.removeEventListener('touchmove', handleTouchMove)
            glass.removeEventListener('touchend', handleTouchEnd)
            glass.removeEventListener('touchcancel', handleTouchEnd)
            glass.removeEventListener('mousedown', handleMouseDown)
            glass.removeEventListener('mousemove', handleMouseMove)
            glass.removeEventListener('mouseup', handleMouseUp)
            glass.removeEventListener('mouseleave', handleMouseUp)
        }
    }, [step, handleTouchStart, handleTouchMove, handleTouchEnd])

    // ============================================
    // 5. INITIALIZATION
    // ============================================
    useEffect(() => {
        const handleResize = () => setBreakpoint(getBreakpoint())
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (isOpen) {
            setStep('edit')
            posRef.current = {
                image: initialData?.image || null,
                scale: initialData?.scale || 1,
                offsetX: initialData?.offsetX || 0,
                offsetY: initialData?.offsetY || 0
            }
            setImage(posRef.current.image)
            setScale(posRef.current.scale)
            setOffsetX(posRef.current.offsetX)
            setOffsetY(posRef.current.offsetY)

            if (!initialData?.image) {
                setTimeout(() => triggerFileInput(), 150)
            }
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isOpen, initialData])

    // ============================================
    // 6. DYNAMIC FILE INPUT (Safari Seal)
    // ============================================
    const triggerFileInput = useCallback(() => {
        // Create input on-demand, destroy after use
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.style.display = 'none'
        input.setAttribute('data-form-type', 'other')

        input.onchange = async (e) => {
            const file = e.target.files?.[0]
            if (file) {
                try {
                    setOriginalFile(file)
                    const { dataURI } = await processAndStoreImage(file)
                    posRef.current.image = dataURI
                    posRef.current.scale = 1
                    posRef.current.offsetX = 0
                    posRef.current.offsetY = 0
                    setImage(dataURI)
                    setScale(1)
                    setOffsetX(0)
                    setOffsetY(0)
                } catch (error) {
                    alert('Error loading image.')
                }
            }
            // Destroy input
            document.body.removeChild(input)
        }

        document.body.appendChild(input)
        input.click()
    }, [])

    // ============================================
    // 7. STEP HANDLERS
    // ============================================
    const handleNext = useCallback(() => {
        if (!image) return

        const lsKey = `hero_${businessId}`
        const storageData = {
            image: posRef.current.image,
            scale: posRef.current.scale,
            offsetX: posRef.current.offsetX,
            offsetY: posRef.current.offsetY,
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
    }, [image, businessId])

    const handleBack = useCallback(() => {
        setStep('edit')
    }, [])

    const handleSave = useCallback(async () => {
        try {
            setIsSaving(true)

            if (originalFile && !demoMode) {
                const { url, error } = await uploadAsset(originalFile, businessId, 'branding')
                if (!error) {
                    await updateBranding({ hero_url: url, hero_mode: 'image' }, businessId)
                }
            }

            onSave?.({
                image: posRef.current.image,
                scale: posRef.current.scale,
                offsetX: posRef.current.offsetX,
                offsetY: posRef.current.offsetY,
                updatedAt: Date.now()
            })
            onClose()
        } catch (err) {
            console.error("Save failed:", err)
            setIsSaving(false)
        }
    }, [originalFile, demoMode, businessId, onSave, onClose])

    if (!isOpen) return null

    // ============================================
    // 8. RENDER
    // ============================================

    // PREVIEW STEP
    if (step === 'preview') {
        return (
            <div
                data-form-type="other"
                style={{
                    position: 'fixed', inset: 0, background: '#000', zIndex: 9999,
                    touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none'
                }}
            >
                <div style={{ position: 'absolute', inset: 0 }}>
                    <Home config={config} />
                    <StaticBottomNav />
                </div>

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

                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    paddingTop: 'max(12px, env(safe-area-inset-top))', paddingLeft: 12, paddingRight: 12,
                    display: 'flex', justifyContent: 'space-between', zIndex: 100
                }}>
                    <div
                        onClick={handleBack}
                        style={{
                            minWidth: 44, minHeight: 44, padding: '8px 14px', background: 'rgba(0,0,0,0.7)',
                            color: '#fff', borderRadius: 10, fontSize: 18, fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        ←
                    </div>
                    <div
                        onClick={!isSaving ? handleSave : undefined}
                        style={{
                            minWidth: 44, minHeight: 44, padding: '8px 14px',
                            background: isSaving ? 'rgba(34,197,94,0.5)' : '#22C55E',
                            color: '#fff', borderRadius: 10, fontSize: 18, fontWeight: 600,
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        {isSaving ? '...' : '✓'}
                    </div>
                </div>

                <div style={{
                    position: 'absolute', top: coverHeight + 12, left: '50%', transform: 'translateX(-50%)',
                    background: '#3B82F6', color: '#fff', fontSize: 12, fontWeight: 600,
                    padding: '8px 16px', borderRadius: 20, zIndex: 10, whiteSpace: 'nowrap'
                }}>
                    Preview — Tap ✓ to save
                </div>
            </div>
        )
    }

    // EDIT STEP
    return (
        <div
            data-form-type="other"
            style={{
                position: 'fixed', inset: 0, background: '#000', zIndex: 9999,
                touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none'
            }}
        >
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
                        style={{
                            position: 'absolute', width: '200%', height: '200%', left: '-50%', top: '-50%',
                            backgroundImage: `url(${image})`, backgroundSize: `${scale * 100}%`,
                            backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
                            transform: `translate(${offsetX}px, ${offsetY}px)`,
                            willChange: 'transform',
                            pointerEvents: 'none'
                        }}
                    />
                ) : null}

                {image && (
                    <>
                        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: snappedX ? 2 : 1, background: snappedX ? '#22C55E' : 'rgba(255,255,255,0.3)', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 10 }} />
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: snappedY ? 2 : 1, background: snappedY ? '#22C55E' : 'rgba(255,255,255,0.3)', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 10 }} />
                    </>
                )}

                {!image && (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <span style={{ color: '#9CA3AF', fontSize: 14 }}>Tap 📷 to select</span>
                    </div>
                )}
            </div>

            {/* GLASS OVERLAY (Native Touch Capture) */}
            <div
                ref={glassRef}
                style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, height: coverHeight,
                    zIndex: 10001,
                    cursor: 'move',
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    background: 'transparent'
                }}
            />

            {/* BUTTONS (Icon-only for Safari Seal) */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                paddingTop: 'max(12px, env(safe-area-inset-top))', paddingLeft: 12, paddingRight: 12,
                display: 'flex', justifyContent: 'space-between', zIndex: 10002, pointerEvents: 'none'
            }}>
                <div
                    onClick={onClose}
                    style={{
                        minWidth: 44, minHeight: 44, padding: '8px 14px', background: 'rgba(0,0,0,0.7)',
                        color: '#EF4444', borderRadius: 10, fontSize: 18, fontWeight: 600,
                        cursor: 'pointer', pointerEvents: 'auto',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    ✕
                </div>
                <div
                    onClick={triggerFileInput}
                    style={{
                        minWidth: 44, minHeight: 44, padding: '8px 14px', background: 'rgba(0,0,0,0.7)',
                        color: '#fff', borderRadius: 10, fontSize: 18, fontWeight: 600,
                        cursor: 'pointer', pointerEvents: 'auto',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    📷
                </div>
                <div
                    onClick={image ? handleNext : undefined}
                    style={{
                        minWidth: 44, minHeight: 44, padding: '8px 14px',
                        background: image ? '#3B82F6' : 'rgba(59,130,246,0.4)',
                        color: '#fff', borderRadius: 10, fontSize: 18, fontWeight: 600,
                        cursor: image ? 'pointer' : 'not-allowed', pointerEvents: 'auto',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    →
                </div>
            </div>

            <div style={{ position: 'absolute', top: coverHeight + 12, left: '50%', transform: 'translateX(-50%)', background: '#22C55E', color: '#fff', fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 20, zIndex: 10, whiteSpace: 'nowrap' }}>
                ↕ Drag • Pinch zoom • {Math.round(scale * 100)}%
            </div>
        </div>
    )
}

export default CoverImageEditor