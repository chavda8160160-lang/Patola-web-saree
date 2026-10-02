/* ====================================================================================================
 * FileName: CustomerReviewModal.jsx
 * Folder: frontend/src/components/
 * 
 * Royal Patron Experience & Review Modal (Classic Heritage Edition)
 * ----------------------------------------------------------------------------------------------------
 * Luxurious 5-star appraisal experience for discerning Patola patrons:
 * - Bespoke metallic gold vector stars with smooth micro-interactions
 * - Classic gold filigree borders, velvet burgundy palette, and Cinzel typography
 * - Heritage craft highlight badges & personalized connoisseur notes
 * - Instant synchronization to localStorage ('patola_customer_reviews') and global testimonials
 * ==================================================================================================== */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const QUICK_TAGS = [
  { id: 'masterpiece', icon: '🥻', label: 'Heirloom Masterpiece' },
  { id: 'double_ikat', icon: '🧵', label: '100% Authentic Double Ikat' },
  { id: 'mulberry_silk', icon: '✨', label: 'Pure 8-Ply Mulberry Silk' },
  { id: 'velvet_box', icon: '📦', label: 'Rosewood & Velvet Presentation' },
  { id: 'salvi_weave', icon: '🏛️', label: 'Master Artisan Weave' },
  { id: 'prompt_handover', icon: '🛡️', label: 'Insured Armored Delivery' },
  { id: 'silk_mark', icon: '🎗️', label: 'Silk Mark Certified Pure' },
  { id: 'natural_dyes', icon: '🌿', label: 'Natural Herbal & Mineral Dyes' }
];

function GoldStarIcon({ filled = false, size = 36, hovered = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: hovered ? 'scale(1.2) translateY(-2px)' : (filled ? 'scale(1.06)' : 'scale(1)'),
        filter: filled
          ? 'drop-shadow(0 2px 8px rgba(212, 175, 55, 0.65)) drop-shadow(0 0 4px rgba(245, 215, 127, 0.8))'
          : 'grayscale(80%) opacity(0.35)'
      }}
    >
      <defs>
        <linearGradient id="goldStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff3b0" />
          <stop offset="35%" stopColor="#f5d77f" />
          <stop offset="70%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#996515" />
        </linearGradient>
        <linearGradient id="goldStarBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe680" />
          <stop offset="100%" stopColor="#7a4f0d" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.25L14.93 8.19L21.48 9.14L16.74 13.76L17.86 20.28L12 17.2L6.14 20.28L7.26 13.76L2.52 9.14L9.07 8.19L12 2.25Z"
        fill={filled ? "url(#goldStarGrad)" : "#e2d9cc"}
        stroke={filled ? "url(#goldStarBorder)" : "#bda893"}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CustomerReviewModal({
  isOpen,
  onClose,
  order,
  onReviewSubmitted,
  onShowToast
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [city, setCity] = useState('');
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState(['🥻 Heirloom Masterpiece', '✨ Pure 8-Ply Mulberry Silk']);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setCustomerName(order.customerName || order.fullName || '');
      setCity(order.city || '');
      try {
        const storedReviews = JSON.parse(localStorage.getItem('patola_customer_reviews') || '{}');
        const existing = storedReviews[order.orderReference];
        if (existing) {
          setRating(existing.rating || 5);
          setComment(existing.comment || '');
          setSelectedTags(existing.tags || ['🥻 Heirloom Masterpiece', '✨ Pure 8-Ply Mulberry Silk']);
        } else {
          setRating(5);
          setComment('');
          setSelectedTags(['🥻 Heirloom Masterpiece', '✨ Pure 8-Ply Mulberry Silk']);
        }
      } catch (e) {}
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const isCancelled = order.isCancelled || 
                      (order.orderStatus || '').toLowerCase().includes('cancel') || 
                      (order.status || '').toLowerCase().includes('cancel') || 
                      order.currentStage === 0;

  const getRatingHeadline = (stars) => {
    switch (stars) {
      case 5:
        return {
          title: 'Royal Heirloom Masterpiece (5/5 Stars)',
          desc: 'Flawless Salvi double ikat weaving, opulent silk luster & museum-grade perfection.',
          color: '#15803d',
          bg: '#f0fdf4',
          border: '#bbf7d0'
        };
      case 4:
        return {
          title: 'Distinguished Excellence (4/5 Stars)',
          desc: 'Exquisite handloom craftsmanship, vibrant natural dyes & regal finishing.',
          color: '#15803d',
          bg: '#f0fdf4',
          border: '#bbf7d0'
        };
      case 3:
        return {
          title: 'Artisanal Handcraft (3/5 Stars)',
          desc: 'Authentic traditional handloom weave with classic heritage character.',
          color: '#854d0e',
          bg: '#fefce8',
          border: '#fef08a'
        };
      case 2:
        return {
          title: 'Fair Handloom Quality (2/5 Stars)',
          desc: 'Traditional handwoven silk requiring minor artisan adjustments.',
          color: '#9a3412',
          bg: '#fff7ed',
          border: '#fed7aa'
        };
      case 1:
        return {
          title: 'Needs Master Artisan Refinement (1/5 Stars)',
          desc: 'Weave presentation that did not meet royal expectations.',
          color: '#991b1b',
          bg: '#fef2f2',
          border: '#fecaca'
        };
      default:
        return {
          title: 'Royal Heirloom Masterpiece (5/5 Stars)',
          desc: 'Flawless Salvi double ikat weaving, opulent silk luster & museum-grade perfection.',
          color: '#15803d',
          bg: '#f0fdf4',
          border: '#bbf7d0'
        };
    }
  };

  const toggleTag = (tagLabel) => {
    if (selectedTags.includes(tagLabel)) {
      setSelectedTags(selectedTags.filter(t => t !== tagLabel));
    } else {
      setSelectedTags([...selectedTags, tagLabel]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);

    const reviewObj = {
      orderReference: order.orderReference,
      orderId: order.id,
      rating,
      customerName: customerName.trim() || 'Valued Connoisseur',
      city: city.trim() || 'Gujarat',
      comment: comment.trim(),
      tags: selectedTags,
      sareeTitle: order.items && order.items[0] ? (order.items[0].sareeTitle || order.items[0].title) : (order.sareeTitle || 'Double Ikat Patola'),
      createdAt: new Date().toISOString()
    };

    try {
      const storedReviews = JSON.parse(localStorage.getItem('patola_customer_reviews') || '{}');
      storedReviews[order.orderReference] = reviewObj;
      localStorage.setItem('patola_customer_reviews', JSON.stringify(storedReviews));

      const allReviewsList = JSON.parse(localStorage.getItem('patola_all_reviews_list') || '[]');
      const filtered = allReviewsList.filter(r => r.orderReference !== order.orderReference);
      filtered.unshift(reviewObj);
      localStorage.setItem('patola_all_reviews_list', JSON.stringify(filtered));
    } catch (err) {
      console.warn('Error saving customer review:', err);
    }

    setTimeout(() => {
      setSubmitting(false);
      if (onReviewSubmitted) onReviewSubmitted(reviewObj);
      if (onShowToast) {
        onShowToast(`🥻 Thank you! Your ${rating}-Star Royal Patron Review has been recorded.`);
      }
      onClose();
    }, 350);
  };

  const activeStarCount = hoverRating || rating;
  const ratingInfo = getRatingHeadline(activeStarCount);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modal-backdrop open"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(18, 10, 10, 0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.2rem',
        overflowY: 'auto'
      }}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '16px',
          background: '#ffffff',
          border: '1.5px solid #d4af37',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(212, 175, 55, 0.35)',
          padding: 0,
          margin: 'auto',
          position: 'relative'
        }}
      >
        {/* Royal Classic Header */}
        <div style={{
          background: 'linear-gradient(135deg, #30000a 0%, #4a0011 50%, #680018 100%)',
          color: '#ffffff',
          padding: '1.6rem 1.8rem 1.4rem 1.8rem',
          position: 'relative',
          borderBottom: '2px solid #d4af37',
          textAlign: 'center',
          boxShadow: 'inset 0 -10px 25px rgba(0,0,0,0.35)'
        }}>
          {/* Subtle Filigree Background Flourish */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.08,
            backgroundImage: 'radial-gradient(#d4af37 1.5px, transparent 1.5px)',
            backgroundSize: '16px 16px',
            pointerEvents: 'none'
          }} />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              right: '1.1rem',
              top: '1.1rem',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.5)',
              color: '#d4af37',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 700,
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(4px)'
            }}
            aria-label="Close"
            onMouseEnter={(e) => { e.currentTarget.style.background = '#800020'; e.currentTarget.style.color = '#ffffff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.color = '#d4af37'; }}
          >
            ✕
          </button>

          {/* Top Royal Crest Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(128, 0, 32, 0.4) 100%)',
            border: '1px solid #d4af37',
            color: '#fdf3d8',
            padding: '4px 14px',
            borderRadius: '24px',
            fontSize: '0.78rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: '0.65rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
          }}>
            <span>🥻</span>
            <span>ROYAL PATRON APPRAISAL</span>
          </div>

          <h2 style={{
            fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif",
            color: '#ffffff',
            margin: '0.2rem 0 0.4rem 0',
            fontSize: '1.45rem',
            fontWeight: 700,
            letterSpacing: '0.5px',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)'
          }}>
            Rate Your Patola Experience
          </h2>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            margin: '0.3rem 0 0.5rem 0'
          }}>
            <span style={{ height: '1px', width: '36px', background: 'linear-gradient(90deg, transparent, #d4af37)' }}></span>
            <span style={{ color: '#d4af37', fontSize: '0.9rem' }}>❖ ✦ ❖</span>
            <span style={{ height: '1px', width: '36px', background: 'linear-gradient(90deg, #d4af37, transparent)' }}></span>
          </div>

          <p style={{
            color: 'rgba(255, 245, 230, 0.9)',
            fontSize: '0.85rem',
            margin: 0,
            fontFamily: "'Marcellus', 'Cinzel', serif",
            letterSpacing: '0.3px'
          }}>
            Share your valued impressions with our Master Salvi Weavers
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.6rem 1.8rem', background: '#faf8f5' }}>
          {/* Order Reference Box (Classic Parchment Style) */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2d2b4',
            padding: '0.75rem 1.1rem',
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.3rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>🏛️</span>
              <span style={{ color: '#5c3a21', fontSize: '0.86rem', fontWeight: 600 }}>Heirloom Order Reference:</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <strong style={{
                color: '#800020',
                fontFamily: "'Cinzel', monospace",
                fontSize: '1.05rem',
                letterSpacing: '0.5px'
              }}>
                #{order.orderReference}
              </strong>
              {isCancelled ? (
                <span style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #f87171',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  🚫 Cancelled Order
                </span>
              ) : (order.currentStage >= 5 || (order.orderStatus || '').toLowerCase().includes('delivered')) ? (
                <span style={{
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  ✓ Delivered
                </span>
              ) : (
                <span style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #f59e0b',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  ⏳ In Progress (Stage {order.currentStage || 1})
                </span>
              )}
            </div>
          </div>

          {/* If order is cancelled, show cancellation banner */}
          {isCancelled && (
            <div style={{
              background: '#fff1f2',
              border: '1.5px solid #fca5a5',
              borderRadius: '10px',
              padding: '1.2rem',
              marginBottom: '1.3rem',
              textAlign: 'center',
              color: '#991b1b'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🚫</div>
              <strong style={{ fontSize: '1.05rem', display: 'block', marginBottom: '0.3rem' }}>
                Order #{order.orderReference} Has Been Cancelled
              </strong>
              <p style={{ margin: '0 0 0.8rem 0', fontSize: '0.86rem', color: '#7f1d1d' }}>
                This order has been cancelled and cannot be reviewed. 100% full refund has been initiated or cash on delivery was terminated.
              </p>
              <button
                type="button"
                className="btn-primary-gold"
                onClick={onClose}
                style={{ padding: '0.5rem 1.6rem', fontSize: '0.88rem', cursor: 'pointer' }}
              >
                ✕ Close Window
              </button>
            </div>
          )}

          {!isCancelled && (
            <>
              {/* Interactive Gold Vector Star Rating */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #e8decb',
                borderRadius: '12px',
                padding: '1.2rem 1rem',
                textAlign: 'center',
                marginBottom: '1.3rem',
                boxShadow: '0 3px 10px rgba(0,0,0,0.02)'
              }}>
            <label style={{
              display: 'block',
              fontWeight: 700,
              fontSize: '0.92rem',
              color: '#4a0011',
              fontFamily: "'Cinzel', serif",
              letterSpacing: '0.5px',
              marginBottom: '0.6rem'
            }}>
              ✦ SELECT YOUR ROYAL RATING ✦
            </label>

            {/* Stars Container */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.85rem',
              margin: '0.5rem 0 0.8rem 0'
            }}>
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isFilled = starVal <= activeStarCount;
                const isHovered = hoverRating > 0 && starVal <= hoverRating;
                return (
                  <button
                    key={starVal}
                    type="button"
                    onClick={() => setRating(starVal)}
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      outline: 'none'
                    }}
                    aria-label={`Rate ${starVal} Stars`}
                    title={`${starVal} Star - ${starVal === 5 ? 'Royal Masterpiece' : ''}`}
                  >
                    <GoldStarIcon filled={isFilled} hovered={isHovered} size={38} />
                  </button>
                );
              })}
            </div>

            {/* Dynamic Rating Feedback Banner */}
            <div style={{
              background: ratingInfo.bg,
              border: `1px solid ${ratingInfo.border}`,
              borderRadius: '8px',
              padding: '0.55rem 0.9rem',
              marginTop: '0.4rem',
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                fontWeight: 800,
                fontSize: '0.92rem',
                color: ratingInfo.color,
                fontFamily: "'Cinzel', serif",
                letterSpacing: '0.3px'
              }}>
                ✦ {ratingInfo.title} ✦
              </div>
              <div style={{
                fontSize: '0.82rem',
                color: '#555',
                marginTop: '3px',
                fontWeight: 500,
                lineHeight: 1.4
              }}>
                {ratingInfo.desc}
              </div>
            </div>
          </div>

          {/* Quick Experience Highlights (Classic Lacquer Badges) */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.84rem',
              fontWeight: 700,
              color: '#4a0011',
              fontFamily: "'Cinzel', serif",
              marginBottom: '0.5rem',
              letterSpacing: '0.3px'
            }}>
              What stood out most during your experience?
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {QUICK_TAGS.map(t => {
                const isSelected = selectedTags.includes(t.label);
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => toggleTag(t.label)}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, #fbf2db 0%, #fae6b8 100%)'
                        : '#ffffff',
                      border: isSelected
                        ? '1.5px solid #d4af37'
                        : '1px solid #dcd1be',
                      color: isSelected ? '#800020' : '#4b5563',
                      fontWeight: isSelected ? 700 : 600,
                      fontSize: '0.8rem',
                      padding: '5px 12px',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: isSelected ? '0 2px 6px rgba(212, 175, 55, 0.25)' : 'none',
                      transform: isSelected ? 'translateY(-1px)' : 'none'
                    }}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Review Textarea */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label className="form-label" style={{
              fontSize: '0.86rem',
              fontWeight: 700,
              color: '#4a0011',
              fontFamily: "'Cinzel', serif",
              letterSpacing: '0.3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Detailed Connoisseur Impressions & Feedback:</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888' }}>Optional</span>
            </label>
            <textarea
              className="form-input"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts on the silk sheen, clarity of ikat geometric alignment, natural dye richness, and ceremonial unboxing..."
              style={{
                fontSize: '0.9rem',
                width: '100%',
                resize: 'vertical',
                background: '#ffffff',
                border: '1.5px solid #dcd1be',
                borderRadius: '8px',
                padding: '0.75rem',
                lineHeight: 1.45,
                color: '#2d241e'
              }}
            />
          </div>

          {/* Patron Name & City Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4a0011' }}>
                Patron / Connoisseur Name
              </label>
              <input
                type="text"
                className="form-input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Smt. Radhika Mehta"
                style={{
                  fontSize: '0.88rem',
                  background: '#ffffff',
                  border: '1.5px solid #dcd1be',
                  borderRadius: '6px',
                  padding: '0.6rem 0.75rem'
                }}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4a0011' }}>
                City / Region
              </label>
              <input
                type="text"
                className="form-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Ahmedabad / Mumbai / London"
                style={{
                  fontSize: '0.88rem',
                  background: '#ffffff',
                  border: '1.5px solid #dcd1be',
                  borderRadius: '6px',
                  padding: '0.6rem 0.75rem'
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-outline-gold"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                background: '#ffffff',
                border: '1.5px solid #bda893',
                color: '#5c3a21',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Maybe Later
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 2,
                minWidth: '220px',
                padding: '0.75rem 1.4rem',
                fontSize: '0.96rem',
                fontWeight: 700,
                fontFamily: "'Cinzel', serif",
                letterSpacing: '0.5px',
                background: 'linear-gradient(135deg, #800020 0%, #9e1b32 50%, #4a0011 100%)',
                color: '#ffffff',
                border: '1.5px solid #d4af37',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(128, 0, 32, 0.35)',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              {submitting ? 'Submitting Appraisal...' : '✦ Submit Royal Patron Review ✦'}
            </button>
          </div>
          </>
        )}
      </form>
      </div>
    </div>,
    document.body
  );
}
