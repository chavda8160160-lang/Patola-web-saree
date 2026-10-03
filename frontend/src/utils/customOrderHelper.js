/* ====================================================================================================
 * File Name: customOrderHelper.js
 * Folder: frontend/src/utils/
 * 
 * Purpose:
 * ----------------------------------------------------------------------------------------------------
 * Enterprise helper for bespoke custom Patola saree specifications:
 * - 4 distinct custom parts: Saree Body, Pallu (પાલવ), Border (કિનાર), Blouse (બ્લાઉઝ)
 * - Preset royal silk color palettes and hex swatches
 * - Multi-part photo and color parsing for Admin Dashboard and Customer Live Tracking
 * ==================================================================================================== */

export const ROYAL_COLOR_PRESETS = [
  { name: 'Royal Crimson Red', hex: '#800020' },
  { name: 'Emerald / Rama Green', hex: '#065f46' },
  { name: 'Peacock / Royal Blue', hex: '#1e3a8a' },
  { name: 'Mustard / Haldi Gold', hex: '#b45309' },
  { name: 'Rani Pink / Magenta', hex: '#be185d' },
  { name: 'Wine / Deep Purple', hex: '#581c87' },
  { name: 'Antique Gold Zari', hex: '#b4943e' },
  { name: 'Rust / Sindoor Orange', hex: '#c2410c' }
];

export const CUSTOM_PARTS_CONFIG = [
  {
    key: 'saree',
    label: 'Saree Body',
    labelGu: 'સાડી બોડી',
    icon: '🥻',
    defaultColor: '',
    desc: 'Main saree fabric weave & central body motifs'
  },
  {
    key: 'pallu',
    label: 'Pallu / Palav',
    labelGu: 'પલ્લુ / પાલવ',
    icon: '👑',
    defaultColor: '',
    desc: 'Grand palla drape weave, zari work & end motifs'
  },
  {
    key: 'border',
    label: 'Border',
    labelGu: 'કિનાર / બોર્ડર',
    icon: '📐',
    defaultColor: '',
    desc: 'Side kinar borders running along upper & lower edges'
  },
  {
    key: 'blouse',
    label: 'Blouse Piece',
    labelGu: 'બ્લાઉઝ પીસ',
    icon: '👚',
    defaultColor: 'Contrast Emerald Green',
    desc: 'Unstitched silk blouse fabric & sleeve border'
  }
];

/**
 * Safely parses custom order parts (photos and colors) from an order or booking object.
 * Supports:
 * 1. New structured multi-part JSON ({ saree, pallu, border, blouse })
 * 2. Flat JSON ({ sareePhoto, palluPhoto, ... })
 * 3. LocalStorage cached parts
 * 4. Legacy single photo fallback with notes color extraction
 */
export const parseCustomOrderParts = (b) => {
  if (!b) return null;

  let parsed = null;

  // 1. Direct object parts if already attached
  if (b.parts && typeof b.parts === 'object') {
    parsed = b.parts;
  } else if (b.customInfo?.parts && typeof b.customInfo.parts === 'object') {
    parsed = b.customInfo.parts;
  }

  // 2. Try JSON parsing from referencePhoto
  const rawRef = b.referencePhoto || b.customInfo?.referencePhoto;
  if (!parsed && rawRef) {
    if (typeof rawRef === 'object' && rawRef !== null) {
      parsed = rawRef;
    } else if (typeof rawRef === 'string' && rawRef.trim().startsWith('{')) {
      try {
        parsed = JSON.parse(rawRef);
      } catch (e) {}
    }
  }

  // 3. Try localStorage cache across all potential keys
  if (!parsed) {
    try {
      const photoMap = JSON.parse(localStorage.getItem('patola_custom_order_photos') || '{}');
      const bId = b.id || b.bookingId;
      const ref = b.orderReference || (bId ? `VP-CST-${String(bId).padStart(4, '0')}` : '');
      const phone = b.phone || b.contactPhone || '';
      const cleanPhone = String(phone).replace(/\D/g, '');

      const partKeys = [
        `parts_${bId}`,
        `parts_CST-${bId}`,
        `parts_${ref}`,
        `parts_${phone}`,
        `parts_${cleanPhone}`
      ];

      for (const k of partKeys) {
        if (photoMap[k]) {
          const val = photoMap[k];
          parsed = typeof val === 'string' && val.trim().startsWith('{') ? JSON.parse(val) : val;
          if (parsed && typeof parsed === 'object') break;
        }
      }

      // Check standard keys for JSON payload
      if (!parsed) {
        const stdKeys = [
          String(bId),
          `CST-${bId}`,
          ref,
          String(phone),
          cleanPhone
        ];
        for (const k of stdKeys) {
          if (k && photoMap[k] && typeof photoMap[k] === 'string' && photoMap[k].trim().startsWith('{')) {
            try {
              parsed = JSON.parse(photoMap[k]);
              if (parsed && typeof parsed === 'object') break;
            } catch (err) {}
          }
        }
      }
    } catch (e) {}
  }

  // 4. Fallback color extraction from notes
  const notes = b.notes || b.customInfo?.description || '';
  const sareeMatch = notes.match(/Saree(?:\s*Body)?:\s*([^.|]+)/i);
  const palluMatch = notes.match(/Pallu(?:\s*\/Palav)?:\s*([^.|]+)/i);
  const borderMatch = notes.match(/Border:\s*([^.|]+)/i);
  const blouseMatch = notes.match(/Blouse(?:\s*Piece)?:\s*([^.|]+)/i);
  const legacyColMatch = notes.match(/Colors?:\s*([^.]+)\./i);

  let singlePhoto = (typeof rawRef === 'string' && !rawRef.trim().startsWith('{') && rawRef.length > 3) ? rawRef : null;

  // If singlePhoto wasn't found yet, check localStorage raw/base64 backups
  if (!singlePhoto && !parsed) {
    try {
      const photoMap = JSON.parse(localStorage.getItem('patola_custom_order_photos') || '{}');
      const bId = b.id || b.bookingId;
      const ref = b.orderReference || (bId ? `VP-CST-${String(bId).padStart(4, '0')}` : '');
      const phone = b.phone || b.contactPhone || '';
      const cleanPhone = String(phone).replace(/\D/g, '');

      const candidates = [
        photoMap[String(bId)],
        photoMap[`CST-${bId}`],
        photoMap[ref],
        photoMap[phone],
        photoMap[cleanPhone],
        photoMap[`raw_${bId}`],
        photoMap[`raw_CST-${bId}`],
        photoMap[`raw_${ref}`],
        photoMap[`raw_${phone}`],
        photoMap[`raw_${cleanPhone}`]
      ];

      for (const cand of candidates) {
        if (typeof cand === 'string' && cand.length > 3 && !cand.trim().startsWith('{')) {
          singlePhoto = cand;
          break;
        }
      }
    } catch (e) {}
  }

  const sareeColor = parsed?.saree?.color || parsed?.sareeColor || (sareeMatch ? sareeMatch[1].trim() : (legacyColMatch ? legacyColMatch[1].trim() : ''));
  const palluColor = parsed?.pallu?.color || parsed?.palluColor || (palluMatch ? palluMatch[1].trim() : 'Antique Gold Zari');
  const borderColor = parsed?.border?.color || parsed?.borderColor || (borderMatch ? borderMatch[1].trim() : 'Matching Border');
  const blouseColor = parsed?.blouse?.color || parsed?.blouseColor || (blouseMatch ? blouseMatch[1].trim() : 'Contrast Emerald Green');

  const sareePhoto = parsed?.saree?.photo || parsed?.sareePhoto || singlePhoto;
  const palluPhoto = parsed?.pallu?.photo || parsed?.palluPhoto || null;
  const borderPhoto = parsed?.border?.photo || parsed?.borderPhoto || null;
  const blousePhoto = parsed?.blouse?.photo || parsed?.blousePhoto || null;

  const hasAnyPhoto = !!(sareePhoto || palluPhoto || borderPhoto || blousePhoto);

  return {
    saree: { photo: sareePhoto, color: sareeColor },
    pallu: { photo: palluPhoto, color: palluColor },
    border: { photo: borderPhoto, color: borderColor },
    blouse: { photo: blousePhoto, color: blouseColor },
    hasAnyPhoto,
    isMultiPart: !!(parsed || palluPhoto || borderPhoto || blousePhoto || palluMatch || borderMatch || blouseMatch)
  };
};
