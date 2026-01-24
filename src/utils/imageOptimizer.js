import { supabase } from '../lib/supabaseClient'

export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Compresses an image file using Canvas.
 * Returns a Blob (WebP, Quality 0.8, Max Width 1200px).
 */
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Resize logic
            const MAX_WIDTH = 1200;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
                height = (height * MAX_WIDTH) / width;
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Export as WebP
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas compression failed'));
                }
            }, 'image/webp', 0.8); // 80% Quality
        };
        img.onerror = (err) => reject(err);
    });
}

/**
 * 1. Compresses the file locally.
 * 2. Uploads the small WebP blob to Supabase.
 * 3. Returns the Public URL.
 */
export async function processAndStoreImage(file) {
    try {
        if (!file) throw new Error('No file provided');

        // 1. COMPRESSION STAGE (Speed Boost)
        // Skip compression for GIFs or SVGs to preserve animation/vectors
        const needsCompression = file.type.startsWith('image/') && !file.type.includes('gif') && !file.type.includes('svg');

        let blobToUpload = file;
        let fileExt = file.name.split('.').pop();

        if (needsCompression) {
            console.log(`⚡ Compressing ${file.name} (${formatFileSize(file.size)})...`);
            try {
                const compressedBlob = await compressImage(file);
                console.log(`✅ Compressed to ${formatFileSize(compressedBlob.size)} (WebP)`);
                blobToUpload = compressedBlob;
                fileExt = 'webp'; // Force extension
            } catch (err) {
                console.warn('Compression failed, falling back to raw file:', err);
                blobToUpload = file; // Fallback
            }
        }

        // 2. UPLOAD STAGE
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error: uploadError } = await supabase.storage
            .from('menu-images')
            .upload(filePath, blobToUpload, {
                cacheControl: '31536000', // 1 Year Cache (Aggressive)
                upsert: false,
                contentType: blobToUpload.type // explicit content type
            });

        if (uploadError) throw uploadError;

        // 3. ANCHOR STAGE
        const { data: { publicUrl } } = supabase.storage
            .from('menu-images')
            .getPublicUrl(filePath);

        if (!publicUrl) throw new Error('Failed to retrieve public URL');

        return {
            publicUrl: publicUrl,
            originalSize: file.size,
            optimizedSize: blobToUpload.size
        };

    } catch (error) {
        console.error('Upload failed:', error);
        throw new Error('Error al subir: ' + error.message);
    }
}
