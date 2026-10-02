/* ====================================================================================================
 * File Name: MotifMagnifier.jsx
 * Folder: frontend/src/components/
 * 
 * Interactive Weave Inspector & Motif Magnifier (with 4-Photo Multi-Angle Magnification)
 * ==================================================================================================== */

import React, { useState, useEffect, useRef } from 'react';
import { isStandingModelPhoto } from '../utils/imageHelper';

const PHOTO_ANGLES = [
  { key: 'drape', label: '1. Full Drape', shortLabel: 'Drape', subtitle: 'Full Saree Front Silhouette' },
  { key: 'pallu', label: '2. Royal Pallu', shortLabel: 'Pallu', subtitle: 'Grand Pallu & Golden Zari' },
  { key: 'macro', label: '3. Macro Weave', shortLabel: 'Macro', subtitle: 'Ikat Weave & Silk Threads' },
  { key: 'loom', label: '4. Loom Heritage', shortLabel: 'Loom', subtitle: 'Mannequin Drape & Loom Craft' }
];

const DEFAULT_MOTIF_PHOTOS = {
  'nari-kunjar': [
    '/assets/images/saree_nari_kunjar.jpg',
    '/assets/images/patola_pallu.jpg',
    '/assets/images/patola_macro.jpg',
    '/assets/images/patola_drape.jpg'
  ],
  'ratanchowk': [
    '/assets/images/saree_ratanchowk.jpg',
    '/assets/images/patola_pallu.jpg',
    '/assets/images/patola_macro.jpg',
    '/assets/images/patola_drape.jpg'
  ],
  'chhabdi': [
    '/assets/images/saree_emerald_chhabdi.jpg',
    '/assets/images/patola_pallu.jpg',
    '/assets/images/patola_macro.jpg',
    '/assets/images/patola_drape.jpg'
  ],
  'pan-bhat': [
    '/assets/images/saree_ratanchowk.jpg',
    '/assets/images/patola_pallu.jpg',
    '/assets/images/patola_macro.jpg',
    '/assets/images/patola_drape.jpg'
  ],
  'Navratna': [
    '/assets/images/saree_nari_kunjar.jpg',
    '/assets/images/patola_pallu.jpg',
    '/assets/images/patola_macro.jpg',
    '/assets/images/patola_drape.jpg'
  ],
  'navratna': [
    '/assets/images/saree_nari_kunjar.jpg',
    '/assets/images/patola_pallu.jpg',
    '/assets/images/patola_macro.jpg',
    '/assets/images/patola_drape.jpg'
  ],
  'Sakhiyo': [
    '/assets/images/saree_emerald_chhabdi.jpg',
    '/assets/images/patola_pallu.jpg',
    '/assets/images/patola_macro.jpg',
    '/assets/images/patola_drape.jpg'
  ],
  'sakhiyo': [
    '/assets/images/saree_emerald_chhabdi.jpg',
    '/assets/images/patola_pallu.jpg',
    '/assets/images/patola_macro.jpg',
    '/assets/images/patola_drape.jpg'
  ]
};

const MOTIFS = {
  'nari-kunjar': {
    title: 'Nari Kunjar (Elephant & Lady)',
    icon: '🐘',
    tag: 'Symbol of Royal Dignity & Feminine Grace',
    desc: 'In the sacred grammar of Gujarat Patola, "Kunjar" (the elephant) heralds royalty, wisdom, and steadfast prosperity, while "Nari" embodies divine beauty, music, and grace. Woven with double resist dye precision.',
    image: '/assets/images/saree_nari_kunjar.jpg',
    fact: 'Requires 4,800 individually calculated silk yarn knots tied by hand before dyeing.'
  },
  'ratanchowk': {
    title: 'Manek chowk (Jewel Squares)',
    icon: '💎',
    tag: 'Vedic Geometry & Cosmic Harmony',
    desc: 'The Manek chowk / Ratanchowk pattern is an ancient four-cornered jewel matrix originating from sacred temple architecture. It represents the four purusharthas: Dharma, Artha, Kama, and Moksha.',
    image: '/assets/images/saree_ratanchowk.jpg',
    fact: 'Every single square must align to the millimeter across both warp and weft during weaving.'
  },
  'chhabdi': {
    title: 'Chhabdi Bhat (Floral Basket)',
    icon: '🌸',
    tag: 'Auspicious Blessings & Fertility',
    desc: 'Depicting woven wicker baskets brimming with sacred temple blossoms like champak and lotus. Revered as an essential bridal trousseau drape representing unending abundance.',
    image: '/assets/images/saree_emerald_chhabdi.jpg',
    fact: 'Natural madder root and pomegranate rinds are boiled to achieve the indelible saffron-rose hues.'
  },
  'pan-bhat': {
    title: 'Pan Bhat (Betel Leaf & Gems)',
    icon: '🍃',
    tag: 'Purity, Auspicious Welcome & Vitality',
    desc: 'Pan Bhat features sacred betel leaf diamond matrices enclosing celestial jewels. The betel leaf is considered supremely auspicious in Gujarati traditions, conferring protection and royal grace.',
    image: '/assets/images/saree_ratanchowk.jpg',
    fact: 'Features hand-spun mulberry silk threads dyed 8 times to capture deep forest emerald and crimson leaf contrasts.'
  },
  'Navratna': {
    title: 'Navratna(Jems Geometric)',
    icon: '✨',
    tag: 'Nine Celestial Planetary Gemstones & Harmony',
    desc: 'Navratna represents the nine sacred Vedic gemstones (Ruby, Pearl, Coral, Emerald, Yellow Sapphire, Diamond, Blue Sapphire, Hessonite, and Cat’s Eye). Its intricate grid brings cosmic balance and regal elegance.',
    image: '/assets/images/saree_nari_kunjar.jpg',
    fact: 'Each of the 9 gemstone quadrants uses a distinct mathematical warp-weft alignment calculation.'
  },
  'Sakhiyo': {
    title: 'Sakhiyo(Figurative / Human)',
    icon: '💃',
    tag: 'Sisterhood, Raas-Garba & Folk Celebration',
    desc: 'Sakhiyo ("Beloved Companions") portrays graceful dancing female figures holding hands in celebration of sisterhood and wedding festivities. A rare figurative double-ikat masterpiece preserved through centuries.',
    image: '/assets/images/saree_emerald_chhabdi.jpg',
    fact: 'One of the most technically demanding figurative motifs, ensuring identical facial outlines on both sides of the drape.'
  }
};

export default function MotifMagnifier({
  selectedSaree = null,
  formatPrice,
  onClearSelectedSaree
}) {
  const [activeKey, setActiveKey] = useState('nari-kunjar');
  const [customSaree, setCustomSaree] = useState(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [zoomScale, setZoomScale] = useState(2.4);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50, zoomed: false });
  const [isPortraitModel, setIsPortraitModel] = useState(false);

  // If a saree was clicked from catalog above, load it and sync active photo
  useEffect(() => {
    if (selectedSaree) {
      setCustomSaree(selectedSaree);
      setUploadedImage(null);
      const incomingIdx = typeof selectedSaree.activePhotoIdx === 'number'
        ? selectedSaree.activePhotoIdx
        : (typeof selectedSaree.selectedPhotoIdx === 'number' ? selectedSaree.selectedPhotoIdx : 0);
      setActivePhotoIdx(incomingIdx);

      // Auto-scroll directly to the Interactive Weave Inspector Box (matches screenshot on mobile/tablet/desktop)
      setTimeout(() => {
        const target = document.getElementById('interactiveLensBox') || document.querySelector('.weave-inspector-display') || document.querySelector('.motif-interactive-grid') || document.getElementById('motifs');
        if (target) {
          const yOffset = -65;
          const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        }
      }, 70);
    }
  }, [selectedSaree]);

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
    setZoomOrigin({ x, y, zoomed: true });
  };

  const handleMouseLeave = () => {
    setZoomOrigin(prev => ({ ...prev, zoomed: false }));
  };

  // ✦ TOUCH SCREEN DRAG & MAGNIFICATION SUPPORT (FOR MOBILE DEVICES) ✦
  const handleTouchMove = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((touch.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - top) / height) * 100));
    setZoomOrigin({ x, y, zoomed: true });
  };

  const handleTouchStart = (e) => {
    handleTouchMove(e);
  };

  const handleTouchToggle = (e) => {
    if (e.target.closest('.inspector-nav-arrow')) return;
    setZoomOrigin(prev => ({
      ...prev,
      zoomed: !prev.zoomed
    }));
  };

  const handleTouchEnd = () => {
    // Retain magnification or allow gentle touch release
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result);
        setCustomSaree(null);
        setActivePhotoIdx(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackToViewSaree = () => {
    let targetCard = null;

    if (customSaree && customSaree.id) {
      targetCard = document.getElementById(`saree-card-${customSaree.id}`) 
        || document.querySelector(`[data-saree-id="${customSaree.id}"]`);
    }

    if (!targetCard && customSaree && customSaree.title) {
      const slug = String(customSaree.title).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      targetCard = document.getElementById(`saree-card-${slug}`)
        || document.querySelector(`[data-saree-title="${customSaree.title}"]`);
    }

    if (!targetCard && currentTitle) {
      const allCards = document.querySelectorAll('.saree-card');
      for (const card of allCards) {
        const titleEl = card.querySelector('.saree-title');
        if (titleEl && titleEl.textContent.trim().toLowerCase() === currentTitle.trim().toLowerCase()) {
          targetCard = card;
          break;
        }
      }
    }

    if (!targetCard) {
      targetCard = document.getElementById('sareeGridArea') 
        || document.getElementById('collection') 
        || document.querySelector('.saree-grid');
    }

    if (targetCard) {
      const navOffset = 95;
      const y = targetCard.getBoundingClientRect().top + window.pageYOffset - navOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });

      targetCard.classList.add('saree-card-highlighted');
      setTimeout(() => {
        targetCard.classList.remove('saree-card-highlighted');
      }, 2600);
    }
  };

  // Determine active photo list
  let activePhotoList = [];
  if (uploadedImage) {
    activePhotoList = [uploadedImage];
  } else if (customSaree) {
    activePhotoList = Array.isArray(customSaree.images) && customSaree.images.length >= 4
      ? customSaree.images
      : [
          customSaree.image || '/assets/images/saree_nari_kunjar.jpg',
          customSaree.images?.[1] || '/assets/images/patola_pallu.jpg',
          customSaree.images?.[2] || '/assets/images/patola_macro.jpg',
          customSaree.images?.[3] || '/assets/images/patola_drape.jpg'
        ];
  } else {
    activePhotoList = DEFAULT_MOTIF_PHOTOS[activeKey] || (activeKey && DEFAULT_MOTIF_PHOTOS[activeKey.toLowerCase()]) || DEFAULT_MOTIF_PHOTOS['nari-kunjar'];
  }

  const safeIdx = activePhotoIdx < activePhotoList.length ? activePhotoIdx : 0;
  const currentImage = activePhotoList[safeIdx];

  useEffect(() => {
    setIsPortraitModel(isStandingModelPhoto(currentImage, 0, 0, safeIdx));
  }, [currentImage, safeIdx]);

  const photoPillGridRef = useRef(null);

  // Auto-scroll photo angle pills so the next angle comes into view smoothly
  useEffect(() => {
    if (photoPillGridRef.current) {
      const btns = photoPillGridRef.current.querySelectorAll('.inspector-photo-pill');
      if (btns && btns[safeIdx]) {
        const nextBtn = btns[safeIdx + 1];
        if (nextBtn && typeof nextBtn.scrollIntoView === 'function') {
          nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else if (typeof btns[safeIdx].scrollIntoView === 'function') {
          btns[safeIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  }, [safeIdx]);

  // Determine active textual details
  const activeMotifObj = MOTIFS[activeKey] || (activeKey && MOTIFS[activeKey.toLowerCase()]) || MOTIFS['nari-kunjar'];
  let currentTitle = activeMotifObj.title;
  let currentTag = activeMotifObj.tag;
  let currentDesc = activeMotifObj.desc;
  let currentFact = activeMotifObj.fact;

  if (uploadedImage) {
    currentTitle = uploadedFileName ? `Custom Saree: ${uploadedFileName}` : 'Customer Uploaded Saree';
    currentTag = 'Bespoke Saree Weave Inspection (Uploaded from Device)';
    currentDesc = 'Inspect your custom saree photograph with 2.5x high-precision digital magnification. Observe thread alignment, motif balance, and color saturation.';
    currentFact = 'Every single square must align to the millimeter across both warp and weft during weaving.';
  } else if (customSaree) {
    currentTitle = customSaree.title;
    currentTag = `${customSaree.weave || 'Double Ikat Handloom'} • ${customSaree.motifName || 'Sacred Motif'}`;
    currentDesc = customSaree.description || 'Authentic pure mulberry silk handloom with mathematically resist-dyed threads.';
    currentFact = `⏳ Handcrafted on loom: ${customSaree.timeToWeave || '9 Months'} • Fabric: ${customSaree.fabric || 'Pure Mulberry Silk'}`;
  }

  return (
    <section className="section-padding motif-spotlight-section" id="motifs">
      <div className="container">
        <div className="section-header">
          <span className="section-eyebrow" style={{ color: 'var(--color-gold)' }}>
            Sacred Semiotics & Weave Inspection
          </span>
          <h2 className="section-title" style={{ color: '#ffffff' }}>
            The Royal Weave Inspector
          </h2>
          <p className="section-subtitle" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Zoom in from 1x up to 5x to inspect the mathematically aligned warp and weft double ikat silk across all 4 angles (Full Drape, Royal Pallu, Macro Silk Knots, and Loom Drape).
          </p>
          <div className="gold-divider"></div>
        </div>

        <div className="motif-interactive-grid">
          {/* Left: Motif Selectors & Upload */}
          <div className="motif-selector-cards">
            {/* If custom saree selected from catalog, show it at top */}
            {customSaree && (
              <div
                className="motif-choice-card active"
                style={{ borderColor: 'var(--color-gold)', background: 'rgba(212, 175, 55, 0.15)' }}
              >
                <div className="motif-symbol-icon">✨</div>
                <div className="motif-choice-info" style={{ flex: 1 }}>
                  <h4>{customSaree.title}</h4>
                  <p>{customSaree.weave} (Selected from Catalog • 4 Photos Available)</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomSaree(null);
                    setActivePhotoIdx(0);
                    if (onClearSelectedSaree) onClearSelectedSaree();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-gold)',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                  title="Close and return to sacred motifs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Standard 4 Sacred Motifs */}
            {Object.entries(MOTIFS).map(([key, data]) => {
              const isSelected = !customSaree && !uploadedImage && activeKey === key;
              return (
                <div
                  key={key}
                  className={`motif-choice-card ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setActiveKey(key);
                    setActivePhotoIdx(0);
                    setCustomSaree(null);
                    setUploadedImage(null);
                    if (onClearSelectedSaree) onClearSelectedSaree();
                  }}
                >
                  <div className="motif-symbol-icon">{data.icon}</div>
                  <div className="motif-choice-info">
                    <h4>{data.title}</h4>
                    <p>{data.tag}</p>
                  </div>
                </div>
              );
            })}

            {/* Custom Saree Photo Upload Card */}
            <label
              className={`motif-choice-card ${uploadedImage ? 'active' : ''}`}
              style={{
                cursor: 'pointer',
                borderStyle: uploadedImage ? 'solid' : 'dashed',
                borderColor: uploadedImage ? 'var(--color-gold)' : 'rgba(212, 175, 55, 0.4)',
                background: uploadedImage ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.02)'
              }}
            >
              <div className="motif-symbol-icon">📷</div>
              <div className="motif-choice-info" style={{ flex: 1 }}>
                <h4>{uploadedImage ? (uploadedFileName || 'Custom Saree Loaded') : 'Upload Saree Photo'}</h4>
                <p>{uploadedImage ? 'Click to replace photo • Hover on right to zoom' : 'Upload any saree image from your phone/PC to magnify weave'}</p>
              </div>
              {uploadedImage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setUploadedImage(null);
                    setUploadedFileName('');
                    setActivePhotoIdx(0);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff8a80',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                  title="Remove uploaded image"
                >
                  ✕
                </button>
              )}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {/* Right: Interactive Magnifier Display */}
          <div className="weave-inspector-display" id="interactiveLensBox">
            <div className="inspector-header">
              <span>Interactive Weave Inspector</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-gold-light)' }} className="hide-mobile">
                  Hover or drag to magnify:
                </span>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#d4af37', fontWeight: 700 }}>Zoom:</span>
                  {[
                    { scale: 1, label: '1x' },
                    { scale: 2, label: '2x' },
                    { scale: 2.5, label: '2.5x' },
                    { scale: 3.5, label: '3.5x' },
                    { scale: 5, label: '5x' }
                  ].map(({ scale, label }) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => {
                        setZoomScale(scale);
                        setZoomOrigin(prev => ({ ...prev, zoomed: true }));
                      }}
                      style={{
                        padding: '0.22rem 0.55rem',
                        fontSize: '0.74rem',
                        background: zoomScale === scale ? '#ffd700' : 'rgba(255, 255, 255, 0.12)',
                        color: zoomScale === scale ? '#800020' : '#ffffff',
                        border: '1.5px solid #d4af37',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 800,
                        boxShadow: zoomScale === scale ? '0 0 8px rgba(212, 175, 55, 0.6)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4-Photo Selector Tabs Bar inside Weave Inspector */}
            {!uploadedImage && activePhotoList.length > 1 && (
              <div className="inspector-photo-selector-bar">
                <div className="inspector-selector-heading">
                  <span style={{ color: 'var(--color-gold)' }}>📷</span> 
                  <span>Select Photo Angle to Magnify:</span>
                </div>
                <div 
                  className="inspector-photo-pill-grid"
                  ref={photoPillGridRef}
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {activePhotoList.map((pUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`inspector-photo-pill ${safeIdx === idx ? 'active' : ''}`}
                      onClick={(e) => {
                        setActivePhotoIdx(idx);
                        const btn = e.currentTarget;
                        const nextBtn = btn.nextElementSibling;
                        if (nextBtn && typeof nextBtn.scrollIntoView === 'function') {
                          nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        } else if (btn && typeof btn.scrollIntoView === 'function') {
                          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        }
                      }}
                      title={`Magnify ${PHOTO_ANGLES[idx]?.label || `Photo ${idx + 1}`}`}
                    >
                      <img src={pUrl} alt="" className="pill-mini-thumb" />
                      <div className="pill-text-col">
                        <span className="pill-title">{PHOTO_ANGLES[idx]?.label || `Photo ${idx + 1}`}</span>
                        <span className="pill-subtitle">{PHOTO_ANGLES[idx]?.subtitle || ''}</span>
                      </div>
                      {safeIdx === idx && <span className="pill-active-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div
              className="inspector-magnifier-view"
              id="motifPhotoViewerBox"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleTouchToggle}
              style={{ touchAction: 'none' }}
              title="Touch & drag finger or move mouse to magnify double ikat weave threads"
            >
              <div
                aria-hidden="true"
                className="inspector-image-backdrop"
                style={{ backgroundImage: `url("${currentImage}")` }}
              />
              <img
                src={currentImage}
                alt={currentTitle}
                className={isPortraitModel ? 'is-tall-model' : 'is-saree-fill'}
                style={{
                  objectFit: isPortraitModel ? 'contain' : 'cover',
                  objectPosition: 'center',
                  transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                  transform: zoomOrigin.zoomed ? `scale(${zoomScale})` : 'scale(1)',
                  transition: zoomOrigin.zoomed ? 'none' : 'transform 0.3s ease',
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget;
                  if (naturalWidth && naturalHeight) {
                    setIsPortraitModel(isStandingModelPhoto(currentImage, naturalWidth, naturalHeight, safeIdx));
                  }
                }}
              />

              {/* Mobile Touch Drag Hint Badge */}
              <div className="inspector-touch-hint-badge">
                👆 Drag finger to magnify threads • {zoomScale}x Zoom
              </div>

              {/* Quick Left / Right Swapping on Magnifier View */}
              {!uploadedImage && activePhotoList.length > 1 && (
                <>
                  <button
                    type="button"
                    className="inspector-nav-arrow left"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIdx(prev => (prev > 0 ? prev - 1 : activePhotoList.length - 1));
                    }}
                    title="Previous Photo"
                    aria-label="Previous Photo"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="inspector-nav-arrow right"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIdx(prev => (prev < activePhotoList.length - 1 ? prev + 1 : 0));
                    }}
                    title="Next Photo"
                    aria-label="Next Photo"
                  >
                    ›
                  </button>

                  <div className="inspector-floating-counter">
                    📷 {safeIdx + 1} / {activePhotoList.length} • {PHOTO_ANGLES[safeIdx]?.shortLabel}
                  </div>
                </>
              )}
            </div>

            <div className="inspector-caption-bar">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.6rem' }}>
                <div style={{ flex: '1 1 240px' }}>
                  <div className="inspector-caption-title">{currentTitle}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-gold)', margin: '0.3rem 0' }}>
                    {currentTag}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.45rem', flexShrink: 0 }}>
                  {!uploadedImage && activePhotoList.length > 1 && (
                    <span style={{ fontSize: '0.75rem', background: '#800020', color: '#ffd700', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #ffd700', fontWeight: 600 }}>
                      🔍 Magnifying: {PHOTO_ANGLES[safeIdx]?.label}
                    </span>
                  )}
                  {/* Return to Saree Button - Compact & Sleek */}
                  <button
                    type="button"
                    id="btnBackToViewSaree"
                    onClick={handleBackToViewSaree}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'linear-gradient(135deg, #800020 0%, #4a0013 100%)',
                      color: '#ffd700',
                      border: '1px solid #d4af37',
                      padding: '0.22rem 0.65rem',
                      borderRadius: '14px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(128, 0, 32, 0.35)',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 3px 10px rgba(212, 175, 55, 0.45)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #990026 0%, #5c0018 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(128, 0, 32, 0.35)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #800020 0%, #4a0013 100%)';
                    }}
                    title="Return directly back up to this saree in the catalog"
                    aria-label="Return to Saree"
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 900 }}>←</span> Return to Saree
                  </button>
                </div>
              </div>

              <div className="inspector-caption-desc">{currentDesc}</div>
              <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--color-gold-light)', fontWeight: 600 }}>
                ✦ {currentFact}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
