import React, { useState } from 'react';
import { ApiService } from '../services/api';

export default function CustomerAuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  onOpenRegister = false
}) {
  const [mode, setMode] = useState(onOpenRegister ? 'register' : 'login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regState, setRegState] = useState('Gujarat');
  const [regPincode, setRegPincode] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanPhone = loginPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiService.customerLogin(cleanPhone, loginPassword);
      if (res && res.success) {
        setSuccessMessage(res.message || 'Signed in successfully.');
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(res.customer);
          onClose();
        }, 500);
      } else {
        setErrorMessage(res.message || 'Invalid mobile number or password.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanPhone = regPhone.replace(/\D/g, '');
    if (!regName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customerName: regName.trim(),
        phoneNumber: cleanPhone,
        password: regPassword,
        email: regEmail.trim() || null,
        deliveryAddress: regAddress.trim() || null,
        city: regCity.trim() || null,
        state: regState.trim() || null,
        postalCode: regPincode.trim() || null
      };

      const res = await ApiService.customerRegister(payload);
      if (res && res.success) {
        setSuccessMessage('Account registered successfully. Welcome to Virasat Patola.');
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(res.customer);
          onClose();
        }, 600);
      } else {
        setErrorMessage(res.message || 'Registration failed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Mobile number may already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop open" onClick={onClose} style={{ zIndex: 100000 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '430px',
          width: '92%',
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #d4af37',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.22)',
          overflow: 'hidden',
          padding: '0',
          fontFamily: 'inherit'
        }}
      >
        {/* Classic Heritage Header */}
        <div style={{
          background: '#2b020a',
          padding: '1.4rem 1.6rem 1.3rem',
          color: '#ffffff',
          position: 'relative',
          textAlign: 'center',
          borderBottom: '1px solid #c5a059'
        }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '12px',
              right: '14px',
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

          <span style={{
            display: 'inline-block',
            letterSpacing: '3px',
            fontSize: '0.68rem',
            textTransform: 'uppercase',
            color: '#d4af37',
            fontWeight: 600,
            marginBottom: '0.35rem'
          }}>
           PATOLA MADE VANKAR
          </span>
          <h3 style={{
            margin: 0,
            fontSize: '1.3rem',
            fontFamily: 'var(--font-serif, "Cinzel", "Playfair Display", Georgia, serif)',
            color: '#fdfbf7',
            letterSpacing: '0.5px',
            fontWeight: 500
          }}>
            {mode === 'login' ? 'Patron Sign In' : 'Create Patron Account'}
          </h3>
          <p style={{
            margin: '0.3rem 0 0',
            fontSize: '0.78rem',
            color: '#e5d7ba',
            letterSpacing: '0.3px'
          }}>
            Access your handloom commissions and order tracking
          </p>
        </div>

        {/* Classic Underline Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e8e2d5',
          background: '#faf8f5'
        }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(''); }}
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              border: 'none',
              background: mode === 'login' ? '#ffffff' : 'transparent',
              borderBottom: mode === 'login' ? '2.5px solid #6b001a' : 'none',
              color: mode === 'login' ? '#6b001a' : '#736d65',
              fontWeight: mode === 'login' ? 700 : 500,
              fontSize: '0.88rem',
              letterSpacing: '0.4px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMessage(''); }}
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              border: 'none',
              background: mode === 'register' ? '#ffffff' : 'transparent',
              borderBottom: mode === 'register' ? '2.5px solid #6b001a' : 'none',
              color: mode === 'register' ? '#6b001a' : '#736d65',
              fontWeight: mode === 'register' ? 700 : 500,
              fontSize: '0.88rem',
              letterSpacing: '0.4px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Register
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.4rem 1.6rem 1.6rem' }}>
          {errorMessage && (
            <div style={{
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              marginBottom: '1.1rem'
            }}>
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div style={{
              background: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              marginBottom: '1.1rem'
            }}>
              {successMessage}
            </div>
          )}

          {mode === 'login' ? (
            /* CLASSIC LOGIN FORM */
            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#2a2421', marginBottom: '0.35rem', letterSpacing: '0.2px' }}>
                  Mobile Number
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontWeight: 500, fontSize: '0.88rem' }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="ENTER PHONE NUMBER"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem 0.7rem 3.2rem',
                      borderRadius: '6px',
                      border: '1px solid #c9c0b1',
                      fontSize: '0.92rem',
                      boxSizing: 'border-box',
                      color: '#1f1a17',
                      outlineColor: '#6b001a'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#2a2421', marginBottom: '0.35rem', letterSpacing: '0.2px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '0.7rem 2.6rem 0.7rem 0.85rem',
                      borderRadius: '6px',
                      border: '1px solid #c9c0b1',
                      fontSize: '0.92rem',
                      boxSizing: 'border-box',
                      color: '#1f1a17',
                      outlineColor: '#6b001a'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#736d65',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 600
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  background: '#6b001a',
                  color: '#ffffff',
                  border: '1px solid #500014',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(107, 0, 26, 0.25)',
                  transition: 'background 0.2s'
                }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

              <div style={{ marginTop: '0.9rem', fontSize: '0.76rem', color: '#888', textAlign: 'center' }}>
                Secure session: Automatically logs out when the browser is closed.
              </div>

              <div style={{ marginTop: '1.1rem', textAlign: 'center', fontSize: '0.82rem', color: '#666', borderTop: '1px solid #f0eae1', paddingTop: '0.9rem' }}>
                New patron?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMessage(''); }}
                  style={{ background: 'none', border: 'none', color: '#6b001a', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Create an account
                </button>
              </div>
            </form>
          ) : (
            /* CLASSIC REGISTER FORM */
            <form onSubmit={handleRegisterSubmit}>
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#2a2421', marginBottom: '0.3rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="ENTER FULL NAME"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid #c9c0b1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    outlineColor: '#6b001a'
                  }}
                />
              </div>

              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#2a2421', marginBottom: '0.3rem' }}>
                  Mobile Number *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontWeight: 500, fontSize: '0.88rem' }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="ENTER PHONE NUMBER"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.8rem 0.65rem 3.2rem',
                      borderRadius: '6px',
                      border: '1px solid #c9c0b1',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                      outlineColor: '#6b001a'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#2a2421', marginBottom: '0.3rem' }}>
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create 4+ character password"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid #c9c0b1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    outlineColor: '#6b001a'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem', marginBottom: '0.9rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#2a2421', marginBottom: '0.3rem' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="ENTER CITY"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #c9c0b1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                      outlineColor: '#6b001a'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#2a2421', marginBottom: '0.3rem' }}>
                    PIN Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={regPincode}
                    onChange={(e) => setRegPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="ENTER PIN CODE"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #c9c0b1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                      outlineColor: '#6b001a'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', color: '#2a2421', marginBottom: '0.3rem' }}>
                  Delivery Address (Optional)
                </label>
                <textarea
                  rows={2}
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="Street, House No, Landmark"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #c9c0b1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    outlineColor: '#6b001a'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  background: '#6b001a',
                  color: '#ffffff',
                  border: '1px solid #500014',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(107, 0, 26, 0.25)',
                  transition: 'background 0.2s'
                }}
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>

              <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.82rem', color: '#666', borderTop: '1px solid #f0eae1', paddingTop: '0.9rem' }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMessage(''); }}
                  style={{ background: 'none', border: 'none', color: '#6b001a', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
