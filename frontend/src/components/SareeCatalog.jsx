/* ====================================================================================================
 * File Name: SareeCatalog.jsx
 * Folder: frontend/src/components/
 * 
 * Live Saree Catalog Component
 * ----------------------------------------------------------------------------------------------------
 * - Fetches royal sarees from backend via 'sp_GetSarees'.
 * - Pincode delivery estimator (4-6 Days Vault / 2-4 Months Custom Loom).
 * - "100% Transit Insured" guarantee badge.
 * - Category and motif filters.
 * ==================================================================================================== */

import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { ApiService } from '../services/api';
import { isStandingModelPhoto } from '../utils/imageHelper';

const VirtualDrape3D = lazy(() => import('./VirtualDrape3D'));
const Photo360Viewer = lazy(() => import('./Photo360Viewer'));

function SareeCardItem({
  saree,
  formatPrice,
  onQuickView,
  onInspectSaree,
  onOpenTrialRoom,
  onOpenVirtualTryOn,
  onAddToCart,
  onToggleWishlist,
  isWishlisted = false
}) {
  const resolvePhotos = () => {
    if (Array.isArray(saree.images) && saree.images.length >= 5) {
      return saree.images;
    }
    if (Array.isArray(saree.images) && saree.images.length > 0) {
      const list = [...saree.images];
      while (list.length < 5) list.push(list[0]);
      return list;
    }
    if (saree.imagesJson && typeof saree.imagesJson === 'string') {
      try {
        const parsed = JSON.parse(saree.imagesJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list = [...parsed];
          while (list.length < 5) list.push(list[0]);
          return list;
        }
      } catch (e) {}
    }
    const single = saree.image || '/assets/images/saree_nari_kunjar.jpg';
    return [single, single, single, single, single];
  };

  const sareeImages = resolvePhotos();

  // ✦ DISCOUNT CALCULATION ✦
  const discountPercent = Number(saree.discountPercent) || 0;
  const hasDiscount = discountPercent > 0;
  const finalPriceValue = saree.finalPriceINR && Number(saree.finalPriceINR) > 0
    ? Number(saree.finalPriceINR)
    : Math.round(saree.basePriceINR - (saree.basePriceINR * discountPercent / 100));

  const [activeIdx, setActiveIdx] = useState(0);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const touchStartX = useRef(null);

  const prevPhoto = (e) => {
    if (e) e.stopPropagation();
    setActiveIdx((prev) => (prev === 0 ? sareeImages.length - 1 : prev - 1));
  };

  const nextPhoto = (e) => {
    if (e) e.stopPropagation();
    setActiveIdx((prev) => (prev === sareeImages.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 35) {
      prevPhoto();
    } else if (diff < -35) {
      nextPhoto();
    }
    touchStartX.current = null;
  };

  const currentImg = sareeImages[activeIdx] || saree.image;

  return (
    <article 
      className="saree-card"
      id={`saree-card-${saree.id || (saree.title ? String(saree.title).toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'item')}`}
      data-saree-id={saree.id}
      data-saree-title={saree.title}
    >
      <div 
        className="saree-image-wrapper"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ✦ PHOTO 1: NORMAL 2D | PHOTOS 2 TO 4: 3D VIRTUAL SAREE DRAPE | PHOTO 5: 360° ANGLE VIEW ✦ */}
        {activeIdx === 4 ? (
          <Suspense fallback={<img src={currentImg} alt={`${saree.title} - Loading view`} className="saree-image" loading="lazy" style={{ objectFit: isStandingModelPhoto(currentImg, 0, 0, activeIdx) ? 'contain' : 'cover' }} />}>
            <Photo360Viewer
              imageUrl={currentImg}
              title={`${saree.title} - 360° Angle View`}
              isCard={true}
              photoIndex={activeIdx}
            />
          </Suspense>
        ) : activeIdx >= 1 && activeIdx <= 3 ? (
          <Suspense fallback={<img src={currentImg} alt={`${saree.title} - Loading view`} className="saree-image" loading="lazy" style={{ objectFit: isStandingModelPhoto(currentImg, 0, 0, activeIdx) ? 'contain' : 'cover' }} />}>
            <VirtualDrape3D
              imageUrl={currentImg}
              title={`${saree.title} - View ${activeIdx + 1}`}
              isCard={true}
              photoIndex={activeIdx}
            />
          </Suspense>
        ) : (
          <img 
            src={currentImg} 
            alt={`${saree.title} - Photo ${activeIdx + 1}`} 
            className="saree-image" 
            loading="lazy" 
            decoding="async"
            style={{
              objectFit: isStandingModelPhoto(currentImg, 0, 0, activeIdx) ? 'contain' : 'cover',
              ...(saree.isOutOfStock ? { filter: 'brightness(0.92)' } : {})
            }}
            onLoad={(e) => {
              const { naturalWidth, naturalHeight } = e.currentTarget;
              if (naturalWidth && naturalHeight) {
                e.currentTarget.style.objectFit = isStandingModelPhoto(currentImg, naturalWidth, naturalHeight, activeIdx) ? 'contain' : 'cover';
              }
            }}
          />
        )}

        {/* ✦ CLEAN TOP-LEFT BADGE: Exactly 1 badge (Discount OR Out-of-Stock OR Vault Badge) ✦ */}
        <div className="card-top-left-badge">
          {hasDiscount ? (
            <span className="saree-discount-pill">
              {discountPercent}% OFF
            </span>
          ) : saree.isOutOfStock ? (
            <span className="saree-stock-pill out-of-stock">
              🔴 Loom Order
            </span>
          ) : saree.badge ? (
            <span className="saree-stock-pill vault">
              {saree.badge}
            </span>
          ) : null}
        </div>

        {/* ✦ CLEAN TOP-RIGHT ACTION GROUP: Photo Counter + Wishlist Heart ✦ */}
        <div className="card-top-right-group">
          <span
            className="card-photo-counter"
            title={`Photo ${activeIdx + 1} of ${sareeImages.length}`}
          >
            📷 {activeIdx + 1} / {sareeImages.length}
          </span>

          <button
            type="button"
            className={`card-wishlist-btn ${isWishlisted ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleWishlist) onToggleWishlist(saree);
            }}
            title={isWishlisted ? 'Remove from Wedding Wishlist' : 'Add to Wedding Trousseau Wishlist (💍)'}
            aria-label="Wishlist toggle"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill={isWishlisted ? '#e11d48' : 'rgba(0, 0, 0, 0.35)'} stroke={isWishlisted ? '#e11d48' : '#ffffff'} strokeWidth="2.2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </button>
        </div>

        {/* Left / Right Swipe Arrows on Card */}
        <button
          type="button"
          className="card-gallery-arrow card-gallery-prev"
          onClick={prevPhoto}
          title="Previous Photo"
          aria-label="Previous photo"
        >
          ‹
        </button>
        <button
          type="button"
          className="card-gallery-arrow card-gallery-next"
          onClick={nextPhoto}
          title="Next Photo"
          aria-label="Next photo"
        >
          ›
        </button>

        {/* Clean 5 Dots Indicator at bottom of image */}
        <div className="card-gallery-dots" onClick={(e) => e.stopPropagation()}>
          {sareeImages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`card-gallery-dot ${idx === activeIdx ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx(idx);
              }}
              title={`Photo ${idx + 1}`}
              aria-label={`Photo ${idx + 1}`}
            />
          ))}
        </div>

        {/* Out of Stock Floating Banner (Only when out of stock) */}
        {saree.isOutOfStock && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(20, 13, 12, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 1
          }}>
            <span style={{
              background: 'rgba(198, 40, 40, 0.92)',
              color: '#ffffff',
              padding: '0.4rem 0.9rem',
              borderRadius: '4px',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              border: '1px solid #ef9a9a'
            }}>
              OUT OF STOCK (LOOM COMMISSION)
            </span>
          </div>
        )}

        {/* ✦ PHOTO BOTTOM ACTION BAR: 1 (LEFT) QUICK VIEW & 2 (RIGHT) INSPECT ✦ */}
        <div className="saree-card-photo-bottom-bar">
          <button
            type="button"
            className="btn-photo-action-left"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView({
                ...saree,
                basePriceINR: hasDiscount ? finalPriceValue : saree.basePriceINR,
                originalPriceINR: saree.basePriceINR,
                finalPriceINR: finalPriceValue,
                discountPercent
              }, activeIdx);
            }}
            title="Quick View (4 High-Resolution Photos & Try On)"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Quick View</span>
          </button>

          <button
            type="button"
            className="btn-photo-action-right"
            onClick={(e) => {
              e.stopPropagation();
              if (onInspectSaree) {
                onInspectSaree({ ...saree, images: sareeImages, activePhotoIdx: activeIdx, image: currentImg }, activeIdx);
              }
            }}
            title="Inspect double ikat warp & weft threads in Weave Inspector"
          >
            <span style={{ fontSize: '0.82rem' }}>🔍</span>
            <span>Inspect</span>
          </button>
        </div>
      </div>

      <div className="saree-card-body">
        <div className="saree-card-meta">
          <span className="saree-card-weave">{saree.weave}</span>
          <span>⏳ {saree.timeToWeave}</span>
          <span className="saree-meta-insured">🛡️ 100% Insured</span>
        </div>

        {/* Direct From Master Weaver Authenticity Tag */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          background: 'rgba(212, 175, 55, 0.12)',
          color: '#800020',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.03em',
          marginBottom: '0.35rem',
          width: 'fit-content'
        }}>
          <span>🧵 Direct From Master Weaver</span>
        </div>

        <h3 className="saree-card-title">{saree.title}</h3>

        <div className="saree-card-motif-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.55rem' }}>
          <span style={{ color: '#4a2c11', fontSize: '0.82rem' }}>
            <span style={{ color: '#800020', fontWeight: 700 }}>Motif:</span> {saree.motifName || saree.motif}
          </span>
          {saree.isOutOfStock || (saree.stockQuantity !== undefined && saree.stockQuantity <= 0) ? (
            <span style={{
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '3px 9px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.72rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              🔴 Loom Order
            </span>
          ) : (
            <span style={{
              background: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              padding: '3px 9px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.72rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              🟢 Available in Vault
            </span>
          )}
        </div>

        {/* ✦ MOBILE TOGGLE BUTTON FOR SPECS (+ MORE DETAILS) ✦ */}
        <button
          type="button"
          className="btn-card-more-details"
          onClick={(e) => {
            e.stopPropagation();
            setShowMobileDetails(prev => !prev);
          }}
          aria-expanded={showMobileDetails}
          title="Click to view saree length and color details"
        >
          <span style={{ fontWeight: 800, fontSize: '0.82rem', marginRight: '3px' }}>
            {showMobileDetails ? '−' : '+'}
          </span>
          <span>{showMobileDetails ? 'Hide Details' : 'More Details'}</span>
        </button>

        {/* ✦ ELEGANT SPECS CONTAINER (COLLAPSIBLE ON MOBILE, VISIBLE ON DESKTOP) ✦ */}
        <div className={`saree-card-specs-collapsible ${showMobileDetails ? 'open' : ''}`}>
          {/* ✦ ELEGANT ROYAL DIMENSION & LENGTH SPECIFICATION ✦ */}
          {(() => {
            const isDupatta = (saree.category || '').toLowerCase().includes('dupatta') || 
                              (saree.title || '').toLowerCase().includes('dupatta') || 
                              (saree.weave || '').toLowerCase().includes('dupatta');
            
            let rawLen = saree.length || (isDupatta ? '2.50 Meters (Handloom Silk with Zari Pallu)' : '5.50m Saree + 0.80m Blouse (6.30m Total)');
            
            // Thoroughly sanitize any Gujarati text or redundant prefixes
            const cleanLengthText = String(rawLen)
              .replace(/\(લંબાઈ\)/gi, '')
              .replace(/લંબાઈ/gi, '')
              .replace(/^Length\s*:\s*/gi, '')
              .trim();

            return (
              <div className="saree-dimension-badge" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#3d2314',
                background: 'linear-gradient(135deg, #fffcf7 0%, #fdf5ea 100%)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                borderLeft: '3px solid #800020',
                padding: '0.38rem 0.75rem',
                borderRadius: '6px',
                marginBottom: '0.65rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <span style={{ color: '#800020', fontSize: '0.85rem' }}>📏</span>
                <span style={{ letterSpacing: '0.01em', lineHeight: 1.3 }}>
                  <strong style={{ color: '#800020', fontWeight: 700 }}>Length:</strong> {cleanLengthText}
                </span>
              </div>
            );
          })()}

          {/* ✦ ELEGANT COLOR DETAILS BADGE ✦ */}
          {(() => {
            let rawColor = saree.colors || saree.color || '';
            
            if (!rawColor || !rawColor.trim()) {
              const searchStr = `${saree.motif || ''} ${saree.motifName || ''} ${saree.title || ''}`.toLowerCase();
              if (searchStr.includes('ratan') || searchStr.includes('jewel') || searchStr.includes('rat')) {
                rawColor = 'Madder Ruby Red & Antique Mustard Gold';
              } else if (searchStr.includes('chhabdi') || searchStr.includes('emerald') || searchStr.includes('basket')) {
                rawColor = 'Emerald Green, Vermilion Red & Royal Gold';
              } else if (searchStr.includes('pan') || searchStr.includes('blue') || searchStr.includes('peacock') || searchStr.includes('leaf')) {
                rawColor = 'Midnight Peacock Blue & Deep Maroon';
              } else if (searchStr.includes('nari') || searchStr.includes('maneek') || searchStr.includes('manek') || searchStr.includes('elephant')) {
                rawColor = 'Deep Crimson Red, Saffron Ochre & Gold';
              } else if (searchStr.includes('navratna')) {
                rawColor = 'Nine Sacred Gemstone Hues with Zari Border';
              } else if (searchStr.includes('shikargah') || searchStr.includes('forest')) {
                rawColor = 'Forest Olive Green, Rust Red & Golden Thread';
              } else if (searchStr.includes('sakhiyo')) {
                rawColor = 'Heritage Maroon & Rich Ochre Yellow';
              } else {
                rawColor = 'Deep Crimson Red, Mustard & Golden Zari';
              }
            }

            const cleanColorText = String(rawColor)
              .replace(/^Colors?\s*:\s*/gi, '')
              .trim();

            return (
              <div className="saree-color-badge" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#3d2314',
                background: 'linear-gradient(135deg, #fffcf7 0%, #fdf5ea 100%)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                borderLeft: '3px solid #800020',
                padding: '0.38rem 0.75rem',
                borderRadius: '6px',
                marginBottom: '0.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <span style={{ color: '#800020', fontSize: '0.85rem' }}>🎨</span>
                <span style={{ letterSpacing: '0.01em', lineHeight: 1.3 }}>
                  <strong style={{ color: '#800020', fontWeight: 700 }}>Color:</strong> {cleanColorText}
                </span>
              </div>
            );
          })()}
        </div>

        <div className="saree-card-footer">
          <div className="saree-price-wrap">
            <span className="price-label">Investment</span>
            {/* ✦ DISCOUNT PRICE RENDERING IN CARD FOOTER ✦ */}
            {hasDiscount ? (
              <div className="saree-discount-price-block">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ textDecoration: 'line-through', color: '#888', fontSize: '0.92rem', fontWeight: 400 }}>
                    {formatPrice(saree.basePriceINR)}
                  </span>
                  <span className="saree-price" style={{ fontWeight: 700, fontSize: '1.35rem' }}>
                    {formatPrice(finalPriceValue)}
                  </span>
                  <span style={{ color: '#b91c1c', fontSize: '0.82rem', fontWeight: 600 }}>
                    ({discountPercent}% OFF)
                  </span>
                </div>
              </div>
            ) : (
              <span className="saree-price">{formatPrice(saree.basePriceINR)}</span>
            )}
          </div>

          <button
            className="saree-btn-add"
            onClick={() => onAddToCart({
              ...saree,
              basePriceINR: hasDiscount ? finalPriceValue : saree.basePriceINR,
              originalPriceINR: saree.basePriceINR,
              finalPriceINR: finalPriceValue,
              discountPercent,
              isLoomOrder: !!saree.isOutOfStock
            })}
            style={saree.isOutOfStock ? {
              background: '#4e342e',
              borderColor: '#8d6e63',
              color: '#ffcc80'
            } : {}}
            title={saree.isOutOfStock ? 'Piece is out of vault stock. Handcrafting starts upon loom order (2 to 4 Months).' : 'Express dispatch from vault (4 to 6 Days)'}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {saree.isOutOfStock ? '🧵 Loom Order (2-4 Mo)' : 'Add to Bag'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function SareeCatalog({
  formatPrice,
  onAddToCart,
  onQuickView,
  onOpenCustomPatola,
  onInspectSaree,
  onOpenTrialRoom,
  onOpenVirtualTryOn,
  onSareesLoaded,
  wishlist = [],
  onToggleWishlist,
  catalogVersion = 0,
  uploadedSarees = [],
  deletedSareeIds = []
}) {
  const [sarees, setSarees] = useState(() => {
    try {
      const saved = localStorage.getItem('patola_cached_catalog_page1') || sessionStorage.getItem('patola_cached_catalog_page1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 24);
      }
    } catch (e) {}
    return [];
  });

  // Notify parent of loaded sarees
  useEffect(() => {
    if (typeof onSareesLoaded === 'function' && sarees.length > 0) {
      onSareesLoaded(sarees);
    }
  }, [sarees, onSareesLoaded]);
  const [activeCategory, setActiveCategory] = useState('all-saree');
  const [activeMotif, setActiveMotif] = useState('all');
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef(null);
  const loadingMoreRef = useRef(false);

  // Synchronize showcase banner cards width with filter-tab-group width
  const filterTabGroupRef = useRef(null);
  const [filterWidth, setFilterWidth] = useState(null);

  useEffect(() => {
    const el = filterTabGroupRef.current;
    if (!el) return;
    const updateWidth = () => {
      if (el) {
        setFilterWidth(el.offsetWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target) {
          setFilterWidth(entry.target.offsetWidth);
        }
      }
    });
    observer.observe(el);
    window.addEventListener('resize', updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Fetch sarees from database via Stored Procedure 'sp_GetSarees'
  useEffect(() => {
    async function loadSarees() {
      setNextCursor(null);
      try {
        // Drop the previous unbounded catalog cache; only the first API batch is cached now.
        localStorage.removeItem('patola_cached_catalog');
        sessionStorage.removeItem('patola_cached_catalog');
      } catch (e) {}
      // Only show shimmer skeleton if no sarees are currently loaded in view
      if (sarees.length === 0) {
        setLoading(true);
      }
      const data = await ApiService.fetchSareesPage({ category: activeCategory, motif: activeMotif, limit: 24 });

      const deletedSet = new Set(deletedSareeIds);

      const checkCategoryMatch = (sCat, filterCat, sareeObj = null) => {
        if (!filterCat || filterCat === 'all') return true;
        if (!sCat && !sareeObj) return false;

        const s = String(sCat || sareeObj?.category || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const f = String(filterCat).toLowerCase().replace(/[^a-z0-9]/g, '');
        const title = String(sareeObj?.title || '').toLowerCase();
        const weave = String(sareeObj?.weave || '').toLowerCase();
        const sId = String(sareeObj?.id || '').toLowerCase();

        // Strict detection for Dupattas
        const isDupatta = s.includes('dupatta') || 
                          title.includes('dupatta') || 
                          weave.includes('dupatta') || 
                          sId.startsWith('dupatta-') || 
                          sId.includes('dupatta');

        // 🥻 ALL SAREES: Strictly only Sarees (exclude all dupattas)
        if (f === 'allsaree' || f === 'allsarees' || f === 'saree') {
          return !isDupatta;
        }

        // 🧣 ALL DUPATTAS: Strictly only Dupattas
        if (f === 'alldupatta' || f === 'alldupattas' || f === 'dupatta') {
          return isDupatta;
        }
        if (f === 'doubledupatta') {
          return isDupatta && (s.includes('double') || title.includes('double') || weave.includes('double'));
        }
        if (f === 'singledupatta') {
          return isDupatta && (s.includes('single') || title.includes('single') || weave.includes('single'));
        }
        if (f === 'semidupatta') {
          return isDupatta && (s.includes('semi') || title.includes('semi') || weave.includes('semi'));
        }

        // Saree Category Filters (ensure dupatta is excluded)
        if (f === 'doubleikat') {
          return !isDupatta && (s.includes('double') || s.includes('doubleikat') || title.includes('double') || weave.includes('double'));
        }
        if (f === 'singleikat') {
          return !isDupatta && (s.includes('single') || s.includes('singleikat') || title.includes('single') || weave.includes('single'));
        }
        if (f === 'semipatola') {
          return !isDupatta && (s.includes('semi') || s.includes('semipatola') || title.includes('semi') || weave.includes('semi'));
        }
        if (f === 'zaributa') {
          return !isDupatta && (s.includes('zari') || s.includes('buta') || title.includes('zari') || weave.includes('zari'));
        }
        if (f === 'modern') {
          return !isDupatta && (s.includes('modern') || title.includes('modern'));
        }

        return s.includes(f) || f.includes(s);
      };

      if (data && Array.isArray(data.items)) {
        // Merge with any freshly uploaded sarees in local session if not returned yet
        const existingIds = new Set(data.items.map(s => s.id));
        const missingUploaded = uploadedSarees.filter(s => !existingIds.has(s.id) && !deletedSet.has(s.id));
        let allMerged = [...missingUploaded, ...data.items].filter(s => !deletedSet.has(s.id));
        try {
          const editedMap = JSON.parse(localStorage.getItem('patola_edited_sarees') || '{}');
          allMerged = allMerged.map(s => editedMap[s.id] ? { ...s, ...editedMap[s.id] } : s);
        } catch (e) {}

        // Persist clean merged catalog in cache so page reloads are instant
        try {
          localStorage.setItem('patola_cached_catalog_page1', JSON.stringify(allMerged.slice(0, 24)));
        } catch (e) {}

        const filtered = allMerged.filter(s => {
          const matchCat = checkCategoryMatch(s.category, activeCategory, s);
          const matchMotif = activeMotif === 'all' || s.motif === activeMotif;
          return matchCat && matchMotif;
        });

        setSarees(filtered);
        setNextCursor(data.nextCursor);
      } else {
        // If API returned null/empty, PRESERVE existing displayed sarees so data NEVER disappears!
        setSarees(prev => {
          if (prev && prev.length > 0) return prev;
          let allList = [...uploadedSarees].filter(s => !deletedSet.has(s.id));
          try {
            const saved = localStorage.getItem('patola_cached_catalog_page1');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) allList = parsed;
            }
            const editedMap = JSON.parse(localStorage.getItem('patola_edited_sarees') || '{}');
            allList = allList.map(s => editedMap[s.id] ? { ...s, ...editedMap[s.id] } : s);
          } catch (e) {}
          return allList.filter(s => {
            const matchCat = checkCategoryMatch(s.category, activeCategory, s);
            const matchMotif = activeMotif === 'all' || s.motif === activeMotif;
            return matchCat && matchMotif;
          });
        });
      }
      setLoading(false);
    }

    loadSarees();
  }, [activeCategory, activeMotif, catalogVersion, uploadedSarees, deletedSareeIds]);

  // Auto-scroll category tabs so the next category is brought into view smoothly on mobile/desktop
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeCategory === 'all') {
        const rows = document.querySelectorAll('.filter-tab-row');
        rows.forEach(r => {
          if (typeof r.scrollTo === 'function') {
            r.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            r.scrollLeft = 0;
          }
        });
        return;
      }
      const activeBtn = document.querySelector('.filter-tab-group .filter-btn.active');
      if (activeBtn) {
        const nextBtn = activeBtn.nextElementSibling;
        if (nextBtn && typeof nextBtn.scrollIntoView === 'function') {
          nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else if (typeof activeBtn.scrollIntoView === 'function') {
          activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [activeCategory]);

  const handleResetToAllTreasures = () => {
    setActiveCategory('all');
    setActiveMotif('all');
    setTimeout(() => {
      const rows = document.querySelectorAll('.filter-tab-row');
      rows.forEach(r => {
        if (typeof r.scrollTo === 'function') {
          r.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          r.scrollLeft = 0;
        }
      });
    }, 20);
  };

  const loadNextSareeBatch = useCallback(async () => {
    if (loadingMoreRef.current || !nextCursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await ApiService.fetchSareesPage({
        category: activeCategory,
        motif: activeMotif,
        cursor: nextCursor,
        limit: 24
      });
      if (!page) {
        setNextCursor(null);
        return;
      }

      const deletedSet = new Set(deletedSareeIds);
      let incoming = page.items.filter(s => !deletedSet.has(s.id));
      try {
        const editedMap = JSON.parse(localStorage.getItem('patola_edited_sarees') || '{}');
        incoming = incoming.map(s => editedMap[s.id] ? { ...s, ...editedMap[s.id] } : s);
      } catch (e) {}

      setSarees(previous => {
        const loadedIds = new Set(previous.map(s => String(s.id)));
        const merged = [...previous, ...incoming.filter(s => !loadedIds.has(String(s.id)))];
        try {
          // Keep only the first batch in browser storage instead of caching the full catalog.
          localStorage.setItem('patola_cached_catalog_page1', JSON.stringify(merged.slice(0, 24)));
        } catch (e) {}
        return merged;
      });
      setNextCursor(page.nextCursor);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [activeCategory, activeMotif, deletedSareeIds, nextCursor]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || loading || loadingMore || !nextCursor) return undefined;

    if (typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        loadNextSareeBatch();
      }
    }, { rootMargin: '600px 0px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, loadingMore, loadNextSareeBatch, nextCursor]);

  return (
    <section className="section-padding collection-section" id="collection">
      <div className="container">
        <div className="section-header">
          <span className="section-eyebrow">Rare Handloom Treasures</span>
          <h2 className="section-title">The Royal Patola & Dupatta Collection</h2>
          <p className="section-subtitle">
            Every Patola saree and authentic royal dupatta is handcrafted on traditional rosewood looms upon customer commission (Handcrafting Timeline: 2 to 4 Months).
          </p>
          <div className="gold-divider"></div>
        </div>

        {/* BESPOKE CUSTOM PATOLA CREATION HERO BANNER (ENGLISH) */}
        <div className="bespoke-commission-card">
          <div className="bespoke-card-left">
            <span className="bespoke-tag">✦ Bespoke Patola Weaving Service (Made-to-Order) ✦</span>
            <h3 className="bespoke-title">Craft a Bespoke Patola from Your Favorite Design or Vintage Photo</h3>
            <p className="bespoke-desc">
              If you have an antique family Patola photograph, design sketch, or specific color palette, upload your reference image to commission an authentic Double Ikat masterpiece directly from our Master Salvi Weavers (Handcrafting Timeline: 2 to 4 Months).
            </p>
          </div>
          <button
            type="button"
            className="btn-primary-gold bespoke-btn"
            onClick={onOpenCustomPatola}
          >
            📷 Upload Photo & Commission Custom Saree ✦
          </button>
        </div>

        {/* Filter Controls */}
        <div className="catalog-filter-controls" id="sareeGridArea">
          <div
            className="collection-category-showcase"
            role="region"
            aria-label="Collection Categories"
            style={filterWidth ? { width: `${filterWidth}px`, maxWidth: '100%' } : undefined}
          >
            {/* Card 1: All Sarees (LEFT) */}
            <div
              className={`royal-showcase-card showcase-saree-card ${!activeCategory?.includes('dupatta') ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory('all-saree');
                const el = document.getElementById('sareeGridArea');
                if (el) {
                  const navOffset = 80;
                  const pos = el.getBoundingClientRect().top + window.pageYOffset;
                  window.scrollTo({ top: pos - navOffset, behavior: 'smooth' });
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveCategory('all-saree');
                }
              }}
              aria-label="View All Sarees Collection"
            >
              {/* Info content */}
              <div className="card-info-panel">
                <div className="card-tag-pill saree-tag">
                  <span className="tag-icon">🥻</span>
                  <span className="tag-txt">SAREES</span>
                </div>
                <h3 className="card-title">ALL SAREES</h3>
                <p className="card-subtitle">Pure Mulberry Silk</p>

                <div className="card-action-wrap">
                  {!activeCategory?.includes('dupatta') ? (
                    <span className="card-btn-pill active-pill">
                      Selected
                      <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" className="check-icon">
                        <path d="M13.485 3.515a1 1 0 0 1 0 1.414l-7 7a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414L6.071 10.1l6-6a1 1 0 0 1 1.414 0z" />
                      </svg>
                    </span>
                  ) : (
                    <span className="card-btn-pill explore-pill">
                      Explore →
                    </span>
                  )}
                </div>
              </div>

              {/* Right Photo Window with Royal Crest */}
              <div className="card-photo-window">
                <img
                  src="/assets/images/showcase_saree_mannequin.jpg"
                  alt="Royal Patola Saree on Mannequin"
                  className="card-showcase-photo"
                  loading="eager"
                />
                <div className="photo-shield-crest saree-crest" aria-hidden="true">
                  <span className="crest-title">SAREE</span>
                  <span className="crest-motif">❖</span>
                </div>
              </div>
            </div>

            {/* Card 2: All Dupattas (RIGHT) */}
            <div
              className={`royal-showcase-card showcase-dupatta-card ${activeCategory?.includes('dupatta') ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory('all-dupatta');
                const el = document.getElementById('sareeGridArea');
                if (el) {
                  const navOffset = 80;
                  const pos = el.getBoundingClientRect().top + window.pageYOffset;
                  window.scrollTo({ top: pos - navOffset, behavior: 'smooth' });
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveCategory('all-dupatta');
                }
              }}
              aria-label="View All Dupattas Collection"
            >
              {/* Info content */}
              <div className="card-info-panel">
                <div className="card-tag-pill dupatta-tag">
                  <span className="tag-icon">🧣</span>
                  <span className="tag-txt">DUPATTAS</span>
                </div>
                <h3 className="card-title">ALL DUPATTAS</h3>
                <p className="card-subtitle">Handloom Silk Pallu</p>

                <div className="card-action-wrap">
                  {activeCategory?.includes('dupatta') ? (
                    <span className="card-btn-pill active-pill">
                      Selected
                      <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" className="check-icon">
                        <path d="M13.485 3.515a1 1 0 0 1 0 1.414l-7 7a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414L6.071 10.1l6-6a1 1 0 0 1 1.414 0z" />
                      </svg>
                    </span>
                  ) : (
                    <span className="card-btn-pill explore-pill">
                      Explore →
                    </span>
                  )}
                </div>
              </div>

              {/* Right Photo Window with Royal Crest */}
              <div className="card-photo-window">
                <img
                  src="/assets/images/showcase_dupatta_chair.jpg"
                  alt="Royal Handloom Patola Dupatta on Heritage Chair"
                  className="card-showcase-photo"
                  loading="eager"
                />
                <div className="photo-shield-crest dupatta-crest" aria-hidden="true">
                  <span className="crest-title">DUPATTA</span>
                  <span className="crest-motif">❖</span>
                </div>
              </div>
            </div>
          </div>

          <div className="filter-tab-group" ref={filterTabGroupRef} role="tablist">
            <div className="filter-tab-row saree-tab-row">
              {[
                { label: '🥻 All Sarees', val: 'all-saree' },
                { label: 'Double Ikat Sarees', val: 'double-ikat' },
                { label: 'Single Ikat Sarees', val: 'single-ikat' },
                { label: 'Semi Patola Sarees', val: 'semi-patola' },
                { label: 'Zari Buta Sarees', val: 'zari-buta' },
                { label: 'Modern Sarees', val: 'Modern' }
              ].map(tab => (
                <button
                  key={tab.val}
                  className={`filter-btn ${activeCategory === tab.val ? 'active' : ''}`}
                  onClick={(e) => {
                    setActiveCategory(tab.val);
                    const btn = e.currentTarget;
                    const nextBtn = btn.nextElementSibling;
                    if (nextBtn && typeof nextBtn.scrollIntoView === 'function') {
                      nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    } else if (btn && typeof btn.scrollIntoView === 'function') {
                      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="filter-tab-row dupatta-tab-row">
              {[
                { label: '🧣 All Dupattas', val: 'all-dupatta' },
                { label: 'Double Ikat Dupatta', val: 'double-dupatta' },
                { label: 'Single Ikat Dupatta', val: 'single-dupatta' },
                { label: 'Semi Patola Dupatta', val: 'semi-dupatta' }
              ].map(tab => (
                <button
                  key={tab.val}
                  className={`filter-btn ${activeCategory === tab.val ? 'active' : ''}`}
                  onClick={(e) => {
                    setActiveCategory(tab.val);
                    const btn = e.currentTarget;
                    const nextBtn = btn.nextElementSibling;
                    if (nextBtn && typeof nextBtn.scrollIntoView === 'function') {
                      nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    } else if (btn && typeof btn.scrollIntoView === 'function') {
                      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="motif-subfilter">
            <label htmlFor="reactMotifSelect">
              <span style={{ color: '#d4af37' }}>❖</span> Filter by Motif:
            </label>
            <select
              id="reactMotifSelect"
              className="motif-select"
              value={activeMotif}
              onChange={(e) => {
                setActiveMotif(e.target.value);
                const el = document.getElementById('sareeGridArea');
                if (el) {
                  const navOffset = 90;
                  const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
                  window.scrollTo({
                    top: elementPosition - navOffset,
                    behavior: 'smooth'
                  });
                }
              }}
            >
              <option value="all">✦ All Sacred Motifs</option>
              <option value="nari-kunjar">Nari Kunjar (Elephant & Maiden)</option>
              <option value="ratanchowk">Manek Chowk (Jewel Squares)</option>
              <option value="chhabdi">Chhabdi Bhat (Floral Basket)</option>
              <option value="pan-bhat">Pan Bhat (Betel Leaf & Gems)</option>
              <option value="Navratna">Navratna (Gems Geometric)</option>
              <option value="Sakhiyo">Sakhiyo (Figurative / Human)</option>
            </select>
          </div>
        </div>

        {/* Saree Grid: Royal Shimmer Skeleton Cards when loading */}
        {loading ? (
          <div className="saree-grid" aria-label="Loading royal patola sarees">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="saree-card saree-skeleton-card">
                <div className="saree-image-wrapper skeleton-box">
                  <div className="skeleton-badge-pill"></div>
                  <div className="skeleton-shimmer-wave"></div>
                </div>
                <div className="saree-content skeleton-content-wrap">
                  <div className="skeleton-line skeleton-title-line"></div>
                  <div className="skeleton-line skeleton-motif-line"></div>
                  <div className="skeleton-divider"></div>
                  <div className="skeleton-footer-row">
                    <div className="skeleton-price-block">
                      <div className="skeleton-line skeleton-price-sub"></div>
                      <div className="skeleton-line skeleton-price-val"></div>
                    </div>
                    <div className="skeleton-action-btn"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="saree-grid" id="sareeCardsGrid">
            {sarees.map(saree => (
              <SareeCardItem
                key={saree.id}
                saree={saree}
                formatPrice={formatPrice}
                onQuickView={onQuickView}
                onInspectSaree={onInspectSaree}
                onOpenTrialRoom={onOpenTrialRoom}
                onOpenVirtualTryOn={onOpenVirtualTryOn}
                onAddToCart={onAddToCart}
                onToggleWishlist={onToggleWishlist}
                isWishlisted={wishlist.some(w => String(w.id) === String(saree.id))}
              />
            ))}
          </div>
        )}
        {!loading && nextCursor && (
          <div
            ref={loadMoreRef}
            style={{ display: 'flex', justifyContent: 'center', padding: '1.25rem 0' }}
          >
            <button
              type="button"
              className="btn-outline-gold"
              onClick={loadNextSareeBatch}
              disabled={loadingMore}
              style={{ minWidth: '180px' }}
            >
              {loadingMore ? 'Loading Sarees…' : 'Load More Sarees'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
