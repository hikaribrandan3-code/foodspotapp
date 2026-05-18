/**
 * Detect Android in-app browser (Instagram, TikTok, Facebook, etc.)
 */
export function detectAndroidInAppBrowser() {
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);

  const appPatterns = {
    Instagram: /Instagram/i.test(ua),
    TikTok: /TikTok/i.test(ua),
    Facebook: /FBAN|FBAV/i.test(ua),
    Twitter: /Twitter/i.test(ua),
    Snapchat: /Snapchat/i.test(ua),
    LinkedIn: /LinkedInApp/i.test(ua),
  };

  const appName = Object.keys(appPatterns).find(k => appPatterns[k]) || null;

  return {
    isAndroid,
    isInAppBrowser: appName !== null,
    appName,
    shouldBlock: isAndroid && appName !== null,
  };
}

/**
 * Build a Chrome intent URL for the current page.
 * Use as href on an <a> tag — NOT with window.location (Instagram blocks that).
 * The S.browser_fallback_url handles devices without Chrome installed.
 */
export function getChromeIntentUrl() {
  const url = new URL(window.location.href);
  const fallback = encodeURIComponent(window.location.href);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${url.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}
