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

// --- PREVIEW ICONS (Static Replicas) ---

// 1. Bottom Nav Icons
const NavHomeIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
)
const NavMenuIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
)
const NavStatusIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"></path>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
    </svg>
)
const NavInfoIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
)
const NavCameraIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
    </svg>
)

// 2. Hero Action Icons
const HeroMenuIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M216,40V224a8,8,0,0,1-16,0V176H152a8,8,0,0,1-8-8,268.75,268.75,0,0,1,7.22-56.88c9.78-40.49,28.32-67.63,53.63-78.47A8,8,0,0,1,216,40Zm-96.11-1.31a8,8,0,1,0-15.78,2.63L111.89,88H88V40a8,8,0,0,0-16,0V88H48.11l7.78-46.68a8,8,0,1,0-15.78-2.63l-8,48A8.17,8.17,0,0,0,32,88a48.07,48.07,0,0,0,40,47.32V224a8,8,0,0,0,16,0V135.32A48.07,48.07,0,0,0,128,88a8.17,8.17,0,0,0-.11-1.31Z"></path>
    </svg>
)
const HeroDeliveryIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M208,40H167.2a40,40,0,0,0-78.4,0H48a8,8,0,0,0,0,16H88.8a40,40,0,0,0,12.58,21.82A64.08,64.08,0,0,0,64,136v64a16,16,0,0,0,16,16H96a32,32,0,0,0,64,0h16a16,16,0,0,0,16-16V136a64.08,64.08,0,0,0-37.38-58.18A40,40,0,0,0,167.2,56H208a8,8,0,0,0,0-16ZM144,216a16,16,0,0,1-32,0V168a16,16,0,0,1,32,0ZM128,72a24,24,0,1,1,24-24A24,24,0,0,1,128,72Z" />
    </svg>
)
const HeroPromosIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M243.31,136,144,36.69A15.86,15.86,0,0,0,132.69,32H40a8,8,0,0,0-8,8v92.69A15.86,15.86,0,0,0,36.69,144L136,243.31a16,16,0,0,0,22.63,0l84.68-84.68a16,16,0,0,0,0-22.63ZM80,96A16,16,0,1,1,96,80,16,16,0,0,1,80,96Z"></path>
    </svg>
)
const HeroGameIcon = () => (
    <svg width="36" height="36" viewBox="0 0 256 256" fill="currentColor">
        <path d="M247.44,173.75a.68.68,0,0,0,0-.14L231.05,89.44c0-.06,0-.12,0-.18A60.08,60.08,0,0,0,172,40H83.89a59.88,59.88,0,0,0-59,49.52L8.58,173.61a.68.68,0,0,0,0,.14,36,36,0,0,0,60.9,31.71l.35-.37L109.52,160h37l39.71,45.09c.11.13.23.25.35.37A36.08,36.08,0,0,0,212,216a36,36,0,0,0,35.43-42.25ZM104,112H96v8a8,8,0,0,1-16,0v-8H72a8,8,0,0,1,0-16h8V88a8,8,0,0,1,16,0v8h8a8,8,0,0,1,0,16Zm40-8a8,8,0,0,1,8-8h24a8,8,0,0,1,0,16H152A8,8,0,0,1,144,104Zm84.37,87.47a19.84,19.84,0,0,1-12.9,8.23A20.09,20.09,0,0,1,198,194.31L167.8,160H172a60,60,0,0,0,51-28.38l8.74,45A19.82,19.82,0,0,1,228.37,191.47Z"></path>
    </svg>
)

function StaticBottomNav({ config = {} }) {
    const primaryColor = config.branding?.primaryColor || '#8B7355'

    return (
        <nav style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, height: 80,
            background: 'white', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around',
            borderTop: '1px solid #E5E7EB', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 999999,
            paddingTop: 8
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 1 }}>
                <div style={{ color: primaryColor }}><NavHomeIcon /></div>
                <span style={{ fontSize: 10, marginTop: 4, fontWeight: 600, color: primaryColor }}>Home</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                <div style={{ color: '#9CA3AF' }}><NavMenuIcon /></div>
                <span style={{ fontSize: 10, marginTop: 4, fontWeight: 500, color: '#9CA3AF' }}>Menú</span>
            </div>

            {/* Camera Button */}
            <div style={{
                width: 56, height: 56, borderRadius: '50%', background: primaryColor,
                marginTop: -28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                border: '4px solid white',
                zIndex: 10
            }}>
                <div style={{ color: 'white' }}><NavCameraIcon /></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                <div style={{ color: '#9CA3AF' }}><NavStatusIcon /></div>
                <span style={{ fontSize: 10, marginTop: 4, fontWeight: 500, color: '#9CA3AF' }}>Estado</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                <div style={{ color: '#9CA3AF' }}><NavInfoIcon /></div>
                <span style={{ fontSize: 10, marginTop: 4, fontWeight: 500, color: '#9CA3AF' }}>Info</span>
            </div>
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
                const newScale = Math.min(5, Math.max(0.25, initialScaleRef.current * (distance / initialPinchDistance.current)))
                posRef.current.scale = newScale
                setScale(newScale)
            }
        } else if (isDragging.current && e.pointerId === activePointerId.current) {
            // Pan
            const dx = e.clientX - lastPointer.current.x
            const dy = e.clientY - lastPointer.current.y

            let newX = posRef.current.offsetX + dx
            let newY = posRef.current.offsetY + dy

            // CONSTRAIN: Don't let image leave the frame (FB-style)
            // At scale S, image is S times the container size
            // Can pan (S - 1) / 2 * container before hitting edge
            const containerW = window.innerWidth
            const containerH = coverHeight
            const maxPanX = Math.max(0, (scale - 1) * containerW / 2)
            const maxPanY = Math.max(0, (scale - 1) * containerH / 2)

            newX = Math.max(-maxPanX, Math.min(maxPanX, newX))
            newY = Math.max(-maxPanY, Math.min(maxPanY, newY))

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

            console.log('[Pointer] Move:', newX, newY, 'Max:', maxPanX, maxPanY)
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
                // File size validation: warn if over 500KB
                const MAX_RECOMMENDED_SIZE = 500 * 1024; // 500KB
                if (file.size > MAX_RECOMMENDED_SIZE) {
                    const proceed = confirm(
                        `This image is ${(file.size / 1024).toFixed(0)}KB (recommended: under 500KB).\n\n` +
                        `Large images may take longer to upload on slow connections.\n\n` +
                        `Continue anyway?`
                    );
                    if (!proceed) {
                        document.body.removeChild(input);
                        return;
                    }
                }
                try {
                    setOriginalFile(file)
                    const { publicUrl } = await processAndStoreImage(file)
                    setImage(publicUrl)
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

            console.log('[HeroDebug] Editor handleSave triggered. Image:', image, 'Pos:', posRef.current);

            // ⚡️ PURE COMPONENT MODE: No DB writes, No Uploads.
            // We trust that 'image' is already a valid URL (from triggerFileInput or initialData).

            const saveData = {
                image: image,
                scale: posRef.current.scale,
                offsetX: posRef.current.offsetX,
                offsetY: posRef.current.offsetY,
                updatedAt: Date.now()
            };
            console.log('[HeroDebug] Calling onSave with:', saveData);
            onSave?.(saveData)

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
                role="presentation"
                inputMode="none"
                data-form-type="other"
                style={{
                    position: 'fixed', inset: 0, background: '#F9FAFB', zIndex: 99999,
                    touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none'
                }}
            >
                {/* 1. Header/Logo Layer - Standard HeaderClamp Position */}
                <div style={{
                    position: 'absolute', top: 50, left: 0, right: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 20, pointerEvents: 'none', paddingLeft: 20, paddingRight: 20
                }}>
                    {config.branding?.logo_url && (
                        <img
                            src={config.branding.logo_url}
                            alt="Brand"
                            style={{ maxHeight: 50, maxWidth: '80%', objectFit: 'contain' }}
                        />
                    )}
                </div>

                {/* 2. Content Layer */}
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', paddingBottom: 100 }}>
                    {/* Hero Image */}
                    <div style={{
                        position: 'relative',
                        height: coverHeight,
                        width: '100%',
                        overflow: 'hidden'
                    }}>
                        {image && (
                            <div style={{
                                position: 'absolute', width: '100%', height: '100%', left: 0, top: 0,
                                backgroundImage: `url(${image})`, backgroundSize: 'cover',
                                backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
                                transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                                transformOrigin: 'center center',
                                pointerEvents: 'none'
                            }} />
                        )}
                    </div>

                    {/* 3. Hero Actions + Ghost Grid */}
                    <div style={{
                        position: 'relative',
                        padding: '12px 16px',
                        display: 'flex', flexDirection: 'column', gap: 16
                    }}>
                        {/* HERO ACTIONS ROW */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[
                                { label: 'Menu', icon: HeroMenuIcon },
                                { label: 'Envíos', icon: HeroDeliveryIcon },
                                { label: 'Promos', icon: HeroPromosIcon },
                                { label: 'Mini Game', icon: HeroGameIcon }
                            ].map((action, i) => (
                                <div key={i} style={{
                                    background: 'white',
                                    borderRadius: 28,
                                    padding: 16,
                                    aspectRatio: '1 / 0.85',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 12,
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                                }}>
                                    <div><action.icon /></div>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', marginTop: 4 }}>{action.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* GHOST GRID (2 Columns) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[1, 2, 3, 4].map(n => (
                                <div key={n} style={{
                                    background: 'white', borderRadius: 16, overflow: 'hidden',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ height: 120, background: '#E5E0D8' }} />
                                    <div style={{ height: 40 }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. Navigation & Controls */}
                <StaticBottomNav config={config} />

                {/* Top Controls (Back/Save) - Floating over everything */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    paddingTop: 'max(12px, env(safe-area-inset-top))', paddingLeft: 12, paddingRight: 12,
                    display: 'flex', justifyContent: 'space-between', zIndex: 100,
                    pointerEvents: 'none'
                }}>
                    <div
                        onClick={handleBack}
                        style={{
                            minWidth: 44, minHeight: 44, padding: '8px 14px', background: 'rgba(0,0,0,0.5)',
                            color: '#fff', borderRadius: 10, fontSize: 18, fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'auto'
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
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'auto'
                        }}
                    >
                        {isSaving ? '...' : '✓'}
                    </div>
                </div>
            </div>
        )
    }

    // EDIT STEP
    return (
        <div
            role="presentation"
            inputMode="none"
            data-form-type="other"
            style={{
                position: 'fixed', inset: 0, background: '#1F2937', zIndex: 99999,
                touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none'
            }}
        >
            {/* Background placeholder - shows current/new image if available */}
            {image && (
                <div style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    opacity: 0.2,
                    backgroundImage: `url(${image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }} />
            )}

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
                            width: '100%',
                            height: '100%',
                            left: 0,
                            top: 0,
                            backgroundImage: `url(${image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                            transformOrigin: 'center center',
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

            {/* Hero Guidelines */}
            <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', zIndex: 10, maxWidth: '90%' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', lineHeight: 1.4 }}>
                    💡 <strong>Tip:</strong> 16:9 images (1200×800px) work best.<br />
                    <strong>150% zoom = sweet spot</strong> • Drag to position
                </p>
            </div>
        </div>
    )
}

export default CoverImageEditor