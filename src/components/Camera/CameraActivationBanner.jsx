import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { translations } from '../../utils/translations';
import './CameraActivationBanner.css';

export default function CameraActivationBanner({
  onCapture,
  onDismiss,
  className = '',
}) {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);
  const [showSprinkles, setShowSprinkles] = useState(false);

  const handleCapture = () => {
    setShowSprinkles(true);
    setTimeout(() => onCapture?.(), 100);
  };

  const handleDismiss = () => {
    onDismiss?.();
    setTimeout(() => setIsVisible(false), 100);
  };

  if (!isVisible) return null;

  const speechText = `${translations.food_arrived[language] || 'Your food arrived!'}\n${translations.take_photo[language] || 'Want to take a foto?'} ✨`;

  return (
    <>
      {/* Sprinkles celebration */}
      {showSprinkles && (
        <div className="sprinkles-container">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="sprinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 20}px`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: `hsl(${Math.random() * 60 + 330}, 100%, ${Math.random() * 30 + 50}%)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Donut modal - walks in and bounces */}
      <div className={`camera-activation-banner ${className}`}>
        <div className="banner-donut-wrapper">
          <div className="donut-entry">
            {/* Speech bubble ABOVE donut */}
            <div className="speech-bubble">{speechText}</div>

            <svg width="132" height="154" viewBox="0 0 300 350" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <mask id="biteMask">
                  <rect width="300" height="350" fill="white" />
                  <circle cx="260" cy="50" r="42" fill="black" />
                  <circle cx="282" cy="85" r="35" fill="black" />
                  <circle cx="230" cy="25" r="30" fill="black" />
                </mask>
              </defs>

              <g className="legs">
                <rect className="leg-left" x="110" y="240" width="25" height="45" rx="12" fill="#F4D03F" stroke="#8E7300" strokeWidth="4"/>
                <rect className="leg-right" x="165" y="240" width="25" height="45" rx="12" fill="#F4D03F" stroke="#8E7300" strokeWidth="4"/>
              </g>

              <g mask="url(#biteMask)">
                <circle cx="150" cy="150" r="120" fill="#F4D03F" stroke="#8E7300" strokeWidth="6"/>
                <path d="M150 30C83.7258 30 30 83.7258 30 150C30 216.274 83.7258 270 150 270C216.274 270 270 216.274 270 150C270 83.7258 216.274 30 150 30ZM150 90C183.137 90 210 116.863 210 150C210 183.137 183.137 210 150 210C116.863 210 90 183.137 90 150C90 116.863 116.863 90 150 90Z" fill="#FF69B4" stroke="#D1478B" strokeWidth="4"/>
                <rect x="70" y="80" width="12" height="4" rx="2" transform="rotate(30 70 80)" fill="white"/>
                <rect x="220" y="120" width="12" height="4" rx="2" transform="rotate(-45 220 120)" fill="#4DD0E1"/>
                <rect x="180" y="230" width="12" height="4" rx="2" transform="rotate(15 180 230)" fill="#FFEB3B"/>
                <rect x="100" y="240" width="12" height="4" rx="2" transform="rotate(-10 100 240)" fill="#81C784"/>
                <rect x="50" y="150" width="12" height="4" rx="2" transform="rotate(90 50 150)" fill="#BA68C8"/>
                <circle cx="150" cy="150" r="55" fill="white" stroke="#D1478B" strokeWidth="2"/>
                <circle cx="150" cy="150" r="45" fill="white" opacity="0.5"/>
                <g className="eyes">
                  <circle cx="85" cy="120" r="26" fill="#333"/>
                  <circle cx="80" cy="110" r="11" fill="white"/>
                  <circle cx="95" cy="130" r="5" fill="white"/>
                  <circle cx="215" cy="120" r="26" fill="#333"/>
                  <circle cx="210" cy="110" r="11" fill="white"/>
                  <circle cx="225" cy="130" r="5" fill="white"/>
                </g>
                <ellipse cx="60" cy="165" rx="18" ry="10" fill="#FFB6C1" opacity="0.8"/>
                <ellipse cx="240" cy="165" rx="18" ry="10" fill="#FFB6C1" opacity="0.8"/>
                <path d="M135 180C135 180 145 190 150 190C155 190 165 180 165 180" stroke="#333" strokeWidth="6" strokeLinecap="round" fill="none"/>
                <path d="M150 50C100 50 60 90 60 140" stroke="white" strokeWidth="8" strokeLinecap="round" opacity="0.4"/>
              </g>

              <g className="camera-held">
                <circle cx="245" cy="210" r="15" fill="#F4D03F" stroke="#8E7300" strokeWidth="3"/>
                <circle cx="175" cy="235" r="15" fill="#F4D03F" stroke="#8E7300" strokeWidth="3"/>
                <rect x="180" y="195" width="70" height="45" rx="8" fill="#444" stroke="#222" strokeWidth="3"/>
                <rect x="190" y="185" width="25" height="10" rx="2" fill="#333"/>
                <circle cx="215" cy="217" r="14" fill="#222" stroke="#666" strokeWidth="2"/>
                <circle cx="215" cy="217" r="8" fill="#000"/>
                <circle cx="210" cy="212" r="3" fill="white" opacity="0.4"/>
                <circle cx="240" cy="205" r="3" fill="#ff4d4d"/>
              </g>
            </svg>

            <div className="donut-shadow" />
          </div>
        </div>
      </div>

      {/* Static buttons - OUTSIDE modal, fixed position */}
      <div className="static-button-bar">
        <button
          className="banner-btn banner-btn-yes"
          onClick={handleCapture}
          type="button"
        >
          {translations.camera_yes[language] || 'Yes ✨'}
        </button>
        <button
          className="banner-btn banner-btn-no"
          onClick={handleDismiss}
          type="button"
        >
          {translations.camera_no[language] || 'No'}
        </button>
      </div>
    </>
  );
}
