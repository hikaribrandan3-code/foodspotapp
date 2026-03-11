import { useState, useEffect, useRef } from 'react'
import { useCamera, FILTER_STYLES } from './hooks/useCamera.js'
import './CameraLayer.css'

/**
 * CameraLayer Component - CamTech v1.8
 * Fullscreen camera with filters, flip, flash, shutter
 * + Persistent Close (X) button in top-left
 */

// 10 filter definitions
const FILTERS = [
    { id: 'original', label: 'Original', color: '#888' },
    { id: 'warm', label: 'Warm', color: '#e8a87c' },
    { id: 'cool', label: 'Cool', color: '#7ec8e8' },
    { id: 'vibrant', label: 'Vibrant', color: '#c77dff' },
    { id: 'vintage', label: 'Vintage', color: '#d4a574' },
    { id: 'pastel', label: 'Pastel', color: '#f8c8dc' },
    { id: 'mono', label: 'Mono', color: '#666' },
    { id: 'soft', label: 'Soft', color: '#d4c8b8' },
    { id: 'crisp', label: 'Crisp', color: '#94b8d4' },
    { id: 'fade', label: 'Fade', color: '#a8a0b4' }
]

// Flash icon states
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

export function CameraLayer({ onCapture, onOpenSettings, onClose, toolPosition }) {
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

    // Filter toast state
    const [showFilterToast, setShowFilterToast] = useState(false)
    const [filterToastName, setFilterToastName] = useState('')
    const toastTimeoutRef = useRef(null)

    // Capture state
    const [isCapturing, setIsCapturing] = useState(false)

    // Pinch-to-zoom state
    const initialPinchDistanceRef = useRef(0)
    const initialZoomRef = useRef(1)

    // Calculate distance between two touch points
    const getTouchDistance = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX
        const dy = touches[0].clientY - touches[1].clientY
        return Math.sqrt(dx * dx + dy * dy)
    }

    // Handle pinch start on video
    const handlePinchStart = (e) => {
        if (e.touches && e.touches.length === 2 && zoomSupported) {
            e.preventDefault()
            initialPinchDistanceRef.current = getTouchDistance(e.touches)
            initialZoomRef.current = zoomLevel
        }
    }

    // Handle pinch move on video
    const handlePinchMove = (e) => {
        if (e.touches && e.touches.length === 2 && zoomSupported && initialPinchDistanceRef.current > 0) {
            e.preventDefault()
            const currentDistance = getTouchDistance(e.touches)
            const scaleFactor = currentDistance / initialPinchDistanceRef.current
            const newZoom = Math.max(1, Math.min(3, initialZoomRef.current * scaleFactor))
            setZoom(newZoom)
        }
    }

    // Handle pinch end
    const handlePinchEnd = () => {
        initialPinchDistanceRef.current = 0
    }

    // Handle shutter press - capture and transition to editor
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

    // Placeholder shutter sound
    const playShutterSound = () => {
        // Create oscillator for click sound
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
        } catch (e) {
            // Audio not supported - silent capture
        }
    }

    // Handle settings gear tap
    const handleSettingsClick = () => {
        if (onOpenSettings) {
            onOpenSettings()
        }
    }

    // Handle filter selection
    const handleFilterSelect = (filterId) => {
        setFilter(filterId)
    }

    // Handle flip camera
    const handleFlip = () => {
        flipCamera()
    }

    // Handle flash cycle
    const handleFlashCycle = () => {
        cycleFlash()
    }

    return (
        <div className="camera-layer">
            {/* YC-SPEC AURA TAG */}
            {businessName && (
                <div className="aura-tag-wrapper">
                    <div className="aura-tag">
                        <div className="aura-dot" style={{ '--brand': primaryColor || '#FF3366' }} />
                        <span className="aura-text">{businessName}</span>
                    </div>
                </div>
            )}

            {/* Close (X) button - top left, always visible */}
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

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="capture-canvas" />

            {/* Live camera preview with filter applied */}
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

            {/* Error state */}
            {error && (
                <div className="camera-error">
                    <p>Camera access required</p>
                    <p className="camera-error-detail">{error}</p>
                </div>
            )}

            {/* Settings gear - top right per Gemini mock */}
            <button
                className="settings-button"
                onClick={handleSettingsClick}
                aria-label="Settings"
                style={{ zIndex: 9999, pointerEvents: 'auto' }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            </button>

            {/* Right toolbar */}
            <div className={`toolbar toolbar-${toolPosition === 'left' ? 'right' : 'left'}-side`} style={{ zIndex: 9999, pointerEvents: 'auto' }}>
                {/* Flip camera - functional */}
                <button className="toolbar-button" onClick={handleFlip} aria-label="Flip Camera" style={{ pointerEvents: 'auto' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
                        <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
                        <circle cx="12" cy="12" r="3" />
                        <path d="m18 22-3-3 3-3" />
                        <path d="m6 2 3 3-3 3" />
                    </svg>
                </button>
                {/* Flash - cycles through modes */}
                <button
                    className={`toolbar-button ${flashMode !== 'off' ? 'toolbar-button-active' : ''}`}
                    onClick={handleFlashCycle}
                    aria-label={`Flash: ${flashMode}`}
                    title={flashSupported ? `Flash: ${flashMode}` : 'Flash not supported'}
                    style={{ pointerEvents: 'auto' }}
                >
                    {FLASH_ICONS[flashMode]}
                </button>

            </div>

            {/* Bottom Control Bar - Instagram style */}
            <div style={{
                position: 'absolute',
                bottom: '60px',
                left: 0,
                right: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '40px',
                zIndex: 9999,
                padding: '0 24px',
                pointerEvents: 'auto'
            }}>
                {/* Left spacer (for gallery in future) */}
                <div style={{ width: '48px' }} />

                {/* Shutter button - CENTER - PRIMARY */}
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
                        boxShadow: '0 4px 20px rgba(255, 255, 255, 0.25)',
                        pointerEvents: 'auto'
                    }}
                >
                    <div style={{
                        width: '100%',
                        height: '100%',
                        background: '#fff',
                        borderRadius: '50%'
                    }} />
                </button>

                {/* Filter button - RIGHT - SECONDARY */}
                <button
                    onClick={() => {
                        // Cycle through filters
                        const currentIndex = FILTERS.findIndex(f => f.id === selectedFilter)
                        const nextIndex = (currentIndex + 1) % FILTERS.length
                        const nextFilter = FILTERS[nextIndex]
                        handleFilterSelect(nextFilter.id)

                        // Show filter name toast
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
                        color: '#fff',
                        pointerEvents: 'auto'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity="0.3" />
                    </svg>
                </button>
            </div>

            {/* Filter name toast */}
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
