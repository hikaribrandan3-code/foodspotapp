// Supabase image transform: swap /object/public/ → /render/image/public/ + query params
// Reference: https://supabase.com/docs/guides/storage/serving/image-transformations
const SUPABASE_OBJECT = '/storage/v1/object/public/';
const SUPABASE_RENDER = '/storage/v1/render/image/public/';

/**
 * Returns an optimized image URL with CDN transforms applied.
 * Supabase storage images are resized server-side via the render endpoint.
 * Unsplash images use their own CDN params. Generic URLs get query params appended.
 *
 * @param {string|null} url - Raw image URL
 * @param {{ width?: number, quality?: number, resize?: 'contain'|'cover'|'fill' }} options
 * @returns {string|null}
 */
export function getOptimizedImageUrl(url, options = {}) {
    if (!url || url.startsWith('blob:')) return url;

    const { width = 400, quality = 75, resize = 'contain' } = options;

    // GIF: skip transforms — Supabase strips animation frames
    if (url.match(/\.gif(\?|$)/i)) return url;

    // Supabase storage: swap object path for render/image path
    if (url.includes(SUPABASE_OBJECT)) {
        const [base] = url.replace(SUPABASE_OBJECT, SUPABASE_RENDER).split('?');
        return `${base}?width=${width}&quality=${quality}&resize=${resize}`;
    }

    // Unsplash: use their own CDN resize params
    if (url.includes('unsplash.com')) {
        return url.includes('?') ? url : `${url}?w=${width}&q=${quality}&fit=crop`;
    }

    // Already has transform params — leave untouched
    if (url.includes('width=') || url.includes('quality=')) return url;

    // Generic CDN: append params
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}width=${width}&quality=${quality}`;
}
