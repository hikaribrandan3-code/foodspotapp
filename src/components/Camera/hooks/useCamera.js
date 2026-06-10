/**
 * FoodSpot Camera — useCamera (capture engine + CamTech v1.8 features)
 * --------------------------------------------------------------------
 * Capture engine: getUserMedia → <video> → canvas grab (synchronous
 * drawImage, so rapid shutter taps each get a real frame — no debounce,
 * no dropped shots).
 *
 * CamTech features layered on top:
 *  - Scene modes (FOOD / PET / PORTRAIT) via scenePresets.js
 *  - Macro focus 5–30 cm (manual focusDistance when hardware allows)
 *  - Zoom 0.5x–10x: hardware zoom where the lens supports it,
 *    digital zoom (preview transform + capture crop) for the rest
 *  - AE/AF lock: freezes exposure/focus/WB at current values
 *  - Tap-to-focus / tap-to-expose (pointsOfInterest + single-shot)
 *  - Flash: rear torch pulse, front screen-flash (handled by UI flag)
 *  - Aspect-aware capture crop: 9:16, 4:3, 1:1
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SCENE_PRESETS,
  DEFAULT_SCENE,
  MACRO_RANGE_M,
  composeFilter,
} from '../utils/scenePresets';

export const ZOOM_UI_MIN = 0.5;
export const ZOOM_UI_MAX = 10;

const ASPECTS = {
  '9:16': 9 / 16,
  '4:3': 3 / 4, // portrait orientation: width/height
  '1:1': 1,
};

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function useCamera({ initialScene = DEFAULT_SCENE } = {}) {
  // ---- public state -------------------------------------------------
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [facing, setFacing] = useState('environment');
  const [sceneMode, setSceneMode] = useState(initialScene);
  const [zoom, setZoom] = useState(1); // effective UI zoom (0.5–10)
  const [aeafLocked, setAeafLocked] = useState(false);
  const [flashMode, setFlashMode] = useState('off'); // 'off' | 'on'
  const [aspect, setAspect] = useState('9:16');
  const [filterId, setFilterId] = useState('original');
  const [macroOn, setMacroOn] = useState(false);
  const [macroDistance, setMacroDistance] = useState(0.12); // meters
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [zoomFloor, setZoomFloor] = useState(1); // 0.5 only if lens supports
  const [faces, setFaces] = useState([]); // normalized boxes for PORTRAIT

  // ---- internals ----------------------------------------------------
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const capsRef = useRef({});
  const hwZoomRef = useRef({ min: 1, max: 1, supported: false });
  const digitalZoomRef = useRef(1); // portion of zoom done in software
  const faceTimerRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const pinchRef = useRef({ active: false, startDist: 0, startZoom: 1 });

  // =====================================================================
  // STREAM LIFECYCLE
  // =====================================================================

  const stop = useCallback(() => {
    if (faceTimerRef.current) {
      clearInterval(faceTimerRef.current);
      faceTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      trackRef.current = null;
    }
    setReady(false);
  }, []);

  const safeApply = useCallback(async (advancedEntries) => {
    // Apply each constraint entry independently so an unsupported key
    // never rejects the whole batch.
    const track = trackRef.current;
    if (!track || !track.applyConstraints) return;
    for (const entry of advancedEntries) {
      try {
        await track.applyConstraints({ advanced: [entry] });
      } catch {
        /* unsupported on this device — fallback look covers it */
      }
    }
  }, []);

  const applyScenePreset = useCallback(
    async (sceneId, { lock = false } = {}) => {
      const preset = SCENE_PRESETS[sceneId] || SCENE_PRESETS[DEFAULT_SCENE];
      const caps = capsRef.current || {};
      const entries = [];

      // White balance
      if (caps.whiteBalanceMode) {
        if (
          preset.whiteBalance.mode === 'manual' &&
          caps.whiteBalanceMode.includes('manual') &&
          caps.colorTemperature
        ) {
          const ct = clamp(
            preset.whiteBalance.colorTemperature,
            caps.colorTemperature.min,
            caps.colorTemperature.max
          );
          entries.push({ whiteBalanceMode: 'manual', colorTemperature: ct });
        } else if (caps.whiteBalanceMode.includes('continuous')) {
          entries.push({ whiteBalanceMode: 'continuous' });
        }
      }

      // Exposure compensation (EV)
      if (caps.exposureCompensation) {
        const ev = clamp(
          preset.exposureCompensation,
          caps.exposureCompensation.min,
          caps.exposureCompensation.max
        );
        entries.push({ exposureCompensation: ev });
      }
      if (caps.exposureMode && caps.exposureMode.includes('continuous') && !lock) {
        entries.push({ exposureMode: 'continuous' });
      }

      // Focus
      if (caps.focusMode && caps.focusMode.includes('continuous') && !lock) {
        entries.push({ focusMode: 'continuous' });
      }

      await safeApply(entries);
    },
    [safeApply]
  );

  const probeCapabilities = useCallback((track) => {
    let caps = {};
    try {
      caps = track.getCapabilities ? track.getCapabilities() : {};
    } catch {
      caps = {};
    }
    capsRef.current = caps;

    // Hardware zoom range
    if (caps.zoom && typeof caps.zoom.min === 'number') {
      hwZoomRef.current = {
        min: caps.zoom.min,
        max: caps.zoom.max,
        supported: true,
      };
      // 0.5x is only reachable if the lens itself goes below 1x
      setZoomFloor(caps.zoom.min < 1 ? Math.max(ZOOM_UI_MIN, caps.zoom.min) : 1);
    } else {
      hwZoomRef.current = { min: 1, max: 1, supported: false };
      setZoomFloor(1);
    }

    setTorchAvailable(Boolean(caps.torch));
  }, []);

  const start = useCallback(
    async (facingWanted = facing) => {
      stop();
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingWanted },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        probeCapabilities(track);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        digitalZoomRef.current = 1;
        setZoom(1);
        setAeafLocked(false);
        await applyScenePreset(sceneMode);
        setReady(true);
      } catch (e) {
        setError(
          e && e.name === 'NotAllowedError'
            ? 'permiso'
            : e && e.name === 'NotFoundError'
            ? 'sin-camara'
            : 'generico'
        );
        setReady(false);
      }
    },
    [facing, sceneMode, stop, probeCapabilities, applyScenePreset]
  );

  const flip = useCallback(async () => {
    const next = facing === 'environment' ? 'user' : 'environment';
    setFacing(next);
    await start(next);
  }, [facing, start]);

  useEffect(() => () => stop(), [stop]);

  // =====================================================================
  // SCENE MODES
  // =====================================================================

  const selectScene = useCallback(
    async (sceneId) => {
      setSceneMode(sceneId);
      setAeafLocked(false);
      if (sceneId !== 'FOOD') setMacroOn(false);
      await applyScenePreset(sceneId);
    },
    [applyScenePreset]
  );

  // PORTRAIT face detection (Shape Detection API, graceful no-op elsewhere)
  useEffect(() => {
    const preset = SCENE_PRESETS[sceneMode];
    const wantFaces = Boolean(preset && preset.faceDetect && ready);

    if (faceTimerRef.current) {
      clearInterval(faceTimerRef.current);
      faceTimerRef.current = null;
    }
    if (!wantFaces) {
      setFaces([]);
      return;
    }
    if (typeof window.FaceDetector !== 'function') return;

    if (!faceDetectorRef.current) {
      try {
        faceDetectorRef.current = new window.FaceDetector({
          fastMode: true,
          maxDetectedFaces: 4,
        });
      } catch {
        return;
      }
    }

    faceTimerRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      try {
        const found = await faceDetectorRef.current.detect(video);
        const vw = video.videoWidth || 1;
        const vh = video.videoHeight || 1;
        setFaces(
          found.map((f) => ({
            x: f.boundingBox.x / vw,
            y: f.boundingBox.y / vh,
            w: f.boundingBox.width / vw,
            h: f.boundingBox.height / vh,
          }))
        );
      } catch {
        /* detector hiccup — keep last boxes */
      }
    }, 350);

    return () => {
      if (faceTimerRef.current) clearInterval(faceTimerRef.current);
    };
  }, [sceneMode, ready]);

  // =====================================================================
  // ZOOM 0.5x–10x  (hardware first, digital for the remainder)
  // =====================================================================

  const setZoomLevel = useCallback(
    async (requested) => {
      const floor = capsRef.current?.zoom?.min < 1
        ? Math.max(ZOOM_UI_MIN, capsRef.current.zoom.min)
        : 1;
      const z = clamp(requested, floor, ZOOM_UI_MAX);
      const hw = hwZoomRef.current;

      let hwZoom = 1;
      let digital = z;
      if (hw.supported) {
        hwZoom = clamp(z, hw.min, hw.max);
        digital = z / hwZoom;
        await safeApply([{ zoom: hwZoom }]);
      }
      digitalZoomRef.current = Math.max(1, digital);
      setZoom(z);
    },
    [safeApply]
  );

  /** CSS transform for the <video> element (digital zoom portion). */
  const previewTransform = `scale(${Math.max(1, digitalZoomRef.current)})`;

  // Pinch-to-zoom handlers — attach to the viewfinder element
  const onPinchStart = useCallback(
    (e) => {
      if (e.touches && e.touches.length === 2) {
        const [a, b] = e.touches;
        pinchRef.current = {
          active: true,
          startDist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
          startZoom: zoom,
        };
      }
    },
    [zoom]
  );

  const onPinchMove = useCallback(
    (e) => {
      const p = pinchRef.current;
      if (!p.active || !e.touches || e.touches.length !== 2) return;
      e.preventDefault();
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = dist / (p.startDist || 1);
      setZoomLevel(p.startZoom * ratio);
    },
    [setZoomLevel]
  );

  const onPinchEnd = useCallback(() => {
    pinchRef.current.active = false;
  }, []);

  // =====================================================================
  // MACRO 5–30 cm (FOOD scene)
  // =====================================================================

  const setMacro = useCallback(
    async (on, distanceM = macroDistance) => {
      setMacroOn(on);
      const caps = capsRef.current || {};
      if (on) {
        const d = clamp(distanceM, MACRO_RANGE_M.min, MACRO_RANGE_M.max);
        setMacroDistance(d);
        if (
          caps.focusMode &&
          caps.focusMode.includes('manual') &&
          caps.focusDistance
        ) {
          const fd = clamp(d, caps.focusDistance.min, caps.focusDistance.max);
          await safeApply([{ focusMode: 'manual', focusDistance: fd }]);
        } else if (caps.focusMode && caps.focusMode.includes('continuous')) {
          // No manual focus on this device: continuous AF + user proximity
          await safeApply([{ focusMode: 'continuous' }]);
        }
      } else {
        await applyScenePreset(sceneMode);
      }
    },
    [macroDistance, sceneMode, safeApply, applyScenePreset]
  );

  const setMacroFocusDistance = useCallback(
    (d) => setMacro(true, d),
    [setMacro]
  );

  // =====================================================================
  // AE/AF LOCK
  // =====================================================================

  const toggleAeAfLock = useCallback(async () => {
    const track = trackRef.current;
    const caps = capsRef.current || {};
    const next = !aeafLocked;
    setAeafLocked(next);
    if (!track) return;

    if (next) {
      // Freeze exposure / focus / WB at their current values
      let settings = {};
      try {
        settings = track.getSettings ? track.getSettings() : {};
      } catch {
        settings = {};
      }
      const entries = [];
      if (
        caps.exposureMode &&
        caps.exposureMode.includes('manual') &&
        typeof settings.exposureTime === 'number' &&
        caps.exposureTime
      ) {
        entries.push({
          exposureMode: 'manual',
          exposureTime: clamp(
            settings.exposureTime,
            caps.exposureTime.min,
            caps.exposureTime.max
          ),
        });
      }
      if (
        caps.focusMode &&
        caps.focusMode.includes('manual') &&
        typeof settings.focusDistance === 'number' &&
        caps.focusDistance
      ) {
        entries.push({
          focusMode: 'manual',
          focusDistance: clamp(
            settings.focusDistance,
            caps.focusDistance.min,
            caps.focusDistance.max
          ),
        });
      }
      if (
        caps.whiteBalanceMode &&
        caps.whiteBalanceMode.includes('manual') &&
        typeof settings.colorTemperature === 'number' &&
        caps.colorTemperature
      ) {
        entries.push({
          whiteBalanceMode: 'manual',
          colorTemperature: clamp(
            settings.colorTemperature,
            caps.colorTemperature.min,
            caps.colorTemperature.max
          ),
        });
      }
      await safeApply(entries);
    } else {
      // Unlock → restore the active scene's behavior (continuous modes)
      await applyScenePreset(sceneMode);
      if (macroOn) await setMacro(true);
    }
  }, [aeafLocked, sceneMode, macroOn, safeApply, applyScenePreset, setMacro]);

  // =====================================================================
  // TAP-TO-FOCUS / EXPOSE
  // =====================================================================

  const focusAt = useCallback(
    async (nx, ny) => {
      const caps = capsRef.current || {};
      const entries = [];
      if (caps.pointsOfInterest) {
        entries.push({ pointsOfInterest: [{ x: clamp(nx, 0, 1), y: clamp(ny, 0, 1) }] });
      }
      if (caps.focusMode && caps.focusMode.includes('single-shot')) {
        entries.push({ focusMode: 'single-shot' });
      }
      if (caps.exposureMode && caps.exposureMode.includes('single-shot')) {
        entries.push({ exposureMode: 'single-shot' });
      }
      await safeApply(entries);
      // Return to continuous after the single-shot settles (unless locked)
      if (!aeafLocked) {
        setTimeout(() => applyScenePreset(sceneMode), 1200);
      }
    },
    [safeApply, aeafLocked, applyScenePreset, sceneMode]
  );

  // =====================================================================
  // TORCH (rear flash)
  // =====================================================================

  const setTorch = useCallback(
    async (on) => {
      if (!torchAvailable) return false;
      try {
        await trackRef.current.applyConstraints({ advanced: [{ torch: on }] });
        return true;
      } catch {
        return false;
      }
    },
    [torchAvailable]
  );

  // =====================================================================
  // CAPTURE — synchronous frame grab; rapid taps each get a frame
  // =====================================================================

  const capture = useCallback(
    ({ quality = 0.92 } = {}) => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        return Promise.reject(new Error('camera-not-ready'));
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const targetRatio = ASPECTS[aspect] || ASPECTS['9:16']; // width/height
      const dz = Math.max(1, digitalZoomRef.current);

      // 1) crop to the digital-zoom window (centered)
      let cw = vw / dz;
      let ch = vh / dz;
      // 2) crop that window to the selected aspect ratio (centered)
      if (cw / ch > targetRatio) {
        cw = ch * targetRatio;
      } else {
        ch = cw / targetRatio;
      }
      const sx = (vw - cw) / 2;
      const sy = (vh - ch) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(cw);
      canvas.height = Math.round(ch);
      const ctx = canvas.getContext('2d');

      // Bake the scene + filter look into the file
      const filter = composeFilter(sceneMode, filterId);
      if (filter !== 'none') ctx.filter = filter;

      // Mirror front-camera captures so they match the preview
      if (facing === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      // The synchronous part — frame is grabbed RIGHT NOW
      ctx.drawImage(video, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('encode-failed'));
            resolve({
              blob,
              width: canvas.width,
              height: canvas.height,
              meta: {
                scene: sceneMode,
                filter: filterId,
                zoom,
                aspect,
                macro: macroOn ? macroDistance : null,
                aeafLocked,
                facing,
                ts: Date.now(),
              },
            });
          },
          'image/jpeg',
          quality
        );
      });
    },
    [aspect, sceneMode, filterId, zoom, macroOn, macroDistance, aeafLocked, facing]
  );

  /** Capture with flash handling. `onScreenFlash` lets the UI blink white for front cam. */
  const captureWithFlash = useCallback(
    async ({ onScreenFlash } = {}) => {
      let torchUsed = false;
      if (flashMode === 'on') {
        if (facing === 'environment' && torchAvailable) {
          torchUsed = await setTorch(true);
          if (torchUsed) await new Promise((r) => setTimeout(r, 180)); // let AE settle
        } else if (onScreenFlash) {
          onScreenFlash();
          await new Promise((r) => setTimeout(r, 120));
        }
      }
      try {
        return await capture();
      } finally {
        if (torchUsed) setTorch(false);
      }
    },
    [flashMode, facing, torchAvailable, setTorch, capture]
  );

  // =====================================================================

  return {
    // refs & lifecycle
    videoRef,
    start,
    stop,
    flip,
    ready,
    error,
    facing,

    // scene modes
    sceneMode,
    selectScene,
    faces,

    // zoom
    zoom,
    zoomFloor,
    setZoomLevel,
    previewTransform,
    onPinchStart,
    onPinchMove,
    onPinchEnd,

    // macro
    macroOn,
    macroDistance,
    setMacro,
    setMacroFocusDistance,

    // AE/AF
    aeafLocked,
    toggleAeAfLock,
    focusAt,

    // flash
    flashMode,
    setFlashMode,
    torchAvailable,

    // aspect & filters
    aspect,
    setAspect,
    filterId,
    setFilterId,

    // capture
    capture,
    captureWithFlash,
  };
}

export default useCamera;
