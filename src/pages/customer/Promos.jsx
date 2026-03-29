import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const Promos = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();

  const handleBack = () => {
    // Try tenant-specific home first, then fallback to browser back
    if (tenantSlug && tenantSlug.trim() !== '') {
      navigate(`/${tenantSlug}/home`, { replace: false });
    } else {
      navigate(-1);
    }
  };

  return (
    <div 
      className="promos-page"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999, // Absolute top
        padding: '24px',
        textAlign: 'center',
        overflow: 'hidden'
      }}
    >
      
      {/* Back Button */}
      <button 
        onClick={handleBack}
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          width: '48px',
          height: '48px',
          padding: '12px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.2)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          zIndex: 1000000,
          pointerEvents: 'auto',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.35)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onTouchStart={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.35)';
          e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        aria-label="Volver"
        type="button"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>

      {/* Main Content */}
      <div className="animate-fade-in" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        width: '100%'
      }}>
        <h1 className="promo-title" style={{
          fontSize: 'clamp(4rem, 18vw, 10rem)',
          fontWeight: 900,
          letterSpacing: '-0.05em',
          lineHeight: 0.85,
          margin: '0 0 16px 0',
          textTransform: 'uppercase',
          fontStretch: 'extra-condensed',
          whiteSpace: 'pre-line',
          display: 'block',
          color: '#FFFFFF'
        }}>
          COMING{"\n"}SOON
        </h1>
        
        <p style={{
          fontSize: 'clamp(1rem, 3vw, 1.5rem)',
          fontWeight: 500,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#FFFFFF',
          margin: '0 0 24px 0'
        }}>
          May 2026
        </p>
        
        <div style={{
          width: '80px',
          height: '2px',
          backgroundColor: 'rgba(255,255,255,0.5)',
          marginBottom: '32px'
        }}></div>
        
        <p className="promo-tagline" style={{
          fontSize: 'clamp(1.5rem, 5vw, 3rem)',
          fontWeight: 600,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          fontStyle: 'italic',
          margin: 0,
          color: '#FFFFFF'
        }}>
          Stay Tuned
        </p>
      </div>

      <style>{`
        .promos-page {
          font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif !important;
          user-select: none;
          background-color: #000000 !important;
        }

        .promo-title, .promo-tagline {
          color: #FFFFFF !important;
          -webkit-text-fill-color: #FFFFFF !important;
          opacity: 1 !important;
          filter: none !important;
        }

        .animate-fade-in {
          animation: fadeIn 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Promos;
