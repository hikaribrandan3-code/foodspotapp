/**
 * Admin Sanitization Utility
 * 
 * Cleans up zombie state from tenant views before loading Admin panel.
 * Prevents m[x] crashes during SPA transitions.
 */

/**
 * Sanitize the global environment before Admin mount.
 * Resets document metadata to prevent tenant watcher triggers.
 */
export function sanitizeForAdmin() {
    // Only run once per session
    if (window.__ADMIN_SANITIZED__) return;

    console.log('🧹 [AdminSanitize] Cleaning zombie state...');

    // 1. Reset document title
    document.title = 'FoodSpot Admin';

    // 2. Reset favicon to default (with null guards)
    const faviconSelectors = [
        "link[rel='icon']",
        "link[rel='shortcut icon']",
        "link[rel~='icon']"
    ];

    faviconSelectors.forEach(selector => {
        const link = document.querySelector(selector);
        if (link) {
            link.href = '/favicon.ico';
        }
    });

    // 3. Clear any global tenant/branding objects (reset to empty)
    window.tenant = {};
    window.config = {};
    window.branding = {};

    // 4. Remove any tenant-specific CSS variables
    const root = document.documentElement;
    root.style.setProperty('--nav-primary-color', '#7C3AED'); // Admin purple
    root.style.setProperty('--nav-icon-color', '#FFFFFF');

    // 5. Mark as sanitized
    window.__ADMIN_SANITIZED__ = true;

    console.log('✅ [AdminSanitize] Environment clean for Admin mount');
}

/**
 * Reset sanitization flag (call when leaving admin)
 */
export function resetSanitization() {
    window.__ADMIN_SANITIZED__ = false;
}
