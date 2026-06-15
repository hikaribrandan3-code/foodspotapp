/**
 * FoodSpot Camera — CameraLayerV18.jsx
 * ----------------------------------------------------------------------
 * Owner-only "Building Camera" UI, wired to the REAL CamTech v1.8 engine
 * (useCamera.v18.js — ImageCapture 4K sensor bypass + ThermalGovernor +
 * NICHE_PHYSICS + Kinetic gimbal).
 *
 * This is NOT the simplified video-canvas reimplementation. Capture goes
 * through ImageCapture.grabFrame() at native sensor resolution. FOOD niche
 * mode applies a 2.2x hardware zoom + barrel correction → the macro look.
 *
 * Capture handoff: grabFrame() returns an ImageBitmap. We crop it to the
 * selected display aspect (WYSIWYG with the portrait viewfinder), bake the
 * scene grade, encode to a blob, and hand EditorLayer { objectURL, blob,
 * width, height, meta } — which is exactly what it expects (fixes the
 * black-screen-on-transfer bug).
 *
 * Props:
 *  - onCapture(result)   result = { objectURL, blob, width, height, meta }
 *  - onClose()
 *  - locationLabel       business pin text (from tenantData.business_name)
 *  - pinBg, pinText      business pin colors (from app_config.cameraPinStyle)
 *  - initialScene        'FOOD' | 'PORTRAIT'
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useCamera from './hooks/useCamera.v18.js';
import {
  SCENE_ORDER,
  SCENE_PRESETS,
  CAPTURE_FILTERS,
  composeFilter,
} from './utils/scenePresets.js';

const ASPECT_CYCLE = ['9:16', '4:3', '1:1'];
// width / height for each display (portrait) aspect
const ASPECT_RATIO = { '9:16': 9 / 16, '4:3': 3 / 4, '1:1': 1 };
const ZOOM_STOPS = [0.5, 1, 2, 5, 10];

const FLASH_GLYPH = { off: '⚡', on: '⚡', auto: 'A⚡', torch: '🔦' };

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
    captureHighResFrame,
    applyNicheMode,
    nicheMode,
    gimbalEnabled,
    toggleGimbal,
    calculateKineticOffset,
    getKineticOffset,
    statusMessage,
  } = useCamera();

  // ---- local UI state (the real hook is hardware-only; UI lives here) ----
  const [aspect, setAspect] = useState('9:16');
  const [filterId, setFilterId] = useState('original');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [shutterPulse, setShutterPulse] = useState(false);
  const [lastShot, setLastShot] = useState(null);

  const frameRef = useRef(null);
  const lastUrlRef = useRef(null);
  const pinchStartRef = useRef(0);
  const pinchZoomRef = useRef(1);

  // ---- lifecycle: ignite on mount + on facing change, clean on unmount ----
  useEffect(() => {
    initCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  useEffect(() => {
    // apply the starting niche once the sensor is live
    if (isReady) applyNicheMode(initialScene);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  useEffect(() => {
    return () => {
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
      terminateHardware();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- flash: torch is constant only in 'torch' mode; 'on' pulses at capture ----
  useEffect(() => {
    if (!flashSupported) return;
    applyFlash(flashMode === 'torch' ? 'torch' : 'off');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashMode, flashSupported]);

  // ---- gimbal: feed DeviceMotion into the kinetic engine, apply UV offset ----
  useEffect(() => {
    if (!gimbalEnabled) return;
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
        const mirror = facingMode === 'user' ? 'scaleX(-1) ' : '';
        el.style.transform = `${mirror}translate(${(-x * 100).toFixed(2)}%, ${(-y * 100).toFixed(2)}%) scale(1.08)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('devicemotion', onMotion);
      const el = videoRef.current;
      if (el) el.style.transform = facingMode === 'user' ? 'scaleX(-1)' : '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gimbalEnabled, facingMode]);

  // ---- source (ImageBitmap OR <video>) → cropped, graded blob --------------
  // Works with the 4K ImageCapture bitmap (Chrome/Android) AND a plain video
  // frame (Safari/iOS, where ImageCapture.grabFrame is unavailable).
  const sourceToCapture = useCallback(
    async (source, sw, sh) => {
      const targetRatio = ASPECT_RATIO[aspect] || 9 / 16; // w/h, portrait
      const srcRatio = sw / sh;

      // cover-crop: match what the portrait viewfinder shows
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
      const ctx = canvas.getContext('2d');

      const grade = composeFilter(nicheMode, filterId);
      if (grade !== 'none') ctx.filter = grade;

      if (facingMode === 'user') {
        ctx.translate(cropW, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      if (typeof source.close === 'function') source.close(); // free ImageBitmap

      const blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95)
      );
      const objectURL = URL.createObjectURL(blob);
      return {
        objectURL,
        blob,
        width: cropW,
        height: cropH,
        meta: { scene: nicheMode, filter: filterId, aspect, zoom: zoomLevel, facing: facingMode, ts: Date.now() },
      };
    },
    [aspect, nicheMode, filterId, facingMode, zoomLevel]
  );

  // ---- shutter -------------------------------------------------------------
  const handleShutter = useCallback(async () => {
    setShutterPulse(true);
    setTimeout(() => setShutterPulse(false), 130);

    const wantsFlash = flashMode === 'on' || flashMode === 'torch';
    const rearTorch = wantsFlash && flashSupported && facingMode === 'environment';

    try {
      if (rearTorch && flashMode === 'on') {
        await applyFlash('on');
        await new Promise((r) => setTimeout(r, 180)); // let AE settle
      } else if (wantsFlash && facingMode === 'user') {
        setScreenFlash(true);
        setTimeout(() => setScreenFlash(false), 160);
        await new Promise((r) => setTimeout(r, 120));
      }

      // Primary: 4K sensor bypass via ImageCapture (Chrome/Android).
      const bitmap = await captureHighResFrame();

      let result;
      if (bitmap) {
        result = await sourceToCapture(bitmap, bitmap.width, bitmap.height);
      } else {
        // Fallback: grab the live video frame (Safari/iOS — no ImageCapture).
        const v = videoRef.current;
        if (!v || !v.videoWidth) return;
        result = await sourceToCapture(v, v.videoWidth, v.videoHeight);
      }

      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
      lastUrlRef.current = result.objectURL;
      setLastShot(result.objectURL);
      if (onCapture) onCapture(result);
    } catch {
      /* sensor not ready — ignore tap */
    } finally {
      if (rearTorch && flashMode === 'on') applyFlash('off');
    }
  }, [flashMode, flashSupported, facingMode, applyFlash, captureHighResFrame, sourceToCapture, onCapture, videoRef]);

  // ---- aspect + scene + pinch ---------------------------------------------
  const cycleAspect = useCallback(() => {
    const i = ASPECT_CYCLE.indexOf(aspect);
    setAspect(ASPECT_CYCLE[(i + 1) % ASPECT_CYCLE.length]);
  }, [aspect]);

  const selectScene = useCallback(
    (id) => {
      applyNicheMode(id);
    },
    [applyNicheMode]
  );

  const onTouchStart = useCallback((e) => {
    if (e.touches && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartRef.current = Math.hypot(dx, dy);
      pinchZoomRef.current = zoomLevel;
    }
  }, [zoomLevel]);

  const onTouchMove = useCallback((e) => {
    if (e.touches && e.touches.length === 2 && pinchStartRef.current > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = 1 + (dist / pinchStartRef.current - 1) * 2.2;
      const min = zoomRange?.min ?? 1;
      const max = zoomRange?.max ?? 10;
      setZoom(Math.max(min, Math.min(max, pinchZoomRef.current * factor)));
    }
  }, [zoomRange, setZoom]);

  const onTouchEnd = useCallback(() => {
    pinchStartRef.current = 0;
  }, []);

  const previewFilter = composeFilter(nicheMode, filterId);
  const zoomFloor = zoomRange?.min ?? 1;
  const halfStopAvailable = zoomFloor <= 0.5;

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
            filter: previewFilter === 'none' ? undefined : previewFilter,
          }}
        />

        {screenFlash && <div className="fsc-screenflash" />}

        {!isReady && !error && (
          <div className="fsc-status">{statusMessage || 'Iniciando cámara…'}</div>
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

      {/* ============ TOP BAR ============ */}
      <div className="fsc-top">
        <button className="fsc-icon" onClick={onClose} aria-label="Cerrar">✕</button>
        <div className="fsc-location" style={{ background: pinBg, color: pinText }}>
          <span className="fsc-pin">⌖</span> {locationLabel}
        </div>
        <button className="fsc-icon fsc-aspectbtn" onClick={cycleAspect} aria-label="Formato">
          {aspect}
        </button>
      </div>

      {/* ============ RIGHT TOOLBAR ============ */}
      <div className="fsc-toolbar">
        <button
          className={`fsc-tool ${flashMode !== 'off' ? 'is-on' : ''}`}
          onClick={cycleFlash}
          aria-label="Flash"
          disabled={!flashSupported}
        >
          {FLASH_GLYPH[flashMode]}
        </button>

        <button className="fsc-tool" onClick={flipCamera} aria-label="Girar cámara">⟳</button>

        <button
          className={`fsc-tool fsc-gimbal ${gimbalEnabled ? 'is-on' : ''}`}
          onClick={() => toggleGimbal(!gimbalEnabled)}
          aria-label="Estabilizador"
        >
          ⊹
        </button>
      </div>

      {/* ============ BOTTOM STACK ============ */}
      <div className="fsc-bottom">
        {/* filter strip */}
        {filtersOpen && (
          <div className="fsc-filters">
            {CAPTURE_FILTERS.map((f) => (
              <button
                key={f.id}
                className={`fsc-filterchip ${filterId === f.id ? 'is-active' : ''}`}
                onClick={() => setFilterId(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* zoom stops */}
        <div className="fsc-zoomrow">
          {ZOOM_STOPS.map((s) => {
            const disabled = s < 1 && !halfStopAvailable;
            const active = Math.abs(zoomLevel - s) < 0.15;
            return (
              <button
                key={s}
                className={`fsc-zoomstop ${active ? 'is-active' : ''}`}
                disabled={disabled}
                onClick={() => setZoom(s)}
              >
                {active ? `${zoomLevel.toFixed(zoomLevel < 3 ? 1 : 0)}×` : s === 0.5 ? '.5' : `${s}`}
              </button>
            );
          })}
        </div>

        {/* scene pills */}
        <div className="fsc-scenes">
          {SCENE_ORDER.map((id) => (
            <button
              key={id}
              className={`fsc-scenepill ${nicheMode === id ? 'is-active' : ''}`}
              onClick={() => selectScene(id)}
            >
              {SCENE_PRESETS[id].label}
            </button>
          ))}
        </div>

        {/* ONE TAKE label */}
        <div className="fsc-onetake">ONE TAKE</div>

        {/* shutter row */}
        <div className="fsc-shutterrow">
          <button
            className={`fsc-side fsc-filtersbtn ${filtersOpen ? 'is-on' : ''}`}
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-label="Filtros"
          >
            ✦
          </button>

          <button
            className={`fsc-shutter ${shutterPulse ? 'is-firing' : ''}`}
            onClick={handleShutter}
            aria-label="Capturar"
          >
            <span className="fsc-shutter-inner" />
          </button>

          <div className="fsc-side fsc-thumb">
            {lastShot ? <img src={lastShot} alt="Última foto" /> : <span />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   STYLES — fsc- prefix to avoid collisions.
   ====================================================================== */
const styles = `
.fsc-root {
  --fsc-bg: #08080A;
  --fsc-text: #FFFFFF;
  --fsc-dim: rgba(255,255,255,0.62);
  --fsc-chip: rgba(20,20,24,0.55);
  --fsc-stroke: rgba(255,255,255,0.16);
  --fsc-accent: #FF6B3D;
  --fsc-radius: 999px;

  position: fixed; inset: 0;
  background: var(--fsc-bg);
  color: var(--fsc-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  -webkit-user-select: none; user-select: none;
  touch-action: none;
}

.fsc-frame {
  position: relative;
  overflow: hidden;
  background: #000;
  width: 100vw; height: 100dvh;
}
.fsc-root[data-aspect="4:3"] .fsc-frame {
  width: min(100vw, calc(100dvh * 0.75));
  height: min(100dvh, calc(100vw / 0.75));
  border-radius: 18px;
}
.fsc-root[data-aspect="1:1"] .fsc-frame {
  width: min(100vw, 100dvh);
  height: min(100vw, 100dvh);
  border-radius: 18px;
}
.fsc-video {
  width: 100%; height: 100%;
  object-fit: cover;
  transform-origin: center;
}

.fsc-screenflash {
  position: absolute; inset: 0; background: #fff; z-index: 30;
  animation: fsc-blink 0.16s ease-out;
}
@keyframes fsc-blink { from { opacity: 1; } to { opacity: 0.85; } }

.fsc-status {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; gap: 14px;
  align-items: center; justify-content: center;
  color: var(--fsc-dim); font-size: 13px; text-align: center; padding: 0 32px;
  letter-spacing: 0.04em;
}
.fsc-retry {
  background: var(--fsc-accent); color: #fff; border: 0;
  padding: 10px 22px; border-radius: var(--fsc-radius);
  font-size: 14px; font-weight: 600;
}

.fsc-top {
  position: absolute; top: 0; left: 0; right: 0;
  padding: calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px;
  display: flex; align-items: center; justify-content: space-between;
  z-index: 10;
}
.fsc-icon {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: var(--fsc-chip);
  border: 1px solid var(--fsc-stroke);
  color: var(--fsc-text);
  font-size: 15px;
  backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center;
}
.fsc-aspectbtn { width: auto; padding: 0 14px; border-radius: var(--fsc-radius); font-size: 12px; font-weight: 700; letter-spacing: 0.04em; }
.fsc-location {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid var(--fsc-stroke);
  backdrop-filter: blur(12px);
  border-radius: var(--fsc-radius);
  padding: 8px 16px;
  font-size: 12.5px; font-weight: 600;
  max-width: 52vw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.fsc-pin { color: var(--fsc-accent); font-size: 14px; }

.fsc-toolbar {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 68px);
  right: 14px;
  display: flex; flex-direction: column; gap: 12px;
  z-index: 10;
}
.fsc-tool {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: var(--fsc-chip);
  border: 1px solid var(--fsc-stroke);
  color: rgba(255,255,255,0.85);
  font-size: 16px;
  backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.fsc-tool:disabled { opacity: 0.35; }
.fsc-tool.is-on { color: var(--fsc-accent); border-color: var(--fsc-accent); }
.fsc-gimbal.is-on { color: #34D399; border-color: #34D399; box-shadow: 0 0 14px rgba(52,211,153,0.4); }

.fsc-bottom {
  position: absolute; left: 0; right: 0;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 14px);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  z-index: 10;
}
.fsc-filters { display: flex; gap: 8px; }
.fsc-filterchip {
  background: var(--fsc-chip); border: 1px solid var(--fsc-stroke);
  backdrop-filter: blur(12px);
  color: var(--fsc-dim); font-size: 12px; font-weight: 600;
  padding: 7px 14px; border-radius: var(--fsc-radius);
}
.fsc-filterchip.is-active { color: #fff; border-color: var(--fsc-accent); background: rgba(255,107,61,0.18); }

.fsc-zoomrow {
  display: flex; gap: 6px; align-items: center;
  background: var(--fsc-chip); border: 1px solid var(--fsc-stroke);
  backdrop-filter: blur(12px);
  border-radius: var(--fsc-radius); padding: 5px;
}
.fsc-zoomstop {
  min-width: 34px; height: 34px; padding: 0 6px;
  border-radius: 50%;
  background: transparent; border: 0;
  color: var(--fsc-dim); font-size: 11.5px; font-weight: 700;
}
.fsc-zoomstop.is-active { background: rgba(255,255,255,0.14); color: var(--fsc-accent); font-size: 12.5px; }
.fsc-zoomstop:disabled { opacity: 0.28; }

.fsc-scenes { display: flex; gap: 8px; }
.fsc-scenepill {
  background: var(--fsc-chip); border: 1px solid var(--fsc-stroke);
  backdrop-filter: blur(12px);
  color: var(--fsc-dim);
  font-size: 12px; font-weight: 800; letter-spacing: 0.1em;
  padding: 8px 18px; border-radius: var(--fsc-radius);
  transition: all 0.18s;
}
.fsc-scenepill.is-active {
  color: #fff;
  background: var(--fsc-accent);
  border-color: var(--fsc-accent);
  box-shadow: 0 0 18px rgba(255,107,61,0.45);
}

.fsc-onetake {
  font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.32em; text-indent: 0.32em;
  text-transform: uppercase;
  color: #fff; opacity: 0.92;
}

.fsc-shutterrow {
  width: 100%; max-width: 420px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 36px; box-sizing: border-box;
}
.fsc-side {
  width: 46px; height: 46px; border-radius: 14px;
  background: var(--fsc-chip); border: 1px solid var(--fsc-stroke);
  backdrop-filter: blur(12px);
  color: rgba(255,255,255,0.85); font-size: 17px;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.fsc-filtersbtn.is-on { color: var(--fsc-accent); border-color: var(--fsc-accent); }
.fsc-thumb img { width: 100%; height: 100%; object-fit: cover; }

.fsc-shutter {
  width: 76px; height: 76px;
  border-radius: 50%;
  border: 4px solid #fff;
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  padding: 0;
}
.fsc-shutter-inner {
  width: 60px; height: 60px; border-radius: 50%;
  background: #fff;
  transition: transform 0.1s ease-out;
}
.fsc-shutter.is-firing .fsc-shutter-inner { transform: scale(0.82); }
.fsc-shutter:active .fsc-shutter-inner { transform: scale(0.88); }

@media (orientation: landscape) {
  .fsc-root[data-aspect="4:3"] .fsc-frame {
    width: min(100vw, calc(100dvh / 0.75));
    height: min(100dvh, calc(100vw * 0.75));
  }
  .fsc-bottom {
    left: auto; right: calc(env(safe-area-inset-right, 0px) + 18px);
    top: 0; bottom: 0;
    width: auto;
    flex-direction: column; justify-content: center;
  }
  .fsc-shutterrow {
    width: auto; padding: 0;
    flex-direction: column-reverse; gap: 16px;
  }
  .fsc-zoomrow { transform: scale(0.92); }
  .fsc-toolbar {
    right: auto; left: 14px;
    top: 50%; transform: translateY(-50%);
  }
  .fsc-top { padding-left: calc(env(safe-area-inset-left, 0px) + 16px); }
}

@media (prefers-reduced-motion: reduce) {
  .fsc-screenflash { animation: none; }
}
`;
