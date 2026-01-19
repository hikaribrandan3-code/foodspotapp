// src/pages/owner/Settings.jsx - OPERATION VAULT-SEAL FINAL
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext'; // SILO SOURCE OF TRUTH
import { updateBranding, uploadAsset, supabase } from '../../lib/supabaseClient';
import BackendHeader from '../../components/BackendHeader';
import BackendNav from '../../components/BackendNav';
import { clearAuth } from '../../utils/storage';
import './Settings.css';

const Settings = () => {
    // 🛡️ Safe Destructuring: Alias tenantData to tenant to match snippet logic
    const { tenantData: tenant, businessId } = useTenant();
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();

    // 🛡️ GLOBAL OPTIMISTIC SYNC ADAPTER
    const syncContext = (updates) => {
        // Dispatch event for App.jsx / TenantContext to catch
        window.dispatchEvent(new CustomEvent('frontendSync', { detail: updates }));

        // Also manually mutate the local tenant object for immediate React re-render if needed
        // (Though direct DOM manipulation handles the visuals)
        if (tenant && tenant.branding) {
            Object.assign(tenant.branding, updates);
        }
    };

    // 1. IDENTITY & TYPOGRAPHY SYNC
    const handleFieldUpdate = async (field, value) => {
        if (!businessId) return;

        // Instant visual mapping for Typography
        if (field === 'font_family') document.documentElement.style.setProperty('--font-main', value);
        if (field === 'font_weight') document.documentElement.style.setProperty('--font-weight-hero', value);

        // Instant mapping for Hero Mode
        if (field === 'hero_mode') {
            // Already handled by React state update via tenant mutation in syncContext
        }

        // Update local DOM state immediately
        syncContext({ [field]: value });

        // Silo-Hardened Persistence
        try {
            await updateBranding({ [field]: value }, businessId);
        } catch (error) {
            console.error("Sync failed:", error);
        }
    };

    // Helper to convert hex to RGB triplet for rgba() usage in CSS
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ?
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
            '0, 0, 0';
    };

    // 2. STANDARDIZED "GOAT" COLOR PILLAR
    const ColorPillar = ({ label, keyName, cssVar, defaultValue }) => {
        const currentColor = tenant?.branding?.[keyName] || defaultValue;
        return (
            <div className="color-pillar">
                <p className="pillar-label">{label}</p>
                <input
                    type="color"
                    className="native-swatch"
                    value={currentColor}
                    onChange={(e) => {
                        const val = e.target.value;
                        // 🛡️ DIRECT DOM BYPASS (Sub-16ms feedback)
                        document.documentElement.style.setProperty(cssVar, val);
                        // Also set RGB version for semi-transparent backgrounds
                        document.documentElement.style.setProperty(`${cssVar}-rgb`, hexToRgb(val));

                        // Silo-Hardened Persistence
                        updateBranding({ [keyName]: val }, businessId);
                        syncContext({ [keyName]: val });
                    }}
                />
            </div>
        );
    };

    // LOGOUT & NAVIGATION LOGIC
    const handleLogout = async () => {
        await supabase.auth.signOut();
        clearAuth();
        window.location.href = `/${tenant?.slug || ''}`;
    };

    // HERO IMAGE UPLOAD LOGIC
    const handleHeroUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !businessId) return;

        try {
            setIsSaving(true);
            const { url, error } = await uploadAsset(file, businessId, 'branding');
            if (error) throw error;

            if (url) {
                // Instant update
                handleFieldUpdate('hero_url', url);
                handleFieldUpdate('hero_mode', 'image');
            }
        } catch (err) {
            console.error("Upload failed", err);
            alert("Error uploading image");
        } finally {
            setIsSaving(false);
        }
    };

    if (!tenant) return <div className="p-4 text-center text-gray-500">Loading Vault...</div>;

    return (
        <div className="bg-[#F8FAFC] min-h-screen">
            <BackendHeader
                title="Configuración"
                onLogout={handleLogout}
            />

            <div className="settings-vault">
                {/* IDENTITY SECTION */}
                <section className="branding-card">
                    <h3>Identidad y Texto</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                            type="text"
                            className="fs-input"
                            value={tenant.branding?.business_name || ''}
                            onChange={(e) => handleFieldUpdate('business_name', e.target.value)}
                            placeholder="Nombre del Negocio"
                        />
                        <div className="typo-grid">
                            <select
                                value={tenant.branding?.font_family || 'Inter'}
                                onChange={(e) => handleFieldUpdate('font_family', e.target.value)}
                            >
                                <option value="Inter">Inter (Clean)</option>
                                <option value="Roboto">Roboto (Modern)</option>
                                <option value="Outfit">Outfit (Bold)</option>
                                <option value="Lora">Lora (Serif)</option>
                            </select>
                            <select
                                value={tenant.branding?.font_weight || '600'}
                                onChange={(e) => handleFieldUpdate('font_weight', e.target.value)}
                            >
                                <option value="400">Normal</option>
                                <option value="500">Medium</option>
                                <option value="600">Semi-Bold</option>
                                <option value="700">Bold</option>
                                <option value="800">Extra Bold</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* HERO STAGE - SMART FALLBACK */}
                <section className="branding-card">
                    <div className="section-header">
                        <h3>Hero Cover</h3>
                        <div className="mode-toggle">
                            <button
                                onClick={() => handleFieldUpdate('hero_mode', 'text')}
                                className={tenant.branding?.hero_mode === 'text' ? 'active' : ''}
                            >
                                Texto
                            </button>
                            <button
                                onClick={() => handleFieldUpdate('hero_mode', 'image')}
                                className={tenant.branding?.hero_mode === 'image' ? 'active' : ''}
                            >
                                Imagen
                            </button>
                        </div>
                    </div>

                    {tenant.branding?.hero_mode === 'image' ? (
                        <div className="hero-stage">
                            <div className="editor-crosshair">+</div>
                            {tenant.branding?.hero_url ? (
                                <img src={tenant.branding.hero_url} className="preview-img" alt="Hero" />
                            ) : (
                                <div style={{ color: '#94A3B8' }}>No image set</div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="hero-upload-input"
                                onChange={handleHeroUpload}
                            />
                        </div>
                    ) : (
                        <div
                            className="hero-preview-text"
                            style={{
                                fontFamily: tenant.branding?.font_family,
                                fontWeight: tenant.branding?.font_weight
                            }}
                        >
                            {tenant.branding?.business_name || 'Business Name'}
                        </div>
                    )}
                </section>

                {/* THE BIG FOUR COLORS */}
                <section className="branding-card">
                    <h3>Colores de Tema</h3>
                    <div className="color-grid">
                        <ColorPillar label="Primario" keyName="primary_color" cssVar="--color-primary" defaultValue="#B8956A" />
                        <ColorPillar label="Secundario" keyName="secondary_color" cssVar="--color-secondary" defaultValue="#A89070" />
                        <ColorPillar label="Confirmación" keyName="confirmation_color" cssVar="--color-confirm" defaultValue="#22C55E" />
                        <ColorPillar label="Powered By" keyName="powered_by_color" cssVar="--color-powered" defaultValue="#C4856A" />
                    </div>
                </section>

                {/* MODO ICONOS - INDEPENDENT TOGGLES */}
                <section className="branding-card">
                    <h3>Estilo de Iconos</h3>
                    <div className="mode-row">
                        <p>Hero Icons (Inicio)</p>
                        <div className="toggle-group">
                            <button
                                onClick={() => handleFieldUpdate('hero_icon_mode', 'white')}
                                className={tenant.branding?.hero_icon_mode === 'white' ? 'active' : ''}
                            >
                                Blanco
                            </button>
                            <button
                                onClick={() => handleFieldUpdate('hero_icon_mode', 'black')}
                                className={tenant.branding?.hero_icon_mode === 'black' ? 'active' : ''}
                            >
                                Oscuro
                            </button>
                        </div>
                    </div>
                    <div className="mode-row">
                        <p>Nav Icons (Barra inf.)</p>
                        <div className="toggle-group">
                            <button
                                onClick={() => handleFieldUpdate('nav_icon_mode', 'white')}
                                className={tenant.branding?.nav_icon_mode === 'white' ? 'active' : ''}
                            >
                                Blanco
                            </button>
                            <button
                                onClick={() => handleFieldUpdate('nav_icon_mode', 'black')}
                                className={tenant.branding?.nav_icon_mode === 'black' ? 'active' : ''}
                            >
                                Oscuro
                            </button>
                        </div>
                    </div>
                    {/* Unified Navbar Background */}
                    <div className="mode-row" style={{ borderTop: '1px solid #F1F5F9', marginTop: 12, paddingTop: 12 }}>
                        <p>Fondo de Barra</p>
                        <div style={{ width: 60 }}>
                            <input
                                type="color"
                                className="native-swatch"
                                value={tenant.branding?.navbar_color || '#1F2937'}
                                onChange={(e) => {
                                    handleFieldUpdate('navbar_color', e.target.value);
                                    document.documentElement.style.setProperty('--color-navbar-bg', e.target.value);
                                }}
                            />
                        </div>
                    </div>
                </section>

                {/* INFO PILLS - STANDARDIZED WITH CSS VARS */}
                <section className="branding-card">
                    <h3>Botones Info (Pills)</h3>
                    <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>Activa solo lo necesario.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {['whatsapp', 'rappi', 'mercadopago', 'pedidosya', 'admin'].map(pillId => {
                            const pills = tenant.branding?.info_pills || {};
                            const isActive = pills[pillId]?.enabled;

                            const togglePill = () => {
                                const newPills = {
                                    ...pills,
                                    [pillId]: {
                                        ...(pills[pillId] || {}),
                                        enabled: !isActive
                                    }
                                };
                                handleFieldUpdate('info_pills', newPills);
                            };

                            const labels = {
                                whatsapp: 'WhatsApp',
                                rappi: 'Rappi',
                                mercadopago: 'Mercado Pago',
                                pedidosya: 'PedidosYa',
                                admin: 'Admin Login'
                            };

                            return (
                                <button
                                    key={pillId}
                                    onClick={togglePill}
                                    style={{
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: isActive ? '1.5px solid var(--color-primary)' : '1px solid #E2E8F0',
                                        background: isActive ? 'rgba(var(--color-primary-rgb), 0.1)' : '#FFF',
                                        color: isActive ? 'var(--color-primary)' : '#64748B',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        textAlign: 'center'
                                    }}
                                >
                                    {labels[pillId] || pillId}
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>

            <BackendNav role="owner" useRoutes={true} />
        </div>
    );
};

export default Settings;
