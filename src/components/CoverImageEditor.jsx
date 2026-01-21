/**
 * CoverImageEditor.jsx - Facebook-Grade Cover Photo Editor
 * 
 * META DESIGN SYSTEM (vFB.5):
 *   - 220px mobile viewport (16:9 cinematic)
 *   - Pure gesture manipulation (no buttons)
 *   - Grid fades in only on touch
 *   - Minimal Cancel/Save top bar
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTenant } from '../contexts/TenantContext.jsx'
import { uploadAsset, updateBranding } from '../lib/supabaseClient.js'
import { processAndStoreImage } from '../utils/imageOptimizer.js'

// ============================================
// STRICT DIMENSIONS (Facebook Cover Ratio)
// ============================================
const VIEWPORT = { mobile: 220, tablet: 320 }
const ZOOM = { min: 1, max: 3 }

const getViewport = () => window.innerWidth >= 768 ? VIEWPORT.tablet : VIEWPORT.mobile

// ============================================
// FACEBOOK-GRADE COVER EDITOR
// ============================================
export default function CoverImageEditor({ isOpen, onClose, onSave }) {
    const { tenantData, businessId, refreshTenant } = useTenant()

    // Image State
    const [image, setImage] = useState(null)
    const [file, setFile] = useState(null)
    const [zoom, setZoom] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [height, setHeight] = useState(getViewport())

    // Interaction State
    const [isTouching, setIsTouching] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState(null)

    // Refs
    const dragRef = useRef({ active: false, x: 0, y: 0 })
    const pinchRef = useRef({ dist: 0, zoom: 1 })
    const inputRef = useRef(null)
    const fadeTimer = useRef(null)

    // ============================================
    // LIFECYCLE
    // ============================================
    useEffect(() => {
        const resize = () => setHeight(getViewport())
        window.addEventListener('resize', resize)
        return () => window.removeEventListener('resize', resize)
    }, [])

    useEffect(() => {
        return () => {
            if (image?.startsWith('blob:')) URL.revokeObjectURL(image)
            if (fadeTimer.current) clearTimeout(fadeTimer.current)
        }
    }, [image])

    useEffect(() => {
        if (isOpen && !image) {
            setTimeout(() => inputRef.current?.click(), 100)
        }
    }, [isOpen, image])

    // ============================================
    // TOUCH FADE LOGIC
    // ============================================
    const showGrid = useCallback(() => {
        setIsTouching(true)
        if (fadeTimer.current) clearTimeout(fadeTimer.current)
    }, [])

    const hideGrid = useCallback(() => {
        if (fadeTimer.current) clearTimeout(fadeTimer.current)
        fadeTimer.current = setTimeout(() => setIsTouching(false), 600)
    }, [])

    // ============================================
    // FILE HANDLER
    // ============================================
    const onFileChange = async (e) => {
        const f = e.target.files?.[0]
        if (!f) return
        try {
            setFile(f)
            const { dataURI } = await processAndStoreImage(f)
            setImage(dataURI)
            setZoom(1)
            setOffset({ x: 0, y: 0 })
        } catch (err) {
            alert('Error loading image')
        }
    }

    // ============================================
    // GESTURE: TOUCH (Pinch + Drag)
    // ============================================
    const onTouchStart = (e) => {
        e.preventDefault()
        showGrid()

        if (e.touches.length === 2) {
            // Pinch start
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            pinchRef.current = { dist: Math.hypot(dx, dy), zoom }
        } else if (e.touches.length === 1) {
            // Drag start
            dragRef.current = { active: true, x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
    }

    const onTouchMove = (e) => {
        e.preventDefault()

        if (e.touches.length === 2) {
            // Pinch zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const dist = Math.hypot(dx, dy)
            const newZoom = Math.min(ZOOM.max, Math.max(ZOOM.min,
                pinchRef.current.zoom * (dist / pinchRef.current.dist)
            ))
            setZoom(newZoom)
        } else if (e.touches.length === 1 && dragRef.current.active) {
            // Drag pan
            const dx = e.touches[0].clientX - dragRef.current.x
            const dy = e.touches[0].clientY - dragRef.current.y
            setOffset(o => ({ x: o.x + dx, y: o.y + dy }))
            dragRef.current.x = e.touches[0].clientX
            dragRef.current.y = e.touches[0].clientY
        }
    }

    const onTouchEnd = () => {
        dragRef.current.active = false
        hideGrid()
    }

    // ============================================
    // GESTURE: MOUSE (Desktop Fallback)
    // ============================================
    const onMouseDown = (e) => {
        dragRef.current = { active: true, x: e.clientX, y: e.clientY }
        showGrid()
    }

    const onMouseMove = (e) => {
        if (!dragRef.current.active) return
        const dx = e.clientX - dragRef.current.x
        const dy = e.clientY - dragRef.current.y
        setOffset(o => ({ x: o.x + dx, y: o.y + dy }))
        dragRef.current.x = e.clientX
        dragRef.current.y = e.clientY
    }

    const onMouseUp = () => {
        dragRef.current.active = false
        hideGrid()
    }

    // ============================================
    // SMART SAVE
    // ============================================
    const handleSave = async () => {
        if (!businessId) return setError('No business ID')

        setIsSaving(true)
        setError(null)

        try {
            let url = image

            if (file) {
                const res = await uploadAsset(file, businessId, 'branding')
                if (res.error) throw new Error(res.error.message || 'Upload failed')
                url = res.url
            }

            // Force hero_mode: 'image'
            const { error: dbErr } = await updateBranding({
                hero_url: url,
                hero_mode: 'image',
                hero_settings: JSON.stringify({ zoom, offset }),
                updated_at: new Date().toISOString()
            }, businessId)

            if (dbErr) throw new Error(dbErr.message || 'Save failed')

            await refreshTenant?.()
            onSave?.({ image: url, zoom, offset })
            onClose?.()
        } catch (err) {
            setError(err.message)
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
        setFile(null)
        onClose?.()
    }

    if (!isOpen) return null

    // ============================================
    // RENDER
    // ============================================
    return (
        <div style={S.screen}>
            {/* Hidden Input */}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                style={{ display: 'none' }}
            />

            {/* Top Bar */}
            <div style={S.topBar}>
                <button onClick={handleCancel} style={S.cancelBtn}>Cancel</button>
                <button
                    onClick={handleSave}
                    disabled={!image || isSaving}
                    style={{ ...S.saveBtn, opacity: (!image || isSaving) ? 0.5 : 1 }}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {/* Cover Viewport */}
            <div
                style={{ ...S.viewport, height }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
            >
                {image ? (
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
                ) : (
                    <div style={S.placeholder} onClick={() => inputRef.current?.click()}>
                        <span style={{ fontSize: 40 }}>📷</span>
                        <span style={{ fontSize: 13, opacity: 0.6 }}>Tap to select cover</span>
                    </div>
                )}

                {/* Rule of Thirds Grid (fades on touch) */}
                <div style={{ ...S.gridV, left: '33.33%', opacity: isTouching ? 0.4 : 0 }} />
                <div style={{ ...S.gridV, left: '66.66%', opacity: isTouching ? 0.4 : 0 }} />
                <div style={{ ...S.gridH, top: '33.33%', opacity: isTouching ? 0.4 : 0 }} />
                <div style={{ ...S.gridH, top: '66.66%', opacity: isTouching ? 0.4 : 0 }} />
            </div>

            {/* Dark Area Below */}
            <div style={{ ...S.darkArea, top: height + 56 }} />

            {/* Error */}
            {error && <div style={S.error}>{error}</div>}

            {/* Hint */}
            {image && (
                <div style={{ ...S.hint, top: height + 16 }}>
                    Pinch to zoom • Drag to position
                </div>
            )}
        </div>
    )
}

// ============================================
// STYLES (Meta Design System)
// ============================================
const S = {
    screen: {
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 9999
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 16,
        paddingRight: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100
    },
    cancelBtn: {
        padding: '8px 16px',
        background: 'transparent',
        border: 'none',
        color: '#fff',
        fontSize: 15,
        fontWeight: 500,
        cursor: 'pointer'
    },
    saveBtn: {
        padding: '8px 20px',
        background: '#0866FF',
        border: 'none',
        borderRadius: 6,
        color: '#fff',
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer'
    },
    viewport: {
        position: 'absolute',
        top: 56,
        left: 0,
        right: 0,
        overflow: 'hidden',
        cursor: 'move',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none'
    },
    placeholder: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        color: '#888',
        cursor: 'pointer'
    },
    gridV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 1,
        background: '#fff',
        pointerEvents: 'none',
        transition: 'opacity 0.3s ease',
        zIndex: 10
    },
    gridH: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        background: '#fff',
        pointerEvents: 'none',
        transition: 'opacity 0.3s ease',
        zIndex: 10
    },
    darkArea: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        background: '#000',
        pointerEvents: 'none'
    },
    hint: {
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#666',
        fontSize: 12,
        fontWeight: 500,
        textAlign: 'center',
        zIndex: 10
    },
    error: {
        position: 'absolute',
        bottom: 40,
        left: 16,
        right: 16,
        padding: 12,
        background: '#DC2626',
        borderRadius: 8,
        color: '#fff',
        fontSize: 13,
        textAlign: 'center',
        zIndex: 100
    }
}
