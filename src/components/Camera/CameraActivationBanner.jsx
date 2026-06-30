import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { translations } from '../../utils/translations';
import RamenBowl from './RamenBowl';
import './CameraActivationBanner.css';

const KAWAII_VB = "80 130 240 230";
const KAWAII_PHONE_COLORS = {
  cupcake: '#EC4899', cookie: '#8B5CF6', coffee: '#06B6D4', donut: '#F59E0B',
  mintcupcake: '#10B981', icecream: '#EC4899', avocado: '#84CC16',
  strawberry: '#EF4444', lollipop: '#F472B6',
};
const UGC_TRANSFORMS = {
  burger: 'translate(67,122) scale(0.975)',
  taco:   'translate(75,89)  scale(0.975)',
  pizza:  'translate(91,119) scale(0.975)',
};

// Body paths for the 13-character roster, matching the owner-backend CharacterPreview module.
const KawaiiBody = ({ id }) => {
  switch (id) {
    case 'cupcake': return (
      <g>
        <path d="M 160 250 L 172 280 A 8 8 0 0 0 180 286 L 220 286 A 8 8 0 0 0 228 280 L 240 250 Z" fill="#A5B4FC" stroke="#E11D48" strokeWidth="3.5"/>
        <path d="M 160 250 L 152 245 C 135 245, 140 210, 165 210 C 165 195, 235 195, 235 210 C 260 210, 265 245, 248 245 L 240 250 Z" fill="#FCE7F3" stroke="#BE123C" strokeWidth="3" strokeLinejoin="round"/>
        <circle cx="182" cy="228" r="8" fill="#1F2937"/><circle cx="180" cy="225" r="3" fill="#FFF"/>
        <circle cx="218" cy="228" r="8" fill="#1F2937"/><circle cx="216" cy="225" r="3" fill="#FFF"/>
        <path d="M 192 242 Q 200 248 208 242" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="175" cy="242" r="5" fill="#F43F5E" opacity="0.6"/>
        <circle cx="225" cy="242" r="5" fill="#F43F5E" opacity="0.6"/>
        <line x1="200" y1="175" x2="202" y2="160" stroke="#78350F" strokeWidth="1.5"/>
        <circle cx="200" cy="190" r="10" fill="#DC2626" stroke="#991B1B" strokeWidth="2.5"/>
        <line x1="165" y1="238" x2="160" y2="230" stroke="#FDE047" strokeWidth="2" strokeLinecap="round"/>
        <line x1="175" y1="240" x2="170" y2="232" stroke="#EC4899" strokeWidth="2" strokeLinecap="round"/>
        <line x1="235" y1="238" x2="240" y2="230" stroke="#FDE047" strokeWidth="2" strokeLinecap="round"/>
        <line x1="225" y1="240" x2="230" y2="232" stroke="#EC4899" strokeWidth="2" strokeLinecap="round"/>
      </g>
    );
    case 'cookie': return (
      <g>
        <circle cx="200" cy="250" r="45" fill="#D97706" stroke="#78350F" strokeWidth="3.5"/>
        <circle cx="185" cy="235" r="7" fill="#1F2937"/><circle cx="183" cy="232" r="2.5" fill="#FFF"/>
        <circle cx="215" cy="235" r="7" fill="#1F2937"/><circle cx="217" cy="232" r="2.5" fill="#FFF"/>
        <path d="M 192 248 Q 200 253 208 248" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="178" cy="225" r="4" fill="#451A03"/><circle cx="222" cy="225" r="4" fill="#451A03"/>
        <circle cx="200" cy="218" r="3.5" fill="#451A03"/><circle cx="210" cy="270" r="4.5" fill="#451A03"/>
        <circle cx="185" cy="240" r="3" fill="#451A03"/><circle cx="215" cy="245" r="3.5" fill="#451A03"/>
        <circle cx="190" cy="260" r="3" fill="#451A03"/><circle cx="220" cy="260" r="2.5" fill="#451A03"/>
      </g>
    );
    case 'coffee': return (
      <g>
        <path d="M 235 230 C 265 230, 265 270, 235 270" fill="none" stroke="#94A3B8" strokeWidth="8"/>
        <rect x="160" y="210" width="80" height="80" rx="15" fill="#FFF" stroke="#64748B" strokeWidth="3.5"/>
        <circle cx="182" cy="250" r="7" fill="#1F2937"/><circle cx="180" cy="247" r="2.5" fill="#FFF"/>
        <circle cx="218" cy="250" r="7" fill="#1F2937"/><circle cx="216" cy="247" r="2.5" fill="#FFF"/>
        <path d="M 192 262 Q 200 267 208 262" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
      </g>
    );
    case 'donut': return (
      <g>
        <circle cx="200" cy="250" r="45" fill="#F59E0B" stroke="#B45309" strokeWidth="3.5"/>
        <circle cx="200" cy="250" r="16" fill="#FEF3C7" stroke="#B45309" strokeWidth="2"/>
        <circle cx="185" cy="230" r="7" fill="#1F2937"/><circle cx="183" cy="227" r="2.5" fill="#FFF"/>
        <circle cx="215" cy="230" r="7" fill="#1F2937"/><circle cx="217" cy="227" r="2.5" fill="#FFF"/>
        <path d="M 192 243 Q 200 249 208 243" fill="none" stroke="#1F2937" strokeWidth="3" strokeLinecap="round"/>
        <line x1="185" y1="217" x2="183" y2="212" stroke="#EC4899" strokeWidth="2" strokeLinecap="round"/>
        <line x1="215" y1="217" x2="217" y2="212" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round"/>
        <line x1="168" y1="238" x2="162" y2="235" stroke="#FDE047" strokeWidth="2" strokeLinecap="round"/>
        <line x1="232" y1="238" x2="238" y2="235" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="180" cy="235" r="1.5" fill="#EC4899"/>
        <circle cx="220" cy="235" r="1.5" fill="#FDE047"/>
        <circle cx="163" cy="250" r="1.5" fill="#06B6D4"/>
        <circle cx="237" cy="250" r="1.5" fill="#EC4899"/>
      </g>
    );
    case 'mintcupcake': return (
      <g>
        <path d="M 160 250 L 172 280 A 8 8 0 0 0 180 286 L 220 286 A 8 8 0 0 0 228 280 L 240 250 Z" fill="#A5B4FC" stroke="#059669" strokeWidth="3.5"/>
        <path d="M 160 250 L 152 245 C 135 245, 140 210, 165 210 C 165 195, 235 195, 235 210 C 260 210, 265 245, 248 245 L 240 250 Z" fill="#A7F3D0" stroke="#059669" strokeWidth="3" strokeLinejoin="round"/>
        <line x1="200" y1="175" x2="202" y2="160" stroke="#78350F" strokeWidth="1.5"/>
        <circle cx="200" cy="190" r="10" fill="#DC2626" stroke="#991B1B" strokeWidth="2.5"/>
        <circle cx="182" cy="233" r="7" fill="#1F2937"/><circle cx="180" cy="230" r="2.5" fill="#FFF"/>
        <circle cx="218" cy="233" r="7" fill="#1F2937"/><circle cx="216" cy="230" r="2.5" fill="#FFF"/>
        <path d="M 192 245 Q 200 250 208 245" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="168" cy="242" r="5" fill="#F43F5E" opacity="0.6"/>
        <circle cx="232" cy="242" r="5" fill="#F43F5E" opacity="0.6"/>
      </g>
    );
    case 'icecream': return (
      <g>
        <polygon points="175,280 225,280 200,340" fill="#D97706" stroke="#78350F" strokeWidth="3.5" strokeLinejoin="round"/>
        <circle cx="200" cy="270" r="32" fill="#FEF3C7" stroke="#FCD34D" strokeWidth="3.5"/>
        <circle cx="200" cy="225" r="35" fill="#FBCFE8" stroke="#EC4899" strokeWidth="3.5"/>
        <circle cx="200" cy="175" r="33" fill="#A7F3D0" stroke="#10B981" strokeWidth="3.5"/>
        <circle cx="185" cy="163" r="5.5" fill="#1F2937"/><circle cx="183" cy="160" r="2.5" fill="#FFF"/>
        <circle cx="215" cy="163" r="5.5" fill="#1F2937"/><circle cx="217" cy="160" r="2.5" fill="#FFF"/>
        <path d="M 190 172 Q 200 178 210 172" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="185" cy="215" r="6" fill="#1F2937"/><circle cx="183" cy="212" r="2.2" fill="#FFF"/>
        <circle cx="215" cy="215" r="6" fill="#1F2937"/><circle cx="217" cy="212" r="2.2" fill="#FFF"/>
        <path d="M 192 228 Q 200 233 208 228" fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="188" cy="266" r="5" fill="#1F2937"/><circle cx="186" cy="264" r="1.8" fill="#FFF"/>
        <circle cx="212" cy="266" r="5" fill="#1F2937"/><circle cx="214" cy="264" r="1.8" fill="#FFF"/>
        <path d="M 193 275 Q 200 278 207 275" fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round"/>
      </g>
    );
    case 'avocado': return (
      <g>
        <path d="M 200 190 C 160 190, 150 250, 150 270 C 150 295, 172 310, 200 310 C 228 310, 250 295, 250 270 C 250 250, 240 190, 200 190 Z" fill="#22C55E" stroke="#059669" strokeWidth="3.5"/>
        <path d="M 200 198 C 167 198, 158 250, 158 268 C 158 288, 177 301, 200 301 C 223 301, 242 288, 242 268 C 242 250, 233 198, 200 198 Z" fill="#86EFAC" stroke="#166534" strokeWidth="1.5" opacity="0.85"/>
        <circle cx="200" cy="261" r="22" fill="#78350F" stroke="#451A03" strokeWidth="2"/>
        <circle cx="185" cy="230" r="6" fill="#1F2937"/><circle cx="183" cy="227" r="2" fill="#FFF"/>
        <circle cx="215" cy="230" r="6" fill="#1F2937"/><circle cx="213" cy="227" r="2" fill="#FFF"/>
        <path d="M 195 245 Q 200 250 205 245" fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round"/>
      </g>
    );
    case 'strawberry': return (
      <g>
        <path d="M 200 198 Q 150 198 160 260 Q 165 305 200 305 Q 235 305 240 260 Q 250 198 200 198 Z" fill="#EF4444" stroke="#991B1B" strokeWidth="3.5"/>
        <circle cx="185" cy="250" r="7" fill="#1F2937"/><circle cx="183" cy="247" r="2.5" fill="#FFF"/>
        <circle cx="215" cy="250" r="7" fill="#1F2937"/><circle cx="217" cy="247" r="2.5" fill="#FFF"/>
        <path d="M 192 264 Q 200 269 208 264" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="175" cy="270" r="4" fill="#F43F5E" opacity="0.6"/>
        <circle cx="225" cy="270" r="4" fill="#F43F5E" opacity="0.6"/>
        <path d="M 200 198 L 180 185 L 190 198 L 200 180 L 210 198 L 220 185 L 200 198 Z" fill="#22C55E" stroke="#15803D" strokeWidth="1.5"/>
        <ellipse cx="180" cy="230" rx="2" ry="3" fill="#FEF08A" transform="rotate(-10 180 230)"/>
        <ellipse cx="220" cy="230" rx="2" ry="3" fill="#FEF08A" transform="rotate(10 220 230)"/>
        <ellipse cx="175" cy="245" rx="2" ry="3" fill="#FEF08A" transform="rotate(-5 175 245)"/>
        <ellipse cx="225" cy="245" rx="2" ry="3" fill="#FEF08A" transform="rotate(5 225 245)"/>
        <ellipse cx="190" cy="275" rx="2" ry="3" fill="#FEF08A" transform="rotate(-15 190 275)"/>
        <ellipse cx="210" cy="270" rx="2" ry="3" fill="#FEF08A" transform="rotate(10 210 270)"/>
        <ellipse cx="200" cy="220" rx="2" ry="3" fill="#FEF08A"/>
        <ellipse cx="200" cy="285" rx="2" ry="3" fill="#FEF08A"/>
      </g>
    );
    case 'lollipop': return (
      <g>
        <rect x="194" y="270" width="12" height="60" rx="4" fill="#E2E8F0" stroke="#475569" strokeWidth="3"/>
        <circle cx="200" cy="225" r="42" fill="#F472B6" stroke="#9D174D" strokeWidth="3.5"/>
        <circle cx="180" cy="212" r="8" fill="#1F2937"/><circle cx="178" cy="209" r="2.5" fill="#FFF"/>
        <circle cx="220" cy="212" r="8" fill="#1F2937"/><circle cx="222" cy="209" r="2.5" fill="#FFF"/>
        <path d="M 188 228 Q 200 235 212 228" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
      </g>
    );
    case 'burger': return (
      <g>
        <rect className="kw-leg-l" x="110" y="240" width="25" height="45" rx="12" fill="#F4B41A" stroke="#C77A00" strokeWidth="4"/>
        <rect className="kw-leg-r" x="165" y="240" width="25" height="45" rx="12" fill="#F4B41A" stroke="#C77A00" strokeWidth="4"/>
        <g className="kw-arm-l"><circle cx="30" cy="180" r="14" fill="#F4B41A" stroke="#C77A00" strokeWidth="4"/></g>
        <path d="M 45 190 C 45 250, 255 250, 255 190 Z" fill="#F4B41A" stroke="#C77A00" strokeWidth="6"/>
        <rect x="40" y="150" width="220" height="45" rx="15" fill="#5D4037" stroke="#3E2723" strokeWidth="6"/>
        <path d="M 45 155 L 75 185 L 105 155 L 135 185 L 165 155 L 195 185 L 225 155 L 255 185 L 250 150 Z" fill="#F1C40F" stroke="#F39C12" strokeWidth="4"/>
        <path d="M 35 140 Q 55 160 75 140 T 115 140 T 155 140 T 195 140 T 235 140 T 265 140 L 265 130 L 35 130 Z" fill="#2ECC71" stroke="#27AE60" strokeWidth="5"/>
        <path d="M 40 140 C 40 10, 260 10, 260 140 Z" fill="#F4B41A" stroke="#C77A00" strokeWidth="6"/>
        <ellipse cx="100" cy="50" rx="4" ry="8" fill="#FFFDE7" opacity="0.8" transform="rotate(25 100 50)"/>
        <ellipse cx="150" cy="35" rx="4" ry="8" fill="#FFFDE7" opacity="0.8" transform="rotate(75 150 35)"/>
        <ellipse cx="200" cy="60" rx="4" ry="8" fill="#FFFDE7" opacity="0.8" transform="rotate(-30 200 60)"/>
        <circle cx="85" cy="90" r="26" fill="#333"/><circle cx="80" cy="80" r="11" fill="white"/><circle cx="95" cy="100" r="5" fill="white"/>
        <circle cx="215" cy="90" r="26" fill="#333"/><circle cx="210" cy="80" r="11" fill="white"/><circle cx="225" cy="100" r="5" fill="white"/>
        <ellipse cx="55" cy="125" rx="18" ry="10" fill="#FFB6C1" opacity="0.8"/>
        <ellipse cx="245" cy="125" rx="18" ry="10" fill="#FFB6C1" opacity="0.8"/>
        <path d="M 110 110 Q 150 170 190 110 Z" fill="white" stroke="#333" strokeWidth="6" strokeLinejoin="round"/>
        <g className="kw-arm-r">
          <rect x="245" y="130" width="35" height="65" rx="6" fill="#FF69B4" stroke="#D1478B" strokeWidth="3" transform="rotate(20 262 162)"/>
          <rect x="249" y="134" width="16" height="16" rx="4" fill="#333" transform="rotate(20 262 162)"/>
          <circle cx="253" cy="138" r="3" fill="#666" transform="rotate(20 262 162)"/>
          <circle cx="261" cy="146" r="3" fill="#666" transform="rotate(20 262 162)"/>
          <circle className="kw-flash" cx="261" cy="138" r="25" fill="#FFFDE7" opacity="0" transform="rotate(20 262 162)"/>
          <circle cx="261" cy="138" r="2" fill="#FFF" transform="rotate(20 262 162)"/>
          <circle cx="270" cy="180" r="14" fill="#F4B41A" stroke="#C77A00" strokeWidth="4"/>
        </g>
      </g>
    );
    case 'taco': return (
      <g>
        <rect className="kw-leg-l" x="110" y="240" width="25" height="45" rx="12" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
        <rect className="kw-leg-r" x="165" y="240" width="25" height="45" rx="12" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
        <g className="kw-arm-l"><circle cx="20" cy="180" r="14" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/></g>
        <path d="M 25 100 C 25 250, 275 250, 275 100 Z" fill="#E67E22" stroke="#D35400" strokeWidth="6"/>
        <path d="M 35 100 Q 55 70 85 90 T 150 75 T 215 90 T 265 100 Z" fill="#6D4C41" stroke="#4E342E" strokeWidth="4"/>
        <path d="M 40 90 Q 50 60 70 80 T 110 50 T 150 70 T 190 50 T 230 75 T 260 90 Z" fill="#8BC34A" stroke="#689F38" strokeWidth="4"/>
        <path d="M 35 120 C 35 270, 265 270, 265 120 Z" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="6"/>
        <circle cx="95" cy="160" r="26" fill="#333"/><circle cx="90" cy="150" r="11" fill="white"/><circle cx="105" cy="170" r="5" fill="white"/>
        <circle cx="205" cy="160" r="26" fill="#333"/><circle cx="200" cy="150" r="11" fill="white"/><circle cx="215" cy="170" r="5" fill="white"/>
        <ellipse cx="65" cy="195" rx="18" ry="10" fill="#FFB6C1" opacity="0.8"/>
        <ellipse cx="235" cy="195" rx="18" ry="10" fill="#FFB6C1" opacity="0.8"/>
        <path d="M 120 180 Q 150 240 180 180 Z" fill="white" stroke="#333" strokeWidth="6" strokeLinejoin="round"/>
        <g className="kw-arm-r">
          <rect x="245" y="130" width="35" height="65" rx="6" fill="#FF69B4" stroke="#D1478B" strokeWidth="3" transform="rotate(20 262 162)"/>
          <rect x="249" y="134" width="16" height="16" rx="4" fill="#333" transform="rotate(20 262 162)"/>
          <circle cx="253" cy="138" r="3" fill="#666" transform="rotate(20 262 162)"/>
          <circle cx="261" cy="146" r="3" fill="#666" transform="rotate(20 262 162)"/>
          <circle className="kw-flash" cx="261" cy="138" r="25" fill="#FFFDE7" opacity="0" transform="rotate(20 262 162)"/>
          <circle cx="261" cy="138" r="2" fill="#FFF" transform="rotate(20 262 162)"/>
          <circle cx="270" cy="180" r="14" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
        </g>
      </g>
    );
    case 'pizza': return (
      <g>
        <rect className="kw-leg-l" x="110" y="230" width="25" height="45" rx="12" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
        <rect className="kw-leg-r" x="165" y="230" width="25" height="45" rx="12" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
        <g className="kw-arm-l"><circle cx="65" cy="180" r="14" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/></g>
        <path d="M 5 75 Q 150 25 295 75 Q 315 95 285 105 Q 150 70 15 105 Q -15 95 5 75 Z" fill="#E67E22" stroke="#D35400" strokeWidth="6" strokeLinejoin="round"/>
        <path d="M 15 100 Q 150 65 285 100 L 195 240 Q 150 270 105 240 Z" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="6" strokeLinejoin="round"/>
        <circle cx="125" cy="110" r="16" fill="#E53935" stroke="#C62828" strokeWidth="4"/>
        <circle cx="230" cy="120" r="15" fill="#E53935" stroke="#C62828" strokeWidth="4"/>
        <circle cx="70" cy="140" r="15" fill="#E53935" stroke="#C62828" strokeWidth="4"/>
        <circle cx="150" cy="135" r="14" fill="#E53935" stroke="#C62828" strokeWidth="4"/>
        <circle cx="95" cy="160" r="13" fill="#E53935" stroke="#C62828" strokeWidth="4"/>
        <circle cx="195" cy="150" r="13" fill="#E53935" stroke="#C62828" strokeWidth="4"/>
        <circle cx="95" cy="160" r="26" fill="#333"/><circle cx="90" cy="150" r="11" fill="white"/><circle cx="105" cy="170" r="5" fill="white"/>
        <circle cx="205" cy="160" r="26" fill="#333"/><circle cx="200" cy="150" r="11" fill="white"/><circle cx="215" cy="170" r="5" fill="white"/>
        <path d="M 120 185 Q 150 245 180 185 Z" fill="white" stroke="#333" strokeWidth="6" strokeLinejoin="round"/>
        <g className="kw-arm-r">
          <rect x="210" y="130" width="35" height="65" rx="6" fill="#FF69B4" stroke="#D1478B" strokeWidth="3" transform="rotate(20 227 162)"/>
          <rect x="214" y="134" width="16" height="16" rx="4" fill="#333" transform="rotate(20 227 162)"/>
          <circle cx="218" cy="138" r="3" fill="#666" transform="rotate(20 227 162)"/>
          <circle cx="226" cy="146" r="3" fill="#666" transform="rotate(20 227 162)"/>
          <circle className="kw-flash" cx="226" cy="138" r="25" fill="#FFFDE7" opacity="0" transform="rotate(20 227 162)"/>
          <circle cx="226" cy="138" r="2" fill="#FFF" transform="rotate(20 227 162)"/>
          <circle cx="235" cy="180" r="14" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
        </g>
      </g>
    );
    default: return null;
  }
};

// Full animated character: Kawaii skeleton (legs/arms/phone) wraps the 9 plain bodies;
// burger/taco/pizza bodies are self-contained (own legs/arms) so they render via transform only.
const KawaiiCharacter = ({ id }) => {
  const isUGC = id in UGC_TRANSFORMS;
  return (
    <svg viewBox={KAWAII_VB} style={{ width: '100%', maxWidth: '200px', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
      {isUGC ? (
        <g transform={UGC_TRANSFORMS[id]}>
          <KawaiiBody id={id} />
        </g>
      ) : (
        <>
          {id !== 'lollipop' && (
            <>
              <g className="kw-leg-l">
                <line x1="180" y1="290" x2="175" y2="315" stroke="#1F2937" strokeWidth="7" strokeLinecap="round"/>
                <circle cx="173" cy="315" r="5" fill="#1F2937"/>
              </g>
              <g className="kw-leg-r">
                <line x1="220" y1="290" x2="225" y2="315" stroke="#1F2937" strokeWidth="7" strokeLinecap="round"/>
                <circle cx="227" cy="315" r="5" fill="#1F2937"/>
              </g>
            </>
          )}
          <g className="kw-arm-l">
            <path d="M 165 260 Q 140 255 142 240" fill="none" stroke="#1F2937" strokeWidth="5" strokeLinecap="round"/>
            <circle cx="142" cy="238" r="6.5" fill="#FFF" stroke="#1F2937" strokeWidth="2"/>
          </g>
          <g className="kw-arm-r">
            <path d="M 235 260 Q 255 265 258 280" fill="none" stroke="#1F2937" strokeWidth="5" strokeLinecap="round"/>
            <circle cx="258" cy="280" r="6.5" fill="#FFF" stroke="#1F2937" strokeWidth="2"/>
            <g transform="translate(258,265) rotate(18) scale(1.5)">
              <rect x="0" y="0" width="18" height="30" rx="4.5" fill={KAWAII_PHONE_COLORS[id]} stroke="#1E293B" strokeWidth="2"/>
              <rect x="3" y="3" width="12" height="12" rx="3.5" fill={KAWAII_PHONE_COLORS[id]} stroke="#1E293B" strokeWidth="1.5" opacity="0.7"/>
              <circle cx="6.5" cy="6.5" r="2.5" fill="#0F172A"/><circle cx="6.5" cy="6.5" r="1.2" fill="#475569"/>
              <circle cx="6.5" cy="11.5" r="2.5" fill="#0F172A"/><circle cx="6.5" cy="11.5" r="1.2" fill="#475569"/>
              <circle cx="11.5" cy="9" r="1.5" fill="#FEF08A"/>
            </g>
            <circle className="kw-flash" cx="270" cy="267" r="18" fill="#FFFDE7"/>
          </g>
          <KawaiiBody id={id} />
        </>
      )}
    </svg>
  );
};

// 13-character roster — one is randomly selected per banner load
const CHARACTERS = [
  'cupcake', 'cookie', 'coffee', 'donut', 'mintcupcake', 'icecream',
  'avocado', 'strawberry', 'lollipop', 'burger', 'taco', 'pizza', 'ramen',
];

export default function CameraActivationBanner({
  onCapture,
  onDismiss,
  className = '',
  orderType = 'delivery',
  character: characterProp,
}) {
  const { lang } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);

  // Pick ONE random character when the banner loads and keep it visible.
  // On page refresh, a new random character is selected.
  const [charIndex] = useState(() => {
    if (characterProp && CHARACTERS.includes(characterProp)) {
      return CHARACTERS.indexOf(characterProp);
    }
    return Math.floor(Math.random() * CHARACTERS.length);
  });

  const character = CHARACTERS[charIndex];

  const handleCapture = () => {
    onCapture?.();
  };

  const handleDismiss = () => {
    onDismiss?.();
    setTimeout(() => setIsVisible(false), 100);
  };

  if (!isVisible) return null;

  const isDineIn = orderType === 'dine_in';

  // Pick a random UGC prompt (1-8) to match the character
  const idx = Math.floor(Math.random() * 8) + 1;
  const randomPrompt = translations[`ugc_prompt_${idx}`]?.[lang] || "Food's here. Snap it?";

  const speechText = isDineIn
    ? `${translations.selfie_prompt?.[lang] || 'Want to take a selfie for the gram?'} 📸`
    : `${randomPrompt} ✨`;

  const renderCharacter = () => {
    switch (character) {
      case 'ramen': return <RamenBowl />;
      case 'cupcake': case 'cookie': case 'coffee': case 'donut': case 'mintcupcake':
      case 'icecream': case 'avocado': case 'strawberry': case 'lollipop':
      case 'burger': case 'taco': case 'pizza':
        return (
          <div className={character === 'lollipop' ? 'kw-lollipop-hop' : 'kw-waddle'}>
            <KawaiiCharacter id={character} />
          </div>
        );
      default: return (
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
            <path d="M130 190C130 190 140 210 150 210C160 210 170 190 170 190" stroke="#333" strokeWidth="7" strokeLinecap="round" fill="none"/>
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
            <circle className="camera-flash" cx="215" cy="217" r="10" fill="none" stroke="#ffff00" strokeWidth="1" opacity="0.6"/>
            <circle cx="240" cy="205" r="3" fill="#ff4d4d"/>
          </g>
        </svg>
      );
    }
  };

  return (
    <>

      {/* Character modal - walks in and bounces */}
      <div className={`camera-activation-banner ${className}`}>
        <div className="banner-donut-wrapper">
          <div className="donut-entry">
            {/* Speech bubble ABOVE character */}
            <div className="speech-bubble">{speechText}</div>

            {renderCharacter()}

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
