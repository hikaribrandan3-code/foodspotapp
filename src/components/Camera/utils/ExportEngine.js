/**
 * ExportEngine.js - CamTech v1.7
 * Full layer compositing for final image export
 * Order: photo → strokes → stickers → emojis → text
 */

// Brush sizes (must match DrawTool.jsx)
const BRUSH_SIZES = {
    small: 4,
    medium: 8
}

// Font definitions (must match TextEditor.jsx)
const FONTS = {
    classic: '-apple-system, BlinkMacSystemFont, sans-serif',
    bold: '-apple-system, BlinkMacSystemFont, sans-serif',
    serif: 'Georgia, Times New Roman, serif',
    mono: 'SF Mono, Menlo, monospace',
    condensed: 'Arial Narrow, sans-serif',
    script: 'Snell Roundhand, cursive'
}

/**
 * Draw all strokes onto canvas
 */
function drawStrokes(ctx, strokes, scale = 1) {
    strokes.forEach(stroke => {
        if (stroke.points.length < 2) return

        ctx.beginPath()
        ctx.strokeStyle = stroke.color
        ctx.lineWidth = (BRUSH_SIZES[stroke.size] || BRUSH_SIZES.small) * scale
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.moveTo(stroke.points[0].x * scale, stroke.points[0].y * scale)
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x * scale, stroke.points[i].y * scale)
        }
        ctx.stroke()
    })
}

/**
 * Draw a sticker element onto canvas
 */
function drawSticker(ctx, element, scale = 1) {
    const x = element.x * scale
    const y = element.y * scale
    const size = 80 * element.scale * scale

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((element.rotation * Math.PI) / 180)

    // Draw placeholder square with label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.fillRect(-size / 2, -size / 2, size, size)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2 * scale
    ctx.strokeRect(-size / 2, -size / 2, size, size)

    // Draw sticker label
    ctx.fillStyle = '#fff'
    ctx.font = `${12 * scale}px -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(element.data?.stickerId || 'sticker', 0, 0)

    ctx.restore()
}

/**
 * Draw an emoji element onto canvas
 */
function drawEmoji(ctx, element, scale = 1) {
    const x = element.x * scale
    const y = element.y * scale
    const fontSize = 48 * element.scale * scale

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((element.rotation * Math.PI) / 180)

    ctx.font = `${fontSize}px -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(element.data?.emojiChar || '😊', 0, 0)

    ctx.restore()
}

/**
 * Draw a text element onto canvas with full styling
 */
function drawText(ctx, element, scale = 1) {
    const x = element.x * scale
    const y = element.y * scale
    const style = element.data?.style || {}
    const text = element.data?.text || ''

    const fontFamily = FONTS[style.fontId] || FONTS.classic
    const fontWeight = style.fontId === 'bold' ? '700' : '400'
    const fontSize = 24 * element.scale * scale
    const color = style.color || '#fff'

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((element.rotation * Math.PI) / 180)

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    ctx.textAlign = style.textAlign || 'center'
    ctx.textBaseline = 'middle'

    // Measure text for background/highlight
    const metrics = ctx.measureText(text)
    const textWidth = metrics.width
    const textHeight = fontSize * 1.2

    // Apply style mode
    if (style.styleMode === 'stroke') {
        ctx.strokeStyle = color
        ctx.lineWidth = 2 * scale
        ctx.strokeText(text, 0, 0)
    } else if (style.styleMode === 'background') {
        // Draw pill background
        const padding = 8 * scale
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(
            -textWidth / 2 - padding,
            -textHeight / 2,
            textWidth + padding * 2,
            textHeight,
            4 * scale
        )
        ctx.fill()

        // Text in contrasting color
        ctx.fillStyle = (color === '#FFFFFF' || color === '#FFCC00') ? '#000' : '#FFF'
        ctx.fillText(text, 0, 0)
    } else if (style.styleMode === 'highlight') {
        // Draw block background
        const padding = 12 * scale
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(
            -textWidth / 2 - padding,
            -textHeight / 2 - padding / 2,
            textWidth + padding * 2,
            textHeight + padding,
            8 * scale
        )
        ctx.fill()

        // Text in contrasting color
        ctx.fillStyle = (color === '#FFFFFF' || color === '#FFCC00') ? '#000' : '#FFF'
        ctx.fillText(text, 0, 0)
    } else {
        // Normal text with shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowBlur = 3 * scale
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 1 * scale
        ctx.fillStyle = color
        ctx.fillText(text, 0, 0)
    }

    ctx.restore()
}

/**
 * Main export function - composites all layers into final image
 * Order: frozen frame → strokes → stickers → emojis → text
 * @param {Object} params
 * @param {HTMLCanvasElement} params.baseCanvas - Frozen frame canvas
 * @param {Array} params.strokes - Array of stroke objects
 * @param {Array} params.elements - Array of placed elements
 * @param {number} params.displayWidth - Display width of canvas
 * @param {number} params.displayHeight - Display height of canvas
 * @returns {Promise<{dataURL: string, blob: Blob}>}
 */
export async function exportImage({ baseCanvas, strokes, elements, displayWidth, displayHeight }) {
    // Get actual canvas dimensions (includes DPR)
    const width = baseCanvas.width
    const height = baseCanvas.height
    const dpr = width / displayWidth || 1

    // Create export canvas at full resolution
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = width
    exportCanvas.height = height
    const ctx = exportCanvas.getContext('2d')

    // Scale for high DPI
    const scale = dpr

    // Layer 1: Draw frozen frame
    ctx.drawImage(baseCanvas, 0, 0)

    // Layer 2: Draw strokes
    if (strokes.length > 0) {
        drawStrokes(ctx, strokes, scale)
    }

    // Layer 3 & 4: Draw elements in order (stickers, emojis, then text)
    // Sort by type to ensure correct z-order
    const sortedElements = [...elements].sort((a, b) => {
        const order = { sticker: 0, emoji: 1, text: 2 }
        return (order[a.type] || 0) - (order[b.type] || 0)
    })

    sortedElements.forEach(element => {
        if (element.type === 'sticker') {
            drawSticker(ctx, element, scale)
        } else if (element.type === 'emoji') {
            drawEmoji(ctx, element, scale)
        } else if (element.type === 'text') {
            drawText(ctx, element, scale)
        }
    })

    // Generate output
    const dataURL = exportCanvas.toDataURL('image/png', 1.0)

    // Convert to blob
    return new Promise((resolve, reject) => {
        exportCanvas.toBlob((blob) => {
            if (blob) {
                resolve({ dataURL, blob })
            } else {
                reject(new Error('Failed to create image blob'))
            }
        }, 'image/png', 1.0)
    })
}

/**
 * Share the exported image using Web Share API
 * No download fallback - Web Share only
 */
export async function shareImage(blob, dataURL) {
    // Check if Web Share API with files is supported
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'image.png', { type: 'image/png' })] })) {
        try {
            const file = new File([blob], 'hikari-camtech.png', { type: 'image/png' })
            await navigator.share({
                files: [file],
                title: 'Hikari CamTech',
                text: 'Created with Hikari CamTech Engine'
            })
            return { shared: true }
        } catch (error) {
            if (error.name === 'AbortError') {
                // User cancelled share
                return { shared: false, cancelled: true }
            }
            // Share failed for other reason
            return { shared: false, error: true }
        }
    }

    // Web Share not supported - no download fallback
    return { shared: false, notSupported: true }
}

/**
 * Full export and share flow
 */
export async function exportAndShare({ baseCanvas, strokes, elements, displayWidth, displayHeight }) {
    // Export image
    const { dataURL, blob } = await exportImage({
        baseCanvas,
        strokes,
        elements,
        displayWidth,
        displayHeight
    })

    // Share
    const result = await shareImage(blob, dataURL)

    return {
        ...result,
        dataURL
    }
}

