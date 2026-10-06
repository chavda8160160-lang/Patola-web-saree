import React, { useState, useEffect } from 'react';

const PHOTO_STEPS = [
  { id: 1, text: 'તમારા ફોટાનું બોડી એનાલિસિસ થઈ રહ્યું છે...', icon: '📸' },
  { id: 2, text: 'ઓરિજિનલ પટોળા વણાટ અને ડિઝાઈન મેચ થઈ રહી છે...', icon: '🧵' },
  { id: 3, text: 'ગુજરાતી સીધા પાલવ અને સિલ્ક ફોલ્ડ્સ ડ્રેપ થઈ રહ્યાં છે...', icon: '✨' },
  { id: 4, text: 'હાઇ-ડેફિનેશન AI લુક તૈયાર થઈ રહ્યો છે...', icon: '👑' }
];

const VIDEO_STEPS = [
  { id: 1, text: 'તમારા વિડીયોની ફ્રેમ્સ સ્કેન થઈ રહી છે...', icon: '🎥' },
  { id: 2, text: 'શરીરના મૂવમેન્ટ મુજબ પટોળા પોઝીશન ટ્રેક થઈ રહી છે...', icon: '🤖' },
  { id: 3, text: 'દરેક ફ્રેમ પર રિયલ-ટાઇમ પટોળા સાડી ડ્રેપ થઈ રહી છે...', icon: '🥻' },
  { id: 4, text: 'સ્મૂધ AI વિડીયો પ્રિવ્યુ રેન્ડર થઈ રહ્યો છે...', icon: '🎬' }
];

/**
 * TryOnLoader
 * Displays a royal silk shimmer loader with progression through generation steps.
 */
export default function TryOnLoader({ sareeTitle = 'Patola Saree', isVideo = false }) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const steps = isVideo ? VIDEO_STEPS : PHOTO_STEPS;

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStepIdx(1), isVideo ? 2500 : 1800);
    const timer2 = setTimeout(() => setCurrentStepIdx(2), isVideo ? 5000 : 3800);
    const timer3 = setTimeout(() => setCurrentStepIdx(3), isVideo ? 7500 : 5800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isVideo]);

  return (
    <div className="vton-loader-container">
      {/* Royal Silk Loom Ring Animation */}
      <div className="vton-loader-orb-wrap">
        <div className="vton-loader-glow-ring" />
        <div className="vton-loader-shimmer-disc">
          <span className="vton-loader-royal-emoji">{isVideo ? '🎬' : '🥻'}</span>
        </div>
      </div>

      <h3 className="vton-loader-title">
        {isVideo ? 'AI વિડીયો તૈયાર થઈ રહ્યો છે...' : 'AI પટોળા લુક તૈયાર થઈ રહ્યો છે...'}
      </h3>
      <p className="vton-loader-saree-sub">
        Draping <strong>{sareeTitle}</strong> with authentic silk reflections
      </p>

      {/* Step-by-Step Progress Checklist */}
      <div className="vton-loader-steps">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIdx;
          const isActive = idx === currentStepIdx;
          const isPending = idx > currentStepIdx;

          return (
            <div
              key={step.id}
              className={`vton-loader-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`}
            >
              <div className="vton-step-bullet">
                {isDone ? (
                  <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                ) : isActive ? (
                  <span className="vton-step-spinner" />
                ) : (
                  <span>{step.icon}</span>
                )}
              </div>
              <span className="vton-step-text">{step.text}</span>
            </div>
          );
        })}
      </div>

      <div className="vton-loader-progress-bar">
        <div
          className="vton-loader-progress-fill"
          style={{ width: `${Math.min(96, (currentStepIdx + 1) * 25)}%` }}
        />
      </div>

      <span className="vton-loader-disclaimer">
        {isVideo
          ? 'વિડીયોમાં મૂવમેન્ટ મુજબ સાડી સેટ થઈ રહી છે • Takes ~6 to 12 seconds'
          : 'નેચરલ ફોલ્ડ્સ અને બોડી કોન્ટૂર તૈયાર થઈ રહ્યાં છે • Takes ~4 to 8 seconds'}
      </span>
    </div>
  );
}
