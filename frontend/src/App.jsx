/* ====================================================================================================
 * File Name: App.jsx
 * Folder: frontend/src/
 * 
 * Root Component of the Virasat Patola Application
 * ----------------------------------------------------------------------------------------------------
 * Connects all major components: Navbar, Hero, SareeCatalog, MotifMagnifier, WeavingTimeline,
 * ArtisanStory, ConsultationModal, CartDrawer, CheckoutModal, OrderTrackingModal, and Footer.
 * ==================================================================================================== */

import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SareeCatalog from './components/SareeCatalog';
import MotifMagnifier from './components/MotifMagnifier';
import WeavingTimeline from './components/WeavingTimeline';
import ArtisanStory from './components/ArtisanStory';
import CartDrawer from './components/CartDrawer';
import Footer from './components/Footer';
import { initAppSecurity } from './utils/security';
import { initGA, trackPageView, trackViewItem, trackAddToCart } from './utils/analytics';
import { cleanupAndCompressStorageSarees } from './utils/imageCompressor';

const ConsultationModal = lazy(() => import('./components/ConsultationModal'));
const CustomPatolaModal = lazy(() => import('./components/CustomPatolaModal'));
const CheckoutModal = lazy(() => import('./components/CheckoutModal'));
const OrderTrackingModal = lazy(() => import('./components/OrderTrackingModal'));
const AdminDashboardModal = lazy(() => import('./components/AdminDashboardModal'));
const AllReviewsModal = lazy(() => import('./components/AllReviewsModal'));
const CustomerSupportModal = lazy(() => import('./components/CustomerSupportModal'));
const WeddingWishlistModal = lazy(() => import('./components/WeddingWishlistModal'));
const VirtualDrape3D = lazy(() => import('./components/VirtualDrape3D'));
const Photo360Viewer = lazy(() => import('./components/Photo360Viewer'));
const CustomerAuthModal = lazy(() => import('./components/CustomerAuthModal'));
const CustomerAccountModal = lazy(() => import('./components/CustomerAccountModal'));
import { isStandingModelPhoto } from './utils/imageHelper';
import { ApiService } from './services/api';

const CURRENCY_CONFIG = {
  INR: { symbol: '₹', name: 'Indian Rupee (₹ INR)', rate: 1, format: (val) => '₹' + val.toLocaleString('en-IN') },
  USD: { symbol: '$', name: 'US Dollar ($ USD)', rate: 0.012, format: (val) => '$' + Math.round(val * 0.012).toLocaleString('en-US') },
  EUR: { symbol: '€', name: 'Euro (€ EUR)', rate: 0.011, format: (val) => '€' + Math.round(val * 0.011).toLocaleString('en-US') },
  GBP: { symbol: '£', name: 'British Pound (£ GBP)', rate: 0.0095, format: (val) => '£' + Math.round(val * 0.0095).toLocaleString('en-US') }
};

const DEFAULT_SAREES = [];

// Automatic Regional Currency Detection by Timezone & Locale
const detectRegionalCurrency = () => {
  try {
    const saved = localStorage.getItem('patola_user_currency');
    if (saved && CURRENCY_CONFIG[saved]) return saved;

    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
    if (tz.includes('calcutta') || tz.includes('kolkata') || tz.includes('india') || tz.includes('asia')) {
      return 'INR';
    }
    if (tz.includes('new_york') || tz.includes('chicago') || tz.includes('denver') || tz.includes('los_angeles') || tz.includes('america')) {
      return 'USD';
    }
    if (tz.includes('london') || tz.includes('belfast')) {
      return 'GBP';
    }
    if (tz.includes('europe') || tz.includes('paris') || tz.includes('berlin') || tz.includes('madrid') || tz.includes('rome')) {
      return 'EUR';
    }
  } catch (e) {
    console.warn('Currency auto-detect error:', e);
  }
  return 'INR';
};

// Helper: Safely sanitizes saree data for localStorage without exceeding 5MB quota
const sanitizeSareeForStorage = (saree) => {
  if (!saree) return null;
  let primaryImage = saree.image;
  if (!primaryImage && Array.isArray(saree.images) && saree.images.length > 0) {
    primaryImage = saree.images[0];
  }
  // Guard against massive Base64 data URLs (> 200KB) causing QuotaExceededError in localStorage
  if (primaryImage && typeof primaryImage === 'string' && primaryImage.length > 200000) {
    primaryImage = '/assets/images/saree_nari_kunjar.jpg';
  }

  return {
    id: String(saree.id),
    title: saree.title || 'Patola Saree',
    basePriceINR: Number(saree.basePriceINR) || 0,
    finalPriceINR: Number(saree.finalPriceINR) || Number(saree.basePriceINR) || 0,
    discountPercent: Number(saree.discountPercent) || 0,
    weave: saree.weave || 'Double Ikat Handloom',
    motif: saree.motif || '',
    motifName: saree.motifName || '',
    timeToWeave: saree.timeToWeave || '',
    category: saree.category || '',
    isOutOfStock: Boolean(saree.isOutOfStock),
    image: primaryImage || '/assets/images/saree_nari_kunjar.jpg',
    images: [primaryImage || '/assets/images/saree_nari_kunjar.jpg']
  };
};

export default function App() {
  const [currentCurrency, setCurrentCurrency] = useState(detectRegionalCurrency);
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('patola_cart_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isCustomPatolaOpen, setIsCustomPatolaOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAllReviewsOpen, setIsAllReviewsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [adminAutoUnlock, setAdminAutoUnlock] = useState(false);

  // Customer Authentication state (Session-based: auto logouts when browser closes!)
  const [currentCustomer, setCurrentCustomer] = useState(() => ApiService.getCurrentCustomer());
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [isCustomerAccountOpen, setIsCustomerAccountOpen] = useState(false);
  const [openTrackingAfterAuth, setOpenTrackingAfterAuth] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [activeTrackOrder, setActiveTrackOrder] = useState(null);
  const [quickViewSaree, setQuickViewSaree] = useState(null);
  const [quickViewPhotoIdx, setQuickViewPhotoIdx] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);
  const [uploadedSarees, setUploadedSarees] = useState([]);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [deletedSareeIds, setDeletedSareeIds] = useState([]);
  const [inspectorSaree, setInspectorSaree] = useState(null);
  const [inspectModalSaree, setInspectModalSaree] = useState(null);
  const [inspectPhotoIdx, setInspectPhotoIdx] = useState(0);
  const [inspectZoomScale, setInspectZoomScale] = useState(2.5);
  const [inspectZoomOrigin, setInspectZoomOrigin] = useState({ x: 50, y: 50, zoomed: false });
  const [isInspectPortraitModel, setIsInspectPortraitModel] = useState(false);
  const photoAngleBarRef = useRef(null);

  // Auto-scroll photo angle selector bar so the next angle comes into view smoothly
  useEffect(() => {
    if (photoAngleBarRef.current) {
      const btns = photoAngleBarRef.current.querySelectorAll('button');
      if (btns && btns[inspectPhotoIdx]) {
        const nextBtn = btns[inspectPhotoIdx + 1];
        if (nextBtn && typeof nextBtn.scrollIntoView === 'function') {
          nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else if (typeof btns[inspectPhotoIdx].scrollIntoView === 'function') {
          btns[inspectPhotoIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  }, [inspectPhotoIdx]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('patola_trousseau_wishlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Could not parse saved wishlist:', e);
    }
    return [];
  });

  // Persist Wishlist across page reloads & browser refreshes safely
  useEffect(() => {
    try {
      const cleanList = wishlist.map(sanitizeSareeForStorage).filter(Boolean);
      localStorage.setItem('patola_trousseau_wishlist', JSON.stringify(cleanList));
    } catch (err) {
      console.warn('LocalStorage quota issue for wishlist:', err);
    }
  }, [wishlist]);

  // Persist Cart across page reloads & browser refreshes safely
  useEffect(() => {
    try {
      const cleanCart = cart.map((item) => ({
        ...sanitizeSareeForStorage(item),
        quantity: item.quantity || 1
      })).filter(Boolean);
      localStorage.setItem('patola_cart_items', JSON.stringify(cleanCart));
    } catch (err) {
      console.warn('LocalStorage quota issue for cart:', err);
    }
  }, [cart]);

  const lastAdminUrlRef = useRef('');
  const toastTimerRef = useRef(null);

  // Secret URL Route & Keyboard Shortcut Listener:
  // e.g. /Patola@3868, #Patola@3868, or Ctrl+Shift+A opens Store Admin
  useEffect(() => {
    const checkAdminSecretUrl = () => {
      try {
        const rawPath = decodeURIComponent(window.location.pathname || '').toLowerCase();
        const rawHash = decodeURIComponent(window.location.hash || '').toLowerCase();
        const rawSearch = decodeURIComponent(window.location.search || '').toLowerCase();

        // Check if "patola@3868" or "patola3868" is present in path, hash, or query params
        const combined = `${rawPath} ${rawHash} ${rawSearch}`;

        if (!combined || combined === lastAdminUrlRef.current) {
          return;
        }

        const normalized = combined.replace(/[^a-z0-9@]/g, '');

        if (
          normalized.includes('patola@3868') ||
          normalized.includes('patola3868')
        ) {
          lastAdminUrlRef.current = combined;
          setAdminAutoUnlock(true);
          setIsAdminOpen(true);
          showToast('👑 Welcome Admin! Secret Admin Portal Unlocked (Patola@3868).');
          try {
            window.history.replaceState(null, '', '/');
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Secret URL parse note:', err);
      }
    };

    checkAdminSecretUrl();
    window.addEventListener('popstate', checkAdminSecretUrl);
    window.addEventListener('hashchange', checkAdminSecretUrl);

    // Global keyboard shortcut: Ctrl+Shift+A or Alt+A opens Admin Portal
    const handleAdminKey = (e) => {
      if ((e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) ||
          (e.altKey && (e.key === 'A' || e.key === 'a'))) {
        e.preventDefault();
        setIsAdminOpen(true);
        showToast('🔒 Store Admin Portal Opened');
      }
    };
    window.addEventListener('keydown', handleAdminKey);

    return () => {
      window.removeEventListener('popstate', checkAdminSecretUrl);
      window.removeEventListener('hashchange', checkAdminSecretUrl);
      window.removeEventListener('keydown', handleAdminKey);
    };
  }, []);

  // Data Privacy & Client Security:
  // Automatically purges exposed customer database records from public localStorage
  useEffect(() => {
    initAppSecurity();
    initGA();
    trackPageView('PATOLA MADE VANKAR - Home');
    cleanupAndCompressStorageSarees();
    // Load customer's session orders and local orders reliably
    try {
      const sessionOrder = JSON.parse(sessionStorage.getItem('patola_current_session_order') || 'null');
      const localCustOrders = JSON.parse(localStorage.getItem('patola_local_customer_orders') || '[]');
      const combined = [...(sessionOrder ? [sessionOrder] : []), ...(Array.isArray(localCustOrders) ? localCustOrders : [])];
      const unique = [];
      const seen = new Set();
      combined.forEach(o => {
        if (o && o.orderReference && !seen.has(o.orderReference)) {
          seen.add(o.orderReference);
          unique.push(o);
        }
      });
      if (unique.length > 0) {
        setRecentOrders(unique);
        setActiveTrackOrder(unique[0]);
      }
    } catch (e) {}
  }, []);

  const handleInspectSaree = (saree, activePhotoIndex = 0) => {
    const photoIdx = typeof activePhotoIndex === 'number' 
      ? activePhotoIndex 
      : (typeof saree?.activePhotoIdx === 'number' ? saree.activePhotoIdx : 0);

    const activeImg = (saree.images && saree.images[photoIdx]) || saree.image;

    // Set saree in Motif Magnifier on the page
    setInspectorSaree({
      ...saree,
      activePhotoIdx: photoIdx,
      selectedPhotoIdx: photoIdx,
      image: activeImg
    });

    // Open the Interactive Weave Inspector Popup Modal
    setInspectModalSaree({
      ...saree,
      activePhotoIdx: photoIdx,
      selectedPhotoIdx: photoIdx,
      image: activeImg
    });
    setInspectPhotoIdx(photoIdx);
    setInspectZoomOrigin({ x: 50, y: 50, zoomed: false });
    setQuickViewSaree(null);

    // Smoothly scroll directly to the Interactive Weave Inspector Box in the background
    setTimeout(() => {
      const target = document.getElementById('interactiveLensBox') || document.querySelector('.weave-inspector-display') || document.querySelector('.motif-interactive-grid') || document.getElementById('motifs');
      if (target) {
        const yOffset = -65;
        const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    }, 60);
  };

  const showToast = (msg) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 4500);
  };

  // Background IP auto-detection for first-time visitors
  useEffect(() => {
    const saved = localStorage.getItem('patola_user_currency');
    if (!saved) {
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
          if (data && data.country_code) {
            let autoCurr = 'INR';
            if (data.country_code === 'IN') autoCurr = 'INR';
            else if (['US', 'CA', 'AU', 'NZ', 'SG', 'AE'].includes(data.country_code)) autoCurr = 'USD';
            else if (data.country_code === 'GB') autoCurr = 'GBP';
            else if (['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH'].includes(data.country_code)) autoCurr = 'EUR';

            setCurrentCurrency(autoCurr);
            localStorage.setItem('patola_user_currency', autoCurr);
            showToast(`🌐 Region detected: ${data.country_name || 'India'} — Currency auto-set to ${autoCurr}`);
          }
        })
        .catch(() => {
          // Timezone fallback already set to INR
        });
    }
  }, []);

  const handleCurrencyChange = (newCurr) => {
    if (newCurr === 'AUTO') {
      localStorage.removeItem('patola_user_currency');
      const auto = detectRegionalCurrency();
      setCurrentCurrency(auto);
      showToast(`🌐 Auto-detected local currency: ${CURRENCY_CONFIG[auto]?.name || auto}`);
      return;
    }
    setCurrentCurrency(newCurr);
    localStorage.setItem('patola_user_currency', newCurr);
    showToast(`Currency updated to ${CURRENCY_CONFIG[newCurr]?.name || newCurr}`);
  };

  const formatPrice = (inrAmount) => {
    const config = CURRENCY_CONFIG[currentCurrency] || CURRENCY_CONFIG.INR;
    return config.format(inrAmount);
  };

  const handleAddToCart = (saree) => {
    const discountPercent = Number(saree.discountPercent) || 0;
    const finalPriceINR = discountPercent > 0
      ? (saree.finalPriceINR && Number(saree.finalPriceINR) > 0
          ? Number(saree.finalPriceINR)
          : Math.round(saree.basePriceINR - (saree.basePriceINR * discountPercent / 100)))
      : saree.basePriceINR;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === saree.id);
      if (existing) {
        return prev.map((item) =>
          item.id === saree.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prev, {
          ...saree,
          basePriceINR: finalPriceINR,
          originalPriceINR: saree.basePriceINR,
          finalPriceINR,
          discountPercent,
          quantity: 1
        }];
      }
    });
    showToast(`Added "${saree.title}" to your luxury bag`);
    trackAddToCart(saree);
    setIsCartOpen(true);
  };

  const handleUpdateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    showToast('Item removed from your bag');
  };

  const handleToggleWishlist = (saree) => {
    const cleanSaree = sanitizeSareeForStorage(saree);
    if (!cleanSaree) return;

    setWishlist((prev) => {
      const exists = prev.some((item) => String(item.id) === String(cleanSaree.id));
      if (exists) {
        showToast(`Removed "${cleanSaree.title}" from Wishlist.`);
        return prev.filter((item) => String(item.id) !== String(cleanSaree.id));
      } else {
        showToast(`💍 Added "${cleanSaree.title}" to Wedding Trousseau Wishlist!`);
        return [...prev, cleanSaree];
      }
    });
  };

  const handleRemoveFromWishlist = (sareeId) => {
    setWishlist((prev) => prev.filter((item) => String(item.id) !== String(sareeId)));
  };

  const handleAddAllWishlistToCart = (items) => {
    items.forEach((item) => {
      handleAddToCart(item);
    });
    showToast(`🛍️ Added all ${items.length} Wedding Trousseau sarees to Bag!`);
  };

  const handleProceedCheckout = () => {
    if (cart.length === 0) {
      showToast('Your bag is empty.');
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const saveCustomerTrackingReference = (orderObj) => {
    if (!orderObj?.orderReference || !orderObj?.contactPhone) return;
    try {
      const previous = JSON.parse(localStorage.getItem('patola_local_customer_orders') || '[]');
      const safeRef = {
        orderReference: orderObj.orderReference,
        contactPhone: orderObj.contactPhone,
        isCustomOrder: Boolean(orderObj.isCustomOrder || orderObj.isCustomLoom)
      };
      const merged = [safeRef, ...(Array.isArray(previous) ? previous.filter(o => o?.orderReference !== safeRef.orderReference) : [])].slice(0, 20);
      localStorage.setItem('patola_local_customer_orders', JSON.stringify(merged));
    } catch (e) {
      console.warn('Could not save this order for automatic tracking:', e);
    }
  };

  const handleOrderSuccess = (orderObj) => {
    setCart([]);
    setActiveTrackOrder(orderObj);
    setRecentOrders(prev => [orderObj, ...prev.filter(o => o?.orderReference !== orderObj.orderReference)]);
    saveCustomerTrackingReference(orderObj);
    try {
      sessionStorage.setItem('patola_current_session_order', JSON.stringify(orderObj));
    } catch (e) {}
    setIsTrackingOpen(true);
    setCatalogVersion(v => v + 1);
    showToast(`🎉 Order Placed! Reference #${orderObj.orderReference} - OTP: ${orderObj.deliveryOtp}`);
  };

  return (
    <div>
      {/* 1. Navigation Header */}
      <Navbar
        currentCurrency={currentCurrency}
        onCurrencyChange={handleCurrencyChange}
        cartCount={cart.reduce((sum, i) => sum + i.quantity, 0)}
        wishlistCount={wishlist.length}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenBooking={() => setIsBookingOpen(true)}
        onOpenTracking={() => {
          if (!currentCustomer) {
            setOpenTrackingAfterAuth(true);
            setIsCustomerAuthOpen(true);
          } else {
            setIsTrackingOpen(true);
          }
        }}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenReviews={() => setIsAllReviewsOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        currentCustomer={currentCustomer}
        onOpenCustomerAuth={() => setIsCustomerAuthOpen(true)}
        onOpenCustomerAccount={() => setIsCustomerAccountOpen(true)}
      />

      {/* 2. Hero Section */}
      <Hero
        onOpenBooking={() => setIsBookingOpen(true)}
        onOpenReviews={() => setIsAllReviewsOpen(true)}
      />

      {/* 3. Heritage Marquee Ribbon */}
      <div className="heritage-ribbon" aria-hidden="true">
        <div className="marquee-content">
          <span className="marquee-item">PADI PATOLE BHAT, PHATE PAN FITE NAHI <span className="marquee-dot">◆</span></span>
          <span className="marquee-item">AUTHENTIC HANDWOVEN ROYAL SILK <span className="marquee-dot">◆</span></span>
          <span className="marquee-item">PURE MULBERRY SILK WEAVE <span className="marquee-dot">◆</span></span>
          <span className="marquee-item">SACRED DOUBLE IKAT GEOMETRY <span className="marquee-dot">◆</span></span>
          <span className="marquee-item">SILK MARK CERTIFIED HANDLOOM <span className="marquee-dot">◆</span></span>
          <span className="marquee-item">GUJARAT HERITAGE SINCE GENERATIONS <span className="marquee-dot">◆</span></span>
        </div>
      </div>

      {/* 4. Saree Catalog with Stored Procedure sp_GetSarees & Pincode Estimator */}
      <SareeCatalog
        formatPrice={formatPrice}
        onAddToCart={handleAddToCart}
        onQuickView={(saree, initialIdx = 0) => {
          setQuickViewSaree(saree);
          setQuickViewPhotoIdx(typeof initialIdx === 'number' ? initialIdx : 0);
          trackViewItem(saree);
        }}
        onOpenCustomPatola={() => setIsCustomPatolaOpen(true)}
        onInspectSaree={handleInspectSaree}
        wishlist={wishlist}
        onToggleWishlist={handleToggleWishlist}
        catalogVersion={catalogVersion}
        uploadedSarees={uploadedSarees}
        deletedSareeIds={deletedSareeIds}
      />

      {/* 5. Motif & Weave Magnifier Inspector */}
      <MotifMagnifier
        selectedSaree={inspectorSaree}
        allSarees={[...uploadedSarees, ...DEFAULT_SAREES]}
        formatPrice={formatPrice}
        onClearSelectedSaree={() => setInspectorSaree(null)}
      />

      {/* 6. 8-Step Weaving Ritual Timeline */}
      <WeavingTimeline />

      {/* 7. Artisan Loom Lineage Story */}
      <ArtisanStory onOpenBooking={() => setIsBookingOpen(true)} />


      {/* 9. Footer with Stored Procedure sp_SubscribeNewsletter */}
      <Footer 
        onShowToast={showToast} 
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)} 
      />

      {/* Quick View Modal with 5-Photo Swipe & Thumbnails */}
      {quickViewSaree && (() => {
        const resolveModalPhotos = () => {
          if (Array.isArray(quickViewSaree.images) && quickViewSaree.images.length >= 5) {
            return quickViewSaree.images;
          }
          if (Array.isArray(quickViewSaree.images) && quickViewSaree.images.length > 0) {
            const list = [...quickViewSaree.images];
            while (list.length < 5) list.push(list[0]);
            return list;
          }
          if (quickViewSaree.imagesJson && typeof quickViewSaree.imagesJson === 'string') {
            try {
              const parsed = JSON.parse(quickViewSaree.imagesJson);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const list = [...parsed];
                while (list.length < 5) list.push(list[0]);
                return list;
              }
            } catch (e) {}
          }
          const single = quickViewSaree.image || '/assets/images/saree_nari_kunjar.jpg';
          return [single, single, single, single, single];
        };

        const modalPhotos = resolveModalPhotos();

        const nextPhoto = () => setQuickViewPhotoIdx(prev => (prev < modalPhotos.length - 1 ? prev + 1 : 0));
        const prevPhoto = () => setQuickViewPhotoIdx(prev => (prev > 0 ? prev - 1 : modalPhotos.length - 1));

        return (
          <div className="modal-backdrop open modal-backdrop-quickview" onClick={() => { setQuickViewSaree(null); setQuickViewPhotoIdx(0); }}>
            <div className="modal-container quickview-modal-3d" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1080px', width: '96vw' }}>
              <button className="btn-close-modal" onClick={() => { setQuickViewSaree(null); setQuickViewPhotoIdx(0); }}>✕</button>
              <div className="modal-saree-content">
                <div className="modal-saree-gallery">
                  {/* Swipeable Main Carousel Wrapper */}
                  <div
                    className="modal-gallery-main-wrapper"
                    onTouchStart={(e) => {
                      window._modalTouchStartX = e.touches[0].clientX;
                    }}
                    onTouchEnd={(e) => {
                      if (window._modalTouchStartX !== undefined) {
                        const delta = e.changedTouches[0].clientX - window._modalTouchStartX;
                        if (delta > 35) prevPhoto();
                        else if (delta < -35) nextPhoto();
                        window._modalTouchStartX = undefined;
                      }
                    }}
                  >
                    {/* ✦ PHOTO 1: NORMAL 2D | PHOTOS 2 TO 4: 3D VIRTUAL SAREE DRAPE | PHOTO 5: 360° ANGLE VIEW ✦ */}
                    {quickViewPhotoIdx === 4 ? (
                      <Suspense fallback={<img src={modalPhotos[quickViewPhotoIdx]} alt="Loading view" className="saree-image" style={{ objectFit: isStandingModelPhoto(modalPhotos[quickViewPhotoIdx], 0, 0, quickViewPhotoIdx) ? 'contain' : 'cover' }} />}>
                        <Photo360Viewer
                          imageUrl={modalPhotos[quickViewPhotoIdx]}
                          title={`${quickViewSaree.title} - 360° Angle View`}
                          isCard={false}
                          photoIndex={quickViewPhotoIdx}
                        />
                      </Suspense>
                    ) : quickViewPhotoIdx >= 1 && quickViewPhotoIdx <= 3 ? (
                      <Suspense fallback={<img src={modalPhotos[quickViewPhotoIdx]} alt="Loading view" className="saree-image" style={{ objectFit: isStandingModelPhoto(modalPhotos[quickViewPhotoIdx], 0, 0, quickViewPhotoIdx) ? 'contain' : 'cover' }} />}>
                        <VirtualDrape3D
                          imageUrl={modalPhotos[quickViewPhotoIdx]}
                          title={`${quickViewSaree.title} - View ${quickViewPhotoIdx + 1}`}
                          isCard={false}
                          photoIndex={quickViewPhotoIdx}
                        />
                      </Suspense>
                    ) : (
                      <>
                        <img
                          src={modalPhotos[quickViewPhotoIdx]}
                          alt=""
                          aria-hidden="true"
                          className="modal-gallery-main-backdrop"
                        />
                        <img
                          src={modalPhotos[quickViewPhotoIdx]}
                          alt={`${quickViewSaree.title} - Photo ${quickViewPhotoIdx + 1}`}
                          className="modal-gallery-main-img"
                          style={{
                            objectFit: isStandingModelPhoto(modalPhotos[quickViewPhotoIdx], 0, 0, quickViewPhotoIdx) ? 'contain' : 'cover'
                          }}
                          onLoad={(event) => {
                            const image = event.currentTarget;
                            const { naturalWidth, naturalHeight } = image;
                            if (naturalWidth && naturalHeight) {
                              const fit = isStandingModelPhoto(modalPhotos[quickViewPhotoIdx], naturalWidth, naturalHeight, quickViewPhotoIdx) ? 'contain' : 'cover';
                              image.style.objectFit = fit;
                            }
                          }}
                        />
                      </>
                    )}

                    {/* Nav Arrows */}
                    <button
                      type="button"
                      className="gallery-nav-arrow left"
                      onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                      aria-label="Previous Photo"
                      title="Previous Photo"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="gallery-nav-arrow right"
                      onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                      aria-label="Next Photo"
                      title="Next Photo"
                    >
                      ›
                    </button>

                    {/* Floating Counter Badge */}
                    {quickViewPhotoIdx === 4 ? (
                      <span className="gallery-counter-badge counter-badge-360" title={`Photo 5: Interactive 360° Angle View`}>
                        🔄 5 / {modalPhotos.length} (360° View)
                      </span>
                    ) : quickViewPhotoIdx >= 1 && quickViewPhotoIdx <= 3 ? (
                      <span className="gallery-counter-badge counter-badge-3d" title={`Photo ${quickViewPhotoIdx + 1}: Interactive 3D View`}>
                        ✨ {quickViewPhotoIdx + 1} / {modalPhotos.length} (3D View)
                      </span>
                    ) : (
                      <span className="gallery-counter-badge" title={`Photo ${quickViewPhotoIdx + 1}: Normal 2D View`}>
                        📷 {quickViewPhotoIdx + 1} / {modalPhotos.length} (Normal View)
                      </span>
                    )}
                  </div>

                  {/* 5 Interactive Thumbnails (Click to Swap) */}
                  <div className="modal-gallery-thumbnails">
                    {modalPhotos.map((src, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setQuickViewPhotoIdx(idx)}
                        className={`gallery-thumb-btn ${quickViewPhotoIdx === idx ? 'active' : ''} ${idx === 4 ? 'thumb-360-feature' : idx >= 1 && idx <= 3 ? 'thumb-3d-feature' : ''}`}
                        title={idx === 4 ? `Photo 5: 360° Angle View 🔄` : idx >= 1 && idx <= 3 ? `Photo ${idx + 1}: 3D Virtual View ✨` : `Photo ${idx + 1}: Normal 2D View`}
                      >
                        <img src={src} alt={`Thumbnail ${idx + 1}`} />
                        <span className="thumb-label">
                          {idx === 0 ? 'Front 2D' : idx === 1 ? '✨ 3D Pallu' : idx === 2 ? '✨ 3D Motif' : idx === 3 ? '✨ 3D Look' : '🔄 360° View'}
                        </span>
                        {idx === 4 ? (
                          <span className="thumb-360-pill">360°</span>
                        ) : idx >= 1 && idx <= 3 ? (
                          <span className="thumb-3d-pill">3D</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="modal-saree-details">
                  <span className="modal-badge">{quickViewSaree.badge || 'Double Ikat'}</span>
                  <h3 className="modal-title">{quickViewSaree.title}</h3>
                  {/* ✦ DISCOUNT PRICE IN QUICK VIEW ✦ */}
                  {Number(quickViewSaree.discountPercent) > 0 ? (
                    <div className="modal-price-discount-wrap" style={{ margin: '0.4rem 0' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ textDecoration: 'line-through', color: '#888', fontSize: '1rem', fontWeight: 400 }}>
                          {formatPrice(quickViewSaree.basePriceINR)}
                        </span>
                        <span className="modal-price" style={{ fontWeight: 700, fontSize: '1.45rem' }}>
                          {formatPrice(quickViewSaree.finalPriceINR || Math.round(quickViewSaree.basePriceINR - (quickViewSaree.basePriceINR * Number(quickViewSaree.discountPercent) / 100)))}
                        </span>
                        <span style={{ color: '#b91c1c', fontSize: '0.88rem', fontWeight: 600 }}>
                          ({quickViewSaree.discountPercent}% OFF)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="modal-price">{formatPrice(quickViewSaree.basePriceINR)}</div>
                  )}
                  <p className="modal-desc">{quickViewSaree.description}</p>

                  <div className="modal-saree-specs" style={{ margin: '0.8rem 0', background: 'var(--color-ivory)', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.84rem' }}>
                      <div>🧵 <strong>Weave:</strong> {quickViewSaree.weave || 'Double Ikat Handloom'}</div>
                      <div>🌸 <strong>Motif:</strong> {quickViewSaree.motifName || quickViewSaree.motif || 'Sacred Heritage'}</div>
                      <div>🎨 <strong>Color:</strong> {quickViewSaree.colors || quickViewSaree.color || 'Natural Dyes & Golden Zari'}</div>
                      <div>⏳ <strong>Handcrafted:</strong> {quickViewSaree.timeToWeave || '9 Months'}</div>
                      <div>🛡️ <strong>Certified:</strong> Silk Mark 100% Pure</div>
                    </div>
                  </div>

                  <div className="modal-actions-group" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                    <button
                      className="btn-primary-gold"
                      style={{ flex: 1, minWidth: '130px' }}
                      onClick={() => {
                        handleAddToCart(quickViewSaree);
                        setQuickViewSaree(null);
                        setQuickViewPhotoIdx(0);
                      }}
                    >
                      Add to Bag
                    </button>

                    <button
                      className="btn-outline-gold btn-wishlist-modal-act"
                      style={{ minWidth: '130px', padding: '0.7rem 1rem', fontSize: '0.88rem' }}
                      onClick={() => handleToggleWishlist(quickViewSaree)}
                      title="Save to Wedding Trousseau Wishlist (💍)"
                    >
                      {wishlist.some(w => w.id === quickViewSaree.id) ? '❤️ In Trousseau' : '🤍 Save to Trousseau'}
                    </button>

                    <button
                      className="btn-outline-gold"
                      style={{ flex: 1, minWidth: '140px', padding: '0.7rem 1rem', fontSize: '0.9rem' }}
                      onClick={() => {
                        handleInspectSaree({
                          ...quickViewSaree,
                          images: modalPhotos,
                          activePhotoIdx: quickViewPhotoIdx,
                          image: modalPhotos[quickViewPhotoIdx]
                        }, quickViewPhotoIdx);
                        setQuickViewSaree(null);
                        setQuickViewPhotoIdx(0);
                      }}
                    >
                      🔍 Inspect Threads
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ✦ 3D WEAVE INSPECTOR MODAL POPUP (EXACT 3D PERSPECTIVE POP-IN) ✦ */}
      {inspectModalSaree && (() => {
        const inspectPhotos = Array.isArray(inspectModalSaree.images) && inspectModalSaree.images.length >= 4
          ? inspectModalSaree.images
          : [
              inspectModalSaree.image || '/assets/images/saree_nari_kunjar.jpg',
              inspectModalSaree.images?.[1] || '/assets/images/patola_pallu.jpg',
              inspectModalSaree.images?.[2] || '/assets/images/patola_macro.jpg',
              inspectModalSaree.images?.[3] || '/assets/images/patola_drape.jpg'
            ];
        
        const currentInspectImg = inspectPhotos[inspectPhotoIdx] || inspectModalSaree.image;
        const discountNum = Number(inspectModalSaree.discountPercent) || 0;
        const finalPrice = discountNum > 0
          ? Math.round(inspectModalSaree.basePriceINR - (inspectModalSaree.basePriceINR * discountNum / 100))
          : inspectModalSaree.basePriceINR;

        const photoAngleTitles = [
          '1. Full Drape',
          '2. Royal Pallu',
          '3. Macro Weave Threads',
          '4. Loom Craftsmanship'
        ];

        return (
          <div
            className="modal-backdrop open modal-backdrop-quickview"
            onClick={() => setInspectModalSaree(null)}
            style={{ zIndex: 1150 }}
          >
            <div
              className="modal-container quickview-modal-3d inspect-modal-3d"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '1080px', width: '96vw', maxHeight: '92vh', overflowY: 'auto' }}
            >
              <button
                className="btn-close-modal"
                onClick={() => setInspectModalSaree(null)}
                style={{ zIndex: 20 }}
              >
                ✕
              </button>

              {/* Modal Header */}
              <div style={{
                background: 'linear-gradient(135deg, #38000d 0%, #1f0007 100%)',
                color: '#ffffff',
                padding: '1.1rem 1.4rem',
                borderBottom: '1.5px solid #d4af37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.8rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'rgba(212, 175, 55, 0.2)',
                    border: '1px solid #d4af37',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem'
                  }}>
                    🔍
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontFamily: "'Cinzel', serif", fontSize: '1.15rem', color: '#fef3c7', letterSpacing: '0.03em' }}>
                      Interactive Weave Inspector
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#d4af37' }}>
                      Double Ikat Warp & Weft Thread Magnification • {inspectModalSaree.title}
                    </p>
                  </div>
                </div>

                {/* Zoom Level Selectors */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginRight: '2.5rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#fef3c7', fontWeight: 700 }}>Zoom:</span>
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
                        setInspectZoomScale(scale);
                        setInspectZoomOrigin(prev => ({ ...prev, zoomed: true }));
                      }}
                      style={{
                        padding: '0.22rem 0.55rem',
                        fontSize: '0.74rem',
                        background: inspectZoomScale === scale ? '#ffd700' : 'rgba(255, 255, 255, 0.12)',
                        color: inspectZoomScale === scale ? '#800020' : '#ffffff',
                        border: '1.5px solid #d4af37',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 800,
                        boxShadow: inspectZoomScale === scale ? '0 0 8px rgba(212, 175, 55, 0.6)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Angle Selector Pills Bar */}
              <div 
                ref={photoAngleBarRef}
                style={{
                  background: '#faf6f0',
                  padding: '0.6rem 1.2rem',
                  borderBottom: '1px solid #ebdccb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  overflowX: 'auto',
                  scrollBehavior: 'smooth',
                  scrollbarWidth: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#800020', whiteSpace: 'nowrap' }}>
                  📷 Photo Angle:
                </span>
                {inspectPhotos.map((pUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      setInspectPhotoIdx(idx);
                      setIsInspectPortraitModel(isStandingModelPhoto(inspectPhotos[idx], 0, 0, idx));
                      const btn = e.currentTarget;
                      const nextBtn = btn.nextElementSibling;
                      if (nextBtn && typeof nextBtn.scrollIntoView === 'function') {
                        nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                      } else if (btn && typeof btn.scrollIntoView === 'function') {
                        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.28rem 0.65rem',
                      borderRadius: '20px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: inspectPhotoIdx === idx ? '1.5px solid #800020' : '1px solid #dcd1c2',
                      background: inspectPhotoIdx === idx ? 'linear-gradient(135deg, #800020 0%, #5a0017 100%)' : '#ffffff',
                      color: inspectPhotoIdx === idx ? '#ffffff' : '#4a2c11',
                      boxShadow: inspectPhotoIdx === idx ? '0 2px 6px rgba(128,0,32,0.25)' : 'none',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <img
                      src={pUrl}
                      alt=""
                      style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span>{photoAngleTitles[idx] || `Angle ${idx + 1}`}</span>
                    {inspectPhotoIdx === idx && <span>✓</span>}
                  </button>
                ))}
              </div>

              {/* Main Magnifier View */}
              <div style={{ padding: '1rem 1.4rem' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '52vh',
                    minHeight: '320px',
                    maxHeight: '520px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    background: 'radial-gradient(ellipse at center, #fdfbf7 0%, #f5efe6 55%, #eae0d0 100%)',
                    cursor: 'crosshair',
                    touchAction: 'none',
                    border: '1.5px solid rgba(212, 175, 55, 0.45)',
                    boxShadow: 'inset 0 0 24px rgba(180, 140, 90, 0.12), 0 6px 20px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    setInspectZoomOrigin({ x, y, zoomed: true });
                  }}
                  onMouseLeave={() => setInspectZoomOrigin(prev => ({ ...prev, zoomed: false }))}
                  onTouchStart={(e) => {
                    if (!e.touches || !e.touches[0]) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const touch = e.touches[0];
                    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
                    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
                    setInspectZoomOrigin({ x, y, zoomed: true });
                  }}
                  onTouchMove={(e) => {
                    if (!e.touches || !e.touches[0]) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const touch = e.touches[0];
                    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
                    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
                    setInspectZoomOrigin({ x, y, zoomed: true });
                  }}
                  onTouchEnd={() => setInspectZoomOrigin(prev => ({ ...prev, zoomed: false }))}
                  onClick={() => setInspectZoomOrigin(prev => ({ ...prev, zoomed: !prev.zoomed }))}
                  title="Hover mouse or drag finger to inspect individual warp & weft silk threads"
                >
                  {/* Seamless luxury ambient backdrop - eliminates harsh black letterbox bars */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: '-20px',
                      backgroundImage: `url("${currentInspectImg}")`,
                      backgroundPosition: 'center',
                      backgroundSize: 'cover',
                      filter: 'blur(32px) saturate(1.15)',
                      opacity: 0.28,
                      transform: 'scale(1.15)',
                      pointerEvents: 'none',
                      zIndex: 0
                    }}
                  />

                  <img
                    src={currentInspectImg}
                    alt={inspectModalSaree.title}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      width: '100%',
                      height: '100%',
                      objectFit: isInspectPortraitModel ? 'contain' : 'cover',
                      objectPosition: 'center',
                      transformOrigin: `${inspectZoomOrigin.x}% ${inspectZoomOrigin.y}%`,
                      transform: inspectZoomOrigin.zoomed ? `scale(${inspectZoomScale})` : 'scale(1)',
                      transition: inspectZoomOrigin.zoomed ? 'none' : 'transform 0.25s ease-out',
                      userSelect: 'none',
                      pointerEvents: 'none'
                    }}
                    onLoad={(e) => {
                      const { naturalWidth, naturalHeight } = e.currentTarget;
                      if (naturalWidth && naturalHeight) {
                        setIsInspectPortraitModel(isStandingModelPhoto(currentInspectImg, naturalWidth, naturalHeight, inspectPhotoIdx));
                      }
                    }}
                  />

                  {/* Touch/Mouse Hint Badge */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '14px',
                    background: 'rgba(56, 0, 13, 0.88)',
                    color: '#ffd700',
                    padding: '5px 14px',
                    borderRadius: '20px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    border: '1px solid rgba(212, 175, 55, 0.6)',
                    pointerEvents: 'none',
                    backdropFilter: 'blur(6px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
                    zIndex: 2
                  }}>
                    🔍 Hover or Drag finger to magnify warp & weft threads • {inspectZoomScale}x Zoom
                  </div>
                </div>

                {/* Footer Info & Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.9rem',
                  marginTop: '1rem',
                  paddingTop: '0.8rem',
                  borderTop: '1px solid #ebdccb'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#800020' }}>{inspectModalSaree.title}</strong>
                      <span style={{
                        background: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        padding: '1px 8px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        Silk Mark Certified
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '2px' }}>
                      🌸 Motif: {inspectModalSaree.motifName || inspectModalSaree.motif || 'Sacred Heritage'} • 🧵 100% Pure Mulberry Silk & Natural Dyes
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', color: '#777', display: 'block' }}>Investment</span>
                      <strong style={{ fontSize: '1.2rem', color: '#800020' }}>
                        {formatPrice(finalPrice)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="btn-primary-gold"
                      style={{ padding: '0.65rem 1.3rem', fontSize: '0.86rem', fontWeight: 700 }}
                      onClick={() => {
                        handleAddToCart({
                          ...inspectModalSaree,
                          basePriceINR: discountNum > 0 ? finalPrice : inspectModalSaree.basePriceINR,
                          originalPriceINR: inspectModalSaree.basePriceINR,
                          finalPriceINR: finalPrice,
                          discountPercent: discountNum
                        });
                        setInspectModalSaree(null);
                      }}
                    >
                      Add to Bag
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Slide-Over Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQty={handleUpdateQty}
        onRemove={handleRemoveItem}
        onProceedCheckout={handleProceedCheckout}
        formatPrice={formatPrice}
      />

      {/* Consultation Booking Modal (sp_CreateBooking) */}
      <Suspense fallback={null}>
      {isBookingOpen && <ConsultationModal
        isOpen={true}
        onClose={() => setIsBookingOpen(false)}
        onShowToast={showToast}
        loggedInCustomer={currentCustomer}
      />}

      {/* Bespoke Custom Patola Creation Modal with Photo Upload */}
      {isCustomPatolaOpen && <CustomPatolaModal
        isOpen={true}
        onClose={() => setIsCustomPatolaOpen(false)}
        onShowToast={showToast}
        loggedInCustomer={currentCustomer}
        onCustomOrderCreated={(customOrder) => {
          setActiveTrackOrder(customOrder);
          setRecentOrders(prev => [customOrder, ...prev.filter(o => o.orderReference !== customOrder.orderReference)]);
          saveCustomerTrackingReference(customOrder);
          setIsTrackingOpen(true);
          showToast(`🎉 Custom Order #${customOrder.orderReference} submitted! Live tracking is now active.`);
        }}
      />}

      {/* Checkout Modal (sp_CreateOrder) */}
      {isCheckoutOpen && <CheckoutModal
        isOpen={true}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        formatPrice={formatPrice}
        currentCurrency={currentCurrency}
        onOrderSuccess={handleOrderSuccess}
        loggedInCustomer={currentCustomer}
      />}

      {/* Flipkart-Style Order Tracking & OTP Modal */}
      {isTrackingOpen && <OrderTrackingModal
        isOpen={true}
        onClose={() => setIsTrackingOpen(false)}
        activeOrder={activeTrackOrder}
        allOrders={recentOrders}
        currentCustomer={currentCustomer}
        onOpenCustomerAuth={() => {
          setIsTrackingOpen(false);
          setOpenTrackingAfterAuth(true);
          setIsCustomerAuthOpen(true);
        }}
        onOpenCustomerAccount={() => {
          setIsTrackingOpen(false);
          setIsCustomerAccountOpen(true);
        }}
        formatPrice={formatPrice}
        currentCurrency={currentCurrency}
        onTrackOtherOrder={(ref) => {
          showToast(`Tracking status loaded for Order #${ref}`);
        }}
        onOrderUpdated={(updated) => {
          setActiveTrackOrder(prev => (prev ? { ...prev, ...updated } : updated));
          setRecentOrders(prev => prev.map(o => o.orderReference === updated.orderReference ? { ...o, ...updated } : o));
          if (updated.isCancelled) {
            showToast(`🚫 Order #${updated.orderReference} has been cancelled.`);
          } else {
            showToast(`✦ Order #${updated.orderReference} updated successfully!`);
          }
        }}
      />}

      {/* Artisan Admin Portal & Order Fulfillment Modal */}
      {isAdminOpen && <AdminDashboardModal
        isOpen={true}
        onClose={() => {
          setIsAdminOpen(false);
          setAdminAutoUnlock(false);
          // If URL contained secret admin path, hash or query, reset back to clean '/'
          try {
            const currentPath = decodeURIComponent(window.location.pathname || '').toLowerCase();
            const currentHash = decodeURIComponent(window.location.hash || '').toLowerCase();
            const currentSearch = decodeURIComponent(window.location.search || '').toLowerCase();
            if (currentPath.includes('admin') || currentHash.includes('admin') || currentSearch.includes('admin') || currentPath.includes('chavda') || currentPath.includes('patola') || currentHash.includes('patola')) {
              window.history.pushState(null, '', '/');
            }
          } catch (e) {}
        }}
        autoUnlock={adminAutoUnlock}
        onShowToast={showToast}
        activeLocalOrders={recentOrders}
        onSareeAdded={(newSaree) => {
          setUploadedSarees(prev => [newSaree, ...prev]);
          setCatalogVersion(v => v + 1);
        }}
        onSareeDeleted={(deletedId) => {
          setDeletedSareeIds(prev => [...prev, deletedId]);
          setUploadedSarees(prev => prev.filter(s => s.id !== deletedId));
          setCatalogVersion(v => v + 1);
        }}
        onSareeUpdated={(updatedSaree) => {
          setUploadedSarees(prev => {
            const exists = prev.some(s => s.id === updatedSaree.id);
            if (exists) {
              return prev.map(s => s.id === updatedSaree.id ? { ...s, ...updatedSaree } : s);
            }
            return [updatedSaree, ...prev];
          });
          setCatalogVersion(v => v + 1);
        }}
        onStockUpdated={(id, isOutOfStock, stockStatus) => {
          setCatalogVersion(v => v + 1);
        }}
        onOrderUpdated={(updated) => {
          setActiveTrackOrder(prev => {
            if (prev && prev.orderReference === updated.orderReference) {
              return { ...prev, ...updated };
            }
            return updated;
          });
          setRecentOrders(prev => prev.map(o => o.orderReference === updated.orderReference ? { ...o, ...updated } : o));
        }}
        onOrderDeleted={(deletedRef) => {
          setRecentOrders(prev => prev.filter(o => o.orderReference !== deletedRef));
          setActiveTrackOrder(prev => (prev && prev.orderReference === deletedRef ? null : prev));
        }}
      />}

      {/* All Customer Reviews & Testimonials Modal */}
      {isAllReviewsOpen && <AllReviewsModal
        isOpen={true}
        onClose={() => setIsAllReviewsOpen(false)}
      />}

      {/* 24/7 Royal Customer Support & Artisan Concierge Center */}
      {isSupportOpen && <CustomerSupportModal
        isOpen={true}
        onClose={() => setIsSupportOpen(false)}
        onShowToast={showToast}
      />}

      {/* Wedding Trousseau Wishlist & Family Sharing Modal */}
      {isWishlistOpen && <WeddingWishlistModal
        isOpen={true}
        onClose={() => setIsWishlistOpen(false)}
        wishlist={wishlist}
        onRemoveFromWishlist={handleRemoveFromWishlist}
        onAddToCart={handleAddToCart}
        onAddAllToCart={handleAddAllWishlistToCart}
        formatPrice={formatPrice}
        showToast={showToast}
      />}
      </Suspense>

      {/* Toast Notification */}
      {/* Customer Login / Register Modal */}
      {isCustomerAuthOpen && (
        <CustomerAuthModal
          isOpen={isCustomerAuthOpen}
          onClose={() => {
            setIsCustomerAuthOpen(false);
            setOpenTrackingAfterAuth(false);
          }}
          onLoginSuccess={(cust) => {
            setCurrentCustomer(cust);
            showToast(`✦ Welcome, ${cust.customerName}! You are logged in.`);
            if (openTrackingAfterAuth) {
              setOpenTrackingAfterAuth(false);
              setIsTrackingOpen(true);
            }
          }}
        />
      )}

      {/* Customer Account & Order History Modal */}
      {isCustomerAccountOpen && currentCustomer && (
        <CustomerAccountModal
          isOpen={isCustomerAccountOpen}
          onClose={() => setIsCustomerAccountOpen(false)}
          customer={currentCustomer}
          onLogout={() => {
            ApiService.customerLogout();
            setCurrentCustomer(null);
            showToast('👋 You have been logged out securely.');
          }}
          formatPrice={formatPrice}
          onTrackOrder={(ref) => {
            setActiveTrackOrder({ orderReference: ref });
            setIsTrackingOpen(true);
          }}
        />
      )}

      {toastMessage && (
        <div className="toast-container">
          <div
            className="toast-msg success"
            onClick={() => setToastMessage(null)}
            title="Click to dismiss"
            style={{ cursor: 'pointer' }}
          >
            <span className="toast-icon">✦</span>
            <span style={{ flex: 1 }}>{toastMessage}</span>
            <span style={{ opacity: 0.6, fontSize: '0.85rem', marginLeft: '0.5rem' }}>✕</span>
          </div>
        </div>
      )}
    </div>
  );
}


