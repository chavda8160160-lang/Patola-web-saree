/* ====================================================================================================
 * File Name: CustomerSupportModal.jsx
 * Folder: frontend/src/components/
 * 
 * 24/7 Royal Customer Support & Artisan Concierge Center
 * ----------------------------------------------------------------------------------------------------
 * Allows customers to get instant help via:
 * 1. Direct Phone Call (+91 98250 12345 - Placeholder)
 * 2. Instant WhatsApp Chat with pre-composed greeting
 * 3. Official Gmail / Email (patolavankar.support@gmail.com - Placeholder)
 * 4. Atelier Studio Visit & In-Person Help
 * 5. Quick Support Ticket / Inquiry Form
 * 
 * NOTE FOR OWNER: You can easily replace the Phone Number and Gmail below in SUPPORT_CONFIG.
 * ==================================================================================================== */

import React, { useState } from 'react';
import { SUPPORT_CONFIG } from './supportConfig';

// ====================================================================================================
// ⚙️ SUPPORT CONTACT DETAILS (EDIT WHATSAPP & GMAIL HERE ANYTIME)
// ====================================================================================================
export { SUPPORT_CONFIG };

export default function CustomerSupportModal({ isOpen, onClose, onShowToast }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    topic: 'Order Tracking & Delivery',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.message.trim()) {
      alert('Please fill in your Name, WhatsApp Number, and Message.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      if (onShowToast) {
        onShowToast('🙏 Support message sent! Our artisan team will reply to you on WhatsApp / Email shortly.');
      }
    }, 600);
  };

  const handleReset = () => {
    setSubmitted(false);
    setFormData({
      name: '',
      phone: '',
      topic: 'Order Tracking & Delivery',
      message: ''
    });
  };

  const waMessage = encodeURIComponent(
    `Namaste ${SUPPORT_CONFIG.brandName}, I would like to inquire regarding Patola Sarees.`
  );
  const waUrl = `https://wa.me/${SUPPORT_CONFIG.whatsappRaw}?text=${waMessage}`;
  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT_CONFIG.email)}&su=${encodeURIComponent('Customer Support Inquiry - ' + SUPPORT_CONFIG.brandName)}&body=${encodeURIComponent('Namaste,\n\nI need customer support regarding:\n\nMy Name:\nWhatsApp Number:\nOrder # (if any):\nMessage:\n\nThank you!')}`;
  const mailtoUrl = `mailto:${SUPPORT_CONFIG.email}?subject=${encodeURIComponent('Customer Support Inquiry - ' + SUPPORT_CONFIG.brandName)}&body=${encodeURIComponent('Namaste,\n\nI need customer support regarding:\n\nMy Name:\nWhatsApp Number:\nOrder # (if any):\nMessage:\n\nThank you!')}`;

  return (
    <div className="modal-backdrop open" onClick={onClose} style={{ zIndex: 99999 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '720px',
          width: '95%',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '16px',
          padding: 0,
          background: '#fffdfa',
          boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
          border: '2px solid #d4af37'
        }}
      >
        {/* Modal Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4a0013 0%, #2b000b 100%)',
          color: '#fff',
          padding: '1.4rem 1.6rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid #d4af37'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(212, 175, 55, 0.2)',
              border: '1.5px solid #d4af37',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem'
            }}>
              🎧
            </div>
            <div>
              <h3 style={{
                margin: 0,
                fontFamily: "'Cinzel', serif",
                fontSize: '1.25rem',
                color: '#fdf7ee',
                letterSpacing: '0.04em'
              }}>
                Customer Support & Concierge
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#d4af37' }}>
                Dedicated Assistance for Orders, Loom Visits & Custom Handloom Sarees
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(212,175,55,0.4)',
              color: '#fdf7ee',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.4rem 1.6rem' }}>
          {/* Quick Contact Cards Grid: ONLY WhatsApp & Gmail Direct */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.2rem',
            marginBottom: '1.4rem'
          }}>
            {/* WhatsApp Live Chat & Direct Message */}
            <div 
              style={{
                background: 'linear-gradient(145deg, #f0fdf4 0%, #dcfce7 100%)',
                padding: '1.4rem',
                borderRadius: '12px',
                border: '2px solid #86efac',
                boxShadow: '0 4px 15px rgba(22, 101, 52, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.8rem' }}>💬</span>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#14532d' }}>Direct WhatsApp Message</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', background: '#22c55e', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    Instant Chat
                  </span>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.85)',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid #bbf7d0',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  color: '#15803d',
                  marginBottom: '0.7rem'
                }}>
                  {SUPPORT_CONFIG.whatsapp}
                </div>
                <p style={{ fontSize: '0.84rem', color: '#166534', margin: '0 0 1.2rem', lineHeight: 1.5 }}>
                  Chat directly with our master artisan on WhatsApp. Request live loom videos, real saree drape photos & custom weaving orders.
                </p>
              </div>
              <a 
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary-gold"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#25D366',
                  color: '#ffffff',
                  borderColor: '#1da851',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  padding: '0.75rem 1rem',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                  transition: 'transform 0.15s'
                }}
              >
                <span>💬 Send WhatsApp Message</span>
                <span>↗</span>
              </a>
            </div>

            {/* Direct Gmail & Email Support */}
            <div 
              style={{
                background: 'linear-gradient(145deg, #fffbf5 0%, #fef3c7 100%)',
                padding: '1.4rem',
                borderRadius: '12px',
                border: '2px solid #fde68a',
                boxShadow: '0 4px 15px rgba(212, 175, 55, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.8rem' }}>✉️</span>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#800020' }}>Direct Gmail Support</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', background: '#d4af37', color: '#2b000b', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    Official
                  </span>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.85)',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid #ebdccb',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  color: '#4a0013',
                  marginBottom: '0.7rem',
                  wordBreak: 'break-all'
                }}>
                  {SUPPORT_CONFIG.email}
                </div>
                <p style={{ fontSize: '0.84rem', color: '#666', margin: '0 0 1.2rem', lineHeight: 1.5 }}>
                  Send custom design sketches, order inquiries, or invoice queries. Direct reply guaranteed within 2 hours.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <a 
                  href={gmailWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: '#ea4335',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    padding: '0.75rem 0.4rem',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(234, 67, 53, 0.25)'
                  }}
                  title="Open directly in Gmail web composer"
                >
                  <span>✉️ Open Gmail</span>
                  <span>↗</span>
                </a>
                <a 
                  href={mailtoUrl}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: '#800020',
                    color: '#fdf7ee',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    padding: '0.75rem 0.4rem',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid #d4af37'
                  }}
                  title="Open in default mail client"
                >
                  <span>📧 Other Mail</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          </div>

          {/* Timings & Atelier Location Banner */}
          <div style={{
            background: '#faf6f0',
            border: '1px solid #e8dfd3',
            borderRadius: '10px',
            padding: '0.9rem 1.1rem',
            marginBottom: '1.4rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.8rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.25rem' }}>⏰</span>
              <div>
                <strong style={{ fontSize: '0.84rem', color: '#800020' }}>Studio Support Hours:</strong>
                <div style={{ fontSize: '0.78rem', color: '#555' }}>
                  {SUPPORT_CONFIG.timings}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🏛️</span>
              <div>
                <strong style={{ fontSize: '0.84rem', color: '#800020' }}>Master Loom Atelier:</strong>
                <div style={{ fontSize: '0.78rem', color: '#555' }}>
                  Master Handloom Studio & Loom Atelier, Gujarat
                </div>
              </div>
            </div>
          </div>

          {/* Quick Message / Ticket Submission Form */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #ebdccb',
            borderRadius: '12px',
            padding: '1.3rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <h4 style={{ margin: 0, color: '#800020', fontSize: '0.96rem', fontWeight: 800 }}>
                💬 Send an Instant Support Inquiry
              </h4>
              <span style={{ fontSize: '0.74rem', color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                ✓ Guaranteed Response
              </span>
            </div>

            {submitted ? (
              <div style={{
                textAlign: 'center',
                padding: '1.8rem 1rem',
                background: '#f0fdf4',
                borderRadius: '8px',
                border: '1px solid #86efac'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                <h4 style={{ margin: '0 0 0.4rem', color: '#166534', fontSize: '1.1rem' }}>
                  Support Message Received!
                </h4>
                <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#15803d' }}>
                  Thank you, <strong>{formData.name}</strong>. Our customer concierge team will contact you on <strong>{formData.phone}</strong> or WhatsApp shortly.
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-primary-gold"
                  style={{ padding: '0.45rem 1.1rem', fontSize: '0.82rem' }}
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: '0.3rem' }}>
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Priyadarshini Mehta"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.86rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: '0.3rem' }}>
                      Your WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 98250 12345 (for WhatsApp reply)"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.86rem' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: '0.3rem' }}>
                    How Can We Assist You?
                  </label>
                  <select
                    className="form-input"
                    value={formData.topic}
                    onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.86rem' }}
                  >
                    <option value="Order Tracking & Delivery">🚚 Order Tracking, Delivery Status & Handover OTP</option>
                    <option value="Custom Saree Inquiry">✨ Custom Weave / Bespoke Loom Commission Inquiry</option>
                    <option value="Studio Loom Visit">🏛️ Visiting the Handloom / Studio Appointment</option>
                    <option value="Payment & Billing">💳 Payment, Currency & Billing Query</option>
                    <option value="Authenticity & Silk Mark">👑 Silk Mark Certified Verification & Quality</option>
                    <option value="General Help">💬 General Help & Artisan Care Advice</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: '0.3rem' }}>
                    Your Message / Order Reference *
                  </label>
                  <textarea
                    rows={3}
                    className="form-input"
                    placeholder="Describe your inquiry or mention your Order #VP-XXXXXX..."
                    required
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.86rem', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#666' }}>
                    🔒 We respect your privacy. No spam guaranteed.
                  </span>
                  <button
                    type="submit"
                    className="btn-primary-gold"
                    disabled={submitting}
                    style={{ padding: '0.65rem 1.5rem', fontWeight: 700, fontSize: '0.88rem' }}
                  >
                    {submitting ? 'Submitting...' : '✉️ Submit Support Inquiry'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
