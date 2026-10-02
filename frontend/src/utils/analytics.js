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

  const cleanId = measurementId.trim();
  currentMeasurementId = cleanId;
  localStorage.setItem('patola_ga_measurement_id', cleanId);

  // If gtag script not yet in DOM, inject it
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
      console.log(`📊 [GA4 Event] ${eventName}`, eventParams);
    } catch (err) {
      console.warn('GA4 Event Error:', err);
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

// Auto-initialize if ID is already saved in localStorage
if (typeof window !== 'undefined' && localStorage.getItem('patola_ga_measurement_id')) {
  initGA(localStorage.getItem('patola_ga_measurement_id'));
}
