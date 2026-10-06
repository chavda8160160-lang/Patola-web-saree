import React, { useState } from 'react';
import BeforeAfterComparison from './BeforeAfterComparison';

/**
 * TryOnResult
 * Displays the final generated look with interactive Before/After comparison,
 * genuine product specs, and checkout actions.
 */
export default function TryOnResult({
  beforeImage,
  generatedImage,
  saree,
  formatPrice,
  onAddToCart,
  onBuyNow,
  onTryAnotherPhoto,
  onTryAnotherSaree,
  showToast
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const sareePrice = saree?.finalPriceINR || saree?.basePriceINR;
  const sareeTitle = saree?.title || 'Heritage Patola Saree';
  const sareeMotif = saree?.motifName || saree?.motif || 'Sacred Heritage Motif';
  const sareeFabric = saree?.fabric || '100% Pure Mulberry Silk & Natural Dyes';
  const sareeImg = saree?.image || (Array.isArray(saree?.images) && saree.images[0]) || '/assets/images/patola_drape.jpg';

  // Download high-resolution look
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const genImg = new Image();
      genImg.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        genImg.onload = resolve;
        genImg.onerror = reject;
        genImg.src = generatedImage || beforeImage;
      });

      canvas.width = genImg.naturalWidth || 1000;
      canvas.height = genImg.naturalHeight || 1500;

      // Draw the AI generated look
      ctx.drawImage(genImg, 0, 0, canvas.width, canvas.height);

      // Add gold brand watermark bar
      ctx.fillStyle = 'rgba(25, 8, 12, 0.88)';
      ctx.fillRect(20, canvas.height - 75, 420, 52);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 20px Georgia, serif';
      ctx.fillText(`👑 VIRASAT PATOLA • ${sareeTitle}`, 36, canvas.height - 42);

      const link = document.createElement('a');
      link.download = `Virasat_Patola_Look_${(saree?.id || 'tryon').replace(/\s+/g, '_')}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (showToast) showToast('📥 Your Patola look has been saved!');
    } catch (err) {
      console.warn('Download notice:', err);
      const fallbackLink = document.createElement('a');
      fallbackLink.href = generatedImage || beforeImage;
      fallbackLink.download = `Virasat_Patola_Look.jpg`;
      fallbackLink.click();
    } finally {
      setIsDownloading(false);
    }
  };

  // Share Look via Web Share or WhatsApp
  const handleShare = async () => {
    const shareText = `See how I look draped in the royal ${sareeTitle} by Patola Made Vankar!`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `My Patola Look: ${sareeTitle}`,
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Share error:', err);
      }
    }

    // Fallback: WhatsApp Web share
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="vton-result-layout">
      {/* Header */}
      <div className="vton-result-header">
        <span className="vton-crown-icon">👑</span>
        <h2 className="vton-result-title">Your AI Patola Look</h2>
        <p className="vton-result-subtitle">
          Photorealistic preview of you draped in authentic handcrafted Silk Patola
        </p>
      </div>

      {/* Main Display: Before/After Slider */}
      <div className="vton-result-compare-box">
        <BeforeAfterComparison
          beforeImage={beforeImage}
          afterImage={generatedImage}
          saree={saree}
          sareeTitle={sareeTitle}
        />
      </div>

      {/* Product Information Card */}
      <div className="vton-product-info-card">
        <div className="vton-prod-thumb">
          <img src={sareeImg} alt={sareeTitle} />
        </div>

        <div className="vton-prod-details">
          <h3 className="vton-prod-name">{sareeTitle}</h3>
          <div className="vton-prod-meta">
            <span className="vton-meta-badge">🎨 {sareeMotif}</span>
            <span className="vton-meta-badge">🧵 {sareeFabric}</span>
          </div>
          <div className="vton-prod-pricing">
            <span className="vton-price-label">Heritage Price:</span>
            <span className="vton-price-val">
              {formatPrice ? formatPrice(sareePrice) : `₹${Number(sareePrice || 0).toLocaleString('en-IN')}`}
            </span>
          </div>
        </div>

        <div className="vton-prod-cta-group">
          <button
            type="button"
            className="vton-action-btn primary"
            onClick={() => onAddToCart && onAddToCart(saree)}
          >
            🛍️ Add To Bag
          </button>
          <button
            type="button"
            className="vton-action-btn secondary"
            onClick={() => onBuyNow && onBuyNow(saree)}
          >
            ⚡ Buy Now
          </button>
        </div>
      </div>

      {/* Footer Utility Actions */}
      <div className="vton-result-footer-actions">
        <button
          type="button"
          className="vton-util-btn"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? '⏳ Saving...' : '💾 Save Look'}
        </button>

        <button
          type="button"
          className="vton-util-btn"
          onClick={handleShare}
        >
          💬 Share on WhatsApp
        </button>

        {onTryAnotherSaree && (
          <button
            type="button"
            className="vton-util-btn"
            onClick={onTryAnotherSaree}
          >
            🥻 Try Another Patola
          </button>
        )}

        <button
          type="button"
          className="vton-util-btn outline"
          onClick={onTryAnotherPhoto}
        >
          🔄 Upload Different Photo
        </button>
      </div>
    </div>
  );
}
