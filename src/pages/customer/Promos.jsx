import React from 'react';
import { useNavigate } from 'react-router-dom';

const Promos = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="promos-page"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000000',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '24px',
        textAlign: 'center',
        overflow: 'hidden'
      }}
    >
      
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        style={{
          position: 'absolute',
          top: '32px',
          left: '32px',
          padding: '8px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(255,255,255,0.15)',
          border: 'none',
          color: '#FFFFFF',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          zIndex: 100000
        }}
        aria-label="Volver"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        <h1 style={{
          fontSize: 'clamp(4rem, 18vw, 10rem)',
          fontWeight: 900,
          letterSpacing: '-0.05em',
          lineHeight: 0.85,
          margin: '0 0 24px 0',
          textTransform: 'uppercase',
          fontStretch: 'extra-condensed',
          whiteSpace: 'pre-line',
          color: '#FFFFFF', // Explicit white
          display: 'block'
        }}>
          COMING{"\n"}SOON
        </h1>
        
        <div style={{
          width: '80px',
          height: '2px',
          backgroundColor: 'rgba(255,255,255,0.5)',
          marginBottom: '32px'
        }}></div>
        
        <p style={{
          fontSize: 'clamp(1.5rem, 5vw, 3rem)',
          fontWeight: 600,
          letterSpacing: '0.25em',
          opacity: 1, // Full opacity
          textTransform: 'uppercase',
          fontStyle: 'italic',
          color: '#FFFFFF', // Explicit white
          margin: 0
        }}>
          Stay Tuned
        </p>
      </div>

      <style>{`
        .promos-page {
          font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
          user-select: none;
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
