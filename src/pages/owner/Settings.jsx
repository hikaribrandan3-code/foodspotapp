// src/pages/owner/Settings.jsx - VISUAL MIRROR v2.0
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { updateBranding, uploadAsset, supabase } from '../../lib/supabaseClient';
import BackendHeader from '../../components/BackendHeader';
import BackendNav from '../../components/BackendNav';
import CoverImageEditor from '../../components/CoverImageEditor';
import ColorPickerModal from '../../components/ColorPickerModal';
import { clearAuth } from '../../utils/storage';
import { updateConfig } from '../../config/appConfig.v2.js'; // updateConfig kept for potential future use
import { MenuIcon, DeliveryIcon, PromosIcon, GameIcon } from '../../components/HeroIcons.jsx';
import './Settings.css';

// --- MINI NAV ICONS (24px versions for compact preview) ---
const NavHomeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
)
const NavMenuIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
)
const NavCameraIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
    </svg>
)
const NavStatusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"></path>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
    </svg>
)
const NavInfoIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
)

// Hero icon definitions for the interactive grid
const HERO_ICON_DEFS = [
    { id: 'menu', label: 'Menú', Icon: MenuIcon },
    { id: 'delivery', label: 'Envíos', Icon: DeliveryIcon },
    { id: 'promos', label: 'Promos', Icon: PromosIcon },
    { id: 'game', label: 'Juego', Icon: GameIcon }
];

const Settings = () => {
    const { tenantData: tenant, businessId, refreshTenantData } = useTenant();
    const [isSaving, setIsSaving] = useState(false);
    // 🛡️ ATOMIC SAVE STATE (Manual Persistence v5.0)
    const [hasChanges, setHasChanges] = useState(
        () => sessionStorage.getItem(`dirty_branding_${businessId}`) === 'true'
    );
    const [saveStatus, setSaveStatus] = useState(null);

    // Persistence Hook
    useEffect(() => {
        if (businessId) {
            sessionStorage.setItem(`dirty_branding_${businessId}`, hasChanges);
        }
    }, [hasChanges, businessId]);
    const navigate = useNavigate();

    // LOCAL STATE for 60fps typing
    const [localIdentity, setLocalIdentity] = useState({
        business_name: '',
        font_family: 'Inter',
        font_weight: '600'
    });

    // Dropdown states
    const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
    const [isWeightMenuOpen, setIsWeightMenuOpen] = useState(false);
    const fontMenuRef = useRef(null);
    const weightMenuRef = useRef(null);

    // Modal states
    const [showCoverEditor, setShowCoverEditor] = useState(false);
    const [colorPickerState, setColorPickerState] = useState({
        isOpen: false,
        title: '',
        keyName: '',
        cssVar: '',
        initialColor: '#8B7355',
        originalColor: '#8B7355' // For revert on cancel
    });

    // Local preview colors (for instant feedback without re-render)
    const [heroIconColors, setHeroIconColors] = useState({
        menu: '#FFFFFF',
        delivery: '#FFFFFF',
        promos: '#FFFFFF',
        game: '#FFFFFF'
    });

    // Data Pump: Sync context to UI
    useEffect(() => {
        if (tenant) {
            setLocalIdentity({
                business_name: tenant.business_name || '',
                font_family: tenant.font_family || 'Inter',
                font_weight: tenant.font_weight || '600'
            });

            // Sync hero icon colors from tenant
            const icons = tenant.hero_icons || {};
            setHeroIconColors({
                menu: icons.menu?.color || '#FFFFFF',
                delivery: icons.delivery?.color || '#FFFFFF',
                promos: icons.promos?.color || '#FFFFFF',
                game: icons.game?.color || '#FFFFFF'
            });

            // Force CSS visuals
            if (tenant.font_family) {
                document.documentElement.style.setProperty('--font-main', tenant.font_family);
            }
            if (tenant.font_weight) {
                document.documentElement.style.setProperty('--font-weight-hero', tenant.font_weight);
            }
            if (tenant.navbar_color) {
                document.documentElement.style.setProperty('--color-navbar-bg', tenant.navbar_color);
            }
        }
    }, [tenant]);

    // 🛡️ BODY SCROLL LOCK: Prevent background scroll when ColorPicker is open
    useEffect(() => {
        if (colorPickerState.isOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [colorPickerState.isOpen]);

    // Close dropdowns on outside click
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

    // Optimistic Sync Adapter
    const syncContext = (updates) => {
        window.dispatchEvent(new CustomEvent('frontendSync', { detail: updates }));
        if (tenant) {
            Object.assign(tenant, updates);
        }
    };

    // Field Update Handler
    const handleFieldUpdate = async (field, value) => {
        if (!businessId) return;

        // Instant CSS mapping
        if (field === 'font_family') document.documentElement.style.setProperty('--font-main', value);
        if (field === 'font_weight') document.documentElement.style.setProperty('--font-weight-hero', value);
        if (field === 'navbar_color') document.documentElement.style.setProperty('--color-navbar-bg', value);

        syncContext({ [field]: value });

        // 💾 PERSIST TO STORAGE (Fixes BottomNav sync on route change)
        // Map Supabase (snake_case) to appConfig (structure)
        // 🎨 VAULT SEAL: All 4 theme colors + branding fields
        const storageUpdates = {};
        const BRANDING_FIELDS = [
            'navbar_color', 'nav_icon_mode', 'business_name', 'font_family', 'font_weight',
            'primary_color', 'secondary_color', 'confirmation_color', 'powered_by_color'
        ];
        if (BRANDING_FIELDS.includes(field)) {
            storageUpdates.branding = { [field]: value };
            // Also map to colors object for App.jsx CSS hydration
            if (['primary_color', 'secondary_color', 'confirmation_color', 'powered_by_color'].includes(field)) {
                let colorKey = field.replace('_color', ''); // e.g., 'confirmation'
                if (colorKey === 'powered_by') colorKey = 'powered'; // 🩹 FIX: App.jsx expects 'powered'
                storageUpdates.colors = { [colorKey]: value };
            }
        } else if (field === 'hero_mode' || field === 'hero_url') {
            storageUpdates.headerBranding = { [field]: value };
            storageUpdates[field] = value; // Save at root too for Home.jsx polyfills
        } else if (field === 'info_pills') {
            // 🩹 PATCH: Map snake_case (DB) to camelCase (App) for local storage
            storageUpdates.infoPills = value;
        } else {
            storageUpdates[field] = value;
        }
        // 🛡️ CLOUD-FIRST: localStorage writes disabled.
        // updateConfig(storageUpdates);

        // 🛡️ ATOMIC PROTOCOL: Mark as dirty, do NOT sync yet.
        setHasChanges(true);
    };

    // Hero Icon Color Update
    const handleHeroIconColorUpdate = async (iconId, color) => {
        if (!businessId) return;

        const currentIcons = tenant?.hero_icons || {};
        const updatedIcons = {
            ...currentIcons,
            [iconId]: {
                ...(currentIcons[iconId] || {}),
                color: color
            }
        };

        // Update local state for instant preview
        setHeroIconColors(prev => ({ ...prev, [iconId]: color }));
        syncContext({ hero_icons: updatedIcons });

        // 🛡️ CLOUD-FIRST: localStorage writes disabled.
        // updateConfig({
        //     hero_icons: updatedIcons,
        //     heroIcons: { // Attempt to map to camelCase structure for completeness
        //         [iconId]: { color: color }
        //     }
        // });

        // 🛡️ ATOMIC PROTOCOL: Mark as dirty
        setHasChanges(true);
    };

    // Typography handlers
    const handleNameChange = (e) => {
        setLocalIdentity(prev => ({ ...prev, business_name: e.target.value }));
    };

    const handleNameBlur = async () => {
        if (!businessId) return;
        syncContext({ business_name: localIdentity.business_name });
        // 🛡️ ATOMIC PROTOCOL: Mark as dirty
        setHasChanges(true);
    };

    const handleFontSelect = (family) => {
        setLocalIdentity(prev => ({ ...prev, font_family: family }));
        document.documentElement.style.setProperty('--font-main', family);
        setIsFontMenuOpen(false);
        handleFieldUpdate('font_family', family);
    };

    const handleWeightSelect = (weight) => {
        setLocalIdentity(prev => ({ ...prev, font_weight: weight }));
        document.documentElement.style.setProperty('--font-weight-hero', weight);
        setIsWeightMenuOpen(false);
        handleFieldUpdate('font_weight', weight);
    };

    // Color Picker Modal Handlers
    const openColorPicker = (title, keyName, cssVar, defaultColor) => {
        const currentColor = tenant?.[keyName] || defaultColor;
        setColorPickerState({
            isOpen: true,
            title,
            keyName,
            cssVar,
            initialColor: currentColor,
            originalColor: currentColor
        });
    };

    const openHeroIconColorPicker = (iconId, label) => {
        const currentColor = heroIconColors[iconId] || '#FFFFFF';
        setColorPickerState({
            isOpen: true,
            title: `Color: ${label}`,
            keyName: `hero_icon_${iconId}`,
            cssVar: '',
            initialColor: currentColor,
            originalColor: currentColor,
            isHeroIcon: true,
            iconId: iconId
        });
    };

    const handleColorPickerLiveChange = (newColor) => {
        // Instant preview via CSS or local state
        if (colorPickerState.cssVar) {
            document.documentElement.style.setProperty(colorPickerState.cssVar, newColor);
        }
        if (colorPickerState.isHeroIcon) {
            setHeroIconColors(prev => ({ ...prev, [colorPickerState.iconId]: newColor }));
        }
    };

    const handleColorPickerApply = (finalColor) => {
        if (colorPickerState.isHeroIcon) {
            handleHeroIconColorUpdate(colorPickerState.iconId, finalColor);
        } else if (colorPickerState.keyName.startsWith('info_pill_')) {
            // Interceptor for Nested Info Pills
            const pillId = colorPickerState.keyName.replace('info_pill_', '');
            const currentPills = tenant?.info_pills || {};
            const newPills = {
                ...currentPills,
                [pillId]: { ...(currentPills[pillId] || {}), bgColor: finalColor }
            };
            handleFieldUpdate('info_pills', newPills);
        } else {
            handleFieldUpdate(colorPickerState.keyName, finalColor);
        }
        setColorPickerState(prev => ({ ...prev, isOpen: false }));
    };

    const handleColorPickerClose = () => {
        // Revert to original color
        if (colorPickerState.cssVar) {
            document.documentElement.style.setProperty(colorPickerState.cssVar, colorPickerState.originalColor);
        }
        if (colorPickerState.isHeroIcon) {
            setHeroIconColors(prev => ({ ...prev, [colorPickerState.iconId]: colorPickerState.originalColor }));
        }
        setColorPickerState(prev => ({ ...prev, isOpen: false }));
    };

    // Logout
    const handleLogout = async () => {
        await supabase.auth.signOut();
        clearAuth();
        window.location.href = `/${tenant?.slug || ''}`;
    };

    // 💾 THE ATOMIC SAVE (Manual Persistence Protocol v5.0)
    const handlePlatformSave = async () => {
        setIsSaving(true);
        console.log('💾 SAVING BRANDING VAULT:', businessId);

        try {
            // 1. Construct Full Payload from Optimistic Tenant State
            const payload = {
                business_name: tenant.business_name,
                font_family: tenant.font_family,
                font_weight: tenant.font_weight,
                navbar_color: tenant.navbar_color,
                nav_icon_mode: tenant.nav_icon_mode,
                primary_color: tenant.primary_color,
                secondary_color: tenant.secondary_color,
                confirmation_color: tenant.confirmation_color,
                powered_by_color: tenant.powered_by_color,
                hero_mode: tenant.hero_mode,
                hero_url: tenant.hero_url,
                hero_icons: tenant.hero_icons,
                info_pills: tenant.info_pills,
                app_config: tenant.app_config, // 🛡️ JSON STORAGE for extended settings
                updated_at: new Date()
            };

            // 2. Cloud Sync
            await updateBranding(payload, businessId);

            // 3. Global Refresh
            await refreshTenantData();

            // 4. Success State
            setHasChanges(false);
            sessionStorage.removeItem(`dirty_branding_${businessId}`);
            setSaveStatus({ message: '✓ Marca Guardada' });
            setTimeout(() => setSaveStatus(null), 3000);

        } catch (error) {
            console.error("Save failed:", error);
            setSaveStatus({ error: true, message: 'Error al guardar' });
        } finally {
            setIsSaving(false);
        }
    };

    // Helper: Hex to RGB
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ?
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
            '0, 0, 0';
    };

    // Color Pillar Component - USES ColorPickerModal (no native input)
    const ColorPillar = ({ label, keyName, cssVar, defaultValue }) => {
        const currentColor = tenant?.[keyName] || defaultValue;
        return (
            <div className="color-pillar">
                <p className="pillar-label">{label}</p>
                {/* Clickable swatch - opens ColorPickerModal */}
                <div
                    onClick={() => openColorPicker(label, keyName, cssVar, defaultValue)}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: currentColor,
                        border: '2px solid rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                />
            </div>
        );
    };

    if (!tenant) return <div className="p-4 text-center text-gray-500">Loading Vault...</div>;

    const heroIconMode = tenant?.hero_icon_mode || 'black';
    const navIconMode = tenant?.nav_icon_mode || 'white';
    const navbarColor = tenant?.navbar_color || '#1F2937';

    return (
        <div className="bg-[#F8FAFC] min-h-screen">
            <BackendHeader title="Configuración" onLogout={handleLogout} />

            <div className="settings-vault">
                {/* ========== 1. IDENTITY & TYPOGRAPHY ========== */}
                <section className="branding-card">
                    <h3>1. Identidad y Texto</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                            type="text"
                            className="fs-input"
                            value={localIdentity.business_name}
                            onChange={handleNameChange}
                            onBlur={handleNameBlur}
                            placeholder="Nombre del Negocio"
                        />
                        <div className="typo-grid">
                            {/* Font Family Dropdown */}
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
                                        {['Inter', 'Roboto', 'Outfit', 'Lora', 'Poppins', 'Montserrat'].map((font) => (
                                            <div
                                                key={font}
                                                className={`dropdown-option ${localIdentity.font_family === font ? 'active' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); handleFontSelect(font); }}
                                                style={{ fontFamily: font }}
                                            >
                                                {font}
                                                {localIdentity.font_family === font && <span className="check">✓</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Font Weight Dropdown */}
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
                                                onClick={(e) => { e.stopPropagation(); handleWeightSelect(option.value); }}
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

                {/* ========== 2. HERO COVER ========== */}
                <section className="branding-card">
                    <div className="section-header">
                        <h3>2. Hero Cover</h3>
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
                        <div className="hero-studio-trigger" onClick={() => setShowCoverEditor(true)}>
                            {tenant?.hero_url ? (
                                <>
                                    <div className="editor-crosshair">+</div>
                                    <img src={tenant.hero_url} className="preview-img" alt="Hero" />
                                    <div className="edit-overlay"><span>✎ Editar Imagen</span></div>
                                </>
                            ) : (
                                <div className="empty-state">
                                    <span className="plus-icon">+</span>
                                    <span>Subir Logo/Cover</span>
                                </div>
                            )}
                        </div>

                    ) : (
                        <div
                            className="hero-preview-text"
                            style={{ fontFamily: tenant?.font_family, fontWeight: tenant?.font_weight }}
                        >
                            {tenant?.business_name || 'Business Name'}
                        </div>
                    )}

                    {/* COVER IMAGE EDITOR MODAL */}
                    <CoverImageEditor
                        isOpen={showCoverEditor}
                        onClose={() => setShowCoverEditor(false)}
                        businessId={businessId}
                        initialData={() => {
                            // 🔮 HYDRATION: Read from URL params if available
                            if (!tenant?.hero_url) return {};
                            try {
                                const url = new URL(tenant.hero_url);
                                const params = new URLSearchParams(url.search);
                                return {
                                    image: tenant.hero_url,
                                    scale: parseFloat(params.get('s')) || 1,
                                    offsetX: parseFloat(params.get('x')) || 0,
                                    offsetY: parseFloat(params.get('y')) || 0,
                                }
                            } catch (e) {
                                return { image: tenant.hero_url, scale: 1, offsetX: 0, offsetY: 0 };
                            }
                        }}
                        onSave={(data) => {
                            // 💾 ENCODE CROP SETTINGS IN URL
                            // Robust fix: Avoid DB schema dependency by using query params
                            const cleanUrl = data.image.split('?')[0];
                            const timestamp = Date.now();
                            // Use s/x/y shorter keys
                            const finalUrl = `${cleanUrl}?t=${timestamp}&s=${data.scale}&x=${data.offsetX}&y=${data.offsetY}`;

                            console.log('💾 Saving Hero URL with Params:', finalUrl);

                            // Update hero_url directly
                            handleFieldUpdate('hero_url', finalUrl)
                        }}
                    />
                </section>

                {/* ========== 3. HERO ICONS (NEW - WYSIWYG) ========== */}
                <section className="branding-card">
                    <div className="section-header">
                        <h3>3. Hero Icons</h3>
                        <div className="mode-toggle">
                            <button
                                onClick={() => handleFieldUpdate('hero_icon_mode', 'white')}
                                className={heroIconMode === 'white' ? 'active' : ''}
                            >
                                Blanco
                            </button>
                            <button
                                onClick={() => handleFieldUpdate('hero_icon_mode', 'black')}
                                className={heroIconMode === 'black' ? 'active' : ''}
                            >
                                Oscuro
                            </button>
                        </div>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>Toca un icono para cambiar su color de fondo.</p>

                    {/* 2x2 Hero Icons Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                        maxWidth: 280,
                        margin: '0 auto'
                    }}>
                        {HERO_ICON_DEFS.map(({ id, label, Icon }) => {
                            const bgColor = heroIconColors[id] || '#FFFFFF';
                            const iconColor = heroIconMode === 'white' ? '#FFFFFF' : '#4A4036';

                            return (
                                <div
                                    key={id}
                                    onClick={() => openHeroIconColorPicker(id, label)}
                                    style={{
                                        background: bgColor,
                                        borderRadius: 20,
                                        padding: 16,
                                        aspectRatio: '1 / 0.85',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                        border: '2px solid transparent',
                                        transition: 'all 0.2s ease',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ color: iconColor }}><Icon /></div>
                                    <span style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: iconColor,
                                        opacity: 0.9
                                    }}>{label}</span>
                                    {/* Color dot indicator */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 8,
                                        right: 8,
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        background: bgColor,
                                        border: '2px solid white',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                    }} />
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ========== 4. NAVBAR STYLE (MiniNav Preview) ========== */}
                <section className="branding-card">
                    <div className="section-header">
                        <h3>4. Estilo de Barra</h3>
                        <div className="mode-toggle">
                            <button
                                onClick={() => handleFieldUpdate('nav_icon_mode', 'white')}
                                className={navIconMode === 'white' ? 'active' : ''}
                            >
                                Blanco
                            </button>
                            <button
                                onClick={() => handleFieldUpdate('nav_icon_mode', 'black')}
                                className={navIconMode === 'black' ? 'active' : ''}
                            >
                                Oscuro
                            </button>
                        </div>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>Toca la barra para cambiar el color de fondo.</p>

                    {/* MiniNav Preview */}
                    <div
                        onClick={() => openColorPicker('Color de Barra', 'navbar_color', '--color-navbar-bg', '#1F2937')}
                        style={{
                            background: navbarColor,
                            borderRadius: 16,
                            padding: '12px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-around',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            maxWidth: 320,
                            margin: '0 auto'
                        }}
                    >
                        {[NavHomeIcon, NavMenuIcon, NavCameraIcon, NavStatusIcon, NavInfoIcon].map((NavIcon, i) => (
                            <div
                                key={i}
                                style={{
                                    color: navIconMode === 'white' ? '#FFFFFF' : '#1F2937',
                                    opacity: i === 0 ? 1 : 0.6,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 2
                                }}
                            >
                                <NavIcon />
                            </div>
                        ))}
                    </div>
                </section>

                {/* ========== 5. THEME COLORS ========== */}
                <section className="branding-card">
                    <h3>5. Colores de Tema</h3>
                    <div className="color-grid">
                        <ColorPillar label="Primario" keyName="primary_color" cssVar="--color-primary" defaultValue="#B8956A" />
                        <ColorPillar label="Secundario" keyName="secondary_color" cssVar="--color-secondary" defaultValue="#A89070" />
                        <ColorPillar label="Confirmación" keyName="confirmation_color" cssVar="--color-confirm" defaultValue="#22C55E" />
                        <ColorPillar label="Powered By" keyName="powered_by_color" cssVar="--color-powered" defaultValue="#C4856A" />
                    </div>
                </section>

                {/* ========== 6. INFO PILLS ========== */}
                {/* ========== 6. INFO PILLS ========== */}
                <section className="branding-card">
                    <div className="section-header">
                        <h3>6. Botones Info (Pills)</h3>
                        <div className="mode-toggle">
                            <button
                                onClick={() => {
                                    const currentPills = tenant?.info_pills || {};
                                    handleFieldUpdate('info_pills', { ...currentPills, pill_icon_mode: 'white' });
                                }}
                                className={tenant?.info_pills?.pill_icon_mode === 'white' || !tenant?.info_pills?.pill_icon_mode ? 'active' : ''}
                            >
                                Blanco
                            </button>
                            <button
                                onClick={() => {
                                    const currentPills = tenant?.info_pills || {};
                                    handleFieldUpdate('info_pills', { ...currentPills, pill_icon_mode: 'dark' });
                                }}
                                className={tenant?.info_pills?.pill_icon_mode === 'dark' ? 'active' : ''}
                            >
                                Oscuro
                            </button>
                        </div>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>Configura colores, enlaces y visibilidad.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {['whatsapp', 'rappi', 'mercadoPago', 'pedidosYa', 'adminAccess'].map(pillId => {
                            const pills = tenant?.info_pills || {};
                            const pillData = pills[pillId] || {};
                            const isActive = pillData.enabled;
                            const bgColor = pillData.bgColor || '#EEEEEE';
                            const content = pillData.content || '';

                            const labels = {
                                whatsapp: 'WhatsApp',
                                rappi: 'Rappi',
                                mercadoPago: 'Mercado Pago',
                                pedidosYa: 'PedidosYa',
                                adminAccess: 'Admin Login'
                            };

                            const placeHolders = {
                                whatsapp: '+54 9 11 1234 5678',
                                rappi: 'https://rappi.com/...',
                                mercadoPago: 'ALIAS.MP',
                                pedidosYa: 'https://pedidosya.com/...',
                                adminAccess: 'N/A'
                            };

                            const handlePillUpdate = (updates) => {
                                const newPills = {
                                    ...pills,
                                    [pillId]: { ...pillData, ...updates }
                                };
                                handleFieldUpdate('info_pills', newPills);
                            };

                            return (
                                <div key={pillId} className="pill-row">
                                    {/* 1. Toggle & Color Swatch */}
                                    <div
                                        onClick={() => openColorPicker(`Color: ${labels[pillId]}`, `info_pill_${pillId}`, '', bgColor)}
                                        className="pill-swatch"
                                        style={{ background: bgColor }}
                                    />

                                    {/* 2. Content Input */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{labels[pillId]}</span>
                                            <label className="switch-label">
                                                <span style={{ color: isActive ? '#22C55E' : '#94A3B8' }}>
                                                    {isActive ? 'Visible' : 'Oculto'}
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    checked={!!isActive}
                                                    onChange={(e) => handlePillUpdate({ enabled: e.target.checked })}
                                                    style={{ accentColor: '#22C55E' }}
                                                />
                                            </label>
                                        </div>
                                        {pillId !== 'adminAccess' && (
                                            <input
                                                type="text"
                                                className="pill-input"
                                                defaultValue={content}
                                                placeholder={placeHolders[pillId]}
                                                onBlur={(e) => handlePillUpdate({ content: e.target.value })}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div >

            <BackendNav role="owner" useRoutes={true} />

            {/* Cover Image Editor Modal */}
            <CoverImageEditor
                isOpen={showCoverEditor}
                onClose={() => setShowCoverEditor(false)}
                onSave={(data) => {
                    if (data?.image) handleFieldUpdate('hero_url', data.image);
                    setShowCoverEditor(false);
                }}
                initialData={{ image: tenant?.hero_url }}
                config={{}} // Cloud-First: No localStorage dependency
                businessId={businessId}
                heroMode={tenant?.hero_mode}
            />

            {/* Color Picker Modal */}
            {
                colorPickerState.isOpen && (
                    <ColorPickerModal
                        title={colorPickerState.title}
                        initialColor={colorPickerState.initialColor}
                        onLiveChange={handleColorPickerLiveChange}
                        onApply={handleColorPickerApply}
                        onClose={handleColorPickerClose}
                    />
                )
            }

            {/* SAVE SUCCESS TOAST */}
            {
                saveStatus && (
                    <div style={{
                        position: 'fixed',
                        bottom: 24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: saveStatus.error ? '#EF4444' : '#22C55E', color: 'white',
                        padding: '10px 24px', borderRadius: 50,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                        fontWeight: 600, fontSize: 14, zIndex: 9999,
                        display: 'flex', alignItems: 'center', gap: 8,
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <span>{saveStatus.error ? '⚠️' : '✓'}</span> {saveStatus.message}
                    </div>
                )
            }

            {/* 💾 FLOATING SAVE BAR (Atomic) */}
            {
                hasChanges && (
                    <div style={{
                        position: 'fixed', bottom: 95, left: 12, right: 12,
                        background: '#1E293B', color: 'white', padding: '14px 20px',
                        borderRadius: 16, display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                        zIndex: 10000, animation: 'slideUp 0.3s ease-out',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>⚠️ Cambios sin guardar</div>
                        <button
                            onClick={handlePlatformSave}
                            disabled={isSaving}
                            style={{
                                background: '#3B82F6', color: 'white', border: 'none',
                                padding: '10px 24px', borderRadius: 12, fontWeight: 800,
                                fontSize: 14, cursor: 'pointer',
                                opacity: isSaving ? 0.7 : 1
                            }}
                        >
                            {isSaving ? 'GUARDANDO...' : 'GUARDAR'}
                        </button>
                    </div>
                )
            }
        </div >
    );
};

export default Settings;
