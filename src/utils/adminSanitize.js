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
    window.theme = {};
    window.styles = {};
    window.customProperties = {};

    // 4. 🧪 ACID WASH: Total purge of ALL tenant pollution from DOM
    const html = document.documentElement;
    const body = document.body;

    // 4a. Physically remove the 'style' attribute to kill ALL custom CSS variables
    html.removeAttribute('style');
    body.removeAttribute('style');

    // 4b. Clear ALL data-attributes that might trigger CSS selectors
    if (html.dataset) {
        Object.keys(html.dataset).forEach(key => delete html.dataset[key]);
    }
    if (body.dataset) {
        Object.keys(body.dataset).forEach(key => delete body.dataset[key]);
    }

    // 4c. Set clean Admin flags for CSS engine (fresh slate)
    html.setAttribute('data-admin-mode', 'true');
    html.setAttribute('data-theme', 'admin');

    // 4d. Force white background as clean slate (prevents flash)
    html.style.backgroundColor = '#1a1a2e';
    html.style.setProperty('--nav-primary-color', '#7C3AED');
    html.style.setProperty('--nav-icon-color', '#FFFFFF');
    html.style.setProperty('--canvas-bg', '#1a1a2e');
    html.style.setProperty('--canvas-text', '#ffffff');

    // 4e. Remove any lingering class names that could trigger tenant styles
    html.className = '';
    body.className = 'admin-mode';

    // 5. Mark as sanitized
    window.__ADMIN_SANITIZED__ = true;

    console.log('✅ [AdminSanitize] ACID WASH complete - Environment clean for Admin mount');
}

/**
 * Reset sanitization flag (call when leaving admin)
 */
export function resetSanitization() {
    window.__ADMIN_SANITIZED__ = false;
}
