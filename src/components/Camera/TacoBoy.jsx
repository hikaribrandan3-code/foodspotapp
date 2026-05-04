import React from 'react';

export default function TacoBoy() {
  return (
    <svg className="taco-character" width="175" height="204" viewBox="0 -40 300 350" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className="taco-legs">
        <rect className="taco-leg-left" x="110" y="240" width="25" height="45" rx="12" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
        <rect className="taco-leg-right" x="165" y="240" width="25" height="45" rx="12" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
      </g>
      <circle cx="20" cy="180" r="14" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
      <path d="M 25 100 C 25 250, 275 250, 275 100 Z" fill="#E67E22" stroke="#D35400" strokeWidth="6"/>
      <g className="taco-fillings">
        <path d="M 35 100 Q 55 70 85 90 T 150 75 T 215 90 T 265 100 Z" fill="#6D4C41" stroke="#4E342E" strokeWidth="4"/>
        <rect x="70" y="65" width="25" height="25" rx="8" fill="#E53935" stroke="#C62828" strokeWidth="4" transform="rotate(15 82 77)"/>
        <rect x="140" y="60" width="25" height="25" rx="8" fill="#E53935" stroke="#C62828" strokeWidth="4" transform="rotate(-10 152 72)"/>
        <rect x="210" y="70" width="25" height="25" rx="8" fill="#E53935" stroke="#C62828" strokeWidth="4" transform="rotate(25 222 82)"/>
        <path d="M 40 90 Q 50 60 70 80 T 110 50 T 150 70 T 190 50 T 230 75 T 260 90 Z" fill="#8BC34A" stroke="#689F38" strokeWidth="4"/>
      </g>
      <path d="M 35 120 C 35 270, 265 270, 265 120 Z" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="6"/>
      <g className="taco-parallax-elements">
        <circle cx="80" cy="220" r="4" fill="#D4AC0D" opacity="0.6"/>
        <circle cx="60" cy="150" r="5" fill="#D4AC0D" opacity="0.6"/>
        <circle cx="220" cy="230" r="6" fill="#D4AC0D" opacity="0.6"/>
        <circle cx="240" cy="160" r="4" fill="#D4AC0D" opacity="0.6"/>
        <circle cx="120" cy="245" r="4" fill="#D4AC0D" opacity="0.6"/>
        <circle cx="180" cy="255" r="5" fill="#D4AC0D" opacity="0.6"/>
      </g>
      <g className="taco-face-elements">
        <g className="taco-eyes">
          <circle cx="95" cy="160" r="26" fill="#333"/>
          <circle cx="90" cy="150" r="11" fill="white"/>
          <circle cx="105" cy="170" r="5" fill="white"/>
          <circle cx="205" cy="160" r="26" fill="#333"/>
          <circle cx="200" cy="150" r="11" fill="white"/>
          <circle cx="215" cy="170" r="5" fill="white"/>
        </g>
        <ellipse cx="65" cy="195" rx="18" ry="10" fill="#FFB6C1" opacity="0.8"/>
        <ellipse cx="235" cy="195" rx="18" ry="10" fill="#FFB6C1" opacity="0.8"/>
        <path d="M 120 180 Q 150 240 180 180 Z" fill="white" stroke="#333" strokeWidth="6" strokeLinejoin="round"/>
      </g>
      <g className="taco-phone-arm">
        <rect x="245" y="130" width="35" height="65" rx="6" fill="#FF69B4" stroke="#D1478B" strokeWidth="3" transform="rotate(20 262 162)"/>
        <rect x="249" y="134" width="16" height="16" rx="4" fill="#333" transform="rotate(20 262 162)"/>
        <circle cx="253" cy="138" r="3" fill="#666" transform="rotate(20 262 162)"/>
        <circle cx="261" cy="146" r="3" fill="#666" transform="rotate(20 262 162)"/>
        <circle className="taco-flash-anim" cx="261" cy="138" r="25" fill="#FFFDE7" opacity="0" transform="rotate(20 262 162)"/>
        <circle cx="261" cy="138" r="2" fill="#FFF" transform="rotate(20 262 162)"/>
        <circle cx="270" cy="180" r="14" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
      </g>
    </svg>
  );
}
