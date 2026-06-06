// Google Analytics 4 + Meta Pixel Event Tracking
// Fires gtag and fbq events for conversions and user actions

export const trackEvent = (eventName, eventData = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventData);
  }
};

export const trackPixelEvent = (pixelEventName, pixelData = {}) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', pixelEventName, pixelData);
  }
};

// Conversion Events (GA4 + MetaPixel)
export const trackSignupStart = () => {
  trackEvent('begin_checkout', {
    currency: 'ARS',
    value: 0,
    coupon: 'trial'
  });
  trackPixelEvent('InitiateCheckout', {
    currency: 'ARS',
    value: 0
  });
};

export const trackSignupComplete = (businessName) => {
  trackEvent('sign_up', {
    method: 'email',
    business_name: businessName
  });
  trackPixelEvent('Sign_Up', {
    currency: 'ARS'
  });
};

export const trackLandingPageView = () => {
  trackEvent('view_item_list', {
    item_list_name: 'FoodSpot Signup Landing',
    items: [
      {
        item_id: 'foodspot-trial',
        item_name: 'FoodSpot Trial Signup',
        item_category: 'onboarding'
      }
    ]
  });
  trackPixelEvent('ViewContent', {
    content_name: 'FoodSpot Signup Landing',
    content_type: 'product'
  });
};

export const trackGetStartedClick = () => {
  trackEvent('view_item', {
    item_id: 'foodspot-trial',
    item_name: 'Get Started CTA',
    item_category: 'cta_click'
  });
  trackPixelEvent('ViewContent', {
    content_name: 'Get Started Button',
    content_type: 'product'
  });
};

export const trackLoginAttempt = () => {
  trackEvent('login', {
    method: 'email'
  });
  trackPixelEvent('Contact', {
    content_name: 'Login Page'
  });
};
