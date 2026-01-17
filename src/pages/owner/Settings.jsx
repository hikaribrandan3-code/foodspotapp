/**
 * 🛡️ OPERATION VAULT-SEAL: STRIKE 2
 * Settings.jsx — Zero-Latency Branding Editor
 * 
 * ARCHITECTURE:
 * - onLiveChange: Direct-DOM CSS variable injection (0ms React overhead)
 * - onApply: Single Supabase write on confirm
 * - Silo-Enforced: All writes scoped to tenant.businessId
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase, updateBranding } from '../../lib/supabaseClient.js';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { clearAuth } from '../../utils/storage.js';
import { CURATED_FONTS, FONT_WEIGHTS } from '../../config/appConfig.v2.js';
import CoverImageEditor from '../../components/CoverImageEditor.jsx';
import ColorPickerModal from '../../components/ColorPickerModal.jsx';
import BackendHeader from '../../components/BackendHeader.jsx';
import BackendNav from '../../components/BackendNav.jsx';

// ============================================
// 🎨 DIRECT-DOM INJECTION (Zero React Overhead)
// ============================================
function injectCSSVariable(varName, value) {
    document.documentElement.style.setProperty(varName, value);
}

// ============================================
// 📦 UI COMPONENTS
// ============================================
function SectionHeader({ number, title }) {
    return (
        <h3 style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#374151',
            marginBottom: 16,
            marginTop: number > 1 ? 24 : 0,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
        }}>
            {number}. {title}
        </h3>
    );
}

function Card({ children, style = {} }) {
    return (
        <div style={{
            background: '#FFFFFF',
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            padding: 16,
            ...style
        }}>
            {children}
        </div>
    );
}

function ColorSwatch({ label, color, onClick, onNativeFallback }) {
    return (
        <div style={{ position: 'relative' }}>
            <p style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>{label}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                    onClick={onClick}
                    style={{
                        width: 50,
                        height: 40,
                        border: '2px solid #E5E7EB',
                        borderRadius: 8,
                        backgroundColor: color,
                        cursor: 'pointer'
                    }}
                    aria-label={`Elegir ${label}`}
                />
                {/* 🆘 NATIVE FALLBACK: If color picker modal fails on mobile */}
                {onNativeFallback && (
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => onNativeFallback(e.target.value)}
                        title="Selector nativo (fallback)"
                        style={{
                            width: 28,
                            height: 28,
                            border: '1px solid #E5E7EB',
                            borderRadius: 6,
                            cursor: 'pointer',
                            padding: 0
                        }}
                    />
                )}
            </div>
        </div>
    );
}

// ============================================
// 🏠 MAIN COMPONENT
// ============================================
function Settings() {
    const navigate = useNavigate();
    const { tenantSlug } = useParams();
    // 🛡️ SILO ANCHOR: We pull everything from context
    const { businessId, branding, refresh, loading } = useTenant();

    // Default to empty if loading (Context handles the blocking)
    const config = branding || {};

    // UI State
    const [showCoverEditor, setShowCoverEditor] = useState(false);
    const [activeColorPicker, setActiveColorPicker] = useState(null);
    const [saveStatus, setSaveStatus] = useState(null);

    // =========================================================
    // 🌐 CLOUD-FIRST WRITE HANDLER (HARDENED)
    // =========================================================
    const updateSettingsCloud = async (updates) => {
        // 🛡️ SILO SAFETY CHECK
        if (!businessId) {
            console.error('CRITICAL: Attempted update without businessId');
            return;
        }

        // 1. OPTIMISTIC UPDATE (Visual only)
        // We rely on the context refresh to handle state, but show loading UI
        setSaveStatus('saving');

        // 2. PREPARE SUPABASE PAYLOAD
        const columnMap = {
            businessName: 'business_name',
            'branding.primaryColor': 'primary_color',
            'branding.fontFamily': 'font_family',
            'branding.fontWeight': 'font_weight',
            'branding.iconColorMode': 'icon_color_mode',
            'branding.poweredByColor': 'powered_by_color',
            'colors.confirmation': 'confirmation_color',
            heroIcons: 'hero_icons',
            infoPills: 'info_pills'
        };

        const supabasePayload = {};

        // Recursive flattening isn't needed if we pass flat updates, 
        // but for safety with nested config objects:
        for (const [frontendKey, column] of Object.entries(columnMap)) {
            const keys = frontendKey.split('.');
            let value = updates;
            // Check if the update contains this key
            let hasKey = true;
            for (const k of keys) {
                if (value?.[k] === undefined) {
                    hasKey = false;
                    break;
                }
                value = value[k];
            }

            if (hasKey) {
                supabasePayload[column] = value;
            }
        }

        // Handle direct cover image updates which might not match the map
        if (updates.headerCover) {
            // Assuming headerCover maps to a specific column or jsonb
            // For now, let's assume it goes into 'branding' jsonb or specific cols
            // ADJUST THIS based on your actual DB schema for cover images
        }

        try {
            // 3. ☁️ EXECUTE WRITE
            const { error } = await updateBranding(supabasePayload, businessId);

            if (error) throw error;

            // 4. ✅ REFRESH CONTEXT
            await refresh();
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(null), 1500);

        } catch (err) {
            console.error('Save failed:', err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 2000);
        }
    };

    // 🚀 SILO-AWARE LOGOUT
    const handleLogout = async () => {
        await supabase.auth.signOut();
        clearAuth();
        window.location.href = `/${tenantSlug}`;
    };

    if (loading) return null; // Context handles spinner

    return (
        <div className="backend-surface" data-theme="light" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
            <BackendHeader
                title="Configuración"
                onLogout={handleLogout}
            />

            {/* Sync Status Banner */}
            {saveStatus && (
                <div style={{
                    padding: '8px 16px',
                    background: saveStatus === 'saving' ? '#FEF3C7' : saveStatus === 'saved' ? '#D1FAE5' : '#FEE2E2',
                    color: saveStatus === 'saving' ? '#92400E' : saveStatus === 'saved' ? '#065F46' : '#991B1B',
                    fontSize: 12,
                    fontWeight: 500,
                    textAlign: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50
                }}>
                    {saveStatus === 'saving' ? '☁️ Guardando...' : saveStatus === 'saved' ? '✅ Guardado' : '❌ Error al guardar'}
                </div>
            )}

            <div style={{ padding: 16, paddingBottom: 100 }}>

                {/* =========================================== */}
                {/* SECTION 1: IDENTITY */}
                {/* =========================================== */}
                <SectionHeader number={1} title="Identidad de Marca" />
                <Card>
                    {/* Business Name */}
                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                        Nombre del Negocio
                    </label>
                    <input
                        type="text"
                        defaultValue={config.businessName || ''}
                        onBlur={(e) => {
                            if (e.target.value !== config.businessName) {
                                updateSettingsCloud({ businessName: e.target.value });
                            }
                        }}
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '1px solid #E5E7EB',
                            borderRadius: 10,
                            fontSize: 14,
                            boxSizing: 'border-box',
                            marginBottom: 16
                        }}
                    />

                    {/* Typography */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                            Tipografía
                        </label>
                        <select
                            value={config.fontFamily || 'Inter'}
                            onChange={(e) => {
                                const font = e.target.value;
                                injectCSSVariable('--font-family-brand', `"${font}", system-ui, sans-serif`);
                                updateSettingsCloud({ branding: { fontFamily: font } });
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid #E5E7EB',
                                borderRadius: 8,
                                fontSize: 14,
                                fontFamily: config.fontFamily || 'Inter'
                            }}
                        >
                            {CURATED_FONTS.map(font => (
                                <option key={font.name} value={font.name} style={{ fontFamily: font.name }}>
                                    {font.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Font Weight */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                            Peso de Fuente
                        </label>
                        <select
                            value={config.fontWeight || '400'}
                            onChange={(e) => {
                                injectCSSVariable('--font-weight-brand', e.target.value);
                                updateSettingsCloud({ branding: { fontWeight: e.target.value } });
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid #E5E7EB',
                                borderRadius: 8,
                                fontSize: 14
                            }}
                        >
                            {FONT_WEIGHTS.map(weight => (
                                <option key={weight.value} value={weight.value}>{weight.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Primary Color */}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 16 }}>
                        <ColorSwatch
                            label="Color Primario"
                            color={config.primaryColor || '#8B7355'}
                            onClick={() => setActiveColorPicker('primary')}
                            onNativeFallback={(color) => {
                                // 🆘 Native fallback: Direct save without modal
                                injectCSSVariable('--color-primary', color);
                                injectCSSVariable('--nav-primary-color', color);
                                updateSettingsCloud({ branding: { primaryColor: color } });
                            }}
                        />

                        {/* Icon Contrast Mode */}
                        <div>
                            <p style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>Íconos Nav</p>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {['white', 'black'].map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => {
                                            injectCSSVariable('--nav-icon-color', mode === 'black' ? '#000000' : '#FFFFFF');
                                            updateSettingsCloud({ branding: { iconColorMode: mode } });
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            border: config.iconColorMode === mode ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                                            borderRadius: 6,
                                            background: mode === 'black' ? '#1F2937' : '#FFFFFF',
                                            color: mode === 'black' ? '#FFFFFF' : '#1F2937',
                                            fontSize: 11,
                                            fontWeight: 500,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {mode === 'white' ? 'Blanco' : 'Negro'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Cover Image */}
                <Card style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 8 }}>
                        Imagen de Portada
                    </label>
                    <div style={{ background: '#111827', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                        <div style={{
                            width: '100%',
                            height: 60,
                            borderRadius: 6,
                            overflow: 'hidden',
                            background: '#1F2937',
                            position: 'relative'
                        }}>
                            {/* NOTE: Cover image path needs to be adjusted based on where it's stored in branding */}
                            {config.heroUrl ? (
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundImage: `url(${config.heroUrl})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat'
                                }} />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: '#9CA3AF', fontSize: 12 }}>Sin portada</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCoverEditor(true)}
                        style={{
                            width: '100%',
                            padding: 10,
                            background: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer'
                        }}
                    >
                        {config.heroUrl ? '✏️ Editar' : '📷 Subir'}
                    </button>
                </Card>

                {/* =========================================== */}
                {/* SECTION 2: FUNCTIONAL */}
                {/* =========================================== */}
                <SectionHeader number={2} title="Colores Funcionales" />
                <Card>
                    <ColorSwatch
                        label="Color de Confirmación"
                        color={config.confirmationColor || '#22C55E'}
                        onClick={() => setActiveColorPicker('confirmation')}
                        onNativeFallback={(color) => {
                            injectCSSVariable('--color-confirmation', color);
                            updateSettingsCloud({ colors: { confirmation: color } });
                        }}
                    />
                    <p style={{ fontSize: 11, color: '#64748B', marginTop: 8 }}>
                        Para botones de confirmar pedido y acciones positivas
                    </p>
                </Card>

                {/* =========================================== */}
                {/* SECTION 3: SOCIAL PILLS */}
                {/* =========================================== */}
                <SectionHeader number={3} title="Info Pills" />
                <Card>
                    <p style={{ fontSize: 11, color: '#64748B', marginBottom: 12 }}>
                        Colores de los botones en la página Info
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                            { id: 'whatsapp', label: 'WhatsApp', icon: '💬', defaultBg: '#C4856A' },
                            { id: 'mercadoPago', label: 'Mercado Pago', icon: '💳', defaultBg: '#FFE600' },
                            { id: 'rappi', label: 'Rappi', icon: '🛵', defaultBg: '#FF5A00' },
                            { id: 'pedidosYa', label: 'PedidosYa', icon: '🍕', defaultBg: '#E31837' },
                            { id: 'instagram', label: 'Instagram', icon: '📸', defaultBg: '#E1306C' },
                            { id: 'adminAccess', label: 'Admin', icon: '🔒', defaultBg: '#FFFFFF' }
                        ].map(pill => {
                            const bgColor = config.infoPills?.[pill.id]?.bgColor || pill.defaultBg;
                            const isLight = pill.id === 'mercadoPago' || pill.id === 'adminAccess';
                            return (
                                <button
                                    key={pill.id}
                                    onClick={() => {
                                        const input = document.getElementById(`pill-${pill.id}`);
                                        if (input) input.click();
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        padding: '10px 12px',
                                        backgroundColor: bgColor,
                                        color: isLight ? '#1F2937' : '#FFFFFF',
                                        borderRadius: 20,
                                        border: pill.id === 'adminAccess' ? '1px solid #E5E7EB' : 'none',
                                        fontSize: 12,
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span>{pill.icon}</span>
                                    <span>{pill.label}</span>
                                    <input
                                        id={`pill-${pill.id}`}
                                        type="color"
                                        value={bgColor}
                                        onChange={(e) => {
                                            updateSettingsCloud({
                                                infoPills: {
                                                    ...config.infoPills,
                                                    [pill.id]: { ...(config.infoPills?.[pill.id] || {}), bgColor: e.target.value }
                                                }
                                            });
                                        }}
                                        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </Card>

                {/* =========================================== */}
                {/* SECTION 4: FOOTER */}
                {/* =========================================== */}
                <SectionHeader number={4} title="Pie de Página" />
                <Card>
                    <ColorSwatch
                        label="Color 'Powered by FoodSpot'"
                        color={config.poweredByColor || '#C4856A'}
                        onClick={() => setActiveColorPicker('poweredBy')}
                        onNativeFallback={(color) => {
                            updateSettingsCloud({ branding: { poweredByColor: color } });
                        }}
                    />
                </Card>

            </div>

            {/* =========================================== */}
            {/* COLOR PICKER MODALS */}
            {/* =========================================== */}
            {activeColorPicker === 'primary' && (
                <ColorPickerModal
                    title="Color Primario"
                    initialColor={config.primaryColor || '#8B7355'}
                    onLiveChange={(color) => {
                        // 🚀 DIRECT-DOM: Zero React overhead
                        injectCSSVariable('--color-primary', color);
                        injectCSSVariable('--nav-primary-color', color);
                    }}
                    onApply={(color) => {
                        updateSettingsCloud({
                            branding: { primaryColor: color },
                            // Legacy support if needed
                            colors: { primary: color }
                        });
                        setActiveColorPicker(null);
                    }}
                    onClose={() => setActiveColorPicker(null)}
                />
            )}

            {activeColorPicker === 'confirmation' && (
                <ColorPickerModal
                    title="Color de Confirmación"
                    initialColor={config.confirmationColor || '#22C55E'}
                    onLiveChange={(color) => {
                        injectCSSVariable('--color-confirmation', color);
                    }}
                    onApply={(color) => {
                        updateSettingsCloud({ colors: { confirmation: color } });
                        setActiveColorPicker(null);
                    }}
                    onClose={() => setActiveColorPicker(null)}
                />
            )}

            {activeColorPicker === 'poweredBy' && (
                <ColorPickerModal
                    title="Color Powered By"
                    initialColor={config.poweredByColor || '#C4856A'}
                    onLiveChange={() => { /* No live preview needed for footer */ }}
                    onApply={(color) => {
                        updateSettingsCloud({ branding: { poweredByColor: color } });
                        setActiveColorPicker(null);
                    }}
                    onClose={() => setActiveColorPicker(null)}
                />
            )}

            {/* Cover Editor Modal */}
            <CoverImageEditor
                isOpen={showCoverEditor}
                onClose={() => setShowCoverEditor(false)}
                onSave={(coverData) => {
                    // Adjust based on your DB schema for hero image
                    updateSettingsCloud({ headerCover: coverData });
                    setShowCoverEditor(false);
                }}
                initialData={{ image: config.heroUrl }}
                config={config}
            />

            {/* Backend Navigation */}
            <BackendNav role="owner" useRoutes={true} />
        </div>
    );
}

export default Settings;
