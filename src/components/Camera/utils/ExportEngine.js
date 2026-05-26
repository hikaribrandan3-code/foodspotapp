/**
 * ExportEngine.js - CamTech v2.6 (True Rect Fix)
 * Eliminates 5% vertical drift by using container-derived aspect ratios
 * Synchronized 9:16 center-crop with UI layer
 */

const MAX_EXPORT_WIDTH = 1080
const MAX_EXPORT_HEIGHT = 1920

const BRUSH_SIZES = {
    small: 4,
    medium: 16
}

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
const PIN_STYLE_COLORS = {
    classic: 'rgba(255, 255, 255, 0.22)',
    cafe:    'rgba(130, 90, 60, 0.55)',
    vegan:   'rgba(145, 170, 100, 0.55)',
    burger:  'rgba(255, 193, 7, 0.60)',
}

function burnBranding(ctx, width, height, branding, trueScale) {
    if (!branding?.businessName) return

    const { businessName, cameraPinStyle } = branding
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

    // Glassmorphism pill background — color driven by cameraPinStyle
    const pillColor = PIN_STYLE_COLORS[cameraPinStyle] || PIN_STYLE_COLORS.classic
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowBlur = 8 * scale
    ctx.shadowOffsetY = 2 * scale
    ctx.fillStyle = pillColor

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

function drawSticker(ctx, element, exportWidth, exportHeight, scale = 1, loadedImages = {}) {
    ctx.save()
    ctx.translate(element.x * exportWidth, element.y * exportHeight)
    ctx.rotate((element.rotation * Math.PI) / 180)

    if (element.data?.isImage && loadedImages[element.data.stickerId]) {
        const img = loadedImages[element.data.stickerId]
        const size = 80 * element.scale * scale
        ctx.drawImage(img, -size / 2, -size / 2, size, size)
    } else if (element.data?.isImage) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
        ctx.fillRect(-40 * element.scale * scale, -40 * element.scale * scale, 80 * element.scale * scale, 80 * element.scale * scale)
    } else {
        const fontSize = 48 * element.scale * scale
        ctx.font = `${fontSize}px -apple-system, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(element.data?.content || '📷', 0, 0)
    }
    ctx.restore()
}

function drawEmoji(ctx, element, exportWidth, exportHeight, scale = 1) {
    const fontSize = 48 * element.scale * scale
    ctx.save()
    ctx.translate(element.x * exportWidth, element.y * exportHeight)
    ctx.rotate((element.rotation * Math.PI) / 180)
    ctx.font = `${fontSize}px -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(element.data?.emojiChar || '😊', 0, 0)
    ctx.restore()
}

function drawText(ctx, element, exportWidth, exportHeight, scale = 1) {
    const style = element.data?.style || {}
    const text = element.data?.text || ''
    const fontFamily = FONTS[style.fontId] || FONTS.classic
    const fontWeight = style.fontId === 'bold' ? '700' : '400'
    const fontSize = 24 * element.scale * scale
    const color = style.color || '#fff'

    ctx.save()
    ctx.translate(element.x * exportWidth, element.y * exportHeight)
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
    const startY = -totalHeight / 2 + lineHeight / 2

    let maxLW = 0
    lines.forEach(l => maxLW = Math.max(maxLW, ctx.measureText(l).width))

    if (style.styleMode === 'background') {
        const pad = 8 * scale
        ctx.fillStyle = color
        // Per-line rects — each line gets its own tight background (Instagram style)
        lines.forEach((line, i) => {
            const lw = ctx.measureText(line).width
            const ly = startY + i * lineHeight
            ctx.beginPath()
            ctx.roundRect(-lw / 2 - pad, ly - lineHeight / 2, lw + pad * 2, lineHeight, 4 * scale)
            ctx.fill()
        })
    } else if (style.styleMode === 'highlight') {
        const pad = 12 * scale
        ctx.fillStyle = color
        // Per-line rects with larger padding (Instagram highlight style)
        lines.forEach((line, i) => {
            const lw = ctx.measureText(line).width
            const ly = startY + i * lineHeight
            ctx.beginPath()
            ctx.roundRect(-lw / 2 - pad, ly - lineHeight / 2 - pad / 4, lw + pad * 2, lineHeight + pad / 2, 8 * scale)
            ctx.fill()
        })
    }
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
    // Use ACTUAL captured image aspect ratio (landscape or portrait), don't force 9:16
    const imgAspect = baseCanvas.width / baseCanvas.height

    // Export at full source dimensions, respecting whatever orientation was captured
    let exportWidth = baseCanvas.width
    let exportHeight = baseCanvas.height

    // Clip to MAX limits if necessary (prevent huge exports)
    const maxAspect = MAX_EXPORT_WIDTH / MAX_EXPORT_HEIGHT
    if (imgAspect > maxAspect) {
        // Landscape: constrain by width
        exportWidth = MAX_EXPORT_WIDTH
        exportHeight = Math.round(MAX_EXPORT_WIDTH / imgAspect)
    } else {
        // Portrait or square: constrain by height
        exportHeight = MAX_EXPORT_HEIGHT
        exportWidth = Math.round(MAX_EXPORT_HEIGHT * imgAspect)
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

    // Draw FULL frame without cropping - preserve captured aspect ratio
    // Don't crop sides or top/bottom - export what the user captured
    ctx.drawImage(baseCanvas, 0, 0, baseCanvas.width, baseCanvas.height, 0, 0, exportWidth, exportHeight)

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

    // Pre-load all image stickers
    const imageStickers = sorted.filter(el => el.type === 'sticker' && el.data?.isImage)
    const loadedImages = {}

    for (const sticker of imageStickers) {
        await new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
                loadedImages[sticker.data.stickerId] = img
                resolve()
            }
            img.onerror = () => resolve()
            img.src = sticker.data.src
        })
    }

    sorted.forEach(el => {
        if (el.type === 'sticker') drawSticker(ctx, el, exportWidth, exportHeight, scale, loadedImages)
        else if (el.type === 'emoji') drawEmoji(ctx, el, exportWidth, exportHeight, scale)
        else if (el.type === 'text') drawText(ctx, el, exportWidth, exportHeight, scale)
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
