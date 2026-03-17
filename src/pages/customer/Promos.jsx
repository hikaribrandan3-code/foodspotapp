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
          backgroundColor: 'rgba(255,255,255,0.1)',
          border: 'none',
          color: '#FFFFFF',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        aria-label="Volver"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>

      {/* Main Content */}
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{
          fontSize: 'clamp(3rem, 15vw, 8rem)',
          fontWeight: 900,
          letterSpacing: '-0.05em',
          lineHeight: 0.9,
          margin: '0 0 24px 0',
          textTransform: 'uppercase',
          fontStretch: 'extra-condensed',
          whiteSpace: 'pre-line'
        }}>
          COMING{"\n"}SOON
        </h1>
        
        <div style={{
          width: '64px',
          height: '2px',
          backgroundColor: 'rgba(255,255,255,0.4)',
          marginBottom: '32px'
        }}></div>
        
        <p style={{
          fontSize: 'clamp(1.25rem, 4vw, 2.5rem)',
          fontWeight: 500,
          letterSpacing: '0.2em',
          opacity: 0.9,
          textTransform: 'uppercase',
          fontStyle: 'italic',
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
          animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Promos;
