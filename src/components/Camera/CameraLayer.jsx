import { useState, useEffect, useRef } from 'react'
import { useCamera, FILTER_STYLES } from './hooks/useCamera.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import './CameraLayer.css'

/**
 * CameraLayer Component - CamTech v1.9
 * Fullscreen camera with "Airy" UI — pill moved to top-left
 * Synchronized branding with ExportEngine
 */

const FILTERS = [
    { id: 'original', label: 'Original', color: '#888' },
    { id: 'mono', label: 'Mono', color: '#666' },
    { id: 'soft', label: 'Soft', color: '#d4c8b8' }
]

const FLASH_ICONS = {
    off: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 2l-5 10h5l-5 10" />
            <path d="M1 1l22 22" strokeLinecap="round" />
        </svg>
    ),
    on: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 2v11h3v9l7-12h-4l4-8z" />
        </svg>
    ),
    auto: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 2v11h3v9l7-12h-4l4-8z" />
            <text x="18" y="22" fontSize="8" fill="currentColor">A</text>
        </svg>
    ),
    torch: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 2v11h3v9l7-12h-4l4-8z" />
            <circle cx="19" cy="5" r="3" fill="#ffcc00" />
        </svg>
    )
}

export default function CameraLayer({ onCapture, onOpenSettings, onClose, toolPosition }) {
    const { tenantData } = useTenant()

    // DEBUG: Log camera pin style on mount and when it changes
    useEffect(() => {
        const pinStyle = tenantData?.app_config?.cameraPinStyle || 'classic'
        console.log('[CameraLayer] 🎥 cameraPinStyle:', pinStyle, 'tenantData:', tenantData?.app_config)
    }, [tenantData?.app_config?.cameraPinStyle])

    // Optimize orientation transition — detect changes early via Screen Orientation API
    useEffect(() => {
        if (!window.screen?.orientation) return

        const handleOrientationChange = () => {
            // Browser will auto-update dimensions, but we force a quick repaint
            // by temporarily adjusting the will-change hint
            const video = document.querySelector('.camera-preview')
            if (video) {
                video.style.willChange = 'auto'
                requestAnimationFrame(() => {
                    video.style.willChange = 'transform'
                })
            }
        }

        window.screen.orientation.addEventListener('change', handleOrientationChange)
        return () => window.screen.orientation.removeEventListener('change', handleOrientationChange)
    }, [])

    const {
        videoRef,
        canvasRef,
        isReady,
        error,
        facingMode,
        flipCamera,
        flashMode,
        flashSupported,
        cycleFlash,
        selectedFilter,
        setFilter,
        getFilterStyle,
        captureFrame,
        zoomLevel,
        setZoom,
        zoomSupported
    } = useCamera()

    const businessName = tenantData?.business_name || 'FoodSpot'

    // Camera pin style — controls the location pill background color
    const PIN_STYLE_COLORS = {
        classic: 'rgba(255, 255, 255, 0.22)',
        cafe:    'rgba(130, 90, 60, 0.55)',
        vegan:   'rgba(145, 170, 100, 0.55)',
        burger:  'rgba(255, 193, 7, 0.60)',
    }
    const pinStyle = tenantData?.app_config?.cameraPinStyle || 'classic'
    const pinBg = PIN_STYLE_COLORS[pinStyle] || PIN_STYLE_COLORS.classic

    const [showFilterToast, setShowFilterToast] = useState(false)
    const [filterToastName, setFilterToastName] = useState('')
    const toastTimeoutRef = useRef(null)
    const [isCapturing, setIsCapturing] = useState(false)

    const initialPinchDistanceRef = useRef(0)
    const initialZoomRef = useRef(1)

    const getTouchDistance = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX
        const dy = touches[0].clientY - touches[1].clientY
        return Math.sqrt(dx * dx + dy * dy)
    }

    const handlePinchStart = (e) => {
        if (e.touches && e.touches.length === 2 && zoomSupported) {
            e.preventDefault()
            initialPinchDistanceRef.current = getTouchDistance(e.touches)
            initialZoomRef.current = zoomLevel
        }
    }

    const handlePinchMove = (e) => {
        if (e.touches && e.touches.length === 2 && zoomSupported && initialPinchDistanceRef.current > 0) {
            e.preventDefault()
            const currentDistance = getTouchDistance(e.touches)
            const rawFactor = currentDistance / initialPinchDistanceRef.current
            // 2.5x amplification — makes pinch to zoom work with just thumb + pointer finger
            const amplifiedFactor = 1 + (rawFactor - 1) * 2.5
            const newZoom = Math.max(1, Math.min(3, initialZoomRef.current * amplifiedFactor))
            setZoom(newZoom)
        }
    }

    const handlePinchEnd = () => {
        initialPinchDistanceRef.current = 0
    }

    const handleShutter = async () => {
        if (isCapturing) return
        setIsCapturing(true)

        try {
            const imageData = await captureFrame()
            if (imageData) {
                playShutterSound()
                onCapture(imageData)
            }
        } finally {
            setIsCapturing(false)
        }
    }

    const playShutterSound = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            const oscillator = audioCtx.createOscillator()
            const gainNode = audioCtx.createGain()
            oscillator.connect(gainNode)
            gainNode.connect(audioCtx.destination)
            oscillator.frequency.value = 1000
            oscillator.type = 'sine'
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
            oscillator.start(audioCtx.currentTime)
            oscillator.stop(audioCtx.currentTime + 0.1)
        } catch (e) { }
    }

    const handleSettingsClick = () => {
        if (onOpenSettings) onOpenSettings()
    }

    const handleFilterSelect = (filterId) => {
        setFilter(filterId)
    }

    const handleFlip = () => flipCamera()

    const handleFlashCycle = () => cycleFlash()

    return (
        <div className="camera-layer">
            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="capture-canvas" />

            {/* Live camera preview */}
            <video
                ref={videoRef}
                className="camera-preview"
                style={{
                    filter: getFilterStyle(),
                    transform: facingMode === 'user' ? 'scaleX(-1)' : undefined
                }}
                autoPlay
                playsInline
                muted
                onTouchStart={handlePinchStart}
                onTouchMove={handlePinchMove}
                onTouchEnd={handlePinchEnd}
            />

            {/* Loading skeleton while camera initializes */}
            {!isReady && !error && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#000',
                    zIndex: 5,
                    gap: 16
                }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        border: '3px solid rgba(255,255,255,0.1)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <span style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: 14,
                        fontWeight: 500,
                        letterSpacing: 0.5
                    }}>Loading camera...</span>
                </div>
            )}

            {/* ── CINEMA MASK: 9:16 Safe Zone Guides ── */}
            <div className="cinema-mask-overlay" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 5,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    width: '100%',
                    height: 'calc((100% - (100vw * 16/9)) / 2)',
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)',
                    display: facingMode === 'environment' ? 'block' : 'none' // Only show if height > width
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    width: '100%',
                    height: 'calc((100% - (100vw * 16/9)) / 2)',
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)',
                    display: facingMode === 'environment' ? 'block' : 'none'
                }} />

                {/* 9:16 Frame Border (Subtle) */}
                <div style={{
                    width: '100vw',
                    height: 'calc(100vw * 16/9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxSizing: 'border-box'
                }} />
            </div>

            {/* Error state */}
            {error && (
                <div className="camera-error">
                    <p>Camera access required</p>
                    <p className="camera-error-detail">{error}</p>
                </div>
            )}

            {/* ── TOP LEFT: Close Button ── */}
            <button
                onClick={onClose}
                aria-label="Close"
                style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    width: '44px',
                    height: '44px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    zIndex: 200
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>

            {/* ── TOP LEFT: Location Pill (Below Close) ── */}
            {/* AIRY UI: 72px from top (16 + 44 + 12 gap), clear of all buttons */}
            <div style={{
                position: 'absolute',
                top: '72px',
                left: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                background: pinBg,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderRadius: '20px',
                color: '#fff',
                zIndex: 10,
            }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
                </svg>
                <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    letterSpacing: '0.08em',
                    lineHeight: 1,
                }}>
                    {businessName.toUpperCase()}
                </span>
            </div>

            {/* Settings gear — hidden */}
            <button
                className="settings-button"
                onClick={handleSettingsClick}
                aria-label="Settings"
                style={{ display: 'none' }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            </button>

            {/* Right toolbar */}
            <div className={`toolbar toolbar-${toolPosition === 'left' ? 'right' : 'left'}-side`}>
                <button className="toolbar-button" onClick={handleFlip} aria-label="Flip Camera">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
                        <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
                        <circle cx="12" cy="12" r="3" />
                        <path d="m18 22-3-3 3-3" />
                        <path d="m6 2 3 3-3 3" />
                    </svg>
                </button>
                <button
                    className={`toolbar-button ${flashMode !== 'off' ? 'toolbar-button-active' : ''}`}
                    onClick={handleFlashCycle}
                    aria-label={`Flash: ${flashMode}`}
                    title={flashSupported ? `Flash: ${flashMode}` : 'Flash not supported'}
                >
                    {FLASH_ICONS[flashMode]}
                </button>
            </div>

            {/* Bottom Control Bar */}
            <div style={{
                position: 'absolute',
                bottom: '60px',
                left: 0,
                right: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '40px',
                zIndex: 100,
                padding: '0 24px'
            }}>
                <div style={{ width: '48px' }} />

                <button
                    onClick={handleShutter}
                    disabled={!isReady}
                    aria-label="Take Photo"
                    style={{
                        width: '72px',
                        height: '72px',
                        background: 'transparent',
                        border: '4px solid #fff',
                        borderRadius: '50%',
                        padding: '4px',
                        cursor: 'pointer',
                        opacity: isReady ? 1 : 0.5,
                        boxShadow: '0 4px 20px rgba(255, 255, 255, 0.25)'
                    }}
                >
                    <div style={{
                        width: '100%',
                        height: '100%',
                        background: '#fff',
                        borderRadius: '50%'
                    }} />
                </button>

                <button
                    onClick={() => {
                        const currentIndex = FILTERS.findIndex(f => f.id === selectedFilter)
                        const nextIndex = (currentIndex + 1) % FILTERS.length
                        const nextFilter = FILTERS[nextIndex]
                        handleFilterSelect(nextFilter.id)
                        setFilterToastName(nextFilter.label)
                        setShowFilterToast(true)
                        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
                        toastTimeoutRef.current = setTimeout(() => setShowFilterToast(false), 600)
                    }}
                    aria-label="Filters"
                    style={{
                        width: '48px',
                        height: '48px',
                        background: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(10px)',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity="0.3" />
                    </svg>
                </button>
            </div>

            {/* Filter toast */}
            {showFilterToast && (
                <div style={{
                    position: 'absolute',
                    bottom: '150px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(10px)',
                    color: '#fff',
                    padding: '8px 20px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    zIndex: 200,
                    animation: 'fadeInOut 0.6s ease-out forwards'
                }}>
                    {filterToastName}
                </div>
            )}

            <style>{`
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
                    20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    80% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `}</style>
        </div>
    )
}
