# CamTech v1.8 Integration PRD
## FoodSpot Camera Module Upgrade

**Date:** June 9, 2026  
**Owner:** Hikari Brandan  
**Status:** Ready for Fable implementation  
**Priority:** HIGH  

---

## Executive Summary

Integrate CamTech Engine v1.8 (professional-grade capture system with scene modes, advanced zoom, and macro focusing) into FoodSpot's existing camera module. The goal is to transform the camera into an **elite, feature-rich mobile camera** while preserving the existing annotation → save/share pipeline.

**End State:** Users get FOOD/PET/PORTRAIT/SPORTS scene modes, pinch-to-zoom, macro focusing, and full-screen aspect ratios—all flowing seamlessly into FoodSpot's editor for annotations and sharing.

---

## Current State: FoodSpot Camera

### Existing Pipeline (MUST PRESERVE)
```
CameraLayer (capture)
    ↓
EditorLayer (annotate/draw/stickers)
    ↓
DualPostScreen (save/share)
```

### Current Capabilities
- Basic camera feed
- Capture to canvas
- Post-capture annotation (draw, stickers, filters)
- Save/share flow (local or upload to Supabase)

### Current Integration Points
- `useCameraActivation` hook — triggers camera on Receipt/OrderStatus pages
- `TenantContext` + `LanguageContext` — global state available
- Supabase integration for media uploads
- Tailwind CSS styling (follows app design tokens)

---

## Reference Technology: CamTech v1.8

### What CamTech Has
- **Scene Modes:** FOOD, PET, PORTRAIT, SPORTS (preset AE/AF/focus profiles)
- **Zoom:** Buttons (0.5x–10x) + pinch gesture support
- **Macro Focusing:** Excellent close-up capture (keyboard/food shots)
- **AE/AF Toggle:** Auto exposure/auto focus controls
- **Aspect Ratios:** 9:16 (works), 4:3 (broken—letterbox), 1:1 (broken—letterbox)
- **Flash:** Button present but non-functional
- **Mobile-first Canvas:** DPR-aware, pixel-perfect rendering

### CamTech Architecture
- Single HTML file (~85KB)
- Vanilla JavaScript (no framework dependencies)
- Canvas-based capture
- Mediastream API for camera access
- SOVEREIGN v1.3 CSS injection (dev tool—remove before merge)

---

## Integration Goals

### Must-Have (Blocking)
1. **Scene Modes** — FOOD, PET, PORTRAIT, SPORTS available in capture UI
2. **Pinch-to-Zoom** — Two-finger pinch scales camera feed (mobile)
3. **All Aspect Ratios Full-Screen** — 9:16, 4:3, 1:1 fill viewport without letterboxing
4. **Macro Focusing** — Close-up capture works (test with food/product shots)
5. **Preserve Pipeline** — Captured image routes to EditorLayer without modification
6. **Mobile Responsive** — Works on 375px–1200px viewports

### Nice-to-Have (Post-launch)
- Flash effect on capture (screen white flash)
- Pinch-to-zoom smoothness improvements
- Gesture feedback (haptic on iOS)
- Filter presets (e.g., "Warm" for food, "Saturated" for pets)

### Must NOT Break
- EditorLayer.jsx annotation flow
- DualPostScreen.jsx save/share
- useCameraActivation hook
- Supabase media upload
- LanguageContext translations
- TenantContext multi-tenancy

---

## Architecture

### Current File Structure
```
src/components/Camera/
├── CameraLayer.jsx           ← LOCKED (replace internals, keep exports)
├── EditorLayer.jsx           ← LOCKED (do not touch)
├── DualPostScreen.jsx        ← LOCKED (do not touch)
├── Camera.jsx                ← LOCKED (orchestration only)
├── useCameraActivation.js    ← LOCKED (do not touch)
└── utils/
    └── cameraUtils.js        ← CAN MODIFY (add scene mode logic)
```

### Integration Architecture
```
NEW: CameraCapture.jsx (replaces CameraLayer internals)
  ├── Canvas setup (DPR-aware, 9:16/4:3/1:1)
  ├── Mediastream API
  ├── Scene mode presets (AE/AF profiles)
  ├── Zoom controller (buttons + pinch gesture)
  ├── Macro focus logic
  └── Capture trigger → returns ImageData

Existing: EditorLayer.jsx (UNCHANGED)
  ├── Receives ImageData from CameraCapture
  ├── Annotation pipeline (draw, stickers, filters)
  └── Outputs annotated image

Existing: DualPostScreen.jsx (UNCHANGED)
  ├── Receives annotated image
  ├── Save/share logic
  └── Supabase upload
```

---

## Locked Files (DO NOT MODIFY)

These files are integration points. Do not change their exports, props, or behavior:

1. **EditorLayer.jsx**
   - Receives: `{ imageData, onBack, onSave }`
   - Do not modify annotation logic
   - Do not change the save/export flow

2. **DualPostScreen.jsx**
   - Receives: `{ imageData, onBack, onUpload }`
   - Do not modify UI or save logic

3. **Camera.jsx**
   - Orchestration wrapper
   - State management (imageData, currentMode)
   - Do not restructure the component tree

4. **useCameraActivation.js**
   - Hook that triggers camera on Receipt/OrderStatus
   - Do not change the hook signature
   - Do not modify when/how it's called

5. **Any file importing CameraLayer**
   - Pages that render the camera (Receipt.jsx, OrderStatus.jsx)
   - Do not modify their imports or integration

---

## New / Modified Files

### New Files to Create

#### 1. **CameraCapture.jsx** (REPLACES CameraLayer internals)
```jsx
// Handles all camera capture logic from CamTech v1.8
// Exports: <CameraCapture imageData={data} onCapture={fn} sceneMode={mode} />

Props:
  - sceneMode: 'FOOD' | 'PET' | 'PORTRAIT' | 'SPORTS' (default: 'FOOD')
  - aspectRatio: '9:16' | '4:3' | '1:1' (default: '9:16')
  - onCapture(imageData): callback when photo taken
  - onBack(): callback for close button

Responsibilities:
  - Canvas setup (DPR-aware, responsive)
  - Mediastream camera access
  - Zoom control (buttons + pinch)
  - Scene mode AE/AF profiles
  - Macro focus logic
  - Flash effect on capture
  - Full-screen rendering (all aspect ratios)
```

#### 2. **utils/scenePresets.js** (NEW)
```js
// Scene mode AE/AF profiles from CamTech
export const SCENE_PRESETS = {
  FOOD: { exposure: 1.2, focus: 'auto', colorTemp: 'warm' },
  PET: { exposure: 1.0, focus: 'continuous', colorTemp: 'neutral' },
  PORTRAIT: { exposure: 0.9, focus: 'face', colorTemp: 'warm' },
  SPORTS: { exposure: 1.1, focus: 'tracking', colorTemp: 'cool' }
};

export const ASPECT_RATIOS = {
  '9:16': { width: 360, height: 640 },
  '4:3': { width: 640, height: 480 },
  '1:1': { width: 512, height: 512 }
};
```

#### 3. **utils/zoomController.js** (NEW)
```js
// Zoom logic (button + pinch)
// Handles 0.5x → 10x zoom levels
// Implements pinch-to-zoom gesture detection
// Returns: { zoom, setZoom, handlePinch }
```

#### 4. **CameraUI.jsx** (NEW)
```jsx
// Replaces CamTech's HTML UI controls
// Renders: ratio selector, scene modes, zoom buttons, AE/AF toggle, flash button
// Uses Tailwind CSS (matches FoodSpot design)

Props:
  - sceneMode, setSceneMode
  - aspectRatio, setAspectRatio
  - zoom, setZoom
  - aeaf, setAeaf
  - onCapture
  - onBack
```

### Modified Files

#### 1. **CameraLayer.jsx**
```jsx
// KEEP: exports, props signature
// REPLACE: internal implementation with CameraCapture
// OLD: <canvas> + mediastream code
// NEW: <CameraCapture ... />

// No changes to:
// - Component signature
// - Props interface (imageData, onCapture, etc.)
// - Integration with Editor/DualPost
```

#### 2. **utils/cameraUtils.js**
```js
// ADD: Scene preset application logic
// ADD: Pinch event handlers
// ADD: Canvas DPR calculation
// KEEP: Existing utility functions
```

---

## Technical Requirements

### Scene Modes (Capture Profiles)

Each mode adjusts camera settings for optimal capture:

| Mode | Use Case | AE | AF | Focus Distance | Color Temp |
|------|----------|----|----|---|---|
| **FOOD** | Close-up food shots | +1.2 EV | Auto | Macro (5–30cm) | Warm (3200K) |
| **PET** | Animals, moving subjects | ±0.0 EV | Continuous | Normal | Neutral (5500K) |
| **PORTRAIT** | People, faces | -0.9 EV | Face detect | Normal | Warm (3500K) |
| **SPORTS** | Action, tracking | +1.1 EV | Tracking | Normal | Cool (6500K) |

**Implementation:**
- Apply via `getImageData()` → canvas filters or WebGL
- Or: Pass as hints to mediastream constraints (if supported)
- Fallback: Pure CSS filters on canvas output

### Zoom System

**Button Zoom:**
- Levels: 0.5x, 1x, 2x, 4x (default), 8x, 10x
- Updates displayed as "4.0x" text
- Smooth transition

**Pinch-to-Zoom:**
- Two-finger pinch scales 0.5x–10x
- Clamps to valid range
- Desktop: disabled (buttons only)
- Mobile: high priority

**Implementation:**
- `onpointerdown` + `onpointermove` to detect two-finger distance
- Calculate zoom = newDistance / startDistance
- Apply via canvas `transform: scale()` or video element zoom

### Aspect Ratios

**Current Issues:**
- 9:16 ✅ works
- 4:3 ❌ letterboxes (shrinks canvas)
- 1:1 ❌ letterboxes (shrinks canvas)

**Fix:**
- Calculate canvas size to fill viewport within ratio constraint
- `Math.min(window.innerWidth, aspectWidth)` for max width
- Scale height proportionally
- Ensure canvas stretches edge-to-edge (no black bars)

### Macro Focusing

- CamTech achieves macro via focus distance adjustment
- Implementation: WebRTC `focusDistance` constraint (if available)
- Fallback: Use software sharpening filters in canvas post-processing
- Test case: Keyboard keys (sharp detail at 5–10cm)

### Flash Effect

- On capture trigger: briefly flash white overlay
- Duration: 100–150ms
- Implementation: 
  ```css
  @keyframes flashCapture {
    0% { opacity: 1; }
    50% { opacity: 1; }
    100% { opacity: 0; }
  }
  /* Animated div overlaid on canvas */
  ```

### Mobile Responsiveness

- Test viewports: 375px, 768px, 1024px, 1200px
- Canvas should fill available space
- Controls should not overlap camera feed
- Touch targets ≥ 48px (WCAG)
- No horizontal scroll

---

## File Structure (Final)

```
src/components/Camera/
├── CameraLayer.jsx              ← MODIFIED (CameraCapture inside)
├── CameraCapture.jsx            ← NEW (core capture engine)
├── CameraUI.jsx                 ← NEW (controls: ratio, mode, zoom)
├── EditorLayer.jsx              ← LOCKED
├── DualPostScreen.jsx           ← LOCKED
├── Camera.jsx                   ← LOCKED
├── useCameraActivation.js       ← LOCKED
└── utils/
    ├── cameraUtils.js           ← MODIFIED (add scene logic)
    ├── scenePresets.js          ← NEW
    ├── zoomController.js        ← NEW
    └── [existing utils...]      ← LOCKED
```

---

## Feature Specifications

### Scene Mode UI
```
┌─────────────────────────────────────┐
│ ← SETTINGS                  AE/AF ◯ │
├─────────────────────────────────────┤
│ RATIO: [9:16] [4:3] [1:1]          │
│                                     │
│ SCENE: [FOOD] [PET] [PORTRAIT] ... │
│                                     │
│ [Camera Feed - fills screen]        │
│                                     │
│ ZOOM: [0.5x] [1x] [2x] [4x*]      │
│        [8x]  [10x]   →  4.0x       │
│                                     │
│ [ONE TAKE / CAPTURE BUTTON]        │
└─────────────────────────────────────┘
```

### Gestures
- **Pinch-to-zoom:** Two fingers, measure distance, scale 0.5x–10x
- **Tap to focus:** Single tap sets focus point (if WebRTC supports)
- **Double-tap:** Reset zoom to 1x

### Capture Flow
1. User taps **ONE TAKE** button
2. Flash effect plays (100ms white overlay)
3. Canvas captures current frame as ImageData
4. Return ImageData to parent (CameraLayer/EditorLayer)
5. EditorLayer receives image and shows annotation UI

---

## Constraints & Guardrails

### DO NOT
- Modify EditorLayer.jsx, DualPostScreen.jsx, useCameraActivation.js
- Break the imageData flow (capture → editor → save)
- Remove or refactor Camera.jsx orchestration
- Add external dependencies (keep vanilla JS)
- Use hardcoded colors (use CSS tokens: `--color-primary`, etc.)
- Deploy without testing aspect ratios at 375px viewport

### DO
- Preserve component prop signatures
- Test capture → editor flow end-to-end
- Use Tailwind for all new UI
- Export CameraCapture as a clean, reusable component
- Handle mediastream errors gracefully (camera permissions denied, etc.)
- Clean up mediastream on unmount (no lingering tracks)

---

## Testing Checklist

Before submitting:

- [ ] **Capture**
  - [ ] All aspect ratios (9:16, 4:3, 1:1) render full-screen (no letterbox)
  - [ ] Canvas is DPR-aware (crisp on Retina/high-DPI)
  - [ ] ONE TAKE button captures frame
  - [ ] Captured image is passed to EditorLayer

- [ ] **Scene Modes**
  - [ ] FOOD preset applies (warm color, macro focus)
  - [ ] PET preset applies
  - [ ] PORTRAIT preset applies
  - [ ] SPORTS preset applies
  - [ ] Mode switching doesn't break capture

- [ ] **Zoom**
  - [ ] Button zoom: 0.5x → 10x works
  - [ ] Zoom level displays correctly (e.g., "4.0x")
  - [ ] Pinch-to-zoom works on mobile (375px–768px)
  - [ ] Pinch clamps to valid range (0.5x–10x)
  - [ ] Desktop: pinch disabled (buttons only)

- [ ] **Mobile Responsive**
  - [ ] 375px: no overflow, controls visible
  - [ ] 768px: scales properly
  - [ ] 1024px+: desktop layout
  - [ ] Touch targets ≥ 48px

- [ ] **Integration**
  - [ ] Capture → EditorLayer flow works
  - [ ] EditorLayer annotation works on captured image
  - [ ] DualPostScreen save/share works
  - [ ] TenantContext available in CameraCapture (if needed)
  - [ ] No console errors

- [ ] **Code Quality**
  - [ ] No external dependencies added
  - [ ] No hardcoded colors (use CSS tokens)
  - [ ] Mediastream cleaned up on unmount
  - [ ] Error handling for camera access denial
  - [ ] Comments where logic is non-obvious

---

## Deliverables

1. **CameraCapture.jsx** — Production-ready capture component
2. **CameraUI.jsx** — Control UI (ratio, scene, zoom, capture button)
3. **utils/scenePresets.js** — Scene mode profiles
4. **utils/zoomController.js** — Zoom + pinch logic
5. **Modified CameraLayer.jsx** — Uses CameraCapture (exports unchanged)
6. **Modified cameraUtils.js** — Scene/zoom helpers
7. **Zero breaking changes** to EditorLayer, DualPostScreen, or useCameraActivation
8. **PR/commit message:**
   ```
   Integrate CamTech v1.8: add scene modes, pinch-to-zoom, macro, all aspect ratios
   
   - Replace CameraLayer capture with CamTech engine
   - Add FOOD/PET/PORTRAIT/SPORTS scene presets
   - Implement pinch-to-zoom (0.5x–10x)
   - Fix aspect ratio scaling (9:16, 4:3, 1:1 full-screen)
   - Preserve EditorLayer/DualPostScreen pipeline
   - All tests pass, mobile responsive 375px+
   ```

---

## Reference Links

- **CamTech v1.8 Repo:** https://github.com/hikaribrandan3-code/camtech-enginev1.8.git
- **Current Camera:** `/src/components/Camera/`
- **FoodSpot Codebase:** `/src/`
- **Camera Integration Points:** `Receipt.jsx`, `OrderStatus.jsx` (pages that render camera)

---

## Questions for Fable

1. **WebRTC Constraints:** Can you use `focusDistance` or `zoom` constraints from mediastream for macro/zoom, or is canvas post-processing necessary?
2. **Scene Presets:** Should scene modes apply via canvas filters (pure JS) or WebRTC constraints (if available)?
3. **Pinch Detection:** Do you have a preference for pinch-to-zoom implementation (pointer events vs. touch events)?
4. **Testing:** Should I provide test cases, or are you confident in the end-to-end flow?

---

**Status:** Ready to hand to Fable ✅  
**Last Updated:** June 9, 2026  
**Next Step:** Send to Fable with CamTech v1.8 repo + FoodSpot camera folder
