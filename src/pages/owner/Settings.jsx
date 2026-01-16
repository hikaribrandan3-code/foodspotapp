import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { clearAuth } from '../../utils/storage.js'
import { updateConfig, CURATED_FONTS, FONT_WEIGHTS, HERO_DEFAULT } from '../../config/appConfig.v2.js'
import { DIVIDER_PRESETS } from '../../config/dividerPresets.js'
import BrandingColorPicker from '../../components/BrandingColorPicker.jsx'
import HeroIconPicker from '../../components/HeroIconPicker.jsx'
import CoverImageEditor from '../../components/CoverImageEditor.jsx'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'

export default function Settings({ config: configProp, demoMode = false }) {
    const config = configProp || {};
    const navigate = useNavigate();
    const { tenantSlug } = useParams();
    const [showCoverEditor, setShowCoverEditor] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        clearAuth();
        window.location.href = demoMode ? '/' : `/${tenantSlug}`;
    };

    // Shared Styles from SuperAdmin
    const cardStyle = { background: 'white', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
    const sectionHeaderStyle = { fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' };
    const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 };

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F5F2EE' }}>
            <BackendHeader title={demoMode ? "Demo Branding" : "Diseño y Estética"} onLogout={handleLogout} />

            <div style={{ padding: '12px 16px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
                <button
                    onClick={() => { window.dispatchEvent(new CustomEvent('frontendSync')); alert('✅ Estética Sincronizada'); }}
                    style={{ width: '100%', padding: '12px', background: config.branding?.primaryColor || '#3B82F6', borderRadius: 12, border: 'none', color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                    🔄 Actualizar Frontend
                </button>
            </div>

            <div style={{ padding: 16, paddingBottom: 120 }}>
                {/* 1. BASE DEL SISTEMA */}
                <h3 style={sectionHeaderStyle}>1. Base del Sistema</h3>
                <div style={cardStyle}>
                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Nombre del Negocio</label>
                    <input type="text" value={config.businessName || ''} onChange={(e) => updateConfig({ businessName: e.target.value })} style={inputStyle} />

                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, marginTop: 12 }}>Tipografía Global</label>
                    <select
                        value={config.branding?.fontFamily || 'Inter'}
                        onChange={(e) => { updateConfig({ branding: { ...config.branding, fontFamily: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')); }}
                        style={{ ...inputStyle, fontFamily: config.branding?.fontFamily || 'Inter' }}
                    >
                        {CURATED_FONTS.map(font => <option key={font.name} value={font.name}>{font.label}</option>)}
                    </select>

                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, marginTop: 12 }}>Peso de Fuente</label>
                    <select
                        value={config.branding?.fontWeight || '400'}
                        onChange={(e) => { updateConfig({ branding: { ...config.branding, fontWeight: e.target.value } }); window.dispatchEvent(new CustomEvent('frontendSync')); }}
                        style={{ ...inputStyle, fontWeight: config.branding?.fontWeight || '400' }}
                    >
                        {FONT_WEIGHTS.map(weight => <option key={weight.value} value={weight.value}>{weight.label}</option>)}
                    </select>
                </div>

                {/* 2. PORTADA (SUPER ADMIN "FIRE" BOX) */}
                <h3 style={sectionHeaderStyle}>2. Portada (Inicio)</h3>
                <div style={cardStyle}>
                    <div style={{ background: '#111827', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                        <div style={{ width: '100%', height: 80, border: '2px solid #374151', borderRadius: 6, overflow: 'hidden', background: '#1F2937', position: 'relative' }}>
                            {config.headerCover?.image ? (
                                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${config.headerCover.image})`, backgroundSize: `${(config.headerCover?.scale || 1) * 100}%`, backgroundPosition: `${50 + (config.headerCover?.offsetX || 0)}% ${50 + (config.headerCover?.offsetY || 0)}%`, backgroundRepeat: 'no-repeat' }} />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: '#9CA3AF', fontSize: 13 }}>Sin imagen de portada</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={() => setShowCoverEditor(true)} style={{ width: '100%', padding: '12px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                        {config.headerCover?.image ? '✏️ Editar Portada' : '📷 Subir Portada'}
                    </button>
                </div>

                {/* 3. ICONOS HERO */}
                <h3 style={sectionHeaderStyle}>3. Iconos Hero (Inicio)</h3>
                <div style={cardStyle}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {['menu', 'delivery', 'promos', 'game'].map(iconId => {
                            const iconConfig = config.heroIcons?.[iconId] || HERO_DEFAULT;
                            const labels = { menu: 'Menú', delivery: 'Envíos', promos: 'Promos', game: 'Juego' };
                            return (
                                <HeroIconPicker
                                    key={iconId}
                                    label={labels[iconId]}
                                    iconId={iconId}
                                    color={iconConfig.color}
                                    iconColorMode={iconConfig.iconColorMode}
                                    onColorChange={(newColor) => {
                                        updateConfig({ heroIcons: { ...config.heroIcons, [iconId]: { ...iconConfig, color: newColor }, ...(iconId === 'promos' ? { rewards: { ...iconConfig, color: newColor } } : {}) } });
                                        window.dispatchEvent(new CustomEvent('frontendSync'));
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* 4. COLORES DE MARCA */}
                <h3 style={sectionHeaderStyle}>4. Colores y Navegación</h3>
                <BrandingColorPicker
                    primaryColor={config.branding?.primaryColor || '#8B7355'}
                    iconColorMode={config.branding?.iconColorMode || 'white'}
                    onColorChange={(color) => {
                        updateConfig({ branding: { ...config.branding, primaryColor: color }, colors: { ...config.colors, primary: color } });
                        window.dispatchEvent(new CustomEvent('frontendSync'));
                    }}
                    onIconModeChange={(mode) => {
                        updateConfig({ branding: { ...config.branding, iconColorMode: mode } });
                        window.dispatchEvent(new CustomEvent('frontendSync'));
                    }}
                />

                {/* 5. BOTONES DE INFO (PILLS) */}
                <h3 style={sectionHeaderStyle}>5. Botones de Info</h3>
                <div style={cardStyle}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {[
                            { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
                            { id: 'mercadoPago', label: 'MP', icon: '💳' },
                            { id: 'rappi', label: 'Rappi', icon: '🛵' },
                            { id: 'pedidosYa', label: 'PY', icon: '🍕' },
                            { id: 'demo', label: 'Demo', icon: '🎮' },
                            { id: 'adminAccess', label: 'Admin', icon: '🔒' },
                        ].map(pill => {
                            const pillConfig = config.infoPills?.[pill.id] || {};
                            const bgColor = pillConfig.bgColor || (pill.id === 'whatsapp' ? '#C4856A' : pill.id === 'mercadoPago' ? '#FFE600' : pill.id === 'rappi' ? '#FF5A00' : pill.id === 'pedidosYa' ? '#E31837' : pill.id === 'demo' ? '#84CC16' : '#FFFFFF');
                            const textColor = pillConfig.textColor || (pill.id === 'mercadoPago' ? '#009EE3' : pill.id === 'adminAccess' ? '#9CA3AF' : '#FFFFFF');
                            return (
                                <button key={pill.id} onClick={() => document.getElementById(`pill-color-${pill.id}`)?.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', backgroundColor: bgColor, color: textColor, borderRadius: 12, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                    <span>{pill.icon}</span>
                                    <span>{pill.label}</span>
                                    <input id={`pill-color-${pill.id}`} type="color" value={bgColor} onChange={(e) => { updateConfig({ infoPills: { ...config.infoPills, [pill.id]: { ...pillConfig, bgColor: e.target.value } } }); window.dispatchEvent(new CustomEvent('frontendSync')); }} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 6. TEMA VISUAL */}
                <h3 style={sectionHeaderStyle}>6. Tema Visual</h3>
                <div style={{ ...cardStyle, display: 'flex', gap: 8 }}>
                    <button onClick={() => { updateConfig({ canvasMode: 'light' }); window.dispatchEvent(new CustomEvent('frontendSync')); }} style={{ flex: 1, padding: 12, borderRadius: 10, border: config.canvasMode !== 'dark' ? '2px solid #3B82F6' : '1px solid #E5E7EB', background: 'white', fontWeight: 600 }}>☀️ Claro</button>
                    <button onClick={() => { updateConfig({ canvasMode: 'dark' }); window.dispatchEvent(new CustomEvent('frontendSync')); }} style={{ flex: 1, padding: 12, borderRadius: 10, border: config.canvasMode === 'dark' ? '2px solid #3B82F6' : '1px solid #E5E7EB', background: '#111827', color: 'white', fontWeight: 600 }}>🌙 Oscuro</button>
                </div>

                {/* 7. LINKS EXTERNOS */}
                <h3 style={sectionHeaderStyle}>7. Pedidos Externos</h3>
                <div style={cardStyle}>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>Mercado Pago Alias</label>
                        <input type="text" placeholder="ej: mi.negocio.mp" value={config.payments?.mercadoPagoAlias || ''} onChange={(e) => updateConfig({ payments: { ...config.payments, mercadoPagoAlias: e.target.value } })} style={{ ...inputStyle, marginTop: 4 }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ background: '#F9FAFB', padding: 8, borderRadius: 8 }}>
                            <label style={{ fontSize: 10, fontWeight: 700 }}>RAPPI</label>
                            <input type="checkbox" checked={config.externalOrdering?.rappiEnabled} onChange={() => updateConfig({ externalOrdering: { ...config.externalOrdering, rappiEnabled: !config.externalOrdering?.rappiEnabled } })} />
                        </div>
                        <div style={{ background: '#F9FAFB', padding: 8, borderRadius: 8 }}>
                            <label style={{ fontSize: 10, fontWeight: 700 }}>PEDIDOSYA</label>
                            <input type="checkbox" checked={config.externalOrdering?.pedidosYaEnabled} onChange={() => updateConfig({ externalOrdering: { ...config.externalOrdering, pedidosYaEnabled: !config.externalOrdering?.pedidosYaEnabled } })} />
                        </div>
                    </div>
                </div>
            </div>

            <BackendNav role="owner" useRoutes={true} />
            <CoverImageEditor
                isOpen={showCoverEditor}
                onClose={() => setShowCoverEditor(false)}
                onSave={(data) => { updateConfig({ headerCover: data }); window.dispatchEvent(new CustomEvent('frontendSync')); }}
                initialData={config.headerCover}
                config={config}
            />
        </div>
    );
}
