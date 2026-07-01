import { supabase } from '../lib/supabaseClient'

export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Supabase Storage transforms require a paid Pro-tier add-on, so we can't resize
// on the way out — every image must already be web-sized before it's uploaded.
const MAX_DIMENSION = 1600;
const SKIP_COMPRESSION_TYPES = ['image/gif', 'image/svg+xml'];
const SKIP_COMPRESSION_UNDER_BYTES = 300 * 1024;

async function compressImage(file) {
    if (SKIP_COMPRESSION_TYPES.includes(file.type)) return file;
    if (file.size < SKIP_COMPRESSION_UNDER_BYTES) return file;

    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8));
        if (!blob || blob.size >= file.size) return file; // fallback if webp unsupported or didn't help

        return new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' });
    } catch (err) {
        console.warn('Compression skipped, uploading original:', err?.message);
        return file;
    }
}

/**
 * Resizes/re-encodes oversized images client-side (so files are web-sized at rest),
 * then uploads with a 1-year cache header so Supabase's CDN serves them fast for everyone.
 */
export async function processAndStoreImage(file) {
    try {
        if (!file) throw new Error('No file provided');

        const compressed = await compressImage(file);

        // 1. Sanitize Filename
        const fileExt = compressed.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        // 2. Upload compressed file, cache set to 1 year for CDN performance
        const { data, error: uploadError } = await supabase.storage
            .from('menu-images')
            .upload(filePath, compressed, {
                cacheControl: '31536000',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // 3. Get Anchor
        const { data: { publicUrl } } = supabase.storage
            .from('menu-images')
            .getPublicUrl(filePath);

        return {
            publicUrl: publicUrl,
            originalSize: file.size,
            optimizedSize: compressed.size
        };

    } catch (error) {
        console.error('Upload failed:', error);
        throw new Error('Error al subir: ' + error.message);
    }
}
