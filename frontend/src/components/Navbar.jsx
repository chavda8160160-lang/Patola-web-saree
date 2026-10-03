/* ====================================================================================================
 * File Name: Navbar.jsx
 * Folder: frontend/src/components/
 * 
 * Purpose:
 * ----------------------------------------------------------------------------------------------------
 * Main application header and navigation bar.
 * - Royal Virasat Patola branding.
 * - Smooth scroll links to Collection, Motif, Craft, and Booking.
 * - Multi-currency selector (₹ INR, $ USD, € EUR, £ GBP).
 * - Shopping bag (Cart Drawer) button and live counter.
 * - Track Order live tracking button.
 * - Book Loom Visit CTA button.
 * ==================================================================================================== */

import React, { useState, useEffect } from 'react';
import { SUPPORT_CONFIG } from './supportConfig';

export default function Navbar({
  currentCurrency,
  onCurrencyChange,
  cartCount,
  wishlistCount = 0,
  onOpenWishlist,
  onOpenCart,
  onOpenBooking,
  onOpenTracking,
  onOpenAdmin,
  onOpenReviews,
  onOpenSupport,
  currentCustomer = null,
  onOpenCustomerAuth,
  onOpenCustomerAccount
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [liveReviewStats, setLiveReviewStats] = useState({ count: 0, avg: '5.0' });

  // Calculate live review count and average purely from real customer reviews
  useEffect(() => {
    const updateStats = () => {
      try {
        const storedMap = JSON.parse(localStorage.getItem('patola_customer_reviews') || '{}');
        const userReviews = Object.values(storedMap);
        const total = userReviews.length;
        if (total === 0) {
          setLiveReviewStats({ count: 0, avg: '5.0' });
          return;
        }
        const totalStars = userReviews.reduce((sum, r) => sum + (r.rating || 5), 0);
        const computedAvg = (totalStars / total).toFixed(1);
        setLiveReviewStats({
          count: total,
          avg: computedAvg
        });
      } catch (e) {
        setLiveReviewStats({ count: 0, avg: '5.0' });
      }
    };

    updateStats();
    window.addEventListener('storage', updateStats);
    return () => window.removeEventListener('storage', updateStats);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Top Luxury Announcement Bar */}
      <div className="top-announcement-bar">
        <div className="announcement-inner">
          <div className="announcement-left">
            <span className="announcement-message">
              <span className="badge-tag">Certified Handloom</span>
               Complimentary Insured Global Express Shipping on All Pure Silk Patolas
            </span>
          </div>
          <div className="announcement-right">
            <div className="currency-selector-wrap">
              <label htmlFor="reactCurrencySelect">🌐 Currency:</label>
              <select
                id="reactCurrencySelect"
                className="currency-select"
                value={currentCurrency}
                onChange={(e) => onCurrencyChange(e.target.value)}
                title="Select currency or Auto-Detect by location"
              >
                <option value="AUTO">🌐 Auto-Detect by Region</option>
                <option value="INR">🇮🇳 ₹ INR (India)</option>
                <option value="USD">🇺🇸 $ USD (USA / NRI)</option>
                <option value="EUR">🇪🇺 € EUR (Europe)</option>
                <option value="GBP">🇬🇧 £ GBP (UK)</option>
              </select>
            </div>
            <a
              href={`https://wa.me/${SUPPORT_CONFIG.whatsappRaw}?text=${encodeURIComponent('Namaste, I need assistance regarding Patola Sarees.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-concierge-link"
            >
              Direct Concierge
            </a>
          </div>
        </div>
      </div>

      {/* Main Glass Navbar */}
      <header className={`main-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          <a href="#hero" className="brand-logo-link" aria-label="PATOLA MADE VANKAR Home">
            <div className="brand-insignia">
              <img 
                src="/assets/images/charkha-logo.png" 
                alt="PATOLA MADE VANKAR Logo" 
                className="brand-emblem-img" 
              />
            </div>
            <div className="brand-text-block">
              <span className="brand-name">
                <span className="brand-diamond-motif">❖</span>
                PATOLA
                <span className="brand-diamond-motif">❖</span>
              </span>
              <span className="brand-tagline">MADE VANKAR</span>
            </div>
          </a>

          <nav className={`nav-menu ${mobileOpen ? 'open' : ''}`}>
            <a 
              href="#collection" 
              className="nav-link" 
              onClick={(e) => {
                e.preventDefault();
                setMobileOpen(false);
                const elem = document.getElementById('sareeGridArea') || document.querySelector('.saree-grid') || document.getElementById('collection');
                if (elem) {
                  const navHeight = 65;
                  const elementPosition = elem.getBoundingClientRect().top;
                  const offsetPosition = elementPosition + window.pageYOffset - navHeight;
                  window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                  window.history.pushState(null, '', '#sarees');
                }
              }}
            >
              <span>Collections</span>
              <span className="mobile-nav-arrow">›</span>
            </a>
            <a href="#motifs" className="nav-link" onClick={() => setMobileOpen(false)}>
              <span>Motifs & Weaves</span>
              <span className="mobile-nav-arrow">›</span>
            </a>
            <a href="#craftsmanship" className="nav-link" onClick={() => setMobileOpen(false)}>
              <span>8-Step Ritual</span>
              <span className="mobile-nav-arrow">›</span>
            </a>
            <a href="#artisans" className="nav-link" onClick={() => setMobileOpen(false)}>
              <span>Loom Heritage</span>
              <span className="mobile-nav-arrow">›</span>
            </a>
            <a href="#authenticity" className="nav-link" onClick={() => setMobileOpen(false)}>
              <span>Silk Mark</span>
              <span className="mobile-nav-arrow">›</span>
            </a>

            {/* Mobile Drawer Bottom Actions */}
            <div className="mobile-drawer-footer">
              {currentCustomer ? (
                <button
                  type="button"
                  className="btn-mobile-drawer-book"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenCustomerAccount();
                  }}
                  style={{
                    background: '#fffbf2',
                    color: '#6b001a',
                    borderColor: '#d4af37',
                    marginBottom: '0.6rem',
                    fontWeight: 600
                  }}
                >
                  <span>My Account ({currentCustomer.customerName})</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-mobile-drawer-book"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenCustomerAuth();
                  }}
                  style={{
                    background: '#6b001a',
                    color: '#ffffff',
                    borderColor: '#d4af37',
                    marginBottom: '0.6rem',
                    fontWeight: 600
                  }}
                >
                  <span>Customer Login / Register</span>
                </button>
              )}

              <button
                type="button"
                className="btn-mobile-drawer-book"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenWishlist();
                }}
                style={{
                  background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
                  color: '#831843',
                  borderColor: '#f472b6',
                  marginBottom: '0.6rem'
                }}
              >
                <span>💍 Wedding Trousseau Wishlist ({wishlistCount})</span>
              </button>

              <button
                type="button"
                className="btn-mobile-drawer-book"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenReviews();
                }}
                style={{
                  background: 'linear-gradient(135deg, #fff8e7 0%, #fef0cd 100%)',
                  color: '#5c0018',
                  borderColor: '#c69214',
                  marginBottom: '0.6rem'
                }}
              >
                <span>⭐ Customer Reviews ({liveReviewStats.avg} ★ | {liveReviewStats.count})</span>
              </button>

              <button
                className="btn-mobile-drawer-book"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenBooking();
                }}
              >
                <span>👑 Book Loom Visit</span>
              </button>
              <div className="mobile-drawer-meta-row">
                <div className="mobile-currency-wrap">
                  <label htmlFor="mobileCurrencySelect">🌐 Currency:</label>
                  <select
                    id="mobileCurrencySelect"
                    className="currency-select"
                    value={currentCurrency}
                    onChange={(e) => onCurrencyChange(e.target.value)}
                  >
                    <option value="AUTO">🌐 Auto</option>
                    <option value="INR">🇮🇳 ₹ INR</option>
                    <option value="USD">🇺🇸 $ USD</option>
                    <option value="EUR">🇪🇺 € EUR</option>
                    <option value="GBP">🇬🇧 £ GBP</option>
                  </select>
                </div>
                <a
                  href={`https://wa.me/${SUPPORT_CONFIG.whatsappRaw}?text=${encodeURIComponent('Namaste, I need assistance regarding Patola Sarees.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-whatsapp-btn"
                >
                  Direct Concierge
                </a>
              </div>
            </div>
          </nav>

          <div className="nav-actions">
            {/* Customer Login / My Account Button */}
            {currentCustomer ? (
              <button
                id="navbar-customer-btn"
                className="btn-track-nav"
                onClick={onOpenCustomerAccount}
                title={`Logged in as ${currentCustomer.customerName} (+91 ${currentCustomer.phoneNumber})`}
                aria-label={`Logged in as ${currentCustomer.customerName}`}
                style={{
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                  color: '#78350f',
                  border: '1.5px solid #d4af37',
                  fontWeight: 700
                }}
              >
                <svg className="customer-nav-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="track-nav-text-desktop">
                  {currentCustomer.customerName ? currentCustomer.customerName.split(' ')[0] : 'My Account'}
                </span>
                <span className="track-nav-text-mobile">Account</span>
              </button>
            ) : (
              <button
                id="navbar-customer-btn"
                className="btn-track-nav"
                onClick={onOpenCustomerAuth}
                title="Customer Login / Register (ગ્રાહક લોગિન)"
                aria-label="Customer Login / Register"
                style={{
                  borderColor: '#d4af37',
                  background: '#fffbf2',
                  color: '#5c0018'
                }}
              >
                <svg className="customer-nav-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="track-nav-text-desktop">Login</span>
                <span className="track-nav-text-mobile">Login</span>
              </button>
            )}

            {/* Track Order Button */}
            <button
              id="navbar-track-btn"
              className="btn-track-nav"
              onClick={onOpenTracking}
              title="Track Your Saree Order"
              aria-label="Track Your Saree Order"
            >
              <svg className="track-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="1"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              <span className="track-nav-text-desktop">Track Order</span>
              <span className="track-nav-text-mobile">Track</span>
            </button>

            {/* Wedding Trousseau Wishlist Button */}
            <button
              id="navbar-wishlist-btn"
              className="btn-icon btn-wishlist-nav"
              onClick={onOpenWishlist}
              title="Wedding Trousseau Wishlist & Family Sharing (💍)"
              aria-label="Wedding Trousseau Wishlist"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={wishlistCount > 0 ? '#e11d48' : 'none'} stroke={wishlistCount > 0 ? '#e11d48' : 'currentColor'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
              {wishlistCount > 0 && <span className="cart-count-badge wishlist-badge">{wishlistCount}</span>}
            </button>

            {/* Shopping Bag Button */}
            <button className="btn-icon" onClick={onOpenCart} title="View Luxury Bag" aria-label="View Shopping Bag">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartCount > 0 && <span className="cart-count-badge">{cartCount}</span>}
            </button>

            <button className="btn-consult-nav" onClick={onOpenBooking}>
              <span>Book Loom Visit</span>
            </button>

            {/* Mobile Hamburger / Close Toggle */}
            <button
              className={`mobile-menu-toggle ${mobileOpen ? 'active' : ''}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileOpen ? (
                <svg fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
