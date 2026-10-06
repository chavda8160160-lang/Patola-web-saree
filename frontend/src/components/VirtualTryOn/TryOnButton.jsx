import React from 'react';

/**
 * TryOnButton
 * Premium CTA button styled with imperial crimson and gold shimmering border.
 * Triggers the Virtual Patola Try-On modal.
 */
export default function TryOnButton({
  onClick,
  label = '✨ Try This Patola',
  className = '',
  style = {},
  variant = 'primary', // 'primary' | 'card' | 'outline'
  title = 'See how this authentic Patola looks draped on you with AI Virtual Try-On'
}) {
  const baseStyle = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-royal, "Cinzel", serif)',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    borderRadius: '8px',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    overflow: 'hidden',
    userSelect: 'none',
    ...style
  };

  if (variant === 'card') {
    return (
      <button
        type="button"
        className={`vton-btn-card ${className}`}
        onClick={onClick}
        title={title}
        style={{
          ...baseStyle,
          background: 'linear-gradient(135deg, rgba(133, 18, 24, 0.95) 0%, rgba(92, 11, 16, 0.95) 100%)',
          color: '#ffd700',
          border: '1px solid rgba(212, 175, 55, 0.6)',
          boxShadow: '0 4px 14px rgba(133, 18, 24, 0.35)',
          padding: '6px 12px',
          fontSize: '0.75rem'
        }}
      >
        <span className="vton-shimmer-sweep" />
        <span style={{ position: 'relative', zIndex: 2 }}>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`vton-btn-primary ${className}`}
      onClick={onClick}
      title={title}
      style={{
        ...baseStyle,
        background: 'linear-gradient(135deg, #851218 0%, #5c0b10 50%, #851218 100%)',
        backgroundSize: '200% auto',
        color: '#ffffff',
        border: '1.5px solid #d4af37',
        boxShadow: '0 4px 18px rgba(133, 18, 24, 0.4), 0 0 12px rgba(212, 175, 55, 0.25)',
        padding: '0.75rem 1.4rem',
        fontSize: '0.92rem',
        minHeight: '44px'
      }}
    >
      <span className="vton-shimmer-sweep" />
      <span style={{ position: 'relative', zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#ffd700', fontSize: '1.05rem', filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.7))' }}>✨</span>
        <span style={{ letterSpacing: '0.05em' }}>{label.replace('✨', '').trim()}</span>
      </span>
    </button>
  );
}
