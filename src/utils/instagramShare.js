// Instagram Share Utilities
// Canvas-to-blob export and Instagram Stories deep link

// Render canvas to blob
export async function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.92) {
    return new Promise((resolve, reject) => {
        try {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create blob'));
                    }
                },
                type,
                quality
            );
        } catch (e) {
            reject(e);
        }
    });
}

// Create downloadable URL from blob
export function createBlobUrl(blob) {
    return URL.createObjectURL(blob);
}

// Revoke blob URL to free memory
export function revokeBlobUrl(url) {
    URL.revokeObjectURL(url);
}

// Share to Instagram Stories
export async function shareToInstagramStories(blob, isVideo = false) {
    // First try native Web Share API if available
    if (navigator.share && navigator.canShare) {
        try {
            const file = new File(
                [blob],
                isVideo ? 'story.mp4' : 'story.jpg',
                { type: isVideo ? 'video/mp4' : 'image/jpeg' }
            );

            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Coffee Club Story'
                });
                return { success: true, method: 'webshare' };
            }
        } catch (e) {
            // Fall through to deep link method
        }
    }

    // Try Instagram deep link
    try {
        const instagramUrl = 'instagram-stories://share?source_application=coffeeclub';

        // Create a temporary link and attempt to open
        const startTime = Date.now();
        window.location.href = instagramUrl;

        // Check if we're still on the page after a short delay
        return new Promise((resolve) => {
            setTimeout(() => {
                if (Date.now() - startTime < 2000) {
                    // Instagram app likely not installed, provide download fallback
                    resolve({ success: false, method: 'fallback', blob });
                } else {
                    resolve({ success: true, method: 'deeplink' });
                }
            }, 1500);
        });
    } catch (e) {
        return { success: false, method: 'error', error: e };
    }
}

// Save image locally as fallback
export function downloadImage(blob, filename = 'coffee-club-photo.jpg') {
    const url = createBlobUrl(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => revokeBlobUrl(url), 100);
    return true;
}

// Composite multiple layers onto a single canvas
export function compositeCanvas(baseCanvas, layers = []) {
    const canvas = document.createElement('canvas');
    canvas.width = baseCanvas.width;
    canvas.height = baseCanvas.height;
    const ctx = canvas.getContext('2d');

    // Draw base image
    ctx.drawImage(baseCanvas, 0, 0);

    // Draw each layer in order
    layers.forEach(layer => {
        if (layer.type === 'image' && layer.element) {
            ctx.save();
            if (layer.transform) {
                ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
                ctx.rotate((layer.rotation || 0) * Math.PI / 180);
                ctx.scale(layer.scale || 1, layer.scale || 1);
                ctx.translate(-(layer.x + layer.width / 2), -(layer.y + layer.height / 2));
            }
            ctx.drawImage(layer.element, layer.x, layer.y, layer.width, layer.height);
            ctx.restore();
        } else if (layer.type === 'text') {
            ctx.save();
            ctx.font = `${layer.fontSize}px ${layer.fontFamily}`;
            ctx.fillStyle = layer.color;
            ctx.textAlign = layer.align || 'left';
            if (layer.shadow) {
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }
            ctx.fillText(layer.text, layer.x, layer.y);
            ctx.restore();
        } else if (layer.type === 'canvas' && layer.element) {
            ctx.drawImage(layer.element, 0, 0);
        }
    });

    return canvas;
}

// Apply filter to canvas
export function applyFilterToCanvas(canvas, filter) {
    const ctx = canvas.getContext('2d');
    ctx.filter = filter;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.filter = filter;
    tempCtx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
    return canvas;
}
