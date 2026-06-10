# FoodSpot Camera Codebase Reference
## Current Implementation (CamTech v2.2)

**Location:** `/src/components/Camera/`

This document shows the actual code structure so you understand the current implementation before integrating CamTech v1.8.

---

## Current File Structure

```
src/components/Camera/
├── index.jsx                 ← Main orchestrator (state management)
├── CameraLayer.jsx           ← WHAT YOU'LL REPLACE (capture engine)
├── EditorLayer.jsx           ← LOCKED (annotation pipeline)
├── DualPostScreen.jsx        ← LOCKED (preview/save/share)
├── CameraTrigger.jsx         ← Component that activates camera
├── CameraActivationBanner.jsx ← UI for activation
├── CameraGuard.jsx           ← Route guard
├── SettingsSheet.jsx         ← Settings modal
├── DrawTool.jsx              ← Drawing annotation
├── TextEditor.jsx            ← Text annotation
├── StickerDrawer.jsx         ← Sticker selection
├── EmojiPicker.jsx           ← Emoji selection
├── DraggableElement.jsx      ← Draggable annotation elements
├── PreviewActions.jsx        ← Save/share buttons
├── [Characters]              ← Food character mascots (BurgerBoy, etc.)
├── hooks/
│   └── useCamera.js          ← Camera access & stream management
├── utils/
│   ├── ExportEngine.js       ← Canvas flattening for export
│   ├── emojis.js             ← Emoji data
│   ├── safariProtections.js  ← iOS/Safari workarounds
│   └── ...
└── [Styles]                  ← CameraLayer.css, EditorLayer.css
```

---

## Main Orchestrator: `index.jsx`

```jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import CameraLayer from './CameraLayer.jsx'
import EditorLayer from './EditorLayer.jsx'
import SettingsSheet from './SettingsSheet.jsx'
import { useCamTechBroadcaster } from '../../hooks/useCamTech'

export const VERSION = 'CamTech v2.2'

function Camera({ neonContext = null, branding = null }) {
    const navigate = useNavigate()
    const { activateCamera, deactivateCamera } = useCamTechBroadcaster()

    const [mode, setMode] = useState('CAMERA')      // 'CAMERA' | 'EDITOR'
    const [capturedImage, setCapturedImage] = useState(null)
    const [showSettings, setShowSettings] = useState(false)
    const [toolPosition, setToolPosition] = useState('right')

    // Global camera activation/deactivation
    useEffect(() => {
        activateCamera()
        return () => deactivateCamera()
    }, [activateCamera, deactivateCamera])

    // Capture → Editor flow
    const handleCapture = (captureResult) => {
        if (!captureResult) return
        setCapturedImage(captureResult)
        setMode('EDITOR')  // Switch to annotation layer
    }

    const handleRetake = () => {
        setCapturedImage(null)
        setMode('CAMERA')  // Back to camera
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
            {/* CAMERA MODE: Full-screen capture */}
            {mode === 'CAMERA' && (
                <CameraLayer
                    onCapture={handleCapture}       // ← Returns imageData blob
                    onOpenSettings={handleOpenSettings}
                    onClose={handleClose}
                    toolPosition={toolPosition}
                />
            )}

            {/* EDITOR MODE: Annotation + preview */}
            {mode === 'EDITOR' && capturedImage && (
                <EditorLayer
                    imageData={capturedImage}       // ← Receives blob from CameraLayer
                    onRetake={handleRetake}
                    onDone={handleDone}
                    toolPosition={toolPosition}
                    neonContext={neonContext}
                    branding={branding}
                />
            )}

            {showSettings && (
                <SettingsSheet
                    toolPosition={toolPosition}
                    onToolPositionChange={handleToolPositionChange}
                    onClose={handleCloseSettings}
                />
            )}
        </div>
    )
}

export default Camera
```

**Key Takeaway:**
- Camera.jsx manages the **mode state** (CAMERA ↔ EDITOR)
- CameraLayer must call `onCapture(imageData)` with a blob
- EditorLayer receives that blob and handles annotation

---

## Current Capture Engine: `CameraLayer.jsx` (REPLACE THIS)

**This is what you'll refactor with CamTech v1.8.**

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
        captureFrame,    // ← Core capture function
        zoomLevel,
        setZoom,
    } = useCamera()

    const businessName = tenantData?.business_name || 'FoodSpot'

    // Pinch-to-zoom handlers
    const initialPinchDistanceRef = useRef(0)
    const initialZoomRef = useRef(1)

    const getTouchDistance = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX
        const dy = touches[0].clientY - touches[1].clientY
        return Math.sqrt(dx * dx + dy * dy)
    }

    const handlePinchStart = (e) => {
        if (e.touches && e.touches.length === 2) {
            e.preventDefault()
            initialPinchDistanceRef.current = getTouchDistance(e.touches)
            initialZoomRef.current = zoomLevel
        }
    }

    const handlePinchMove = (e) => {
        if (e.touches && e.touches.length === 2 && initialPinchDistanceRef.current > 0) {
            e.preventDefault()
            const currentDistance = getTouchDistance(e.touches)
            const amplifiedFactor = 1 + (currentDistance / initialPinchDistanceRef.current - 1) * 2.5
            const newZoom = Math.max(1, Math.min(3, initialZoomRef.current * amplifiedFactor))
            setZoom(newZoom)
        }
    }

    // Main capture handler
    const handleShutter = async () => {
        try {
            const imageData = await captureFrame()  // ← Gets canvas blob
            if (imageData) {
                playShutterSound()
                onCapture(imageData)  // ← Send to parent (Camera.jsx)
            }
        } finally {
            // cleanup
        }
    }

    return (
        <div className="camera-layer">
            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="capture-canvas" />

            {/* Live preview video */}
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

            {/* Error message */}
            {error && <div className="camera-error">{error}</div>}

            {/* Location pill - top left */}
            <div style={{ position: 'absolute', top: '72px', left: '16px', ... }}>
                <svg>📍</svg>
                <span>{businessName.toUpperCase()}</span>
            </div>

            {/* Controls: Flip, Flash */}
            <div className="toolbar">
                <button onClick={handleFlip}>🔄 Flip</button>
                <button onClick={handleFlashCycle}>⚡ Flash: {flashMode}</button>
            </div>

            {/* Shutter button + Filter toggle - bottom center */}
            <div style={{ position: 'absolute', bottom: '48px', ... }}>
                <button onClick={handleShutter} style={{ width: '72px', height: '72px', ... }}>
                    ⭕
                </button>
                <button onClick={() => cycleFilter()}>🎨 Filters</button>
            </div>

            {/* Filter toast */}
            {showFilterToast && <div>{filterToastName}</div>}
        </div>
    )
}
```

**What CameraLayer currently does:**
1. Access camera via `useCamera()` hook
2. Display live video feed
3. Handle pinch-to-zoom (1x–3x)
4. Handle filters (original, mono, soft)
5. Capture frame on shutter → send blob to EditorLayer

**What needs improvement (CamTech v1.8):**
- Add scene modes (FOOD, PET, PORTRAIT, SPORTS)
- Extend zoom range (0.5x–10x)
- Fix aspect ratios (9:16, 4:3, 1:1 full-screen)
- Add macro focusing
- Add flash effect
- Add pinch-to-zoom (currently only buttons)

---

## Camera Hook: `hooks/useCamera.js`

```js
import { useState, useRef, useCallback, useEffect } from 'react'

export const FILTER_STYLES = {
    original: 'none',
    mono: 'grayscale(1) contrast(1.1)',
    soft: 'brightness(1.08) contrast(0.92) saturate(0.95)'
}

const FLASH_MODES = ['off', 'on', 'auto', 'torch']

export function useCamera() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const trackRef = useRef(null)

    const [isReady, setIsReady] = useState(false)
    const [facingMode, setFacingMode] = useState('environment')
    const [error, setError] = useState(null)
    const [flashMode, setFlashMode] = useState('off')
    const [flashSupported, setFlashSupported] = useState(false)
    const [selectedFilter, setSelectedFilter] = useState('original')
    const [zoomLevel, setZoomLevel] = useState(1)
    const [zoomSupported, setZoomSupported] = useState(false)

    // Probe hardware capabilities
    const probeCapabilities = useCallback(async (videoTrack) => {
        if (!videoTrack?.getCapabilities) return

        const capabilities = videoTrack.getCapabilities()
        const settings = videoTrack.getSettings()

        console.log(`Hardware: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`)

        // Set torch (flash)
        setFlashSupported(!!capabilities.torch)

        // Set continuous focus/exposure
        const advanced = {}
        if (capabilities.focusMode?.includes('continuous')) {
            advanced.focusMode = 'continuous'
        }
        if (capabilities.exposureMode?.includes('continuous')) {
            advanced.exposureMode = 'continuous'
        }
        if (Object.keys(advanced).length > 0) {
            await videoTrack.applyConstraints({ advanced: [advanced] })
        }

        // Set zoom support
        if (capabilities.zoom) {
            setZoomSupported(true)
            zoomRangeRef.current = {
                min: capabilities.zoom.min || 1,
                max: Math.min(capabilities.zoom.max || 1, 3)
            }
        }
    }, [])

    // Init camera stream
    const initCamera = useCallback(async () => {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                setError('Camera requires HTTPS')
                return
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
                audio: false
            })

            streamRef.current = stream
            const videoTrack = stream.getVideoTracks()[0]
            trackRef.current = videoTrack

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play().catch(() => {})
                setIsReady(true)
            }

            // Probe and upgrade resolution in background
            await probeCapabilities(videoTrack)
            upgradeResolution(stream).catch(() => {})
        } catch (err) {
            setError(err.message)
            setIsReady(false)
        }
    }, [facingMode, probeCapabilities])

    // Capture current frame to canvas → blob
    const captureFrame = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return null

        const video = videoRef.current
        const canvas = canvasRef.current

        // Get natural video dimensions
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        // Draw with current filter
        ctx.filter = getFilterStyle()
        
        // Mirror if selfie
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0)
            ctx.scale(-1, 1)
        }

        ctx.drawImage(video, 0, 0)

        // Return blob
        return new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.95)
        })
    }, [facingMode])

    // Flip front/back camera
    const flipCamera = useCallback(async () => {
        const newFacing = facingMode === 'environment' ? 'user' : 'environment'
        setFacingMode(newFacing)
        // Will trigger initCamera via useEffect
    }, [facingMode])

    // Cycle flash modes
    const cycleFlash = useCallback(() => {
        const currentIndex = FLASH_MODES.indexOf(flashMode)
        const nextIndex = (currentIndex + 1) % FLASH_MODES.length
        setFlashMode(FLASH_MODES[nextIndex])

        if (trackRef.current && FLASH_MODES[nextIndex] === 'torch') {
            try {
                trackRef.current.applyConstraints({
                    advanced: [{ torch: true }]
                }).catch(() => {})
            } catch (e) { }
        }
    }, [flashMode])

    // Init on mount
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
        flipCamera,
        flashMode,
        flashSupported,
        cycleFlash,
        selectedFilter,
        setFilter,
        getFilterStyle: () => FILTER_STYLES[selectedFilter] || 'none',
        captureFrame,  // ← Core function that returns blob
        zoomLevel,
        setZoom,
        zoomSupported
    }
}
```

**Key exports:**
- `captureFrame()` — Captures current video frame → blob
- `flipCamera()` — Switch front/back
- `cycleFlash()` — Cycle flash modes
- `videoRef`, `canvasRef` — DOM refs
- `isReady`, `error` — State indicators

---

## EditorLayer: `EditorLayer.jsx` (LOCKED)

**You cannot modify this, but you need to understand the interface.**

```jsx
export default function EditorLayer({ 
    imageData,      // ← Receives blob from CameraLayer
    onRetake,       // Callback: go back to camera
    onDone,         // Callback: finished editing
    toolPosition,
    neonContext,
    branding
})
```

**What EditorLayer does:**
1. Receives `imageData` (blob from CameraLayer)
2. Renders canvas with image
3. Allows annotations (draw, text, stickers, emoji)
4. Flattens canvas to JPEG
5. Routes to DualPostScreen for preview/save

**Contract:**
- Input: `imageData` must be a blob (image data)
- Output: Routes to preview/save
- CameraLayer must call `onCapture(blob)` where blob is valid image data

---

## DualPostScreen: `DualPostScreen.jsx` (LOCKED)

```jsx
export default function DualPostScreen({ 
    previewDataURL,     // JPEG data URL
    previewBlob,        // Blob object
    cameraPinStyle,     // Style for location pill
    onClose,            // Back to editor
    onComplete          // Exit camera flow
})
```

**What DualPostScreen does:**
1. Shows full-screen preview
2. Location pill (top-left)
3. Action bar (save, share, download)
4. Calls PreviewActions to upload/save

**Contract:**
- Input: JPEG data URL + blob
- Output: Save/upload to Supabase

---

## Integration Points

### Where Camera is Used

**Receipt.jsx** — Triggered after payment:
```jsx
import { Camera } from '../components/Camera'

// After user completes order:
<Camera neonContext={...} branding={...} />
```

**OrderStatus.jsx** — Triggered on delivery:
```jsx
<Camera neonContext={...} branding={...} />
```

**CameraTrigger.jsx** — Activation logic:
```jsx
// Determines when/where camera is shown
```

### Contexts Available

- `useTenant()` — Get `businessId`, `tenantData`, `business_name`
- `useLanguage()` — Get `t()` for translations
- `useNavigate()` — React Router navigation

---

## Summary for Fable

**Your task:**
1. **REPLACE** `CameraLayer.jsx` internals with CamTech v1.8
2. **KEEP** the component signature and `onCapture()` callback
3. **KEEP** EditorLayer, DualPostScreen, Camera.jsx unchanged
4. **ADD** scene modes (FOOD, PET, PORTRAIT, SPORTS)
5. **ADD** zoom 0.5x–10x (with pinch-to-zoom)
6. **FIX** aspect ratios (9:16, 4:3, 1:1) to fill screen
7. **ADD** macro focusing
8. **ADD** flash effect

**Critical contract:**
- `onCapture(imageData)` where `imageData` is a blob
- EditorLayer expects blob → passes to DualPostScreen
- All contexts (TenantContext, etc.) are available

**Files to create/modify:**
- `CameraCapture.jsx` (NEW — core capture)
- `CameraUI.jsx` (NEW — controls)
- `CameraLayer.jsx` (MODIFIED — orchestrator)
- `utils/scenePresets.js` (NEW)
- `utils/zoomController.js` (NEW)
- `hooks/useCamera.js` (OPTIONAL — extend if needed)

---

**Ready to integrate CamTech v1.8? Read the PRD first: `.claude/CamTech-Integration-PRD.md`**
