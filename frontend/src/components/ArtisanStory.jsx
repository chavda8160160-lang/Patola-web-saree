/* ====================================================================================================
 * File Name: ArtisanStory.jsx
 * Folder: frontend/src/components/
 * 
 * Artisan Heritage & Loom Lineage Story Component
 * ----------------------------------------------------------------------------------------------------
 * Showcases the cultural legacy of master handloom weavers in Gujarat, ethical fair-trade support,
 * and genuine Silk Mark certifications.
 * ==================================================================================================== */

import React, { useState, useRef, useEffect } from 'react';

export default function ArtisanStory({ onOpenBooking }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true); // By default sound is muted (Off)

  // Strictly enforce muted state on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
    }
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    } else if (videoRef.current.webkitRequestFullscreen) {
      videoRef.current.webkitRequestFullscreen();
    }
  };

  return (
    <section className="section-padding artisan-section" id="artisans">
      <div className="container">
        <div className="artisan-split-grid">
          <div className="artisan-media-composition">
            {/* Live Handloom Weaving Video Player */}
            <div className="artisan-video-frame">
              <video
                ref={videoRef}
                src="/assets/videos/loom_artisan_pure.mp4?v=3"
                poster="/assets/images/artisan_loom_real.jpg"
                autoPlay
                loop
                playsInline
                muted
                className="artisan-main-video"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Video Controls Overlay */}
              <div className="artisan-video-controls">
                <button
                  type="button"
                  className="artisan-video-btn"
                  onClick={togglePlay}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </button>
                <button
                  type="button"
                  className={`artisan-video-btn sound-btn ${!isMuted ? 'active-sound' : ''}`}
                  onClick={toggleMute}
                  title={isMuted ? 'Sound On' : 'Sound Off'}
                >
                  {isMuted ? '🔇 Sound' : '🔊 Sound'}
                </button>
                <button
                  type="button"
                  className="artisan-video-btn"
                  onClick={toggleFullscreen}
                  title="Full Screen"
                >
                  ⛶ Fullscreen
                </button>
              </div>
            </div>

            <div className="artisan-floating-quote-card">
              <p>"We don't weave threads; we weave prayers and mathematics that will live for three hundred years."</p>
              <span>— Master Artisan, 4th Generation • Patan Handloom</span>
            </div>
          </div>

          <div className="artisan-text-details">
            <span className="section-eyebrow">Living Cultural Heritage</span>
            <h2>Preserving An Ancient Loom Lineage</h2>
            <p>
              For centuries, the traditional weavers of Gujarat have guarded the closely held secrets of Double Ikat. Passed down strictly from father to son, this complex mathematical art requires two master artisans working synchronously on a single loom.
            </p>
            <p>
              By collecting an authentic PATOLA (Handmade by Vankar) drape, you become a custodian of this rare handloom heritage, ensuring master weaver families continue to practice their sacred art with dignity and pride.
            </p>

            <ul className="artisan-features-list">
              <li>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                100% Ethical Fair-Trade compensation direct to weaver families
              </li>
              <li>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                No modern powerlooms or digital printed replicas
              </li>
              <li>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Authenticity scroll signed by the master craftsman who crafted your saree
              </li>
            </ul>

            <div className="artisan-cta-buttons" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '1.8rem' }}>
              <button className="btn-primary-gold" onClick={onOpenBooking}>
                Plan a Loom Studio Visit
              </button>
              <button
                type="button"
                className="btn-return-store"
                onClick={() => {
                  const elem = document.getElementById('sareeGridArea') || document.querySelector('.saree-grid') || document.getElementById('collection');
                  if (elem) {
                    const navHeight = 70;
                    const elementPosition = elem.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - navHeight;
                    window.scrollTo({
                      top: offsetPosition,
                      behavior: 'smooth'
                    });
                    window.history.pushState(null, '', '#sarees');
                  }
                }}
                title="Return to Sarees & Dupattas Collection"
              >
                <span>🛍️ Return to Store</span>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
