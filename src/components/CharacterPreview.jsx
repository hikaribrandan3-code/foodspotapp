import { useState } from 'react';

const CUPCAKE = (
  <g>
    <path d="M 160 250 L 172 280 A 8 8 0 0 0 180 286 L 220 286 A 8 8 0 0 0 228 280 L 240 250 Z" fill="#A5B4FC" stroke="#E11D48" strokeWidth="3.5"/>
    <path d="M 160 250 L 152 245 C 135 245, 140 210, 165 210 C 165 195, 235 195, 235 210 C 260 210, 265 245, 248 245 L 240 250 Z" fill="#FCE7F3" stroke="#BE123C" strokeWidth="3" strokeLinejoin="round"/>
    <circle cx="182" cy="228" r="8" fill="#1F2937"/><circle cx="180" cy="225" r="3" fill="#FFFFFF"/>
    <circle cx="218" cy="228" r="8" fill="#1F2937"/><circle cx="216" cy="225" r="3" fill="#FFFFFF"/>
    <path d="M 192 242 Q 200 248 208 242" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="175" cy="256" r="5" fill="#F43F5E" opacity="0.6"/>
    <circle cx="225" cy="256" r="5" fill="#F43F5E" opacity="0.6"/>
    <line x1="200" y1="175" x2="202" y2="160" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="200" cy="190" r="10" fill="#DC2626" stroke="#991B1B" strokeWidth="2.5"/>
  </g>
);

const COOKIE = (
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

const COFFEE = (
  <g>
    <path d="M 235 230 C 265 230, 265 270, 235 270" fill="none" stroke="#94A3B8" strokeWidth="8"/>
    <rect x="160" y="210" width="80" height="80" rx="15" fill="#FFFFFF" stroke="#64748B" strokeWidth="3.5"/>
    <circle cx="182" cy="250" r="7" fill="#1F2937"/><circle cx="180" cy="247" r="2.5" fill="#FFFFFF"/>
    <circle cx="218" cy="250" r="7" fill="#1F2937"/><circle cx="216" cy="247" r="2.5" fill="#FFFFFF"/>
    <path d="M 192 262 Q 200 267 208 262" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
  </g>
);

const DONUT = (
  <g>
    <circle cx="200" cy="250" r="45" fill="#F59E0B" stroke="#B45309" strokeWidth="3.5"/>
    <circle cx="200" cy="250" r="16" fill="#FEF3C7" stroke="#B45309" strokeWidth="2"/>
    <circle cx="185" cy="230" r="7" fill="#1F2937"/><circle cx="183" cy="227" r="2.5" fill="#FFFFFF"/>
    <circle cx="215" cy="230" r="7" fill="#1F2937"/><circle cx="217" cy="227" r="2.5" fill="#FFFFFF"/>
    <path d="M 192 243 Q 200 249 208 243" fill="none" stroke="#1F2937" strokeWidth="3" strokeLinecap="round"/>
    <line x1="185" y1="217" x2="183" y2="212" stroke="#EC4899" strokeWidth="2" strokeLinecap="round"/>
    <line x1="215" y1="217" x2="217" y2="212" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round"/>
  </g>
);

const MINTCUPCAKE = (
  <g>
    <path d="M 160 250 L 172 280 A 8 8 0 0 0 180 286 L 220 286 A 8 8 0 0 0 228 280 L 240 250 Z" fill="#A5B4FC" stroke="#059669" strokeWidth="3.5"/>
    <path d="M 160 250 L 152 245 C 135 245, 140 210, 165 210 C 165 195, 235 195, 235 210 C 260 210, 265 245, 248 245 L 240 250 Z" fill="#A7F3D0" stroke="#059669" strokeWidth="3" strokeLinejoin="round"/>
    <line x1="200" y1="175" x2="202" y2="160" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="200" cy="190" r="10" fill="#DC2626" stroke="#991B1B" strokeWidth="2.5"/>
    <circle cx="182" cy="233" r="7" fill="#1F2937"/><circle cx="180" cy="230" r="2.5" fill="#FFFFFF"/>
    <circle cx="218" cy="233" r="7" fill="#1F2937"/><circle cx="216" cy="230" r="2.5" fill="#FFFFFF"/>
    <path d="M 192 245 Q 200 250 208 245" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="168" cy="242" r="5" fill="#F43F5E" opacity="0.6"/>
    <circle cx="232" cy="242" r="5" fill="#F43F5E" opacity="0.6"/>
  </g>
);

const ICECREAM = (
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

const AVOCADO = (
  <g>
    <path d="M 200 190 C 160 190, 150 250, 150 270 C 150 295, 172 310, 200 310 C 228 310, 250 295, 250 270 C 250 250, 240 190, 200 190 Z" fill="#22C55E" stroke="#059669" strokeWidth="3.5"/>
    <path d="M 200 198 C 167 198, 158 250, 158 268 C 158 288, 177 301, 200 301 C 223 301, 242 288, 242 268 C 242 250, 233 198, 200 198 Z" fill="#86EFAC" stroke="#166534" strokeWidth="1.5" opacity="0.85"/>
    <circle cx="200" cy="261" r="22" fill="#78350F" stroke="#451A03" strokeWidth="2"/>
    <circle cx="185" cy="230" r="6" fill="#1F2937"/><circle cx="183" cy="227" r="2" fill="#FFFFFF"/>
    <circle cx="215" cy="230" r="6" fill="#1F2937"/><circle cx="213" cy="227" r="2" fill="#FFFFFF"/>
    <path d="M 195 245 Q 200 250 205 245" fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round"/>
  </g>
);

const STRAWBERRY = (
  <g>
    <path d="M 200 198 Q 150 198 160 260 Q 165 305 200 305 Q 235 305 240 260 Q 250 198 200 198 Z" fill="#EF4444" stroke="#991B1B" strokeWidth="3.5"/>
    <circle cx="185" cy="250" r="7" fill="#1F2937"/><circle cx="183" cy="247" r="2.5" fill="#FFFFFF"/>
    <circle cx="215" cy="250" r="7" fill="#1F2937"/><circle cx="217" cy="247" r="2.5" fill="#FFFFFF"/>
    <path d="M 192 264 Q 200 269 208 264" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="175" cy="270" r="4" fill="#F43F5E" opacity="0.6"/>
    <circle cx="225" cy="270" r="4" fill="#F43F5E" opacity="0.6"/>
    <path d="M 200 198 L 180 185 L 190 198 L 200 180 L 210 198 L 220 185 L 200 198 Z" fill="#22C55E" stroke="#15803D" strokeWidth="1.5"/>
  </g>
);

const WATERMELON = (
  <g>
    <path d="M 200 190 L 150 290 L 250 290 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="3.5" strokeLinejoin="round"/>
    <circle cx="185" cy="250" r="7" fill="#1F2937"/><circle cx="183" cy="247" r="2.5" fill="#FFFFFF"/>
    <circle cx="215" cy="250" r="7" fill="#1F2937"/><circle cx="217" cy="247" r="2.5" fill="#FFFFFF"/>
    <path d="M 195 260 Q 200 265 205 260" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M 200 280 L 155 285 L 245 285 Z" fill="#22C55E" stroke="#166534" strokeWidth="2.5"/>
    <circle cx="190" cy="240" r="2.5" fill="#1F2937"/><circle cx="210" cy="240" r="2.5" fill="#1F2937"/>
    <circle cx="200" cy="260" r="2.5" fill="#1F2937"/>
  </g>
);

const TENNIS = (
  <g>
    <circle cx="200" cy="250" r="40" fill="#A3E635" stroke="#4D7C0F" strokeWidth="3.5"/>
    <circle cx="185" cy="240" r="7" fill="#1F2937"/><circle cx="183" cy="237" r="2.5" fill="#FFFFFF"/>
    <circle cx="215" cy="240" r="7" fill="#1F2937"/><circle cx="217" cy="237" r="2.5" fill="#FFFFFF"/>
    <path d="M 192 255 Q 200 260 208 255" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M 168 226 A 40 40 0 0 1 168 274" fill="none" stroke="#FFFFFF" strokeWidth="3.5"/>
    <path d="M 232 226 A 40 40 0 0 0 232 274" fill="none" stroke="#FFFFFF" strokeWidth="3.5"/>
  </g>
);

const LOLLIPOP = (
  <g>
    <rect x="196" y="280" width="8" height="40" rx="3" fill="#E2E8F0" stroke="#475569" strokeWidth="2"/>
    <circle cx="200" cy="245" r="40" fill="#F472B6" stroke="#9D174D" strokeWidth="3.5"/>
    <circle cx="182" cy="235" r="7" fill="#1F2937"/><circle cx="180" cy="233" r="2.5" fill="#FFFFFF"/>
    <circle cx="218" cy="235" r="7" fill="#1F2937"/><circle cx="220" cy="233" r="2.5" fill="#FFFFFF"/>
    <path d="M 190 248 Q 200 253 210 248" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
  </g>
);

const characters = [
  { id: 'cupcake', name: 'Cupcake', svg: CUPCAKE },
  { id: 'cookie', name: 'Cookie', svg: COOKIE },
  { id: 'coffee', name: 'Coffee', svg: COFFEE },
  { id: 'donut', name: 'Donut', svg: DONUT },
  { id: 'mintcupcake', name: 'Mint Cupcake', svg: MINTCUPCAKE },
  { id: 'icecream', name: 'Ice Cream', svg: ICECREAM },
  { id: 'avocado', name: 'Avocado', svg: AVOCADO },
  { id: 'strawberry', name: 'Strawberry', svg: STRAWBERRY },
  { id: 'watermelon', name: 'Watermelon', svg: WATERMELON },
  { id: 'tennis', name: 'Tennis', svg: TENNIS },
  { id: 'lollipop', name: 'Lollipop', svg: LOLLIPOP },
];

const CharacterPreview = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = characters[currentIndex];

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      {/* Fake Receipt */}
      <div style={{
        background: 'linear-gradient(135deg, #fffbf7 0%, #fef5f0 100%)',
        border: '2px solid #d1c4b8',
        borderRadius: '12px',
        padding: '30px 20px',
        textAlign: 'center',
        marginBottom: '20px',
      }}>
        <svg viewBox="100 150 200 220" style={{ width: '100%', maxWidth: '260px' }}>
          {current.svg}
        </svg>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937', marginTop: '8px' }}>
          {current.name}
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
          {currentIndex + 1} / {characters.length}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => setCurrentIndex((prev) => (prev - 1 + characters.length) % characters.length)}
          style={{
            flex: 1, background: '#ec4899', color: 'white', border: 'none',
            borderRadius: '8px', padding: '14px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold',
          }}
        >
          ← Prev
        </button>
        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % characters.length)}
          style={{
            flex: 1, background: '#ec4899', color: 'white', border: 'none',
            borderRadius: '8px', padding: '14px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default CharacterPreview;
