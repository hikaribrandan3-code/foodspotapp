/**
 * FoodSpot Camera — Scene + Filter grades (CamTech v1.8)
 * ----------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for the look of every scene mode + filter.
 *
 * Each "grade" is a tiny set of numbers { brightness, contrast, saturate,
 * sepia }. From those same numbers we derive BOTH:
 *   - gradeToCss()   → a CSS filter string for the LIVE PREVIEW
 *   - applyGrade()    → the SAME math in raw pixels for the CAPTURE BAKE
 *
 * Why: Safari silently breaks canvas `ctx.filter`, so we can't bake the
 * preview's CSS filter onto the photo. Instead we bake with pixels — but
 * driven by the identical numbers, so what you see in the viewfinder is
 * exactly what lands in the editor. No per-filter eyeball tuning.
 *
 * Order is fixed (brightness → contrast → saturate → sepia) in both paths
 * so the two stay 1:1.
 */

// ── Hardware niche physics live in the hook (NICHE_PHYSICS). These grades
//    are the VISUAL layer applied on top, per scene mode. ──────────────────
export const SCENE_GRADE = {
  FOOD:     { brightness: 1.05, contrast: 1.03, saturate: 1.18, sepia: 0.14 }, // warm, appetizing
  PORTRAIT: { brightness: 1.02, contrast: 1.00, saturate: 1.08, sepia: 0.06 }, // gentle skin warmth
};

export const SCENE_ORDER = ['FOOD', 'PORTRAIT'];
export const SCENE_LABEL = { FOOD: 'FOOD', PORTRAIT: 'PORTRAIT' };
export const DEFAULT_SCENE = 'FOOD';

// ── Filter strip (tap-to-cycle). 'original' = no-op. ─────────────────────
export const CAPTURE_FILTERS = [
  { id: 'original', label: 'Original', grade: {} },
  { id: 'sabroso',  label: 'Sabroso',  grade: { saturate: 1.30, contrast: 1.08 } },
  { id: 'dorado',   label: 'Dorado',   grade: { brightness: 1.06, saturate: 1.20, sepia: 0.28 } },
  { id: 'fresco',   label: 'Fresco',   grade: { brightness: 1.04, saturate: 1.12 } },
];

const FILTER_BY_ID = Object.fromEntries(CAPTURE_FILTERS.map((f) => [f.id, f]));

// ── CSS string from a grade (for the live preview) ───────────────────────
function gradeToCss(g) {
  if (!g) return '';
  const parts = [];
  if (g.brightness && g.brightness !== 1) parts.push(`brightness(${g.brightness})`);
  if (g.contrast && g.contrast !== 1) parts.push(`contrast(${g.contrast})`);
  if (g.saturate && g.saturate !== 1) parts.push(`saturate(${g.saturate})`);
  if (g.sepia) parts.push(`sepia(${g.sepia})`);
  return parts.join(' ');
}

/** Live-preview CSS filter for the <video>, combining scene grade + user filter. */
export function previewCss(sceneId, filterId) {
  const scene = SCENE_GRADE[sceneId] || SCENE_GRADE[DEFAULT_SCENE];
  const filter = (FILTER_BY_ID[filterId] || FILTER_BY_ID.original).grade;
  const css = [gradeToCss(scene), gradeToCss(filter)].filter(Boolean).join(' ');
  return css || 'none';
}

// ── Pixel bake of a single grade (same op order as gradeToCss) ───────────
function applyGrade(data, g) {
  if (!g) return;
  const b = g.brightness ?? 1;
  const c = g.contrast ?? 1;
  const s = g.saturate ?? 1;
  const sep = g.sepia ?? 0;
  if (b === 1 && c === 1 && s === 1 && sep === 0) return;

  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let gr = data[i + 1];
    let bl = data[i + 2];

    // brightness (linear multiply — matches CSS)
    if (b !== 1) { r *= b; gr *= b; bl *= b; }
    // contrast ( (v-128)*c+128 — matches CSS contrast() )
    if (c !== 1) { r = (r - 128) * c + 128; gr = (gr - 128) * c + 128; bl = (bl - 128) * c + 128; }
    // saturate (blend toward Rec.709 luma — matches CSS saturate() )
    if (s !== 1) {
      const luma = r * 0.2126 + gr * 0.7152 + bl * 0.0722;
      r = luma + (r - luma) * s;
      gr = luma + (gr - luma) * s;
      bl = luma + (bl - luma) * s;
    }
    // sepia (CSS sepia matrix, interpolated by amount)
    if (sep > 0) {
      const sr = r * 0.393 + gr * 0.769 + bl * 0.189;
      const sg = r * 0.349 + gr * 0.686 + bl * 0.168;
      const sb = r * 0.272 + gr * 0.534 + bl * 0.131;
      r = r + (sr - r) * sep;
      gr = gr + (sg - gr) * sep;
      bl = bl + (sb - bl) * sep;
    }

    data[i] = clamp(r);
    data[i + 1] = clamp(gr);
    data[i + 2] = clamp(bl);
  }
}

/**
 * Bake the scene grade + user filter into a canvas's pixels (Safari-safe).
 * Mutates the canvas in place. Skips entirely when there's nothing to apply.
 */
export function bakeCapture(ctx, width, height, sceneId, filterId) {
  const scene = SCENE_GRADE[sceneId] || SCENE_GRADE[DEFAULT_SCENE];
  const filter = (FILTER_BY_ID[filterId] || FILTER_BY_ID.original).grade;

  const sceneNoop = !scene || (scene.brightness === 1 && scene.contrast === 1 && scene.saturate === 1 && !scene.sepia);
  const filterNoop = !filter || Object.keys(filter).length === 0;
  if (sceneNoop && filterNoop) return; // nothing to bake — keep it pristine

  const imageData = ctx.getImageData(0, 0, width, height);
  applyGrade(imageData.data, scene);   // scene first
  applyGrade(imageData.data, filter);  // then user filter
  ctx.putImageData(imageData, 0, 0);
}
