import React from 'react';

/**
 * Royal Heritage Vector Insignia for Patola Specifications:
 * 1. Saree Body (સાડી બોડી) - Sacred Double Ikat Diamond Weave & Draped Silk Saree Silhouette
 * 2. Pallu / Palav (પલ્લુ / પાલવ) - Grand Zari Palla with Ornamental Tassels & Royal Paisley / Kalash
 * 3. Border (કિનાર / બોર્ડર) - Traditional Temple Kangura & Double Ikat Zari Border Strip
 * 4. Blouse Piece (બ્લાઉઝ પીસ) - Bespoke Royal Silk Choli / Blouse with Zari Sleeve Cuffs & Sweetheart Neck
 * 5. Length (લંબાઈ / માપ) - Calibrated Royal Golden Measuring Ribbon with Brass Eyelet & Zari Gradations
 * 6. Color (કુદરતી રંગો / કલર) - Royal Natural Herbal Dye Palette with Sacred Madder Ruby, Turmeric Gold, Emerald & Indigo
 */
export default function CustomPartIcon({ partKey, size = 26, className = '' }) {
  switch (partKey) {
    case 'saree':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ display: 'block' }}
          title="Saree Body / સાડી બોડી"
        >
          <defs>
            <linearGradient id="goldGradSaree" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f3de8a" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#a37617" />
            </linearGradient>
            <linearGradient id="maroonGradSaree" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#851218" />
              <stop offset="100%" stopColor="#4f050b" />
            </linearGradient>
          </defs>
          <path
            d="M8 6C8 6 12 7.5 15 11C18 14.5 24 16 26 21C27 23.5 25.5 26 23.5 26.5C21.5 27 20 25.5 19 23.5C18 21.5 17 18 14 15.5C11.5 13.5 8 13 8 13"
            stroke="url(#goldGradSaree)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 13C10.5 15 11 18 10 26C13 27 19 27 22 26C21 21 20 16 18 13.5"
            fill="url(#maroonGradSaree)"
            fillOpacity="0.12"
            stroke="url(#maroonGradSaree)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M12.5 16.5L12 26" stroke="url(#goldGradSaree)" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M15.5 16L15.5 26.2" stroke="url(#goldGradSaree)" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M18.5 16.5L19 26" stroke="url(#goldGradSaree)" strokeWidth="1.2" strokeLinecap="round" />
          <path
            d="M16 4L20 8L16 12L12 8Z"
            fill="url(#maroonGradSaree)"
            stroke="url(#goldGradSaree)"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="8" r="1.3" fill="url(#goldGradSaree)" />
          <path d="M10 26C13.5 27.2 18.5 27.2 22 26" stroke="url(#goldGradSaree)" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'pallu':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ display: 'block' }}
          title="Pallu / Palav / પલ્લું / પાલવ"
        >
          <defs>
            <linearGradient id="goldGradPallu" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f7e59b" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#a37617" />
            </linearGradient>
            <linearGradient id="rubyGradPallu" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#96171f" />
              <stop offset="100%" stopColor="#57080d" />
            </linearGradient>
          </defs>
          <path
            d="M6 5H26V18C26 21 21.5 23 16 23C10.5 23 6 21 6 18V5Z"
            fill="url(#rubyGradPallu)"
            fillOpacity="0.1"
            stroke="url(#goldGradPallu)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M5 5H27" stroke="url(#goldGradPallu)" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M7 8H25" stroke="url(#rubyGradPallu)" strokeWidth="1.2" strokeLinecap="round" />
          <path
            d="M16 11C14 11 12.5 12.5 12.5 14.5C12.5 16.5 14 18 16 19C18 18 19.5 16.5 19.5 14.5C19.5 12.8 17.5 11.2 16 9C15.5 10 16 11 16 11Z"
            fill="url(#goldGradPallu)"
            fillOpacity="0.25"
            stroke="url(#goldGradPallu)"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="15" r="1.2" fill="url(#rubyGradPallu)" />
          <path d="M9 23V27.5" stroke="url(#goldGradPallu)" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="9" cy="28.5" r="1.1" fill="url(#goldGradPallu)" />
          <path d="M13.5 23V27.5" stroke="url(#goldGradPallu)" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="13.5" cy="28.5" r="1.1" fill="url(#goldGradPallu)" />
          <path d="M18.5 23V27.5" stroke="url(#goldGradPallu)" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="18.5" cy="28.5" r="1.1" fill="url(#goldGradPallu)" />
          <path d="M23 23V27.5" stroke="url(#goldGradPallu)" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="23" cy="28.5" r="1.1" fill="url(#goldGradPallu)" />
        </svg>
      );

    case 'border':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ display: 'block' }}
          title="Border / કિનાર / બોર્ડર"
        >
          <defs>
            <linearGradient id="goldGradBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5e192" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#9e7215" />
            </linearGradient>
            <linearGradient id="crimsonGradBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8a131b" />
              <stop offset="100%" stopColor="#520509" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="9"
            width="24"
            height="14"
            rx="2"
            fill="url(#crimsonGradBorder)"
            fillOpacity="0.12"
          />
          <path d="M3 9H29" stroke="url(#goldGradBorder)" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M4 12H28" stroke="url(#crimsonGradBorder)" strokeWidth="1" strokeLinecap="round" />
          <path
            d="M5 16L7.5 13.5L10 16L12.5 13.5L15 16L17.5 13.5L20 16L22.5 13.5L25 16L27 14"
            stroke="url(#goldGradBorder)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 16L7.5 18.5L10 16L12.5 18.5L15 16L17.5 18.5L20 16L22.5 18.5L25 16L27 18"
            stroke="url(#goldGradBorder)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="16" r="0.9" fill="url(#crimsonGradBorder)" />
          <circle cx="15" cy="16" r="0.9" fill="url(#crimsonGradBorder)" />
          <circle cx="20" cy="16" r="0.9" fill="url(#crimsonGradBorder)" />
          <path d="M4 20H28" stroke="url(#crimsonGradBorder)" strokeWidth="1" strokeLinecap="round" />
          <path d="M3 23H29" stroke="url(#goldGradBorder)" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'blouse':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ display: 'block' }}
          title="Blouse Piece / બ્લાઉઝ પીસ"
        >
          <defs>
            <linearGradient id="goldGradBlouse" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5e192" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#9e7215" />
            </linearGradient>
            <linearGradient id="emeraldGradBlouse" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#086148" />
              <stop offset="100%" stopColor="#033023" />
            </linearGradient>
          </defs>
          <path
            d="M10 6L6 9L4 16L8 17L10 13V24H22V13L24 17L28 16L26 9L22 6C22 6 20 11 16 11C12 11 10 6 10 6Z"
            fill="url(#emeraldGradBlouse)"
            fillOpacity="0.14"
            stroke="url(#emeraldGradBlouse)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M10 6C10 6 12 11.5 16 11.5C20 11.5 22 6 22 6"
            stroke="url(#goldGradBlouse)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="M4.5 14.8L7.5 15.8" stroke="url(#goldGradBlouse)" strokeWidth="2" strokeLinecap="round" />
          <path d="M27.5 14.8L24.5 15.8" stroke="url(#goldGradBlouse)" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 24H22" stroke="url(#goldGradBlouse)" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M13.5 12V23" stroke="url(#goldGradBlouse)" strokeWidth="1" strokeDasharray="1.5 1.5" />
          <path d="M18.5 12V23" stroke="url(#goldGradBlouse)" strokeWidth="1" strokeDasharray="1.5 1.5" />
          <path d="M16 11.5V17" stroke="url(#goldGradBlouse)" strokeWidth="1.1" />
          <circle cx="15.2" cy="18" r="0.9" fill="url(#goldGradBlouse)" />
          <circle cx="16.8" cy="18" r="0.9" fill="url(#goldGradBlouse)" />
        </svg>
      );

    case 'length':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ display: 'block' }}
          title="Fabric Length / લંબાઈ"
        >
          <defs>
            <linearGradient id="goldGradLength" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5e192" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#9e7215" />
            </linearGradient>
            <linearGradient id="maroonGradLength" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#851218" />
              <stop offset="100%" stopColor="#4f050b" />
            </linearGradient>
          </defs>
          {/* Royal Tailor's Golden Measuring Ribbon / Calibrated Silk Tape */}
          <path
            d="M3.5 17.5L16.5 4.5C17.6 3.4 19.4 3.4 20.5 4.5C21.6 5.6 21.6 7.4 20.5 8.5L7.5 21.5C6.4 22.6 4.6 22.6 3.5 21.5C2.4 20.4 2.4 18.6 3.5 17.5Z"
            fill="url(#maroonGradLength)"
            fillOpacity="0.08"
            stroke="url(#goldGradLength)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Brass Ring Clasp / Eyelet at start */}
          <circle cx="5.5" cy="19.5" r="1.3" stroke="url(#goldGradLength)" strokeWidth="1.2" fill="#fffdf8" />
          {/* Calibrated Measurement Hash-marks */}
          <path d="M7 14L9 16" stroke="url(#goldGradLength)" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M9 12L10.5 13.5" stroke="url(#maroonGradLength)" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M11 10L13 12" stroke="url(#goldGradLength)" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M13 8L14.5 9.5" stroke="url(#maroonGradLength)" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M15 6L17 8" stroke="url(#goldGradLength)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );

    case 'color':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ display: 'block' }}
          title="Herbal Color Palette / કુદરતી રંગો"
        >
          <defs>
            <linearGradient id="goldGradColor" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5e192" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#9e7215" />
            </linearGradient>
          </defs>
          {/* Royal Heritage Artist Palette with Natural Herbal Dye Wells */}
          <path
            d="M12 3C7 3 3 7 3 12C3 15.5 5 18 8 18C9.5 18 10 19 10 20C10 20.8 9.8 21.2 10.5 21.8C11 22.2 11.8 22 13 22C17.5 22 21 18 21 13C21 7.5 17 3 12 3Z"
            fill="#fffdf8"
            stroke="url(#goldGradColor)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Thumb hole */}
          <ellipse cx="14" cy="17.5" rx="1.5" ry="1.2" stroke="url(#goldGradColor)" strokeWidth="1.2" fill="#fff" />
          {/* Sacred Natural Dye Color Jewels: Madder Ruby, Turmeric Gold, Emerald Green, Peacock Indigo */}
          <circle cx="8" cy="8.5" r="1.6" fill="#851218" stroke="url(#goldGradColor)" strokeWidth="0.8" />
          <circle cx="12.5" cy="6.8" r="1.6" fill="#d4af37" stroke="#9e7215" strokeWidth="0.8" />
          <circle cx="16.8" cy="9.2" r="1.6" fill="#086148" stroke="url(#goldGradColor)" strokeWidth="0.8" />
          <circle cx="17.5" cy="13.8" r="1.6" fill="#1e3a8a" stroke="url(#goldGradColor)" strokeWidth="0.8" />
        </svg>
      );

    default:
      return null;
  }
}
