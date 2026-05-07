import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CURATED_FONTS, FONT_WEIGHTS, HERO_DEFAULT } from '../../../config/appConfig.v2.js';
import BrandingColorPicker from '../../BrandingColorPicker.jsx';
import ColorPickerModal from '../../ColorPickerModal.jsx';

const cardStyle = { background: 'white', borderRadius: 14, padding: 13, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 13, borderLeft: '4px solid #10B981' };
const labelStyle = { fontSize: 10, fontWeight: 700, color: '#059669', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #D1FAE5', borderRadius: 8, fontSize: 14, marginBottom: 12 };

export default function BrandingTab({ config, updateBrandingCloud, updateConfig, setShowCoverEditor }) {
    const navigate = useNavigate();
    const [colorPickerState, setColorPickerState] = useState({
        isOpen: false,
        title: '',
        iconId: null,
        currentColor: '#8B7355',
        originalColor: '#8B7355'
    });

    const handleHeroColorApply = (finalColor) => {
        const { iconId } = colorPickerState;
        if (!iconId) return;
        const newHeroIcons = {
            ...(config.heroIcons || {}),
            [iconId]: { ...(config.heroIcons?.[iconId] || HERO_DEFAULT), color: finalColor }
        };
        updateConfig({ heroIcons: newHeroIcons });
        setColorPickerState(prev => ({ ...prev, isOpen: false }));
    };

    const handleHeroColorClose = () => {
        setColorPickerState(prev => ({ ...prev, isOpen: false }));
    };

    const labels = { menu: '🍔 Menu', delivery: '🚚 Delivery', promos: '⭐ Promos', game: '🎮 Game' };

    return (
        <>
            <h3 style={{ ...labelStyle, fontSize: 12, marginBottom: 12 }}>🎨 BRANDING</h3>

            <div style={cardStyle}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>1. Identidad & Tipografía</h4>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#059669', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre del negocio</label>
                <input type="text" value={config.businessName || ''} onChange={(e) => updateBrandingCloud('businessName', e.target.value)} style={inputStyle} />

                <label style={{ fontSize: 11, fontWeight: 600, color: '#059669', display: 'block', marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipografía</label>
                <select value={config.branding?.fontFamily || 'Inter'} onChange={(e) => updateBrandingCloud('fontFamily', e.target.value)} style={{ ...inputStyle, fontFamily: config.branding?.fontFamily || 'Inter' }}>
                    {CURATED_FONTS.map(font => <option key={font.name} value={font.name}>{font.label}</option>)}
                </select>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#059669', display: 'block', marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peso de fuente</label>
                <select value={config.branding?.fontWeight || '400'} onChange={(e) => updateBrandingCloud('fontWeight', e.target.value)} style={{ ...inputStyle, fontWeight: config.branding?.fontWeight || '400' }}>
                    {FONT_WEIGHTS.map(weight => <option key={weight.value} value={weight.value}>{weight.label}</option>)}
                </select>
            </div>

            <div style={cardStyle}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>2. Portada</h4>
                <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#059669', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modo de Cabecera</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => updateConfig({ headerMode: 'auto' })} style={{ flex: 1, padding: 8, borderRadius: 6, border: config.headerMode === 'auto' ? '2px solid #10B981' : '1px solid #D1FAE5', background: config.headerMode === 'auto' ? '#ECFDF5' : 'white', color: config.headerMode === 'auto' ? '#059669' : '#6B7280', fontWeight: 600, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}>Auto</button>
                        <button onClick={() => updateConfig({ headerMode: 'locked-light' })} style={{ flex: 1, padding: 8, borderRadius: 6, border: config.headerMode === 'locked-light' ? '2px solid #10B981' : '1px solid #D1FAE5', background: config.headerMode === 'locked-light' ? '#ECFDF5' : 'white', color: config.headerMode === 'locked-light' ? '#059669' : '#6B7280', fontWeight: 600, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}>Claro</button>
                        <button onClick={() => updateConfig({ headerMode: 'locked-dark' })} style={{ flex: 1, padding: 8, borderRadius: 6, border: config.headerMode === 'locked-dark' ? '2px solid #10B981' : '1px solid #D1FAE5', background: config.headerMode === 'locked-dark' ? '#ECFDF5' : 'white', color: config.headerMode === 'locked-dark' ? '#059669' : '#6B7280', fontWeight: 600, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}>Oscuro</button>
                    </div>
                </div>

                <button onClick={() => setShowCoverEditor(true)} style={{ width: '100%', padding: 9, borderRadius: 6, border: '2px dashed #10B981', background: '#ECFDF5', color: '#059669', fontWeight: 600, cursor: 'pointer', fontSize: 12, transition: 'all 0.2s' }}>
                    🖼️ Editar Portada
                </button>
            </div>

            <div style={cardStyle}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>3. Paleta de Colores</h4>
                <BrandingColorPicker config={config} onChange={(colors) => updateConfig({ colors })} />
            </div>

            <div style={cardStyle}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>4. Iconos del Home</h4>
                <p style={{ fontSize: 11, color: '#059669', marginBottom: 12, fontWeight: 600 }}>
                    Haz clic para cambiar color de fondo.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {['menu', 'delivery', 'promos', 'game'].map(iconId => {
                        const iconConfig = config.heroIcons?.[iconId] || HERO_DEFAULT;
                        const currentColor = iconConfig.color || '#10B981';
                        return (
                            <div
                                key={iconId}
                                onClick={() => {
                                    setColorPickerState({
                                        isOpen: true,
                                        title: labels[iconId],
                                        iconId: iconId,
                                        currentColor: currentColor,
                                        originalColor: currentColor
                                    });
                                }}
                                style={{
                                    background: currentColor,
                                    borderRadius: 10,
                                    padding: 10,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontSize: 20 }}>{labels[iconId].split(' ')[0]}</span>
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#FFF', marginTop: 3, opacity: 0.95 }}>{labels[iconId].split(' ')[1]}</span>
                            </div>
                        );
                    })}
                </div>

                {colorPickerState.isOpen && (
                    <ColorPickerModal
                        title={colorPickerState.title}
                        initialColor={colorPickerState.currentColor}
                        onApply={handleHeroColorApply}
                        onClose={handleHeroColorClose}
                    />
                )}
            </div>

            <div style={cardStyle}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>5. Tema Visual</h4>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => updateConfig({ canvasMode: 'light' })} style={{ flex: 1, padding: 8, borderRadius: 6, border: config.canvasMode === 'light' ? '2px solid #10B981' : '1px solid #D1FAE5', background: config.canvasMode === 'light' ? '#ECFDF5' : 'white', color: config.canvasMode === 'light' ? '#059669' : '#6B7280', fontWeight: 600, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}>☀️ Claro</button>
                    <button onClick={() => updateConfig({ canvasMode: 'dark' })} style={{ flex: 1, padding: 8, borderRadius: 6, border: config.canvasMode === 'dark' ? '2px solid #10B981' : '1px solid #D1FAE5', background: config.canvasMode === 'dark' ? '#1F2937' : 'white', color: config.canvasMode === 'dark' ? '#ECFDF5' : '#6B7280', fontWeight: 600, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}>🌙 Oscuro</button>
                </div>
            </div>
        </>
    );
}
