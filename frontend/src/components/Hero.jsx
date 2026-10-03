/* ====================================================================================================
 * File Name: Hero.jsx
 * Folder: frontend/src/components/
 * 
 * Royal Patola Saree Hero Section
 * ----------------------------------------------------------------------------------------------------
 * - Sacred proverb: "The design etched into Patola silk may wear with age, but its color never fades."
 * - Royal typography and high-resolution background
 * - 4 core hallmarks: 6-12 Months Weaving, 100% Mulberry Silk, Double Ikat Dual-side, Silk Mark
 * - "Explore Masterpieces" and "Private Loom Consultation" CTAs
 * ==================================================================================================== */

import React, { useState, useEffect } from 'react';

export default function Hero({ onOpenBooking, onOpenReviews }) {
  const [reviewStats, setReviewStats] = useState({ count: 0, avg: '5.0' });

  useEffect(() => {
    try {
      const storedMap = JSON.parse(localStorage.getItem('patola_customer_reviews') || '{}');
      const userReviews = Object.values(storedMap);
      const total = userReviews.length;
      if (total > 0) {
        const totalStars = userReviews.reduce((sum, r) => sum + (r.rating || 5), 0);
        setReviewStats({
          count: total,
          avg: (totalStars / total).toFixed(1)
        });
      }
    } catch (e) {
      setReviewStats({ count: 0, avg: '5.0' });
    }
  }, []);

  return (
    <section className="hero-section" id="hero">
      <div className="hero-background-media">
        <img src="/assets/images/hero.jpg" alt="Exquisite Royal Patola Silk Saree on Loom" />
      </div>
      <div className="hero-overlay-gradient"></div>

      <div className="container">
        <div className="hero-content">
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
            <div className="hero-badge-pill" style={{ margin: 0 }}>
              <span>✦ Master Double Ikat Heritage ✦</span>
            </div>

            {/* Clickable Reviews Badge in Hero */}
            <button
              type="button"
              onClick={onOpenReviews}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(212, 175, 55, 0.18)',
                border: '1px solid rgba(212, 175, 55, 0.45)',
                color: '#f3e5ab',
                padding: '6px 14px',
                borderRadius: '50px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(8px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212, 175, 55, 0.3)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(212, 175, 55, 0.18)';
                e.currentTarget.style.transform = 'none';
              }}
              title="Click to view genuine customer reviews"
            >
              <span style={{ color: '#ffb703' }}>★★★★★</span>
              <span>{reviewStats.count > 0 ? `${reviewStats.avg} / 5.0 (${reviewStats.count} Customer Review${reviewStats.count === 1 ? '' : 's'})` : 'Customer Reviews'}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>›</span>
            </button>
          </div>

          <div className="hero-gujarati-proverb">
            "પડી પટોળે ભાત, ફાટે પણ ફીટે નહીં"
          </div>

          <h1 className="hero-title">
            The Eternal <span>Royal Silk</span> of Gujarat
          </h1>

          <p className="hero-description">
            Where sacred mathematical geometry meets pure mulberry silk. Every single warp and weft thread is individually tied, resist-dyed, and handwoven to create identical vibrancy on both sides—crafted to outlive generations.
          </p>

          <div className="hero-cta-group">
            <a 
              href="#collection" 
              className="btn-primary-gold"
              onClick={(e) => {
                e.preventDefault();
                const elem = document.getElementById('sareeGridArea') || document.querySelector('.saree-grid') || document.getElementById('collection');
                if (elem) {
                  const navHeight = 65;
                  const elementPosition = elem.getBoundingClientRect().top;
                  const offsetPosition = elementPosition + window.pageYOffset - navHeight;
                  window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                  });
                  window.history.pushState(null, '', '#sarees');
                }
              }}
              title="Explore Royal Patola Sarees & Dupattas"
            >
              <span>Explore Masterpieces</span>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <button className="btn-secondary-outline" onClick={onOpenBooking}>
              <span>Private Loom Consultation</span>
            </button>
          </div>

          {/* Hero Highlights */}
          <div className="hero-stats-row">
            <div className="hero-stat-card">
              <span className="stat-number">6 - 12</span>
              <span className="stat-label">Months to Weave 1 Saree</span>
            </div>
            <div className="hero-stat-card">
              <span className="stat-number">100%</span>
              <span className="stat-label">Mulberry Silk & Natural Dyes</span>
            </div>
            <div className="hero-stat-card">
              <span className="stat-number">Double Ikat</span>
              <span className="stat-label">Dual-Side Identical Radiance</span>
            </div>
            <div className="hero-stat-card">
              <span className="stat-number">Silk Mark</span>
              <span className="stat-label">Guaranteed Authenticity</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
