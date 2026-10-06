import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * BeforeAfterComparison
 * Touch and mouse responsive split-image comparison slider.
 * Renders the customer's original photo on the "Before" side,
 * and the photorealistic AI-generated Patola portrait on the "After" side.
 */
export default function BeforeAfterComparison({
  beforeImage,
  afterImage,
  saree,
  sareeTitle = 'Patola Saree',
  aspectRatio = '2/3'
}) {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState('slider'); // 'slider' | 'side-by-side'
  const containerRef = useRef(null);

  // Resolved clean generated after image
  const displayAfter = afterImage || '/assets/images/patola_model_reference.jpg';
  const displayBefore = beforeImage;

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const onMouseMove = (e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const onTouchMove = (e) => {
    if (!isDragging || !e.touches[0]) return;
    handleMove(e.touches[0].clientX);
  };

  const stopDragging = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', stopDragging);
      window.addEventListener('touchend', stopDragging);
    }
    return () => {
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchend', stopDragging);
    };
  }, [isDragging]);

  return (
    <div className="vton-compare-wrap">
      {/* Mode toggle bar */}
      <div className="vton-view-mode-bar">
        <span className="vton-slider-hint">
          {viewMode === 'slider' 
            ? '👈 સ્લાઇડર ખસેડીને ઓરિજિનલ અને સાડી લુક સરખાવો 👉' 
            : 'Side-by-side view'}
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`vton-mode-pill ${viewMode === 'slider' ? 'active' : ''}`}
            onClick={() => setViewMode('slider')}
          >
            ↔️ Interactive Slider
          </button>
          <button
            type="button"
            className={`vton-mode-pill ${viewMode === 'side-by-side' ? 'active' : ''}`}
            onClick={() => setViewMode('side-by-side')}
          >
            👥 Side-by-Side
          </button>
        </div>
      </div>

      {viewMode === 'side-by-side' ? (
        <div className="vton-side-by-side-grid">
          {/* Before: Customer Original Photo */}
          <div className="vton-sbs-card">
            <span className="vton-compare-label before">👤 Before: Original Photo</span>
            <div className="vton-sbs-media" style={{ aspectRatio, position: 'relative' }}>
              <img
                src={displayBefore}
                alt="Original customer photo"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* After: Photorealistic Patola Portrait */}
          <div className="vton-sbs-card">
            <span className="vton-compare-label after">✨ After: Draped in Patola</span>
            <div className="vton-sbs-media" style={{ aspectRatio, position: 'relative', overflow: 'hidden' }}>
              <img
                src={displayAfter}
                alt="Photorealistic Patola Saree portrait"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Interactive Drag Slider Container */
        <div
          ref={containerRef}
          className="vton-slider-container"
          style={{ aspectRatio, position: 'relative', overflow: 'hidden' }}
          onMouseDown={(e) => { setIsDragging(true); handleMove(e.clientX); }}
          onMouseMove={onMouseMove}
          onTouchStart={(e) => { if (e.touches[0]) { setIsDragging(true); handleMove(e.touches[0].clientX); } }}
          onTouchMove={onTouchMove}
        >
          {/* After Layer: Complete Photorealistic Patola Portrait */}
          <img
            src={displayAfter}
            alt="Customer draped in Patola"
            className="vton-compare-img after-layer"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
          />

          <span className="vton-badge-tag after-tag">
            ✨ After: {sareeTitle}
          </span>

          {/* Before Layer: Customer Original Photo (clipped by sliderPosition) */}
          <div
            className="vton-before-overlay"
            style={{ width: `${sliderPosition}%`, overflow: 'hidden' }}
          >
            <img
              src={displayBefore}
              alt="Customer original"
              className="vton-compare-img before-layer"
              style={{
                width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              draggable={false}
            />
            <span className="vton-badge-tag before-tag">
              👤 Before: Original Photo
            </span>
          </div>

          {/* The Draggable Divider Handle */}
          <div
            className="vton-slider-divider"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="vton-slider-handle">
              <span className="vton-handle-arrow">◀</span>
              <span className="vton-handle-icon">🥻</span>
              <span className="vton-handle-arrow">▶</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
