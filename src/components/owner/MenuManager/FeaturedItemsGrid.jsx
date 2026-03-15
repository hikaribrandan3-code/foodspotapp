import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function FeaturedItemsGrid({ 
  featuredItems, 
  onSlotClick,
  onUpdateSlot
}) {
  const { t } = useLanguage();

  // Ensure 4 slots
  const slots = React.useMemo(() => {
    const s = [...(featuredItems || [])];
    while (s.length < 4) s.push(null);
    return s.slice(0, 4);
  }, [featuredItems]);

  return (
    <>
      <h3 style={{
        fontSize: 13,
        fontWeight: 700,
        color: '#4B5563',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {t('home_highlights_top4')}
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        marginBottom: 24,
        background: 'white',
        padding: 12,
        borderRadius: 12,
        border: '1px solid #E2E8F0'
      }}>
        {slots.map((slot, index) => (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Image Box */}
            <div
              onClick={() => onSlotClick(index)}
              style={{
                aspectRatio: '1/1',
                background: slot?.image 
                  ? `url(${slot.image}) center/cover` 
                  : '#F1F5F9',
                borderRadius: 10,
                border: '1px dashed #CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              {!slot && (
                <span style={{ 
                  fontSize: 10, 
                  color: '#94A3B8', 
                  textAlign: 'center', 
                  pointerEvents: 'none' 
                }}>
                  Editar
                </span>
              )}
            </div>

            {/* Meta Data */}
            {slot && (
              <div style={{ textAlign: 'center' }}>
                <input
                  type="text"
                  defaultValue={slot.name || 'Destacado'}
                  onBlur={(e) => onUpdateSlot(index, 'name', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontWeight: 600,
                    fontSize: 11,
                    color: '#1E293B',
                    marginBottom: 2,
                    width: '100%',
                    textAlign: 'center',
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    padding: 0
                  }}
                />
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 1 
                }}>
                  <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 700 }}>$</span>
                  <input
                    type="number"
                    defaultValue={slot.price || ''}
                    onBlur={(e) => onUpdateSlot(index, 'price', parseInt(e.target.value) || 0)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="0"
                    style={{
                      color: '#22C55E',
                      fontWeight: 700,
                      fontSize: 12,
                      width: 40,
                      textAlign: 'center',
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      padding: 0
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
