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
export const compressImageFile = async (file, { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = {}) => {
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
        quality: 0.88
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
            quality: 0.88
          });
          activeBlob = Array.isArray(res) ? res[0] : res;
          converted = true;
        }
      } catch (h2aErr) {
        console.warn('heic2any fallback failed:', h2aErr);
      }
    }

    if (!converted) {
      throw new Error('Apple iPhone HEIC format could not be decoded. Please select a JPG/PNG or update camera format to Most Compatible.');
    }
  }

  // 2. Scale & compress through HTML5 Canvas
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Maintain aspect ratio while bounding within maxWidth / maxHeight
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
        if (!ctx) {
          return reject(new Error('Browser could not create an image canvas for compression.'));
        }

        // Fill background white in case of transparent images converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        try {
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (err) {
          reject(new Error(`Image compression failed: ${err.message || 'canvas export was blocked.'}`));
        }
      };

      img.onerror = () => {
        reject(new Error('Browser was unable to load image into canvas for optimization.'));
      };

      img.src = event.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(activeBlob);
  });
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
