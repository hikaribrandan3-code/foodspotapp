import { useState } from 'react';

const characters = [
  { id: 'cupcake',    name: 'Cupcake',    phoneColor: '#EC4899' },
  { id: 'cookie',     name: 'Cookie',     phoneColor: '#8B5CF6' },
  { id: 'coffee',     name: 'Coffee',     phoneColor: '#06B6D4' },
  { id: 'donut',      name: 'Donut',      phoneColor: '#F59E0B' },
  { id: 'mintcupcake',name: 'Mint Cupcake',phoneColor: '#10B981' },
  { id: 'icecream',   name: 'Ice Cream',  phoneColor: '#EC4899' },
  { id: 'avocado',    name: 'Avocado',    phoneColor: '#84CC16' },
  { id: 'strawberry', name: 'Strawberry', phoneColor: '#EF4444' },
  { id: 'tennis',     name: 'Tennis',     phoneColor: '#A3E635' },
  { id: 'lollipop',   name: 'Lollipop',   phoneColor: '#F472B6' },
  { id: 'taco',       name: 'Taco',       phoneColor: '#FF69B4', isUGC: true },
  { id: 'pizza',      name: 'Pizza',      phoneColor: '#FF69B4', isUGC: true },
];

const CharacterBody = ({ id }) => {
  switch (id) {
    case 'cupcake': return (
      <g>
        <path d="M 160 250 L 172 280 A 8 8 0 0 0 180 286 L 220 286 A 8 8 0 0 0 228 280 L 240 250 Z" fill="#A5B4FC" stroke="#E11D48" strokeWidth="3.5"/>
        <path d="M 160 250 L 152 245 C 135 245, 140 210, 165 210 C 165 195, 235 195, 235 210 C 260 210, 265 245, 248 245 L 240 250 Z" fill="#FCE7F3" stroke="#BE123C" strokeWidth="3" strokeLinejoin="round"/>
        <circle cx="182" cy="228" r="8" fill="#1F2937"/><circle cx="180" cy="225" r="3" fill="#FFFFFF"/>
        <circle cx="218" cy="228" r="8" fill="#1F2937"/><circle cx="216" cy="225" r="3" fill="#FFFFFF"/>
        <path d="M 192 242 Q 200 248 208 242" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="175" cy="256" r="5" fill="#F43F5E" opacity="0.6"/>
        <circle cx="225" cy="256" r="5" fill="#F43F5E" opacity="0.6"/>
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
        <circle cx="185" cy="235" r="7" fill="#1F2937"/><circle cx="183" cy="232" r="2.5" fill="#FFFFFF"/>
        <circle cx="215" cy="235" r="7" fill="#1F2937"/><circle cx="217" cy="232" r="2.5" fill="#FFFFFF"/>
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
        <rect x="160" y="210" width="80" height="80" rx="15" fill="#FFFFFF" stroke="#64748B" strokeWidth="3.5"/>
        <circle cx="182" cy="250" r="7" fill="#1F2937"/><circle cx="180" cy="247" r="2.5" fill="#FFFFFF"/>
        <circle cx="218" cy="250" r="7" fill="#1F2937"/><circle cx="216" cy="247" r="2.5" fill="#FFFFFF"/>
        <path d="M 192 262 Q 200 267 208 262" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
      </g>
    );
    case 'donut': return (
      <g>
        <circle cx="200" cy="250" r="45" fill="#F59E0B" stroke="#B45309" strokeWidth="3.5"/>
        <circle cx="200" cy="250" r="16" fill="#FEF3C7" stroke="#B45309" strokeWidth="2"/>
        <circle cx="185" cy="230" r="7" fill="#1F2937"/><circle cx="183" cy="227" r="2.5" fill="#FFFFFF"/>
        <circle cx="215" cy="230" r="7" fill="#1F2937"/><circle cx="217" cy="227" r="2.5" fill="#FFFFFF"/>
        <path d="M 192 243 Q 200 249 208 243" fill="none" stroke="#1F2937" strokeWidth="3" strokeLinecap="round"/>
        <line x1="185" y1="217" x2="183" y2="212" stroke="#EC4899" strokeWidth="2" strokeLinecap="round"/>
        <line x1="215" y1="217" x2="217" y2="212" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round"/>
        <line x1="168" y1="238" x2="162" y2="235" stroke="#FDE047" strokeWidth="2" strokeLinecap="round"/>
        <line x1="232" y1="238" x2="238" y2="235" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round"/>
        <line x1="190" y1="283" x2="188" y2="290" stroke="#FDE047" strokeWidth="2" strokeLinecap="round"/>
        <line x1="210" y1="283" x2="212" y2="290" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round"/>
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
        <circle cx="182" cy="233" r="7" fill="#1F2937"/><circle cx="180" cy="230" r="2.5" fill="#FFFFFF"/>
        <circle cx="218" cy="233" r="7" fill="#1F2937"/><circle cx="216" cy="230" r="2.5" fill="#FFFFFF"/>
        <path d="M 192 245 Q 200 250 208 245" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="168" cy="242" r="5" fill="#F43F5E" opacity="0.6"/>
        <circle cx="232" cy="242" r="5" fill="#F43F5E" opacity="0.6"/>
      </g>
    );
    case 'icecream': return (
      <g>
        <polygon points="175,280 225,280 200,340" fill="#D97706" stroke="#78350F" strokeWidth="3.5" strokeLinejoin="round"/>
        <line x1="185" y1="290" x2="215" y2="290" stroke="#B45309" strokeWidth="1.5" opacity="0.6"/>
        <line x1="183" y1="305" x2="217" y2="305" stroke="#B45309" strokeWidth="1.5" opacity="0.6"/>
        <circle cx="200" cy="270" r="32" fill="#FEF3C7" stroke="#FCD34D" strokeWidth="3.5"/>
        <circle cx="200" cy="225" r="35" fill="#FBCFE8" stroke="#EC4899" strokeWidth="3.5"/>
        <circle cx="200" cy="175" r="33" fill="#A7F3D0" stroke="#10B981" strokeWidth="3.5"/>
        <circle cx="185" cy="163" r="5.5" fill="#1F2937"/><circle cx="183" cy="160" r="2.5" fill="#FFFFFF"/>
        <circle cx="215" cy="163" r="5.5" fill="#1F2937"/><circle cx="217" cy="160" r="2.5" fill="#FFFFFF"/>
        <path d="M 190 172 Q 200 178 210 172" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="185" cy="215" r="6" fill="#1F2937"/><circle cx="183" cy="212" r="2.2" fill="#FFFFFF"/>
        <circle cx="215" cy="215" r="6" fill="#1F2937"/><circle cx="217" cy="212" r="2.2" fill="#FFFFFF"/>
        <path d="M 192 228 Q 200 233 208 228" fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="188" cy="266" r="5" fill="#1F2937"/><circle cx="186" cy="264" r="1.8" fill="#FFFFFF"/>
        <circle cx="212" cy="266" r="5" fill="#1F2937"/><circle cx="214" cy="264" r="1.8" fill="#FFFFFF"/>
        <path d="M 193 275 Q 200 278 207 275" fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round"/>
      </g>
    );
    case 'avocado': return (
      <g>
        <path d="M 200 190 C 160 190, 150 250, 150 270 C 150 295, 172 310, 200 310 C 228 310, 250 295, 250 270 C 250 250, 240 190, 200 190 Z" fill="#22C55E" stroke="#059669" strokeWidth="3.5"/>
        <path d="M 200 198 C 167 198, 158 250, 158 268 C 158 288, 177 301, 200 301 C 223 301, 242 288, 242 268 C 242 250, 233 198, 200 198 Z" fill="#86EFAC" stroke="#166534" strokeWidth="1.5" opacity="0.85"/>
        <circle cx="200" cy="261" r="22" fill="#78350F" stroke="#451A03" strokeWidth="2"/>
        <circle cx="185" cy="230" r="6" fill="#1F2937"/><circle cx="183" cy="227" r="2" fill="#FFFFFF"/>
        <circle cx="215" cy="230" r="6" fill="#1F2937"/><circle cx="213" cy="227" r="2" fill="#FFFFFF"/>
        <path d="M 195 245 Q 200 250 205 245" fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round"/>
      </g>
    );
    case 'strawberry': return (
      <g>
        <path d="M 200 198 Q 150 198 160 260 Q 165 305 200 305 Q 235 305 240 260 Q 250 198 200 198 Z" fill="#EF4444" stroke="#991B1B" strokeWidth="3.5"/>
        <circle cx="185" cy="250" r="7" fill="#1F2937"/><circle cx="183" cy="247" r="2.5" fill="#FFFFFF"/>
        <circle cx="215" cy="250" r="7" fill="#1F2937"/><circle cx="217" cy="247" r="2.5" fill="#FFFFFF"/>
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
    case 'tennis': return (
      <g>
        <circle cx="200" cy="250" r="40" fill="#A3E635" stroke="#4D7C0F" strokeWidth="3.5"/>
        <circle cx="185" cy="240" r="7" fill="#1F2937"/><circle cx="183" cy="237" r="2.5" fill="#FFFFFF"/>
        <circle cx="215" cy="240" r="7" fill="#1F2937"/><circle cx="217" cy="237" r="2.5" fill="#FFFFFF"/>
        <path d="M 192 255 Q 200 260 208 255" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M 168 226 A 40 40 0 0 1 168 274" fill="none" stroke="#FFFFFF" strokeWidth="3.5"/>
        <path d="M 232 226 A 40 40 0 0 0 232 274" fill="none" stroke="#FFFFFF" strokeWidth="3.5"/>
      </g>
    );
    case 'lollipop': return (
      <g>
        <rect x="196" y="280" width="8" height="40" rx="3" fill="#E2E8F0" stroke="#475569" strokeWidth="2"/>
        <circle cx="200" cy="245" r="40" fill="#F472B6" stroke="#9D174D" strokeWidth="3.5"/>
        <circle cx="182" cy="235" r="7" fill="#1F2937"/><circle cx="180" cy="233" r="2.5" fill="#FFFFFF"/>
        <circle cx="218" cy="235" r="7" fill="#1F2937"/><circle cx="220" cy="233" r="2.5" fill="#FFFFFF"/>
        <path d="M 190 248 Q 200 253 210 248" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
      </g>
    );
    case 'taco': return (
      <g transform="translate(-50, 40) scale(1)">
        <rect x="110" y="240" width="25" height="45" rx="12" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
        <rect x="165" y="240" width="25" height="45" rx="12" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
        <path d="M 25 100 C 25 250, 275 250, 275 100 Z" fill="#E67E22" stroke="#D35400" strokeWidth="6"/>
        <path d="M 35 100 Q 55 70 85 90 T 150 75 T 215 90 T 265 100 Z" fill="#6D4C41" stroke="#4E342E" strokeWidth="4"/>
        <path d="M 40 90 Q 50 60 70 80 T 110 50 T 150 70 T 190 50 T 230 75 T 260 90 Z" fill="#8BC34A" stroke="#689F38" strokeWidth="4"/>
        <path d="M 35 120 C 35 270, 265 270, 265 120 Z" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="6"/>
        <circle cx="95" cy="160" r="26" fill="#333"/>
        <circle cx="90" cy="150" r="11" fill="white"/>
        <circle cx="105" cy="170" r="5" fill="white"/>
        <circle cx="205" cy="160" r="26" fill="#333"/>
        <circle cx="200" cy="150" r="11" fill="white"/>
        <circle cx="215" cy="170" r="5" fill="white"/>
        <ellipse cx="65" cy="195" rx="18" ry="10" fill="#FFB6C1" opacity="0.8"/>
        <ellipse cx="235" cy="195" rx="18" ry="10" fill="#FFB6C1" opacity="0.8"/>
        <path d="M 120 180 Q 150 240 180 180 Z" fill="white" stroke="#333" strokeWidth="6" strokeLinejoin="round"/>
      </g>
    );
    case 'pizza': return (
      <g transform="translate(-50, 40) scale(1)">
        <rect x="110" y="230" width="25" height="45" rx="12" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
        <rect x="165" y="230" width="25" height="45" rx="12" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="4"/>
        <path d="M 5 75 Q 150 25 295 75 Q 315 95 285 105 Q 150 70 15 105 Q -15 95 5 75 Z" fill="#E67E22" stroke="#D35400" strokeWidth="6" strokeLinejoin="round"/>
        <path d="M 15 100 Q 150 65 285 100 L 195 240 Q 150 270 105 240 Z" fill="#F4D03F" stroke="#D4AC0D" strokeWidth="6" strokeLinejoin="round"/>
        <circle cx="125" cy="110" r="16" fill="#E53935" stroke="#C62828" strokeWidth="4"/>
        <circle cx="230" cy="120" r="15" fill="#E53935" stroke="#C62828" strokeWidth="4"/>
        <circle cx="70" cy="140" r="15" fill="#E53935" stroke="#C62828" strokeWidth="4"/>
        <circle cx="95" cy="160" r="26" fill="#333"/>
        <circle cx="90" cy="150" r="11" fill="white"/>
        <circle cx="105" cy="170" r="5" fill="white"/>
        <circle cx="205" cy="160" r="26" fill="#333"/>
        <circle cx="200" cy="150" r="11" fill="white"/>
        <circle cx="215" cy="170" r="5" fill="white"/>
        <path d="M 120 185 Q 150 245 180 185 Z" fill="white" stroke="#333" strokeWidth="6" strokeLinejoin="round"/>
      </g>
    );
    default: return null;
  }
};

const CharacterPreview = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const current = characters[currentIndex];

  const goTo = (index) => {
    setCurrentIndex(index);
    setAnimKey(k => k + 1);
  };

  const isUGC = current.isUGC;
  const viewBox = isUGC ? "0 0 300 320" : "80 130 240 230";

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <style>{`
        @keyframes runIn {
          0%   { transform: translateX(-300px); }
          60%  { transform: translateX(10px); }
          75%  { transform: translateX(-5px); }
          100% { transform: translateX(0px); }
        }
        .char-run { animation: runIn 0.7s ease-out forwards; }
      `}</style>

      {/* Fake Receipt */}
      <div style={{
        background: 'linear-gradient(135deg, #fffbf7 0%, #fef5f0 100%)',
        border: '2px solid #d1c4b8',
        borderRadius: '12px',
        padding: '16px',
        textAlign: 'center',
        marginBottom: '20px',
        overflow: 'hidden',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg key={animKey} viewBox={viewBox} style={{ width: '100%', maxWidth: '260px' }} className="char-run">
          {!isUGC && (
            <>
              {/* Legs */}
              <line x1="180" y1="290" x2="175" y2="315" stroke="#1F2937" strokeWidth="7" strokeLinecap="round"/>
              <line x1="220" y1="290" x2="225" y2="315" stroke="#1F2937" strokeWidth="7" strokeLinecap="round"/>
              <circle cx="173" cy="315" r="5" fill="#1F2937"/>
              <circle cx="227" cy="315" r="5" fill="#1F2937"/>
              {/* Left arm */}
              <path d="M 165 260 Q 140 255 142 240" fill="none" stroke="#1F2937" strokeWidth="5" strokeLinecap="round"/>
              <circle cx="142" cy="238" r="6.5" fill="#FFFFFF" stroke="#1F2937" strokeWidth="2"/>
              {/* Right arm + phone */}
              <path d="M 235 260 Q 255 265 258 280" fill="none" stroke="#1F2937" strokeWidth="5" strokeLinecap="round"/>
              <circle cx="258" cy="280" r="6.5" fill="#FFFFFF" stroke="#1F2937" strokeWidth="2"/>
              <g transform="translate(258, 265) rotate(18) scale(1.5)">
                <rect x="0" y="0" width="18" height="30" rx="4.5" fill={current.phoneColor} stroke="#1E293B" strokeWidth="2"/>
                <rect x="3" y="3" width="12" height="12" rx="3.5" fill={current.phoneColor} stroke="#1E293B" strokeWidth="1.5" opacity="0.7"/>
                <circle cx="6.5" cy="6.5" r="2.5" fill="#0F172A"/><circle cx="6.5" cy="6.5" r="1.2" fill="#475569"/>
                <circle cx="6.5" cy="11.5" r="2.5" fill="#0F172A"/><circle cx="6.5" cy="11.5" r="1.2" fill="#475569"/>
                <circle cx="11.5" cy="9" r="1.5" fill="#FEF08A"/>
              </g>
            </>
          )}
          <CharacterBody id={current.id} />
        </svg>

        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', marginTop: '4px' }}>
          {current.name} {isUGC ? '📷' : '✨'}
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
          {currentIndex + 1} / {characters.length}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => goTo((currentIndex - 1 + characters.length) % characters.length)}
          style={{ flex: 1, background: '#ec4899', color: 'white', border: 'none', borderRadius: '10px', padding: '14px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
        >← Prev</button>
        <button
          onClick={() => goTo((currentIndex + 1) % characters.length)}
          style={{ flex: 1, background: '#ec4899', color: 'white', border: 'none', borderRadius: '10px', padding: '14px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
        >Next →</button>
      </div>
    </div>
  );
};

export default CharacterPreview;
