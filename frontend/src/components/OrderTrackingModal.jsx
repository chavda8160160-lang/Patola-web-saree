/* ====================================================================================================
 * File Name: OrderTrackingModal.jsx
 * Folder: frontend/src/components/
 * 
 * Purpose:
 * ----------------------------------------------------------------------------------------------------
 * Live order tracking and delivery progress modal.
 * - Displays live status by order reference (VP-XXXXXX).
 * - Shows delivery handover OTP.
 * - Displays 100% Transit Insured badge.
 * - Displays 5-stage royal weaving and delivery timeline.
 * ==================================================================================================== */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ApiService } from '../services/api';
import { getOrderDeliveryOtp, formatDateDDMMYYYY } from '../utils/security';
import CustomerReviewModal from './CustomerReviewModal';

export default function OrderTrackingModal({
  isOpen,
  onClose,
  activeOrder,
  allOrders = [],
  currentCustomer,
  onOpenCustomerAuth,
  onTrackOtherOrder,
  onOrderUpdated,
  formatPrice
}) {
  const [searchRef, setSearchRef] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchedCustomerOrders, setSearchedCustomerOrders] = useState([]);
  const [copied, setCopied] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(activeOrder);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [userReview, setUserReview] = useState(null);

  // Cancellation State (Full Order)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed my mind / Decided later');
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancellingLoading, setCancellingLoading] = useState(false);
  const [selectedItemIndicesToCancel, setSelectedItemIndicesToCancel] = useState([]);

  // Single Item (Saree / Dupatta) Cancellation State
  const [itemToCancel, setItemToCancel] = useState(null);
  const [itemCancelReason, setItemCancelReason] = useState('Ordered duplicate by mistake');
  const [itemCancelNotes, setItemCancelNotes] = useState('');
  const [itemCancelLoading, setItemCancelLoading] = useState(false);
  const [customerDeliveryOtpInput, setCustomerDeliveryOtpInput] = useState('');
  const [verifyingDeliveryOtp, setVerifyingDeliveryOtp] = useState(false);
  const [deliveryOtpMessage, setDeliveryOtpMessage] = useState('');

  // Helper to get Item Type Label (Saree vs Dupatta)
  const isDupattaItem = (item) => {
    if (!item) return false;
    const combinedStr = [
      item.sareeId,
      item.id,
      item.pieceKey,
      item.category,
      item.itemType,
      item.type,
      item.pieceTitle,
      item.sareeTitle,
      item.title,
      item.name,
      item.subtitle,
      item.weave,
      item.description,
      item.fabric,
      item.length
    ].filter(Boolean).map(s => String(s).toLowerCase()).join(' ');

    if (combinedStr.includes('dupatta')) return true;

    // Also check cached or stored catalog items
    try {
      const catalog = JSON.parse(localStorage.getItem('patola_custom_catalog') || '[]');
      const targetId = String(item.sareeId || item.id || '').toLowerCase();
      if (targetId) {
        const found = catalog.find(c => String(c.id).toLowerCase() === targetId);
        if (found) {
          const catStr = [found.id, found.category, found.title, found.subtitle, found.weave, found.description].filter(Boolean).map(s => String(s).toLowerCase()).join(' ');
          if (catStr.includes('dupatta')) return true;
        }
      }
    } catch (e) {}

    return false;
  };

  const handleCustomerVerifyDeliveryOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!order || !order.orderReference) return;

    const ref = order.orderReference;
    const authorOtp = getOrderDeliveryOtp(order);
    const otpToSubmit = (customerDeliveryOtpInput || authorOtp || '').trim();

    if (!otpToSubmit) {
      setDeliveryOtpMessage('Please enter the 4-digit Delivery OTP.');
      return;
    }

    setVerifyingDeliveryOtp(true);
    setDeliveryOtpMessage('');

    try {
      const res = await ApiService.verifyCustomerDeliveryOtp(ref, otpToSubmit);
      setVerifyingDeliveryOtp(false);
      if (res && (res.verified || res.success)) {
        setDeliveryOtpMessage('🎉 Delivery Handover Completed! OrderStatus is now Delivered.');
        setCurrentOrder(prev => ({
          ...(prev || {}),
          orderStatus: 'Delivered',
          currentStage: 5,
          deliveryOtp: null
        }));
        if (onOrderUpdated) {
          onOrderUpdated({
            orderReference: ref,
            orderStatus: 'Delivered',
            currentStage: 5
          });
        }
      } else {
        setDeliveryOtpMessage(res?.message || 'Invalid Delivery OTP.');
      }
    } catch (err) {
      setVerifyingDeliveryOtp(false);
      setDeliveryOtpMessage(err?.response?.data?.message || err?.message || 'Failed to verify Delivery OTP.');
    }
  };

  const getItemTypeLabel = (item) => {
    return isDupattaItem(item) ? 'Dupatta' : 'Saree';
  };

  // Get item cancellations for a given order reference
  const getOrderItemCancellations = (orderRef) => {
    if (!orderRef) return {};
    try {
      const allItemCancels = JSON.parse(localStorage.getItem('patola_order_item_cancellations') || '{}');
      return allItemCancels[orderRef] || {};
    } catch (e) {
      return {};
    }
  };

  // Expand order items so every individual saree / dupatta is shown as its own distinct item card
  const getExpandedOrderItems = (ord) => {
    if (!ord) return [];
    const rawItems = ord.items && ord.items.length > 0 ? ord.items : [ord];
    const expanded = [];
    rawItems.forEach((item, itemIdx) => {
      if (!item) return;
      if (item.isPiece) {
        expanded.push(item);
        return;
      }
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Number(item.unitPrice || item.finalPriceINR || 0) || ((ord.totalAmount || 0) / rawItems.length / qty);
      const typeLabel = getItemTypeLabel(item);

      if (qty === 1) {
        const pKey = item.pieceKey || item.sareeId || item.id || `item_${itemIdx}`;
        expanded.push({
          ...item,
          originalItemIdx: itemIdx,
          pieceIndex: 1,
          totalPieces: 1,
          pieceTitle: item.sareeTitle || item.title || (typeLabel === 'Dupatta' ? 'Authentic Patola Silk Dupatta' : 'Authentic Double Ikat Patola Saree'),
          pieceKey: pKey,
          piecePrice: unitPrice,
          isPiece: true
        });
      } else {
        // Expand multiple quantity into individual pieces so customer can see and cancel each piece individually!
        for (let p = 1; p <= qty; p++) {
          const pKey = `${item.sareeId || item.id || `item_${itemIdx}`}_p${p}`;
          expanded.push({
            ...item,
            quantity: 1,
            originalItemIdx: itemIdx,
            pieceIndex: p,
            totalPieces: qty,
            pieceTitle: `${item.sareeTitle || item.title || (typeLabel === 'Dupatta' ? 'Authentic Patola Silk Dupatta' : 'Authentic Double Ikat Patola Saree')} (#${p})`,
            pieceKey: pKey,
            piecePrice: unitPrice,
            isPiece: true
          });
        }
      }
    });
    return expanded;
  };

  const isPieceCancelled = (orderRef, item, idx) => {
    if (!orderRef || !item) return false;
    if (item.isCancelled) return true;
    const itemCancels = getOrderItemCancellations(orderRef);
    const pieceKey = item.pieceKey || item.sareeId || item.id || `idx_${idx}`;
    const altKey = item.originalItemIdx !== undefined ? `idx_${item.originalItemIdx}_p${item.pieceIndex}` : `idx_${idx}`;
    return Boolean(itemCancels[pieceKey] || itemCancels[altKey] || itemCancels[`idx_${idx}`]);
  };

  const getPieceCancelData = (orderRef, item, idx) => {
    if (!orderRef || !item) return null;
    const itemCancels = getOrderItemCancellations(orderRef);
    const pieceKey = item.pieceKey || item.sareeId || item.id || `idx_${idx}`;
    const altKey = item.originalItemIdx !== undefined ? `idx_${item.originalItemIdx}_p${item.pieceIndex}` : `idx_${idx}`;
    return (
      itemCancels[pieceKey] ||
      itemCancels[altKey] ||
      itemCancels[`idx_${idx}`] ||
      (item.isCancelled ? (item.cancelInfo || { reason: 'Item cancelled', refundAmount: item.piecePrice || item.unitPrice }) : null)
    );
  };

  const isOrderItemCancelled = (orderRef, item, idx) => isPieceCancelled(orderRef, item, idx);

  // Custom Order Photo Lightbox Preview
  const [previewCustomPhoto, setPreviewCustomPhoto] = useState(null);

  // All Customer Orders from Database (both regular orders and bespoke custom orders)
  const [dbOrders, setDbOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Helper to detect Custom Bespoke Loom Bookings
  const isCustomBooking = (b) => {
    if (!b) return false;
    const exp = (b.experienceType || '').toLowerCase();
    const notes = (b.notes || '').toLowerCase();
    return exp.includes('custom') || exp.includes('bespoke') || notes.includes('[bespoke custom patola]');
  };

  // Helper to map a custom booking from SQL Server to a trackable Order object
  const mapCustomBookingToOrder = (b) => {
    const bIdStr = String(b.id || '');
    const numId = parseInt(bIdStr.replace(/\D/g, ''), 10);
    const ref = !isNaN(numId) ? `VP-CST-${String(numId).padStart(4, '0')}` : (bIdStr ? `VP-CST-${bIdStr}` : 'VP-CST-0001');
    const cstRef = !isNaN(numId) ? `CST-${numId}` : `CST-${bIdStr}`;
    const bkRef = !isNaN(numId) ? `BK-${numId}` : `BK-${bIdStr}`;
    const allAliases = [ref, cstRef, bkRef, bIdStr].filter(Boolean);

    let clean = (b.notes || '')
      .replace(/\[BESPOKE CUSTOM PATOLA\]/i, '')
      .replace(/\[Reference Photo Attached by Customer\]/i, '')
      .replace(/\[No Photo Attached\]/i, '')
      .trim();

    let colors = '';
    let city = '';
    let description = clean;

    const colorMatch = clean.match(/Colors:\s*([^.]+)\./i);
    if (colorMatch) colors = colorMatch[1].trim();

    const cityMatch = clean.match(/City:\s*([^.]+)\./i);
    if (cityMatch) city = cityMatch[1].trim();

    const descMatch = clean.match(/Description:\s*([^.]+)/i);
    if (descMatch) description = descMatch[1].trim();

    // Check if customer uploaded photo is in b.referencePhoto, embedded in notes, or saved in localStorage
    let photo = null;
    if (typeof b.referencePhoto === 'string' && (b.referencePhoto.startsWith('data:image') || b.referencePhoto.startsWith('http') || b.referencePhoto.startsWith('/'))) {
      photo = b.referencePhoto;
    } else if (b.notes && typeof b.notes === 'string') {
      const match = b.notes.match(/\[REF_PHOTO:(data:image\/[^\]]+)\]/) || b.notes.match(/\[PHOTO_DATA:(data:image\/[^\]]+)\]/);
      if (match && match[1]) photo = match[1];
    }
    if (!photo) {
      try {
        const photoMap = JSON.parse(localStorage.getItem('patola_custom_order_photos') || '{}');
        const cleanPhone = String(b.phone || '').replace(/\D/g, '');
        const candidates = [
          photoMap[bIdStr],
          photoMap[cstRef],
          photoMap[ref],
          photoMap[String(b.phone)],
          photoMap[cleanPhone]
        ];
        for (const cand of candidates) {
          if (typeof cand === 'string' && cand.length > 3 && (cand.startsWith('data:image') || cand.startsWith('http') || cand.startsWith('/'))) {
            photo = cand;
            break;
          }
        }
      } catch (e) {}
    }

    // Clean notes for display
    clean = clean
      .replace(/\[REF_PHOTO:[^\]]+\]/gi, '')
      .replace(/\[PHOTO_DATA:[^\]]+\]/gi, '')
      .trim();

    // Check status overrides
    let effectiveBookingStatus = b.status || 'Confirmed';
    try {
      const bOverrides = JSON.parse(localStorage.getItem('patola_booking_status_overrides') || '{}');
      for (const k of allAliases) {
        if (bOverrides[k]) {
          effectiveBookingStatus = bOverrides[k];
          break;
        }
      }
    } catch (e) {}

    // Check if cancelled in any cancellation store
    let isCancelled = false;
    try {
      const cancelledList = JSON.parse(localStorage.getItem('patola_cancelled_orders') || '[]');
      const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
      const stageOverrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');

      const isListedCancelled = allAliases.some(k => cancelledList.includes(k));
      const hasCancellationInfo = allAliases.some(k => !!cancellations[k]);
      const hasStageZero = allAliases.some(k => stageOverrides[k] === 0);
      const isStatusCancelled = effectiveBookingStatus.toLowerCase().includes('cancel');

      if (isListedCancelled || hasCancellationInfo || hasStageZero || isStatusCancelled) {
        isCancelled = true;
      }
    } catch (e) {}

    let stage = 1;
    let statusText = 'Stage 1: Custom Loom Commission Confirmed & Warping Planned';

    if (isCancelled) {
      stage = 0;
      statusText = 'Cancelled (Custom Order Terminated & Full Refund Initiated)';
    } else {
      const st = effectiveBookingStatus.toLowerCase();
      if (st.includes('completed') || st.includes('delivered')) {
        stage = 5;
        statusText = 'Stage 5: Bespoke Heirloom Drape Delivered & Handed Over';
      } else if (st.includes('quality') || st.includes('sealed') || st.includes('inspection')) {
        stage = 4;
        statusText = 'Stage 4: Quality Check & Silk Mark Sealed';
      } else if (st.includes('weaving') || st.includes('loom')) {
        stage = 3;
        statusText = 'Stage 3: Traditional Rosewood Loom Weaving in Progress (2-4 Months)';
      } else if (st.includes('whatsapp') || st.includes('discussion')) {
        stage = 2;
        statusText = 'Stage 2: Double Ikat Resist Dyeing & Silk Palette Finalized';
      } else {
        stage = 1;
        statusText = 'Stage 1: Custom Loom Commission Confirmed & Warping Planned';
      }

      // Check local stage overrides if not cancelled
      try {
        const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
        for (const k of allAliases) {
          if (overrides[k] !== undefined) {
            stage = overrides[k];
            if (stage === 0) {
              isCancelled = true;
              statusText = 'Cancelled (Order Terminated & Full Refund Initiated)';
            }
            break;
          }
        }
      } catch (e) {}
    }

    return {
      id: b.id,
      orderReference: ref,
      isCustomOrder: true,
      isCustomLoom: true,
      customerName: b.fullName || 'Patola Connoisseur',
      contactPhone: b.phone || '',
      email: b.email || '',
      deliveryAddress: city ? `${city} (Bespoke Handloom Commission)` : 'Patola Heritage Client Address',
      city: city || 'Gujarat',
      postalCode: 'Bespoke Loom',
      paymentMode: 'Custom Bespoke Commission (On-Loom Handcraft)',
      totalAmount: 185000,
      orderStatus: statusText,
      currentStage: stage,
      isCancelled,
      deliveryDateText: '2 to 4 Months (Handcrafted on Traditional Rosewood Loom)',
      deliveryOtp: getOrderDeliveryOtp(b),
      createdAt: b.createdAt || b.preferredDate || new Date().toISOString(),
      customInfo: {
        motif: b.motifPreference || 'Custom Antique Design',
        colors: colors || 'Handcrafted Silk Palette',
        city: city,
        description: description || clean,
        referencePhoto: photo
      },
      items: [
        {
          sareeTitle: `Bespoke Patola Saree (${b.motifPreference || 'Custom Motif'})`,
          quantity: 1,
          unitPrice: 185000,
          image: photo || '/assets/images/patola_drape.jpg',
          weave: 'Authentic Pure Mulberry Silk Double Ikat (Custom Commission)',
          motifName: b.motifPreference || 'Custom Design'
        }
      ]
    };
  };

  const getDeletedOrders = () => {
    try {
      return JSON.parse(localStorage.getItem('patola_deleted_orders') || '[]');
    } catch (e) {
      return [];
    }
  };

  const getDeletedBookings = () => {
    try {
      return JSON.parse(localStorage.getItem('patola_deleted_booking_ids') || '[]');
    } catch (e) {
      return [];
    }
  };

  const fetchAllCustomerOrders = async () => {
    setLoadingOrders(true);
    try {
      // Customer tracking must not call admin-only bulk endpoints. Use this customer's
      // locally held orders; fetch a selected order separately with its phone check.
      const orderMap = new Map();
      const addOrder = (item) => {
        if (item?.orderReference) orderMap.set(item.orderReference, item);
      };
      (Array.isArray(allOrders) ? allOrders : []).forEach(addOrder);
      addOrder(activeOrder);
      addOrder(currentOrder);

      try {
        const localOrders = JSON.parse(localStorage.getItem('patola_local_customer_orders') || '[]');
        if (Array.isArray(localOrders)) localOrders.forEach(addOrder);
      } catch (e) {}

      // 1. If customer is authenticated (via Mobile & Password), fetch all their orders from database!
      if (currentCustomer?.phoneNumber) {
        try {
          const custRes = await ApiService.getCustomerOrders(currentCustomer.phoneNumber);
          if (custRes && custRes.orders && Array.isArray(custRes.orders)) {
            custRes.orders.forEach(addOrder);
          }
        } catch (e) {
          console.warn('Customer account orders fetch note:', e);
        }
      }

      const allFound = Array.from(orderMap.values());
      setDbOrders(allFound);
      setCurrentOrder(prev => {
        if (prev) {
          const refreshed = allFound.find(o => o.orderReference === prev.orderReference);
          return refreshed ? { ...prev, ...refreshed } : prev;
        }
        return allFound[0] || null;
      });
    } catch (err) {
      console.warn('fetchAllCustomerOrders error:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const getSavedDates = () => {
    try {
      return JSON.parse(localStorage.getItem('patola_order_delivery_dates') || '{}');
    } catch (e) {
      return {};
    }
  };

  const getEffectiveDate = (ord) => {
    if (!ord || !ord.orderReference) return '5 to 10 Days (Insured Express Delivery)';
    if (ord.isCustomOrder || ord.isCustomLoom) {
      return ord.deliveryDateText || '2 to 4 Months (Handcrafted on Traditional Rosewood Loom)';
    }
    const dates = getSavedDates();
    return dates[ord.orderReference] || ord.deliveryDateText || '5 to 10 Days (Insured Express Delivery)';
  };

  const getCancellationInfo = (ref) => {
    if (!ref) return null;
    try {
      const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
      if (cancellations[ref]) return cancellations[ref];

      const digits = String(ref).replace(/\D/g, '');
      const numId = parseInt(digits, 10);
      const vpRef = !isNaN(numId) ? `VP-CST-${String(numId).padStart(4, '0')}` : '';
      const cstRef = !isNaN(numId) ? `CST-${numId}` : '';
      const bkRef = !isNaN(numId) ? `BK-${numId}` : '';
      const allAliases = [ref, digits, vpRef, cstRef, bkRef].filter(Boolean);

      for (const k of allAliases) {
        if (cancellations[k]) return cancellations[k];
      }

      return null;
    } catch (e) {
      return null;
    }
  };

  const isOrderCancelled = (ord) => {
    if (!ord || !ord.orderReference) return false;
    if (ord.isCancelled === true) return true;

    const ref = ord.orderReference;
    const digits = String(ord.id || ref || '').replace(/\D/g, '');
    const numId = parseInt(digits, 10);
    const vpRef = !isNaN(numId) ? `VP-CST-${String(numId).padStart(4, '0')}` : '';
    const cstRef = !isNaN(numId) ? `CST-${numId}` : '';
    const bkRef = !isNaN(numId) ? `BK-${numId}` : '';
    const allAliases = [ref, digits, vpRef, cstRef, bkRef, String(ord.id)].filter(Boolean);

    try {
      const cancelledList = JSON.parse(localStorage.getItem('patola_cancelled_orders') || '[]');
      if (allAliases.some(k => cancelledList.includes(k))) return true;

      const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
      if (allAliases.some(k => !!cancellations[k])) return true;

      const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
      if (allAliases.some(k => overrides[k] === 0)) return true;

      const bookingOverrides = JSON.parse(localStorage.getItem('patola_booking_status_overrides') || '{}');
      for (const k of allAliases) {
        if ((bookingOverrides[k] || '').toLowerCase().includes('cancel')) return true;
      }
    } catch (e) {}

    const status = (ord.orderStatus || ord.status || '').toLowerCase();
    return ord.currentStage === 0 || status.includes('cancel') || status.includes('terminat');
  };

  const fetchLatestStatus = async (ref, phone = searchPhone || activeOrder?.contactPhone || currentOrder?.contactPhone || "") => {
    if (!ref) return;
    try {
      if (ref.startsWith('VP-CST-') || ref.startsWith('#CST-') || ref.startsWith('CST-')) {
        const numId = parseInt(ref.replace(/\D/g, ''), 10);
        const found = await ApiService.fetchBookingForTracking(numId, phone);
        if (found && isCustomBooking(found)) {
          const mapped = mapCustomBookingToOrder(found);
          const isCanc = isOrderCancelled(mapped);
          setCurrentOrder(prev => ({ ...(prev || {}), ...mapped, currentStage: isCanc ? 0 : mapped.currentStage, isCancelled: isCanc }));
          return;
        }
      }

      const fetched = await ApiService.fetchOrderByReference(ref, phone);
      if (fetched) {
        let stageNum = 1;
        if (fetched.orderStatus && fetched.orderStatus.includes('Stage ')) {
          const match = fetched.orderStatus.match(/Stage (\d)/);
          if (match) stageNum = parseInt(match[1], 10);
        }
        if (isOrderCancelled(fetched)) {
          stageNum = 0;
        }
        setCurrentOrder(prev => ({
          ...(prev || {}),
          ...fetched,
          currentStage: stageNum,
          isCancelled: stageNum === 0 || isOrderCancelled(fetched),
          deliveryOtp: getOrderDeliveryOtp(fetched || prev)
        }));
      }
    } catch (err) {
      console.warn('Error fetching latest order status:', err);
    }
  };

  // Sync when activeOrder changes
  useEffect(() => {
    if (activeOrder) {
      setCurrentOrder(activeOrder);
    }
  }, [activeOrder]);

  // When modal opens, fetch latest status and all orders from SQL Server / API
  useEffect(() => {
    if (isOpen) {
      const targetRef = (activeOrder && activeOrder.orderReference) || (currentOrder && currentOrder.orderReference);
      if (targetRef) fetchLatestStatus(targetRef);
      fetchAllCustomerOrders();
    }
  }, [isOpen]);

  // Real-time synchronization for deletions, cancellations and status updates across components
  useEffect(() => {
    const handleOrderDeletedEvent = (e) => {
      const delRef = e?.detail?.orderReference;
      if (delRef) {
        setDbOrders(prev => prev.filter(o => o && o.orderReference !== delRef));
        setCurrentOrder(prev => (prev && prev.orderReference === delRef ? null : prev));
      }
      fetchAllCustomerOrders();
    };

    const handleOrderCancelledEvent = (e) => {
      const cRef = e?.detail?.orderReference;
      const cId = e?.detail?.id;
      const digits = String(cId || cRef || '').replace(/\D/g, '');
      const vpRef = digits ? `VP-CST-${String(digits).padStart(4, '0')}` : '';
      const cstRef = digits ? `CST-${digits}` : '';
      const bkRef = digits ? `BK-${digits}` : '';
      const allAliases = [cRef, digits, vpRef, cstRef, bkRef, String(cId)].filter(Boolean);

      setDbOrders(prev => prev.map(o => {
        if (!o) return o;
        const matches = allAliases.includes(o.orderReference) || (o.id && allAliases.includes(String(o.id)));
        return matches ? { ...o, isCancelled: true, currentStage: 0, orderStatus: 'Cancelled (Order Terminated & Full Refund Initiated)' } : o;
      }));
      setCurrentOrder(prev => {
        if (!prev) return prev;
        const matches = allAliases.includes(prev.orderReference) || (prev.id && allAliases.includes(String(prev.id)));
        return matches ? { ...prev, isCancelled: true, currentStage: 0, orderStatus: 'Cancelled (Order Terminated & Full Refund Initiated)' } : prev;
      });
      fetchAllCustomerOrders();
    };

    const handleOrderUpdatedEvent = (e) => {
      const uRef = e?.detail?.orderReference;
      const updated = e?.detail?.updatedRecord;
      if (uRef && updated) {
        setDbOrders(prev => prev.map(o => o && o.orderReference === uRef ? { ...o, ...updated } : o));
        setCurrentOrder(prev => (prev && prev.orderReference === uRef ? { ...prev, ...updated } : prev));
      }
      fetchAllCustomerOrders();
    };

    const handleStorageChange = (e) => {
      if (
        e.key === 'patola_cancelled_orders' ||
        e.key === 'patola_order_stage_overrides' ||
        e.key === 'patola_deleted_orders' ||
        e.key === 'patola_booking_status_overrides' ||
        e.key === 'patola_order_cancellations'
      ) {
        fetchAllCustomerOrders();
        if (order?.orderReference) fetchLatestStatus(order.orderReference);
      }
    };

    window.addEventListener('patola:order_deleted', handleOrderDeletedEvent);
    window.addEventListener('patola:order_cancelled', handleOrderCancelledEvent);
    window.addEventListener('patola:order_updated', handleOrderUpdatedEvent);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('patola:order_deleted', handleOrderDeletedEvent);
      window.removeEventListener('patola:order_cancelled', handleOrderCancelledEvent);
      window.removeEventListener('patola:order_updated', handleOrderUpdatedEvent);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // All orders available in SQL Server database, props, or active user session
  const combinedOrders = React.useMemo(() => {
    const map = new Map();
    // 1. All orders from SQL database
    (dbOrders || []).forEach(o => {
      if (o && o.orderReference) {
        map.set(o.orderReference, o);
      }
    });
    // 2. Active order if placed in current session
    if (activeOrder && activeOrder.orderReference) {
      map.set(activeOrder.orderReference, { ...(map.get(activeOrder.orderReference) || {}), ...activeOrder });
    }
    // 3. allOrders passed from parent
    (allOrders || []).forEach(o => {
      if (o && o.orderReference) {
        if (!map.has(o.orderReference)) {
          map.set(o.orderReference, o);
        }
      }
    });
    // 4. Current viewed/searched order
    if (currentOrder && currentOrder.orderReference) {
      map.set(currentOrder.orderReference, { ...(map.get(currentOrder.orderReference) || {}), ...currentOrder });
    }
    return Array.from(map.values());
  }, [dbOrders, activeOrder, allOrders, currentOrder]);

  // Selected order, or activeOrder, or first available from orders list
  const rawOrder = currentOrder || activeOrder || (combinedOrders && combinedOrders.length > 0 ? combinedOrders[0] : null) || (allOrders && allOrders.length > 0 ? allOrders[0] : null);
  const order = rawOrder;

  // Auto-detect and prompt 1-5 Star Customer Review when order reaches Completed (Stage 5)
  useEffect(() => {
    if (order && order.orderReference) {
      try {
        const storedReviews = JSON.parse(localStorage.getItem('patola_customer_reviews') || '{}');
        const existing = storedReviews[order.orderReference];
        setUserReview(existing || null);

        const eff = getEffectiveStage(order);
        if (eff.isCompleted && !eff.isCancelled && !isOrderCancelled(order) && !existing) {
          const sessionKey = `patola_reviewed_prompt_${order.orderReference}`;
          if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, 'true');
            const timer = setTimeout(() => {
              setIsReviewOpen(true);
            }, 700);
            return () => clearTimeout(timer);
          }
        }
      } catch (e) {}
    }
  }, [order?.orderReference, order?.currentStage, order?.orderStatus]);

  // Helper to get stage synchronized with local overrides and completion status
  const getEffectiveStage = (ord) => {
    if (!ord || !ord.orderReference) return { stage: 1, isCompleted: false, isCancelled: false, statusText: 'Stage 1: Weaving Started' };

    if (isOrderCancelled(ord)) {
      return {
        stage: 0,
        isCompleted: false,
        isCancelled: true,
        statusText: 'Cancelled (Order Terminated & Full Refund Initiated)'
      };
    }

    const ref = ord.orderReference;
    const digits = String(ord.id || ref || '').replace(/\D/g, '');
    const numId = parseInt(digits, 10);
    const vpRef = !isNaN(numId) ? `VP-CST-${String(numId).padStart(4, '0')}` : '';
    const cstRef = !isNaN(numId) ? `CST-${numId}` : '';
    const bkRef = !isNaN(numId) ? `BK-${numId}` : '';
    const allAliases = [ref, digits, vpRef, cstRef, bkRef, String(ord.id)].filter(Boolean);

    let stg = ord.currentStage;
    try {
      const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
      for (const k of allAliases) {
        if (overrides[k] !== undefined) {
          stg = overrides[k];
          break;
        }
      }
    } catch (e) {}

    if (stg === 0) {
      return {
        stage: 0,
        isCompleted: false,
        isCancelled: true,
        statusText: 'Cancelled (Order Terminated & Full Refund Initiated)'
      };
    }

    if (stg === undefined || stg === null || (ord.orderStatus && !ord.orderStatus.includes('Stage '))) {
      const rawStatus = (ord.orderStatus || '').toLowerCase();
      if (rawStatus.includes('delivered') || rawStatus.includes('completed')) {
        stg = 5;
      } else if (rawStatus.includes('shipped') || rawStatus.includes('dispatched') || rawStatus.includes('transit')) {
        stg = 4;
      } else if (rawStatus.includes('packed') || rawStatus.includes('quality') || rawStatus.includes('sealed')) {
        stg = 3;
      } else if (rawStatus.includes('confirmed')) {
        stg = 2;
      } else if (rawStatus.includes('pending')) {
        stg = 1;
      } else {
        stg = 1;
      }
    }

    const isCompleted = stg >= 5 || (ord.orderStatus && (ord.orderStatus.toLowerCase().includes('delivered') || ord.orderStatus.toLowerCase().includes('handover completed')));
    
    let defaultStatus = isCompleted 
      ? (ord.isCustomOrder ? 'Stage 5: Bespoke Heirloom Drape Delivered & Handed Over' : 'Stage 5: Handover Completed (Delivered)')
      : (ord.orderStatus || (ord.isCustomOrder ? `Stage ${stg}: Bespoke Loom Weaving` : `Stage ${stg}: Weaving Started`));

    return {
      stage: stg,
      isCompleted: isCompleted && !isOrderCancelled(ord),
      isCancelled: false,
      statusText: defaultStatus
    };
  };

  const currentEff = getEffectiveStage(order);
  const stageNumber = currentEff.stage;
  const isCancelled = currentEff.isCancelled;
  // Customer cancellation is available only before the order reaches Out for Delivery.
  const canCustomerCancel = !isCancelled && !currentEff.isCompleted && stageNumber < 4;
  const cancellationInfo = getCancellationInfo(order?.orderReference);

  const handleConfirmCancelOrder = async () => {
    if (!order || !order.orderReference || !canCustomerCancel) return;
    const ref = order.orderReference;
    setCancellingLoading(true);

    const fullReason = cancelNotes.trim() ? `${cancelReason} - ${cancelNotes.trim()}` : cancelReason;
    const cancellationData = {
      orderReference: ref,
      reason: fullReason,
      cancelledAt: new Date().toISOString(),
      cancelledBy: 'Customer (via Live Tracking)'
    };

    // 1. Update localStorage
    try {
      const cancelledList = JSON.parse(localStorage.getItem('patola_cancelled_orders') || '[]');
      if (!cancelledList.includes(ref)) cancelledList.push(ref);
      if (order.id && !cancelledList.includes(String(order.id))) cancelledList.push(String(order.id));
      localStorage.setItem('patola_cancelled_orders', JSON.stringify(cancelledList));

      const overrides = JSON.parse(localStorage.getItem('patola_order_stage_overrides') || '{}');
      overrides[ref] = 0;
      if (order.id) overrides[String(order.id)] = 0;
      localStorage.setItem('patola_order_stage_overrides', JSON.stringify(overrides));

      const cancellations = JSON.parse(localStorage.getItem('patola_order_cancellations') || '{}');
      cancellations[ref] = cancellationData;
      if (order.id) cancellations[String(order.id)] = cancellationData;
      localStorage.setItem('patola_order_cancellations', JSON.stringify(cancellations));

      if (order.isCustomOrder && order.id) {
        const bOverrides = JSON.parse(localStorage.getItem('patola_booking_status_overrides') || '{}');
        bOverrides[String(order.id)] = 'Cancelled';
        localStorage.setItem('patola_booking_status_overrides', JSON.stringify(bOverrides));
      }
    } catch (e) {}

    const updatedRecord = {
      ...order,
      orderReference: ref,
      orderStatus: `Cancelled (Customer Request: ${cancelReason})`,
      currentStage: 0,
      isCancelled: true
    };

    // 2. Instant optimistic local update
    setCurrentOrder(prev => ({
      ...(prev || {}),
      ...updatedRecord
    }));

    // Update in-memory dbOrders so it is immediately reflected in the switcher
    setDbOrders(prev => prev.map(o => o.orderReference === ref ? { ...o, ...updatedRecord } : o));

    // 3. Notify parent app
    if (onOrderUpdated) {
      onOrderUpdated(updatedRecord);
    }

    // 4. Update backend API
    try {
      if (order.isCustomOrder) {
        await ApiService.updateBookingStatus(order.id, 'Cancelled');
      } else {
        await ApiService.updateOrderStatus(ref, {
          status: `Cancelled (Customer Request: ${fullReason})`,
          stage: 0
        });
      }
    } catch (err) {
      console.warn('Backend cancel order warning:', err);
    }

    // Dispatch global event so Admin Panel updates in real-time
    try {
      window.dispatchEvent(new CustomEvent('patola:order_cancelled', {
        detail: { orderReference: ref, id: order.id, isCustomOrder: order.isCustomOrder, cancellationData }
      }));
    } catch (e) {}

    setCancellingLoading(false);
    setShowCancelModal(false);
  };

  const handleConfirmCancelSingleItem = async () => {
    if (!itemToCancel || !order || !order.orderReference || !canCustomerCancel) return;
    setItemCancelLoading(true);

    const { item, idx } = itemToCancel;
    const ref = order.orderReference;
    const pieceKey = item.pieceKey || item.sareeId || item.id || `idx_${idx}`;
    const pieceTitle = item.pieceTitle || item.sareeTitle || item.title || 'Patola Item';
    const piecePrice = Number(item.piecePrice || item.unitPrice || item.finalPriceINR || 0) || ((order.totalAmount || 0) / (order.items?.length || 1));

    const fullReason = itemCancelNotes.trim() ? `${itemCancelReason} - ${itemCancelNotes.trim()}` : itemCancelReason;
    const cancellationData = {
      orderReference: ref,
      pieceKey,
      itemKey: pieceKey,
      itemTitle: pieceTitle,
      refundAmount: piecePrice,
      reason: fullReason,
      cancelledAt: new Date().toISOString(),
      cancelledBy: 'Customer (Individual Item Cancellation)'
    };

    // 1. Save in localStorage
    try {
      const allItemCancels = JSON.parse(localStorage.getItem('patola_order_item_cancellations') || '{}');
      if (!allItemCancels[ref]) allItemCancels[ref] = {};
      allItemCancels[ref][pieceKey] = cancellationData;
      allItemCancels[ref][`idx_${idx}`] = cancellationData;
      if (item.pieceKey) allItemCancels[ref][item.pieceKey] = cancellationData;
      localStorage.setItem('patola_order_item_cancellations', JSON.stringify(allItemCancels));
    } catch (e) {}

    const allPieces = getExpandedOrderItems(order);
    const itemCancels = getOrderItemCancellations(ref);
    itemCancels[pieceKey] = cancellationData;

    const allCancelled = allPieces.every((p, i) => {
      const k = p.pieceKey || p.sareeId || p.id || `idx_${i}`;
      return (p.pieceKey === pieceKey || i === idx) || Boolean(itemCancels[k] || itemCancels[`idx_${i}`] || p.isCancelled);
    });

    if (allCancelled) {
      await handleConfirmCancelOrder();
    } else {
      const updatedPieces = allPieces.map((p, i) => {
        const isThisCanc = p.pieceKey === pieceKey || i === idx || isPieceCancelled(ref, p, i);
        return isThisCanc ? { ...p, isCancelled: true, cancelInfo: cancellationData } : p;
      });

      const newActiveTotal = updatedPieces
        .filter(p => !p.isCancelled)
        .reduce((sum, p) => sum + Number(p.piecePrice || p.unitPrice || 0), 0);

      const updatedRecord = {
        ...order,
        items: updatedPieces,
        totalAmount: newActiveTotal > 0 ? newActiveTotal : order.totalAmount,
        partialCancelled: true
      };

      setCurrentOrder(prev => ({ ...(prev || {}), ...updatedRecord }));
      setDbOrders(prev => prev.map(o => o.orderReference === ref ? { ...o, ...updatedRecord } : o));

      if (onOrderUpdated) {
        onOrderUpdated(updatedRecord);
      }

      try {
        window.dispatchEvent(new CustomEvent('patola:item_cancelled', {
          detail: { orderReference: ref, pieceKey, cancellationData, updatedRecord }
        }));
        window.dispatchEvent(new CustomEvent('patola:order_updated', {
          detail: { orderReference: ref, updatedRecord }
        }));
      } catch (e) {}
    }

    setItemCancelLoading(false);
    setItemToCancel(null);
    setItemCancelNotes('');
  };

  const handleConfirmCancelSelectedItems = async () => {
    if (!order || !order.orderReference || !canCustomerCancel || selectedItemIndicesToCancel.length === 0) return;
    
    const allPieces = getExpandedOrderItems(order);
    const activeIndices = allPieces
      .map((p, idx) => ({ p, idx }))
      .filter(({ p, idx }) => !isPieceCancelled(order.orderReference, p, idx))
      .map(({ idx }) => idx);

    if (selectedItemIndicesToCancel.length >= activeIndices.length) {
      await handleConfirmCancelOrder();
      return;
    }

    setCancellingLoading(true);
    const ref = order.orderReference;
    const fullReason = cancelNotes.trim() ? `${cancelReason} - ${cancelNotes.trim()}` : cancelReason;

    try {
      const allItemCancels = JSON.parse(localStorage.getItem('patola_order_item_cancellations') || '{}');
      if (!allItemCancels[ref]) allItemCancels[ref] = {};

      selectedItemIndicesToCancel.forEach(idx => {
        const piece = allPieces[idx];
        if (!piece) return;
        const pieceKey = piece.pieceKey || piece.sareeId || piece.id || `idx_${idx}`;
        const pieceTitle = piece.pieceTitle || piece.sareeTitle || piece.title || 'Patola Item';
        const piecePrice = Number(piece.piecePrice || piece.unitPrice || 0);

        const cancellationData = {
          orderReference: ref,
          pieceKey,
          itemKey: pieceKey,
          itemTitle: pieceTitle,
          refundAmount: piecePrice,
          reason: fullReason,
          cancelledAt: new Date().toISOString(),
          cancelledBy: 'Customer (via Item Selection Cancellation)'
        };

        allItemCancels[ref][pieceKey] = cancellationData;
        allItemCancels[ref][`idx_${idx}`] = cancellationData;
        if (piece.pieceKey) allItemCancels[ref][piece.pieceKey] = cancellationData;
      });

      localStorage.setItem('patola_order_item_cancellations', JSON.stringify(allItemCancels));

      const updatedPieces = allPieces.map((p, i) => {
        const isThisCanc = selectedItemIndicesToCancel.includes(i) || isPieceCancelled(ref, p, i);
        return isThisCanc ? { ...p, isCancelled: true, cancelInfo: allItemCancels[ref][p.pieceKey] || allItemCancels[ref][`idx_${i}`] } : p;
      });

      const newActiveTotal = updatedPieces
        .filter(p => !p.isCancelled)
        .reduce((sum, p) => sum + Number(p.piecePrice || p.unitPrice || 0), 0);

      const updatedRecord = {
        ...order,
        items: updatedPieces,
        totalAmount: newActiveTotal > 0 ? newActiveTotal : order.totalAmount,
        partialCancelled: true
      };

      setCurrentOrder(prev => ({ ...(prev || {}), ...updatedRecord }));
      setDbOrders(prev => prev.map(o => o.orderReference === ref ? { ...o, ...updatedRecord } : o));

      if (onOrderUpdated) {
        onOrderUpdated(updatedRecord);
      }

      try {
        window.dispatchEvent(new CustomEvent('patola:order_updated', {
          detail: { orderReference: ref, updatedRecord }
        }));
        window.dispatchEvent(new CustomEvent('patola:item_cancelled', {
          detail: { orderReference: ref, updatedRecord }
        }));
      } catch (e) {}
    } catch (err) {
      console.warn('Item cancellation error:', err);
    } finally {
      setCancellingLoading(false);
      setShowCancelModal(false);
      setSelectedItemIndicesToCancel([]);
      setCancelNotes('');
    }
  };

  const handleOpenCancelForm = () => {
    setShowCancelModal(prev => {
      const next = !prev;
      if (next && order) {
        const allPieces = getExpandedOrderItems(order);
        const firstActiveIdx = allPieces.findIndex((p, idx) => !isPieceCancelled(order.orderReference, p, idx));
        if (allPieces.length > 1 && firstActiveIdx !== -1) {
          setSelectedItemIndicesToCancel([firstActiveIdx]);
        } else {
          setSelectedItemIndicesToCancel([]);
        }
        setTimeout(() => {
          const el = document.getElementById('cancellation-form-card');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      return next;
    });
  };

  // Look for any other orders placed by the same customer (phone or name)
  const cleanDigits = (p) => (p || '').replace(/\D/g, '');
  const custPhone = cleanDigits(currentCustomer?.phoneNumber);
  const currentPhone = custPhone || cleanDigits(order?.contactPhone);
  const currentName = (currentCustomer?.customerName || order?.customerName || '').trim().toLowerCase();

  const relatedCustomerOrders = React.useMemo(() => {
    const orderByRef = new Map();
    searchedCustomerOrders.forEach(item => {
      if (item?.orderReference) orderByRef.set(item.orderReference, item);
    });

    const matched = (combinedOrders || []).filter(o => {
      const oPhone = cleanDigits(o.contactPhone);
      if (currentPhone && oPhone && currentPhone.length >= 7 && oPhone.length >= 7) {
        const p1 = currentPhone.slice(-7);
        const p2 = oPhone.slice(-7);
        if (p1 === p2 || currentPhone.includes(oPhone) || oPhone.includes(currentPhone)) return true;
      }
      const oName = (o.customerName || '').trim().toLowerCase();
      if (currentName && oName && currentName.length >= 3 && oName.length >= 3) {
        if (currentName === oName || currentName.includes(oName) || oName.includes(currentName)) return true;
      }
      return false;
    });

    matched.forEach(item => orderByRef.set(item.orderReference, { ...orderByRef.get(item.orderReference), ...item }));
    if (order?.orderReference && !orderByRef.has(order.orderReference)) {
      orderByRef.set(order.orderReference, order);
    }
    return Array.from(orderByRef.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [combinedOrders, currentPhone, currentName, order, searchedCustomerOrders]);

  const otherOrders = order ? relatedCustomerOrders.filter(o => o.orderReference !== order.orderReference) : [];
  const activeCount = relatedCustomerOrders.filter(o => !isOrderCancelled(o) && !getEffectiveStage(o).isCompleted).length;
  const completedCount = relatedCustomerOrders.filter(o => getEffectiveStage(o).isCompleted).length;
  const cancelledCount = relatedCustomerOrders.filter(o => isOrderCancelled(o)).length;

  const handleSelectOrder = (targetRef) => {
    const selected = combinedOrders.find(o => o.orderReference === targetRef);
    if (selected) {
      const eff = getEffectiveStage(selected);
      setCurrentOrder({
        ...selected,
        currentStage: eff.stage,
        deliveryOtp: getOrderDeliveryOtp(selected)
      });
      if (onTrackOtherOrder) onTrackOtherOrder(targetRef);
      fetchLatestStatus(targetRef);
    }
  };

  const handleCopyRef = () => {
    if (order?.orderReference) {
      navigator.clipboard.writeText(order.orderReference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    const cleanRef = searchRef.trim().toUpperCase();
    const phone = searchPhone.trim();
    if (!phone) return;

    setIsSearching(true);

    // A phone-only lookup loads this customer's regular and custom orders.
    if (!cleanRef) {
      const result = await ApiService.fetchCustomerOrdersByPhone(phone);
      if (result) {
        const regularOrders = result.orders.map(o => ({ ...o, contactPhone: phone }));
        const customOrders = result.bookings
          .filter(isCustomBooking)
          .map(b => ({ ...mapCustomBookingToOrder(b), contactPhone: phone }));
        const foundOrders = [...regularOrders, ...customOrders]
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setSearchedCustomerOrders(foundOrders);
        try {
          const savedRefs = JSON.parse(localStorage.getItem('patola_local_customer_orders') || '[]');
          const newRefs = foundOrders.map(o => ({
            orderReference: o.orderReference,
            contactPhone: phone,
            isCustomOrder: Boolean(o.isCustomOrder || o.isCustomLoom)
          }));
          const byRef = new Map();
          [...newRefs, ...(Array.isArray(savedRefs) ? savedRefs : [])].forEach(o => {
            if (o?.orderReference && !byRef.has(o.orderReference)) byRef.set(o.orderReference, o);
          });
          localStorage.setItem('patola_local_customer_orders', JSON.stringify(Array.from(byRef.values())));
        } catch (e) {}
        setDbOrders(prev => {
          const byRef = new Map(prev.map(o => [o.orderReference, o]));
          foundOrders.forEach(o => byRef.set(o.orderReference, o));
          return Array.from(byRef.values());
        });
        if (foundOrders.length > 0) {
          const first = foundOrders[0];
          setCurrentOrder({ ...first, deliveryOtp: getOrderDeliveryOtp(first) });
          if (onTrackOtherOrder) onTrackOtherOrder(first.orderReference);
        } else {
          setCurrentOrder(null);
        }
      }
      setIsSearching(false);
      return;
    }

    setSearchedCustomerOrders([]);

    // 1. Check in already loaded combined orders (by ref, phone digits, or customer name)
    const existing = combinedOrders.find(o => {
      if (!o) return false;
      if (o.orderReference && o.orderReference.toUpperCase() === cleanRef) return true;
      if (cleanDigits(o.contactPhone) && cleanDigits(cleanRef) && cleanDigits(o.contactPhone).includes(cleanDigits(cleanRef))) return true;
      if (o.customerName && o.customerName.toUpperCase().includes(cleanRef)) return true;
      return false;
    });

    if (existing) {
      const eff = getEffectiveStage(existing);
      setCurrentOrder({
        ...existing,
        currentStage: eff.stage,
        deliveryOtp: getOrderDeliveryOtp(existing)
      });
      setIsSearching(false);
      setSearchRef('');
      if (onTrackOtherOrder) onTrackOtherOrder(existing.orderReference);
      return;
    }

    // 2. Search custom bookings if prefix matches
    if (cleanRef.startsWith('VP-CST-') || cleanRef.startsWith('CST-') || cleanRef.startsWith('#CST-')) {
      const numId = parseInt(cleanRef.replace(/\D/g, ''), 10);
      try {
        const bookings = [await ApiService.fetchBookingForTracking(numId, phone)].filter(Boolean);
        if (bookings && Array.isArray(bookings)) {
          const found = bookings.find(b => b.id === numId && isCustomBooking(b));
          if (found) {
            const mapped = mapCustomBookingToOrder(found);
            setCurrentOrder(mapped);
            setDbOrders(prev => {
              const exists = prev.some(o => o.orderReference === mapped.orderReference);
              return exists ? prev.map(o => o.orderReference === mapped.orderReference ? mapped : o) : [mapped, ...prev];
            });
            setIsSearching(false);
            setSearchRef('');
            if (onTrackOtherOrder) onTrackOtherOrder(mapped.orderReference);
            return;
          }
        }
      } catch (err) {
        console.warn('Search custom booking error:', err);
      }
    }

    // 3. Fallback: regular order lookup
    const fetched = await ApiService.fetchOrderByReference(cleanRef, phone);
    if (fetched) {
      let stageNum = 1;
      if (fetched.orderStatus && fetched.orderStatus.includes('Stage ')) {
        const match = fetched.orderStatus.match(/Stage (\d)/);
        if (match) stageNum = parseInt(match[1], 10);
      }
      if (isOrderCancelled(fetched)) stageNum = 0;
      setCurrentOrder({
        ...fetched,
        currentStage: stageNum,
        deliveryOtp: getOrderDeliveryOtp(fetched)
      });
      setDbOrders(prev => {
        const exists = prev.some(o => o.orderReference === fetched.orderReference);
        return exists ? prev.map(o => o.orderReference === fetched.orderReference ? { ...o, ...fetched } : o) : [fetched, ...prev];
      });
      if (onTrackOtherOrder) onTrackOtherOrder(cleanRef);
    } else {
      if (onTrackOtherOrder) onTrackOtherOrder(cleanRef);
    }
    setIsSearching(false);
    setSearchRef('');
  };

  if (!isOpen) return null;

  if (!order) {
    return (
      <div className="modal-backdrop open" onClick={onClose}>
        <div className="modal-container tracking-modal-container" onClick={(e) => e.stopPropagation()}>
          <button className="btn-close-modal" onClick={onClose} aria-label="Close Tracking">✕</button>
          
          <div className="tracking-modal-header">
            <span className="gold-seal-badge">✦ Royal Trousseau Journey ✦</span>
            <h3 className="tracking-title">Live Order & Delivery Tracking</h3>
            <p className="tracking-subtitle">
              Handloom Heritage Dispatch • Insured Express Logistics
            </p>
          </div>

          {/* Quick Search Bar */}
          <form onSubmit={handleSearchSubmit} className="tracking-search-bar" style={{ margin: '1.5rem 0' }}>
            <input
              type="text"
              className="tracking-search-input"
              placeholder="Order reference (optional; leave blank for all orders)"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              autoFocus
            />
            <input type="tel" className="tracking-search-input" placeholder="Phone number used for this order" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} required />
            <button type="submit" className="btn-track-search">
              Track Order 🔍
            </button>
          </form>

          {currentCustomer ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>📦</div>
              <h4 style={{ fontFamily: 'Cinzel, serif', color: '#800020', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                No Orders Found Yet
              </h4>
              <p style={{ color: '#666', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
                Logged in as {currentCustomer.customerName} (+91 {currentCustomer.phoneNumber}). No commissions found under this account yet.
              </p>
              <button className="btn-primary" onClick={onClose} style={{ padding: '0.6rem 2rem', cursor: 'pointer' }}>
                Browse Sarees
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>📦</div>
              <h4 style={{ fontFamily: 'Cinzel, serif', color: '#800020', fontSize: '1.3rem', marginBottom: '0.5rem' }}>
                Sign In to View All Your Orders
              </h4>
              <p style={{ color: '#666', fontSize: '0.92rem', maxWidth: '440px', margin: '0 auto 1.4rem' }}>
                Sign in with your mobile number and password, or create an account, to instantly see all your orders and live tracking.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenCustomerAuth) onOpenCustomerAuth();
                  }}
                  style={{
                    background: '#6b001a',
                    color: '#ffffff',
                    border: '1px solid #d4af37',
                    padding: '0.65rem 1.6rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    letterSpacing: '0.3px',
                    boxShadow: '0 2px 6px rgba(107, 0, 26, 0.2)'
                  }}
                >
                  ✦ Sign In with Password / Register ✦
                </button>
              </div>
              <p style={{ color: '#888', fontSize: '0.8rem' }}>
                Or use the search box above to track a specific order reference with your mobile number.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal-container tracking-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="btn-close-modal" onClick={onClose} aria-label="Close Tracking">✕</button>

        <div className="tracking-modal-header">
          <span className="gold-seal-badge">✦ Royal Trousseau Journey ✦</span>
          <h3 className="tracking-title">Live Order & Delivery Tracking</h3>
          <p className="tracking-subtitle">
            Handloom Heritage Dispatch • Insured Express Logistics
          </p>
        </div>

        {/* If Customer is Authenticated, show their Orders Selector cleanly! */}
        {currentCustomer ? (
          <div style={{
            background: 'linear-gradient(135deg, #fffbf2 0%, #fdf6e7 100%)',
            border: '1.5px solid #d4af37',
            borderRadius: '8px',
            padding: '0.85rem 1.1rem',
            margin: '0.8rem 0 1rem',
            boxShadow: '0 2px 8px rgba(107, 0, 26, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6b001a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Orders for {currentCustomer.customerName}
                </span>
                <span style={{
                  background: '#6b001a',
                  color: '#ffffff',
                  padding: '1px 8px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  {relatedCustomerOrders.length} {relatedCustomerOrders.length === 1 ? 'Order' : 'Orders'}
                </span>
              </div>
              <span style={{ fontSize: '0.76rem', color: '#736d65' }}>
                Mobile: +91 {currentCustomer.phoneNumber}
              </span>
            </div>

            {/* Quick Switch Dropdown */}
            {relatedCustomerOrders.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <label htmlFor="customer-order-picker" style={{ fontSize: '0.8rem', color: '#333', fontWeight: 600 }}>
                  Select Order to Track:
                </label>
                <select
                  id="customer-order-picker"
                  value={order.orderReference}
                  onChange={(e) => handleSelectOrder(e.target.value)}
                  style={{
                    padding: '0.45rem 0.8rem',
                    borderRadius: '6px',
                    border: '1.5px solid #c5a059',
                    background: '#ffffff',
                    color: '#6b001a',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    flex: '1 1 260px',
                    maxWidth: '420px'
                  }}
                >
                  {relatedCustomerOrders.map((o) => {
                    const oEff = getEffectiveStage(o);
                    const rawTitle = (o.items && Array.isArray(o.items) && o.items[0]?.sareeTitle) || o.sareeTitle || 'Patola';
                    const title = typeof rawTitle === 'string' ? rawTitle : 'Patola';
                    const statusLabel = oEff.isCompleted ? 'Delivered' : oEff.isCancelled ? 'Cancelled' : `Stage ${oEff.stage}`;
                    return (
                      <option key={o.orderReference} value={o.orderReference}>
                        #{o.orderReference} — {statusLabel} ({title.slice(0, 20)})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        ) : (
          /* Not Logged In CTA Banner */
          <div style={{
            background: '#fffbf2',
            border: '1px dashed #d4af37',
            borderRadius: '6px',
            padding: '0.65rem 0.95rem',
            margin: '0.8rem 0 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.6rem',
            fontSize: '0.82rem'
          }}>
            <span style={{ color: '#5c0018' }}>
              ✦ Enter your password to view all your orders automatically:
            </span>
            <button
              type="button"
              onClick={() => {
                if (onOpenCustomerAuth) onOpenCustomerAuth();
              }}
              style={{
                background: '#6b001a',
                color: '#ffffff',
                border: 'none',
                padding: '0.35rem 0.85rem',
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Sign In with Password / Register →
            </button>
          </div>
        )}

        {/* Quick Search Bar */}
        <form onSubmit={handleSearchSubmit} className="tracking-search-bar">
          <input
            type="text"
            className="tracking-search-input"
            placeholder="Order reference (optional; leave blank for all orders)"
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value)}
          />
            <input type="tel" className="tracking-search-input" placeholder="Phone number used for this order" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} required />
          <button type="submit" className="btn-track-search">
            Track Order 🔍
          </button>
        </form>

        {/* Order Reference & Gold Insurance Banner */}
        <div className="order-meta-banner">
          <div className="order-ref-group">
            <span className="order-ref-label">Order Reference:</span>
            <span className="order-ref-code">{order.orderReference}</span>
            {order.createdAt && (
              <span style={{ fontSize: '0.8rem', color: '#666', background: '#f5f5f5', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                📅 {formatDateDDMMYYYY(order.createdAt)}
              </span>
            )}
            {order.isCustomOrder && (
              <span style={{
                background: '#800020',
                color: '#d4af37',
                padding: '0.25rem 0.65rem',
                borderRadius: '4px',
                fontWeight: 800,
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                border: '1px solid #d4af37'
              }}>
                🧵 Bespoke Loom Commission
              </span>
            )}
            <button className="btn-copy-ref" onClick={handleCopyRef}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button
              type="button"
              className="btn-copy-ref"
              onClick={() => fetchLatestStatus(order.orderReference)}
              title="Fetch latest updates from Loom & Courier"
              style={{ background: '#fdf7ee', color: '#800020', border: '1px solid #d4af37' }}
            >
              🔄 Refresh Status
            </button>

            {isCancelled ? (
              <span style={{
                background: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #f87171',
                borderRadius: '6px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                🚫 Cancelled
              </span>
            ) : currentEff.isCompleted ? (
              <span style={{
                background: '#f0fdf4',
                color: '#166534',
                border: '1.5px solid #86efac',
                borderRadius: '6px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }} title="This order has been delivered and cannot be cancelled">
                🏆 Delivered
              </span>
            ) : null}
          </div>

          <div className="insured-gold-badge">
            <span className="shield-icon">🛡️</span>
            <div>
              <strong>100% Transit Insured (Royal Transit Coverage)</strong>
              <small>Protected against damage or transit loss with tamper-proof seal</small>
            </div>
          </div>
        </div>

        {/* PROMINENT CANCELLED ORDER BANNER (IF ORDER CANCELLED) */}
        {isCancelled && (
          <div className="order-cancelled-banner">
            <span style={{ fontSize: '2.4rem', lineHeight: 1 }}>🚫</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                <h4 style={{ margin: 0, color: '#991b1b', fontSize: '1.15rem', fontWeight: 800 }}>
                  Order #{order.orderReference} is Cancelled
                </h4>
                <span style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #f87171',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.74rem',
                  fontWeight: 800
                }}>
                  🚫 Order Cancelled
                </span>
              </div>
              <p style={{ margin: '0 0 0.5rem 0', color: '#7f1d1d', fontSize: '0.9rem', lineHeight: 1.5, fontWeight: 600 }}>
                {cancellationInfo?.cancelledBy?.includes('Store') || cancellationInfo?.cancelledBy?.includes('Admin')
                  ? 'Your order has been cancelled by store administration.'
                  : 'Your order has been cancelled.'}
              </p>
              <p style={{ margin: '0 0 0.65rem 0', color: '#7f1d1d', fontSize: '0.85rem', lineHeight: 1.45 }}>
                {order.paymentMode === 'Cash on Delivery (COD)'
                  ? '💵 Cash on Delivery: No payment was collected. ₹0 charges applied.'
                  : '💳 100% Full Refund initiated. The amount will be credited back to your original payment method in 2 to 4 business days.'}
              </p>
              {cancellationInfo && (
                <div style={{
                  background: 'rgba(255,255,255,0.92)',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '0.6rem 0.9rem',
                  fontSize: '0.82rem',
                  color: '#991b1b',
                  display: 'flex',
                  gap: '1.2rem',
                  flexWrap: 'wrap',
                  boxShadow: '0 2px 6px rgba(153, 27, 27, 0.05)'
                }}>
                  <div><strong>Reason:</strong> {cancellationInfo.reason || 'Cancelled by store administration'}</div>
                  <div><strong>Cancelled Date:</strong> {formatDateDDMMYYYY(cancellationInfo.cancelledAt, 'Recently')}</div>
                  <div><strong>Cancelled By:</strong> {cancellationInfo.cancelledBy || 'Store Administration'}</div>
                </div>
              )}

              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <a
                  href={`https://wa.me/918160160750?text=${encodeURIComponent(`🙏 Namaste PATOLA MADE VANKAR, I am inquiring regarding my cancelled order #${order.orderReference}. Reason: ${cancellationInfo?.reason || 'Cancelled'}. Please guide me on refund / re-ordering.`)}`}
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
                    boxShadow: '0 2px 6px rgba(37,211,102,0.25)'
                  }}
                  title="Contact our master weavers on WhatsApp regarding this cancellation"
                >
                  💬 WhatsApp Artisan Support Regarding Cancellation
                </a>
              </div>

              {/* Direct Quick Access to Remaining Orders from Cancellation Banner */}
              {otherOrders.length > 0 && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px dashed #fca5a5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>🛍️</span>
                    <strong style={{ fontSize: '0.86rem', color: '#991b1b' }}>
                      Your Remaining Orders ({otherOrders.length} Other Orders available):
                    </strong>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {otherOrders.map(otherOrd => {
                      const otherEff = getEffectiveStage(otherOrd);
                      const rawTitle = (otherOrd.items && Array.isArray(otherOrd.items) && otherOrd.items[0]?.sareeTitle) || otherOrd.sareeTitle || 'Patola Saree';
                      const title = typeof rawTitle === 'string' ? rawTitle : 'Patola Saree';
                      return (
                        <button
                          key={otherOrd.orderReference}
                          type="button"
                          onClick={() => handleSelectOrder(otherOrd.orderReference)}
                          style={{
                            background: '#ffffff',
                            border: '1.5px solid #d4af37',
                            borderRadius: '20px',
                            padding: '5px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#800020',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease'
                          }}
                          title={`Click to track Order #${otherOrd.orderReference}`}
                        >
                          <span>{otherEff.isCancelled ? '🚫' : (otherEff.isCompleted ? '🏆' : '🟢')}</span>
                          <span>#{otherOrd.orderReference}</span>
                          <span style={{ color: '#666', fontWeight: 500, fontSize: '0.75rem' }}>
                            ({title.length > 18 ? title.slice(0, 18) + '...' : title})
                          </span>
                          <span style={{
                            background: otherEff.isCancelled ? '#fee2e2' : (otherEff.isCompleted ? '#dcfce7' : '#fef3c7'),
                            color: otherEff.isCancelled ? '#991b1b' : (otherEff.isCompleted ? '#166534' : '#92400e'),
                            fontSize: '0.7rem',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            fontWeight: 700
                          }}>
                            {otherEff.isCancelled ? 'Cancelled' : (otherEff.isCompleted ? 'Delivered' : `Stage ${otherEff.stage}`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Simple & Clean Multi-Order Switcher & All Orders List */}
        {relatedCustomerOrders.length > 0 && (
          <div style={{
            background: '#faf6ee',
            border: '1.5px solid #ebdccf',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            margin: '0.75rem 0 1rem 0',
            boxShadow: '0 2px 8px rgba(128,0,32,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem', flexWrap: 'wrap', marginBottom: relatedCustomerOrders.length > 1 ? '0.6rem' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🛍️</span>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--color-primary-dark)', display: 'block' }}>
                    Your Orders ({relatedCustomerOrders.length})
                  </strong>
                  <small style={{ fontSize: '0.75rem', color: '#666' }}>
                    {activeCount > 0 && <span style={{ color: '#16a34a', fontWeight: 600 }}>🟢 {activeCount} Active </span>}
                    {completedCount > 0 && <span style={{ color: '#15803d', fontWeight: 600 }}> • 🏆 {completedCount} Delivered </span>}
                    {cancelledCount > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}> • 🚫 {cancelledCount} Cancelled</span>}
                  </small>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'flex-end', minWidth: '240px' }}>
                <select
                  value={order.orderReference}
                  onChange={(e) => handleSelectOrder(e.target.value)}
                  style={{
                    padding: '0.45rem 0.8rem',
                    borderRadius: '6px',
                    border: '1.5px solid #d4af37',
                    background: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: '#800020',
                    cursor: 'pointer',
                    maxWidth: '420px',
                    width: '100%',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                  }}
                >
                  {relatedCustomerOrders.map((ro) => {
                    const roEff = getEffectiveStage(ro);
                    const sareeName = (ro.items && Array.isArray(ro.items) && ro.items.length > 0)
                      ? (ro.items.length === 1 ? (ro.items[0]?.sareeTitle || ro.sareeTitle || 'Patola') : `${ro.items.length} Sarees`)
                      : (ro.sareeTitle || 'Patola');
                    let badge = ro.isCustomOrder ? `🧵 Custom Loom - Stage ${roEff.stage}` : `Stage ${roEff.stage}`;
                    if (roEff.isCancelled) badge = '🚫 Cancelled';
                    else if (roEff.isCompleted) badge = '🏆 Delivered';
                    return (
                      <option key={ro.orderReference} value={ro.orderReference}>
                        {ro.isCustomOrder ? '🧵 ' : ''}#{ro.orderReference} — {sareeName} • ₹{(ro.totalAmount || 0).toLocaleString('en-IN')} [{badge}]
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Quick-switch pills for all customer orders */}
            {relatedCustomerOrders.length > 1 && (
              <div style={{
                display: 'flex',
                gap: '0.45rem',
                overflowX: 'auto',
                paddingBottom: '4px',
                marginTop: '0.4rem',
                scrollbarWidth: 'thin'
              }}>
                {relatedCustomerOrders.map((ro) => {
                  const roEff = getEffectiveStage(ro);
                  const isCurrent = ro.orderReference === order.orderReference;
                  return (
                    <button
                      key={ro.orderReference}
                      type="button"
                      onClick={() => handleSelectOrder(ro.orderReference)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '16px',
                        border: isCurrent ? '2px solid #800020' : '1px solid #d1d5db',
                        background: isCurrent ? '#800020' : '#ffffff',
                        color: isCurrent ? '#ffffff' : '#374151',
                        fontWeight: isCurrent ? 800 : 600,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: isCurrent ? '0 2px 6px rgba(128,0,32,0.2)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      title={`Click to track Order #${ro.orderReference}`}
                    >
                      <span>{ro.isCustomOrder ? '🧵' : (roEff.isCancelled ? '🚫' : (roEff.isCompleted ? '🏆' : '🟢'))}</span>
                      <span>#{ro.orderReference}</span>
                      {ro.isCustomOrder && <span style={{ opacity: isCurrent ? 0.9 : 0.8, fontSize: '0.7rem' }}> (Custom)</span>}
                      {roEff.isCancelled && <span style={{ opacity: isCurrent ? 0.9 : 0.7, fontSize: '0.7rem' }}> (Cancelled)</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Delivery Date Highlight (Read-Only Display for Customers) */}
        <div className="delivery-highlight-card">
          <div className="delivery-card-icon">📦</div>
          <div className="delivery-card-text" style={{ flex: 1 }}>
            <span className="delivery-date-tag">
              {order.isCustomLoom ? 'Custom Loom Weaving Timeline' : 'Estimated Delivery Date'}
            </span>
            <h4 className="delivery-arrival-date">
              {getEffectiveDate(order)}
            </h4>
            <p className="delivery-subtext">
              ✦ Insured Express Delivery: Handcrafted on traditional rosewood loom (5 to 10 Days) + 100% Insured Delivery.
            </p>
          </div>
        </div>

        {/* SECURE DELIVERY OTP BOX (Shown for All Orders: Online Payment & COD) */}
        {!isCancelled && (
          <div className="delivery-otp-box">
            <div className="otp-header">
              <span className="otp-lock-icon">🔐</span>
              <div>
                <h4 className="otp-title">Secure Delivery Handover OTP</h4>
                <p className="otp-notice">
                  Share this 4-digit OTP with the delivery agent only upon physical package inspection.
                </p>
              </div>
            </div>
            <div className="otp-code-container">
              <span className="otp-digit-badge">{getOrderDeliveryOtp(order)}</span>
              <span className="otp-instruction">
                (Provide this code to the delivery executive upon handover)
              </span>
            </div>

            {/* If Order is Shipped, customer or agent can verify Delivery OTP to complete handover */}
            {order && (stageNumber === 4 || (order.orderStatus && order.orderStatus.toLowerCase().includes('shipped'))) && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0c2340', marginBottom: '8px' }}>
                  📦 Handover Package Verification (Stored Procedure: sp_VerifyDeliveryOtp)
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    maxLength={4}
                    value={customerDeliveryOtpInput}
                    onChange={(e) => setCustomerDeliveryOtpInput(e.target.value.trim())}
                    placeholder={getOrderDeliveryOtp(order) || '4-Digit OTP'}
                    style={{
                      width: '120px',
                      padding: '6px 10px',
                      fontSize: '1.1rem',
                      letterSpacing: '4px',
                      textAlign: 'center',
                      border: '1.5px solid #0c2340',
                      borderRadius: '6px',
                      fontWeight: 700
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setCustomerDeliveryOtpInput(getOrderDeliveryOtp(order))}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Auto-fill ({getOrderDeliveryOtp(order)}) ⚡
                  </button>
                  <button
                    type="button"
                    onClick={handleCustomerVerifyDeliveryOtp}
                    disabled={verifyingDeliveryOtp}
                    style={{
                      background: '#15803d',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: verifyingDeliveryOtp ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {verifyingDeliveryOtp ? 'Verifying...' : 'Complete Delivery ✦'}
                  </button>
                </div>
                {deliveryOtpMessage && (
                  <div style={{ marginTop: '6px', fontSize: '0.82rem', color: deliveryOtpMessage.includes('🎉') ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
                    {deliveryOtpMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* BANK NEFT / RTGS INVOICE BOX (If NEFT/RTGS selected) */}
        {order.paymentMode === 'Bank NEFT / RTGS Wire Transfer' && (
          <div className="bank-transfer-details-box">
            <h4 className="bank-box-title">🏛️ Official Royal Trust Bank Details (NEFT / RTGS)</h4>
            <p className="bank-box-sub">
              Please execute the RTGS/NEFT wire transfer to the account below, quoting your Order Reference: <strong>{order.orderReference}</strong>
            </p>
            <div className="bank-grid">
              <div><span>Bank Name:</span> <strong>HDFC Bank Ltd.</strong></div>
              <div><span>A/C Name:</span> <strong>Patola Made Vankar Heritage LLP</strong></div>
              <div><span>A/C Number:</span> <strong>50200084920194</strong></div>
              <div><span>IFSC Code:</span> <strong>HDFC0001429</strong></div>
              <div><span>Account Type:</span> <strong>Current Heritage Account</strong></div>
              <div><span>Branch:</span> <strong>Heritage Loom High Street, Gujarat</strong></div>
            </div>
          </div>
        )}

        {/* FULL ONLINE PAYMENT SUCCESS BADGE */}
        {order.paymentMode === 'Full Online Payment' && (
          <div className="online-paid-badge">
            <span>✓</span>
            <div>
              <strong>Full Payment Received Online (UPI / Card Verified)</strong>
              <small>No payment required at doorstep. Parcel will be handed over directly.</small>
            </div>
          </div>
        )}

        {/* Live Courier & Dispatch Status Callout */}
        <div className="order-live-stage-banner" style={{
          background: isCancelled
            ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.12), rgba(153, 27, 27, 0.06))'
            : 'linear-gradient(135deg, rgba(212, 175, 55, 0.12), rgba(128, 0, 32, 0.06))',
          border: isCancelled ? '1.5px solid #f87171' : '1px solid #d4af37',
          borderRadius: '8px',
          padding: '0.9rem 1.2rem',
          margin: '1.2rem 0',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '1.6rem' }}>{isCancelled ? '🚫' : '🚚'}</span>
          <div>
            <div style={{
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: isCancelled ? '#991b1b' : 'var(--color-primary-dark)',
              fontWeight: 700
            }}>
              {isCancelled ? 'Fulfillment Terminated Status' : 'Live Artisan Fulfillment Status'}
            </div>
            <strong style={{ fontSize: '1.05rem', color: isCancelled ? '#b91c1c' : '#1a1a1a' }}>
              {isCancelled ? 'Order Cancelled & Production Halted' : currentEff.statusText}
            </strong>
          </div>
        </div>

        {/* TIMELINE: IF CANCELLED SHOW CANCELLED JOURNEY, ELSE SHOW 5-STAGE STEPS */}
        {isCancelled ? (
          <div className="tracking-timeline-wrapper" style={{ background: '#fff5f5', border: '1.5px solid #fca5a5' }}>
            <h4 className="timeline-heading" style={{ color: '#991b1b' }}>
              🚫 Order Cancellation & Resolution Status
            </h4>
            <div className="cancelled-stepper">
              <div className="cancelled-step-item">
                <div className="cancelled-step-circle done">✓</div>
                <div className="cancelled-step-label">
                  <strong>Order Placed</strong>
                  <small>Heritage Request Logged</small>
                </div>
              </div>

              <div className="cancelled-step-connector done"></div>

              <div className="cancelled-step-item">
                <div className="cancelled-step-circle cancelled-stop">✕</div>
                <div className="cancelled-step-label">
                  <strong style={{ color: '#dc2626' }}>Cancelled</strong>
                  <small>Order Terminated</small>
                </div>
              </div>

              <div className="cancelled-step-connector cancelled"></div>

              <div className="cancelled-step-item">
                <div className="cancelled-step-circle refund-active">💳</div>
                <div className="cancelled-step-label">
                  <strong>Refund Initiated</strong>
                  <small>Processed to Source</small>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="tracking-timeline-wrapper">
            <h4 className="timeline-heading">Delivery Progress Journey</h4>
            <div className="tracking-steps-stepper">
              {/* Step 1: Order Created / Pending */}
              <div className={`step-item ${stageNumber >= 1 ? 'completed' : ''}`}>
                <div className="step-circle">1</div>
                <div className="step-label">
                  <strong>Order Placed</strong>
                  <small>OrderStatus: Pending</small>
                </div>
              </div>

              <div className={`step-connector ${stageNumber >= 2 ? 'active' : ''}`}></div>

              {/* Step 2: Payment Paid & Order Confirmed */}
              <div className={`step-item ${stageNumber >= 2 ? 'completed' : stageNumber === 1 ? 'in-progress' : ''}`}>
                <div className="step-circle">2</div>
                <div className="step-label">
                  <strong>Paid & Confirmed</strong>
                  <small>Confirmation OTP Verified</small>
                </div>
              </div>

              <div className={`step-connector ${stageNumber >= 3 ? 'active' : ''}`}></div>

              {/* Step 3: Packed */}
              <div className={`step-item ${stageNumber >= 3 ? 'completed' : stageNumber === 2 ? 'in-progress' : ''}`}>
                <div className="step-circle">3</div>
                <div className="step-label">
                  <strong>Packed</strong>
                  <small>Quality Sealed & Wooden Casket</small>
                </div>
              </div>

              <div className={`step-connector ${stageNumber >= 4 ? 'active' : ''}`}></div>

              {/* Step 4: Shipped */}
              <div className={`step-item ${stageNumber >= 4 ? 'completed' : stageNumber === 3 ? 'in-progress' : ''}`}>
                <div className="step-circle">4</div>
                <div className="step-label">
                  <strong>Shipped</strong>
                  <small>Dispatched via Courier</small>
                </div>
              </div>

              <div className={`step-connector ${stageNumber >= 5 ? 'active' : ''}`}></div>

              {/* Step 5: Delivered via Delivery OTP */}
              <div className={`step-item ${stageNumber >= 5 ? 'completed' : ''}`}>
                <div className="step-circle">5</div>
                <div className="step-label">
                  <strong>Delivered</strong>
                  <small>Delivery OTP Verified</small>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMER 1-5 STAR REVIEW CARD (Shown when order is Completed / Delivered) */}
        {order && !isCancelled && !isOrderCancelled(order) && getEffectiveStage(order).isCompleted && (
          userReview ? (
            <div style={{
              background: '#fdf7ee',
              border: '1.5px solid #d4af37',
              borderRadius: '12px',
              padding: '1.1rem 1.4rem',
              margin: '1.2rem 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.8rem',
              boxShadow: '0 4px 15px rgba(212, 175, 55, 0.12)'
            }}>
              <div>
                <div style={{ color: '#800020', fontWeight: 700, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>👑 Your Verified Customer Review:</span>
                  <span style={{ color: '#d4af37', fontSize: '1.15rem' }}>
                    {'⭐'.repeat(userReview.rating || 5)} ({userReview.rating || 5}/5)
                  </span>
                </div>
                {userReview.comment && (
                  <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.88rem', color: '#444', fontStyle: 'italic' }}>
                    "{userReview.comment}"
                  </p>
                )}
                {userReview.tags && userReview.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
                    {userReview.tags.map(t => (
                      <span key={t} style={{ background: '#f5efe6', color: '#800020', fontSize: '0.74rem', fontWeight: 600, padding: '2px 9px', borderRadius: '12px', border: '1px solid #ebdccf' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn-outline-gold"
                onClick={() => setIsReviewOpen(true)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.86rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                ✏️ Edit Review
              </button>
            </div>
          ) : (
            <div style={{
              background: 'linear-gradient(135deg, #fdf7ee 0%, #faebd7 100%)',
              border: '2px dashed #d4af37',
              borderRadius: '12px',
              padding: '1.3rem',
              margin: '1.2rem 0',
              textAlign: 'center',
              boxShadow: '0 4px 15px rgba(212, 175, 55, 0.15)'
            }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '0.3rem' }}>⭐</div>
              <h4 style={{ color: '#800020', margin: '0.2rem 0', fontFamily: "'Cinzel', 'Playfair Display', serif", fontSize: '1.2rem' }}>
                Your Order Has Been Successfully Delivered!
              </h4>
              <p style={{ color: '#555', fontSize: '0.9rem', margin: '0.3rem auto 1rem auto', maxWidth: '460px' }}>
                Share your experience and 1 to 5 star review for the authentic handloom Patola saree woven by our Master Salvi weavers.
              </p>
              <button
                type="button"
                className="btn-primary-gold"
                onClick={() => setIsReviewOpen(true)}
                style={{
                  padding: '0.7rem 1.8rem',
                  fontWeight: 700,
                  fontSize: '0.98rem',
                  borderRadius: '25px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 15px rgba(128, 0, 32, 0.25)',
                  cursor: 'pointer'
                }}
              >
                ⭐ Rate Your Patola (Submit Review) ✦
              </button>
            </div>
          )
        )}

        {/* Ordered Patola Sarees Breakdown */}
        <div className="tracking-sarees-card" style={{
          background: '#ffffff',
          border: '1px solid #ebdccf',
          borderRadius: '10px',
          padding: '1.2rem',
          margin: '1.2rem 0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.9rem',
            borderBottom: '1px solid #f0e6da',
            paddingBottom: '0.6rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            {(() => {
              const allIt = getExpandedOrderItems(order);
              const hasDup = allIt.some(it => getItemTypeLabel(it) === 'Dupatta');
              const hasSar = allIt.some(it => getItemTypeLabel(it) === 'Saree');
              const dupCount = allIt.filter(it => getItemTypeLabel(it) === 'Dupatta').length;
              const sarCount = allIt.filter(it => getItemTypeLabel(it) === 'Saree').length;

              let label = '';
              if (hasDup && hasSar) {
                label = `Ordered Items (${allIt.length} Items: ${sarCount} ${sarCount > 1 ? 'Sarees' : 'Saree'}, ${dupCount} ${dupCount > 1 ? 'Dupattas' : 'Dupatta'}):`;
              } else if (hasDup) {
                label = `Ordered Patola Dupattas (${allIt.length} ${allIt.length > 1 ? 'Dupattas in this Order' : 'Dupatta'}):`;
              } else {
                label = `Ordered Patola Sarees (${allIt.length} ${allIt.length > 1 ? 'Sarees in this Order' : 'Saree'}):`;
              }

              return (
                <h5 style={{
                  margin: 0,
                  color: 'var(--color-primary-dark)',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontFamily: 'var(--font-serif)'
                }}>
                  <span>{hasDup && !hasSar ? '🧣' : '🥻'}</span> {label}
                </h5>
              );
            })()}
            <span style={{
              fontSize: '0.76rem',
              background: '#fdf7ee',
              color: '#800020',
              border: '1px solid #d4af37',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 700
            }}>
              Silk Mark Certified Handloom
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(() => {
              const expandedPieces = getExpandedOrderItems(order);
              if (expandedPieces.length === 0) return null;

              return expandedPieces.map((item, idx) => {
                const itemCanc = isPieceCancelled(order.orderReference, item, idx);
                const cancelData = getPieceCancelData(order.orderReference, item, idx);
                const itemPrice = Number(item.piecePrice || item.unitPrice || item.finalPriceINR || 0);
                const itemType = getItemTypeLabel(item);

                return (
                  <div
                    key={item.pieceKey || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.85rem 1rem',
                      background: itemCanc ? '#fff5f5' : '#faf7f2',
                      borderRadius: '8px',
                      border: itemCanc ? '1.5px solid #fca5a5' : '1px solid #f0e6dc',
                      flexWrap: 'wrap',
                      position: 'relative',
                      opacity: itemCanc ? 0.88 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.sareeTitle}
                        style={{
                          width: '58px',
                          height: '58px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: itemCanc ? '1.5px solid #f87171' : '1px solid #d4af37',
                          filter: itemCanc ? 'grayscale(40%)' : 'none'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '58px',
                        height: '58px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#fff',
                        borderRadius: '6px',
                        border: itemCanc ? '1.5px solid #f87171' : '1px solid #d4af37',
                        fontSize: '1.8rem'
                      }}>
                        {itemType === 'Dupatta' ? '🧣' : '🥻'}
                      </div>
                    )}

                    <div style={{ flex: '1 1 220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h6 style={{ margin: '0', fontSize: '0.96rem', color: itemCanc ? '#991b1b' : '#1a1a1a', fontWeight: 700, textDecoration: itemCanc ? 'line-through' : 'none' }}>
                          {item.pieceTitle || item.sareeTitle || (itemType === 'Dupatta' ? 'Authentic Patola Silk Dupatta' : 'Authentic Double Ikat Patola')}
                        </h6>
                        <span style={{
                          background: itemType === 'Dupatta' ? '#f3e8ff' : '#fef3c7',
                          color: itemType === 'Dupatta' ? '#7e22ce' : '#92400e',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}>
                          {itemType === 'Dupatta' ? '🧣 Dupatta' : '🥻 Saree'}
                        </span>
                        {item.totalPieces > 1 && (
                          <span style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px'
                          }}>
                            Piece {item.pieceIndex} of {item.totalPieces}
                          </span>
                        )}
                        {itemCanc && (
                          <span style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #f87171',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '1px 7px',
                            borderRadius: '12px'
                          }}>
                            🚫 Item Cancelled
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.76rem', color: '#666', display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                        <span>Quantity: <strong>1</strong></span>
                        {item.weave && <span>• {item.weave}</span>}
                        {item.motifName && <span>• Motif: <strong>{item.motifName}</strong></span>}
                      </div>

                      {itemCanc && cancelData && (
                        <div style={{ marginTop: '0.35rem', fontSize: '0.76rem', color: '#7f1d1d', background: '#fee2e2', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                          💳 <strong>100% Refund (₹{itemPrice.toLocaleString('en-IN')}):</strong> {cancelData.reason || 'Cancelled upon patron request'} (2-4 Days)
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                      <div style={{
                        fontWeight: 800,
                        color: itemCanc ? '#991b1b' : 'var(--color-primary)',
                        fontSize: '1.02rem',
                        textDecoration: itemCanc ? 'line-through' : 'none'
                      }}>
                        ₹{itemPrice.toLocaleString('en-IN')}
                      </div>

                      {/* Item Cancellation Button: Only show if there are 2 or more items in the order.
                          For single item orders, cancellation is handled exclusively by the bottom "Cancel Order" button! */}
                      {expandedPieces.length > 1 && canCustomerCancel && !itemCanc && (
                        <button
                          type="button"
                          onClick={() => {
                            setItemToCancel({ item, idx, orderRef: order.orderReference });
                          }}
                          style={{
                            marginTop: '0.35rem',
                            background: '#fff',
                            border: '1.5px solid #fca5a5',
                            color: '#dc2626',
                            borderRadius: '16px',
                            padding: '3px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 3px rgba(220,38,38,0.1)',
                            transition: 'all 0.15s ease'
                          }}
                          title={`Cancel this ${itemType.toLowerCase()}`}
                        >
                          <span>✕</span> Cancel This {itemType}
                        </button>
                      )}
                    </div>
                  </div>
                );
              });
            })()}

            {/* Partial Cancellation & Net Order Total Summary (Shown when 1 or more items are cancelled in multi-item order) */}
            {(() => {
              const rawItems = order.items && order.items.length > 0 ? order.items : [];
              const cancelledItems = rawItems.filter((it, idx) => isOrderItemCancelled(order.orderReference, it, idx));
              if (cancelledItems.length === 0 || isCancelled) return null;

              const totalCancelledRefund = cancelledItems.reduce((sum, it) => {
                const u = Number(it.unitPrice || it.finalPriceINR || 0);
                const q = Number(it.quantity) || 1;
                return sum + (u * q);
              }, 0);

              const originalTotal = rawItems.reduce((sum, it) => {
                const u = Number(it.unitPrice || it.finalPriceINR || 0);
                const q = Number(it.quantity) || 1;
                return sum + (u * q);
              }, 0);

              const netPayable = Math.max(0, originalTotal - totalCancelledRefund);

              return (
                <div style={{
                  marginTop: '0.6rem',
                  padding: '0.85rem 1.1rem',
                  background: '#fef2f2',
                  border: '1.5px dashed #f87171',
                  borderRadius: '8px',
                  fontSize: '0.86rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', color: '#666' }}>
                    <span>Original Order Total ({rawItems.length} Items):</span>
                    <span>₹{originalTotal.toLocaleString('en-IN')}</span>
                  </div>
                  {(() => {
                    const allCancAreDup = cancelledItems.every(it => getItemTypeLabel(it) === 'Dupatta');
                    const allCancAreSar = cancelledItems.every(it => getItemTypeLabel(it) === 'Saree');
                    const cancType = allCancAreDup ? 'Dupatta' : (allCancAreSar ? 'Saree' : 'Item');
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', color: '#dc2626', fontWeight: 700 }}>
                        <span>- Cancelled {cancType}(s) Refund ({cancelledItems.length} {cancelledItems.length > 1 ? 'Items' : 'Item'}):</span>
                        <span>- ₹{totalCancelledRefund.toLocaleString('en-IN')} (100% Refund Initiated)</span>
                      </div>
                    );
                  })()}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.45rem', borderTop: '1px solid #fecaca', fontWeight: 800, fontSize: '0.98rem', color: '#15803d' }}>
                    <span>Revised Active Order Total ({rawItems.length - cancelledItems.length} Active):</span>
                    <span>₹{netPayable.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Custom Saree Specifications for Bespoke Orders */}
          {order.isCustomOrder && order.customInfo && (
            <div style={{
              background: '#fffdf9',
              border: '1.5px dashed #d4af37',
              borderRadius: '8px',
              padding: '0.9rem 1.1rem',
              marginTop: '0.75rem',
              fontSize: '0.85rem',
              color: '#333'
            }}>
              <div style={{ fontWeight: 700, color: '#800020', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                <span>🧵</span> Bespoke Custom Weaving Specifications:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem', lineHeight: 1.5 }}>
                <div><strong>Heritage Motif:</strong> <span style={{ color: '#800020', fontWeight: 700 }}>{order.customInfo.motif}</span></div>
                {order.customInfo.colors && (
                  <div><strong>Silk Palette:</strong> <span style={{ background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', color: '#92400e', fontWeight: 600 }}>{order.customInfo.colors}</span></div>
                )}
                {order.customInfo.city && <div><strong>Destination City:</strong> {order.customInfo.city}</div>}
                <div><strong>Loom Timeline:</strong> <span style={{ color: '#15803d', fontWeight: 700 }}>2 to 4 Months (Handloom)</span></div>
              </div>
              {order.customInfo.description && (
                <div style={{ marginTop: '0.6rem', background: '#ffffff', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #ebdccf', fontStyle: 'italic', color: '#444' }}>
                  "{order.customInfo.description}"
                </div>
              )}
              {typeof order.customInfo.referencePhoto === 'string' && order.customInfo.referencePhoto.length > 3 && (
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <img
                    src={order.customInfo.referencePhoto}
                    alt="Reference Saree"
                    onError={(e) => { e.target.style.display = 'none'; }}
                    style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #d4af37', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', background: '#f5efe6' }}
                    onClick={() => setPreviewCustomPhoto({ img: order.customInfo.referencePhoto, name: order.customerName })}
                    title="Click to view full size"
                  />
                  <div>
                    <button
                      type="button"
                      onClick={() => setPreviewCustomPhoto({ img: order.customInfo.referencePhoto, name: order.customerName })}
                      style={{
                        background: '#800020',
                        color: '#d4af37',
                        border: 'none',
                        padding: '0.38rem 0.85rem',
                        borderRadius: '5px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      🔍 View Attached Reference Photo
                    </button>
                    <div style={{ fontSize: '0.74rem', color: '#777', marginTop: '2px' }}>
                      Customer uploaded design/vintage saree image
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order Details & Summary */}
        <div className="tracking-order-summary">
          <div className="summary-col">
            <h5>Delivery Address</h5>
            <p><strong>{order.customerName}</strong></p>
            <p>{order.deliveryAddress}</p>
            <p>{[order.city, order.state, order.postalCode].filter(Boolean).join(' - ')}</p>
            <p>Phone: {order.contactPhone}</p>
          </div>

          <div className="summary-col">
            <h5>Payment Summary</h5>
            <p><strong>Mode:</strong> {order.paymentMode}</p>
            <p><strong>Amount:</strong> {formatPrice ? formatPrice(order.totalAmount || 185000) : '₹' + (order.totalAmount || 185000).toLocaleString('en-IN')}</p>
            <p><strong>Shipping:</strong> <span style={{ color: 'var(--color-emerald)', fontWeight: 700 }}>FREE (Insured Express)</span></p>
          </div>
        </div>

        {/* INLINE CANCELLATION FORM - OPENS DIRECTLY ON SCREEN */}
        {showCancelModal && canCustomerCancel && (
          <div
            id="cancellation-form-card"
            style={{
              background: 'linear-gradient(135deg, #fffaf9 0%, #fff1f2 100%)',
              border: '2px solid #f87171',
              borderRadius: '12px',
              padding: '1.4rem 1.6rem',
              margin: '1.2rem 0',
              boxShadow: '0 8px 24px rgba(220, 38, 38, 0.15)',
              animation: 'fadeIn 0.25s ease'
            }}
          >
            {(() => {
              const allOrderPieces = getExpandedOrderItems(order);
              const isMultiItem = allOrderPieces.length > 1;
              const activePiecesWithIndex = allOrderPieces
                .map((piece, idx) => ({ piece, idx, isCanc: isPieceCancelled(order.orderReference, piece, idx) }))
                .filter(x => !x.isCanc);
              
              const selectedCount = selectedItemIndicesToCancel.length;
              const selectedRefund = selectedItemIndicesToCancel.reduce((sum, idx) => {
                const p = allOrderPieces[idx];
                if (!p) return sum;
                return sum + Number(p.piecePrice || p.unitPrice || 0);
              }, 0);
              
              const isPartialSelection = isMultiItem && selectedCount > 0 && selectedCount < activePiecesWithIndex.length;

              const toggleItemSelect = (idx) => {
                setSelectedItemIndicesToCancel(prev => {
                  if (prev.includes(idx)) {
                    return prev.filter(i => i !== idx);
                  } else {
                    return [...prev, idx];
                  }
                });
              };

              const selectAllActive = () => {
                setSelectedItemIndicesToCancel(activePiecesWithIndex.map(x => x.idx));
              };

              const clearSelection = () => {
                setSelectedItemIndicesToCancel([]);
              };

              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.8rem', borderBottom: '1.5px solid #fee2e2', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>⚠️</span>
                      <div>
                        <h4 style={{ margin: 0, color: '#991b1b', fontSize: '1.18rem', fontWeight: 800 }}>
                          {isMultiItem ? `Cancel Items from Order #${order.orderReference}` : `Cancel Order #${order.orderReference}?`}
                        </h4>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.84rem', color: '#7f1d1d' }}>
                          {isMultiItem
                            ? 'Select the specific saree or dupatta you wish to cancel. Your other sarees/dupattas will remain 100% active on loom.'
                            : 'Are you sure you wish to cancel this order? Please select your reason below.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCancelModal(false)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #fca5a5',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        fontSize: '1rem',
                        color: '#991b1b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                      title="Close cancellation form"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Multi-Item Interactive Checklist with Photos */}
                  {isMultiItem && (
                    <div style={{ marginBottom: '1.2rem', background: '#ffffff', borderRadius: '10px', border: '1.5px solid #fed7aa', padding: '0.9rem 1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#800020', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>🛍️</span> Select Item(s) to Cancel:
                        </span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={selectAllActive}
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fca5a5',
                              color: '#991b1b',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Select All Active
                          </button>
                          <button
                            type="button"
                            onClick={clearSelection}
                            style={{
                              background: '#f9fafb',
                              border: '1px solid #d1d5db',
                              color: '#4b5563',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {allOrderPieces.map((piece, idx) => {
                          const itemCanc = isPieceCancelled(order.orderReference, piece, idx);
                          const isSelected = selectedItemIndicesToCancel.includes(idx);
                          const piecePrice = Number(piece.piecePrice || piece.unitPrice || 0);
                          const itemType = getItemTypeLabel(piece);

                          return (
                            <div
                              key={piece.pieceKey || idx}
                              onClick={() => {
                                if (!itemCanc) toggleItemSelect(idx);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.85rem',
                                padding: '0.65rem 0.85rem',
                                borderRadius: '8px',
                                border: itemCanc
                                  ? '1.5px solid #e5e7eb'
                                  : (isSelected ? '2px solid #dc2626' : '1.5px solid #d1d5db'),
                                background: itemCanc
                                  ? '#f9fafb'
                                  : (isSelected ? '#fef2f2' : '#ffffff'),
                                cursor: itemCanc ? 'not-allowed' : 'pointer',
                                opacity: itemCanc ? 0.65 : 1,
                                transition: 'all 0.15s ease',
                                boxShadow: isSelected ? '0 2px 6px rgba(220,38,38,0.12)' : 'none'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={itemCanc ? true : isSelected}
                                  disabled={itemCanc}
                                  onChange={() => {}}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    accentColor: itemCanc ? '#9ca3af' : '#dc2626',
                                    cursor: itemCanc ? 'not-allowed' : 'pointer'
                                  }}
                                />
                              </div>

                              {piece.image ? (
                                <img
                                  src={piece.image}
                                  alt={piece.sareeTitle}
                                  style={{
                                    width: '48px',
                                    height: '48px',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                    border: isSelected ? '1.5px solid #dc2626' : '1px solid #d4af37'
                                  }}
                                />
                              ) : (
                                <div style={{ fontSize: '1.5rem', width: '48px', textAlign: 'center' }}>
                                  {itemType === 'Dupatta' ? '🧣' : '🥻'}
                                </div>
                              )}

                              <div style={{ flex: 1, minWidth: '180px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <strong style={{ fontSize: '0.88rem', color: isSelected ? '#991b1b' : '#1f2937' }}>
                                    {piece.pieceTitle || piece.sareeTitle || (itemType === 'Dupatta' ? 'Patola Silk Dupatta' : 'Patola Saree')}
                                  </strong>
                                  <span style={{
                                    background: itemType === 'Dupatta' ? '#f3e8ff' : '#fef3c7',
                                    color: itemType === 'Dupatta' ? '#7e22ce' : '#92400e',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: '4px'
                                  }}>
                                    {itemType === 'Dupatta' ? '🧣 Dupatta' : '🥻 Saree'}
                                  </span>
                                  {piece.totalPieces > 1 && (
                                    <span style={{
                                      background: '#e0f2fe',
                                      color: '#0369a1',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      padding: '1px 5px',
                                      borderRadius: '4px'
                                    }}>
                                      Piece {piece.pieceIndex} of {piece.totalPieces}
                                    </span>
                                  )}
                                  {itemCanc && (
                                    <span style={{ background: '#e5e7eb', color: '#6b7280', fontSize: '0.68rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px' }}>
                                      🚫 Already Cancelled
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#666', marginTop: '2px' }}>
                                  Quantity: 1 {piece.motifName ? `• Motif: ${piece.motifName}` : ''}
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isSelected ? '#991b1b' : '#15803d' }}>
                                  ₹{piecePrice.toLocaleString('en-IN')}
                                </div>
                                {isSelected && !itemCanc && (
                                  <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700 }}>
                                    ⚠️ To Cancel
                                  </span>
                                )}
                                {!isSelected && !itemCanc && (
                                  <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700 }}>
                                    🌿 Keep Active
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Live Calculation Box */}
                      <div style={{
                        marginTop: '0.85rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        background: isPartialSelection ? '#fff7ed' : '#fef2f2',
                        border: isPartialSelection ? '1px solid #fdba74' : '1px solid #fca5a5',
                        color: isPartialSelection ? '#9a3412' : '#991b1b',
                        lineHeight: 1.45
                      }}>
                        {isPartialSelection ? (
                          <>
                            <strong>✦ Partial Item Cancellation Summary:</strong><br />
                            • <strong>Cancelling:</strong> {selectedCount} item(s) • <strong>100% Refund:</strong> ₹{selectedRefund.toLocaleString('en-IN')}<br />
                            • <strong>Remaining Active:</strong> {activePiecesWithIndex.length - selectedCount} item(s) will <strong>continue weaving on loom & be delivered smoothly</strong>.
                          </>
                        ) : (
                          <>
                            <strong>✦ Full Order Status:</strong><br />
                            {selectedCount === 0
                              ? `Select specific item(s) above to cancel just those items, or click 'Cancel Entire Order' below.`
                              : `All active items selected. This will terminate Order #${order.orderReference} with a 100% full refund of ₹${(order.totalAmount || 0).toLocaleString('en-IN')}.`}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#374151', marginBottom: '0.6rem' }}>
                    Select Reason for Cancellation:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.55rem', marginBottom: '1rem' }}>
                    {[
                      'Want to keep only selected saree / dupatta',
                      'Ordered duplicate / extra item by mistake',
                      'Changed my mind / Decided later',
                      'Want to change motif or silk color palette',
                      'Delivery timeline is longer than needed',
                      'Occasion or budget plan adjustment',
                      'Need to change delivery address or payment method',
                      'Other personal reason'
                    ].map((reasonText) => {
                      const isSel = cancelReason === reasonText;
                      return (
                        <button
                          key={reasonText}
                          type="button"
                          onClick={() => setCancelReason(reasonText)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.55rem',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: isSel ? '2px solid #dc2626' : '1.5px solid #e5e7eb',
                            background: isSel ? '#fef2f2' : '#ffffff',
                            color: isSel ? '#991b1b' : '#374151',
                            fontWeight: isSel ? 700 : 500,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                            boxShadow: isSel ? '0 1px 4px rgba(220,38,38,0.15)' : 'none'
                          }}
                        >
                          <span style={{ fontSize: '1.1rem' }}>{isSel ? '🔘' : '⚪'}</span>
                          <span>{reasonText}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>
                      Additional Notes (Optional Remarks):
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Please proceed with my remaining items on priority..."
                      value={cancelNotes}
                      onChange={(e) => setCancelNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        fontSize: '0.88rem',
                        borderRadius: '6px',
                        border: '1.5px solid #d1d5db',
                        background: '#ffffff'
                      }}
                    />
                  </div>

                  <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '0.8rem 1rem',
                    fontSize: '0.84rem',
                    color: '#92400e',
                    lineHeight: 1.45,
                    marginBottom: '1.2rem'
                  }}>
                    <strong>✦ Patola Made Vankar Guarantee (100% Refund Protection): </strong>
                    {order.paymentMode === 'Cash on Delivery (COD)'
                      ? 'This is a Cash on Delivery order and will be updated instantly without any charge.'
                      : `Your 100% refund for cancelled items will be credited back to your original payment method in 2 to 4 business days.`}
                  </div>

                  <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(false)}
                      disabled={cancellingLoading}
                      style={{
                        background: '#ffffff',
                        color: '#4b5563',
                        border: '1.5px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '0.65rem 1.3rem',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                      }}
                    >
                      Keep My Order
                    </button>

                    {/* Button to cancel ONLY the selected item(s) */}
                    {isPartialSelection && (
                      <button
                        type="button"
                        onClick={handleConfirmCancelSelectedItems}
                        disabled={cancellingLoading}
                        style={{
                          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.65rem 1.4rem',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {cancellingLoading ? 'Processing Cancellation...' : `🚫 Cancel Selected ${selectedCount} Item(s) (₹${selectedRefund.toLocaleString('en-IN')})`}
                      </button>
                    )}

                    {/* Button to cancel ENTIRE order */}
                    <button
                      type="button"
                      onClick={handleConfirmCancelOrder}
                      disabled={cancellingLoading}
                      style={{
                        background: isPartialSelection
                          ? '#ffffff'
                          : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                        color: isPartialSelection ? '#dc2626' : '#ffffff',
                        border: isPartialSelection ? '1.5px solid #dc2626' : 'none',
                        borderRadius: '6px',
                        padding: '0.65rem 1.4rem',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        boxShadow: isPartialSelection ? 'none' : '0 2px 8px rgba(220, 38, 38, 0.3)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cancellingLoading ? 'Processing Cancellation...' : (isMultiItem ? '🚫 Cancel Entire Order' : '🚫 Yes, Cancel Order')}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        <div className="tracking-modal-actions" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-print-receipt" onClick={() => window.print()}>
              🖨️ Print Royal Receipt
            </button>

            {canCustomerCancel && (
              <button
                type="button"
                className="btn-cancel-order"
                onClick={handleOpenCancelForm}
                title="Cancel this order"
                style={{
                  border: showCancelModal ? '2px solid #b91c1c' : undefined,
                  background: showCancelModal ? '#fee2e2' : undefined,
                  color: showCancelModal ? '#991b1b' : undefined,
                  fontWeight: 700
                }}
              >
                {showCancelModal ? '✕ Close Form' : '🚫 Cancel Order'}
              </button>
            )}

            {currentEff.isCompleted && !isCancelled && (
              <span style={{
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #86efac',
                borderRadius: '6px',
                padding: '0.55rem 0.95rem',
                fontSize: '0.86rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                🏆 Order Delivered
              </span>
            )}

            {isCancelled && (
              <a
                href={`https://wa.me/918160160750?text=Namaste%20PATOLA%20MADE%20VANKAR%2C%20regarding%20my%20cancelled%20order%20${order.orderReference}`}
                target="_blank"
                rel="noreferrer"
                className="contact-chip whatsapp"
                style={{ padding: '0.55rem 0.9rem', fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
              >
                💬 WhatsApp Support
              </a>
            )}
          </div>

          <button className="btn-primary-gold" onClick={onClose}>
            Continue Exploring Collection
          </button>
        </div>

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
                ✦ Customer Reference Saree Photo ✦
              </h4>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#666' }}>
                {previewCustomPhoto.name ? `Attached by ${previewCustomPhoto.name} for Bespoke Handloom Commission` : 'Authentic Client Design Reference'}
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
                  alt="Customer Reference Saree"
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

        {/* Single Item (Saree / Dupatta) Cancellation Confirmation Dialog */}
        {itemToCancel && canCustomerCancel && typeof document !== 'undefined' && createPortal(
          <div
            className="item-cancel-modal-backdrop"
            onClick={() => setItemToCancel(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(10, 6, 6, 0.82)',
              backdropFilter: 'blur(6px)',
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
                border: '2px solid #800020',
                padding: '1.6rem 1.8rem',
                maxWidth: '520px',
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                position: 'relative',
                boxSizing: 'border-box'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const item = itemToCancel.item;
                const itemType = getItemTypeLabel(item);
                const piecePrice = Number(item.piecePrice || item.unitPrice || item.finalPriceINR || 0) || ((order.totalAmount || 0) / (order.items?.length || 1));
                const pieceTitle = item.pieceTitle || item.sareeTitle || item.title || (itemType === 'Dupatta' ? 'Patola Silk Dupatta' : 'Patola Saree');

                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1.5px solid #ebdccf', paddingBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ fontSize: '1.3rem' }}>🚫</span>
                        <h4 style={{ margin: 0, color: '#800020', fontFamily: "'Cinzel', 'Playfair Display', serif", fontSize: '1.18rem', fontWeight: 800 }}>
                          Cancel {itemType}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setItemToCancel(null)}
                        style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#666', fontWeight: 700 }}
                        aria-label="Close"
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '0.9rem',
                      alignItems: 'center',
                      background: '#fdf7ee',
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: '1.5px solid #d4af37',
                      marginBottom: '1.1rem'
                    }}>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={pieceTitle}
                          style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #d4af37' }}
                        />
                      ) : (
                        <div style={{ fontSize: '2.4rem' }}>{itemType === 'Dupatta' ? '🧣' : '🥻'}</div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.96rem', color: '#800020', display: 'block' }}>
                            {pieceTitle}
                          </strong>
                          <span style={{
                            background: itemType === 'Dupatta' ? '#f3e8ff' : '#fef3c7',
                            color: itemType === 'Dupatta' ? '#7e22ce' : '#92400e',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px'
                          }}>
                            {itemType === 'Dupatta' ? '🧣 Dupatta' : '🥻 Saree'}
                          </span>
                          {item.totalPieces > 1 && (
                            <span style={{
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px'
                            }}>
                              Piece {item.pieceIndex} of {item.totalPieces}
                            </span>
                          )}
                        </div>
                        {item.motifName && (
                          <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '2px' }}>
                            Motif: <strong>{item.motifName}</strong>
                          </div>
                        )}
                        <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                          💳 100% Refund Amount: ₹{piecePrice.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#800020', marginBottom: '0.4rem' }}>
                        Select Cancellation Reason:
                      </label>
                      <select
                        value={itemCancelReason}
                        onChange={(e) => setItemCancelReason(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.8rem',
                          borderRadius: '6px',
                          border: '1.5px solid #d4af37',
                          fontSize: '0.86rem',
                          color: '#1a1a1a',
                          fontWeight: 600,
                          background: '#fff'
                        }}
                      >
                        <option value="Ordered duplicate / extra item by mistake">Ordered extra items by mistake</option>
                        <option value={`Want to keep only remaining items from this order`}>Want to keep only remaining items from this order</option>
                        <option value="Want to change motif or silk color palette">Want to change motif / silk color</option>
                        <option value="Occasion or budget plan adjustment">Occasion or budget plan adjustment</option>
                        <option value="Delivery timeline requirement change">Delivery timeline requirement change</option>
                        <option value="Other reason">Other personal reason</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '1.1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#555', marginBottom: '0.35rem' }}>
                        Additional Note for Master Weavers (Optional):
                      </label>
                      <textarea
                        rows={2}
                        value={itemCancelNotes}
                        onChange={(e) => setItemCancelNotes(e.target.value)}
                        placeholder={`e.g. Please proceed with my remaining items on priority...`}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.84rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{
                      background: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      padding: '0.8rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.84rem',
                      color: '#166534',
                      marginBottom: '1.3rem',
                      lineHeight: 1.5
                    }}>
                      ✦ <strong>100% Refund (₹{piecePrice.toLocaleString('en-IN')}):</strong> Full refund will be credited back in 2 to 4 business days.<br />
                      ✦ <strong>Active Items:</strong> Your remaining sarees and dupattas will continue weaving on loom and be delivered smoothly.
                    </div>

                    <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setItemToCancel(null)}
                        style={{
                          padding: '0.6rem 1.2rem',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          background: '#ffffff',
                          color: '#4b5563',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          cursor: 'pointer'
                        }}
                      >
                        Keep This {itemType}
                      </button>
                      <button
                        type="button"
                        disabled={itemCancelLoading}
                        onClick={handleConfirmCancelSingleItem}
                        style={{
                          padding: '0.65rem 1.4rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#dc2626',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)'
                        }}
                      >
                        {itemCancelLoading
                          ? 'Processing Cancellation...'
                          : `🚫 Yes, Cancel This ${itemType} (₹${piecePrice.toLocaleString('en-IN')})`}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>,
          document.body
        )}

        {/* Customer Review Modal (1 to 5 Stars Rating) */}
        {order && (
          <CustomerReviewModal
            isOpen={isReviewOpen}
            onClose={() => setIsReviewOpen(false)}
            order={order}
            onReviewSubmitted={(newRev) => {
              setUserReview(newRev);
            }}
            onShowToast={(msg) => {
              // Custom toast handling or alert
            }}
          />
        )}
      </div>
    </div>
  );
}






