/* ====================================================================================================
 * File Name: VirtualDrape3D.jsx
 * Folder: frontend/src/components/
 * 
 * Interactive 3D Virtual Saree Drape Studio
 * ----------------------------------------------------------------------------------------------------
 * - Applied to Photo Slots #2 to #4 (Photo Slot #1 & #5 remain fixed standard 2D photos).
 * - Interactive 3D perspective rotation (orbital tilt, yaw, and pitch).
 * - Real-time specular silk sheen highlight moving with lighting angle.
 * - Royal mannequin / silhouette overlay toggle (shows how saree falls gracefully).
 * - Fabric ripple & pleats depth shadow.
 * ==================================================================================================== */

import React, { useState, useRef, useEffect } from 'react';
import { isStandingModelPhoto } from '../utils/imageHelper';

export default function VirtualDrape3D({
  imageUrl,
  title = 'Royal Patola Saree',
  isCard = false,
  photoIndex = 3,
  onInspect = null
}) {
  const containerRef = useRef(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [lightX, setLightX] = useState(45);
  const [lightY, setLightY] = useState(35);
  const [isHovered, setIsHovered] = useState(false);
  const [autoRotate, setAutoRotate] = useState(!isCard);
  const [zoomLevel, setZoomLevel] = useState(1);
  const imgRef = useRef(null);
  const [objectFit, setObjectFit] = useState('contain');
  // Subtle royal silk sheen: reduced, soft luster on hover without harsh glare
  const [sheenIntensity, setSheenIntensity] = useState(isCard ? 0.12 : 0.18);

  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef(null);

  // Gentle auto-rotation when user is not actively interacting
  useEffect(() => {
    if (!autoRotate || isCard) return;

    let angle = 0;
    const animate = () => {
      angle += 0.015;
      const calculatedY = Math.sin(angle) * 12; // -12deg to +12deg swing
      const calculatedX = Math.cos(angle * 0.8) * 6;  // -6deg to +6deg tilt
      setRotateY(calculatedY);
      setRotateX(calculatedX);
      setLightX(50 + Math.sin(angle) * 35);
      setLightY(40 + Math.cos(angle) * 20);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [autoRotate, isCard]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normX = (x / rect.width) * 2 - 1; // -1 to +1
    const normY = (y / rect.height) * 2 - 1; // -1 to +1

    if (isDraggingRef.current) {
      const deltaX = e.clientX - lastMouseRef.current.x;
      const deltaY = e.clientY - lastMouseRef.current.y;
      setRotateY((prev) => Math.max(-28, Math.min(28, prev + deltaX * 0.4)));
      setRotateX((prev) => Math.max(-20, Math.min(20, prev - deltaY * 0.4)));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    } else if (isHovered && isCard) {
      // Gentle card tilt
      setRotateY(normX * 14);
      setRotateX(-normY * 10);
      setLightX(((normX + 1) / 2) * 100);
      setLightY(((normY + 1) / 2) * 100);
    }
  };

  const handleMouseDown = (e) => {
    if (isCard) return;
    setAutoRotate(false);
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e) => {
    if (isCard || e.touches.length === 0) return;
    setAutoRotate(false);
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || e.touches.length === 0) return;
    const deltaX = e.touches[0].clientX - lastMouseRef.current.x;
    const deltaY = e.touches[0].clientY - lastMouseRef.current.y;
    setRotateY((prev) => Math.max(-30, Math.min(30, prev + deltaX * 0.45)));
    setRotateX((prev) => Math.max(-22, Math.min(22, prev - deltaY * 0.45)));
    lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      className={`virtual-drape-3d-wrap ${isCard ? 'is-card-mode' : 'is-studio-mode'}`}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        isDraggingRef.current = false;
        if (isCard) {
          setRotateX(0);
          setRotateY(0);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        perspective: isCard ? '750px' : '950px'
      }}
    >
      {/* 3D Perspective Drape Stage - Ambient backdrop so contained uncropped photos blend seamlessly without black bars */}
      {objectFit === 'contain' && (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="drape-studio-backdrop"
        />
      )}
      <div
        className="drape-3d-stage"
        style={{
          transform: `scale(${zoomLevel}) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: isDraggingRef.current ? 'none' : 'transform 0.18s ease-out'
        }}
      >
        {/* Saree Image Texture Layer */}
        <div className="drape-image-container">
          <img
            ref={imgRef}
            src={imageUrl}
            alt={`${title} - 3D Virtual Drape View`}
            className="drape-texture-img"
            loading="lazy"
            style={{
              objectFit: objectFit
            }}
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth && naturalHeight) {
                const fit = isStandingModelPhoto(imageUrl, naturalWidth, naturalHeight, photoIndex) ? 'contain' : 'cover';
                setObjectFit(fit);
                event.currentTarget.style.objectFit = fit;
              }
            }}
          />

          {/* Dynamic Silk Sheen Layer (Subtle, Soft Silk Sheen - Dimmed on Mouseover) */}
          <div
            className="drape-silk-sheen"
            style={{
              background: `radial-gradient(ellipse at ${lightX}% ${lightY}%, rgba(255, 245, 200, ${isHovered ? 0.09 : 0.16}) 0%, rgba(255, 230, 160, ${isHovered ? 0.04 : 0.08}) 30%, transparent 68%)`,
              mixBlendMode: 'soft-light',
              opacity: isHovered ? 0.65 : 0.85,
              transition: 'opacity 0.3s ease'
            }}
          />

          {/* Fabric Depth Pleat & Ripple Shadows */}
          {/* Fabric Depth Pleat & Ripple Shadows */}
          <div className="drape-pleat-shadows" />
        </div>
      </div>
    </div>
  );
}
