# FABLE: CamTech v1.8 Integration — Complete Brief
## FoodSpot Advanced Camera Module Upgrade

**Status:** PRIORITY — Photos not capturing (critical bug), preview excellent  
**Assigned To:** Fable 5  
**Repository:** https://github.com/hikaribrandan3-code/camtech-enginev1.8.git  
**Target:** `/src/components/Camera/` (FoodSpot)  
**Timeline:** ASAP  

---

## THE PROBLEM (Current State)

### What's Working ✅
- Camera preview is **gorgeous** — real-time, responsive, zero lag
- Live filters work (original, mono, soft)
- AE/AF (auto exposure/focus) is excellent
- Zoom buttons work smoothly (1x → 3x range, limited)
- Pinch-to-zoom works (partially, only 1x → 3x)
- Flip camera (front/back) works
- Mobile responsive, fullscreen layout solid

### What's Broken ❌
- **CRITICAL: Photos are NOT being captured/saved**
  - User taps shutter button ("ONE TAKE")
  - Live preview continues but no image is returned
  - Editor never triggers (stuck in camera mode)
  - Flow stops dead

- **Aspect Ratio Issues:**
  - 9:16 ✅ works perfectly
  - 4:3 ❌ letterboxes/shrinks (black bars)
  - 1:1 ❌ letterboxes/shrinks (black bars)

- **Scene Mode Portrait:**
  - Shows as UI option but doesn't capture photos

- **Flash:**
  - Button exists but doesn't work

- **Zoom Limited:**
  - Only 0.5x–3x range (should be 0.5x–10x)
  - Missing pinch-to-zoom on mobile

### The Irony
FoodSpot has built something **extremely rare** — a professional-grade in-browser camera with:
- Real-time macro focusing (food shots are SHARP)
- Scene mode detection (FOOD/PET/PORTRAIT/SPORTS)
- Advanced AE/AF controls
- Professional zoom range

But the **capture mechanism is broken**, so users can see it but can't use it.

---

## INDUSTRY CONTEXT: Why This Matters

### Browser Camera APIs Are Normally Limited
```js
// Standard browser camera (what 99% of apps use):
navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'environment' }
})
// Result: Basic stream, no control over AE/AF/zoom, mediocre quality
```

### CamTech v1.8 Is Different
- Full WebRTC Constraints API (advanced zoom, focus, exposure)
- Hardware capability probing (detects torch, continuous AF, etc.)
- Professional-grade stream setup
- Macro focusing (close-up detail)
- Scene presets (not just filters)

**You're building what native camera apps have.** This is cutting-edge for the web.

### Why Capture Breaks
The issue is likely:
1. Canvas capture isn't syncing with video resolution upgrade
2. Async resolution negotiation (4K upgrade in background) completes AFTER capture
3. Canvas dimensions mismatch video dimensions
4. Blob generation fails silently

---

## THE GOAL

**Build the best FOOD PHOTOGRAPHY camera on the browser.**

FoodSpot is a restaurant app. Users want to photograph food before ordering, or their meal after delivery. **The camera is the UGC engine.** Make it obsessed with food quality.

### Success Criteria (FOOD-FIRST)

**Tier 1 (Must Have) — FOOD-OBSESSED:**
1. ✅ **Photos actually capture** (BLOCKING — fix blob null issue)
2. ✅ **MACRO FOCUSING WORKS** (5-30cm close-up, sharp food detail)
3. ✅ **FOOD scene mode** (warm light, +1.2 EV, perfect for restaurant lighting)
4. ✅ All aspect ratios (9:16, 4:3, 1:1) fill screen, no letterbox
5. ✅ Zoom 0.5x–10x (get close or wide shot of entire dish)
6. ✅ Pinch-to-zoom on mobile (seamless zoom experience)
7. ✅ Flow works: Capture → EditorLayer → DualPostScreen → Save/Share

**Tier 1b (Still High Priority) — PET & PORTRAIT:**
- ✅ PET scene mode (continuous AF for moving animals)
- ✅ PORTRAIT mode (warm, face-detect if possible, for owner selfies with food)

**Skip Entirely:**
- ❌ SPORTS mode (not a sports app, waste of Fable's token budget)

**Tier 2 (Nice-to-Have) — Polish:**
- Flash effect (white flash, 100ms on capture)
- Pinch-to-zoom smoothness
- Filter integration with food presets

**Result:** Users can take **professional-quality UGC photos** in-app, annotate them, and share them instantly. No external camera needed.

---

## CURRENT IMPLEMENTATION

### File Structure
```
src/components/Camera/
├── index.jsx                   ← Main orchestrator
├── CameraLayer.jsx             ← ⚠️ WHAT YOU'LL FIX (capture broken here)
├── EditorLayer.jsx             ← 🔒 LOCKED (annotation pipeline)
├── DualPostScreen.jsx          ← 🔒 LOCKED (preview/save/share)
├── CameraTrigger.jsx           ← Activation UI
├── hooks/
│   └── useCamera.js            ← Camera stream management
├── utils/
│   ├── ExportEngine.js         ← Canvas export
│   ├── safariProtections.js    ← iOS workarounds
│   └── emojis.js
└── [Annotation components]     ← DrawTool, TextEditor, StickerDrawer, etc.
```

### Flow: Capture → Annotate → Save
```
User opens camera
    ↓
CameraLayer (capture)
    ↓
User taps "ONE TAKE" ← ⚠️ CURRENTLY BROKEN
    ↓
onCapture(imageBlob) ← Should return blob
    ↓
Camera.jsx switches to EDITOR mode
    ↓
EditorLayer (draw, stickers, text, filters)
    ↓
EditorLayer flattens to JPEG
    ↓
DualPostScreen (preview)
    ↓
PreviewActions (upload to Supabase, save locally)
    ↓
Done
```

---

## CAMERALAY.JSX — Current Implementation (WHAT NEEDS FIXING)

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
        captureFrame,    // ← Returns blob (BROKEN)
        zoomLevel,
        setZoom,
        zoomSupported
    } = useCamera()

    const businessName = tenantData?.business_name || 'FoodSpot'

    // Pinch-to-zoom (1x-3x, limited)
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
            const amplifiedFactor = 1 + (rawFactor - 1) * 2.5
            const newZoom = Math.max(1, Math.min(3, initialZoomRef.current * amplifiedFactor))  // ← LIMITED TO 3x
            setZoom(newZoom)
        }
    }

    // BROKEN: captureFrame() isn't returning blob
    const handleShutter = async () => {
        if (isCapturing) return
        setIsCapturing(true)

        try {
            const imageData = await captureFrame()  // ← Returns undefined/null
            if (imageData) {
                playShutterSound()
                onCapture(imageData)  // ← Never called
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

            {/* Right toolbar: flip, flash */}
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
                height: 'auto',
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

### useCamera.js Hook (Where Capture Happens)

```js
export function useCamera() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const trackRef = useRef(null)

    const [isReady, setIsReady] = useState(false)
    const [facingMode, setFacingMode] = useState('environment')
    const [error, setError] = useState(null)
    const [zoomLevel, setZoomLevel] = useState(1)

    // Init camera stream
    const initCamera = useCallback(async () => {
        try {
            // Phase 1: Fast preview
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

            // Phase 2: Background resolution upgrade (async)
            upgradeResolution(stream)  // ← Tries 4K in background
                .catch(() => {})
        } catch (err) {
            setError(err.message)
        }
    }, [facingMode])

    // PROBLEM: This is where capture fails
    const captureFrame = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return null

        const video = videoRef.current
        const canvas = canvasRef.current

        // Set canvas size to video dimensions
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        // Apply filter
        ctx.filter = getFilterStyle()

        // Mirror if selfie
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0)
            ctx.scale(-1, 1)
        }

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0)

        // Convert canvas to blob
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
        captureFrame,  // ← THIS IS BROKEN
        zoomLevel,
        setZoom,
        zoomSupported: false
    }
}
```

**Why Capture Breaks (Hypothesis):**
1. `upgradeResolution()` runs in background (Phase 2)
2. User taps shutter while resolution is negotiating
3. `videoWidth`/`videoHeight` are out of sync with actual stream
4. Canvas draws but blob generation fails
5. `captureFrame()` returns null/undefined
6. `onCapture()` never called

---

## EDITORLAYER & DUALPOSTSCREEN (LOCKED — DO NOT TOUCH)

### EditorLayer.jsx
```jsx
export default function EditorLayer({ 
    imageData,      // ← Must be a blob from CameraLayer
    onRetake,       // Go back to camera
    onDone,         // Finished editing
    toolPosition,
    neonContext,
    branding
})
```

**What it does:**
1. Receives blob from CameraLayer
2. Renders canvas with image
3. Allows drawing, text, stickers, emoji
4. Flattens to JPEG
5. Routes to DualPostScreen

**Contract:** Input blob must be valid image data.

### DualPostScreen.jsx
```jsx
export default function DualPostScreen({ 
    previewDataURL,
    previewBlob,
    cameraPinStyle,
    onClose,
    onComplete
})
```

**What it does:**
1. Shows immersive preview
2. Location pill
3. Action bar (save, share, download)
4. Uploads to Supabase

**Contract:** Input must be valid JPEG data URL + blob.

---

## YOUR TASK (FABLE)

### Primary Objective
**Fix the photo capture pipeline.**

The preview is gorgeous. The controls work. The only problem: **photos don't come back.**

### Detailed Requirements

#### 1. **Fix Photo Capture (BLOCKING)**
- Debug why `captureFrame()` returns null/undefined
- Likely issue: `videoWidth`/`videoHeight` race condition with background resolution upgrade
- Solutions:
  - Add explicit wait for `loadedmetadata` before capture
  - Sync canvas dimensions with video frame dimensions (not resolution)
  - Add fallback capture if resolution upgrade hasn't completed
  - Return blob reliably (test: tap shutter 10 times, all succeed)

#### 2. **Integrate CamTech v1.8**
- Reference: https://github.com/hikaribrandan3-code/camtech-enginev1.8.git
- Copy CamTech's capture engine + scene mode logic
- Preserve current UI (location pill, flip, flash buttons, layout)

#### 3. **Scene Modes (FOOD PRIMARY, PET + PORTRAIT SECONDARY)**
- **FOOD mode (⭐ CRITICAL — your #1 focus):**
  - Warm white balance (3200K — restaurant tungsten lighting)
  - +1.2 EV exposure boost (dark restaurants are dark)
  - Auto macro focus (5-30cm close-ups)
  - Test case: Photograph burger/pizza at 5cm — toppings must be sharp + appetizing
  - This is the **hero mode** — make it perfect
  
- PET mode (secondary):
  - Neutral white balance (5500K)
  - Continuous AF (moving animals)
  
- PORTRAIT mode (secondary):
  - Warm WB (3500K — flattering for faces)
  - Face detection if WebRTC supports it
  
- **SKIP SPORTS MODE** — Not a sports app, saves tokens for food quality
- Apply via WebRTC constraints if available, else canvas filters
- UI: Pills above shutter button [FOOD ⭐] [PET] [PORTRAIT]

#### 4. **Macro Focusing (CRITICAL FOR FOOD)**
- This is **not optional** — macro is what makes food photography beautiful
- Enable close-up capture: 5-30cm focus distance
- Test cases:
  - Burger at 5cm: see sesame seeds on bun
  - Pizza at 10cm: see cheese texture + basil
  - Sushi at 8cm: see rice grains
  - All should be sharp, not blurry
- CamTech v1.8 has this — port the focus distance constraint
- Fallback: Canvas sharpening filter if hardware doesn't support

#### 5. **Zoom Range: 0.5x → 10x**
- **Why:** Food shots need both wide (full plate) and tight (detail)
  - 0.5x: Entire table spread
  - 1x: Normal distance
  - 4x: Tight food detail (caramelization, garnish)
  - 10x: Extreme macro (texture, detail)
- Button controls: [0.5x] [1x] [2x] [4x] [8x] [10x]
- Display zoom level: "4.0x" text
- Pinch-to-zoom: Two-finger pinch 0.5x–10x smoothly (mobile critical)
- Desktop: buttons only. Mobile: buttons + pinch.

#### 6. **Aspect Ratio Fix**
- **9:16** ✅ Already works
- **4:3** ❌ Fix letterboxing (should fill screen)
- **1:1** ❌ Fix letterboxing (should fill screen)
- Solution: Calculate canvas size to fill viewport within ratio
  ```js
  const maxWidth = Math.min(window.innerWidth, maxWidthForRatio)
  const height = (maxWidth / ratio) proportional
  canvas.width = maxWidth
  canvas.height = height
  ```

#### 7. **Flash Effect (Nice-to-Have)**
- On shutter: white overlay, 100ms fade
- CSS animation or canvas overlay

#### 8. **Preserve Integration Contract**
- **KEEP:** `CameraLayer` component signature
- **KEEP:** `onCapture(imageBlob)` callback
- **KEEP:** EditorLayer/DualPostScreen untouched
- **KEEP:** TenantContext available
- **KEEP:** Location pill styling
- **MUST:** Flow works end-to-end (capture → editor → save)

---

## LOCKED FILES (DO NOT MODIFY)

These are integration boundaries. Changing them breaks the whole flow.

```
🔒 index.jsx (Camera.jsx orchestrator)
🔒 EditorLayer.jsx (annotation pipeline)
🔒 DualPostScreen.jsx (preview/save)
🔒 CameraTrigger.jsx (activation)
🔒 useCameraActivation.js (receipt/status page hook)
🔒 Any file importing CameraLayer
🔒 All other annotation components (DrawTool, TextEditor, etc.)
```

---

## FILES TO CREATE/MODIFY

### Create New
- `CameraCapture.jsx` — Core capture engine (replaces CameraLayer internals)
- `CameraUI.jsx` — Scene mode, zoom, aspect ratio controls
- `utils/scenePresets.js` — Mode profiles (FOOD, PET, PORTRAIT, SPORTS)
- `utils/zoomController.js` — Zoom + pinch logic

### Modify
- `CameraLayer.jsx` — Use CameraCapture inside, keep signature
- `hooks/useCamera.js` — Extend with scene mode logic (or refactor to CameraCapture)
- `utils/cameraUtils.js` — Add helpers for scene/zoom

---

## TESTING CHECKLIST

### Capture (CRITICAL)
- [ ] Shutter button captures photo
- [ ] `onCapture(blob)` called
- [ ] Blob is valid image data
- [ ] EditorLayer receives image
- [ ] Captured image displays in editor
- [ ] Flow: capture → editor → preview → save works

### Aspect Ratios
- [ ] 9:16 fills screen (already works)
- [ ] 4:3 fills screen (no letterbox)
- [ ] 1:1 fills screen (no letterbox)
- [ ] Aspect selector visible in UI
- [ ] Switching ratios doesn't break capture

### Scene Modes (FOOD-FIRST)
- [ ] **FOOD mode (CRITICAL):** 
  - [ ] Warm color temperature applied
  - [ ] Macro focus works (5-30cm)
  - [ ] +1.2 EV brightness boost visible
  - [ ] Test: Burger/pizza/sushi shot at 5cm — sharp + appetizing
  - [ ] Test: Dark restaurant lighting — still visible
- [ ] PET mode: neutral, continuous AF (moving animals stay sharp)
- [ ] PORTRAIT mode: warm, face detect (owner with food looks good)
- [ ] Mode selector visible
- [ ] Switching modes doesn't break capture
- [ ] **SPORTS mode: NOT IMPLEMENTED** (save Fable tokens for food quality)

### Zoom
- [ ] Button zoom: 0.5x → 10x works
- [ ] Zoom level displays ("4.0x")
- [ ] Pinch-to-zoom on mobile (375px–768px)
- [ ] Pinch scales 0.5x–10x, clamped to valid range
- [ ] Desktop: pinch disabled
- [ ] Zoom doesn't break capture

### Mobile Responsive
- [ ] 375px: no overflow, all controls visible
- [ ] 768px: scales properly
- [ ] 1024px+: desktop layout
- [ ] Touch targets ≥ 48px
- [ ] No horizontal scroll
- [ ] Pinch works on mobile

### Integration
- [ ] TenantContext available (businessName, etc.)
- [ ] LanguageContext available (if needed)
- [ ] No console errors
- [ ] Capture → Editor → Preview → Save works
- [ ] Dark mode support (if app has it)

### Code Quality
- [ ] No external dependencies (vanilla JS + React)
- [ ] No hardcoded colors (use CSS tokens)
- [ ] Mediastream cleaned up on unmount
- [ ] Error handling for camera permission denial
- [ ] Comments on non-obvious logic

---

## RECOMMENDATIONS: Why CamTech + What to Watch For

## Why Macro Matters for Food Photography

Food is **tactile and textured.** Professional food photographers shoot:
- **Close-ups:** Sesame seeds on a bun, melted cheese, caramelization
- **Macro:** Rice grains on sushi, herbs on a plate, chocolate shavings
- **Detail:** Tells the story of quality, freshness, craftsmanship

**Standard browser cameras can't macro.** They focus at 50cm+ minimum. CamTech enables 5-30cm focus distance — **this is the superpower.**

**Example:**
- Standard camera at 5cm: Blurry, unusable
- CamTech FOOD mode at 5cm: Sharp sesame seeds, appetizing texture

That difference = users share photos = food porn = viral marketing for restaurants.

**Your priority:** Make FOOD mode macro so good that users instinctively want to photograph their meals.

---

### Why This Approach Works
CamTech v1.8 is built on **WebRTC Constraints API**, which is the professional way to control mobile cameras:

```js
// What standard apps do:
getUserMedia({ video: { facingMode: 'environment' } })
// Result: Basic stream, no control

// What CamTech does:
// Phase 1: Fast preview
getUserMedia({ video: { facingMode } })
// Phase 2: Background upgrade
applyConstraints({
  width: { ideal: 3840 },
  height: { ideal: 2160 },
  advanced: [{
    focusMode: 'continuous',
    exposureMode: 'continuous',
    zoom: { min: 0.5, max: 10 }
  }]
})
// Result: Professional-grade control
```

**CamTech patterns you should use:**
1. **Two-phase initialization** — Fast preview + background upgrade
2. **Capability probing** — Detect what hardware supports
3. **Scene presets** — AE/AF profiles for different use cases
4. **Async macro** — Enable close-focus for food photography
5. **Pinch gesture** — Full zoom range on mobile

### Critical Watch Points

#### 1. **Resolution Upgrade Race Condition**
CamTech tries 4K in the background. If user captures during upgrade:
- **Problem:** Canvas dimensions don't match video stream
- **Fix:** Wait for `loadedmetadata` or explicit sync
- **Test:** Spam the shutter button 50 times in a row

#### 2. **Canvas vs. Video Dimensions**
```js
// WRONG:
canvas.width = video.videoWidth   // Might be 4K (huge)
canvas.height = video.videoHeight // Out of sync

// RIGHT:
const rect = video.getBoundingClientRect()
canvas.width = rect.width
canvas.height = rect.height
```

#### 3. **Pinch Detection**
Two-finger pinch must be precise:
```js
// Good pinch detection:
const distance = Math.sqrt(
  Math.pow(touch1.x - touch2.x, 2) + 
  Math.pow(touch1.y - touch2.y, 2)
)
const ratio = currentDistance / previousDistance
// Apply smooth: newZoom = previousZoom * ratio * smoothingFactor
```

#### 4. **Safari iOS Quirks**
- `mediaDevices.getUserMedia` requires HTTPS
- Zoom might not work on older iOS
- `toBlob()` might timeout on high-res captures
- Fallback: `toDataURL()` then blob conversion

#### 5. **Aspect Ratio Letterboxing Root Cause**
Current code likely:
```js
// WRONG: Constrains video dimensions to aspect ratio
video.width = 360
video.height = 640
// Result: Aspect ratio preserved but image shrinks

// RIGHT: Fill container, clip to aspect ratio
video.width = 100%
video.height = auto
object-fit: cover  // Crops, doesn't shrink
```

### Advanced Features You Could Add (Post-Launch)

1. **HDR Support** — `enableHdr()` constraint
2. **RAW Format** — If device supports, higher quality
3. **Face Detection** — Detect faces for PORTRAIT mode
4. **Object Detection** — Detect food in FOOD mode, auto-focus on it
5. **Gesture Feedback** — Haptic on iOS when focus locks
6. **Bracketing** — Take 3 photos (underexposed, normal, overexposed) for HDR
7. **Video Mode** — Record video instead of stills
8. **Picture-in-Picture** — Show zoom preview while pinching

---

## ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────┐
│                  Camera.jsx                          │
│           (State: CAMERA | EDITOR)                   │
└────────────────┬──────────────────┬──────────────────┘
                 │                  │
         ┌───────▼────────┐   ┌────▼──────────┐
         │  CameraLayer   │   │  EditorLayer  │
         │ (CAPTURE)      │   │ (ANNOTATE)    │
         └────────────────┘   └────┬──────────┘
                                    │
                           ┌────────▼──────────┐
                           │ DualPostScreen    │
                           │ (PREVIEW/SAVE)    │
                           └───────────────────┘

CameraLayer internals:
  ├── CameraCapture (NEW — core engine from CamTech v1.8)
  │   ├── Canvas setup (DPR-aware)
  │   ├── Scene presets (FOOD/PET/PORTRAIT/SPORTS)
  │   ├── Zoom controller (0.5x-10x)
  │   ├── Pinch-to-zoom detector
  │   ├── Macro focus logic
  │   └── Capture: video → canvas → blob
  │
  ├── CameraUI (NEW — control UI)
  │   ├── Scene mode selector
  │   ├── Aspect ratio selector
  │   ├── Zoom buttons [0.5x] ... [10x]
  │   ├── Zoom display "4.0x"
  │   └── Shutter + Filter buttons
  │
  └── useCamera (ENHANCED)
      ├── Mediastream setup
      ├── Hardware probing
      ├── Resolution upgrade
      └── Capture sync
```

---

## SUCCESS METRICS

**Launch Ready When:**
1. ✅ Photos actually capture (fix blob issue)
2. ✅ All aspect ratios full-screen
3. ✅ Scene modes work (FOOD sharp macro focus)
4. ✅ Zoom 0.5x–10x (pinch + buttons)
5. ✅ No console errors
6. ✅ Mobile responsive (375px–2560px)
7. ✅ Integration intact (capture → editor → save)
8. ✅ Testing checklist 100% pass

**You're shipping the most advanced in-browser camera app in the world.**

---

## REFERENCES

- **CamTech v1.8 Repo:** https://github.com/hikaribrandan3-code/camtech-enginev1.8.git
- **FoodSpot Camera Path:** `/src/components/Camera/`
- **WebRTC Constraints Spec:** https://www.w3.org/TR/mediacapture-streams/
- **Canvas API:** https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **Context:** `useTenant()` for `businessId`, `tenantData`, `business_name`

---

## YOUR BRIEF FOR FABLE

> **Context:** FoodSpot is a restaurant app. The camera is the UGC engine — users photograph food, annotate, and share. You're building the best food photography camera on the browser.
>
> **Why this matters:** Normal browsers can't macro focus (5cm+). CamTech enables it. Combined with warm light + exposure boost = users photograph meals = restaurants go viral.
>
> **Your task:**
>
> 1. **Fix photo capture** (blocking) — blob returns null, likely race condition with background resolution upgrade
> 2. **FOOD scene mode** (hero feature) — warm 3200K + 1.2 EV boost + macro 5-30cm focus
> 3. **Macro focusing** — toppings, garnish, rice grains must be sharp at 5-30cm (this is the superpower)
> 4. **Zoom 0.5x–10x + pinch** — wide dish view to tight detail on mobile
> 5. **Aspect ratios fixed** — 9:16, 4:3, 1:1 all fill screen (no letterbox)
> 6. **PET mode** — continuous AF for moving animals
> 7. **PORTRAIT mode** — warm, face-detect, for owner selfies with food
>
> **Constraints (critical):**
> - Preserve EditorLayer/DualPostScreen (they're untouchable)
> - Keep CameraLayer signature + onCapture(blob) callback
> - Integration contract: capture → editor → save must work end-to-end
> - No external dependencies beyond React + CamTech patterns
> - Use CSS tokens (no hardcoded colors)
>
> **Skip entirely:** SPORTS mode (not a sports app, waste of tokens on food quality)
>
> **Effort:** `high`. This is complex but well-specified — first-shot correctness is achievable.
>
> **When you have enough context, start coding.** Don't over-plan or ask clarifying questions. Use the testing checklist to verify as you build.
>
> **Test with real food:** Photograph burger, pizza, sushi at 5-10cm. Should look appetizing, sharp detail visible.
>
> **Go.** 🚀

---

---

## Fable 5 Optimizations (How to Get First-Shot Correctness)

### What Fable Does Well (Use These Strengths)

1. **First-shot correctness on well-specified problems** — Your PRD is detailed + specific (not vague)
2. **Code review + debugging** — Fable's bug-finding recall is high; the blob race condition is a debugging task (Fable's strong suit)
3. **Navigating ambiguity** — The capture logic has multiple possible race conditions; Fable will explore them
4. **Self-verification** — Build verification into the workflow (test checklist)

### How to Brief Fable for Maximum Success

- **Lead with context, not just the request** ✅ (included above)
- **Be specific about constraints** ✅ (locked files, no external deps, CSS tokens)
- **Don't ask him to over-plan** — Tell him to start coding when ready
- **Give the "why"** ✅ (food photography, macro is superpower, UGC engine)
- **Self-verify as you go** — After each section (capture, scene modes, zoom), test against checklist
- **Use effort: high** — Complex task, higher effort = better verification

### What NOT to Do

- ❌ Don't ask Fable to explain his thinking in the output (it can trigger refusals)
- ❌ Don't ask for exhaustive option surveys (he'll give you recommendations instead)
- ❌ Don't micro-manage — he's better at autonomous problem-solving than prior models
- ❌ Don't ask clarifying questions — the PRD is detailed enough for implementation

---

**Status:** READY FOR FABLE ✅  
**Priority:** HIGH  
**Complexity:** Advanced (WebRTC, canvas, pinch detection, hardware probing)  
**Effort Level:** high (default for complex tasks)  
**Timeline:** ASAP (capture is broken, blocking entire feature)  
**Expected Turnaround:** One solid session (well-specified problem = first-shot correctness)

**Go build something wild.** 🚀
