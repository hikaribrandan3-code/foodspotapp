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
    { id: 'food_41', icon: '🥙' },
    { id: 'food_42', icon: '🦐' },
    { id: 'food_43', icon: '🦞' },
    { id: 'food_44', icon: '🦀' },
    { id: 'food_45', icon: '🐙' },
    { id: 'food_46', icon: '🦪' },
    { id: 'food_47', icon: '🥠' },
    { id: 'food_48', icon: '🥮' },
    { id: 'food_49', icon: '🍩' },
    { id: 'food_50', icon: '🌰' },
    { id: 'food_51', icon: '🥜' },
    { id: 'food_52', icon: '🍯' },
    { id: 'food_53', icon: '🥛' },
    { id: 'food_54', icon: '🫖' },
    { id: 'food_55', icon: '🍵' },
    { id: 'food_56', icon: '🍶' },
    { id: 'food_57', icon: '🍾' },
    { id: 'food_58', icon: '🍸' },
    { id: 'food_59', icon: '🍹' },
    { id: 'food_60', icon: '🍺' },
    { id: 'food_61', icon: '🍻' },
    { id: 'food_62', icon: '🥂' },
    { id: 'food_63', icon: '🍎' },
    { id: 'food_64', icon: '🍊' },
    { id: 'food_65', icon: '🍋' },
    { id: 'food_66', icon: '🍌' },
    { id: 'food_67', icon: '🍉' },
    { id: 'food_68', icon: '🍇' },
    { id: 'food_69', icon: '🍓' },
    { id: 'food_70', icon: '🍑' },
    { id: 'food_71', icon: '🥭' },
    { id: 'food_72', icon: '🍍' },
    { id: 'food_73', icon: '🥥' },
    { id: 'food_74', icon: '🍐' },
    { id: 'food_75', icon: '🥝' },
    { id: 'food_76', icon: '🥕' },
    { id: 'food_77', icon: '🥔' },
    { id: 'food_78', icon: '🌽' },
    { id: 'food_79', icon: '🫑' },
    { id: 'food_80', icon: '🥒' },
    { id: 'food_81', icon: '🥬' },
    { id: 'food_82', icon: '🥦' },
    { id: 'food_83', icon: '🧄' },
    { id: 'food_84', icon: '🧅' },
    { id: 'food_85', icon: '🍅' },
    { id: 'food_86', icon: '🥑' },
    { id: 'food_87', icon: '🍆' },
    { id: 'food_88', icon: '🥨' },
    { id: 'food_89', icon: '🥯' },
    { id: 'food_90', icon: '🧆' },
    { id: 'food_91', icon: '🍢' },
    { id: 'food_92', icon: '🍙' },
    { id: 'food_93', icon: '🍚' },
    { id: 'food_94', icon: '🍛' },
    { id: 'food_95', icon: '🍥' },
    { id: 'food_96', icon: '🧈' },
    { id: 'food_97', icon: '🍧' },
    { id: 'food_98', icon: '🍡' },
    { id: 'food_99', icon: '🍲' },
    { id: 'food_100', icon: '🥓' },
    { id: 'food_101', icon: '🧇' },
    { id: 'food_102', icon: '🥪' },
    { id: 'food_103', icon: '🧋' },
    { id: 'food_104', icon: '🍖' },
    { id: 'food_105', icon: '🫒' },

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
    { id: 'arg_15', icon: '🔥' },
    // Lambo v2 stickers (6)
    { id: 'lambo_v2_01', type: 'image', src: '/assets/images/lambo_stickers/sticker_01.png' },
    { id: 'lambo_v2_02', type: 'image', src: '/assets/images/lambo_stickers/sticker_02.png' },
    { id: 'lambo_v2_03', type: 'image', src: '/assets/images/lambo_stickers/sticker_03.png' },
    { id: 'lambo_v2_04', type: 'image', src: '/assets/images/lambo_stickers/sticker_04.png' },
    { id: 'lambo_v2_05', type: 'image', src: '/assets/images/lambo_stickers/sticker_05.png' },
    { id: 'lambo_v2_06', type: 'image', src: '/assets/images/lambo_stickers/sticker_06.png' },
    // Lambo v3 stickers (6)
    { id: 'lambo_v3_01', type: 'image', src: '/assets/images/lambo_v3/sticker_01.png' },
    { id: 'lambo_v3_02', type: 'image', src: '/assets/images/lambo_v3/sticker_02.png' },
    { id: 'lambo_v3_03', type: 'image', src: '/assets/images/lambo_v3/sticker_03.png' },
    { id: 'lambo_v3_04', type: 'image', src: '/assets/images/lambo_v3/sticker_04.png' },
    { id: 'lambo_v3_05', type: 'image', src: '/assets/images/lambo_v3/sticker_05.png' },
    { id: 'lambo_v3_06', type: 'image', src: '/assets/images/lambo_v3/sticker_06.png' },
    // Lambo v4 stickers (6)
    { id: 'lambo_v4_01', type: 'image', src: '/assets/images/lambo_v4/sticker_01.png' },
    { id: 'lambo_v4_02', type: 'image', src: '/assets/images/lambo_v4/sticker_02.png' },
    { id: 'lambo_v4_03', type: 'image', src: '/assets/images/lambo_v4/sticker_03.png' },
    { id: 'lambo_v4_04', type: 'image', src: '/assets/images/lambo_v4/sticker_04.png' },
    { id: 'lambo_v4_05', type: 'image', src: '/assets/images/lambo_v4/sticker_05.png' },
    { id: 'lambo_v4_06', type: 'image', src: '/assets/images/lambo_v4/sticker_06.png' },
    // Lambo v6 stickers (6)
    { id: 'lambo_v6_01', type: 'image', src: '/assets/images/lambo_v6/sticker_01.png' },
    { id: 'lambo_v6_02', type: 'image', src: '/assets/images/lambo_v6/sticker_02.png' },
    { id: 'lambo_v6_03', type: 'image', src: '/assets/images/lambo_v6/sticker_03.png' },
    { id: 'lambo_v6_04', type: 'image', src: '/assets/images/lambo_v6/sticker_04.png' },
    { id: 'lambo_v6_05', type: 'image', src: '/assets/images/lambo_v6/sticker_05.png' },
    { id: 'lambo_v6_06', type: 'image', src: '/assets/images/lambo_v6/sticker_06.png' },
    // Mobile v5 stickers (6)
    { id: 'mobile_v5_01', type: 'image', src: '/assets/images/mobile_v5/sticker_01.png' },
    { id: 'mobile_v5_02', type: 'image', src: '/assets/images/mobile_v5/sticker_02.png' },
    { id: 'mobile_v5_03', type: 'image', src: '/assets/images/mobile_v5/sticker_03.png' },
    { id: 'mobile_v5_04', type: 'image', src: '/assets/images/mobile_v5/sticker_04.png' },
    { id: 'mobile_v5_05', type: 'image', src: '/assets/images/mobile_v5/sticker_05.png' },
    { id: 'mobile_v5_06', type: 'image', src: '/assets/images/mobile_v5/sticker_06.png' },
    // Lambo v7 stickers (6)
    { id: 'lambo_v7_01', type: 'image', src: '/assets/images/lambo_v7/sticker_01.png' },
    { id: 'lambo_v7_02', type: 'image', src: '/assets/images/lambo_v7/sticker_02.png' },
    { id: 'lambo_v7_03', type: 'image', src: '/assets/images/lambo_v7/sticker_03.png' },
    { id: 'lambo_v7_04', type: 'image', src: '/assets/images/lambo_v7/sticker_04.png' },
    { id: 'lambo_v7_05', type: 'image', src: '/assets/images/lambo_v7/sticker_05.png' },
    { id: 'lambo_v7_06', type: 'image', src: '/assets/images/lambo_v7/sticker_06.png' },
    // Lambo v11 stickers (6)
    { id: 'lambo_v11_01', type: 'image', src: '/assets/images/lambo_v11/sticker_01.png' },
    { id: 'lambo_v11_02', type: 'image', src: '/assets/images/lambo_v11/sticker_02.png' },
    { id: 'lambo_v11_03', type: 'image', src: '/assets/images/lambo_v11/sticker_03.png' },
    { id: 'lambo_v11_04', type: 'image', src: '/assets/images/lambo_v11/sticker_04.png' },
    { id: 'lambo_v11_05', type: 'image', src: '/assets/images/lambo_v11/sticker_05.png' },
    { id: 'lambo_v11_06', type: 'image', src: '/assets/images/lambo_v11/sticker_06.png' },
    // One Piece v2 stickers (6)
    { id: 'onepiece_v2_01', type: 'image', src: '/assets/images/onepiece_v2/sticker_01.png' },
    { id: 'onepiece_v2_02', type: 'image', src: '/assets/images/onepiece_v2/sticker_02.png' },
    { id: 'onepiece_v2_03', type: 'image', src: '/assets/images/onepiece_v2/sticker_03.png' },
    { id: 'onepiece_v2_04', type: 'image', src: '/assets/images/onepiece_v2/sticker_04.png' },
    { id: 'onepiece_v2_05', type: 'image', src: '/assets/images/onepiece_v2/sticker_05.png' },
    { id: 'onepiece_v2_06', type: 'image', src: '/assets/images/onepiece_v2/sticker_06.png' },
    // One Piece v4 stickers (6)
    { id: 'onepiece_v4_01', type: 'image', src: '/assets/images/onepiece_v4/sticker_01.png' },
    { id: 'onepiece_v4_02', type: 'image', src: '/assets/images/onepiece_v4/sticker_02.png' },
    { id: 'onepiece_v4_03', type: 'image', src: '/assets/images/onepiece_v4/sticker_03.png' },
    { id: 'onepiece_v4_04', type: 'image', src: '/assets/images/onepiece_v4/sticker_04.png' },
    { id: 'onepiece_v4_05', type: 'image', src: '/assets/images/onepiece_v4/sticker_05.png' },
    { id: 'onepiece_v4_06', type: 'image', src: '/assets/images/onepiece_v4/sticker_06.png' },
    // Power Rangers stickers (6)
    { id: 'powerrangers_01', type: 'image', src: '/assets/images/powerrangers/sticker_01.png' },
    { id: 'powerrangers_02', type: 'image', src: '/assets/images/powerrangers/sticker_02.png' },
    { id: 'powerrangers_03', type: 'image', src: '/assets/images/powerrangers/sticker_03.png' },
    { id: 'powerrangers_04', type: 'image', src: '/assets/images/powerrangers/sticker_04.png' },
    { id: 'powerrangers_05', type: 'image', src: '/assets/images/powerrangers/sticker_05.png' },
    { id: 'powerrangers_06', type: 'image', src: '/assets/images/powerrangers/sticker_06.png' },
    // One Piece alt stickers (6)
    { id: 'onepiece_alt_01', type: 'image', src: '/assets/images/onepiece_alt/sticker_01.png' },
    { id: 'onepiece_alt_02', type: 'image', src: '/assets/images/onepiece_alt/sticker_02.png' },
    { id: 'onepiece_alt_03', type: 'image', src: '/assets/images/onepiece_alt/sticker_03.png' },
    { id: 'onepiece_alt_04', type: 'image', src: '/assets/images/onepiece_alt/sticker_04.png' },
    { id: 'onepiece_alt_05', type: 'image', src: '/assets/images/onepiece_alt/sticker_05.png' },
    { id: 'onepiece_alt_06', type: 'image', src: '/assets/images/onepiece_alt/sticker_06.png' },
    // Pokemon stickers (6)
    { id: 'pokemon_01', type: 'image', src: '/assets/images/pokemon/sticker_01.png' },
    { id: 'pokemon_02', type: 'image', src: '/assets/images/pokemon/sticker_02.png' },
    { id: 'pokemon_03', type: 'image', src: '/assets/images/pokemon/sticker_03.png' },
    { id: 'pokemon_04', type: 'image', src: '/assets/images/pokemon/sticker_04.png' },
    { id: 'pokemon_05', type: 'image', src: '/assets/images/pokemon/sticker_05.png' },
    { id: 'pokemon_06', type: 'image', src: '/assets/images/pokemon/sticker_06.png' },
    // Teen Titans stickers (6)
    { id: 'teentitan_01', type: 'image', src: '/assets/images/teentitan/sticker_01.png' },
    { id: 'teentitan_02', type: 'image', src: '/assets/images/teentitan/sticker_02.png' },
    { id: 'teentitan_03', type: 'image', src: '/assets/images/teentitan/sticker_03.png' },
    { id: 'teentitan_04', type: 'image', src: '/assets/images/teentitan/sticker_04.png' },
    { id: 'teentitan_05', type: 'image', src: '/assets/images/teentitan/sticker_05.png' },
    { id: 'teentitan_06', type: 'image', src: '/assets/images/teentitan/sticker_06.png' },
    // More stickers (6)
    { id: 'morestickers_01', type: 'image', src: '/assets/images/morestickers/sticker_01.png' },
    { id: 'morestickers_02', type: 'image', src: '/assets/images/morestickers/sticker_02.png' },
    { id: 'morestickers_03', type: 'image', src: '/assets/images/morestickers/sticker_03.png' },
    { id: 'morestickers_04', type: 'image', src: '/assets/images/morestickers/sticker_04.png' },
    { id: 'morestickers_05', type: 'image', src: '/assets/images/morestickers/sticker_05.png' },
    { id: 'morestickers_06', type: 'image', src: '/assets/images/morestickers/sticker_06.png' },
    // Stickers v10 (6)
    { id: 'stickers10_01', type: 'image', src: '/assets/images/stickers10/sticker_01.png' },
    { id: 'stickers10_02', type: 'image', src: '/assets/images/stickers10/sticker_02.png' },
    { id: 'stickers10_03', type: 'image', src: '/assets/images/stickers10/sticker_03.png' },
    { id: 'stickers10_04', type: 'image', src: '/assets/images/stickers10/sticker_04.png' },
    { id: 'stickers10_05', type: 'image', src: '/assets/images/stickers10/sticker_05.png' },
    { id: 'stickers10_06', type: 'image', src: '/assets/images/stickers10/sticker_06.png' },
    // Lambo v10 stickers (6)
    { id: 'lambo_v10_01', type: 'image', src: '/assets/images/foodspotlambostickersv10/sticker_01.png' },
    { id: 'lambo_v10_02', type: 'image', src: '/assets/images/foodspotlambostickersv10/sticker_02.png' },
    { id: 'lambo_v10_03', type: 'image', src: '/assets/images/foodspotlambostickersv10/sticker_03.png' },
    { id: 'lambo_v10_04', type: 'image', src: '/assets/images/foodspotlambostickersv10/sticker_04.png' },
    { id: 'lambo_v10_05', type: 'image', src: '/assets/images/foodspotlambostickersv10/sticker_05.png' },
    { id: 'lambo_v10_06', type: 'image', src: '/assets/images/foodspotlambostickersv10/sticker_06.png' },
    // 11111 pack (6)
    { id: '11111_01', type: 'image', src: '/assets/images/11111/sticker_01.png' },
    { id: '11111_02', type: 'image', src: '/assets/images/11111/sticker_02.png' },
    { id: '11111_03', type: 'image', src: '/assets/images/11111/sticker_03.png' },
    { id: '11111_04', type: 'image', src: '/assets/images/11111/sticker_04.png' },
    { id: '11111_05', type: 'image', src: '/assets/images/11111/sticker_05.png' },
    { id: '11111_06', type: 'image', src: '/assets/images/11111/sticker_06.png' },
    // 11111111111111 pack (6)
    { id: 'stickers_mega_01', type: 'image', src: '/assets/images/11111111111111/sticker_01.png' },
    { id: 'stickers_mega_02', type: 'image', src: '/assets/images/11111111111111/sticker_02.png' },
    { id: 'stickers_mega_03', type: 'image', src: '/assets/images/11111111111111/sticker_03.png' },
    { id: 'stickers_mega_04', type: 'image', src: '/assets/images/11111111111111/sticker_04.png' },
    { id: 'stickers_mega_05', type: 'image', src: '/assets/images/11111111111111/sticker_05.png' },
    { id: 'stickers_mega_06', type: 'image', src: '/assets/images/11111111111111/sticker_06.png' },
    // Argentina stickers (6)
    { id: 'argentina_pack_01', type: 'image', src: '/assets/images/argentinastickers1/sticker_01.png' },
    { id: 'argentina_pack_02', type: 'image', src: '/assets/images/argentinastickers1/sticker_02.png' },
    { id: 'argentina_pack_03', type: 'image', src: '/assets/images/argentinastickers1/sticker_03.png' },
    { id: 'argentina_pack_04', type: 'image', src: '/assets/images/argentinastickers1/sticker_04.png' },
    { id: 'argentina_pack_05', type: 'image', src: '/assets/images/argentinastickers1/sticker_05.png' },
    { id: 'argentina_pack_06', type: 'image', src: '/assets/images/argentinastickers1/sticker_06.png' },
    // Dish v1 stickers (6)
    { id: 'dish1_01', type: 'image', src: '/assets/images/dish1/sticker_01.png' },
    { id: 'dish1_02', type: 'image', src: '/assets/images/dish1/sticker_02.png' },
    { id: 'dish1_03', type: 'image', src: '/assets/images/dish1/sticker_03.png' },
    { id: 'dish1_04', type: 'image', src: '/assets/images/dish1/sticker_04.png' },
    { id: 'dish1_05', type: 'image', src: '/assets/images/dish1/sticker_05.png' },
    { id: 'dish1_06', type: 'image', src: '/assets/images/dish1/sticker_06.png' },
    // Dish v2 stickers (6)
    { id: 'dish2_01', type: 'image', src: '/assets/images/dish2/sticker_01.png' },
    { id: 'dish2_02', type: 'image', src: '/assets/images/dish2/sticker_02.png' },
    { id: 'dish2_03', type: 'image', src: '/assets/images/dish2/sticker_03.png' },
    { id: 'dish2_04', type: 'image', src: '/assets/images/dish2/sticker_04.png' },
    { id: 'dish2_05', type: 'image', src: '/assets/images/dish2/sticker_05.png' },
    { id: 'dish2_06', type: 'image', src: '/assets/images/dish2/sticker_06.png' },
    // Dish v3 stickers (6)
    { id: 'dish3_01', type: 'image', src: '/assets/images/dish3/sticker_01.png' },
    { id: 'dish3_02', type: 'image', src: '/assets/images/dish3/sticker_02.png' },
    { id: 'dish3_03', type: 'image', src: '/assets/images/dish3/sticker_03.png' },
    { id: 'dish3_04', type: 'image', src: '/assets/images/dish3/sticker_04.png' },
    { id: 'dish3_05', type: 'image', src: '/assets/images/dish3/sticker_05.png' },
    { id: 'dish3_06', type: 'image', src: '/assets/images/dish3/sticker_06.png' },
    // Dish v4 stickers (6)
    { id: 'dish4_01', type: 'image', src: '/assets/images/dish4/sticker_01.png' },
    { id: 'dish4_02', type: 'image', src: '/assets/images/dish4/sticker_02.png' },
    { id: 'dish4_03', type: 'image', src: '/assets/images/dish4/sticker_03.png' },
    { id: 'dish4_04', type: 'image', src: '/assets/images/dish4/sticker_04.png' },
    { id: 'dish4_05', type: 'image', src: '/assets/images/dish4/sticker_05.png' },
    { id: 'dish4_06', type: 'image', src: '/assets/images/dish4/sticker_06.png' }
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
