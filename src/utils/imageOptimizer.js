import { supabase } from '../lib/supabaseClient'

export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * SPEED TUNNEL: Direct Upload.
 * No client-side compression. We rely on the network speed.
 */
export async function processAndStoreImage(file) {
    try {
        if (!file) throw new Error('No file provided');

        // 1. Sanitize Filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        // 2. Direct Upload (No Processing)
        // Cache set to 1 year for performance
        const { data, error: uploadError } = await supabase.storage
            .from('menu-images')
            .upload(filePath, file, {
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
            optimizedSize: file.size // No compression difference
        };

    } catch (error) {
        console.error('Upload failed:', error);
        throw new Error('Error al subir: ' + error.message);
    }
}
