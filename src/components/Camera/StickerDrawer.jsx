import { useRef, useEffect, useCallback, useState } from 'react'
import './StickerDrawer.css'

/**
 * StickerDrawer Component - Hikari CamTech Engine v3.1
 * Right-side slide-out drawer per Gemini mock (Image A)
 * NO categories - single scrollable grid per PRD
 */

// 55 stickers: 40 food + 15 Argentina-related
const STICKERS = [
    // Food (40)
    { id: 'food_01', icon: '🍔' },
    { id: 'food_02', icon: '🍕' },
    { id: 'food_03', icon: '🌮' },
    { id: 'food_04', icon: '🍜' },
    { id: 'food_05', icon: '🍟' },
    { id: 'food_06', icon: '🥗' },
    { id: 'food_07', icon: '🍱' },
    { id: 'food_08', icon: '🍛' },
    { id: 'food_09', icon: '🍝' },
    { id: 'food_10', icon: '🍖' },
    { id: 'food_11', icon: '🥩' },
    { id: 'food_12', icon: '🍤' },
    { id: 'food_13', icon: '🥟' },
    { id: 'food_14', icon: '🍚' },
    { id: 'food_15', icon: '🍣' },
    { id: 'food_16', icon: '🍲' },
    { id: 'food_17', icon: '🍳' },
    { id: 'food_18', icon: '🥞' },
    { id: 'food_19', icon: '🍗' },
    { id: 'food_20', icon: '🥘' },
    { id: 'food_21', icon: '🌯' },
    { id: 'food_22', icon: '🌭' },
    { id: 'food_23', icon: '🍿' },
    { id: 'food_24', icon: '🧀' },
    { id: 'food_25', icon: '🍞' },
    { id: 'food_26', icon: '🥐' },
    { id: 'food_27', icon: '🥖' },
    { id: 'food_28', icon: '🍪' },
    { id: 'food_29', icon: '🍰' },
    { id: 'food_30', icon: '🎂' },
    { id: 'food_31', icon: '🍫' },
    { id: 'food_32', icon: '🍬' },
    { id: 'food_33', icon: '🍭' },
    { id: 'food_34', icon: '🍮' },
    { id: 'food_35', icon: '🍦' },
    { id: 'food_36', icon: '🍨' },
    { id: 'food_37', icon: '☕' },
    { id: 'food_38', icon: '🧃' },
    { id: 'food_39', icon: '🥤' },
    { id: 'food_40', icon: '🍷' },

    // Argentina (15)
    { id: 'arg_01', icon: '🇦🇷' },
    { id: 'arg_02', icon: '⚽' },
    { id: 'arg_03', icon: '🧉' },
    { id: 'arg_04', icon: '🎭' },
    { id: 'arg_05', icon: '💃' },
    { id: 'arg_06', icon: '🤠' },
    { id: 'arg_07', icon: '🏆' },
    { id: 'arg_08', icon: '🎸' },
    { id: 'arg_09', icon: '🌶️' },
    { id: 'arg_10', icon: '🐄' },
    { id: 'arg_11', icon: '🌽' },
    { id: 'arg_12', icon: '🎺' },
    { id: 'arg_13', icon: '📻' },
    { id: 'arg_14', icon: '❤️' },
    { id: 'arg_15', icon: '🔥' }
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
