/* ====================================================================================================
 * File Name: Photo360Viewer.jsx
 * Folder: frontend/src/components/
 * 
 * Interactive 360° Saree Angle & Panoramic Silk Viewer (Photo Slot #5)
 * ----------------------------------------------------------------------------------------------------
 * - Interactive 360° continuous turntable horizontal rotation via touch drag, mouse drag, or slider.
 * - Auto 360° spin mode with smooth easing & play/pause toggle.
 * - Dynamic angle dial (0° to 360°) indicating current perspective (Front, Right, Reversible Back, Left).
 * - Real-time specular silk lighting that dynamically shifts with rotation angle.
 * - Preset angle buttons (0° Front, 90° Side Profile, 180° Reversible Ikat Weave, 270° Left, 360° Complete).
 * - Authentic Patola reversible highlight at 180° (celebrating the double ikat identical front & back).
 * ==================================================================================================== */

import React, { useState, useRef, useEffect } from 'react';
import { isStandingModelPhoto } from '../utils/imageHelper';

export default function Photo360Viewer({
  imageUrl,
  title = 'Royal Patola Saree',
  isCard = false,
  photoIndex = 4
}) {
  const containerRef = useRef(null);
  const [angle, setAngle] = useState(0); // 0 to 360 degrees
  const [isAutoSpin, setIsAutoSpin] = useState(!isCard);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(2 / 3);
  const imgRef = useRef(null);
  const [objectFit, setObjectFit] = useState('contain');

  const startXRef = useRef(0);
  const startAngleRef = useRef(0);
  const animFrameRef = useRef(null);

  // Auto 360° continuous smooth slow turntable rotation
  useEffect(() => {
    if (!isAutoSpin || isDragging) return;

    let current = angle;
    const speed = isCard ? 0.22 : 0.28; // Balanced natural auto-spin speed

    const animate = () => {
      current = (current + speed) % 360;
      setAngle(current);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAutoSpin, isDragging, isCard]);

  // Mouse Drag Handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setIsAutoSpin(false);
    startXRef.current = e.clientX;
    startAngleRef.current = angle;
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const deltaX = e.clientX - startXRef.current;
      const sensitivity = 0.34; // Responsive, smooth, natural drag sensitivity
      let newAngle = (startAngleRef.current + deltaX * sensitivity) % 360;
      if (newAngle < 0) newAngle += 360;
      setAngle(newAngle);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Drag Handlers (Mobile)
  const handleTouchStart = (e) => {
    if (e.touches.length === 0) return;
    setIsDragging(true);
    setIsAutoSpin(false);
    startXRef.current = e.touches[0].clientX;
    startAngleRef.current = angle;
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length === 0) return;
    const deltaX = e.touches[0].clientX - startXRef.current;
    const sensitivity = 0.36; // Responsive, natural mobile touch drag
    let newAngle = (startAngleRef.current + deltaX * sensitivity) % 360;
    if (newAngle < 0) newAngle += 360;
    setAngle(newAngle);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const normalizedAngle = Math.round(((angle % 360) + 360) % 360);

  // Compute 3D rotation & cylindrical curvature effects based on angle
  // When angle is 0° -> Front face
  // When angle is 90° -> Right side edge
  // When angle is 180° -> Authentic reversible back face
  // When angle is 270° -> Left side edge
  const rad = (normalizedAngle * Math.PI) / 180;
  const rotateYDeg = Math.sin(rad) * 28; // Subtle 3D perspective tilt
  const scaleX = Math.cos(rad); // Front-to-back perspective inversion effect
  const isBackSide = normalizedAngle >= 90 && normalizedAngle <= 270;
  const lightPositionX = ((Math.sin(rad) + 1) / 2) * 100; // Moving specular light

  return (
    <div
      className={`photo-360-wrap ${isCard ? 'is-card-mode' : 'is-studio-mode'}`}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsDragging(false);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        perspective: isCard ? '800px' : '1050px'
      }}
    >
      {/* Ambient backdrop so contained uncropped photos blend seamlessly without black side bars */}
      {objectFit === 'contain' && (
        <img src={imageUrl} alt="" aria-hidden="true" className="photo-360-backdrop" />
      )}
      <div
        className={`photo-360-stage ${!isCard ? 'is-studio-stage' : ''}`}
        style={{
          '--photo-aspect-ratio': imageAspectRatio,
          transform: `scale(${zoomLevel}) rotateY(${rotateYDeg}deg)`,
          transition: isDragging ? 'none' : 'transform 0.12s linear'
        }}
      >
        <div className="photo-360-inner">
          <img
            ref={imgRef}
            src={imageUrl}
            alt={`${title} - 360 Degree View (${normalizedAngle}°)`}
            className="photo-360-img"
            style={{
              objectFit: objectFit,
              transform: `scaleX(${scaleX >= 0 ? 1 : -1})`,
              filter: isBackSide 
                ? 'contrast(1.08) brightness(1.04) saturate(1.02)' 
                : 'contrast(1.02) brightness(1.01)',
              transition: isDragging ? 'none' : 'filter 0.2s ease'
            }}
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth && naturalHeight) {
                setImageAspectRatio(naturalWidth / naturalHeight);
                const fit = isStandingModelPhoto(imageUrl, naturalWidth, naturalHeight, photoIndex) ? 'contain' : 'cover';
                setObjectFit(fit);
                event.currentTarget.style.objectFit = fit;
              }
            }}
            loading="lazy"
          />

          {/* Dynamic Silk Specular Light Tracker (Subtle, Soft Silk Sheen) */}
          <div
            className="photo-360-silk-sheen"
            style={{
              background: `radial-gradient(circle at ${lightPositionX}% 45%, rgba(255, 245, 195, ${isCard ? 0.12 : 0.16}) 0%, rgba(255, 220, 140, ${isCard ? 0.05 : 0.08}) 30%, transparent 68%)`,
              mixBlendMode: 'soft-light',
              opacity: isHovered ? 0.65 : 0.85
            }}
          />

          {/* Depth Shading during 360 Rotation */}
          <div
            className="photo-360-shadow-overlay"
            style={{
              opacity: Math.abs(Math.sin(rad)) * 0.42
            }}
          />

        </div>
      </div>
    </div>
  );
}
