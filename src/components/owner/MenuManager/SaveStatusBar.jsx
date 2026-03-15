import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

export default function SaveStatusBar({ saveStatus }) {
  const { t } = useLanguage();

  if (!saveStatus) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 160,
      left: 12,
      right: 12,
      background: saveStatus.error ? '#FEE2E2' : '#DCFCE7',
      color: saveStatus.error ? '#991B1B' : '#166534',
      padding: '12px 16px',
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      zIndex: 10001,
      animation: 'slideUp 0.3s ease-out',
      border: `1px solid ${saveStatus.error ? '#FECACA' : '#BBF7D0'}`
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <span>{saveStatus.error ? '⚠️' : '✓'}</span>
      {saveStatus.message}
    </div>
  );
}
