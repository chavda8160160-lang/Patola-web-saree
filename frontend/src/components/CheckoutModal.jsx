/* ====================================================================================================
 * FileName: CheckoutModal.jsx
 * Folder: frontend/src/components/
 * 
 * Royal Checkout and Order Submission Form (100% English)
 * - Cash on Delivery (COD) with Delivery Handover OTP.
 * - Full Online Payment (UPI, Credit/Debit Card, NetBanking).
 * - Bank NEFT / RTGS Wire Transfer for large billing.
 * - 100% Transit Insured Royal Packaging Guarantee.
 * - 2 to 4 Months Traditional Rosewood Loom Weaving Timeline.
 * - Integrated with .NET Core Web API 'sp_CreateOrder' Stored Procedure.
 * ==================================================================================================== */

import React, { useState, useRef } from 'react';
import { ApiService } from '../services/api';
import { validateCustomerSecurity, showSecurityToast, saveOrderDeliveryOtp, formatDateDDMMYYYY } from '../utils/security';
import PaymentModal from './PaymentModal';

export default function CheckoutModal({
  isOpen,
  onClose,
  cart,
  formatPrice,
  currentCurrency,
  onOrderSuccess,
  loggedInCustomer = null
}) {
  const [formData, setFormData] = useState({
    customerName: loggedInCustomer?.customerName || '',
    contactPhone: loggedInCustomer?.phoneNumber || '',
    deliveryAddress: loggedInCustomer?.deliveryAddress || '',
    city: loggedInCustomer?.city || '',
    state: loggedInCustomer?.state || '',
    postalCode: loggedInCustomer?.postalCode || '',
    paymentMode: 'Cash on Delivery (COD)',
    customNotes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [verifiedPaymentResult, setVerifiedPaymentResult] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);
  const checkoutIdempotencyRef = useRef(null);

  if (!isOpen) return null;

  const getItemEffectivePrice = (item) => {
    if (!item) return 0;
    if (item.finalPriceINR && Number(item.finalPriceINR) > 0) return Number(item.finalPriceINR);
    const disc = Number(item.discountPercent) || 0;
    const base = Number(item.basePriceINR) || 0;
    if (disc > 0 && base > 0) return Math.round(base - (base * disc / 100));
    return base;
  };

  const totalINR = cart.reduce((sum, item) => sum + getItemEffectivePrice(item) * (item.quantity || 1), 0);

  // Calculate estimated delivery date: 5 to 10 days from today
  const calculateDeliveryDate = () => {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 5);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 10);

    const minStr = formatDateDDMMYYYY(minDate);
    const maxStr = formatDateDDMMYYYY(maxDate);

    return `5 to 10 Days (${minStr} - ${maxStr})`;
  };

  const handleResetForm = () => {
    setFormData({
      customerName: '',
      contactPhone: '',
      deliveryAddress: '',
      city: '',
      state: '',
      postalCode: '',
      paymentMode: 'Cash on Delivery (COD)',
      customNotes: ''
    });
  };

  // Step 1: Order Create -> Creates order in SQL Server via sp_CreateOrder (OrderStatus = 'Pending', PaymentStatus = 'Pending')
  const executeOrderSubmission = async () => {
    setSubmitting(true);
    setSubmitError('');

    const generatedDeliveryHandoverOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const customerSnapshot = { ...formData };
    const chosenPaymentMode = customerSnapshot.paymentMode;

    const orderPayload = {
      customerName: customerSnapshot.customerName,
      contactPhone: customerSnapshot.contactPhone,
      deliveryAddress: customerSnapshot.deliveryAddress,
      city: customerSnapshot.city,
      state: customerSnapshot.state,
      postalCode: customerSnapshot.postalCode,
      currency: currentCurrency || 'INR',
      paymentMode: chosenPaymentMode,
      deliveryOtp: generatedDeliveryHandoverOtp,
      notes: customerSnapshot.customNotes,
      totalAmount: totalINR,
      items: cart.map(item => {
        const effPrice = getItemEffectivePrice(item);
        return {
          sareeId: String(item.id),
          sareeTitle: item.title,
          category: item.category,
          unitPrice: effPrice,
          originalPrice: item.originalPriceINR || item.basePriceINR,
          discountPercent: Number(item.discountPercent) || 0,
          quantity: item.quantity,
          image: item.image,
          motifName: item.motifName,
          weave: item.weave
        };
      })
    };

    // Retry idempotency key
    const retryFingerprint = JSON.stringify({
      customerName: orderPayload.customerName.trim(),
      contactPhone: orderPayload.contactPhone.trim(),
      deliveryAddress: orderPayload.deliveryAddress.trim(),
      city: orderPayload.city.trim(),
      state: orderPayload.state.trim(),
      postalCode: orderPayload.postalCode.trim(),
      currency: orderPayload.currency.toUpperCase(),
      paymentMode: orderPayload.paymentMode.trim(),
      items: orderPayload.items
        .map(({ sareeId, sareeTitle, unitPrice, quantity }) => ({ sareeId, sareeTitle, unitPrice, quantity }))
        .sort((left, right) => left.sareeId.localeCompare(right.sareeId))
    });

    let checkoutIntent = checkoutIdempotencyRef.current;
    if (!checkoutIntent || checkoutIntent.fingerprint !== retryFingerprint) {
      try {
        const savedIntent = JSON.parse(sessionStorage.getItem('patola_pending_order_submission') || 'null');
        if (savedIntent?.fingerprint === retryFingerprint && savedIntent?.key) checkoutIntent = savedIntent;
      } catch (e) {}
      if (!checkoutIntent || checkoutIntent.fingerprint !== retryFingerprint) {
        const key = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
        checkoutIntent = { key, fingerprint: retryFingerprint };
      }
      checkoutIdempotencyRef.current = checkoutIntent;
      try { sessionStorage.setItem('patola_pending_order_submission', JSON.stringify(checkoutIntent)); } catch (e) {}
    }
    orderPayload.idempotencyKey = checkoutIntent.key;

    let result;
    try {
      // Step 1: Create Order in SQL Server -> OrderStatus='Pending', PaymentStatus='Pending'
      result = await ApiService.createOrder(orderPayload);
    } catch (err) {
      console.error('Order submission failed:', err);
      setSubmitting(false);
      setSubmitError('Order could not be saved to the database. Please check your connection and try again.');
      return false;
    }

    setSubmitting(false);

    const orderRef = (result && result.orderReference)
      ? result.orderReference
      : 'VP-' + Math.floor(100000 + Math.random() * 900000);

    const authoritativeOtp = (result && result.deliveryOtp)
      ? String(result.deliveryOtp)
      : generatedDeliveryHandoverOtp;

    saveOrderDeliveryOtp(orderRef, authoritativeOtp);

    // Save auto-created Customer account to session if returned by API
    if (result?.customerAccount) {
      try {
        if (result.customerAccount.token) {
          sessionStorage.setItem('patola_customer_token', result.customerAccount.token);
        }
        sessionStorage.setItem('patola_current_customer', JSON.stringify({
          customerName: result.customerAccount.customerName || customerSnapshot.customerName,
          phoneNumber: result.customerAccount.phoneNumber || customerSnapshot.contactPhone
        }));
      } catch (e) {}
    }

    const cleanPhone = (customerSnapshot.contactPhone || '').replace(/\D/g, '');
    const waTarget = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const customerPasswordDisplay = result?.customerAccount?.password || 'Auto-Generated';
    const waMessageText = `👑 *Patola Made Vankar - Thank You!*

Dear *${customerSnapshot.customerName || 'Patron'}*,

Your royal handloom order has been placed successfully!
📦 *Order Reference:* #${orderRef}

Your customer account has been automatically activated:
📱 *Login Mobile:* +91 ${cleanPhone}
🔑 *Login Password / PIN:* ${customerPasswordDisplay}

🔗 *Track your order & manage account:*
${window.location.origin}/#account

💡 *Tip:* You can change your password anytime to your preferred one from "My Account > Change Password".

Thank you for choosing authentic Patola craftsmanship!`;

    const waUrl = `https://api.whatsapp.com/send?phone=${waTarget}&text=${encodeURIComponent(waMessageText)}`;

    const isOnlinePayment = formData.paymentMode === 'Full Online Payment';

    if (isOnlinePayment) {
      // Save created order with snapshot & open Step 2 (Razorpay Payment) and Step 3 (Confirmation OTP) modal
      setCreatedOrder({
        ...result,
        orderReference: orderRef,
        deliveryOtp: authoritativeOtp,
        customerSnapshot,
        customerAccount: result?.customerAccount,
        whatsAppUrl: waUrl
      });
      setIsPaymentModalOpen(true);
      return true;
    }

    // For Cash on Delivery (COD) or Bank Wire Transfer:
    // DO NOT open online payment (Razorpay)! Customer pays cash upon delivery.
    const deliveryDateStr = calculateDeliveryDate();
    checkoutIdempotencyRef.current = null;
    try { sessionStorage.removeItem('patola_pending_order_submission'); } catch (e) {}
    handleResetForm();
    onClose();

    // Automatically trigger WhatsApp notification
    try {
      window.open(waUrl, '_blank');
    } catch (e) {}

    const isCod = customerSnapshot.paymentMode === 'Cash on Delivery (COD)';
    const fullOrderDetails = {
      id: result?.orderId,
      orderReference: orderRef,
      customerName: customerSnapshot.customerName,
      contactPhone: customerSnapshot.contactPhone,
      deliveryAddress: customerSnapshot.deliveryAddress,
      city: customerSnapshot.city,
      state: customerSnapshot.state,
      postalCode: customerSnapshot.postalCode,
      currency: currentCurrency || 'INR',
      paymentMode: customerSnapshot.paymentMode,
      orderStatus: 'Confirmed',
      paymentStatus: 'Pending',
      deliveryOtp: authoritativeOtp,
      deliveryDateText: deliveryDateStr,
      transactionId: isCod ? 'COD-PAY-ON-DELIVERY' : 'BANK-TRANSFER-PENDING',
      isCustomLoom: true,
      customNotes: customerSnapshot.customNotes,
      totalAmount: totalINR,
      createdAt: new Date().toISOString(),
      customerAccount: result?.customerAccount,
      whatsAppUrl: waUrl,
      items: cart.map(item => {
        const effPrice = getItemEffectivePrice(item);
        return {
          sareeId: String(item.id),
          sareeTitle: item.title,
          category: item.category,
          quantity: item.quantity,
          unitPrice: effPrice,
          originalPrice: item.originalPriceINR || item.basePriceINR,
          discountPercent: Number(item.discountPercent) || 0,
          image: item.image,
          motifName: item.motifName,
          weave: item.weave
        };
      }),
      currentStage: 2 // Stage 2: Confirmed!
    };

    onOrderSuccess(fullOrderDetails);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const sec = validateCustomerSecurity(formData.customerName, formData.contactPhone);
    if (sec.isFake) {
      showSecurityToast(sec.reason);
      alert(sec.reason);
      return;
    }

    await executeOrderSubmission();
  };

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal-container checkout-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="btn-close-modal" onClick={onClose} aria-label="Close Checkout">✕</button>

        <div className="checkout-steps-badge">
          <span>✦ Royal Trousseau Checkout ✦</span>
        </div>

        {/* 100% Transit Insured Gold Badge */}
        <div className="checkout-insurance-gold-strip">
          <span style={{ fontSize: '1.2rem' }}>🛡️</span>
          <div>
            <strong>100% Transit Insured (Royal Transit Coverage)</strong>
            <p>Every single Patola is packed in a tamper-evident wooden casket and insured during armored express transit.</p>
          </div>
        </div>

        {/* Order Summary Box */}
        <div className="checkout-summary-box">
          <h4 className="checkout-summary-title">Order & Trousseau Summary</h4>
          {cart.map(item => (
            <div key={item.id} className="checkout-item-row">
              <span>{item.title} × {item.quantity}</span>
              <span style={{ fontWeight: 700 }}>{formatPrice(item.basePriceINR * item.quantity)}</span>
            </div>
          ))}

          <div className="checkout-total-row">
            <span>Payable Amount:</span>
            <span className="checkout-total-price">{formatPrice(totalINR)}</span>
          </div>

          <div className="checkout-delivery-preview">
            <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>🧵 Estimated Delivery Timeline:</span>
            <span>Express Armored Dispatch: 5 to 10 Days Delivery + 100% Insured Delivery</span>
          </div>
        </div>

        {/* Checkout Form */}
        <form onSubmit={handleSubmit}>
          <fieldset disabled={Boolean(verifiedPaymentResult)} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <div className="checkout-form-grid">
            <div>
              <label className="form-label">Recipient Full Name *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="form-label">Contact Mobile (for order confirmation and delivery) *</label>
              <input
                type="tel"
                className="form-input"
                required
                value={formData.contactPhone}
                onChange={(e) => {
                  setFormData({ ...formData, contactPhone: e.target.value });
                }}
                placeholder="Enter 10-digit mobile"
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Full Delivery Address *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                placeholder="House no, Building, Street, Area"
              />
            </div>

            <div>
              <label className="form-label">City *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Enter city"
              />
            </div>

            <div>
              <label className="form-label">State *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Enter state"
                autoComplete="address-level1"
              />
            </div>

            <div>
              <label className="form-label">PIN Code (for Delivery Transit) *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="Enter 6-digit PIN code"
              />
            </div>
          </div>

          {/* Optional Custom Notes / Specific Requirements */}
          <div style={{ marginBottom: '1.2rem', marginTop: '1rem' }}>
            <label className="form-label" style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>
              Optional Customization or Notes (Color / Blouse / Pallu specifications):
            </label>
            <textarea
              className="form-input"
              rows={2}
              value={formData.customNotes}
              onChange={(e) => setFormData({ ...formData, customNotes: e.target.value })}
              placeholder="Any special request"
            />
          </div>

          {/* PAYMENT MODES: COD, FULL ONLINE, NEFT/RTGS */}
          <div className="payment-selection-section">
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary-dark)' }}>
              Select Payment Method
            </label>

            <div className="payment-options-list">
              {/* Option 1: Cash on Delivery (COD) */}
              <label className={`payment-option-card ${formData.paymentMode === 'Cash on Delivery (COD)' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="Cash on Delivery (COD)"
                  checked={formData.paymentMode === 'Cash on Delivery (COD)'}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                />
                <div className="payment-card-content">
                  <div className="payment-card-title">
                    <strong>💵 Cash on Delivery (COD)</strong>
                    <span className="otp-pill">Secure Delivery OTP</span>
                  </div>
                  <p className="payment-card-desc">
                    Pay cash upon doorstep inspection and secure OTP verification with the delivery agent.
                  </p>
                </div>
              </label>

              {/* Option 2: Full Online Payment */}
              <label className={`payment-option-card ${formData.paymentMode === 'Full Online Payment' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="Full Online Payment"
                  checked={formData.paymentMode === 'Full Online Payment'}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                />
                <div className="payment-card-content">
                  <div className="payment-card-title">
                    <strong>⚡ Full Payment Online (UPI / Cards / NetBanking)</strong>
                    <span className="instant-pill">Instant Verified</span>
                  </div>
                  <p className="payment-card-desc">
                    Google Pay, PhonePe, Paytm, All Credit & Debit Cards, NetBanking.
                  </p>
                  <p className="payment-card-desc" style={{ marginTop: '0.3rem', fontWeight: 700 }}>
                    Online payment is charged in INR: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(totalINR)}
                  </p>
                </div>
              </label>

              {/* Option 3: Bank NEFT / RTGS Wire Transfer */}
              <label className={`payment-option-card ${formData.paymentMode === 'Bank NEFT / RTGS Wire Transfer' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="Bank NEFT / RTGS Wire Transfer"
                  checked={formData.paymentMode === 'Bank NEFT / RTGS Wire Transfer'}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                />
                <div className="payment-card-content">
                  <div className="payment-card-title">
                    <strong>🏛️ Bank NEFT / RTGS Wire Transfer</strong>
                    <span className="corp-pill">Large Royal Billing</span>
                  </div>
                  <p className="payment-card-desc">
                    Direct bank transfer invoice for high-value royal billing (with official RTGS/NEFT bank details).
                  </p>
                </div>
              </label>
            </div>
          </div>
          </fieldset>

          {submitError && (
            <div role="alert" style={{ marginTop: '1rem', padding: '0.8rem 1rem', background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3', borderRadius: '8px' }}>
              {submitError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn-primary-gold checkout-submit-btn"
              style={{ flex: 1 }}
              disabled={submitting}
            >
              {submitting ? 'Saving order…' : (verifiedPaymentResult ? 'Retry Saving Verified Order' : (formData.paymentMode === 'Full Online Payment' ? 'Proceed to Razorpay Online Pay ✦' : 'Place Secure Order ✦'))}
            </button>
            <button
              type="button"
              className="btn-outline-gold"
              onClick={handleResetForm}
              disabled={submitting || Boolean(verifiedPaymentResult)}
              title="Clear all fields"
              style={{ padding: '0.8rem 1.2rem', cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: '4px' }}
            >
              🔄 Reset Form
            </button>
          </div>
        </form>
      </div>

      {/* Razorpay Interactive Payment & Confirmation OTP Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          orderData={formData}
          totalAmount={totalINR}
          createdOrder={createdOrder}
          formatPrice={(amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount)}
          currency="INR"
          onPaymentSuccess={(confirmedResult) => {
            const customerSnapshot = createdOrder?.customerSnapshot || formData;
            const orderRef = confirmedResult?.orderReference || createdOrder?.orderReference;
            const deliveryDateStr = calculateDeliveryDate();

            // Clear session & reset form
            checkoutIdempotencyRef.current = null;
            try { sessionStorage.removeItem('patola_pending_order_submission'); } catch (e) {}
            handleResetForm();

            setIsPaymentModalOpen(false);
            onClose();

            // Full synchronized Confirmed Order Details
            const fullOrderDetails = {
              id: createdOrder?.orderId || confirmedResult?.orderId,
              orderReference: orderRef,
              customerName: customerSnapshot.customerName,
              contactPhone: customerSnapshot.contactPhone,
              deliveryAddress: customerSnapshot.deliveryAddress,
              city: customerSnapshot.city,
              state: customerSnapshot.state,
              postalCode: customerSnapshot.postalCode,
              currency: currentCurrency || 'INR',
              paymentMode: confirmedResult?.paymentMode || customerSnapshot.paymentMode,
              orderStatus: 'Confirmed',
              paymentStatus: 'Paid',
              deliveryOtp: confirmedResult?.deliveryOtp || createdOrder?.deliveryOtp,
              deliveryDateText: deliveryDateStr,
              transactionId: confirmedResult?.transactionId || null,
              isCustomLoom: true,
              customNotes: customerSnapshot.customNotes,
              totalAmount: totalINR,
              createdAt: new Date().toISOString(),
              items: cart.map(item => {
                const effPrice = getItemEffectivePrice(item);
                return {
                  sareeId: String(item.id),
                  sareeTitle: item.title,
                  category: item.category,
                  quantity: item.quantity,
                  unitPrice: effPrice,
                  originalPrice: item.originalPriceINR || item.basePriceINR,
                  discountPercent: Number(item.discountPercent) || 0,
                  image: item.image,
                  motifName: item.motifName,
                  weave: item.weave
                };
              }),
              currentStage: 2 // Stage 2: Confirmed!
            };

            onOrderSuccess(fullOrderDetails);
          }}
        />
      )}
    </div>
  );
}
