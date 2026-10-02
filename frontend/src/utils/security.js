/**
 * VIRASAT PATOLA - ENTERPRISE FRONTEND SECURITY & ANTI-HACKING SHIELD
 * 
 * Protects against:
 * 1. DevTools Code Inspection (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U)
 * 2. Right-Click context menu theft & scraping
 * 3. Console script injection & token theft
 * 4. Fake customer / Bot form submissions
 */

const KNOWN_DUMMY_PHONES = new Set([
  '1234567890', '0123456789', '0000000000', '1111111111', '2222222222',
  '3333333333', '4444444444', '5555555555', '6666666666', '7777777777',
  '8888888888', '9999999999', '9876543210'
]);

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com', 'mailinator.com', 'trashmail.com', '10minutemail.com',
  'guerrillamail.com', 'dispostable.com', 'fake.com', 'yopmail.com',
  'sharklasers.com', 'fakemailgenerator.com', 'getairmail.com', 'throwawaymail.com'
]);

/**
 * Validates whether user credentials look like a fake customer, bot, or dummy number.
 * Returns { isFake: boolean, reason?: string }
 */
export function validateCustomerSecurity(fullName = '', phone = '', email = '') {
  // 1. Phone validation
  const cleanPhone = String(phone).replace(/\D/g, '');
  const actualDigits = cleanPhone.length > 10 && cleanPhone.startsWith('91') 
    ? cleanPhone.slice(2) 
    : cleanPhone;

  if (!actualDigits || actualDigits.length !== 10) {
    return { isFake: true, reason: 'Please enter a valid 10-digit mobile number.' };
  }

  if (actualDigits === '9999999999') {
    // Allowed for manual testing / demo orders
  } else {
    if (KNOWN_DUMMY_PHONES.has(actualDigits)) {
      return { isFake: true, reason: 'Security Warning: Dummy or fake phone numbers are strictly prohibited.' };
    }

    const firstDigit = actualDigits[0];
    if (firstDigit < '6' || firstDigit > '9') {
      return { isFake: true, reason: 'Please enter a valid Indian mobile number starting with 6, 7, 8, or 9.' };
    }

    if (/^(\d)\1{9}$/.test(actualDigits)) {
      return { isFake: true, reason: 'Security Warning: Repetitive dummy digits detected.' };
    }
  }

  // 2. Email validation
  if (email && email.trim()) {
    const domain = email.trim().toLowerCase().split('@')[1];
    if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      return { isFake: true, reason: 'Security Warning: Temporary disposable emails are blocked.' };
    }
  }

  // 3. Name validation (no XSS or bot script tags)
  if (!fullName || fullName.trim().length < 2) {
    return { isFake: true, reason: 'Please enter a valid full name.' };
  }

  if (/<[^>]+>|javascript:|alert\(|script/i.test(fullName)) {
    return { isFake: true, reason: 'Security Warning: Malicious script injection detected.' };
  }

  return { isFake: false };
}

/**
 * Displays a non-intrusive royal security toast notification
 */
export function showSecurityToast(message) {
  let toast = document.getElementById('patola-security-shield-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'patola-security-shield-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, #1e1b4b 0%, #31101e 100%);
      color: #fef08a;
      border: 1.5px solid #d4af37;
      padding: 12px 20px;
      border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13.5px;
      font-weight: 700;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      z-index: 9999999;
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }

  toast.innerHTML = `🛡️ <span>${message}</span>`;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  clearTimeout(window.__securityToastTimer);
  window.__securityToastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
  }, 3200);
}

/**
 * Initializes anti-inspection, anti-tamper, and DevTools blocking protection.
 * In development (localhost / 127.0.0.1), DevTools & Right-Click are permitted
 * so you can develop and debug freely without restrictions.
 * In production (live website domain), full blocking is active automatically.
 */
export function initAppSecurity() {
  if (typeof window === 'undefined') return;

  const isLocalHost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.hostname === '[::1]';

  // Check if developer explicitly toggled security testing on localhost
  const forceSecurityTest = localStorage.getItem('patola_force_security_test') === 'true';

  // If on localhost and not explicitly testing security, allow normal development inspection
  if (isLocalHost && !forceSecurityTest) {
    console.info('%c🛠️ VIRASAT PATOLA DEV MODE: DevTools and Right-Click are ENABLED on localhost for development.', 'color: #3b82f6; font-weight: bold;');
    console.info('%c💡 Tip: Press Ctrl + Alt + D to test production anti-inspection shield on localhost.', 'color: #8b5cf6;');
    
    // Allow developer to toggle test mode using Ctrl + Alt + D
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.altKey && (e.key === 'd' || e.key === 'D')) {
        localStorage.setItem('patola_force_security_test', 'true');
        alert('🛡️ Production Security Shield ACTIVATED for testing! Press Ctrl + Alt + D again to deactivate.');
        window.location.reload();
      }
    });
    return;
  }

  // Developer toggle to disable test mode on localhost
  if (isLocalHost && forceSecurityTest) {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.altKey && (e.key === 'd' || e.key === 'D')) {
        localStorage.removeItem('patola_force_security_test');
        alert('🛠️ Dev Mode Restored! DevTools and Right-Click enabled.');
        window.location.reload();
      }
    });
  }

  // 1. Console Warning Shield
  try {
    const bannerStyle = 'color: #ef4444; font-size: 26px; font-weight: 900; -webkit-text-stroke: 1px black;';
    const subStyle = 'color: #d4af37; font-size: 14px; font-weight: 700; background: #1a0b12; padding: 6px 12px; border-radius: 6px;';
    console.log('%c🛑 STOP! PATOLA MADE VANKAR SECURITY SHIELD ACTIVATED', bannerStyle);
    console.log('%c🔒 This browser feature is protected. Pasting unauthorized code or attempting to tamper with order APIs will result in immediate IP blocking.', subStyle);
  } catch (e) {}

  // 2. Prevent Right-Click Context Menu
  window.addEventListener('contextmenu', (e) => {
    // Allow right-click on input and textarea for normal customer typing
    const tag = e.target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    
    e.preventDefault();
    showSecurityToast('🔒 Content Protected: PATOLA MADE VANKAR authentic handwoven designs and craft are protected.');
  }, { passive: false });

  // 3. Intercept & Block Developer Inspection Key Shortcuts
  window.addEventListener('keydown', (e) => {
    // F12 key
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      showSecurityToast('🛡️ Security Protection: Developer tools access is restricted.');
      return false;
    }

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    // Ctrl+Shift+I / Cmd+Opt+I (Inspect)
    // Ctrl+Shift+J / Cmd+Opt+J (Console)
    // Ctrl+Shift+C (Inspect Element)
    if (isCtrlOrCmd && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      showSecurityToast('🛡️ Security Shield: Source code inspection is disabled.');
      return false;
    }

    // Ctrl+U / Cmd+Opt+U (View Source)
    if (isCtrlOrCmd && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      showSecurityToast('🛡️ Security Shield: Page source viewing is disabled.');
      return false;
    }

    // Ctrl+S (Save Page)
    if (isCtrlOrCmd && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      return false;
    }
  }, { capture: true, passive: false });
}

/**
 * Generates or retrieves a unique, persistent 4-digit Delivery Handover OTP for an order.
 * - If order already has a valid OTP (and not static fallback '4892'), returns and persists it.
 * - Otherwise generates a deterministic 4-digit OTP unique to that order reference/id.
 * - Persists to localStorage ('patola_order_otps') so Admin and Customer Tracking always match.
 */
export function getOrderDeliveryOtp(orderOrRef) {
  if (!orderOrRef) return '4892';

  let ref = '';
  let dbOtp = null;

  if (typeof orderOrRef === 'object' && orderOrRef !== null) {
    ref = String(orderOrRef.orderReference || orderOrRef.id || orderOrRef.bookingId || '').replace(/^#+/, '').trim();
    if (orderOrRef.deliveryOtp && String(orderOrRef.deliveryOtp).trim().length === 4 && String(orderOrRef.deliveryOtp).trim() !== '4892') {
      dbOtp = String(orderOrRef.deliveryOtp).trim();
    }
  } else {
    ref = String(orderOrRef).replace(/^#+/, '').trim();
  }

  if (!ref) return '4892';

  // Canonicalize Custom Order reference (e.g. CST-12, #CST-12, VP-CST-0012, or custom booking id)
  let isCustom = false;
  let customId = '';
  if (typeof orderOrRef === 'object' && orderOrRef !== null) {
    if (orderOrRef.motifPreference || orderOrRef.isCustomOrder || (orderOrRef.experienceType && String(orderOrRef.experienceType).includes('Custom'))) {
      isCustom = true;
      customId = String(orderOrRef.id || '').replace(/\D/g, '');
    }
  }
  if (!isCustom && ref.toUpperCase().includes('CST')) {
    isCustom = true;
    customId = ref.replace(/\D/g, '');
  }

  const canonicalRef = (isCustom && customId) ? `CST-${customId}` : ref;

  // Compute deterministic canonical hash based on order reference (Guarantees Admin & Customer ALWAYS match 100%)
  const hashSource = canonicalRef || ref;
  let hash = 0;
  for (let i = 0; i < hashSource.length; i++) {
    hash = ((hash << 5) - hash) + hashSource.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  const canonicalOtp = String(1000 + (positiveHash % 9000));

  // If backend DB provided an OTP that is not placeholder, use it; otherwise use canonical deterministic OTP
  const finalOtp = (dbOtp && dbOtp !== '7771') ? dbOtp : canonicalOtp;

  // Persist across all custom alias keys so it stays in 100% sync
  try {
    const savedOtps = JSON.parse(localStorage.getItem('patola_order_otps') || '{}');
    savedOtps[ref] = finalOtp;
    savedOtps[`#${ref}`] = finalOtp;
    if (canonicalRef) savedOtps[canonicalRef] = finalOtp;
    if (customId) {
      savedOtps[customId] = finalOtp;
      savedOtps[`VP-CST-${customId.padStart(4, '0')}`] = finalOtp;
    }
    localStorage.setItem('patola_order_otps', JSON.stringify(savedOtps));
  } catch (e) {}

  return finalOtp;
}

export function saveOrderDeliveryOtp(ref, otp) {
  if (!ref || !otp) return;
  const clean = String(ref).replace(/^#+/, '').trim();
  try {
    const savedOtps = JSON.parse(localStorage.getItem('patola_order_otps') || '{}');
    savedOtps[clean] = String(otp);
    savedOtps[`#${clean}`] = String(otp);
    localStorage.setItem('patola_order_otps', JSON.stringify(savedOtps));
  } catch (e) {}
}

/**
 * Formats any date string, timestamp, or Date object to strictly DD-MM-YYYY format (e.g. 23-09-2026).
 */
export function formatDateDDMMYYYY(dateInput, fallback = 'Today') {
  if (!dateInput) return fallback;
  const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}


