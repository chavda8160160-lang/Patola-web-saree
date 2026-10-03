/**
 * imageCompressor.js
 * High-performance client-side image compression utility.
 * - Supports all standard web images (JPEG, PNG, WebP)
 * - Natively supports Apple iPhone HEIC / HEIF camera photos via dynamic heic2any conversion
 * - Compresses raw 5MB - 25MB phone photos down to clean HD Web/Mobile assets (~80KB - 150KB)
 * - Eliminates browser lag, memory spikes, and localStorage quota exhaustion.
 */

let _heicModulePromise = null;
const getHeicModule = () => {
  if (!_heicModulePromise) _heicModulePromise = import('heic-to');
  return _heicModulePromise;
};

let _heicConverter = null;

/**
 * Lazy loads heic2any on-demand as secondary fallback
 */
const getHeicConverter = async () => {
  if (_heicConverter) return _heicConverter;
  try {
    const mod = await import('heic2any');
    _heicConverter = mod.default || mod;
    return _heicConverter;
  } catch (err) {
    console.warn('heic2any dynamic load error:', err);
    return null;
  }
};

/**
 * Detects if a file is an Apple iPhone HEIC/HEIF photo
 */
export const isHeicFile = async (file) => {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  if (
    name.endsWith('.heic') ||
    name.endsWith('.heif') ||
    type === 'image/heic' ||
    type === 'image/heif' ||
    type.includes('heic') ||
    type.includes('heif')
  ) {
    return true;
  }
  if (
    /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(name) ||
    ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif'].includes(type)
  ) {
    return false;
  }
  try {
    const { isHeic } = await getHeicModule();
    return await isHeic(file);
  } catch (e) {
    return false;
  }
};

/**
 * Compresses any File object (including Apple iPhone HEIC photos) to an optimized Base64 JPEG Data URL.
 * @param {File|Blob} file - Original image file from camera / photo album
 * @param {Object} options - Compression options
 * @returns {Promise<string>} Compressed Base64 Data URL
 */
export const compressImageFile = async (file, { maxWidth = 1000, maxHeight = 1000, quality = 0.80, targetMaxKb = 180 } = {}) => {
  if (!file) return null;

  let activeBlob = file;

  // 1. If Apple iPhone HEIC/HEIF photo, convert to standard JPEG blob first using dual engines
  const isAppleHeic = await isHeicFile(file);
  if (isAppleHeic) {
    let converted = false;

    // Engine 1: modern heic-to (WASM libheif with broad iOS 16/17/18 compatibility)
    try {
      const { heicTo } = await getHeicModule();
      const jpegBlob = await heicTo({
        blob: file,
        type: 'image/jpeg',
        quality: 0.85
      });
      if (jpegBlob) {
        activeBlob = jpegBlob;
        converted = true;
      }
    } catch (heicToErr) {
      console.warn('heic-to conversion failed, attempting heic2any fallback:', heicToErr);
    }

    // Engine 2: heic2any fallback
    if (!converted) {
      try {
        const converter = await getHeicConverter();
        if (converter) {
          const res = await converter({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.85
          });
          activeBlob = Array.isArray(res) ? res[0] : res;
          converted = true;
        }
      } catch (h2aErr) {
        console.warn('heic2any fallback failed:', h2aErr);
      }
    }

    if (!converted) {
      console.warn('HEIC conversion unsuccessful, attempting direct canvas load.');
    }
  }

  // 2. High-performance, memory-safe image loader (createObjectURL avoids large in-memory strings)
  const loadImage = (blob) => {
    return new Promise((resolve, reject) => {
      let objectUrl = null;
      try {
        objectUrl = URL.createObjectURL(blob);
      } catch (e) {}

      const img = new Image();
      img.onload = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        // Fallback to FileReader if objectURL failed
        const reader = new FileReader();
        reader.onload = (e) => {
          const fallbackImg = new Image();
          fallbackImg.onload = () => resolve(fallbackImg);
          fallbackImg.onerror = () => reject(new Error('Browser could not decode the selected image file.'));
          fallbackImg.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      };

      if (objectUrl) {
        img.src = objectUrl;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }
    });
  };

  try {
    const img = await loadImage(activeBlob);

    // 3. Compute optimal bounded dimensions
    let { width, height } = img;
    let targetW = width;
    let targetH = height;

    if (width > maxWidth || height > maxHeight) {
      if (width > height) {
        targetH = Math.round((height * maxWidth) / width);
        targetW = maxWidth;
      } else {
        targetW = Math.round((width * maxHeight) / height);
        targetH = maxHeight;
      }
    }

    targetW = Math.max(targetW, 1);
    targetH = Math.max(targetH, 1);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable.');
    }

    // Fill white background for transparent images
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);

    // High quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // 4. Initial export with target quality
    let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

    // 5. Smart Adaptive Compression Pass (If customer uploaded a huge dense photo > targetMaxKb)
    // Approximate base64 length in bytes is (len * 3 / 4)
    const maxChars = Math.round(targetMaxKb * 1024 * 1.37);
    if (compressedDataUrl.length > maxChars) {
      // Second pass: gently step down quality to 0.70
      let pass2 = canvas.toDataURL('image/jpeg', Math.max(quality - 0.12, 0.65));
      if (pass2.length < compressedDataUrl.length) {
        compressedDataUrl = pass2;
      }

      // If still oversized (e.g. extremely dense pattern), scale down canvas to 800px max
      if (compressedDataUrl.length > maxChars && (targetW > 800 || targetH > 800)) {
        const scaleFactor = 800 / Math.max(targetW, targetH);
        const w2 = Math.max(Math.round(targetW * scaleFactor), 1);
        const h2 = Math.max(Math.round(targetH * scaleFactor), 1);

        const canvas2 = document.createElement('canvas');
        canvas2.width = w2;
        canvas2.height = h2;
        const ctx2 = canvas2.getContext('2d');
        if (ctx2) {
          ctx2.fillStyle = '#FFFFFF';
          ctx2.fillRect(0, 0, w2, h2);
          ctx2.imageSmoothingEnabled = true;
          ctx2.imageSmoothingQuality = 'high';
          ctx2.drawImage(canvas, 0, 0, w2, h2);
          const pass3 = canvas2.toDataURL('image/jpeg', 0.72);
          if (pass3.length < compressedDataUrl.length) {
            compressedDataUrl = pass3;
          }
        }
      }
    }

    return compressedDataUrl;
  } catch (err) {
    console.warn('Canvas auto-compression fallback triggered:', err);
    // Absolute fallback: read as standard Data URL so user is never blocked
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(activeBlob);
    });
  }
};

/**
 * Compresses an existing Base64 Data URL if it exceeds 250KB.
 * @param {string} dataUrl - Existing Data URL
 * @param {Object} options - Compression options
 * @returns {Promise<string>} Compressed or original Data URL
 */
export const compressDataUrl = (dataUrl, { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = {}) => {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
      return resolve(dataUrl);
    }

    // If already compressed (< 250,000 characters ~ 185KB), no work needed
    if (dataUrl.length < 250000) {
      return resolve(dataUrl);
    }

    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(width, 1);
      canvas.height = Math.max(height, 1);

      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      try {
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) {
        resolve(dataUrl);
      }
    };

    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

/**
 * Background optimizer: Cleans and compresses any oversized Base64 images stored
 * in localStorage (e.g. patola_edited_sarees) from previous uncompressed uploads.
 */
export const cleanupAndCompressStorageSarees = async () => {
  try {
    const raw = localStorage.getItem('patola_edited_sarees');
    if (!raw) return;

    if (raw.length < 500000) return;

    const editedMap = JSON.parse(raw);
    let changed = false;

    for (const id of Object.keys(editedMap)) {
      const item = editedMap[id];
      if (!item) continue;

      if (item.image && typeof item.image === 'string' && item.image.length > 250000) {
        item.image = await compressDataUrl(item.image);
        changed = true;
      }

      if (Array.isArray(item.images)) {
        for (let i = 0; i < item.images.length; i++) {
          if (item.images[i] && typeof item.images[i] === 'string' && item.images[i].length > 250000) {
            item.images[i] = await compressDataUrl(item.images[i]);
            changed = true;
          }
        }
      }
    }

    if (changed) {
      localStorage.setItem('patola_edited_sarees', JSON.stringify(editedMap));
      console.log('⚡ High-performance image optimizer: Compressed bloated localStorage sarees successfully!');
    }
  } catch (err) {
    console.warn('Storage saree compression note:', err);
  }
};

/**
 * Opens any image (including Base64 Data URLs and server paths) in a new browser tab/page.
 * Handles browser restrictions on top-level data:image navigation by rendering a rich viewer document.
 */
export const openImageInNewTab = (imgSrc, title = 'Patola Reference Photo') => {
  if (!imgSrc) return false;

  try {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - PATOLA MADE VANKAR</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #0f0909;
      color: #d4af37;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #800020;
      color: #d4af37;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #d4af37;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    }
    .title {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .btn {
      background: #d4af37;
      color: #800020;
      border: none;
      padding: 7px 16px;
      border-radius: 6px;
      font-weight: 800;
      cursor: pointer;
      font-size: 0.88rem;
    }
    .btn:hover {
      background: #fef08a;
    }
    .view-area {
      padding: 70px 20px 20px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100vw;
      height: 100vh;
    }
    img {
      max-width: 95vw;
      max-height: 85vh;
      object-fit: contain;
      border-radius: 8px;
      border: 2px solid #d4af37;
      box-shadow: 0 8px 30px rgba(0,0,0,0.85);
      background: #1a1111;
    }
  </style>
</head>
<body>
  <div class="bar">
    <span class="title">👑 PATOLA MADE VANKAR • ${title}</span>
    <button class="btn" onclick="window.close()">✕ Close Tab</button>
  </div>
  <div class="view-area">
    <img src="${imgSrc}" alt="${title}" />
  </div>
</body>
</html>`);
      win.document.close();
      return true;
    }
  } catch (err) {
    console.warn('Could not open image in new window:', err);
  }

  // Fallback: If window.open was blocked or failed, attempt direct open for server URLs
  if (imgSrc.startsWith('http') || imgSrc.startsWith('/')) {
    window.open(imgSrc, '_blank');
    return true;
  }
  return false;
};

