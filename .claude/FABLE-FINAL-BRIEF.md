# FABLE: Adapt CamTech v1.8 into FoodSpot Camera

**GOAL:** Replace FoodSpot's broken capture engine with CamTech v1.8's capture engine, keeping FoodSpot's UI and editor pipeline 100% intact.

---

## STEP 1 — READ BOTH CODEBASES SIDE-BY-SIDE

Before writing code, understand:
1. **CamTech v1.8** — https://github.com/hikaribrandan3-code/camtech-enginev1.8.git (study: capture pipeline, zoom, flash, AE/AF, scene modes)
2. **FoodSpot Camera Code** (below)

Then adapt CamTech's capture engine INTO FoodSpot's UI shell.

---

## FOODSPOT CAMERA CODE (Current Implementation)

### CameraLayer.jsx (Main UI — KEEP THIS STRUCTURE)

```jsx
import { useState, useEffect, useRef } from 'react'
import { useCamera, FILTER_STYLES } from './hooks/useCamera.js'
import { useTenant } from '../../contexts/TenantContext.jsx'

const FILTERS = [
    { id: 'original', label: 'Original', color: '#888' },
    { id: 'mono', label: 'Mono', color: '#666' },
    { id: 'soft', label: 'Soft', color: '#d4c8b8' }
]

export default function CameraLayer({ onCapture, onOpenSettings, onClose, toolPosition }) {
    const { tenantData } = useTenant()

    const {
        videoRef,
        canvasRef,
        isReady,
        error,
        facingMode,
        flipCamera,
        flashMode,
        cycleFlash,
        selectedFilter,
        setFilter,
        getFilterStyle,
        captureFrame,    // ← BROKEN: returns null
        zoomLevel,
        setZoom,
        zoomSupported
    } = useCamera()

    const businessName = tenantData?.business_name || 'FoodSpot'

    // Pinch-to-zoom (currently 1x-3x, needs 0.5x-10x)
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
            const amplifiedFactor = 1 + (rawFactor - 1) * 2.5
            const newZoom = Math.max(1, Math.min(3, initialZoomRef.current * amplifiedFactor))
            setZoom(newZoom)
        }
    }

    // BROKEN: captureFrame returns null
    const handleShutter = async () => {
        if (isCapturing) return
        setIsCapturing(true)

        try {
            const imageData = await captureFrame()
            if (imageData) {
                playShutterSound()
                onCapture(imageData)  // ← Never called because imageData is null
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

            {/* Loading spinner */}
            {!isReady && !error && <div>Loading camera...</div>}

            {/* Error state */}
            {error && <div className="camera-error">{error}</div>}

            {/* Location pill - top left */}
            <div style={{
                position: 'absolute',
                top: '72px',
                left: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '8px 14px',
                background: 'rgba(255, 255, 255, 0.22)',
                backdropFilter: 'blur(8px)',
                borderRadius: '20px',
                zIndex: 10,
            }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">📍</svg>
                <span style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: 'white',
                }}>
                    {businessName.toUpperCase()}
                </span>
            </div>

            {/* Right toolbar: flip, flash, filters */}
            <div className="toolbar">
                <button onClick={handleFlip} aria-label="Flip Camera">🔄</button>
                <button onClick={handleFlashCycle} aria-label="Flash">⚡ {flashMode}</button>
            </div>

            {/* Bottom controls: shutter + filter */}
            <div style={{
                position: 'absolute',
                bottom: '48px',
                left: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '40px',
                zIndex: 100,
                padding: '0 24px',
            }}>
                {/* Shutter button */}
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
                        cursor: 'pointer',
                        opacity: isReady ? 1 : 0.5,
                    }}
                >
                    <div style={{
                        width: '100%',
                        height: '100%',
                        background: '#fff',
                        borderRadius: '50%'
                    }} />
                </button>

                {/* Filter toggle */}
                <button
                    onClick={() => {
                        const currentIndex = FILTERS.findIndex(f => f.id === selectedFilter)
                        const nextIndex = (currentIndex + 1) % FILTERS.length
                        const nextFilter = FILTERS[nextIndex]
                        handleFilterSelect(nextFilter.id)
                    }}
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
                    🎨
                </button>
            </div>
        </div>
    )
}
```

### useCamera.js Hook (Capture Logic — REPLACE WITH CAMTECH)

```js
export function useCamera() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)

    const [isReady, setIsReady] = useState(false)
    const [facingMode, setFacingMode] = useState('environment')
    const [error, setError] = useState(null)
    const [zoomLevel, setZoomLevel] = useState(1)

    // Init camera stream
    const initCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
                audio: false
            })

            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play().catch(() => {})
                setIsReady(true)
            }

            // Phase 2: Background resolution upgrade (THIS CAUSES THE RACE CONDITION)
            upgradeResolution(stream).catch(() => {})
        } catch (err) {
            setError(err.message)
        }
    }, [facingMode])

    // BROKEN: Returns null due to race condition
    const captureFrame = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return null

        const video = videoRef.current
        const canvas = canvasRef.current

        canvas.width = video.videoWidth   // ← OUT OF SYNC
        canvas.height = video.videoHeight // ← OUT OF SYNC

        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        ctx.filter = getFilterStyle()
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0)
            ctx.scale(-1, 1)
        }

        ctx.drawImage(video, 0, 0)

        return new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.95)
        })
    }, [facingMode])

    useEffect(() => {
        initCamera()
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop())
            }
        }
    }, [facingMode])

    return {
        videoRef,
        canvasRef,
        isReady,
        error,
        facingMode,
        flipCamera: () => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment'),
        flashMode: 'off',
        cycleFlash: () => { },
        selectedFilter: 'original',
        setFilter: () => { },
        getFilterStyle: () => 'none',
        captureFrame,  // ← BROKEN
        zoomLevel,
        setZoom,
        zoomSupported: false
    }
}
```

### index.jsx (Orchestrator — DO NOT CHANGE)

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CameraLayer from './CameraLayer.jsx'
import EditorLayer from './EditorLayer.jsx'

export const VERSION = 'CamTech v2.2'

function Camera({ neonContext = null, branding = null }) {
    const navigate = useNavigate()
    const [mode, setMode] = useState('CAMERA')
    const [capturedImage, setCapturedImage] = useState(null)

    const handleCapture = (captureResult) => {
        if (!captureResult) return
        setCapturedImage(captureResult)
        setMode('EDITOR')
    }

    const handleRetake = () => {
        setCapturedImage(null)
        setMode('CAMERA')
    }

    const handleDone = () => {
        setMode('CAMERA')
        setTimeout(() => setCapturedImage(null), 0)
    }

    const handleClose = () => {
        navigate(-1)
    }

    return (
        <div className="camera-fullscreen-wrapper">
            {mode === 'CAMERA' && (
                <CameraLayer
                    onCapture={handleCapture}
                    onClose={handleClose}
                />
            )}

            {mode === 'EDITOR' && capturedImage && (
                <EditorLayer
                    imageData={capturedImage}
                    onRetake={handleRetake}
                    onDone={handleDone}
                />
            )}
        </div>
    )
}

export default Camera
```

---

## WHAT YOU'RE BUILDING

Replace `useCamera.js` captureFrame logic with CamTech's reliable capture.

Keep:
- CameraLayer.jsx structure + UI layout
- index.jsx orchestration
- Flash, zoom, filters buttons (FoodSpot style)
- Location pill
- Landscape mode logic

Add to CameraLayer.jsx:
- "ONE TAKE" label above shutter
- AE/AF toggle (right toolbar, below flash)
- Scene mode pills [FOOD] [PET] [PORTRAIT] (above shutter)
- Extend zoom 0.5x–10x (keep button style)
- Fix aspect ratio letterboxing (4:3 and 1:1)

---

## KEEP THIS LOCKED 🔒

```
EditorLayer.jsx
DualPostScreen.jsx
index.jsx orchestrator
CameraTrigger.jsx
All annotation components
onCapture(blob) callback signature
```

---

## MODIFY ✏️

```
CameraLayer.jsx — Add UI elements (ONE TAKE, scene pills, AE/AF toggle)
hooks/useCamera.js — Replace captureFrame + zoom + flash with CamTech logic
utils/ — Add scenePresets.js if needed
```

---

## REQUIREMENTS

1. **Fix capture** — CamTech's capture engine doesn't have the race condition FoodSpot has. Port it. Test: 50 rapid shutter taps, all return valid JPEG blob.

2. **"ONE TAKE" label** — Text above shutter, small, uppercase, white.

3. **AE/AF toggle** — Right toolbar below flash. Yellow on, gray off.

4. **Scene pills [FOOD] [PET] [PORTRAIT]** — Above shutter. FOOD default.
   - FOOD: warm 3200K + macro 5-30cm + 1.2 EV
   - PET: neutral 5500K + continuous AF
   - PORTRAIT: warm 3500K + face detect

5. **Zoom 0.5x–10x** — Keep FoodSpot button UI, extend range. Keep pinch-to-zoom.

6. **Flash** — Keep FoodSpot UI, replace logic with CamTech's torch.

7. **Aspect ratios** — Fix 4:3 and 1:1 letterboxing. Use object-fit: cover pattern.

8. **Landscape** — Reference FoodSpot's existing landscape mode. Make new UI adapt to it.

---

## TESTING CHECKLIST

- [ ] Blob returns on first tap
- [ ] 50 rapid taps all capture
- [ ] Location pill, flip, filters all work
- [ ] ONE TAKE label visible
- [ ] AE/AF toggle works
- [ ] Scene pills work
- [ ] Zoom 0.5x–10x + pinch works
- [ ] 9:16 still works
- [ ] 4:3 fills screen
- [ ] 1:1 fills screen
- [ ] Landscape mode works

---

Read both codebases. Adapt CamTech into FoodSpot's UI. Go.
