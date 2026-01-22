/**
 * CoverImageEditor.jsx — HYBRID MASTER BUILD
 * * CORE LOGIC:
 * 1. PHYSICS: Reverted to Dec 19 (Simple State-Based).
 * - Uses standard onTouchStart/Move/End.
 * - Trusts React State for coordinates (Fixes "Frozen" bug).
 * * 2. STORAGE: DeepSeek Hybrid Strategy.
 * - Uploads to Supabase (Backup/SSOT).
 * - Saves to LocalStorage (Performance).
 * - MEMORY FIX: Deletes old local image before saving new one (1 image limit).
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
    const navigate = useNavigate()
    // const { tenantData } = useTenant() // Optional if needed

    // ============================================
    // 1. STATE-BASED PHYSICS (The Dec 19 Fix)
    // ============================================
    const [image, setImage] = useState(initialData?.image || null)
    const [scale, setScale] = useState(initialData?.scale || 1)
    const [offsetX, setOffsetX] = useState(initialData?.offsetX || 0)
    const [offsetY, setOffsetY] = useState(initialData?.offsetY || 0)
    const [breakpoint, setBreakpoint] = useState(getBreakpoint())
    const [snappedX, setSnappedX] = useState(false)
    const [snappedY, setSnappedY] = useState(false)

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
    // 2. THE WORKING INTERACTION ENGINE (Dec 19)
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
        // Simple preventDefault is all Dec 19 needed
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
            // Pinch Math
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const newScale = Math.min(3, Math.max(0.5, initialScale.current * (distance / initialPinchDistance.current)))
            setScale(newScale)
        } else if (e.touches.length === 1 && isDragging.current) {
            // Drag Math (State Based)
            const dx = e.touches[0].clientX - lastTouch.current.x
            const dy = e.touches[0].clientY - lastTouch.current.y

            // Calculate new position based on CURRENT STATE
            const newX = offsetX + dx
            const newY = offsetY + dy

            const { finalX, finalY } = applySnapAssist(newX, newY)
            setOffsetX(finalX)
            setOffsetY(finalY)

            lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
    }

    const handleTouchEnd = () => { isDragging.current = false }

    // Desktop Mouse Handlers (Mirroring Logic)
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
    // 3. DEEPSEEK SAVE STRATEGY (Local Storage)
    // ============================================
    const handleContinue = async () => {
        if (demoMode) {
            onSave({ image, scale, offsetX, offsetY, breakpoint })
            onClose(); return
        }

        try {
            if (heroMode === 'text') {
                alert('Modo texto activo. Cambia a Imagen primero.'); return
            }

            let heroUrl = image // Fallback

            // A. Upload to Supabase (Backup)
            if (originalFile) {
                const { url, error } = await uploadAsset(originalFile, businessId, 'branding')
                if (!error) {
                    heroUrl = url
                    // Update DB Reference
                    await updateBranding({ hero_url: heroUrl, hero_mode: 'image' }, businessId)
                }
            }

            // B. LOCAL STORAGE MANAGEMENT (The Memory Fix)
            const lsKey = `hero_${businessId}`

            // 1. DELETE OLD (Prevent Buildup)
            localStorage.removeItem(lsKey)

            // 2. SAVE NEW (Optimized DataURI for Instant Load)
            try {
                const storageData = {
                    image: image, // Uses the DataURI (Base64) for instant offline load
                    scale, offsetX, offsetY,
                    version: Date.now()
                }
                localStorage.setItem(lsKey, JSON.stringify(storageData))
                console.log('✅ Hero saved to LocalStorage')
            } catch (e) {
                console.warn('LocalStorage full, falling back to network', e)
            }

            // C. SYNC & NAVIGATE
            updateConfig({ headerCover: { image: heroUrl, scale, offsetX, offsetY, breakpoint, imageVersion: Date.now() } })
            window.dispatchEvent(new CustomEvent('frontendSync'))
            onSave({ image: heroUrl, scale, offsetX, offsetY, breakpoint })

            const returnState = initialData?.returnState || {}
            setTimeout(() => {
                navigate('/admin/cover-preview', { state: { ...returnState, returnTo: window.location.pathname } })
                onClose()
            }, 100)

        } catch (err) {
            console.error('Save error:', err)
            alert('Error saving.')
        }
    }

    if (!isOpen) return null

    // ============================================
    // 4. RENDER (Exact Dec 19 Layout)
    // ============================================
    return (
        <div style={{
            position: 'fixed', inset: 0, background: '#000', zIndex: 9999,
            touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none'
        }}>
            {/* Background */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.3 }}>
                <Home config={config} />
                <StaticBottomNav />
            </div>

            <div style={{ position: 'absolute', top: coverHeight, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', pointerEvents: 'none', zIndex: 5 }} />

            {/* INTERACTIVE CROP FRAME */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: coverHeight,
                    overflow: 'hidden', cursor: 'move', zIndex: 6,
                    border: '3px solid #22C55E',
                    boxShadow: '0 0 0 4px rgba(34,197,94,0.4), inset 0 0 30px rgba(0,0,0,0.3)',
                    touchAction: 'none'
                }}
            >
                {image ? (
                    <div style={{
                        position: 'absolute', width: '200%', height: '200%', left: '-50%', top: '-50%',
                        backgroundImage: `url(${image})`, backgroundSize: `${scale * 100}%`,
                        backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
                        transform: `translate(${offsetX}px, ${offsetY}px)`,
                        willChange: 'transform'
                    }} />
                ) : null}

                {/* Guidelines */}
                {image && (
                    <>
                        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: snappedX ? 2 : 1, background: snappedX ? '#22C55E' : 'rgba(255,255,255,0.3)', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 10 }} />
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: snappedY ? 2 : 1, background: snappedY ? '#22C55E' : 'rgba(255,255,255,0.3)', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 10 }} />
                    </>
                )}

                {!image && (
                    <div onClick={() => fileInputRef.current?.click()} onTouchEnd={(e) => { e.preventDefault(); fileInputRef.current?.click() }} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <span style={{ color: '#9CA3AF', fontSize: 14 }}>Tap to select image</span>
                    </div>
                )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />

            {/* Buttons */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                paddingTop: 'max(12px, env(safe-area-inset-top))', paddingLeft: 12, paddingRight: 12,
                display: 'flex', justifyContent: 'space-between', zIndex: 100, pointerEvents: 'none'
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
                    onClick={handleContinue}
                    onTouchEnd={(e) => { e.preventDefault(); handleContinue() }}
                    disabled={!image}
                    style={{
                        minWidth: 44, minHeight: 44, padding: '8px 14px',
                        background: image ? '#3B82F6' : 'rgba(59,130,246,0.4)',
                        color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                        cursor: image ? 'pointer' : 'not-allowed', pointerEvents: 'auto'
                    }}
                >
                    Continue →
                </button>
            </div>

            <div style={{ position: 'absolute', top: coverHeight + 12, left: '50%', transform: 'translateX(-50%)', background: '#22C55E', color: '#fff', fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 20, zIndex: 10, whiteSpace: 'nowrap' }}>
                ↕ Drag • Pinch to zoom • {Math.round(scale * 100)}%
            </div>
        </div>
    )
}

export default CoverImageEditor