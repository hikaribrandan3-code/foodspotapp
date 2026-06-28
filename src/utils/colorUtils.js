/**
 * Color Derivation Utilities — Zero Dependencies
 * ✓ iOS Safari, Chrome, Firefox, Edge (all versions)
 * ✓ Works with hex colors from react-colorful
 * ✓ HSL-based shade generation
 */

/**
 * Convert hex color to HSL
 * @param {string} hex - Color in #RRGGBB format
 * @returns {{h: number, s: number, l: number}} HSL values (h: 0-360, s: 0-100, l: 0-100)
 */
export function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Convert HSL to hex color
 * @param {{h: number, s: number, l: number}} hsl - HSL values (h: 0-360, s: 0-100, l: 0-100)
 * @returns {string} Hex color in #RRGGBB format
 */
export function hslToHex({ h, s, l }) {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Derive 5 shades from a base hex color
 * Perfect for building consistent color palettes (like loyalty UI)
 * @param {string} baseHex - Base color in #RRGGBB format (e.g., #059669)
 * @returns {{primary: string, dark: string, light: string, lighter: string, veryLight: string}}
 */
export function deriveColorShades(baseHex) {
  const hsl = hexToHsl(baseHex);

  return {
    // Primary: original color
    primary: baseHex.toUpperCase(),

    // Dark: reduce lightness for numbers & text (e.g., #064e3b)
    dark: hslToHex({
      h: hsl.h,
      s: hsl.s,
      l: Math.max(10, hsl.l - 45) // Darker, but not black
    }),

    // Light: increase lightness for gradients (e.g., #34d399)
    light: hslToHex({
      h: hsl.h,
      s: Math.max(20, hsl.s - 20), // Slightly desaturate
      l: Math.min(70, hsl.l + 35)
    }),

    // Lighter: for borders (e.g., #A7F3D0)
    lighter: hslToHex({
      h: hsl.h,
      s: Math.max(10, hsl.s - 30),
      l: Math.min(85, hsl.l + 55)
    }),

    // Very Light: for backgrounds (e.g., #D1FAE5)
    veryLight: hslToHex({
      h: hsl.h,
      s: Math.max(5, hsl.s - 40),
      l: Math.min(92, hsl.l + 65)
    })
  };
}

/**
 * Derive RGBA from hex with opacity
 * Used for shadows: rgba(5,150,105,0.10)
 * @param {string} hex - Hex color
 * @param {number} opacity - Opacity 0-1
 * @returns {string} rgba(r,g,b,a) format
 */
export function hexToRgba(hex, opacity = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

/**
 * Example usage in React:
 *
 * const loyaltyColor = loyaltySettings?.loyalty_ui_color || '#059669';
 * const shades = deriveColorShades(loyaltyColor);
 *
 * // Then use:
 * <div style={{ color: shades.primary, ... }} />
 * <div style={{ background: shades.veryLight, ... }} />
 * <div style={{ boxShadow: `0 2px 20px ${hexToRgba(shades.primary, 0.1)}` }} />
 */
