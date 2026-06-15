/**
 * FoodSpot Camera — CameraLayer.jsx
 * ----------------------------------
 * Full camera UI on top of useCamera.
 *
 * CamTech v1.8 additions per spec:
 *  - "ONE TAKE" label above the shutter
 *  - Scene pills [FOOD] [PET] [PORTRAIT] above the shutter (FOOD default)
 *  - AE/AF toggle in the right toolbar, below flash (yellow on / gray off)
 *  - Zoom 0.5x–10x (quick stops + pinch)
 *  - Macro chip + 5–30 cm distance slider (FOOD scene)
 *  - 9:16 / 4:3 / 1:1 aspect ratios, object-fit: cover (no letterboxing)
 *  - Landscape layout adaptation
 *
 * Props:
 *  - onCapture(result)   result = { blob, width, height, meta }
 *  - onClose()
 *  - locationLabel       string shown in the location pill
 *  - initialScene        'FOOD' | 'PET' | 'PORTRAIT'
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useCamera, { ZOOM_UI_MAX } from './hooks/useCamera.v18.js';
import {
  SCENE_ORDER,
  SCENE_PRESETS,
  CAPTURE_FILTERS,
  MACRO_RANGE_M,
  composeFilter,
} from './utils/scenePresets.js';

const ZOOM_STOPS = [0.5, 1, 2, 5, 10];
const ASPECT_CYCLE = ['9:16', '4:3', '1:1'];

export default function CameraLayer({
  onCapture,
  onClose,
  locationLabel = 'Ubicación',
  initialScene = 'FOOD',
}) {
  const cam = useCamera({ initialScene });
  const {
    videoRef, start, flip, ready, error, facing,
    sceneMode, selectScene, faces,
    zoom, zoomFloor, setZoomLevel, previewTransform,
    onPinchStart, onPinchMove, onPinchEnd,
    macroOn, macroDistance, setMacro, setMacroFocusDistance,
    aeafLocked, toggleAeAfLock, focusAt,
    flashMode, setFlashMode, aspect, setAspect,
    filterId, setFilterId, captureWithFlash,
  } = cam;

  const [reticle, setReticle] = useState(null); // {x,y} in px within frame
  const [screenFlash, setScreenFlash] = useState(false);
  const [shutterPulse, setShutterPulse] = useState(false);
  const [lastShot, setLastShot] = useState(null); // object URL thumb
  const [filtersOpen, setFiltersOpen] = useState(false);
  const frameRef = useRef(null);
  const lastUrlRef = useRef(null);

  useEffect(() => {
    start();
    return () => {
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- shutter --------------------------------------------------------
  const handleShutter = useCallback(async () => {
    setShutterPulse(true);
    setTimeout(() => setShutterPulse(false), 130);
    try {
      const result = await captureWithFlash({
        onScreenFlash: () => {
          setScreenFlash(true);
          setTimeout(() => setScreenFlash(false), 160);
        },
      });
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
      lastUrlRef.current = URL.createObjectURL(result.blob);
      setLastShot(lastUrlRef.current);
      if (onCapture) onCapture(result);
    } catch {
      /* camera not ready yet — ignore the tap */
    }
  }, [captureWithFlash, onCapture]);

  // ---- tap to focus ----------------------------------------------------
  const handleFrameTap = useCallback(
    (e) => {
      const el = frameRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      setReticle({ x: cx, y: cy });
      setTimeout(() => setReticle(null), 1100);
      focusAt(cx / rect.width, cy / rect.height);
    },
    [focusAt]
  );

  // ---- aspect cycle ----------------------------------------------------
  const cycleAspect = useCallback(() => {
    const i = ASPECT_CYCLE.indexOf(aspect);
    setAspect(ASPECT_CYCLE[(i + 1) % ASPECT_CYCLE.length]);
  }, [aspect, setAspect]);

  const previewFilter = composeFilter(sceneMode, filterId);
  const halfStopAvailable = zoomFloor < 1;

  return (
    <div className="fsc-root" data-aspect={aspect}>
      <style>{styles}</style>

      {/* ============ VIEWFINDER ============ */}
      <div
        className="fsc-frame"
        ref={frameRef}
        onClick={handleFrameTap}
        onTouchStart={onPinchStart}
        onTouchMove={onPinchMove}
        onTouchEnd={onPinchEnd}
      >
        <video
          ref={videoRef}
          className="fsc-video"
          autoPlay
          playsInline
          muted
          style={{
            transform: `${facing === 'user' ? 'scaleX(-1) ' : ''}${previewTransform}`,
            filter: previewFilter === 'none' ? undefined : previewFilter,
          }}
        />

        {/* face boxes (PORTRAIT) */}
        {faces.map((f, i) => (
          <div
            key={i}
            className="fsc-face"
            style={{
              left: `${f.x * 100}%`,
              top: `${f.y * 100}%`,
              width: `${f.w * 100}%`,
              height: `${f.h * 100}%`,
            }}
          />
        ))}

        {/* tap-to-focus reticle */}
        {reticle && (
          <div
            className="fsc-reticle"
            style={{ left: reticle.x, top: reticle.y }}
          />
        )}

        {/* AE/AF lock badge */}
        {aeafLocked && <div className="fsc-lockbadge">AE/AF LOCK</div>}

        {/* screen flash (front camera) */}
        {screenFlash && <div className="fsc-screenflash" />}

        {!ready && !error && <div className="fsc-status">Iniciando cámara…</div>}
        {error && (
          <div className="fsc-status">
            {error === 'permiso'
              ? 'Permití el acceso a la cámara para continuar.'
              : error === 'sin-camara'
              ? 'No se encontró ninguna cámara.'
              : 'No se pudo iniciar la cámara.'}
            <button className="fsc-retry" onClick={(e) => { e.stopPropagation(); start(); }}>
              Reintentar
            </button>
          </div>
        )}
      </div>

      {/* ============ TOP BAR ============ */}
      <div className="fsc-top">
        <button className="fsc-icon" onClick={onClose} aria-label="Cerrar">✕</button>
        <div className="fsc-location">
          <span className="fsc-pin">⌖</span> {locationLabel}
        </div>
        <button className="fsc-icon fsc-aspectbtn" onClick={cycleAspect} aria-label="Formato">
          {aspect}
        </button>
      </div>

      {/* ============ RIGHT TOOLBAR ============ */}
      <div className="fsc-toolbar">
        <button
          className={`fsc-tool ${flashMode === 'on' ? 'is-on' : ''}`}
          onClick={() => setFlashMode(flashMode === 'on' ? 'off' : 'on')}
          aria-label="Flash"
        >
          ⚡
        </button>

        {/* AE/AF toggle — below flash. Yellow on, gray off. */}
        <button
          className={`fsc-tool fsc-aeaf ${aeafLocked ? 'is-locked' : ''}`}
          onClick={toggleAeAfLock}
          aria-label="Bloqueo AE/AF"
        >
          AE
          <small>AF</small>
        </button>

        <button className="fsc-tool" onClick={flip} aria-label="Girar cámara">⟳</button>

        {SCENE_PRESETS[sceneMode].focus.macroAvailable && (
          <button
            className={`fsc-tool fsc-macro ${macroOn ? 'is-on' : ''}`}
            onClick={() => setMacro(!macroOn)}
            aria-label="Macro"
          >
            ❀
          </button>
        )}
      </div>

      {/* macro distance slider 5–30 cm */}
      {macroOn && (
        <div className="fsc-macropanel">
          <span>{Math.round(macroDistance * 100)} cm</span>
          <input
            type="range"
            min={MACRO_RANGE_M.min * 100}
            max={MACRO_RANGE_M.max * 100}
            step="1"
            value={Math.round(macroDistance * 100)}
            onChange={(e) => setMacroFocusDistance(Number(e.target.value) / 100)}
          />
        </div>
      )}

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
            const active = Math.abs(zoom - s) < 0.15;
            return (
              <button
                key={s}
                className={`fsc-zoomstop ${active ? 'is-active' : ''}`}
                disabled={disabled}
                onClick={() => setZoomLevel(s)}
              >
                {active ? `${zoom.toFixed(zoom < 3 ? 1 : 0)}×` : s === 0.5 ? '.5' : `${s}`}
              </button>
            );
          })}
        </div>

        {/* scene pills */}
        <div className="fsc-scenes">
          {SCENE_ORDER.map((id) => (
            <button
              key={id}
              className={`fsc-scenepill ${sceneMode === id ? 'is-active' : ''}`}
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
   STYLES — fsc- prefix to avoid collisions. Brand tokens up top.
   ====================================================================== */
const styles = `
.fsc-root {
  --fsc-bg: #08080A;
  --fsc-text: #FFFFFF;
  --fsc-dim: rgba(255,255,255,0.62);
  --fsc-chip: rgba(20,20,24,0.55);
  --fsc-stroke: rgba(255,255,255,0.16);
  --fsc-accent: #FF6B3D;          /* FoodSpot warm accent */
  --fsc-lock: #FFD60A;            /* AE/AF lock yellow */
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

/* ---------- viewfinder: aspect-driven, object-fit cover -------------- */
.fsc-frame {
  position: relative;
  overflow: hidden;
  background: #000;
  width: 100vw; height: 100dvh;       /* 9:16 default fills screen */
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
  object-fit: cover;                   /* fills the frame, no letterbox */
  transform-origin: center;
}

/* ---------- overlays -------------------------------------------------- */
.fsc-face {
  position: absolute;
  border: 1.5px solid var(--fsc-lock);
  border-radius: 10px;
  pointer-events: none;
}
.fsc-reticle {
  position: absolute;
  width: 76px; height: 76px;
  margin: -38px 0 0 -38px;
  border: 1.5px solid var(--fsc-lock);
  border-radius: 14px;
  pointer-events: none;
  animation: fsc-reticle-in 0.22s ease-out;
}
.fsc-reticle::before, .fsc-reticle::after {
  content:''; position:absolute; background: var(--fsc-lock);
}
.fsc-reticle::before { width: 10px; height: 1.5px; left: -14px; top: 50%; }
.fsc-reticle::after  { width: 1.5px; height: 10px; top: -14px; left: 50%; }
@keyframes fsc-reticle-in { from { transform: scale(1.35); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.fsc-lockbadge {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
  background: var(--fsc-lock); color: #1A1A1A;
  font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
  padding: 4px 10px; border-radius: 6px;
  pointer-events: none;
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
  color: var(--fsc-dim); font-size: 14px; text-align: center; padding: 0 32px;
}
.fsc-retry {
  background: var(--fsc-accent); color: #fff; border: 0;
  padding: 10px 22px; border-radius: var(--fsc-radius);
  font-size: 14px; font-weight: 600;
}

/* ---------- top bar ---------------------------------------------------- */
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
  background: var(--fsc-chip);
  border: 1px solid var(--fsc-stroke);
  backdrop-filter: blur(12px);
  border-radius: var(--fsc-radius);
  padding: 8px 16px;
  font-size: 12.5px; font-weight: 600;
  max-width: 52vw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.fsc-pin { color: var(--fsc-accent); font-size: 14px; }

/* ---------- right toolbar ---------------------------------------------- */
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
.fsc-tool.is-on { color: var(--fsc-accent); border-color: var(--fsc-accent); }

/* AE/AF — gray off, yellow on */
.fsc-aeaf { flex-direction: column; font-size: 11px; font-weight: 800; line-height: 1; gap: 1px; color: rgba(255,255,255,0.45); }
.fsc-aeaf small { font-size: 8px; font-weight: 700; letter-spacing: 0.06em; }
.fsc-aeaf.is-locked {
  color: #1A1A1A;
  background: var(--fsc-lock);
  border-color: var(--fsc-lock);
}
.fsc-macro.is-on { color: var(--fsc-accent); border-color: var(--fsc-accent); }

/* macro slider panel */
.fsc-macropanel {
  position: absolute; right: 70px;
  top: calc(env(safe-area-inset-top, 0px) + 150px);
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  background: var(--fsc-chip); border: 1px solid var(--fsc-stroke);
  backdrop-filter: blur(12px);
  border-radius: 14px; padding: 12px 10px;
  z-index: 10;
}
.fsc-macropanel span { font-size: 11px; font-weight: 700; color: var(--fsc-accent); }
.fsc-macropanel input {
  writing-mode: vertical-lr; direction: rtl;
  width: 24px; height: 110px; accent-color: var(--fsc-accent);
}

/* ---------- bottom stack ------------------------------------------------ */
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

/* ---------- landscape adaptation ---------------------------------------- */
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
  .fsc-macropanel { right: auto; left: 70px; top: 50%; transform: translateY(-50%); }
  .fsc-top { padding-left: calc(env(safe-area-inset-left, 0px) + 16px); }
}

@media (prefers-reduced-motion: reduce) {
  .fsc-reticle, .fsc-screenflash { animation: none; }
}
`;
