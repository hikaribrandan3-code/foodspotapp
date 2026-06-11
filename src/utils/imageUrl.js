const SUPABASE_OBJECT = '/storage/v1/object/public/';
const SUPABASE_RENDER = '/storage/v1/render/image/public/';

export function getOptimizedImageUrl(url, options = {}) {
    if (!url || url.startsWith('blob:')) return url;

    // Supabase storage: return as-is — image transforms require Pro tier
    if (url.includes(SUPABASE_OBJECT) || url.includes(SUPABASE_RENDER)) return url;

    // GIF: skip transforms
    if (url.match(/\.gif(\?|$)/i)) return url;

    const { width = 400, quality = 75 } = options;

    // Unsplash: use their own CDN resize params
    if (url.includes('unsplash.com')) {
        return url.includes('?') ? url : `${url}?w=${width}&q=${quality}&fit=crop`;
    }

    // Already has transform params — leave untouched
    if (url.includes('width=') || url.includes('quality=')) return url;

    return url;
}
