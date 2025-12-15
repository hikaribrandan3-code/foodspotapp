// Demo Mode Data Generator
// Generates ~30 days of simulated data for demos

import { setItem, STORAGE_KEYS, saveDemoData, setDemoMode } from './storage.js';
import { defaultMenuData, saveMenu } from '../config/menuData.js';

// Generate random date within last N days
function randomDateInRange(daysBack = 30) {
    const now = new Date();
    const pastDate = new Date(now.getTime() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
    return pastDate.toISOString();
}

// Generate a random order
function generateDemoOrder(orderNum) {
    const statuses = ['entregado', 'entregado', 'entregado', 'listo', 'preparacion', 'enviado'];
    const menu = defaultMenuData;

    // Pick random items
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let total = 0;

    for (let i = 0; i < numItems; i++) {
        const category = menu.categories[Math.floor(Math.random() * menu.categories.length)];
        const item = category.items[Math.floor(Math.random() * category.items.length)];
        const quantity = Math.floor(Math.random() * 2) + 1;

        items.push({
            ...item,
            quantity,
            extras: [],
        });
        total += item.price * quantity;
    }

    return {
        id: `demo-${orderNum}`,
        orderNumber: orderNum.toString().padStart(3, '0'),
        items,
        total,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        paid: Math.random() > 0.3,
        createdAt: randomDateInRange(),
        isDemo: true,
    };
}

// Generate demo data set
export function generateDemoData() {
    // Generate orders (30-50 orders over 30 days)
    const numOrders = Math.floor(Math.random() * 20) + 30;
    const orders = [];

    for (let i = 1; i <= numOrders; i++) {
        orders.push(generateDemoOrder(i));
    }

    // Sort by date (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Generate analytics
    const analytics = {
        visits: Math.floor(Math.random() * 200) + 150,
        ordersToday: Math.floor(Math.random() * 8) + 3,
        ordersWeek: Math.floor(Math.random() * 30) + 20,
        ordersMonth: numOrders,
        rewardsRedeemed: Math.floor(Math.random() * 15) + 5,
        instagramShares: Math.floor(Math.random() * 25) + 10,
        lastVisit: new Date().toDateString(),
        lastOrderReset: new Date().toDateString(),
        isDemo: true,
    };

    // Generate rewards
    const rewards = {
        stamps: Math.floor(Math.random() * 8) + 2,
        redeemed: Array(analytics.rewardsRedeemed).fill(null).map(() => ({
            date: randomDateInRange(),
            isDemo: true,
        })),
        isDemo: true,
    };

    return {
        orders,
        analytics,
        rewards,
        generatedAt: new Date().toISOString(),
    };
}

// Enable demo mode
export function enableDemoMode() {
    const demoData = generateDemoData();

    // Save demo data
    saveDemoData(demoData);
    setDemoMode(true);

    // Apply demo data to storage
    setItem(STORAGE_KEYS.ORDERS, demoData.orders);
    setItem(STORAGE_KEYS.ANALYTICS, demoData.analytics);
    setItem(STORAGE_KEYS.REWARDS, demoData.rewards);

    // Reset menu to default for demo
    saveMenu(defaultMenuData);

    console.log('Demo mode enabled with simulated data');
    return demoData;
}

// Disable demo mode
export function disableDemoMode() {
    // Clear all demo data
    setItem(STORAGE_KEYS.ORDERS, []);
    setItem(STORAGE_KEYS.ANALYTICS, {
        visits: 0,
        ordersToday: 0,
        ordersWeek: 0,
        ordersMonth: 0,
        rewardsRedeemed: 0,
        instagramShares: 0,
        lastVisit: null,
        lastOrderReset: null,
    });
    setItem(STORAGE_KEYS.REWARDS, { stamps: 0, redeemed: [] });

    // Reset menu
    saveMenu(defaultMenuData);

    // Clear demo flags
    saveDemoData(null);
    setDemoMode(false);

    console.log('Demo mode disabled, app reset to clean state');
    return true;
}

// Check if data is demo data
export function isDemoData(data) {
    return data && data.isDemo === true;
}
