import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';

const Promos = () => {
  const navigate = useNavigate();
  const { branding } = useTenant();

  // Handle the "Back to App" trigger
  const goBack = () => {
    // Force return to the main home screen
    navigate(-1); 
  };

  return (
    <div className="promos-vault flex flex-col items-center justify-center min-h-screen p-6 text-center">
      
      {/* 🛡️ HARDWARE BACK ARROW */}
      <button 
        onClick={goBack}
        className="back-arrow-fixed absolute top-6 left-6 p-3 rounded-full flex items-center justify-center"
        style={{ 
          backgroundColor: 'rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.1)' 
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>

      {/* 🎨 PROMO BRANDING */}
      <div 
        className="promo-icon-large mb-6 p-8 rounded-3xl"
        style={{ backgroundColor: '#FF8C42' }} // Match the orange from your screenshot
      >
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
          <line x1="7" y1="7" x2="7.01" y2="7"></line>
        </svg>
      </div>

      <h1 className="text-3xl font-black tracking-tight mb-2">Próximamente</h1>
      <p className="text-lg opacity-60 mb-8 max-w-xs">
        Estamos cocinando las mejores promociones para vos. ¡Volvé pronto!
      </p>

      <button 
        onClick={goBack}
        className="w-full max-w-xs py-4 rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-transform"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        Volver al Inicio
      </button>

      <style>{`
        .promos-vault {
          background-color: var(--color-background, #f8fafc);
          contain: layout style;
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .back-arrow-fixed {
          will-change: transform;
          transition: background-color 0.2s;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Promos;
