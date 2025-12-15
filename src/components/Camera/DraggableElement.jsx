import { useRef, useState, useCallback, useEffect, memo } from 'react'
import './DraggableElement.css'

/**
 * DraggableElement Component - Hikari CamTech Engine v3.1
 * Handles drag, pinch-to-scale, and rotation for text, stickers, emoji
 * Memoized for performance per PATCH 12
 */
function DraggableElement({ element, onUpdate, onRemove, onTap, disabled }) {
    // Hook declarations must come before any conditional returns (React rules)
    const elementRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isScaling, setIsScaling] = useState(false)
    const [isOverDelete, setIsOverDelete] = useState(false)
    const dragStartRef = useRef({ x: 0, y: 0 })
    const elementStartRef = useRef({ x: 0, y: 0 })
    const hasDraggedRef = useRef(false)
    const initialPinchDistanceRef = useRef(0)
    const initialScaleRef = useRef(1)
    const initialAngleRef = useRef(0)
    const initialRotationRef = useRef(0)

    // Calculate distance between two touch points
    const getTouchDistance = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX
        const dy = touches[0].clientY - touches[1].clientY
        return Math.sqrt(dx * dx + dy * dy)
    }

    // Calculate angle between two touch points (in degrees)
    const getTouchAngle = (touches) => {
        const dx = touches[1].clientX - touches[0].clientX
        const dy = touches[1].clientY - touches[0].clientY
        return Math.atan2(dy, dx) * (180 / Math.PI)
    }

    // Handle touch/mouse start
    const handleDragStart = useCallback((e) => {
        // Don't start drag if disabled
        if (disabled) return

        e.preventDefault()
        e.stopPropagation()

        // Check for pinch gesture (2 fingers)
        if (e.touches && e.touches.length === 2) {
            setIsScaling(true)
            setIsDragging(false)
            initialPinchDistanceRef.current = getTouchDistance(e.touches)
            initialScaleRef.current = element.scale || 1
            initialAngleRef.current = getTouchAngle(e.touches)
            initialRotationRef.current = element.rotation || 0
            return
        }

        // Single finger/mouse - start drag
        setIsDragging(true)
        setIsScaling(false)
        hasDraggedRef.current = false

        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY

        dragStartRef.current = { x: clientX, y: clientY }
        elementStartRef.current = { x: element.x, y: element.y }
    }, [element.x, element.y, element.scale, element.rotation, disabled])

    // Handle touch/mouse move
    const handleDragMove = useCallback((e) => {
        // Handle pinch scaling + rotation
        if (isScaling && e.touches && e.touches.length === 2) {
            e.preventDefault()

            // Scale
            const currentDistance = getTouchDistance(e.touches)
            const scaleFactor = currentDistance / initialPinchDistanceRef.current
            const newScale = Math.max(0.3, Math.min(3, initialScaleRef.current * scaleFactor))

            // Rotation
            const currentAngle = getTouchAngle(e.touches)
            const angleDelta = currentAngle - initialAngleRef.current
            const newRotation = initialRotationRef.current + angleDelta

            onUpdate({ scale: newScale, rotation: newRotation })
            return
        }

        if (!isDragging) return

        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY

        const deltaX = clientX - dragStartRef.current.x
        const deltaY = clientY - dragStartRef.current.y

        // Only count as drag if moved more than 5px
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            hasDraggedRef.current = true
        }

        const newX = elementStartRef.current.x + deltaX
        const newY = elementStartRef.current.y + deltaY

        onUpdate({ x: newX, y: newY })

        // Check if over delete zone (bottom of screen)
        // PATCH 15: Increased hit area by 18% (100 -> 118px)
        const viewportHeight = window.innerHeight
        const deleteZoneHeight = 118 // 18% larger hit area
        if (clientY > viewportHeight - deleteZoneHeight) {
            setIsOverDelete(true)
        } else {
            setIsOverDelete(false)
        }
    }, [isDragging, isScaling, onUpdate])

    // Handle touch/mouse end
    const handleDragEnd = useCallback(() => {
        if (isScaling) {
            setIsScaling(false)
            return
        }
        if (isOverDelete) {
            onRemove()
        } else if (!hasDraggedRef.current && onTap) {
            // It was a tap, not a drag - call onTap for re-edit
            onTap()
        }
        setIsDragging(false)
        setIsOverDelete(false)
    }, [isScaling, isOverDelete, onRemove, onTap])

    // Add global event listeners when dragging or scaling
    useEffect(() => {
        if (isDragging || isScaling) {
            window.addEventListener('mousemove', handleDragMove)
            window.addEventListener('mouseup', handleDragEnd)
            window.addEventListener('touchmove', handleDragMove, { passive: false })
            window.addEventListener('touchend', handleDragEnd)
        }

        return () => {
            window.removeEventListener('mousemove', handleDragMove)
            window.removeEventListener('mouseup', handleDragEnd)
            window.removeEventListener('touchmove', handleDragMove)
            window.removeEventListener('touchend', handleDragEnd)
        }
    }, [isDragging, isScaling, handleDragMove, handleDragEnd])

    // Early return for disabled state (after all hooks per React rules)
    if (disabled) return null

    // Render element based on type
    const renderContent = () => {
        switch (element.type) {
            case 'text': {
                // Build text style from saved style data
                const style = element.data?.style || {}
                const fonts = {
                    classic: '-apple-system, BlinkMacSystemFont, sans-serif',
                    bold: '-apple-system, BlinkMacSystemFont, sans-serif',
                    serif: 'Georgia, Times New Roman, serif',
                    mono: 'SF Mono, Menlo, monospace',
                    condensed: 'Arial Narrow, sans-serif',
                    script: 'Snell Roundhand, cursive'
                }

                const computedStyle = {
                    fontFamily: fonts[style.fontId] || fonts.classic,
                    fontWeight: style.fontId === 'bold' ? '700' : '400',
                    color: style.color || '#fff',
                    textAlign: style.textAlign || 'center'
                }

                // Apply style mode
                if (style.styleMode === 'stroke') {
                    computedStyle.WebkitTextStroke = `1px ${style.color || '#fff'}`
                    computedStyle.color = 'transparent'
                } else if (style.styleMode === 'background') {
                    computedStyle.backgroundColor = style.color || '#fff'
                    computedStyle.color = (style.color === '#FFFFFF' || style.color === '#FFCC00') ? '#000' : '#FFF'
                    computedStyle.padding = '4px 12px'
                    computedStyle.borderRadius = '4px'
                } else if (style.styleMode === 'highlight') {
                    computedStyle.backgroundColor = style.color || '#fff'
                    computedStyle.color = (style.color === '#FFFFFF' || style.color === '#FFCC00') ? '#000' : '#FFF'
                    computedStyle.padding = '8px 16px'
                    computedStyle.borderRadius = '8px'
                }

                return (
                    <div className="draggable-text" style={computedStyle}>
                        {element.data?.text || 'Text'}
                    </div>
                )
            }
            case 'sticker':
                return (
                    <div className="draggable-sticker">
                        {element.data?.content || '📷'}
                    </div>
                )
            case 'emoji':
                return (
                    <div className="draggable-emoji">
                        {element.data?.emoji || '😊'}
                    </div>
                )
            default:
                return <div className="draggable-placeholder">?</div>
        }
    }

    return (
        <>
            <div
                ref={elementRef}
                className={`draggable-element ${isDragging ? 'dragging' : ''} ${isScaling ? 'scaling' : ''} ${isOverDelete ? 'over-delete' : ''}`}
                style={{
                    transform: `translate(${element.x}px, ${element.y}px) scale(${element.scale}) rotate(${element.rotation}deg)`,
                    transformOrigin: 'center center',
                    // Invisible padding for larger touch hit area
                    padding: '24px',
                    margin: '-24px',
                    boxSizing: 'content-box'
                }}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
            >
                {renderContent()}
            </div>

            {/* Delete zone - appears when dragging */}
            {isDragging && (
                <div className={`delete-zone ${isOverDelete ? 'delete-zone-active' : ''}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                </div>
            )}
        </>
    )
}

export default memo(DraggableElement)

