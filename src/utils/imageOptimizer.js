// Image Optimization Utilities
// Handles resize, compress, WebP conversion, metadata stripping

const MAX_WIDTH = 1200
const TARGET_WIDTH = 950
const MAX_FILE_SIZE = 400 * 1024 // 400KB hard limit
const TARGET_FILE_SIZE = 220 * 1024 // ~220KB target
const MIN_FILE_SIZE = 180 * 1024 // ~180KB minimum target

/**
 * Optimize an image file for web delivery
 * @param {File} file - The input image file (JPG/PNG)
 * @returns {Promise<{blob: Blob, originalSize: number, optimizedSize: number, width: number, height: number}>}
 */
export async function optimizeImage(file) {
    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        throw new Error('Solo se aceptan imágenes JPG o PNG')
    }

    const originalSize = file.size

    // Load image
    const img = await loadImage(file)

    // Calculate new dimensions (maintain aspect ratio)
    let width = img.width
    let height = img.height

    if (width > MAX_WIDTH) {
        const ratio = TARGET_WIDTH / width
        width = TARGET_WIDTH
        height = Math.round(height * ratio)
    }

    // Draw to canvas (strips metadata automatically)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, width, height)

    // Try WebP first, fallback to JPEG
    let blob = await compressToTarget(canvas, 'image/webp')

    // If WebP not supported or too large, try JPEG
    if (!blob || blob.size > MAX_FILE_SIZE) {
        blob = await compressToTarget(canvas, 'image/jpeg')
    }

    // Final size check
    if (blob.size > MAX_FILE_SIZE) {
        throw new Error(`La imagen es demasiado grande. Máximo: ${Math.round(MAX_FILE_SIZE / 1024)}KB`)
    }

    return {
        blob,
        originalSize,
        optimizedSize: blob.size,
        width,
        height,
        format: blob.type === 'image/webp' ? 'webp' : 'jpeg'
    }
}

/**
 * Compress canvas to target file size
 */
async function compressToTarget(canvas, mimeType) {
    let quality = 0.85
    let blob = await canvasToBlob(canvas, mimeType, quality)

    // Reduce quality until we hit target size
    while (blob.size > TARGET_FILE_SIZE && quality > 0.5) {
        quality -= 0.05
        blob = await canvasToBlob(canvas, mimeType, quality)
    }

    return blob
}

/**
 * Convert canvas to blob
 */
function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), mimeType, quality)
    })
}

/**
 * Load image from file
 */
function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Error al cargar la imagen'))
        img.src = URL.createObjectURL(file)
    })
}

/**
 * Convert blob to base64 data URI for storage
 */
export async function blobToDataURI(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(blob)
    })
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Process and store an optimized image
 * Returns a data URI ready for storage
 */
export async function processAndStoreImage(file) {
    const result = await optimizeImage(file)
    const dataURI = await blobToDataURI(result.blob)

    return {
        dataURI,
        originalSize: result.originalSize,
        optimizedSize: result.optimizedSize,
        width: result.width,
        height: result.height,
        format: result.format
    }
}
