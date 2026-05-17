import { useRef, useEffect, useCallback, useState } from 'react'
import './StickerDrawer.css'

/**
 * StickerDrawer Component - Hikari CamTech Engine v3.1
 * Right-side slide-out drawer per Gemini mock (Image A)
 * NO categories - single scrollable grid per PRD
 */

// 120+ stickers: 105 food + 15 Argentina-related
const STICKERS = [
    // Food (105)
    // AAA Sticker Folder (27 - branded custom stickers)
    { id: 'aaastickerfolder_01', type: 'image', src: '/assets/images/aaastickerfolder/1212.png' },
    { id: 'aaastickerfolder_02', type: 'image', src: '/assets/images/aaastickerfolder/122.png' },
    { id: 'aaastickerfolder_03', type: 'image', src: '/assets/images/aaastickerfolder/1231231212.png' },
    { id: 'aaastickerfolder_04', type: 'image', src: '/assets/images/aaastickerfolder/12323.png' },
    { id: 'aaastickerfolder_05', type: 'image', src: '/assets/images/aaastickerfolder/123231.png' },
    { id: 'aaastickerfolder_06', type: 'image', src: '/assets/images/aaastickerfolder/1232312.png' },
    { id: 'aaastickerfolder_07', type: 'image', src: '/assets/images/aaastickerfolder/1242124124241.png' },
    { id: 'aaastickerfolder_08', type: 'image', src: '/assets/images/aaastickerfolder/2132323.png' },
    { id: 'aaastickerfolder_09', type: 'image', src: '/assets/images/aaastickerfolder/43.png' },
    { id: 'aaastickerfolder_10', type: 'image', src: '/assets/images/aaastickerfolder/567.png' },
    { id: 'aaastickerfolder_11', type: 'image', src: '/assets/images/aaastickerfolder/6.png' },
    { id: 'aaastickerfolder_12', type: 'image', src: '/assets/images/aaastickerfolder/65.png' },
    { id: 'aaastickerfolder_13', type: 'image', src: '/assets/images/aaastickerfolder/7.png' },
    { id: 'aaastickerfolder_14', type: 'image', src: '/assets/images/aaastickerfolder/7656.png' },
    { id: 'aaastickerfolder_15', type: 'image', src: '/assets/images/aaastickerfolder/776.png' },
    { id: 'aaastickerfolder_16', type: 'image', src: '/assets/images/aaastickerfolder/85566.png' },
    { id: 'aaastickerfolder_17', type: 'image', src: '/assets/images/aaastickerfolder/86554.png' },
    { id: 'aaastickerfolder_18', type: 'image', src: '/assets/images/aaastickerfolder/8766.png' },
    { id: 'aaastickerfolder_19', type: 'image', src: '/assets/images/aaastickerfolder/9.png' },
    { id: 'aaastickerfolder_20', type: 'image', src: '/assets/images/aaastickerfolder/99.png' },
    { id: 'aaastickerfolder_21', type: 'image', src: '/assets/images/aaastickerfolder/aaaaaaassds.png' },
    { id: 'aaastickerfolder_22', type: 'image', src: '/assets/images/aaastickerfolder/sticker_01.png' },
    { id: 'aaastickerfolder_23', type: 'image', src: '/assets/images/aaastickerfolder/sticker_02.png' },
    { id: 'aaastickerfolder_24', type: 'image', src: '/assets/images/aaastickerfolder/sticker_03.png' },
    { id: 'aaastickerfolder_25', type: 'image', src: '/assets/images/aaastickerfolder/sticker_04.png' },
    { id: 'aaastickerfolder_26', type: 'image', src: '/assets/images/aaastickerfolder/sticker_05.png' },
    { id: 'aaastickerfolder_27', type: 'image', src: '/assets/images/aaastickerfolder/sticker_06.png' },
    { id: 'aaaaaaaaa_03', type: 'image', src: '/assets/images/aaaaaaaaa/sticker_03.png' },
    { id: 'aaaaaaaaa_04', type: 'image', src: '/assets/images/aaaaaaaaa/sticker_04.png' },
    { id: 'aaaaaaaaa_05', type: 'image', src: '/assets/images/aaaaaaaaa/sticker_05.png' },
    { id: 'aaaaaaaaa_06', type: 'image', src: '/assets/images/aaaaaaaaa/sticker_06.png' },
    // AAASASDSD pack (6)
    { id: 'aaasasdsd_01', type: 'image', src: '/assets/images/aaasasdsd/sticker_01.png' },
    { id: 'aaasasdsd_02', type: 'image', src: '/assets/images/aaasasdsd/sticker_02.png' },
    { id: 'aaasasdsd_03', type: 'image', src: '/assets/images/aaasasdsd/sticker_03.png' },
    { id: 'aaasasdsd_04', type: 'image', src: '/assets/images/aaasasdsd/sticker_04.png' },
    { id: 'aaasasdsd_05', type: 'image', src: '/assets/images/aaasasdsd/sticker_05.png' },
    { id: 'aaasasdsd_06', type: 'image', src: '/assets/images/aaasasdsd/sticker_06.png' },
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
                            {sticker.type === 'image' ? (
                                <img src={sticker.src} alt={sticker.id} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                <span style={{ fontSize: '32px' }}>{sticker.icon}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
