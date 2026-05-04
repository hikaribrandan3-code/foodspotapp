import React from 'react';

export default function BurgerBoy() {
  return (
    <svg className="burger-character" width="175" height="204" viewBox="0 -40 300 350" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className="burger-legs">
        <rect className="burger-leg-left" x="110" y="240" width="25" height="45" rx="12" fill="#F4B41A" stroke="#C77A00" strokeWidth="4"/>
        <rect className="burger-leg-right" x="165" y="240" width="25" height="45" rx="12" fill="#F4B41A" stroke="#C77A00" strokeWidth="4"/>
      </g>
      <circle cx="30" cy="180" r="14" fill="#F4B41A" stroke="#C77A00" strokeWidth="4"/>
      <path d="M 45 190 C 45 250, 255 250, 255 190 Z" fill="#F4B41A" stroke="#C77A00" strokeWidth="6"/>
      <rect x="40" y="150" width="220" height="45" rx="15" fill="#5D4037" stroke="#3E2723" strokeWidth="6"/>
      <path d="M 45 155 L 75 185 L 105 155 L 135 185 L 165 155 L 195 185 L 225 155 L 255 185 L 250 150 Z" fill="#F1C40F" stroke="#F39C12" strokeWidth="4"/>
      <path d="M 35 140 Q 55 160 75 140 T 115 140 T 155 140 T 195 140 T 235 140 T 265 140 L 265 130 L 35 130 Z" fill="#2ECC71" stroke="#27AE60" strokeWidth="5"/>
      <path d="M 40 140 C 40 10, 260 10, 260 140 Z" fill="#F4B41A" stroke="#C77A00" strokeWidth="6"/>
      <g className="burger-seeds-group">
        <ellipse cx="100" cy="50" rx="4" ry="8" fill="#FFFDE7" opacity="0.8" transform="rotate(25 100 50)"/>
        <ellipse cx="150" cy="35" rx="4" ry="8" fill="#FFFDE7" opacity="0.8" transform="rotate(75 150 35)"/>
        <ellipse cx="200" cy="60" rx="4" ry="8" fill="#FFFDE7" opacity="0.8" transform="rotate(-30 200 60)"/>
        <ellipse cx="70" cy="80" rx="4" ry="8" fill="#FFFDE7" opacity="0.8" transform="rotate(15 70 80)"/>
        <ellipse cx="230" cy="90" rx="4" ry="8" fill="#FFFDE7" opacity="0.8" transform="rotate(-15 230 90)"/>
        <ellipse cx="125" cy="70" rx="4" ry="8" fill="#FFFDE7" opacity="0.8" transform="rotate(45 125 70)"/>
        <ellipse cx="175" cy="55" rx="4" ry="8" fill="#FFFDE7" opacity="0.8" transform="rotate(-20 175 55)"/>
        <ellipse cx="90" cy="110" rx="4" ry="8" fill="#FFFDE7" opacity="0.8" transform="rotate(-40 90 110)"/>
        <ellipse cx="150" cy="95" rx="4" ry="8" fill="#FFFDE7" opacity="0.8" transform="rotate(10 150 95)"/>
        <ellipse cx="210" cy="115" rx="4" ry="8" fill="#FFFDE7" opacity="0.8" transform="rotate(35 210 115)"/>
      </g>
      <g className="burger-face-elements">
        <g className="burger-eyes">
          <circle cx="85" cy="90" r="26" fill="#333"/>
          <circle cx="80" cy="80" r="11" fill="white"/>
          <circle cx="95" cy="100" r="5" fill="white"/>
          <circle cx="215" cy="90" r="26" fill="#333"/>
          <circle cx="210" cy="80" r="11" fill="white"/>
          <circle cx="225" cy="100" r="5" fill="white"/>
        </g>
        <ellipse cx="55" cy="125" rx="18" ry="10" fill="#FFB6C1" opacity="0.8"/>
        <ellipse cx="245" cy="125" rx="18" ry="10" fill="#FFB6C1" opacity="0.8"/>
        <path d="M 110 110 Q 150 170 190 110 Z" fill="white" stroke="#333" strokeWidth="6" strokeLinejoin="round"/>
      </g>
      <g className="burger-phone-arm">
        <rect x="245" y="130" width="35" height="65" rx="6" fill="#FF69B4" stroke="#D1478B" strokeWidth="3" transform="rotate(20 262 162)"/>
        <rect x="249" y="134" width="16" height="16" rx="4" fill="#333" transform="rotate(20 262 162)"/>
        <circle cx="253" cy="138" r="3" fill="#666" transform="rotate(20 262 162)"/>
        <circle cx="261" cy="146" r="3" fill="#666" transform="rotate(20 262 162)"/>
        <circle className="burger-flash-anim" cx="261" cy="138" r="25" fill="#FFFDE7" opacity="0" transform="rotate(20 262 162)"/>
        <circle cx="261" cy="138" r="2" fill="#FFF" transform="rotate(20 262 162)"/>
        <circle cx="270" cy="180" r="14" fill="#F4B41A" stroke="#C77A00" strokeWidth="4"/>
      </g>
    </svg>
  );
}
