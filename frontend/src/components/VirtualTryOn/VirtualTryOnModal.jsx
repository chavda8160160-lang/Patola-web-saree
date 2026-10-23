import React, { useState, useEffect } from 'react';
import PhotoUploader from './PhotoUploader';
import PhotoPreview from './PhotoPreview';
import TryOnLoader from './TryOnLoader';
import TryOnResult from './TryOnResult';
import TryOnError from './TryOnError';
import LiveAnywearTryOn from './LiveAnywearTryOn';
import AnywearDemoVideo from './AnywearDemoVideo';
import { executeVirtualTryOn } from '../../services/virtualTryOnService';
import {
  trackTryOnOpened,
  trackTryOnPhotoUploaded,
  trackTryOnStarted,
  trackTryOnCompleted,
  trackTryOnFailed,
  trackTryOnAddToCart,
  trackTryOnBuyNow
} from '../../utils/analytics';

/**
 * VirtualTryOnModal
 * Full-featured Royal AI Virtual Try-On Modal for Patola Sarees.
 * Pure Photo Generation pipeline with Replicate IDM-VTON Cloud AI support.
 */
export default function VirtualTryOnModal({
  isOpen,
  onClose,
  saree,
  allSarees = [],
  formatPrice,
  onAddToCart,
  onBuyNow,
  showToast
}) {
  const [selectedSaree, setSelectedSaree] = useState(saree);
  const [activeTab, setActiveTab] = useState('photo'); // 'photo' (No webcam needed) | 'live' | 'demo'
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'generating' | 'result' | 'error'
  const [personImageFile, setPersonImageFile] = useState(null);
  const [personImageUrl, setPersonImageUrl] = useState(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [sareeLooksCache, setSareeLooksCache] = useState({}); // Per-saree 1-photo cache
  const [errorMessage, setErrorMessage] = useState('');
  const [showSareeSelector, setShowSareeSelector] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('vton_api_key') || '' : ''));

  // Sync selected saree when prop changes or modal opens
  useEffect(() => {
    if (saree) {
      setSelectedSaree(saree);
      if (sareeLooksCache[saree.id]) {
        setGeneratedImageUrl(sareeLooksCache[saree.id]);
        setStep('result');
      }
    } else if (allSarees && allSarees.length > 0 && !selectedSaree) {
      setSelectedSaree(allSarees[0]);
    }
  }, [saree, allSarees]);

  // Analytics on modal open
  useEffect(() => {
    if (isOpen && selectedSaree) {
      trackTryOnOpened(selectedSaree);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, selectedSaree]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && step !== 'generating') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, onClose]);

  if (!isOpen) return null;

  // 1. Photo Selected by User
  const handlePhotoSelected = (file) => {
    setPersonImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPersonImageUrl(objectUrl);
    setSareeLooksCache({}); // Fresh photo clears past saree cache
    setStep('preview');
    trackTryOnPhotoUploaded({
      file_name: file.name,
      file_size_kb: Math.round(file.size / 1024),
      file_type: file.type
    });
  };

  // Switch to another Saree (with intelligent caching)
  const handleSwitchSaree = (newSaree) => {
    setSelectedSaree(newSaree);
    setShowSareeSelector(false);

    // If a look was ALREADY generated for this saree with current photo, show it instantly!
    if (sareeLooksCache[newSaree.id]) {
      setGeneratedImageUrl(sareeLooksCache[newSaree.id]);
      setStep('result');
      if (showToast) showToast(`⚡ ${newSaree.title} માટે પહેલેથી બનેલો લુક લોડ થયો!`);
    } else if (personImageUrl) {
      // Allow fresh generation for this new saree
      setGeneratedImageUrl(null);
      setStep('preview');
    }
  };

  // 2. Generate Try-On Look (Enforces 1 photo per saree)
  const handleGenerateLook = async () => {
    if (!selectedSaree || !personImageFile) return;

    // RULE: If already generated for this saree, prevent re-generation and use cached result
    if (sareeLooksCache[selectedSaree.id]) {
      setGeneratedImageUrl(sareeLooksCache[selectedSaree.id]);
      setStep('result');
      if (showToast) showToast('ℹ️ આ સાડી માટે તમારો લુક પહેલેથી જ તૈયાર છે! બીજી સાડી ટ્રાય કરવા "Switch Patola" પસંદ કરો.');
      return;
    }

    setStep('generating');
    trackTryOnStarted(selectedSaree);
    const startTime = Date.now();

    try {
      const response = await executeVirtualTryOn({
        productId: selectedSaree.id,
        personImage: personImageFile,
        drapeStyle: 'classic-gujarati',
        sareeImageOverride: selectedSaree.image || (selectedSaree.images && selectedSaree.images[0]),
        sareeTitle: selectedSaree.title,
        apiKey: apiKeyInput ? apiKeyInput.trim() : null
      });

      const genUrl = response.generatedImageUrl || personImageUrl;
      setGeneratedImageUrl(genUrl);
      // Cache this saree's generated look
      setSareeLooksCache((prev) => ({ ...prev, [selectedSaree.id]: genUrl }));
      setStep('result');

      const elapsed = Date.now() - startTime;
      trackTryOnCompleted(selectedSaree, elapsed);
    } catch (err) {
      console.error('Virtual try-on generation failed:', err);
      const friendlyMsg = err.message || "We couldn't create your preview right now. Please try again.";
      setErrorMessage(friendlyMsg);
      setStep('error');
      trackTryOnFailed(selectedSaree, friendlyMsg);
    }
  };

  // 3. User Actions
  const handleAddToCartWrapper = (sareeItem) => {
    if (onAddToCart) onAddToCart(sareeItem);
    trackTryOnAddToCart(sareeItem);
    if (showToast) showToast(`🛍️ ${sareeItem.title} added to your bag!`);
  };

  const handleBuyNowWrapper = (sareeItem) => {
    trackTryOnBuyNow(sareeItem);
    onClose();
    if (onBuyNow) {
      onBuyNow(sareeItem);
    } else if (onAddToCart) {
      onAddToCart(sareeItem);
    }
  };

  const handleResetPhoto = () => {
    setStep('upload');
    setPersonImageFile(null);
    setPersonImageUrl(null);
    setGeneratedImageUrl(null);
    setSareeLooksCache({}); // Reset cache for new photo
  };

  return (
    <div className="vton-modal-overlay" onClick={step !== 'generating' ? onClose : undefined}>
      <div className="vton-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Bar */}
        <div className="vton-modal-topbar">
          <div className="vton-topbar-brand">
            <span className="vton-brand-icon">✨</span>
            <div>
              <div className="vton-brand-title-row">
                <h2 className="vton-brand-title">Virtual Patola Try-On</h2>
                <span className="vton-brand-live-badge">
                  <span className="vton-live-pulse-green" />
                  AI POWERED
                </span>
              </div>
              <span className="vton-brand-tagline">Upload your photo and see yourself in this authentic Patola</span>
            </div>
          </div>

          <div className="vton-topbar-controls">
            <button
              type="button"
              className="vton-change-saree-btn"
              onClick={() => setShowApiKeyModal(!showApiKeyModal)}
              title="Real AI Settings (Replicate API Token)"
              style={{ background: apiKeyInput ? 'rgba(16, 185, 129, 0.2)' : undefined, borderColor: apiKeyInput ? '#10b981' : undefined }}
            >
              {apiKeyInput ? '🟢 AI Connected' : '🔑 Connect AI Key'}
            </button>

            {step !== 'generating' && allSarees.length > 1 && (
              <button
                type="button"
                className="vton-change-saree-btn"
                onClick={() => setShowSareeSelector(!showSareeSelector)}
                title="Change Patola Saree"
              >
                🥻 Switch Patola
              </button>
            )}

            {step !== 'generating' && (
              <button
                type="button"
                className="vton-close-btn"
                onClick={onClose}
                aria-label="Close Virtual Try-On"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* AI Key Settings Drawer */}
        {showApiKeyModal && (
          <div className="vton-saree-selector-tray" style={{ background: '#1c0a0e', borderBottom: '2px solid #d4af37' }}>
            <div className="vton-selector-title" style={{ color: '#ffd700', fontSize: '0.9rem', marginBottom: '8px' }}>
              <span>⚙️ Real AI Diffusion Try-On Settings (Replicate IDM-VTON)</span>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="vton-close-selector-btn"
              >
                ✕
              </button>
            </div>
            <p style={{ color: '#e5d8c5', fontSize: '0.78rem', margin: '0 0 10px 0', lineHeight: 1.4 }}>
              <strong>Replicate API Token (`r8_...`)</strong> પેસ્ટ કરીને સેવ કરો. જ્યારે કોઈ ગ્રાહક પોતાનો ફોટો અપલોડ કરશે, ત્યારે IDM-VTON AI મોડેલ સાચે જ સાડી પહેરાવીને આપશે:
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="password"
                placeholder="r8_********************************"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid #d4af37',
                  borderRadius: '6px',
                  padding: '7px 12px',
                  color: '#fff',
                  fontSize: '0.82rem'
                }}
              />
              <button
                type="button"
                className="vton-action-btn primary"
                style={{ padding: '7px 16px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('vton_api_key', apiKeyInput.trim());
                  }
                  setShowApiKeyModal(false);
                  if (showToast) showToast('✅ Replicate API Token saved! Real AI will now generate your try-on.');
                }}
              >
                💾 Save Key
              </button>
              {apiKeyInput && (
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: '1px solid #b91c1c',
                    color: '#ef4444',
                    borderRadius: '6px',
                    padding: '7px 10px',
                    cursor: 'pointer',
                    fontSize: '0.76rem'
                  }}
                  onClick={() => {
                    setApiKeyInput('');
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('vton_api_key');
                    }
                    if (showToast) showToast('API Key removed.');
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Optional Saree Selector Drawer / Dropdown */}
        {showSareeSelector && (
          <div className="vton-saree-selector-tray">
            <div className="vton-selector-title">
              <span>Select any Patola from the vault to try on:</span>
              <button
                type="button"
                onClick={() => setShowSareeSelector(false)}
                className="vton-close-selector-btn"
              >
                ✕
              </button>
            </div>
            <div className="vton-saree-thumbnail-scroll">
              {allSarees.map((s) => (
                <div
                  key={s.id}
                  className={`vton-saree-thumb-card ${s.id === selectedSaree?.id ? 'active' : ''}`}
                  onClick={() => handleSwitchSaree(s)}
                >
                  <img src={s.image || '/assets/images/patola_drape.jpg'} alt={s.title} />
                  <span className="vton-thumb-title">{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Try-On Mode Switcher Tabs */}
        <div className="vton-mode-tabs" style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.45)',
          borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
          padding: '6px 16px',
          gap: '8px',
          overflowX: 'auto'
        }}>
          <button
            type="button"
            className={`vton-mode-tab-btn ${activeTab === 'photo' ? 'active' : ''}`}
            onClick={() => setActiveTab('photo')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeTab === 'photo' ? '1px solid #d4af37' : '1px solid transparent',
              background: activeTab === 'photo' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
              color: activeTab === 'photo' ? '#ffd700' : '#cbd5e1',
              fontWeight: activeTab === 'photo' ? '600' : '400',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <span>📸 Photo / Demo Model</span>
            <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.25)', color: '#34d399', padding: '1px 6px', borderRadius: '10px' }}>
              No Cam Needed
            </span>
          </button>

          <button
            type="button"
            className={`vton-mode-tab-btn ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeTab === 'live' ? '1px solid #d4af37' : '1px solid transparent',
              background: activeTab === 'live' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
              color: activeTab === 'live' ? '#ffd700' : '#cbd5e1',
              fontWeight: activeTab === 'live' ? '600' : '400',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <span>📹 Live Anywear Cam</span>
            <span style={{ fontSize: '0.68rem', background: 'rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '1px 6px', borderRadius: '10px' }}>
              Webcam / Mobile
            </span>
          </button>

          <button
            type="button"
            className={`vton-mode-tab-btn ${activeTab === 'demo' ? 'active' : ''}`}
            onClick={() => setActiveTab('demo')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: activeTab === 'demo' ? '1px solid #d4af37' : '1px solid transparent',
              background: activeTab === 'demo' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
              color: activeTab === 'demo' ? '#ffd700' : '#cbd5e1',
              fontWeight: activeTab === 'demo' ? '600' : '400',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <span>🎬 Anywear Demo Reel</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="vton-modal-body">
          {activeTab === 'live' && (
            <LiveAnywearTryOn
              selectedSaree={selectedSaree}
              onSelectSaree={handleSwitchSaree}
              allSarees={allSarees}
              formatPrice={formatPrice}
              onSwitchToUpload={() => setActiveTab('photo')}
              onSwitchToDemo={() => setActiveTab('demo')}
              onCapturePhoto={async (capturedDataUrl) => {
                try {
                  const res = await fetch(capturedDataUrl);
                  const blob = await res.blob();
                  const file = new File([blob], 'live_webcam_snap.jpg', { type: 'image/jpeg' });
                  handlePhotoSelected(file);
                  setActiveTab('photo');
                } catch {
                  setActiveTab('photo');
                }
              }}
            />
          )}

          {activeTab === 'demo' && (
            <AnywearDemoVideo
              onSwitchToLiveCam={() => setActiveTab('live')}
              onSwitchToUpload={() => setActiveTab('photo')}
            />
          )}

          {activeTab === 'photo' && (
            <>
              {step === 'upload' && (
                <PhotoUploader
                  onPhotoSelected={handlePhotoSelected}
                  onError={(msg) => {
                    setErrorMessage(msg);
                    setStep('error');
                  }}
                />
              )}

              {step === 'preview' && (
                <PhotoPreview
                  photoUrl={personImageUrl}
                  saree={selectedSaree}
                  onGenerate={handleGenerateLook}
                  onChangePhoto={handleResetPhoto}
                  formatPrice={formatPrice}
                />
              )}

              {step === 'generating' && (
                <TryOnLoader sareeTitle={selectedSaree?.title} />
              )}

              {step === 'result' && (
                <TryOnResult
                  beforeImage={personImageUrl}
                  generatedImage={generatedImageUrl}
                  saree={selectedSaree}
                  formatPrice={formatPrice}
                  onAddToCart={handleAddToCartWrapper}
                  onBuyNow={handleBuyNowWrapper}
                  onTryAnotherPhoto={handleResetPhoto}
                  onTryAnotherSaree={allSarees.length > 1 ? () => setShowSareeSelector(true) : null}
                  showToast={showToast}
                />
              )}

              {step === 'error' && (
                <TryOnError
                  message={errorMessage}
                  onRetry={handleGenerateLook}
                  onReset={handleResetPhoto}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
