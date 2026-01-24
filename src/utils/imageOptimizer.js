import { supabase } from '../lib/supabaseClient'

export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Uploads a file directly to Supabase Storage and returns the Public URL.
 * Bypasses local Base64 conversion to ensure true cloud persistence.
 */
export async function processAndStoreImage(file) {
    try {
        if (!file) throw new Error('No file provided');

        // 1. Sanitize Filename (Critical for URL safety)
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        // 2. Upload directly to Supabase Bucket 'menu-images'
        const { data, error: uploadError } = await supabase.storage
            .from('menu-images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // 3. Get the Public URL (The Anchor)
        const { data: { publicUrl } } = supabase.storage
            .from('menu-images')
            .getPublicUrl(filePath);

        if (!publicUrl) throw new Error('Failed to retrieve public URL');

        return {
            publicUrl: publicUrl, // <--- THIS is what the DB needs
            originalSize: file.size,
            optimizedSize: file.size // Approximate
        };

    } catch (error) {
        console.error('Upload failed:', error);
        throw new Error('Error al subir la imagen al servidor: ' + error.message);
    }
}
