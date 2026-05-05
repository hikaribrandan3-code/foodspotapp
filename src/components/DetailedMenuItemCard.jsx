import { useState } from 'react'
import { formatPrice } from '../config/menuData'
import { useLanguage } from '../contexts/LanguageContext'

// 🚀 VAULT-SEAL: Image Optimization Helper
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

const DetailedMenuItemCard = ({
  item,
  onAddToCart,
  isDarkMode = false,
}) => {
  const { t } = useLanguage()
  const [imgError, setImgError] = useState(false)
  const [isFav, setIsFav] = useState(false)

  const imageSrc = (item.image && !item.image.startsWith('blob:') && !imgError)
    ? getOptimizedImageUrl(item.image, { width: 600, quality: 80, format: 'webp' })
    : 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=338&fit=crop&q=80'

  const hasDetails = item.description || item.calories

  return (
    <article
      className={`
        overflow-hidden flex flex-col
        bg-surface-container-lowest dark:bg-zinc-900
        border border-outline-variant/30 dark:border-zinc-700
        rounded-lg shadow-[0_4px_10px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_10px_rgba(0,0,0,0.3)]
        transition-all duration-200
      `}
    >
      {/* Image */}
      <div className="w-full aspect-[16/9] relative">
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

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Title + Favorite */}
        <div className="flex justify-between items-start mb-1">
          <h2 className="font-outfit text-xl font-medium text-on-surface dark:text-zinc-100 pr-3 leading-tight">
            {item.name}
          </h2>
          <button
            aria-label="Save item"
            onClick={() => setIsFav(!isFav)}
            className={`
              transition-colors shrink-0 mt-0.5
              ${isFav
                ? 'text-red-500'
                : 'text-on-surface-variant dark:text-zinc-400 hover:text-red-400'
              }
            `}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={isFav ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </button>
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-on-surface-variant dark:text-zinc-400 mb-2 line-clamp-3 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Calories */}
        {item.calories > 0 && (
          <div className="flex items-center text-on-surface-variant dark:text-zinc-400 mb-3 opacity-80">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 mr-1"
            >
              <path d="M12 2c-1.7 0-3 1.2-3 2.6 0 .3.1.7.2 1-.6.3-1.2.7-1.2 1.4 0 .3.1.5.2.7-.5.3-1 .8-1 1.5 0 .4.2.8.4 1.1-.4.4-.7 1-.7 1.6 0 1.2.8 2.2 1.8 2.5-.1.3-.2.6-.2 1 0 1.7 1.3 3 3 3s3-1.3 3-3c0-.4-.1-.7-.2-1 1-.3 1.8-1.3 1.8-2.5 0-.6-.3-1.2-.7-1.6.2-.3.4-.7.4-1.1 0-.7-.5-1.2-1-1.5.1-.2.2-.4.2-.7 0-.7-.6-1.1-1.2-1.4.1-.3.2-.7.2-1C15 3.2 13.7 2 12 2Z" />
            </svg>
            <span className="text-[13px]">~{item.calories} {t('calories') || 'calories'}</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-grow" />

        {/* Price */}
        <div className="text-base font-bold text-on-surface dark:text-zinc-100 mb-3">
          {formatPrice(item.price)}
        </div>

        {/* Add to Cart */}
        <button
          onClick={() => onAddToCart?.(item)}
          disabled={item.available === false}
          className={`
            w-full py-3 px-4 rounded-lg font-semibold text-sm
            flex items-center justify-center gap-2
            transition-all duration-200
            ${item.available === false
              ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500'
              : 'bg-primary text-white hover:opacity-90 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900'
            }
          `}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-[18px] h-[18px]"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {item.available === false
            ? (t('out_of_stock') || 'Out of Stock')
            : (t('add_to_cart') || 'Add to Cart')
          }
        </button>
      </div>
    </article>
  )
}

export default DetailedMenuItemCard
