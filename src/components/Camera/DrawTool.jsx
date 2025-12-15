import { useRef, useEffect, useCallback, useState } from 'react'
import './DrawTool.css'

/**
 * DrawTool Component - Hikari CamTech Engine v3.1
 * Canvas overlay for freehand drawing
 * Sits between frozen photo and draggable elements per PRD layer architecture
 */

// Color palette - 12+ colors per PRD
const DRAW_COLORS = [
    '#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
    '#00C7BE', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#A2845E'
]

// Brush sizes - increased difference for visibility
const BRUSH_SIZES = {
    small: 4,
    medium: 16
}

export default function DrawTool({
    isActive,
    canvasWidth,
    canvasHeight,
    strokes,
    onStrokesChange,
    onExit
}) {
    const canvasRef = useRef(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [currentStroke, setCurrentStroke] = useState(null)
    const [strokeColor, setStrokeColor] = useState('#FFFFFF')
    const [brushSize, setBrushSize] = useState('small')
    const lastPointRef = useRef(null)

    // Get canvas context with DPR scaling
    const getContext = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return null
        const ctx = canvas.getContext('2d')
        const dpr = window.devicePixelRatio || 1
        ctx.scale(dpr, dpr)
        return ctx
    }, [])

    // Clear and redraw all strokes
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        const dpr = window.devicePixelRatio || 1

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Set up for high-DPI
        ctx.save()
        ctx.scale(dpr, dpr)

        // Draw all saved strokes
        strokes.forEach(stroke => {
            if (stroke.points.length < 2) return

            ctx.beginPath()
            ctx.strokeStyle = stroke.color
            ctx.lineWidth = BRUSH_SIZES[stroke.size] || BRUSH_SIZES.small
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'

            ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
            }
            ctx.stroke()
        })

        // Draw current stroke if drawing
        if (currentStroke && currentStroke.points.length >= 2) {
            ctx.beginPath()
            ctx.strokeStyle = currentStroke.color
            ctx.lineWidth = BRUSH_SIZES[currentStroke.size] || BRUSH_SIZES.small
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'

            ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y)
            for (let i = 1; i < currentStroke.points.length; i++) {
                ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y)
            }
            ctx.stroke()
        }

        ctx.restore()
    }, [strokes, currentStroke])

    // Set up canvas dimensions with DPR
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !canvasWidth || !canvasHeight) return

        const dpr = window.devicePixelRatio || 1
        canvas.width = canvasWidth * dpr
        canvas.height = canvasHeight * dpr
        canvas.style.width = `${canvasWidth}px`
        canvas.style.height = `${canvasHeight}px`

        redrawCanvas()
    }, [canvasWidth, canvasHeight, redrawCanvas])

    // Redraw when strokes change
    useEffect(() => {
        requestAnimationFrame(redrawCanvas)
    }, [strokes, currentStroke, redrawCanvas])

    // Get position from event
    const getPosition = useCallback((e) => {
        const canvas = canvasRef.current
        if (!canvas) return null

        const rect = canvas.getBoundingClientRect()
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        }
    }, [])

    // Start drawing - PATCH 13: Ensure first point captured immediately, block multi-touch
    const handleDrawStart = useCallback((e) => {
        if (!isActive) return

        // Block multi-touch drawing (prevents 2-finger gesture conflicts)
        if (e.touches && e.touches.length > 1) return

        e.preventDefault()

        const pos = getPosition(e)
        if (!pos) return

        setIsDrawing(true)
        lastPointRef.current = pos

        // Immediately push first point to prevent stroke gap on fast swipes
        const newStroke = {
            id: `stroke-${Date.now()}`,
            color: strokeColor,
            size: brushSize,
            points: [pos]
        }
        setCurrentStroke(newStroke)
    }, [isActive, getPosition, strokeColor, brushSize])

    // Continue drawing - PATCH 13: Stop if multi-touch detected
    const handleDrawMove = useCallback((e) => {
        if (!isDrawing || !isActive) return

        // Stop drawing if multi-touch detected
        if (e.touches && e.touches.length > 1) {
            setIsDrawing(false)
            setCurrentStroke(null)
            return
        }

        e.preventDefault()

        const pos = getPosition(e)
        if (!pos) return

        setCurrentStroke(prev => {
            if (!prev) return null
            return {
                ...prev,
                points: [...prev.points, pos]
            }
        })
    }, [isDrawing, isActive, getPosition])

    // End drawing
    const handleDrawEnd = useCallback(() => {
        if (!isDrawing || !currentStroke) {
            setIsDrawing(false)
            return
        }

        // Only save strokes with at least 2 points
        if (currentStroke.points.length >= 2) {
            onStrokesChange([...strokes, currentStroke])
        }

        setCurrentStroke(null)
        setIsDrawing(false)
        lastPointRef.current = null
    }, [isDrawing, currentStroke, strokes, onStrokesChange])

    // Undo last stroke
    const handleUndo = useCallback(() => {
        if (strokes.length > 0) {
            onStrokesChange(strokes.slice(0, -1))
        }
    }, [strokes, onStrokesChange])

    // Clear all strokes
    const handleClear = useCallback(() => {
        onStrokesChange([])
    }, [onStrokesChange])

    // Toggle brush size
    const handleToggleBrushSize = useCallback(() => {
        setBrushSize(prev => prev === 'small' ? 'medium' : 'small')
    }, [])

    // Handle Done - commit stroke, reset state, exit draw mode
    // CRITICAL: Must commit strokes synchronously before onExit triggers unmount
    const handleDone = useCallback(() => {
        // Build final strokes array with any in-progress stroke
        let finalStrokes = strokes
        if (currentStroke && currentStroke.points.length >= 2) {
            finalStrokes = [...strokes, currentStroke]
        }

        // Commit strokes to parent FIRST (before any state changes)
        if (finalStrokes !== strokes) {
            onStrokesChange(finalStrokes)
        }

        // Reset internal draw state
        setCurrentStroke(null)
        setIsDrawing(false)
        lastPointRef.current = null

        // Reset UI state to defaults
        setStrokeColor('#FFFFFF')
        setBrushSize('small')

        // Exit draw mode AFTER stroke commit
        // Use setTimeout(0) to ensure React processes the stroke update first
        setTimeout(() => {
            onExit()
        }, 0)
    }, [currentStroke, strokes, onStrokesChange, onExit])

    // Add/remove event listeners
    useEffect(() => {
        if (!isActive) return

        window.addEventListener('mouseup', handleDrawEnd)
        window.addEventListener('touchend', handleDrawEnd)

        return () => {
            window.removeEventListener('mouseup', handleDrawEnd)
            window.removeEventListener('touchend', handleDrawEnd)
        }
    }, [isActive, handleDrawEnd])

    if (!isActive && strokes.length === 0) return null

    return (
        <>
            {/* Draw Canvas - full overlay when active */}
            <canvas
                ref={canvasRef}
                className={`draw-canvas-overlay ${isActive ? 'draw-active' : 'draw-locked'}`}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: isActive ? 9999 : 2,
                    pointerEvents: isActive ? 'auto' : 'none',
                    touchAction: 'none'
                }}
                onPointerDown={isActive ? handleDrawStart : undefined}
                onPointerMove={isActive ? handleDrawMove : undefined}
                onPointerUp={isActive ? handleDrawEnd : undefined}
                onPointerCancel={isActive ? handleDrawEnd : undefined}
                onTouchStart={isActive ? handleDrawStart : undefined}
                onTouchMove={isActive ? handleDrawMove : undefined}
                onTouchEnd={isActive ? handleDrawEnd : undefined}
            />

            {/* Draw Mode UI - only visible when active */}
            {isActive && (
                <div className="draw-ui">
                    {/* Color Row */}
                    <div className="draw-color-row">
                        {DRAW_COLORS.map((color) => (
                            <button
                                key={color}
                                className={`draw-color-button ${strokeColor === color ? 'draw-color-active' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setStrokeColor(color)}
                                aria-label={`Color ${color}`}
                            />
                        ))}
                    </div>

                    {/* Controls Row */}
                    <div className="draw-controls">
                        {/* Brush Size Preview */}
                        <button
                            className="draw-brush-button"
                            onClick={handleToggleBrushSize}
                            aria-label={`Brush size: ${brushSize}`}
                        >
                            <div
                                className="brush-preview"
                                style={{
                                    width: BRUSH_SIZES[brushSize] * 2,
                                    height: BRUSH_SIZES[brushSize] * 2,
                                    backgroundColor: strokeColor
                                }}
                            />
                        </button>

                        {/* Undo */}
                        <button
                            className="draw-action-button"
                            onClick={handleUndo}
                            disabled={strokes.length === 0}
                            aria-label="Undo"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 7v6h6" />
                                <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
                            </svg>
                        </button>

                        {/* Clear */}
                        <button
                            className="draw-action-button"
                            onClick={handleClear}
                            disabled={strokes.length === 0}
                            aria-label="Clear all"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>

                        {/* Done Drawing */}
                        <button
                            className="draw-done-button"
                            onClick={handleDone}
                            aria-label="Done drawing"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
