import React, { useRef, useState } from 'react';

/**
 * PhotoUploader
 * Allows customer to drag & drop or pick a photo from device or camera.
 * Validates file type (JPG, PNG, WebP) and provides helpful guidance.
 */
export default function PhotoUploader({
  onPhotoSelected,
  onError,
  isProcessing = false
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndPass(file);
    e.target.value = ''; // Reset input
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) validateAndPass(file);
  };

  const validateAndPass = (file) => {
    const fileType = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();

    // Only allow Images (JPG, JPEG, PNG, WEBP, HEIC)
    const isImage = fileType.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(fileName);

    if (!isImage) {
      if (onError) onError('કૃપા કરીને તમારો ફોટો (JPG, JPEG, PNG, WebP) અપલોડ કરો.');
      return;
    }

    // Size limit: 20MB
    if (file.size > 20 * 1024 * 1024) {
      if (onError) onError('ફોટો ખૂબ મોટો છે (20MB થી વધુ). કૃપા કરીને નાનો ફોટો પસંદ કરો.');
      return;
    }

    if (onPhotoSelected) {
      onPhotoSelected(file);
    }
  };

  const handleSelectPresetModel = async (modelUrl, modelName) => {
    try {
      const res = await fetch(modelUrl);
      const blob = await res.blob();
      const file = new File([blob], modelName, { type: blob.type || 'image/jpeg' });
      validateAndPass(file);
    } catch (err) {
      if (onError) onError('સેમ્પલ મોડેલ લોડ કરવામાં સમસ્યા આવી. કૃપા કરીને તમારો ફોટો પસંદ કરો.');
    }
  };

  return (
    <div className="vton-uploader-wrap">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Drop Zone Box */}
      <div
        className={`vton-dropzone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <div className="vton-dropzone-icon">
          <svg width="42" height="42" fill="none" stroke="#d4af37" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        <h3 className="vton-dropzone-title">Upload Your Full-Body / Half-Body Photo</h3>
        <p className="vton-dropzone-sub">
          તમારો ફોટો અહીં ડ્રેગ કરો અથવા ડિવાઇસમાંથી પસંદ કરો — AI આપોઆપ પટોળા સાડી પહેરાવી આપશે
        </p>

        <div className="vton-upload-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="vton-action-btn primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            📁 Choose Photo
          </button>

          <button
            type="button"
            className="vton-action-btn secondary"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessing}
          >
            📸 Take Photo
          </button>
        </div>

        <span className="vton-format-pill">
          Accepts JPG, JPEG, PNG, WebP • Max 20MB
        </span>
      </div>

      {/* 1-Click Demo Models (No Webcam or Personal Photo Needed) */}
      <div className="vton-preset-models-card" style={{
        marginTop: '16px',
        background: 'rgba(212, 175, 55, 0.08)',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        borderRadius: '12px',
        padding: '14px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>💃</span>
            <div>
              <strong style={{ color: '#ffd700', fontSize: '0.88rem' }}>1-Click Try on Sample Models</strong>
              <div style={{ color: '#94a3b8', fontSize: '0.74rem' }}>વેબકેમ કે ફોટો ન હોય તો નીચેના તૈયાર મોડેલ પર ૧ ક્લિકમાં સાડી ટ્રાય કરો:</div>
            </div>
          </div>
          <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '20px', fontWeight: 600 }}>
            Instant Ready
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
          <button
            type="button"
            onClick={() => handleSelectPresetModel('/assets/images/model_base_demo.jpg', 'royal_patola_model.jpg')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: '#fff',
              textAlign: 'left',
              transition: 'all 0.2s ease'
            }}
          >
            <img
              src="/assets/images/model_base_demo.jpg"
              alt="Royal Pose Model"
              style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>Royal Pose</div>
              <div style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Traditional Fit 👑</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPresetModel('/assets/images/patola_model_reference.jpg', 'heritage_model_ref.jpg')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: '#fff',
              textAlign: 'left',
              transition: 'all 0.2s ease'
            }}
          >
            <img
              src="/assets/images/patola_model_reference.jpg"
              alt="Heritage Studio Model"
              style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>Heritage Model</div>
              <div style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Front Angle ✨</div>
            </div>
          </button>
        </div>
      </div>

      {/* Helpful Instructions Box */}
      <div className="vton-instructions-card">
        <div className="vton-instr-header">
          <span style={{ color: '#d4af37', fontSize: '1rem' }}>💡</span>
          <strong>શ્રેષ્ઠ પરિણામ માટે સૂચનાઓ:</strong>
        </div>
        <ul className="vton-instr-list">
          <li>• સાફ અને સ્પષ્ટ કમર સુધીનો અથવા પૂરો ફોટો પસંદ કરો</li>
          <li>• સીધા કેમેરા સામે મોં રાખીને ઉભા રહો</li>
          <li>• કુદરતી અને સારો પ્રકાશ હોય તેવો ફોટો વધુ સારો લુક આપશે</li>
          <li>• બહુ અંધારા કે બ્લરવાળા ફોટા ટાળો</li>
        </ul>
      </div>

      {/* Privacy Guarantee Note */}
      <div className="vton-privacy-notice">
        <span style={{ fontSize: '0.9rem' }}>🔒</span>
        <span>તમારો ફોટો ફક્ત AI પ્રિવ્યુ બનાવવા માટે જ વપરાય છે, સુરક્ષિત અને પ્રાઇવેટ રહે છે.</span>
      </div>
    </div>
  );
}
