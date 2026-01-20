// src/pages/owner/Settings.jsx - OPERATION VAULT-SEAL FINAL
import React, { useState, useEffect, useRef } from 'react';
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

    // 🛡️ LOCAL STATE: Critical for 60fps typing (START-PROCESS-FINISH pattern)
    const [localIdentity, setLocalIdentity] = useState({
        business_name: '',
        font_family: 'Inter',
        font_weight: '600'
    });

    // 🛡️ DROPDOWN STATE: Independent control for Font Selector
    const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
    const [isWeightMenuOpen, setIsWeightMenuOpen] = useState(false);
    const fontMenuRef = useRef(null);
    const weightMenuRef = useRef(null);

    // 🛡️ THE DATA PUMP: SYNC CONTEXT TO UI
    useEffect(() => {
        if (tenant) {
            console.log("🔄 PUMPING DATA TO UI:", tenant);

            // 1. Update the Inputs (data is directly on tenant, NOT tenant.branding)
            setLocalIdentity({
                business_name: tenant.business_name || '',
                font_family: tenant.font_family || 'Inter',
                font_weight: tenant.font_weight || '600'
            });

            // 2. Force the CSS Visuals
            if (tenant.font_family) {
                document.documentElement.style.setProperty('--font-main', tenant.font_family);
            }
            if (tenant.font_weight) {
                document.documentElement.style.setProperty('--font-weight-hero', tenant.font_weight);
            }
        }
    }, [tenant]);

    // TAP OUTSIDE: Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (fontMenuRef.current && !fontMenuRef.current.contains(event.target)) {
                setIsFontMenuOpen(false);
            }
            if (weightMenuRef.current && !weightMenuRef.current.contains(event.target)) {
                setIsWeightMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    // PROCESS: Handle typing (local state only - no DB calls)
    const handleNameChange = (e) => {
        setLocalIdentity(prev => ({ ...prev, business_name: e.target.value }));
    };

    // 🛡️ THE FLIGHT RECORDER WRAPPER
    const runDiagnosticSave = async (label, saveFn, updates) => {
        if (!businessId) {
            alert(`🚨 [${label}] FAILED: No Business ID found.`);
            return;
        }

        try {
            const { data, error } = await saveFn(updates, businessId);
            if (error) throw error;

            // Success Logic
            syncContext(updates);
            console.log(`✅ [${label}] Saved:`, updates);
        } catch (err) {
            alert(`❌ [${label}] DB ERROR: ${err.message}\nTip: Check for duplicate rows.`);
            console.error(`${label} Error Details:`, err);
        }
    };

    // 🛡️ UPDATED BOX 1 HANDLERS
    const handleNameBlur = () => {
        runDiagnosticSave("Identity Name", updateBranding, { business_name: localIdentity.business_name });
    };

    const handleFontSelect = (family) => {
        setLocalIdentity(prev => ({ ...prev, font_family: family }));
        document.documentElement.style.setProperty('--font-main', family);
        setIsFontMenuOpen(false);
        runDiagnosticSave("Typography Font", updateBranding, { font_family: family });
    };

    const handleWeightSelect = (weight) => {
        setLocalIdentity(prev => ({ ...prev, font_weight: weight }));
        document.documentElement.style.setProperty('--font-weight-hero', weight);
        setIsWeightMenuOpen(false);
        runDiagnosticSave("Typography Weight", updateBranding, { font_weight: weight });
    };

    // 🛡️ GLOBAL OPTIMISTIC SYNC ADAPTER
    const syncContext = (updates) => {
        // Dispatch event for App.jsx / TenantContext to catch
        window.dispatchEvent(new CustomEvent('frontendSync', { detail: updates }));

        // Also manually mutate the local tenant object for immediate React re-render if needed
        // (Though direct DOM manipulation handles the visuals)
        if (tenant) {
            Object.assign(tenant, updates);
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
                {/* IDENTITY SECTION - LOCAL STATE PATTERN */}
                <section className="branding-card">
                    <h3>Identidad y Texto</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* BUSINESS NAME: onChange (PROCESS) + onBlur (FINISH) */}
                        <input
                            type="text"
                            className="fs-input"
                            value={localIdentity.business_name}
                            onChange={handleNameChange}
                            onBlur={handleNameBlur}
                            placeholder="Nombre del Negocio"
                        />
                        <div className="typo-grid">
                            {/* FONT FAMILY: Custom Dropdown */}
                            <div className="custom-dropdown" ref={fontMenuRef}>
                                <button
                                    type="button"
                                    className="dropdown-trigger"
                                    onClick={() => setIsFontMenuOpen(!isFontMenuOpen)}
                                >
                                    <span>{localIdentity.font_family}</span>
                                    <span className="dropdown-arrow">▼</span>
                                </button>
                                {isFontMenuOpen && (
                                    <div className="dropdown-menu">
                                        {['Inter', 'Roboto', 'Outfit', 'Lora'].map((font) => (
                                            <div
                                                key={font}
                                                className={`dropdown-option ${localIdentity.font_family === font ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleFontSelect(font);
                                                }}
                                                style={{ fontFamily: font }}
                                            >
                                                {font}
                                                {localIdentity.font_family === font && <span className="check">✓</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* FONT WEIGHT: Custom Dropdown */}
                            <div className="custom-dropdown" ref={weightMenuRef}>
                                <button
                                    type="button"
                                    className="dropdown-trigger"
                                    onClick={() => setIsWeightMenuOpen(!isWeightMenuOpen)}
                                >
                                    <span>
                                        {localIdentity.font_weight === '400' ? 'Normal' :
                                            localIdentity.font_weight === '500' ? 'Medium' :
                                                localIdentity.font_weight === '600' ? 'Semi-Bold' :
                                                    localIdentity.font_weight === '700' ? 'Bold' :
                                                        localIdentity.font_weight === '800' ? 'Extra Bold' : 'Semi-Bold'}
                                    </span>
                                    <span className="dropdown-arrow">▼</span>
                                </button>
                                {isWeightMenuOpen && (
                                    <div className="dropdown-menu">
                                        {[
                                            { value: '400', label: 'Normal' },
                                            { value: '500', label: 'Medium' },
                                            { value: '600', label: 'Semi-Bold' },
                                            { value: '700', label: 'Bold' },
                                            { value: '800', label: 'Extra Bold' }
                                        ].map((option) => (
                                            <div
                                                key={option.value}
                                                className={`dropdown-option ${localIdentity.font_weight === option.value ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleWeightSelect(option.value);
                                                }}
                                                style={{ fontWeight: option.value }}
                                            >
                                                {option.label}
                                                {localIdentity.font_weight === option.value && <span className="check">✓</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
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
                                className={tenant?.hero_mode === 'text' ? 'active' : ''}
                            >
                                Texto
                            </button>
                            <button
                                onClick={() => handleFieldUpdate('hero_mode', 'image')}
                                className={tenant?.hero_mode === 'image' ? 'active' : ''}
                            >
                                Imagen
                            </button>
                        </div>
                    </div>

                    {tenant?.hero_mode === 'image' ? (
                        <div className="hero-stage">
                            <div className="editor-crosshair">+</div>
                            {tenant?.hero_url ? (
                                <img src={tenant.hero_url} className="preview-img" alt="Hero" />
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
                                fontFamily: tenant?.font_family,
                                fontWeight: tenant?.font_weight
                            }}
                        >
                            {tenant?.business_name || 'Business Name'}
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
                                className={tenant?.hero_icon_mode === 'white' ? 'active' : ''}
                            >
                                Blanco
                            </button>
                            <button
                                onClick={() => handleFieldUpdate('hero_icon_mode', 'black')}
                                className={tenant?.hero_icon_mode === 'black' ? 'active' : ''}
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
                                className={tenant?.nav_icon_mode === 'white' ? 'active' : ''}
                            >
                                Blanco
                            </button>
                            <button
                                onClick={() => handleFieldUpdate('nav_icon_mode', 'black')}
                                className={tenant?.nav_icon_mode === 'black' ? 'active' : ''}
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
                                value={tenant?.navbar_color || '#1F2937'}
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
                            const pills = tenant?.info_pills || {};
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
