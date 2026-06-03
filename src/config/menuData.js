// Default Menu Data - Argentine Style Café
// All prices stored as integer cents (minor units) — currency set per business
// This seeded data allows instant demos and avoids empty states

import { formatCurrency } from '../utils/currency.js';

export const defaultMenuData = {
    categories: [
        {
            id: "bebidas-calientes",
            name: "Bebidas Calientes",
            icon: "☕",
            enabled: true, // Category-level toggle for owner/super
            items: [
                { id: "cafe-solo", name: "Café solo", price: 1500, available: true, featured: false },
                { id: "cafe-cortado", name: "Café cortado", price: 1700, available: true, featured: false },
                { id: "cafe-con-leche", name: "Café con leche", price: 1900, available: true, featured: false },
                { id: "flat-white", name: "Flat white", price: 2200, available: true, featured: true, image: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&q=80" },
                { id: "cappuccino", name: "Cappuccino", price: 2300, available: true, featured: false, image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80" },
                { id: "latte", name: "Latte", price: 2400, available: true, featured: false },
                { id: "submarino", name: "Submarino", price: 2500, available: true, featured: false },
                { id: "te-hebras", name: "Té en hebras", price: 1800, available: true, featured: false },
                { id: "chocolate-caliente", name: "Chocolate caliente", price: 2600, available: true, featured: false },
            ],
        },
        {
            id: "bebidas-frias",
            name: "Bebidas Frías",
            icon: "🧊",
            enabled: true,
            items: [
                { id: "cafe-frio", name: "Café frío", price: 2300, available: true, featured: false },
                { id: "limonada", name: "Limonada", price: 2000, available: true, featured: false },
                { id: "pomelada", name: "Pomelada", price: 2200, available: true, featured: false },
                { id: "agua-mineral", name: "Agua mineral", price: 1200, available: true, featured: false },
            ],
        },
        {
            id: "panaderia",
            name: "Panadería",
            icon: "🥐",
            enabled: true,
            items: [
                { id: "medialuna-manteca", name: "Medialuna de manteca", price: 900, available: true, featured: false, image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80" },
                { id: "medialuna-dulce", name: "Medialuna dulce", price: 900, available: true, featured: false },
                { id: "factura-rellena", name: "Factura rellena", price: 1200, available: true, featured: false },
                { id: "croissant", name: "Croissant", price: 1800, available: true, featured: false },
                { id: "budin-casero", name: "Budín casero", price: 2000, available: true, featured: false },
                { id: "chipa", name: "Chipa", price: 1500, available: true, featured: false },
            ],
        },
        {
            id: "postres",
            name: "Postres",
            icon: "🍰",
            enabled: true,
            items: [
                { id: "alfajor-artesanal", name: "Alfajor artesanal", price: 1400, available: true, featured: false },
                { id: "brownie-nuez", name: "Brownie con nuez", price: 2300, available: true, featured: false, image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80" },
                { id: "cheesecake", name: "Cheesecake", price: 2600, available: true, featured: false },
                { id: "lemon-pie", name: "Lemon pie", price: 2400, available: true, featured: false },
                { id: "tarta-frutas", name: "Tarta de frutas", price: 2800, available: true, featured: false },
            ],
        },
    ],

    // Extras that can be added to items
    extras: [
        { id: "extra-shot", name: "Shot extra de café", price: 400 },
        { id: "leche-almendra", name: "Leche de almendra", price: 300 },
        { id: "leche-avena", name: "Leche de avena", price: 300 },
        { id: "crema-batida", name: "Crema batida", price: 350 },
        { id: "dulce-leche", name: "Dulce de leche", price: 250 },
    ],
};

// Storage key (DEPRECATED)
export const MENU_STORAGE_KEY = "foodspot_menu";

// Get menu
// 🛡️ REFACTOR: This used to read from localStorage.
// Now it returns safe defaults to prevent crashes, but should NOT be used for state.
export function getMenu() {
    return defaultMenuData;
}

// Save menu to storage
// 🛡️ REFACTOR: No-op. We sync to Cloud (Supabase) now.
export function saveMenu(menu) {
    // console.log('⚠️ Legacy saveMenu called - ignoring local persistence');
    return true;
}

// Update a single menu item
export function updateMenuItem(categoryId, itemId, updates) {
    const menu = getMenu();
    const category = menu.categories.find(c => c.id === categoryId);
    if (category) {
        const item = category.items.find(i => i.id === itemId);
        if (item) {
            Object.assign(item, updates);
            saveMenu(menu);
            return true;
        }
    }
    return false;
}

// Add a new menu item to a category
export function addMenuItem(categoryId, newItem) {
    const menu = getMenu();
    const category = menu.categories.find(c => c.id === categoryId);
    if (category) {
        const id = `item-${Date.now()}`;
        category.items.push({
            id,
            name: newItem.name || 'Nuevo item',
            price: newItem.price || 0,
            available: true,
            featured: false,
            image: newItem.image || null,
        });
        saveMenu(menu);
        return id;
    }
    return null;
}

// Add a new category
export function addCategory(name, icon = '📦') {
    const menu = getMenu();
    const id = `category-${Date.now()}`;
    menu.categories.push({
        id,
        name: name || 'Nueva categoría',
        icon: icon || '📦',
        enabled: true,
        items: []
    });
    saveMenu(menu);
    return id;
}

// Update an existing category
export function updateCategory(categoryId, updates) {
    const menu = getMenu();
    const category = menu.categories.find(c => c.id === categoryId);
    if (category) {
        Object.assign(category, updates);
        saveMenu(menu);
        return true;
    }
    return false;
}

// Remove a menu item from a category
export function removeMenuItem(categoryId, itemId) {
    const menu = getMenu();
    const category = menu.categories.find(c => c.id === categoryId);
    if (category) {
        const index = category.items.findIndex(i => i.id === itemId);
        if (index !== -1) {
            category.items.splice(index, 1);
            saveMenu(menu);
            return true;
        }
    }
    return false;
}

// Reorder items within a category (full array dump)
// orderedItemIds: array of item IDs in desired order
export function reorderCategoryItems(categoryId, orderedItemIds) {
    const menu = getMenu();
    const category = menu.categories.find(c => c.id === categoryId);
    if (category) {
        // Create a map of existing items
        const itemMap = {};
        category.items.forEach(item => {
            itemMap[item.id] = item;
        });

        // Rebuild items array in new order
        const reorderedItems = [];
        orderedItemIds.forEach(itemId => {
            if (itemMap[itemId]) {
                reorderedItems.push(itemMap[itemId]);
                delete itemMap[itemId];
            }
        });

        // Append any items not in the ordered list (safety)
        Object.values(itemMap).forEach(item => {
            reorderedItems.push(item);
        });

        category.items = reorderedItems;
        saveMenu(menu);
        return true;
    }
    return false;
}

// Toggle item availability
export function toggleItemAvailability(categoryId, itemId) {
    const menu = getMenu();
    const category = menu.categories.find(c => c.id === categoryId);
    if (category) {
        const item = category.items.find(i => i.id === itemId);
        if (item) {
            item.available = !item.available;
            saveMenu(menu);
            return item.available;
        }
    }
    return null;
}

// Toggle category enabled (owner/super only)
export function toggleCategoryEnabled(categoryId) {
    const menu = getMenu();
    const category = menu.categories.find(c => c.id === categoryId);
    if (category) {
        // Ensure enabled property exists (migration for old data)
        category.enabled = category.enabled === undefined ? true : !category.enabled;
        saveMenu(menu);
        return category.enabled;
    }
    return null;
}

// Set featured item (only one featured at a time)
export function setFeaturedItem(categoryId, itemId) {
    const menu = getMenu();
    // Remove featured from all items
    menu.categories.forEach(cat => {
        cat.items.forEach(item => {
            item.featured = false;
        });
    });
    // Set new featured
    const category = menu.categories.find(c => c.id === categoryId);
    if (category) {
        const item = category.items.find(i => i.id === itemId);
        if (item) {
            item.featured = true;
            saveMenu(menu);
            return true;
        }
    }
    return false;
}

// Get featured item
export function getFeaturedItem() {
    const menu = getMenu();
    for (const category of menu.categories) {
        const featured = category.items.find(i => i.featured);
        if (featured) {
            return { ...featured, categoryName: category.name };
        }
    }
    return null;
}

// Format price from cents — currency-aware (prices stored as integer cents)
export function formatPrice(price, currency = 'ARS') {
    return formatCurrency(price ?? 0, currency);
}

// Reset menu to defaults
export function resetMenu() {
    localStorage.removeItem(MENU_STORAGE_KEY);
    return defaultMenuData;
}
