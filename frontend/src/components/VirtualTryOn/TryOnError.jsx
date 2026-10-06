import React from 'react';

/**
 * TryOnError
 * Displays friendly recovery screen when generation encounters an issue.
 */
export default function TryOnError({
  message = "We couldn't create your preview right now. Please try again.",
  onRetry,
  onReset
}) {
  return (
    <div className="vton-error-container">
      <div className="vton-error-icon-box">
        <span style={{ fontSize: '2.5rem' }}>⚠️</span>
      </div>

      <h3 className="vton-error-heading">Try-On Notice</h3>
      <p className="vton-error-message">{message}</p>

      <div className="vton-error-tips">
        <span style={{ fontWeight: 700, color: '#851218' }}>Tips for success:</span>
        <ul style={{ margin: '0.4rem 0 0 1.2rem', fontSize: '0.86rem', color: '#555' }}>
          <li>Ensure the photo shows a clear person standing up</li>
          <li>Check that the lighting is clear and photo is not blurry</li>
          <li>Try using a JPG or PNG under 10MB</li>
        </ul>
      </div>

      <div className="vton-error-actions">
        {onRetry && (
          <button
            type="button"
            className="vton-action-btn primary"
            onClick={onRetry}
          >
            🔄 Try Again
          </button>
        )}

        {onReset && (
          <button
            type="button"
            className="vton-action-btn secondary"
            onClick={onReset}
          >
            📁 Choose Another Photo
          </button>
        )}
      </div>
    </div>
  );
}
