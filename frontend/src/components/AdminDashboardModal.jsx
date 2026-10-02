/* ====================================================================================================
 * FileName: AdminDashboardModal.jsx
 * Folder: frontend/src/components/
 * 
 * Artisan Admin Portal & Order Fulfillment Dashboard
 * ----------------------------------------------------------------------------------------------------
 * Allows the store owner to:
 * - Securely authenticate with store manager PIN (Default: 1234).
 * - View all customer orders from SQL Server (Customer Name, Phone, Address, Sarees, Amount, OTP).
 * - Manage order fulfillment across 5 handcrafted stages:
 *     Stage 1: Weaving Started (Loom Assigned to Master Weavers)
 *     Stage 2: Silk Mark & Inspection Sealed
 *     Stage 3: Dispatched via Armored Logistics
 *     Stage 4: Out for Insured Royal Delivery
 *     Stage 5: Delivered & Crown Sealed
 * - Assign courier partner (Blue Dart, Speed Post, DTDC, etc.) & tracking number.
 * - Instantly synchronizes with customer's Live Order Tracking modal.
 * ==================================================================================================== */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ApiService } from '../services/api';
import { getOrderDeliveryOtp, formatDateDDMMYYYY } from '../utils/security';
import { compressImageFile, cleanupAndCompressStorageSarees } from '../utils/imageCompressor';

const STAGES = [
  { id: 1, name: 'Pending', desc: 'Order Placed (Awaiting Payment / Confirmation)' },
  { id: 2, name: 'Confirmed', desc: 'Payment Paid & Confirmation OTP Verified' },
  { id: 3, name: 'Packed', desc: 'Artisan Quality Checked & Handloom Sealed' },
  { id: 4, name: 'Shipped', desc: 'Dispatched via Courier with AWB' },
  { id: 5, name: 'Delivered', desc: 'Delivery Handover OTP Verified (sp_VerifyDeliveryOtp)' }
];

const DEFAULT_SAREE_IMAGES = [
  '/assets/images/saree_nari_kunjar.jpg',
  '/assets/images/patola_pallu.jpg',
  '/assets/images/patola_macro.jpg',
  '/assets/images/patola_drape.jpg',
  '/assets/images/artisan_loom.jpg'
];
const DEFAULT_CURATED_PHOTOS = DEFAULT_SAREE_IMAGES;

const SAREE_PHOTO_SLOTS = [
  {
    idx: 0,
    title: 'Photo 1: Full Front Drape',
    gujarati: '1. Full Saree Front Drape (Normal 2D Photo - Fixed)',
    badge: 'Cover 2D',
    badgeColor: '#4a2c11',
    hint: 'Primary image displayed first in catalog card (Fixed standard 2D photograph).',
    fallback: '/assets/images/saree_nari_kunjar.jpg'
  },
  {
    idx: 1,
    title: 'Photo 2: Royal Pallu & Zari',
    gujarati: '2. Grand Pallu & Royal Zari (✨ 3D Orbit View)',
    badge: '✨ 3D Pallu',
    badgeColor: '#aa8521',
    hint: 'Shows the heavy zari border and intricate pallav with 3D silk sheen.',
    fallback: '/assets/images/patola_pallu.jpg'
  },
  {
    idx: 2,
    title: 'Photo 3: Macro Ikat Weave',
    gujarati: '3. Intricate Ikat Weave & Silk Threads (✨ 3D Orbit View)',
    badge: '✨ 3D Macro',
    badgeColor: '#0d4a38',
    hint: 'Close-up of silk knots and warp/weft double ikat with 3D rotation.',
    fallback: '/assets/images/patola_macro.jpg'
  },
  {
    idx: 3,
    title: 'Photo 4: Loom / Mannequin Drape',
    gujarati: '4. Loom Heritage & Silhouette (✨ 3D Orbit View)',
    badge: '✨ 3D Mannequin',
    badgeColor: '#0c2340',
    hint: 'Artisanal drape on mannequin with 3D orbit.',
    fallback: '/assets/images/patola_drape.jpg'
  },
  {
    idx: 4,
    title: 'Photo 5: 360° Angle View (Interactive Panoramic Spin)',
    gujarati: '5. 360° Angle View (🔄 360 ડિગ્રી રોટેશન અને બંને બાજુ ભાત)',
    badge: '🔄 360° Angle',
    badgeColor: '#831843',
    hint: 'Interactive 360° rotation allowing customer to rotate the saree 360 degrees and inspect pure silk from all angles.',
    fallback: '/assets/images/artisan_loom.jpg'
  }
];

const DUPATTA_PHOTO_SLOTS = [
  {
    idx: 0,
    title: 'Photo 1: Full Dupatta Spread',
    gujarati: '1. Full Dupatta Spread (Normal 2D Photo - Fixed)',
    badge: 'Cover 2D',
    badgeColor: '#4a2c11',
    hint: 'Primary image displayed first in catalog card (Fixed standard 2D photograph).',
    fallback: '/assets/images/saree_nari_kunjar.jpg'
  },
  {
    idx: 1,
    title: 'Photo 2: Royal Pallu & Zari Tassels',
    gujarati: '2. Grand Pallu & Zari Borders (✨ 3D Orbit View)',
    badge: '✨ 3D Pallu',
    badgeColor: '#aa8521',
    hint: 'Shows the heavy zari border and intricate dupatta pallav with 3D silk sheen.',
    fallback: '/assets/images/patola_pallu.jpg'
  },
  {
    idx: 2,
    title: 'Photo 3: Macro Ikat Weave Detail',
    gujarati: '3. Intricate Ikat Weave & Silk Threads (✨ 3D Orbit View)',
    badge: '✨ 3D Macro',
    badgeColor: '#0d4a38',
    hint: 'Close-up of silk knots and warp/weft double ikat with 3D rotation.',
    fallback: '/assets/images/patola_macro.jpg'
  },
  {
    idx: 3,
    title: 'Photo 4: Shoulder Drape & Styling',
    gujarati: '4. Shoulder Drape & Styling (✨ 3D Orbit View)',
    badge: '✨ 3D Drape',
    badgeColor: '#0c2340',
    hint: 'Artisanal drape on shoulder with 3D orbit.',
    fallback: '/assets/images/patola_drape.jpg'
  },
  {
    idx: 4,
    title: 'Photo 5: 360° Angle View (Interactive Panoramic Spin)',
    gujarati: '5. 360° Angle View (🔄 360 ડિગ્રી રોટેશન)',
    badge: '🔄 360° Angle',
    badgeColor: '#831843',
    hint: 'Interactive 360° rotation allowing customer to rotate the dupatta 360 degrees in all angles.',
    fallback: '/assets/images/artisan_loom.jpg'
  }
];

export default function AdminDashboardModal({
  isOpen,
  onClose,
  onShowToast,
  onOrderUpdated,
  onOrderDeleted,
  onSareeAdded,
  onSareeUpdated,
  onSareeDeleted,
  onStockUpdated,
  activeLocalOrders = [],
  autoUnlock = false
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return autoUnlock || sessionStorage.getItem('patola_admin_authed') === 'true';
    } catch (e) {
      return autoUnlock;
    }
  });
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'dupatta-orders' | 'inventory' | 'dupatta-inventory' | 'visits' | 'custom-orders' | 'upload' | 'upload-dupatta'

  useEffect(() => {
    if (isOpen) {
      try {
        if (autoUnlock || sessionStorage.getItem('patola_admin_authed') === 'true') {
          setIsAuthenticated(true);
        }
      } catch (e) {}
    }
  }, [autoUnlock, isOpen]);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderViewMode, setOrderViewMode] = useState('active'); // 'active' | 'completed' | 'cancelled' | 'all'
  const [orderProductFilter, setOrderProductFilter] = useState('all'); // 'all' | 'saree' | 'dupatta'
  const [hiddenOrderRefs, setHiddenOrderRefs] = useState(() => {
    try {
      const saved = localStorage.getItem('patola_hidden_order_refs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Book Visit & Consultation State
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [bookingTypeFilter, setBookingTypeFilter] = useState('all'); // 'all' | 'studio' | 'video' | 'bridal'
  const [bookingStatusFilter, setBookingStatusFilter] = useState('active'); // 'active' | 'completed' | 'Confirmed' | 'Pending' | 'Cancelled' | 'hidden' | 'all'
  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [deletingBookingId, setDeletingBookingId] = useState(null);
  const [hiddenBookingIds, setHiddenBookingIds] = useState(() => {
    try {
      const saved = localStorage.getItem('patola_hidden_booking_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [visitViewMode, setVisitViewMode] = useState('active'); // 'active' | 'completed' | 'hidden' | 'all'

  // Custom Orders (Bespoke Saree Commissions) State
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [customStatusFilter, setCustomStatusFilter] = useState('all'); // 'all' | 'new' | 'weaving' | 'completed'
  const [previewCustomPhoto, setPreviewCustomPhoto] = useState(null);

  // Saree Inventory & Management State
  const [sarees, setSarees] = useState([]);
  const [loadingSarees, setLoadingSarees] = useState(false);
  const [sareeSearchQuery, setSareeSearchQuery] = useState('');
  const [sareeCategoryFilter, setSareeCategoryFilter] = useState('all');
  const [deletingSareeId, setDeletingSareeId] = useState(null);
  const [togglingStockId, setTogglingStockId] = useState(null);
  const [editingSaree, setEditingSaree] = useState(null);
  const [editSareeForm, setEditSareeForm] = useState(null);
  const [savingEditSaree, setSavingEditSaree] = useState(false);

  // Dupatta Inventory & Management State
  const [dupattaSearchQuery, setDupattaSearchQuery] = useState('');
  const [dupattaCategoryFilter, setDupattaCategoryFilter] = useState('all');
  const [editingDupatta, setEditingDupatta] = useState(null);
  const [editDupattaForm, setEditDupattaForm] = useState(null);
  const [savingEditDupatta, setSavingEditDupatta] = useState(false);

  // Deleted Orders History & Archive State (Read-Only 10-per-page)
  const [deletedOrderRecords, setDeletedOrderRecords] = useState(() => {
    try {
      const saved = localStorage.getItem('patola_deleted_order_records');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [deletedSearchQuery, setDeletedSearchQuery] = useState('');
  const [deletedCurrentPage, setDeletedCurrentPage] = useState(1);
  const [selectedDeletedDetail, setSelectedDeletedDetail] = useState(null);
  const [deletedPhotoPreview, setDeletedPhotoPreview] = useState(null);
  const [isDeletedHistoryModalOpen, setIsDeletedHistoryModalOpen] = useState(false);
  const DELETED_PER_PAGE = 10;

  // Helper to parse length into numeric value and unit ('Meter' | 'CM')
  const parseLengthValue = (val, defaultNum = '6.30') => {
    if (!val) return { number: defaultNum, unit: 'Meter' };
    const str = String(val).trim();
    const isCm = /\bcm\b/i.test(str);
    const totalMatch = str.match(/\(([0-9.]+)\s*m\s*total\)/i);
    if (totalMatch) {
      return { number: totalMatch[1], unit: 'Meter' };
    }
    const match = str.match(/([0-9]+(\.[0-9]+)?)/);
    const number = match ? match[1] : defaultNum;
    return {
      number,
      unit: isCm ? 'CM' : (Number(number) >= 100 && !str.toLowerCase().includes('meter') ? 'CM' : 'Meter')
    };
  };

  const buildSareeLengthString = (number, unit = 'Meter') => {
    const cleanNum = String(number || '').trim();
    if (!cleanNum) return '6.30 Meters (Includes Blouse Piece)';
    if (unit === 'CM' || unit === 'cm') {
      return `${cleanNum} CM (Includes Blouse Piece)`;
    }
    return `${cleanNum} Meters (Includes Blouse Piece)`;
  };

  // Helper to ensure saree length is cleanly formatted (accepts raw number like 6.50, 5.50 or full string)
  const formatSareeLength = (val, unit = 'Meter') => {
    if (!val) return '6.30 Meters (Includes Blouse Piece)';
    const trimmed = String(val).trim();
    if (/^[0-9]+(\.[0-9]+)?$/.test(trimmed)) {
      return buildSareeLengthString(trimmed, unit);
    }
    return trimmed;
  };

  const buildDupattaLengthString = (number, unit = 'Meter') => {
    const cleanNum = String(number || '').trim();
    if (!cleanNum) return '2.50 Meters (Handloom Silk with Zari Pallu)';
    if (unit === 'CM' || unit === 'cm') {
      return `${cleanNum} CM (Handloom Silk with Zari Pallu)`;
    }
    return `${cleanNum} Meters (Handloom Silk with Zari Pallu)`;
  };

  // Helper to ensure dupatta length is cleanly formatted (accepts raw number like 2.50, 2.75 or full string)
  const formatDupattaLength = (val, unit = 'Meter') => {
    if (!val) return '2.50 Meters (Handloom Silk with Zari Pallu)';
    const trimmed = String(val).trim();
    if (/^[0-9]+(\.[0-9]+)?$/.test(trimmed)) {
      return buildDupattaLengthString(trimmed, unit);
    }
    return trimmed;
  };

  // Helper functions for Dupatta vs Saree separation
  const isDupattaItem = (item) => {
    if (!item) return false;
    const cat = String(item.category || '').toLowerCase();
    const title = String(item.title || item.sareeTitle || item.name || '').toLowerCase();
    const weave = String(item.weave || '').toLowerCase();
    const sareeId = String(item.sareeId || '').toLowerCase();
    const productId = String(item.productId || '').toLowerCase();
    const id = String(item.id || '').toLowerCase();

    // Check catalog if available
    let catalogCat = '';
    let catalogTitle = '';
    if (sarees && Array.isArray(sarees)) {
      const match = sarees.find(s => {
        const sId = String(s.id || '').toLowerCase();
        return (sareeId && sId === sareeId) || (productId && sId === productId) || (id && sId === id);
      });
      if (match) {
        catalogCat = String(match.category || '').toLowerCase();
        catalogTitle = String(match.title || '').toLowerCase();
      }
    }

    return cat.includes('dupatta') || 
           title.includes('dupatta') || 
           weave.includes('dupatta') || 
           sareeId.includes('dupatta') || 
           productId.includes('dupatta') || 
           (id && id.includes('dupatta')) ||
           catalogCat.includes('dupatta') ||
           catalogTitle.includes('dupatta');
  };

  const isSareeItem = (item) => {
    return !isDupattaItem(item);
  };

  const isDupattaOrder = (ord) => {
    if (!ord) return false;
    if (ord.items && Array.isArray(ord.items) && ord.items.length > 0) {
      return ord.items.some(item => isDupattaItem(item));
    }
    const title = String(ord.sareeTitle || ord.productTitle || ord.title || '').toLowerCase();
    const notes = String(ord.notes || '').toLowerCase();
    const sareeId = String(ord.sareeId || '').toLowerCase();
    const id = String(ord.id || '').toLowerCase();
    const cat = String(ord.category || '').toLowerCase();
    return title.includes('dupatta') || notes.includes('dupatta') || sareeId.includes('dupatta') || (id && id.includes('dupatta')) || cat.includes('dupatta');
  };

  const isSareeOrder = (ord) => {
    if (!ord) return false;
    if (ord.items && Array.isArray(ord.items) && ord.items.length > 0) {
      return ord.items.some(item => isSareeItem(item));
    }
    return !isDupattaOrder(ord);
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'double-ikat': return 'Double Ikat Heritage';
      case 'single-ikat': return 'Single Ikat Classic';
      case 'semi-patola': return 'Semi Patola Saree';
      case 'zari-buta': return 'Zari Buta Patola Saree';
      case 'Modern': return 'Modern Patola Saree';
      case 'double-dupatta': return 'Double Ikat Dupatta';
      case 'single-dupatta': return 'Single Ikat Dupatta';
      case 'semi-dupatta': return 'Semi Patola Dupatta';
      case 'all-dupatta': return 'All Dupattas';
      default: return cat || 'Double Ikat';
    }
  };

  // Saree Upload Form State
  const [sareeForm, setSareeForm] = useState({
    title: '',
    basePriceINR: '',
    discountPercent: '0', 
    stockQuantity: '50',
    weave: 'Double Ikat Handloom',
    category: 'double-ikat',
    motif: 'nari-kunjar',
    motifName: 'Nari Kunjar (Elephant & Dancing Maiden)',
    timeToWeave: '9 Months Handcrafted',
    fabric: '100% Pure Mulberry Silk & Natural Dyes',
    badge: 'Masterpiece Double Ikat',
    description: '',
    colors: '',
    length: '6.30 Meters (Includes Blouse Piece)',
    lengthNumber: '6.30',
    lengthUnit: 'Meter',
    image: '/assets/images/saree_nari_kunjar.jpg',
    images: [...DEFAULT_SAREE_IMAGES]
  });
  const [uploadedPhoto, setUploadedPhoto] = useState(null);
  const [savingSaree, setSavingSaree] = useState(false);

  // Dupatta Upload Form State
  const [dupattaForm, setDupattaForm] = useState({
    title: '',
    basePriceINR: '',
    discountPercent: '0',
    stockQuantity: '50',
    weave: 'Double Ikat Handloom Dupatta',
    category: 'double-dupatta',
    motif: 'nari-kunjar',
    motifName: 'Nari Kunjar (Elephant & Dancing Maiden)',
    timeToWeave: '3 to 5 Months Handcrafted',
    fabric: '100% Pure Mulberry Silk & Natural Dyes',
    length: '2.50 Meters (Handloom Silk with Zari Pallu)',
    lengthNumber: '2.50',
    lengthUnit: 'Meter',
    badge: 'Double Ikat Dupatta',
    description: '',
    image: '/assets/images/saree_nari_kunjar.jpg',
    images: [...DEFAULT_SAREE_IMAGES]
  });
  const [uploadedDupattaPhoto, setUploadedDupattaPhoto] = useState(null);
  const [savingDupatta, setSavingDupatta] = useState(false);

  // Editing state for courier/stage/delivery date
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingOrderRef, setEditingOrderRef] = useState(null);
  const [editStage, setEditStage] = useState(1);
  const [editCourier, setEditCourier] = useState('Blue Dart Express');
  const [editAwb, setEditAwb] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [expandedCustomerOrderRef, setExpandedCustomerOrderRef] = useState(null);

  const getEffectiveDate = (ord) => {
    if (!ord || !ord.orderReference) return '5 to 10 Days (Insured Delivery)';
    try {
      const dates = JSON.parse(localStorage.getItem('patola_order_delivery_dates') || '{}');
      return dates[ord.orderReference] || ord.deliveryDateText || '5 to 10 Days (Insured Delivery)';
    } catch (e) {
      return ord.deliveryDateText || '5 to 10 Days (Insured Delivery)';
    }
  };

  const getOrderPriceDetails = (ord) => {
    if (!ord) return { total: 0, originalTotal: 0, hasDiscount: false, discountPercent: 0 };

    let originalTotal = Number(ord.totalAmount) || 0;
    let finalTotal = originalTotal;
    let hasDiscount = false;
    let maxDiscountPercent = 0;

    try {
      const editedMap = JSON.parse(localStorage.getItem('patola_edited_sarees') || '{}');

      if (ord.items && ord.items.length > 0) {
        let calcFinal = 0;
        let calcOriginal = 0;
        let anyItemDiscount = false;

        for (const item of ord.items) {
          const qty = Number(item.quantity) || 1;
          const sareeId = item.sareeId || item.id;
          const edited = (sareeId && editedMap[sareeId])
            ? editedMap[sareeId]
            : Object.values(editedMap).find(s => s.title && item.sareeTitle && s.title.toLowerCase().trim() === item.sareeTitle.toLowerCase().trim());

          const base = Number(item.originalPrice) || Number(edited?.basePriceINR) || Number(item.unitPrice) || (originalTotal / Math.max(1, ord.items.length));
          let disc = Number(item.discountPercent) || Number(edited?.discountPercent) || 0;
          let finalUnit = 0;

          if (item.finalPrice && Number(item.finalPrice) > 0) {
            finalUnit = Number(item.finalPrice);
            if (base > finalUnit && disc === 0) disc = Math.round(((base - finalUnit) / base) * 100);
          } else if (item.unitPrice && Number(item.unitPrice) > 0 && item.unitPrice < base) {
            finalUnit = Number(item.unitPrice);
            if (disc === 0) disc = Math.round(((base - finalUnit) / base) * 100);
          } else if (disc > 0) {
            finalUnit = Math.round(base - (base * disc / 100));
          } else {
            finalUnit = base;
          }

          if (disc > 0 && finalUnit < base) {
            anyItemDiscount = true;
            if (disc > maxDiscountPercent) maxDiscountPercent = disc;
          }

          calcOriginal += base * qty;
          calcFinal += finalUnit * qty;
        }

        if (anyItemDiscount && calcFinal > 0) {
          hasDiscount = true;
          finalTotal = calcFinal;
          if (calcOriginal > originalTotal) originalTotal = calcOriginal;
        }
      }
    } catch (e) {}

    return {
      total: finalTotal,
      originalTotal,
      hasDiscount,
      discountPercent: maxDiscountPercent
    };
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      cleanupAndCompressStorageSarees();
      loadOrders();
      loadSarees();
      loadBookings();
      loadDeletedOrders();
    }
  }, [isOpen, isAuthenticated]);

  // Session security: If token expires or is rejected, securely lock dashboard and prompt PIN
  useEffect(() => {
    const handleExpired = () => {
      setIsAuthenticated(false);
      setPin('');
      try {
        sessionStorage.removeItem('patola_admin_authed');
        localStorage.removeItem('patola_admin_jwt_token');
      } catch (e) {}
      alert('🔒 સિક્યુરિટી એલર્ટ: તમારું એડમિન સેશન સમાપ્ત થયું છે. ડેટા સુરક્ષા માટે કૃપા કરીને ફરીથી PIN દાખલ કરો.');
    };
    window.addEventListener('patola:admin_session_expired', handleExpired);
    return () => window.removeEventListener('patola:admin_session_expired', handleExpired);
  }, []);

  // Listen for real-time order cancellation, booking created, and storage sync events
  useEffect(() => {
    const handleSync = () => {
      if (isOpen && isAuthenticated) {
        loadBookings();
        loadOrders();
        loadDeletedOrders();
      }
    };
    window.addEventListener('patola:order_cancelled', handleSync);
    window.addEventListener('patola:booking_created', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('patola:order_cancelled', handleSync);
      window.removeEventListener('patola:booking_created', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [isOpen, isAuthenticated]);

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      let data = await ApiService.fetchAllBookings();
      if (!data || !Array.isArray(data) || data.length === 0) {
        // Fallback seed visits
        data = [
          {
            id: 1002,
            fullName: 'Chavda',
            phone: '8160160750',
            email: 'chavda8160160@gmail.com',
            experienceType: 'Studio Loom Visit',
            preferredDate: '2026-10-15T11:00:00',
            motifPreference: 'Nari Kunjar',
            notes: 'Looking forward to visiting the master artisans to see the double ikat loom in person.',
            status: 'Confirmed',
            createdAt: new Date().toISOString()
          },
          {
            id: 1001,
            fullName: 'Priyadarshini Mehta',
            phone: '9825012345',
            email: 'priya.mehta@example.com',
            experienceType: 'Virtual Video Call',
            preferredDate: '2026-09-28T16:00:00',
            motifPreference: 'Ratanchowk',
            notes: 'Private video consultation to select bridal trousseau saree for royal Gujarati wedding.',
            status: 'Confirmed',
            createdAt: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: 1003,
            fullName: 'Devanshi Trivedi',
            phone: '9426078910',
            email: 'devanshi.trivedi@outlook.com',
            experienceType: 'Bridal Trousseau Curation',
            preferredDate: '2026-11-12T14:30:00',
            motifPreference: 'Chhabdi Bhat',
            notes: 'Custom color dye preference: Crimson red and deep navy with pure silver and gold zari.',
            status: 'Pending',
            createdAt: new Date(Date.now() - 172800000).toISOString()
          }
        ];
      }

      // Check customer cancellations and localStorage status overrides
      try {
        const deletedBookingIds = JSON.parse(localStorage.getItem('patola_deleted_booking_ids') || '[]');
        if (deletedBookingIds.length > 0) {
          data = data.filter(b => b && !deletedBookingIds.includes(String(b.id)));
        }

        const overrides = JSON.parse(localStorage.getItem('patola_booking_status_overrides') || '{}');
        const cancelledOrders = JSON.parse(localStorage.getItem('patola_cancelled_orders') || '[]');
        const stageOverrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
        const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');

        data = data.map(b => {
          const bIdStr = String(b.id);
          const cstRef = `CST-${b.id}`;
          const isCancelled = (b.status || '').toLowerCase().includes('cancel') ||
            cancelledOrders.includes(cstRef) ||
            cancelledOrders.includes(bIdStr) ||
            stageOverrides[cstRef] === 0 ||
            stageOverrides[bIdStr] === 0 ||
            !!cancellations[cstRef] ||
            !!cancellations[bIdStr];

          if (isCancelled) {
            return {
              ...b,
              status: 'Cancelled',
              cancellationInfo: cancellations[cstRef] || cancellations[bIdStr] || null
            };
          }

          const overrideStatus = overrides[bIdStr];
          return overrideStatus ? { ...b, status: overrideStatus } : b;
        });
      } catch (e) {}

      setBookings(data);
    } catch (e) {
      console.warn('Load bookings error:', e);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    const bIdStr = String(bookingId);
    const numId = parseInt(bIdStr, 10);
    const vpRef = !isNaN(numId) ? `VP-CST-${String(numId).padStart(4, '0')}` : `VP-CST-${bIdStr}`;
    const cstRef = !isNaN(numId) ? `CST-${numId}` : `CST-${bIdStr}`;
    const bkRef = !isNaN(numId) ? `BK-${numId}` : `BK-${bIdStr}`;
    const allAliases = [bIdStr, vpRef, cstRef, bkRef].filter(Boolean);

    setUpdatingBookingId(bookingId);
    try {
      // 1. Save status override locally so it immediately and permanently persists
      try {
        const overrides = JSON.parse(localStorage.getItem('patola_booking_status_overrides') || '{}');
        allAliases.forEach(k => {
          overrides[k] = newStatus;
        });
        localStorage.setItem('patola_booking_status_overrides', JSON.stringify(overrides));
      } catch (e) {}

      // 2. Track or clear cancellations and stage overrides in global localStorage
      try {
        const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
        const cancelledOrders = JSON.parse(localStorage.getItem('patola_cancelled_orders') || '[]');
        const stageOverrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');

        if (newStatus.toLowerCase() === 'cancelled') {
          const existingInfo = cancellations[vpRef] || cancellations[cstRef] || cancellations[bkRef] || cancellations[bIdStr];
          const cancelInfo = existingInfo || {
            orderReference: vpRef,
            bookingId: bookingId,
            reason: 'Weaving timeline conflict / Artisan loom capacity',
            cancelledAt: new Date().toISOString(),
            cancelledBy: 'Store Administration'
          };

          allAliases.forEach(k => {
            cancellations[k] = cancelInfo;
            if (!cancelledOrders.includes(k)) cancelledOrders.push(k);
            stageOverrides[k] = 0;
          });

          localStorage.setItem('patola_order_cancellations', JSON.stringify(cancellations));
          localStorage.setItem('patola_cancelled_orders', JSON.stringify(cancelledOrders));
          localStorage.setItem('patola_order_stage_overrides', JSON.stringify(stageOverrides));

          try {
            window.dispatchEvent(new CustomEvent('patola:order_cancelled', {
              detail: { orderReference: vpRef, id: bookingId, isCustomOrder: true, cancellationData: cancelInfo }
            }));
          } catch (e) {}
        } else {
          // If un-cancelling back to Confirmed / Pending / Completed, clean up cancellation flags
          allAliases.forEach(k => {
            delete cancellations[k];
            delete stageOverrides[k];
          });
          localStorage.setItem('patola_order_cancellations', JSON.stringify(cancellations));

          const updatedCancelled = cancelledOrders.filter(id => !allAliases.includes(id));
          localStorage.setItem('patola_cancelled_orders', JSON.stringify(updatedCancelled));

          // If completed, set stage override 5
          if (newStatus.toLowerCase() === 'completed') {
            allAliases.forEach(k => { stageOverrides[k] = 5; });
          }
          localStorage.setItem('patola_order_stage_overrides', JSON.stringify(stageOverrides));

          try {
            window.dispatchEvent(new CustomEvent('patola:order_updated', {
              detail: { orderReference: vpRef, id: bookingId, isCustomOrder: true, updatedRecord: { currentStage: newStatus.toLowerCase() === 'completed' ? 5 : 1, orderStatus: newStatus } }
            }));
          } catch (e) {}
        }
      } catch (e) {}

      // 3. If status is Completed, automatically add to hiddenBookingIds so it auto-hides from active view
      if (newStatus.toLowerCase() === 'completed') {
        setHiddenBookingIds(prev => {
          const updated = Array.from(new Set([...prev, bIdStr]));
          try {
            localStorage.setItem('patola_hidden_booking_ids', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      } else {
        // If marked back as Confirmed or Pending or Cancelled, unhide it automatically
        setHiddenBookingIds(prev => {
          const updated = prev.filter(id => id !== bIdStr);
          try {
            localStorage.setItem('patola_hidden_booking_ids', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }

      // 4. Update React state IMMEDIATELY (Instant optimistic UI reaction)
      setBookings(prev => prev.map(b => String(b.id) === bIdStr ? { ...b, status: newStatus } : b));

      if (onShowToast) {
        if (newStatus.toLowerCase() === 'completed') {
          onShowToast(`🏆 Booking #${bookingId} marked as Completed & moved to Completed Archive!`);
        } else if (newStatus.toLowerCase() === 'cancelled') {
          onShowToast(`🚫 Custom Order / Visit #${bookingId} CANCELLED! Production halted.`);
        } else {
          onShowToast(`📅 Booking #${bookingId} status restored to: ${newStatus}`);
        }
      }

      // 5. Update backend API asynchronously
      ApiService.updateBookingStatus(bookingId, newStatus).catch(err => {
        console.warn('Backend updateBookingStatus warning:', err);
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingBookingId(null);
    }
  };

  // Handle cancelling a Loom Visit appointment with apology WhatsApp prompt
  const handleCancelBookingWithApology = async (b) => {
    if (!b) return;
    const ok = window.confirm(`Cancel Loom Visit appointment for "${b.fullName || 'Patron'}"?`);
    if (!ok) return;
    const reason = 'Master artisan schedule conflict / Studio maintenance';

    const bIdStr = String(b.id);
    const numId = parseInt(bIdStr, 10);
    const bkRef = !isNaN(numId) ? `BK-${numId}` : `BK-${bIdStr}`;

    try {
      const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
      const visitCancellations = JSON.parse(localStorage.getItem('patola_visit_cancellations') || '{}');
      const info = {
        bookingId: b.id,
        fullName: b.fullName,
        reason: reason,
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'Store Manager'
      };
      cancellations[bkRef] = info;
      cancellations[bIdStr] = info;
      visitCancellations[bIdStr] = info;
      localStorage.setItem('patola_order_cancellations', JSON.stringify(cancellations));
      localStorage.setItem('patola_visit_cancellations', JSON.stringify(visitCancellations));
    } catch (e) {}

    await handleUpdateBookingStatus(b.id, 'Cancelled');

    const cleanPhone = String(b.phone || '').replace(/\D/g, '');
    if (cleanPhone) {
      const sendWa = window.confirm(
        `✅ Loom appointment #BK-${b.id} cancelled.\n\nWould you like to send the Cancellation Apology WhatsApp message to "${b.fullName || 'Patron'}" (+91 ${cleanPhone}) now?`
      );
      if (sendWa) {
        const waUrl = getWhatsAppVisitCancellationUrl(b, reason);
        window.open(waUrl, '_blank');
      }
    }
  };

  // Handle cancelling a Custom Bespoke Loom Order with apology WhatsApp prompt
  const handleCancelCustomOrderWithApology = async (c) => {
    if (!c) return;
    const ok = window.confirm(`Cancel Custom Patola Order #CST-${c.id} for "${c.fullName || 'Patron'}"?`);
    if (!ok) return;
    const reason = 'Weaving timeline conflict / Artisan loom capacity';

    const bIdStr = String(c.id);
    const numId = parseInt(bIdStr, 10);
    const vpRef = !isNaN(numId) ? `VP-CST-${String(numId).padStart(4, '0')}` : `VP-CST-${bIdStr}`;
    const cstRef = !isNaN(numId) ? `CST-${numId}` : `CST-${bIdStr}`;
    const bkRef = !isNaN(numId) ? `BK-${numId}` : `BK-${bIdStr}`;
    const allAliases = [bIdStr, vpRef, cstRef, bkRef].filter(Boolean);

    try {
      const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
      const info = {
        orderReference: vpRef,
        bookingId: c.id,
        fullName: c.fullName,
        reason: reason,
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'Store Manager'
      };
      allAliases.forEach(k => {
        cancellations[k] = info;
      });
      localStorage.setItem('patola_order_cancellations', JSON.stringify(cancellations));
    } catch (e) {}

    await handleUpdateBookingStatus(c.id, 'Cancelled');

    const cleanPhone = String(c.phone || '').replace(/\D/g, '');
    if (cleanPhone) {
      const sendWa = window.confirm(
        `✅ Custom Order #${vpRef} cancelled.\n\nWould you like to send the Cancellation Apology WhatsApp message to "${c.fullName || 'Patron'}" (+91 ${cleanPhone}) now?`
      );
      if (sendWa) {
        const waUrl = getWhatsAppCustomOrderCancellationUrl(c, reason);
        window.open(waUrl, '_blank');
      }
    }
  };

  const handleToggleHideBooking = (bookingId) => {
    const bIdStr = String(bookingId);
    setHiddenBookingIds(prev => {
      const isAlreadyHidden = prev.includes(bIdStr);
      const updated = isAlreadyHidden
        ? prev.filter(id => id !== bIdStr)
        : [...prev, bIdStr];
      try {
        localStorage.setItem('patola_hidden_booking_ids', JSON.stringify(updated));
      } catch (e) {}
      if (onShowToast) {
        onShowToast(isAlreadyHidden
          ? `👁️ Booking #${bookingId} unhidden and visible in active visits.`
          : `🙈 Booking #${bookingId} hidden from active visits.`
        );
      }
      return updated;
    });
  };

  // Helper to detect Custom Bespoke Loom Commissions
  const isCustomBooking = (b) => {
    if (!b) return false;
    const exp = (b.experienceType || '').toLowerCase();
    const notes = (b.notes || '').toLowerCase();
    return exp.includes('custom loom weaving') || exp.includes('bespoke loom') || notes.includes('[bespoke custom patola]');
  };

  const getCustomOrderPhoto = (b) => {
    if (!b) return null;
    // 1. Try direct property (clean server file path or URL)
    if (typeof b.referencePhoto === 'string' && (b.referencePhoto.startsWith('/') || b.referencePhoto.startsWith('http') || b.referencePhoto.startsWith('data:image'))) {
      return b.referencePhoto;
    }
    // 2. Try extracting from b.notes if legacy embedded [REF_PHOTO:...] or [PHOTO_DATA:...]
    if (b.notes && typeof b.notes === 'string') {
      const match = b.notes.match(/\[REF_PHOTO:([^\]]+)\]/) || b.notes.match(/\[PHOTO_DATA:([^\]]+)\]/);
      if (match && match[1]) return match[1];
    }
    // 3. Try localStorage photo cache
    try {
      const photoMap = JSON.parse(localStorage.getItem('patola_custom_order_photos') || '{}');
      const cleanPhone = String(b.phone || '').replace(/\D/g, '');
      const candidates = [
        photoMap[String(b.id)],
        photoMap[`CST-${b.id}`],
        photoMap[`VP-CST-${String(b.id).padStart(4, '0')}`],
        photoMap[String(b.phone)],
        photoMap[cleanPhone]
      ];
      for (const cand of candidates) {
        if (typeof cand === 'string' && cand.length > 3 && (cand.startsWith('/') || cand.startsWith('http') || cand.startsWith('data:image'))) {
          return cand;
        }
      }
    } catch (e) {}
    return null;
  };

  const parseCustomNotes = (notes) => {
    if (!notes) return { colors: '', city: '', description: '', hasPhoto: false };
    const hasPhoto = (notes.includes('[Reference Photo Attached') || notes.includes('[REF_PHOTO:') || notes.includes('[PHOTO_DATA:'));
    let clean = notes
      .replace(/\[BESPOKE CUSTOM PATOLA\]/gi, '')
      .replace(/\[Reference Photo Attached by Customer\]/gi, '')
      .replace(/\[No Photo Attached\]/gi, '')
      .replace(/\[REF_PHOTO:[^\]]+\]/gi, '')
      .replace(/\[PHOTO_DATA:[^\]]+\]/gi, '')
      .trim();

    let colors = '';
    let city = '';
    let description = clean;

    const colMatch = clean.match(/Colors:\s*([^.]+)\./i);
    if (colMatch) colors = colMatch[1].trim();

    const cityMatch = clean.match(/City:\s*([^.]+)\./i);
    if (cityMatch) city = cityMatch[1].trim();

    const descMatch = clean.match(/Description:\s*([^.]+)/i);
    if (descMatch) description = descMatch[1].trim();

    return { colors, city, description: description || clean, hasPhoto };
  };

  // Helper to read item-level cancellations for an order
  const getOrderItemCancellations = (orderRef) => {
    if (!orderRef) return {};
    try {
      const all = JSON.parse(localStorage.getItem('patola_order_item_cancellations') || '{}');
      return all[orderRef] || {};
    } catch (e) {
      return {};
    }
  };

  const isOrderItemCancelled = (orderRef, item, idx) => {
    if (!orderRef || !item) return false;
    if (item.isCancelled) return true;
    const itemCancels = getOrderItemCancellations(orderRef);
    const itemKey = item.sareeId || item.id || `idx_${idx}`;
    return Boolean(itemCancels[itemKey] || itemCancels[`idx_${idx}`]);
  };

  const getOrderItemCancelData = (orderRef, item, idx) => {
    if (!orderRef || !item) return null;
    const itemCancels = getOrderItemCancellations(orderRef);
    const itemKey = item.sareeId || item.id || `idx_${idx}`;
    return itemCancels[itemKey] || itemCancels[`idx_${idx}`] || (item.isCancelled ? { reason: 'Item cancelled', cancelledAt: item.cancelledAt } : null);
  };

  const handleAdminCancelItem = (ord, item, idx) => {
    if (!ord || !item) return;
    const title = item.sareeTitle || item.title || 'Patola Saree';
    const reason = window.prompt(`Enter cancellation reason for "${title}" from Order #${ord.orderReference}:`, 'Patron requested single item cancellation');
    if (reason === null) return;

    const ref = ord.orderReference;
    const itemKey = item.sareeId || item.id || `idx_${idx}`;
    const unitPrice = Number(item.unitPrice || item.finalPriceINR || 0);
    const qty = Number(item.quantity) || 1;
    const itemPrice = unitPrice * qty;

    const cancelData = {
      orderReference: ref,
      itemKey,
      itemTitle: title,
      refundAmount: itemPrice,
      reason: reason.trim() || 'Cancelled by Store Admin',
      cancelledAt: new Date().toISOString(),
      cancelledBy: 'Store Administration'
    };

    try {
      const allItemCancels = JSON.parse(localStorage.getItem('patola_order_item_cancellations') || '{}');
      if (!allItemCancels[ref]) allItemCancels[ref] = {};
      allItemCancels[ref][itemKey] = cancelData;
      allItemCancels[ref][`idx_${idx}`] = cancelData;
      localStorage.setItem('patola_order_item_cancellations', JSON.stringify(allItemCancels));
    } catch (e) {}

    // Dispatch real-time events
    try {
      window.dispatchEvent(new CustomEvent('patola:item_cancelled', { detail: { orderReference: ref, itemKey, cancellationData: cancelData } }));
      window.dispatchEvent(new CustomEvent('patola:order_updated', { detail: { orderReference: ref } }));
    } catch (e) {}

    loadOrders();
    if (onShowToast) onShowToast(`🚫 "${title}" cancelled from Order #${ref}. 100% refund initiated.`);
  };

  const handleAdminRestoreItem = (ord, item, idx) => {
    if (!ord || !item) return;
    const title = item.sareeTitle || item.title || 'Patola Saree';
    const ok = window.confirm(`Restore "${title}" back to active status in Order #${ord.orderReference}?`);
    if (!ok) return;

    const ref = ord.orderReference;
    const itemKey = item.sareeId || item.id || `idx_${idx}`;

    try {
      const allItemCancels = JSON.parse(localStorage.getItem('patola_order_item_cancellations') || '{}');
      if (allItemCancels[ref]) {
        delete allItemCancels[ref][itemKey];
        delete allItemCancels[ref][`idx_${idx}`];
        localStorage.setItem('patola_order_item_cancellations', JSON.stringify(allItemCancels));
      }
    } catch (e) {}

    try {
      window.dispatchEvent(new CustomEvent('patola:order_updated', { detail: { orderReference: ref } }));
    } catch (e) {}

    loadOrders();
    if (onShowToast) onShowToast(`↩️ "${title}" restored to active status in Order #${ref}.`);
  };

  const getWhatsAppItemCancellationUrl = (ord, item, idx) => {
    const cleanPhone = String(ord.contactPhone || ord.phone || '').replace(/\D/g, '');
    const title = item.sareeTitle || item.title || 'Patola Saree';
    const unitPrice = Number(item.unitPrice || item.finalPriceINR || 0);
    const qty = Number(item.quantity) || 1;
    const itemPrice = unitPrice * qty;
    const cancelData = getOrderItemCancelData(ord.orderReference, item, idx);
    const reason = cancelData?.reason || 'Patron request';

    const text = `🙏 Namaste ${ord.customerName || 'Patron'},\n\nRegarding your Patola Order #${ord.orderReference}:\nAs requested, the item "${title}" has been cancelled.\n\n💳 100% Refund Amount: ₹${itemPrice.toLocaleString('en-IN')}\nReason: ${reason}\n\n✦ Note: Your remaining items in Order #${ord.orderReference} will continue to be handcrafted on our traditional rosewood looms and delivered on schedule.\n\nWarm regards,\nPATOLA MADE VANKAR HERITAGE`;
    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const handleDeleteBooking = async (bookingOrId) => {
    const booking = (typeof bookingOrId === 'object' && bookingOrId !== null)
      ? bookingOrId
      : bookings.find(b => b.id == bookingOrId) || { id: bookingOrId, fullName: `Record #${bookingOrId}` };
    const bId = booking.id;
    const bIdStr = String(bId);
    const isCustom = isCustomBooking(booking);
    const labelType = isCustom ? 'Custom Patola Order' : 'Loom Visit Booking';
    const ok = window.confirm(`Are you sure you want to permanently delete ${labelType} #${bId} for "${booking.fullName || ('#' + bId)}"?\n\nIt will safely be archived in Deleted History (Read-Only).`);
    if (!ok) return;

    setDeletingBookingId(bId);

    // 0. Create rich archive snapshot for Deleted History
    const orderRef = isCustom ? `CST-${bId}` : `BK-${bId}`;
    const parsedNotes = parseCustomNotes(booking.notes);
    const customPhoto = getCustomOrderPhoto(booking) || '/assets/images/patola_drape.jpg';

    const snapshot = {
      id: bId,
      orderReference: orderRef,
      customerName: booking.fullName || 'Valued Patron',
      contactPhone: booking.phone || '',
      email: booking.email || '',
      deliveryAddress: parsedNotes.city ? `Delivery City: ${parsedNotes.city}` : (booking.notes || ''),
      city: parsedNotes.city || '',
      postalCode: '',
      state: 'Gujarat',
      totalAmount: Number(booking.customEstimate || booking.totalAmount) || 0,
      paymentMode: isCustom ? 'Bespoke Loom Commission' : 'Studio Consultation Visit',
      isCustomOrder: isCustom,
      items: [
        {
          sareeTitle: isCustom 
            ? `Bespoke Custom Patola (${booking.motifPreference || 'Custom Design'})` 
            : `Loom Studio Consultation (${booking.experienceType || 'Visit'})`,
          quantity: 1,
          unitPrice: Number(booking.customEstimate || booking.totalAmount) || 0,
          image: customPhoto,
          category: isCustom ? 'custom-saree' : 'consultation',
          motifName: booking.motifPreference || 'Custom Motif',
          weave: 'Master Weaver Bespoke Handloom',
          description: parsedNotes.description || booking.notes || '',
          colors: parsedNotes.colors || ''
        }
      ],
      originalCreatedAt: booking.createdAt || new Date().toISOString(),
      deletedAt: new Date().toISOString(),
      deletedBy: 'Store Manager (Artisan Admin Portal)',
      lastOrderStatus: booking.status || 'Active'
    };

    // 1. Optimistic removal from state immediately
    setBookings(prev => prev.filter(b => b.id != bId));

    // 2. Persist in deleted history archive & localStorage
    setDeletedOrderRecords(prev => {
      const exists = prev.some(r => r.orderReference === orderRef);
      const updated = exists ? prev.map(r => r.orderReference === orderRef ? snapshot : r) : [snapshot, ...prev];
      try {
        localStorage.setItem('patola_deleted_order_records', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 3. Persist deleted ID in localStorage so it never re-appears
    try {
      const deletedList = JSON.parse(localStorage.getItem('patola_deleted_booking_ids') || '[]');
      if (!deletedList.includes(bIdStr)) {
        deletedList.push(bIdStr);
        localStorage.setItem('patola_deleted_booking_ids', JSON.stringify(deletedList));
      }

      // Clean local bookings list
      const local = JSON.parse(localStorage.getItem('patola_local_bookings') || '[]');
      const filteredLocal = local.filter(b => b && b.id != bId);
      localStorage.setItem('patola_local_bookings', JSON.stringify(filteredLocal));

      // Clean overrides and cancellations
      const overrides = JSON.parse(localStorage.getItem('patola_booking_status_overrides') || '{}');
      delete overrides[bIdStr];
      localStorage.setItem('patola_booking_status_overrides', JSON.stringify(overrides));

      const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
      delete cancellations[`CST-${bId}`];
      delete cancellations[`BK-${bId}`];
      delete cancellations[bIdStr];
      localStorage.setItem('patola_order_cancellations', JSON.stringify(cancellations));

      const cancelledOrders = JSON.parse(localStorage.getItem('patola_cancelled_orders') || '[]');
      const filteredCancelled = cancelledOrders.filter(id => id !== bIdStr && id !== `CST-${bId}` && id !== `BK-${bId}`);
      localStorage.setItem('patola_cancelled_orders', JSON.stringify(filteredCancelled));
    } catch (e) {}

    // 4. API delete
    try {
      await ApiService.deleteBooking(bId);
    } catch (err) {
      console.warn('Backend deleteBooking note:', err);
    } finally {
      setDeletingBookingId(null);
    }

    if (onShowToast) {
      onShowToast(`🗑️ ${labelType} #${orderRef} (${booking.fullName || ''}) deleted & preserved in Deleted History.`);
    }
  };

  const loadSarees = async () => {
    setLoadingSarees(true);
    try {
      const data = await ApiService.fetchSarees();
      let list = data && Array.isArray(data) && data.length > 0 ? data : [];
      try {
        const editedMap = JSON.parse(localStorage.getItem('patola_edited_sarees') || '{}');
        list = list.map(s => editedMap[s.id] ? { ...s, ...editedMap[s.id] } : s);
      } catch (err) {}
      if (list.length > 0) {
        setSarees(list);
      }
    } catch (e) {
      console.warn('Load sarees error:', e);
    } finally {
      setLoadingSarees(false);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    let apiOrders = await ApiService.fetchAllOrders();
    let orderList = [];

    if (apiOrders && Array.isArray(apiOrders)) {
      orderList = [...apiOrders];
    } else {
      orderList = [];
    }

    // Merge any local customer orders from session/localStorage
    try {
      const localCustomerOrders = JSON.parse(localStorage.getItem('patola_local_customer_orders') || '[]');
      const allLocal = [...activeLocalOrders, ...localCustomerOrders];
      const existingRefs = new Set(orderList.map(o => o.orderReference));
      for (const locOrd of allLocal) {
        if (locOrd && locOrd.orderReference && !existingRefs.has(locOrd.orderReference)) {
          orderList.push(locOrd);
          existingRefs.add(locOrd.orderReference);
        }
      }
    } catch (e) {}

    // Filter out permanently deleted orders
    try {
      const deletedList = JSON.parse(localStorage.getItem('patola_deleted_orders') || '[]');
      orderList = orderList.filter(o => o && o.orderReference && !deletedList.includes(o.orderReference));
    } catch (e) {}

    // Apply discount calculation, local stage overrides and cancellation status
    try {
      const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
      const cancelledList = JSON.parse(localStorage.getItem('patola_cancelled_orders') || '[]');
      orderList = orderList.map(o => {
        const uniqueOtp = getOrderDeliveryOtp(o);
        const p = getOrderPriceDetails(o);
        const cleanAwb = (o.trackingAwb && o.trackingAwb === 'OTP-VERIFIED') ? '' : (o.trackingAwb || '');
        const isCancelled = cancelledList.includes(o.orderReference) || overrides[o.orderReference] === 0 || (o.orderStatus && o.orderStatus.toLowerCase().includes('cancelled'));
        if (isCancelled) {
          return {
            ...o,
            trackingAwb: cleanAwb,
            deliveryOtp: uniqueOtp,
            currentStage: 0,
            isCancelled: true,
            totalAmount: p.hasDiscount ? p.total : (o.totalAmount || 0),
            originalTotalAmount: p.originalTotal,
            hasDiscount: p.hasDiscount,
            discountPercent: p.discountPercent,
            orderStatus: o.orderStatus && o.orderStatus.toLowerCase().includes('cancelled') ? o.orderStatus : 'Cancelled (Order Terminated & Refund Initiated)'
          };
        }
        if (overrides[o.orderReference] !== undefined) {
          const st = overrides[o.orderReference];
          const stObj = STAGES.find(s => s.id === st) || STAGES[st - 1];
          return {
            ...o,
            trackingAwb: cleanAwb,
            deliveryOtp: uniqueOtp,
            currentStage: st,
            totalAmount: p.hasDiscount ? p.total : (o.totalAmount || 0),
            originalTotalAmount: p.originalTotal,
            hasDiscount: p.hasDiscount,
            discountPercent: p.discountPercent,
            orderStatus: `Stage ${st}: ${stObj ? stObj.name : 'Handover Completed'}`
          };
        }
        return {
          ...o,
          trackingAwb: cleanAwb,
          deliveryOtp: uniqueOtp,
          totalAmount: p.hasDiscount ? p.total : (o.totalAmount || 0),
          originalTotalAmount: p.originalTotal,
          hasDiscount: p.hasDiscount,
          discountPercent: p.discountPercent
        };
      });
    } catch (e) {}

    setOrders(orderList);
    setLoading(false);
  };

  const loadDeletedOrders = async () => {
    try {
      const sqlDeleted = await ApiService.fetchDeletedOrders();
      let localRecords = [];
      try {
        const saved = localStorage.getItem('patola_deleted_order_records');
        if (saved) localRecords = JSON.parse(saved);
      } catch (e) {}

      let combined = [...localRecords];
      if (sqlDeleted && Array.isArray(sqlDeleted) && sqlDeleted.length > 0) {
        const mappedSql = sqlDeleted.map(d => {
          let parsedItems = [];
          try {
            parsedItems = typeof d.itemsJson === 'string' ? JSON.parse(d.itemsJson) : (d.items || []);
          } catch (e) {
            parsedItems = [];
          }
          return {
            id: d.id,
            orderReference: d.orderReference,
            customerName: d.customerName,
            contactPhone: d.contactPhone,
            email: d.email || '',
            deliveryAddress: d.deliveryAddress || '',
            city: d.city || '',
            postalCode: d.postalCode || '',
            state: d.state || '',
            currency: d.currency || 'INR',
            totalAmount: d.totalAmount,
            paymentMode: d.paymentMode,
            lastOrderStatus: d.lastOrderStatus,
            originalCreatedAt: d.originalCreatedAt,
            deletedAt: d.deletedAt,
            deletedBy: d.deletedBy || 'Store Admin / Manager',
            items: parsedItems
          };
        });

        const refMap = new Map();
        combined.forEach(r => {
          if (r && r.orderReference) refMap.set(r.orderReference, r);
        });
        mappedSql.forEach(r => {
          if (r && r.orderReference) refMap.set(r.orderReference, r);
        });

        combined = Array.from(refMap.values());
        try {
          localStorage.setItem('patola_deleted_order_records', JSON.stringify(combined));
        } catch (e) {}
      }

      setDeletedOrderRecords(combined);
    } catch (e) {
      console.warn('Load deleted orders error:', e);
    }
  };

  const handlePinSubmit = async (e, overridePin = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const effectivePin = overridePin !== null ? overridePin : pin;
    const cleanPin = (effectivePin || '').trim();
    if (!cleanPin) return;

    // Call backend API with JWT Authentication
    try {
      const res = await ApiService.login('Admin', cleanPin);
      if (res && res.success) {
        setIsAuthenticated(true);
        try {
          sessionStorage.setItem('patola_admin_authed', 'true');
          if (res.token) {
            localStorage.setItem('patola_admin_jwt_token', res.token);
          }
        } catch (err) {}
        setPinError(false);
        setPin('');
        if (onShowToast) {
          onShowToast('👑 Welcome Store Manager! Admin Dashboard Unlocked (JWT Secured).');
        }
        return;
      }
    } catch (err) {
      console.warn('Backend login check error:', err);
    }

    setPinError(true);
  };

  const handleStartEdit = (order) => {
    if (!order) return;
    const ref = order.orderReference;

    // 1. If order is completed/hidden in current view mode, switch to 'all' so it is rendered in DOM
    const isCompleted = isOrderCompleted(order);
    if (orderViewMode === 'active' && isCompleted) {
      setOrderViewMode('all');
    } else if (orderViewMode === 'completed' && !isCompleted) {
      setOrderViewMode('all');
    }

    // 2. Clear search filter if it doesn't match this reference
    if (searchQuery && !ref.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
      setSearchQuery('');
    }

    // 3. Set editing target to open the card's fulfillment form
    setEditingOrder(null);
    setEditingOrderRef(ref);

    let stageNum = order.currentStage || 1;
    if (order.orderStatus) {
      const st = order.orderStatus.toLowerCase();
      if (st.includes('deliver') || st.includes('stage 5')) stageNum = 5;
      else if (st.includes('shipped') || st.includes('dispatch') || st.includes('stage 4')) stageNum = 4;
      else if (st.includes('pack') || st.includes('stage 3')) stageNum = 3;
      else if (st.includes('confirm') || st.includes('stage 2')) stageNum = 2;
      else if (st.includes('pending') || st.includes('stage 1')) stageNum = 1;
    }
    try {
      const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
      if (overrides[ref] !== undefined) stageNum = overrides[ref];
    } catch (e) {}

    setEditStage(stageNum);
    setEditCourier(order.courierPartner || 'Blue Dart Express');
    setEditAwb((order.trackingAwb && order.trackingAwb !== 'OTP-VERIFIED') ? order.trackingAwb : '');
    setEditDeliveryDate(getEffectiveDate(order));

    // 4. Scroll smoothly and redirect directly to that order card!
    setTimeout(() => {
      const targetCard = document.getElementById(`admin-order-${ref}`);
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCard.classList.add('order-card-pulse');
        setTimeout(() => targetCard.classList.remove('order-card-pulse'), 3000);
      }
    }, 150);

    if (onShowToast) {
      onShowToast(`👉 Redirected to Order #${ref}`);
    }
  };

  const handleSaveStatus = async (orderRef) => {
    setSavingStatus(true);
    const stageObj = STAGES.find(s => s.id === editStage) || STAGES[0];
    let statusText = `Stage ${editStage}: ${stageObj.name}`;
    if (editStage >= 4 && editCourier) {
      statusText += ` (${editCourier}${editAwb ? ' - AWB: ' + editAwb : ''})`;
    }

    const payload = {
      status: statusText,
      stage: editStage,
      courierPartner: editCourier,
      trackingAwb: editAwb
    };

    const res = await ApiService.updateOrderStatus(orderRef, payload);

    const cleanDeliveryDate = editDeliveryDate.trim() || '5 to 10 Days (Insured Delivery)';
    try {
      const dates = JSON.parse(localStorage.getItem('patola_order_delivery_dates') || '{}');
      dates[orderRef] = cleanDeliveryDate;
      localStorage.setItem('patola_order_delivery_dates', JSON.stringify(dates));
    } catch (e) {}

    // Update local state immediately
    const updatedOrderRecord = {
      orderReference: orderRef,
      orderStatus: statusText,
      currentStage: editStage,
      courierPartner: editCourier,
      trackingAwb: editAwb,
      deliveryDateText: cleanDeliveryDate,
      isCancelled: false
    };

    // When Stage 5: Delivered is selected, automatically confirm Payment as Paid & clear DeliveryOtp!
    if (editStage === 5) {
      updatedOrderRecord.paymentStatus = 'Paid';
      updatedOrderRecord.transactionId = 'COD-DELIVERY-PAID';
      updatedOrderRecord.deliveryOtp = null;
      try {
        await ApiService.updatePaymentStatus(orderRef, 'Paid', 'COD-DELIVERY-PAID');
      } catch (e) {
        console.warn('Auto payment status error:', e);
      }
    }

    setOrders(prev => prev.map(o => {
      if (o.orderReference === orderRef) {
        return {
          ...o,
          ...updatedOrderRecord
        };
      }
      return o;
    }));

    try {
      const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
      if (editStage === 5) {
        overrides[orderRef] = 5;
      } else {
        delete overrides[orderRef];
      }
      localStorage.setItem('patola_order_stage_overrides', JSON.stringify(overrides));

      const cancelledList = JSON.parse(localStorage.getItem('patola_cancelled_orders') || '[]');
      const updatedCancelled = cancelledList.filter(r => r !== orderRef);
      localStorage.setItem('patola_cancelled_orders', JSON.stringify(updatedCancelled));

      const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
      delete cancellations[orderRef];
      localStorage.setItem('patola_order_cancellations', JSON.stringify(cancellations));
    } catch (e) {}

    if (onOrderUpdated) {
      onOrderUpdated(updatedOrderRecord);
    }

    setSavingStatus(false);
    setEditingOrder(null);
    setEditingOrderRef(null);
    if (onShowToast) {
      if (editStage === 5) {
        onShowToast(`🏆 Order #${orderRef} marked as Stage 5: Delivered & Payment Confirmed (Paid)!`);
      } else {
        onShowToast(`Order #${orderRef} updated to: Stage ${editStage} (${stageObj.name})`);
      }
    }
  };

  const handleUpdatePaymentStatus = async (orderRef, newStatus = 'Paid') => {
    try {
      const txnId = `SETTLED-${Date.now().toString().slice(-6)}`;
      await ApiService.updatePaymentStatus(orderRef, newStatus, txnId);

      const updatedRecord = {
        orderReference: orderRef,
        paymentStatus: newStatus,
        transactionId: txnId
      };

      setOrders(prev => prev.map(o => o.orderReference === orderRef ? { ...o, ...updatedRecord } : o));
      if (onOrderUpdated) onOrderUpdated(updatedRecord);
      if (onShowToast) onShowToast(`💰 Order #${orderRef} Payment Status updated to: ${newStatus}!`);
    } catch (err) {
      alert(err?.message || 'Failed to update payment status in SQL Server.');
    }
  };

  const handleVerifyDeliveryOtpAdmin = async (order) => {
    const orderRef = order.orderReference;
    const authorOtp = order.deliveryOtp || getOrderDeliveryOtp(orderRef);
    const enteredOtp = window.prompt(`Enter 4-digit Delivery Handover OTP for Order #${orderRef}:\n(Stored Procedure: sp_VerifyDeliveryOtp)`, authorOtp);
    if (!enteredOtp) return;

    try {
      const res = await ApiService.verifyCustomerDeliveryOtp(orderRef, enteredOtp.trim());
      if (res && (res.verified || res.success)) {
        const updatedRecord = {
          orderReference: orderRef,
          orderStatus: 'Delivered',
          currentStage: 5,
          deliveryOtp: null,
          paymentStatus: 'Paid'
        };
        ApiService.updatePaymentStatus(orderRef, 'Paid', 'DELIVERY-OTP-VERIFIED').catch(e => console.warn(e));
        setOrders(prev => prev.map(o => o.orderReference === orderRef ? { ...o, ...updatedRecord } : o));
        if (onOrderUpdated) onOrderUpdated(updatedRecord);
        if (onShowToast) onShowToast(`🏆 Order #${orderRef} Delivery OTP Verified! OrderStatus updated to Delivered & Payment marked Paid via sp_VerifyDeliveryOtp.`);
      } else {
        alert(res?.message || 'Invalid Delivery OTP.');
      }
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Error executing sp_VerifyDeliveryOtp in SQL Server.');
    }
  };

  const handleCompleteOrder = async (orderRef) => {
    const stageObj = STAGES[4]; // Stage 5: Handover Completed
    const statusText = `Stage 5: ${stageObj.name} (Delivered & Verified)`;
    const updatedAwb = (editAwb && editAwb !== 'OTP-VERIFIED') ? editAwb : '';
    const updatedRecord = {
      orderReference: orderRef,
      orderStatus: statusText,
      currentStage: 5,
      courierPartner: editCourier || 'Express Handover',
      trackingAwb: updatedAwb,
      paymentStatus: 'Paid'
    };

    // 1. Instant optimistic update
    setOrders(prev => prev.map(o => o.orderReference === orderRef ? { ...o, ...updatedRecord } : o));

    // 2. Persist override in localStorage
    try {
      const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
      overrides[orderRef] = 5;
      localStorage.setItem('patola_order_stage_overrides', JSON.stringify(overrides));
    } catch (e) {}

    if (onOrderUpdated) {
      onOrderUpdated(updatedRecord);
    }
    if (onShowToast) {
      onShowToast(`🏆 Order #${orderRef} marked as Completed & auto-hidden from Active Orders!`);
    }

    // 3. Sync backend in background
    ApiService.updatePaymentStatus(orderRef, 'Paid', 'COMPLETED-SETTLED').catch(() => {});
    ApiService.updateOrderStatus(orderRef, {
      status: statusText,
      stage: 5,
      courierPartner: editCourier || 'Express Handover',
      trackingAwb: updatedAwb
    }).catch(err => {
      console.warn('Backend updateOrderStatus error:', err);
    });
  };

  const handleCancelOrder = async (orderRef) => {
    const targetOrder = orders.find(o => o.orderReference === orderRef);
    const reasonPrompt = window.prompt(`Are you sure you want to cancel Order #${orderRef}?\n\nPlease enter reason for cancellation:`, 'Cancelled by Store Manager request');
    if (reasonPrompt === null) return; // User pressed Cancel

    const reason = reasonPrompt.trim() || 'Cancelled by Store Manager';
    const statusText = `Cancelled (${reason})`;
    const updatedRecord = {
      orderReference: orderRef,
      orderStatus: statusText,
      currentStage: 0,
      isCancelled: true
    };

    setOrders(prev => prev.map(o => o.orderReference === orderRef ? { ...o, ...updatedRecord } : o));

    try {
      const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
      overrides[orderRef] = 0; // 0 = Cancelled
      localStorage.setItem('patola_order_stage_overrides', JSON.stringify(overrides));

      const cancelledList = JSON.parse(localStorage.getItem('patola_cancelled_orders') || '[]');
      if (!cancelledList.includes(orderRef)) {
        cancelledList.push(orderRef);
        localStorage.setItem('patola_cancelled_orders', JSON.stringify(cancelledList));
      }

      const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
      cancellations[orderRef] = {
        orderReference: orderRef,
        reason: reason,
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'Store Manager (Artisan Admin Portal)'
      };
      localStorage.setItem('patola_order_cancellations', JSON.stringify(cancellations));
    } catch (e) {}

    if (onOrderUpdated) {
      onOrderUpdated(updatedRecord);
    }
    if (onShowToast) {
      onShowToast(`🚫 Order #${orderRef} was cancelled.`);
    }

    try {
      window.dispatchEvent(new CustomEvent('patola:order_cancelled', {
        detail: { orderReference: orderRef, updatedRecord }
      }));
    } catch (e) {}

    ApiService.updateOrderStatus(orderRef, {
      status: statusText,
      stage: 0
    }).catch(err => {
      console.warn('Backend updateOrderStatus error:', err);
    });

    // Auto-prompt to send Cancellation Apology WhatsApp to Customer
    const phone = targetOrder?.contactPhone || targetOrder?.phone;
    if (phone) {
      const cleanPhone = String(phone).replace(/\D/g, '');
      const sendWa = window.confirm(
        `✅ Order #${orderRef} has been cancelled.\n\nWould you like to send the Cancellation Apology WhatsApp message to "${targetOrder?.customerName || 'Customer'}" (+91 ${cleanPhone}) now?`
      );
      if (sendWa) {
        const waUrl = getWhatsAppCancellationUrl({ ...(targetOrder || {}), ...updatedRecord }, reason);
        window.open(waUrl, '_blank');
      }
    }
  };

  const handleReopenOrder = async (orderRef) => {
    const stageObj = STAGES[0]; // Stage 1: Weaving Started
    const statusText = `Stage 1: ${stageObj.name}`;
    const updatedRecord = {
      orderReference: orderRef,
      orderStatus: statusText,
      currentStage: 1,
      isCancelled: false
    };

    setOrders(prev => prev.map(o => o.orderReference === orderRef ? { ...o, ...updatedRecord } : o));

    try {
      const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
      delete overrides[orderRef];
      localStorage.setItem('patola_order_stage_overrides', JSON.stringify(overrides));

      const cancelledList = JSON.parse(localStorage.getItem('patola_cancelled_orders') || '[]');
      const updatedCancelled = cancelledList.filter(r => r !== orderRef);
      localStorage.setItem('patola_cancelled_orders', JSON.stringify(updatedCancelled));

      const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
      delete cancellations[orderRef];
      localStorage.setItem('patola_order_cancellations', JSON.stringify(cancellations));
    } catch (e) {}

    if (onOrderUpdated) {
      onOrderUpdated(updatedRecord);
    }
    if (onShowToast) {
      onShowToast(`↩️ Order #${orderRef} reopened & restored to Active Orders.`);
    }

    try {
      window.dispatchEvent(new CustomEvent('patola:order_updated', {
        detail: { orderReference: orderRef, updatedRecord }
      }));
    } catch (e) {}

    ApiService.updateOrderStatus(orderRef, {
      status: statusText,
      stage: 1
    }).catch(err => {
      console.warn('Backend updateOrderStatus error:', err);
    });
  };

  const handleDeleteOrder = async (orderRef) => {
    if (!window.confirm(`⚠️ Permanently Delete Order #${orderRef}?\n\nAre you sure you want to delete this order? It will be removed from Active Orders and safely preserved in the Deleted History Archive (Read-Only).`)) {
      return;
    }

    // 0. Capture full order snapshot before removing
    const targetOrder = orders.find(o => o.orderReference === orderRef) ||
                        (activeLocalOrders && activeLocalOrders.find(o => o.orderReference === orderRef));

    const snapshot = {
      id: targetOrder?.id || Date.now(),
      orderReference: orderRef,
      customerName: targetOrder?.customerName || targetOrder?.fullName || 'Patola Connoisseur',
      contactPhone: targetOrder?.contactPhone || targetOrder?.phone || '',
      email: targetOrder?.email || '',
      deliveryAddress: targetOrder?.deliveryAddress || targetOrder?.address || '',
      city: targetOrder?.city || '',
      postalCode: targetOrder?.postalCode || '',
      state: targetOrder?.state || '',
      totalAmount: Number(targetOrder?.totalAmount) || 0,
      paymentMode: targetOrder?.paymentMode || 'Online Payment',
      isCustomOrder: !!(targetOrder?.isCustomOrder || targetOrder?.isCustomLoom),
      items: (Array.isArray(targetOrder?.items) && targetOrder.items.length > 0)
        ? targetOrder.items
        : [
            {
              sareeTitle: targetOrder?.sareeTitle || targetOrder?.title || 'Pure Silk Patola Saree',
              quantity: targetOrder?.quantity || 1,
              unitPrice: targetOrder?.unitPrice || targetOrder?.totalAmount || 0,
              image: targetOrder?.image || targetOrder?.sareeImage || '/assets/images/patola_drape.jpg',
              category: targetOrder?.category || 'saree',
              motifName: targetOrder?.motifName || targetOrder?.motifPreference || 'Sacred Motif',
              weave: targetOrder?.weave || 'Authentic Double Ikat Patola'
            }
          ],
      originalCreatedAt: targetOrder?.createdAt || new Date().toISOString(),
      deletedAt: new Date().toISOString(),
      deletedBy: 'Store Manager (Artisan Admin Portal)',
      lastOrderStatus: targetOrder?.orderStatus || 'Active'
    };

    // 1. Optimistic removal
    setOrders(prev => prev.filter(o => o.orderReference !== orderRef));

    // 2. Persist in deleted history archive & localStorage
    setDeletedOrderRecords(prev => {
      const exists = prev.some(r => r.orderReference === orderRef);
      const updated = exists ? prev.map(r => r.orderReference === orderRef ? snapshot : r) : [snapshot, ...prev];
      try {
        localStorage.setItem('patola_deleted_order_records', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      const deletedList = JSON.parse(localStorage.getItem('patola_deleted_orders') || '[]');
      if (!deletedList.includes(orderRef)) {
        deletedList.push(orderRef);
        localStorage.setItem('patola_deleted_orders', JSON.stringify(deletedList));
      }

      // Also clean from local customer orders if present
      const localCust = JSON.parse(localStorage.getItem('patola_local_customer_orders') || '[]');
      const filteredCust = localCust.filter(o => o && o.orderReference !== orderRef);
      localStorage.setItem('patola_local_customer_orders', JSON.stringify(filteredCust));

      // Clean overrides, dates, cancellations
      const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
      delete overrides[orderRef];
      localStorage.setItem('patola_order_stage_overrides', JSON.stringify(overrides));

      const cancelledList = JSON.parse(localStorage.getItem('patola_cancelled_orders') || '[]');
      const updatedCancelled = cancelledList.filter(r => r !== orderRef);
      localStorage.setItem('patola_cancelled_orders', JSON.stringify(updatedCancelled));

      const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
      delete cancellations[orderRef];
      localStorage.setItem('patola_order_cancellations', JSON.stringify(cancellations));
    } catch (e) {}

    if (onOrderDeleted) {
      onOrderDeleted(orderRef);
    }

    try {
      window.dispatchEvent(new CustomEvent('patola:order_deleted', {
        detail: { orderReference: orderRef }
      }));
    } catch (e) {}

    // 3. Delete from backend API
    try {
      await ApiService.deleteOrder(orderRef);
    } catch (err) {
      console.warn('Backend deleteOrder error:', err);
    }

    if (onShowToast) {
      onShowToast(`🗑️ Order #${orderRef} deleted & preserved in Deleted History.`);
    }
  };

  const handleRestoreDeletedOrder = async (deletedOrd) => {
    if (!deletedOrd || !deletedOrd.orderReference) return;
    const ref = deletedOrd.orderReference;
    if (!window.confirm(`↩️ Restore Order #${ref} back to Active Orders?`)) return;

    // 1. Remove from deleted lists in state & localStorage
    setDeletedOrderRecords(prev => {
      const updated = prev.filter(r => r.orderReference !== ref);
      try {
        localStorage.setItem('patola_deleted_order_records', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      const deletedList = JSON.parse(localStorage.getItem('patola_deleted_orders') || '[]');
      const updatedList = deletedList.filter(r => r !== ref);
      localStorage.setItem('patola_deleted_orders', JSON.stringify(updatedList));

      const deletedBookings = JSON.parse(localStorage.getItem('patola_deleted_booking_ids') || '[]');
      const updatedBookings = deletedBookings.filter(id => id !== String(deletedOrd.id));
      localStorage.setItem('patola_deleted_booking_ids', JSON.stringify(updatedBookings));

      const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
      overrides[ref] = 1;
      localStorage.setItem('patola_order_stage_overrides', JSON.stringify(overrides));

      const cancelledOrders = JSON.parse(localStorage.getItem('patola_cancelled_orders') || '[]');
      const filteredCancelled = cancelledOrders.filter(r => r !== ref);
      localStorage.setItem('patola_cancelled_orders', JSON.stringify(filteredCancelled));
    } catch (e) {}

    // 2. Prepare clean restored order
    const restoredOrder = {
      ...deletedOrd,
      isDeletedRecord: false,
      currentStage: 1,
      orderStatus: 'Stage 1: Order Confirmed & In Weaving Queue'
    };
    delete restoredOrder.deletedAt;
    delete restoredOrder.deletedBy;

    // 3. Add to orders state
    setOrders(prev => {
      const exists = prev.some(o => o.orderReference === ref);
      if (exists) {
        return prev.map(o => o.orderReference === ref ? restoredOrder : o);
      }
      return [restoredOrder, ...prev];
    });

    // 4. Save to local customer orders
    try {
      const localCust = JSON.parse(localStorage.getItem('patola_local_customer_orders') || '[]');
      const exists = localCust.some(o => o.orderReference === ref);
      const updatedCust = exists ? localCust.map(o => o.orderReference === ref ? restoredOrder : o) : [restoredOrder, ...localCust];
      localStorage.setItem('patola_local_customer_orders', JSON.stringify(updatedCust));
    } catch (e) {}

    // 5. Try updating backend API
    try {
      await ApiService.updateOrderStatus(ref, {
        currentStage: 1,
        orderStatus: 'Stage 1: Order Confirmed & In Weaving Queue'
      });
    } catch (err) {
      console.warn('Backend restore order note:', err);
    }

    if (onShowToast) {
      onShowToast(`✅ Order #${ref} restored to Active Orders!`);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (onShowToast) onShowToast('⏳ Optimizing photo (iPhone/HD)...');
      try {
        const compressedDataUrl = await compressImageFile(file);
        if (!compressedDataUrl) return;
        setUploadedPhoto(compressedDataUrl);
        setSareeForm(prev => {
          const currentList = Array.isArray(prev.images) && prev.images.length >= 4 
            ? [...prev.images] 
            : [...DEFAULT_SAREE_IMAGES];
          currentList[0] = compressedDataUrl;
          return { ...prev, image: compressedDataUrl, images: currentList };
        });
        if (onShowToast) {
          onShowToast('⚡ High-Definition Photo optimized & loaded with zero lag!');
        }
      } catch (err) {
        console.error('Photo optimization error:', err);
        alert(`⚠️ Photo Processing Notice:\n${err.message || 'Unable to process this image'}\n\nPlease select another photo or export as JPG.`);
      }
    }
  };

  const handleBulkPhotosUpload = async (e, isEdit = false) => {
    const fileList = Array.from(e.target.files || []).slice(0, 4);
    if (fileList.length === 0) return;

    if (onShowToast) {
      onShowToast(`⏳ Optimizing ${fileList.length} photos for lightning-fast loading...`);
    }

    try {
      const promises = fileList.map(file => compressImageFile(file));
      const results = await Promise.all(promises);

      if (isEdit) {
        setEditSareeForm(prev => {
          const currentList = Array.isArray(prev.images) && prev.images.length >= 4 
            ? [...prev.images] 
            : [...DEFAULT_SAREE_IMAGES];
          results.forEach((res, i) => {
            if (res) currentList[i] = res;
          });
          return {
            ...prev,
            images: currentList,
            image: currentList[0]
          };
        });
      } else {
        setSareeForm(prev => {
          const currentList = Array.isArray(prev.images) && prev.images.length >= 4 
            ? [...prev.images] 
            : [...DEFAULT_SAREE_IMAGES];
          results.forEach((res, i) => {
            if (res) currentList[i] = res;
          });
          return {
            ...prev,
            images: currentList,
            image: currentList[0]
          };
        });
        if (results[0]) setUploadedPhoto(results[0]);
      }
      if (onShowToast) {
        onShowToast(`📸 ${results.length} HD photos compressed & loaded with zero lag!`);
      }
    } catch (err) {
      console.error('Bulk photo optimization error:', err);
      alert(`⚠️ Photo Processing Notice:\n${err.message || 'Unable to process images'}\n\nPlease ensure photos are valid JPG, PNG, or standard iPhone images.`);
    }
  };

  const handleSingleSlotPhotoUpload = async (slotIdx, e, isEdit = false) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (onShowToast) {
      onShowToast(`⏳ Optimizing Photo ${slotIdx + 1} (iPhone/HD)...`);
    }

    try {
      const dataUrl = await compressImageFile(file);
      if (!dataUrl) return;

      if (isEdit) {
        setEditSareeForm(prev => {
          const currentList = Array.isArray(prev.images) && prev.images.length >= 5 
            ? [...prev.images] 
            : [
                prev.image || DEFAULT_SAREE_IMAGES[0],
                DEFAULT_SAREE_IMAGES[1],
                DEFAULT_SAREE_IMAGES[2],
                DEFAULT_SAREE_IMAGES[3],
                DEFAULT_SAREE_IMAGES[4]
              ];
          currentList[slotIdx] = dataUrl;
          return {
            ...prev,
            images: currentList,
            image: currentList[0]
          };
        });
      } else {
        setSareeForm(prev => {
          const currentList = Array.isArray(prev.images) && prev.images.length >= 5 
            ? [...prev.images] 
            : [...DEFAULT_SAREE_IMAGES];
          currentList[slotIdx] = dataUrl;
          return {
            ...prev,
            images: currentList,
            image: currentList[0]
          };
        });
        if (slotIdx === 0) setUploadedPhoto(dataUrl);
      }
      if (onShowToast) {
        onShowToast(`⚡ Photo ${slotIdx + 1} optimized & updated!`);
      }
    } catch (err) {
      console.error(`Photo ${slotIdx + 1} optimization error:`, err);
      alert(`⚠️ Photo Processing Notice (Slot ${slotIdx + 1}):\n${err.message || 'Unable to process image'}\n\nPlease select another photo or export as JPG.`);
    }
  };

  const handlePresetSelectForSlot = (slotIdx, presetPath, isEdit = false) => {
    if (isEdit) {
      setEditSareeForm(prev => {
        const currentList = Array.isArray(prev.images) && prev.images.length >= 4 
          ? [...prev.images] 
          : [...DEFAULT_SAREE_IMAGES];
        currentList[slotIdx] = presetPath;
        return {
          ...prev,
          images: currentList,
          image: currentList[0]
        };
      });
    } else {
      setSareeForm(prev => {
        const currentList = Array.isArray(prev.images) && prev.images.length >= 4 
          ? [...prev.images] 
          : [...DEFAULT_SAREE_IMAGES];
        currentList[slotIdx] = presetPath;
        return {
          ...prev,
          images: currentList,
          image: currentList[0]
        };
      });
      if (slotIdx === 0) setUploadedPhoto(null);
    }
  };

  const handleLoadAllPresets = (presetType = 'crimson', isEdit = false) => {
    const mainImg = presetType === 'ruby' 
      ? '/assets/images/saree_ratanchowk.jpg'
      : presetType === 'emerald'
      ? '/assets/images/saree_emerald_chhabdi.jpg'
      : presetType === 'blue'
      ? '/assets/images/saree_royal_blue.jpg'
      : '/assets/images/saree_nari_kunjar.jpg';

    const presetImages = [
      mainImg,
      '/assets/images/patola_pallu.jpg',
      '/assets/images/patola_macro.jpg',
      '/assets/images/patola_drape.jpg'
    ];

    if (isEdit) {
      setEditSareeForm(prev => ({
        ...prev,
        images: presetImages,
        image: presetImages[0]
      }));
    } else {
      setSareeForm(prev => ({
        ...prev,
        images: presetImages,
        image: presetImages[0]
      }));
      setUploadedPhoto(null);
    }
    if (onShowToast) {
      onShowToast(`✦ Loaded 4 Royal Heritage Presets for ${presetType.toUpperCase()}`);
    }
  };

  const handleUploadSareeSubmit = async (e) => {
    e.preventDefault();
    if (!sareeForm.title.trim()) {
      alert('Please enter a Saree Title');
      return;
    }
    const discountNum = Number(sareeForm.discountPercent) || 0;

    const priceNum = parseFloat(sareeForm.basePriceINR);
    if (!priceNum || priceNum <= 0) {
      alert('Please enter a valid price in Indian Rupees (₹)');
      return;
    }

    setSavingSaree(true);
    const newId = 'patola-' + Date.now();
    const parsedStock = parseInt(sareeForm.stockQuantity, 10);
    const initialStock = isNaN(parsedStock) ? 50 : Math.max(0, parsedStock);
    const isOutOfStock = initialStock <= 0;
    const stockStatus = isOutOfStock ? 'Out of Stock (Loom Order Only)' : 'In Stock';

    const sareeImages = Array.isArray(sareeForm.images) && sareeForm.images.length >= 5
      ? sareeForm.images
      : [
          sareeForm.image || DEFAULT_SAREE_IMAGES[0],
          sareeForm.images?.[1] || DEFAULT_SAREE_IMAGES[1],
          sareeForm.images?.[2] || DEFAULT_SAREE_IMAGES[2],
          sareeForm.images?.[3] || DEFAULT_SAREE_IMAGES[3],
          sareeForm.images?.[4] || DEFAULT_SAREE_IMAGES[4]
        ];

    const payload = {
      id: newId,
      title: sareeForm.title.trim(),
      basePriceINR: priceNum,
      discountPercent: discountNum,
      finalPriceINR: discountNum > 0 ? Math.round(priceNum - (priceNum * discountNum / 100)) : priceNum,
      stockQuantity: initialStock,
      isOutOfStock: isOutOfStock,
      stockStatus: stockStatus,
      weave: sareeForm.weave,
      category: sareeForm.category,
      motif: sareeForm.motif,
      motifName: sareeForm.motifName,
      timeToWeave: sareeForm.timeToWeave,
      fabric: sareeForm.fabric,
      badge: sareeForm.badge,
      description: sareeForm.description.trim() || `Authentic handwoven ${sareeForm.weave} featuring sacred ${sareeForm.motifName} geometry.`,
      image: sareeImages[0] || DEFAULT_SAREE_IMAGES[0],
      images: sareeImages,
      imagesJson: JSON.stringify(sareeImages),
      length: formatSareeLength(sareeForm.length),
      weight: 'Approx. 850 grams',
      colors: sareeForm.colors || 'Deep Crimson Red, Mustard & Golden Zari',
      certification: 'Silk Mark Certified Handloom'
    };

    let created = null;
    try {
      created = await ApiService.createSaree(payload);
    } catch (err) {
      console.error('API Saree create failed:', err);
      alert(`⚠️ Saree save nahi ho saki (Database Save Failed):\n${err.message || 'Server connection error'}\n\nPlease verify connection and try again.`);
      setSavingSaree(false);
      return;
    }

    const finalItem = created && created.id ? { ...payload, ...created } : payload;
    setSarees(prev => [finalItem, ...prev.filter(s => s.id !== finalItem.id)]);

    if (onSareeAdded) {
      onSareeAdded(finalItem);
    }
    await loadSarees();

    setSavingSaree(false);
    // Reset form
    setSareeForm({
      title: '',
      basePriceINR: '',
        discountPercent: '0',
      stockQuantity: '50',
      weave: 'Double Ikat Handloom',
      category: 'double-ikat',
      motif: 'nari-kunjar',
      motifName: 'Nari Kunjar (Elephant & Dancing Maiden)',
      timeToWeave: '9 Months Handcrafted',
      fabric: '100% Pure Mulberry Silk & Natural Dyes',
      badge: 'Masterpiece Double Ikat',
      description: '',
      length: '6.30 Meters (Includes Blouse Piece)',
      image: DEFAULT_SAREE_IMAGES[0],
      images: [...DEFAULT_SAREE_IMAGES]
    });
    setUploadedPhoto(null);

    const usdPrice = Math.round(priceNum * 0.012);
    const eurPrice = Math.round(priceNum * 0.011);
    if (onShowToast) {
      onShowToast(`✨ New Saree "${payload.title}" published with 4 Photos & ${initialStock} in Vault! Auto Prices: ₹${priceNum.toLocaleString('en-IN')} | $${usdPrice.toLocaleString()} | €${eurPrice.toLocaleString()}`);
    }
    setActiveTab('inventory');
  };

  const handleDeleteSaree = async (saree) => {
    const ok = window.confirm(`Are you sure you want to permanently delete "${saree.title}" from your store catalog?`);
    if (!ok) return;

    setDeletingSareeId(saree.id);
    try {
      // 1. Instantly update local state
      setSarees(prev => prev.filter(s => s.id !== saree.id));

      // 2. Persist deleted saree id in local storage and remove any heavy cached photo
      try {
        const deletedIds = JSON.parse(localStorage.getItem('patola_deleted_saree_ids') || '[]');
        if (!deletedIds.includes(saree.id)) {
          deletedIds.push(saree.id);
          localStorage.setItem('patola_deleted_saree_ids', JSON.stringify(deletedIds));
        }
        const editedMap = JSON.parse(localStorage.getItem('patola_edited_sarees') || '{}');
        if (editedMap[saree.id]) {
          delete editedMap[saree.id];
          localStorage.setItem('patola_edited_sarees', JSON.stringify(editedMap));
        }
      } catch (e) {}

      // 3. Notify parent app
      if (onSareeDeleted) {
        onSareeDeleted(saree.id);
      }

      // 4. Delete on backend API
      try {
        await ApiService.deleteSaree(saree.id);
      } catch (apiErr) {
        console.warn('API Saree delete warning:', apiErr);
      }

      if (onShowToast) {
        onShowToast(`🗑️ Saree "${saree.title}" was deleted successfully.`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete saree');
    } finally {
      setDeletingSareeId(null);
    }
  };

  const handleStartEditSaree = (saree) => {
    setEditingSaree(saree);
    const existingImages = Array.isArray(saree.images) && saree.images.length >= 5
      ? saree.images
      : [
          saree.image || DEFAULT_SAREE_IMAGES[0],
          saree.images?.[1] || DEFAULT_SAREE_IMAGES[1],
          saree.images?.[2] || DEFAULT_SAREE_IMAGES[2],
          saree.images?.[3] || DEFAULT_SAREE_IMAGES[3],
          saree.images?.[4] || DEFAULT_SAREE_IMAGES[4]
        ];

    const parsedSareeLen = parseLengthValue(saree.length || '6.30 Meters (Includes Blouse Piece)', '6.30');
    setEditSareeForm({
      id: saree.id,
      title: saree.title || '',
      basePriceINR: saree.basePriceINR || '',
      discountPercent: saree.discountPercent !== undefined ? String(saree.discountPercent) : '0',
      finalPriceINR: saree.finalPriceINR || saree.basePriceINR || '',
      stockQuantity: typeof saree.stockQuantity === 'number' ? saree.stockQuantity : 50,
      weave: saree.weave || 'Double Ikat Handloom',
      category: saree.category || 'double-ikat',
      motif: saree.motif || 'nari-kunjar',
      motifName: saree.motifName || '',
      timeToWeave: saree.timeToWeave || '9 Months Handcrafted',
      fabric: saree.fabric || '100% Pure Mulberry Silk & Natural Dyes',
      badge: saree.badge || 'Masterpiece Double Ikat',
      description: saree.description || '',
      image: existingImages[0],
      images: existingImages,
      length: saree.length || '6.30 Meters (Includes Blouse Piece)',
      lengthNumber: parsedSareeLen.number,
      lengthUnit: parsedSareeLen.unit,
      weight: saree.weight || 'Approx. 850 grams',
      colors: saree.colors || '',
      certification: saree.certification || 'Silk Mark Certified Handloom'
    });

    // Redirect page to the Update Saree Form tab!
    setActiveTab('upload');

    if (onShowToast) {
      onShowToast(`👉 Redirected to Update Form for "${saree.title}" (4 Photos Loaded)`);
    }

    setTimeout(() => {
      const container = document.querySelector('.admin-modal-container');
      if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  const handleEditImageUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const compressed = await compressImageFile(file);
      if (!compressed) return;
      setEditSareeForm(prev => {
        const currentList = Array.isArray(prev.images) && prev.images.length >= 4 
          ? [...prev.images] 
          : [...DEFAULT_SAREE_IMAGES];
        currentList[0] = compressed;
        return { ...prev, image: compressed, images: currentList };
      });
      if (onShowToast) {
        onShowToast('⚡ High-Definition Photo optimized & loaded with zero lag!');
      }
    }
  };

  const handleSaveEditSareeSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editSareeForm || !editSareeForm.title.trim()) {
      alert('Please enter a Saree Title');
      return;
    }
    const priceNum = parseFloat(editSareeForm.basePriceINR);
    if (!priceNum || priceNum <= 0) {
      alert('Please enter a valid price in Indian Rupees (₹)');
      return;
    }

    setSavingEditSaree(true);
    const discountNum = Number(editSareeForm.discountPercent) || 0;
    const finalPrice = discountNum > 0 ? Math.round(priceNum - (priceNum * discountNum / 100)) : priceNum;

    const parsedStock = parseInt(editSareeForm.stockQuantity, 10);
    const updatedStock = isNaN(parsedStock) ? 50 : Math.max(0, parsedStock);
    const isOutOfStock = updatedStock <= 0;
    const stockStatus = isOutOfStock ? 'Out of Stock (Loom Order Only)' : 'In Stock';

    const updatedImages = Array.isArray(editSareeForm.images) && editSareeForm.images.length >= 5
      ? editSareeForm.images
      : [
          editSareeForm.image || DEFAULT_SAREE_IMAGES[0],
          editSareeForm.images?.[1] || DEFAULT_SAREE_IMAGES[1],
          editSareeForm.images?.[2] || DEFAULT_SAREE_IMAGES[2],
          editSareeForm.images?.[3] || DEFAULT_SAREE_IMAGES[3],
          editSareeForm.images?.[4] || DEFAULT_SAREE_IMAGES[4]
        ];

    const updatedPayload = {
      ...editSareeForm,
      title: editSareeForm.title.trim(),
      basePriceINR: priceNum,
      discountPercent: discountNum,
      finalPriceINR: finalPrice,
      stockQuantity: updatedStock,
      isOutOfStock,
      stockStatus,
      length: formatSareeLength(editSareeForm.length),
      image: updatedImages[0],
      images: updatedImages,
      imagesJson: JSON.stringify(updatedImages)
    };

    // 1. Update in-memory sarees list
    setSarees(prev => prev.map(s => s.id === updatedPayload.id ? { ...s, ...updatedPayload } : s));

    // 2. Persist in localStorage patola_edited_sarees
    try {
      const editedMap = JSON.parse(localStorage.getItem('patola_edited_sarees') || '{}');
      editedMap[updatedPayload.id] = updatedPayload;
      localStorage.setItem('patola_edited_sarees', JSON.stringify(editedMap));
    } catch (err) {}

    // 3. Notify parent app
    if (onSareeUpdated) {
      onSareeUpdated(updatedPayload);
    }

    // 4. Update backend API
    try {
      await ApiService.updateSaree(updatedPayload.id, updatedPayload);
    } catch (err) {
      console.error('Backend update saree API error:', err);
      alert(`⚠️ Saree updates save nahi ho sake (Database Update Failed):\n${err.message || 'Server connection error'}\n\nPlease check connection and try again.`);
      setSavingEditSaree(false);
      return;
    }

    const savedId = updatedPayload.id;
    setSavingEditSaree(false);
    setEditingSaree(null);
    setEditSareeForm(null);

    // 5. Redirect back to Inventory tab!
    setActiveTab('inventory');

    if (onShowToast) {
      onShowToast(`✅ Saree "${updatedPayload.title}" updated successfully!`);
    }

    // 6. Scroll smoothly to updated saree in inventory
    setTimeout(() => {
      const targetCard = document.getElementById(`admin-saree-${savedId}`);
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCard.style.outline = '3px solid #d4af37';
        targetCard.style.transition = 'outline 0.3s ease';
        setTimeout(() => {
          if (targetCard) targetCard.style.outline = 'none';
        }, 3000);
      }
    }, 200);
  };

  const handleUpdateStockQuantity = async (saree, newQty) => {
    const qty = Math.max(0, parseInt(newQty, 10) || 0);
    const newIsOutOfStock = qty <= 0;
    const newStatus = newIsOutOfStock ? 'Out of Stock (Loom Order Only)' : 'In Stock';
    setTogglingStockId(saree.id);
    try {
      await ApiService.updateSareeStock(saree.id, newIsOutOfStock, newStatus, qty);
      setSarees(prev => prev.map(s => s.id === saree.id ? { ...s, stockQuantity: qty, isOutOfStock: newIsOutOfStock, stockStatus: newStatus } : s));
      if (onStockUpdated) {
        onStockUpdated(saree.id, newIsOutOfStock, newStatus, qty);
      }
      if (onShowToast) {
        onShowToast(`📦 "${saree.title}" vault stock set to ${qty} sarees (${newIsOutOfStock ? '🔴 Out of Stock' : '🟢 In Stock'})`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update stock quantity');
    } finally {
      setTogglingStockId(null);
    }
  };

  const handleUpdateDiscount = async (item, newDiscountPercent) => {
    const dNum = Math.max(0, Math.min(100, Number(newDiscountPercent) || 0));
    const baseP = Number(item.basePriceINR) || 0;
    const finalP = dNum > 0 ? Math.round(baseP - (baseP * dNum / 100)) : baseP;
    const updated = {
      ...item,
      discountPercent: dNum,
      finalPriceINR: finalP
    };
    setSarees(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
    try {
      const editedMap = JSON.parse(localStorage.getItem('patola_edited_sarees') || '{}');
      editedMap[updated.id] = updated;
      localStorage.setItem('patola_edited_sarees', JSON.stringify(editedMap));
    } catch (e) {}
    if (onSareeUpdated) onSareeUpdated(updated);
    try {
      await ApiService.updateSaree(updated.id, updated);
    } catch (err) {
      console.warn('Backend update discount API error:', err);
    }
    if (onShowToast) {
      onShowToast(`🏷️ "${item.title}" discount set to ${dNum}% OFF! (Discount Price: ₹${finalP.toLocaleString('en-IN')})`);
    }
  };

  const handleToggleStock = async (saree) => {
    const newIsOutOfStock = !saree.isOutOfStock;
    const newStatus = newIsOutOfStock ? 'Out of Stock (Loom Order Only)' : 'In Stock';
    const currentQty = typeof saree.stockQuantity === 'number' ? saree.stockQuantity : 50;
    const newQty = newIsOutOfStock ? 0 : (currentQty > 0 ? currentQty : 50);
    setTogglingStockId(saree.id);
    try {
      await ApiService.updateSareeStock(saree.id, newIsOutOfStock, newStatus, newQty);
      setSarees(prev => prev.map(s => s.id === saree.id ? { ...s, isOutOfStock: newIsOutOfStock, stockStatus: newStatus, stockQuantity: newQty } : s));
      if (onStockUpdated) {
        onStockUpdated(saree.id, newIsOutOfStock, newStatus, newQty);
      }
      if (onShowToast) {
        onShowToast(`📦 "${saree.title}" is now marked ${newIsOutOfStock ? '🔴 Out of Stock (0 remaining)' : `🟢 In Stock (${newQty} pieces in vault)`}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update stock status');
    } finally {
      setTogglingStockId(null);
    }
  };

  /* ========================================================================
   * DUPATTA INVENTORY & UPLOAD HANDLERS
   * ======================================================================== */
  const handleUpdateDupattaStockQuantity = async (dupatta, newQty) => {
    const qty = Math.max(0, parseInt(newQty, 10) || 0);
    const newIsOutOfStock = qty <= 0;
    const newStatus = newIsOutOfStock ? 'Out of Stock (Loom Order Only)' : 'In Stock';
    setTogglingStockId(dupatta.id);
    try {
      await ApiService.updateSareeStock(dupatta.id, newIsOutOfStock, newStatus, qty);
      setSarees(prev => prev.map(s => s.id === dupatta.id ? { ...s, stockQuantity: qty, isOutOfStock: newIsOutOfStock, stockStatus: newStatus } : s));
      if (onStockUpdated) {
        onStockUpdated(dupatta.id, newIsOutOfStock, newStatus, qty);
      }
      if (onShowToast) {
        onShowToast(`🧣 "${dupatta.title}" vault stock set to ${qty} pieces (${newIsOutOfStock ? '🔴 Out of Stock' : '🟢 In Stock'})`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update dupatta stock quantity');
    } finally {
      setTogglingStockId(null);
    }
  };

  const handleToggleDupattaStock = async (dupatta) => {
    const newIsOutOfStock = !dupatta.isOutOfStock;
    const newStatus = newIsOutOfStock ? 'Out of Stock (Loom Order Only)' : 'In Stock';
    const currentQty = typeof dupatta.stockQuantity === 'number' ? dupatta.stockQuantity : 50;
    const newQty = newIsOutOfStock ? 0 : (currentQty > 0 ? currentQty : 50);
    setTogglingStockId(dupatta.id);
    try {
      await ApiService.updateSareeStock(dupatta.id, newIsOutOfStock, newStatus, newQty);
      setSarees(prev => prev.map(s => s.id === dupatta.id ? { ...s, isOutOfStock: newIsOutOfStock, stockStatus: newStatus, stockQuantity: newQty } : s));
      if (onStockUpdated) {
        onStockUpdated(dupatta.id, newIsOutOfStock, newStatus, newQty);
      }
      if (onShowToast) {
        onShowToast(`🧣 "${dupatta.title}" is now marked ${newIsOutOfStock ? '🔴 Out of Stock (0 remaining)' : `🟢 In Stock (${newQty} pieces in vault)`}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update stock status');
    } finally {
      setTogglingStockId(null);
    }
  };

  const handleDeleteDupatta = async (dupatta) => {
    const ok = window.confirm(`Are you sure you want to permanently delete Dupatta "${dupatta.title}" from your store catalog?`);
    if (!ok) return;

    setDeletingSareeId(dupatta.id);
    try {
      setSarees(prev => prev.filter(s => s.id !== dupatta.id));
      try {
        const deletedIds = JSON.parse(localStorage.getItem('patola_deleted_saree_ids') || '[]');
        if (!deletedIds.includes(dupatta.id)) {
          deletedIds.push(dupatta.id);
          localStorage.setItem('patola_deleted_saree_ids', JSON.stringify(deletedIds));
        }
        const editedMap = JSON.parse(localStorage.getItem('patola_edited_sarees') || '{}');
        if (editedMap[dupatta.id]) {
          delete editedMap[dupatta.id];
          localStorage.setItem('patola_edited_sarees', JSON.stringify(editedMap));
        }
      } catch (e) {}

      if (onSareeDeleted) {
        onSareeDeleted(dupatta.id);
      }

      try {
        await ApiService.deleteSaree(dupatta.id);
      } catch (apiErr) {
        console.warn('API Dupatta delete warning:', apiErr);
      }

      if (onShowToast) {
        onShowToast(`🗑️ Dupatta "${dupatta.title}" was deleted successfully.`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete dupatta');
    } finally {
      setDeletingSareeId(null);
    }
  };

  const handleStartEditDupatta = (dupatta) => {
    setEditingDupatta(dupatta);
    const existingImages = Array.isArray(dupatta.images) && dupatta.images.length >= 5
      ? dupatta.images
      : [
          dupatta.image || DEFAULT_SAREE_IMAGES[0],
          dupatta.images?.[1] || DEFAULT_SAREE_IMAGES[1],
          dupatta.images?.[2] || DEFAULT_SAREE_IMAGES[2],
          dupatta.images?.[3] || DEFAULT_SAREE_IMAGES[3],
          dupatta.images?.[4] || DEFAULT_SAREE_IMAGES[4]
        ];

    const parsedDupLen = parseLengthValue(dupatta.length || '2.50 Meters (Handloom Silk with Zari Pallu)', '2.50');
    setEditDupattaForm({
      id: dupatta.id,
      title: dupatta.title || '',
      basePriceINR: dupatta.basePriceINR || '',
      discountPercent: dupatta.discountPercent !== undefined ? String(dupatta.discountPercent) : '0',
      finalPriceINR: dupatta.finalPriceINR || dupatta.basePriceINR || '',
      stockQuantity: typeof dupatta.stockQuantity === 'number' ? dupatta.stockQuantity : 50,
      weave: dupatta.weave || 'Double Ikat Handloom Dupatta',
      category: dupatta.category || 'double-dupatta',
      motif: dupatta.motif || 'nari-kunjar',
      motifName: dupatta.motifName || '',
      timeToWeave: dupatta.timeToWeave || '3 to 5 Months Handcrafted',
      fabric: dupatta.fabric || '100% Pure Mulberry Silk & Natural Dyes',
      badge: dupatta.badge || 'Double Ikat Dupatta',
      description: dupatta.description || '',
      image: existingImages[0],
      images: existingImages,
      length: dupatta.length || '2.50 Meters (Handloom Silk with Zari Pallu)',
      lengthNumber: parsedDupLen.number,
      lengthUnit: parsedDupLen.unit,
      weight: dupatta.weight || 'Approx. 350 grams',
      colors: dupatta.colors || '',
      certification: dupatta.certification || 'Silk Mark Certified Handloom'
    });

    setActiveTab('upload-dupatta');

    if (onShowToast) {
      onShowToast(`👉 Redirected to Update Form for Dupatta "${dupatta.title}"`);
    }

    setTimeout(() => {
      const container = document.querySelector('.admin-modal-container');
      if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  const handleSaveEditDupattaSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editDupattaForm || !editDupattaForm.title.trim()) {
      alert('Please enter a Dupatta Title');
      return;
    }
    const priceNum = parseFloat(editDupattaForm.basePriceINR);
    if (!priceNum || priceNum <= 0) {
      alert('Please enter a valid price in Indian Rupees (₹)');
      return;
    }

    setSavingEditDupatta(true);
    const discountNum = Number(editDupattaForm.discountPercent) || 0;
    const finalPrice = discountNum > 0 ? Math.round(priceNum - (priceNum * discountNum / 100)) : priceNum;

    const parsedStock = parseInt(editDupattaForm.stockQuantity, 10);
    const updatedStock = isNaN(parsedStock) ? 50 : Math.max(0, parsedStock);
    const isOutOfStock = updatedStock <= 0;
    const stockStatus = isOutOfStock ? 'Out of Stock (Loom Order Only)' : 'In Stock';

    const updatedImages = Array.isArray(editDupattaForm.images) && editDupattaForm.images.length >= 5
      ? editDupattaForm.images
      : [
          editDupattaForm.image || DEFAULT_SAREE_IMAGES[0],
          editDupattaForm.images?.[1] || DEFAULT_SAREE_IMAGES[1],
          editDupattaForm.images?.[2] || DEFAULT_SAREE_IMAGES[2],
          editDupattaForm.images?.[3] || DEFAULT_SAREE_IMAGES[3],
          editDupattaForm.images?.[4] || DEFAULT_SAREE_IMAGES[4]
        ];

    const updatedPayload = {
      ...editDupattaForm,
      title: editDupattaForm.title.trim(),
      basePriceINR: priceNum,
      discountPercent: discountNum,
      finalPriceINR: finalPrice,
      stockQuantity: updatedStock,
      isOutOfStock,
      stockStatus,
      length: formatDupattaLength(editDupattaForm.length),
      image: updatedImages[0],
      images: updatedImages,
      imagesJson: JSON.stringify(updatedImages)
    };

    setSarees(prev => prev.map(s => s.id === updatedPayload.id ? { ...s, ...updatedPayload } : s));

    try {
      const editedMap = JSON.parse(localStorage.getItem('patola_edited_sarees') || '{}');
      editedMap[updatedPayload.id] = updatedPayload;
      localStorage.setItem('patola_edited_sarees', JSON.stringify(editedMap));
    } catch (err) {}

    if (onSareeUpdated) {
      onSareeUpdated(updatedPayload);
    }

    try {
      await ApiService.updateSaree(updatedPayload.id, updatedPayload);
    } catch (err) {
      console.error('Backend update dupatta API error:', err);
      alert(`⚠️ Dupatta updates save nahi ho sake (Database Update Failed):\n${err.message || 'Server connection error'}\n\nPlease check connection and try again.`);
      setSavingEditDupatta(false);
      return;
    }

    const savedId = updatedPayload.id;
    setSavingEditDupatta(false);
    setEditingDupatta(null);
    setEditDupattaForm(null);

    setActiveTab('dupatta-inventory');

    if (onShowToast) {
      onShowToast(`✅ Dupatta "${updatedPayload.title}" updated successfully!`);
    }

    setTimeout(() => {
      const targetCard = document.getElementById(`admin-dupatta-${savedId}`);
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCard.style.outline = '3px solid #d4af37';
        targetCard.style.transition = 'outline 0.3s ease';
        setTimeout(() => {
          if (targetCard) targetCard.style.outline = 'none';
        }, 3000);
      }
    }, 200);
  };

  const handleUploadDupattaSubmit = async (e) => {
    e.preventDefault();
    if (!dupattaForm.title.trim()) {
      alert('Please enter a Dupatta Title');
      return;
    }
    const discountNum = Number(dupattaForm.discountPercent) || 0;
    const priceNum = parseFloat(dupattaForm.basePriceINR);
    if (!priceNum || priceNum <= 0) {
      alert('Please enter a valid price in Indian Rupees (₹)');
      return;
    }

    setSavingDupatta(true);
    const newId = 'dupatta-' + Date.now();
    const parsedStock = parseInt(dupattaForm.stockQuantity, 10);
    const initialStock = isNaN(parsedStock) ? 50 : Math.max(0, parsedStock);
    const isOutOfStock = initialStock <= 0;
    const stockStatus = isOutOfStock ? 'Out of Stock (Loom Order Only)' : 'In Stock';

    const dupattaImages = Array.isArray(dupattaForm.images) && dupattaForm.images.length >= 5
      ? dupattaForm.images
      : [
          dupattaForm.image || DEFAULT_SAREE_IMAGES[0],
          dupattaForm.images?.[1] || DEFAULT_SAREE_IMAGES[1],
          dupattaForm.images?.[2] || DEFAULT_SAREE_IMAGES[2],
          dupattaForm.images?.[3] || DEFAULT_SAREE_IMAGES[3],
          dupattaForm.images?.[4] || DEFAULT_SAREE_IMAGES[4]
        ];

    const payload = {
      id: newId,
      title: dupattaForm.title.trim(),
      basePriceINR: priceNum,
      discountPercent: discountNum,
      finalPriceINR: discountNum > 0 ? Math.round(priceNum - (priceNum * discountNum / 100)) : priceNum,
      stockQuantity: initialStock,
      isOutOfStock: isOutOfStock,
      stockStatus: stockStatus,
      weave: dupattaForm.weave,
      category: dupattaForm.category,
      motif: dupattaForm.motif,
      motifName: dupattaForm.motifName,
      timeToWeave: dupattaForm.timeToWeave,
      fabric: dupattaForm.fabric,
      badge: dupattaForm.badge || 'Double Ikat Dupatta',
      description: dupattaForm.description.trim() || `Authentic handwoven ${dupattaForm.weave} featuring sacred ${dupattaForm.motifName} geometry. (Length: 2.50 Meters).`,
      image: dupattaImages[0] || DEFAULT_SAREE_IMAGES[0],
      images: dupattaImages,
      imagesJson: JSON.stringify(dupattaImages),
      length: formatDupattaLength(dupattaForm.length),
      weight: 'Approx. 350 grams',
      certification: 'Silk Mark Certified Handloom'
    };

    let created = null;
    try {
      created = await ApiService.createSaree(payload);
    } catch (err) {
      console.error('API Dupatta create failed:', err);
      alert(`⚠️ Dupatta save nahi ho saka (Database Save Failed):\n${err.message || 'Server connection error'}\n\nPlease verify connection and try again.`);
      setSavingDupatta(false);
      return;
    }

    const finalItem = created && created.id ? { ...payload, ...created } : payload;
    setSarees(prev => [finalItem, ...prev.filter(s => s.id !== finalItem.id)]);

    if (onSareeAdded) {
      onSareeAdded(finalItem);
    }
    await loadSarees();

    setSavingDupatta(false);
    setDupattaForm({
      title: '',
      basePriceINR: '',
      discountPercent: '0',
      stockQuantity: '50',
      weave: 'Double Ikat Handloom Dupatta',
      category: 'double-dupatta',
      motif: 'nari-kunjar',
      motifName: 'Nari Kunjar (Elephant & Dancing Maiden)',
      timeToWeave: '3 to 5 Months Handcrafted',
      fabric: '100% Pure Mulberry Silk & Natural Dyes',
      length: '2.50 Meters (Handloom Silk with Zari Pallu)',
      badge: 'Double Ikat Dupatta',
      description: '',
      image: DEFAULT_SAREE_IMAGES[0],
      images: [...DEFAULT_SAREE_IMAGES]
    });
    setUploadedDupattaPhoto(null);

    const usdPrice = Math.round(priceNum * 0.012);
    const eurPrice = Math.round(priceNum * 0.011);
    if (onShowToast) {
      onShowToast(`✨ New Dupatta "${payload.title}" published with 4 Photos & ${initialStock} in Vault! Auto Prices: ₹${priceNum.toLocaleString('en-IN')} | $${usdPrice.toLocaleString()} | €${eurPrice.toLocaleString()}`);
    }
    setActiveTab('dupatta-inventory');
  };

  const handleSingleSlotDupattaPhotoUpload = async (slotIdx, e, isEdit = false) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (onShowToast) onShowToast(`⏳ Optimizing Dupatta Photo ${slotIdx + 1} (iPhone/HD)...`);
      try {
        const base64Img = await compressImageFile(file);
        if (!base64Img) return;
        if (isEdit) {
          setEditDupattaForm(prev => {
            const currentList = Array.isArray(prev.images) && prev.images.length >= 4 
              ? [...prev.images] 
              : [...DEFAULT_SAREE_IMAGES];
            currentList[slotIdx] = base64Img;
            return {
              ...prev,
              images: currentList,
              image: currentList[0]
            };
          });
        } else {
          setDupattaForm(prev => {
            const currentList = Array.isArray(prev.images) && prev.images.length >= 4 
              ? [...prev.images] 
              : [...DEFAULT_SAREE_IMAGES];
            currentList[slotIdx] = base64Img;
            return {
              ...prev,
              images: currentList,
              image: currentList[0]
            };
          });
          if (slotIdx === 0) setUploadedDupattaPhoto(base64Img);
        }
        if (onShowToast) {
          onShowToast(`📸 Photo ${slotIdx + 1} for Dupatta optimized & updated!`);
        }
      } catch (err) {
        console.error(`Dupatta photo ${slotIdx + 1} error:`, err);
        alert(`⚠️ Photo Processing Notice (Slot ${slotIdx + 1}):\n${err.message || 'Unable to process image'}\n\nPlease select another photo or export as JPG.`);
      }
    }
  };

  const handleBulkDupattaPhotosUpload = async (e, isEdit = false) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    if (onShowToast) {
      onShowToast(`⏳ Optimizing ${files.length} Dupatta photos for lightning-fast loading...`);
    }

    try {
      const filesToRead = files.slice(0, 4);
      const promises = filesToRead.map(f => compressImageFile(f));
      const newPhotos = await Promise.all(promises);

      if (isEdit) {
        setEditDupattaForm(prev => {
          const currentList = Array.isArray(prev.images) && prev.images.length >= 4 
            ? [...prev.images] 
            : [...DEFAULT_SAREE_IMAGES];
          newPhotos.forEach((img, i) => {
            if (img) currentList[i] = img;
          });
          return {
            ...prev,
            images: currentList,
            image: currentList[0]
          };
        });
      } else {
        setDupattaForm(prev => {
          const currentList = Array.isArray(prev.images) && prev.images.length >= 4 
            ? [...prev.images] 
            : [...DEFAULT_SAREE_IMAGES];
          newPhotos.forEach((img, i) => {
            if (img) currentList[i] = img;
          });
          return {
            ...prev,
            images: currentList,
            image: currentList[0]
          };
        });
        if (newPhotos[0]) setUploadedDupattaPhoto(newPhotos[0]);
      }
      if (onShowToast) {
        onShowToast(`📸 ${newPhotos.length} HD Dupatta photos compressed & loaded with zero lag!`);
      }
    } catch (err) {
      console.error('Bulk Dupatta photo optimization error:', err);
      alert(`⚠️ Photo Processing Notice:\n${err.message || 'Unable to process images'}\n\nPlease ensure photos are valid JPG, PNG, or standard iPhone images.`);
    }
  };

  const handleLoadAllDupattaPresets = (presetType = 'crimson', isEdit = false) => {
    const mainImg = presetType === 'ruby' 
      ? '/assets/images/saree_ratanchowk.jpg'
      : presetType === 'emerald'
      ? '/assets/images/saree_emerald_chhabdi.jpg'
      : presetType === 'blue'
      ? '/assets/images/saree_royal_blue.jpg'
      : '/assets/images/saree_nari_kunjar.jpg';

    const presetImages = [
      mainImg,
      '/assets/images/patola_pallu.jpg',
      '/assets/images/patola_macro.jpg',
      '/assets/images/patola_drape.jpg'
    ];

    if (isEdit) {
      setEditDupattaForm(prev => ({
        ...prev,
        images: presetImages,
        image: presetImages[0]
      }));
    } else {
      setDupattaForm(prev => ({
        ...prev,
        images: presetImages,
        image: presetImages[0]
      }));
      setUploadedDupattaPhoto(null);
    }
    if (onShowToast) {
      onShowToast(`✦ Loaded 4 Royal Heritage Presets for ${presetType.toUpperCase()} Dupatta`);
    }
  };

  const getCancellationInfo = (ref) => {
    if (!ref) return null;
    try {
      const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
      return cancellations[ref] || null;
    } catch (e) {
      return null;
    }
  };

  const isOrderCancelled = (o) => {
    if (!o || !o.orderReference) return false;
    if (o.isDeletedRecord) return false;
    if (o.isCancelled) return true;
    const ref = o.orderReference;
    try {
      const cancelledList = JSON.parse(localStorage.getItem('patola_cancelled_orders') || '[]');
      if (cancelledList.includes(ref)) return true;
      const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
      if (overrides[ref] === 0) return true;
    } catch (e) {}
    const status = (o.orderStatus || '').toLowerCase();
    return o.currentStage === 0 || status.includes('cancelled') || status.includes('canceled');
  };

  // Helper to check if an order is completed/delivered or hidden
  const isOrderCompleted = (o) => {
    if (!o || !o.orderReference) return false;
    if (o.isDeletedRecord) return false;
    if (isOrderCancelled(o)) return false;
    let stage = o.currentStage;
    try {
      const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
      if (overrides[o.orderReference] !== undefined) stage = overrides[o.orderReference];
    } catch (e) {}
    if (stage === undefined || stage === null) stage = 1;
    const status = (o.orderStatus || '').toLowerCase();
    const isHidden = hiddenOrderRefs.includes(o.orderReference);
    return stage >= 5 || status.includes('stage 5') || status.includes('delivered') || status.includes('handover completed') || isHidden;
  };

  const isOrderActive = (o) => {
    if (!o || !o.orderReference || o.isDeletedRecord) return false;
    return !isOrderCancelled(o) && !isOrderCompleted(o);
  };

  // Separate Saree Orders vs Dupatta Orders (for metrics & quick filtering)
  const sareeOrders = useMemo(() => orders.filter(o => isSareeOrder(o)), [orders]);
  const dupattaOrders = useMemo(() => orders.filter(o => isDupattaOrder(o)), [orders]);

  // Helper: check if an order/booking was created within the last 24 hours
  const isOrderWithin24h = (dateStr) => {
    if (!dateStr) return false;
    const created = new Date(dateStr).getTime();
    if (isNaN(created)) return false;
    const diffMs = Date.now() - created;
    return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
  };

  // Filter Customer Orders (Unified for Sarees & Dupattas) by search, view mode & product type
  // Search results still respect the selected status and product filters.
  const filteredOrders = useMemo(() => {
    const rawQ = searchQuery.toLowerCase().trim();
    const cleanQ = rawQ.replace(/^[#\s]+/, '').trim();
    const digitsQ = rawQ.replace(/\D/g, '');

    const matchesSelectedFilters = (o) => {
      if (!o) return false;
      const isCancelled = isOrderCancelled(o);
      const isCompleted = isOrderCompleted(o);
      const isActive = isOrderActive(o);
      const isToday = isOrderWithin24h(o.createdAt);

      if (orderViewMode === 'today' && !isToday) return false;
      if (orderViewMode === 'active' && !isActive) return false;
      if (orderViewMode === 'completed' && !isCompleted) return false;
      if (orderViewMode === 'cancelled' && !isCancelled) return false;
      if (orderProductFilter === 'saree' && !isSareeOrder(o)) return false;
      if (orderProductFilter === 'dupatta' && !isDupattaOrder(o)) return false;
      return true;
    };

    if (rawQ) {
      const matchesQuery = (o) => {
        if (!o) return false;
        const ref = (o.orderReference || '').toLowerCase();
        const name = (o.customerName || o.fullName || '').toLowerCase();
        const phone = (o.contactPhone || o.phone || '').toLowerCase();
        const cleanPhone = phone.replace(/\D/g, '');
        const city = (o.city || '').toLowerCase();
        const addr = (o.deliveryAddress || o.address || '').toLowerCase();
        const status = (o.orderStatus || '').toLowerCase();
        const hasItem = Array.isArray(o.items) && o.items.some(i => {
          const title = (i.sareeTitle || i.title || i.motifName || '').toLowerCase();
          return title.includes(rawQ) || (cleanQ && title.includes(cleanQ));
        });

        return (
          (ref && (ref.includes(rawQ) || (cleanQ && ref.includes(cleanQ)))) ||
          (name && (name.includes(rawQ) || (cleanQ && name.includes(cleanQ)))) ||
          (phone && phone.includes(rawQ)) ||
          (digitsQ && digitsQ.length >= 3 && cleanPhone.includes(digitsQ)) ||
          (city && city.includes(rawQ)) ||
          (addr && addr.includes(rawQ)) ||
          (status && status.includes(rawQ)) ||
          hasItem
        );
      };

      // 1. Search all live orders (Active, Cancelled, Completed)
      const matchedLive = orders.filter(o => matchesQuery(o) && matchesSelectedFilters(o));

      // 2. Search deleted orders history archive (state + localStorage)
      const liveRefs = new Set(orders.map(o => (o.orderReference || '').toLowerCase()));
      let allDeleted = [...(deletedOrderRecords || [])];
      try {
        const fromLocal = JSON.parse(localStorage.getItem('patola_deleted_order_records') || '[]');
        if (Array.isArray(fromLocal)) {
          for (const item of fromLocal) {
            if (item && item.orderReference && !allDeleted.some(d => d.orderReference === item.orderReference)) {
              allDeleted.push(item);
            }
          }
        }
      } catch (e) {}

      const matchedDeleted = orderViewMode === 'all' ? allDeleted.filter(d => {
        if (!d || !d.orderReference) return false;
        if (liveRefs.has(d.orderReference.toLowerCase())) return false;
        const deletedOrder = {
          ...d,
          isDeletedRecord: true,
          createdAt: d.createdAt || d.originalCreatedAt || d.deletedAt || new Date().toISOString(),
          orderStatus: d.lastOrderStatus ? `Deleted (Was: ${d.lastOrderStatus})` : 'Deleted Order (Archived)'
        };
        return matchesQuery(deletedOrder)
          && (orderProductFilter !== 'saree' || isSareeOrder(deletedOrder))
          && (orderProductFilter !== 'dupatta' || isDupattaOrder(deletedOrder));
      }).map(d => ({
        ...d,
        isDeletedRecord: true,
        createdAt: d.createdAt || d.originalCreatedAt || d.deletedAt || new Date().toISOString(),
        orderStatus: d.lastOrderStatus ? `Deleted (Was: ${d.lastOrderStatus})` : 'Deleted Order (Archived)'
      })) : [];

      return [...matchedLive, ...matchedDeleted];
    }

    return orders.filter(matchesSelectedFilters);
  }, [orders, deletedOrderRecords, searchQuery, orderViewMode, orderProductFilter]);

  // Summary Metrics for All Customer Orders
  const totalRevenue = orders.filter(o => !isOrderCancelled(o)).reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const completedOrdersCount = orders.filter(o => isOrderCompleted(o)).length;
  const activeOrdersCount = orders.filter(o => isOrderActive(o)).length;
  const cancelledOrdersCount = orders.filter(o => isOrderCancelled(o)).length;
  const todayOrdersCount = orders.filter(o => isOrderWithin24h(o.createdAt) && !isOrderCancelled(o)).length;
  const inTransitCount = orders.filter(o => isOrderActive(o) && (o.currentStage === 4 || (o.orderStatus && (o.orderStatus.includes('Stage 4') || o.orderStatus.includes('Transit'))))).length;
  const pendingCount = orders.filter(o => isOrderActive(o) && (!o.currentStage || o.currentStage < 4)).length;

  // Separate Saree Items vs Dupatta Items
  const sareeItems = useMemo(() => sarees.filter(s => !isDupattaItem(s)), [sarees]);
  const dupattaItems = useMemo(() => sarees.filter(s => isDupattaItem(s)), [sarees]);

  // Filter Sarees by search and category
  const filteredSarees = sareeItems.filter(s => {
    const q = sareeSearchQuery.toLowerCase();
    const matchSearch = !q || (
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.weave && s.weave.toLowerCase().includes(q)) ||
      (s.motifName && s.motifName.toLowerCase().includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q))
    );
    const matchCat = sareeCategoryFilter === 'all' || s.category === sareeCategoryFilter;
    return matchSearch && matchCat;
  });
  const inStockCount = sareeItems.filter(s => !s.isOutOfStock).length;
  const outOfStockCount = sareeItems.filter(s => s.isOutOfStock).length;
  const totalVaultPieces = sareeItems.reduce((sum, s) => sum + (s.isOutOfStock ? 0 : (s.stockQuantity ?? 50)), 0);

  // Filter Dupattas by search and category
  const filteredDupattas = dupattaItems.filter(d => {
    const q = dupattaSearchQuery.toLowerCase();
    const matchSearch = !q || (
      (d.title && d.title.toLowerCase().includes(q)) ||
      (d.weave && d.weave.toLowerCase().includes(q)) ||
      (d.motifName && d.motifName.toLowerCase().includes(q)) ||
      (d.category && d.category.toLowerCase().includes(q))
    );
    const matchCat = dupattaCategoryFilter === 'all' || d.category === dupattaCategoryFilter;
    return matchSearch && matchCat;
  });
  const dupattaInStockCount = dupattaItems.filter(d => !d.isOutOfStock).length;
  const dupattaOutOfStockCount = dupattaItems.filter(d => d.isOutOfStock).length;
  const dupattaTotalVaultPieces = dupattaItems.reduce((sum, d) => sum + (d.isOutOfStock ? 0 : (d.stockQuantity ?? 50)), 0);

  // Deleted Orders Filtering & 10-per-page Pagination
  const filteredDeletedOrders = useMemo(() => {
    const q = (deletedSearchQuery || '').toLowerCase().trim();
    if (!q) return deletedOrderRecords;
    return deletedOrderRecords.filter(o => {
      if (!o) return false;
      const ref = (o.orderReference || '').toLowerCase();
      const name = (o.customerName || '').toLowerCase();
      const phone = (o.contactPhone || '').toLowerCase();
      const city = (o.city || '').toLowerCase();
      const addr = (o.deliveryAddress || '').toLowerCase();
      const itemsMatch = Array.isArray(o.items) && o.items.some(i => (i.sareeTitle || i.title || '').toLowerCase().includes(q));
      return ref.includes(q) || name.includes(q) || phone.includes(q) || city.includes(q) || addr.includes(q) || itemsMatch;
    });
  }, [deletedOrderRecords, deletedSearchQuery]);

  const totalDeletedPages = Math.ceil(filteredDeletedOrders.length / DELETED_PER_PAGE) || 1;
  const paginatedDeletedOrders = useMemo(() => {
    const start = (deletedCurrentPage - 1) * DELETED_PER_PAGE;
    return filteredDeletedOrders.slice(start, start + DELETED_PER_PAGE);
  }, [filteredDeletedOrders, deletedCurrentPage]);

  const totalDeletedValue = useMemo(() => {
    return deletedOrderRecords.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  }, [deletedOrderRecords]);

  // Separate Custom Orders from Regular Studio Visits
  const customOrders = bookings.filter(isCustomBooking);
  const visitBookingsList = bookings.filter(b => !isCustomBooking(b));

  // Helpers to detect visit booking statuses cleanly
  const isBookingCancelled = (b) => {
    if (!b) return false;
    const st = (b.status || '').toLowerCase();
    return st.includes('cancel');
  };

  const isBookingCompleted = (b) => {
    if (!b) return false;
    const st = (b.status || '').toLowerCase();
    return st === 'completed';
  };

  const isBookingActive = (b) => {
    if (!b) return false;
    return !isBookingCancelled(b) && !isBookingCompleted(b);
  };

  // Filter Bookings by search, type, status, and view mode (Active, Completed, Cancelled, All)
  const totalAppointmentsCount = visitBookingsList.length;
  const cancelledVisitsCount = visitBookingsList.filter(isBookingCancelled).length;
  const completedVisitsCount = visitBookingsList.filter(isBookingCompleted).length;
  const activeVisitsCount = visitBookingsList.filter(isBookingActive).length;
  const confirmedVisitsCount = visitBookingsList.filter(b => (b.status || '').toLowerCase() === 'confirmed' && !isBookingCancelled(b) && !isBookingCompleted(b)).length;
  const pendingVisitsCount = visitBookingsList.filter(b => (b.status || '').toLowerCase() === 'pending' && !isBookingCancelled(b) && !isBookingCompleted(b)).length;

  const studioVisitCount = visitBookingsList.filter(b => {
    const exp = (b.experienceType || '').toLowerCase();
    return exp.includes('studio') || exp.includes('loom') || exp.includes('visit');
  }).length;

  const videoCallCount = visitBookingsList.filter(b => {
    const exp = (b.experienceType || '').toLowerCase();
    return exp.includes('video') || exp.includes('virtual');
  }).length;

  const bridalCount = visitBookingsList.filter(b => {
    const exp = (b.experienceType || '').toLowerCase();
    return exp.includes('bridal');
  }).length;

  const getWhatsAppCustomStatusUrl = (c) => {
    const phoneDigits = String(c.phone || '').replace(/\D/g, '');
    const cleanPhone = phoneDigits.length > 10 && phoneDigits.startsWith('91') ? phoneDigits.slice(2) : phoneDigits;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const trackLink = `${origin}/?track=CST-${c.id}`;
    const notesInfo = parseCustomNotes(c.notes);
    const st = (c.status || 'Confirmed').trim();

    let actionDetails = 'Our master artisans have commenced preparation of pure mulberry silk threads on the loom.';

    if (st.includes('WhatsApp')) {
      actionDetails = 'Please review the custom Patola design and color specifications.';
    } else if (st.includes('Weaving') || st.includes('Loom')) {
      actionDetails = 'Handloom weaving has begun on traditional rosewood looms (Duration: 2 to 4 months).';
    } else if (st.includes('Quality') || st.includes('Silk Mark')) {
      actionDetails = 'Weaving completed! Silk Mark and Royal Quality inspection sealed. Royal velvet packaging is underway.';
    } else if (st.includes('Completed')) {
      actionDetails = 'Your heirloom Patola has been dispatched with 100% transit insurance.';
    } else if (st.includes('Cancel')) {
      actionDetails = 'This order has been cancelled upon customer request.';
    }

    const message = `👑 *Greetings ${c.fullName || 'Valued Patron'}!*\n\nLive status update for your Custom Double Ikat Patola Order *#CST-${c.id}*:\n\n📌 *Current Status:* ${st}\n🧵 *Saree Motif:* ${c.motifPreference || 'Bespoke Design'}${notesInfo.colors ? `\n🎨 *Colors:* ${notesInfo.colors}` : ''}\n🔐 *Delivery Handover OTP:* ${getOrderDeliveryOtp(c)}\n\n🏛️ *Details:* ${actionDetails}\n\n🔍 *Track Order Live:*\n${trackLink}\n\nWarm regards,\n*PATOLA MADE VANKAR (Authentic Handloom Weavers)*\n📞 Helpline: +91 8160160750`;

    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const getWhatsAppOrderStatusUrl = (ord) => {
    const phoneDigits = String(ord.contactPhone || '').replace(/\D/g, '');
    const cleanPhone = phoneDigits.length > 10 && phoneDigits.startsWith('91') ? phoneDigits.slice(2) : phoneDigits;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const trackLink = `${origin}/?track=${ord.orderReference}`;
    const stageNum = ord.currentStage || 1;
    const courier = ord.courierPartner || 'Blue Dart Express';
    const awb = (ord.trackingAwb && ord.trackingAwb !== 'OTP-VERIFIED') ? ord.trackingAwb : 'Processing';
    const deliveryText = getEffectiveDate(ord);
    const isCancelled = (ord.orderStatus || '').toLowerCase().includes('cancel');

    let stageDesc = 'Order confirmed and currently in process by master artisans.';
    if (stageNum === 2) stageDesc = 'Pure silk quality check and royal velvet presentation box packing in progress.';
    if (stageNum === 3) stageDesc = `Order dispatched! Courier Partner: ${courier}, Tracking AWB: ${awb}.`;
    if (stageNum === 4) stageDesc = 'Order has reached your local delivery hub and will be delivered shortly.';
    if (stageNum === 5) stageDesc = 'Order delivered successfully. Thank you for commissioning a PATOLA MADE VANKAR heirloom!';
    if (isCancelled) stageDesc = 'Order has been cancelled upon customer request.';

    const message = `👑 *Greetings ${ord.customerName || 'Valued Patron'}!*\n\nLive status for your PATOLA MADE VANKAR Order *#${ord.orderReference}*:\n\n📌 *Status:* ${isCancelled ? '🚫 Cancelled' : `Stage ${stageNum}/5 - ${ord.orderStatus || 'In Progress'}`}\n📦 *Delivery Estimate:* ${deliveryText}\n${stageNum >= 3 ? `🚚 *Courier:* ${courier} (AWB: ${awb})\n` : ''}\n🏛️ *Details:* ${stageDesc}\n\n🔍 *Track Order Live:*\n${trackLink}\n\nWarm regards,\n*PATOLA MADE VANKAR*\n📞 Helpline: +91 8160160750`;

    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // WhatsApp Apology for Customer Order Cancellation
  const getWhatsAppCancellationUrl = (ord, customReason) => {
    if (!ord) return '#';
    const phoneDigits = String(ord.contactPhone || ord.phone || '').replace(/\D/g, '');
    const cleanPhone = phoneDigits.length > 10 && phoneDigits.startsWith('91') ? phoneDigits.slice(2) : phoneDigits;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const trackLink = `${origin}/?track=${ord.orderReference || ord.id}`;

    let reason = customReason;
    if (!reason) {
      try {
        const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
        const info = cancellations[ord.orderReference] || cancellations[String(ord.id)];
        if (info && info.reason) reason = info.reason;
      } catch (e) {}
    }
    if (!reason) {
      reason = ord.orderStatus?.match(/\(([^)]+)\)/)?.[1] || 'Cancelled by Store Administration / Unforeseen Stock Reason';
    }

    const itemNames = (ord.items && ord.items.length > 0)
      ? ord.items.map(i => i.sareeTitle || i.title || 'Pure Silk Patola Saree').join(', ')
      : (ord.motifPreference ? `Bespoke Patola (${ord.motifPreference})` : 'Pure Silk Patola Saree');

    const refundText = (ord.paymentMode === 'Cash on Delivery (COD)')
      ? 'Since this was a Cash on Delivery (COD) order, no payment was charged.'
      : 'Your 100% full refund has been initiated and will be credited to your original payment account within 2-4 business days.';

    const message = `🙏 *Namaste ${ord.customerName || ord.fullName || 'Valued Patron'},*

We sincerely apologize, but your PATOLA MADE VANKAR Order *#${ord.orderReference || ord.id}* has been cancelled.

📝 *Reason for Cancellation:* ${reason}
🛍️ *Saree Ordered:* ${itemNames}
💳 *Payment & Refund:* ${refundText}

We are deeply sorry for any inconvenience caused. Our master artisans take immense pride in your satisfaction. If you would like to choose another heirloom piece from our vault or need any assistance, our concierge is always at your service.

🔍 *Order Status & Details:*
${trackLink}

📞 *Direct Artisan Helpline:* +91 8160160750

Warm regards,
*PATOLA MADE VANKAR (Authentic Handloom Weavers)*`;

    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // WhatsApp Apology for Loom Visit / Appointment Cancellation
  const getWhatsAppVisitCancellationUrl = (b, customReason) => {
    if (!b) return '#';
    const phoneDigits = String(b.phone || '').replace(/\D/g, '');
    const cleanPhone = phoneDigits.length > 10 && phoneDigits.startsWith('91') ? phoneDigits.slice(2) : phoneDigits;

    let dateStr = 'Upcoming date';
    if (b.preferredDate) {
      dateStr = formatDateDDMMYYYY(b.preferredDate, 'Upcoming date');
    }

    let reason = customReason;
    if (!reason) {
      try {
        const cancellations = JSON.parse(localStorage.getItem('patola_visit_cancellations') || '{}');
        const info = cancellations[String(b.id)];
        if (info && info.reason) reason = info.reason;
      } catch (e) {}
    }
    if (!reason) {
      reason = 'Master artisan schedule conflict / Studio maintenance';
    }

    const exp = b.experienceType || 'Loom Studio Visit';

    const message = `🙏 *Namaste ${b.fullName || 'Valued Patron'},*

We sincerely apologize, but your scheduled royal appointment *#BK-${b.id}* has been cancelled.

🏛️ *Appointment Type:* ${exp}
🗓️ *Scheduled Date:* ${dateStr}
🎨 *Motif Preference:* ${b.motifPreference || 'Nari Kunjar'}
📝 *Reason for Cancellation:* ${reason}

We are truly sorry for having to cancel your appointment. Our master weavers would be honored to reschedule your private studio visit or video consultation at any other date and time that suits you.

💬 *Reply directly to this WhatsApp or Call us:* +91 8160160750

Warm regards,
*PATOLA MADE VANKAR (Authentic Handloom Weavers)*`;

    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // WhatsApp Apology for Custom Loom Order Cancellation
  const getWhatsAppCustomOrderCancellationUrl = (c, customReason) => {
    if (!c) return '#';
    const phoneDigits = String(c.phone || '').replace(/\D/g, '');
    const cleanPhone = phoneDigits.length > 10 && phoneDigits.startsWith('91') ? phoneDigits.slice(2) : phoneDigits;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const trackLink = `${origin}/?track=CST-${c.id}`;

    let reason = customReason;
    if (!reason) {
      try {
        const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
        const info = cancellations[`CST-${c.id}`] || cancellations[String(c.id)];
        if (info && info.reason) reason = info.reason;
      } catch (e) {}
    }
    if (!reason) {
      reason = 'Loom capacity conflict / Custom design specification adjustment';
    }

    const message = `🙏 *Namaste ${c.fullName || 'Valued Patron'},*

We sincerely apologize, but your Custom Handloom Patola Commission *#CST-${c.id}* has been cancelled.

🧵 *Design:* ${c.motifPreference || 'Bespoke Double Ikat'}
📝 *Reason for Cancellation:* ${reason}
💳 *Advance Refund:* 100% full refund of any token advance is being processed back to you.

We are truly sorry for being unable to weave this commission at this time. If you wish to discuss an alternative custom design or reschedule, please reach out to us.

🔍 *View Details:*
${trackLink}

📞 *Direct Master Weaver Helpline:* +91 8160160750

Warm regards,
*PATOLA MADE VANKAR (Authentic Handloom Weavers)*`;

    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // Custom Orders and Visit Bookings are already separated above

  const filteredCustomOrders = customOrders.filter(c => {
    const q = customSearchQuery.toLowerCase().trim();
    if (q) {
      const match = (c.fullName && c.fullName.toLowerCase().includes(q)) ||
                    (c.phone && c.phone.includes(q)) ||
                    (c.email && c.email.toLowerCase().includes(q)) ||
                    (c.motifPreference && c.motifPreference.toLowerCase().includes(q)) ||
                    (c.notes && c.notes.toLowerCase().includes(q)) ||
                    String(c.id).includes(q);
      if (!match) return false;
    }
    const st = (c.status || '').toLowerCase();
    const isCanc = st.includes('cancel');
    if (customStatusFilter === 'cancelled') return isCanc;
    if (customStatusFilter === 'new') return (st === 'pending' || st === 'confirmed' || st.includes('new') || st.includes('whatsapp')) && !isCanc;
    if (customStatusFilter === 'weaving') return (st.includes('weaving') || st.includes('loom')) && !isCanc;
    if (customStatusFilter === 'completed') return (st.includes('completed') || st.includes('dispatched')) && !isCanc;
    return true;
  });

  const customNewCount = customOrders.filter(c => {
    const st = (c.status || '').toLowerCase();
    return (st === 'pending' || st === 'confirmed' || st.includes('new') || st.includes('whatsapp')) && !st.includes('cancel');
  }).length;
  const customWeavingCount = customOrders.filter(c => {
    const st = (c.status || '').toLowerCase();
    return (st.includes('weaving') || st.includes('loom')) && !st.includes('cancel');
  }).length;
  const customCompletedCount = customOrders.filter(c => {
    const st = (c.status || '').toLowerCase();
    return (st.includes('completed') || st.includes('dispatched')) && !st.includes('cancel');
  }).length;
  const customCancelledCount = customOrders.filter(c => (c.status || '').toLowerCase().includes('cancel')).length;
  const todayCustomOrdersCount = customOrders.filter(c => isOrderWithin24h(c.createdAt) && !(c.status || '').toLowerCase().includes('cancel')).length;

  const candidateVisits = (bookingTypeFilter === 'custom-loom')
    ? customOrders
    : (bookingTypeFilter === 'all-everything')
      ? bookings
      : visitBookingsList;

  const filteredBookings = candidateVisits.filter(b => {
    const isCancelled = isBookingCancelled(b);
    const isCompleted = isBookingCompleted(b);

    // 1. Filter by View Mode (Active, Completed, Cancelled, All):
    if (visitViewMode === 'active') {
      // In Active mode, ONLY show active visits (never completed or cancelled)
      if (isCancelled || isCompleted) return false;
    } else if (visitViewMode === 'completed') {
      // In Completed mode, ONLY show completed visits
      if (!isCompleted || isCancelled) return false;
    } else if (visitViewMode === 'cancelled') {
      // In Cancelled mode, ONLY show cancelled visits
      if (!isCancelled) return false;
    }
    // If 'all', all visits are displayed

    // 2. Search filter
    const q = bookingSearchQuery.toLowerCase().trim();
    if (q) {
      const bIdStr = String(b.id || '').toLowerCase();
      const matchesSearch =
        (b.fullName && b.fullName.toLowerCase().includes(q)) ||
        (b.phone && b.phone.toLowerCase().includes(q)) ||
        (b.email && b.email.toLowerCase().includes(q)) ||
        (b.notes && b.notes.toLowerCase().includes(q)) ||
        (b.motifPreference && b.motifPreference.toLowerCase().includes(q)) ||
        (b.experienceType && b.experienceType.toLowerCase().includes(q)) ||
        bIdStr.includes(q);
      if (!matchesSearch) return false;
    }

    // 3. Type filter
    const exp = (b.experienceType || '').toLowerCase();
    const matchesType =
      bookingTypeFilter === 'all' ||
      bookingTypeFilter === 'all-everything' ||
      bookingTypeFilter === 'custom-loom' ||
      (bookingTypeFilter === 'studio' && (exp.includes('studio') || exp.includes('loom') || exp.includes('visit'))) ||
      (bookingTypeFilter === 'video' && (exp.includes('video') || exp.includes('virtual'))) ||
      (bookingTypeFilter === 'bridal' && (exp.includes('bridal') || exp.includes('commission')));

    return matchesType;
  });

  if (!isOpen) return null;

  return (
    <div
      className="admin-page-root"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#f8f5f0',
        zIndex: 999999,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Dedicated Royal Admin Header Bar */}
      <header
        className="admin-page-header"
        style={{
          background: 'linear-gradient(135deg, #3d000e 0%, #70001a 60%, #8b0022 100%)',
          color: '#ffffff',
          padding: '0.85rem 2rem',
          borderBottom: '3px solid #d4af37',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #d4af37 0%, #f6e082 100%)',
            color: '#4a0011',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            fontWeight: 900,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', letterSpacing: '2px', color: '#d4af37', fontWeight: 800, textTransform: 'uppercase' }}>
              Patola Made Vankar🏛️
            </div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
              Artisan Admin & Master Loom Portal
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <span style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(212,175,55,0.5)',
            color: '#fef3c7',
            padding: '0.35rem 0.85rem',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            SQL Server Realtime Synced
          </span>

          {isAuthenticated && (
            <button
              type="button"
              onClick={() => {
                try { sessionStorage.removeItem('patola_admin_authed'); } catch (e) {}
                setIsAuthenticated(false);
                if (onShowToast) onShowToast('🔒 Store Admin Portal Locked.');
              }}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.35)',
                color: '#fff',
                borderRadius: '6px',
                padding: '0.5rem 0.95rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🔒 Lock Portal
            </button>
          )}

          {/* Return to Website Storefront Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #d4af37 0%, #aa8521 100%)',
              border: 'none',
              color: '#3b000b',
              borderRadius: '6px',
              padding: '0.55rem 1.3rem',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
            title="Exit Admin and return to customer shopping website"
          >
            <span>← Return to Store</span>
          </button>
        </div>
      </header>

      {/* Main Page Container */}
      <main
        className="admin-page-main"
        style={{
          flex: 1,
          maxWidth: '1500px',
          width: '100%',
          margin: '0 auto',
          padding: '1.8rem 1.5rem 3rem 1.5rem'
        }}
      >
        {/* Header Strip */}
        <div className="admin-header-strip" style={{ marginBottom: '1.5rem' }}>
          <div className="admin-title-badge">
            <span>ARTISAN STORE MANAGER</span>
          </div>
          <h2 className="admin-main-heading">Order Fulfillment & Dispatch Control</h2>
          <p className="admin-subheading">
            Manage customer orders & loom studio consultations ()
          </p>
        </div>

        {!isAuthenticated ? (
          /* PIN Authentication Screen */
          <div className="admin-auth-box">
            <div className="admin-lock-icon">🔐</div>
            <h3>Store Admin Passcode Required</h3>
            <p>Please enter your Store Manager Password to access orders and catalog management (Secured via JWT Token).</p>
            <form onSubmit={handlePinSubmit} className="admin-pin-form">
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={32}
                  className="admin-pin-input"
                  placeholder="Enter Store Password"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setPinError(false);
                  }}
                  autoFocus
                  style={{ width: '100%', paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(prev => !prev)}
                  title={showPin ? 'Hide Passcode' : 'Show Passcode'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    padding: '2px',
                    lineHeight: 1
                  }}
                >
                  {showPin ? '👁️' : '🙈'}
                </button>
              </div>

              {pinError && <div className="admin-pin-error">⚠️ Incorrect Password. Please try again.</div>}
              
              <button type="submit" className="btn-primary-gold" style={{ marginTop: '1rem', width: '100%' }}>
                Unlock Order Dashboard (JWT Secured) ✦
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="admin-dashboard-content">
            {/* Top Navigation Tabs */}
            <div className="admin-nav-tabs" style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', borderBottom: '2px solid #ecdcc8', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
                style={{
                  background: activeTab === 'orders' ? '#800020' : 'transparent',
                  color: activeTab === 'orders' ? '#d4af37' : '#555',
                  border: 'none',
                  borderBottom: activeTab === 'orders' ? '3px solid #d4af37' : 'none',
                  padding: '0.65rem 1.1rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                📦 Customer Orders ({orders.length})
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'custom-orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('custom-orders')}
                style={{
                  background: activeTab === 'custom-orders' ? '#800020' : 'transparent',
                  color: activeTab === 'custom-orders' ? '#d4af37' : '#555',
                  border: 'none',
                  borderBottom: activeTab === 'custom-orders' ? '3px solid #d4af37' : 'none',
                  padding: '0.65rem 1.1rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  position: 'relative'
                }}
              >
                ✨ Custom Orders ({customOrders.length})
                {customNewCount > 0 && (
                  <span style={{
                    background: '#d4af37',
                    color: '#800020',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    marginLeft: '0.2rem',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                  }}>
                    {customNewCount} New
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'visits' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('visits');
                  setBookingTypeFilter('all');
                  setBookingStatusFilter('active');
                  setVisitViewMode('active');
                }}
                style={{
                  background: activeTab === 'visits' ? '#800020' : 'transparent',
                  color: activeTab === 'visits' ? '#d4af37' : '#555',
                  border: 'none',
                  borderBottom: activeTab === 'visits' ? '3px solid #d4af37' : 'none',
                  padding: '0.65rem 1.1rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                🏛️ Book Loom Visits ({activeVisitsCount})
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
                style={{
                  background: activeTab === 'inventory' ? '#800020' : 'transparent',
                  color: activeTab === 'inventory' ? '#d4af37' : '#555',
                  border: 'none',
                  borderBottom: activeTab === 'inventory' ? '3px solid #d4af37' : 'none',
                  padding: '0.65rem 1.1rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                👗 Saree Inventory ({sareeItems.length})
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'dupatta-inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('dupatta-inventory')}
                style={{
                  background: activeTab === 'dupatta-inventory' ? '#800020' : 'transparent',
                  color: activeTab === 'dupatta-inventory' ? '#d4af37' : '#555',
                  border: 'none',
                  borderBottom: activeTab === 'dupatta-inventory' ? '3px solid #d4af37' : 'none',
                  padding: '0.65rem 1.1rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                🧣 Dupatta Inventory ({dupattaItems.length})
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload')}
                style={{
                  background: activeTab === 'upload' ? '#800020' : 'transparent',
                  color: activeTab === 'upload' ? '#d4af37' : '#555',
                  border: 'none',
                  borderBottom: activeTab === 'upload' ? '3px solid #d4af37' : 'none',
                  padding: '0.65rem 1rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                {editingSaree ? '✏️ Update Saree' : '➕ Upload Saree'}
              </button>

              <button
                type="button"
                className={`admin-tab-btn ${activeTab === 'upload-dupatta' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload-dupatta')}
                style={{
                  background: activeTab === 'upload-dupatta' ? '#800020' : 'transparent',
                  color: activeTab === 'upload-dupatta' ? '#d4af37' : '#555',
                  border: 'none',
                  borderBottom: activeTab === 'upload-dupatta' ? '3px solid #d4af37' : 'none',
                  padding: '0.65rem 1rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                {editingDupatta ? '✏️ Update Dupatta' : '➕ Upload Dupatta'}
              </button>

              <button
                type="button"
                onClick={() => {
                  try { sessionStorage.removeItem('patola_admin_authed'); } catch (e) {}
                  setIsAuthenticated(false);
                  if (onShowToast) onShowToast('🔒 Store Admin Portal Locked.');
                }}
                style={{
                  marginLeft: 'auto',
                  background: 'rgba(128, 0, 32, 0.08)',
                  border: '1.5px solid rgba(128, 0, 32, 0.4)',
                  color: '#800020',
                  borderRadius: '6px',
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                title="Lock Portal (Passcode Required to Re-enter)"
              >
                <span>🔒 Lock Portal</span>
              </button>
            </div>

            {activeTab === 'orders' ? (
              <>
                {/* Top Toolbar */}
                <div className="admin-toolbar">
                  <div className="admin-search-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search Order ID (Active, Cancelled, Deleted), Name, Phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ minWidth: '320px', paddingRight: searchQuery ? '2.4rem' : '0.8rem' }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          background: 'none',
                          border: 'none',
                          color: '#888',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          padding: '4px 8px'
                        }}
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    <button className="btn-outline-gold" onClick={loadOrders} disabled={loading} style={{ padding: '0.6rem 1rem' }}>
                      {loading ? 'Refreshing...' : '🔄 Refresh Data'}
                    </button>
                    <button
                      className="btn-outline-gold"
                      onClick={() => {
                        setIsAuthenticated(false);
                        ApiService.logout();
                      }}
                      style={{ padding: '0.6rem 1rem', opacity: 0.8 }}
                    >
                      🔒 Lock
                    </button>
                  </div>
                </div>

                {/* Metrics Row (Clickable to switch view) */}
                <div className="admin-metrics-grid" style={{ marginBottom: '1.2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', alignItems: 'stretch' }}>
                  <div
                    className="admin-metric-card"
                    onClick={() => setOrderViewMode('all')}
                    style={{
                      cursor: 'pointer',
                      border: orderViewMode === 'all' ? '2px solid #800020' : '1px solid #e8e0d5',
                      boxShadow: orderViewMode === 'all' ? '0 2px 8px rgba(128,0,32,0.15)' : 'none',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                    title="Click to view all orders"
                  >
                    <span className="metric-label" style={{ minHeight: '2.4em', display: 'flex', alignItems: 'flex-start' }}>
                      Total Orders
                    </span>
                    <span className="metric-value gold">{orders.length}</span>
                  </div>

                  <div
                    className="admin-metric-card"
                    onClick={() => setOrderViewMode('active')}
                    style={{
                      cursor: 'pointer',
                      border: orderViewMode === 'active' ? '2px solid #2e7d32' : '1px solid #e8e0d5',
                      background: orderViewMode === 'active' ? '#f0fdf4' : '#faf8f5',
                      boxShadow: orderViewMode === 'active' ? '0 2px 8px rgba(46,125,50,0.2)' : 'none',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                    title="Click to view active orders only"
                  >
                    <span className="metric-label" style={{ color: '#2e7d32', minHeight: '2.4em', display: 'flex', alignItems: 'flex-start' }}>
                      🟢 Active Orders
                    </span>
                    <span className="metric-value" style={{ color: '#2e7d32' }}>{activeOrdersCount}</span>
                  </div>

                  <div
                    className="admin-metric-card"
                    onClick={() => setOrderViewMode('completed')}
                    style={{
                      cursor: 'pointer',
                      background: orderViewMode === 'completed' ? '#dcfce7' : '#f0fdf4',
                      border: orderViewMode === 'completed' ? '2px solid #15803d' : '1px solid #86efac',
                      boxShadow: orderViewMode === 'completed' ? '0 2px 8px rgba(21,128,61,0.2)' : 'none',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                    title="Click to view completed & delivered orders"
                  >
                    <span className="metric-label" style={{ color: '#166534', fontWeight: 700, minHeight: '2.4em', display: 'flex', alignItems: 'flex-start' }}>
                      🏆 Completed Orders
                    </span>
                    <span className="metric-value" style={{ color: '#15803d' }}>{completedOrdersCount}</span>
                  </div>

                  <div
                    className="admin-metric-card"
                    onClick={() => setOrderViewMode('cancelled')}
                    style={{
                      cursor: 'pointer',
                      background: orderViewMode === 'cancelled' ? '#fef2f2' : '#fff5f5',
                      border: orderViewMode === 'cancelled' ? '2px solid #dc2626' : '1px solid #fca5a5',
                      boxShadow: orderViewMode === 'cancelled' ? '0 2px 8px rgba(220,38,38,0.2)' : 'none',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                    title="Click to view cancelled orders"
                  >
                    <span className="metric-label" style={{ color: '#b91c1c', fontWeight: 700, minHeight: '2.4em', display: 'flex', alignItems: 'flex-start' }}>
                      🚫 Cancelled Orders
                    </span>
                    <span className="metric-value" style={{ color: '#dc2626' }}>{cancelledOrdersCount}</span>
                  </div>

                  <div
                    className="admin-metric-card"
                    style={{
                      background: '#fffcf7',
                      border: '1.5px solid #ebdccf',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span className="metric-label" style={{ color: '#800020', fontWeight: 700, minHeight: '2.4em', display: 'flex', alignItems: 'flex-start' }}>
                      Total Billing
                    </span>
                    <span className="metric-value gold" style={{ fontSize: '1.24rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      ₹{totalRevenue.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div
                    className="admin-metric-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span className="metric-label" style={{ minHeight: '2.4em', display: 'flex', alignItems: 'flex-start' }}>
                      In Courier Transit
                    </span>
                    <span className="metric-value in-transit">{inTransitCount}</span>
                  </div>
                </div>

                {/* View Mode & Product Type Switcher Filter Pills */}
                <div style={{
                  display: 'flex',
                  gap: '0.8rem',
                  marginBottom: '1.2rem',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  background: '#faf8f5',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #e2d7c7',
                  justifyContent: 'space-between'
                }}>
                  {/* Status Pills */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#666', marginRight: '0.2rem' }}>
                      Status:
                    </span>

                    <button
                      type="button"
                      onClick={() => setOrderViewMode('active')}
                      style={{
                        background: orderViewMode === 'active' ? '#800020' : '#ffffff',
                        color: orderViewMode === 'active' ? '#d4af37' : '#374151',
                        border: orderViewMode === 'active' ? '2px solid #800020' : '1px solid #d1d5db',
                        padding: '0.45rem 1.1rem',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: orderViewMode === 'active' ? '0 2px 8px rgba(128,0,32,0.2)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      🟢 Active ({activeOrdersCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderViewMode('completed')}
                      style={{
                        background: orderViewMode === 'completed' ? '#15803d' : '#ffffff',
                        color: orderViewMode === 'completed' ? '#ffffff' : '#166534',
                        border: orderViewMode === 'completed' ? '2px solid #15803d' : '1px solid #86efac',
                        padding: '0.45rem 1.1rem',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: orderViewMode === 'completed' ? '0 2px 8px rgba(21,128,61,0.2)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                      title="Click to view all completed & delivered orders"
                    >
                      🏆 Completed ({completedOrdersCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderViewMode('cancelled')}
                      style={{
                        background: orderViewMode === 'cancelled' ? '#dc2626' : '#ffffff',
                        color: orderViewMode === 'cancelled' ? '#ffffff' : '#b91c1c',
                        border: orderViewMode === 'cancelled' ? '2px solid #dc2626' : '1px solid #fca5a5',
                        padding: '0.45rem 1.1rem',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: orderViewMode === 'cancelled' ? '0 2px 8px rgba(220,38,38,0.2)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                      title="Click to view all cancelled orders"
                    >
                      🚫 Cancelled ({cancelledOrdersCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderViewMode('all')}
                      style={{
                        background: orderViewMode === 'all' ? '#1f2937' : '#ffffff',
                        color: orderViewMode === 'all' ? '#ffffff' : '#4b5563',
                        border: orderViewMode === 'all' ? '2px solid #1f2937' : '1px solid #d1d5db',
                        padding: '0.45rem 1rem',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: orderViewMode === 'all' ? '0 2px 8px rgba(31,41,55,0.2)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      📋 All Statuses ({orders.length})
                    </button>
                  </div>

                  {/* Product Type Filter Pills */}
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#666', marginRight: '0.2rem' }}>
                      Filter Product:
                    </span>

                    <button
                      type="button"
                      onClick={() => setOrderProductFilter('all')}
                      style={{
                        background: orderProductFilter === 'all' ? '#4a0011' : '#ffffff',
                        color: orderProductFilter === 'all' ? '#d4af37' : '#4b5563',
                        border: orderProductFilter === 'all' ? '2px solid #4a0011' : '1px solid #d1d5db',
                        padding: '0.4rem 0.9rem',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      🛍️ All Products ({orders.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderProductFilter('saree')}
                      style={{
                        background: orderProductFilter === 'saree' ? '#800020' : '#ffffff',
                        color: orderProductFilter === 'saree' ? '#d4af37' : '#800020',
                        border: orderProductFilter === 'saree' ? '2px solid #800020' : '1px solid #d4af37',
                        padding: '0.4rem 0.9rem',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      🥻 Sarees ({sareeOrders.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderProductFilter('dupatta')}
                      style={{
                        background: orderProductFilter === 'dupatta' ? '#800020' : '#ffffff',
                        color: orderProductFilter === 'dupatta' ? '#d4af37' : '#800020',
                        border: orderProductFilter === 'dupatta' ? '2px solid #800020' : '1px solid #d4af37',
                        padding: '0.4rem 0.9rem',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      🧣 Dupattas ({dupattaOrders.length})
                    </button>
                  </div>
                </div>

                {/* Orders List */}
                <div className="admin-orders-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--color-primary-dark)', fontSize: '1.1rem' }}>
                      Customer Orders ({filteredOrders.length})
                      {searchQuery.trim() ? (
                        <span style={{ fontSize: '0.82rem', color: '#800020', marginLeft: '0.5rem', fontWeight: 700 }}>
                          • Search Results for "{searchQuery}"
                        </span>
                      ) : (
                        <>
                          {orderViewMode === 'active' && <span style={{ fontSize: '0.8rem', color: '#16a34a', marginLeft: '0.5rem', fontWeight: 600 }}>• Showing Active Orders</span>}
                          {orderViewMode === 'cancelled' && <span style={{ fontSize: '0.8rem', color: '#dc2626', marginLeft: '0.5rem', fontWeight: 600 }}>• Showing Cancelled Orders</span>}
                          {orderViewMode === 'all' && <span style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: '0.5rem', fontWeight: 600 }}>• Showing All Orders</span>}
                        </>
                      )}
                    </h4>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: '#faf8f5', borderRadius: '8px', border: '1px dashed #d1c7b7' }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#666' }}>No matching orders in current view ({orderViewMode}).</p>
                      {cancelledOrdersCount > 0 && orderViewMode !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => setOrderViewMode('cancelled')}
                          className="btn-outline-gold"
                          style={{ marginTop: '0.8rem', padding: '0.45rem 1.2rem', borderColor: '#dc2626', color: '#dc2626', fontWeight: 700 }}
                        >
                          🚫 View {cancelledOrdersCount} Cancelled Order(s)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setOrderViewMode('all'); setSearchQuery(''); }}
                        className="btn-outline-gold"
                        style={{ marginTop: '0.8rem', marginLeft: '0.5rem', padding: '0.45rem 1.2rem' }}
                      >
                        📋 View All Orders ({orders.length})
                      </button>
                    </div>
                  ) : (
                    <div className="admin-order-cards">
                      {filteredOrders.map((ord) => {
                        const isDeleted = !!ord.isDeletedRecord;
                        const isEditing = editingOrderRef === ord.orderReference;
                        const isCancelled = !isDeleted && isOrderCancelled(ord);
                        const isCompleted = !isDeleted && isOrderCompleted(ord);
                        const cancellationInfo = getCancellationInfo(ord.orderReference);

                        let stageNum = ord.currentStage !== undefined ? ord.currentStage : 1;
                        if (isCancelled || isDeleted) {
                          stageNum = 0;
                        } else {
                          try {
                            const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
                            if (overrides[ord.orderReference] !== undefined) {
                              stageNum = overrides[ord.orderReference];
                            }
                          } catch (e) {}
                          if (ord.orderStatus && ord.orderStatus.includes('Stage ')) {
                            const match = ord.orderStatus.match(/Stage (\d)/);
                            if (match && (!stageNum || stageNum === 1)) stageNum = parseInt(match[1], 10);
                          }
                        }

                        // Group all orders from the same customer (strictly by valid 10-digit phone or exact name)
                        const cleanPhone = (p) => (p || '').replace(/\D/g, '').slice(-10);
                        const ordPhone = cleanPhone(ord.contactPhone);
                        const sameCustomerOrders = orders.filter(o => {
                          const oPhone = cleanPhone(o.contactPhone);
                          if (ordPhone && oPhone && ordPhone.length >= 10 && oPhone.length >= 10) {
                            return ordPhone === oPhone;
                          }
                          return ord.customerName && o.customerName && (o.customerName || '').trim().toLowerCase() === (ord.customerName || '').trim().toLowerCase();
                        });

                        return (
                          <div
                            key={ord.orderReference}
                            id={`admin-order-${ord.orderReference}`}
                            className="admin-order-card"
                            style={{
                              border: isDeleted ? '1.5px dashed #dc2626' : isCancelled ? '1.5px solid #fca5a5' : isCompleted ? '1px solid #86efac' : '1px solid #e8e0d5',
                              background: isDeleted ? '#fff5f5' : isCancelled ? '#fffdfd' : '#ffffff'
                            }}
                          >
                            {/* Card Header */}
                            <div className="admin-card-header">
                              <div className="order-ref-pill">
                                <strong>#{ord.orderReference}</strong>
                                <span className="order-time-badge">
                                  {formatDateDDMMYYYY(ord.createdAt, 'Today')}
                                </span>
                                {isOrderWithin24h(ord.createdAt) && !isCancelled && !isDeleted && (
                                  <span style={{
                                    background: '#15803d',
                                    color: '#ffffff',
                                    padding: '0.15rem 0.55rem',
                                    borderRadius: '10px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800
                                  }}>
                                    New
                                  </span>
                                )}
                              </div>
                              <div className="order-status-badge-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {sameCustomerOrders.length >= 2 && !isDeleted && (
                                  <span style={{
                                    background: '#fef3c7',
                                    color: '#92400e',
                                    border: '1px solid #f59e0b',
                                    padding: '0.15rem 0.55rem',
                                    borderRadius: '10px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700
                                  }}>
                                    👑 {sameCustomerOrders.length} ORDERS
                                  </span>
                                )}
                                {isDeleted ? (
                                  <span style={{
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    border: '1.5px solid #dc2626',
                                    padding: '0.2rem 0.65rem',
                                    borderRadius: '10px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                  }}>
                                    🗑️ DELETED ORDER
                                  </span>
                                ) : isCancelled ? (
                                  <span style={{
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    border: '1px solid #f87171',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '10px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700
                                  }}>
                                    🚫 CANCELLED
                                  </span>
                                ) : isCompleted ? (
                                  <span style={{
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    border: '1px solid #86efac',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '10px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700
                                  }}>
                                    🏆 COMPLETED
                                  </span>
                                ) : null}
                                <span className={`status-dot ${isDeleted ? 'cancelled' : isCancelled ? 'cancelled' : `stage-${stageNum}`}`}></span>
                                <strong style={{ color: (isDeleted || isCancelled) ? '#991b1b' : 'inherit' }}>
                                  {isDeleted
                                    ? `Deleted Order (${ord.deletedAt ? `Deleted ${formatDateDDMMYYYY(ord.deletedAt)}` : 'Archived Record'})`
                                    : isCancelled
                                      ? 'Cancelled (Order Terminated)'
                                      : (ord.orderStatus || 'Pending')}
                                </strong>
                                {ord.paymentStatus && !isDeleted && !isCancelled && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <span style={{
                                      background: ord.paymentStatus.toLowerCase() === 'paid' ? '#dcfce7' : '#fef3c7',
                                      color: ord.paymentStatus.toLowerCase() === 'paid' ? '#166534' : '#92400e',
                                      border: ord.paymentStatus.toLowerCase() === 'paid' ? '1px solid #86efac' : '1px solid #fde68a',
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '8px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700
                                    }}>
                                      {ord.paymentStatus.toLowerCase() === 'paid' ? '✓ Paid' : '⏳ Payment Pending'}
                                      {ord.transactionId ? ` (Txn: ${ord.transactionId})` : ''}
                                    </span>
                                    {ord.paymentStatus.toLowerCase() !== 'paid' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdatePaymentStatus(ord.orderReference, 'Paid');
                                        }}
                                        style={{
                                          background: '#16a34a',
                                          color: '#ffffff',
                                          border: 'none',
                                          padding: '0.15rem 0.55rem',
                                          borderRadius: '6px',
                                          fontSize: '0.72rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          boxShadow: '0 1px 3px rgba(22,163,74,0.3)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.2rem'
                                        }}
                                        title="Click to mark this payment as Paid (sp_UpdatePaymentStatus in SQL Server)"
                                      >
                                        💰 Mark Paid
                                      </button>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Customer & Delivery Details Grid */}
                            <div className="admin-order-info-grid">
                              <div>
                                <span className="info-label">Recipient Customer:</span>
                                <div className="info-val-strong">{ord.customerName}</div>
                                {sameCustomerOrders.length >= 2 && (
                                  <div style={{ marginTop: '0.25rem' }}>
                                    <span style={{
                                      background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                                      border: '1px solid #d97706',
                                      color: '#92400e',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem'
                                    }}>
                                      👑 Repeat Royal Patron: {sameCustomerOrders.length} Orders
                                    </span>
                                  </div>
                                )}
                                <div style={{ marginTop: '0.3rem' }}>
                                  <a href={`tel:${ord.contactPhone}`} className="contact-chip phone">
                                    📞 {ord.contactPhone}
                                  </a>
                                  <a
                                    href={`https://wa.me/91${ord.contactPhone ? ord.contactPhone.replace(/\D/g, '') : ''}?text=Namaste%20${encodeURIComponent(ord.customerName)},%20regarding%20your%20Patola%20Order%20${ord.orderReference}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="contact-chip whatsapp"
                                    style={{ marginLeft: '0.4rem' }}
                                  >
                                    💬 WhatsApp
                                  </a>
                                </div>
                              </div>

                              <div>
                                <span className="info-label">Full Shipping Address:</span>
                                <div className="info-val">
                                  {ord.deliveryAddress}, {ord.city}{ord.state ? `, ${ord.state}` : ''} - <strong>{ord.postalCode}</strong>
                                </div>
                              </div>

                              <div>
                                <span className="info-label">Payment & Security OTP:</span>
                                <div className="info-val">
                                  <span className="payment-pill">{ord.paymentMode}</span>
                                  <div style={{ marginTop: '0.4rem' }}>
                                    <span>Handover OTP: </span>
                                    <span className="otp-chip">🔑 {getOrderDeliveryOtp(ord)}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <span className="info-label">Order Total Amount:</span>
                                {ord.hasDiscount ? (
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                                      <span style={{ textDecoration: 'line-through', color: '#888', fontSize: '0.88rem' }}>
                                        ₹{(ord.originalTotalAmount || 0).toLocaleString('en-IN')}
                                      </span>
                                      <div className="price-tag" style={{ margin: 0, fontWeight: 700 }}>
                                        ₹{(ord.totalAmount || 0).toLocaleString('en-IN')}
                                      </div>
                                      <span style={{ color: '#b91c1c', fontSize: '0.78rem', fontWeight: 600 }}>
                                        ({ord.discountPercent}% OFF)
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="price-tag">₹{(ord.totalAmount || 0).toLocaleString('en-IN')}</div>
                                )}
                                <div style={{ fontSize: '0.78rem', color: '#800020', fontWeight: 700, marginTop: '3px' }}>
                                  {(ord.items && ord.items.length > 0) ? `🛍️ ${ord.items.length} Product Item${ord.items.length > 1 ? 's' : ''}` : '🛍️ 1 Handloom Product'}
                                </div>
                              </div>

                              <div>
                                <span className="info-label">Estimated Delivery Date:</span>
                                <div style={{ marginTop: '0.2rem' }}>
                                  <span style={{ background: '#fdf7ee', border: '1px solid #d4af37', color: '#800020', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                    📅 {getEffectiveDate(ord)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Prominent Showcase of Ordered Handcrafted Sarees & Dupattas */}
                            {(() => {
                              const orderItems = (ord.items && ord.items.length > 0)
                                ? ord.items
                                : [{
                                    sareeId: 'VP-ITEM-1',
                                    sareeTitle: 'Double Ikat Heritage Patola Saree',
                                    quantity: 1,
                                    unitPrice: ord.totalAmount || 0,
                                    lineTotal: ord.totalAmount || 0
                                  }];

                              return (
                                <div style={{
                                  marginTop: '0.9rem',
                                  marginBottom: '0.75rem',
                                  padding: '0.85rem 1.1rem',
                                  background: 'linear-gradient(135deg, #fffdfa, #fbf7f0)',
                                  borderRadius: '9px',
                                  border: '1.5px solid #ebdccb',
                                  boxShadow: '0 1px 4px rgba(128, 0, 32, 0.04)'
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '0.65rem',
                                    paddingBottom: '0.4rem',
                                    borderBottom: '1px solid #eadac7'
                                  }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#800020', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <span style={{ fontSize: '1.1rem' }}>🛍️</span>
                                      <span>Ordered Products ({orderItems.length} {orderItems.length > 1 ? 'Items' : 'Item'}):</span>
                                    </div>
                                    <span style={{ fontSize: '0.74rem', color: '#800020', fontWeight: 700, background: '#fef3c7', border: '1px solid #f59e0b', padding: '2px 8px', borderRadius: '10px' }}>
                                      Silk Mark Certified Handloom
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {orderItems.map((item, idx) => {
                                      const sId = item.sareeId || item.id;
                                      const isDup = isDupattaItem(item);
                                      const match = (sarees || []).find(s => String(s.id).toLowerCase() === String(sId).toLowerCase()) ||
                                        (sarees || []).find(s => s.title && (item.sareeTitle || item.title) && s.title.toLowerCase().trim() === (item.sareeTitle || item.title).toLowerCase().trim());

                                      const displayImage = item.image || match?.image || match?.images?.[0] || (isDup ? '/assets/images/saree_royal_blue.jpg' : DEFAULT_SAREE_IMAGES[0]);
                                      const displayTitle = item.sareeTitle || item.title || match?.title || (isDup ? 'Royal Heritage Patola Dupatta' : 'Royal Heritage Patola Saree');
                                      const displayMotif = item.motifName || match?.motifName || (isDup ? 'Royal Ikat Dupatta Bhat' : 'Traditional Sacred Ikat Motif');
                                      const displayWeave = item.weave || match?.weave || (isDup ? 'Double Ikat Dupatta Weave' : 'Double Ikat Handloom');
                                      const displayCat = getCategoryLabel(item.category || match?.category || (isDup ? 'double-dupatta' : 'double-ikat'));
                                      const unitPrice = Number(item.unitPrice || match?.finalPriceINR || match?.basePriceINR || (ord.totalAmount / Math.max(1, orderItems.length)));
                                      const qty = Number(item.quantity) || 1;
                                      const itemTotal = Number(item.lineTotal) || (unitPrice * qty);

                                      const isItemCanc = isOrderItemCancelled(ord.orderReference, item, idx);
                                      const cancelData = getOrderItemCancelData(ord.orderReference, item, idx);

                                      return (
                                        <div
                                          key={idx}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.9rem',
                                            background: isItemCanc ? '#fff5f5' : '#ffffff',
                                            padding: '0.75rem 0.95rem',
                                            borderRadius: '8px',
                                            border: isItemCanc ? '1.5px solid #fca5a5' : (isDup ? '1.5px solid #e9d5ff' : '1.5px solid #dfd3c3'),
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                            opacity: isItemCanc ? 0.88 : 1,
                                            flexWrap: 'wrap'
                                          }}
                                        >
                                          {/* Product Thumbnail Image */}
                                          <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
                                            <img
                                              src={displayImage}
                                              alt={displayTitle}
                                              style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                borderRadius: '6px',
                                                border: isItemCanc ? '2px solid #f87171' : (isDup ? '2px solid #9333ea' : '2px solid #d4af37'),
                                                filter: isItemCanc ? 'grayscale(40%)' : 'none'
                                              }}
                                              onError={(e) => { e.target.src = isDup ? '/assets/images/saree_royal_blue.jpg' : DEFAULT_SAREE_IMAGES[0]; }}
                                            />
                                            <span style={{
                                              position: 'absolute',
                                              bottom: '-4px',
                                              right: '-4px',
                                              background: isDup ? '#7e22ce' : '#800020',
                                              color: '#fff',
                                              fontSize: '0.65rem',
                                              padding: '1px 5px',
                                              borderRadius: '4px',
                                              fontWeight: 700
                                            }}>
                                              {isDup ? '🧣 DUPATTA' : '🥻 SAREE'}
                                            </span>
                                          </div>

                                          {/* Product Full Details */}
                                          <div style={{ flex: 1, minWidth: '220px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: isItemCanc ? '#991b1b' : '#800020', textDecoration: isItemCanc ? 'line-through' : 'none' }}>
                                                {displayTitle}
                                              </span>
                                              {sId && (
                                                <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '1px 7px', borderRadius: '4px', fontWeight: 700, fontFamily: 'monospace' }}>
                                                  #{sId}
                                                </span>
                                              )}
                                              <span style={{ fontSize: '0.72rem', background: isDup ? '#fae8ff' : '#ede9fe', color: isDup ? '#86198f' : '#5b21b6', padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>
                                                ✦ {displayCat}
                                              </span>
                                              {isItemCanc && (
                                                <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', padding: '1px 7px', borderRadius: '4px', fontWeight: 800 }}>
                                                  🚫 Item Cancelled
                                                </span>
                                              )}
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#555' }}>
                                              <span>🎨 <strong>Motif:</strong> <span style={{ color: '#800020', fontWeight: 600 }}>{displayMotif}</span></span>
                                              <span>•</span>
                                              <span>🧵 <strong>Weave:</strong> {displayWeave}</span>
                                            </div>

                                            {isItemCanc && cancelData && (
                                              <div style={{ marginTop: '0.35rem', fontSize: '0.76rem', color: '#7f1d1d', background: '#fee2e2', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                                💳 <strong>Refund Initiated:</strong> ₹{itemTotal.toLocaleString('en-IN')} • Reason: {cancelData.reason || 'Admin Cancelled'}
                                              </div>
                                            )}
                                          </div>

                                          {/* Price & Quantity Breakdown + Action */}
                                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: isItemCanc ? '#991b1b' : '#15803d', textDecoration: isItemCanc ? 'line-through' : 'none' }}>
                                              ₹{itemTotal.toLocaleString('en-IN')}
                                            </div>
                                            <div style={{ fontSize: '0.76rem', color: '#777', marginTop: '2px' }}>
                                              {qty} {qty > 1 ? 'Pcs' : 'Pc'} × ₹{unitPrice.toLocaleString('en-IN')}
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                                              {isItemCanc ? (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleAdminRestoreItem(ord, item, idx)}
                                                    style={{
                                                      background: '#f0fdf4',
                                                      border: '1px solid #16a34a',
                                                      color: '#15803d',
                                                      fontSize: '0.74rem',
                                                      fontWeight: 700,
                                                      padding: '2px 8px',
                                                      borderRadius: '4px',
                                                      cursor: 'pointer'
                                                    }}
                                                    title="Restore item to active order"
                                                  >
                                                    ↩️ Restore
                                                  </button>
                                                  <a
                                                    href={getWhatsAppItemCancellationUrl(ord, item, idx)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                      background: '#25d366',
                                                      color: '#fff',
                                                      border: 'none',
                                                      fontSize: '0.74rem',
                                                      fontWeight: 700,
                                                      padding: '2px 8px',
                                                      borderRadius: '4px',
                                                      textDecoration: 'none',
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '2px'
                                                    }}
                                                    title="Send WhatsApp apology & refund update for this single item"
                                                  >
                                                    💬 WhatsApp
                                                  </a>
                                                </>
                                              ) : (
                                                !isCancelled && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleAdminCancelItem(ord, item, idx)}
                                                    style={{
                                                      background: '#fff',
                                                      border: '1px solid #f87171',
                                                      color: '#dc2626',
                                                      fontSize: '0.74rem',
                                                      fontWeight: 700,
                                                      padding: '2px 8px',
                                                      borderRadius: '4px',
                                                      cursor: 'pointer'
                                                    }}
                                                    title="Cancel only this item from the order (single saree / dupatta cancellation)"
                                                  >
                                                    ✕ Cancel Item
                                                  </button>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Item Cancellation Net Total Breakdown */}
                                  {(() => {
                                    const cancelledItems = orderItems.filter((it, idx) => isOrderItemCancelled(ord.orderReference, it, idx));
                                    if (cancelledItems.length === 0 || isCancelled) return null;

                                    const totalRefund = cancelledItems.reduce((sum, it) => {
                                      const u = Number(it.unitPrice || (ord.totalAmount / Math.max(1, orderItems.length)));
                                      const q = Number(it.quantity) || 1;
                                      return sum + (u * q);
                                    }, 0);

                                    const origTotal = orderItems.reduce((sum, it) => {
                                      const u = Number(it.unitPrice || (ord.totalAmount / Math.max(1, orderItems.length)));
                                      const q = Number(it.quantity) || 1;
                                      return sum + (u * q);
                                    }, 0);

                                    const netTotal = Math.max(0, origTotal - totalRefund);

                                    return (
                                      <div style={{
                                        marginTop: '0.75rem',
                                        padding: '0.75rem 1rem',
                                        background: '#fef2f2',
                                        border: '1.5px dashed #f87171',
                                        borderRadius: '8px',
                                        fontSize: '0.84rem'
                                      }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: '3px' }}>
                                          <span>Original Total ({orderItems.length} Items):</span>
                                          <span>₹{origTotal.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 700, marginBottom: '3px' }}>
                                          <span>- Cancelled Items Refund ({cancelledItems.length} {cancelledItems.length > 1 ? 'Items' : 'Item'}):</span>
                                          <span>- ₹{totalRefund.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 800, fontSize: '0.94rem', paddingTop: '4px', borderTop: '1px solid #fecaca' }}>
                                          <span>Net Active Order Bill ({orderItems.length - cancelledItems.length} Items):</span>
                                          <span>₹{netTotal.toLocaleString('en-IN')}</span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              );
                            })()}


                            {/* Customer 1-5 Star Review Display (if reviewed) */}
                            {(() => {
                              try {
                                const reviewsMap = JSON.parse(localStorage.getItem('patola_customer_reviews') || '{}');
                                const rev = reviewsMap[ord.orderReference];
                                if (rev) {
                                  return (
                                    <div style={{
                                      marginTop: '0.8rem',
                                      padding: '0.6rem 0.95rem',
                                      background: '#fdf7ee',
                                      border: '1px solid #d4af37',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      flexWrap: 'wrap',
                                      gap: '0.5rem'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '1.1rem' }}>👑</span>
                                        <strong style={{ color: '#800020', fontSize: '0.86rem' }}>Customer Review:</strong>
                                        <span style={{ color: '#d4af37', fontWeight: 800, fontSize: '0.95rem' }}>
                                          {'⭐'.repeat(rev.rating || 5)} ({rev.rating || 5}/5)
                                        </span>
                                        {rev.comment && <span style={{ color: '#555', fontSize: '0.82rem', fontStyle: 'italic' }}>— "{rev.comment}"</span>}
                                      </div>
                                      <span style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>
                                        ✓ Verified Patron
                                      </span>
                                    </div>
                                  );
                                }
                              } catch (e) {}
                              return null;
                            })()}

                            {/* Cancellation Reason & Settlement Details Callout */}
                            {isCancelled && (
                              <div style={{
                                marginTop: '0.8rem',
                                marginBottom: '0.9rem',
                                padding: '0.85rem 1.1rem',
                                background: '#fff1f2',
                                border: '1.5px solid #fca5a5',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.8rem'
                              }}>
                                <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🚫</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '0.94rem' }}>
                                    Customer Order Cancelled & Fulfillment Terminated
                                  </div>
                                  <div style={{ fontSize: '0.84rem', color: '#881337', marginTop: '0.25rem' }}>
                                    <strong>Cancellation Reason:</strong> {cancellationInfo?.reason || ord.orderStatus || 'Customer requested cancellation'}
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: '#9f1239', marginTop: '0.35rem', display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
                                    <span>⏰ <strong>Date/Time:</strong> {formatDateDDMMYYYY(cancellationInfo?.cancelledAt, 'Recently')}</span>
                                    <span>👤 <strong>Cancelled By:</strong> {cancellationInfo?.cancelledBy || (ord.orderStatus && ord.orderStatus.includes('Customer') ? 'Customer (Live Tracking)' : 'Store Manager')}</span>
                                    <span>💳 <strong>Payment Settlement:</strong> {ord.paymentMode === 'Cash on Delivery (COD)' ? 'COD Order Terminated (Zero Charge)' : '100% Refund In-Process to Customer'}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Multiple Orders Summary - Clean & Simple */}
                            {sameCustomerOrders.length >= 2 && (
                              <div style={{
                                marginTop: '0.75rem',
                                background: '#faf7f2',
                                border: '1px solid #ebdccf',
                                borderRadius: '8px',
                                padding: '0.45rem 0.85rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '0.5rem'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                                  <span>👑</span>
                                  <strong style={{ color: 'var(--color-primary-dark)' }}>
                                    Repeat Customer: {sameCustomerOrders.length} Orders
                                  </strong>
                                  <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>
                                    (Total Lifetime: <strong style={{ color: '#800020' }}>₹{sameCustomerOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0).toLocaleString('en-IN')}</strong>)
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setExpandedCustomerOrderRef(expandedCustomerOrderRef === ord.orderReference ? null : ord.orderReference)}
                                  style={{
                                    background: expandedCustomerOrderRef === ord.orderReference ? '#800020' : '#ffffff',
                                    color: expandedCustomerOrderRef === ord.orderReference ? '#ffffff' : '#800020',
                                    border: '1px solid #d4af37',
                                    borderRadius: '4px',
                                    padding: '3px 10px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {expandedCustomerOrderRef === ord.orderReference
                                    ? '▲ Hide Past Orders'
                                    : `▼ View All ${sameCustomerOrders.length} Orders`}
                                </button>
                              </div>
                            )}

                            {/* Collapsed by default - Expanded Simple List */}
                            {sameCustomerOrders.length >= 2 && expandedCustomerOrderRef === ord.orderReference && (
                              <div style={{
                                marginTop: '0.4rem',
                                background: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                padding: '0.6rem',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                  {sameCustomerOrders.map((custOrd) => {
                                    const isCurrent = custOrd.orderReference === ord.orderReference;
                                    let custStg = custOrd.currentStage || 1;
                                    try {
                                      const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
                                      if (overrides[custOrd.orderReference] !== undefined) {
                                        custStg = overrides[custOrd.orderReference];
                                      }
                                    } catch (e) {}
                                    const isCustComp = custStg === 5 || isOrderCompleted(custOrd);

                                    return (
                                      <div
                                        key={custOrd.orderReference}
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          padding: '0.4rem 0.65rem',
                                          borderRadius: '5px',
                                          background: isCurrent ? '#fffbf7' : '#f9fafb',
                                          border: isCurrent ? '1.5px solid #800020' : '1px solid #eee',
                                          fontSize: '0.8rem',
                                          flexWrap: 'wrap',
                                          gap: '0.5rem'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                          <strong style={{ fontFamily: 'monospace', color: isCurrent ? '#800020' : '#111' }}>
                                            #{custOrd.orderReference}
                                          </strong>
                                          <span style={{ color: '#4b5563', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {custOrd.items && custOrd.items.length > 0
                                              ? custOrd.items.map(i => i.sareeTitle || 'Patola').join(', ')
                                              : 'Double Ikat Saree'}
                                          </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                          <strong style={{ color: '#800020' }}>
                                            ₹{(custOrd.totalAmount || 0).toLocaleString('en-IN')}
                                          </strong>
                                          <span style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            color: isCustComp ? '#15803d' : '#b45309',
                                            background: isCustComp ? '#dcfce7' : '#fef3c7',
                                            padding: '2px 7px',
                                            borderRadius: '3px'
                                          }}>
                                            {isCustComp ? '🏆 Completed' : `Stage ${custStg}`}
                                          </span>
                                          {isCurrent ? (
                                            <span style={{ fontSize: '0.72rem', color: '#800020', fontWeight: 800 }}>
                                              ★ Active Order
                                            </span>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => handleStartEdit(custOrd)}
                                              style={{
                                                background: '#fdf7ee',
                                                border: '1px solid #d4af37',
                                                color: '#800020',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.74rem',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                              }}
                                              title="Edit fulfillment for this order"
                                            >
                                              ✏️ Edit
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Stage Progress Visual Strip (Only shown if not cancelled & not deleted) */}
                            {!isCancelled && !isDeleted && (
                              <div className="admin-progress-strip">
                                {STAGES.map(st => (
                                  <div
                                    key={st.id}
                                    className={`admin-progress-step ${stageNum >= st.id ? 'active' : ''} ${stageNum === st.id ? 'current' : ''}`}
                                  >
                                    <div className="step-num">{st.id}</div>
                                    <span className="step-txt">{st.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Action Area: Update Stage / Courier / Cancel / Re-open */}
                            {!isEditing ? (
                              <div className="admin-card-actions" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                {isDeleted ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreDeletedOrder(ord)}
                                      style={{
                                        background: '#f0fdf4',
                                        border: '1.5px solid #16a34a',
                                        color: '#15803d',
                                        padding: '0.55rem 1.1rem',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        boxShadow: '0 1px 3px rgba(22,163,74,0.15)'
                                      }}
                                      title="Restore this deleted order back into Active Orders list"
                                    >
                                      ↩️ Restore Order to Active
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedDeletedDetail(ord);
                                        setIsDeletedHistoryModalOpen(true);
                                      }}
                                      style={{
                                        background: '#fef2f2',
                                        border: '1.5px solid #ef4444',
                                        color: '#b91c1c',
                                        padding: '0.55rem 1.1rem',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem'
                                      }}
                                      title="View complete archived snapshot in Deleted History popup"
                                    >
                                      📜 View in Archive
                                    </button>
                                  </>
                                ) : isCancelled ? (
                                  <>
                                    <a
                                      href={getWhatsAppCancellationUrl(ord)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        background: '#25d366',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '0.55rem 1.1rem',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '0.88rem',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)',
                                        cursor: 'pointer'
                                      }}
                                      title="Send Cancellation Apology message to customer on WhatsApp"
                                    >
                                      💬 Send Apology WhatsApp
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleReopenOrder(ord.orderReference)}
                                      style={{
                                        background: '#f0fdf4',
                                        border: '1px solid #16a34a',
                                        color: '#15803d',
                                        padding: '0.55rem 1.1rem',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        boxShadow: '0 1px 3px rgba(22,163,74,0.15)'
                                      }}
                                      title="Restore order to Active Orders"
                                    >
                                      ↩️ Re-open to Active
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteOrder(ord.orderReference)}
                                      style={{
                                        background: '#fef2f2',
                                        border: '1.5px solid #ef4444',
                                        color: '#b91c1c',
                                        padding: '0.55rem 1.1rem',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        boxShadow: '0 1px 3px rgba(220,38,38,0.12)'
                                      }}
                                      title="Permanently delete this order from database"
                                    >
                                      🗑️ Delete Order
                                    </button>
                                  </>
                                ) : isCompleted ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleReopenOrder(ord.orderReference)}
                                      style={{
                                        background: '#f0fdf4',
                                        border: '1px solid #16a34a',
                                        color: '#15803d',
                                        padding: '0.55rem 1.1rem',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        boxShadow: '0 1px 3px rgba(22,163,74,0.15)'
                                      }}
                                      title="Restore order to Active Orders"
                                    >
                                      ↩️ Re-open to Active
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteOrder(ord.orderReference)}
                                      style={{
                                        background: '#fef2f2',
                                        border: '1.5px solid #ef4444',
                                        color: '#b91c1c',
                                        padding: '0.55rem 1.1rem',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        boxShadow: '0 1px 3px rgba(220,38,38,0.12)'
                                      }}
                                      title="Permanently delete this order from database"
                                    >
                                      🗑️ Delete Order
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      className="btn-outline-gold"
                                      onClick={() => handleStartEdit(ord)}
                                      style={{ padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}
                                    >
                                      ✏️ Update Fulfillment Stage & Courier
                                    </button>
                                    <a
                                      href={getWhatsAppOrderStatusUrl(ord)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        background: '#25d366',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '0.55rem 1.1rem',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '0.88rem',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)',
                                        cursor: 'pointer'
                                      }}
                                      title="Send 1-Click WhatsApp live status update with tracking link to customer"
                                    >
                                      💬 Send WhatsApp Status
                                    </a>
                                    {ord.orderStatus && ord.orderStatus.toLowerCase().includes('shipped') && (
                                      <button
                                        type="button"
                                        onClick={() => handleVerifyDeliveryOtpAdmin(ord)}
                                        style={{
                                          background: '#eff6ff',
                                          border: '1.5px solid #3b82f6',
                                          color: '#1d4ed8',
                                          padding: '0.55rem 1.1rem',
                                          borderRadius: '6px',
                                          fontWeight: 700,
                                          fontSize: '0.88rem',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.35rem',
                                          boxShadow: '0 2px 6px rgba(59, 130, 246, 0.2)'
                                        }}
                                        title="Verify Delivery Handover OTP via Stored Procedure sp_VerifyDeliveryOtp"
                                      >
                                        🔐 Verify Delivery OTP (sp_VerifyDeliveryOtp)
                                      </button>
                                    )}
                                    {ord.paymentStatus && ord.paymentStatus.toLowerCase() !== 'paid' && !isDeleted && !isCancelled && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdatePaymentStatus(ord.orderReference, 'Paid')}
                                        style={{
                                          background: '#ecfdf5',
                                          border: '1.5px solid #10b981',
                                          color: '#047857',
                                          padding: '0.55rem 1.1rem',
                                          borderRadius: '6px',
                                          fontWeight: 700,
                                          fontSize: '0.88rem',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.35rem',
                                          boxShadow: '0 1px 3px rgba(16,185,129,0.2)'
                                        }}
                                        title="Mark payment as received in cash/online via sp_UpdatePaymentStatus"
                                      >
                                        💰 Mark Payment as Paid
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleCompleteOrder(ord.orderReference)}
                                      style={{
                                        background: '#dcfce7',
                                        border: '1px solid #16a34a',
                                        color: '#15803d',
                                        padding: '0.55rem 1.1rem',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        boxShadow: '0 1px 4px rgba(22,163,74,0.2)'
                                      }}
                                      title="Mark order as Completed & Delivered, and auto-hide from active orders"
                                    >
                                      🏆 Complete & Hide
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelOrder(ord.orderReference)}
                                      style={{
                                        background: '#fff5f5',
                                        border: '1.5px solid #f87171',
                                        color: '#b91c1c',
                                        padding: '0.55rem 1.1rem',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        boxShadow: '0 1px 3px rgba(220,38,38,0.12)'
                                      }}
                                      title="Cancel this order"
                                    >
                                      🚫 Cancel Order
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div className="admin-edit-stage-box">
                                <h5 style={{ margin: '0 0 0.8rem 0', color: 'var(--color-primary-dark)' }}>
                                  Update Order #{ord.orderReference} Fulfillment:
                                </h5>

                                <div className="stage-selector-grid">
                                  {STAGES.map(st => (
                                    <button
                                      key={st.id}
                                      type="button"
                                      className={`stage-select-btn ${editStage === st.id ? 'selected' : ''}`}
                                      onClick={() => setEditStage(st.id)}
                                    >
                                      <strong>Stage {st.id}: {st.name}</strong>
                                      <small>{st.desc}</small>
                                    </button>
                                  ))}
                                </div>

                                {editStage === 5 && (
                                  <div style={{
                                    marginTop: '0.8rem',
                                    padding: '0.65rem 0.9rem',
                                    background: '#f0fdf4',
                                    border: '1.5px solid #16a34a',
                                    borderRadius: '8px',
                                    color: '#15803d',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.45rem',
                                    fontWeight: 600
                                  }}>
                                    <span style={{ fontSize: '1.15rem' }}>💰</span>
                                    <span>Stage 5: Delivered પસંદ કરવાથી ઓર્ડર Delivered થઈ જશે અને Payment આપોઆપ <strong>"Paid" (Confirmed)</strong> થઈ જશે.</span>
                                  </div>
                                )}

                                {/* Courier info inputs if stage >= 4 */}
                                {editStage >= 4 && (
                                  <div className="courier-input-row" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                      <label className="form-label">Courier Partner</label>
                                      <select
                                        className="form-input"
                                        value={editCourier}
                                        onChange={(e) => setEditCourier(e.target.value)}
                                      >
                                        <option value="Blue Dart Express">Blue Dart Express (Armored Air)</option>
                                        <option value="India Post Speed Post">India Post Speed Post (Insured)</option>
                                        <option value="DTDC Premium Express">DTDC Premium Express</option>
                                        <option value="Direct Loom Delivery">Direct Handloom Dispatch</option>
                                      </select>
                                    </div>
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                      <label className="form-label">AWB / Tracking Docket Number</label>
                                      <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter Delivery OTP / Docket Number"
                                        value={editAwb === 'OTP-VERIFIED' ? '' : editAwb}
                                        onChange={(e) => setEditAwb(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Manual Estimated Delivery Date Input for Admin */}
                                <div style={{ marginTop: '1rem', background: '#fffcf7', padding: '0.85rem', borderRadius: '8px', border: '1px dashed #d4af37' }}>
                                  <label className="form-label" style={{ fontWeight: 700, color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                                    📅 Estimated Delivery Date (Set custom delivery date):
                                  </label>
                                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <input
                                      type="date"
                                      className="form-input"
                                      style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1.5px solid #d4af37', background: '#fff', fontSize: '0.9rem' }}
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          const formatted = formatDateDDMMYYYY(e.target.value);
                                          setEditDeliveryDate(`Delivering by ${formatted}`);
                                        }
                                      }}
                                      title="Select date from calendar"
                                    />
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="e.g. 25-10-2026 or 7 to 10 Days"
                                      value={editDeliveryDate}
                                      onChange={(e) => setEditDeliveryDate(e.target.value)}
                                      style={{ flex: 1, minWidth: '220px', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1.5px solid #d4af37', background: '#fff', fontSize: '0.9rem' }}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.76rem', color: '#666', fontWeight: 600 }}>Presets:</span>
                                    <button
                                      type="button"
                                      className="date-preset-pill"
                                      style={{ fontWeight: 700, border: '1.5px solid #16a34a', background: '#f0fdf4', color: '#15803d' }}
                                      onClick={() => setEditDeliveryDate('5 to 10 Days (Express Handloom Delivery)')}
                                    >
                                      ⚡ 5 to 10 Days (Default)
                                    </button>
                                    <button
                                      type="button"
                                      className="date-preset-pill"
                                      onClick={() => setEditDeliveryDate('📦 Ready to Ship (10 to 15 Days)')}
                                    >
                                      📦 10-15 Days
                                    </button>
                                    <button
                                      type="button"
                                      className="date-preset-pill"
                                      onClick={() => setEditDeliveryDate('🗓️ Master Weave Dispatch (1 Month)')}
                                    >
                                      🗓️ 1 Month
                                    </button>
                                    <button
                                      type="button"
                                      className="date-preset-pill"
                                      onClick={() => setEditDeliveryDate('🧵 Custom Double Ikat Loom (2 to 4 Months)')}
                                    >
                                      🧵 2-4 Months
                                    </button>
                                  </div>
                                </div>

                                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.8rem' }}>
                                  <button
                                    type="button"
                                    className="btn-primary-gold"
                                    disabled={savingStatus}
                                    onClick={() => handleSaveStatus(ord.orderReference)}
                                  >
                                    {savingStatus ? 'Saving to SQL Server...' : '✓ Save & Notify Customer Live'}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-outline-gold"
                                    onClick={() => setEditingOrderRef(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : activeTab === 'custom-orders' ? (
              /* TAB: Bespoke Custom Saree Orders (Loom Commissions) */
              <div className="admin-custom-orders-section">
                {/* Custom Orders Toolbar */}
                <div className="admin-toolbar" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                  <div className="admin-search-wrapper" style={{ flex: 1, minWidth: '260px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search Custom Orders by Name, Phone, City, Motif, Requirements..."
                      value={customSearchQuery}
                      onChange={(e) => setCustomSearchQuery(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      className="form-select"
                      value={customStatusFilter}
                      onChange={(e) => setCustomStatusFilter(e.target.value)}
                      style={{ padding: '0.6rem 1rem', fontSize: '0.88rem', minWidth: '180px' }}
                    >
                      <option value="all">📋 All Custom Orders ({customOrders.length})</option>
                      <option value="new">✨ New Inquiries / Pending ({customNewCount})</option>
                      <option value="weaving">🧵 Under Loom Weaving ({customWeavingCount})</option>
                      <option value="completed">🏆 Completed ({customCompletedCount})</option>
                      <option value="cancelled">🚫 Cancelled ({customCancelledCount})</option>
                    </select>

                    <button
                      className="btn-outline-gold"
                      onClick={loadBookings}
                      disabled={loadingBookings}
                      style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      {loadingBookings ? 'Refreshing...' : '🔄 Refresh Data'}
                    </button>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="admin-metrics-grid" style={{ marginBottom: '1.4rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                  <div
                    className="admin-metric-card"
                    onClick={() => setCustomStatusFilter('all')}
                    style={{
                      cursor: 'pointer',
                      border: customStatusFilter === 'all' ? '2px solid #800020' : '1px solid #e8e0d5',
                      background: customStatusFilter === 'all' ? '#fffaf2' : '#faf8f5'
                    }}
                  >
                    <span className="metric-label">Total Custom Orders</span>
                    <span className="metric-value gold">{customOrders.length}</span>
                  </div>

                  <div
                    className="admin-metric-card"
                    onClick={() => setCustomStatusFilter('new')}
                    style={{
                      cursor: 'pointer',
                      border: customStatusFilter === 'new' ? '2px solid #d97706' : '1px solid #e8e0d5',
                      background: customStatusFilter === 'new' ? '#fffbeb' : '#faf8f5'
                    }}
                  >
                    <span className="metric-label" style={{ color: '#b45309' }}>✨ New Commissions</span>
                    <span className="metric-value" style={{ color: '#b45309' }}>{customNewCount}</span>
                  </div>

                  <div
                    className="admin-metric-card"
                    onClick={() => setCustomStatusFilter('weaving')}
                    style={{
                      cursor: 'pointer',
                      border: customStatusFilter === 'weaving' ? '2px solid #4f46e5' : '1px solid #e8e0d5',
                      background: customStatusFilter === 'weaving' ? '#eef2ff' : '#faf8f5'
                    }}
                  >
                    <span className="metric-label" style={{ color: '#4338ca' }}>🧵 Under Loom Weaving</span>
                    <span className="metric-value" style={{ color: '#4338ca' }}>{customWeavingCount}</span>
                  </div>

                  <div
                    className="admin-metric-card"
                    onClick={() => setCustomStatusFilter('completed')}
                    style={{
                      cursor: 'pointer',
                      border: customStatusFilter === 'completed' ? '2px solid #15803d' : '1px solid #e8e0d5',
                      background: customStatusFilter === 'completed' ? '#f0fdf4' : '#faf8f5'
                    }}
                  >
                    <span className="metric-label" style={{ color: '#15803d' }}>🏆 Completed</span>
                    <span className="metric-value" style={{ color: '#15803d' }}>{customCompletedCount}</span>
                  </div>

                  <div
                    className="admin-metric-card"
                    onClick={() => setCustomStatusFilter('cancelled')}
                    style={{
                      cursor: 'pointer',
                      border: customStatusFilter === 'cancelled' ? '2px solid #b91c1c' : '1px solid #e8e0d5',
                      background: customStatusFilter === 'cancelled' ? '#fee2e2' : '#faf8f5'
                    }}
                  >
                    <span className="metric-label" style={{ color: '#b91c1c' }}>🚫 Cancelled</span>
                    <span className="metric-value" style={{ color: '#b91c1c' }}>{customCancelledCount}</span>
                  </div>
                </div>

                {/* Custom Orders List */}
                {loadingBookings ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                    Loading custom saree commissions from SQL Server database...
                  </div>
                ) : filteredCustomOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: '#faf8f5', borderRadius: '12px', border: '1px dashed #d4af37' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.8rem' }}>🧵</span>
                    <h4 style={{ fontFamily: 'Cinzel, serif', color: '#800020', margin: '0 0 0.5rem 0' }}>
                      No Custom Saree Orders Found
                    </h4>
                    <p style={{ color: '#666', fontSize: '0.92rem', maxWidth: '480px', margin: '0 auto' }}>
                      Whenever a customer submits a "Commission a Bespoke Patola" request from the website, their custom colors, motif, description and reference photo will appear right here in real-time.
                    </p>
                    {customSearchQuery && (() => {
                      const qClean = customSearchQuery.toLowerCase().trim().replace(/^#+/, '');
                      const matched = orders.find(o => 
                        (o.orderReference && o.orderReference.toLowerCase().includes(qClean)) ||
                        (o.contactPhone && o.contactPhone.includes(qClean)) ||
                        (o.customerName && o.customerName.toLowerCase().includes(qClean))
                      );
                      if (matched) {
                        return (
                          <div style={{ marginTop: '1.4rem', padding: '1rem 1.4rem', background: '#fffbeb', border: '1.5px solid #d4af37', borderRadius: '10px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', boxShadow: '0 2px 10px rgba(212,175,55,0.15)' }}>
                            <div style={{ color: '#92400e', fontWeight: 700, fontSize: '0.95rem' }}>
                              💡 Order <strong>#{matched.orderReference}</strong> ({matched.customerName} • ₹{Number(matched.totalAmount).toLocaleString('en-IN')}) is in the <strong>"Customer Orders"</strong> tab!
                            </div>
                            <button
                              type="button"
                              className="btn-primary-gold"
                              style={{ padding: '0.55rem 1.3rem', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer' }}
                              onClick={() => {
                                setSearchQuery(matched.orderReference);
                                setActiveTab('orders');
                              }}
                            >
                              👉 Click Here to Open "Customer Orders" & View #{matched.orderReference}
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {filteredCustomOrders.map(c => {
                      const notesInfo = parseCustomNotes(c.notes);
                      const photoUrl = getCustomOrderPhoto(c);
                      const isCancelled = (c.status || '').toLowerCase().includes('cancel');
                      const isCompleted = (c.status || '').toLowerCase() === 'completed';
                      const isWeaving = (c.status || '').toLowerCase().includes('weaving') || (c.status || '').toLowerCase().includes('loom');

                      return (
                        <div
                          key={c.id}
                          className="admin-order-card"
                          style={{
                            background: isCancelled ? '#fffaf9' : '#ffffff',
                            borderRadius: '12px',
                            border: isCancelled ? '2px solid #f87171' : isCompleted ? '1.5px solid #86efac' : isWeaving ? '1.5px solid #c7d2fe' : '1.5px solid #e5d7c3',
                            boxShadow: isCancelled ? '0 3px 12px rgba(220,38,38,0.08)' : '0 3px 12px rgba(128,0,32,0.06)',
                            padding: '1.4rem',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {/* Card Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', borderBottom: '1px solid #f0e6d8', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                              <span style={{ background: isCancelled ? '#991b1b' : '#800020', color: isCancelled ? '#fee2e2' : '#d4af37', padding: '0.3rem 0.75rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.5px' }}>
                                #CST-{c.id}
                              </span>
                              <span style={{ fontSize: '0.82rem', color: '#777' }}>
                                📅 Received: {formatDateDDMMYYYY(c.createdAt)}
                              </span>
                              {isOrderWithin24h(c.createdAt) && !isCancelled && (
                                <span style={{
                                  background: '#15803d',
                                  color: '#ffffff',
                                  padding: '0.15rem 0.55rem',
                                  borderRadius: '10px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800
                                }}>
                                  New
                                </span>
                              )}

                              {/* Prominent Handover OTP Badge */}
                              <span style={{
                                background: '#fef3c7',
                                color: '#800020',
                                border: '1.5px solid #d4af37',
                                padding: '0.22rem 0.65rem',
                                borderRadius: '6px',
                                fontWeight: 800,
                                fontSize: '0.84rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 1px 3px rgba(212, 175, 55, 0.25)'
                              }}>
                                <span>🔐 Handover OTP:</span>
                                <span style={{
                                  background: '#800020',
                                  color: '#ffffff',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  letterSpacing: '1.5px',
                                  fontSize: '0.92rem',
                                  fontWeight: 900
                                }}>
                                  {getOrderDeliveryOtp(c)}
                                </span>
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{
                                padding: '0.35rem 0.8rem',
                                borderRadius: '20px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                background: isCancelled ? '#fee2e2' : isCompleted ? '#dcfce7' : isWeaving ? '#e0e7ff' : '#fef3c7',
                                color: isCancelled ? '#991b1b' : isCompleted ? '#15803d' : isWeaving ? '#3730a3' : '#92400e',
                                border: isCancelled ? '1.5px solid #f87171' : isCompleted ? '1px solid #86efac' : isWeaving ? '1px solid #a5b4fc' : '1px solid #fde68a'
                              }}>
                                {isCancelled ? '🚫 Cancelled' : isCompleted ? '🏆 Completed' : isWeaving ? '🧵 Loom Weaving in Progress' : `✨ ${c.status || 'Confirmed'}`}
                              </span>
                            </div>
                          </div>

                          {/* Cancellation Banner if cancelled */}
                          {isCancelled && (
                            <div style={{
                              background: '#fff1f2',
                              color: '#991b1b',
                              border: '1.5px solid #fca5a5',
                              borderRadius: '8px',
                              padding: '0.7rem 1rem',
                              marginBottom: '1rem',
                              fontSize: '0.86rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem'
                            }}>
                              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                              <div>
                                <strong>Order Cancelled:</strong> {c.cancellationInfo?.reason || 'Cancelled by customer via Live Tracking portal.'}
                              </div>
                            </div>
                          )}

                          {/* Card Body: 2 Columns */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.4rem', marginBottom: '1.2rem' }}>
                            {/* Column 1: Customer Details */}
                            <div style={{ background: '#fdfbf7', padding: '1rem', borderRadius: '8px', border: '1px solid #ede3d4' }}>
                              <h5 style={{ margin: '0 0 0.6rem 0', color: '#800020', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                👤 Customer Details & Occasion
                              </h5>
                              <div style={{ fontSize: '0.88rem', lineHeight: '1.6', color: '#333' }}>
                                <div><strong>Name:</strong> {c.fullName}</div>
                                <div><strong>Phone / WhatsApp:</strong> {c.phone}</div>
                                <div><strong>Email:</strong> {c.email}</div>
                                {notesInfo.city && <div><strong>City / Destination:</strong> {notesInfo.city}</div>}
                                <div><strong>Target Occasion Date:</strong> {formatDateDDMMYYYY(c.preferredDate)}</div>

                                {/* Security Handover OTP Box */}
                                <div style={{
                                  marginTop: '0.6rem',
                                  padding: '0.5rem 0.75rem',
                                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                                  borderRadius: '6px',
                                  border: '1px solid #fcd34d',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '0.5rem'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.1rem' }}>🔑</span>
                                    <div>
                                      <div style={{ fontSize: '0.74rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Delivery Handover OTP
                                      </div>
                                      <div style={{ fontSize: '0.78rem', color: '#555' }}>
                                        Verify from patron at physical handover
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{
                                    background: '#800020',
                                    color: '#ffffff',
                                    padding: '3px 10px',
                                    borderRadius: '5px',
                                    fontWeight: 900,
                                    fontSize: '1rem',
                                    letterSpacing: '1.5px',
                                    boxShadow: '0 2px 5px rgba(128,0,32,0.25)'
                                  }}>
                                    {getOrderDeliveryOtp(c)}
                                  </div>
                                </div>
                              </div>

                              <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <a
                                  href={`https://wa.me/91${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Namaste ${c.fullName}, PATOLA MADE VANKAR Master Weaver here regarding your Bespoke Custom Double Ikat Patola inquiry (#CST-${c.id}).`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    background: '#25d366',
                                    color: '#ffffff',
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    boxShadow: '0 1px 4px rgba(37,211,102,0.25)'
                                  }}
                                >
                                  💬 Chat on WhatsApp
                                </a>

                                <a
                                  href={`tel:${c.phone}`}
                                  style={{
                                    background: '#f3f4f6',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    fontSize: '0.82rem',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                  }}
                                >
                                  📞 Call Customer
                                </a>
                              </div>
                            </div>

                            {/* Column 2: Custom Saree Requirements & Photo */}
                            <div style={{ background: '#fdfbf7', padding: '1rem', borderRadius: '8px', border: '1px solid #ede3d4' }}>
                              <h5 style={{ margin: '0 0 0.6rem 0', color: '#800020', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                🧵 Custom Saree Specifications
                              </h5>
                              <div style={{ fontSize: '0.88rem', lineHeight: '1.6', color: '#333' }}>
                                <div><strong>Preferred Motif:</strong> <span style={{ color: '#800020', fontWeight: 700 }}>{c.motifPreference}</span></div>
                                {notesInfo.colors && (
                                  <div><strong>Silk Color Palette:</strong> <span style={{ background: '#fef3c7', padding: '0.1rem 0.5rem', borderRadius: '4px', fontWeight: 600, color: '#92400e' }}>{notesInfo.colors}</span></div>
                                )}
                                <div style={{ marginTop: '0.4rem' }}>
                                  <strong>Customer Requirements:</strong>
                                  <p style={{ margin: '0.2rem 0 0 0', color: '#555', fontStyle: 'italic', background: '#fff', padding: '0.5rem 0.7rem', borderRadius: '6px', border: '1px dashed #dcd0bf' }}>
                                    "{notesInfo.description || 'No additional notes provided.'}"
                                  </p>
                                </div>
                              </div>

                              {/* Customer Uploaded Photo Preview */}
                              <div style={{ marginTop: '0.8rem' }}>
                                {photoUrl ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <img
                                      src={photoUrl}
                                      alt="Customer Reference"
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                      onClick={() => setPreviewCustomPhoto({ img: photoUrl, name: c.fullName })}
                                      style={{
                                        width: '56px',
                                        height: '56px',
                                        objectFit: 'cover',
                                        borderRadius: '6px',
                                        border: '2px solid #d4af37',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                        background: '#f5efe6'
                                      }}
                                      title="Click to view full image"
                                    />
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => setPreviewCustomPhoto({ img: photoUrl, name: c.fullName })}
                                        style={{
                                          background: '#800020',
                                          color: '#d4af37',
                                          border: 'none',
                                          padding: '0.4rem 0.8rem',
                                          borderRadius: '6px',
                                          fontSize: '0.8rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.35rem'
                                        }}
                                      >
                                        🔍 View Customer Photo
                                      </button>
                                      <div style={{ fontSize: '0.75rem', color: '#777', marginTop: '0.2rem' }}>
                                        Uploaded reference saree photo
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>
                                    📷 No reference photo attached with this order
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Footer: Status Update Control */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', background: '#faf6ef', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #e8decb' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#800020' }}>
                                Update Order Status:
                              </label>
                              <select
                                className="form-select"
                                value={c.status || 'Confirmed'}
                                disabled={updatingBookingId === c.id}
                                onChange={(e) => {
                                  if (e.target.value === 'Cancelled') {
                                    handleCancelCustomOrderWithApology(c);
                                  } else {
                                    handleUpdateBookingStatus(c.id, e.target.value);
                                  }
                                }}
                                style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', minWidth: '220px', borderRadius: '6px', border: isCancelled ? '1.5px solid #f87171' : '1.5px solid #d4af37', fontWeight: 600 }}
                              >
                                <option value="Confirmed">✨ Confirmed (New Inquiry)</option>
                                <option value="WhatsApp Discussion Sent">💬 WhatsApp Discussion / Quotation Sent</option>
                                <option value="Under Loom Weaving (2-4 Months)">🧵 Under Loom Weaving (2-4 Months)</option>
                                <option value="Quality Check & Silk Mark Sealed">🔍 Quality Check & Silk Mark Sealed</option>
                                <option value="Completed">🏆 Completed & Dispatched</option>
                                <option value="Cancelled">🚫 Cancelled</option>
                              </select>
                              {updatingBookingId === c.id && <span style={{ fontSize: '0.78rem', color: '#800020' }}>Updating...</span>}

                              {isCancelled ? (
                                <a
                                  href={getWhatsAppCustomOrderCancellationUrl(c)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    background: '#25d366',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.45rem 0.95rem',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)',
                                    cursor: 'pointer'
                                  }}
                                  title="Send Cancellation Apology message to customer on WhatsApp"
                                >
                                  💬 Send Apology WhatsApp
                                </a>
                              ) : (
                                <a
                                  href={getWhatsAppCustomStatusUrl(c)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    background: '#25d366',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.45rem 0.95rem',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)',
                                    cursor: 'pointer'
                                  }}
                                  title="Send 1-Click WhatsApp live status update with tracking link to customer"
                                >
                                  💬 Send Status on WhatsApp
                                </a>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteBooking(c)}
                              disabled={deletingBookingId === c.id}
                              style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #f87171',
                                padding: '0.45rem 0.9rem',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: 'pointer'
                              }}
                              title="Delete this custom order record"
                            >
                              {deletingBookingId === c.id ? 'Deleting...' : '🗑️ Delete Record'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeTab === 'inventory' ? (
              /* TAB 2: Saree Inventory & Stock Management */
              <div className="admin-inventory-section">
                {/* Inventory Toolbar */}
                <div className="admin-toolbar" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                  <div className="admin-search-wrapper" style={{ flex: 1, minWidth: '240px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search sarees by title, weave, or motif..."
                      value={sareeSearchQuery}
                      onChange={(e) => setSareeSearchQuery(e.target.value)}
                    />
                  </div>
                  <div style={{ minWidth: '220px' }}>
                    <select
                      className="form-input"
                      value={sareeCategoryFilter}
                      onChange={(e) => setSareeCategoryFilter(e.target.value)}
                      style={{ padding: '0.65rem 0.8rem', background: '#fff', border: '1.5px solid #d4af37', fontWeight: 600, color: '#4a0011' }}
                    >
                      <option value="all">✦ All Categories ({sareeItems.length})</option>
                      <option value="double-ikat">Double Ikat Heritage</option>
                      <option value="single-ikat">Single Ikat Classic</option>
                      <option value="semi-patola">Semi Patola Saree</option>
                      <option value="zari-buta">Zari Buta Patola Saree</option>
                      <option value="Modern">Modern Patola Saree</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className="btn-outline-gold" onClick={loadSarees} disabled={loadingSarees} style={{ padding: '0.6rem 1rem' }}>
                      {loadingSarees ? 'Refreshing...' : '🔄 Refresh Sarees'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const ok = window.confirm('Are you sure you want to clean old heavy image cache to make the site ultra-fast? New uploads will be automatically optimized to ~80KB HD.');
                        if (!ok) return;
                        try {
                          localStorage.removeItem('patola_edited_sarees');
                          if (onShowToast) {
                            onShowToast('⚡ Old heavy photos cleared! Site is now ultra-fast.');
                          }
                          loadSarees();
                        } catch (e) {}
                      }}
                      style={{
                        padding: '0.6rem 1rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        background: '#fff',
                        border: '1.5px solid #d4af37',
                        color: '#800020',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      title="Clear previously saved heavy uncompressed photos from browser memory"
                    >
                      ⚡ Clear Heavy Photos (સ્પીડ વધારો)
                    </button>
                    <button
                      className="btn-primary-gold"
                      onClick={() => setActiveTab('upload')}
                      style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
                    >
                      ➕ Add Saree
                    </button>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="admin-metrics-grid" style={{ marginBottom: '1.5rem' }}>
                  <div className="admin-metric-card">
                    <span className="metric-label">Total Saree Designs</span>
                    <span className="metric-value gold">{sareeItems.length}</span>
                  </div>
                  <div className="admin-metric-card">
                    <span className="metric-label">🟢 Ready in Vault (Total Pieces)</span>
                    <span className="metric-value delivered">{totalVaultPieces} Sarees ({inStockCount} Designs)</span>
                  </div>
                  <div className="admin-metric-card">
                    <span className="metric-label">🔴 Out of Stock (0 remaining)</span>
                    <span className="metric-value" style={{ color: '#d32f2f' }}>{outOfStockCount} Designs</span>
                  </div>
                </div>

                {/* Saree List / Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filteredSarees.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: '#faf8f5', borderRadius: '8px' }}>
                      <p>No sarees found matching "{sareeSearchQuery}"{sareeCategoryFilter !== 'all' ? ` in ${getCategoryLabel(sareeCategoryFilter)}` : ''}.</p>
                    </div>
                  ) : (
                    filteredSarees.map(s => {
                      const isDeleting = deletingSareeId === s.id;
                      const isToggling = togglingStockId === s.id;
                      const currentStock = typeof s.stockQuantity === 'number' ? s.stockQuantity : 50;
                      const isOutOfStock = !!s.isOutOfStock || currentStock <= 0;

                      return (
                        <div
                          key={s.id}
                          id={`admin-saree-${s.id}`}
                          style={{
                            display: 'flex',
                            gap: '1.2rem',
                            alignItems: 'center',
                            background: '#ffffff',
                            border: isOutOfStock ? '1.5px solid #ffcdd2' : '1px solid #e0d5c3',
                            borderRadius: '8px',
                            padding: '1rem 1.2rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            flexWrap: 'wrap'
                          }}
                        >
                          {/* Saree Thumbnail */}
                          <img
                            src={s.image || '/assets/images/saree_nari_kunjar.jpg'}
                            alt={s.title}
                            style={{
                              width: '70px',
                              height: '90px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1.5px solid #d4af37',
                              opacity: isOutOfStock ? 0.75 : 1
                            }}
                          />

                          {/* Saree Info */}
                          <div style={{ flex: 1, minWidth: '220px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                              <h4 style={{ margin: 0, fontSize: '1rem', color: '#800020' }}>{s.title}</h4>
                              <span style={{
                                background: '#fdf7ee',
                                color: '#800020',
                                border: '1px solid #d4af37',
                                padding: '0.15rem 0.55rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                ✦ {getCategoryLabel(s.category)}
                              </span>
                              {isOutOfStock ? (
                                <span style={{
                                  background: '#ffebee',
                                  color: '#c62828',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  border: '1px solid #ef9a9a'
                                }}>
                                  🔴 OUT OF STOCK (LOOM ORDER)
                                </span>
                              ) : (
                                <span style={{
                                  background: '#e8f5e9',
                                  color: '#2e7d32',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  border: '1px solid #a5d6a7'
                                }}>
                                  🟢 IN STOCK (READY IN VAULT)
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '0.82rem', color: '#666', marginTop: '0.3rem' }}>
                              <span>Weave: <strong>{s.weave}</strong></span> • 
                              <span> Motif: <strong>{s.motifName || s.motif}</strong></span> • 
                              <span> Handcraft: <strong>{s.timeToWeave || '9 Months'}</strong></span>
                            </div>

                            {/* Price & Discount Section (Directly where user requested) */}
                            {(() => {
                              const discountPercentNum = Number(s.discountPercent) || 0;
                              const basePrice = Number(s.basePriceINR) || 0;
                              const finalPrice = discountPercentNum > 0
                                ? (Number(s.finalPriceINR) || Math.round(basePrice - (basePrice * discountPercentNum / 100)))
                                : (Number(s.finalPriceINR) > 0 && Number(s.finalPriceINR) < basePrice ? Number(s.finalPriceINR) : basePrice);
                              const hasDiscount = discountPercentNum > 0 || (finalPrice > 0 && finalPrice < basePrice);
                              const effectiveDiscountPercent = discountPercentNum > 0
                                ? discountPercentNum
                                : (basePrice > 0 ? Math.round(((basePrice - finalPrice) / basePrice) * 100) : 0);
                              const savedAmount = Math.max(0, basePrice - finalPrice);

                              return (
                                <div style={{ marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                  {hasDiscount ? (
                                    <>
                                      <span style={{ fontSize: '1.05rem', color: '#15803d', fontWeight: 800 }}>
                                        ₹{finalPrice.toLocaleString('en-IN')}
                                      </span>
                                      <span style={{ textDecoration: 'line-through', color: '#888', fontSize: '0.88rem', fontWeight: 500 }}>
                                        ₹{basePrice.toLocaleString('en-IN')}
                                      </span>
                                      <span style={{
                                        background: '#fee2e2',
                                        color: '#dc2626',
                                        border: '1px solid #fca5a5',
                                        padding: '0.18rem 0.55rem',
                                        borderRadius: '4px',
                                        fontSize: '0.78rem',
                                        fontWeight: 800,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                      }}>
                                        🏷️ {effectiveDiscountPercent}% OFF (Save ₹{savedAmount.toLocaleString('en-IN')})
                                      </span>
                                      <span style={{ fontSize: '0.8rem', color: '#777', fontWeight: 400 }}>
                                        (~${Math.round(finalPrice * 0.012).toLocaleString()} USD | ~€{Math.round(finalPrice * 0.011).toLocaleString()} EUR)
                                      </span>
                                      <span style={{
                                        background: '#ecfdf5',
                                        color: '#065f46',
                                        border: '1.5px solid #34d399',
                                        padding: '0.18rem 0.55rem',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem',
                                        fontWeight: 800,
                                        boxShadow: '0 1px 3px rgba(16, 185, 129, 0.2)'
                                      }}>
                                        💰 Discount Price: ₹{finalPrice.toLocaleString('en-IN')}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span style={{ fontSize: '1.05rem', color: '#800020', fontWeight: 800 }}>
                                        ₹{basePrice.toLocaleString('en-IN')}
                                      </span>
                                      <span style={{ fontSize: '0.8rem', color: '#777', fontWeight: 400 }}>
                                        (~${Math.round(basePrice * 0.012).toLocaleString()} USD | ~€{Math.round(basePrice * 0.011).toLocaleString()} EUR)
                                      </span>
                                      <span style={{
                                        background: '#f8fafc',
                                        color: '#64748b',
                                        border: '1px solid #cbd5e1',
                                        padding: '0.18rem 0.55rem',
                                        borderRadius: '4px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600
                                      }}>
                                        🏷️ Discount Price: ₹{basePrice.toLocaleString('en-IN')} (0% OFF)
                                      </span>
                                    </>
                                  )}

                                  {/* Quick Set Discount Dropdown */}
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginLeft: '0.2rem' }}>
                                    <span style={{ fontSize: '0.74rem', color: '#555', fontWeight: 600 }}>Set Discount:</span>
                                    <select
                                      value={effectiveDiscountPercent}
                                      onChange={(e) => handleUpdateDiscount(s, e.target.value)}
                                      style={{
                                        padding: '0.15rem 0.4rem',
                                        fontSize: '0.76rem',
                                        fontWeight: 700,
                                        borderRadius: '4px',
                                        border: '1px solid #d4af37',
                                        background: '#fff',
                                        color: effectiveDiscountPercent > 0 ? '#b91c1c' : '#333',
                                        cursor: 'pointer'
                                      }}
                                      title="Quickly change discount for this Saree"
                                    >
                                      <option value="0">0% (None)</option>
                                      <option value="5">5% OFF</option>
                                      <option value="10">10% OFF</option>
                                      <option value="15">15% OFF</option>
                                      <option value="20">20% OFF</option>
                                      <option value="25">25% OFF</option>
                                      <option value="30">30% OFF</option>
                                      <option value="40">40% OFF</option>
                                      <option value="50">50% OFF</option>
                                    </select>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Live Stock Quantity Indicator */}
                            <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                              <span style={{
                                background: isOutOfStock ? '#fff3e0' : '#f1f8e9',
                                color: isOutOfStock ? '#d84315' : '#33691e',
                                border: isOutOfStock ? '1px solid #ffcc80' : '1px solid #c5e1a5',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}>
                                📦 Available Vault Stock: <strong>{currentStock} Sarees</strong>
                              </span>
                              {isOutOfStock ? (
                                <span style={{ fontSize: '0.76rem', color: '#c62828', fontWeight: 600 }}>
                                  ⚠️ All 50 sarees sold out! Automatically marked Out of Stock.
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.76rem', color: '#558b2f' }}>
                                  (Orders automatically deduct stock. Reaches 0 = Auto Out of Stock)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Stock Modifier & Action Controls */}
                          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Quick Stock Setter */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: '#f8f5f0',
                              padding: '0.3rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #dcd3c5'
                            }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#5c3a21' }}>Stock:</span>
                              <input
                                type="number"
                                min="0"
                                max="9999"
                                defaultValue={currentStock}
                                key={`${s.id}-${currentStock}`}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val !== currentStock) {
                                    handleUpdateStockQuantity(s, val);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val)) {
                                      handleUpdateStockQuantity(s, val);
                                    }
                                  }
                                }}
                                style={{
                                  width: '56px',
                                  padding: '0.25rem 0.35rem',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  borderRadius: '4px',
                                  border: '1px solid #bda893',
                                  textAlign: 'center'
                                }}
                                title="Type new stock number and press Enter to save"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateStockQuantity(s, currentStock + 10)}
                                disabled={isToggling}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #bda893',
                                  borderRadius: '4px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: '0.25rem 0.4rem',
                                  color: '#2e7d32'
                                }}
                                title="Add +10 sarees to vault"
                              >
                                +10
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateStockQuantity(s, 50)}
                                disabled={isToggling}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #bda893',
                                  borderRadius: '4px',
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  padding: '0.25rem 0.4rem',
                                  color: '#1565c0'
                                }}
                                title="Reset vault stock to 50 sarees"
                              >
                                Set 50
                              </button>
                            </div>

                            <button
                              type="button"
                              className="btn-outline-gold"
                              disabled={isToggling}
                              onClick={() => handleToggleStock(s)}
                              style={{
                                padding: '0.45rem 0.85rem',
                                fontSize: '0.82rem',
                                background: isOutOfStock ? '#e8f5e9' : '#fff3e0',
                                color: isOutOfStock ? '#2e7d32' : '#e65100',
                                borderColor: isOutOfStock ? '#81c784' : '#ffb74d'
                              }}
                              title="Click to toggle stock status"
                            >
                              {isToggling ? 'Updating...' : (isOutOfStock ? '🟢 Restock (50)' : '🔴 Mark Out of Stock (0)')}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEditSaree(s)}
                              style={{
                                background: 'linear-gradient(135deg, #800020 0%, #9e1b32 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.45rem 0.95rem',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                boxShadow: '0 2px 6px rgba(128, 0, 32, 0.25)'
                              }}
                              title="Edit saree name, price, stock, weave & specifications"
                            >
                              ✏️ Update Saree
                            </button>

                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteSaree(s)}
                              style={{
                                background: '#ffebee',
                                border: '1px solid #ef5350',
                                color: '#c62828',
                                padding: '0.45rem 0.85rem',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                              title="Permanently remove saree from store"
                            >
                              {isDeleting ? 'Deleting...' : '🗑️ Delete'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : activeTab === 'dupatta-inventory' ? (
              /* TAB: Dupatta Inventory & Stock Management */
              <div className="admin-inventory-section">
                {/* Inventory Toolbar */}
                <div className="admin-toolbar" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                  <div className="admin-search-wrapper" style={{ flex: 1, minWidth: '240px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search dupattas by title, weave, or motif..."
                      value={dupattaSearchQuery}
                      onChange={(e) => setDupattaSearchQuery(e.target.value)}
                    />
                  </div>
                  <div style={{ minWidth: '220px' }}>
                    <select
                      className="form-input"
                      value={dupattaCategoryFilter}
                      onChange={(e) => setDupattaCategoryFilter(e.target.value)}
                      style={{ padding: '0.65rem 0.8rem', background: '#fff', border: '1.5px solid #d4af37', fontWeight: 600, color: '#4a0011' }}
                    >
                      <option value="all">✦ All Dupatta Categories ({dupattaItems.length})</option>
                      <option value="double-dupatta">Double Ikat Dupatta</option>
                      <option value="single-dupatta">Single Ikat Dupatta</option>
                      <option value="semi-dupatta">Semi Patola Dupatta</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    <button className="btn-outline-gold" onClick={loadSarees} disabled={loadingSarees} style={{ padding: '0.6rem 1rem' }}>
                      {loadingSarees ? 'Refreshing...' : '🔄 Refresh Dupattas'}
                    </button>
                    <button
                      className="btn-primary-gold"
                      onClick={() => setActiveTab('upload-dupatta')}
                      style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
                    >
                      ➕ Add Dupatta
                    </button>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="admin-metrics-grid" style={{ marginBottom: '1.5rem' }}>
                  <div className="admin-metric-card">
                    <span className="metric-label">Total Dupatta Designs</span>
                    <span className="metric-value gold">{dupattaItems.length}</span>
                  </div>
                  <div className="admin-metric-card">
                    <span className="metric-label">🟢 Ready in Vault (Total Pieces)</span>
                    <span className="metric-value delivered">{dupattaTotalVaultPieces} Dupattas ({dupattaInStockCount} Designs)</span>
                  </div>
                  <div className="admin-metric-card">
                    <span className="metric-label">🔴 Out of Stock (0 remaining)</span>
                    <span className="metric-value" style={{ color: '#d32f2f' }}>{dupattaOutOfStockCount} Designs</span>
                  </div>
                </div>

                {/* Dupatta List / Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filteredDupattas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: '#faf8f5', borderRadius: '8px', border: '1px dashed #d4af37' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧣</div>
                      <h4 style={{ color: '#800020', margin: '0.2rem 0' }}>No Dupattas Found</h4>
                      <p style={{ color: '#666', fontSize: '0.9rem', maxWidth: '420px', margin: '0.4rem auto 1rem auto' }}>
                        {dupattaSearchQuery || dupattaCategoryFilter !== 'all'
                          ? `No dupattas matching "${dupattaSearchQuery}" in ${getCategoryLabel(dupattaCategoryFilter)}.`
                          : 'You have not uploaded any Patola Dupattas yet. Click "Add Dupatta" above to add your first handcrafted dupatta design.'}
                      </p>
                      <button
                        type="button"
                        className="btn-primary-gold"
                        onClick={() => setActiveTab('upload-dupatta')}
                        style={{ padding: '0.6rem 1.4rem' }}
                      >
                        ➕ Upload First Dupatta
                      </button>
                    </div>
                  ) : (
                    filteredDupattas.map(d => {
                      const isDeleting = deletingSareeId === d.id;
                      const isToggling = togglingStockId === d.id;
                      const currentStock = typeof d.stockQuantity === 'number' ? d.stockQuantity : 50;
                      const isOutOfStock = !!d.isOutOfStock || currentStock <= 0;

                      return (
                        <div
                          key={d.id}
                          id={`admin-dupatta-${d.id}`}
                          style={{
                            display: 'flex',
                            gap: '1.2rem',
                            alignItems: 'center',
                            background: '#ffffff',
                            border: isOutOfStock ? '1.5px solid #ffcdd2' : '1px solid #e0d5c3',
                            borderRadius: '8px',
                            padding: '1rem 1.2rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            flexWrap: 'wrap'
                          }}
                        >
                          {/* Dupatta Thumbnail */}
                          <img
                            src={d.image || (Array.isArray(d.images) && d.images[0]) || '/assets/images/saree_nari_kunjar.jpg'}
                            alt={d.title}
                            style={{
                              width: '70px',
                              height: '90px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1.5px solid #d4af37',
                              opacity: isOutOfStock ? 0.75 : 1
                            }}
                          />

                          {/* Dupatta Info */}
                          <div style={{ flex: 1, minWidth: '220px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                              <h4 style={{ margin: 0, fontSize: '1rem', color: '#800020' }}>{d.title}</h4>
                              <span style={{
                                background: '#fdf7ee',
                                color: '#800020',
                                border: '1px solid #d4af37',
                                padding: '0.15rem 0.55rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                🧣 {getCategoryLabel(d.category)}
                              </span>
                              {d.motif && (
                                <span style={{
                                  background: '#f0fdf4',
                                  color: '#166534',
                                  border: '1px solid #bbf7d0',
                                  padding: '0.15rem 0.55rem',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700
                                }}>
                                  🎨 {d.motifName || d.motif}
                                </span>
                              )}
                              <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600 }}>
                                #DPT-{d.id}
                              </span>
                            </div>

                            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#555' }}>
                              Weave: <strong>{d.weave || 'Double Ikat Dupatta'}</strong> • Fabric: <strong>{d.fabric || '100% Pure Mulberry Silk'}</strong> • Length: <strong>{d.length || '2.50m'}</strong>
                            </p>

                            {/* Price & Discount Section */}
                            {(() => {
                              const dDiscountPercentNum = Number(d.discountPercent) || 0;
                              const dBasePrice = Number(d.basePriceINR) || 0;
                              const dFinalPrice = dDiscountPercentNum > 0
                                ? (Number(d.finalPriceINR) || Math.round(dBasePrice - (dBasePrice * dDiscountPercentNum / 100)))
                                : (Number(d.finalPriceINR) > 0 && Number(d.finalPriceINR) < dBasePrice ? Number(d.finalPriceINR) : dBasePrice);
                              const dHasDiscount = dDiscountPercentNum > 0 || (dFinalPrice > 0 && dFinalPrice < dBasePrice);
                              const dEffectiveDiscountPercent = dDiscountPercentNum > 0
                                ? dDiscountPercentNum
                                : (dBasePrice > 0 ? Math.round(((dBasePrice - dFinalPrice) / dBasePrice) * 100) : 0);
                              const dSavedAmount = Math.max(0, dBasePrice - dFinalPrice);

                              return (
                                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                                  {dHasDiscount ? (
                                    <>
                                      <span style={{ fontSize: '1.05rem', color: '#15803d', fontWeight: 800 }}>
                                        ₹{dFinalPrice.toLocaleString('en-IN')}
                                      </span>
                                      <span style={{ textDecoration: 'line-through', color: '#888', fontSize: '0.88rem', fontWeight: 500 }}>
                                        ₹{dBasePrice.toLocaleString('en-IN')}
                                      </span>
                                      <span style={{
                                        background: '#fee2e2',
                                        color: '#dc2626',
                                        border: '1px solid #fca5a5',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800
                                      }}>
                                        🏷️ {dEffectiveDiscountPercent}% OFF (Save ₹{dSavedAmount.toLocaleString('en-IN')})
                                      </span>
                                      <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                        (≈ ${Math.round(dFinalPrice * 0.012)} / €{Math.round(dFinalPrice * 0.011)})
                                      </span>
                                      <span style={{
                                        background: '#ecfdf5',
                                        color: '#065f46',
                                        border: '1.5px solid #34d399',
                                        padding: '0.18rem 0.55rem',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem',
                                        fontWeight: 800,
                                        boxShadow: '0 1px 3px rgba(16, 185, 129, 0.2)'
                                      }}>
                                        💰 Discount Price: ₹{dFinalPrice.toLocaleString('en-IN')}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span style={{ fontWeight: 800, color: '#800020', fontSize: '1.05rem' }}>
                                        ₹{dBasePrice.toLocaleString('en-IN')}
                                      </span>
                                      <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                        (≈ ${Math.round(dBasePrice * 0.012)} / €{Math.round(dBasePrice * 0.011)})
                                      </span>
                                      <span style={{
                                        background: '#f8fafc',
                                        color: '#64748b',
                                        border: '1px solid #cbd5e1',
                                        padding: '0.18rem 0.55rem',
                                        borderRadius: '4px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600
                                      }}>
                                        🏷️ Discount Price: ₹{dBasePrice.toLocaleString('en-IN')} (0% OFF)
                                      </span>
                                    </>
                                  )}

                                  {/* Quick Set Discount Dropdown */}
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginLeft: '0.2rem' }}>
                                    <span style={{ fontSize: '0.74rem', color: '#555', fontWeight: 600 }}>Set Discount:</span>
                                    <select
                                      value={dEffectiveDiscountPercent}
                                      onChange={(e) => handleUpdateDiscount(d, e.target.value)}
                                      style={{
                                        padding: '0.15rem 0.4rem',
                                        fontSize: '0.76rem',
                                        fontWeight: 700,
                                        borderRadius: '4px',
                                        border: '1px solid #d4af37',
                                        background: '#fff',
                                        color: dEffectiveDiscountPercent > 0 ? '#b91c1c' : '#333',
                                        cursor: 'pointer'
                                      }}
                                      title="Quickly change discount for this Dupatta"
                                    >
                                      <option value="0">0% (None)</option>
                                      <option value="5">5% OFF</option>
                                      <option value="10">10% OFF</option>
                                      <option value="15">15% OFF</option>
                                      <option value="20">20% OFF</option>
                                      <option value="25">25% OFF</option>
                                      <option value="30">30% OFF</option>
                                      <option value="40">40% OFF</option>
                                      <option value="50">50% OFF</option>
                                    </select>
                                  </div>

                                  <span style={{
                                    background: isOutOfStock ? '#fee2e2' : '#e6f4ea',
                                    color: isOutOfStock ? '#d32f2f' : '#137333',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700
                                  }}>
                                    {isOutOfStock ? '🔴 Out of Stock (0 remaining)' : `🟢 In Vault (${currentStock} pieces)`}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Stock input & quick adjuster */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: '#f8f5f0',
                              padding: '0.3rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #dcd3c5'
                            }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#5c3a21' }}>Stock:</span>
                              <input
                                type="number"
                                min="0"
                                max="9999"
                                defaultValue={currentStock}
                                key={`${d.id}-${currentStock}`}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val !== currentStock) {
                                    handleUpdateDupattaStockQuantity(d, val);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val)) {
                                      handleUpdateDupattaStockQuantity(d, val);
                                    }
                                  }
                                }}
                                style={{
                                  width: '56px',
                                  padding: '0.25rem 0.35rem',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  borderRadius: '4px',
                                  border: '1px solid #bda893',
                                  textAlign: 'center'
                                }}
                                title="Type new stock number and press Enter to save"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateDupattaStockQuantity(d, currentStock + 10)}
                                disabled={isToggling}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #bda893',
                                  borderRadius: '4px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: '0.25rem 0.4rem',
                                  color: '#2e7d32'
                                }}
                                title="Add +10 dupattas to vault"
                              >
                                +10
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateDupattaStockQuantity(d, 50)}
                                disabled={isToggling}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #bda893',
                                  borderRadius: '4px',
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  padding: '0.25rem 0.4rem',
                                  color: '#1565c0'
                                }}
                                title="Reset vault stock to 50 dupattas"
                              >
                                Set 50
                              </button>
                            </div>

                            <button
                              type="button"
                              className="btn-outline-gold"
                              disabled={isToggling}
                              onClick={() => handleToggleDupattaStock(d)}
                              style={{
                                padding: '0.45rem 0.85rem',
                                fontSize: '0.82rem',
                                background: isOutOfStock ? '#e8f5e9' : '#fff3e0',
                                color: isOutOfStock ? '#2e7d32' : '#e65100',
                                borderColor: isOutOfStock ? '#81c784' : '#ffb74d'
                              }}
                              title="Click to toggle stock status"
                            >
                              {isToggling ? 'Updating...' : (isOutOfStock ? '🟢 Restock (50)' : '🔴 Mark Out of Stock (0)')}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEditDupatta(d)}
                              style={{
                                background: 'linear-gradient(135deg, #800020 0%, #9e1b32 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.45rem 0.95rem',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                boxShadow: '0 2px 6px rgba(128, 0, 32, 0.25)'
                              }}
                              title="Edit dupatta name, price, stock, weave & specifications"
                            >
                              ✏️ Update Dupatta
                            </button>

                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteDupatta(d)}
                              style={{
                                background: '#ffebee',
                                border: '1px solid #ef5350',
                                color: '#c62828',
                                padding: '0.45rem 0.85rem',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                              title="Permanently remove dupatta from store"
                            >
                              {isDeleting ? 'Deleting...' : '🗑️ Delete'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : activeTab === 'visits' ? (
              /* TAB 3: Book Loom Visits & Consultations */
              <div className="admin-visits-section">
                {/* Custom Loom Orders Notice Banner */}
                {customOrders.length > 0 && (
                  <div style={{
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    border: '1.5px solid #f59e0b',
                    borderRadius: '10px',
                    padding: '0.85rem 1.2rem',
                    marginBottom: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    boxShadow: '0 2px 8px rgba(245,158,11,0.12)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <span style={{ fontSize: '1.7rem' }}>🧵</span>
                      <div>
                        <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.95rem' }}>
                          તમે ઉમેરેલા {customOrders.length} કસ્ટમ લૂમ વિવિંગ ઓર્ડર્સ "✨ Custom Orders" ટેબમાં છે!
                        </div>
                        <div style={{ fontSize: '0.83rem', color: '#78350f', marginTop: '2px' }}>
                          {customOrders.map(c => `#CST-${c.id} (${c.fullName} - ${c.phone})`).join(', ')} | અહીં જોવા માટે [બધા લૂમ ઓર્ડર અહીં જુઓ] ક્લિક કરો:
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setBookingTypeFilter('all-everything');
                          setBookingStatusFilter('all');
                          setVisitViewMode('all');
                        }}
                        style={{
                          background: '#ffffff',
                          color: '#92400e',
                          border: '1.5px solid #f59e0b',
                          padding: '0.45rem 0.9rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        👁️ બધા લૂમ ઓર્ડર અહીં જુઓ ({bookings.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('custom-orders')}
                        style={{
                          background: '#800020',
                          color: '#d4af37',
                          border: 'none',
                          padding: '0.45rem 1rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          boxShadow: '0 2px 5px rgba(128,0,32,0.3)'
                        }}
                      >
                        ✨ Custom Orders ટેબ ખોલો ({customOrders.length}) →
                      </button>
                    </div>
                  </div>
                )}

                {/* Visits Toolbar */}
                <div className="admin-toolbar" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                  <div className="admin-search-wrapper" style={{ flex: 1, minWidth: '260px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search bookings by Name, Phone, Email, Motif, Notes..."
                      value={bookingSearchQuery}
                      onChange={(e) => setBookingSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Filter by Type */}
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      className="form-select"
                      value={bookingTypeFilter}
                      onChange={(e) => setBookingTypeFilter(e.target.value)}
                      style={{ padding: '0.6rem 1rem', fontSize: '0.88rem', minWidth: '170px' }}
                    >
                      <option value="all">🏛️ All Studio & Video Visits ({visitBookingsList.length})</option>
                      {customOrders.length > 0 && (
                        <option value="custom-loom">🧵 Custom Loom Weaving ({customOrders.length})</option>
                      )}
                      <option value="all-everything">🌟 All Appointments & Loom Orders ({bookings.length})</option>
                      <option value="studio">🏛️ Loom Studio Visit (In-Person)</option>
                      <option value="video">💻 Virtual Video Call</option>
                      <option value="bridal">👑 Bridal / Bespoke Curation</option>
                    </select>

                    <button
                      className="btn-outline-gold"
                      onClick={loadBookings}
                      disabled={loadingBookings}
                      style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      {loadingBookings ? 'Refreshing...' : '🔄 Refresh Visits'}
                    </button>
                  </div>
                </div>

                {/* Metrics Row (Clickable to switch view) */}
                <div className="admin-metrics-grid" style={{ marginBottom: '1.2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                  <div
                    className="admin-metric-card"
                    onClick={() => { setVisitViewMode('all'); setBookingStatusFilter('all'); }}
                    style={{
                      cursor: 'pointer',
                      border: visitViewMode === 'all' ? '2px solid #800020' : '1px solid #e8e0d5',
                      boxShadow: visitViewMode === 'all' ? '0 2px 8px rgba(128,0,32,0.15)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    title="Click to view all appointments"
                  >
                    <span className="metric-label">Total Appointments</span>
                    <span className="metric-value gold">{totalAppointmentsCount}</span>
                  </div>

                  <div
                    className="admin-metric-card"
                    onClick={() => { setVisitViewMode('active'); setBookingStatusFilter('active'); }}
                    style={{
                      cursor: 'pointer',
                      border: visitViewMode === 'active' ? '2px solid #2e7d32' : '1px solid #e8e0d5',
                      background: visitViewMode === 'active' ? '#f0fdf4' : '#faf8f5',
                      boxShadow: visitViewMode === 'active' ? '0 2px 8px rgba(46,125,50,0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    title="Click to view active visits only"
                  >
                    <span className="metric-label" style={{ color: '#2e7d32' }}>🟢 Active Visits</span>
                    <span className="metric-value" style={{ color: '#2e7d32' }}>{activeVisitsCount}</span>
                  </div>

                  <div
                    className="admin-metric-card"
                    onClick={() => { setVisitViewMode('completed'); setBookingStatusFilter('completed'); }}
                    style={{
                      cursor: 'pointer',
                      background: visitViewMode === 'completed' ? '#dcfce7' : '#f0fdf4',
                      border: visitViewMode === 'completed' ? '2px solid #15803d' : '1px solid #86efac',
                      boxShadow: visitViewMode === 'completed' ? '0 2px 8px rgba(21,128,61,0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    title="Click to view all completed visits"
                  >
                    <span className="metric-label" style={{ color: '#166534', fontWeight: 700 }}>🏆 Completed Visits</span>
                    <span className="metric-value" style={{ color: '#15803d' }}>{completedVisitsCount}</span>
                  </div>

                  <div
                    className="admin-metric-card"
                    onClick={() => { setVisitViewMode('cancelled'); setBookingStatusFilter('Cancelled'); }}
                    style={{
                      cursor: 'pointer',
                      background: visitViewMode === 'cancelled' ? '#fee2e2' : '#fff5f5',
                      border: visitViewMode === 'cancelled' ? '2px solid #dc2626' : '1px solid #fecaca',
                      boxShadow: visitViewMode === 'cancelled' ? '0 2px 8px rgba(220,38,38,0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    title="Click to view cancelled appointments"
                  >
                    <span className="metric-label" style={{ color: '#b91c1c', fontWeight: 700 }}>❌ Cancelled Visits</span>
                    <span className="metric-value" style={{ color: '#dc2626' }}>{cancelledVisitsCount}</span>
                  </div>

                  <div className="admin-metric-card">
                    <span className="metric-label">🏛️ Loom Studio Visits</span>
                    <span className="metric-value delivered">{studioVisitCount}</span>
                  </div>

                  <div className="admin-metric-card">
                    <span className="metric-label">💻 Video Calls</span>
                    <span className="metric-value in-transit">{videoCallCount}</span>
                  </div>
                </div>

                {/* View Mode Switcher Filter Pills */}
                <div style={{
                  display: 'flex',
                  gap: '0.6rem',
                  marginBottom: '1.2rem',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  background: '#faf8f5',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid #e2d7c7'
                }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#666', marginRight: '0.4rem' }}>
                    View List:
                  </span>

                  <button
                    type="button"
                    onClick={() => { setVisitViewMode('active'); setBookingStatusFilter('active'); }}
                    style={{
                      background: visitViewMode === 'active' ? '#800020' : '#ffffff',
                      color: visitViewMode === 'active' ? '#d4af37' : '#374151',
                      border: visitViewMode === 'active' ? '2px solid #800020' : '1px solid #d1d5db',
                      padding: '0.45rem 1.1rem',
                      borderRadius: '20px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: visitViewMode === 'active' ? '0 2px 8px rgba(128,0,32,0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🟢 Active Visits ({activeVisitsCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => { setVisitViewMode('completed'); setBookingStatusFilter('completed'); }}
                    style={{
                      background: visitViewMode === 'completed' ? '#15803d' : '#ffffff',
                      color: visitViewMode === 'completed' ? '#ffffff' : '#166534',
                      border: visitViewMode === 'completed' ? '2px solid #15803d' : '1px solid #86efac',
                      padding: '0.45rem 1.1rem',
                      borderRadius: '20px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: visitViewMode === 'completed' ? '0 2px 8px rgba(21,128,61,0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    title="Click to view all completed and archived visits"
                  >
                    🏆 Completed Visits ({completedVisitsCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => { setVisitViewMode('cancelled'); setBookingStatusFilter('Cancelled'); }}
                    style={{
                      background: visitViewMode === 'cancelled' ? '#dc2626' : '#ffffff',
                      color: visitViewMode === 'cancelled' ? '#ffffff' : '#b91c1c',
                      border: visitViewMode === 'cancelled' ? '2px solid #dc2626' : '1px solid #fca5a5',
                      padding: '0.45rem 1.1rem',
                      borderRadius: '20px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: visitViewMode === 'cancelled' ? '0 2px 8px rgba(220,38,38,0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    title="Click to view all cancelled appointments"
                  >
                    ❌ Cancelled ({cancelledVisitsCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => { setVisitViewMode('all'); setBookingStatusFilter('all'); }}
                    style={{
                      background: visitViewMode === 'all' ? '#1f2937' : '#ffffff',
                      color: visitViewMode === 'all' ? '#ffffff' : '#4b5563',
                      border: visitViewMode === 'all' ? '2px solid #1f2937' : '1px solid #d1d5db',
                      padding: '0.45rem 1rem',
                      borderRadius: '20px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: visitViewMode === 'all' ? '0 2px 8px rgba(31,41,55,0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    📋 All ({totalAppointmentsCount})
                  </button>
                </div>

                {/* Active / Completed / Cancelled Context Indicator Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.9rem',
                  marginBottom: '0.8rem',
                  borderRadius: '8px',
                  background: visitViewMode === 'active' ? '#f0fdf4' : (visitViewMode === 'completed' ? '#dcfce7' : (visitViewMode === 'cancelled' ? '#fee2e2' : '#faf8f5')),
                  border: visitViewMode === 'active' ? '1px solid #bbf7d0' : (visitViewMode === 'completed' ? '1px solid #86efac' : (visitViewMode === 'cancelled' ? '1px solid #fca5a5' : '1px solid #e5e7eb')),
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>
                      {visitViewMode === 'active' ? '🟢' : (visitViewMode === 'completed' ? '🏆' : (visitViewMode === 'cancelled' ? '❌' : '📋'))}
                    </span>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      color: visitViewMode === 'active' ? '#166534' : (visitViewMode === 'completed' ? '#15803d' : (visitViewMode === 'cancelled' ? '#991b1b' : '#374151'))
                    }}>
                      {visitViewMode === 'active' && `Showing Active Visits (${filteredBookings.length}) — Only ongoing visits are shown.`}
                      {visitViewMode === 'completed' && `Showing Completed Visits (${filteredBookings.length}) — Finished appointments.`}
                      {visitViewMode === 'cancelled' && `Showing Cancelled Visits (${filteredBookings.length}) — Cancelled appointments.`}
                      {visitViewMode === 'all' && `Showing All Appointments (${filteredBookings.length})`}
                    </span>
                  </div>

                  {visitViewMode !== 'active' && (
                    <button
                      type="button"
                      onClick={() => { setVisitViewMode('active'); setBookingStatusFilter('active'); }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #2e7d32',
                        color: '#166534',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                      }}
                    >
                      ← Back to Active Visits
                    </button>
                  )}
                </div>

                {/* Visit Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filteredBookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3.5rem 2rem', background: '#faf8f5', borderRadius: '8px', border: '1px dashed #d8caa7' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏛️</div>
                      <h4 style={{ color: '#800020', margin: '0.2rem 0' }}>No Visit Bookings Found</h4>
                      <p style={{ color: '#666', fontSize: '0.9rem', maxWidth: '420px', margin: '0.4rem auto 1rem auto' }}>
                        {bookingSearchQuery || bookingTypeFilter !== 'all' || bookingStatusFilter !== 'all'
                          ? 'Try clearing or changing your filters to view more appointments.'
                          : 'When visitors schedule Loom Studio visits or Video calls, their requests appear here with live SQL sync.'}
                      </p>
                      {(bookingSearchQuery || bookingTypeFilter !== 'all' || bookingStatusFilter !== 'all' || visitViewMode !== 'all') && (
                        <button
                          type="button"
                          className="btn-outline-gold"
                          onClick={() => {
                            setBookingSearchQuery('');
                            setBookingTypeFilter('all');
                            setBookingStatusFilter('all');
                            setVisitViewMode('all');
                          }}
                          style={{ padding: '0.5rem 1rem' }}
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredBookings.map(b => {
                      const isUpdating = updatingBookingId === b.id;
                      const isDeleting = deletingBookingId === b.id;

                      const expType = b.experienceType || 'Virtual Video Call';
                      const isCustomLoom = expType.toLowerCase().includes('custom') || expType.toLowerCase().includes('bespoke') || (b.notes && b.notes.includes('[BESPOKE'));
                      const isStudio = !isCustomLoom && (expType.toLowerCase().includes('studio') || expType.toLowerCase().includes('loom') || expType.toLowerCase().includes('visit'));
                      const isVideo = !isCustomLoom && (expType.toLowerCase().includes('video') || expType.toLowerCase().includes('virtual'));
                      const isBridal = !isCustomLoom && expType.toLowerCase().includes('bridal');

                      const typePillClass = isCustomLoom ? 'custom' : (isStudio ? 'studio' : (isBridal ? 'bridal' : 'video'));
                      const typeIcon = isCustomLoom ? '🧵' : (isStudio ? '🏛️' : (isBridal ? '👑' : '💻'));
                      const typeLabel = isCustomLoom ? 'Custom Loom Weaving (2-4 Months)' : (isStudio ? 'In-Person Loom Studio Visit' : (isBridal ? 'Bridal Trousseau Curation' : 'Virtual Video Loom Tour'));

                      const statusVal = b.status || 'Pending';
                      const statusClass = statusVal.toLowerCase();

                      const cleanPhone = (b.phone || '').replace(/[^0-9]/g, '');
                      const waPhone = cleanPhone.length === 10 ? ('91' + cleanPhone) : cleanPhone;
                      const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(`Namaste ${b.fullName || 'Patron'}, this is PATOLA MADE VANKAR. Regarding your royal loom appointment scheduled for ${b.preferredDate ? formatDateDDMMYYYY(b.preferredDate) : 'upcoming date'}...`)}`;

                      let dateDisplay = 'Not Specified';
                      if (b.preferredDate) {
                        dateDisplay = formatDateDDMMYYYY(b.preferredDate, 'Not Specified');
                      }

                      let createdDisplay = 'Recently';
                      if (b.createdAt) {
                        createdDisplay = formatDateDDMMYYYY(b.createdAt, 'Recently');
                      }

                      const isCardCancelled = isBookingCancelled(b);
                      const isCardCompleted = isBookingCompleted(b);
                      const isCardConfirmed = (statusVal || '').toLowerCase() === 'confirmed' && !isCardCancelled && !isCardCompleted;
                      const isCardPending = !isCardConfirmed && !isCardCancelled && !isCardCompleted;

                      return (
                        <div
                          key={b.id}
                          className={`admin-visit-card ${isCardCancelled ? 'visit-card-cancelled' : ''}`}
                          style={{
                            border: isCardCancelled ? '2px solid #ef4444' : (isCardCompleted ? '1.5px solid #86efac' : '1px solid #ecdcc8'),
                            background: isCardCancelled ? '#fff8f8' : (isCardCompleted ? '#f0fdf4' : '#ffffff'),
                            position: 'relative'
                          }}
                        >
                          {/* Card Header */}
                          <div className="admin-visit-header">
                            <div className="visit-badge-group">
                              <span className={`visit-type-pill ${typePillClass}`}>
                                <span>{typeIcon}</span>
                                <span>{typeLabel}</span>
                              </span>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#777' }}>
                                #{String(b.id || '').startsWith('BK-') ? b.id : `BK-${b.id}`}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#888' }}>
                                • Received: {createdDisplay}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span className={`visit-status-badge ${isCardCancelled ? 'cancelled' : (isCardCompleted ? 'completed' : statusClass)}`}>
                                {isCardConfirmed && '🟢 CONFIRMED'}
                                {isCardPending && '⏳ PENDING'}
                                {isCardCompleted && '🏆 COMPLETED'}
                                {isCardCancelled && '❌ CANCELLED'}
                              </span>
                            </div>
                          </div>

                          {/* Cancellation Alert Banner */}
                          {isCardCancelled && (
                            <div style={{
                              background: '#fee2e2',
                              border: '1.5px solid #ef4444',
                              borderRadius: '8px',
                              padding: '0.75rem 1rem',
                              marginTop: '0.75rem',
                              marginBottom: '0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.6rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                                <span style={{ fontSize: '1.45rem' }}>🚫</span>
                                <div>
                                  <div style={{ color: '#991b1b', fontWeight: 800, fontSize: '0.92rem' }}>
                                    Loom Visit Appointment CANCELLED
                                  </div>
                                  <div style={{ color: '#b91c1c', fontSize: '0.8rem', marginTop: '2px' }}>
                                    This appointment is marked as Cancelled. The patron/client is not scheduled for this time slot.
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <a
                                  href={getWhatsAppVisitCancellationUrl(b)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    background: '#25d366',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.4rem 0.95rem',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    textDecoration: 'none',
                                    boxShadow: '0 2px 5px rgba(37,211,102,0.3)'
                                  }}
                                  title="Send Cancellation Apology message to client on WhatsApp"
                                >
                                  💬 Send Apology (WhatsApp)
                                </a>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateBookingStatus(b.id, 'Confirmed')}
                                style={{
                                  background: '#16a34a',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '0.4rem 0.95rem',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  fontSize: '0.82rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  boxShadow: '0 2px 5px rgba(22,163,74,0.25)'
                                }}
                                title="Restore this cancelled appointment back to Confirmed"
                              >
                                ↩️ Re-activate / Restore
                              </button>
                            </div>
                          </div>
                        )}

                          {/* Details Grid */}
                          <div className="visit-grid-details">
                            {/* Client Column */}
                            <div className="visit-detail-col">
                              <span className="label">Client / Patron</span>
                              <div className="client-name">{b.fullName || 'Valued Patron'}</div>
                              <div className="visit-contact-row">
                                {cleanPhone && (
                                  <>
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="visit-action-chip whatsapp"
                                      title="Chat on WhatsApp"
                                    >
                                      💬 WhatsApp ({b.phone})
                                    </a>
                                    <a
                                      href={`tel:${b.phone}`}
                                      className="visit-action-chip call"
                                      title="Call Client"
                                    >
                                      📞 Call
                                    </a>
                                  </>
                                )}
                                {b.email && (
                                  <a
                                    href={`mailto:${b.email}`}
                                    className="visit-action-chip email"
                                    title="Send Email"
                                  >
                                    ✉️ {b.email}
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Scheduled Date Column */}
                            <div className="visit-detail-col">
                              <span className="label">Scheduled Appointment Date</span>
                              <div>
                                <div className="visit-date-box">
                                  <span>🗓️</span>
                                  <span>{dateDisplay}</span>
                                </div>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '0.2rem' }}>
                                {isStudio ? '📍 Heritage Loom Studio, Gujarat' : '🌐 1-on-1 Virtual Video Loom Tour'}
                              </div>
                            </div>

                            {/* Motif Preference Column */}
                            <div className="visit-detail-col">
                              <span className="label">Design / Motif Preference</span>
                              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
                                🎨 {b.motifPreference || 'Nari Kunjar (Elephant & Maiden)'}
                              </div>
                              <span style={{ fontSize: '0.76rem', color: '#888' }}>
                                100% Pure Mulberry Silk Handloom
                              </span>
                            </div>
                          </div>

                          {/* Notes / Special Requests Box */}
                          {b.notes && (
                            <div className="visit-notes-parchment">
                              <strong style={{ color: '#800020' }}>💬 Patron Notes / Special Requests: </strong>
                              <span>"{b.notes}"</span>
                            </div>
                          )}

                          {/* Footer Toolbar */}
                          <div className="visit-footer-toolbar" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.8rem',
                            borderTop: '1px solid #f0e6d6',
                            paddingTop: '0.8rem',
                            marginTop: '0.6rem'
                          }}>
                            <div className="visit-status-selector" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.78rem', color: '#666', fontWeight: 600 }}>Action:</span>
                              {isCardCompleted ? (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateBookingStatus(b.id, 'Confirmed')}
                                  className="visit-status-btn"
                                  style={{
                                    fontWeight: 700,
                                    background: '#f0fdf4',
                                    borderColor: '#16a34a',
                                    color: '#15803d',
                                    padding: '0.4rem 0.9rem',
                                    boxShadow: '0 1px 3px rgba(22,163,74,0.15)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                  }}
                                  title="Restore this completed visit back to Active visits list"
                                >
                                  ↩️ Restore to Active
                                </button>
                              ) : isCardCancelled ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateBookingStatus(b.id, 'Confirmed')}
                                    className="visit-status-btn"
                                    style={{
                                      background: '#f0fdf4',
                                      borderColor: '#16a34a',
                                      color: '#15803d',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      padding: '0.4rem 0.9rem'
                                    }}
                                    title="Uncancel and restore appointment back to Active visits"
                                  >
                                    ↩️ Restore to Active
                                  </button>
                                  <a
                                    href={getWhatsAppVisitCancellationUrl(b)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      background: '#25d366',
                                      color: '#ffffff',
                                      border: 'none',
                                      padding: '0.4rem 0.85rem',
                                      borderRadius: '6px',
                                      fontWeight: 700,
                                      fontSize: '0.82rem',
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      boxShadow: '0 2px 5px rgba(37,211,102,0.25)',
                                      cursor: 'pointer'
                                    }}
                                    title="Send Cancellation Apology message to client on WhatsApp"
                                  >
                                    💬 Send Apology WhatsApp
                                  </a>
                                </div>
                              ) : (
                                <>
                                  {statusVal !== 'Confirmed' && (
                                    <button
                                      type="button"
                                      disabled={isUpdating}
                                      onClick={() => handleUpdateBookingStatus(b.id, 'Confirmed')}
                                      className="visit-status-btn active-confirmed"
                                      style={{ padding: '0.4rem 0.85rem' }}
                                      title="Mark as Confirmed"
                                    >
                                      🟢 Confirm
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateBookingStatus(b.id, 'Completed')}
                                    className="visit-status-btn"
                                    style={{
                                      background: '#dcfce7',
                                      borderColor: '#16a34a',
                                      color: '#15803d',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      padding: '0.4rem 0.9rem',
                                      boxShadow: '0 1px 4px rgba(22,163,74,0.2)'
                                    }}
                                    title="Mark visit as Completed — hides from active list into Completed Visits"
                                  >
                                    🏆 Complete Visit
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleCancelBookingWithApology(b)}
                                    className="visit-status-btn"
                                    style={{
                                      background: '#fee2e2',
                                      borderColor: '#ef4444',
                                      color: '#b91c1c',
                                      fontWeight: 700,
                                      padding: '0.4rem 0.85rem'
                                    }}
                                    title="Cancel this visit — hides from active list into Cancelled Visits"
                                  >
                                    ❌ Cancel Visit
                                  </button>
                                </>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              {cleanPhone && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-outline-gold"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                  💬 WhatsApp Client
                                </a>
                              )}
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleDeleteBooking(b)}
                                style={{
                                  background: '#ffebee',
                                  border: '1px solid #ef5350',
                                  color: '#c62828',
                                  padding: '0.4rem 0.75rem',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer'
                                }}
                                title="Remove this booking record"
                              >
                                {isDeleting ? 'Removing...' : '🗑️ Remove'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : activeTab === 'upload-dupatta' ? (
              /* TAB: Upload New Dupatta Form or Update Dupatta Form */
              editingDupatta && editDupattaForm ? (
                <div className="admin-upload-saree-container" style={{ background: '#faf8f5', border: '1.5px solid #d4af37', borderRadius: '10px', padding: '1.8rem', boxShadow: '0 4px 16px rgba(128, 0, 32, 0.08)' }}>
                  {/* Top Editing Mode Notice Banner */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(128, 0, 32, 0.09), rgba(212, 175, 55, 0.15))',
                    border: '1px solid #d4af37',
                    borderRadius: '8px',
                    padding: '0.9rem 1.2rem',
                    marginBottom: '1.4rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.8rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#800020', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>✏️</span>
                        <span>Editing Dupatta: <strong>{editDupattaForm.title}</strong> (ID: #{editDupattaForm.id})</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#666', marginTop: '3px' }}>
                        Update dupatta price, stock status, weave type, motif and 4 photos.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-outline-gold"
                        style={{ padding: '0.45rem 1rem', fontSize: '0.84rem', background: '#ffffff' }}
                        onClick={() => {
                          setEditingDupatta(null);
                          setEditDupattaForm(null);
                          setActiveTab('dupatta-inventory');
                        }}
                      >
                        ↩️ Cancel & Return to Dupatta Inventory
                      </button>
                      <button
                        type="button"
                        className="btn-outline-gold"
                        style={{ padding: '0.45rem 1rem', fontSize: '0.84rem', background: '#fdf7ee' }}
                        onClick={() => {
                          setEditingDupatta(null);
                          setEditDupattaForm(null);
                        }}
                      >
                        ➕ Switch to Add New Dupatta
                      </button>
                    </div>
                  </div>

                  <div style={{ borderBottom: '1px solid #e0d5c3', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                    <h3 style={{ margin: 0, color: '#800020', fontFamily: 'var(--font-royal)', fontSize: '1.35rem', fontWeight: 800 }}>
                      ✏️ Update Patola Dupatta Details
                    </h3>
                    <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                      Make changes below and click "Save & Update Dupatta". Updates will instantly reflect across the catalog and database.
                    </p>
                  </div>

                  <form onSubmit={handleSaveEditDupattaSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem' }}>
                      {/* Dupatta Title */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Dupatta Title / Design Name *</label>
                        <input
                          type="text"
                          className="form-input"
                          required
                          value={editDupattaForm.title}
                          onChange={(e) => setEditDupattaForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>

                      {/* Base Price in INR with Live Conversion Preview */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Price in Indian Rupees (₹ INR) *</label>
                        <input
                          type="number"
                          className="form-input"
                          required
                          min="1000"
                          value={editDupattaForm.basePriceINR}
                          onChange={(e) => setEditDupattaForm(prev => ({ ...prev, basePriceINR: e.target.value }))}
                        />
                      </div>

                      {/* Stock Quantity */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Vault Stock Quantity *</label>
                        <input
                          type="number"
                          className="form-input"
                          required
                          min="0"
                          max="9999"
                          value={editDupattaForm.stockQuantity}
                          onChange={(e) => setEditDupattaForm(prev => ({ ...prev, stockQuantity: e.target.value }))}
                        />
                        <span style={{ fontSize: '0.78rem', color: '#666' }}>
                          0 = Out of Stock. 1+ = In Stock for immediate booking.
                        </span>
                      </div>

                      {/* Discount Dropdown */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Discount *</label>
                        <select
                          className="form-input"
                          value={editDupattaForm.discountPercent || '0'}
                          onChange={(e) => setEditDupattaForm(prev => ({ ...prev, discountPercent: e.target.value }))}
                        >
                          <option value="0">No Discount</option>
                          <option value="5">5% OFF</option>
                          <option value="10">10% OFF</option>
                          <option value="15">15% OFF</option>
                          <option value="20">20% OFF</option>
                          <option value="25">25% OFF</option>
                          <option value="30">30% OFF</option>
                        </select>
                      </div>
                    </div>

                    {/* Auto-Currency Conversion Preview Box */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(128, 0, 32, 0.08))',
                      border: '1px solid #d4af37',
                      borderRadius: '8px',
                      padding: '0.8rem 1rem',
                      margin: '1.2rem 0'
                    }}>
                      <strong style={{ color: '#800020', fontSize: '0.85rem' }}>
                        🌍 Automatic Real-Time Currency Conversion Preview:
                      </strong>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem', marginTop: '0.4rem', fontSize: '0.88rem' }}>
                        <div>🇮🇳 India: <strong style={{ color: '#800020' }}>{editDupattaForm.basePriceINR ? '₹ ' + parseFloat(editDupattaForm.basePriceINR).toLocaleString('en-IN') : '₹ 0'}</strong></div>
                        <div>🇺🇸 USA / NRI: <strong style={{ color: '#2e7d32' }}>{editDupattaForm.basePriceINR ? '$ ' + Math.round(parseFloat(editDupattaForm.basePriceINR) * 0.012).toLocaleString('en-US') : '$ 0'}</strong></div>
                        <div>🇪🇺 Europe: <strong style={{ color: '#1565c0' }}>{editDupattaForm.basePriceINR ? '€ ' + Math.round(parseFloat(editDupattaForm.basePriceINR) * 0.011).toLocaleString('en-US') : '€ 0'}</strong></div>
                        <div>🇬🇧 UK: <strong style={{ color: '#6a1b9a' }}>{editDupattaForm.basePriceINR ? '£ ' + Math.round(parseFloat(editDupattaForm.basePriceINR) * 0.0095).toLocaleString('en-US') : '£ 0'}</strong></div>
                      </div>

                      {/* Live Discount Preview for Edit */}
                      {editDupattaForm.basePriceINR && parseFloat(editDupattaForm.basePriceINR) > 0 && (
                        <div style={{
                          background: '#fdf3f3',
                          border: '1px solid #e8c9c9',
                          borderRadius: '8px',
                          padding: '0.8rem 1rem',
                          marginTop: '0.8rem'
                        }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#800020' }}>
                            💰 Final Price Preview:
                          </span>
                          <div style={{ marginTop: '0.3rem', fontSize: '1rem' }}>
                            {Number(editDupattaForm.discountPercent) > 0 ? (
                              <>
                                <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '0.6rem' }}>
                                  ₹{parseFloat(editDupattaForm.basePriceINR).toLocaleString('en-IN')}
                                </span>
                                <span style={{ color: '#1a7a3c', fontWeight: 700 }}>
                                  ₹{Math.round(parseFloat(editDupattaForm.basePriceINR) - (parseFloat(editDupattaForm.basePriceINR) * Number(editDupattaForm.discountPercent) / 100)).toLocaleString('en-IN')}
                                </span>
                                <span style={{ marginLeft: '0.6rem', color: '#800020', fontWeight: 700 }}>
                                  ({editDupattaForm.discountPercent}% OFF)
                                </span>
                              </>
                            ) : (
                              <span style={{ fontWeight: 700 }}>
                                ₹{parseFloat(editDupattaForm.basePriceINR).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginTop: '1rem' }}>
                      {/* Weave */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Weave Heritage</label>
                        <select
                          className="form-input"
                          value={editDupattaForm.weave}
                          onChange={(e) => setEditDupattaForm(prev => ({ ...prev, weave: e.target.value }))}
                        >
                          <option value="Double Ikat Handloom Dupatta">Double Ikat Handloom Dupatta</option>
                          <option value="Single Ikat Classic Dupatta">Single Ikat Classic Dupatta</option>
                          <option value="Semi Patola Silk Dupatta">Semi Patola Silk Dupatta</option>
                          <option value="Royal Silk Zari Border Dupatta">Royal Silk Zari Border Dupatta</option>
                        </select>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Category</label>
                        <select
                          className="form-input"
                          value={editDupattaForm.category}
                          onChange={(e) => setEditDupattaForm(prev => ({ ...prev, category: e.target.value }))}
                        >
                          <option value="double-dupatta">Double Ikat Dupatta</option>
                          <option value="single-dupatta">Single Ikat Dupatta</option>
                          <option value="semi-dupatta">Semi Patola Dupatta</option>
                        </select>
                      </div>

                      {/* Motif */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Motif Type</label>
                        <select
                          className="form-input"
                          value={editDupattaForm.motif}
                          onChange={(e) => setEditDupattaForm(prev => ({ ...prev, motif: e.target.value }))}
                        >
                          <option value="nari-kunjar">🐘 Nari Kunjar (Elephant, Parrot, Dancing Doll)</option>
                          <option value="ratanchowk">💎 Ratanchowk (Jewel Square Geometric)</option>
                          <option value="chhabdi">🧺 Chhabdi Bhat (Royal Floral Basket)</option>
                          <option value="pan-bhat">🍃 Pan Bhat (Sacred Pipal / Heart Leaf)</option>
                          <option value="shikargah">🐅 Shikargah (Royal Hunting Forest Motif)</option>
                          <option value="Navratna">✨ Navratna (Nine Sacred Gems Grid)</option>
                          <option value="Sakhiyo">卐 Sakhiyo (Swastika Heritage Auspicious Weave)</option>
                        </select>
                      </div>

                      {/* Motif Custom Name */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Motif Display Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Royal Nari Kunjar Bhat"
                          value={editDupattaForm.motifName}
                          onChange={(e) => setEditDupattaForm(prev => ({ ...prev, motifName: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginTop: '1rem' }}>
                      {/* Weaving Time */}
                      <div>
                        <label className="form-label">Weaving Time</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 3 to 5 Months Handcrafted"
                          value={editDupattaForm.timeToWeave}
                          onChange={(e) => setEditDupattaForm(prev => ({ ...prev, timeToWeave: e.target.value }))}
                        />
                      </div>

                      {/* Fabric */}
                      <div>
                        <label className="form-label">Fabric / Silk Grade</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 100% Pure Mulberry Silk & Natural Dyes"
                          value={editDupattaForm.fabric}
                          onChange={(e) => setEditDupattaForm(prev => ({ ...prev, fabric: e.target.value }))}
                        />
                      </div>

                      {/* Length (Pure number with Meter / CM dropdown) */}
                      {(() => {
                        const parsed = parseLengthValue(editDupattaForm.length || '2.50 Meters (Handloom Silk with Zari Pallu)', '2.50');
                        const currentNum = editDupattaForm.lengthNumber !== undefined ? editDupattaForm.lengthNumber : parsed.number;
                        const currentUnit = editDupattaForm.lengthUnit || parsed.unit || 'Meter';

                        const handleNumChange = (newVal) => {
                          const cleanNum = newVal.replace(/[^0-9.]/g, '');
                          const full = buildDupattaLengthString(cleanNum, currentUnit);
                          setEditDupattaForm(prev => ({
                            ...prev,
                            lengthNumber: cleanNum,
                            lengthUnit: currentUnit,
                            length: full
                          }));
                        };

                        const handleUnitChange = (newUnit) => {
                          let num = currentNum;
                          if (num && !isNaN(Number(num))) {
                            const n = parseFloat(num);
                            if (newUnit === 'CM' && currentUnit === 'Meter' && n < 50) {
                              num = String(Math.round(n * 100));
                            } else if (newUnit === 'Meter' && currentUnit === 'CM' && n >= 50) {
                              num = (n / 100).toFixed(2);
                            }
                          }
                          const full = buildDupattaLengthString(num, newUnit);
                          setEditDupattaForm(prev => ({
                            ...prev,
                            lengthNumber: num,
                            lengthUnit: newUnit,
                            length: full
                          }));
                        };

                        const presets = currentUnit === 'CM' ? [
                          { num: '250', desc: '250 cm (Standard Dupatta)' },
                          { num: '225', desc: '225 cm' },
                          { num: '275', desc: '275 cm (Grand Drape)' },
                          { num: '300', desc: '300 cm' }
                        ] : [
                          { num: '2.50', desc: '2.50 m (Standard Dupatta)' },
                          { num: '2.25', desc: '2.25 m' },
                          { num: '2.75', desc: '2.75 m (Grand Drape)' },
                          { num: '3.00', desc: '3.00 m' }
                        ];

                        return (
                          <div>
                            <label className="form-label" style={{ fontWeight: 700, color: '#800020', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>📏 Dupatta Length (દુપટ્ટા લંબાઈ) *</span>
                              <span style={{ fontSize: '0.72rem', color: '#666', fontWeight: 500 }}>
                                {currentUnit === 'CM' ? '(e.g. 250, 225, 275)' : '(e.g. 2.50, 2.25, 2.75)'}
                              </span>
                            </label>

                            {/* Number Input + Unit Dropdown */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                              <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="form-input"
                                  placeholder={currentUnit === 'CM' ? "e.g. 250" : "e.g. 2.50"}
                                  value={currentNum}
                                  onChange={(e) => handleNumChange(e.target.value)}
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                              <select
                                value={currentUnit}
                                onChange={(e) => handleUnitChange(e.target.value)}
                                className="form-input"
                                style={{
                                  width: '135px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: '#fffdf8',
                                  border: '1.5px solid #d4af37',
                                  color: '#800020',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  boxSizing: 'border-box'
                                }}
                              >
                                <option value="Meter">Meters </option>
                                <option value="CM">CM </option>
                              </select>
                            </div>

                            {/* Quick Presets */}
                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.72rem', color: '#666', fontWeight: 600 }}>Quick Presets:</span>
                              {presets.map(item => (
                                <button
                                  key={item.num}
                                  type="button"
                                  onClick={() => handleNumChange(item.num)}
                                  style={{
                                    background: (String(currentNum) === item.num) ? '#800020' : '#fff',
                                    color: (String(currentNum) === item.num) ? '#fff' : '#800020',
                                    border: '1px solid #d4af37',
                                    fontSize: '0.74rem',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 700
                                  }}
                                  title={item.desc}
                                >
                                  {item.num} {currentUnit === 'CM' ? 'cm' : 'm'}
                                </button>
                              ))}
                            </div>

                            <div style={{ fontSize: '0.74rem', color: '#2e7d32', marginTop: '0.3rem', fontWeight: 600 }}>
                              ✓ Website Display: <strong>{buildDupattaLengthString(currentNum, currentUnit)}</strong>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Weight */}
                      <div>
                        <label className="form-label">Weight</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Approx. 350 grams"
                          value={editDupattaForm.weight}
                          onChange={(e) => setEditDupattaForm(prev => ({ ...prev, weight: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginTop: '1rem' }}>
                      {/* Colors */}
                      <div>
                        <label className="form-label">Color Palette & Natural Dyes</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Crimson Red & Royal Gold Border (Natural Manjistha Dyes)"
                          value={editDupattaForm.colors}
                          onChange={(e) => setEditDupattaForm(prev => ({ ...prev, colors: e.target.value }))}
                        />
                      </div>

                      {/* Certification */}
                      <div>
                        <label className="form-label">Certification</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Silk Mark Certified Handloom"
                          value={editDupattaForm.certification}
                          onChange={(e) => setEditDupattaForm(prev => ({ ...prev, certification: e.target.value }))}
                        />
                      </div>

                      {/* Badge */}
                      <div>
                        <label className="form-label">Badge</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Double Ikat Dupatta"
                          value={editDupattaForm.badge}
                          onChange={(e) => setEditDupattaForm(prev => ({ ...prev, badge: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* 4 Photo Showcase Upload Section for Edit */}
                    <div style={{
                      marginTop: '1.5rem',
                      background: '#f8f4ec',
                      borderRadius: '10px',
                      padding: '1.2rem',
                      border: '1.5px solid #d4af37'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <h4 style={{ margin: 0, color: '#800020', fontSize: '1.05rem', fontWeight: 700 }}>
                            📸 Dupatta 4-Photo Showcase (4 Views)
                          </h4>
                          <span style={{ fontSize: '0.8rem', color: '#666' }}>
                            Upload distinct angles for the dupatta (Spread, Pallu & Tassels, Macro Weave, Drape Look).
                          </span>
                        </div>

                        {/* Bulk Upload Button */}
                        <div>
                          <label className="btn-outline-gold" style={{
                            cursor: 'pointer',
                            padding: '0.55rem 1.1rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: '#800020',
                            color: '#fff',
                            boxShadow: '0 2px 6px rgba(128,0,32,0.25)',
                            fontSize: '0.88rem'
                          }}>
                            📁 Bulk Select 4 Photos
                            <input
                              type="file"
                              accept="image/*,.heic,.heif,.HEIC,.HEIF"
                              multiple
                              style={{ display: 'none' }}
                              onChange={(e) => handleBulkDupattaPhotosUpload(e, true)}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Curated Preset Sets Quick-Loader */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                        padding: '0.5rem 0.8rem',
                        background: '#fff',
                        borderRadius: '6px',
                        border: '1px solid #e0d0b0',
                        marginBottom: '1rem',
                        fontSize: '0.82rem'
                      }}>
                        <span style={{ fontWeight: 600, color: '#666' }}>👑 Royal 4-Photo Presets (Auto-Fill 4 Photos):</span>
                        {[
                          { key: 'crimson', label: 'Crimson Set' },
                          { key: 'ruby', label: 'Ruby Set' },
                          { key: 'emerald', label: 'Emerald Set' },
                          { key: 'blue', label: 'Royal Blue Set' }
                        ].map(preset => (
                          <button
                            key={preset.key}
                            type="button"
                            className="btn-outline-gold"
                            style={{
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.75rem',
                              borderRadius: '4px'
                            }}
                            onClick={() => handleLoadAllDupattaPresets(preset.key, true)}
                          >
                            ✦ {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* 4 Photo Slots Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '1rem'
                      }}>
                        {DUPATTA_PHOTO_SLOTS.map((slot) => {
                          const currentImg = (editDupattaForm.images && editDupattaForm.images[slot.idx]) ||
                                             (slot.idx === 0 ? editDupattaForm.image : null) ||
                                             slot.fallback;
                          return (
                            <div
                              key={slot.idx}
                              style={{
                                background: '#fff',
                                borderRadius: '8px',
                                border: '1.5px solid #e2d2b4',
                                padding: '0.75rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                position: 'relative',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.04)'
                              }}
                            >
                              {/* Slot Badge */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '3px',
                                  background: slot.badgeColor,
                                  color: '#fff',
                                  letterSpacing: '0.5px'
                                }}>
                                  {slot.badge}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#2e7d32', fontWeight: 700 }}>
                                  ✓ Photo {slot.idx + 1}
                                </span>
                              </div>

                              {/* Slot Title in Gujarati & English */}
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#333', lineHeight: 1.2 }}>
                                  {slot.gujarati}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#777', marginTop: '2px' }}>
                                  {slot.hint}
                                </div>
                              </div>

                              {/* Thumbnail Image */}
                              <div style={{
                                width: '100%',
                                height: '140px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                border: '1px solid #d4af37',
                                background: '#f5f0e6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyCenter: 'center'
                              }}>
                                <img
                                  src={currentImg}
                                  alt={slot.title}
                                  style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                                  onError={(e) => { e.target.src = slot.fallback; }}
                                />
                              </div>

                              {/* Individual Change/Upload Button */}
                              <label
                                className="btn-outline-gold"
                                style={{
                                  cursor: 'pointer',
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: '5px',
                                  fontSize: '0.78rem',
                                  textAlign: 'center',
                                  display: 'block',
                                  fontWeight: 600
                                }}
                              >
                                📷 Change Photo (Slot {slot.idx + 1})
                                <input
                                  type="file"
                                  accept="image/*,.heic,.heif,.HEIC,.HEIF"
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleSingleSlotDupattaPhotoUpload(slot.idx, e, true)}
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Description */}
                    <div style={{ marginTop: '1.2rem' }}>
                      <label className="form-label">Dupatta Heritage Description</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={editDupattaForm.description}
                        onChange={(e) => setEditDupattaForm(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    {/* Submit Actions */}
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <button
                        type="submit"
                        className="btn-primary-gold"
                        style={{ padding: '0.8rem 2.2rem', fontSize: '1rem' }}
                        disabled={savingEditDupatta}
                      >
                        {savingEditDupatta ? 'Updating Catalog...' : '✓ Save & Update Dupatta in Live Catalog'}
                      </button>
                      <button
                        type="button"
                        className="btn-outline-gold"
                        onClick={() => {
                          setEditingDupatta(null);
                          setEditDupattaForm(null);
                          setActiveTab('dupatta-inventory');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Add New Dupatta Form */
                <div className="admin-upload-saree-container" style={{ background: '#faf8f5', border: '1.5px solid #d4af37', borderRadius: '10px', padding: '1.8rem', boxShadow: '0 4px 16px rgba(128, 0, 32, 0.08)' }}>
                  <div style={{ borderBottom: '1px solid #e0d5c3', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                    <h3 style={{ margin: 0, color: '#800020', fontFamily: 'var(--font-royal)', fontSize: '1.35rem', fontWeight: 800 }}>
                      ➕ Upload New Patola Dupatta to Catalog
                    </h3>
                    <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                      Directly publish handcrafted Patola Dupattas (Double Ikat, Single Ikat, Semi Patola) to the live catalog.
                    </p>
                  </div>

                  <form onSubmit={handleUploadDupattaSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem' }}>
                      {/* Dupatta Title */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Dupatta Title / Design Name *</label>
                        <input
                          type="text"
                          className="form-input"
                          required
                          placeholder="e.g. Royal Handwoven Double Ikat Dupatta"
                          value={dupattaForm.title}
                          onChange={(e) => setDupattaForm({ ...dupattaForm, title: e.target.value })}
                        />
                      </div>

                      {/* Base Price in INR with Live Currency Conversion */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Price in Indian Rupees (₹ INR) *</label>
                        <input
                          type="number"
                          className="form-input"
                          required
                          min="1000"
                          placeholder="e.g. 85000"
                          value={dupattaForm.basePriceINR}
                          onChange={(e) => setDupattaForm({ ...dupattaForm, basePriceINR: e.target.value })}
                        />
                      </div>

                      {/* Stock Quantity */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Vault Stock Quantity *</label>
                        <input
                          type="number"
                          className="form-input"
                          required
                          min="0"
                          max="9999"
                          value={dupattaForm.stockQuantity}
                          onChange={(e) => setDupattaForm({ ...dupattaForm, stockQuantity: e.target.value })}
                        />
                        <span style={{ fontSize: '0.78rem', color: '#666' }}>
                          0 = Out of Stock. 1+ = In Stock for immediate booking.
                        </span>
                      </div>

                      {/* Discount Dropdown */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Discount *</label>
                        <select
                          className="form-input"
                          value={dupattaForm.discountPercent || '0'}
                          onChange={(e) => setDupattaForm({ ...dupattaForm, discountPercent: e.target.value })}
                        >
                          <option value="0">No Discount (0%)</option>
                          <option value="5">5% OFF</option>
                          <option value="10">10% OFF</option>
                          <option value="15">15% OFF</option>
                          <option value="20">20% OFF</option>
                          <option value="25">25% OFF</option>
                          <option value="30">30% OFF</option>
                        </select>
                      </div>
                    </div>

                    {/* Auto-Currency Conversion Preview Box */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(128, 0, 32, 0.08))',
                      border: '1px solid #d4af37',
                      borderRadius: '8px',
                      padding: '0.8rem 1rem',
                      margin: '1.2rem 0'
                    }}>
                      <strong style={{ color: '#800020', fontSize: '0.85rem' }}>
                        🌍 Automatic Real-Time Currency Conversion Preview:
                      </strong>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem', marginTop: '0.4rem', fontSize: '0.88rem' }}>
                        <div>🇮🇳 India: <strong style={{ color: '#800020' }}>{dupattaForm.basePriceINR ? '₹ ' + parseFloat(dupattaForm.basePriceINR).toLocaleString('en-IN') : '₹ 0'}</strong></div>
                        <div>🇺🇸 USA / NRI: <strong style={{ color: '#2e7d32' }}>{dupattaForm.basePriceINR ? '$ ' + Math.round(parseFloat(dupattaForm.basePriceINR) * 0.012).toLocaleString('en-US') : '$ 0'}</strong></div>
                        <div>🇪🇺 Europe: <strong style={{ color: '#1565c0' }}>{dupattaForm.basePriceINR ? '€ ' + Math.round(parseFloat(dupattaForm.basePriceINR) * 0.011).toLocaleString('en-US') : '€ 0'}</strong></div>
                        <div>🇬🇧 UK: <strong style={{ color: '#6a1b9a' }}>{dupattaForm.basePriceINR ? '£ ' + Math.round(parseFloat(dupattaForm.basePriceINR) * 0.0095).toLocaleString('en-US') : '£ 0'}</strong></div>
                      </div>

                      {/* Live Discount Preview */}
                      {dupattaForm.basePriceINR && parseFloat(dupattaForm.basePriceINR) > 0 && (
                        <div style={{
                          background: '#fdf3f3',
                          border: '1px solid #e8c9c9',
                          borderRadius: '8px',
                          padding: '0.8rem 1rem',
                          marginTop: '0.8rem'
                        }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#800020' }}>
                            💰 Final Price Preview:
                          </span>
                          <div style={{ marginTop: '0.3rem', fontSize: '1rem' }}>
                            {Number(dupattaForm.discountPercent) > 0 ? (
                              <>
                                <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '0.6rem' }}>
                                  ₹{parseFloat(dupattaForm.basePriceINR).toLocaleString('en-IN')}
                                </span>
                                <span style={{ color: '#1a7a3c', fontWeight: 700 }}>
                                  ₹{Math.round(parseFloat(dupattaForm.basePriceINR) - (parseFloat(dupattaForm.basePriceINR) * Number(dupattaForm.discountPercent) / 100)).toLocaleString('en-IN')}
                                </span>
                                <span style={{ marginLeft: '0.6rem', color: '#800020', fontWeight: 700 }}>
                                  ({dupattaForm.discountPercent}% OFF)
                                </span>
                              </>
                            ) : (
                              <span style={{ fontWeight: 700 }}>
                                ₹{parseFloat(dupattaForm.basePriceINR).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginTop: '1rem' }}>
                      {/* Weave */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Weave Heritage</label>
                        <select
                          className="form-input"
                          value={dupattaForm.weave}
                          onChange={(e) => setDupattaForm({ ...dupattaForm, weave: e.target.value })}
                        >
                          <option value="Double Ikat Handloom Dupatta">Double Ikat Handloom Dupatta</option>
                          <option value="Single Ikat Classic Dupatta">Single Ikat Classic Dupatta</option>
                          <option value="Semi Patola Silk Dupatta">Semi Patola Silk Dupatta</option>
                          <option value="Royal Silk Zari Border Dupatta">Royal Silk Zari Border Dupatta</option>
                        </select>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Category</label>
                        <select
                          className="form-input"
                          value={dupattaForm.category}
                          onChange={(e) => setDupattaForm({ ...dupattaForm, category: e.target.value })}
                        >
                          <option value="double-dupatta">Double Ikat Dupatta</option>
                          <option value="single-dupatta">Single Ikat Dupatta</option>
                          <option value="semi-dupatta">Semi Patola Dupatta</option>
                        </select>
                      </div>

                      {/* Motif */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Motif Type</label>
                        <select
                          className="form-input"
                          value={dupattaForm.motif}
                          onChange={(e) => setDupattaForm({ ...dupattaForm, motif: e.target.value })}
                        >
                          <option value="nari-kunjar">🐘 Nari Kunjar (Elephant, Parrot, Dancing Doll)</option>
                          <option value="ratanchowk">💎 Ratanchowk (Jewel Square Geometric)</option>
                          <option value="chhabdi">🧺 Chhabdi Bhat (Royal Floral Basket)</option>
                          <option value="pan-bhat">🍃 Pan Bhat (Sacred Pipal / Heart Leaf)</option>
                          <option value="shikargah">🐅 Shikargah (Royal Hunting Forest Motif)</option>
                          <option value="Navratna">✨ Navratna (Nine Sacred Gems Grid)</option>
                          <option value="Sakhiyo">卐 Sakhiyo (Swastika Heritage Auspicious Weave)</option>
                        </select>
                      </div>

                      {/* Motif Custom Name */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Motif Display Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Royal Nari Kunjar Bhat"
                          value={dupattaForm.motifName}
                          onChange={(e) => setDupattaForm({ ...dupattaForm, motifName: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginTop: '1rem' }}>
                      {/* Weaving Time */}
                      <div>
                        <label className="form-label">Weaving Time</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 3 to 5 Months Handcrafted"
                          value={dupattaForm.timeToWeave}
                          onChange={(e) => setDupattaForm({ ...dupattaForm, timeToWeave: e.target.value })}
                        />
                      </div>

                      {/* Fabric */}
                      <div>
                        <label className="form-label">Fabric / Silk Grade</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 100% Pure Mulberry Silk & Natural Dyes"
                          value={dupattaForm.fabric}
                          onChange={(e) => setDupattaForm({ ...dupattaForm, fabric: e.target.value })}
                        />
                      </div>

                      {/* Length (Pure number with Meter / CM dropdown) */}
                      {(() => {
                        const parsed = parseLengthValue(dupattaForm.length || '2.50 Meters (Handloom Silk with Zari Pallu)', '2.50');
                        const currentNum = dupattaForm.lengthNumber !== undefined ? dupattaForm.lengthNumber : parsed.number;
                        const currentUnit = dupattaForm.lengthUnit || parsed.unit || 'Meter';

                        const handleNumChange = (newVal) => {
                          const cleanNum = newVal.replace(/[^0-9.]/g, '');
                          const full = buildDupattaLengthString(cleanNum, currentUnit);
                          setDupattaForm(prev => ({
                            ...prev,
                            lengthNumber: cleanNum,
                            lengthUnit: currentUnit,
                            length: full
                          }));
                        };

                        const handleUnitChange = (newUnit) => {
                          let num = currentNum;
                          if (num && !isNaN(Number(num))) {
                            const n = parseFloat(num);
                            if (newUnit === 'CM' && currentUnit === 'Meter' && n < 50) {
                              num = String(Math.round(n * 100));
                            } else if (newUnit === 'Meter' && currentUnit === 'CM' && n >= 50) {
                              num = (n / 100).toFixed(2);
                            }
                          }
                          const full = buildDupattaLengthString(num, newUnit);
                          setDupattaForm(prev => ({
                            ...prev,
                            lengthNumber: num,
                            lengthUnit: newUnit,
                            length: full
                          }));
                        };

                        const presets = currentUnit === 'CM' ? [
                          { num: '250', desc: '250 cm (Standard Dupatta)' },
                          { num: '225', desc: '225 cm' },
                          { num: '275', desc: '275 cm (Grand Drape)' },
                          { num: '300', desc: '300 cm' }
                        ] : [
                          { num: '2.50', desc: '2.50 m (Standard Dupatta)' },
                          { num: '2.25', desc: '2.25 m' },
                          { num: '2.75', desc: '2.75 m (Grand Drape)' },
                          { num: '3.00', desc: '3.00 m' }
                        ];

                        return (
                          <div>
                            <label className="form-label" style={{ fontWeight: 700, color: '#800020', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>📏 Dupatta Length (દુપટ્ટા લંબાઈ) *</span>
                              <span style={{ fontSize: '0.72rem', color: '#666', fontWeight: 500 }}>
                                {currentUnit === 'CM' ? '(e.g. 250, 225, 275)' : '(e.g. 2.50, 2.25, 2.75)'}
                              </span>
                            </label>

                            {/* Number Input + Unit Dropdown */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                              <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="form-input"
                                  placeholder={currentUnit === 'CM' ? "e.g. 250" : "e.g. 2.50"}
                                  value={currentNum}
                                  onChange={(e) => handleNumChange(e.target.value)}
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                              <select
                                value={currentUnit}
                                onChange={(e) => handleUnitChange(e.target.value)}
                                className="form-input"
                                style={{
                                  width: '135px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: '#fffdf8',
                                  border: '1.5px solid #d4af37',
                                  color: '#800020',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  boxSizing: 'border-box'
                                }}
                              >
                                <option value="Meter">Meters </option>
                                <option value="CM">CM</option>
                              </select>
                            </div>

                            {/* Quick Presets */}
                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.72rem', color: '#666', fontWeight: 600 }}>Quick Presets:</span>
                              {presets.map(item => (
                                <button
                                  key={item.num}
                                  type="button"
                                  onClick={() => handleNumChange(item.num)}
                                  style={{
                                    background: (String(currentNum) === item.num) ? '#800020' : '#fff',
                                    color: (String(currentNum) === item.num) ? '#fff' : '#800020',
                                    border: '1px solid #d4af37',
                                    fontSize: '0.74rem',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 700
                                  }}
                                  title={item.desc}
                                >
                                  {item.num} {currentUnit === 'CM' ? 'cm' : 'm'}
                                </button>
                              ))}
                            </div>

                            <div style={{ fontSize: '0.74rem', color: '#2e7d32', marginTop: '0.3rem', fontWeight: 600 }}>
                              ✓ Website Display: <strong>{buildDupattaLengthString(currentNum, currentUnit)}</strong>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Weight */}
                      <div>
                        <label className="form-label">Weight</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Approx. 350 grams"
                          value={dupattaForm.weight}
                          onChange={(e) => setDupattaForm({ ...dupattaForm, weight: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginTop: '1rem' }}>
                      {/* Colors */}
                      <div>
                        <label className="form-label">Color Palette & Natural Dyes</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Crimson Red & Royal Gold Border (Natural Manjistha Dyes)"
                          value={dupattaForm.colors}
                          onChange={(e) => setDupattaForm({ ...dupattaForm, colors: e.target.value })}
                        />
                      </div>

                      {/* Certification */}
                      <div>
                        <label className="form-label">Certification</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Silk Mark Certified Handloom"
                          value={dupattaForm.certification}
                          onChange={(e) => setDupattaForm({ ...dupattaForm, certification: e.target.value })}
                        />
                      </div>

                      {/* Badge */}
                      <div>
                        <label className="form-label">Badge</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Double Ikat Dupatta"
                          value={dupattaForm.badge}
                          onChange={(e) => setDupattaForm({ ...dupattaForm, badge: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* 4 Photo Showcase Upload Section */}
                    <div style={{
                      marginTop: '1.5rem',
                      background: '#f8f4ec',
                      borderRadius: '10px',
                      padding: '1.2rem',
                      border: '1.5px solid #d4af37'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <h4 style={{ margin: 0, color: '#800020', fontSize: '1.05rem', fontWeight: 700 }}>
                            📸 Dupatta 4-Photo Showcase (4 Views)
                          </h4>
                          <span style={{ fontSize: '0.8rem', color: '#666' }}>
                            Upload 4 high-resolution photos showing all angles of the dupatta.
                          </span>
                        </div>

                        {/* Bulk Upload Button */}
                        <div>
                          <label className="btn-outline-gold" style={{
                            cursor: 'pointer',
                            padding: '0.55rem 1.1rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: '#800020',
                            color: '#fff',
                            boxShadow: '0 2px 6px rgba(128,0,32,0.25)',
                            fontSize: '0.88rem'
                          }}>
                            📁 Bulk Select 4 Photos
                            <input
                              type="file"
                              accept="image/*,.heic,.heif,.HEIC,.HEIF"
                              multiple
                              style={{ display: 'none' }}
                              onChange={(e) => handleBulkDupattaPhotosUpload(e, false)}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Curated Preset Sets Quick-Loader */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                        padding: '0.5rem 0.8rem',
                        background: '#fff',
                        borderRadius: '6px',
                        border: '1px solid #e0d0b0',
                        marginBottom: '1rem',
                        fontSize: '0.82rem'
                      }}>
                        <span style={{ fontWeight: 600, color: '#666' }}>👑 Royal 4-Photo Presets (Auto-Fill 4 Photos):</span>
                        {[
                          { key: 'crimson', label: 'Crimson Set' },
                          { key: 'ruby', label: 'Ruby Set' },
                          { key: 'emerald', label: 'Emerald Set' },
                          { key: 'blue', label: 'Royal Blue Set' }
                        ].map(preset => (
                          <button
                            key={preset.key}
                            type="button"
                            className="btn-outline-gold"
                            style={{
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.75rem',
                              borderRadius: '4px'
                            }}
                            onClick={() => handleLoadAllDupattaPresets(preset.key, false)}
                          >
                            ✦ {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* 4 Photo Slots Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '1rem'
                      }}>
                        {DUPATTA_PHOTO_SLOTS.map((slot) => {
                          const currentImg = (dupattaForm.images && dupattaForm.images[slot.idx]) ||
                                             (slot.idx === 0 ? (uploadedDupattaPhoto || dupattaForm.image) : null) ||
                                             slot.fallback;
                          return (
                            <div
                              key={slot.idx}
                              style={{
                                background: '#fff',
                                borderRadius: '8px',
                                border: '1.5px solid #e2d2b4',
                                padding: '0.75rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                position: 'relative',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.04)'
                              }}
                            >
                              {/* Slot Badge */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '3px',
                                  background: slot.badgeColor,
                                  color: '#fff',
                                  letterSpacing: '0.5px'
                                }}>
                                  {slot.badge}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#2e7d32', fontWeight: 700 }}>
                                  ✓ Photo {slot.idx + 1}
                                </span>
                              </div>

                              {/* Slot Title in Gujarati & English */}
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#333', lineHeight: 1.2 }}>
                                  {slot.gujarati}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#777', marginTop: '2px' }}>
                                  {slot.hint}
                                </div>
                              </div>

                              {/* Thumbnail Image */}
                              <div style={{
                                width: '100%',
                                height: '140px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                border: '1px solid #d4af37',
                                background: '#f5f0e6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <img
                                  src={currentImg}
                                  alt={slot.title}
                                  style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                                  onError={(e) => { e.target.src = slot.fallback; }}
                                />
                              </div>

                              {/* Individual Change/Upload Button */}
                              <label
                                className="btn-outline-gold"
                                style={{
                                  cursor: 'pointer',
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: '5px',
                                  fontSize: '0.78rem',
                                  textAlign: 'center',
                                  display: 'block',
                                  fontWeight: 600
                                }}
                              >
                                📷 Add / Change Photo (Slot {slot.idx + 1})
                                <input
                                  type="file"
                                  accept="image/*,.heic,.heif,.HEIC,.HEIF"
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleSingleSlotDupattaPhotoUpload(slot.idx, e, false)}
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Description */}
                    <div style={{ marginTop: '1.2rem' }}>
                      <label className="form-label">Dupatta Heritage Description</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        placeholder="e.g. Masterpiece handwoven double ikat dupatta created with 8-ply mulberry silk and natural dyes..."
                        value={dupattaForm.description}
                        onChange={(e) => setDupattaForm({ ...dupattaForm, description: e.target.value })}
                      />
                    </div>

                    {/* Submit Button */}
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                      <button
                        type="submit"
                        className="btn-primary-gold"
                        style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}
                        disabled={savingDupatta}
                      >
                        {savingDupatta ? 'Publishing to SQL Server...' : '✦ Publish Dupatta to Live Catalog ✦'}
                      </button>
                      <button
                        type="button"
                        className="btn-outline-gold"
                        onClick={() => setActiveTab('dupatta-inventory')}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )
            ) : activeTab === 'upload' ? (
              /* TAB 4: Upload New Saree Form or Update Saree Form */
              editingSaree && editSareeForm ? (
                <div className="admin-upload-saree-container" style={{ background: '#faf8f5', border: '1.5px solid #d4af37', borderRadius: '10px', padding: '1.8rem', boxShadow: '0 4px 16px rgba(128, 0, 32, 0.08)' }}>
                  {/* Top Editing Mode Notice Banner */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(128, 0, 32, 0.09), rgba(212, 175, 55, 0.15))',
                    border: '1px solid #d4af37',
                    borderRadius: '8px',
                    padding: '0.9rem 1.2rem',
                    marginBottom: '1.4rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.8rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#800020', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>✏️</span>
                        <span>Editing Saree: <strong>{editSareeForm.title}</strong> (ID: #{editSareeForm.id})</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#666', marginTop: '3px' }}>
                        Update saree price, stock status, weave type, motif and photos.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-outline-gold"
                        style={{ padding: '0.45rem 1rem', fontSize: '0.84rem', background: '#ffffff' }}
                        onClick={() => {
                          setEditingSaree(null);
                          setEditSareeForm(null);
                          setActiveTab('inventory');
                        }}
                      >
                        ↩️ Cancel & Return to Inventory
                      </button>
                      <button
                        type="button"
                        className="btn-outline-gold"
                        style={{ padding: '0.45rem 1rem', fontSize: '0.84rem', background: '#fdf7ee' }}
                        onClick={() => {
                          setEditingSaree(null);
                          setEditSareeForm(null);
                        }}
                      >
                        ➕ Switch to Add New Saree
                      </button>
                    </div>
                  </div>

                  <div style={{ borderBottom: '1px solid #e0d5c3', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                    <h3 style={{ margin: 0, color: '#800020', fontFamily: 'var(--font-royal)', fontSize: '1.35rem', fontWeight: 800 }}>
                      ✏️ Update Patola Saree Details
                    </h3>
                    <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                      Make changes below and click "Save & Update Saree". Updates will instantly reflect across the catalog and database.
                    </p>
                  </div>

                  <form onSubmit={handleSaveEditSareeSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem' }}>
                      {/* Saree Title */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Saree Title / Design Name *</label>
                        <input
                          type="text"
                          className="form-input"
                          required
                          value={editSareeForm.title}
                          onChange={(e) => setEditSareeForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>

                      {/* Base Price in INR with Live Conversion Preview */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Price in Indian Rupees (₹ INR) *</label>
                        <input
                          type="number"
                          className="form-input"
                          required
                          min="1000"
                          value={editSareeForm.basePriceINR}
                          onChange={(e) => setEditSareeForm(prev => ({ ...prev, basePriceINR: e.target.value }))}
                        />
                      </div>

                      {/* Stock Quantity */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Vault Stock Quantity *</label>
                        <input
                          type="number"
                          className="form-input"
                          required
                          min="0"
                          max="9999"
                          value={editSareeForm.stockQuantity}
                          onChange={(e) => setEditSareeForm(prev => ({ ...prev, stockQuantity: e.target.value }))}
                        />
                        <span style={{ fontSize: '0.78rem', color: '#666' }}>
                          0 = Out of Stock. 1+ = In Stock for immediate booking.
                        </span>
                      </div>

                      {/* Discount Dropdown */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Discount *</label>
                        <select
                          className="form-input"
                          value={editSareeForm.discountPercent || '0'}
                          onChange={(e) => setEditSareeForm(prev => ({ ...prev, discountPercent: e.target.value }))}
                        >
                          <option value="0">No Discount</option>
                          <option value="5">5% OFF</option>
                          <option value="10">10% OFF</option>
                          <option value="15">15% OFF</option>
                          <option value="20">20% OFF</option>
                          <option value="25">25% OFF</option>
                          <option value="30">30% OFF</option>
                        </select>
                      </div>
                    </div>

                    {/* Auto-Currency Conversion Preview Box */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(128, 0, 32, 0.08))',
                      border: '1px solid #d4af37',
                      borderRadius: '8px',
                      padding: '0.8rem 1rem',
                      margin: '1.2rem 0'
                    }}>
                      <strong style={{ color: '#800020', fontSize: '0.85rem' }}>
                        🌍 Automatic Real-Time Currency Conversion Preview:
                      </strong>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem', marginTop: '0.4rem', fontSize: '0.88rem' }}>
                        <div>🇮🇳 India: <strong style={{ color: '#800020' }}>{editSareeForm.basePriceINR ? '₹ ' + parseFloat(editSareeForm.basePriceINR).toLocaleString('en-IN') : '₹ 0'}</strong></div>
                        <div>🇺🇸 USA / NRI: <strong style={{ color: '#2e7d32' }}>{editSareeForm.basePriceINR ? '$ ' + Math.round(parseFloat(editSareeForm.basePriceINR) * 0.012).toLocaleString('en-US') : '$ 0'}</strong></div>
                        <div>🇪🇺 Europe: <strong style={{ color: '#1565c0' }}>{editSareeForm.basePriceINR ? '€ ' + Math.round(parseFloat(editSareeForm.basePriceINR) * 0.011).toLocaleString('en-US') : '€ 0'}</strong></div>
                        <div>🇬🇧 UK: <strong style={{ color: '#6a1b9a' }}>{editSareeForm.basePriceINR ? '£ ' + Math.round(parseFloat(editSareeForm.basePriceINR) * 0.0095).toLocaleString('en-US') : '£ 0'}</strong></div>
                      </div>

                      {/* Live Discount Preview for Edit */}
                      {editSareeForm.basePriceINR && parseFloat(editSareeForm.basePriceINR) > 0 && (
                        <div style={{
                          background: '#fdf3f3',
                          border: '1px solid #e8c9c9',
                          borderRadius: '8px',
                          padding: '0.8rem 1rem',
                          marginTop: '0.8rem'
                        }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#800020' }}>
                            💰 Final Price Preview:
                          </span>
                          <div style={{ marginTop: '0.3rem', fontSize: '1rem' }}>
                            {Number(editSareeForm.discountPercent) > 0 ? (
                              <>
                                <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '0.6rem' }}>
                                  ₹{parseFloat(editSareeForm.basePriceINR).toLocaleString('en-IN')}
                                </span>
                                <span style={{ color: '#1a7a3c', fontWeight: 700 }}>
                                  ₹{Math.round(parseFloat(editSareeForm.basePriceINR) - (parseFloat(editSareeForm.basePriceINR) * Number(editSareeForm.discountPercent) / 100)).toLocaleString('en-IN')}
                                </span>
                                <span style={{ marginLeft: '0.6rem', color: '#800020', fontWeight: 700 }}>
                                  ({editSareeForm.discountPercent}% OFF)
                                </span>
                              </>
                            ) : (
                              <span style={{ fontWeight: 700 }}>
                                ₹{parseFloat(editSareeForm.basePriceINR).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginTop: '1rem' }}>
                      {/* Weave */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Weave Heritage</label>
                        <select
                          className="form-input"
                          value={editSareeForm.weave}
                          onChange={(e) => setEditSareeForm(prev => ({ ...prev, weave: e.target.value }))}
                        >
                          <option value="Royal Silk Zari Weave">Royal Silk Zari Heritage</option>
                        </select>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Category</label>
                        <select
                          className="form-input"
                          value={editSareeForm.category}
                          onChange={(e) => setEditSareeForm(prev => ({ ...prev, category: e.target.value }))}
                        >
                          <option value="double-ikat">Double Ikat Heritage</option>
                          <option value="single-ikat">Single Ikat Classic</option>
                          <option value="semi-patola">Semi Patola Saree</option>
                          <option value="zari-buta">Zari Buta Patola Saree</option>
                          <option value="Modern">Modern Patola Saree</option>
                        </select>
                      </div>

                      {/* Motif */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Sacred Motif</label>
                        <select
                          className="form-input"
                          value={editSareeForm.motif}
                          onChange={(e) => {
                            const val = e.target.value;
                            let mName = 'Nari Kunjar (Elephant & Dancing Maiden)';
                            if (val === 'ratanchowk') mName = 'Ratanchowk Bhat (Sacred Jewel Square)';
                            if (val === 'chhabdi') mName = 'Chhabdi Bhat (Floral Auspicious Basket)';
                            if (val === 'pan-bhat') mName = 'Navratna Pan Bhat (Nine Gems)';
                            if (val === 'shikargah') mName = 'Shikargah (Royal Wildlife Motifs)';
                            if (val === 'Navratna') mName = 'Navratna (Jems Geometric)';
                            if (val === 'Sakhiyo') mName = 'Sakhiyo (Figurative / Human)';
                            setEditSareeForm(prev => ({ ...prev, motif: val, motifName: mName }));
                          }}
                        >
                          <option value="nari-kunjar">Nari Kunjar (Elephant & Maiden)</option>
                          <option value="ratanchowk">Ratanchowk (Jewel Square)</option>
                          <option value="chhabdi">Chhabdi Bhat (Floral Basket)</option>
                          <option value="pan-bhat">Pan Bhat (Betel Leaf & Gems)</option>
                          <option value="shikargah">Shikargah Royal Forest</option>
                          <option value="Navratna">Navratna (Jems Geometric)</option>
                          <option value="Sakhiyo">Sakhiyo (Figurative / Human)</option>
                        </select>
                      </div>


                      {/* Time to weave */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Loom Handcraft Timeline</label>
                        <select
                          className="form-input"
                          value={editSareeForm.timeToWeave}
                          onChange={(e) => setEditSareeForm(prev => ({ ...prev, timeToWeave: e.target.value }))}
                        >
                          <option value="2 to 4 Months Handcrafted">2 to 4 Months Handcrafted</option>
                          <option value="6 Months Handcrafted">6 Months Handcrafted</option>
                          <option value="9 Months Handcrafted">9 Months Handcrafted</option>
                          <option value="11 Months Handcrafted">11 Months Handcrafted</option>
                        </select>
                      </div>

                      {/* Color Palette */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 700 }}>Color Palette & Natural Dyes</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Deep Crimson Red, Saffron Ochre & Gold"
                          value={editSareeForm.colors || ''}
                          onChange={(e) => setEditSareeForm(prev => ({ ...prev, colors: e.target.value }))}
                        />
                      </div>

                      {/* Saree Length (Pure number with Meter / CM dropdown) */}
                      {(() => {
                        const parsed = parseLengthValue(editSareeForm.length || '6.30 Meters (Includes Blouse Piece)', '6.30');
                        const currentNum = editSareeForm.lengthNumber !== undefined ? editSareeForm.lengthNumber : parsed.number;
                        const currentUnit = editSareeForm.lengthUnit || parsed.unit || 'Meter';

                        const handleNumChange = (newVal) => {
                          const cleanNum = newVal.replace(/[^0-9.]/g, '');
                          const full = buildSareeLengthString(cleanNum, currentUnit);
                          setEditSareeForm(prev => ({
                            ...prev,
                            lengthNumber: cleanNum,
                            lengthUnit: currentUnit,
                            length: full
                          }));
                        };

                        const handleUnitChange = (newUnit) => {
                          let num = currentNum;
                          if (num && !isNaN(Number(num))) {
                            const n = parseFloat(num);
                            if (newUnit === 'CM' && currentUnit === 'Meter' && n < 50) {
                              num = String(Math.round(n * 100));
                            } else if (newUnit === 'Meter' && currentUnit === 'CM' && n >= 50) {
                              num = (n / 100).toFixed(2);
                            }
                          }
                          const full = buildSareeLengthString(num, newUnit);
                          setEditSareeForm(prev => ({
                            ...prev,
                            lengthNumber: num,
                            lengthUnit: newUnit,
                            length: full
                          }));
                        };

                        const presets = currentUnit === 'CM' ? [
                          { num: '630', desc: '630 cm (Standard with Blouse)' },
                          { num: '550', desc: '550 cm (Standard Saree)' },
                          { num: '650', desc: '650 cm (Grand Saree)' }
                        ] : [
                          { num: '6.30', desc: '6.30 (Standard with Blouse)' },
                          { num: '5.50', desc: '5.50 (Standard Saree)' },
                          { num: '6.50', desc: '6.50 (Grand Saree)' }
                        ];

                        return (
                          <div>
                            <label className="form-label" style={{ fontWeight: 700, color: '#800020', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>📏 Saree Length (સાડીની લંબાઈ) *</span>
                              <span style={{ fontSize: '0.72rem', color: '#666', fontWeight: 500 }}>
                                {currentUnit === 'CM' ? '(e.g. 630, 550, 650)' : '(e.g. 6.30, 5.50, 6.50)'}
                              </span>
                            </label>

                            {/* Number Input + Unit Dropdown */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                              <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="form-input"
                                  placeholder={currentUnit === 'CM' ? "e.g. 630" : "e.g. 6.30"}
                                  value={currentNum}
                                  onChange={(e) => handleNumChange(e.target.value)}
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                              <select
                                value={currentUnit}
                                onChange={(e) => handleUnitChange(e.target.value)}
                                className="form-input"
                                style={{
                                  width: '135px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: '#fffdf8',
                                  border: '1.5px solid #d4af37',
                                  color: '#800020',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  boxSizing: 'border-box'
                                }}
                              >
                                <option value="Meter">Meters </option>
                                <option value="CM">CM</option>
                              </select>
                            </div>

                            {/* Quick Presets */}
                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.72rem', color: '#666', fontWeight: 600 }}>Quick Presets:</span>
                              {presets.map(item => (
                                <button
                                  key={item.num}
                                  type="button"
                                  onClick={() => handleNumChange(item.num)}
                                  style={{
                                    background: (String(currentNum) === item.num) ? '#800020' : '#fff',
                                    color: (String(currentNum) === item.num) ? '#fff' : '#800020',
                                    border: '1px solid #d4af37',
                                    fontSize: '0.74rem',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 700
                                  }}
                                  title={item.desc}
                                >
                                  {item.num} {currentUnit === 'CM' ? 'cm' : 'm'}
                                </button>
                              ))}
                            </div>

                            <div style={{ fontSize: '0.74rem', color: '#2e7d32', marginTop: '0.3rem', fontWeight: 600 }}>
                              ✓ Website Display: <strong>{buildSareeLengthString(currentNum, currentUnit)}</strong>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Photo Upload Section - All 4 Photo Showcase */}
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1.2rem',
                      background: 'rgba(212, 175, 55, 0.05)',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '0.8rem' }}>
                        <div>
                          <label className="form-label" style={{ fontWeight: 700, margin: 0, fontSize: '1.05rem', color: '#800020' }}>
                            📸 Upload 4 Showcase Photos *
                          </label>
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#666' }}>
                            Customers can swipe through all 4 angles on the saree card and detail view (Front, Pallu, Weave & Loom).
                          </p>
                        </div>
                        
                        {/* Bulk Upload Button */}
                        <div>
                          <label className="btn-outline-gold" style={{
                            cursor: 'pointer',
                            padding: '0.55rem 1.1rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: '#800020',
                            color: '#fff',
                            boxShadow: '0 2px 6px rgba(128,0,32,0.25)',
                            fontSize: '0.88rem'
                          }}>
                            📁 Bulk Select 4 Photos
                            <input
                              type="file"
                              accept="image/*,.heic,.heif,.HEIC,.HEIF"
                              multiple
                              style={{ display: 'none' }}
                              onChange={(e) => handleBulkPhotosUpload(e, true)}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Curated Preset Sets Quick-Loader */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                        padding: '0.5rem 0.8rem',
                        background: '#fff',
                        borderRadius: '6px',
                        border: '1px solid #e0d0b0',
                        marginBottom: '1rem',
                        fontSize: '0.82rem'
                      }}>
                        <span style={{ fontWeight: 600, color: '#666' }}>👑 Royal 4-Photo Presets (Auto-Fill 4 Photos):</span>
                        {[
                          { key: 'crimson', label: 'Crimson Set' },
                          { key: 'ruby', label: 'Ruby Set' },
                          { key: 'emerald', label: 'Emerald Set' },
                          { key: 'blue', label: 'Royal Blue Set' }
                        ].map(preset => (
                          <button
                            key={preset.key}
                            type="button"
                            className="btn-outline-gold"
                            style={{
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.75rem',
                              borderRadius: '4px'
                            }}
                            onClick={() => handleLoadAllPresets(preset.key, true)}
                          >
                            ✦ {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* 4 Photo Slots Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '1rem'
                      }}>
                        {SAREE_PHOTO_SLOTS.map((slot) => {
                          const currentImg = (editSareeForm.images && editSareeForm.images[slot.idx]) || (slot.idx === 0 ? editSareeForm.image : null) || slot.fallback;
                          return (
                            <div
                              key={slot.idx}
                              style={{
                                background: '#fff',
                                borderRadius: '8px',
                                border: '1.5px solid #e2d2b4',
                                padding: '0.75rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                position: 'relative',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.04)'
                              }}
                            >
                              {/* Slot Badge */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '3px',
                                  background: slot.badgeColor,
                                  color: '#fff',
                                  letterSpacing: '0.5px'
                                }}>
                                  {slot.badge}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#2e7d32', fontWeight: 700 }}>
                                  ✓ Photo {slot.idx + 1}
                                </span>
                              </div>

                              {/* Slot Title in Gujarati & English */}
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#333', lineHeight: 1.2 }}>
                                  {slot.gujarati}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#777', marginTop: '2px' }}>
                                  {slot.hint}
                                </div>
                              </div>

                              {/* Thumbnail Image */}
                              <div style={{
                                width: '100%',
                                height: '140px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                border: '1px solid #d4af37',
                                background: '#f5f0e6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <img
                                  src={currentImg}
                                  alt={slot.title}
                                  style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                                  onError={(e) => { e.target.src = slot.fallback; }}
                                />
                              </div>

                              {/* Individual Change/Upload Button */}
                              <label
                                className="btn-outline-gold"
                                style={{
                                  cursor: 'pointer',
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: '5px',
                                  fontSize: '0.78rem',
                                  textAlign: 'center',
                                  display: 'block',
                                  fontWeight: 600
                                }}
                              >
                                📷 Change Photo (Slot {slot.idx + 1})
                                <input
                                  type="file"
                                  accept="image/*,.heic,.heif,.HEIC,.HEIF"
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleSingleSlotPhotoUpload(slot.idx, e, true)}
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Description */}
                    <div style={{ marginTop: '1.2rem' }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Saree Heritage Description</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={editSareeForm.description}
                        onChange={(e) => setEditSareeForm(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div style={{ marginTop: '1.6rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <button
                        type="submit"
                        className="btn-primary-gold"
                        style={{
                          padding: '0.85rem 2.2rem',
                          fontSize: '1rem',
                          background: 'linear-gradient(135deg, #800020 0%, #a0153e 100%)',
                          color: '#ffffff',
                          fontWeight: 800,
                          boxShadow: '0 4px 14px rgba(128, 0, 32, 0.35)',
                          border: 'none',
                          cursor: savingEditSaree ? 'not-allowed' : 'pointer'
                        }}
                        disabled={savingEditSaree}
                      >
                        {savingEditSaree ? '💾 Saving Updates...' : '💾 Save & Update Saree'}
                      </button>
                      <button
                        type="button"
                        className="btn-outline-gold"
                        style={{ padding: '0.85rem 1.6rem', fontSize: '0.95rem' }}
                        onClick={() => {
                          setEditingSaree(null);
                          setEditSareeForm(null);
                          setActiveTab('inventory');
                        }}
                      >
                        ↩️ Cancel & Return to Inventory
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* TAB 4: Upload New Saree Form */
                <div className="admin-upload-saree-container" style={{ background: '#faf8f5', border: '1px solid #e2d7c7', borderRadius: '10px', padding: '1.8rem' }}>
                <div style={{ borderBottom: '1px solid #e0d5c3', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                  <h3 style={{ margin: 0, color: '#800020', fontFamily: 'var(--font-royal)' }}>
                    Add New Patola Saree to Live Catalog
                  </h3>
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                    Publish handcrafted Double/Single Ikat sarees. Price is entered in ₹ INR and will automatically convert to $ USD, € EUR, £ GBP for international customers.
                  </p>
                </div>

                <form onSubmit={handleUploadSareeSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem' }}>
                    {/* Saree Title */}
                    <div>
                      <label className="form-label" style={{ fontWeight: 700 }}>Saree Title / Design Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder="e.g. Royal Crimson Shikargah Double Ikat"
                        value={sareeForm.title}
                        onChange={(e) => setSareeForm({ ...sareeForm, title: e.target.value })}
                      />
                    </div>

                    {/* Base Price in INR with Live Conversion Preview */}
                    <div>
                      <label className="form-label" style={{ fontWeight: 700 }}>Price in Indian Rupees (₹ INR) *</label>
                      <input
                        type="number"
                        className="form-input"
                        required
                        min="1000"
                        placeholder="e.g. 185000"
                        value={sareeForm.basePriceINR}
                        onChange={(e) => setSareeForm({ ...sareeForm, basePriceINR: e.target.value })}
                      />
                    </div>

                    {/* Initial Vault Stock Quantity */}
                    <div>
                      <label className="form-label" style={{ fontWeight: 700 }}>Initial Vault Stock Quantity *</label>
                      <input
                        type="number"
                        className="form-input"
                        required
                        min="0"
                        max="9999"
                        placeholder="50"
                        value={sareeForm.stockQuantity}
                        onChange={(e) => setSareeForm({ ...sareeForm, stockQuantity: e.target.value })}
                      />
                      <span style={{ fontSize: '0.78rem', color: '#666' }}>
                        Default 50 sarees. Automatically becomes Out of Stock when all 50 pieces are sold.
                      </span>
                    </div>

                    {/* Discount Dropdown */}
<div>
  <label className="form-label" style={{ fontWeight: 700 }}>Discount *</label>
  <select
    className="form-input"
    value={sareeForm.discountPercent}
    onChange={(e) => setSareeForm({ ...sareeForm, discountPercent: e.target.value })}
  >
    <option value="0">No Discount</option>
    <option value="5">5% OFF</option>
    <option value="10">10% OFF</option>
    <option value="15">15% OFF</option>
    <option value="20">20% OFF</option>
    <option value="25">25% OFF</option>
    <option value="30">30% OFF</option>
  </select>
</div>
                  </div>

                  {/* Auto-Currency Conversion Preview Box */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(128, 0, 32, 0.08))',
                    border: '1px solid #d4af37',
                    borderRadius: '8px',
                    padding: '0.8rem 1rem',
                    margin: '1rem 0'
                  }}>
                    <strong style={{ color: '#800020', fontSize: '0.85rem' }}>
                      🌍 Automatic Real-Time Currency Conversion Preview:
                    </strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem', marginTop: '0.4rem', fontSize: '0.88rem' }}>
                      <div>🇮🇳 India: <strong style={{ color: '#800020' }}>{sareeForm.basePriceINR ? '₹ ' + parseFloat(sareeForm.basePriceINR).toLocaleString('en-IN') : '₹ 0'}</strong></div>
                      <div>🇺🇸 USA / NRI: <strong style={{ color: '#2e7d32' }}>{sareeForm.basePriceINR ? '$ ' + Math.round(parseFloat(sareeForm.basePriceINR) * 0.012).toLocaleString('en-US') : '$ 0'}</strong></div>
                      <div>🇪🇺 Europe: <strong style={{ color: '#1565c0' }}>{sareeForm.basePriceINR ? '€ ' + Math.round(parseFloat(sareeForm.basePriceINR) * 0.011).toLocaleString('en-US') : '€ 0'}</strong></div>
                      <div>🇬🇧 UK: <strong style={{ color: '#6a1b9a' }}>{sareeForm.basePriceINR ? '£ ' + Math.round(parseFloat(sareeForm.basePriceINR) * 0.0095).toLocaleString('en-US') : '£ 0'}</strong></div>
                    </div>

                    {/* Live Discount Preview */}
{sareeForm.basePriceINR && parseFloat(sareeForm.basePriceINR) > 0 && (
  <div style={{
    background: '#fdf3f3',
    border: '1px solid #e8c9c9',
    borderRadius: '8px',
    padding: '1rem 1.2rem',
    margin: '1rem 0'
  }}>
    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#800020' }}>
      💰 Final Price Preview:
    </span>
    <div style={{ marginTop: '0.4rem', fontSize: '1rem' }}>
      {Number(sareeForm.discountPercent) > 0 ? (
        <>
          <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '0.6rem' }}>
            ₹{parseFloat(sareeForm.basePriceINR).toLocaleString('en-IN')}
          </span>
          <span style={{ color: '#1a7a3c', fontWeight: 700 }}>
            ₹{Math.round(parseFloat(sareeForm.basePriceINR) - (parseFloat(sareeForm.basePriceINR) * Number(sareeForm.discountPercent) / 100)).toLocaleString('en-IN')}
          </span>
          <span style={{ marginLeft: '0.6rem', color: '#800020', fontWeight: 700 }}>
            ({sareeForm.discountPercent}% OFF)
          </span>
        </>
      ) : (
        <span style={{ fontWeight: 700 }}>
          ₹{parseFloat(sareeForm.basePriceINR).toLocaleString('en-IN')}
        </span>
      )}
    </div>
  </div>
)}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginTop: '1rem' }}>
                    {/* Weave */}
                    <div>
                      <label className="form-label">Weave Heritage</label>
                      <select
                        className="form-input"
                        value={sareeForm.weave}
                        onChange={(e) => setSareeForm({ ...sareeForm, weave: e.target.value })}
                      >
                        <option value="Royal Silk Zari Weave">Royal Silk Zari Heritage</option>
                      </select>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="form-label">Category</label>
                      <select
                        className="form-input"
                        value={sareeForm.category}
                        onChange={(e) => setSareeForm({ ...sareeForm, category: e.target.value })}
                      >
                        <option value="double-ikat">Double Ikat Heritage</option>
                        <option value="single-ikat">Single Ikat Classic</option>
                        <option value="semi-patola">Semi Patola Saree</option>
                        <option value="zari-buta">Zari Buta Patola Saree</option>
                        <option value="Modern">Modern Patola Saree</option>
                      </select>
                    </div>

                    {/* Motif */}
                    <div>
                      <label className="form-label">Sacred Motif</label>
                      <select
                        className="form-input"
                        value={sareeForm.motif}
                        onChange={(e) => {
                          const val = e.target.value;
                          let mName = 'Nari Kunjar (Elephant & Dancing Maiden)';
                          if (val === 'ratanchowk') mName = 'Ratanchowk Bhat (Sacred Jewel Square)';
                          if (val === 'chhabdi') mName = 'Chhabdi Bhat (Floral Auspicious Basket)';
                          if (val === 'pan-bhat') mName = 'Navratna Pan Bhat (Nine Gems)';
                          if (val === 'shikargah') mName = 'Shikargah (Royal Wildlife Motifs)';
                          if (val === 'Navratna') mName = 'Navratna (Jems Geometric)';
                          if (val === 'Sakhiyo') mName = 'Sakhiyo (Figurative / Human)';
                          setSareeForm({ ...sareeForm, motif: val, motifName: mName });
                        }}
                      >
                        <option value="nari-kunjar">Nari Kunjar (Elephant & Maiden)</option>
                        <option value="ratanchowk">Ratanchowk (Jewel Square)</option>
                        <option value="chhabdi">Chhabdi Bhat (Floral Basket)</option>
                        <option value="pan-bhat">Navratna Pan Bhat</option>
                        <option value="shikargah">Shikargah Royal Forest</option>
                        <option value="Navratna">Navratna (Jems Geometric)</option>
                        <option value="Sakhiyo">Sakhiyo (Figurative / Human)</option>
                      </select>
                    </div>

                    {/* Time to weave */}
                    <div>
                      <label className="form-label">Loom Handcraft Timeline</label>
                      <select
                        className="form-input"
                        value={sareeForm.timeToWeave}
                        onChange={(e) => setSareeForm({ ...sareeForm, timeToWeave: e.target.value })}
                      >
                        <option value="2 to 4 Months Handcrafted">2 to 4 Months Handcrafted</option>
                        <option value="9 Months Handcrafted">9 Months Handcrafted</option>
                        <option value="11 Months Handcrafted">11 Months Handcrafted</option>
                        <option value="6 Months Handcrafted">6 Months Handcrafted</option>
                      </select>
                    </div>

                    {/* Color Palette */}
                    <div>
                      <label className="form-label">Color Palette & Natural Dyes</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Deep Crimson Red, Saffron Ochre & Gold"
                        value={sareeForm.colors || ''}
                        onChange={(e) => setSareeForm({ ...sareeForm, colors: e.target.value })}
                      />
                    </div>

                    {/* Saree Length (Pure number with Meter / CM dropdown) */}
                    {(() => {
                      const parsed = parseLengthValue(sareeForm.length || '6.30 Meters (Includes Blouse Piece)', '6.30');
                      const currentNum = sareeForm.lengthNumber !== undefined ? sareeForm.lengthNumber : parsed.number;
                      const currentUnit = sareeForm.lengthUnit || parsed.unit || 'Meter';

                      const handleNumChange = (newVal) => {
                        const cleanNum = newVal.replace(/[^0-9.]/g, '');
                        const full = buildSareeLengthString(cleanNum, currentUnit);
                        setSareeForm(prev => ({
                          ...prev,
                          lengthNumber: cleanNum,
                          lengthUnit: currentUnit,
                          length: full
                        }));
                      };

                      const handleUnitChange = (newUnit) => {
                        let num = currentNum;
                        if (num && !isNaN(Number(num))) {
                          const n = parseFloat(num);
                          if (newUnit === 'CM' && currentUnit === 'Meter' && n < 50) {
                            num = String(Math.round(n * 100));
                          } else if (newUnit === 'Meter' && currentUnit === 'CM' && n >= 50) {
                            num = (n / 100).toFixed(2);
                          }
                        }
                        const full = buildSareeLengthString(num, newUnit);
                        setSareeForm(prev => ({
                          ...prev,
                          lengthNumber: num,
                          lengthUnit: newUnit,
                          length: full
                        }));
                      };

                      const presets = currentUnit === 'CM' ? [
                        { num: '630', desc: '630 cm (Standard with Blouse)' },
                        { num: '550', desc: '550 cm (Standard Saree)' },
                        { num: '650', desc: '650 cm (Grand Saree)' }
                      ] : [
                        { num: '6.30', desc: '6.30 (Standard with Blouse)' },
                        { num: '5.50', desc: '5.50 (Standard Saree)' },
                        { num: '6.50', desc: '6.50 (Grand Saree)' }
                      ];

                      return (
                        <div>
                          <label className="form-label" style={{ fontWeight: 700, color: '#800020', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>📏 Saree Length (સાડીની લંબાઈ) *</span>
                            <span style={{ fontSize: '0.72rem', color: '#666', fontWeight: 500 }}>
                              {currentUnit === 'CM' ? '(e.g. 630, 550, 650)' : '(e.g. 6.30, 5.50, 6.50)'}
                            </span>
                          </label>

                          {/* Number Input + Unit Dropdown */}
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                              <input
                                type="text"
                                inputMode="decimal"
                                className="form-input"
                                placeholder={currentUnit === 'CM' ? "e.g. 630" : "e.g. 6.30"}
                                value={currentNum}
                                onChange={(e) => handleNumChange(e.target.value)}
                                style={{
                                  fontWeight: 700,
                                  fontSize: '0.95rem',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                            <select
                              value={currentUnit}
                              onChange={(e) => handleUnitChange(e.target.value)}
                              className="form-input"
                              style={{
                                width: '135px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: '#fffdf8',
                                border: '1.5px solid #d4af37',
                                color: '#800020',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                boxSizing: 'border-box'
                              }}
                            >
                              <option value="Meter">Meters </option>
                              <option value="CM">CM</option>
                            </select>
                          </div>

                          {/* Quick Presets */}
                          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#666', fontWeight: 600 }}>Quick Presets:</span>
                            {presets.map(item => (
                              <button
                                key={item.num}
                                type="button"
                                onClick={() => handleNumChange(item.num)}
                                style={{
                                  background: (String(currentNum) === item.num) ? '#800020' : '#fff',
                                  color: (String(currentNum) === item.num) ? '#fff' : '#800020',
                                  border: '1px solid #d4af37',
                                  fontSize: '0.74rem',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 700
                                }}
                                title={item.desc}
                              >
                                {item.num} {currentUnit === 'CM' ? 'cm' : 'm'}
                              </button>
                            ))}
                          </div>

                          <div style={{ fontSize: '0.74rem', color: '#2e7d32', marginTop: '0.3rem', fontWeight: 600 }}>
                            ✓ Website Display: <strong>{buildSareeLengthString(currentNum, currentUnit)}</strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Photo Upload Section - All 4 Photo Showcase */}
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1.2rem',
                    background: 'rgba(212, 175, 55, 0.05)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '0.8rem' }}>
                      <div>
                        <label className="form-label" style={{ fontWeight: 700, margin: 0, fontSize: '1.05rem', color: '#800020' }}>
                          📸 Upload 4 Showcase Photos *
                        </label>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#666' }}>
                          Customers can swipe through all 4 angles on the saree card and detail view (Front, Pallu, Weave & Loom).
                        </p>
                      </div>
                      
                      {/* Bulk Upload Button */}
                      <div>
                        <label className="btn-outline-gold" style={{
                          cursor: 'pointer',
                          padding: '0.55rem 1.1rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: '#800020',
                          color: '#fff',
                          boxShadow: '0 2px 6px rgba(128,0,32,0.25)',
                          fontSize: '0.88rem'
                        }}>
                          📁 Bulk Select 4 Photos
                          <input
                            type="file"
                            accept="image/*,.heic,.heif,.HEIC,.HEIF"
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => handleBulkPhotosUpload(e, false)}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Curated Preset Sets Quick-Loader */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                      padding: '0.5rem 0.8rem',
                      background: '#fff',
                      borderRadius: '6px',
                      border: '1px solid #e0d0b0',
                      marginBottom: '1rem',
                      fontSize: '0.82rem'
                    }}>
                      <span style={{ fontWeight: 600, color: '#666' }}>👑 Royal 4-Photo Presets (Auto-Fill 4 Photos):</span>
                      {[
                        { key: 'crimson', label: 'Crimson Set' },
                        { key: 'ruby', label: 'Ruby Set' },
                        { key: 'emerald', label: 'Emerald Set' },
                        { key: 'blue', label: 'Royal Blue Set' }
                      ].map(preset => (
                        <button
                          key={preset.key}
                          type="button"
                          className="btn-outline-gold"
                          style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px'
                          }}
                          onClick={() => handleLoadAllPresets(preset.key, false)}
                        >
                          ✦ {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* 4 Photo Slots Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '1rem'
                    }}>
                      {SAREE_PHOTO_SLOTS.map((slot) => {
                        const currentImg = (sareeForm.images && sareeForm.images[slot.idx]) || 
                                           (slot.idx === 0 ? (uploadedPhoto || sareeForm.image) : null) || 
                                           slot.fallback;
                        return (
                          <div
                            key={slot.idx}
                            style={{
                              background: '#fff',
                              borderRadius: '8px',
                              border: '1.5px solid #e2d2b4',
                              padding: '0.75rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                              position: 'relative',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.04)'
                            }}
                          >
                            {/* Slot Badge */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '3px',
                                background: slot.badgeColor,
                                color: '#fff',
                                letterSpacing: '0.5px'
                              }}>
                                {slot.badge}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#2e7d32', fontWeight: 700 }}>
                                ✓ Photo {slot.idx + 1}
                              </span>
                            </div>

                            {/* Slot Title in Gujarati & English */}
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#333', lineHeight: 1.2 }}>
                                {slot.gujarati}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#777', marginTop: '2px' }}>
                                {slot.hint}
                              </div>
                            </div>

                            {/* Thumbnail Image */}
                            <div style={{
                              width: '100%',
                              height: '140px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: '1px solid #d4af37',
                              background: '#f5f0e6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <img
                                src={currentImg}
                                alt={slot.title}
                                style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                                onError={(e) => { e.target.src = slot.fallback; }}
                              />
                            </div>

                            {/* Individual Change/Upload Button */}
                            <label
                              className="btn-outline-gold"
                              style={{
                                cursor: 'pointer',
                                padding: '0.4rem 0.6rem',
                                borderRadius: '5px',
                                fontSize: '0.78rem',
                                textAlign: 'center',
                                display: 'block',
                                fontWeight: 600
                              }}
                            >
                              📷 Add / Change Photo (Slot {slot.idx + 1})
                              <input
                                type="file"
                                accept="image/*,.heic,.heif,.HEIC,.HEIF"
                                style={{ display: 'none' }}
                                onChange={(e) => handleSingleSlotPhotoUpload(slot.idx, e, false)}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ marginTop: '1.2rem' }}>
                    <label className="form-label">Saree Heritage Description</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="e.g. Masterpiece handwoven double ikat saree created with 8-ply mulberry silk and natural dyes..."
                      value={sareeForm.description}
                      onChange={(e) => setSareeForm({ ...sareeForm, description: e.target.value })}
                    />
                  </div>

                  {/* Submit Button */}
                  <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                    <button
                      type="submit"
                      className="btn-primary-gold"
                      style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}
                      disabled={savingSaree}
                    >
                      {savingSaree ? 'Publishing to SQL Server...' : '✦ Publish Saree to Live Catalog ✦'}
                    </button>
                    <button
                      type="button"
                      className="btn-outline-gold"
                      onClick={() => setActiveTab('orders')}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
              )
            ) : activeTab === 'deleted-history' ? (
              /* TAB: Deleted Records & Audit History Archive (Read-Only 10-per-page) */
              <div className="admin-deleted-history-section">
                {/* Information Callout */}
                <div style={{
                  background: 'linear-gradient(135deg, #fff1f2 0%, #fffbf0 100%)',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '10px',
                  padding: '1rem 1.3rem',
                  marginBottom: '1.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 2px 8px rgba(185, 28, 28, 0.06)'
                }}>
                  <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>📜</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.15rem', fontWeight: 800 }}>
                        Permanent Deleted Orders Archive (Read-Only History)
                      </h3>
                      <span style={{
                        background: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #f87171',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 800
                      }}>
                        🔒 Audit Trail Only (ફક્ત જોવા માટે)
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: '#7f1d1d', lineHeight: 1.45 }}>
                      આ પેજ પર એડમિન પેનલમાંથી ડિલીટ કરેલા તમામ ઓર્ડર્સની કાયમી હિસ્ટ્રી સચવાયેલી રહે છે. આ રેકોર્ડ્સ ફક્ત હિસ્ટ્રી અને ઑડિટ માટે વાંચી (View-Only) શકાય છે.
                    </p>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="admin-toolbar" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                  <div className="admin-search-wrapper" style={{ flex: 1, minWidth: '260px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search Deleted History by Order #, Customer, Phone, City, Product..."
                      value={deletedSearchQuery}
                      onChange={(e) => {
                        setDeletedSearchQuery(e.target.value);
                        setDeletedCurrentPage(1);
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {deletedSearchQuery && (
                      <button
                        type="button"
                        className="btn-outline-gold"
                        onClick={() => {
                          setDeletedSearchQuery('');
                          setDeletedCurrentPage(1);
                        }}
                        style={{ padding: '0.55rem 0.9rem', fontSize: '0.84rem' }}
                      >
                        ✕ Clear Search
                      </button>
                    )}
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#800020', background: '#faf6ee', padding: '0.5rem 0.9rem', borderRadius: '6px', border: '1px solid #ecdcc8' }}>
                      Total Deleted Records: {deletedOrderRecords.length}
                    </span>
                  </div>
                </div>

                {/* Summary Metrics */}
                <div className="admin-metrics-grid" style={{ marginBottom: '1.4rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <div className="admin-metric-card">
                    <span className="metric-label">Total Archived Records</span>
                    <span className="metric-value" style={{ color: '#991b1b' }}>{deletedOrderRecords.length}</span>
                  </div>
                  <div className="admin-metric-card">
                    <span className="metric-label">Archived Order Value</span>
                    <span className="metric-value gold">₹{totalDeletedValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="admin-metric-card">
                    <span className="metric-label">Current Page</span>
                    <span className="metric-value" style={{ color: '#800020' }}>Page {deletedCurrentPage} of {totalDeletedPages}</span>
                  </div>
                  <div className="admin-metric-card">
                    <span className="metric-label">Per Page Display</span>
                    <span className="metric-value" style={{ color: '#166534' }}>10 Records / Page</span>
                  </div>
                </div>

                {/* Deleted Records Table */}
                {paginatedDeletedOrders.length === 0 ? (
                  <div className="admin-no-orders" style={{ padding: '3.5rem 2rem', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px dashed #d4af37' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>🗑️</div>
                    <h3 style={{ color: '#800020', fontFamily: 'Cinzel, serif', marginBottom: '0.4rem' }}>
                      {deletedSearchQuery ? 'No Matching Deleted Records Found' : 'No Deleted Orders in History'}
                    </h3>
                    <p style={{ color: '#666', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
                      {deletedSearchQuery
                        ? 'Try searching with a different order reference, customer phone number or name.'
                        : 'Whenever you delete an order from the Customer Orders dashboard, its full permanent snapshot will automatically be archived here.'}
                    </p>
                  </div>
                ) : (
                  <div className="admin-orders-container">
                    <div className="admin-orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {paginatedDeletedOrders.map((ord, idx) => {
                        const items = Array.isArray(ord.items) && ord.items.length > 0 ? ord.items : [];
                        const primaryItem = items[0] || {};
                        const isDup = items.some(i => (i.category === 'dupatta') || (i.sareeTitle && i.sareeTitle.toLowerCase().includes('dupatta')));
                        const photoUrl = primaryItem.image || primaryItem.photo || '/assets/images/patola_drape.jpg';

                        return (
                          <div
                            key={ord.orderReference || idx}
                            style={{
                              background: '#ffffff',
                              border: '1.5px solid #fca5a5',
                              borderRadius: '12px',
                              padding: '1.2rem',
                              boxShadow: '0 3px 12px rgba(0, 0, 0, 0.04)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '1rem',
                              position: 'relative'
                            }}
                          >
                            {/* Card Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem', borderBottom: '1px solid #fee2e2', paddingBottom: '0.8rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <span style={{
                                  background: '#800020',
                                  color: '#ffd700',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontWeight: 800,
                                  fontSize: '0.86rem',
                                  letterSpacing: '0.5px'
                                }}>
                                  #{ord.orderReference}
                                </span>

                                <span style={{
                                  background: isDup ? '#eff6ff' : '#faf5ff',
                                  color: isDup ? '#1d4ed8' : '#7e22ce',
                                  border: isDup ? '1px solid #bfdbfe' : '1px solid #e9d5ff',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  fontSize: '0.75rem'
                                }}>
                                  {isDup ? '🧣 DUPATTA' : '🥻 SAREE'}
                                </span>

                                <span style={{
                                  background: '#fee2e2',
                                  color: '#991b1b',
                                  border: '1px solid #f87171',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 800,
                                  fontSize: '0.75rem'
                                }}>
                                  🗑️ DELETED RECORD
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontSize: '0.78rem', color: '#991b1b', background: '#fff1f2', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fecdd3', fontWeight: 600 }}>
                                  Deleted: {ord.deletedAt ? new Date(ord.deletedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Archived'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedDeletedDetail(ord)}
                                  style={{
                                    background: '#fdf7ee',
                                    border: '1.5px solid #d4af37',
                                    color: '#800020',
                                    borderRadius: '6px',
                                    padding: '0.35rem 0.85rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                  }}
                                  title="View complete historical snapshot"
                                >
                                  👁️ View Full Snapshot
                                </button>
                              </div>
                            </div>

                            {/* Main Details Body */}
                            <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                              {/* Thumbnail */}
                              <div
                                style={{
                                  width: '90px',
                                  height: '90px',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  border: '1.5px solid #ecdcc8',
                                  flexShrink: 0,
                                  cursor: 'pointer',
                                  background: '#fdfbf7',
                                  position: 'relative'
                                }}
                                onClick={() => setDeletedPhotoPreview({ img: photoUrl, name: primaryItem.sareeTitle || ord.orderReference })}
                                title="Click to enlarge photo"
                              >
                                <img
                                  src={photoUrl}
                                  alt={primaryItem.sareeTitle || 'Patola'}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <span style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.65rem', padding: '1px 3px', borderRadius: '2px' }}>
                                  🔍
                                </span>
                              </div>

                              {/* Items Column */}
                              <div style={{ flex: 1, minWidth: '240px' }}>
                                <div style={{ fontSize: '0.74rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                                  Ordered Item(s) ({items.length})
                                </div>
                                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#111', marginTop: '0.15rem' }}>
                                  {items.map(i => i.sareeTitle || i.title || 'Patola Piece').join(' + ')}
                                </div>
                                {primaryItem.motifName && (
                                  <div style={{ fontSize: '0.82rem', color: '#800020', fontWeight: 600, marginTop: '0.15rem' }}>
                                    ❖ Motif: {primaryItem.motifName} {primaryItem.weave ? `• ${primaryItem.weave}` : ''}
                                  </div>
                                )}
                                <div style={{ fontSize: '0.84rem', color: '#444', marginTop: '0.25rem' }}>
                                  <strong>Qty:</strong> {items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)} Piece(s) • <strong>Payment Mode:</strong> {ord.paymentMode || 'Online'}
                                </div>
                              </div>

                              {/* Customer Column */}
                              <div style={{ flex: 1, minWidth: '220px', borderLeft: '1px dashed #fca5a5', paddingLeft: '1rem' }}>
                                <div style={{ fontSize: '0.74rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                                  Customer Info
                                </div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111', marginTop: '0.15rem' }}>
                                  👤 {ord.customerName}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#555', marginTop: '0.15rem' }}>
                                  📞 {ord.contactPhone || 'No Phone'} {ord.email ? `• ✉️ ${ord.email}` : ''}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>
                                  📍 {ord.deliveryAddress || ord.city || 'Address Saved in Snapshot'}{ord.state ? `, ${ord.state}` : ''}{ord.postalCode ? ` - ${ord.postalCode}` : ''}
                                </div>
                              </div>

                              {/* Total Amount Column */}
                              <div style={{ textAlign: 'right', minWidth: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: '0.74rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                                  Order Total
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#800020' }}>
                                  ₹{(ord.totalAmount || 0).toLocaleString('en-IN')}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#777', marginTop: '0.15rem' }}>
                                  Placed: {formatDateDDMMYYYY(ord.originalCreatedAt, 'N/A')}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Bar (10 per page) */}
                    {totalDeletedPages > 1 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '1.8rem',
                        padding: '1rem 1.2rem',
                        background: '#ffffff',
                        border: '1.5px solid #ecdcc8',
                        borderRadius: '10px',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}>
                        <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>
                          Showing {((deletedCurrentPage - 1) * DELETED_PER_PAGE) + 1} - {Math.min(deletedCurrentPage * DELETED_PER_PAGE, filteredDeletedOrders.length)} of {filteredDeletedOrders.length} deleted records
                        </div>

                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            disabled={deletedCurrentPage <= 1}
                            onClick={() => setDeletedCurrentPage(p => Math.max(1, p - 1))}
                            style={{
                              padding: '0.45rem 0.9rem',
                              borderRadius: '6px',
                              border: '1px solid #d4af37',
                              background: deletedCurrentPage <= 1 ? '#f3f4f6' : '#ffffff',
                              color: deletedCurrentPage <= 1 ? '#9ca3af' : '#800020',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              cursor: deletedCurrentPage <= 1 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            ← Previous
                          </button>

                          {Array.from({ length: totalDeletedPages }, (_, i) => i + 1).map(pageNum => (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setDeletedCurrentPage(pageNum)}
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '6px',
                                border: pageNum === deletedCurrentPage ? '2px solid #800020' : '1px solid #d1d5db',
                                background: pageNum === deletedCurrentPage ? '#800020' : '#ffffff',
                                color: pageNum === deletedCurrentPage ? '#ffd700' : '#374151',
                                fontWeight: pageNum === deletedCurrentPage ? 800 : 600,
                                fontSize: '0.82rem',
                                cursor: 'pointer'
                              }}
                            >
                              {pageNum}
                            </button>
                          ))}

                          <button
                            type="button"
                            disabled={deletedCurrentPage >= totalDeletedPages}
                            onClick={() => setDeletedCurrentPage(p => Math.min(totalDeletedPages, p + 1))}
                            style={{
                              padding: '0.45rem 0.9rem',
                              borderRadius: '6px',
                              border: '1px solid #d4af37',
                              background: deletedCurrentPage >= totalDeletedPages ? '#f3f4f6' : '#ffffff',
                              color: deletedCurrentPage >= totalDeletedPages ? '#9ca3af' : '#800020',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              cursor: deletedCurrentPage >= totalDeletedPages ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

        {/* Full Snapshot Detail Modal for Deleted Record */}
        {selectedDeletedDetail && (
          <div
            className="modal-backdrop open"
            onClick={() => setSelectedDeletedDetail(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(5px)',
              zIndex: 9999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div
              style={{
                background: '#ffffff',
                border: '2px solid #d4af37',
                borderRadius: '14px',
                maxWidth: '700px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '1.8rem',
                position: 'relative',
                boxShadow: '0 25px 50px rgba(0,0,0,0.4)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedDeletedDetail(null)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: '#800020',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '1rem'
                }}
              >
                ✕
              </button>

              <div style={{ textAlign: 'center', marginBottom: '1.2rem', borderBottom: '1.5px solid #ecdcc8', paddingBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', letterSpacing: '2px', color: '#800020', fontWeight: 800 }}>
                  📜 PERMANENT ARCHIVE SNAPSHOT (AUDIT RECORD)
                </span>
                <h3 style={{ margin: '0.3rem 0 0 0', color: '#800020', fontFamily: 'Cinzel, serif', fontSize: '1.4rem' }}>
                  Deleted Order #{selectedDeletedDetail.orderReference}
                </h3>
                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.82rem', color: '#666' }}>
                  Archived Record ID: {selectedDeletedDetail.id} • Deleted on: {new Date(selectedDeletedDetail.deletedAt).toLocaleString('en-IN')}
                </p>
              </div>

              {/* Customer Info Box */}
              <div style={{ background: '#faf6ee', padding: '1rem', borderRadius: '8px', border: '1px solid #ecdcc8', marginBottom: '1.2rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#800020', fontSize: '0.95rem' }}>👤 Customer & Shipping Snapshot</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem', fontSize: '0.85rem' }}>
                  <div><strong>Name:</strong> {selectedDeletedDetail.customerName}</div>
                  <div><strong>Phone:</strong> {selectedDeletedDetail.contactPhone}</div>
                  <div><strong>Email:</strong> {selectedDeletedDetail.email || 'N/A'}</div>
                  <div><strong>Payment Mode:</strong> {selectedDeletedDetail.paymentMode}</div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong>Delivery Address:</strong> {selectedDeletedDetail.deliveryAddress}, {selectedDeletedDetail.city} {selectedDeletedDetail.postalCode} {selectedDeletedDetail.state}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div style={{ marginBottom: '1.2rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#800020', fontSize: '0.95rem' }}>🛍️ Ordered Items ({selectedDeletedDetail.items?.length || 0})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {(selectedDeletedDetail.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', background: '#fffcf7', padding: '0.6rem', borderRadius: '8px', border: '1px solid #ecdcc8' }}>
                      <img src={item.image || '/assets/images/patola_drape.jpg'} alt={item.sareeTitle} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '0.92rem', color: '#111' }}>{item.sareeTitle}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          Qty: {item.quantity || 1} • Unit Price: ₹{(item.unitPrice || 0).toLocaleString('en-IN')}
                        </div>
                        {item.motifName && <div style={{ fontSize: '0.78rem', color: '#800020' }}>Motif: {item.motifName}</div>}
                      </div>
                      <div style={{ fontWeight: 800, color: '#800020', fontSize: '1rem' }}>
                        ₹{((item.unitPrice || selectedDeletedDetail.totalAmount) * (item.quantity || 1)).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px solid #ecdcc8', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 700 }}>
                  🗑️ Status at Deletion: {selectedDeletedDetail.lastOrderStatus}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>Total Amount:</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#800020' }}>
                    ₹{(selectedDeletedDetail.totalAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photo Lightbox for Deleted Record Preview */}
        {deletedPhotoPreview && (
          <div
            className="custom-photo-portal-backdrop"
            onClick={() => setDeletedPhotoPreview(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.85)',
              zIndex: 99999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem'
            }}
          >
            <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', maxWidth: '600px', width: '100%', textAlign: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setDeletedPhotoPreview(null)}
                style={{ position: 'absolute', top: '8px', right: '8px', background: '#800020', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 800 }}
              >
                ✕
              </button>
              <h4 style={{ margin: '0 0 0.8rem 0', color: '#800020' }}>{deletedPhotoPreview.name}</h4>
              <img src={deletedPhotoPreview.img} alt="Deleted item preview" style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px' }} />
            </div>
          </div>
        )}

            {/* Dedicated Edit Order Fulfillment Popup Dialog */}
            {editingOrder && (
              <div
                className="admin-edit-modal-backdrop"
                onClick={() => { setEditingOrder(null); setEditingOrderRef(null); }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(12, 8, 8, 0.78)',
                  backdropFilter: 'blur(5px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 999999,
                  padding: '1rem'
                }}
              >
                <div
                  className="admin-edit-modal-content"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #d4af37',
                    borderRadius: '14px',
                    width: '100%',
                    maxWidth: '680px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    padding: '1.6rem',
                    position: 'relative'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { setEditingOrder(null); setEditingOrderRef(null); }}
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      background: '#f3ece1',
                      border: 'none',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#800020',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Close editor"
                  >
                    ✕
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '1.6rem' }}>✏️</span>
                    <h3 style={{ margin: 0, color: 'var(--color-primary-dark)', fontSize: '1.3rem', fontFamily: 'var(--font-serif)' }}>
                      Update Order #{editingOrder.orderReference}
                    </h3>
                  </div>
                  <p style={{ margin: '0 0 1.1rem 0', fontSize: '0.86rem', color: '#555' }}>
                    Customer: <strong style={{ color: '#111' }}>{editingOrder.customerName}</strong> • Phone: <strong style={{ color: '#111' }}>{editingOrder.contactPhone}</strong>
                    {editingOrder.items && editingOrder.items.length > 0 && (
                      <span style={{ display: 'block', marginTop: '0.2rem', color: '#800020' }}>
                        🥻 {editingOrder.items.map(i => i.sareeTitle || 'Patola Saree').join(', ')}
                      </span>
                    )}
                  </p>

                  {/* Stage Selector */}
                  <label className="form-label" style={{ fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.5rem', display: 'block' }}>
                    Fulfillment Stage (Select Weaving to Delivery Stage):
                  </label>
                  <div className="stage-selector-grid" style={{ marginBottom: '1rem' }}>
                    {STAGES.map(st => (
                      <button
                        key={st.id}
                        type="button"
                        className={`stage-select-btn ${editStage === st.id ? 'selected' : ''}`}
                        onClick={() => setEditStage(st.id)}
                      >
                        <strong>Stage {st.id}: {st.name}</strong>
                        <small>{st.desc}</small>
                      </button>
                    ))}
                  </div>

                  {/* Courier partner if stage >= 4 */}
                  {editStage >= 4 && (
                    <div className="courier-input-row" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <label className="form-label">Courier Partner</label>
                        <select
                          className="form-input"
                          value={editCourier}
                          onChange={(e) => setEditCourier(e.target.value)}
                        >
                          <option value="Blue Dart Express">Blue Dart Express (Armored Air)</option>
                          <option value="India Post Speed Post">India Post Speed Post (Insured)</option>
                          <option value="DTDC Premium Express">DTDC Premium Express</option>
                          <option value="Direct Loom Delivery">Direct Handloom Dispatch</option>
                        </select>
                      </div>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <label className="form-label">AWB / Tracking Docket Number</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Enter Delivery OTP / Docket Number"
                          value={editAwb === 'OTP-VERIFIED' ? '' : editAwb}
                          onChange={(e) => setEditAwb(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Manual Estimated Delivery Date Input */}
                  <div style={{ background: '#fffcf7', padding: '0.9rem', borderRadius: '8px', border: '1.5px dashed #d4af37', marginBottom: '1.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                      📅 Estimated Delivery Date (Set custom delivery date):
                    </label>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        type="date"
                        className="form-input"
                        style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1.5px solid #d4af37', background: '#fff', fontSize: '0.9rem' }}
                        onChange={(e) => {
                          if (e.target.value) {
                            const formatted = formatDateDDMMYYYY(e.target.value);
                            setEditDeliveryDate(`Delivering by ${formatted}`);
                          }
                        }}
                        title="Select date from calendar"
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 25-10-2026 or 7 to 10 Days"
                        value={editDeliveryDate}
                        onChange={(e) => setEditDeliveryDate(e.target.value)}
                        style={{ flex: 1, minWidth: '220px', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1.5px solid #d4af37', background: '#fff', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.55rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.76rem', color: '#666', fontWeight: 600 }}>Presets:</span>
                      <button
                        type="button"
                        className="date-preset-pill"
                        style={{ fontWeight: 700, border: '1.5px solid #16a34a', background: '#f0fdf4', color: '#15803d', cursor: 'pointer' }}
                        onClick={() => setEditDeliveryDate('5 to 10 Days (Express Handloom Delivery)')}
                      >
                        ⚡ 5 to 10 Days (Default)
                      </button>
                      <button
                        type="button"
                        className="date-preset-pill"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setEditDeliveryDate('📦 Ready to Ship (10 to 15 Days)')}
                      >
                        📦 10-15 Days
                      </button>
                      <button
                        type="button"
                        className="date-preset-pill"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setEditDeliveryDate('🗓️ Master Weave Dispatch (1 Month)')}
                      >
                        🗓️ 1 Month
                      </button>
                      <button
                        type="button"
                        className="date-preset-pill"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setEditDeliveryDate('🧵 Custom Double Ikat Loom (2 to 4 Months)')}
                      >
                        🧵 2-4 Months
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-outline-gold"
                      onClick={() => { setEditingOrder(null); setEditingOrderRef(null); }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary-gold"
                      disabled={savingStatus}
                      onClick={async () => {
                        await handleSaveStatus(editingOrder.orderReference);
                      }}
                      style={{ minWidth: '220px' }}
                    >
                      {savingStatus ? 'Saving changes...' : '✓ Save & Update Customer Live'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Order Photo Preview Lightbox - rendered directly onto document.body via Portal */}
        {previewCustomPhoto && typeof document !== 'undefined' && createPortal(
          <div
            className="custom-photo-portal-backdrop"
            onClick={() => setPreviewCustomPhoto(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(10, 6, 6, 0.92)',
              backdropFilter: 'blur(8px)',
              zIndex: 999999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.2rem',
              boxSizing: 'border-box',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '2px solid #d4af37',
                padding: '1.5rem',
                maxWidth: '720px',
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                textAlign: 'center',
                boxShadow: '0 25px 60px rgba(0,0,0,0.65)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewCustomPhoto(null)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: '#800020',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
                aria-label="Close Preview"
              >
                ✕
              </button>
              <h4 style={{ color: '#800020', fontFamily: 'Cinzel, serif', margin: '0 0 0.4rem 0', fontSize: '1.2rem' }}>
                ✦ Customer Reference Saree Photo ({previewCustomPhoto.name}) ✦
              </h4>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#666' }}>
                Uploaded by customer for bespoke Double Ikat Patola weaving reference
              </p>
              <div style={{
                width: '100%',
                maxHeight: '65vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0d0705',
                borderRadius: '10px',
                padding: '0.5rem',
                border: '1px solid #d4af37',
                overflow: 'hidden'
              }}>
                <img
                  src={previewCustomPhoto.img}
                  alt="Full Size Reference"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '62vh',
                    objectFit: 'contain',
                    borderRadius: '6px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                  }}
                />
              </div>
              <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn-outline-gold"
                  onClick={() => {
                    if (previewCustomPhoto.img) {
                      const win = window.open();
                      if (win) {
                        win.document.write(`<title>Customer Reference Photo - ${previewCustomPhoto.name || 'Patola'}</title><style>body{margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh;}img{max-width:98vw;max-height:98vh;object-fit:contain;border-radius:8px;box-shadow:0 0 30px rgba(0,0,0,0.8);}</style><img src="${previewCustomPhoto.img}" alt="Customer Photo"/>`);
                      }
                    }
                  }}
                  style={{ padding: '0.55rem 1.2rem', fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                >
                  🔍 Open Full Image in New Tab ↗
                </button>
                <button
                  type="button"
                  className="btn-primary-gold"
                  onClick={() => setPreviewCustomPhoto(null)}
                  style={{ padding: '0.55rem 1.6rem', fontSize: '0.88rem' }}
                >
                  ✕ Close Photo Preview
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
        {/* Instant Deleted History Popup Modal - rendered directly onto document.body via Portal */}
        {isDeletedHistoryModalOpen && typeof document !== 'undefined' && createPortal(
          <div
            className="modal-backdrop open"
            onClick={() => setIsDeletedHistoryModalOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(15, 7, 7, 0.85)',
              backdropFilter: 'blur(8px)',
              zIndex: 99999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              boxSizing: 'border-box'
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '2px solid #d4af37',
                width: '100%',
                maxWidth: '960px',
                maxHeight: '92vh',
                overflowY: 'auto',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                padding: '1.6rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem', borderBottom: '1.5px solid #fecdd3', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#ffe4e6',
                    border: '1.5px solid #fda4af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    flexShrink: 0
                  }}>
                    📜
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, color: '#991b1b', fontFamily: 'Cinzel, serif', fontSize: '1.35rem', fontWeight: 800 }}>
                        Deleted Orders & Custom Commissions History
                      </h3>
                      <span style={{
                        background: '#991b1b',
                        color: '#ffd700',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: '1px solid #d4af37'
                      }}>
                        {deletedOrderRecords.length} Archived
                      </span>
                    </div>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.84rem', color: '#7f1d1d' }}>
                      કાયમી ડિલીટ થયેલા તમામ ઓર્ડર્સ, કસ્ટમ ઓર્ડર્સ અને બુકિંગ્સની હિસ્ટ્રી (Read-Only Audit Trail)
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeletedHistoryModalOpen(false);
                      setActiveTab('deleted-history');
                      setDeletedCurrentPage(1);
                      setTimeout(() => {
                        const el = document.querySelector('.admin-deleted-history-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    style={{
                      background: '#fff1f2',
                      border: '1.5px solid #f43f5e',
                      color: '#991b1b',
                      borderRadius: '8px',
                      padding: '0.5rem 0.95rem',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                    title="View in main Admin Dashboard tab below"
                  >
                    👇 View in Admin Page Below
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDeletedHistoryModalOpen(false)}
                    style={{
                      background: '#800020',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Close History Popup"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Live Search & Summary Stats */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by Order #, Customer Name, Phone, City, Motif..."
                    value={deletedSearchQuery}
                    onChange={(e) => {
                      setDeletedSearchQuery(e.target.value);
                      setDeletedCurrentPage(1);
                    }}
                    style={{ width: '100%', padding: '0.6rem 0.9rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ background: '#faf6ee', border: '1px solid #ecdcc8', borderRadius: '8px', padding: '0.4rem 0.8rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase' }}>Archived Records</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#991b1b' }}>{deletedOrderRecords.length}</div>
                  </div>
                  <div style={{ background: '#faf6ee', border: '1px solid #ecdcc8', borderRadius: '8px', padding: '0.4rem 0.8rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase' }}>Archived Value</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#800020' }}>₹{totalDeletedValue.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>

              {/* Records List in Popup */}
              {paginatedDeletedOrders.length === 0 ? (
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#fffcf7', borderRadius: '12px', border: '1.5px dashed #fca5a5' }}>
                  <div style={{ fontSize: '2.8rem', marginBottom: '0.6rem' }}>🗑️</div>
                  <h4 style={{ color: '#800020', margin: '0 0 0.3rem 0', fontFamily: 'Cinzel, serif' }}>
                    {deletedSearchQuery ? 'No Matching Deleted Records Found' : 'No Deleted Orders in History Archive'}
                  </h4>
                  <p style={{ color: '#666', fontSize: '0.86rem', margin: 0 }}>
                    {deletedSearchQuery ? 'Try clearing or changing your search terms.' : 'When orders or custom orders are deleted, their snapshots will appear here.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  {paginatedDeletedOrders.map((ord, idx) => {
                    const items = Array.isArray(ord.items) && ord.items.length > 0 ? ord.items : [];
                    const primaryItem = items[0] || {};
                    const isCustom = !!ord.isCustomOrder || (ord.orderReference && ord.orderReference.startsWith('CST-'));
                    const isDup = items.some(i => (i.category === 'dupatta') || (i.sareeTitle && i.sareeTitle.toLowerCase().includes('dupatta')));
                    const photoUrl = primaryItem.image || primaryItem.photo || '/assets/images/patola_drape.jpg';

                    return (
                      <div
                        key={ord.orderReference || idx}
                        style={{
                          background: isCustom ? '#fffbf5' : '#ffffff',
                          border: isCustom ? '1.5px solid #d4af37' : '1.5px solid #fecdd3',
                          borderRadius: '10px',
                          padding: '1rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem'
                        }}
                      >
                        {/* Top Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid #fee2e2', paddingBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{
                              background: isCustom ? '#800020' : '#4a0404',
                              color: '#ffd700',
                              padding: '3px 8px',
                              borderRadius: '5px',
                              fontWeight: 800,
                              fontSize: '0.82rem'
                            }}>
                              #{ord.orderReference}
                            </span>
                            {isCustom ? (
                              <span style={{
                                background: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #f59e0b',
                                padding: '2px 7px',
                                borderRadius: '5px',
                                fontWeight: 800,
                                fontSize: '0.74rem'
                              }}>
                                ✨ CUSTOM ORDER
                              </span>
                            ) : (
                              <span style={{
                                background: isDup ? '#eff6ff' : '#faf5ff',
                                color: isDup ? '#1d4ed8' : '#7e22ce',
                                border: isDup ? '1px solid #bfdbfe' : '1px solid #e9d5ff',
                                padding: '2px 7px',
                                borderRadius: '5px',
                                fontWeight: 700,
                                fontSize: '0.74rem'
                              }}>
                                {isDup ? '🧣 DUPATTA' : '🥻 SAREE'}
                              </span>
                            )}
                            <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              🗑️ DELETED
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.74rem', color: '#991b1b' }}>
                              {formatDateDDMMYYYY(ord.deletedAt, 'Archived')}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedDeletedDetail(ord)}
                              style={{
                                background: '#fdf7ee',
                                border: '1px solid #d4af37',
                                color: '#800020',
                                borderRadius: '5px',
                                padding: '0.3rem 0.65rem',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              👁️ View Snapshot
                            </button>
                          </div>
                        </div>

                        {/* Content */}
                        <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <div
                            style={{
                              width: '70px',
                              height: '70px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: '1px solid #ecdcc8',
                              flexShrink: 0,
                              cursor: 'pointer'
                            }}
                            onClick={() => setDeletedPhotoPreview({ img: photoUrl, name: primaryItem.sareeTitle || ord.orderReference })}
                            title="Enlarge Photo"
                          >
                            <img src={photoUrl} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>

                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <div style={{ fontWeight: 800, color: '#111', fontSize: '0.92rem' }}>
                              {items.map(i => i.sareeTitle || i.title || 'Patola Custom Weave').join(' + ')}
                            </div>
                            {primaryItem.motifName && (
                              <div style={{ fontSize: '0.78rem', color: '#800020', fontWeight: 600 }}>
                                ❖ Motif: {primaryItem.motifName} {primaryItem.weave ? `• ${primaryItem.weave}` : ''}
                              </div>
                            )}
                            <div style={{ fontSize: '0.78rem', color: '#555', marginTop: '0.2rem' }}>
                              👤 <strong>{ord.customerName}</strong> • 📞 {ord.contactPhone}
                              {ord.city ? ` • 📍 ${ord.city}` : ''}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', minWidth: '110px' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#800020' }}>
                              ₹{(ord.totalAmount || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#666' }}>
                              {ord.paymentMode || 'Commission'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Popup Pagination */}
              {totalDeletedPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #fee2e2', paddingTop: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>
                    Page {deletedCurrentPage} of {totalDeletedPages} ({filteredDeletedOrders.length} records)
                  </span>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                      type="button"
                      disabled={deletedCurrentPage <= 1}
                      onClick={() => setDeletedCurrentPage(p => Math.max(1, p - 1))}
                      style={{ padding: '0.35rem 0.75rem', borderRadius: '4px', border: '1px solid #d4af37', background: '#fff', color: '#800020', cursor: deletedCurrentPage <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      ← Prev
                    </button>
                    <button
                      type="button"
                      disabled={deletedCurrentPage >= totalDeletedPages}
                      onClick={() => setDeletedCurrentPage(p => Math.min(totalDeletedPages, p + 1))}
                      style={{ padding: '0.35rem 0.75rem', borderRadius: '4px', border: '1px solid #d4af37', background: '#fff', color: '#800020', cursor: deletedCurrentPage >= totalDeletedPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
        {/* Floating 1-Click Deleted History Trigger at Bottom-Right (Red Box Position) */}
        {isAuthenticated && (
          <button
            type="button"
            className="floating-deleted-history-btn"
            onClick={() => setIsDeletedHistoryModalOpen(true)}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '28px',
              zIndex: 999999,
              background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
              color: '#ffd700',
              border: '2px solid #d4af37',
              borderRadius: '50px',
              padding: '0.65rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 8px 24px rgba(127, 29, 29, 0.45), 0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              letterSpacing: '0.3px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(127, 29, 29, 0.6), 0 4px 10px rgba(212, 175, 55, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(127, 29, 29, 0.45), 0 2px 8px rgba(0,0,0,0.3)';
            }}
            title="Click to Open Permanent Deleted History Popup"
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>📜</span>
            <span>Deleted History</span>
            <span style={{
              background: '#ffd700',
              color: '#800020',
              borderRadius: '12px',
              padding: '2px 7px',
              fontSize: '0.78rem',
              fontWeight: 900,
              marginLeft: '2px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)'
            }}>
              {deletedOrderRecords.length}
            </span>
          </button>
        )}
      </main>
    </div>
  );
}
