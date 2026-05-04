import React from 'react';

export default function PizzaBoy() {
  return (
    <svg className="pizza-character" width="175" height="204" viewBox="0 -40 300 350" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className="pizza-legs">
        <rect className="pizza-leg-left" x="110" y="230" width="25" height="45" rx="12" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
        <rect className="pizza-leg-right" x="165" y="230" width="25" height="45" rx="12" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
      </g>
      <circle cx="65" cy="180" r="14" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
      <path d="M 5 75 Q 150 25 295 75 Q 315 95 285 105 Q 150 70 15 105 Q -15 95 5 75 Z" fill="#E67E22" stroke="#D35400" strokeWidth="6" strokeLinejoin="round"/>
      <path d="M 15 100 Q 150 65 285 100 L 195 240 Q 150 270 105 240 Z" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="6" strokeLinejoin="round"/>
      <path className="pizza-drip-1" d="M 120 248 Q 125 275 135 254" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="5" strokeLinejoin="round"/>
      <path className="pizza-drip-2" d="M 160 252 Q 170 280 180 245" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="5" strokeLinejoin="round"/>
      <path className="pizza-drip-3" d="M 40 92 Q 50 115 65 87" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4" strokeLinejoin="round"/>
      <path className="pizza-drip-4" d="M 230 87 Q 245 110 260 92" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4" strokeLinejoin="round"/>
      <path className="pizza-drip-5" d="M 90 80 Q 100 110 115 77" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4" strokeLinejoin="round"/>
      <circle className="pizza-drop-anim-1" cx="127" cy="275" r="3.5" fill="#F4D03F" />
      <circle className="pizza-drop-anim-2" cx="170" cy="280" r="4" fill="#F4D03F" />
      <g className="pizza-parallax-elements">
        <path d="M 120 110 Q 140 105 130 130 Q 110 125 120 110 Z" fill="#FFE082" opacity="0.8"/>
        <path d="M 180 160 Q 200 150 195 175 Q 170 170 180 160 Z" fill="#FFE082" opacity="0.8"/>
        <path d="M 90 180 Q 110 175 105 195 Q 85 190 90 180 Z" fill="#FFE082" opacity="0.8"/>
        <path d="M 155 125 Q 165 115 175 130" fill="none" stroke="#4CAF50" strokeWidth="35" strokeLinecap="round"/>
        <path d="M 85 155 Q 75 170 90 180" fill="none" stroke="#4CAF50" strokeWidth="35" strokeLinecap="round"/>
        <path d="M 175 200 Q 190 195 185 215" fill="none" stroke="#4CAF50" strokeWidth="35" strokeLinecap="round"/>
        <path d="M 225 155 Q 215 140 200 150" fill="none" stroke="#4CAF50" strokeWidth="35" strokeLinecap="round"/>
        <path d="M 130 140 Q 145 150 155 135" fill="none" stroke="#AB47BC" strokeWidth="30" strokeLinecap="round"/>
        <path d="M 100 185 Q 115 195 110 210" fill="none" stroke="#AB47BC" strokeWidth="30" strokeLinecap="round"/>
        <path d="M 200 120 Q 215 125 210 140" fill="none" stroke="#AB47BC" strokeWidth="30" strokeLinecap="round"/>
        <path d="M 150 205 Q 165 195 175 210" fill="none" stroke="#AB47BC" strokeWidth="30" strokeLinecap="round"/>
        <circle cx="105" cy="130" r="6" fill="#222"/><circle cx="105" cy="130" r="2.5" fill="#F4D03F"/><path d="M 102 127 Q 105 126 108 127" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        <circle cx="180" cy="140" r="6" fill="#222"/><circle cx="180" cy="140" r="2.5" fill="#F4D03F"/><path d="M 177 137 Q 180 136 183 137" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        <circle cx="215" cy="185" r="6" fill="#222"/><circle cx="215" cy="185" r="2.5" fill="#F4D03F"/><path d="M 212 182 Q 215 181 218 182" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        <circle cx="125" cy="110" r="16" fill="#E53935" stroke="#C62828" strokeWidth="4"/>
        <circle cx="230" cy="120" r="15" fill="#E53935" stroke="#C62828" strokeWidth="4"/>
        <circle cx="70" cy="140" r="15" fill="#E53935" stroke="#C62828" strokeWidth="4"/>
        <circle cx="110" cy="205" r="14" fill="#E53935" stroke="#C62828" strokeWidth="4"/>
      </g>
      <g className="pizza-face-elements">
        <g className="pizza-eyes">
          <circle cx="95" cy="160" r="26" fill="#333"/>
          <circle cx="90" cy="150" r="11" fill="white"/>
          <circle cx="105" cy="170" r="5" fill="white"/>
          <circle cx="205" cy="160" r="26" fill="#333"/>
          <circle cx="200" cy="150" r="11" fill="white"/>
          <circle cx="215" cy="170" r="5" fill="white"/>
        </g>
        <path d="M 120 185 Q 150 245 180 185 Z" fill="white" stroke="#333" strokeWidth="6" strokeLinejoin="round"/>
      </g>
      <g className="pizza-phone-arm">
        <rect x="210" y="130" width="35" height="65" rx="6" fill="#FF69B4" stroke="#D1478B" strokeWidth="3" transform="rotate(20 227 162)"/>
        <rect x="214" y="134" width="16" height="16" rx="4" fill="#333" transform="rotate(20 227 162)"/>
        <circle cx="218" cy="138" r="3" fill="#666" transform="rotate(20 227 162)"/>
        <circle cx="226" cy="146" r="3" fill="#666" transform="rotate(20 227 162)"/>
        <circle className="pizza-flash-anim" cx="226" cy="138" r="25" fill="#FFFDE7" opacity="0" transform="rotate(20 227 162)"/>
        <circle cx="226" cy="138" r="2" fill="#FFF" transform="rotate(20 227 162)"/>
        <circle cx="235" cy="180" r="14" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
      </g>
    </svg>
  );
}
