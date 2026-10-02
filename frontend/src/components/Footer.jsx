/* ====================================================================================================
 * File Name: Footer.jsx
 * Folder: frontend/src/components/
 * 
 * Purpose:
 * ----------------------------------------------------------------------------------------------------
 * Main website footer component.
 * - Collections and care guide links.
 * - Royal Gazette newsletter subscription form.
 * - Submits subscriber email via ApiService.subscribeNewsletter to .NET Core Web API.
 * 
 * Connected Stored Procedure:
 * - EXEC [dbo].[sp_SubscribeNewsletter] @Email, @IsNewSubscription OUTPUT
 * ==================================================================================================== */

import React, { useState } from 'react';
import { ApiService } from '../services/api';
import { SUPPORT_CONFIG } from './supportConfig';

export default function Footer({ onShowToast, onOpenAdmin, onOpenSupport }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    const result = await ApiService.subscribeNewsletter(email);
    setSubmitting(false);

    onShowToast(result.message || 'Subscribed via SQL Server Stored Procedure!');
    setEmail('');
  };

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top-grid">
          {/* Brand Info */}
          <div className="footer-brand-pane">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.8rem' }}>
              <img 
                src="/assets/images/charkha-logo.png" 
                alt="PATOLA MADE VANKAR Logo" 
                style={{ width: '44px', height: '44px', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: '#fdf7ee',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <span style={{ color: '#d4af37', fontSize: '0.85em' }}>❖</span>
                  PATOLA
                  <span style={{ color: '#d4af37', fontSize: '0.85em' }}>❖</span>
                </span>
                <span style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.66rem',
                  letterSpacing: '0.3em',
                  color: '#d4af37',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  textAlign: 'center',
                  marginTop: '1px'
                }}>
                  MADE VANKAR
                </span>
              </div>
            </div>
            <p>
              Celebrating the timeless splendor of authentic Double Ikat handloom silk. Handcrafted in Gujarat with unyielding adherence to sacred geometry, pure silk, and living traditions.
            </p>
            <div className="footer-social-links">
              <a href="#" className="footer-social-link" aria-label="Instagram">IG</a>
              <a href="#" className="footer-social-link" aria-label="Facebook">FB</a>
              <a href="#" className="footer-social-link" aria-label="Pinterest">PIN</a>
              <a href="#" className="footer-social-link" aria-label="YouTube">YT</a>
            </div>
          </div>

          {/* Collections Links */}
          <div className="footer-col">
            <h4>Collections</h4>
            <ul className="footer-link-list">
              <li><a href="#collection">Double Ikat Sarees</a></li>
              <li><a href="#collection">Single Ikat Drapes</a></li>
              <li><a href="#collection">Semi Patola Saree</a></li>
              <li><a href="#collection">Zari Buta Patola Saree</a></li>
              <li><a href="#collection">Modern Patola Saree</a></li>
            </ul>
          </div>

          {/* Heritage & Craft Links */}
          <div className="footer-col">
            <h4>Craft & Care</h4>
            <ul className="footer-link-list">
              <li><a href="#motifs">Motif Symbolism</a></li>
              <li><a href="#craftsmanship">The 8-Step Ritual</a></li>
              <li><a href="#artisans">Loom Heritage Story</a></li>
              <li><a href="#authenticity">Silk Mark Verification</a></li>
            </ul>
          </div>

          {/* Customer Support & Concierge Column: WhatsApp & Gmail only */}
          <div className="footer-col">
            <h4>Customer Support</h4>
            <p style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.6rem' }}>
              Direct WhatsApp message & Gmail support for instant inquiries.
            </p>
            <ul className="footer-link-list" style={{ fontSize: '0.86rem' }}>
              <li>
                <a 
                  href={`https://wa.me/${SUPPORT_CONFIG.whatsappRaw}?text=${encodeURIComponent('Namaste, I need assistance regarding Patola Sarees.')}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80' }}
                  title="Direct WhatsApp Chat"
                >
                  <span>💬</span> <span>WhatsApp Direct Message ↗</span>
                </a>
              </li>
              <li>
                <a 
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT_CONFIG.email)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }} 
                  title="Send Gmail Direct"
                >
                  <span>✉️</span> <span style={{ wordBreak: 'break-all' }}>{SUPPORT_CONFIG.email} ↗</span>
                </a>
              </li>
              <li>
                <span style={{ color: '#d4af37', fontSize: '0.78rem' }}>🕒 Mon - Sat: 10AM - 7:30PM IST</span>
              </li>
            </ul>
            <button
              type="button"
              id="footer-support-btn"
              onClick={onOpenSupport}
              title="Open WhatsApp & Gmail Support"
              aria-label="WhatsApp & Gmail Support"
              style={{
                marginTop: '0.85rem',
                width: '100%',
                background: 'linear-gradient(135deg, #14532d 0%, #064e3b 100%)',
                color: '#fdf7ee',
                border: '2px solid #4ade80',
                borderRadius: '50px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(20, 83, 45, 0.4)',
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
                fontSize: '0.86rem',
                letterSpacing: '0.03em',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(34, 197, 94, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(20, 83, 45, 0.4)';
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>💬</span>
              <span>WhatsApp & Gmail</span>
              <span style={{
                background: '#22c55e',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                display: 'inline-block'
              }} title="Online"></span>
            </button>
          </div>

          {/* Newsletter Form */}
          <div className="footer-col">
            <h4>Royal Gazette</h4>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.65)' }}>
              Receive exclusive private viewings of limited loom releases and bridal editions.
            </p>
            <form className="newsletter-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                className="newsletter-input"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                type="submit"
                className="btn-primary-gold"
                style={{ padding: '0.65rem 1.2rem', fontSize: '0.78rem' }}
                disabled={submitting}
              >
                {submitting ? 'Subscribing...' : 'Subscribe (For You)'}
              </button>
            </form>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div>
            © 2026 PATOLA MADE VANKAR. All Rights Reserved. Pure Handloom Double Ikat.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
            <span>Silk Mark Organisation of India Certified Handloom</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
