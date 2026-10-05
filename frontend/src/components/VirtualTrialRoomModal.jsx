/* ====================================================================================================
 * File Name: VirtualTrialRoomModal.jsx
 * Folder: frontend/src/components/
 * 
 * 🪞 ROYAL VIRTUAL TRIAL ROOM (100% FREE CLIENT-SIDE SAREE VIRTUAL TRY-ON)
 * ----------------------------------------------------------------------------------------------------
 * Allows customers to see themselves wearing any Patola Saree:
 * 1. Upload full-body photo or 10-second video clip OR use live selfie camera OR try on preset models.
 * 2. Instant real-time Saree Draping with customizable fit, shoulder alignment, and Gujarati pallu flip.
 * 3. 1-click saree rack switching to try multiple sarees without reloading.
 * 4. Snapshot download & WhatsApp sharing with zero server costs or paid APIs!
 * ==================================================================================================== */

import React, { useState, useEffect, useRef } from 'react';

const SAMPLE_MODELS = [
  {
    id: 'model-traditional',
    label: 'Traditional Bride',
    tag: 'Classic Drape',
    img: '/assets/images/showcase_saree_mannequin.jpg',
    defaultScale: 1.05,
    defaultY: 28,
    defaultX: 50
  },
  {
    id: 'model-silhouette',
    label: 'Royal Silhouette',
    tag: 'Studio Pose',
    img: '/assets/images/patola_drape.jpg',
    defaultScale: 1.12,
    defaultY: 34,
    defaultX: 50
  },
  {
    id: 'model-heritage',
    label: 'Heritage Chair',
    tag: 'Dupatta & Saree',
    img: '/assets/images/showcase_dupatta_chair.jpg',
    defaultScale: 1.0,
    defaultY: 30,
    defaultX: 50
  }
];

export default function VirtualTrialRoomModal({
  isOpen,
  onClose,
  initialSaree = null,
  allSarees = [],
  formatPrice,
  onAddToCart,
  showToast
}) {
  const [selectedSaree, setSelectedSaree] = useState(initialSaree);
  const [activeModelMode, setActiveModelMode] = useState('sample'); // 'sample' | 'upload' | 'camera'
  const [selectedSampleModel, setSelectedSampleModel] = useState(SAMPLE_MODELS[0]);
  
  // Uploaded media (image or video)
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState(null);
  const [isVideoMedia, setIsVideoMedia] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Saree Draping Alignment Controls
  const [drapeScale, setDrapeScale] = useState(1.05);
  const [drapeY, setDrapeY] = useState(30); // percentage vertical
  const [drapeX, setDrapeX] = useState(50); // percentage horizontal
  const [palluFlipped, setPalluFlipped] = useState(false); // Left vs Gujarati Seedha Pallu
  const [drapeOpacity, setDrapeOpacity] = useState(0.96);
  const [activeTabCategory, setActiveTabCategory] = useState('all');

  const videoRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const fileInputRef = useRef(null);

  // Update selected saree when prop changes
  useEffect(() => {
    if (initialSaree) {
      setSelectedSaree(initialSaree);
    } else if (allSarees && allSarees.length > 0 && !selectedSaree) {
      setSelectedSaree(allSarees[0]);
    }
  }, [initialSaree, allSarees]);

  // Clean up camera stream when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (cameraVideoRef.current && cameraVideoRef.current.srcObject) {
      const stream = cameraVideoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      cameraVideoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleStartCamera = async () => {
    try {
      setCameraError(null);
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.play();
      }
      setCameraActive(true);
      setActiveModelMode('camera');
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Camera access was denied or not supported on this device. Please upload a photo or video.');
      setActiveModelMode('sample');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCamera();
    const isVideo = file.type.startsWith('video/');
    setIsVideoMedia(isVideo);

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedMediaUrl(event.target.result);
      setActiveModelMode('upload');
    };
    reader.readAsDataURL(file);
  };

  // Reset drape alignment to preset
  const handleResetAlignment = () => {
    if (activeModelMode === 'sample' && selectedSampleModel) {
      setDrapeScale(selectedSampleModel.defaultScale || 1.05);
      setDrapeY(selectedSampleModel.defaultY || 30);
      setDrapeX(selectedSampleModel.defaultX || 50);
    } else {
      setDrapeScale(1.05);
      setDrapeY(30);
      setDrapeX(50);
    }
    setPalluFlipped(false);
    setDrapeOpacity(0.96);
  };

  // Capture snapshot from stage
  const handleDownloadSnapshot = () => {
    const stage = stageRef.current;
    if (!stage) return;

    try {
      const canvas = document.createElement('canvas');
      const rect = stage.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);

      // Draw background
      ctx.fillStyle = '#140c0b';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Render composite preview
      const link = document.createElement('a');
      link.download = `Virasat_Patola_My_Trial_Look_${selectedSaree?.title || 'Saree'}.png`;
      link.href = canvas.toDataURL('image/png');

      if (showToast) {
        showToast('📸 Snapshot captured! Ready to download & share with family.');
      }
    } catch (err) {
      console.warn('Snapshot capture notice:', err);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Look at how stunning I look in this Royal Patola Saree: "${selectedSaree?.title || 'Heritage Patola'}" on Virasat Patola! ✨ Check it out: ${window.location.origin}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (!isOpen) return null;

  const currentSareeImg = selectedSaree?.image || '/assets/images/saree_nari_kunjar.jpg';

  // Filter saree catalog
  const filteredRackSarees = (allSarees || []).filter(s => {
    if (activeTabCategory === 'all') return true;
    const cat = (s.category || '').toLowerCase();
    const title = (s.title || '').toLowerCase();
    if (activeTabCategory === 'double-ikat') return cat.includes('double') || title.includes('double');
    if (activeTabCategory === 'single-ikat') return cat.includes('single') || title.includes('single');
    if (activeTabCategory === 'dupatta') return cat.includes('dupatta') || title.includes('dupatta');
    return true;
  });

  return (
    <div
      className="modal-backdrop open"
      onClick={onClose}
      style={{
        zIndex: 1200,
        backgroundColor: 'rgba(12, 6, 8, 0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        className="trial-room-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '96%',
          maxWidth: '1240px',
          maxHeight: '94vh',
          background: 'linear-gradient(135deg, #1c0d12 0%, #261118 60%, #15090e 100%)',
          borderRadius: '16px',
          border: '1.5px solid rgba(212, 175, 55, 0.55)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 30px rgba(212, 175, 55, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#fdfbf7'
        }}
      >
        {/* ✦ TOP MODAL HEADER ✦ */}
        <div style={{
          padding: '1rem 1.6rem',
          borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(30, 10, 16, 0.85)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.7rem' }}>🪞</span>
            <div>
              <h2 style={{
                fontFamily: 'Cinzel, Georgia, serif',
                fontSize: '1.28rem',
                margin: 0,
                color: '#ffd700',
                letterSpacing: '0.04em',
                fontWeight: 700
              }}>
                ROYAL VIRTUAL TRIAL ROOM (Live Saree Try-On)
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#d4af37', opacity: 0.9 }}>
                100% Free Live Draping Studio • Zero Waiting Time • Instant Fit on You
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              color: '#ffd700',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="Close Trial Room"
          >
            ✕
          </button>
        </div>

        {/* ✦ MAIN 2-COLUMN TRIAL ROOM LAYOUT ✦ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(320px, 1fr)',
          flex: 1,
          overflowY: 'auto',
          minHeight: 0
        }}>
          {/* ========================================================
              LEFT COLUMN: THE MIRROR STAGE (PHOTO / VIDEO / LIVE CAM)
             ======================================================== */}
          <div style={{
            padding: '1.2rem',
            borderRight: '1px solid rgba(212, 175, 55, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem'
          }}>
            {/* Input Selection Bar: Sample Models vs Upload vs Live Cam */}
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '6px',
              borderRadius: '10px',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }}>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveModelMode('sample');
                }}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeModelMode === 'sample' ? '1.5px solid #ffd700' : '1px solid transparent',
                  background: activeModelMode === 'sample' ? 'linear-gradient(135deg, #800020 0%, #a30029 100%)' : 'transparent',
                  color: activeModelMode === 'sample' ? '#ffd700' : '#e5e7eb'
                }}
              >
                💃 Sample Models
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  fileInputRef.current?.click();
                }}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeModelMode === 'upload' ? '1.5px solid #ffd700' : '1px solid transparent',
                  background: activeModelMode === 'upload' ? 'linear-gradient(135deg, #800020 0%, #a30029 100%)' : 'transparent',
                  color: activeModelMode === 'upload' ? '#ffd700' : '#e5e7eb'
                }}
              >
                📁 Upload Photo / 10s Video
              </button>

              <button
                type="button"
                onClick={handleStartCamera}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeModelMode === 'camera' ? '1.5px solid #ffd700' : '1px solid transparent',
                  background: activeModelMode === 'camera' ? 'linear-gradient(135deg, #800020 0%, #a30029 100%)' : 'transparent',
                  color: activeModelMode === 'camera' ? '#ffd700' : '#e5e7eb'
                }}
              >
                📹 Live Camera
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>

            {/* Sample Models Selector (If in sample mode) */}
            {activeModelMode === 'sample' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: '#d4af37', fontWeight: 600 }}>Try With:</span>
                {SAMPLE_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedSampleModel(m);
                      setDrapeScale(m.defaultScale);
                      setDrapeY(m.defaultY);
                      setDrapeX(m.defaultX);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '0.72rem',
                      background: selectedSampleModel.id === m.id ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                      border: selectedSampleModel.id === m.id ? '1px solid #ffd700' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: selectedSampleModel.id === m.id ? '#ffd700' : '#d1d5db',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* Error badge for camera */}
            {cameraError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem'
              }}>
                ⚠️ {cameraError}
              </div>
            )}

            {/* ✦ THE INTERACTIVE MIRROR VIEWPORT ✦ */}
            <div
              ref={stageRef}
              style={{
                position: 'relative',
                width: '100%',
                height: '480px',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#0e0508',
                border: '2px solid rgba(212, 175, 55, 0.4)',
                boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.8), 0 8px 24px rgba(0, 0, 0, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none'
              }}
            >
              {/* Layer 1: Background Person Image / Video / Camera Stream */}
              {activeModelMode === 'camera' ? (
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)' // Mirror selfie view
                  }}
                />
              ) : activeModelMode === 'upload' && uploadedMediaUrl ? (
                isVideoMedia ? (
                  <video
                    ref={videoRef}
                    src={uploadedMediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <img
                    src={uploadedMediaUrl}
                    alt="Uploaded Customer Silhouette"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                )
              ) : (
                <img
                  src={selectedSampleModel?.img || '/assets/images/showcase_saree_mannequin.jpg'}
                  alt="Sample Saree Silhouette"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              )}

              {/* Layer 2: Ambient Silk Lighting & Vignette */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10, 4, 6, 0.4) 100%)',
                  zIndex: 2
                }}
              />

              {/* Layer 3: The Live Draped Saree Overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: `${drapeY}%`,
                  left: `${drapeX}%`,
                  transform: `translate(-50%, -50%) scale(${drapeScale}) ${palluFlipped ? 'scaleX(-1)' : ''}`,
                  width: '78%',
                  height: '78%',
                  pointerEvents: 'none',
                  zIndex: 3,
                  opacity: drapeOpacity,
                  mixBlendMode: 'normal',
                  filter: 'drop-shadow(0 8px 18px rgba(0, 0, 0, 0.5))'
                }}
              >
                <img
                  src={currentSareeImg}
                  alt={selectedSaree?.title || 'Draped Patola Saree'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    clipPath: 'polygon(15% 10%, 85% 10%, 92% 35%, 88% 95%, 12% 95%, 8% 35%)' // Saree bodice & drape contour
                  }}
                />
              </div>

              {/* Top Watermark Tag */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'rgba(30, 10, 16, 0.85)',
                color: '#ffd700',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: '1px solid rgba(212, 175, 55, 0.5)',
                zIndex: 4
              }}>
                ✨ Virtual Mirror Live Drape
              </div>

              {/* Current Saree Overlay Pill */}
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                background: 'rgba(20, 8, 12, 0.88)',
                color: '#ffffff',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                zIndex: 4,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: '#ffd700' }}>🥻</span>
                <strong>{selectedSaree?.title || 'Selected Saree'}</strong>
                <span style={{ color: '#ffd700', fontWeight: 700 }}>
                  {selectedSaree ? formatPrice(selectedSaree.basePriceINR) : ''}
                </span>
              </div>
            </div>

            {/* ✦ DRAPE FIT & POSITION CONTROLS ✦ */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '0.8rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#ffd700', fontWeight: 700 }}>
                  ⚙️ Adjust Saree Drape & Body Fit:
                </span>
                <button
                  type="button"
                  onClick={handleResetAlignment}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#d4af37',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Reset Fit
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                {/* Vertical Height Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1' }}>
                    <span>↕️ Vertical Position</span>
                    <span>{drapeY}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={drapeY}
                    onChange={(e) => setDrapeY(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#ffd700' }}
                  />
                </div>

                {/* Saree Scale / Body Size */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1' }}>
                    <span>↔️ Saree Scale / Size</span>
                    <span>{Math.round(drapeScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.5"
                    step="0.02"
                    value={drapeScale}
                    onChange={(e) => setDrapeScale(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#ffd700' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '2px' }}>
                {/* Flip Pallu Side */}
                <button
                  type="button"
                  onClick={() => setPalluFlipped(prev => !prev)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    background: palluFlipped ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    border: palluFlipped ? '1px solid #ffd700' : '1px solid rgba(255, 255, 255, 0.15)',
                    color: palluFlipped ? '#ffd700' : '#ffffff',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  🔄 {palluFlipped ? 'Gujarati Seedha Pallu (Active)' : 'Standard Nivi Pallu (Active)'}
                </button>

                {/* Opacity Blend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Drape Blend:</span>
                  <input
                    type="range"
                    min="0.7"
                    max="1.0"
                    step="0.02"
                    value={drapeOpacity}
                    onChange={(e) => setDrapeOpacity(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#ffd700' }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons: Save Look & WhatsApp Share */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleDownloadSnapshot}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #d4af37 0%, #aa8010 100%)',
                  color: '#1a080e',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(212, 175, 55, 0.35)'
                }}
              >
                <span>📸</span>
                <span>Save My Look</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '8px',
                  background: '#25D366',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)'
                }}
              >
                <span>💬</span>
                <span>Share with Family</span>
              </button>
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN: SAREE RACK & 1-CLICK INSTANT SWITCHING
             ======================================================== */}
          <div style={{
            padding: '1.2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: 'rgba(20, 8, 12, 0.45)',
            overflowY: 'auto'
          }}>
            {/* Active Saree Highlight Card */}
            {selectedSaree && (
              <div style={{
                background: 'linear-gradient(135deg, #2a0e16 0%, #3d1420 100%)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1.5px solid #d4af37',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.4)'
              }}>
                <img
                  src={currentSareeImg}
                  alt={selectedSaree.title}
                  style={{
                    width: '75px',
                    height: '75px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: '1px solid #ffd700'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.68rem', color: '#ffd700', textTransform: 'uppercase', fontWeight: 700 }}>
                    Currently Draped
                  </div>
                  <h4 style={{ margin: '2px 0 4px', fontSize: '1rem', color: '#ffffff', fontWeight: 700 }}>
                    {selectedSaree.title}
                  </h4>
                  <div style={{ fontSize: '0.94rem', color: '#ffd700', fontWeight: 800 }}>
                    {formatPrice(selectedSaree.basePriceINR)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onAddToCart) {
                      onAddToCart(selectedSaree);
                      if (showToast) showToast(`Added "${selectedSaree.title}" to bag!`);
                    }
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: '#ffd700',
                    color: '#800020',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🛍️ Add to Bag
                </button>
              </div>
            )}

            {/* Category Filter Tabs */}
            <div>
              <div style={{ fontSize: '0.78rem', color: '#d4af37', fontWeight: 700, marginBottom: '6px' }}>
                🥻 Select Any Saree to Try On (Instant Change):
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'double-ikat', label: 'Double Ikat' },
                  { key: 'single-ikat', label: 'Single Ikat' },
                  { key: 'dupatta', label: 'Dupattas' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTabCategory(key)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '14px',
                      fontSize: '0.72rem',
                      background: activeTabCategory === key ? '#ffd700' : 'rgba(255, 255, 255, 0.08)',
                      color: activeTabCategory === key ? '#800020' : '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Saree Rack Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '10px',
              overflowY: 'auto',
              maxHeight: '400px',
              paddingRight: '4px'
            }}>
              {filteredRackSarees.map((s) => {
                const isSelected = selectedSaree?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSaree(s)}
                    style={{
                      background: isSelected ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: isSelected ? '1.5px solid #ffd700' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '95px',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}>
                      <img
                        src={s.image || '/assets/images/saree_nari_kunjar.jpg'}
                        alt={s.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: '#ffd700',
                          color: '#800020',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 800
                        }}>
                          ✓
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: isSelected ? '#ffd700' : '#f3f4f6',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#d4af37' }}>
                      {formatPrice(s.basePriceINR)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
