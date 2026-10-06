import React, { useRef, useState } from 'react';

/**
 * AnywearDemoVideo
 * Displays the viral Anywear AI Try-On video demonstration from Decart AI,
 * showing how clothing changes in real-time on live camera.
 */
export default function AnywearDemoVideo({ onSwitchToLiveCam, onSwitchToUpload }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

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
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  return (
    <div className="vton-demo-video-container">
      <div className="vton-demo-header-badge">
        <span className="vton-pulse-dot" />
        <span>VIRAL AI REEL: Live Virtual Try-On Demonstration</span>
      </div>

      <div className="vton-video-wrapper">
        <video
          ref={videoRef}
          src="/assets/videos/tryon_demo.mp4"
          autoPlay
          loop
          playsInline
          muted={isMuted}
          className="vton-reel-video"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Video Overlay Controls */}
        <div className="vton-video-controls-overlay">
          <button
            type="button"
            className="vton-video-ctrl-btn"
            onClick={togglePlay}
            title={isPlaying ? 'Pause Video' : 'Play Video'}
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
          <button
            type="button"
            className="vton-video-ctrl-btn"
            onClick={toggleMute}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? '🔇 Unmute' : '🔊 Sound On'}
          </button>
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="vton-demo-info-card">
        <div className="vton-demo-info-header">
          <span style={{ fontSize: '1.2rem' }}>⚡</span>
          <h4>Anywear AI Real-Time Try-On Technology</h4>
        </div>
        <p className="vton-demo-info-text">
          જેમ આ વીડિયોમાં વેબકેમ/કેમેરા સામે ઉભા રહીને અલગ-અલગ કપડાં પસંદ કરતાં જ રિયલ-ટાઇમમાં બદલાઈ જાય છે, 
          તે જ રીતે તમે પણ તમારા કેમેરા સામે ઉભા રહીને અલગ-અલગ પટોળા સાડી લાઈવ પહેરીને જોઈ શકો છો!
        </p>
        <div className="vton-demo-actions">
          <button
            type="button"
            className="vton-action-btn primary"
            onClick={onSwitchToLiveCam}
          >
            🎥 લાઈવ કેમેરાથી Try-On કરો (Live Camera)
          </button>
          <button
            type="button"
            className="vton-action-btn secondary"
            onClick={onSwitchToUpload}
          >
            📸 તમારો ફોટો અપલોડ કરો (Upload Photo)
          </button>
        </div>
      </div>
    </div>
  );
}
