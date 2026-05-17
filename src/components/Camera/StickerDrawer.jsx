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
    { id: 'dish4_06', type: 'image', src: '/assets/images/dish4/sticker_06.png' },
    // One Piece sticker pack (15)
    { id: 'onepiecesticker_01', type: 'image', src: '/assets/images/onepiecesticker/sticker_01.png' },
    { id: 'onepiecesticker_02', type: 'image', src: '/assets/images/onepiecesticker/sticker_02.png' },
    { id: 'onepiecesticker_03', type: 'image', src: '/assets/images/onepiecesticker/sticker_03.png' },
    { id: 'onepiecesticker_04', type: 'image', src: '/assets/images/onepiecesticker/sticker_04.png' },
    { id: 'onepiecesticker_05', type: 'image', src: '/assets/images/onepiecesticker/sticker_05.png' },
    { id: 'onepiecesticker_06', type: 'image', src: '/assets/images/onepiecesticker/sticker_06.png' },
    { id: 'onepiecesticker_07', type: 'image', src: '/assets/images/onepiecesticker/sticker_07.png' },
    // One Piece food pack (6)
    { id: 'onepiecefood_01', type: 'image', src: '/assets/images/onepiecefood/sticker_01.png' },
    { id: 'onepiecefood_02', type: 'image', src: '/assets/images/onepiecefood/sticker_02.png' },
    { id: 'onepiecefood_03', type: 'image', src: '/assets/images/onepiecefood/sticker_03.png' },
    { id: 'onepiecefood_05', type: 'image', src: '/assets/images/onepiecefood/sticker_05.png' },
    { id: 'onepiecefood_06', type: 'image', src: '/assets/images/onepiecefood/sticker_06.png' },
    // Argentina stick v1 (6)
    { id: 'argstick1_01', type: 'image', src: '/assets/images/argstick1/sticker_01.png' },
    { id: 'argstick1_02', type: 'image', src: '/assets/images/argstick1/sticker_02.png' },
    { id: 'argstick1_03', type: 'image', src: '/assets/images/argstick1/sticker_03.png' },
    { id: 'argstick1_04', type: 'image', src: '/assets/images/argstick1/sticker_04.png' },
    // Boca stick (6)
    { id: 'bocastick_01', type: 'image', src: '/assets/images/bocastick/sticker_01.png' },
    { id: 'bocastick_02', type: 'image', src: '/assets/images/bocastick/sticker_02.png' },
    { id: 'bocastick_03', type: 'image', src: '/assets/images/bocastick/sticker_03.png' },
    { id: 'bocastick_04', type: 'image', src: '/assets/images/bocastick/sticker_04.png' },
    { id: 'bocastick_05', type: 'image', src: '/assets/images/bocastick/sticker_05.png' },
    { id: 'bocastick_06', type: 'image', src: '/assets/images/bocastick/sticker_06.png' },
    // Argentina st (6)
    { id: 'argst_01', type: 'image', src: '/assets/images/argst/sticker_01.png' },
    { id: 'argst_02', type: 'image', src: '/assets/images/argst/sticker_02.png' },
    { id: 'argst_03', type: 'image', src: '/assets/images/argst/sticker_03.png' },
    // Arg (6)
    { id: 'arg_stickers_01', type: 'image', src: '/assets/images/arg/sticker_01.png' },
    { id: 'arg_stickers_02', type: 'image', src: '/assets/images/arg/sticker_02.png' },
    { id: 'arg_stickers_03', type: 'image', src: '/assets/images/arg/sticker_03.png' },
    { id: 'arg_stickers_04', type: 'image', src: '/assets/images/arg/sticker_04.png' },
    { id: 'arg_stickers_05', type: 'image', src: '/assets/images/arg/sticker_05.png' },
    { id: 'arg_stickers_06', type: 'image', src: '/assets/images/arg/sticker_06.png' },
    // AAA pack (6)
    { id: 'aaa_01', type: 'image', src: '/assets/images/aaa/sticker_01.png' },
    { id: 'aaa_02', type: 'image', src: '/assets/images/aaa/sticker_02.png' },
    { id: 'aaa_03', type: 'image', src: '/assets/images/aaa/sticker_03.png' },
    { id: 'aaa_04', type: 'image', src: '/assets/images/aaa/sticker_04.png' },
    { id: 'aaa_05', type: 'image', src: '/assets/images/aaa/sticker_05.png' },
    { id: 'aaa_06', type: 'image', src: '/assets/images/aaa/sticker_06.png' },
    // AAAAAAAAAA pack (6)
    { id: 'aaaaaaaaaa_01', type: 'image', src: '/assets/images/aaaaaaaaaa/sticker_01.png' },
    { id: 'aaaaaaaaaa_02', type: 'image', src: '/assets/images/aaaaaaaaaa/sticker_02.png' },
    { id: 'aaaaaaaaaa_03', type: 'image', src: '/assets/images/aaaaaaaaaa/sticker_03.png' },
    { id: 'aaaaaaaaaa_04', type: 'image', src: '/assets/images/aaaaaaaaaa/sticker_04.png' },
    { id: 'aaaaaaaaaa_05', type: 'image', src: '/assets/images/aaaaaaaaaa/sticker_05.png' },
    { id: 'aaaaaaaaaa_06', type: 'image', src: '/assets/images/aaaaaaaaaa/sticker_06.png' },
    // AAAAAAAAAAA pack (6)
    { id: 'aaaaaaaaaaa_01', type: 'image', src: '/assets/images/aaaaaaaaaaa/sticker_01.png' },
    { id: 'aaaaaaaaaaa_02', type: 'image', src: '/assets/images/aaaaaaaaaaa/sticker_02.png' },
    { id: 'aaaaaaaaaaa_03', type: 'image', src: '/assets/images/aaaaaaaaaaa/sticker_03.png' },
    { id: 'aaaaaaaaaaa_04', type: 'image', src: '/assets/images/aaaaaaaaaaa/sticker_04.png' },
    { id: 'aaaaaaaaaaa_05', type: 'image', src: '/assets/images/aaaaaaaaaaa/sticker_05.png' },
    { id: 'aaaaaaaaaaa_06', type: 'image', src: '/assets/images/aaaaaaaaaaa/sticker_06.png' },
    // AAAA pack (6)
    { id: 'aaaa_01', type: 'image', src: '/assets/images/aaaa/sticker_01.png' },
    { id: 'aaaa_02', type: 'image', src: '/assets/images/aaaa/sticker_02.png' },
    { id: 'aaaa_03', type: 'image', src: '/assets/images/aaaa/sticker_03.png' },
    { id: 'aaaa_04', type: 'image', src: '/assets/images/aaaa/sticker_04.png' },
    { id: 'aaaa_05', type: 'image', src: '/assets/images/aaaa/sticker_05.png' },
    { id: 'aaaa_06', type: 'image', src: '/assets/images/aaaa/sticker_06.png' },
    // AAAAAAAAA pack (6)
    { id: 'aaaaaaaaa_01', type: 'image', src: '/assets/images/aaaaaaaaa/sticker_01.png' },
    { id: 'aaaaaaaaa_02', type: 'image', src: '/assets/images/aaaaaaaaa/sticker_02.png' },
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
    // New Stickers (36)
    { id: 'newstickers_01', type: 'image', src: '/assets/images/newstickers/3434634.png' },
    { id: 'newstickers_02', type: 'image', src: '/assets/images/newstickers/4443.png' },
    { id: 'newstickers_03', type: 'image', src: '/assets/images/newstickers/444545.png' },
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
                    {STICKERS.map((sticker, index) => (
                        <button
                            key={sticker.id}
                            className="sticker-item"
                            onClick={() => handleStickerSelect(sticker)}
                            aria-label={sticker.id}
                            style={{ position: 'relative' }}
                        >
                            {sticker.type === 'image' ? (
                                <img src={sticker.src} alt={sticker.id} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                                {index + 1}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
