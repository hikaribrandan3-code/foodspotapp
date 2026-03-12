/**
 * ExportEngine.js - CamTech v2.6 (True Rect Fix)
 * Eliminates 5% vertical drift by using container-derived aspect ratios
 * Synchronized 9:16 center-crop with UI layer
 */

const MAX_EXPORT_WIDTH = 4096
const MAX_EXPORT_HEIGHT = 4096

const BRUSH_SIZES = { small: 4, medium: 8 }

const FONTS = {
    classic: '-apple-system, BlinkMacSystemFont, sans-serif',
    bold: '-apple-system, BlinkMacSystemFont, sans-serif',
    serif: 'Georgia, Times New Roman, serif',
    mono: 'SF Mono, Menlo, monospace',
    condensed: 'Arial Narrow, sans-serif',
    script: 'Snell Roundhand, cursive'
}

function clamp(val) {
    return Math.max(0, Math.min(255, Math.round(val)))
}

function applyFoodPornFilter(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    const cx = width / 2
    const cy = height / 2
    const maxDist = Math.sqrt(cx * cx + cy * cy)

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2]
        r = clamp(((r / 255 - 0.5) * 1.10 + 0.5) * 255)
        g = clamp(((g / 255 - 0.5) * 1.10 + 0.5) * 255)
        b = clamp(((b / 255 - 0.5) * 1.10 + 0.5) * 255)
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        r = clamp(lum + (r - lum) * 1.15 + 5)
        g = clamp(lum + (g - lum) * 1.15)
        b = clamp(lum + (b - lum) * 1.15 - 3)
        const px = (i / 4) % width
        const py = Math.floor((i / 4) / width)
        const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
        const vignette = 1 - (dist / maxDist) * 0.35
        data[i] = clamp(r * vignette)
        data[i + 1] = clamp(g * vignette)
        data[i + 2] = clamp(b * vignette)
    }
    ctx.putImageData(imageData, 0, 0)
}

function applyNeonGlowFilter(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2]
        r = clamp(((r / 255 - 0.5) * 1.30 + 0.5) * 255)
        g = clamp(((g / 255 - 0.5) * 1.30 + 0.5) * 255)
        b = clamp(((b / 255 - 0.5) * 1.30 + 0.5) * 255)
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        r = clamp(lum + (r - lum) * 1.40)
        g = clamp(lum + (g - lum) * 1.40)
        b = clamp(lum + (b - lum) * 1.40)
        const cos = Math.cos(15 * Math.PI / 180), sin = Math.sin(15 * Math.PI / 180)
        const rr = clamp(r * (0.213 + cos * 0.787 - sin * 0.213) + g * (0.715 - cos * 0.715 - sin * 0.715) + b * (0.072 - cos * 0.072 + sin * 0.928))
        const gg = clamp(r * (0.213 - cos * 0.213 + sin * 0.143) + g * (0.715 + cos * 0.285 + sin * 0.140) + b * (0.072 - cos * 0.072 - sin * 0.283))
        const bb = clamp(r * (0.213 - cos * 0.213 - sin * 0.787) + g * (0.715 - cos * 0.715 + sin * 0.715) + b * (0.072 + cos * 0.928 + sin * 0.072))
        data[i] = clamp(rr * 0.95 + 8)
        data[i + 1] = clamp(gg * 0.95 + 5)
        data[i + 2] = clamp(bb * 0.95 + 12)
    }
    ctx.putImageData(imageData, 0, 0)
    const grainData = ctx.createImageData(width, height)
    for (let i = 0; i < grainData.data.length; i += 4) {
        const noise = Math.random() * 255
        grainData.data[i] = grainData.data[i + 1] = grainData.data[i + 2] = noise
        grainData.data[i + 3] = 10
    }
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = width
    tempCanvas.height = height
    tempCanvas.getContext('2d').putImageData(grainData, 0, 0)
    ctx.drawImage(tempCanvas, 0, 0)
}

export function applyNanoBanana(ctx, width, height, context) {
    if (context === 'food') applyFoodPornFilter(ctx, width, height)
    else if (context === 'event') applyNeonGlowFilter(ctx, width, height)
}

/**
 * Aura Tag Branding — EXACT MATCH to CameraLayer UI
 * Uses identical positioning and styling for consistency
 */
function burnBranding(ctx, width, height, branding, trueScale) {
    if (!branding?.businessName) return

    const { businessName } = branding
    const scale = trueScale || (width / 1080)

    // EXACT MATCH to CameraLayer.jsx styling
    const fontSize = Math.round(11 * scale) // 11px base
    const pinSize = Math.round(12 * scale)  // 12px svg
    const pillPaddingH = Math.round(12 * scale) // 6px * 2
    const pillPaddingV = Math.round(6 * scale)  // matches padding
    const pinTextGap = Math.round(5 * scale)    // 5px gap

    ctx.save()
    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`

    const textW = ctx.measureText(businessName.toUpperCase()).width
    const pillW = pillPaddingH + pinSize + pinTextGap + textW + pillPaddingH
    const pillH = pillPaddingV + Math.max(pinSize, fontSize) + pillPaddingV

    // EXACT position match: top-left under close button
    const leftOffset = Math.round(20 * scale)
    const topOffset = Math.round(72 * scale) // 16px + 44px button + 12px gap

    const pillX = leftOffset
    const pillY = topOffset

    // Glassmorphism pill background
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowBlur = 8 * scale
    ctx.shadowOffsetY = 2 * scale
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'

    const r = Math.min(20 * scale, pillH / 2) // 20px border radius
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, r)
    ctx.fill()

    ctx.shadowColor = 'transparent'

    // Map pin icon (white)
    const pinX = pillX + pillPaddingH
    const pinCenterY = pillY + pillH / 2
    const pinR = pinSize * 0.35

    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(pinX + pinSize / 2, pinCenterY - pinR * 0.3, pinR, Math.PI, 0, false)
    ctx.lineTo(pinX + pinSize / 2, pinCenterY + pinR * 1.4)
    ctx.closePath()
    ctx.fill()

    // Text
    ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(businessName.toUpperCase(), pinX + pinSize + pinTextGap, pinCenterY)

    ctx.restore()
}

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
    const fontSize = 48 * element.scale * scale
    ctx.save()
    ctx.translate(element.x * scale, element.y * scale)
    ctx.rotate((element.rotation * Math.PI) / 180)
    ctx.font = `${fontSize}px -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(element.data?.content || '📷', 0, 0)
    ctx.restore()
}

function drawEmoji(ctx, element, scale = 1) {
    const fontSize = 48 * element.scale * scale
    ctx.save()
    ctx.translate(element.x * scale, element.y * scale)
    ctx.rotate((element.rotation * Math.PI) / 180)
    ctx.font = `${fontSize}px -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(element.data?.emojiChar || '😊', 0, 0)
    ctx.restore()
}

function drawText(ctx, element, scale = 1) {
    const style = element.data?.style || {}
    const text = element.data?.text || ''
    const fontFamily = FONTS[style.fontId] || FONTS.classic
    const fontWeight = style.fontId === 'bold' ? '700' : '400'
    const fontSize = 24 * element.scale * scale
    const color = style.color || '#fff'

    ctx.save()
    ctx.translate(element.x * scale, element.y * scale)
    ctx.rotate((element.rotation * Math.PI) / 180)
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    ctx.textAlign = style.textAlign || 'center'
    ctx.textBaseline = 'middle'

    const maxWidth = 280 * element.scale * scale
    const paragraphs = text.split('\n')
    const lines = []
    paragraphs.forEach(p => {
        const words = p.split(' ')
        let currentLine = words[0] || ''
        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i]
            if (ctx.measureText(testLine).width > maxWidth) {
                lines.push(currentLine)
                currentLine = words[i]
            } else currentLine = testLine
        }
        lines.push(currentLine)
    })

    const lineHeight = fontSize * 1.2
    const totalHeight = lines.length * lineHeight
    let maxLW = 0
    lines.forEach(l => maxLW = Math.max(maxLW, ctx.measureText(l).width))

    if (style.styleMode === 'background') {
        const pad = 8 * scale
        ctx.fillStyle = color
        ctx.roundRect(-maxLW / 2 - pad, -totalHeight / 2, maxLW + pad * 2, totalHeight, 4 * scale)
        ctx.fill()
    } else if (style.styleMode === 'highlight') {
        const pad = 12 * scale
        ctx.fillStyle = color
        ctx.roundRect(-maxLW / 2 - pad, -totalHeight / 2 - pad / 2, maxLW + pad * 2, totalHeight + pad, 8 * scale)
        ctx.fill()
    }

    const startY = -totalHeight / 2 + lineHeight / 2
    lines.forEach((line, i) => {
        const ly = startY + i * lineHeight
        if (style.styleMode === 'stroke') {
            ctx.strokeStyle = color
            ctx.lineWidth = 2 * scale
            ctx.strokeText(line, 0, ly)
        } else if (style.styleMode === 'background' || style.styleMode === 'highlight') {
            ctx.fillStyle = (color === '#FFFFFF' || color === '#FFCC00') ? '#000' : '#FFF'
            ctx.fillText(line, 0, ly)
        } else {
            ctx.shadowColor = 'rgba(0,0,0,0.5)'
            ctx.shadowBlur = 3 * scale
            ctx.fillStyle = color
            ctx.fillText(line, 0, ly)
        }
    })
    ctx.restore()
}

/**
 * TRUE RECT EXPORT — Eliminates 5% drift
 * Uses container-derived aspect ratio, not window dimensions
 */
export async function exportImage({
    baseCanvas,
    strokes,
    elements,
    containerRect, // NEW: Pass actual bounding client rect
    neonContext = null,
    branding = null
}) {
    // TRUE RECT: Use container dimensions, not display/window
    const targetAspect = containerRect.width / containerRect.height

    let exportWidth = baseCanvas.width
    let exportHeight = baseCanvas.height

    // Scale to minimum 1080 width while maintaining aspect
    exportWidth = Math.max(1080, exportWidth)
    exportHeight = Math.round(exportWidth / targetAspect)

    // Clip to MAX limits
    if (exportHeight > MAX_EXPORT_HEIGHT) {
        exportHeight = MAX_EXPORT_HEIGHT
        exportWidth = Math.round(exportHeight * targetAspect)
    }

    // EVEN DIMENSIONS (Hardware encoder safety)
    exportWidth = Math.floor(exportWidth / 2) * 2
    exportHeight = Math.floor(exportHeight / 2) * 2

    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = exportWidth
    exportCanvas.height = exportHeight

    const ctx = exportCanvas.getContext('2d', {
        colorSpace: 'display-p3',
        willReadFrequently: true
    })

    // SYNCED 9:16 CENTER-CROP (Matches UI object-fit: cover exactly)
    const imgAspect = baseCanvas.width / baseCanvas.height

    let sx = 0, sy = 0, sWidth = baseCanvas.width, sHeight = baseCanvas.height

    if (imgAspect > targetAspect) {
        // Image is wider — fit to height, crop sides
        sWidth = baseCanvas.height * targetAspect
        sx = (baseCanvas.width - sWidth) / 2
    } else {
        // Image is taller — fit to width, crop top/bottom
        sHeight = baseCanvas.width / targetAspect
        sy = (baseCanvas.height - sHeight) / 2
    }

    // Draw center-cropped frame
    ctx.drawImage(baseCanvas, sx, sy, sWidth, sHeight, 0, 0, exportWidth, exportHeight)

    // Apply filter
    if (neonContext) applyNanoBanana(ctx, exportWidth, exportHeight, neonContext)

    // Draw elements with TRUE scale
    const scale = exportWidth / containerRect.width

    // Burn branding with TRUE UI scale
    if (branding) burnBranding(ctx, exportWidth, exportHeight, branding, scale)

    if (strokes.length > 0) drawStrokes(ctx, strokes, scale)

    const sorted = [...elements].sort((a, b) => {
        const o = { sticker: 0, emoji: 1, text: 2 }
        return (o[a.type] || 0) - (o[b.type] || 0)
    })

    sorted.forEach(el => {
        if (el.type === 'sticker') drawSticker(ctx, el, scale)
        else if (el.type === 'emoji') drawEmoji(ctx, el, scale)
        else if (el.type === 'text') drawText(ctx, el, scale)
    })

    // Return Blob + ObjectURL (no DataURL)
    return new Promise((resolve, reject) => {
        exportCanvas.toBlob((blob) => {
            if (blob) {
                resolve({
                    blob,
                    objectURL: URL.createObjectURL(blob),
                    width: exportWidth,
                    height: exportHeight
                })
            } else reject(new Error('Export failed'))
        }, 'image/jpeg', 0.95)
    })
}

export async function shareImage(blob) {
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'image.jpg', { type: 'image/jpeg' })] })) {
        try {
            await navigator.share({
                files: [new File([blob], 'foodspot-momento.jpg', { type: 'image/jpeg' })],
                title: 'FoodSpot'
            })
            return { shared: true }
        } catch (e) {
            return { shared: false, cancelled: e.name === 'AbortError' }
        }
    }
    return { shared: false, notSupported: true }
}

export async function exportAndShare(params) {
    const result = await exportImage(params)
    const shareStatus = await shareImage(result.blob)
    return { ...shareStatus, ...result }
}

export async function exportPreview(params) {
    return await exportImage(params)
}
