/**
 * Image helper to differentiate between standing model / mannequin photos 
 * and only-saree flat/drape photos.
 *
 * Rule:
 * 1. Standing model / mannequin photos -> object-fit: contain (so head and feet are never cropped).
 * 2. Only-saree photos from different angles (stand, pallu, weave, macro) -> object-fit: cover (fills edge-to-edge).
 */
export function isStandingModelPhoto(url = '', naturalWidth = 0, naturalHeight = 0, photoIndex = -1) {
  if (!url) return false;
  const str = String(url).toLowerCase();

  // 1. If explicitly saree-only or dupatta indicators exist in filename/url, it is ALWAYS a saree photo -> cover
  const isExplicitSareeOnly = (
    str.includes('pallu') ||
    str.includes('macro') ||
    str.includes('weave') ||
    str.includes('fabric') ||
    str.includes('border') ||
    str.includes('loom') ||
    str.includes('dupatta') ||
    str.includes('chhabdi') ||
    str.includes('ratanchowk') ||
    str.includes('flat')
  ) && !str.includes('model') && !str.includes('mannequin');

  if (isExplicitSareeOnly) {
    return false;
  }

  // 2. Aspect Ratio Check (The absolute truth):
  // An upright standing model is a tall vertical portrait photo (height > width).
  // Any wide, horizontal, or square photo (width >= height or ratio >= 0.90) is a saree/dupatta photo.
  if (naturalWidth > 0 && naturalHeight > 0) {
    const ratio = naturalWidth / naturalHeight;

    // Wide / landscape / square photo (like dupatta held in hands in Photo 4) -> fit to screen (cover)
    if (ratio >= 0.90 && !str.includes('mannequin') && !str.includes('model')) {
      return false;
    }

    // Tall vertical/portrait photo (height distinctly greater than width, e.g. 4:5, 3:4, 2:3, 9:16)
    // -> contain (so model is not cropped)
    if (ratio <= 0.88) {
      return true;
    }
  }

  // 3. Explicit keywords in filename or URL for standing model / mannequin
  if (
    str.includes('model') ||
    str.includes('mannequin') ||
    str.includes('silhouette') ||
    str.includes('wearing') ||
    str.includes('standing') ||
    str.includes('fullbody') ||
    str.includes('ubha')
  ) {
    return true;
  }

  // Default fallback: saree & dupatta photos must fit to screen (cover)
  return false;
}
