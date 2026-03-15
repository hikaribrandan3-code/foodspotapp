import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

export default function BatchSavingOverlay() {
  const { t } = useLanguage();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        width: 50,
        height: 50,
        border: '4px solid rgba(255,255,255,0.3)',
        borderTopColor: '#3B82F6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <h2 style={{ color: 'white', marginTop: 20, fontSize: 18, fontWeight: 600 }}>
        Publicando Cambios...
      </h2>
      <p style={{ color: '#94A3B8', marginTop: 8, fontSize: 14 }}>
        Sincronizando con la nube...
      </p>
    </div>
  );
}
