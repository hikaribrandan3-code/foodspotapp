// localStorage utility functions for Grub Club App

const STORAGE_PREFIX = "grub_";

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
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
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
    return removeItem(STORAGE_KEYS.CURRENT_ORDER);
}

export function addToCurrentOrder(item, quantity = 1, selectedExtras = []) {
    const order = getCurrentOrder();
    const existingIndex = order.items.findIndex(
        i => i.id === item.id && JSON.stringify(i.extras) === JSON.stringify(selectedExtras)
    );

    if (existingIndex !== -1) {
        order.items[existingIndex].quantity += quantity;
    } else {
        order.items.push({
            ...item,
            quantity,
            extras: selectedExtras,
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

// Demo mode
export function isDemoMode() {
    return getItem(STORAGE_KEYS.DEMO_MODE) || false;
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
