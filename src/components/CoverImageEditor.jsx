/**
 * CoverImageEditor.jsx - V6 Hero Editor (POLISHED)
 * 
 * NATIVE FEEL:
 *   - No visible zoom buttons (100% pinch-to-zoom + drag)
 *   - Grid fades in/out during interaction only
 *   - Minimal UI: just Cancel/Save in top bar
 * 
 * ACCURATE DIMENSIONS:
 *   - Mobile: 280px (matches Home hero header)
 *   - Tablet: 360px
 * 
 * SMART SAVE:
 *   - Forces hero_mode: 'image' on save (no conflict errors)
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTenant } from '../contexts/TenantContext.jsx'
import { uploadAsset, updateBranding } from '../lib/supabaseClient.js'
import { processAndStoreImage } from '../utils/imageOptimizer.js'
import Home from '../pages/customer/Home.jsx'
import { getConfig } from '../config/appConfig.v2.js'

// ============================================
// CONSTANTS (Matched to Home.jsx hero height)
// ============================================
const COVER_HEIGHTS = { mobile: 280, tablet: 360 }
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const SNAP_THRESHOLD = 6

function getBreakpoint() {
    return window.innerWidth >= 768 ? 'tablet' : 'mobile'
}

// ============================================
// V6 COVER IMAGE EDITOR (POLISHED)
// ============================================
function CoverImageEditor({ isOpen, onClose, onSave }) {
    const { tenantData, businessId, refreshTenant } = useTenant()

    // Workflow Stage
    const [stage, setStage] = useState('select') // 'select' | 'adjust' | 'verify'

    // Image & Transform
    const [image, setImage] = useState(null)
    const [originalFile, setOriginalFile] = useState(null)
    const [zoom, setZoom] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [breakpoint, setBreakpoint] = useState(getBreakpoint())

    // Interaction State (for grid visibility)
    const [isInteracting, setIsInteracting] = useState(false)
    const [snappedX, setSnappedX] = useState(false)
    const [snappedY, setSnappedY] = useState(false)

    // UI Feedback
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState(null)

    // Gesture Refs
    const isDragging = useRef(false)
    const lastTouch = useRef({ x: 0, y: 0 })
    const initialPinchDistance = useRef(0)
    const initialZoom = useRef(1)
    const fileInputRef = useRef(null)
    const interactionTimeout = useRef(null)

    const coverHeight = COVER_HEIGHTS[breakpoint]

    // ============================================
    // EFFECT: Breakpoint Listener
    // ============================================
    useEffect(() => {
        const handleResize = () => setBreakpoint(getBreakpoint())
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // ============================================
    // EFFECT: Cleanup
    // ============================================
    useEffect(() => {
        return () => {
            if (image?.startsWith('blob:')) URL.revokeObjectURL(image)
            if (interactionTimeout.current) clearTimeout(interactionTimeout.current)
        }
    }, [image])

    // ============================================
    // EFFECT: Auto-open file picker
    // ============================================
    useEffect(() => {
        if (isOpen && stage === 'select' && !image) {
            const timer = setTimeout(() => fileInputRef.current?.click(), 150)
            return () => clearTimeout(timer)
        }
    }, [isOpen, stage, image])

    // ============================================
    // INTERACTION TRACKING (for grid fade)
    // ============================================
    const startInteraction = useCallback(() => {
        setIsInteracting(true)
        if (interactionTimeout.current) clearTimeout(interactionTimeout.current)
    }, [])

    const endInteraction = useCallback(() => {
        if (interactionTimeout.current) clearTimeout(interactionTimeout.current)
        interactionTimeout.current = setTimeout(() => setIsInteracting(false), 800)
    }, [])

    // ============================================
    // SNAP ASSIST
    // ============================================
    const applySnapAssist = useCallback((newX, newY) => {
        let finalX = newX, finalY = newY
        let isSnappedX = false, isSnappedY = false

        if (Math.abs(newX) <= SNAP_THRESHOLD) { finalX = 0; isSnappedX = true }
        if (Math.abs(newY) <= SNAP_THRESHOLD) { finalY = 0; isSnappedY = true }

        setSnappedX(isSnappedX)
        setSnappedY(isSnappedY)
        return { x: finalX, y: finalY }
    }, [])

    // ============================================
    // FILE SELECTION
    // ============================================
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setOriginalFile(file)
            const { dataURI } = await processAndStoreImage(file)
            setImage(dataURI)
            setZoom(1)
            setOffset({ x: 0, y: 0 })
            setStage('adjust')
        } catch (err) {
            console.error('[CoverImageEditor] Error:', err)
            alert('Error loading image.')
        }
    }

    // ============================================
    // GESTURE: Touch Handlers
    // ============================================
    const handleTouchStart = (e) => {
        e.preventDefault()
        startInteraction()

        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy)
            initialZoom.current = zoom
        } else if (e.touches.length === 1) {
            isDragging.current = true
            lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
    }

    const handleTouchMove = (e) => {
        e.preventDefault()

        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM,
                initialZoom.current * (distance / initialPinchDistance.current)
            ))
            setZoom(newZoom)
        } else if (e.touches.length === 1 && isDragging.current) {
            const dx = e.touches[0].clientX - lastTouch.current.x
            const dy = e.touches[0].clientY - lastTouch.current.y
            setOffset(applySnapAssist(offset.x + dx, offset.y + dy))
            lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
    }

    const handleTouchEnd = () => {
        isDragging.current = false
        endInteraction()
    }

    // ============================================
    // GESTURE: Mouse Handlers
    // ============================================
    const handleMouseDown = (e) => {
        isDragging.current = true
        lastTouch.current = { x: e.clientX, y: e.clientY }
        startInteraction()
    }

    const handleMouseMove = (e) => {
        if (!isDragging.current) return
        const dx = e.clientX - lastTouch.current.x
        const dy = e.clientY - lastTouch.current.y
        setOffset(applySnapAssist(offset.x + dx, offset.y + dy))
        lastTouch.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
        isDragging.current = false
        endInteraction()
    }

    // ============================================
    // STAGE TRANSITIONS
    // ============================================
    const goToVerify = () => setStage('verify')
    const goToAdjust = () => setStage('adjust')

    // ============================================
    // SMART SAVE (Forces hero_mode: 'image')
    // ============================================
    const handleFinalSave = async () => {
        if (!businessId) {
            setSaveError('Error: No business ID.')
            return
        }

        setIsSaving(true)
        setSaveError(null)

        try {
            let heroUrl = image

            if (originalFile) {
                const { url, error: uploadError } = await uploadAsset(originalFile, businessId, 'branding')
                if (uploadError) {
                    setSaveError(`Upload: ${uploadError.message}`)
                    setIsSaving(false)
                    return
                }
                heroUrl = url
            }

            // 🛡️ SMART SAVE: Force hero_mode to 'image'
            const payload = {
                hero_url: heroUrl,
                hero_mode: 'image', // FORCE IMAGE MODE
                hero_settings: JSON.stringify({ zoom, offset }),
                updated_at: new Date().toISOString()
            }

            const { error: dbError } = await updateBranding(payload, businessId)
            if (dbError) {
                setSaveError(`Save: ${dbError.message}`)
                setIsSaving(false)
                return
            }

            if (refreshTenant) await refreshTenant()
            if (onSave) onSave({ image: heroUrl, zoom, offset })
            if (onClose) onClose()

        } catch (err) {
            setSaveError(`Error: ${err.message}`)
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
        setStage('select')
        setZoom(1)
        setOffset({ x: 0, y: 0 })
        if (onClose) onClose()
    }

    if (!isOpen) return null

    // ============================================
    // RENDER: SELECT STAGE
    // ============================================
    if (stage === 'select') {
        return (
            <div style={styles.fullscreen}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                <div style={styles.minimalHeader}>
                    <button onClick={handleCancel} style={styles.headerBtn}>✕</button>
                    <span style={styles.headerTitle}>Hero Cover</span>
                    <div style={{ width: 44 }} />
                </div>

                <div style={styles.selectZone}>
                    <div onClick={() => fileInputRef.current?.click()} style={styles.uploadBox}>
                        <span style={{ fontSize: 48 }}>📷</span>
                        <span style={{ fontSize: 14, opacity: 0.7 }}>Tap to select</span>
                    </div>

                    {tenantData?.hero_url && (
                        <div style={styles.currentPreview}>
                            <span style={{ fontSize: 11, color: '#666' }}>Current:</span>
                            <img src={tenantData.hero_url} alt="" style={styles.thumbnail} />
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ============================================
    // RENDER: ADJUST STAGE (Grid fades with interaction)
    // ============================================
    if (stage === 'adjust') {
        return (
            <div style={styles.fullscreen}>
                {/* Frozen Home (30% opacity) */}
                <div style={styles.frozenHome}>
                    <Home config={getConfig()} />
                </div>

                {/* Dark below crop */}
                <div style={{ ...styles.darkBelow, top: coverHeight }} />

                {/* Crop Frame */}
                <div
                    style={{ ...styles.cropFrame, height: coverHeight }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Image */}
                    {image && (
                        <div style={{
                            position: 'absolute',
                            width: '200%',
                            height: '200%',
                            left: '-50%',
                            top: '-50%',
                            backgroundImage: `url(${image})`,
                            backgroundSize: `${zoom * 100}%`,
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
                            willChange: 'transform'
                        }} />
                    )}

                    {/* 30% Overlay */}
                    <div style={styles.adjustOverlay} />

                    {/* Grid (fades with interaction) */}
                    <div style={{ ...styles.gridLine, left: '33.33%', top: 0, bottom: 0, width: 1, opacity: isInteracting ? 0.5 : 0 }} />
                    <div style={{ ...styles.gridLine, left: '66.66%', top: 0, bottom: 0, width: 1, opacity: isInteracting ? 0.5 : 0 }} />
                    <div style={{ ...styles.gridLine, top: '33.33%', left: 0, right: 0, height: 1, opacity: isInteracting ? 0.5 : 0 }} />
                    <div style={{ ...styles.gridLine, top: '66.66%', left: 0, right: 0, height: 1, opacity: isInteracting ? 0.5 : 0 }} />

                    {/* Center snap dot */}
                    {(snappedX && snappedY && isInteracting) && <div style={styles.centerDot} />}
                </div>

                {/* Minimal Header */}
                <div style={styles.floatingBar}>
                    <button onClick={handleCancel} style={styles.cancelBtn}>✕</button>
                    <button onClick={goToVerify} disabled={!image} style={{
                        ...styles.continueBtn,
                        opacity: image ? 1 : 0.4
                    }}>
                        Continue →
                    </button>
                </div>

                {/* Hidden input */}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            </div>
        )
    }

    // ============================================
    // RENDER: VERIFY STAGE (No grid, green save)
    // ============================================
    if (stage === 'verify') {
        return (
            <div style={styles.fullscreen}>
                {/* Frozen Home (full color) */}
                <div style={{ ...styles.frozenHome, opacity: 1 }}>
                    <Home config={getConfig()} />
                </div>

                {/* Crop Frame (green border) */}
                <div style={{
                    ...styles.cropFrame,
                    height: coverHeight,
                    border: '3px solid #22C55E',
                    boxShadow: '0 0 0 4px rgba(34,197,94,0.3)'
                }}>
                    {image && (
                        <div style={{
                            position: 'absolute',
                            width: '200%',
                            height: '200%',
                            left: '-50%',
                            top: '-50%',
                            backgroundImage: `url(${image})`,
                            backgroundSize: `${zoom * 100}%`,
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`
                        }} />
                    )}
                </div>

                {/* Minimal Header with Save */}
                <div style={styles.floatingBar}>
                    <button onClick={goToAdjust} style={styles.backBtn}>← Back</button>
                    <button onClick={handleFinalSave} disabled={isSaving} style={{
                        ...styles.saveBtn,
                        opacity: isSaving ? 0.6 : 1
                    }}>
                        {isSaving ? '...' : '✓ Save'}
                    </button>
                </div>

                {/* Error */}
                {saveError && <div style={styles.errorBanner}>{saveError}</div>}
            </div>
        )
    }

    return null
}

// ============================================
// STYLES (Minimal & Native)
// ============================================
const styles = {
    fullscreen: {
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 9999,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none'
    },
    minimalHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 'max(16px, env(safe-area-inset-top))'
    },
    headerTitle: {
        color: '#fff',
        fontWeight: 600,
        fontSize: 17
    },
    headerBtn: {
        width: 44,
        height: 44,
        background: 'transparent',
        border: 'none',
        color: '#fff',
        fontSize: 20,
        cursor: 'pointer'
    },
    selectZone: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24
    },
    uploadBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 40,
        border: '1px dashed #333',
        borderRadius: 12,
        cursor: 'pointer',
        color: '#888'
    },
    currentPreview: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4
    },
    thumbnail: {
        width: 100,
        height: 66,
        objectFit: 'cover',
        borderRadius: 6,
        border: '1px solid #222'
    },
    frozenHome: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.3
    },
    darkBelow: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        pointerEvents: 'none',
        zIndex: 5
    },
    cropFrame: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
        cursor: 'move',
        zIndex: 6,
        border: '2px solid rgba(255,255,255,0.3)',
        touchAction: 'none'
    },
    adjustOverlay: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        zIndex: 7
    },
    gridLine: {
        position: 'absolute',
        background: '#fff',
        pointerEvents: 'none',
        zIndex: 8,
        transition: 'opacity 0.3s ease'
    },
    centerDot: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 10,
        height: 10,
        marginLeft: -5,
        marginTop: -5,
        borderRadius: '50%',
        background: '#22C55E',
        boxShadow: '0 0 6px rgba(34,197,94,0.8)',
        pointerEvents: 'none',
        zIndex: 11
    },
    floatingBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100
    },
    cancelBtn: {
        padding: '10px 16px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: 'none',
        borderRadius: 8,
        color: '#ff6b6b',
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer'
    },
    backBtn: {
        padding: '10px 16px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: 'none',
        borderRadius: 8,
        color: '#888',
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer'
    },
    continueBtn: {
        padding: '10px 20px',
        background: 'rgba(59,130,246,0.9)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: 'none',
        borderRadius: 8,
        color: '#fff',
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer'
    },
    saveBtn: {
        padding: '10px 20px',
        background: '#22C55E',
        border: 'none',
        borderRadius: 8,
        color: '#fff',
        fontSize: 15,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 2px 12px rgba(34,197,94,0.4)'
    },
    errorBanner: {
        position: 'absolute',
        bottom: 60,
        left: 16,
        right: 16,
        background: '#B91C1C',
        color: '#fff',
        padding: 12,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 13,
        zIndex: 100
    }
}

export default CoverImageEditor
