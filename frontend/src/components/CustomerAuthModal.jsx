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
  const [regShowPassword, setRegShowPassword] = useState(false);
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
    <div
      className="modal-backdrop open"
      onClick={onClose}
      style={{
        zIndex: 100000,
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.2rem 0.65rem'
      }}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '445px',
          width: '100%',
          maxHeight: 'min(92vh, 680px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #ffffff 0%, #fdfcf9 100%)',
          borderRadius: '16px',
          border: '1.5px solid rgba(212, 175, 55, 0.6)',
          boxShadow: '0 24px 60px rgba(43, 2, 10, 0.35), 0 0 0 1px rgba(212, 175, 55, 0.25)',
          overflow: 'hidden',
          margin: 'auto',
          padding: '0',
          fontFamily: 'inherit',
          position: 'relative'
        }}
      >
        {/* Royal Classic Heritage Header (Sticky at Top) */}
        <div style={{
          flexShrink: 0,
          background: 'linear-gradient(145deg, #2b020a 0%, #4a0614 60%, #1f0107 100%)',
          padding: '1.2rem 1.4rem 1.1rem',
          color: '#ffffff',
          position: 'relative',
          textAlign: 'center',
          borderBottom: '2px solid #d4af37',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)'
        }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              color: '#d4af37',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              transition: 'all 0.2s'
            }}
          >
            ✕
          </button>

          <span style={{
            display: 'inline-block',
            letterSpacing: '3px',
            fontSize: '0.64rem',
            textTransform: 'uppercase',
            color: '#e5c158',
            fontWeight: 700,
            marginBottom: '0.3rem',
            background: 'rgba(212, 175, 55, 0.12)',
            padding: '0.15rem 0.6rem',
            borderRadius: '20px',
            border: '1px solid rgba(212, 175, 55, 0.3)'
          }}>
            PATOLA • HANDMADE BY VANKAR
          </span>
          <h3 style={{
            margin: 0,
            fontSize: '1.35rem',
            fontFamily: 'var(--font-royal, "Cinzel", "Playfair Display", Georgia, serif)',
            color: '#fffbf2',
            letterSpacing: '0.6px',
            fontWeight: 700,
            textShadow: '0 2px 8px rgba(0,0,0,0.4)'
          }}>
            {mode === 'login' ? 'Patron Sign In' : 'Create Patron Account'}
          </h3>
          <p style={{
            margin: '0.25rem 0 0',
            fontSize: '0.78rem',
            color: '#e8dcbe',
            letterSpacing: '0.3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem'
          }}>
            <span>❖</span> Access your handloom commissions & order tracking <span>❖</span>
          </p>
        </div>

        {/* Royal Classic Tabs (Sticky Below Header) */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          borderBottom: '1.5px solid rgba(212, 175, 55, 0.35)',
          background: '#faf6ee'
        }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(''); }}
            style={{
              flex: 1,
              padding: '0.82rem 1rem',
              border: 'none',
              background: mode === 'login' ? '#ffffff' : 'transparent',
              borderBottom: mode === 'login' ? '3px solid #800020' : '3px solid transparent',
              color: mode === 'login' ? '#650019' : '#786e64',
              fontWeight: mode === 'login' ? 700 : 600,
              fontFamily: 'Cinzel, serif',
              fontSize: '0.9rem',
              letterSpacing: '0.6px',
              cursor: 'pointer',
              transition: 'all 0.25s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <span>🔑</span> Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMessage(''); }}
            style={{
              flex: 1,
              padding: '0.82rem 1rem',
              border: 'none',
              background: mode === 'register' ? '#ffffff' : 'transparent',
              borderBottom: mode === 'register' ? '3px solid #800020' : '3px solid transparent',
              color: mode === 'register' ? '#650019' : '#786e64',
              fontWeight: mode === 'register' ? 700 : 600,
              fontFamily: 'Cinzel, serif',
              fontSize: '0.9rem',
              letterSpacing: '0.6px',
              cursor: 'pointer',
              transition: 'all 0.25s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <span>📜</span> Register
          </button>
        </div>

        {/* Content Body (Fully Scrollable) */}
        <div style={{
          padding: '1.3rem 1.45rem 1.45rem',
          overflowY: 'auto',
          flex: 1,
          WebkitOverflowScrolling: 'touch'
        }}>
          {errorMessage && (
            <div style={{
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '0.7rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              marginBottom: '1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <span>⚠️</span> {errorMessage}
            </div>
          )}

          {successMessage && (
            <div style={{
              background: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              padding: '0.7rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              marginBottom: '1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <span>✓</span> {successMessage}
            </div>
          )}

          {mode === 'login' ? (
            /* CLASSIC LOGIN FORM */
            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#5c0b10', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
                  Mobile Number *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#946e2b', fontWeight: 700, fontSize: '0.88rem' }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit mobile number"
                    style={{
                      width: '100%',
                      padding: '0.72rem 0.85rem 0.72rem 3.4rem',
                      borderRadius: '8px',
                      border: '1.5px solid rgba(212, 175, 55, 0.45)',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                      color: '#2a1a08',
                      background: '#fdfbf7',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.35rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#5c0b10', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
                  Password *
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
                      padding: '0.72rem 3.2rem 0.72rem 0.95rem',
                      borderRadius: '8px',
                      border: '1.5px solid rgba(212, 175, 55, 0.45)',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                      color: '#2a1a08',
                      background: '#fdfbf7',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#946e2b',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}
                  >
                    {showPassword ? 'Hide 👁️' : 'Show 👁️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.92rem',
                  background: 'linear-gradient(135deg, #650019 0%, #800020 50%, #4a0012 100%)',
                  color: '#fffbf2',
                  border: '1.5px solid #d4af37',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontFamily: 'Cinzel, serif',
                  fontSize: '0.96rem',
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 20px rgba(107, 0, 26, 0.32), 0 2px 6px rgba(212, 175, 55, 0.25)',
                  transition: 'all 0.25s ease'
                }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

              <div style={{
                marginTop: '1.15rem',
                padding: '0.55rem',
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px dashed rgba(212, 175, 55, 0.35)',
                borderRadius: '6px',
                fontSize: '0.72rem',
                color: '#8c7355',
                textAlign: 'center',
                fontWeight: 600
              }}>
                🔒 Secure session: Encrypted login session
              </div>

              <div style={{ marginTop: '1.15rem', textAlign: 'center', fontSize: '0.84rem', color: '#666', borderTop: '1px solid #f0eae1', paddingTop: '1rem' }}>
                New patron?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMessage(''); }}
                  style={{ background: 'none', border: 'none', color: '#6b001a', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Create an account →
                </button>
              </div>
            </form>
          ) : (
            /* CLASSIC REGISTER FORM */
            <form onSubmit={handleRegisterSubmit}>
              <div style={{ marginBottom: '0.95rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#5c0b10', marginBottom: '0.38rem', letterSpacing: '0.02em' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Enter your full name"
                  style={{
                    width: '100%',
                    padding: '0.72rem 0.95rem',
                    borderRadius: '8px',
                    border: '1.5px solid rgba(212, 175, 55, 0.45)',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    color: '#2a1a08',
                    background: '#fdfbf7',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                />
              </div>

              <div style={{ marginBottom: '0.95rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#5c0b10', marginBottom: '0.38rem', letterSpacing: '0.02em' }}>
                  Mobile Number *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#946e2b', fontWeight: 700, fontSize: '0.88rem' }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit mobile number"
                    style={{
                      width: '100%',
                      padding: '0.72rem 0.85rem 0.72rem 3.4rem',
                      borderRadius: '8px',
                      border: '1.5px solid rgba(212, 175, 55, 0.45)',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                      color: '#2a1a08',
                      background: '#fdfbf7',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.95rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#5c0b10', marginBottom: '0.38rem', letterSpacing: '0.02em' }}>
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={regShowPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create 4+ character password"
                    style={{
                      width: '100%',
                      padding: '0.72rem 3.2rem 0.72rem 0.95rem',
                      borderRadius: '8px',
                      border: '1.5px solid rgba(212, 175, 55, 0.45)',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                      color: '#2a1a08',
                      background: '#fdfbf7',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setRegShowPassword(!regShowPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#946e2b',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}
                  >
                    {regShowPassword ? 'Hide 👁️' : 'Show 👁️'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.95rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#5c0b10', marginBottom: '0.38rem', letterSpacing: '0.02em' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="e.g. Ahmedabad"
                    style={{
                      width: '100%',
                      padding: '0.72rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid rgba(212, 175, 55, 0.45)',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                      color: '#2a1a08',
                      background: '#fdfbf7',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#5c0b10', marginBottom: '0.38rem', letterSpacing: '0.02em' }}>
                    PIN Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={regPincode}
                    onChange={(e) => setRegPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit PIN code"
                    style={{
                      width: '100%',
                      padding: '0.72rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid rgba(212, 175, 55, 0.45)',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                      color: '#2a1a08',
                      background: '#fdfbf7',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.3rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#5c0b10', marginBottom: '0.38rem', letterSpacing: '0.02em' }}>
                  Delivery Address (Optional)
                </label>
                <textarea
                  rows={2}
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="Flat / House No, Street name, Landmark, Area"
                  style={{
                    width: '100%',
                    padding: '0.72rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid rgba(212, 175, 55, 0.45)',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    color: '#2a1a08',
                    background: '#fdfbf7',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.92rem',
                  background: 'linear-gradient(135deg, #650019 0%, #800020 50%, #4a0012 100%)',
                  color: '#fffbf2',
                  border: '1.5px solid #d4af37',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontFamily: 'Cinzel, serif',
                  fontSize: '0.96rem',
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 20px rgba(107, 0, 26, 0.32), 0 2px 6px rgba(212, 175, 55, 0.25)',
                  transition: 'all 0.25s ease'
                }}
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>

              <div style={{
                marginTop: '1.15rem',
                padding: '0.55rem',
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px dashed rgba(212, 175, 55, 0.35)',
                borderRadius: '6px',
                fontSize: '0.72rem',
                color: '#8c7355',
                textAlign: 'center',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}>
                <span>🔒</span> 100% Encrypted Patron Portal • Handloom Weaver Heritage
              </div>

              <div style={{ marginTop: '1.15rem', textAlign: 'center', fontSize: '0.84rem', color: '#666', borderTop: '1px solid #f0eae1', paddingTop: '1rem' }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMessage(''); }}
                  style={{ background: 'none', border: 'none', color: '#6b001a', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Sign In →
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
