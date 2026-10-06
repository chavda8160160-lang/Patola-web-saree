/**
 * PATOLA MADE VANKAR - GOOGLE ANALYTICS 4 (GA4) HELPER
 * Official Ecommerce & User Behavior Tracking
 */

// Default or configured Measurement ID (can be overridden via localStorage or env)
let currentMeasurementId = localStorage.getItem('patola_ga_measurement_id') || 'G-0PJ6S6923D';

/**
 * Initialize Google Analytics 4 dynamically
 * @param {string} measurementId - GA4 Measurement ID (format: G-XXXXXXXXXX)
 */
export function initGA(measurementId) {
  if (!measurementId || typeof window === 'undefined') return;

  const isLocalHost = Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]'
  );

  const cleanId = measurementId.trim();
  currentMeasurementId = cleanId;
  localStorage.setItem('patola_ga_measurement_id', cleanId);

  // Setup mock gtag for development on localhost to prevent ERR_CONNECTION_CLOSED
  if (isLocalHost) {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
    }
    return;
  }

  // If on production and gtag script not yet in DOM, inject it
  if (!document.getElementById('ga-gtag-script')) {
    const script = document.createElement('script');
    script.id = 'ga-gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${cleanId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', cleanId, {
      send_page_view: true,
      cookie_flags: 'SameSite=None;Secure'
    });

    console.info(`📊 [Google Analytics 4] Initialized with ID: ${cleanId}`);
  } else {
    if (typeof window.gtag === 'function') {
      window.gtag('config', cleanId);
    }
  }
}

/**
 * Generic GA4 Event Sender
 */
export function trackGAEvent(eventName, eventParams = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', eventName, eventParams);
    } catch (err) {
      // Quiet fail in dev
    }
  }
}

/**
 * Track Page View
 */
export function trackPageView(pageTitle, pagePath = window.location.pathname) {
  trackGAEvent('page_view', {
    page_title: pageTitle,
    page_location: window.location.href,
    page_path: pagePath
  });
}

/**
 * Track Saree Product View (Quick View or Card Click)
 */
export function trackViewItem(saree) {
  if (!saree) return;
  trackGAEvent('view_item', {
    currency: 'INR',
    value: saree.finalPriceINR || saree.basePriceINR || 0,
    items: [
      {
        item_id: String(saree.id),
        item_name: saree.title,
        item_category: saree.category || 'Patola Saree',
        price: saree.finalPriceINR || saree.basePriceINR || 0,
        quantity: 1
      }
    ]
  });
}

/**
 * Track Add to Cart
 */
export function trackAddToCart(saree) {
  if (!saree) return;
  trackGAEvent('add_to_cart', {
    currency: 'INR',
    value: saree.finalPriceINR || saree.basePriceINR || 0,
    items: [
      {
        item_id: String(saree.id),
        item_name: saree.title,
        item_category: saree.category || 'Patola Saree',
        price: saree.finalPriceINR || saree.basePriceINR || 0,
        quantity: 1
      }
    ]
  });
}

/**
 * Track 3D Virtual Drape or 360 Rotation interaction
 */
export function track3DExperience(sareeTitle, mode = '3D_Drape') {
  trackGAEvent('virtual_experience', {
    experience_type: mode,
    saree_title: sareeTitle
  });
}

/**
 * Track Purchase / Order Placed
 */
export function trackPurchase(order) {
  if (!order) return;
  trackGAEvent('purchase', {
    transaction_id: order.orderReference || String(order.id),
    value: order.totalAmountINR || 0,
    currency: 'INR',
    items: Array.isArray(order.items)
      ? order.items.map((i) => ({
          item_id: String(i.sareeId || i.id),
          item_name: i.title || i.sareeTitle,
          price: i.priceINR || 0,
          quantity: i.quantity || 1
        }))
      : []
  });
}

/**
 * Track Virtual Patola Try-On Events
 */
export function trackVirtualTryOn(eventName, params = {}) {
  trackGAEvent(eventName, {
    feature: 'virtual_patola_tryon',
    ...params
  });
}

export function trackTryOnOpened(saree) {
  trackVirtualTryOn('virtual_tryon_opened', {
    item_id: saree?.id ? String(saree.id) : undefined,
    item_name: saree?.title || 'Unknown Saree',
    price: saree?.finalPriceINR || saree?.basePriceINR || 0
  });
}

export function trackTryOnPhotoUploaded(fileMeta = {}) {
  trackVirtualTryOn('virtual_tryon_photo_uploaded', fileMeta);
}

export function trackTryOnStarted(saree) {
  trackVirtualTryOn('virtual_tryon_started', {
    item_id: saree?.id ? String(saree.id) : undefined,
    item_name: saree?.title || 'Unknown Saree'
  });
}

export function trackTryOnCompleted(saree, durationMs = 0) {
  trackVirtualTryOn('virtual_tryon_completed', {
    item_id: saree?.id ? String(saree.id) : undefined,
    item_name: saree?.title || 'Unknown Saree',
    generation_time_ms: durationMs
  });
}

export function trackTryOnFailed(saree, errorMessage = '') {
  trackVirtualTryOn('virtual_tryon_failed', {
    item_id: saree?.id ? String(saree.id) : undefined,
    error_message: errorMessage
  });
}

export function trackTryOnAddToCart(saree) {
  trackVirtualTryOn('virtual_tryon_add_to_cart', {
    item_id: saree?.id ? String(saree.id) : undefined,
    item_name: saree?.title || 'Unknown Saree'
  });
}

export function trackTryOnBuyNow(saree) {
  trackVirtualTryOn('virtual_tryon_buy_now', {
    item_id: saree?.id ? String(saree.id) : undefined,
    item_name: saree?.title || 'Unknown Saree'
  });
}

// Auto-initialize if ID is already saved in localStorage
if (typeof window !== 'undefined' && localStorage.getItem('patola_ga_measurement_id')) {
  initGA(localStorage.getItem('patola_ga_measurement_id'));
}
