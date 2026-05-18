/**
 * Detect Android in-app browser (Instagram, TikTok, Facebook, etc.)
 * Returns: { isAndroid, isInAppBrowser, appName, shouldRedirectToChrome }
 */
export function detectAndroidInAppBrowser() {
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);

  // Detect specific in-app browsers
  const inAppBrowsers = {
    instagram: /Instagram/i.test(ua),
    tiktok: /TikTok/i.test(ua),
    facebook: /FBAN|FBAV/i.test(ua),
    twitter: /Twitter/i.test(ua),
    snapchat: /Snapchat/i.test(ua),
    linkedin: /LinkedInApp/i.test(ua),
  };

  const appName = Object.keys(inAppBrowsers).find(key => inAppBrowsers[key]) || null;
  const isInAppBrowser = appName !== null;

  return {
    isAndroid,
    isInAppBrowser,
    appName,
    shouldRedirectToChrome: isAndroid && isInAppBrowser,
  };
}

/**
 * Open current URL in Chrome on Android
 * Uses Chrome intent scheme for seamless redirect
 */
export function openInChrome() {
  const currentUrl = window.location.href;

  // Chrome intent scheme for Android
  // Format: intent://host/path#Intent;package=com.android.chrome;scheme=https;end
  try {
    // Extract the path and query from current URL
    const url = new URL(currentUrl);
    const path = url.pathname + url.search;

    const chromeIntent = `intent://${url.host}${path}#Intent;package=com.android.chrome;scheme=${url.protocol.replace(':', '')};end`;

    window.location.href = chromeIntent;
  } catch (e) {
    // Fallback: just use a normal Chrome deep link (less reliable but works)
    window.location.href = `https://www.google.com/url?q=${encodeURIComponent(currentUrl)}&app=2`;
  }
}
