import { useState, useEffect } from 'react'
import { formatPrice } from '../config/menuData'
import { useLanguage } from '../contexts/LanguageContext'
import { Flame, Leaf, Wheat, Star, X, ShoppingCart } from 'lucide-react'

const getOptimizedImageUrl = (url, options = {}) => {
  if (!url || url.startsWith('blob:')) return url
  if (url.includes('unsplash.com')) {
    return url.includes('?') ? url : `${url}?w=600&q=80&fit=crop`
  }
  if (url.includes('.supabase.co/storage/v1/object/public/')) return url
  if (url.includes('width=') || url.includes('quality=')) return url
  const { width = 600, quality = 80, format = 'webp' } = options
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}width=${width}&quality=${quality}&format=${format}`
}

export default function ItemDetailModal({ item, isOpen, onClose, onAddToCart }) {
  const { t } = useLanguage()
  const [imgError, setImgError] = useState(false)
  const [quantity, setQuantity] = useState(1)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Reset quantity when item changes
  useEffect(() => {
    if (isOpen) setQuantity(1)
  }, [item?.id, isOpen])

  if (!isOpen || !item) return null

  const itemImage = item.image || item.image_url
  const imageSrc = (itemImage && !itemImage.startsWith('blob:') && !imgError)
    ? getOptimizedImageUrl(itemImage, { width: 600, quality: 80 })
    : 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=338&fit=crop&q=80'

  const handleAddToCart = () => {
    onAddToCart(item, quantity)
    setQuantity(1)
    onClose()
  }

  const hasAnyTag = item.is_vegan || item.is_gluten_free || item.is_spicy || item.featured
  const kcal = item.calories || item.kcal || 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal — slide up from bottom, scrollable */}
      <div
        className="fixed inset-x-0 z-[999] flex items-end sm:items-center justify-center pointer-events-none"
        style={{
          top: 0,
          bottom: 'calc(var(--nav-height, 60px) + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div
          className="w-full sm:max-w-md sm:mx-auto sm:mb-auto sm:rounded-[2rem] rounded-t-[2rem] bg-white dark:bg-zinc-900 shadow-2xl pointer-events-auto flex flex-col max-h-full"
        >
          {/* Image Header */}
          <div className="relative w-full aspect-[16/10] flex-shrink-0 overflow-hidden rounded-t-[2rem] sm:rounded-[2rem]">
            <img
              src={imageSrc}
              alt={item.name}
              loading="eager"
              decoding="async"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
              style={{ objectPosition: `center ${item.image_offset_y ?? 50}%` }}
              draggable={false}
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Tags — top left */}
            {hasAnyTag && (
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                {item.featured && (
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-white shadow-lg">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Special</span>
                  </span>
                )}
                {item.is_vegan && (
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-white shadow-lg">
                    <Leaf className="h-3 w-3 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Natural</span>
                  </span>
                )}
                {item.is_gluten_free && (
                  <span className="flex items-center gap-1.5 rounded-full bg-stone-900/90 backdrop-blur-md px-3 py-1 text-white shadow-lg border border-white/10">
                    <Wheat className="h-3 w-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Tacc</span>
                  </span>
                )}
                {item.is_spicy && (
                  <span className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-white shadow-lg">
                    <Flame className="h-3 w-3 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Spicy</span>
                  </span>
                )}
              </div>
            )}

            {/* KCAL badge — top right, below close */}
            {kcal > 0 && (
              <div className="absolute top-14 right-4 flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-3 py-1 text-stone-900 shadow-lg border border-white/50">
                <Flame className="h-3 w-3 text-emerald-600 fill-current" />
                <span className="text-[10px] font-black uppercase tracking-widest">{kcal} KCAL</span>
              </div>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 pt-5 pb-4 space-y-4">
            {/* Title + Price */}
            <div className="flex justify-between items-start gap-3">
              <h2 className="text-xl font-bold text-stone-950 dark:text-zinc-100 leading-tight">
                {item.name}
              </h2>
              <span className="text-xl font-bold text-emerald-600 whitespace-nowrap">
                {formatPrice(item.price)}
              </span>
            </div>

            {/* Description */}
            {item.description ? (
              <p className="text-sm text-stone-500 dark:text-zinc-400 leading-relaxed">
                {item.description}
              </p>
            ) : (
              <p className="text-sm text-stone-400 dark:text-zinc-500 italic">
                No description available.
              </p>
            )}

            {/* Tag row (text version for accessibility / clarity) */}
            {hasAnyTag && (
              <div className="flex flex-wrap gap-2">
                {item.is_vegan && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                    <Leaf className="h-3 w-3 fill-current" /> Natural
                  </span>
                )}
                {item.is_gluten_free && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 border border-stone-200 text-stone-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                    <Wheat className="h-3 w-3" /> Tacc
                  </span>
                )}
                {item.is_spicy && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-100 text-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                    <Flame className="h-3 w-3 fill-current" /> Spicy
                  </span>
                )}
                {item.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 text-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                    <Star className="h-3 w-3 fill-current" /> Special
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action Bar — always visible */}
          <div className="flex-shrink-0 px-6 pb-6 pt-2 bg-white dark:bg-zinc-900 border-t border-stone-100 dark:border-zinc-800">
            {/* Quantity Selector */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors font-bold text-lg"
              >
                −
              </button>
              <span className="w-10 text-center text-lg font-bold text-stone-900 dark:text-zinc-100">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors font-bold text-lg"
              >
                +
              </button>
            </div>

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              disabled={item.available === false}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                item.available === false
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              {item.available === false
                ? ((t('out_of_stock') && t('out_of_stock') !== 'out_of_stock') ? t('out_of_stock') : 'Out of Stock')
                : ((t('add_to_cart') && t('add_to_cart') !== 'add_to_cart') ? t('add_to_cart') : 'Add to Cart')
              }
              <span className="ml-1 opacity-80">
                • {formatPrice(item.price * quantity)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
