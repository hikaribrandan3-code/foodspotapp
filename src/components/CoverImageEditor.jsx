/**
 * CoverImageEditor.jsx — POINTER EVENTS v14.0
 * 
 * FIXES:
 * 1. POINTER EVENTS API: Unified mouse + touch handling
 *    - Works in browser simulation AND real Safari
 *    - setPointerCapture locks events to element during drag
 * 
 * 2. STABLE INIT: Only reset on fresh open (hasInitialized ref)
 * 
 * 3. SAFARI SEAL: Icon buttons + dynamic file input + data-form-type
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { getConfig, updateConfig } from '../config/appConfig.v2.js'
import { processAndStoreImage } from '../utils/imageOptimizer.js'
import { uploadAsset, updateBranding } from '../lib/supabaseClient.js'
import Home from '../pages/customer/Home.jsx'

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
    // 1. STATE
    // ============================================
    const [step, setStep] = useState('edit')
    const [breakpoint, setBreakpoint] = useState(getBreakpoint())
    const [isSaving, setIsSaving] = useState(false)
    const [originalFile, setOriginalFile] = useState(null)

    const [image, setImage] = useState(null)
    const [scale, setScale] = useState(1)
    const [offsetX, setOffsetX] = useState(0)
    const [offsetY, setOffsetY] = useState(0)
    const [snappedX, setSnappedX] = useState(false)
    const [snappedY, setSnappedY] = useState(false)

    // Refs
    const containerRef = useRef(null)
    const isDragging = useRef(false)
    const lastPointer = useRef({ x: 0, y: 0 })
    const posRef = useRef({ offsetX: 0, offsetY: 0, scale: 1 })
    const hasInitialized = useRef(false)
    const activePointerId = useRef(null)

    // Multi-touch (pinch) tracking
    const pointers = useRef(new Map())
    const initialPinchDistance = useRef(0)
    const initialScaleRef = useRef(1)

    const coverHeight = COVER_HEIGHTS[breakpoint]

    // ============================================
    // 2. STABLE INITIALIZATION
    // ============================================
    useEffect(() => {
        if (isOpen && !hasInitialized.current) {
            hasInitialized.current = true
            const initImage = initialData?.image || null
            const initScale = initialData?.scale || 1
            const initX = initialData?.offsetX || 0
            const initY = initialData?.offsetY || 0

            setImage(initImage)
            setScale(initScale)
            setOffsetX(initX)
            setOffsetY(initY)
            setStep('edit')

            posRef.current = { offsetX: initX, offsetY: initY, scale: initScale }

            if (!initImage) {
                setTimeout(() => triggerFileInput(), 150)
            }

            document.body.style.overflow = 'hidden'
            document.documentElement.style.overflow = 'hidden'
        }

        if (!isOpen) {
            hasInitialized.current = false
            document.body.style.overflow = ''
            document.documentElement.style.overflow = ''
        }

        return () => {
            document.body.style.overflow = ''
            document.documentElement.style.overflow = ''
        }
    }, [isOpen])

    useEffect(() => {
        const handleResize = () => setBreakpoint(getBreakpoint())
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // ============================================
    // 3. POINTER EVENT HANDLERS
    // ============================================
    const handlePointerDown = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()

        // Track this pointer
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

        // Capture pointer to this element
        if (e.target.setPointerCapture) {
            e.target.setPointerCapture(e.pointerId)
        }

        if (pointers.current.size === 2) {
            // Two fingers down - pinch start
            const pts = Array.from(pointers.current.values())
            const dx = pts[0].x - pts[1].x
            const dy = pts[0].y - pts[1].y
            initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy)
            initialScaleRef.current = posRef.current.scale
            isDragging.current = false
        } else if (pointers.current.size === 1) {
            // Single finger - drag start
            isDragging.current = true
            activePointerId.current = e.pointerId
            lastPointer.current = { x: e.clientX, y: e.clientY }
        }

        console.log('[Pointer] Down:', e.pointerId, 'Total:', pointers.current.size)
    }, [])

    const handlePointerMove = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()

        // Update this pointer's position
        if (pointers.current.has(e.pointerId)) {
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        }

        if (pointers.current.size === 2) {
            // Pinch zoom
            const pts = Array.from(pointers.current.values())
            const dx = pts[0].x - pts[1].x
            const dy = pts[0].y - pts[1].y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (initialPinchDistance.current > 0) {
                const newScale = Math.min(3, Math.max(0.5, initialScaleRef.current * (distance / initialPinchDistance.current)))
                posRef.current.scale = newScale
                setScale(newScale)
            }
        } else if (isDragging.current && e.pointerId === activePointerId.current) {
            // Pan
            const dx = e.clientX - lastPointer.current.x
            const dy = e.clientY - lastPointer.current.y

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

            lastPointer.current = { x: e.clientX, y: e.clientY }

            console.log('[Pointer] Move:', newX, newY)
        }
    }, [])

    const handlePointerUp = useCallback((e) => {
        e.preventDefault()

        // Release pointer capture
        if (e.target.releasePointerCapture) {
            try {
                e.target.releasePointerCapture(e.pointerId)
            } catch (err) { /* ignore */ }
        }

        // Remove this pointer
        pointers.current.delete(e.pointerId)

        if (pointers.current.size === 0) {
            isDragging.current = false
            activePointerId.current = null
            initialPinchDistance.current = 0
        } else if (pointers.current.size === 1) {
            // Transition from pinch to pan
            isDragging.current = true
            const remaining = Array.from(pointers.current.entries())[0]
            activePointerId.current = remaining[0]
            lastPointer.current = { x: remaining[1].x, y: remaining[1].y }
        }

        console.log('[Pointer] Up:', e.pointerId, 'Remaining:', pointers.current.size)
    }, [])

    // ============================================
    // 4. DYNAMIC FILE INPUT
    // ============================================
    const triggerFileInput = useCallback(() => {
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
                    setImage(dataURI)
                    setScale(1)
                    setOffsetX(0)
                    setOffsetY(0)
                    posRef.current = { offsetX: 0, offsetY: 0, scale: 1 }
                } catch (error) {
                    alert('Error loading image.')
                }
            }
            document.body.removeChild(input)
        }

        document.body.appendChild(input)
        input.click()
    }, [])

    // ============================================
    // 5. STEP HANDLERS
    // ============================================
    const handleNext = useCallback(() => {
        if (!image) return

        const lsKey = `hero_${businessId}`
        const storageData = {
            image: image,
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
                image: image,
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
    }, [originalFile, demoMode, businessId, image, onSave, onClose])

    if (!isOpen) return null

    // ============================================
    // 6. RENDER
    // ============================================

    // PREVIEW STEP
    if (step === 'preview') {
        return (
            <div
                data-form-type="other"
                style={{
                    position: 'fixed', inset: 0, background: '#000', zIndex: 99999,
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
                position: 'fixed', inset: 0, background: '#000', zIndex: 99999,
                touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none'
            }}
        >
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.3 }}>
                <Home config={config} />
                <StaticBottomNav />
            </div>

            <div style={{ position: 'absolute', top: coverHeight, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', pointerEvents: 'none', zIndex: 5 }} />

            {/* INTERACTIVE CROP FRAME - Pointer Events */}
            <div
                ref={containerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: coverHeight,
                    overflow: 'hidden',
                    cursor: 'move',
                    zIndex: 1000,
                    border: '3px solid #22C55E',
                    boxShadow: '0 0 0 4px rgba(34,197,94,0.4), inset 0 0 30px rgba(0,0,0,0.3)',
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    pointerEvents: 'auto'
                }}
            >
                {image ? (
                    <div
                        style={{
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
                            pointerEvents: 'none',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            WebkitTouchCallout: 'none'
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
                        <span style={{ color: '#9CA3AF', fontSize: 14 }}>Tap 📷</span>
                    </div>
                )}
            </div>

            {/* BUTTONS */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                paddingTop: 'max(12px, env(safe-area-inset-top))', paddingLeft: 12, paddingRight: 12,
                display: 'flex', justifyContent: 'space-between', zIndex: 2000, pointerEvents: 'none'
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