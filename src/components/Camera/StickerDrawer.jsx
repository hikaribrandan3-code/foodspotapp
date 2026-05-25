import { useRef, useEffect, useCallback, useState } from 'react'
import './StickerDrawer.css'

/**
 * StickerDrawer Component - Hikari CamTech Engine v3.1
 * Right-side slide-out drawer per Gemini mock (Image A)
 * Lazy image loading via Intersection Observer (non-blocking)
 * Organized into 3 categories: Food (1-117), Argentina (118-224), Anime (225+)
 */

// Helper function to assign category based on index
const getCategory = (index) => {
  if (index < 117) return 'food'
  if (index < 224) return 'argentina'
  return 'anime'
}

// SVG Icons for categories
const FoodIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L4 8V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L12 2Z" fill="currentColor"/>
    <circle cx="12" cy="14" r="3" fill="white" opacity="0.3"/>
  </svg>
)

const ArgentinaIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="currentColor"/>
    <path d="M12 8L14.5 14.5H21.5L16 18.5L18.5 25L12 21L5.5 25L8 18.5L2.5 14.5H9.5L12 8Z" fill="white" opacity="0.8"/>
  </svg>
)

const AnimeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="10" r="2.5" fill="currentColor"/>
    <circle cx="16" cy="10" r="2.5" fill="currentColor"/>
    <path d="M8 10C8 10 10 16 12 16C14 16 16 10 16 10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M5 5C5 8 6 11 8 13" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
    <path d="M19 5C19 8 18 11 16 13" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
  </svg>
)

const CATEGORY_TABS = [
  { id: 'food', label: 'Food', icon: FoodIcon },
  { id: 'argentina', label: 'Argentina', icon: ArgentinaIcon },
  { id: 'anime', label: 'Anime', icon: AnimeIcon },
]

const LazyImage = ({ src, alt }) => {
  const [imageSrc, setImageSrc] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src)
            observer.unobserve(img)
          }
        })
      },
      { rootMargin: '100px' }
    )

    observer.observe(img)
    return () => {
      if (img) observer.unobserve(img)
    }
  }, [src])

  return (
    <img
      ref={imgRef}
      alt={alt}
      src={imageSrc}
      onLoad={() => setIsLoaded(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        opacity: isLoaded ? 1 : 0.4,
        transition: 'opacity 0.3s ease'
      }}
    />
  )
}

const STICKERS = [
    // === FOOD SECTION (1-117) ===
    { id: 'aaastickerfolder_01', type: 'image', src: '/assets/images/aaastickerfolder/1212.png', category: 'food' },
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
    { id: 'stickers_mega_01', type: 'image', src: '/assets/images/11111111111111/sticker_01.png' },
    { id: 'stickers_mega_02', type: 'image', src: '/assets/images/11111111111111/sticker_02.png' },
    { id: 'stickers_mega_03', type: 'image', src: '/assets/images/11111111111111/sticker_03.png' },
    { id: 'stickers_mega_04', type: 'image', src: '/assets/images/11111111111111/sticker_04.png' },
    { id: 'stickers_mega_05', type: 'image', src: '/assets/images/11111111111111/sticker_05.png' },
    { id: 'stickers_mega_06', type: 'image', src: '/assets/images/11111111111111/sticker_06.png' },
    { id: 'dish1_01', type: 'image', src: '/assets/images/dish1/sticker_01.png' },
    { id: 'dish1_02', type: 'image', src: '/assets/images/dish1/sticker_02.png' },
    { id: 'dish1_03', type: 'image', src: '/assets/images/dish1/sticker_03.png' },
    { id: 'dish1_04', type: 'image', src: '/assets/images/dish1/sticker_04.png' },
    { id: 'dish1_05', type: 'image', src: '/assets/images/dish1/sticker_05.png' },
    { id: 'dish1_06', type: 'image', src: '/assets/images/dish1/sticker_06.png' },
    { id: 'dish2_01', type: 'image', src: '/assets/images/dish2/sticker_01.png' },
    { id: 'dish2_02', type: 'image', src: '/assets/images/dish2/sticker_02.png' },
    { id: 'dish2_03', type: 'image', src: '/assets/images/dish2/sticker_03.png' },
    { id: 'dish2_04', type: 'image', src: '/assets/images/dish2/sticker_04.png' },
    { id: 'dish2_05', type: 'image', src: '/assets/images/dish2/sticker_05.png' },
    { id: 'dish2_06', type: 'image', src: '/assets/images/dish2/sticker_06.png' },
    { id: 'dish3_01', type: 'image', src: '/assets/images/dish3/sticker_01.png' },
    { id: 'dish3_02', type: 'image', src: '/assets/images/dish3/sticker_02.png' },
    { id: 'dish3_03', type: 'image', src: '/assets/images/dish3/sticker_03.png' },
    { id: 'dish3_04', type: 'image', src: '/assets/images/dish3/sticker_04.png' },
    { id: 'dish3_05', type: 'image', src: '/assets/images/dish3/sticker_05.png' },
    { id: 'dish3_06', type: 'image', src: '/assets/images/dish3/sticker_06.png' },
    { id: 'dish4_01', type: 'image', src: '/assets/images/dish4/sticker_01.png' },
    { id: 'dish4_03', type: 'image', src: '/assets/images/dish4/sticker_03.png' },
    { id: 'dish4_04', type: 'image', src: '/assets/images/dish4/sticker_04.png' },
    { id: 'dish4_05', type: 'image', src: '/assets/images/dish4/sticker_05.png' },
    { id: 'dish4_06', type: 'image', src: '/assets/images/dish4/sticker_06.png' },
    { id: 'onepiecesticker_01', type: 'image', src: '/assets/images/onepiecesticker/sticker_01.png' },
    { id: 'onepiecesticker_02', type: 'image', src: '/assets/images/onepiecesticker/sticker_02.png' },
    { id: 'onepiecesticker_06', type: 'image', src: '/assets/images/onepiecesticker/sticker_06.png' },
    { id: 'onepiecefood_01', type: 'image', src: '/assets/images/onepiecefood/sticker_01.png' },
    { id: 'newstickers_04', type: 'image', src: '/assets/images/newstickers/45455477.png' },
    { id: 'newstickers_05', type: 'image', src: '/assets/images/newstickers/453453453.png' },
    { id: 'newstickers_06', type: 'image', src: '/assets/images/newstickers/4565645.png' },
    { id: 'newstickers_07', type: 'image', src: '/assets/images/newstickers/54645465.png' },
    { id: 'newstickers_08', type: 'image', src: '/assets/images/newstickers/544466555.png' },
    { id: 'newstickers_09', type: 'image', src: '/assets/images/newstickers/56454565.png' },
    { id: 'newstickers_10', type: 'image', src: '/assets/images/newstickers/559559595.png' },
    { id: 'newstickers_11', type: 'image', src: '/assets/images/newstickers/595959.png' },
    { id: 'newstickers_12', type: 'image', src: '/assets/images/newstickers/6456456.png' },
    { id: 'newstickers_13', type: 'image', src: '/assets/images/newstickers/65567566.png' },
    { id: 'newstickers_14', type: 'image', src: '/assets/images/newstickers/66444444.png' },
    { id: 'newstickers_15', type: 'image', src: '/assets/images/newstickers/66444566545.png' },
    { id: 'newstickers_16', type: 'image', src: '/assets/images/newstickers/66448484848.png' },
    { id: 'newstickers_17', type: 'image', src: '/assets/images/newstickers/66544454.png' },
    { id: 'newstickers_18', type: 'image', src: '/assets/images/newstickers/66655.png' },
    { id: 'newstickers_19', type: 'image', src: '/assets/images/newstickers/6756656.png' },
    { id: 'newstickers_20', type: 'image', src: '/assets/images/newstickers/67565676.png' },
    { id: 'newstickers_21', type: 'image', src: '/assets/images/newstickers/6868686.png' },
    { id: 'newstickers_22', type: 'image', src: '/assets/images/newstickers/7654.png' },
    { id: 'newstickers_23', type: 'image', src: '/assets/images/newstickers/75745754.png' },
    { id: 'newstickers_24', type: 'image', src: '/assets/images/newstickers/7667567.png' },
    { id: 'newstickers_25', type: 'image', src: '/assets/images/newstickers/876543456.png' },
    { id: 'newstickers_26', type: 'image', src: '/assets/images/newstickers/87654.png' },
    { id: 'newstickers_27', type: 'image', src: '/assets/images/newstickers/8765456765.png' },
    { id: 'newstickers_28', type: 'image', src: '/assets/images/newstickers/8767654.png' },
    { id: 'newstickers_29', type: 'image', src: '/assets/images/newstickers/9876.png' },
    { id: 'newstickers_30', type: 'image', src: '/assets/images/newstickers/sticker_01.png' },
    { id: 'newstickers_31', type: 'image', src: '/assets/images/newstickers/sticker_02.png' },
    { id: 'newstickers_32', type: 'image', src: '/assets/images/newstickers/sticker_03.png' },
    { id: 'newstickers_33', type: 'image', src: '/assets/images/newstickers/sticker_04.png' },
    { id: 'newstickers_34', type: 'image', src: '/assets/images/newstickers/sticker_05.png' },
    { id: 'newstickers_35', type: 'image', src: '/assets/images/newstickers/sticker_06.png' },
    { id: 'newstickers_36', type: 'image', src: '/assets/images/newstickers/w36654545.png' },
    { id: 'newstickers2_01', type: 'image', src: '/assets/images/newstickers2/dddd.png' },
    { id: 'newstickers2_02', type: 'image', src: '/assets/images/newstickers2/ddddd.png' },
    { id: 'newstickers2_03', type: 'image', src: '/assets/images/newstickers2/ddkdkdm.png' },
    { id: 'newstickers2_04', type: 'image', src: '/assets/images/newstickers2/fffff.png' },
    { id: 'newstickers2_05', type: 'image', src: '/assets/images/newstickers2/fjffj.png' },
    { id: 'newstickers2_06', type: 'image', src: '/assets/images/newstickers2/fkfkfk.png' },
    { id: 'newstickers2_07', type: 'image', src: '/assets/images/newstickers2/ggglglglgl.png' },
    { id: 'newstickers2_08', type: 'image', src: '/assets/images/newstickers2/hkkhkhhkhk.png' },
    { id: 'newstickers2_09', type: 'image', src: '/assets/images/newstickers2/ifrjkffkkfkf.png' },
    { id: 'newstickers2_10', type: 'image', src: '/assets/images/newstickers2/jf.png' },
    { id: 'newstickers2_11', type: 'image', src: '/assets/images/newstickers2/jggkkgkgkg.png' },
    { id: 'newstickers2_12', type: 'image', src: '/assets/images/newstickers2/kfkfkfk.png' },
    { id: 'newstickers2_13', type: 'image', src: '/assets/images/newstickers2/kgggkgkgkg.png' },
    { id: 'newstickers2_14', type: 'image', src: '/assets/images/newstickers2/khkhkhkhkh.png' },
    { id: 'newstickers2_15', type: 'image', src: '/assets/images/newstickers2/sksksksks.png' },
    { id: 'newstickers2_16', type: 'image', src: '/assets/images/newstickers2/sssss.png' },
    { id: 'newstickers2_17', type: 'image', src: '/assets/images/newstickers2/sticker_01.png' },
    { id: 'newstickers2_18', type: 'image', src: '/assets/images/newstickers2/sticker_02.png' },
    { id: 'newstickers2_19', type: 'image', src: '/assets/images/newstickers2/sticker_03.png' },
    { id: 'newstickers2_20', type: 'image', src: '/assets/images/newstickers2/sticker_04.png' },
    { id: 'newstickers2_21', type: 'image', src: '/assets/images/newstickers2/sticker_05.png' },
    { id: 'newstickers2_22', type: 'image', src: '/assets/images/newstickers2/sticker_06.png' },
    { id: 'newstickers2_23', type: 'image', src: '/assets/images/newstickers2/tkfkkfkf.png' },
    { id: 'newstickers2_24', type: 'image', src: '/assets/images/newstickers2/xxx.png' },

    // === ARGENTINA SECTION (118-123) ===
    { id: 'argentina_pack_01', type: 'image', src: '/assets/images/argentinastickers1/sticker_01.png' },
    { id: 'argentina_pack_02', type: 'image', src: '/assets/images/argentinastickers1/sticker_02.png' },
    { id: 'argentina_pack_03', type: 'image', src: '/assets/images/argentinastickers1/sticker_03.png' },
    { id: 'argentina_pack_04', type: 'image', src: '/assets/images/argentinastickers1/sticker_04.png' },
    { id: 'argentina_pack_05', type: 'image', src: '/assets/images/argentinastickers1/sticker_05.png' },
    { id: 'argentina_pack_06', type: 'image', src: '/assets/images/argentinastickers1/sticker_06.png' },

    // === ARGENTINA SECTION (224-248) ===
    { id: 'argstick1_01', type: 'image', src: '/assets/images/argstick1/sticker_01.png' },
    { id: 'argstick1_02', type: 'image', src: '/assets/images/argstick1/sticker_02.png' },
    { id: 'argstick1_03', type: 'image', src: '/assets/images/argstick1/sticker_03.png' },
    { id: 'argstick1_04', type: 'image', src: '/assets/images/argstick1/sticker_04.png' },
    { id: 'bocastick_01', type: 'image', src: '/assets/images/bocastick/sticker_01.png' },
    { id: 'bocastick_02', type: 'image', src: '/assets/images/bocastick/sticker_02.png' },
    { id: 'bocastick_03', type: 'image', src: '/assets/images/bocastick/sticker_03.png' },
    { id: 'bocastick_04', type: 'image', src: '/assets/images/bocastick/sticker_04.png' },
    { id: 'bocastick_05', type: 'image', src: '/assets/images/bocastick/sticker_05.png' },
    { id: 'bocastick_06', type: 'image', src: '/assets/images/bocastick/sticker_06.png' },
    { id: 'argst_01', type: 'image', src: '/assets/images/argst/sticker_01.png' },
    { id: 'argst_02', type: 'image', src: '/assets/images/argst/sticker_02.png' },
    { id: 'argst_03', type: 'image', src: '/assets/images/argst/sticker_03.png' },
    { id: 'arg_stickers_01', type: 'image', src: '/assets/images/arg/sticker_01.png' },
    { id: 'arg_stickers_02', type: 'image', src: '/assets/images/arg/sticker_02.png' },
    { id: 'arg_stickers_03', type: 'image', src: '/assets/images/arg/sticker_03.png' },
    { id: 'arg_stickers_04', type: 'image', src: '/assets/images/arg/sticker_04.png' },
    { id: 'arg_stickers_05', type: 'image', src: '/assets/images/arg/sticker_05.png' },
    { id: 'arg_stickers_06', type: 'image', src: '/assets/images/arg/sticker_06.png' },
    { id: 'aaa_01', type: 'image', src: '/assets/images/aaa/sticker_01.png' },
    { id: 'aaa_02', type: 'image', src: '/assets/images/aaa/sticker_02.png' },
    { id: 'aaa_03', type: 'image', src: '/assets/images/aaa/sticker_03.png' },
    { id: 'aaa_04', type: 'image', src: '/assets/images/aaa/sticker_04.png' },
    { id: 'aaa_05', type: 'image', src: '/assets/images/aaa/sticker_05.png' },
    { id: 'aaa_06', type: 'image', src: '/assets/images/aaa/sticker_06.png' },

    // === ARGENTINA SECTION (249-277) ===
    { id: 'aaaaaaaaaa_01', type: 'image', src: '/assets/images/aaaaaaaaaa/sticker_01.png' },
    { id: 'aaaaaaaaaa_02', type: 'image', src: '/assets/images/aaaaaaaaaa/sticker_02.png' },
    { id: 'aaaaaaaaaa_03', type: 'image', src: '/assets/images/aaaaaaaaaa/sticker_03.png' },
    { id: 'aaaaaaaaaa_04', type: 'image', src: '/assets/images/aaaaaaaaaa/sticker_04.png' },
    { id: 'aaaaaaaaaa_05', type: 'image', src: '/assets/images/aaaaaaaaaa/sticker_05.png' },
    { id: 'aaaaaaaaaa_06', type: 'image', src: '/assets/images/aaaaaaaaaa/sticker_06.png' },
    { id: 'aaaaaaaaaaa_01', type: 'image', src: '/assets/images/aaaaaaaaaaa/sticker_01.png' },
    { id: 'aaaaaaaaaaa_02', type: 'image', src: '/assets/images/aaaaaaaaaaa/sticker_02.png' },
    { id: 'aaaaaaaaaaa_03', type: 'image', src: '/assets/images/aaaaaaaaaaa/sticker_03.png' },
    { id: 'aaaaaaaaaaa_04', type: 'image', src: '/assets/images/aaaaaaaaaaa/sticker_04.png' },
    { id: 'aaaaaaaaaaa_05', type: 'image', src: '/assets/images/aaaaaaaaaaa/sticker_05.png' },
    { id: 'aaaa_01', type: 'image', src: '/assets/images/aaaa/sticker_01.png' },
    { id: 'aaaa_02', type: 'image', src: '/assets/images/aaaa/sticker_02.png' },
    { id: 'aaaa_03', type: 'image', src: '/assets/images/aaaa/sticker_03.png' },
    { id: 'aaaa_04', type: 'image', src: '/assets/images/aaaa/sticker_04.png' },
    { id: 'aaaa_05', type: 'image', src: '/assets/images/aaaa/sticker_05.png' },
    { id: 'aaaa_06', type: 'image', src: '/assets/images/aaaa/sticker_06.png' },
    { id: 'aaaaaaaaa_01', type: 'image', src: '/assets/images/aaaaaaaaa/sticker_01.png' },
    { id: 'aaaaaaaaa_02', type: 'image', src: '/assets/images/aaaaaaaaa/sticker_02.png' },
    { id: 'aaaaaaaaa_03', type: 'image', src: '/assets/images/aaaaaaaaa/sticker_03.png' },
    { id: 'aaaaaaaaa_04', type: 'image', src: '/assets/images/aaaaaaaaa/sticker_04.png' },
    { id: 'aaaaaaaaa_05', type: 'image', src: '/assets/images/aaaaaaaaa/sticker_05.png' },
    { id: 'aaaaaaaaa_06', type: 'image', src: '/assets/images/aaaaaaaaa/sticker_06.png' },
    { id: 'aaasasdsd_01', type: 'image', src: '/assets/images/aaasasdsd/sticker_01.png' },
    { id: 'aaasasdsd_02', type: 'image', src: '/assets/images/aaasasdsd/sticker_02.png' },
    { id: 'aaasasdsd_03', type: 'image', src: '/assets/images/aaasasdsd/sticker_03.png' },
    { id: 'aaasasdsd_04', type: 'image', src: '/assets/images/aaasasdsd/sticker_04.png' },
    { id: 'aaasasdsd_05', type: 'image', src: '/assets/images/aaasasdsd/sticker_05.png' },
    { id: 'aaasasdsd_06', type: 'image', src: '/assets/images/aaasasdsd/sticker_06.png' },

    // === ANIME SECTION (278+) ===
    { id: 'lambo_v2_01', type: 'image', src: '/assets/images/lambo_stickers/sticker_01.png' },
    { id: 'lambo_v2_02', type: 'image', src: '/assets/images/lambo_stickers/sticker_02.png' },
    { id: 'lambo_v2_03', type: 'image', src: '/assets/images/lambo_stickers/sticker_03.png' },
    { id: 'lambo_v2_04', type: 'image', src: '/assets/images/lambo_stickers/sticker_04.png' },
    { id: 'lambo_v2_05', type: 'image', src: '/assets/images/lambo_stickers/sticker_05.png' },
    { id: 'lambo_v2_06', type: 'image', src: '/assets/images/lambo_stickers/sticker_06.png' },
    { id: 'lambo_v3_01', type: 'image', src: '/assets/images/lambo_v3/sticker_01.png' },
    { id: 'lambo_v3_02', type: 'image', src: '/assets/images/lambo_v3/sticker_02.png' },
    { id: 'lambo_v3_03', type: 'image', src: '/assets/images/lambo_v3/sticker_03.png' },
    { id: 'lambo_v3_04', type: 'image', src: '/assets/images/lambo_v3/sticker_04.png' },
    { id: 'lambo_v3_05', type: 'image', src: '/assets/images/lambo_v3/sticker_05.png' },
    { id: 'lambo_v3_06', type: 'image', src: '/assets/images/lambo_v3/sticker_06.png' },
    { id: 'lambo_v4_01', type: 'image', src: '/assets/images/lambo_v4/sticker_01.png' },
    { id: 'lambo_v4_02', type: 'image', src: '/assets/images/lambo_v4/sticker_02.png' },
    { id: 'lambo_v4_03', type: 'image', src: '/assets/images/lambo_v4/sticker_03.png' },
    { id: 'lambo_v4_04', type: 'image', src: '/assets/images/lambo_v4/sticker_04.png' },
    { id: 'lambo_v4_05', type: 'image', src: '/assets/images/lambo_v4/sticker_05.png' },
    { id: 'lambo_v4_06', type: 'image', src: '/assets/images/lambo_v4/sticker_06.png' },
    { id: 'lambo_v6_01', type: 'image', src: '/assets/images/lambo_v6/sticker_01.png' },
    { id: 'lambo_v6_02', type: 'image', src: '/assets/images/lambo_v6/sticker_02.png' },
    { id: 'lambo_v6_03', type: 'image', src: '/assets/images/lambo_v6/sticker_03.png' },
    { id: 'lambo_v6_04', type: 'image', src: '/assets/images/lambo_v6/sticker_04.png' },
    { id: 'lambo_v6_05', type: 'image', src: '/assets/images/lambo_v6/sticker_05.png' },
    { id: 'lambo_v6_06', type: 'image', src: '/assets/images/lambo_v6/sticker_06.png' },
    { id: 'mobile_v5_01', type: 'image', src: '/assets/images/mobile_v5/sticker_01.png' },
    { id: 'mobile_v5_02', type: 'image', src: '/assets/images/mobile_v5/sticker_02.png' },
    { id: 'mobile_v5_03', type: 'image', src: '/assets/images/mobile_v5/sticker_03.png' },
    { id: 'mobile_v5_04', type: 'image', src: '/assets/images/mobile_v5/sticker_04.png' },
    { id: 'mobile_v5_05', type: 'image', src: '/assets/images/mobile_v5/sticker_05.png' },
    { id: 'mobile_v5_06', type: 'image', src: '/assets/images/mobile_v5/sticker_06.png' },
    { id: 'lambo_v7_01', type: 'image', src: '/assets/images/lambo_v7/sticker_01.png' },
    { id: 'lambo_v7_02', type: 'image', src: '/assets/images/lambo_v7/sticker_02.png' },
    { id: 'lambo_v7_03', type: 'image', src: '/assets/images/lambo_v7/sticker_03.png' },
    { id: 'lambo_v7_04', type: 'image', src: '/assets/images/lambo_v7/sticker_04.png' },
    { id: 'lambo_v7_05', type: 'image', src: '/assets/images/lambo_v7/sticker_05.png' },
    { id: 'lambo_v7_06', type: 'image', src: '/assets/images/lambo_v7/sticker_06.png' },
    { id: 'lambo_v11_01', type: 'image', src: '/assets/images/lambo_v11/sticker_01.png' },
    { id: 'lambo_v11_02', type: 'image', src: '/assets/images/lambo_v11/sticker_02.png' },
    { id: 'lambo_v11_03', type: 'image', src: '/assets/images/lambo_v11/sticker_03.png' },
    { id: 'lambo_v11_04', type: 'image', src: '/assets/images/lambo_v11/sticker_04.png' },
    { id: 'lambo_v11_05', type: 'image', src: '/assets/images/lambo_v11/sticker_05.png' },
    { id: 'lambo_v11_06', type: 'image', src: '/assets/images/lambo_v11/sticker_06.png' },
    { id: 'onepiece_v2_01', type: 'image', src: '/assets/images/onepiece_v2/sticker_01.png' },
    { id: 'onepiece_v2_02', type: 'image', src: '/assets/images/onepiece_v2/sticker_02.png' },
    { id: 'onepiece_v2_03', type: 'image', src: '/assets/images/onepiece_v2/sticker_03.png' },
    { id: 'onepiece_v2_04', type: 'image', src: '/assets/images/onepiece_v2/sticker_04.png' },
    { id: 'onepiece_v2_05', type: 'image', src: '/assets/images/onepiece_v2/sticker_05.png' },
    { id: 'onepiece_v2_06', type: 'image', src: '/assets/images/onepiece_v2/sticker_06.png' },
    { id: 'onepiece_v4_01', type: 'image', src: '/assets/images/onepiece_v4/sticker_01.png' },
    { id: 'onepiece_v4_02', type: 'image', src: '/assets/images/onepiece_v4/sticker_02.png' },
    { id: 'onepiece_v4_03', type: 'image', src: '/assets/images/onepiece_v4/sticker_03.png' },
    { id: 'onepiece_v4_04', type: 'image', src: '/assets/images/onepiece_v4/sticker_04.png' },
    { id: 'onepiece_v4_05', type: 'image', src: '/assets/images/onepiece_v4/sticker_05.png' },
    { id: 'onepiece_v4_06', type: 'image', src: '/assets/images/onepiece_v4/sticker_06.png' },
    { id: 'powerrangers_01', type: 'image', src: '/assets/images/powerrangers/sticker_01.png' },
    { id: 'powerrangers_02', type: 'image', src: '/assets/images/powerrangers/sticker_02.png' },
    { id: 'powerrangers_03', type: 'image', src: '/assets/images/powerrangers/sticker_03.png' },
    { id: 'powerrangers_04', type: 'image', src: '/assets/images/powerrangers/sticker_04.png' },
    { id: 'powerrangers_05', type: 'image', src: '/assets/images/powerrangers/sticker_05.png' },
    { id: 'powerrangers_06', type: 'image', src: '/assets/images/powerrangers/sticker_06.png' },
    { id: 'onepiece_alt_01', type: 'image', src: '/assets/images/onepiece_alt/sticker_01.png' },
    { id: 'onepiece_alt_02', type: 'image', src: '/assets/images/onepiece_alt/sticker_02.png' },
    { id: 'onepiece_alt_03', type: 'image', src: '/assets/images/onepiece_alt/sticker_03.png' },
    { id: 'onepiece_alt_04', type: 'image', src: '/assets/images/onepiece_alt/sticker_04.png' },
    { id: 'onepiece_alt_05', type: 'image', src: '/assets/images/onepiece_alt/sticker_05.png' },
    { id: 'onepiece_alt_06', type: 'image', src: '/assets/images/onepiece_alt/sticker_06.png' },
    { id: 'pokemon_01', type: 'image', src: '/assets/images/pokemon/sticker_01.png' },
    { id: 'pokemon_02', type: 'image', src: '/assets/images/pokemon/sticker_02.png' },
    { id: 'pokemon_03', type: 'image', src: '/assets/images/pokemon/sticker_03.png' },
    { id: 'pokemon_04', type: 'image', src: '/assets/images/pokemon/sticker_04.png' },
    { id: 'pokemon_05', type: 'image', src: '/assets/images/pokemon/sticker_05.png' },
    { id: 'pokemon_06', type: 'image', src: '/assets/images/pokemon/sticker_06.png' },
    { id: 'teentitan_01', type: 'image', src: '/assets/images/teentitan/sticker_01.png' },
    { id: 'teentitan_02', type: 'image', src: '/assets/images/teentitan/sticker_02.png' },
    { id: 'teentitan_03', type: 'image', src: '/assets/images/teentitan/sticker_03.png' },
    { id: 'teentitan_04', type: 'image', src: '/assets/images/teentitan/sticker_04.png' },
    { id: 'teentitan_05', type: 'image', src: '/assets/images/teentitan/sticker_05.png' },
    { id: 'teentitan_06', type: 'image', src: '/assets/images/teentitan/sticker_06.png' },
    { id: 'morestickers_01', type: 'image', src: '/assets/images/morestickers/sticker_01.png' },
    { id: 'morestickers_02', type: 'image', src: '/assets/images/morestickers/sticker_02.png' },
    { id: 'morestickers_03', type: 'image', src: '/assets/images/morestickers/sticker_03.png' },
    { id: 'morestickers_04', type: 'image', src: '/assets/images/morestickers/sticker_04.png' },
    { id: 'morestickers_05', type: 'image', src: '/assets/images/morestickers/sticker_05.png' },
    { id: 'morestickers_06', type: 'image', src: '/assets/images/morestickers/sticker_06.png' },
    { id: 'stickers10_01', type: 'image', src: '/assets/images/stickers10/sticker_01.png' },
    { id: 'stickers10_02', type: 'image', src: '/assets/images/stickers10/sticker_02.png' },
    { id: 'stickers10_03', type: 'image', src: '/assets/images/stickers10/sticker_03.png' },
    { id: 'stickers10_04', type: 'image', src: '/assets/images/stickers10/sticker_04.png' },
    { id: 'stickers10_05', type: 'image', src: '/assets/images/stickers10/sticker_05.png' },
    { id: 'stickers10_06', type: 'image', src: '/assets/images/stickers10/sticker_06.png' },
    { id: 'lambo_v10_01', type: 'image', src: '/assets/images/foodspotlambostickersv10/sticker_01.png' },
    { id: 'lambo_v10_02', type: 'image', src: '/assets/images/foodspotlambostickersv10/sticker_02.png' },
    { id: 'lambo_v10_03', type: 'image', src: '/assets/images/foodspotlambostickersv10/sticker_03.png' },
    { id: 'lambo_v10_04', type: 'image', src: '/assets/images/foodspotlambostickersv10/sticker_04.png' },
    { id: 'lambo_v10_05', type: 'image', src: '/assets/images/foodspotlambostickersv10/sticker_05.png' },
    { id: 'lambo_v10_06', type: 'image', src: '/assets/images/foodspotlambostickersv10/sticker_06.png' },
    { id: 'onepiecefood_02', type: 'image', src: '/assets/images/onepiecefood/sticker_02.png' },
    { id: 'onepiecefood_03', type: 'image', src: '/assets/images/onepiecefood/sticker_03.png' },
    { id: 'onepiecefood_05', type: 'image', src: '/assets/images/onepiecefood/sticker_05.png' },
    { id: 'onepiecefood_06', type: 'image', src: '/assets/images/onepiecefood/sticker_06.png' },
    { id: 'newstickers_01', type: 'image', src: '/assets/images/newstickers/3434634.png' },
    { id: 'newstickers_02', type: 'image', src: '/assets/images/newstickers/4443.png' },
    { id: 'newstickers_03', type: 'image', src: '/assets/images/newstickers/444545.png' },
    // === CAT STICKERS PACK ===
    { id: 'catstickers_01', type: 'image', src: '/assets/images/catstickers.png/sticker_01.png' },
    { id: 'catstickers_02', type: 'image', src: '/assets/images/catstickers.png/sticker_02.png' },
    { id: 'catstickers_03', type: 'image', src: '/assets/images/catstickers.png/sticker_03.png' },
    { id: 'catstickers_04', type: 'image', src: '/assets/images/catstickers.png/sticker_04.png' },
    { id: 'catstickers_05', type: 'image', src: '/assets/images/catstickers.png/sticker_05.png' },
    { id: 'catstickers_06', type: 'image', src: '/assets/images/catstickers.png/sticker_06.png' },
    { id: 'catstickers2_01', type: 'image', src: '/assets/images/catstickers2/sticker_01.png' },
    { id: 'catstickers2_02', type: 'image', src: '/assets/images/catstickers2/sticker_02.png' },
    { id: 'catstickers2_03', type: 'image', src: '/assets/images/catstickers2/sticker_03.png' },
    { id: 'catstickers2_04', type: 'image', src: '/assets/images/catstickers2/sticker_04.png' },
    { id: 'catstickers2_05', type: 'image', src: '/assets/images/catstickers2/sticker_05.png' },
    { id: 'catstickers2_06', type: 'image', src: '/assets/images/catstickers2/sticker_06.png' },
    { id: 'catstickers3_01', type: 'image', src: '/assets/images/catstickers3/sticker_01.png' },
    { id: 'catstickers3_02', type: 'image', src: '/assets/images/catstickers3/sticker_02.png' },
    { id: 'catstickers3_03', type: 'image', src: '/assets/images/catstickers3/sticker_03.png' },
    { id: 'catstickers3_04', type: 'image', src: '/assets/images/catstickers3/sticker_04.png' },
    { id: 'catstickers3_05', type: 'image', src: '/assets/images/catstickers3/sticker_05.png' },
    { id: 'catstickers3_06', type: 'image', src: '/assets/images/catstickers3/sticker_06.png' },
    { id: 'catstickers4_01', type: 'image', src: '/assets/images/catstickers4/sticker_01.png' },
    { id: 'catstickers4_02', type: 'image', src: '/assets/images/catstickers4/sticker_02.png' },
    { id: 'catstickers4_03', type: 'image', src: '/assets/images/catstickers4/sticker_03.png' },
    { id: 'catstickers4_04', type: 'image', src: '/assets/images/catstickers4/sticker_04.png' },
    { id: 'catstickers4_05', type: 'image', src: '/assets/images/catstickers4/sticker_05.png' },
    { id: 'catstickers4_06', type: 'image', src: '/assets/images/catstickers4/sticker_06.png' },
    { id: 'catsticker5_01', type: 'image', src: '/assets/images/catsticker5/sticker_01.png' },
    { id: 'catsticker5_02', type: 'image', src: '/assets/images/catsticker5/sticker_02.png' },
    { id: 'catsticker5_03', type: 'image', src: '/assets/images/catsticker5/sticker_03.png' },
    { id: 'catsticker5_04', type: 'image', src: '/assets/images/catsticker5/sticker_04.png' },
    { id: 'catsticker5_05', type: 'image', src: '/assets/images/catsticker5/sticker_05.png' },
    { id: 'catsticker5_06', type: 'image', src: '/assets/images/catsticker5/sticker_06.png' },
    { id: 'catstickeronpiece2_01', type: 'image', src: '/assets/images/catstickeronpiece2/sticker_01.png' },
    { id: 'catstickeronpiece2_02', type: 'image', src: '/assets/images/catstickeronpiece2/sticker_02.png' },
    { id: 'catstickeronpiece2_03', type: 'image', src: '/assets/images/catstickeronpiece2/sticker_03.png' },
    { id: 'catstickeronpiece2_04', type: 'image', src: '/assets/images/catstickeronpiece2/sticker_04.png' },
    { id: 'catstickeronpiece2_05', type: 'image', src: '/assets/images/catstickeronpiece2/sticker_05.png' },
    { id: 'catstickeronpiece2_06', type: 'image', src: '/assets/images/catstickeronpiece2/sticker_06.png' },
    { id: 'catcabribari2_01', type: 'image', src: '/assets/images/catcabribari2/sticker_01.png' },
    { id: 'catcabribari2_02', type: 'image', src: '/assets/images/catcabribari2/sticker_02.png' },
    { id: 'catcabribari2_03', type: 'image', src: '/assets/images/catcabribari2/sticker_03.png' },
    { id: 'catcabribari2_04', type: 'image', src: '/assets/images/catcabribari2/sticker_04.png' },
    { id: 'catcabribari2_05', type: 'image', src: '/assets/images/catcabribari2/sticker_05.png' },
    { id: 'catcabribari2_06', type: 'image', src: '/assets/images/catcabribari2/sticker_06.png' },
    // === CAT ELEPHANT PACK ===
    { id: 'catelephant1_01', type: 'image', src: '/assets/images/catelephant1/sticker_01.png' },
    { id: 'catelephant1_02', type: 'image', src: '/assets/images/catelephant1/sticker_02.png' },
    { id: 'catelephant1_03', type: 'image', src: '/assets/images/catelephant1/sticker_03.png' },
    { id: 'catelephant1_04', type: 'image', src: '/assets/images/catelephant1/sticker_04.png' },
    { id: 'catelephant1_05', type: 'image', src: '/assets/images/catelephant1/sticker_05.png' },
    { id: 'catelephant1_06', type: 'image', src: '/assets/images/catelephant1/sticker_06.png' },
    // === JESUS STICKERS PACK ===
    { id: 'jesusstickers_01', type: 'image', src: '/assets/images/jesusstickers/sticker_01.png' },
    { id: 'jesusstickers_02', type: 'image', src: '/assets/images/jesusstickers/sticker_02.png' },
    { id: 'jesusstickers_03', type: 'image', src: '/assets/images/jesusstickers/sticker_03.png' },
    { id: 'jesusstickers_04', type: 'image', src: '/assets/images/jesusstickers/sticker_04.png' },
    { id: 'jesusstickers_05', type: 'image', src: '/assets/images/jesusstickers/sticker_05.png' },
    { id: 'jesusstickers_06', type: 'image', src: '/assets/images/jesusstickers/sticker_06.png' },
]


export default function StickerDrawer({ isOpen, onClose, onSelect }) {
    const drawerRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)
    const [dragStartX, setDragStartX] = useState(0)
    const [dragOffsetX, setDragOffsetX] = useState(0)
    const [activeCategory, setActiveCategory] = useState('food')

    // Filter stickers based on active category
    const filteredStickers = STICKERS.filter((_, index) => getCategory(index) === activeCategory)

    // Debug: log when category changes
    useEffect(() => {
        console.log(`Category changed to: ${activeCategory}, showing ${filteredStickers.length} stickers`)
    }, [activeCategory, filteredStickers.length])

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
        if (delta > 0) {
            setDragOffsetX(delta)
        }
    }, [isDragging, dragStartX])

    const handleTouchEnd = useCallback(() => {
        if (isDragging) {
            if (dragOffsetX > 100) {
                onClose()
            }
            setIsDragging(false)
            setDragOffsetX(0)
        }
    }, [isDragging, dragOffsetX, onClose])

    const handleOverlayClick = useCallback((e) => {
        if (e.target.classList.contains('sticker-drawer-overlay')) {
            onClose()
        }
    }, [onClose])

    const handleStickerSelect = useCallback((sticker) => {
        onSelect(sticker)
        onClose()
    }, [onSelect, onClose])

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
                <div className="sticker-drawer-header">
                    <div className="drawer-handle" />
                    <span className="drawer-title">Stickers</span>
                </div>

                {/* Category Tabs */}
                <div className="sticker-category-tabs">
                    {CATEGORY_TABS.map((tab) => {
                        const IconComponent = tab.icon
                        return (
                            <button
                                key={tab.id}
                                className={`category-tab ${activeCategory === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveCategory(tab.id)}
                                title={tab.label}
                            >
                                <IconComponent />
                            </button>
                        )
                    })}
                </div>

                <div className="sticker-grid scrollable">
                    {filteredStickers.map((sticker) => {
                        const originalIndex = STICKERS.indexOf(sticker)
                        return (
                        <button
                            key={sticker.id}
                            className="sticker-item"
                            onClick={() => handleStickerSelect(sticker)}
                            aria-label={sticker.id}
                            style={{ position: 'relative' }}
                        >
                            {sticker.type === 'image' ? (
                                <LazyImage src={sticker.src} alt={sticker.id} />
                            ) : (
                                <span style={{ fontSize: '32px' }}>{sticker.icon}</span>
                            )}
                            <div style={{
                                position: 'absolute',
                                bottom: '2px',
                                right: '2px',
                                background: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 'bold',
                            }}>
                                {originalIndex + 1}
                            </div>
                        </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
