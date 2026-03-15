import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MenuHeader({
  businessName,
  logoUrl,
  stats,
  hasChanges,
  lastPrintedAt,
  updatedAt,
  onOpenEditor,
  t
}) {
  const showVersionWarning = hasChanges || (
    lastPrintedAt && 
    updatedAt && 
    new Date(updatedAt) > new Date(lastPrintedAt)
  );

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
      borderRadius: 14,
      padding: 20,
      marginBottom: 12,
      border: '1px solid #334155'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo"
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                objectFit: 'cover'
              }}
            />
          )}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4
            }}>
              <span style={{ fontSize: 18 }}>🎨</span>
              <p style={{
                fontWeight: 700,
                fontSize: 15,
                color: '#FFFFFF',
                margin: 0
              }}>
                {businessName || 'Menú'}
              </p>
            </div>
            <p style={{
              fontSize: 12,
              color: '#94A3B8',
              margin: 0,
              lineHeight: 1.4
            }}>
              {t('editor_desc')}
            </p>
          </div>
        </div>
        <button
          onClick={onOpenEditor}
          style={{
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.15s ease'
          }}
        >
          {t('open_editor')}
        </button>
      </div>

      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px solid #334155'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#3B82F6' }}>
            {stats?.categories || 0}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>{t('categories')}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#22C55E' }}>
            {stats?.items || 0}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>{t('items')}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B' }}>
            {stats?.featured || 0}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>{t('featured')}</div>
        </div>
      </div>

      {/* Version Warning */}
      {showVersionWarning && (
        <div style={{
          marginTop: 12,
          padding: '10px 12px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8
        }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <p style={{
            margin: 0,
            fontSize: 11,
            color: '#FCA5A5',
            lineHeight: 1.4
          }}>
            {hasChanges 
              ? t('unsaved_changes_print_warning')
              : t('menu_modified_reprint_warning')}
          </p>
        </div>
      )}
    </div>
  );
}
