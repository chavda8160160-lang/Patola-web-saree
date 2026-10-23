/* ====================================================================================================
 * FileName: productResolver.js
 * Folder: frontend/src/utils/
 * 
 * Central Product Photo & Metadata Resolver for Orders, Tracking & Admin Fulfillment
 * Ensures authentic high-definition Patola photos always resolve accurately even when
 * order records from SQL Server only contain sareeId and sareeTitle.
 * ==================================================================================================== */

import { DEFAULT_SAREES } from '../data/defaultSarees';

const DEFAULT_SAREE_IMAGES = [
  '/assets/images/saree_nari_kunjar.jpg',
  '/assets/images/patola_pallu.jpg',
  '/assets/images/patola_macro.jpg',
  '/assets/images/patola_drape.jpg',
  '/assets/images/artisan_loom.jpg'
];

/**
 * Resolves the accurate high-resolution photo for an ordered item.
 * Searches:
 * 1. Direct item.image property
 * 2. LocalStorage order item image cache (saved during checkout)
 * 3. Matched saree in catalog (backend uploaded or DEFAULT_SAREES)
 * 4. Specific known masterpiece catalog IDs (patola-crimson-ratanchowk, etc.)
 * 5. Motif & keyword matching in saree title
 * 6. Authentic default fallback
 */
export function resolveProductImage(item, order = null, catalogSarees = []) {
  if (!item) return DEFAULT_SAREE_IMAGES[0];

  // 1. Direct explicit image on the item object
  if (item.image && typeof item.image === 'string' && item.image.trim()) {
    const trimmed = item.image.trim();
    if (trimmed.startsWith('/') || trimmed.startsWith('http') || trimmed.startsWith('data:image')) {
      return trimmed;
    }
  }

  const sId = String(item.sareeId || item.id || '').toLowerCase().trim();
  const title = String(item.sareeTitle || item.title || item.name || '').toLowerCase().trim();
  const motif = String(item.motifName || item.motif || '').toLowerCase().trim();
  const ordRef = String(order?.orderReference || order?.id || '').trim();

  // 2. Check localStorage saved checkout images
  try {
    if (typeof localStorage !== 'undefined') {
      const savedImgs = JSON.parse(localStorage.getItem('patola_order_item_images') || '{}');
      if (ordRef && sId && savedImgs[`${ordRef}_${sId}`]) {
        return savedImgs[`${ordRef}_${sId}`];
      }
      if (ordRef && savedImgs[ordRef]) {
        return savedImgs[ordRef];
      }
      if (sId && savedImgs[sId]) {
        return savedImgs[sId];
      }
    }
  } catch (e) {}

  // 3. Search in catalog sarees + DEFAULT_SAREES
  const pool = [...(catalogSarees || []), ...(DEFAULT_SAREES || [])];
  const matched = pool.find(s => {
    if (!s) return false;
    const matchId = String(s.id || '').toLowerCase().trim();
    if (sId && matchId === sId) return true;
    const matchTitle = String(s.title || '').toLowerCase().trim();
    if (title && matchTitle === title) return true;
    return false;
  });

  if (matched?.image) return matched.image;
  if (Array.isArray(matched?.images) && matched.images[0]) return matched.images[0];

  // 4. Exact match for known masterpiece IDs
  if (sId === 'patola-crimson-ratanchowk') {
    return '/assets/images/saree_crimson_ratanchowk_1_full.jpg';
  }
  if (sId === 'patola-01') {
    return '/assets/images/saree_nari_kunjar.jpg';
  }
  if (sId === 'patola-02') {
    return '/assets/images/saree_ratanchowk.jpg';
  }
  if (sId === 'patola-03') {
    return '/assets/images/saree_emerald_chhabdi.jpg';
  }
  if (sId === 'patola-04') {
    return '/assets/images/saree_royal_blue.jpg';
  }

  // 5. Keyword analysis on title and motif
  if (sId.includes('crimson') || title.includes('crimson') || (title.includes('ratanchowk') && title.includes('kalash'))) {
    return '/assets/images/saree_crimson_ratanchowk_1_full.jpg';
  }
  if (title.includes('ratanchowk') || motif.includes('ratanchowk')) {
    // If priced around 2.25L, it's the Imperial Crimson Ratanchowk
    if (Number(item.unitPrice) >= 220000 || Number(order?.totalAmount) >= 220000) {
      return '/assets/images/saree_crimson_ratanchowk_1_full.jpg';
    }
    return '/assets/images/saree_ratanchowk.jpg';
  }
  if (title.includes('nari') || title.includes('kunjar') || motif.includes('nari') || motif.includes('kunjar')) {
    return '/assets/images/saree_nari_kunjar.jpg';
  }
  if (title.includes('chhabdi') || motif.includes('chhabdi')) {
    return '/assets/images/saree_emerald_chhabdi.jpg';
  }
  if (title.includes('blue') || title.includes('peacock') || motif.includes('pan') || title.includes('navratna')) {
    return '/assets/images/saree_royal_blue.jpg';
  }
  if (title.includes('dupatta') || sId.includes('dupatta')) {
    return '/assets/images/saree_royal_blue.jpg';
  }

  // 6. Final fallback based on order amount
  if (Number(item.unitPrice) >= 220000 || Number(order?.totalAmount) >= 220000) {
    return '/assets/images/saree_crimson_ratanchowk_1_full.jpg';
  }

  return DEFAULT_SAREE_IMAGES[0];
}

/**
 * Resolves full title for an item
 */
export function resolveProductTitle(item, order = null, catalogSarees = []) {
  if (item?.sareeTitle && item.sareeTitle.trim()) return item.sareeTitle.trim();
  if (item?.title && item.title.trim()) return item.title.trim();
  if (item?.pieceTitle && item.pieceTitle.trim()) return item.pieceTitle.trim();

  const sId = String(item?.sareeId || item?.id || '').toLowerCase().trim();
  const pool = [...(catalogSarees || []), ...(DEFAULT_SAREES || [])];
  const matched = pool.find(s => s && String(s.id || '').toLowerCase().trim() === sId);
  if (matched?.title) return matched.title;

  if (sId === 'patola-crimson-ratanchowk') return 'Imperial Crimson Ratanchowk & Kalash Double Ikat Patola';
  if (sId === 'patola-01') return 'Imperial Crimson Nari Kunjar Double Ikat';
  if (sId === 'patola-02') return 'Imperial Ruby Ratanchowk Heritage Silk';
  if (sId === 'patola-03') return 'Vedic Emerald Chhabdi Bhat Silk Saree';
  if (sId === 'patola-04') return 'Midnight Peacock Blue Navratna Patola';

  return 'Royal Heritage Double Ikat Patola Saree';
}

/**
 * Resolves motif name for an item
 */
export function resolveProductMotif(item, order = null, catalogSarees = []) {
  if (item?.motifName && item.motifName.trim()) return item.motifName.trim();
  if (item?.motif && item.motif.trim()) return item.motif.trim();

  const sId = String(item?.sareeId || item?.id || '').toLowerCase().trim();
  const pool = [...(catalogSarees || []), ...(DEFAULT_SAREES || [])];
  const matched = pool.find(s => s && String(s.id || '').toLowerCase().trim() === sId);
  if (matched?.motifName) return matched.motifName;

  if (sId === 'patola-crimson-ratanchowk') return 'Ratanchowk with Kalash & Floral Medallions';
  if (sId === 'patola-01') return 'Nari Kunjar (Elephant & Dancing Lady)';
  if (sId === 'patola-02') return 'Ratanchowk Bhat (Sacred Jewel Square)';
  if (sId === 'patola-03') return 'Chhabdi Bhat (Floral Auspicious Basket)';
  if (sId === 'patola-04') return 'Navratna Pan Bhat (Betel Leaf & Nine Gems)';

  return 'Traditional Sacred Ikat Motif';
}

/**
 * Resolves weave type for an item
 */
export function resolveProductWeave(item, order = null, catalogSarees = []) {
  if (item?.weave && item.weave.trim()) return item.weave.trim();

  const sId = String(item?.sareeId || item?.id || '').toLowerCase().trim();
  const pool = [...(catalogSarees || []), ...(DEFAULT_SAREES || [])];
  const matched = pool.find(s => s && String(s.id || '').toLowerCase().trim() === sId);
  if (matched?.weave) return matched.weave;

  if (sId === 'patola-04') return 'Single Ikat Handloom';
  return 'Double Ikat Handloom';
}
