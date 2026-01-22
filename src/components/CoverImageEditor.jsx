/**
 * CoverImageEditor.jsx — NUCLEAR AUTOFILL KILL
 * 
 * FIXES:
 * 1. contentEditable="false" — Prevents text selection trigger
 * 2. inputMode="none" — Prevents keyboard popup
 * 3. onContextMenu preventDefault — Kills right-click/long-press menu
 * 4. tabIndex="-1" — Prevents focus stealing
 * 5. data-lpignore="true" — Blocks password managers
 */

import { useState, useRef, useEffect } from 'react'
import { useTenant } from '../contexts/TenantContext.jsx'
import { uploadAsset, updateBranding } from '../lib/supabaseClient.js'
import { processAndStoreImage } from '../utils/imageOptimizer.js'
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
    const initialPinchDist = useRef(0)
    const fileInputRef = useRef(null)
    const cropFrameRef = useRef(null)
    const posRef = useRef({ x: 0, y: 0, scale: 1, initialScale: 1 })

    const coverHeight = COVER_HEIGHTS[breakpoint]

    // KILL CONTEXT MENU GLOBALLY
    const killMenu = (e) => {
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    // ============================================
    // SCROLL LOCK + AUTOFILL DESTRUCTION
    // ============================================
    useEffect(() => {
        if (!isOpen) return

        const scrollY = window.scrollY
        document.body.style.overflow = 'hidden'
        document.body.style.position = 'fixed'
        document.body.style.width = '100%'
        document.body.style.top = `-${scrollY}px`
        document.body.style.setProperty('touch-action', 'none', 'important')
        document.documentElement.style.setProperty('touch-action', 'none', 'important')
        document.body.style.setProperty('-webkit-touch-callout', 'none', 'important')
        document.body.style.setProperty('user-select', 'none', 'important')
        document.body.style.setProperty('-webkit-user-select', 'none', 'important')

        // NUCLEAR: Block context menu on entire document
        document.addEventListener('contextmenu', killMenu, { capture: true })
        document.addEventListener('selectstart', killMenu, { capture: true })

        return () => {
            document.body.style.overflow = ''
            document.body.style.position = ''
            document.body.style.width = ''
            document.body.style.top = ''
            document.body.style.removeProperty('touch-action')
            document.documentElement.style.removeProperty('touch-action')
            document.body.style.removeProperty('-webkit-touch-callout')
            document.body.style.removeProperty('user-select')
            document.body.style.removeProperty('-webkit-user-select')
            document.removeEventListener('contextmenu', killMenu, { capture: true })
            document.removeEventListener('selectstart', killMenu, { capture: true })
            window.scrollTo(0, scrollY)
        }
    }, [isOpen])

    useEffect(() => {
        posRef.current.x = offsetX
        posRef.current.y = offsetY
        posRef.current.scale = scale
    }, [offsetX, offsetY, scale])

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
            posRef.current = { x: 0, y: 0, scale: 1, initialScale: 1 }
            initialPinchDist.current = 0
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
            posRef.current = { x: 0, y: 0, scale: 1, initialScale: 1 }
        } catch (err) { alert('Error loading image') }
    }

    // ============================================
    // NATIVE TOUCH ENGINE
    // ============================================
    useEffect(() => {
        const frame = cropFrameRef.current
        if (!frame || !image || step !== 'edit') return

        const handleStart = (e) => {
            e.preventDefault()
            e.stopPropagation()
            const touch = e.touches ? e.touches[0] : e
            isDragging.current = true
            lastTouch.current = { x: touch.clientX, y: touch.clientY }

            posRef.current.x = offsetX
            posRef.current.y = offsetY

            if (e.touches && e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX
                const dy = e.touches[0].clientY - e.touches[1].clientY
                initialPinchDist.current = Math.sqrt(dx * dx + dy * dy)
                posRef.current.initialScale = posRef.current.scale
            }
        }

        const handleMove = (e) => {
            if (e.cancelable) {
                e.preventDefault()
                e.stopPropagation()
            }

            if (e.touches && e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX
                const dy = e.touches[0].clientY - e.touches[1].clientY
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (initialPinchDist.current > 0) {
                    const newScale = Math.min(3, Math.max(0.5, posRef.current.initialScale * (dist / initialPinchDist.current)))
                    posRef.current.scale = newScale
                    setScale(newScale)
                }
            } else if (isDragging.current && e.touches && e.touches.length === 1) {
                const touch = e.touches[0]
                const dx = touch.clientX - lastTouch.current.x
                const dy = touch.clientY - lastTouch.current.y
                let nx = posRef.current.x + dx
                let ny = posRef.current.y + dy

                let isX = false, isY = false
                if (Math.abs(nx) < SNAP_THRESHOLD) { nx = 0; isX = true }
                if (Math.abs(ny) < SNAP_THRESHOLD) { ny = 0; isY = true }

                posRef.current.x = nx
                posRef.current.y = ny
                setOffsetX(nx)
                setOffsetY(ny)
                setSnappedX(isX)
                setSnappedY(isY)
                lastTouch.current = { x: touch.clientX, y: touch.clientY }
            }
        }

        const handleEnd = (e) => {
            if (e.cancelable) e.preventDefault()
            isDragging.current = false
            initialPinchDist.current = 0
        }

        frame.addEventListener('touchstart', handleStart, { passive: false, capture: true })
        frame.addEventListener('touchmove', handleMove, { passive: false, capture: true })
        frame.addEventListener('touchend', handleEnd, { passive: false, capture: true })
        frame.addEventListener('contextmenu', killMenu, { capture: true })

        return () => {
            frame.removeEventListener('touchstart', handleStart, { capture: true })
            frame.removeEventListener('touchmove', handleMove, { capture: true })
            frame.removeEventListener('touchend', handleEnd, { capture: true })
            frame.removeEventListener('contextmenu', killMenu, { capture: true })
        }
    }, [image, step, offsetX, offsetY])

    const handleSave = async () => {
        if (!businessId) return alert('No Business ID')
        if (!originalFile) return alert('No new image selected')
        setIsSaving(true)
        try {
            const res = await uploadAsset(originalFile, businessId, 'branding')
            if (res.error) throw res.error

            const { error } = await updateBranding({
                hero_url: res.url,
                hero_mode: 'image',
                hero_settings: JSON.stringify({ scale, offsetX, offsetY }),
                updated_at: new Date().toISOString()
            }, businessId)
            if (error) throw error

            try { await refreshTenant?.() } catch (e) { console.warn(e) }
            onSave?.({ image: res.url, scale, offsetX, offsetY })
            onClose?.()
        } catch (err) {
            alert('Save Failed: ' + err.message)
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    // NUCLEAR ANTI-AUTOFILL ATTRIBUTES
    const antiAutofill = {
        role: 'presentation',
        'aria-hidden': true,
        autoComplete: 'off',
        autoCorrect: 'off',
        autoCapitalize: 'off',
        spellCheck: false,
        contentEditable: false,
        inputMode: 'none',
        tabIndex: -1,
        'data-lpignore': 'true',
        'data-form-type': 'other',
        onContextMenu: killMenu,
        onSelect: killMenu
    }

    const containerStyles = {
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 99999,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        MozUserSelect: 'none',
        cursor: 'default'
    }

    const btnBase = {
        pointerEvents: 'auto',
        border: 'none',
        cursor: 'pointer',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        appearance: 'none',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent'
    }

    // ============================================
    // RENDER: EDIT MODE
    // ============================================
    if (step === 'edit') {
        return (
            <div {...antiAutofill} style={containerStyles}>
                {/* CROP FRAME */}
                <div
                    ref={cropFrameRef}
                    {...antiAutofill}
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
                        <div
                            {...antiAutofill}
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
                                transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
                                willChange: 'transform',
                                pointerEvents: 'none'
                            }}
                        />
                    )}

                    {!image && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            pointerEvents: 'none'
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

                <div style={{ position: 'absolute', top: coverHeight, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 5, pointerEvents: 'none' }} />

                {/* TOP BAR */}
                <div {...antiAutofill} style={{
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
                        type="button"
                        onClick={onClose}
                        onContextMenu={killMenu}
                        style={{ ...btnBase, background: 'rgba(0,0,0,0.9)', color: '#ff6b6b', padding: '12px 20px', borderRadius: 24, fontWeight: '700', fontSize: 15 }}
                    >
                        ✕ Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        onContextMenu={killMenu}
                        style={{ ...btnBase, background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '12px 20px', borderRadius: 24, fontWeight: '600', fontSize: 20 }}
                    >
                        📷
                    </button>
                    <button
                        type="button"
                        onClick={() => setStep('preview')}
                        onContextMenu={killMenu}
                        disabled={!image}
                        style={{ ...btnBase, background: image ? '#3B82F6' : '#333', color: '#fff', padding: '12px 20px', borderRadius: 24, fontWeight: '700', fontSize: 15, opacity: image ? 1 : 0.4, cursor: image ? 'pointer' : 'not-allowed' }}
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

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    tabIndex={-1}
                    style={{ display: 'none' }}
                />
            </div>
        )
    }

    // ============================================
    // RENDER: PREVIEW MODE
    // ============================================
    if (step === 'preview') {
        return (
            <div {...antiAutofill} style={{ ...containerStyles, background: '#1a1a1a' }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: coverHeight,
                    overflow: 'hidden',
                    background: '#111'
                }}>
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
                        pointerEvents: 'none'
                    }} />
                </div>

                <div style={{
                    position: 'absolute',
                    top: coverHeight / 2,
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    padding: '8px 24px',
                    borderRadius: 20,
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: 1,
                    zIndex: 100,
                    pointerEvents: 'none'
                }}>
                    PREVIEW
                </div>

                <div style={{
                    position: 'absolute',
                    top: coverHeight,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, #2a2a2a, #1a1a1a)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: 40,
                    gap: 16
                }}>
                    <div style={{ width: '80%', height: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 10 }} />
                    <div style={{ width: '60%', height: 20, background: 'rgba(255,255,255,0.08)', borderRadius: 10 }} />
                    <div style={{ width: '70%', height: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 10 }} />
                </div>

                <div {...antiAutofill} style={{
                    position: 'fixed',
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
                        type="button"
                        onClick={() => setStep('edit')}
                        onContextMenu={killMenu}
                        style={{ ...btnBase, background: 'rgba(0,0,0,0.9)', color: '#fff', padding: '12px 24px', borderRadius: 28, fontWeight: 700, fontSize: 15 }}
                    >
                        ← Back
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        onContextMenu={killMenu}
                        disabled={isSaving}
                        style={{ ...btnBase, background: '#22C55E', color: '#fff', padding: '12px 28px', borderRadius: 28, fontWeight: 800, fontSize: 15, boxShadow: '0 4px 16px rgba(34,197,94,0.4)', cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1 }}
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