import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { translations } from '../../utils/translations';
import './CameraActivationBanner.css';

export default function CameraActivationBanner({
  onCapture,
  onDismiss,
  secondsUntilBanner,
  className = '',
}) {
  const { language } = useLanguage();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [bubbleText, setBubbleText] = useState(null);
  const progressInterval = useRef(null);
  const bubbleTimeout = useRef(null);
  const BANNER_LIFETIME_MS = 300_000; // 5 min

  // Set initial text based on language
  useEffect(() => {
    setBubbleText(translations.food_arrived[language] || 'Your food arrived!');
  }, [language]);

  useEffect(() => {
    // Animate progress bar
    const start = Date.now();
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / BANNER_LIFETIME_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressInterval.current);
      }
    }, 1000);

    return () => clearInterval(progressInterval.current);
  }, []);

  // Bubble message transition: "Your food arrived!" → "Want to take a foto?"
  useEffect(() => {
    bubbleTimeout.current = setTimeout(() => {
      setBubbleText(`${translations.take_photo[language] || 'Want to take a foto?'} ✨`);
    }, 2000);

    return () => clearTimeout(bubbleTimeout.current);
  }, [language]);

  const handleDismiss = (e) => {
    e.stopPropagation();
    onDismiss?.();
    // Delay hiding to allow parent state updates to complete
    setTimeout(() => setIsVisible(false), 0);
  };

  const handleCapture = () => {
    onCapture?.();
  };

  if (!isVisible) return null;

  return (
    <div
      className={`camera-activation-banner ${className}`}
      aria-label="Camera activation banner"
    >
      {/* Walking Donut Animation */}
      <div className="banner-donut-wrapper">
        <div className="donut-entry">
          <svg width="132" height="154" viewBox="0 0 300 350" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="biteMask">
                <rect width="300" height="350" fill="white" />
                <circle cx="260" cy="50" r="42" fill="black" />
                <circle cx="282" cy="85" r="35" fill="black" />
                <circle cx="230" cy="25" r="30" fill="black" />
              </mask>
            </defs>

            {/* LEGS */}
            <g className="legs">
              <rect className="leg-left" x="110" y="240" width="25" height="45" rx="12" fill="#F4D03F" stroke="#8E7300" strokeWidth="4"/>
              <rect className="leg-right" x="165" y="240" width="25" height="45" rx="12" fill="#F4D03F" stroke="#8E7300" strokeWidth="4"/>
            </g>

            <g mask="url(#biteMask)">
              {/* Dough Body */}
              <circle cx="150" cy="150" r="120" fill="#F4D03F" stroke="#8E7300" strokeWidth="6"/>

              {/* Frosting */}
              <path d="M150 30C83.7258 30 30 83.7258 30 150C30 216.274 83.7258 270 150 270C216.274 270 270 216.274 270 150C270 83.7258 216.274 30 150 30ZM150 90C183.137 90 210 116.863 210 150C210 183.137 183.137 210 150 210C116.863 210 90 183.137 90 150C90 116.863 116.863 90 150 90Z" fill="#FF69B4" stroke="#D1478B" strokeWidth="4"/>

              {/* Sprinkles */}
              <rect x="70" y="80" width="12" height="4" rx="2" transform="rotate(30 70 80)" fill="white"/>
              <rect x="220" y="120" width="12" height="4" rx="2" transform="rotate(-45 220 120)" fill="#4DD0E1"/>
              <rect x="180" y="230" width="12" height="4" rx="2" transform="rotate(15 180 230)" fill="#FFEB3B"/>
              <rect x="100" y="240" width="12" height="4" rx="2" transform="rotate(-10 100 240)" fill="#81C784"/>
              <rect x="50" y="150" width="12" height="4" rx="2" transform="rotate(90 50 150)" fill="#BA68C8"/>

              {/* Center Hole */}
              <circle cx="150" cy="150" r="55" fill="white" stroke="#D1478B" strokeWidth="2"/>
              <circle cx="150" cy="150" r="45" fill="white" opacity="0.5"/>

              {/* Eyes */}
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

            {/* Camera Hands */}
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

          {/* Bubble Message */}
          <div className="bubble-message">
            {bubbleText}
          </div>

          {/* Action Buttons */}
          <div className="banner-actions">
            <button
              className="banner-btn banner-btn-yes"
              onClick={(e) => {
                e.stopPropagation();
                handleCapture();
              }}
              type="button"
              aria-label="Take a photo"
            >
              {translations.camera_yes[language] || 'Yes ✨'}
            </button>
            <button
              className="banner-btn banner-btn-no"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss(e);
              }}
              type="button"
              aria-label="No, skip"
            >
              {translations.camera_no[language] || 'No'}
            </button>
          </div>

          {/* Shadow */}
          <div className="donut-shadow" />
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        className="banner-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss camera prompt"
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Auto-dismiss progress bar */}
      <div className="banner-progress-track">
        <div
          className="banner-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
