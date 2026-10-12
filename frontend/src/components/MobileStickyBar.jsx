/* ====================================================================================================
 * File Name: MobileStickyBar.jsx
 * Folder: frontend/src/components/
 * 
 * Mobile-First Fixed Bottom Action Bar:
 * - "Instant WhatsApp Enquiry | ₹ Price"
 * - Displays starting master drape price with current currency
 * - One-tap direct WhatsApp VIP concierge link with prefilled message
 * - Quick "Book Loom Visit" trigger
 * - Smooth luxury animations, pulse effect, iOS safe-area-inset compliance
 * ==================================================================================================== */

import React from 'react';
import { SUPPORT_CONFIG } from './supportConfig';

export default function MobileStickyBar({
  onOpenBooking,
  formatPrice,
  currency = 'INR',
  isHidden = false
}) {
  if (isHidden) return null;

  // Starting price for display
  const startingPriceINR = 85000;
  const formattedPrice = formatPrice ? formatPrice(startingPriceINR) : '₹85,000+';

  const whatsappMessage = encodeURIComponent(
    `Namaste! 🙏 I am exploring Patola Made Vankar handloom master drapes on your website and would like to enquire about available authentic Double Ikat sarees & dupattas.`
  );
  const whatsappUrl = `https://wa.me/${SUPPORT_CONFIG.whatsappRaw}?text=${whatsappMessage}`;

  return (
    <aside 
      className="mobile-sticky-action-bar" 
      aria-label="Mobile Quick Action Bar"
      id="mobile-sticky-bar"
    >
      {/* Left: Starting Price & Heritage Assurance */}
      <div className="mobile-bar-price-pane">
        <span className="mobile-bar-price-label">Starting From</span>
        <div className="mobile-bar-price-val">
          <strong className="mobile-bar-price-num">{formattedPrice}</strong>
        </div>
        <span className="mobile-bar-tagline">100% Pure Double Ikat</span>
      </div>

      {/* Right: Instant WhatsApp Enquiry Button */}
      <div className="mobile-bar-actions">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mobile-bar-whatsapp-btn"
          title="Instant WhatsApp Enquiry with Master Weaver"
          aria-label="Instant WhatsApp Enquiry"
        >
          <span className="mobile-bar-wa-icon-wrap">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.19 8.19 0 0 1-5.82 2.41c-1.45 0-2.88-.38-4.14-1.11l-.3-.17-3.12.82.83-3.04-.19-.31a8.214 8.214 0 0 1-1.26-4.43c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.53c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.49-1.4-1.74-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.32-.23.25-.87.85-.87 2.08s.89 2.41 1.02 2.58c.13.17 1.76 2.68 4.26 3.76.6.26 1.06.41 1.42.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.18-.48-.3z" />
            </svg>
            <span className="mobile-wa-pulse"></span>
          </span>
          <span className="mobile-bar-wa-text-group">
            <span className="mobile-bar-wa-title">Instant WhatsApp</span>
            <span className="mobile-bar-wa-subtitle">Live Loom Enquiry</span>
          </span>
        </a>

        {/* Small Loom Booking Quick Button */}
        {onOpenBooking && (
          <button
            type="button"
            className="mobile-bar-loom-btn"
            onClick={onOpenBooking}
            title="Book Loom Visit"
            aria-label="Book Loom Visit"
          >
            <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>🧵</span>
            <span>Visit Loom</span>
          </button>
        )}
      </div>
    </aside>
  );
}
