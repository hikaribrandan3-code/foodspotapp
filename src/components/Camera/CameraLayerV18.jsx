/**
 * FoodSpot Camera — CameraLayerV18.jsx
 * ----------------------------------------------------------------------
 * Owner "Building Camera" — real CamTech v1.8 engine (useCamera.v18.js:
 * ImageCapture 4K sensor bypass + NICHE_PHYSICS hardware zoom + thermal +
 * kinetic stabilizer), wearing a clean UI that matches the customer camera.
 *
 * Capture (the part that kept going black): we draw the frame CLEAN — no
 * canvas `ctx.filter` (Safari breaks it) — then bake the scene + filter look
 * with raw pixels via bakeCapture(). Same numbers drive the live CSS preview
 * (previewCss), so the viewfinder == the saved photo. Hand-off shape is
 * { objectURL, blob, width, height } — exactly what EditorLayer expects.
 *
 * Props:
 *  - onCapture(result)
 *  - onClose()
 *  - locationLabel  business pin text
 *  - pinBg, pinText business pin colors
 *  - initialScene   'FOOD' | 'PORTRAIT'
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useCamera from './hooks/useCamera.v18.js';
import {
  SCENE_ORDER,
  SCENE_LABEL,
  CAPTURE_FILTERS,
  previewCss,
  bakeCapture,
} from './utils/scenePresets.js';

const ASPECT_CYCLE = ['9:16', '4:3', '1:1'];
const ASPECT_RATIO = { '9:16': 9 / 16, '4:3': 3 / 4, '1:1': 1 }; // w/h, portrait
const ZOOM_STOPS = [0.5, 1, 2, 5, 10];
const STABILIZE_AT = 4; // auto-stabilizer kicks in at/above this zoom
const FLASH_GLYPH = { off: '⚡', on: '⚡', auto: 'A', torch: '🔦' };

// nearest soft detent for pinch
function snapZoom(z) {
  let best = z;
  let bestD = Infinity;
  for (const s of ZOOM_STOPS) {
    const d = Math.abs(z - s);
    if (d < 0.18 && d < bestD) { bestD = d; best = s; }
  }
  return best;
}

export default function CameraLayer({
  onCapture,
  onClose,
  locationLabel = 'FoodSpot',
  pinBg = 'rgba(20,20,24,0.55)',
  pinText = '#ffffff',
  initialScene = 'FOOD',
}) {
  const {
    videoRef,
    isReady,
    error,
    facingMode,
    initCamera,
    flipCamera,
    terminateHardware,
    flashMode,
    flashSupported,
    cycleFlash,
    applyFlash,
    zoomLevel,
    setZoom,
    zoomRange,
    focusAt,
    captureHighResFrame,
    applyNicheMode,
    nicheMode,
    gimbalEnabled,
    toggleGimbal,
    calculateKineticOffset,
    getKineticOffset,
    statusMessage,
  } = useCamera();

  const [aspect, setAspect] = useState('9:16');
  const [filterId, setFilterId] = useState('original');
  const [filterToast, setFilterToast] = useState(null);
  const [zoomToast, setZoomToast] = useState(false);
  const [reticle, setReticle] = useState(null); // { x, y } in px
  const [screenFlash, setScreenFlash] = useState(false);
  const [shutterPulse, setShutterPulse] = useState(false);

  const frameRef = useRef(null);
  const lastUrlRef = useRef(null);
  const pinchStartRef = useRef(0);
  const pinchZoomRef = useRef(1);
  const tapRef = useRef({ t: 0, moved: false });
  const filterToastTimer = useRef(null);
  const zoomToastTimer = useRef(null);
  const reticleTimer = useRef(null);

  // ---- lifecycle ----------------------------------------------------------
  useEffect(() => {
    initCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  useEffect(() => {
    if (isReady) applyNicheMode(initialScene);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  useEffect(() => {
    return () => {
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
      clearTimeout(filterToastTimer.current);
      clearTimeout(zoomToastTimer.current);
      clearTimeout(reticleTimer.current);
      terminateHardware();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- flash: torch constant only in 'torch'; 'on' pulses at capture ------
  useEffect(() => {
    if (!flashSupported) return;
    applyFlash(flashMode === 'torch' ? 'torch' : 'off');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashMode, flashSupported]);

  // ---- auto-stabilizer: on at high zoom (best-effort, needs motion perm) --
  useEffect(() => {
    const want = zoomLevel >= STABILIZE_AT;
    if (want && !gimbalEnabled) toggleGimbal(true);
    else if (!want && gimbalEnabled) toggleGimbal(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomLevel]);

  // ---- gimbal RAF: DeviceMotion → kinetic offset → video transform --------
  useEffect(() => {
    const baseTransform = () => (facingMode === 'user' ? 'scaleX(-1)' : '');
    if (!gimbalEnabled) {
      const el = videoRef.current;
      if (el) el.style.transform = baseTransform();
      return;
    }
    let raf = 0;
    let imu = { beta: 0, gamma: 0 };
    const onMotion = (e) => {
      const r = e.rotationRate || {};
      imu = { beta: r.beta || 0, gamma: r.gamma || 0 };
    };
    window.addEventListener('devicemotion', onMotion);
    const loop = () => {
      calculateKineticOffset(imu);
      const { x, y } = getKineticOffset();
      const el = videoRef.current;
      if (el) {
        const moving = Math.abs(x) > 0.0005 || Math.abs(y) > 0.0005;
        el.style.transform = moving
          ? `${baseTransform()} translate(${(-x * 100).toFixed(2)}%, ${(-y * 100).toFixed(2)}%) scale(1.06)`
          : baseTransform();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('devicemotion', onMotion);
      const el = videoRef.current;
      if (el) el.style.transform = baseTransform();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gimbalEnabled, facingMode]);

  // ---- capture: CLEAN draw (no ctx.filter) → pixel bake → blob ------------
  const sourceToCapture = useCallback(
    async (source, sw, sh) => {
      const targetRatio = ASPECT_RATIO[aspect] || 9 / 16;
      const srcRatio = sw / sh;

      let cropW;
      let cropH;
      if (srcRatio > targetRatio) {
        cropH = sh;
        cropW = Math.round(sh * targetRatio);
      } else {
        cropW = sw;
        cropH = Math.round(sw / targetRatio);
      }
      const cropX = Math.round((sw - cropW) / 2);
      const cropY = Math.round((sh - cropH) / 2);

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // mirror front camera, draw CLEAN (NO ctx.filter — Safari-safe)
      if (facingMode === 'user') {
        ctx.translate(cropW, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      if (facingMode === 'user') ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (typeof source.close === 'function') source.close();

      // bake scene + filter look in raw pixels (matches the live preview)
      bakeCapture(ctx, cropW, cropH, nicheMode, filterId);

      const blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.98)
      );
      const objectURL = URL.createObjectURL(blob);
      return {
        objectURL,
        blob,
        width: cropW,
        height: cropH,
        aspectRatio: cropW / cropH,
        meta: { scene: nicheMode, filter: filterId, aspect, zoom: zoomLevel, facing: facingMode, ts: Date.now() },
      };
    },
    [aspect, nicheMode, filterId, facingMode, zoomLevel]
  );

  const handleShutter = useCallback(async () => {
    setShutterPulse(true);
    setTimeout(() => setShutterPulse(false), 130);

    const wantsFlash = flashMode === 'on' || flashMode === 'torch';
    const rearTorch = wantsFlash && flashSupported && facingMode === 'environment';

    try {
      if (rearTorch && flashMode === 'on') {
        await applyFlash('on');
        await new Promise((r) => setTimeout(r, 180));
      } else if (wantsFlash && facingMode === 'user') {
        setScreenFlash(true);
        setTimeout(() => setScreenFlash(false), 160);
        await new Promise((r) => setTimeout(r, 120));
      }

      // Primary: 4K sensor bypass (Chrome/Android). Fallback: live video frame.
      const bitmap = await captureHighResFrame();
      let result;
      if (bitmap) {
        result = await sourceToCapture(bitmap, bitmap.width, bitmap.height);
      } else {
        const v = videoRef.current;
        if (!v || !v.videoWidth) return;
        result = await sourceToCapture(v, v.videoWidth, v.videoHeight);
      }

      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
      lastUrlRef.current = result.objectURL;
      if (onCapture) onCapture(result);
    } catch {
      /* sensor not ready — ignore tap */
    } finally {
      if (rearTorch && flashMode === 'on') applyFlash('off');
    }
  }, [flashMode, flashSupported, facingMode, applyFlash, captureHighResFrame, sourceToCapture, onCapture, videoRef]);

  // ---- aspect / scene / filter --------------------------------------------
  const cycleAspect = useCallback(() => {
    setAspect((a) => ASPECT_CYCLE[(ASPECT_CYCLE.indexOf(a) + 1) % ASPECT_CYCLE.length]);
  }, []);

  const cycleFilter = useCallback(() => {
    setFilterId((cur) => {
      const i = CAPTURE_FILTERS.findIndex((f) => f.id === cur);
      const next = CAPTURE_FILTERS[(i + 1) % CAPTURE_FILTERS.length];
      setFilterToast(next.label);
      clearTimeout(filterToastTimer.current);
      filterToastTimer.current = setTimeout(() => setFilterToast(null), 700);
      return next.id;
    });
  }, []);

  const showZoomToast = useCallback(() => {
    setZoomToast(true);
    clearTimeout(zoomToastTimer.current);
    zoomToastTimer.current = setTimeout(() => setZoomToast(false), 900);
  }, []);

  // ---- touch: tap-to-focus + pinch-to-zoom --------------------------------
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartRef.current = Math.hypot(dx, dy);
      pinchZoomRef.current = zoomLevel;
      tapRef.current.moved = true;
    } else {
      tapRef.current = { t: Date.now(), moved: false };
    }
  }, [zoomLevel]);

  const onTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchStartRef.current > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = 1 + (dist / pinchStartRef.current - 1) * 2.2;
      const min = zoomRange?.min ?? 1;
      const max = zoomRange?.max ?? 10;
      setZoom(Math.max(min, Math.min(max, pinchZoomRef.current * factor)));
      showZoomToast();
    } else {
      tapRef.current.moved = true;
    }
  }, [zoomRange, setZoom, showZoomToast]);

  const onTouchEnd = useCallback((e) => {
    if (pinchStartRef.current > 0) {
      pinchStartRef.current = 0;
      setZoom(snapZoom(zoomLevel)); // soft detent
      return;
    }
    // single tap (not a drag, quick) → focus
    const { t, moved } = tapRef.current;
    if (!moved && Date.now() - t < 300) {
      const touch = e.changedTouches && e.changedTouches[0];
      const el = frameRef.current;
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

  const liveFilter = previewCss(nicheMode, filterId);
  const zoomFloor = zoomRange?.min ?? 1;
  const halfStop = zoomFloor <= 0.5;

  return (
    <div className="fsc-root" data-aspect={aspect}>
      <style>{styles}</style>

      {/* ============ VIEWFINDER ============ */}
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
          autoPlay
          playsInline
          muted
          style={{
            transform: facingMode === 'user' ? 'scaleX(-1)' : undefined,
            filter: liveFilter === 'none' ? undefined : liveFilter,
          }}
        />

        {/* iOS-style tap-to-focus reticle */}
        {reticle && (
          <div className="fsc-reticle" style={{ left: reticle.x, top: reticle.y }} />
        )}

        {screenFlash && <div className="fsc-screenflash" />}

        {!isReady && !error && (
          <div className="fsc-status">
            <div className="fsc-spinner" />
            {statusMessage || 'Iniciando cámara…'}
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

      {/* ============ TOP-LEFT: close + business pin (1:1 customer) ======= */}
      <button className="fsc-close" onClick={onClose} aria-label="Cerrar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <div className="fsc-pin" style={{ background: pinBg, color: pinText }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill={pinText} style={{ flexShrink: 0 }}>
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
        </svg>
        <span>{String(locationLabel).toUpperCase()}</span>
      </div>

      {/* ============ TOP-RIGHT: aspect toggle ============ */}
      <button className="fsc-aspect" onClick={cycleAspect} aria-label="Formato">{aspect}</button>

      {/* ============ RIGHT-CENTER: flip + flash (glass pill) ============ */}
      <div className="fsc-toolbar">
        <button className="fsc-tool" onClick={flipCamera} aria-label="Girar cámara">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
            <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
            <circle cx="12" cy="12" r="3" />
            <path d="m18 22-3-3 3-3" />
            <path d="m6 2 3 3-3 3" />
          </svg>
        </button>
        <button
          className={`fsc-tool ${flashMode !== 'off' ? 'is-on' : ''}`}
          onClick={cycleFlash}
          aria-label="Flash"
          disabled={!flashSupported}
        >
          <span className="fsc-flashglyph">{FLASH_GLYPH[flashMode]}</span>
        </button>
      </div>

      {/* ============ ZOOM READOUT (fades) ============ */}
      {zoomToast && (
        <div className="fsc-zoomreadout">{zoomLevel.toFixed(zoomLevel < 10 ? 1 : 0)}×</div>
      )}

      {/* ============ FILTER TOAST (fades) ============ */}
      {filterToast && <div className="fsc-filtertoast">{filterToast}</div>}

      {/* ============ BOTTOM ============ */}
      <div className="fsc-bottom">
        <div className="fsc-onetake">ONE TAKE</div>

        <div className="fsc-shutterrow">
          {/* left: scene mode pills */}
          <div className="fsc-modes">
            {SCENE_ORDER.map((id) => (
              <button
                key={id}
                className={`fsc-modepill ${nicheMode === id ? 'is-active' : ''}`}
                onClick={() => applyNicheMode(id)}
              >
                {SCENE_LABEL[id]}
              </button>
            ))}
          </div>

          {/* center: shutter */}
          <button
            className={`fsc-shutter ${shutterPulse ? 'is-firing' : ''}`}
            onClick={handleShutter}
            disabled={!isReady}
            aria-label="Capturar"
          >
            <span className="fsc-shutter-inner" />
          </button>

          {/* right: filter toggle (replaces the old dead thumbnail slot) */}
          <button className="fsc-filterbtn" onClick={cycleFilter} aria-label="Filtros">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity="0.3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */
const styles = `
.fsc-root {
  --fsc-text: #FFFFFF;
  --fsc-dim: rgba(255,255,255,0.62);
  --fsc-glass: rgba(0,0,0,0.22);
  --fsc-chip: rgba(255,255,255,0.15);
  --fsc-stroke: rgba(255,255,255,0.16);
  --fsc-accent: #FF6B3D;
  --fsc-lock: #FFD60A;
  position: fixed; inset: 0;
  background: #000;
  color: var(--fsc-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  -webkit-user-select: none; user-select: none;
  touch-action: none;
}

.fsc-frame { position: relative; overflow: hidden; background: #000; width: 100vw; height: 100dvh; }
.fsc-root[data-aspect="4:3"] .fsc-frame {
  width: min(100vw, calc(100dvh * 0.75)); height: min(100dvh, calc(100vw / 0.75)); border-radius: 18px;
}
.fsc-root[data-aspect="1:1"] .fsc-frame {
  width: min(100vw, 100dvh); height: min(100vw, 100dvh); border-radius: 18px;
}
.fsc-video { width: 100%; height: 100%; object-fit: cover; transform-origin: center; }

/* tap-to-focus reticle — iOS yellow square */
.fsc-reticle {
  position: absolute; width: 78px; height: 78px; margin: -39px 0 0 -39px;
  border: 1.5px solid var(--fsc-lock); border-radius: 6px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
  pointer-events: none; animation: fsc-focus 1s ease-out forwards;
}
@keyframes fsc-focus {
  0% { transform: scale(1.4); opacity: 0; }
  18% { transform: scale(1); opacity: 1; }
  35% { transform: scale(0.92); }
  50% { transform: scale(1); }
  80% { opacity: 1; }
  100% { opacity: 0.55; }
}

.fsc-screenflash { position: absolute; inset: 0; background: #fff; z-index: 30; animation: fsc-blink 0.16s ease-out; }
@keyframes fsc-blink { from { opacity: 1; } to { opacity: 0.85; } }

.fsc-status {
  position: absolute; inset: 0; z-index: 5;
  display: flex; flex-direction: column; gap: 14px; align-items: center; justify-content: center;
  background: #000; color: var(--fsc-dim); font-size: 13px; text-align: center; padding: 0 32px; letter-spacing: 0.04em;
}
.fsc-spinner { width: 46px; height: 46px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #fff; border-radius: 50%; animation: fsc-spin 0.8s linear infinite; }
@keyframes fsc-spin { to { transform: rotate(360deg); } }
.fsc-retry { background: var(--fsc-accent); color: #fff; border: 0; padding: 10px 22px; border-radius: 999px; font-size: 14px; font-weight: 600; }

/* top-left: close + pin (matches customer camera) */
.fsc-close {
  position: absolute; top: calc(env(safe-area-inset-top,0px) + 16px); left: 16px;
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border: none; color: #fff; display: flex; align-items: center; justify-content: center; z-index: 200;
}
.fsc-pin {
  position: absolute; top: calc(env(safe-area-inset-top,0px) + 72px); left: 16px; z-index: 10;
  display: flex; align-items: center; gap: 5px; padding: 8px 14px; border-radius: 20px;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.fsc-pin span { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; line-height: 1; white-space: nowrap; max-width: 46vw; overflow: hidden; text-overflow: ellipsis; }

/* top-right: aspect */
.fsc-aspect {
  position: absolute; top: calc(env(safe-area-inset-top,0px) + 16px); right: 16px; z-index: 10;
  height: 40px; padding: 0 14px; border-radius: 999px;
  background: var(--fsc-glass); border: 1px solid var(--fsc-stroke);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  color: #fff; font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
}

/* right-center: flip + flash glass pill (matches customer toolbar) */
.fsc-toolbar {
  position: absolute; right: 16px; top: 50%; transform: translateY(-50%); z-index: 50;
  display: flex; flex-direction: column; gap: 8px; padding: 12px 8px;
  background: var(--fsc-glass); border-radius: 22px;
  backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
}
.fsc-tool {
  width: 44px; height: 44px; border-radius: 50%; background: transparent; border: none;
  color: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent; transition: color 0.15s, background 0.15s;
}
.fsc-tool:active { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.92); }
.fsc-tool.is-on { color: var(--fsc-lock); }
.fsc-tool:disabled { opacity: 0.3; }
.fsc-flashglyph { font-size: 17px; font-weight: 700; }

/* zoom readout + filter toast */
.fsc-zoomreadout {
  position: absolute; bottom: 220px; left: 50%; transform: translateX(-50%); z-index: 60;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(10px); color: var(--fsc-lock);
  padding: 5px 14px; border-radius: 999px; font-size: 14px; font-weight: 800; letter-spacing: 0.02em;
  animation: fsc-fade 0.9s ease-out forwards;
}
.fsc-filtertoast {
  position: absolute; bottom: 178px; left: 50%; transform: translateX(-50%); z-index: 60;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); color: #fff;
  padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;
  animation: fsc-fade 0.7s ease-out forwards;
}
@keyframes fsc-fade { 0% { opacity: 0; } 18% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; } }

/* bottom */
.fsc-bottom {
  position: absolute; left: 0; right: 0; bottom: calc(env(safe-area-inset-bottom,0px) + 36px);
  display: flex; flex-direction: column; align-items: center; gap: 14px; z-index: 100;
}
.fsc-onetake { font-size: 10.5px; font-weight: 800; letter-spacing: 0.32em; text-indent: 0.32em; text-transform: uppercase; color: #fff; opacity: 0.9; }

.fsc-shutterrow {
  width: 100%; max-width: 460px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 26px; box-sizing: border-box;
}
.fsc-modes { display: flex; flex-direction: column; gap: 6px; width: 92px; }
.fsc-modepill {
  background: var(--fsc-glass); border: 1px solid var(--fsc-stroke); backdrop-filter: blur(12px);
  color: var(--fsc-dim); font-size: 11px; font-weight: 800; letter-spacing: 0.08em;
  padding: 7px 0; border-radius: 999px; text-align: center;
}
.fsc-modepill.is-active { color: #fff; background: var(--fsc-accent); border-color: var(--fsc-accent); box-shadow: 0 0 16px rgba(255,107,61,0.4); }

.fsc-shutter {
  width: 74px; height: 74px; border-radius: 50%; border: 4px solid #fff; background: transparent;
  display: flex; align-items: center; justify-content: center; padding: 4px; flex-shrink: 0;
  box-shadow: 0 4px 20px rgba(255,255,255,0.22);
}
.fsc-shutter:disabled { opacity: 0.5; }
.fsc-shutter-inner { width: 100%; height: 100%; border-radius: 50%; background: #fff; transition: transform 0.1s ease-out; }
.fsc-shutter.is-firing .fsc-shutter-inner { transform: scale(0.82); }

.fsc-filterbtn {
  width: 92px; display: flex; justify-content: center;
}
.fsc-filterbtn {
  height: 48px; border-radius: 999px;
  background: var(--fsc-chip); border: none; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  color: #fff; align-items: center;
}

@media (orientation: landscape) {
  .fsc-root[data-aspect="4:3"] .fsc-frame {
    width: min(100vw, calc(100dvh / 0.75)); height: min(100dvh, calc(100vw * 0.75));
  }
  .fsc-bottom { left: auto; right: calc(env(safe-area-inset-right,0px) + 18px); top: 0; bottom: 0; width: auto; justify-content: center; }
  .fsc-shutterrow { width: auto; flex-direction: column-reverse; gap: 18px; padding: 0; }
  .fsc-modes { flex-direction: row; width: auto; }
  .fsc-toolbar { right: auto; left: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .fsc-reticle, .fsc-screenflash, .fsc-zoomreadout, .fsc-filtertoast { animation: none; }
}
`;
