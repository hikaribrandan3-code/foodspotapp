import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { EMOJI_CATEGORIES, EMOJIS, getAllEmojis } from './utils/emojis.js'
import './EmojiPicker.css'

/**
 * EmojiPicker Component - Hikari CamTech Engine v3.1
 * Bottom-up card per Gemini mock (Image A)
 * Search bar, category row, scrollable grid
 */
export default function EmojiPicker({ isOpen, onClose, onSelect }) {
    const pickerRef = useRef(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState('smileys')
    const [isDragging, setIsDragging] = useState(false)
    const [dragStartY, setDragStartY] = useState(0)
    const [dragOffsetY, setDragOffsetY] = useState(0)

    // Get filtered emojis based on search or category
    const displayedEmojis = useMemo(() => {
        if (searchQuery.trim()) {
            // Search across all emojis
            const query = searchQuery.toLowerCase()
            const all = getAllEmojis()
            return all.filter(emoji => emoji.includes(query)).slice(0, 100)
        }
        return EMOJIS[activeCategory] || []
    }, [searchQuery, activeCategory])

    // Handle swipe to close
    const handleTouchStart = useCallback((e) => {
        if (e.target.closest('.emoji-grid') || e.target.closest('.search-input')) return
        setIsDragging(true)
        setDragStartY(e.touches[0].clientY)
        setDragOffsetY(0)
    }, [])

    const handleTouchMove = useCallback((e) => {
        if (!isDragging) return
        const currentY = e.touches[0].clientY
        const delta = currentY - dragStartY
        // Only allow dragging down (positive delta)
        if (delta > 0) {
            setDragOffsetY(delta)
        }
    }, [isDragging, dragStartY])

    const handleTouchEnd = useCallback(() => {
        if (isDragging) {
            // If dragged more than 100px down, close the picker
            if (dragOffsetY > 100) {
                onClose()
            }
            setIsDragging(false)
            setDragOffsetY(0)
        }
    }, [isDragging, dragOffsetY, onClose])

    // Handle overlay click to close
    const handleOverlayClick = useCallback((e) => {
        if (e.target.classList.contains('emoji-picker-overlay')) {
            onClose()
        }
    }, [onClose])

    // Handle emoji selection
    const handleEmojiSelect = useCallback((emoji) => {
        onSelect(emoji)
        onClose() // Auto-close on selection per PRD
    }, [onSelect, onClose])

    // Handle category change
    const handleCategoryChange = (categoryId) => {
        setActiveCategory(categoryId)
        setSearchQuery('')
    }

    // Reset state when closed
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('')
            setActiveCategory('smileys')
        }
    }, [isOpen])

    // Prevent body scroll when picker is open
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
            className="emoji-picker-overlay"
            onClick={handleOverlayClick}
        >
            <div
                ref={pickerRef}
                className="emoji-picker"
                style={{
                    transform: isDragging ? `translateY(${dragOffsetY}px)` : undefined
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle */}
                <div className="picker-handle">
                    <div className="handle-bar" />
                </div>

                {/* Search Bar */}
                <div className="search-container">
                    <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search emoji"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                    />
                </div>

                {/* Emoji Grid */}
                <div className="emoji-grid scrollable">
                    {displayedEmojis.length > 0 ? (
                        displayedEmojis.map((emoji, index) => (
                            <button
                                key={`${emoji}-${index}`}
                                className="emoji-item"
                                onClick={() => handleEmojiSelect(emoji)}
                                aria-label={emoji}
                            >
                                {emoji}
                            </button>
                        ))
                    ) : (
                        <div className="emoji-empty">
                            <span>No emojis found</span>
                        </div>
                    )}
                </div>

                {/* Category Row - Vector icons only */}
                <div className="category-row">
                    {EMOJI_CATEGORIES.map((category) => (
                        <button
                            key={category.id}
                            className={`category-button ${activeCategory === category.id ? 'category-button-active' : ''}`}
                            onClick={() => handleCategoryChange(category.id)}
                            aria-label={category.label}
                        >
                            {category.icon === 'clock' && (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            )}
                            {category.icon === 'smile' && (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                    <line x1="9" y1="9" x2="9.01" y2="9" />
                                    <line x1="15" y1="9" x2="15.01" y2="9" />
                                </svg>
                            )}
                            {category.icon === 'food' && (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                                    <line x1="6" y1="1" x2="6" y2="4" />
                                    <line x1="10" y1="1" x2="10" y2="4" />
                                    <line x1="14" y1="1" x2="14" y2="4" />
                                </svg>
                            )}
                            {category.icon === 'activity' && (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                                </svg>
                            )}
                            {category.icon === 'travel' && (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
                                    <path d="M16 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
                                    <circle cx="5.5" cy="18.5" r="2.5" />
                                    <circle cx="18.5" cy="18.5" r="2.5" />
                                </svg>
                            )}
                            {category.icon === 'object' && (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="9" y1="18" x2="15" y2="18" />
                                    <line x1="10" y1="22" x2="14" y2="22" />
                                    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                                </svg>
                            )}
                            {category.icon === 'flag' && (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                    <line x1="4" y1="22" x2="4" y2="15" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
