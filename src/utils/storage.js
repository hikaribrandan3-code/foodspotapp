// localStorage utility functions for Grub Club App

// 🏢 PHASE 3: Dynamic tenant-aware storage prefix
// Default is "fs_global_" until TenantContext resolves the businessId
let STORAGE_PREFIX = "fs_global_";

/**
 * Initialize tenant-scoped localStorage
 * Called by TenantContext after businessId resolves
 * @param {string} businessId - The tenant's unique business ID
 */
export function setTenantStoragePrefix(businessId) {
    if (!businessId) {
        console.warn('[Storage] No businessId provided, using global prefix')
        return
    }
    STORAGE_PREFIX = `fs_${businessId}_`;
    console.log(`[Storage] 🏢 Initialized for tenant: ${businessId}`)
}


// Generic storage operations
export function getItem(key) {
    try {
        const value = localStorage.getItem(STORAGE_PREFIX + key);
        return value ? JSON.parse(value) : null;
    } catch (e) {
        console.error(`Error getting ${key}:`, e);
        return null;
    }
}

export function setItem(key, value) {
    try {
        // 🛡️ NULL GUARD: Prevent storing null/undefined that could crash Tenant on reload
        if (value === null || value === undefined) {
            console.warn(`[storage.js] Blocked setItem for "${key}" with null/undefined value`);
            return false;
        }
        const stringified = JSON.stringify(value);
        // Block "null" or "undefined" strings
        if (stringified === 'null' || stringified === 'undefined' || stringified === '"null"' || stringified === '"undefined"') {
            console.warn(`[storage.js] Blocked setItem for "${key}" with invalid stringified value`);
            return false;
        }
        localStorage.setItem(STORAGE_PREFIX + key, stringified);
        return true;
    } catch (e) {
        console.error(`Error setting ${key}:`, e);
        return false;
    }
}

export function removeItem(key) {
    try {
        localStorage.removeItem(STORAGE_PREFIX + key);
        return true;
    } catch (e) {
        console.error(`Error removing ${key}:`, e);
        return false;
    }
}

// Storage keys enum
export const STORAGE_KEYS = {
    CONFIG: "config",
    MENU: "menu",
    ORDERS: "orders",
    REWARDS: "rewards",
    ANALYTICS: "analytics",
    DEMO_MODE: "demo_mode",
    DEMO_DATA: "demo_data",
    CURRENT_ORDER: "current_order",
    AUTH: "auth",
};

// Orders
export function getOrders() {
    return getItem(STORAGE_KEYS.ORDERS) || [];
}

export function saveOrders(orders) {
    return setItem(STORAGE_KEYS.ORDERS, orders);
}

export function addOrder(order) {
    const orders = getOrders();
    orders.unshift(order); // Add to beginning (newest first)
    return saveOrders(orders);
}

export function updateOrder(orderId, updates) {
    const orders = getOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
        orders[index] = { ...orders[index], ...updates };

        // ============================================
        // ORDER LIFECYCLE V1: Auto-archive on entregado
        // ============================================
        if (updates.status === ORDER_STATUS.DELIVERED) {

            // 1. Archive the completed order
            const completedOrder = {
                ...orders[index],
                archivedAt: new Date().toISOString()
            };
            const archive = getItem('orders_archive') || [];
            archive.unshift(completedOrder);
            setItem('orders_archive', archive);

            // 2. Remove from active orders
            orders.splice(index, 1);

            // 3. Clear customer cart (for next order)
            removeItem(STORAGE_KEYS.CURRENT_ORDER);
        }
        // ============================================

        return saveOrders(orders);
    }
    return false;
}

export function getOrderById(orderId) {
    const orders = getOrders();
    return orders.find(o => o.id === orderId);
}

// Generate order number (simple 1, 2, 3... like McDonald's)
// Resets when orders are cleared (e.g., monthly reset)
export function generateOrderNumber() {
    let counter = getItem("order_counter") || 0;
    counter++;
    setItem("order_counter", counter);
    return counter;
}

// Reset order counter (call when archiving/clearing orders)
export function resetOrderCounter() {
    setItem("order_counter", 0);
}

// Get current order counter value
export function getOrderCounter() {
    return getItem("order_counter") || 0;
}

// Rewards
export function getRewards() {
    return getItem(STORAGE_KEYS.REWARDS) || { stamps: 0, redeemed: [] };
}

export function saveRewards(rewards) {
    return setItem(STORAGE_KEYS.REWARDS, rewards);
}

export function addStamp() {
    const rewards = getRewards();
    rewards.stamps = (rewards.stamps || 0) + 1;
    return saveRewards(rewards);
}

export function redeemReward() {
    const rewards = getRewards();
    if (rewards.stamps >= 10) {
        rewards.stamps -= 10;
        rewards.redeemed = rewards.redeemed || [];
        rewards.redeemed.push(new Date().toISOString());
        return saveRewards(rewards);
    }
    return false;
}

// Analytics
export function getAnalytics() {
    return getItem(STORAGE_KEYS.ANALYTICS) || {
        visits: 0,
        ordersToday: 0,
        ordersWeek: 0,
        ordersMonth: 0,
        rewardsRedeemed: 0,
        instagramShares: 0,
        lastVisit: null,
        lastOrderReset: null,
    };
}

export function saveAnalytics(analytics) {
    return setItem(STORAGE_KEYS.ANALYTICS, analytics);
}

export function incrementVisit() {
    const analytics = getAnalytics();
    const today = new Date().toDateString();

    if (analytics.lastVisit !== today) {
        analytics.visits++;
        analytics.lastVisit = today;
        saveAnalytics(analytics);
    }
    return analytics.visits;
}

export function incrementOrderCount() {
    const analytics = getAnalytics();
    const now = new Date();
    const today = now.toDateString();
    const weekNum = getWeekNumber(now);
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;

    // Reset counters if needed
    if (analytics.lastOrderReset !== today) {
        analytics.ordersToday = 0;
        analytics.lastOrderReset = today;
    }

    analytics.ordersToday++;
    analytics.ordersWeek++;
    analytics.ordersMonth++;

    saveAnalytics(analytics);
    return analytics;
}

export function incrementInstagramShare() {
    const analytics = getAnalytics();
    analytics.instagramShares++;
    saveAnalytics(analytics);
    return analytics.instagramShares;
}

// Helper for week number
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Current order (cart)
export function getCurrentOrder() {
    return getItem(STORAGE_KEYS.CURRENT_ORDER) || { items: [], extras: [] };
}

export function saveCurrentOrder(order) {
    return setItem(STORAGE_KEYS.CURRENT_ORDER, order);
}

export function clearCurrentOrder() {
    removeItem(STORAGE_KEYS.CURRENT_ORDER);
    removeItem(STORAGE_KEYS.ORDER_STATUS);
    
    // 🛡️ NUCLEAR CLEAR: Also wipe global fallback to prevent "ghost" items
    // This solves the issue where items reappear during tenant resolution.
    try {
        localStorage.removeItem("fs_global_" + STORAGE_KEYS.CURRENT_ORDER);
        localStorage.removeItem("fs_global_" + STORAGE_KEYS.ORDER_STATUS);
    } catch (e) {
        console.warn('[Storage] Nuclear clear failed:', e);
    }
}

export function addToCurrentOrder(item, quantity = 1, selectedExtras = [], selectedVariants = []) {
    const order = getCurrentOrder();
    const existingIndex = order.items.findIndex(
        i => i.id === item.id &&
            JSON.stringify(i.extras) === JSON.stringify(selectedExtras) &&
            JSON.stringify(i.variants) === JSON.stringify(selectedVariants)
    );

    if (existingIndex !== -1) {
        order.items[existingIndex].quantity += quantity;
    } else {
        order.items.push({
            ...item,
            quantity,
            extras: selectedExtras,
            variants: selectedVariants
        });
    }

    return saveCurrentOrder(order);
}

export function removeFromCurrentOrder(index) {
    const order = getCurrentOrder();
    order.items.splice(index, 1);
    return saveCurrentOrder(order);
}

export function updateItemQuantity(index, quantity) {
    const order = getCurrentOrder();
    if (quantity <= 0) {
        order.items.splice(index, 1);
    } else {
        order.items[index].quantity = quantity;
    }
    return saveCurrentOrder(order);
}

// Auth (simple password-based)
export function getAuth() {
    return getItem(STORAGE_KEYS.AUTH) || { role: null, authenticated: false };
}

export function setAuth(role) {
    return setItem(STORAGE_KEYS.AUTH, { role, authenticated: true, timestamp: Date.now() });
}

export function clearAuth() {
    return removeItem(STORAGE_KEYS.AUTH);
}

// Clear all app data
export function clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => {
        removeItem(key);
    });
    // Also clear date-based keys
    removeItem("last_order_date");
    removeItem("order_counter");
    return true;
}

// Demo mode - checks multiple sources for PWA compatibility
// 1. sessionStorage (best-effort accelerator)
// 2. localStorage demo intent (source of truth for PWA)
// 3. localStorage active branding (fallback - implies demo was applied)
export function isDemoMode() {
    return Boolean(
        sessionStorage.getItem('demo_session') ||
        localStorage.getItem('foodspot_demo_active') ||
        localStorage.getItem('foodspot_active_branding')
    );
}

export function setDemoMode(enabled) {
    return setItem(STORAGE_KEYS.DEMO_MODE, enabled);
}

export function getDemoData() {
    return getItem(STORAGE_KEYS.DEMO_DATA) || null;
}

export function saveDemoData(data) {
    return setItem(STORAGE_KEYS.DEMO_DATA, data);
}

export function clearDemoData() {
    removeItem(STORAGE_KEYS.DEMO_DATA);
    removeItem(STORAGE_KEYS.DEMO_MODE);
    return true;
}

// 🛡️ SILO HARDENING: Guest Token Scoping (Audit #2)

export function getCurrentTenantSlug() {
    if (typeof window === 'undefined') return null;
    
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const urlSlug = pathSegments[0];
    if (urlSlug && urlSlug !== 'admin') return urlSlug;
    
    return localStorage.getItem('fs_last_active_slug');
}

export function getTenantTokenKey() {
    const tenantSlug = getCurrentTenantSlug();
    return tenantSlug ? `fs_guest_token_${tenantSlug}` : 'fs_guest_token';
}

export function migrateLegacyToken() {
    if (typeof window === 'undefined') return;
    
    const legacyToken = localStorage.getItem('fs_guest_token');
    const tenantSlug = getCurrentTenantSlug();
    
    if (legacyToken && tenantSlug) {
        const newKey = `fs_guest_token_${tenantSlug}`;
        localStorage.setItem(newKey, legacyToken);
        localStorage.removeItem('fs_guest_token');
        console.log(`[Vault-Seal] Migrated legacy token to: ${tenantSlug}`);
    }
}

export function getScopedGuestToken() {
    const tokenKey = getTenantTokenKey();
    let token = localStorage.getItem(tokenKey);
    
    if (!token) {
        token = crypto.randomUUID 
            ? crypto.randomUUID() 
            : `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(tokenKey, token);
    }
    
    return token;
}

