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

    // 4. 🔥 STYLE FIREWALL: Remove ALL custom tenant styling before Admin mounts
    const html = document.documentElement;
    const body = document.body;

    // Clear ALL inline styles from html and body (removes tenant CSS variables)
    html.removeAttribute('style');
    body.removeAttribute('style');

    // Force standard admin theme
    html.setAttribute('data-theme', 'admin');
    html.setAttribute('data-admin', 'true');

    // Re-apply only admin-safe CSS variables
    html.style.setProperty('--nav-primary-color', '#7C3AED'); // Admin purple
    html.style.setProperty('--nav-icon-color', '#FFFFFF');
    html.style.setProperty('--canvas-bg', '#1a1a2e');
    html.style.setProperty('--canvas-text', '#ffffff');

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
