import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import DraggableElement from './DraggableElement.jsx'
import TextEditor from './TextEditor.jsx'
import StickerDrawer from './StickerDrawer.jsx'
import EmojiPicker from './EmojiPicker.jsx'
import DrawTool from './DrawTool.jsx'
import { exportPreview } from './utils/ExportEngine.js'
import DualPostScreen from './DualPostScreen.jsx'
import { useTenant } from '../../contexts/TenantContext.jsx'
import './EditorLayer.css'

/**
 * EditorLayer Component - CamTech v1.8
 * Structure: Base Canvas → Draw Layer → Elements Layer → UI Layer
 * + Persistent Close (X) with high z-index (keyboard-safe)
 * + Instagram-style text wrapping (~16-18 chars)
 */
export default function EditorLayer({ imageData, onRetake, onDone, toolPosition, neonContext = null, branding = null }) {
    const { tenantData } = useTenant()
    const businessName = tenantData?.business_name || 'FoodSpot'

    // Canvas refs for layer architecture
    const containerRef = useRef(null)
    const baseCanvasRef = useRef(null)
    const drawCanvasRef = useRef(null)
    const canvasContainerRef = useRef(null)

    // Canvas dimensions state
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 })
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })

    // Placed elements state - persists across drawer open/close
    const [placedElements, setPlacedElements] = useState([])

    // Active tool state
    const [activeTool, setActiveTool] = useState(null)

    // Drawer states
    const [isStickerDrawerOpen, setIsStickerDrawerOpen] = useState(false)
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)

    // Text editing state (IG-style)
    const [isEditingText, setIsEditingText] = useState(false)
    const [activeTextId, setActiveTextId] = useState(null)
    const [textInputPosition, setTextInputPosition] = useState({ x: '50%', y: '40%' })
    const [initialTextValue, setInitialTextValue] = useState('')
    const [initialTextStyle, setInitialTextStyle] = useState(null)

    // Draw mode state
    const [isDrawMode, setIsDrawMode] = useState(false)
    const [strokes, setStrokes] = useState([])

    // Export state
    const [isExporting, setIsExporting] = useState(false)
    const [exportResult, setExportResult] = useState(null)

    // DualPost state
    const [showDualPost, setShowDualPost] = useState(false)
    const [dualPostData, setDualPostData] = useState(null)

    // PATCH 15: Rapid action protection
    const lastActionRef = useRef(0)
    const ACTION_DEBOUNCE_MS = 150

    // PATCH 15: Computed gesture state - determines if editor interactions are blocked
    const isAnyModalOpen = useMemo(() =>
        isStickerDrawerOpen || isEmojiPickerOpen || isEditingText,
        [isStickerDrawerOpen, isEmojiPickerOpen, isEditingText]
    )

    // PATCH 15: Determine if draggable elements should be interactive
    const elementsInteractive = useMemo(() =>
        !isDrawMode && !isAnyModalOpen && !isExporting && !showDualPost,
        [isDrawMode, isAnyModalOpen, isExporting, showDualPost]
    )

    // Render frozen frame to base canvas - <50ms mount
    useEffect(() => {
        if (!imageData || !baseCanvasRef.current || !containerRef.current) return

        const canvas = baseCanvasRef.current
        const ctx = canvas.getContext('2d')
        const container = containerRef.current

        const img = new Image()
        img.onload = () => {
            // Calculate dimensions maintaining aspect ratio - edge-to-edge
            const containerWidth = container.clientWidth
            const containerHeight = container.clientHeight
            const imgAspect = img.width / img.height
            const containerAspect = containerWidth / containerHeight

            let renderWidth, renderHeight
            let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height

            // object-fit: cover logic
            if (imgAspect > containerAspect) {
                // Image is wider - fit to height, crop sides
                renderHeight = containerHeight
                renderWidth = containerWidth

                sHeight = img.height
                sWidth = img.height * containerAspect
                sx = (img.width - sWidth) / 2
            } else {
                // Image is taller - fit to width, crop top/bottom
                renderWidth = containerWidth
                renderHeight = containerHeight

                sWidth = img.width
                sHeight = img.width / containerAspect
                sy = (img.height - sHeight) / 2
            }

            // Set canvas to calculated dimensions (matches screen exactly)
            canvas.width = renderWidth
            canvas.height = renderHeight

            // Also set draw canvas to same dimensions
            if (drawCanvasRef.current) {
                drawCanvasRef.current.width = renderWidth
                drawCanvasRef.current.height = renderHeight
            }

            // Store dimensions and calculate offset for element positioning
            setCanvasDimensions({ width: renderWidth, height: renderHeight })

            // Calculate canvas position offset
            if (canvasContainerRef.current) {
                const rect = canvasContainerRef.current.getBoundingClientRect()
                setCanvasOffset({
                    x: rect.left + (rect.width - renderWidth) / 2,
                    y: rect.top + (rect.height - renderHeight) / 2
                })
            }

            // Draw image using cover logic (cropped to fill)
            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, renderWidth, renderHeight)
        }
        img.src = imageData?.objectURL || imageData // Support both old string and new object
    }, [imageData])

    // Handle tap on canvas area (for text creation) with gesture guards
    const handleCanvasTap = useCallback((e) => {
        // CRITICAL: block ALL canvas taps while Preview is showing
        if (showDualPost) return
        // Gesture guards: don't create text if any modal is open or in draw mode
        if (isEditingText) return
        if (isDrawMode) return
        if (isStickerDrawerOpen) return
        if (isEmojiPickerOpen) return
        if (activeTool && activeTool !== 'text') return

        // Check if tap was on an existing element
        const target = e.target
        if (target.closest('.draggable-element')) return

        // Get tap position relative to canvas container
        const rect = canvasContainerRef.current?.getBoundingClientRect()
        if (!rect) return

        const tapX = e.clientX || (e.touches && e.touches[0]?.clientX) || rect.width / 2
        const tapY = e.clientY || (e.touches && e.touches[0]?.clientY) || rect.height / 2

        // Start new text input at tap position
        setTextInputPosition({ x: tapX, y: tapY })
        setInitialTextValue('')
        setInitialTextStyle(null)
        setActiveTextId(null)
        setIsEditingText(true)
    }, [showDualPost, isEditingText, isDrawMode, isStickerDrawerOpen, isEmojiPickerOpen, activeTool])

    // Handle tap on existing text element (re-edit)
    const handleTextElementTap = useCallback((element) => {
        // Open editor with existing text
        setTextInputPosition({
            x: canvasOffset.x + element.x,
            y: canvasOffset.y + element.y
        })
        setInitialTextValue(element.data?.text || '')
        setInitialTextStyle(element.data?.style || null)
        setActiveTextId(element.id)
        setIsEditingText(true)
    }, [canvasOffset])

    // Save text from editor with style
    const handleTextSave = useCallback((text, style) => {
        if (activeTextId) {
            // Update existing text element
            setPlacedElements(prev => prev.map(el =>
                el.id === activeTextId
                    ? { ...el, data: { ...el.data, text, style } }
                    : el
            ))
        } else {
            // Create new text element - centered in canvas
            const newElement = {
                id: `text-${Date.now()}`,
                type: 'text',
                x: canvasDimensions.width / 2,
                y: canvasDimensions.height / 2,
                scale: 1,
                rotation: 0,
                data: { text, style }
            }
            setPlacedElements(prev => [...prev, newElement])
        }

        // Close editor
        setIsEditingText(false)
        setActiveTextId(null)
        setInitialTextValue('')
        setInitialTextStyle(null)
    }, [activeTextId, textInputPosition, canvasOffset])

    // Cancel text editing
    const handleTextCancel = useCallback(() => {
        setIsEditingText(false)
        setActiveTextId(null)
        setInitialTextValue('')
        setInitialTextStyle(null)
    }, [])

    // Update element position/transform
    const updateElement = useCallback((id, updates) => {
        setPlacedElements(prev => prev.map(el =>
            el.id === id ? { ...el, ...updates } : el
        ))
    }, [])

    // Remove element
    const removeElement = useCallback((id) => {
        setPlacedElements(prev => prev.filter(el => el.id !== id))
    }, [])

    // Handle tool button press with gesture guards
    // PATCH 15: Added rapid action debouncing
    const handleToolPress = (tool) => {
        // Rapid action protection - prevent double-tap issues
        const now = Date.now()
        if (now - lastActionRef.current < ACTION_DEBOUNCE_MS) return
        lastActionRef.current = now

        // Gesture guard: don't switch tools while editing text
        if (isEditingText && tool !== 'text') return

        // Prevent opening if already open
        if (tool === 'stickers' && isStickerDrawerOpen) return
        if (tool === 'emoji' && isEmojiPickerOpen) return
        if (tool === 'draw' && isDrawMode) return

        if (tool === 'text') {
            // Directly open text editor centered
            setTextInputPosition({ x: '50%', y: '40%' })
            setInitialTextValue('')
            setInitialTextStyle(null)
            setActiveTextId(null)
            setIsEditingText(true)
            setActiveTool('text')
        } else if (tool === 'stickers') {
            setIsStickerDrawerOpen(true)
            setActiveTool(null)
        } else if (tool === 'emoji') {
            setIsEmojiPickerOpen(true)
            setActiveTool(null)
        } else if (tool === 'draw') {
            setIsDrawMode(true)
            setActiveTool('draw')
        } else {
            setActiveTool(activeTool === tool ? null : tool)
        }
    }

    // Exit draw mode
    const handleExitDrawMode = useCallback(() => {
        setIsDrawMode(false)
        setActiveTool(null)
    }, [])

    // Add sticker to placed elements
    const handleAddSticker = useCallback((sticker) => {
        const newElement = {
            id: `sticker-${Date.now()}`,
            type: 'sticker',
            x: canvasDimensions.width / 2,
            y: canvasDimensions.height / 2,
            scale: 1,
            rotation: 0,
            data: { stickerId: sticker.id, content: sticker.icon }
        }
        setPlacedElements(prev => [...prev, newElement])
    }, [canvasDimensions])

    // Add emoji to placed elements
    const handleAddEmoji = useCallback((emojiChar) => {
        const newElement = {
            id: `emoji-${Date.now()}`,
            type: 'emoji',
            x: canvasDimensions.width / 2,
            y: canvasDimensions.height / 2,
            scale: 1,
            rotation: 0,
            data: { emojiChar }
        }
        setPlacedElements(prev => [...prev, newElement])
    }, [canvasDimensions])

    // Handle Done button - export preview and show DualPostScreen
    const handleDone = useCallback(async () => {
        if (!baseCanvasRef.current || !imageData) return
        setIsExporting(true)

        try {
            setIsEditingText(false)
            setActiveTextId(null)
            if (document.activeElement && document.activeElement !== document.body) {
                document.activeElement.blur()
            }

            // TRUE RECT: Get actual container dimensions
            const containerRect = canvasContainerRef.current.getBoundingClientRect()

            // High-res reconstruction
            const highResCanvas = document.createElement('canvas')
            const highResCtx = highResCanvas.getContext('2d', {
                colorSpace: 'display-p3',
                willReadFrequently: true
            })

            const img = new Image()
            await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = reject
                img.src = imageData.objectURL || imageData
            })

            highResCanvas.width = img.width
            highResCanvas.height = img.height
            highResCtx.drawImage(img, 0, 0)

            // Pass TRUE container rect, not display dimensions
            const { objectURL, blob } = await exportPreview({
                baseCanvas: highResCanvas,
                strokes,
                elements: placedElements,
                containerRect: { // TRUE RECT passed here
                    width: containerRect.width,
                    height: containerRect.height
                },
                neonContext,
                branding: { ...branding, businessName }
            })

            setDualPostData({ objectURL, blob })
            setShowDualPost(true)
        } catch (error) {
            console.error('Export failed:', error)
        } finally {
            setIsExporting(false)
        }
    }, [imageData, strokes, placedElements, neonContext, branding, businessName])

    return (
        <div className="editor-layer" ref={containerRef}>
            {/* Close (X) button - top left, always above keyboard */}
            {!showDualPost && (
                <button
                    onClick={onRetake}
                    aria-label="Close"
                    style={{
                        position: 'fixed',
                        top: '16px',
                        left: '16px',
                        width: '44px',
                        height: '44px',
                        background: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        zIndex: 1000
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            )}

            {/* Canvas container - tap to add text */}
            {/* CRITICAL: pointer-events disabled when Preview (DualPostScreen) is showing */}
            <div
                className="canvas-container"
                ref={canvasContainerRef}
                onClick={handleCanvasTap}
                style={showDualPost ? { pointerEvents: 'none' } : undefined}
            >
                {/* Layer 1: Base Canvas - Frozen Frame */}
                <canvas
                    ref={baseCanvasRef}
                    className="base-canvas"
                />

                {/* Layer 2: Draw Tool - Canvas overlay */}
                <DrawTool
                    isActive={isDrawMode}
                    canvasWidth={canvasDimensions.width}
                    canvasHeight={canvasDimensions.height}
                    strokes={strokes}
                    onStrokesChange={setStrokes}
                    onExit={handleExitDrawMode}
                />

                {/* Layer 3: Elements Layer - Draggable items */}
                {/* PATCH 15: Uses elementsInteractive for complete gesture isolation */}
                <div
                    className={`elements-layer ${!elementsInteractive ? 'elements-disabled' : ''}`}
                    style={{
                        width: canvasDimensions.width || '100%',
                        height: canvasDimensions.height || '100%',
                    }}
                >
                    {placedElements.map((element) => (
                        <DraggableElement
                            key={element.id}
                            element={element}
                            onUpdate={(updates) => updateElement(element.id, updates)}
                            onRemove={() => removeElement(element.id)}
                            onTap={element.type === 'text' ? () => handleTextElementTap(element) : undefined}
                            disabled={!elementsInteractive}
                        />
                    ))}
                </div>
            </div>

            {/* Text Editor Overlay (IG-style) — UNMOUNTED when Preview is open */}
            {!showDualPost && (
                <TextEditor
                    isActive={isEditingText}
                    initialText={initialTextValue}
                    initialStyle={initialTextStyle}
                    position={textInputPosition}
                    onSave={handleTextSave}
                    onCancel={handleTextCancel}
                />
            )}

            {/* Layer 4: UI Layer - Right Action Bar (hidden in draw mode AND preview) */}
            {!isDrawMode && !showDualPost && (
                <div style={{
                    position: 'absolute',
                    top: '100px',
                    right: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 8px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: '24px',
                    zIndex: 100
                }}>
                    {/* Text */}
                    <button
                        onClick={() => handleToolPress('text')}
                        aria-label="Add Text"
                        style={{
                            width: '44px',
                            height: '44px',
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: '600'
                        }}
                    >Aa</button>

                    {/* Stickers */}
                    <button
                        onClick={() => handleToolPress('stickers')}
                        aria-label="Add Stickers"
                        style={{
                            width: '44px',
                            height: '44px',
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                        </svg>
                    </button>

                    {/* Draw */}
                    <button
                        onClick={() => handleToolPress('draw')}
                        aria-label="Draw"
                        style={{
                            width: '44px',
                            height: '44px',
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 0 0 0-1.41z" />
                        </svg>
                    </button>

                    {/* Retake */}
                    <button
                        onClick={onRetake}
                        aria-label="Retake"
                        style={{
                            width: '44px',
                            height: '44px',
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                        </svg>
                    </button>

                    {/* Done */}
                    <button
                        onClick={handleDone}
                        disabled={isExporting}
                        aria-label="Done"
                        style={{
                            width: '44px',
                            height: '44px',
                            background: isExporting ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.15)',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: isExporting ? 'wait' : 'pointer',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isExporting ? 0.5 : 1
                        }}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                    </button>
                </div>
            )}

            {/* ── Location Pill (Global — hidden when Preview is open) ── */}
            {!showDualPost && (
                <div style={{
                    position: 'absolute',
                    bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))',
                    left: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    background: 'rgba(255, 255, 255, 0.22)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderRadius: '20px',
                    color: '#fff',
                    zIndex: 10,
                }}>
                    {/* Map Pin Icon */}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
                    </svg>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        letterSpacing: '0.08em',
                        lineHeight: 1,
                    }}>
                        {businessName.toUpperCase()}
                    </span>
                </div>
            )}

            {/* Sticker Drawer */}
            <StickerDrawer
                isOpen={isStickerDrawerOpen}
                onClose={() => setIsStickerDrawerOpen(false)}
                onSelect={handleAddSticker}
            />

            {/* Emoji Picker */}
            <EmojiPicker
                isOpen={isEmojiPickerOpen}
                onClose={() => setIsEmojiPickerOpen(false)}
                onSelect={handleAddEmoji}
            />

            {/* DualPost Decision Screen overlay */}
            {showDualPost && dualPostData && (
                <DualPostScreen
                    previewDataURL={dualPostData.objectURL}
                    previewBlob={dualPostData.blob}
                    onClose={() => setShowDualPost(false)}
                    onComplete={onDone}
                />
            )}
        </div>
    )
}
