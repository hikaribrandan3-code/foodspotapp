
import { useState } from 'react'
import { formatPrice } from '../config/menuData'
import { useLanguage } from '../contexts/LanguageContext'
import { Info, Leaf, Wheat, Flame, Star } from 'lucide-react'

// 🚀 VAULT-SEAL: Image Optimization Helper
const getOptimizedImageUrl = (url, options = {}) => {
    if (!url || url.startsWith('blob:')) return url
    // Skip optimization for Unsplash images (they have their own params)
    if (url.includes('unsplash.com')) {
        return url.includes('?') ? url : `${url}?w=400&q=75&fit=crop`
    }
    // Skip optimization for Supabase storage URLs — they need /render/image/ for transforms
    if (url.includes('.supabase.co/storage/v1/object/public/')) {
        return url
    }
    // Skip if already has transformation params
    if (url.includes('width=') || url.includes('quality=')) return url
    const { width = 400, quality = 75, format = 'webp' } = options
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}width=${width}&quality=${quality}&format=${format}`
}

const ItemCard = ({
    item,
    category,
    index,
    isEditMode = false,
    isOwnerMode = false,
    dragState = null,
    addedItem = null,
    onTap,
    onTouchStart,
    onTouchEnd,
    onMouseDown,
    isPlaceholder = false,
    readOnly = false
}) => {
    const { t } = useLanguage()
    // 🛡️ VISUAL LOGIC
    const isDragging = dragState?.itemId === item.id
    const shakeStyle = (isEditMode && !dragState) ? { animation: 'wiggle 0.3s infinite linear alternate', animationDelay: `${Math.random() * 0.1}s` } : {}

    const [imgError, setImgError] = useState(false)
    // Image Source Logic - Optimized
    const itemImage = item.image || item.image_url
    const imageSrc = (itemImage && !itemImage.startsWith('blob:') && !imgError)
        ? getOptimizedImageUrl(itemImage, { width: 300, quality: 75, format: 'webp' })
        : 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop&q=80'

    const hasAnyTag = item.is_vegan || item.is_gluten_free || item.is_spicy || item.featured

    return (
        <div
            data-item-id={item.id}
            onClick={() => !readOnly && !isEditMode && !dragState && onTap && onTap(item)}
            onTouchStart={!readOnly && isEditMode && onTouchStart ? (e) => onTouchStart(e, category?.id, item, index, category?.items) : undefined}
            onTouchEnd={!readOnly && isEditMode ? onTouchEnd : undefined}
            onTouchMove={!readOnly && isEditMode ? onTouchEnd : undefined}
            onMouseDown={!readOnly && isEditMode && onMouseDown ? (e) => onMouseDown(e, category?.id, item, index, category?.items) : undefined}
            style={{
                // 🛡️ VISUAL LOGIC
                opacity: isDragging ? 0.3 : (addedItem === item.id ? 0.7 : 1), // Ghost Effect + Tactile Dip
                transform: addedItem === item.id ? 'scale(0.95)' : 'scale(1)', // Tactile Scale
                transition: isEditMode ? 'none' : 'transform 0.15s ease',
                background: isPlaceholder ? 'rgba(34, 197, 94, 0.15)' : 'white', // Landing Zone Green Tint
                border: isPlaceholder ? '2px dashed #22C55E' : 'none', // Landing Zone Green Border
                borderRadius: 12, overflow: 'hidden',
                boxShadow: isPlaceholder ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                position: 'relative',
                cursor: readOnly ? 'default' : (isEditMode ? 'grab' : 'pointer'),
                touchAction: isEditMode ? 'none' : 'manipulation',
                ...shakeStyle
            }}
        >
            <div style={{ width: '100%', aspectRatio: '1', background: '#E8E4DD', pointerEvents: 'none', opacity: isPlaceholder ? 0 : 1, position: 'relative' }}>
                <img
                    src={imageSrc}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={() => setImgError(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${item.image_offset_y ?? 50}%` }}
                    draggable={false}
                />

                {/* Tag dots on image */}
                {hasAnyTag && !isPlaceholder && (
                    <div style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        pointerEvents: 'none'
                    }}>
                        {item.featured && (
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: 3,
                                background: 'rgba(245,158,11,0.95)', color: 'white',
                                borderRadius: 10, padding: '2px 6px', fontSize: 9,
                                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                            }}>
                                <Star size={9} fill="currentColor" /> Special
                            </span>
                        )}
                        {item.is_vegan && (
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: 3,
                                background: 'rgba(16,185,129,0.95)', color: 'white',
                                borderRadius: 10, padding: '2px 6px', fontSize: 9,
                                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                            }}>
                                <Leaf size={9} fill="currentColor" /> Natural
                            </span>
                        )}
                        {item.is_gluten_free && (
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: 3,
                                background: 'rgba(28,25,23,0.9)', color: 'white',
                                borderRadius: 10, padding: '2px 6px', fontSize: 9,
                                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                            }}>
                                <Wheat size={9} /> Tacc
                            </span>
                        )}
                        {item.is_spicy && (
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: 3,
                                background: 'rgba(239,68,68,0.95)', color: 'white',
                                borderRadius: 10, padding: '2px 6px', fontSize: 9,
                                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                            }}>
                                <Flame size={9} fill="currentColor" /> Spicy
                            </span>
                        )}
                    </div>
                )}
            </div>
            <div style={{ padding: '8px 4px', opacity: isPlaceholder ? 0 : 1, position: 'relative' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#1F2937', marginBottom: 2, lineHeight: 1.3 }}>{item.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 12, color: '#6B7280' }}>{formatPrice(item.price)}</p>
                    {!isEditMode && !readOnly && (item.description || hasAnyTag) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onTap && onTap(item);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 2,
                                color: '#9CA3AF',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="More info"
                        >
                            <Info size={14} />
                        </button>
                    )}
                </div>
            </div>
            {item.available === false && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(255,255,255,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 4,
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        background: '#EF4444', color: 'white',
                        padding: '4px 12px', borderRadius: 20,
                        fontSize: 11, fontWeight: 800, letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        boxShadow: '0 2px 8px rgba(239,68,68,0.3)'
                    }}>{t('out_of_stock')}</div>
                </div>
            )}
        </div>
    )
}

export default ItemCard
