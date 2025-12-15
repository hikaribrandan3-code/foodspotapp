import { useRef, useEffect, useCallback, useState } from 'react'
import './StickerDrawer.css'

/**
 * StickerDrawer Component - Hikari CamTech Engine v3.1
 * Right-side slide-out drawer per Gemini mock (Image A)
 * NO categories - single scrollable grid per PRD
 */

// 24 stickers with inline SVG icons
const STICKERS = [
    { id: 'sticker_01', icon: '⭐' },
    { id: 'sticker_02', icon: '❤️' },
    { id: 'sticker_03', icon: '🔥' },
    { id: 'sticker_04', icon: '✨' },
    { id: 'sticker_05', icon: '💯' },
    { id: 'sticker_06', icon: '🎉' },
    { id: 'sticker_07', icon: '👍' },
    { id: 'sticker_08', icon: '🎵' },
    { id: 'sticker_09', icon: '💎' },
    { id: 'sticker_10', icon: '🌟' },
    { id: 'sticker_11', icon: '💫' },
    { id: 'sticker_12', icon: '🎯' },
    { id: 'sticker_13', icon: '⚡' },
    { id: 'sticker_14', icon: '🌈' },
    { id: 'sticker_15', icon: '☀️' },
    { id: 'sticker_16', icon: '🌙' },
    { id: 'sticker_17', icon: '💜' },
    { id: 'sticker_18', icon: '💙' },
    { id: 'sticker_19', icon: '💚' },
    { id: 'sticker_20', icon: '🧡' },
    { id: 'sticker_21', icon: '🖤' },
    { id: 'sticker_22', icon: '🤍' },
    { id: 'sticker_23', icon: '✅' },
    { id: 'sticker_24', icon: '💬' }
]

export default function StickerDrawer({ isOpen, onClose, onSelect }) {
    const drawerRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)
    const [dragStartX, setDragStartX] = useState(0)
    const [dragOffsetX, setDragOffsetX] = useState(0)

    // Handle swipe to close
    const handleTouchStart = useCallback((e) => {
        setIsDragging(true)
        setDragStartX(e.touches[0].clientX)
        setDragOffsetX(0)
    }, [])

    const handleTouchMove = useCallback((e) => {
        if (!isDragging) return
        const currentX = e.touches[0].clientX
        const delta = currentX - dragStartX
        // Only allow dragging to the right (positive delta)
        if (delta > 0) {
            setDragOffsetX(delta)
        }
    }, [isDragging, dragStartX])

    const handleTouchEnd = useCallback(() => {
        if (isDragging) {
            // If dragged more than 100px, close the drawer
            if (dragOffsetX > 100) {
                onClose()
            }
            setIsDragging(false)
            setDragOffsetX(0)
        }
    }, [isDragging, dragOffsetX, onClose])

    // Handle overlay click to close
    const handleOverlayClick = useCallback((e) => {
        if (e.target.classList.contains('sticker-drawer-overlay')) {
            onClose()
        }
    }, [onClose])

    // Handle sticker selection
    const handleStickerSelect = useCallback((sticker) => {
        onSelect(sticker)
        onClose() // Auto-close on selection per PRD
    }, [onSelect, onClose])

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div
            className="sticker-drawer-overlay"
            onClick={handleOverlayClick}
        >
            <div
                ref={drawerRef}
                className="sticker-drawer"
                style={{
                    transform: isDragging ? `translateX(${dragOffsetX}px)` : undefined
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drawer Header */}
                <div className="sticker-drawer-header">
                    <div className="drawer-handle" />
                    <span className="drawer-title">Stickers</span>
                </div>

                {/* Sticker Grid - Single scrollable grid, NO categories */}
                <div className="sticker-grid scrollable">
                    {STICKERS.map((sticker) => (
                        <button
                            key={sticker.id}
                            className="sticker-item"
                            onClick={() => handleStickerSelect(sticker)}
                            aria-label={sticker.id}
                        >
                            <span style={{ fontSize: '32px' }}>{sticker.icon}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
