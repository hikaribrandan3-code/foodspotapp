-- ========================================================
-- MENU SEED DATA - Argentine Style Café
-- Run this in Supabase SQL Editor to populate menu
-- ========================================================

-- IMPORTANT: Replace 'YOUR_BUSINESS_ID_HERE' with actual business UUID
-- Example: '00000000-0000-0000-0000-000000000001'

DO $$
DECLARE
    biz_id UUID := '00000000-0000-0000-0000-000000000001'; -- CHANGE THIS
BEGIN

-- ========================================================
-- CATEGORIES
-- ========================================================
INSERT INTO categories (id, business_id, name, icon, sort_order, enabled)
VALUES 
    ('cat-bebidas-calientes', biz_id, 'Bebidas Calientes', '☕', 1, true),
    ('cat-bebidas-frias', biz_id, 'Bebidas Frías', '🧊', 2, true),
    ('cat-panaderia', biz_id, 'Panadería', '🥐', 3, true),
    ('cat-postres', biz_id, 'Postres', '🍰', 4, true)
ON CONFLICT (id, business_id) DO NOTHING;

-- ========================================================
-- MENU ITEMS - Bebidas Calientes
-- ========================================================
INSERT INTO menu_items (id, business_id, category_id, name, price, description, available, featured, image_url, sort_order)
VALUES 
    ('cafe-solo', biz_id, 'cat-bebidas-calientes', 'Café solo', 1500, null, true, false, null, 1),
    ('cafe-cortado', biz_id, 'cat-bebidas-calientes', 'Café cortado', 1700, null, true, false, null, 2),
    ('cafe-con-leche', biz_id, 'cat-bebidas-calientes', 'Café con leche', 1900, null, true, false, null, 3),
    ('flat-white', biz_id, 'cat-bebidas-calientes', 'Flat white', 2200, null, true, true, 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&q=80', 4),
    ('cappuccino', biz_id, 'cat-bebidas-calientes', 'Cappuccino', 2300, null, true, false, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80', 5),
    ('latte', biz_id, 'cat-bebidas-calientes', 'Latte', 2400, null, true, false, null, 6),
    ('submarino', biz_id, 'cat-bebidas-calientes', 'Submarino', 2500, null, true, false, null, 7),
    ('te-hebras', biz_id, 'cat-bebidas-calientes', 'Té en hebras', 1800, null, true, false, null, 8),
    ('chocolate-caliente', biz_id, 'cat-bebidas-calientes', 'Chocolate caliente', 2600, null, true, false, null, 9)
ON CONFLICT (id, business_id) DO NOTHING;

-- ========================================================
-- MENU ITEMS - Bebidas Frías
-- ========================================================
INSERT INTO menu_items (id, business_id, category_id, name, price, description, available, featured, image_url, sort_order)
VALUES 
    ('cafe-frio', biz_id, 'cat-bebidas-frias', 'Café frío', 2300, null, true, false, null, 1),
    ('limonada', biz_id, 'cat-bebidas-frias', 'Limonada', 2000, null, true, false, null, 2),
    ('pomelada', biz_id, 'cat-bebidas-frias', 'Pomelada', 2200, null, true, false, null, 3),
    ('agua-mineral', biz_id, 'cat-bebidas-frias', 'Agua mineral', 1200, null, true, false, null, 4)
ON CONFLICT (id, business_id) DO NOTHING;

-- ========================================================
-- MENU ITEMS - Panadería
-- ========================================================
INSERT INTO menu_items (id, business_id, category_id, name, price, description, available, featured, image_url, sort_order)
VALUES 
    ('medialuna-manteca', biz_id, 'cat-panaderia', 'Medialuna de manteca', 900, null, true, false, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80', 1),
    ('medialuna-dulce', biz_id, 'cat-panaderia', 'Medialuna dulce', 900, null, true, false, null, 2),
    ('factura-rellena', biz_id, 'cat-panaderia', 'Factura rellena', 1200, null, true, false, null, 3),
    ('croissant', biz_id, 'cat-panaderia', 'Croissant', 1800, null, true, false, null, 4),
    ('budin-casero', biz_id, 'cat-panaderia', 'Budín casero', 2000, null, true, false, null, 5),
    ('chipa', biz_id, 'cat-panaderia', 'Chipa', 1500, null, true, false, null, 6)
ON CONFLICT (id, business_id) DO NOTHING;

-- ========================================================
-- MENU ITEMS - Postres
-- ========================================================
INSERT INTO menu_items (id, business_id, category_id, name, price, description, available, featured, image_url, sort_order)
VALUES 
    ('alfajor-artesanal', biz_id, 'cat-postres', 'Alfajor artesanal', 1400, null, true, false, null, 1),
    ('brownie-nuez', biz_id, 'cat-postres', 'Brownie con nuez', 2300, null, true, false, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80', 2),
    ('cheesecake', biz_id, 'cat-postres', 'Cheesecake', 2600, null, true, false, null, 3),
    ('lemon-pie', biz_id, 'cat-postres', 'Lemon pie', 2400, null, true, false, null, 4),
    ('tarta-frutas', biz_id, 'cat-postres', 'Tarta de frutas', 2800, null, true, false, null, 5)
ON CONFLICT (id, business_id) DO NOTHING;

-- ========================================================
-- EXTRAS (optional)
-- ========================================================
INSERT INTO menu_items (id, business_id, category_id, name, price, description, available, featured, image_url, sort_order)
VALUES 
    ('extra-shot', biz_id, 'cat-bebidas-calientes', 'Shot extra de café', 400, 'Extra shot de café', true, false, null, 10),
    ('leche-almendra', biz_id, 'cat-bebidas-calientes', 'Leche de almendra', 300, 'Leche de almendra', true, false, null, 11),
    ('leche-avena', biz_id, 'cat-bebidas-calientes', 'Leche de avena', 300, 'Leche de avena', true, false, null, 12),
    ('crema-batida', biz_id, 'cat-postres', 'Crema batida', 350, 'Crema batida', true, false, null, 6),
    ('dulce-leche', biz_id, 'cat-postres', 'Dulce de leche', 250, 'Dulce de leche', true, false, null, 7)
ON CONFLICT (id, business_id) DO NOTHING;

RAISE NOTICE '✅ Menu seeded successfully!';
RAISE NOTICE '💡 Remember to update business_id if using a different tenant';

END $$;