import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

export default function UnsavedChangesBar({ hasChanges, isBatchSaving, onSave }) {
  const { t } = useLanguage();

  if (!hasChanges) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 95,
      left: 12,
      right: 12,
      background: '#1E293B',
      color: 'white',
      padding: '14px 20px',
      borderRadius: 16,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
      zIndex: 10000,
      animation: 'slideUp 0.3s ease-out',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div style={{ fontSize: 13, fontWeight: 600 }}>
        {t('unsaved_changes_warning')}
      </div>
      <button
        onClick={onSave}
        disabled={isBatchSaving}
        style={{
          background: '#3B82F6',
          color: 'white',
          border: 'none',
          padding: '10px 24px',
          borderRadius: 12,
          fontWeight: 800,
          fontSize: 14,
          cursor: 'pointer',
          opacity: isBatchSaving ? 0.5 : 1
        }}
      >
        {isBatchSaving ? t('saving_btn') : t('save_changes')}
      </button>
    </div>
  );
}
