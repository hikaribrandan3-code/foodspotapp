import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CURATED_FONTS, FONT_WEIGHTS } from '../../../config/appConfig.v2.js';
import BrandingColorPicker from '../../BrandingColorPicker.jsx';
import HeroIconPicker from '../../HeroIconPicker.jsx';

const cardStyle = { background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 16 };
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, marginBottom: 12 };

export default function BrandingTab({ config, updateBrandingCloud, updateConfig, setShowCoverEditor }) {
    const navigate = useNavigate();

    return (
        <>
            <h3 style={labelStyle}>🎨 BRANDING Y ESTÉTICA</h3>

            <div style={cardStyle}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase' }}>1. Base del Sistema</h4>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Nombre del negocio</label>
                <input type="text" value={config.businessName || ''} onChange={(e) => updateBrandingCloud('businessName', e.target.value)} style={inputStyle} />

                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, marginTop: 12 }}>Tipografía</label>
                <select value={config.branding?.fontFamily || 'Inter'} onChange={(e) => updateBrandingCloud('fontFamily', e.target.value)} style={{ ...inputStyle, fontFamily: config.branding?.fontFamily || 'Inter' }}>
                    {CURATED_FONTS.map(font => <option key={font.name} value={font.name}>{font.label}</option>)}
                </select>

                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, marginTop: 12 }}>Peso de fuente</label>
                <select value={config.branding?.fontWeight || '400'} onChange={(e) => updateBrandingCloud('fontWeight', e.target.value)} style={{ ...inputStyle, fontWeight: config.branding?.fontWeight || '400' }}>
                    {FONT_WEIGHTS.map(weight => <option key={weight.value} value={weight.value}>{weight.label}</option>)}
                </select>
            </div>

            <div style={cardStyle}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase' }}>2. Portada (Inicio)</h4>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Modo de Cabecera</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => updateConfig({ headerMode: 'auto' })} style={{ flex: 1, padding: 10, borderRadius: 8, border: config.headerMode === 'auto' ? '2px solid #22C55E' : '1px solid #E5E7EB', background: config.headerMode === 'auto' ? '#DCFCE7' : 'white' }}>Auto</button>
                        <button onClick={() => updateConfig({ headerMode: 'locked-light' })} style={{ flex: 1, padding: 10, borderRadius: 8, border: config.headerMode === 'locked-light' ? '2px solid #22C55E' : '1px solid #E5E7EB', background: config.headerMode === 'locked-light' ? '#DCFCE7' : 'white' }}>Claro</button>
                        <button onClick={() => updateConfig({ headerMode: 'locked-dark' })} style={{ flex: 1, padding: 10, borderRadius: 8, border: config.headerMode === 'locked-dark' ? '2px solid #22C55E' : '1px solid #E5E7EB', background: config.headerMode === 'locked-dark' ? '#DCFCE7' : 'white' }}>Oscuro</button>
                    </div>
                </div>

                <button onClick={() => setShowCoverEditor(true)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '2px dashed #7C3AED', background: '#F5F3FF', color: '#7C3AED', fontWeight: 600, cursor: 'pointer' }}>
                    🖼️ Editar Portada
                </button>
            </div>

            <div style={cardStyle}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase' }}>3. Paleta de Colores</h4>
                <BrandingColorPicker config={config} onChange={(colors) => updateConfig({ colors })} />
            </div>

            <div style={cardStyle}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase' }}>4. Iconos del Home</h4>
                <HeroIconPicker config={config} onChange={(heroIcons) => updateConfig({ heroIcons })} />
            </div>

            <div style={cardStyle}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase' }}>5. Tema Visual</h4>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => updateConfig({ canvasMode: 'light' })} style={{ flex: 1, padding: 10, borderRadius: 8, border: config.canvasMode === 'light' ? '2px solid #22C55E' : '1px solid #E5E7EB', background: config.canvasMode === 'light' ? '#DCFCE7' : 'white' }}>☀️ Claro</button>
                    <button onClick={() => updateConfig({ canvasMode: 'dark' })} style={{ flex: 1, padding: 10, borderRadius: 8, border: config.canvasMode === 'dark' ? '2px solid #22C55E' : '1px solid #E5E7EB', background: config.canvasMode === 'dark' ? '#1F2937' : 'white', color: config.canvasMode === 'dark' ? 'white' : 'black' }}>🌙 Oscuro</button>
                </div>
            </div>
        </>
    );
}
