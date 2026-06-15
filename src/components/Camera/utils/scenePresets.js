/**
 * FoodSpot Camera — Scene Presets (CamTech v1.8 port)
 * ----------------------------------------------------
 * Each preset describes desired hardware constraints + a CSS-filter
 * fallback that is applied to BOTH the live preview and the captured
 * frame, so devices without manual WB/exposure still get the look.
 *
 * Hardware constraints are applied opportunistically: every key is
 * checked against MediaTrackCapabilities before being sent, and each
 * is applied in its own `advanced` entry so one unsupported key never
 * rejects the rest.
 */

export const MACRO_RANGE_M = { min: 0.05, max: 0.30 }; // 5–30 cm

export const SCENE_PRESETS = {
  FOOD: {
    id: 'FOOD',
    label: 'FOOD',
    // Warm 3200K white balance, +1.2 EV, macro 5–30cm available
    whiteBalance: { mode: 'manual', colorTemperature: 3200 },
    exposureCompensation: 1.2,
    focus: { mode: 'continuous', macroAvailable: true },
    faceDetect: false,
    // Fallback look: warm, appetizing, slightly lifted
    cssFilter: 'saturate(1.18) sepia(0.14) brightness(1.05) contrast(1.03)',
  },

  PORTRAIT: {
    id: 'PORTRAIT',
    label: 'PORTRAIT',
    // Gently warm, face detection on
    whiteBalance: { mode: 'manual', colorTemperature: 4500 },
    exposureCompensation: 0.3,
    focus: { mode: 'continuous', macroAvailable: false },
    faceDetect: true,
    cssFilter: 'saturate(1.08) sepia(0.06) brightness(1.02)',
  },
};

export const SCENE_ORDER = ['FOOD', 'PORTRAIT'];
export const DEFAULT_SCENE = 'FOOD';

/**
 * Capture-time filters (FoodSpot filter strip).
 * Composed ON TOP of the scene's cssFilter.
 */
export const CAPTURE_FILTERS = [
  { id: 'original', label: 'Original', css: 'none' },
  { id: 'sabroso',  label: 'Sabroso',  css: 'saturate(1.3) contrast(1.08)' },
  { id: 'dorado',   label: 'Dorado',   css: 'sepia(0.28) saturate(1.2) brightness(1.06)' },
  { id: 'fresco',   label: 'Fresco',   css: 'saturate(1.12) hue-rotate(-6deg) brightness(1.04)' },
];

/** Combine scene + user filter into one CSS filter string. */
export function composeFilter(sceneId, filterId) {
  const scene = SCENE_PRESETS[sceneId] || SCENE_PRESETS[DEFAULT_SCENE];
  const user = CAPTURE_FILTERS.find((f) => f.id === filterId);
  const parts = [];
  if (scene.cssFilter && scene.cssFilter !== 'none') parts.push(scene.cssFilter);
  if (user && user.css !== 'none') parts.push(user.css);
  return parts.length ? parts.join(' ') : 'none';
}
