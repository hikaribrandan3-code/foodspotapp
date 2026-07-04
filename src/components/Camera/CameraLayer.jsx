/**
 * FoodSpot Camera — CameraLayerV18.jsx
 * Owner "Building Camera" — CamTech v1.8 engine.
 *
 * CAPTURE path: draw from live <video> to canvas at full track resolution.
 * NO ImageCapture.grabFrame() — it freezes/blacks on iOS Safari.
 * NO ctx.filter — silently broken on iOS Safari; we bake pixels manually.
 *
 * DEBUG mode: set localStorage.setItem('fsc_debug','1') in Safari console,
 * then every capture logs a full trace to console (readyState, dimensions,
 * center pixel RGBA, blob size). Disable: localStorage.removeItem('fsc_debug').
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useCamera from './hooks/useCamera.js';
import useVideoRecorder, { MAX_VIDEO_SEC } from './hooks/useVideoRecorder.js';
import {
  SCENE_ORDER,
  CAPTURE_FILTERS,
  previewCss,
  bakeCapture,
} from './utils/scenePresets.js';

// Mode cycle: photo scenes + VIDEO as the last stop
const CAPTURE_MODE_ORDER = [...SCENE_ORDER, 'VIDEO', 'BOOMERANG'];

const ASPECT_CYCLE = ['9:16', '4:3', '1:1'];
// w/h ratios (portrait frames) — rotated to their landscape equivalent at capture time
const ASPECT_RATIO = { '9:16': 9 / 16, '4:3': 3 / 4, '1:1': 1 };
// Label shown when the device is held in landscape (mirrors the rotated ratio)
const LANDSCAPE_LABEL = { '9:16': '16:9', '4:3': '4:3', '1:1': '1:1' };
const ZOOM_STOPS   = [0.5, 1, 2, 5, 10];
const STABILIZE_AT = 4;
const TIMER_OPTS   = [null, 3, 5, 7];

// ── SVG assets ───────────────────────────────────────────────────────────────
const FLASH_ICON = {
  off: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" opacity="0.4"/>
      <path d="M2 2l20 20"/>
    </svg>
  ),
  on: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>
    </svg>
  ),
  auto: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>
    </svg>
  ),
  torch: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>
      <circle cx="19" cy="4" r="2.5" fill="#FFD60A" stroke="none"/>
    </svg>
  ),
};

const FLIP_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>
    <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"/>
    <circle cx="12" cy="12" r="3"/>
    <path d="m18 22-3-3 3-3"/><path d="m6 2 3 3-3 3"/>
  </svg>
);

const TIMER_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="13" r="8"/>
    <path d="M12 9v4l3 2"/>
    <path d="M7 4h10"/>
  </svg>
);

const FILTER_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity="0.3"/>
  </svg>
);

// ── helpers ──────────────────────────────────────────────────────────────────
function snapZoom(z) {
  let best = z, bestD = Infinity;
  for (const s of ZOOM_STOPS) {
    const d = Math.abs(z - s);
    if (d < 0.22 && d < bestD) { bestD = d; best = s; }
  }
  return best;
}

// Always log capture diagnostics (no localStorage needed — just connect & check console)
const dbg = (...args) => console.log('[FSC-CAMERA]', ...args);

// ── Component ─────────────────────────────────────────────────────────────────
export default function CameraLayer({
  onCapture,
  onClose,
  locationLabel = 'FoodSpot',
  pinBg   = 'rgba(20,20,24,0.55)',
  pinText = '#ffffff',
  initialScene = 'FOOD',
  isOwner = false,
  toolPosition = 'right', // accepted for compatibility, unused in pro camera
}) {
  const {
    videoRef, isReady, error,
    facingMode, initCamera, flipCamera, terminateHardware,
    flashMode, flashSupported, cycleFlash, applyFlash,
    zoomLevel, setZoom, zoomRange,
    focusAt, applyNicheMode, nicheMode,
    gimbalEnabled, toggleGimbal,
    statusMessage,
  } = useCamera();

  // Track landscape vs portrait — same matchMedia approach as the customer
  // CameraLayer.jsx, so the capture crop can rotate with the device.
  const [isLandscape, setIsLandscape] = useState(() => window.innerWidth > window.innerHeight);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const handler = (e) => setIsLandscape(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const [aspect,        setAspect]        = useState('9:16');
  const [uiMode,        setUiMode]        = useState(initialScene); // FOOD | PORTRAIT | VIDEO
  const [filterId,      setFilterId]      = useState('original');
  const [filterToast,   setFilterToast]   = useState(null);
  const [modeToast,     setModeToast]     = useState(null);
  const [zoomActive,    setZoomActive]    = useState(false);
  const [timerSec,      setTimerSec]      = useState(null);
  const [timerCd,       setTimerCd]       = useState(null);   // countdown display
  const [timerToast,    setTimerToast]    = useState(false);  // brief flash when timer changes
  const [reticle,       setReticle]       = useState(null);
  const [screenFlash,   setScreenFlash]   = useState(false);
  const [shutterPulse,  setShutterPulse]  = useState(false);

  const frameRef         = useRef(null);
  const lastUrlRef       = useRef(null);
  const pinchStartRef    = useRef(0);
  const pinchZoomRef     = useRef(1);
  const tapRef           = useRef({ t: 0, moved: false });
  const filterToastTimer = useRef(null);
  const modeToastTimer   = useRef(null);
  const zoomTimer        = useRef(null);
  const reticleTimer     = useRef(null);
  const timerInterval    = useRef(null);
  const timerToastTimer  = useRef(null);
  const motionReqRef     = useRef(false);
  const zoomInitRef      = useRef(false);

  // Keep mutable refs for values used inside timer callbacks (avoids stale closures)
  const flashModeRef    = useRef(flashMode);
  const flashSuppRef    = useRef(flashSupported);
  const facingModeRef   = useRef(facingMode);
  const captureRef      = useRef(null); // set below; always current version

  useEffect(() => { flashModeRef.current  = flashMode;     }, [flashMode]);
  useEffect(() => { flashSuppRef.current  = flashSupported;}, [flashSupported]);
  useEffect(() => { facingModeRef.current = facingMode;    }, [facingMode]);

  // ── VIDEO / BOOMERANG MODE (CamTech Video) ─────────────────────────────────
  const isVideoMode     = uiMode === 'VIDEO';
  const isBoomerangMode = uiMode === 'BOOMERANG';
  const { isRecording, isProcessing, elapsedSec, startRecording, stopRecording } = useVideoRecorder();

  // ── lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => { initCamera(); }, [facingMode]); // eslint-disable-line
  useEffect(() => { if (isReady) applyNicheMode(initialScene); }, [isReady]); // eslint-disable-line
  useEffect(() => {
    return () => {
      // DO NOT revoke blob URLs here — EditorLayer manages them.
      // Only kill timers + hardware.
      clearTimeout(filterToastTimer.current);
      clearTimeout(zoomTimer.current);
      clearTimeout(reticleTimer.current);
      clearTimeout(timerToastTimer.current);
      clearInterval(timerInterval.current);
      terminateHardware();
    };
  }, []); // eslint-disable-line

  // ── flash: apply torch continuously; 'on' is pulsed at capture ────────────
  useEffect(() => {
    if (!flashSupported) return;
    applyFlash(flashMode === 'torch' ? 'torch' : 'off');
  }, [flashMode, flashSupported]); // eslint-disable-line

  // ── zoom readout ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!zoomInitRef.current) { zoomInitRef.current = true; return; }
    setZoomActive(true);
    clearTimeout(zoomTimer.current);
    zoomTimer.current = setTimeout(() => setZoomActive(false), 2400);
  }, [zoomLevel]);

  // ── auto-stabilizer: enable at 2× (shaky hand suppression) ───────────────
  useEffect(() => {
    const want = zoomLevel >= 2;
    if (want && !gimbalEnabled)  toggleGimbal(true);
    if (!want && gimbalEnabled)  toggleGimbal(false);
  }, [zoomLevel]); // eslint-disable-line

  // ── software stabilizer: EMA on accelerometer → subtle video translate ────
  useEffect(() => {
    const mirrorBase = facingMode === 'user' ? 'scaleX(-1)' : '';
    if (!gimbalEnabled) {
      const el = videoRef.current;
      if (el) el.style.transform = mirrorBase || '';
      return;
    }

    let raf = 0;
    let smX = 0, smY = 0;
    const ALPHA = 0.12; // EMA weight — faster response to motion
    const MAX_PX = 6;   // max translate pixels (stronger hand-shake suppression)

    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity || e.acceleration || {};
      smX = ALPHA * (a.x || 0) + (1 - ALPHA) * smX;
      smY = ALPHA * (a.y || 0) + (1 - ALPHA) * smY;
    };
    window.addEventListener('devicemotion', onMotion, { passive: true });

    const loop = () => {
      const el = videoRef.current;
      if (el) {
        const tx = Math.max(-MAX_PX, Math.min(MAX_PX, -smX * 0.4));
        const ty = Math.max(-MAX_PX, Math.min(MAX_PX,  smY * 0.4));
        el.style.transform = mirrorBase
          ? `scaleX(-1) translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`
          : `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('devicemotion', onMotion);
      const el = videoRef.current;
      if (el) el.style.transform = mirrorBase || '';
    };
  }, [gimbalEnabled, facingMode]); // eslint-disable-line

  // ── request iOS motion permission on first touch ───────────────────────────
  const ensureMotionPerm = useCallback(() => {
    if (motionReqRef.current) return;
    motionReqRef.current = true;
    const DME = window.DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') {
      DME.requestPermission().catch(() => {});
    }
  }, []);

  // ── capture: draw video → canvas → pixel bake → blob ─────────────────────
  const captureFromVideo = useCallback(async () => {
    const v = videoRef.current;

    // ── DEBUG trace (enable via localStorage.setItem('fsc_debug','1')) ──
    dbg('captureFromVideo START', {
      exists: !!v,
      videoWidth:  v?.videoWidth,
      videoHeight: v?.videoHeight,
      readyState:  v?.readyState,   // 0=HAVE_NOTHING 1=HAVE_METADATA 2=HAVE_CURRENT_DATA 3/4=playing
      paused:      v?.paused,
      srcObject:   !!(v?.srcObject),
    });

    if (!v)                            { dbg('FAIL: no videoRef');        return null; }
    if (!v.videoWidth || !v.videoHeight){ dbg('FAIL: zero dimensions');   return null; }

    // readyState < 2 means iOS doesn't have a rendered frame yet.
    // We wait up to 500ms for it rather than returning a black canvas.
    if (v.readyState < 2) {
      dbg('WARN: readyState < 2 — waiting for frame…', v.readyState);
      await new Promise((res) => {
        const check = () => {
          if (!videoRef.current || videoRef.current.readyState >= 2) { res(); return; }
          setTimeout(check, 50);
        };
        setTimeout(check, 50);
      });
      if (!v.videoWidth) { dbg('FAIL: still no frame after wait'); return null; }
    }

    const sw  = v.videoWidth;
    const sh  = v.videoHeight;
    const baseRatio = ASPECT_RATIO[aspect] || 9 / 16;
    // In landscape, rotate the selected shape (9:16 -> 16:9, 4:3 -> 4:3 wide).
    // 1:1 stays square either way.
    const targetRatio = isLandscape ? 1 / baseRatio : baseRatio;
    const srcRatio    = sw / sh;

    let cropW, cropH;
    if (srcRatio > targetRatio) {
      cropH = sh;  cropW = Math.round(sh * targetRatio);
    } else {
      cropW = sw;  cropH = Math.round(sw / targetRatio);
    }
    const cropX = Math.round((sw - cropW) / 2);
    const cropY = Math.round((sh - cropH) / 2);
    dbg('CROP', { sw, sh, cropW, cropH, cropX, cropY, aspect });

    const canvas = document.createElement('canvas');
    canvas.width  = cropW;
    canvas.height = cropH;
    // Note: willReadFrequently can slow drawImage on GPU path — only use it when we must getImageData.
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Mirror front-facing camera (CSS scaleX(-1) doesn't affect drawImage; we must mirror manually)
    if (facingMode === 'user') {
      ctx.save();
      ctx.translate(cropW, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(v, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      ctx.restore();
    } else {
      ctx.drawImage(v, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    }

    // Sample center pixel so we can detect black frame in debug logs
    const sample = ctx.getImageData(Math.floor(cropW / 2), Math.floor(cropH / 2), 1, 1).data;
    dbg('CENTER PIXEL', { r: sample[0], g: sample[1], b: sample[2], a: sample[3] });
    if (sample[0] === 0 && sample[1] === 0 && sample[2] === 0) {
      dbg('⚠️ CENTER PIXEL IS BLACK — drawImage produced a black frame');
    }

    bakeCapture(ctx, cropW, cropH, nicheMode, filterId);

    const blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.97)
    );
    dbg('BLOB', { size: blob?.size, type: blob?.type, valid: !!blob });

    if (!blob || blob.size < 500) {
      dbg('FAIL: blob empty or too small', blob?.size);
      return null;
    }

    const objectURL = URL.createObjectURL(blob);
    dbg('SUCCESS — objectURL created', objectURL.slice(0, 60));
    return {
      objectURL, blob,
      width: cropW, height: cropH,
      aspectRatio: cropW / cropH,
      meta: { scene: nicheMode, filter: filterId, aspect, zoom: zoomLevel, facing: facingMode, ts: Date.now() },
    };
  }, [aspect, isLandscape, nicheMode, filterId, facingMode, zoomLevel]); // eslint-disable-line

  // Keep captureRef always current so timer callback uses latest version
  useEffect(() => { captureRef.current = captureFromVideo; }, [captureFromVideo]);

  // ── fire actual capture (shared by immediate + timer paths) ───────────────
  const fireCapture = useCallback(async () => {
    setShutterPulse(true);
    setTimeout(() => setShutterPulse(false), 130);
    setTimerCd(null);

    const fm = flashModeRef.current;
    const fs = flashSuppRef.current;
    const fc = facingModeRef.current;
    const wantsFlash = fm === 'on' || fm === 'torch';
    const rearTorch  = wantsFlash && fs && fc === 'environment';

    try {
      if (rearTorch && fm === 'on') {
        await applyFlash('on');
        await new Promise((r) => setTimeout(r, 180));
      } else if (wantsFlash && fc === 'user') {
        setScreenFlash(true);
        setTimeout(() => setScreenFlash(false), 160);
        await new Promise((r) => setTimeout(r, 120));
      }

      const result = await captureRef.current();
      dbg('fireCapture result', { ok: !!result, objectURL: result?.objectURL?.slice(0,40) });
      if (!result) return;

      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
      lastUrlRef.current = result.objectURL;
      if (onCapture) onCapture(result);
    } catch (err) {
      dbg('fireCapture ERROR', err?.message, err);
      console.error('[FSC-CAM] capture error:', err);
    } finally {
      if (rearTorch && fm === 'on') applyFlash('off');
    }
  }, [applyFlash, onCapture]); // eslint-disable-line

  // ── video record toggle (tap = start, tap again or 15s cap = stop) ────────
  // Boomerang is a single tap: fixed ~1.7s auto-capture, no manual stop needed.
  // startRecording is async (Video mode awaits mic permission before it can
  // start) — startRecording itself guards against a double-tap firing a
  // second start while that await is in flight.
  const handleVideoShutter = useCallback(async () => {
    if (isRecording) { stopRecording(); return; }
    const ok = await startRecording({
      mode: isBoomerangMode ? 'boomerang' : 'video',
      video: videoRef.current,
      facingMode: facingModeRef.current,
      aspect,
      isLandscape,
      onComplete: (result) => { if (onCapture) onCapture(result); },
    });
    if (!ok) dbg('VIDEO start failed — recorder unavailable');
  }, [isRecording, isBoomerangMode, stopRecording, startRecording, aspect, isLandscape, onCapture]); // eslint-disable-line

  // ── shutter handler (starts timer if set, else fires immediately) ─────────
  const handleShutter = useCallback(async () => {
    if (isVideoMode || isBoomerangMode) { handleVideoShutter(); return; }
    if (timerSec !== null) {
      clearInterval(timerInterval.current);
      let remaining = timerSec;
      setTimerCd(remaining);
      setShutterPulse(true);
      setTimeout(() => setShutterPulse(false), 130);
      timerInterval.current = setInterval(() => {
        remaining--;
        setTimerCd(remaining);
        if (remaining <= 0) {
          clearInterval(timerInterval.current);
          timerInterval.current = null;
          fireCapture();
        }
      }, 1000);
      return;
    }
    fireCapture();
  }, [isVideoMode, isBoomerangMode, handleVideoShutter, timerSec, fireCapture]);

  // ── timer cycle (null→3→5→7→null) with brief toast ───────────────────────
  const cycleTimer = useCallback(() => {
    clearInterval(timerInterval.current);
    setTimerCd(null);
    setTimerSec((cur) => {
      const next = TIMER_OPTS[(TIMER_OPTS.indexOf(cur) + 1) % TIMER_OPTS.length];
      setTimerToast(true);
      clearTimeout(timerToastTimer.current);
      timerToastTimer.current = setTimeout(() => setTimerToast(false), 900);
      return next;
    });
  }, []);

  // ── aspect / mode / filter ────────────────────────────────────────────────
  const cycleAspect = useCallback(() => {
    setAspect((a) => ASPECT_CYCLE[(ASPECT_CYCLE.indexOf(a) + 1) % ASPECT_CYCLE.length]);
  }, []);

  const cycleMode = useCallback(() => {
    if (isRecording) return; // locked while recording
    const next = CAPTURE_MODE_ORDER[(CAPTURE_MODE_ORDER.indexOf(uiMode) + 1) % CAPTURE_MODE_ORDER.length];
    setModeToast(next);
    clearTimeout(modeToastTimer.current);
    modeToastTimer.current = setTimeout(() => setModeToast(null), 2400);
    setUiMode(next);
    if (next !== 'VIDEO' && next !== 'BOOMERANG') applyNicheMode(next);
  }, [uiMode, isRecording, applyNicheMode]);

  const cycleFilter = useCallback(() => {
    setFilterId((cur) => {
      const i    = CAPTURE_FILTERS.findIndex((f) => f.id === cur);
      const next = CAPTURE_FILTERS[(i + 1) % CAPTURE_FILTERS.length];
      setFilterToast(next.label);
      clearTimeout(filterToastTimer.current);
      filterToastTimer.current = setTimeout(() => setFilterToast(null), 700);
      return next.id;
    });
  }, []);

  // ── touch: tap-to-focus + pinch-to-zoom ───────────────────────────────────
  const onTouchStart = useCallback((e) => {
    ensureMotionPerm();
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartRef.current = Math.hypot(dx, dy);
      pinchZoomRef.current  = zoomLevel;
      tapRef.current.moved  = true;
    } else {
      tapRef.current = { t: Date.now(), moved: false };
    }
  }, [zoomLevel, ensureMotionPerm]);

  const onTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchStartRef.current > 0) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const fac  = 1 + (dist / pinchStartRef.current - 1) * 2.2;
      const min  = zoomRange?.min ?? 1;
      const max  = zoomRange?.max ?? 10;
      setZoom(Math.max(min, Math.min(max, pinchZoomRef.current * fac)));
    } else {
      tapRef.current.moved = true;
    }
  }, [zoomRange, setZoom]);

  const onTouchEnd = useCallback((e) => {
    if (pinchStartRef.current > 0) {
      pinchStartRef.current = 0;
      setZoom(snapZoom(zoomLevel));
      return;
    }
    const { t, moved } = tapRef.current;
    if (!moved && Date.now() - t < 300) {
      const touch = e.changedTouches?.[0];
      const el    = frameRef.current;
      if (touch && el) {
        const rect = el.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        setReticle({ x, y });
        clearTimeout(reticleTimer.current);
        reticleTimer.current = setTimeout(() => setReticle(null), 1000);
        focusAt(x / rect.width, y / rect.height);
      }
    }
  }, [zoomLevel, setZoom, focusAt]);

  // Video/Boomerang record raw frames (no scene grade baked) — keep the
  // preview WYSIWYG by dropping the CSS grade in both modes.
  const liveFilter = (isVideoMode || isBoomerangMode) ? 'none' : previewCss(nicheMode, filterId);
  const timerLabel = timerSec ? `${timerSec}s` : null;
  const recClock = `0:${String(Math.floor(elapsedSec)).padStart(2, '0')}`;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fsc-root" data-aspect={aspect}>
      <style>{styles}</style>

      {/* ── VIEWFINDER ────────────────────────────────────────────────────── */}
      <div
        className="fsc-frame"
        ref={frameRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <video
          ref={videoRef}
          className="fsc-video"
          autoPlay playsInline muted
          style={{
            transform: facingMode === 'user' ? 'scaleX(-1)' : undefined,
            filter:    liveFilter !== 'none'  ? liveFilter  : undefined,
          }}
        />

        {/* Vintage grain — CSS filter() can't express noise, so the live
            preview gets a static SVG turbulence texture here; the actual
            capture bakes real per-pixel noise (see applyGrade in
            scenePresets.js). Stills only — filters are hidden in Video/
            Boomerang mode already. */}
        {filterId === 'polaroid' && !isVideoMode && !isBoomerangMode && (
          <div className="fsc-grain" aria-hidden="true" />
        )}

        {/* tap-to-focus reticle */}
        {reticle && <div className="fsc-reticle" style={{ left: reticle.x, top: reticle.y }} />}

        {screenFlash && <div className="fsc-screenflash" />}

        {/* close + pin: INSIDE frame so they follow it on 4:3 / 1:1 */}
        <button className="fsc-close" onClick={onClose} aria-label="Cerrar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        {/* Video: show REC indicator during recording. Boomerang: silent auto-capture,
            no UI needed — just shoot. Neither burn the tag into the file. */}
        {isVideoMode && isRecording ? (
          <div className="fsc-pin fsc-pin--rec">
            <span className="fsc-recdot" />
            <span>REC</span>
          </div>
        ) : (
          <div className="fsc-pin" style={{ background: pinBg, color: pinText }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill={pinText} style={{ flexShrink: 0 }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
            </svg>
            <span>{String(locationLabel).toUpperCase()}</span>
          </div>
        )}

        {!isReady && !error && (
          <div className="fsc-status">
            <div className="fsc-spinner"/>
            {statusMessage || 'Loading'}
          </div>
        )}
        {error && (
          <div className="fsc-status">
            No se pudo iniciar la cámara.
            <button className="fsc-retry" onClick={(e) => { e.stopPropagation(); initCamera(); }}>
              Reintentar
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT RAIL: aspect · flip · flash · timer ─────────────────────── */}
      <div className="fsc-toolbar">
        <button className="fsc-tool fsc-aspecttool" onClick={cycleAspect} disabled={isRecording || isProcessing} aria-label="Formato">{isLandscape ? LANDSCAPE_LABEL[aspect] || aspect : aspect}</button>
        <button className="fsc-tool" onClick={flipCamera} disabled={isRecording || isProcessing} aria-label="Girar">{FLIP_ICON}</button>
        <button
          className={`fsc-tool ${flashMode !== 'off' ? 'is-on' : ''}`}
          onClick={cycleFlash}
          disabled={!flashSupported}
          aria-label="Flash"
        >
          {FLASH_ICON[flashMode]}
        </button>
        {/* timer: photo-only (hidden in video/boomerang mode) */}
        {!isVideoMode && !isBoomerangMode && (
          <button
            className={`fsc-tool ${timerSec !== null ? 'is-on' : ''}`}
            onClick={cycleTimer}
            aria-label="Temporizador"
          >
            <span className="fsc-timerwrap">
              {TIMER_ICON}
              {timerSec !== null && <span className="fsc-timerbadge">{timerSec}s</span>}
            </span>
          </button>
        )}
      </div>

      {/* ── ZOOM READOUT: subtle, above shutter row ───────────────────────── */}
      {zoomActive && (
        <div className="fsc-zoomreadout">{zoomLevel.toFixed(zoomLevel < 10 ? 1 : 0)}×</div>
      )}

      {/* ── TIMER COUNTDOWN ───────────────────────────────────────────────── */}
      {timerCd !== null && (
        <div className="fsc-timercount">{timerCd}</div>
      )}

      {/* ── RECORDING BADGE: red dot + count-up clock (Video only, hidden in Boomerang auto-capture) ─── */}
      {isRecording && !isBoomerangMode && (
        <div className="fsc-recbadge">
          <span className="fsc-recdot" />
          {recClock}
        </div>
      )}

      {/* ── PROCESSING OVERLAY: burning the pin in after stop ─────────────── */}
      {isProcessing && (
        <div className="fsc-processing">
          <div className="fsc-processing-spinner" />
          <span>Procesando video…</span>
        </div>
      )}

      {/* ── TIMER TOAST (brief "3s set" / "OFF") ─────────────────────────── */}
      {timerToast && (
        <div className="fsc-timertoast">
          {timerSec !== null ? `Timer ${timerSec}s` : 'Timer OFF'}
        </div>
      )}

      {/* ── FILTER TOAST ─────────────────────────────────────────────────── */}
      {filterToast && <div className="fsc-filtertoast">{filterToast}</div>}

      {/* ── MODE TOAST ───────────────────────────────────────────────────── */}
      {modeToast && <div className="fsc-modetoast">{modeToast}</div>}

      {/* ── BOTTOM BAR ────────────────────────────────────────────────────── */}
      <div className="fsc-bottom">
        {/* zoom pill: shows above shutter, subtle */}
        <div className="fsc-shutterrow">
          {/* MODE button — always says "MODE" (cycles Food → Portrait → Video → Boomerang) */}
          <div className="fsc-side">
            <button className="fsc-modebtn" onClick={cycleMode} disabled={isRecording || isProcessing}>MODE</button>
          </div>

          <button
            className={`fsc-shutter ${shutterPulse ? 'is-firing' : ''} ${(isVideoMode || isBoomerangMode) ? 'fsc-shutter--video' : ''} ${isRecording ? 'is-recording' : ''}`}
            onClick={handleShutter}
            disabled={!isReady || isProcessing}
            aria-label={isBoomerangMode ? 'Boomerang' : isVideoMode ? (isRecording ? 'Detener' : 'Grabar') : 'Capturar'}
          >
            <span className="fsc-shutter-inner"/>
          </button>

          <div className="fsc-side fsc-side-right">
            {/* filters are photo-only — video/boomerang record clean frames */}
            {!isVideoMode && !isBoomerangMode ? (
              <button className="fsc-filterbtn" onClick={cycleFilter} aria-label="Filtros">
                {FILTER_ICON}
              </button>
            ) : (
              <span className="fsc-filterspacer" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   STYLES
   =========================================================================== */
const styles = `
.fsc-root {
  --fsc-text:   #FFFFFF;
  --fsc-dim:    rgba(255,255,255,0.62);
  --fsc-glass:  rgba(0,0,0,0.22);
  --fsc-chip:   rgba(255,255,255,0.15);
  --fsc-stroke: rgba(255,255,255,0.16);
  --fsc-accent: #FF6B3D;
  --fsc-lock:   #FFD60A;
  position: fixed; inset: 0; background: #000; color: var(--fsc-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
  -webkit-user-select: none; user-select: none; touch-action: none;
}

/* ── frame ── */
.fsc-frame {
  position: relative; overflow: hidden; background: #000;
  width: 100vw; height: 100dvh;
}
.fsc-root[data-aspect="4:3"] .fsc-frame {
  width:  min(100vw, calc(100dvh * 0.75));
  height: min(100dvh, calc(100vw / 0.75));
  border-radius: 18px;
}
.fsc-root[data-aspect="1:1"] .fsc-frame {
  width:  min(100vw, 100dvh);
  height: min(100vw, 100dvh);
  border-radius: 18px;
}
.fsc-video { width: 100%; height: 100%; object-fit: cover; transform-origin: center; }

/* ── polaroid grain overlay (live preview only — see fsc-grain render) ── */
.fsc-grain {
  position: absolute; inset: 0; z-index: 3; pointer-events: none;
  opacity: 0.24; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' result='noise'/%3E%3CfeColorMatrix in='noise' type='saturate' values='0.3'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-size: 100px 100px;
}

/* ── reticle ── */
.fsc-reticle {
  position: absolute; width: 74px; height: 74px; margin: -37px 0 0 -37px; z-index: 4;
  border: 1.5px solid var(--fsc-lock); border-radius: 6px; pointer-events: none;
  animation: fsc-focus 1s ease-out forwards;
}
@keyframes fsc-focus {
  0%   { transform: scale(1.5); opacity: 0; }
  20%  { transform: scale(1);   opacity: 1; }
  80%  { opacity: 1; }
  100% { opacity: 0.5; }
}

.fsc-screenflash { position: absolute; inset: 0; background: #fff; z-index: 30; animation: fsc-blink 0.16s ease-out; }
@keyframes fsc-blink { from { opacity: 1; } to { opacity: 0.8; } }

/* ── close + pin (NOW INSIDE .fsc-frame so they track on all aspect ratios) ── */
.fsc-close {
  position: absolute; top: calc(env(safe-area-inset-top,0px) + 14px); left: 14px; z-index: 200;
  width: 42px; height: 42px; border-radius: 50%; background: rgba(0,0,0,0.48);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border: none; color: #fff; display: flex; align-items: center; justify-content: center;
}
.fsc-pin {
  position: absolute; top: calc(env(safe-area-inset-top,0px) + 66px); left: 14px; z-index: 10;
  display: flex; align-items: center; gap: 5px; padding: 7px 12px; border-radius: 20px;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.fsc-pin span {
  font-size: 11px; font-weight: 700; letter-spacing: 0.08em; line-height: 1;
  white-space: nowrap; max-width: 44vw; overflow: hidden; text-overflow: ellipsis;
}
.fsc-pin--rec {
  background: rgba(0,0,0,0.55); color: #fff;
}
.fsc-pin--rec span { color: #fff; }

/* ── status ── */
.fsc-status {
  position: absolute; inset: 0; z-index: 5;
  display: flex; flex-direction: column; gap: 14px;
  align-items: center; justify-content: center;
  background: #000; color: var(--fsc-dim); font-size: 13px;
  text-align: center; padding: 0 32px; letter-spacing: 0.04em;
}
.fsc-spinner { width: 44px; height: 44px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #fff; border-radius: 50%; animation: fsc-spin 0.8s linear infinite; }
@keyframes fsc-spin { to { transform: rotate(360deg); } }
.fsc-retry { background: var(--fsc-accent); color: #fff; border: 0; padding: 10px 22px; border-radius: 999px; font-size: 14px; font-weight: 600; }

/* ── right rail ── */
.fsc-toolbar {
  position: absolute; right: 14px; top: 50%; transform: translateY(-50%); z-index: 50;
  display: flex; flex-direction: column; gap: 4px; padding: 10px 6px;
  background: var(--fsc-glass); border-radius: 22px;
  backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
}
.fsc-tool {
  width: 44px; height: 44px; border-radius: 50%; background: transparent; border: none;
  color: rgba(255,255,255,0.62); display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent; transition: color 0.15s, background 0.15s;
  position: relative;
}
.fsc-tool:active  { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.92); }
.fsc-tool.is-on   { color: var(--fsc-lock); }
.fsc-tool:disabled{ opacity: 0.3; }
.fsc-aspecttool   { font-size: 10px; font-weight: 800; letter-spacing: 0.02em; }

/* timer wrapper + badge */
.fsc-timerwrap { position: relative; display: flex; align-items: center; justify-content: center; }
.fsc-timerbadge {
  position: absolute; bottom: -4px; right: -6px;
  background: var(--fsc-lock); color: #000;
  font-size: 9px; font-weight: 800; padding: 1px 4px; border-radius: 8px;
  line-height: 1.3; letter-spacing: 0.02em; pointer-events: none;
}

/* ── zoom readout: subtle pill just above shutter ── */
.fsc-zoomreadout {
  position: absolute;
  bottom: calc(env(safe-area-inset-bottom,0px) + 130px);
  left: 50%; transform: translateX(-50%); z-index: 60;
  background: rgba(0,0,0,0.46); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  color: #fff; padding: 5px 16px; border-radius: 999px;
  font-size: 15px; font-weight: 700; letter-spacing: 0.02em; line-height: 1;
  box-shadow: 0 2px 10px rgba(0,0,0,0.25);
  animation: fsc-modehold 2.4s ease-out forwards;
}
@keyframes fsc-pop { from { opacity: 0; transform: translateX(-50%) scale(0.88); } to { opacity: 1; transform: translateX(-50%) scale(1); } }

/* ── timer countdown (big, centered) ── */
.fsc-timercount {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 65;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  color: var(--fsc-lock); padding: 10px 28px; border-radius: 999px;
  font-size: 52px; font-weight: 800; letter-spacing: -0.02em; line-height: 1;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  animation: fsc-pulse 1s ease-in-out infinite;
}
@keyframes fsc-pulse { 0%,100% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(1.06); } }

/* ── timer toast (briefly shows "Timer 5s" / "Timer OFF") ── */
.fsc-timertoast {
  position: absolute; top: calc(env(safe-area-inset-top,0px) + 22px); left: 50%;
  transform: translateX(-50%); z-index: 60;
  background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); color: #fff;
  padding: 7px 18px; border-radius: 20px; font-size: 13px; font-weight: 700;
  letter-spacing: 0.06em; white-space: nowrap;
  animation: fsc-fade 0.9s ease-out forwards;
}
@keyframes fsc-fade { 0% { opacity: 0; } 15% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }

/* ── filter toast ── */
.fsc-filtertoast {
  position: absolute; bottom: calc(env(safe-area-inset-bottom,0px) + 175px);
  left: 50%; transform: translateX(-50%); z-index: 60;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); color: #fff;
  padding: 7px 18px; border-radius: 20px; font-size: 13px; font-weight: 600;
  animation: fsc-fade 0.7s ease-out forwards;
}

.fsc-modetoast {
  position: absolute; bottom: calc(env(safe-area-inset-bottom,0px) + 150px);
  left: 50%; transform: translateX(-50%); z-index: 60;
  background: rgba(0,0,0,0.46); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  color: #fff; padding: 5px 16px; border-radius: 999px;
  font-size: 15px; font-weight: 700; letter-spacing: 0.02em;
  box-shadow: 0 2px 10px rgba(0,0,0,0.25); white-space: nowrap;
  animation: fsc-modehold 2.4s ease-out forwards;
}
@keyframes fsc-modehold {
  0%   { opacity: 0; transform: translateX(-50%) scale(0.88); }
  8%   { opacity: 1; transform: translateX(-50%) scale(1); }
  75%  { opacity: 1; }
  100% { opacity: 0; }
}

/* ── bottom bar ── */
.fsc-bottom {
  position: absolute; left: 0; right: 0;
  bottom: calc(env(safe-area-inset-bottom,0px) + 36px);
  display: flex; justify-content: center; z-index: 100;
}
.fsc-shutterrow {
  width: 100%; display: flex;
  align-items: center; justify-content: center;
  gap: 28px; padding: 0; box-sizing: border-box;
}
.fsc-side        { display: flex; align-items: center; }
.fsc-side-right  { justify-content: flex-end; }

.fsc-modebtn {
  background: var(--fsc-glass); border: 1px solid var(--fsc-stroke);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  color: #fff; font-size: 10px; font-weight: 800; letter-spacing: 0.12em;
  padding: 8px 13px; border-radius: 999px; line-height: 1; display: flex; align-items: center;
}

.fsc-shutter {
  width: 72px; height: 72px; border-radius: 50%; border: 3.5px solid #fff;
  background: transparent; display: flex; align-items: center; justify-content: center;
  padding: 4px; flex-shrink: 0; box-shadow: 0 4px 18px rgba(255,255,255,0.2);
}
.fsc-shutter:disabled { opacity: 0.5; }
.fsc-shutter-inner { width: 100%; height: 100%; border-radius: 50%; background: #fff; transition: transform 0.1s ease-out; }
.fsc-shutter.is-firing .fsc-shutter-inner { transform: scale(0.82); }

.fsc-filterbtn {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--fsc-chip); border: none;
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  color: #fff; display: flex; align-items: center; justify-content: center;
}
.fsc-filterspacer { width: 44px; height: 44px; display: block; }

/* ── VIDEO MODE ── */
.fsc-shutter--video .fsc-shutter-inner { background: #FF3B30; }
.fsc-shutter--video { box-shadow: 0 4px 18px rgba(255,59,48,0.35); }
.fsc-shutter.is-recording .fsc-shutter-inner {
  transform: scale(0.55); border-radius: 10px;
  transition: transform 0.18s ease-out, border-radius 0.18s ease-out;
}
.fsc-recbadge {
  position: absolute; top: calc(env(safe-area-inset-top,0px) + 22px);
  left: 50%; transform: translateX(-50%); z-index: 70;
  display: flex; align-items: center; gap: 7px;
  background: rgba(0,0,0,0.62); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  color: #fff; padding: 7px 16px; border-radius: 999px;
  font-size: 14px; font-weight: 800; letter-spacing: 0.06em; line-height: 1;
  font-variant-numeric: tabular-nums;
}
.fsc-recdot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #FF3B30; animation: fsc-recblink 1s ease-in-out infinite;
}
@keyframes fsc-recblink { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }

.fsc-processing {
  position: absolute; inset: 0; z-index: 80;
  display: flex; flex-direction: column; gap: 14px;
  align-items: center; justify-content: center;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  color: #fff; font-size: 14px; font-weight: 600; letter-spacing: 0.03em;
}
.fsc-processing-spinner {
  width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.18);
  border-top-color: #fff; border-radius: 50%; animation: fsc-spin 0.8s linear infinite;
}

@media (orientation: landscape) {
  .fsc-bottom { left: auto; right: calc(env(safe-area-inset-right,0px) + 18px); top: 0; bottom: 0; align-items: center; }
  .fsc-shutterrow { width: auto; flex-direction: column-reverse; gap: 16px; padding: 0; }
  .fsc-side { width: auto; }
  .fsc-toolbar { right: auto; left: 14px; }
}
@media (prefers-reduced-motion: reduce) {
  .fsc-reticle, .fsc-screenflash, .fsc-zoomreadout,
  .fsc-filtertoast, .fsc-timercount, .fsc-timertoast { animation: none; transition: none; }
}
`;
