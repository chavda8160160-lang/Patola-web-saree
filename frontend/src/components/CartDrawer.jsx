/* ====================================================================================================
 * File Name: CartDrawer.jsx
 * Folder: frontend/src/components/
 * 
 * Purpose:
 * ----------------------------------------------------------------------------------------------------
 * Slide-over shopping bag drawer component.
 * - Displays selected sarees list in cart.
 * - Quantity increment/decrement (+/-) and remove buttons.
 * - Real-time total calculation in selected currency.
 * - Proceed to Royal Checkout button triggering checkout modal.
 * ==================================================================================================== */

import React from 'react';

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onRemove,
  onProceedCheckout,
  formatPrice
}) {
  if (!isOpen) return null;

  const getItemEffectivePrice = (item) => {
    if (!item) return 0;
    if (item.finalPriceINR && Number(item.finalPriceINR) > 0) return Number(item.finalPriceINR);
    const disc = Number(item.discountPercent) || 0;
    const base = Number(item.basePriceINR) || 0;
    if (disc > 0 && base > 0) return Math.round(base - (base * disc / 100));
    return base;
  };

  const totalINR = cart.reduce((sum, item) => sum + getItemEffectivePrice(item) * item.quantity, 0);

  return (
    <div className="cart-drawer-backdrop open" onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cart-header">
          <h3>Your Royal Bag</h3>
          <button className="btn-close-cart" onClick={onClose} aria-label="Close Bag">✕</button>
        </div>

        <div className="cart-items-body">
          {cart.length === 0 ? (
            <div className="cart-empty-state">
              <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p>Your luxury collection bag is currently empty.</p>
              <button className="btn-primary-gold" onClick={onClose}>Explore Sarees</button>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.title} className="cart-item-img" />
                <div className="cart-item-info">
                  <h4 className="cart-item-title">{item.title}</h4>
                  {/* Length Spec */}
                  <div style={{ fontSize: '0.76rem', color: '#6d4c41', marginBottom: '4px', fontWeight: 600 }}>
                    📏 Length: {item.length || (item.title?.toLowerCase().includes('dupatta') ? '2.50 Meters' : '6.30 Meters (with Blouse)')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className="cart-item-price">{formatPrice(getItemEffectivePrice(item) * item.quantity)}</span>
                    {Number(item.discountPercent) > 0 && (
                      <span style={{ textDecoration: 'line-through', color: '#888', fontSize: '0.8rem', marginLeft: '2px' }}>
                        {formatPrice((item.originalPriceINR || item.basePriceINR) * item.quantity)}
                      </span>
                    )}
                    {Number(item.discountPercent) > 0 && (
                      <span style={{
                        background: '#800020',
                        color: '#ffd700',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        border: '1px solid #d4af37'
                      }}>
                        {item.discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  <div className="cart-item-bottom">
                    <div className="cart-qty-ctrl">
                      <button className="btn-qty" onClick={() => onUpdateQty(item.id, -1)}>-</button>
                      <span className="qty-display">{item.quantity}</span>
                      <button className="btn-qty" onClick={() => onUpdateQty(item.id, 1)}>+</button>
                    </div>
                    <button className="btn-remove-item" onClick={() => onRemove(item.id)}>Remove</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-perk-notice">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Includes Handcrafted Velvet Heirloom Box & Silk Mark Seal
            </div>

            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(totalINR)}</span>
            </div>
            <div className="cart-summary-row">
              <span>Insured Heritage Shipping</span>
              <span style={{ color: 'var(--color-emerald)', fontWeight: 600 }}>Complimentary</span>
            </div>

            <div className="cart-total-row">
              <span>Grand Total</span>
              <span>{formatPrice(totalINR)}</span>
            </div>

            <button className="btn-checkout-proceed" onClick={onProceedCheckout}>
              Proceed to Royal Checkout
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
