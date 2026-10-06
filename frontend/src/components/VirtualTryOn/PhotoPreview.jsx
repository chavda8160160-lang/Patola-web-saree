import React from 'react';

/**
 * PhotoPreview
 * Shows customer's uploaded photo alongside the selected Patola saree,
 * before triggering "Generate My Look".
 */
export default function PhotoPreview({
  photoUrl,
  saree,
  onGenerate,
  onChangePhoto,
  formatPrice,
  isGenerating = false
}) {
  const sareeImg = saree?.image || (Array.isArray(saree?.images) && saree.images[0]) || '/assets/images/patola_drape.jpg';
  const sareePrice = saree?.finalPriceINR || saree?.basePriceINR;

  return (
    <div className="vton-preview-wrap">
      <div className="vton-pairing-grid">
        {/* Customer Uploaded Photo Card */}
        <div className="vton-pair-card customer-side">
          <div className="vton-pair-tag">👤 Your Photo</div>
          <div className="vton-pair-media">
            <img
              src={photoUrl}
              alt="Uploaded customer portrait"
              className="vton-preview-media-elm"
            />
          </div>
          <button
            type="button"
            className="vton-btn-text"
            onClick={onChangePhoto}
            disabled={isGenerating}
          >
            🔄 Choose Another Photo
          </button>
        </div>

        {/* Plus / Fusion Symbol */}
        <div className="vton-pair-connector">
          <div className="vton-plus-pill">✨</div>
          <span className="vton-fusion-text">AI Neural Drape</span>
        </div>

        {/* Selected Patola Saree Card */}
        <div className="vton-pair-card saree-side">
          <div className="vton-pair-tag">🥻 Selected Patola</div>
          <div className="vton-pair-media">
            <img src={sareeImg} alt={saree?.title || 'Patola Saree'} className="vton-preview-media-elm" />
          </div>
          <div className="vton-pair-info">
            <h4 className="vton-pair-title">{saree?.title || 'Patola Saree'}</h4>
            <span className="vton-pair-price">
              {formatPrice ? formatPrice(sareePrice) : `₹${Number(sareePrice || 0).toLocaleString('en-IN')}`}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="vton-generate-action-bar">
        <button
          type="button"
          className="vton-btn-generate"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          <span className="vton-shimmer-sweep" />
          <span style={{ position: 'relative', zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <span>✨</span>
            <span>AI Saree પહેરાવો (Generate Look)</span>
            <span>→</span>
          </span>
        </button>

        <p className="vton-privacy-subtext">
          🔒 AI will realistically drape this authentic Patola saree with Gujarati pleats & golden zari.
        </p>
      </div>
    </div>
  );
}
