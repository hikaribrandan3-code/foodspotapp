import { useState } from 'react'
import { formatPrice } from '../config/menuData'
import { useLanguage } from '../contexts/LanguageContext'

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

  if (!isOpen || !item) return null

  const imageSrc = (item.image && !item.image.startsWith('blob:') && !imgError)
    ? getOptimizedImageUrl(item.image, { width: 600, quality: 80 })
    : 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=338&fit=crop&q=80'

  const handleAddToCart = () => {
    onAddToCart(item, quantity)
    setQuantity(1)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end pointer-events-none">
        <div className="w-full max-w-lg mx-auto mb-0 pointer-events-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl overflow-hidden">
            {/* Header Close */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant/20 dark:border-zinc-700">
              <h2 className="font-outfit text-lg font-semibold text-on-surface dark:text-zinc-100">
                {item.name}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-5">
              {/* Image */}
              <div className="w-full aspect-square rounded-xl overflow-hidden bg-surface-container">
                <img
                  src={imageSrc}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>

              {/* Calories + Price */}
              <div className="flex items-center justify-between">
                {item.calories > 0 && (
                  <div className="flex items-center text-on-surface-variant dark:text-zinc-400 text-sm">
                    <span className="material-symbols-outlined text-[18px] mr-1">local_fire_department</span>
                    <span>~{item.calories} {t('calories') || 'cal'}</span>
                  </div>
                )}
                <div className="text-2xl font-bold text-on-surface dark:text-zinc-100">
                  {formatPrice(item.price)}
                </div>
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-sm text-on-surface-variant dark:text-zinc-400 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* Quantity Selector */}
              <div className="flex items-center gap-4 bg-surface-container dark:bg-zinc-800 px-4 py-3 rounded-xl">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-high dark:hover:bg-zinc-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">remove</span>
                </button>
                <span className="flex-1 text-center text-on-surface dark:text-zinc-100 font-medium">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container-high dark:hover:bg-zinc-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
              </div>

              {/* Add to Cart Button (Green Pill) */}
              <button
                onClick={handleAddToCart}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-full transition-colors text-sm"
              >
                {t('add_to_cart') || 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
