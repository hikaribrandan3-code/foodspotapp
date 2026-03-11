/**
 * ExportEngine.js - CamTech v2.1 (STRIKE 5B — Nintendo Pill)
 * Full layer compositing + Nano Banana Filters + Nintendo Pill Branding
 * 
 * Pipeline: photo → NanoBanana filter → strokes → stickers → emojis → text → Nintendo Pill → JPEG blob
 * 
 * Capped at 1080x1920 (Story ratio) to prevent VRAM crashes.
 * All filters are pixel-level (ImageData manipulation) — they "burn" permanently.
 */

// ============================================
// CONSTANTS
// ============================================

const MAX_EXPORT_WIDTH = 1080
const MAX_EXPORT_HEIGHT = 1920

const BRUSH_SIZES = {
    small: 4,
    medium: 8
}

const FONTS = {
    classic: '-apple-system, BlinkMacSystemFont, sans-serif',
    bold: '-apple-system, BlinkMacSystemFont, sans-serif',
    serif: 'Georgia, Times New Roman, serif',
    mono: 'SF Mono, Menlo, monospace',
    condensed: 'Arial Narrow, sans-serif',
    script: 'Snell Roundhand, cursive'
}

// ============================================
// 🍌 NANO BANANA FILTERS (Pixel-Level)
// ============================================

/**
 * Apply "Food Porn" filter — warm, appetizing, vignette
 * Saturation +15%, Contrast +10%, Radial vignette
 */
function applyFoodPornFilter(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    const cx = width / 2
    const cy = height / 2
    const maxDist = Math.sqrt(cx * cx + cy * cy)

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i]
        let g = data[i + 1]
        let b = data[i + 2]

        r = clamp(((r / 255 - 0.5) * 1.10 + 0.5) * 255)
        g = clamp(((g / 255 - 0.5) * 1.10 + 0.5) * 255)
        b = clamp(((b / 255 - 0.5) * 1.10 + 0.5) * 255)

        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        r = clamp(lum + (r - lum) * 1.15)
        g = clamp(lum + (g - lum) * 1.15)
        b = clamp(lum + (b - lum) * 1.15)

        r = clamp(r + 5)
        b = clamp(b - 3)

        const px = (i / 4) % width
        const py = Math.floor((i / 4) / width)
        const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
        const vignette = 1 - (dist / maxDist) * 0.35
        r *= vignette
        g *= vignette
        b *= vignette

        data[i] = clamp(r)
        data[i + 1] = clamp(g)
        data[i + 2] = clamp(b)
    }

    ctx.putImageData(imageData, 0, 0)
}

/**
 * Apply "Neon Glow" filter — cinematic nightlife, film grain
 * Contrast +30%, Hue-rotate +15°, Film grain overlay
 */
function applyNeonGlowFilter(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i]
        let g = data[i + 1]
        let b = data[i + 2]

        r = clamp(((r / 255 - 0.5) * 1.30 + 0.5) * 255)
        g = clamp(((g / 255 - 0.5) * 1.30 + 0.5) * 255)
        b = clamp(((b / 255 - 0.5) * 1.30 + 0.5) * 255)

        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        r = clamp(lum + (r - lum) * 1.40)
        g = clamp(lum + (g - lum) * 1.40)
        b = clamp(lum + (b - lum) * 1.40)

        const cos = Math.cos(15 * Math.PI / 180)
        const sin = Math.sin(15 * Math.PI / 180)
        const rr = clamp(r * (0.213 + cos * 0.787 - sin * 0.213) + g * (0.715 - cos * 0.715 - sin * 0.715) + b * (0.072 - cos * 0.072 + sin * 0.928))
        const gg = clamp(r * (0.213 - cos * 0.213 + sin * 0.143) + g * (0.715 + cos * 0.285 + sin * 0.140) + b * (0.072 - cos * 0.072 - sin * 0.283))
        const bb = clamp(r * (0.213 - cos * 0.213 - sin * 0.787) + g * (0.715 - cos * 0.715 + sin * 0.715) + b * (0.072 + cos * 0.928 + sin * 0.072))

        data[i] = clamp(rr * 0.95 + 8)
        data[i + 1] = clamp(gg * 0.95 + 5)
        data[i + 2] = clamp(bb * 0.95 + 12)
    }

    ctx.putImageData(imageData, 0, 0)

    // Film grain overlay (4% alpha noise)
    const grainData = ctx.createImageData(width, height)
    for (let i = 0; i < grainData.data.length; i += 4) {
        const noise = Math.random() * 255
        grainData.data[i] = noise
        grainData.data[i + 1] = noise
        grainData.data[i + 2] = noise
        grainData.data[i + 3] = 10
    }

    const grainCanvas = document.createElement('canvas')
    grainCanvas.width = width
    grainCanvas.height = height
    grainCanvas.getContext('2d').putImageData(grainData, 0, 0)
    ctx.globalAlpha = 1.0
    ctx.drawImage(grainCanvas, 0, 0)
}

/**
 * Apply Nano Banana filter based on context
 * @param {'food'|'event'|null} context
 */
export function applyNanoBanana(ctx, width, height, context) {
    if (context === 'food') {
        applyFoodPornFilter(ctx, width, height)
    } else if (context === 'event') {
        applyNeonGlowFilter(ctx, width, height)
    }
}

function clamp(val) {
    return Math.max(0, Math.min(255, Math.round(val)))
}

// ============================================
// 🏷️ NINTENDO PILL BRANDING
// ============================================

/**
 * Burn the "Nintendo Pill" venue branding onto the canvas.
 * Centered capsule with red map pin + bold business name.
 * 80px from bottom (above IG interface zone).
 */
function burnBranding(ctx, width, height, branding) {
    if (!branding?.businessName) return

    const { businessName } = branding
    const scale = width / 1080

    // --- Measure text to size the pill ---
    const fontSize = Math.round(16 * scale)
    const pinSize = Math.round(18 * scale)
    const pillPaddingH = Math.round(20 * scale)  // horizontal padding
    const pillPaddingV = Math.round(12 * scale)   // vertical padding
    const pinTextGap = Math.round(8 * scale)      // gap between pin and text
    const pillRadius = Math.round(24 * scale)     // capsule corner radius
    const bottomOffset = Math.round(80 * scale)   // above IG interface zone

    ctx.save()
    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
    const textMetrics = ctx.measureText(businessName)
    const textW = textMetrics.width

    // Total pill dimensions
    const pillW = pillPaddingH + pinSize + pinTextGap + textW + pillPaddingH
    const pillH = pillPaddingV + Math.max(pinSize, fontSize) + pillPaddingV
    const pillX = (width - pillW) / 2
    const pillY = height - bottomOffset - pillH

    // --- Drop shadow ---
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
    ctx.shadowBlur = 12 * scale
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 4 * scale

    // --- Pill background (white, 0.9 alpha) ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, pillRadius)
    ctx.fill()

    // Reset shadow for content
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    // --- Red Map Pin Icon ---
    const pinX = pillX + pillPaddingH
    const pinCenterY = pillY + pillH / 2

    // Pin body (teardrop shape using arc + triangle)
    const pinR = pinSize * 0.35
    ctx.fillStyle = '#EF4444'
    ctx.beginPath()
    ctx.arc(pinX + pinSize / 2, pinCenterY - pinR * 0.3, pinR, Math.PI, 0, false)
    ctx.lineTo(pinX + pinSize / 2, pinCenterY + pinR * 1.4)
    ctx.closePath()
    ctx.fill()

    // Pin dot (white center)
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(pinX + pinSize / 2, pinCenterY - pinR * 0.3, pinR * 0.35, 0, Math.PI * 2)
    ctx.fill()

    // --- Business Name (bold, black) ---
    ctx.fillStyle = '#111827'
    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(businessName, pinX + pinSize + pinTextGap, pinCenterY)

    ctx.restore()
}

// ============================================
// DRAWING FUNCTIONS (preserved from v1.7)
// ============================================

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

function drawSticker(ctx, element, scale = 1) {
    const x = element.x * scale
    const y = element.y * scale
    const size = 80 * element.scale * scale
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((element.rotation * Math.PI) / 180)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.fillRect(-size / 2, -size / 2, size, size)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2 * scale
    ctx.strokeRect(-size / 2, -size / 2, size, size)
    ctx.fillStyle = '#fff'
    ctx.font = `${12 * scale}px -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(element.data?.stickerId || 'sticker', 0, 0)
    ctx.restore()
}

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

    // Instagram-style wrapping limit logic (matches the 280px CSS max-width)
    const maxWidth = 280 * element.scale * scale
    const paragraphs = text.split('\n')
    const lines = []

    // Wrap words within boundary
    paragraphs.forEach(paragraph => {
        const words = paragraph.split(' ')
        let currentLine = words[0] || ''

        for (let i = 1; i < words.length; i++) {
            const word = words[i]
            const testLine = currentLine + ' ' + word
            const metrics = ctx.measureText(testLine)

            if (metrics.width > maxWidth && currentLine.length > 0) {
                lines.push(currentLine)
                currentLine = word
            } else {
                currentLine = testLine
            }
        }
        lines.push(currentLine)
    })

    const lineHeight = fontSize * 1.2
    const totalHeight = lines.length * lineHeight

    // Find the maximum width among all generated lines for the bounding box
    let maxLineWidth = 0
    lines.forEach(line => {
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width)
    })

    // Draw background blocks if needed
    if (style.styleMode === 'background') {
        const padding = 8 * scale
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(-maxLineWidth / 2 - padding, -totalHeight / 2, maxLineWidth + padding * 2, totalHeight, 4 * scale)
        ctx.fill()
    } else if (style.styleMode === 'highlight') {
        const padding = 12 * scale
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(-maxLineWidth / 2 - padding, -totalHeight / 2 - padding / 2, maxLineWidth + padding * 2, totalHeight + padding, 8 * scale)
        ctx.fill()
    }

    // Vertical centering offset
    const startY = -totalHeight / 2 + lineHeight / 2

    // Stroke/draw the text line by line
    lines.forEach((line, index) => {
        const lineY = startY + index * lineHeight

        if (style.styleMode === 'stroke') {
            ctx.strokeStyle = color
            ctx.lineWidth = 2 * scale
            ctx.strokeText(line, 0, lineY)
        } else if (style.styleMode === 'background' || style.styleMode === 'highlight') {
            ctx.fillStyle = (color === '#FFFFFF' || color === '#FFCC00') ? '#000' : '#FFF'
            ctx.fillText(line, 0, lineY)
        } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
            ctx.shadowBlur = 3 * scale
            ctx.shadowOffsetX = 0
            ctx.shadowOffsetY = 1 * scale
            ctx.fillStyle = color
            ctx.fillText(line, 0, lineY)
        }
    })

    ctx.restore()
}

// ============================================
// 📦 MAIN EXPORT PIPELINE (v2.0)
// ============================================

/**
 * Main export function — composites all layers into final image
 * Pipeline: photo → NanoBanana → strokes → stickers → emojis → text → branding → JPEG
 * 
 * @param {Object} params
 * @param {HTMLCanvasElement} params.baseCanvas - Frozen frame canvas
 * @param {Array} params.strokes - Array of stroke objects
 * @param {Array} params.elements - Array of placed elements
 * @param {number} params.displayWidth - Display width of canvas
 * @param {number} params.displayHeight - Display height of canvas
 * @param {string|null} params.neonContext - 'food' | 'event' | null (Nano Banana filter)
 * @param {Object|null} params.branding - { logoUrl, businessName, tenantSlug, context }
 * @returns {Promise<{dataURL: string, blob: Blob}>}
 */
export async function exportImage({
    baseCanvas, strokes, elements, displayWidth, displayHeight,
    neonContext = null, branding = null
}) {
    const width = baseCanvas.width
    const height = baseCanvas.height
    const dpr = width / displayWidth || 1

    // Cap export resolution
    let exportWidth = width
    let exportHeight = height
    if (exportWidth > MAX_EXPORT_WIDTH || exportHeight > MAX_EXPORT_HEIGHT) {
        const ratio = Math.min(MAX_EXPORT_WIDTH / exportWidth, MAX_EXPORT_HEIGHT / exportHeight)
        exportWidth = Math.round(exportWidth * ratio)
        exportHeight = Math.round(exportHeight * ratio)
    }

    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = exportWidth
    exportCanvas.height = exportHeight
    const ctx = exportCanvas.getContext('2d')
    const scale = exportWidth / displayWidth || 1

    // Layer 1: Draw frozen frame (scaled to export res)
    ctx.drawImage(baseCanvas, 0, 0, exportWidth, exportHeight)

    // Layer 1.5: 🍌 NANO BANANA FILTER (pixel-level, burns permanently)
    if (neonContext) {
        applyNanoBanana(ctx, exportWidth, exportHeight, neonContext)
    }

    // Layer 2: Draw strokes
    if (strokes.length > 0) {
        drawStrokes(ctx, strokes, scale)
    }

    // Layer 3 & 4: Draw elements (stickers → emojis → text)
    const sortedElements = [...elements].sort((a, b) => {
        const order = { sticker: 0, emoji: 1, text: 2 }
        return (order[a.type] || 0) - (order[b.type] || 0)
    })

    sortedElements.forEach(element => {
        if (element.type === 'sticker') drawSticker(ctx, element, scale)
        else if (element.type === 'emoji') drawEmoji(ctx, element, scale)
        else if (element.type === 'text') drawText(ctx, element, scale)
    })

    // Layer 5: 🏷️ VENUE BRANDING (logo + QR + CTA, burned permanently)
    if (branding) {
        await burnBranding(ctx, exportWidth, exportHeight, branding)
    }

    // Generate output as JPEG (smaller file, faster share)
    const dataURL = exportCanvas.toDataURL('image/jpeg', 0.92)

    return new Promise((resolve, reject) => {
        exportCanvas.toBlob((blob) => {
            if (blob) {
                resolve({ dataURL, blob })
            } else {
                reject(new Error('Failed to create image blob'))
            }
        }, 'image/jpeg', 0.92)
    })
}

/**
 * Share the exported image using Web Share API
 */
export async function shareImage(blob, dataURL) {
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'image.jpg', { type: 'image/jpeg' })] })) {
        try {
            const file = new File([blob], 'foodspot-momento.jpg', { type: 'image/jpeg' })
            await navigator.share({
                files: [file],
                title: 'FoodSpot',
                text: ''
            })
            return { shared: true }
        } catch (error) {
            if (error.name === 'AbortError') {
                return { shared: false, cancelled: true }
            }
            return { shared: false, error: true }
        }
    }
    return { shared: false, notSupported: true }
}

/**
 * Full export and share flow (v2.0)
 */
export async function exportAndShare({
    baseCanvas, strokes, elements, displayWidth, displayHeight,
    neonContext = null, branding = null
}) {
    const { dataURL, blob } = await exportImage({
        baseCanvas, strokes, elements, displayWidth, displayHeight,
        neonContext, branding
    })

    const result = await shareImage(blob, dataURL)

    return { ...result, dataURL, blob }
}

/**
 * Preview-only export (for Dual-Post screen)
 * Returns dataURL without sharing — lets user see the flattened result
 */
export async function exportPreview({
    baseCanvas, strokes, elements, displayWidth, displayHeight,
    neonContext = null, branding = null
}) {
    const { dataURL, blob } = await exportImage({
        baseCanvas, strokes, elements, displayWidth, displayHeight,
        neonContext, branding
    })
    return { dataURL, blob }
}
