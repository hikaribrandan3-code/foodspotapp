import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { translations } from '../../utils/translations';
import ChibiLuffy from './ChibiLuffy';
import './CameraActivationBanner.css';

export default function CameraActivationBanner({
  onCapture,
  onDismiss,
  className = '',
  orderType = 'delivery',
}) {
  const { lang } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);
  const [showLuffy, setShowLuffy] = useState(false);

  // Rotate every 3rd appearance: donut, donut, Luffy
  useEffect(() => {
    const count = parseInt(localStorage.getItem('fs_banner_counter') || '0', 10);
    const newCount = count + 1;
    localStorage.setItem('fs_banner_counter', String(newCount));
    const isLuffy = newCount % 3 === 0;
    console.log(`[banner] counter=${newCount}, showLuffy=${isLuffy}`);
    setShowLuffy(isLuffy);
  }, []);

  const handleCapture = () => {
    onCapture?.();
  };

  const handleDismiss = () => {
    onDismiss?.();
    setTimeout(() => setIsVisible(false), 100);
  };

  if (!isVisible) return null;

  // Show Luffy every 3rd time
  if (showLuffy) {
    return <ChibiLuffy onCapture={handleCapture} onDismiss={handleDismiss} />;
  }

  const isDineIn = orderType === 'dine_in';

  // Pick a random UGC prompt (1-8) — different every time the banner mounts
  const randomPrompt = useMemo(() => {
    const idx = Math.floor(Math.random() * 8) + 1;
    return translations[`ugc_prompt_${idx}`]?.[lang] || "Food's here. Snap it?";
  }, [lang]);

  const speechText = isDineIn
    ? `${translations.selfie_prompt?.[lang] || 'Want to take a selfie for the gram?'} 📸`
    : `${randomPrompt} ✨`;


  return (
    <>
      {/* Confetti rain during donut walk-in */}
      <div className="sprinkles-container">
        {Array.from({ length: 120 }).map((_, i) => {
          const colors = [
            `hsl(${Math.random() * 360}, 100%, ${Math.random() * 50 + 50}%)`, // random bright colors
            `hsl(${Math.random() * 60 + 320}, ${Math.random() * 40 + 70}%, ${Math.random() * 40 + 45}%)`, // pink/red range
            `hsl(${Math.random() * 60 + 180}, ${Math.random() * 40 + 70}%, ${Math.random() * 40 + 45}%)`, // cyan/blue range
            `hsl(${Math.random() * 60}, ${Math.random() * 40 + 70}%, ${Math.random() * 40 + 45}%)`, // yellow/orange range
          ];
          return (
            <div
              key={i}
              className="sprinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 30}px`,
                width: `${Math.random() * 8 + 3}px`,
                height: `${Math.random() * 8 + 3}px`,
                animationDelay: `${Math.random() * 1}s`,
                backgroundColor: colors[Math.floor(Math.random() * colors.length)],
              }}
            />
          );
        })}
      </div>

      {/* Donut modal - walks in and bounces */}
      <div className={`camera-activation-banner ${className}`}>
        <div className="banner-donut-wrapper">
          <div className="donut-entry">
            {/* Speech bubble ABOVE donut */}
            <div className="speech-bubble">{speechText}</div>

            <svg width="175" height="204" viewBox="0 0 300 350" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                {/* Eyes - bigger, more expressive */}
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
                {/* Improved mouth - bigger smile with tongue */}
                <path d="M130 190C130 190 140 210 150 210C160 210 170 190 170 190" stroke="#333" strokeWidth="7" strokeLinecap="round" fill="none"/>
                {/* Tongue */}
                <ellipse cx="150" cy="215" rx="12" ry="8" fill="#FF1493"/>
                <path d="M140 215C140 220 145 224 150 224C155 224 160 220 160 215" fill="#FF69B4"/>
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
                {/* Camera flash */}
                <circle className="camera-flash" cx="215" cy="217" r="10" fill="none" stroke="#ffff00" strokeWidth="1" opacity="0.6"/>
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
          {translations.camera_yes[lang] || 'Yes ✨'}
        </button>
        <button
          className="banner-btn banner-btn-no"
          onClick={handleDismiss}
          type="button"
        >
          {translations.camera_no[lang] || 'No'}
        </button>
      </div>
    </>
  );
}
