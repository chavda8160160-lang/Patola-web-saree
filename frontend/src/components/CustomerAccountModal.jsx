import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';

export default function CustomerAccountModal({
  isOpen,
  onClose,
  customer,
  onLogout,
  onTrackOrder,
  formatPrice = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)
}) {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Profile edit state
  const [profileName, setProfileName] = useState(customer?.customerName || '');
  const [profileEmail, setProfileEmail] = useState(customer?.email || '');
  const [profileAddress, setProfileAddress] = useState(customer?.deliveryAddress || '');
  const [profileCity, setProfileCity] = useState(customer?.city || '');
  const [profileState, setProfileState] = useState(customer?.state || 'Gujarat');
  const [profilePincode, setProfilePincode] = useState(customer?.postalCode || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  useEffect(() => {
    if (customer?.phoneNumber && isOpen) {
      loadOrders();
    }
  }, [customer?.phoneNumber, isOpen]);

  const loadOrders = async () => {
    if (!customer?.phoneNumber) return;
    setLoadingOrders(true);
    setOrderError('');
    try {
      const res = await ApiService.getCustomerOrders(customer.phoneNumber);
      if (res && res.orders) {
        setOrders(res.orders);
      }
    } catch (err) {
      setOrderError(err.message || 'Could not load orders.');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!customer?.phoneNumber) return;
    setUpdatingProfile(true);
    setProfileSuccess('');
    try {
      const res = await ApiService.updateCustomerProfile(customer.phoneNumber, {
        customerName: profileName,
        email: profileEmail,
        deliveryAddress: profileAddress,
        city: profileCity,
        state: profileState,
        postalCode: profilePincode
      });
      if (res && res.success) {
        setProfileSuccess('Profile and delivery details updated successfully.');
        setTimeout(() => setProfileSuccess(''), 4000);
      }
    } catch (err) {
      alert(err.message || 'Profile update failed.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="modal-backdrop open" onClick={onClose} style={{ zIndex: 100000 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '720px',
          width: '94%',
          maxHeight: '88vh',
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #d4af37',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.22)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: 0
        }}
      >
        {/* Classic Heritage Header */}
        <div style={{
          background: '#2b020a',
          padding: '1.3rem 1.6rem',
          color: '#ffffff',
          position: 'relative',
          borderBottom: '1px solid #c5a059',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <span style={{
              display: 'inline-block',
              letterSpacing: '2.5px',
              fontSize: '0.66rem',
              textTransform: 'uppercase',
              color: '#d4af37',
              fontWeight: 600,
              marginBottom: '0.2rem'
            }}>
              Patron Account
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontFamily: 'var(--font-serif, "Cinzel", "Playfair Display", Georgia, serif)',
                color: '#fdfbf7',
                fontWeight: 500
              }}>
                {customer.customerName}
              </h3>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#e5d7ba' }}>
              Mobile: +91 {customer.phoneNumber} {customer.city ? `• ${customer.city}` : ''}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <button
              type="button"
              onClick={() => {
                ApiService.customerLogout();
                if (onLogout) onLogout();
                onClose();
              }}
              style={{
                background: 'transparent',
                border: '1px solid #c5a059',
                color: '#e5d7ba',
                padding: '0.4rem 0.85rem',
                borderRadius: '4px',
                fontWeight: 500,
                fontSize: '0.8rem',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Sign out from this session"
            >
              Sign Out
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#d4af37',
                fontSize: '1.3rem',
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Security Auto-Logout notice bar */}
        <div style={{
          background: '#faf8f5',
          borderBottom: '1px solid #eee8df',
          padding: '0.5rem 1.6rem',
          fontSize: '0.76rem',
          color: '#736d65',
          letterSpacing: '0.2px'
        }}>
          Session active for this visit. Automatically signs out upon closing the browser.
        </div>

        {/* Content Area */}
        <div style={{ padding: '1.4rem 1.6rem', overflowY: 'auto', flex: 1 }}>
          {/* Quick Orders Tracking Shortcut Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #fffbf2 0%, #fdf6e7 100%)',
            border: '1.5px solid #d4af37',
            borderRadius: '8px',
            padding: '1.1rem 1.3rem',
            marginBottom: '1.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(107, 0, 26, 0.05)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#6b001a', fontWeight: 700 }}>
                  Live Order Tracker
                </span>
                <span style={{
                  background: '#6b001a',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#555' }}>
                View 5-stage weaving progress, courier timeline, and delivery OTP in <strong>Track Order</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onTrackOrder) onTrackOrder(orders[0]?.orderReference || '');
              }}
              style={{
                background: '#6b001a',
                color: '#ffffff',
                border: '1px solid #d4af37',
                padding: '0.6rem 1.2rem',
                borderRadius: '6px',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.3px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 6px rgba(107, 0, 26, 0.2)'
              }}
            >
              <span>Track All Orders ({orders.length}) →</span>
            </button>
          </div>

          {/* TAB: PROFILE & ADDRESS */}
          <form onSubmit={handleUpdateProfile} style={{ maxWidth: '100%' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#2a2421', fontSize: '0.98rem', fontWeight: 600 }}>
              Shipping Address & Information
            </h4>

              {profileSuccess && (
                <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '0.65rem 0.85rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.82rem' }}>
                  {profileSuccess}
                </div>
              )}

              <div style={{ marginBottom: '0.95rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#2a2421', marginBottom: '0.3rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #c9c0b1', fontSize: '0.88rem', boxSizing: 'border-box', outlineColor: '#6b001a' }}
                />
              </div>

              <div style={{ marginBottom: '0.95rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#2a2421', marginBottom: '0.3rem' }}>
                  Registered Mobile Number
                </label>
                <input
                  type="text"
                  disabled
                  value={`+91 ${customer.phoneNumber}`}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#f8f8f8', color: '#888', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '0.95rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#2a2421', marginBottom: '0.3rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="patron@royalpatola.com"
                  style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #c9c0b1', fontSize: '0.88rem', boxSizing: 'border-box', outlineColor: '#6b001a' }}
                />
              </div>

              <div style={{ marginBottom: '0.95rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#2a2421', marginBottom: '0.3rem' }}>
                  Default Delivery Address
                </label>
                <textarea
                  rows={3}
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  placeholder="House number, Street, Landmark"
                  style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #c9c0b1', fontSize: '0.88rem', boxSizing: 'border-box', outlineColor: '#6b001a' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#2a2421', marginBottom: '0.3rem' }}>City</label>
                  <input
                    type="text"
                    value={profileCity}
                    onChange={(e) => setProfileCity(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #c9c0b1', fontSize: '0.88rem', boxSizing: 'border-box', outlineColor: '#6b001a' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#2a2421', marginBottom: '0.3rem' }}>PIN Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={profilePincode}
                    onChange={(e) => setProfilePincode(e.target.value.replace(/\D/g, ''))}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #c9c0b1', fontSize: '0.88rem', boxSizing: 'border-box', outlineColor: '#6b001a' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingProfile}
                style={{
                  padding: '0.7rem 1.4rem',
                  background: '#6b001a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  letterSpacing: '0.5px',
                  cursor: updatingProfile ? 'not-allowed' : 'pointer'
                }}
              >
                {updatingProfile ? 'Saving…' : 'Save Details'}
              </button>
            </form>
        </div>
      </div>
    </div>
  );
}
