/* ====================================================================================================
 * File Name: WeddingWishlistModal.jsx
 * Folder: frontend/src/components/
 * 
 * Wedding Trousseau Wishlist & Family Sharing Modal
 * ----------------------------------------------------------------------------------------------------
 * - Curate royal sarees for bridal occasions (Lagna, Sangeet, Reception, Family Gifts).
 * - Total trousseau investment estimation.
 * - 1-Click WhatsApp Family Sharing with royal Gujarati & English message.
 * - Copy Shareable Trousseau Link for family members.
 * - Quick 'Move to Bag' and 'Add All to Bag'.
 * ==================================================================================================== */

import React, { useState, useEffect } from 'react';

const OCCASION_OPTIONS = [
  { id: 'lagna', label: '👰 Wedding Day / Mameru', icon: '🥻' },
  { id: 'sangeet', label: '💃 Sangeet & Mehendi', icon: '✨' },
  { id: 'reception', label: '🍸 Royal Reception', icon: '🌟' },
  { id: 'mandap', label: '🪔 Mandap Muhurat / Puja Rituals', icon: '🪔' },
  { id: 'family_gift', label: '🎁 Family Gift / Trousseau', icon: '💝' }
];

export default function WeddingWishlistModal({
  isOpen,
  onClose,
  wishlist = [],
  onRemoveFromWishlist,
  onAddToCart,
  onAddAllToCart,
  formatPrice,
  showToast
}) {
  const [itemOccasions, setItemOccasions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('patola_wishlist_occasions') || '{}');
    } catch (e) {
      return {};
    }
  });

  const [copiedLink, setCopiedLink] = useState(false);

  // Sync occasions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('patola_wishlist_occasions', JSON.stringify(itemOccasions));
    } catch (e) {}
  }, [itemOccasions]);

  if (!isOpen) return null;

  const totalInvestment = wishlist.reduce((acc, item) => {
    const price = Number(item.finalPriceINR || item.basePriceINR) || 0;
    return acc + price;
  }, 0);

  const handleOccasionChange = (sareeId, occasionId) => {
    setItemOccasions(prev => ({
      ...prev,
      [sareeId]: occasionId
    }));
  };

  // Generate shareable link
  const generateShareUrl = () => {
    try {
      const ids = wishlist.map(s => s.id);
      const encoded = encodeURIComponent(JSON.stringify(ids));
      const url = `${window.location.origin}${window.location.pathname}#wishlist=${encoded}`;
      return url;
    } catch (e) {
      return window.location.href;
    }
  };

  const handleCopyShareLink = () => {
    const link = generateShareUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        setCopiedLink(true);
        if (showToast) showToast('📋 Trousseau Wishlist Link Copied! Send it to your family.');
        setTimeout(() => setCopiedLink(false), 3000);
      });
    } else {
      // Fallback
      const tempInput = document.createElement('input');
      tempInput.value = link;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      setCopiedLink(true);
      if (showToast) showToast('📋 Link copied!');
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // Share via WhatsApp with pre-formatted bilingual message
  const handleShareWhatsApp = () => {
    if (wishlist.length === 0) return;

    const shareUrl = generateShareUrl();
    let text = `🥻 *PATOLA MADE VANKAR - Wedding Trousseau Wishlist* 🥻\n\n`;
    text += `Hello! Here are the handloom Patola sarees shortlisted for our wedding celebrations. Please share your thoughts & blessings:\n\n`;

    wishlist.forEach((item, idx) => {
      const occasionId = itemOccasions[item.id] || 'lagna';
      const occObj = OCCASION_OPTIONS.find(o => o.id === occasionId);
      const occName = occObj ? occObj.label : '👰 Wedding';
      const priceText = formatPrice(item.finalPriceINR || item.basePriceINR);

      text += `${idx + 1}. *${item.title}*\n`;
      text += `   • Occasion: ${occName}\n`;
      text += `   • Motif: ${item.motifName || item.motif || 'Sacred Heritage'}\n`;
      text += `   • Price: ${priceText}\n\n`;
    });

    text += `💎 *Total Estimated Investment:* ${formatPrice(totalInvestment)}\n\n`;
    text += `🔗 *View all shortlisted sarees with 3D preview here:*\n${shareUrl}`;

    const waLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waLink, '_blank');
  };

  return (
    <div className="modal-backdrop open wishlist-modal-backdrop" onClick={onClose}>
      <div
        className="modal-container royal-trousseau-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn-close-modal"
          onClick={onClose}
          aria-label="Close Wishlist"
        >
          ✕
        </button>

        {/* Royal Modal Header */}
        <div className="trousseau-header">
          <div className="trousseau-header-left">
            <div className="trousseau-icon-circle">
              💍
            </div>
            <div>
              <div className="trousseau-eyebrow">Bridal & Heritage Trousseau</div>
              <h2 className="trousseau-title">Wedding Wishlist & Family Sharing</h2>
              <p className="trousseau-subtitle">
                Shortlist your heirloom Patolas, assign wedding occasions, and share with family for blessings.
              </p>
            </div>
          </div>

          {wishlist.length > 0 && (
            <div className="trousseau-header-summary">
              <span className="summary-count">{wishlist.length} {wishlist.length === 1 ? 'Masterpiece' : 'Masterpieces'}</span>
              <span className="summary-amount">{formatPrice(totalInvestment)}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="trousseau-body">
          {wishlist.length === 0 ? (
            <div className="trousseau-empty-state">
              <div className="empty-state-art">
                <span className="empty-icon" style={{ fontSize: '4.2rem', display: 'inline-block', lineHeight: 1, filter: 'drop-shadow(0 4px 14px rgba(128, 0, 32, 0.25))' }}>🥻</span>
              </div>
              <h3 className="empty-title">Your Wedding Wishlist is Empty</h3>
              <p className="empty-desc">
                Your wedding trousseau has no shortlisted sarees yet. Explore our royal collection and click the ❤️ Heart icon to add your dream Patola.
              </p>
              <button
                type="button"
                className="btn-primary-gold"
                onClick={() => {
                  onClose();
                  const el = document.getElementById('collection');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{ marginTop: '1.2rem', padding: '0.75rem 1.8rem' }}
              >
                ✨ Browse Royal Collection
              </button>
            </div>
          ) : (
            <>
              {/* Family Share Action Bar */}
              <div className="trousseau-share-bar">
                <div className="share-bar-info">
                  <span className="share-sparkle">👨‍👩‍👧‍👦</span>
                  <div>
                    <strong>Share with Family:</strong>
                    <p>Send your curated trousseau to family on WhatsApp or copy link.</p>
                  </div>
                </div>

                <div className="share-btn-group">
                  <button
                    type="button"
                    className="btn-whatsapp-share"
                    onClick={handleShareWhatsApp}
                    title="Share Trousseau on WhatsApp"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.2.534 1.288.043.088.072.19.014.305-.058.115-.087.19-.173.29-.087.1-.183.223-.261.3-.087.086-.177.18-.076.353.101.173.449.74 0.964 1.2 0.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086.159.058 1.011.477 1.184.564.173.087.289.13.332.202.043.072.043.419-.101.824z" />
                    </svg>
                    <span>WhatsApp Share</span>
                  </button>

                  <button
                    type="button"
                    className="btn-copy-share-link"
                    onClick={handleCopyShareLink}
                    title="Copy sharable trousseau link"
                  >
                    <span>{copiedLink ? '✓ Copied!' : '🔗 Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Wishlist Items List */}
              <div className="trousseau-items-list">
                {wishlist.map((saree) => {
                  const currentOccasion = itemOccasions[saree.id] || 'lagna';
                  const hasDiscount = Number(saree.discountPercent) > 0;
                  const finalPrice = Number(saree.finalPriceINR) || saree.basePriceINR;

                  return (
                    <div key={saree.id} className="trousseau-card-row">
                      {/* Image Thumbnail with 3D slot badge */}
                      <div className="trousseau-item-img-wrap">
                        <img
                          src={saree.image || (Array.isArray(saree.images) ? saree.images[0] : '/assets/images/saree_nari_kunjar.jpg')}
                          alt={saree.title}
                          className="trousseau-item-img"
                        />
                        <span className="trousseau-3d-hint" title="Includes 3D Drape View on Photo #2">
                          ✨ 3D Drape
                        </span>
                      </div>

                      {/* Details */}
                      <div className="trousseau-item-info">
                        <div className="trousseau-item-header">
                          <h4 className="trousseau-item-title">{saree.title}</h4>
                          <button
                            type="button"
                            className="btn-remove-wishlist"
                            onClick={() => onRemoveFromWishlist(saree.id)}
                            title="Remove from Wishlist"
                            aria-label="Remove item"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="trousseau-item-meta">
                          <span>🧵 {saree.weave || 'Double Ikat'}</span>
                          <span>🌸 {saree.motifName || saree.motif || 'Heritage'}</span>
                          <span>⏳ {saree.timeToWeave || '9 Months'}</span>
                        </div>

                        {/* Occasion Selector */}
                        <div className="trousseau-occasion-row">
                          <label className="occasion-label">
                            <span style={{ color: '#d4af37' }}>❖</span> Occasion:
                          </label>
                          <select
                            className="occasion-select"
                            value={currentOccasion}
                            onChange={(e) => handleOccasionChange(saree.id, e.target.value)}
                          >
                            {OCCASION_OPTIONS.map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Price & Add to Bag Footer */}
                        <div className="trousseau-item-footer">
                          <div className="trousseau-price-wrap">
                            {hasDiscount ? (
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ textDecoration: 'line-through', color: '#888', fontSize: '0.85rem' }}>
                                  {formatPrice(saree.basePriceINR)}
                                </span>
                                <span className="trousseau-price" style={{ fontWeight: 700, color: '#800020' }}>
                                  {formatPrice(finalPrice)}
                                </span>
                              </div>
                            ) : (
                              <span className="trousseau-price">{formatPrice(saree.basePriceINR)}</span>
                            )}
                          </div>

                          <button
                            type="button"
                            className="btn-move-to-bag"
                            onClick={() => {
                              onAddToCart(saree);
                              if (showToast) showToast(`🛍️ "${saree.title}" added to your shopping bag!`);
                            }}
                          >
                            <span>Add to Bag</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Royal Modal Footer Actions */}
        {wishlist.length > 0 && (
          <div className="trousseau-footer">
            <div className="trousseau-footer-left">
              <span className="trousseau-total-label">Total Trousseau Investment:</span>
              <span className="trousseau-total-val">{formatPrice(totalInvestment)}</span>
            </div>

            <div className="trousseau-footer-right">
              <button
                type="button"
                className="btn-outline-gold"
                onClick={handleShareWhatsApp}
              >
                <span>📱 WhatsApp Family</span>
              </button>

              <button
                type="button"
                className="btn-primary-gold"
                onClick={() => {
                  if (onAddAllToCart) onAddAllToCart(wishlist);
                  onClose();
                }}
              >
                <span>🛍️ Move All to Bag ({wishlist.length})</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
