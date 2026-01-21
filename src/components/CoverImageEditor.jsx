/**
 * CoverImageEditor.jsx - V6 Hero Editor
 * 
 * 2-STAGE WORKFLOW:
 *   STAGE 1 (ADJUST): 30% dark overlay + Rule-of-Thirds grid + Pinch/Zoom
 *   STAGE 2 (VERIFY): Full color preview + Green "Save" button (top right)
 * 
 * HARDWARE OPTIMIZATION:
 *   - GPU-accelerated transforms (translate3d + scale)
 *   - Passive touch listeners
 *   - Async-safe API calls
 * 
 * CRASH-PROOF SAVE:
 *   - Defensive null checks on businessId
 *   - try/catch on all Supabase calls
 *   - Error-first response handling
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
const COVER_HEIGHTS = { mobile: 260, tablet: 320 }
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const SNAP_THRESHOLD = 6 // px for center snap

function getBreakpoint() {
    return window.innerWidth >= 768 ? 'tablet' : 'mobile'
}

// ============================================
// V6 COVER IMAGE EDITOR
// ============================================
function CoverImageEditor({ isOpen, onClose, onSave }) {
    const { tenantData, businessId, refreshTenant } = useTenant()

    // ============================================
    // STATE: Workflow Stage
    // ============================================
    const [stage, setStage] = useState('select') // 'select' | 'adjust' | 'verify'

    // ============================================
    // STATE: Image & Transform (Hardware Accelerated)
    // ============================================
    const [image, setImage] = useState(null)
    const [originalFile, setOriginalFile] = useState(null)
    const [zoom, setZoom] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [breakpoint, setBreakpoint] = useState(getBreakpoint())

    // ============================================
    // STATE: Snap Assist Visual Feedback
    // ============================================
    const [snappedX, setSnappedX] = useState(false)
    const [snappedY, setSnappedY] = useState(false)

    // ============================================
    // STATE: UI Feedback
    // ============================================
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState(null)

    // ============================================
    // REFS: Gesture Tracking
    // ============================================
    const isDragging = useRef(false)
    const lastTouch = useRef({ x: 0, y: 0 })
    const initialPinchDistance = useRef(0)
    const initialZoom = useRef(1)
    const fileInputRef = useRef(null)

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
    // EFFECT: Cleanup Blob URLs
    // ============================================
    useEffect(() => {
        return () => {
            if (image && image.startsWith('blob:')) {
                URL.revokeObjectURL(image)
            }
        }
    }, [image])

    // ============================================
    // EFFECT: Auto-open file picker on mount
    // ============================================
    useEffect(() => {
        if (isOpen && stage === 'select' && !image) {
            const timer = setTimeout(() => fileInputRef.current?.click(), 150)
            return () => clearTimeout(timer)
        }
    }, [isOpen, stage, image])

    // ============================================
    // SNAP ASSIST: Gently snap to center
    // ============================================
    const applySnapAssist = useCallback((newX, newY) => {
        let finalX = newX
        let finalY = newY
        let isSnappedX = false
        let isSnappedY = false

        if (Math.abs(newX) <= SNAP_THRESHOLD) {
            finalX = 0
            isSnappedX = true
        }
        if (Math.abs(newY) <= SNAP_THRESHOLD) {
            finalY = 0
            isSnappedY = true
        }

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
            console.error('[CoverImageEditor] Error processing image:', err)
            alert('Error loading image. Please try a smaller file.')
        }
    }

    // ============================================
    // GESTURE: Touch Handlers (Pinch + Drag)
    // ============================================
    const handleTouchStart = (e) => {
        e.preventDefault()
        if (e.touches.length === 2) {
            // Pinch start
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy)
            initialZoom.current = zoom
        } else if (e.touches.length === 1) {
            // Drag start
            isDragging.current = true
            lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
    }

    const handleTouchMove = (e) => {
        e.preventDefault()
        if (e.touches.length === 2) {
            // Pinch zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM,
                initialZoom.current * (distance / initialPinchDistance.current)
            ))
            setZoom(newZoom)
        } else if (e.touches.length === 1 && isDragging.current) {
            // Drag pan
            const dx = e.touches[0].clientX - lastTouch.current.x
            const dy = e.touches[0].clientY - lastTouch.current.y
            const newOffset = applySnapAssist(offset.x + dx, offset.y + dy)
            setOffset(newOffset)
            lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
    }

    const handleTouchEnd = () => {
        isDragging.current = false
    }

    // ============================================
    // GESTURE: Mouse Handlers (Desktop Fallback)
    // ============================================
    const handleMouseDown = (e) => {
        isDragging.current = true
        lastTouch.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e) => {
        if (!isDragging.current) return
        const dx = e.clientX - lastTouch.current.x
        const dy = e.clientY - lastTouch.current.y
        const newOffset = applySnapAssist(offset.x + dx, offset.y + dy)
        setOffset(newOffset)
        lastTouch.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
        isDragging.current = false
    }

    // ============================================
    // ZOOM CONTROLS (Button Fallback)
    // ============================================
    const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, MAX_ZOOM))
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, MIN_ZOOM))
    const handleReset = () => { setZoom(1); setOffset({ x: 0, y: 0 }) }

    // ============================================
    // STAGE TRANSITIONS
    // ============================================
    const goToVerify = () => setStage('verify')
    const goToAdjust = () => setStage('adjust')

    // ============================================
    // CRASH-PROOF SAVE LOGIC
    // ============================================
    const handleFinalSave = async () => {
        // 🛡️ DEFENSIVE: Check for businessId
        if (!businessId) {
            console.error('[CoverImageEditor] BLOCKED: No businessId')
            setSaveError('Error: No business ID found. Please reload.')
            return
        }

        // 🛡️ DEFENSIVE: Check for heroMode='text' (Constraint 2)
        if (tenantData?.hero_mode === 'text') {
            setSaveError('El Hero está en modo Texto. Cambia a Imagen primero.')
            return
        }

        setIsSaving(true)
        setSaveError(null)

        try {
            let heroUrl = image

            // Upload to Supabase if we have original file
            if (originalFile) {
                console.log('[CoverImageEditor] Uploading to Supabase...')
                const { url, error: uploadError } = await uploadAsset(originalFile, businessId, 'branding')

                // 🛡️ ERROR-FIRST: Check error BEFORE data
                if (uploadError) {
                    console.error('[CoverImageEditor] Upload failed:', uploadError)
                    setSaveError(`Upload failed: ${uploadError.message || 'Unknown error'}`)
                    setIsSaving(false)
                    return
                }

                heroUrl = url
                console.log('[CoverImageEditor] Upload success:', heroUrl)
            }

            // Construct payload with hero_settings
            const payload = {
                hero_url: heroUrl,
                hero_mode: 'image',
                hero_settings: JSON.stringify({ zoom, offset })
            }

            // Update branding table
            const { error: dbError } = await updateBranding(payload, businessId)

            // 🛡️ ERROR-FIRST: Check error BEFORE proceeding
            if (dbError) {
                console.error('[CoverImageEditor] DB update failed:', dbError)
                setSaveError(`Save failed: ${dbError.message || 'Unknown error'}`)
                setIsSaving(false)
                return
            }

            console.log('[CoverImageEditor] Save success!')

            // Refresh tenant context
            if (refreshTenant) await refreshTenant()

            // Notify parent
            if (onSave) onSave({ image: heroUrl, zoom, offset })
            if (onClose) onClose()

        } catch (err) {
            console.error('[CoverImageEditor] Unexpected error:', err)
            setSaveError(`Unexpected error: ${err.message}`)
        } finally {
            setIsSaving(false)
        }
    }

    // ============================================
    // CANCEL / CLOSE
    // ============================================
    const handleCancel = () => {
        if (image && image.startsWith('blob:')) {
            URL.revokeObjectURL(image)
        }
        setImage(null)
        setOriginalFile(null)
        setStage('select')
        setZoom(1)
        setOffset({ x: 0, y: 0 })
        if (onClose) onClose()
    }

    // ============================================
    // EARLY RETURN: Not open
    // ============================================
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

                {/* Header */}
                <div style={styles.header}>
                    <button onClick={handleCancel} style={styles.cancelBtn}>✕ Cancelar</button>
                    <span style={styles.headerTitle}>Hero Cover</span>
                    <div style={{ width: 80 }} />
                </div>

                {/* Select Zone */}
                <div style={styles.selectZone}>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={styles.uploadBox}
                    >
                        <span style={{ fontSize: 48 }}>📷</span>
                        <span>Seleccionar Imagen</span>
                    </div>

                    {tenantData?.hero_url && (
                        <div style={styles.currentPreview}>
                            <span style={{ fontSize: 12, color: '#888' }}>Imagen Actual:</span>
                            <img src={tenantData.hero_url} alt="Current" style={styles.thumbnail} />
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ============================================
    // RENDER: ADJUST STAGE (30% Overlay + Grid)
    // ============================================
    if (stage === 'adjust') {
        return (
            <div style={styles.fullscreen}>
                {/* Frozen Home Preview (30% opacity) */}
                <div style={styles.frozenHomeContainer}>
                    <Home config={getConfig()} />
                </div>

                {/* Dark Overlay Below Crop Frame */}
                <div style={{
                    ...styles.darkOverlay,
                    top: coverHeight
                }} />

                {/* Crop Frame */}
                <div
                    style={{
                        ...styles.cropFrame,
                        height: coverHeight
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Image with GPU Transform */}
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

                    {/* 30% Dark Overlay (Simulates Hero Text Contrast) */}
                    <div style={styles.adjustOverlay} />

                    {/* Rule of Thirds Grid */}
                    <div style={styles.gridV1} />
                    <div style={styles.gridV2} />
                    <div style={styles.gridH1} />
                    <div style={styles.gridH2} />

                    {/* Center Snap Indicator */}
                    {(snappedX && snappedY) && (
                        <div style={styles.centerDot} />
                    )}
                </div>

                {/* Header Controls */}
                <div style={styles.floatingHeader}>
                    <button onClick={handleCancel} style={styles.floatingCancelBtn}>
                        ✕ Cancelar
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} style={styles.floatingBtn}>
                        📷
                    </button>
                    <button onClick={goToVerify} disabled={!image} style={{
                        ...styles.floatingContinueBtn,
                        opacity: image ? 1 : 0.5
                    }}>
                        Continuar →
                    </button>
                </div>

                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                {/* Zoom Indicator */}
                <div style={{ ...styles.zoomBadge, top: coverHeight + 12 }}>
                    ↕ Drag • Pinch to zoom • {Math.round(zoom * 100)}%
                </div>

                {/* Zoom Controls */}
                <div style={{ ...styles.zoomControls, top: coverHeight + 50 }}>
                    <button onClick={handleZoomOut} style={styles.zoomBtn}>−</button>
                    <button onClick={handleReset} style={styles.zoomBtn}>↺</button>
                    <button onClick={handleZoomIn} style={styles.zoomBtn}>+</button>
                </div>
            </div>
        )
    }

    // ============================================
    // RENDER: VERIFY STAGE (Full Color + Green Save)
    // ============================================
    if (stage === 'verify') {
        return (
            <div style={styles.fullscreen}>
                {/* Frozen Home Preview (FULL COLOR) */}
                <div style={{ ...styles.frozenHomeContainer, opacity: 1 }}>
                    <Home config={getConfig()} />
                </div>

                {/* Crop Frame (Full Color, No Overlay) */}
                <div style={{
                    ...styles.cropFrame,
                    height: coverHeight,
                    border: '3px solid #22C55E',
                    boxShadow: '0 0 0 4px rgba(34,197,94,0.4)'
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
                            transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
                            willChange: 'transform'
                        }} />
                    )}
                </div>

                {/* Header with Save Button */}
                <div style={styles.floatingHeader}>
                    <button onClick={goToAdjust} style={styles.floatingCancelBtn}>
                        ← Ajustar
                    </button>
                    <span style={{ color: '#fff', fontWeight: 600 }}>Verificar</span>
                    <button
                        onClick={handleFinalSave}
                        disabled={isSaving}
                        style={{
                            ...styles.greenSaveBtn,
                            opacity: isSaving ? 0.6 : 1
                        }}
                    >
                        {isSaving ? '⏳' : '✓'} Guardar
                    </button>
                </div>

                {/* Error Banner */}
                {saveError && (
                    <div style={styles.errorBanner}>{saveError}</div>
                )}

                {/* Info Badge */}
                <div style={{ ...styles.zoomBadge, top: coverHeight + 12, background: '#22C55E' }}>
                    ✓ Toca "Guardar" para confirmar
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
    fullscreen: {
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 9999,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        background: 'rgba(0,0,0,0.8)'
    },
    headerTitle: {
        color: '#fff',
        fontWeight: 600,
        fontSize: 18
    },
    cancelBtn: {
        background: 'transparent',
        border: 'none',
        color: '#EF4444',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer'
    },
    selectZone: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: 24
    },
    uploadBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: 48,
        border: '2px dashed #444',
        borderRadius: 16,
        cursor: 'pointer',
        color: '#888',
        fontSize: 16
    },
    currentPreview: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8
    },
    thumbnail: {
        width: 120,
        height: 80,
        objectFit: 'cover',
        borderRadius: 8,
        border: '1px solid #333'
    },
    frozenHomeContainer: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.3
    },
    darkOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.75)',
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
        border: '3px solid #3B82F6',
        boxShadow: '0 0 0 4px rgba(59,130,246,0.4), inset 0 0 30px rgba(0,0,0,0.3)',
        touchAction: 'none'
    },
    adjustOverlay: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        zIndex: 7
    },
    gridV1: {
        position: 'absolute',
        left: '33.33%',
        top: 0,
        bottom: 0,
        width: 1,
        background: 'rgba(255,255,255,0.4)',
        borderStyle: 'dashed',
        pointerEvents: 'none',
        zIndex: 8
    },
    gridV2: {
        position: 'absolute',
        left: '66.66%',
        top: 0,
        bottom: 0,
        width: 1,
        background: 'rgba(255,255,255,0.4)',
        borderStyle: 'dashed',
        pointerEvents: 'none',
        zIndex: 8
    },
    gridH1: {
        position: 'absolute',
        top: '33.33%',
        left: 0,
        right: 0,
        height: 1,
        background: 'rgba(255,255,255,0.4)',
        borderStyle: 'dashed',
        pointerEvents: 'none',
        zIndex: 8
    },
    gridH2: {
        position: 'absolute',
        top: '66.66%',
        left: 0,
        right: 0,
        height: 1,
        background: 'rgba(255,255,255,0.4)',
        borderStyle: 'dashed',
        pointerEvents: 'none',
        zIndex: 8
    },
    centerDot: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 12,
        height: 12,
        marginLeft: -6,
        marginTop: -6,
        borderRadius: '50%',
        background: '#22C55E',
        boxShadow: '0 0 8px rgba(34,197,94,0.6)',
        pointerEvents: 'none',
        zIndex: 11
    },
    floatingHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingLeft: 12,
        paddingRight: 12,
        paddingBottom: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        pointerEvents: 'none'
    },
    floatingCancelBtn: {
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
        pointerEvents: 'auto',
        touchAction: 'manipulation'
    },
    floatingBtn: {
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
        pointerEvents: 'auto',
        touchAction: 'manipulation'
    },
    floatingContinueBtn: {
        minWidth: 44,
        minHeight: 44,
        padding: '8px 14px',
        background: '#3B82F6',
        color: '#fff',
        border: 'none',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        pointerEvents: 'auto',
        touchAction: 'manipulation'
    },
    greenSaveBtn: {
        minWidth: 44,
        minHeight: 44,
        padding: '8px 16px',
        background: '#22C55E',
        color: '#fff',
        border: 'none',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        pointerEvents: 'auto',
        touchAction: 'manipulation',
        boxShadow: '0 4px 12px rgba(34,197,94,0.4)'
    },
    zoomBadge: {
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#3B82F6',
        color: '#fff',
        fontSize: 11,
        fontWeight: 600,
        padding: '6px 14px',
        borderRadius: 20,
        zIndex: 10,
        whiteSpace: 'nowrap'
    },
    zoomControls: {
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 12,
        zIndex: 10
    },
    zoomBtn: {
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.9)',
        border: 'none',
        color: '#000',
        fontSize: 20,
        fontWeight: 600,
        cursor: 'pointer'
    },
    errorBanner: {
        position: 'absolute',
        bottom: 80,
        left: 16,
        right: 16,
        background: '#B91C1C',
        color: '#fff',
        padding: 12,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 14,
        zIndex: 100
    }
}

export default CoverImageEditor
