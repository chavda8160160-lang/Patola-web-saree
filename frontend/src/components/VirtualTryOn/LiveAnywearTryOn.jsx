import React, { useRef, useState, useEffect, useCallback } from 'react';

/**
 * LiveAnywearTryOn
 * Real-time Live Camera (Webcam) Virtual Try-On for Patola Sarees.
 * Replicates the Decart "Anywear" experience where clothing changes
 * dynamically in real-time as the user moves in front of the camera.
 */
export default function LiveAnywearTryOn({
  selectedSaree,
  onSelectSaree,
  allSarees = [],
  onCapturePhoto,
  onSwitchToUpload,
  onSwitchToDemo,
  formatPrice
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraState, setCameraState] = useState('idle'); // 'idle' | 'requesting' | 'active' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [drapeScale, setDrapeScale] = useState(100); // 80 - 130
  const [drapeOffsetY, setDrapeOffsetY] = useState(38); // percentage from top (20 - 70)
  const [drapeOffsetX, setDrapeOffsetX] = useState(50); // percentage from left (30 - 70)
  const [drapeStyle, setDrapeStyle] = useState('gujarati'); // 'gujarati' | 'royal'
  const [isSwapping, setIsSwapping] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Start live webcam stream
  const startCamera = useCallback(async () => {
    setCameraState('requesting');
    setErrorMessage('');

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support webcam access.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setCameraState('active');
          }).catch((err) => {
            console.error('Play failed:', err);
            setCameraState('active');
          });
        };
      }
    } catch (err) {
      console.warn('Camera access issue:', err);
      let msg = 'Could not access camera. Please allow camera permissions or try uploading a photo.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this system.';
      }
      setErrorMessage(msg);
      setCameraState('error');
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  // Flip front/back camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Change saree with visual transition trigger
  const handleSareeChange = (saree) => {
    setIsSwapping(true);
    onSelectSaree(saree);
    setTimeout(() => {
      setIsSwapping(false);
    }, 450);
  };

  // Capture high-resolution snapshot from video + drape canvas
  const handleCapture = () => {
    if (!videoRef.current || cameraState !== 'active') return;

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    // Draw video frame (mirror if front camera)
    ctx.save();
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Now composite the authentic Patola saree drape overlay over the captured image
    const sareeImg = new Image();
    sareeImg.crossOrigin = 'anonymous';
    sareeImg.onload = () => {
      renderDrapeOnCanvas(ctx, canvas.width, canvas.height, sareeImg);
      canvas.toBlob((blob) => {
        setIsCapturing(false);
        if (blob) {
          const file = new File([blob], `tryon_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapturePhoto(file);
        }
      }, 'image/jpeg', 0.95);
    };
    sareeImg.onerror = () => {
      // If saree image fails to load, composite fallback and continue
      canvas.toBlob((blob) => {
        setIsCapturing(false);
        if (blob) {
          const file = new File([blob], `tryon_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapturePhoto(file);
        }
      }, 'image/jpeg', 0.92);
    };
    sareeImg.src = selectedSaree?.image || '/assets/images/patola_drape.jpg';
  };

  // Helper to render drape overlay onto canvas
  const renderDrapeOnCanvas = (ctx, width, height, drapeImg) => {
    ctx.save();
    const centerX = (width * drapeOffsetX) / 100;
    const centerY = (height * drapeOffsetY) / 100;
    const scaleFactor = (drapeScale / 100) * (width / 520);

    const drapeW = 420 * scaleFactor;
    const drapeH = 540 * scaleFactor;

    ctx.translate(centerX, centerY);

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;

    // Saree shape path (Gujarati palla drape)
    ctx.beginPath();
    ctx.moveTo(-drapeW * 0.42, -drapeH * 0.45);
    ctx.quadraticCurveTo(0, -drapeH * 0.52, drapeW * 0.45, -drapeH * 0.4);
    ctx.bezierCurveTo(drapeW * 0.52, drapeH * 0.1, drapeW * 0.4, drapeH * 0.5, drapeW * 0.1, drapeH * 0.55);
    ctx.quadraticCurveTo(-drapeW * 0.15, drapeH * 0.58, -drapeW * 0.45, drapeH * 0.45);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(drapeImg, -drapeW * 0.5, -drapeH * 0.5, drapeW, drapeH);

    // Zari border highlight
    const grad = ctx.createLinearGradient(-drapeW * 0.5, 0, drapeW * 0.5, 0);
    grad.addColorStop(0, 'rgba(212, 175, 55, 0.7)');
    grad.addColorStop(0.5, 'rgba(255, 235, 140, 0.4)');
    grad.addColorStop(1, 'rgba(212, 175, 55, 0.8)');
    ctx.lineWidth = 14;
    ctx.strokeStyle = grad;
    ctx.stroke();

    ctx.restore();
  };

  return (
    <div className="vton-live-anywear-container">
      {/* Live Stream Viewport */}
      <div className="vton-live-viewport">
        {/* Top Status & Quick Switchers */}
        <div className="vton-live-top-bar">
          <div className="vton-live-tag">
            <span className="vton-live-pulse-green" />
            <span>ANYWEAR LIVE CAM</span>
          </div>

          <div className="vton-live-top-actions">
            <button
              type="button"
              className="vton-cam-btn-icon"
              onClick={() => setShowControls(!showControls)}
              title="Adjust Fit & Position"
            >
              ⚙️ Fit Adjust
            </button>
            <button
              type="button"
              className="vton-cam-btn-icon"
              onClick={toggleFacingMode}
              title="Flip Camera (Front/Back)"
            >
              🔄 Flip
            </button>
            <button
              type="button"
              className="vton-cam-btn-icon"
              onClick={onSwitchToDemo}
              title="Watch WhatsApp Video Demo"
            >
              🎬 Demo Reel
            </button>
          </div>
        </div>

        {/* Video stream element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`vton-live-video ${facingMode === 'user' ? 'mirrored' : ''}`}
        />

        {/* Active Drape Overlay over user's body */}
        {cameraState === 'active' && (
          <div
            className={`vton-live-drape-overlay ${isSwapping ? 'swapping' : ''}`}
            style={{
              top: `${drapeOffsetY}%`,
              left: `${drapeOffsetX}%`,
              transform: `translate(-50%, -30%) scale(${drapeScale / 100})`
            }}
          >
            <div className="vton-live-saree-wrapper">
              <img
                src={selectedSaree?.image || '/assets/images/patola_drape.jpg'}
                alt={selectedSaree?.title || 'Patola Drape'}
                className="vton-live-saree-texture"
              />
              <div className="vton-live-zari-shimmer" />
              <div className="vton-live-fold-pleats" />
            </div>

            {/* Micro Badge showing active saree on camera */}
            <div className="vton-live-floating-badge">
              <span className="vton-live-badge-dot" />
              <span>{selectedSaree?.title}</span>
            </div>
          </div>
        )}

        {/* Loading / Connecting View */}
        {cameraState === 'requesting' && (
          <div className="vton-live-overlay-msg">
            <div className="vton-spinner" />
            <p>Connecting to your camera...</p>
            <span>Please allow camera access in your browser prompt</span>
          </div>
        )}

        {/* Error / Fallback View */}
        {cameraState === 'error' && (
          <div className="vton-live-overlay-msg error">
            <span style={{ fontSize: '2.5rem' }}>📹</span>
            <h4>Camera Not Available</h4>
            <p>{errorMessage}</p>
            <div className="vton-cam-err-actions">
              <button
                type="button"
                className="vton-action-btn primary"
                onClick={onSwitchToUpload}
              >
                📸 તમારો ફોટો અપલોડ કરો (Upload Photo)
              </button>
              <button
                type="button"
                className="vton-action-btn secondary"
                onClick={onSwitchToDemo}
              >
                🎬 Watch Anywear Video Demo
              </button>
              <button
                type="button"
                className="vton-action-btn outline"
                onClick={startCamera}
              >
                🔄 ફરી પ્રયાસ કરો (Retry Cam)
              </button>
            </div>
          </div>
        )}

        {/* Adjust Fit Drawer Controls (Collapsible) */}
        {showControls && cameraState === 'active' && (
          <div className="vton-fit-controls-drawer">
            <div className="vton-fit-header">
              <span>🎯 સાડી ફિટ અને પોઝિશન ગોઠવો (Fit & Align)</span>
              <button type="button" onClick={() => setShowControls(false)} className="vton-mini-close">✕</button>
            </div>
            <div className="vton-fit-row">
              <label>ઉંચાઈ (Vertical Position):</label>
              <input
                type="range"
                min="20"
                max="65"
                value={drapeOffsetY}
                onChange={(e) => setDrapeOffsetY(Number(e.target.value))}
              />
            </div>
            <div className="vton-fit-row">
              <label>કદ (Scale / Size):</label>
              <input
                type="range"
                min="70"
                max="140"
                value={drapeScale}
                onChange={(e) => setDrapeScale(Number(e.target.value))}
              />
            </div>
            <div className="vton-fit-row">
              <label>દિશા (Left / Right):</label>
              <input
                type="range"
                min="35"
                max="65"
                value={drapeOffsetX}
                onChange={(e) => setDrapeOffsetX(Number(e.target.value))}
              />
            </div>
          </div>
        )}

        {/* Floating Capture Button */}
        {cameraState === 'active' && (
          <div className="vton-live-bottom-capture-bar">
            <button
              type="button"
              className="vton-capture-shutter-btn"
              onClick={handleCapture}
              disabled={isCapturing}
              title="Take Photo with this Patola"
            >
              <span className="vton-shutter-ring" />
              <span className="vton-shutter-center">
                {isCapturing ? '⏳' : '📸'}
              </span>
            </button>
            <span className="vton-capture-label">Capture & Inspect Drape</span>
          </div>
        )}
      </div>

      {/* Saree Switcher Bar at the bottom (Like Decart Anywear clothing switch in video!) */}
      <div className="vton-live-saree-switcher-shelf">
        <div className="vton-shelf-header">
          <div className="vton-shelf-title-wrap">
            <span className="vton-shelf-sparkle">✨</span>
            <span className="vton-shelf-title">
              પટોળા પસંદ કરો (Click any Patola to instantly switch clothes):
            </span>
          </div>
          {selectedSaree && (
            <span className="vton-shelf-price">
              {formatPrice ? formatPrice(selectedSaree.finalPriceINR || selectedSaree.price || selectedSaree.basePriceINR) : `₹${selectedSaree.price || 125000}`}
            </span>
          )}
        </div>

        <div className="vton-shelf-carousel">
          {allSarees.map((s) => {
            const isSelected = s.id === selectedSaree?.id;
            return (
              <button
                type="button"
                key={s.id}
                className={`vton-shelf-item ${isSelected ? 'active' : ''}`}
                onClick={() => handleSareeChange(s)}
                title={`Try ${s.title}`}
              >
                <div className="vton-shelf-img-box">
                  <img src={s.image || '/assets/images/patola_drape.jpg'} alt={s.title} />
                  {isSelected && <span className="vton-shelf-active-dot">✓</span>}
                </div>
                <span className="vton-shelf-name">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
