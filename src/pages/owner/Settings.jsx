// src/pages/owner/Settings.jsx - VISUAL MIRROR v2.0
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useLanguage } from '../../contexts/LanguageContext';
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
const HERO_ICON_DEFS = (t) => [
    { id: 'menu', label: t('menu'), Icon: MenuIcon },
    { id: 'delivery', label: t('delivery'), Icon: DeliveryIcon },
    { id: 'promos', label: t('promos'), Icon: PromosIcon },
    { id: 'game', label: t('game'), Icon: GameIcon }
];

const Settings = () => {
    const { tenantData: tenant, businessId, refreshTenantData } = useTenant();
    const { t } = useLanguage();
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

    // LOCAL STATE for munchboy fields (prevents reload/flicker issues)
    const [localMunchboyName, setLocalMunchboyName] = useState('MUNCHBOY');
    const [localMunchboyColors, setLocalMunchboyColors] = useState({
        shell: '#6B0FCC',
        a: '#D1D5DB',
        b: '#D1D5DB'
    });

    // Dropdown states
    const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
    const [isWeightMenuOpen, setIsWeightMenuOpen] = useState(false);
    const fontMenuRef = useRef(null);
    const weightMenuRef = useRef(null);
    const rafRef = useRef(null);

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

            // Sync munchboy fields from tenant (only if not dirty to avoid overwrite)
            if (!hasChanges) {
                setLocalMunchboyName(tenant.munchboy_name || 'MUNCHBOY');
                setLocalMunchboyColors({
                    shell: tenant.munchboy_shell_color || '#6B0FCC',
                    a: tenant.munchboy_a_color || '#D1D5DB',
                    b: tenant.munchboy_b_color || '#D1D5DB'
                });
            }

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
    }, [tenant, hasChanges]);

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
        // 🛡️ THEME COLORS: Set CSS variables immediately for race-condition-proof saves
        if (field === 'primary_color') document.documentElement.style.setProperty('--color-primary', value);
        if (field === 'secondary_color') document.documentElement.style.setProperty('--color-secondary', value);
        if (field === 'confirmation_color') document.documentElement.style.setProperty('--color-confirm', value);  // Match ColorPillar
        if (field === 'powered_by_color') document.documentElement.style.setProperty('--color-powered', value);

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
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        
        rafRef.current = requestAnimationFrame(() => {
            // Instant preview via CSS or local state
            if (colorPickerState.cssVar) {
                document.documentElement.style.setProperty(colorPickerState.cssVar, newColor);
            }
            if (colorPickerState.isHeroIcon) {
                setHeroIconColors(prev => ({ ...prev, [colorPickerState.iconId]: newColor }));
            }
            // Live preview for munchboy colors
            if (colorPickerState.keyName === 'munchboy_shell_color') {
                setLocalMunchboyColors(prev => ({ ...prev, shell: newColor }));
            } else if (colorPickerState.keyName === 'munchboy_a_color') {
                setLocalMunchboyColors(prev => ({ ...prev, a: newColor }));
            } else if (colorPickerState.keyName === 'munchboy_b_color') {
                setLocalMunchboyColors(prev => ({ ...prev, b: newColor }));
            }
        });
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
        } else if (colorPickerState.keyName === 'munchboy_shell_color') {
            // Update local state for munchboy shell color
            setLocalMunchboyColors(prev => ({ ...prev, shell: finalColor }));
            syncContext({ munchboy_shell_color: finalColor });
            setHasChanges(true);
        } else if (colorPickerState.keyName === 'munchboy_a_color') {
            // Update local state for munchboy A button color
            setLocalMunchboyColors(prev => ({ ...prev, a: finalColor }));
            syncContext({ munchboy_a_color: finalColor });
            setHasChanges(true);
        } else if (colorPickerState.keyName === 'munchboy_b_color') {
            // Update local state for munchboy B button color
            setLocalMunchboyColors(prev => ({ ...prev, b: finalColor }));
            syncContext({ munchboy_b_color: finalColor });
            setHasChanges(true);
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
        // Revert munchboy colors on cancel
        if (colorPickerState.keyName === 'munchboy_shell_color') {
            setLocalMunchboyColors(prev => ({ ...prev, shell: colorPickerState.originalColor }));
        } else if (colorPickerState.keyName === 'munchboy_a_color') {
            setLocalMunchboyColors(prev => ({ ...prev, a: colorPickerState.originalColor }));
        } else if (colorPickerState.keyName === 'munchboy_b_color') {
            setLocalMunchboyColors(prev => ({ ...prev, b: colorPickerState.originalColor }));
        }
        setColorPickerState(prev => ({ ...prev, isOpen: false }));
    };

    // Logout
    const handleLogout = async () => {
        await supabase.auth.signOut();
        clearAuth();
        window.location.href = `/${tenant?.slug || ''}`;
    };

    // 🛡️ HELPER: Get CSS variable value (captures current optimistic state)
    const getCssVar = (name) => {
        const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return val || null;
    };

    // 💾 THE ATOMIC SAVE (Manual Persistence Protocol v5.0)
    const handlePlatformSave = async () => {
        setIsSaving(true);
        console.log('💾 SAVING BRANDING VAULT:', businessId);

        try {
            // 🛡️ RACE CONDITION FIX: Capture current values BEFORE any async operations
            // Colors are read from CSS custom properties (set immediately on change)
            // Identity fields use local state (prevents refreshTenantData overwrite)
            const currentNavbarColor = getCssVar('--color-navbar-bg') || tenant?.navbar_color || '#1F2937';
            const currentPrimary = getCssVar('--color-primary') || tenant?.primary_color || '#B8956A';
            const currentSecondary = getCssVar('--color-secondary') || tenant?.secondary_color || '#A89070';
            const currentConfirmation = getCssVar('--color-confirm') || tenant?.confirmation_color || '#22C55E';
            const currentPoweredBy = getCssVar('--color-powered') || tenant?.powered_by_color || '#C4856A';

            // DEBUG: Log what we're capturing
            console.log('[Settings Save] Captured colors:', {
                navbar: currentNavbarColor,
                primary: currentPrimary,
                secondary: currentSecondary,
                confirmation: currentConfirmation,
                poweredBy: currentPoweredBy
            });

            // 1. Construct Full Payload from CAPTURED State (not tenant directly)
            // 🛡️ FILTER: Remove null/undefined to prevent 400 errors
            const payload = Object.fromEntries(
                Object.entries({
                    business_name: localIdentity.business_name || tenant?.business_name,
                    font_family: localIdentity.font_family || tenant?.font_family,
                    font_weight: localIdentity.font_weight || tenant?.font_weight,
                    navbar_color: currentNavbarColor,
                    nav_icon_mode: tenant?.nav_icon_mode,
                    primary_color: currentPrimary,
                    secondary_color: currentSecondary,
                    confirmation_color: currentConfirmation,
                    powered_by_color: currentPoweredBy,
                    hero_mode: tenant?.hero_mode,
                    hero_url: tenant?.hero_url,
                    hero_icons: tenant?.hero_icons,
                    info_pills: tenant?.info_pills,
                    munchboy_enabled: tenant?.munchboy_enabled,
                    munchboy_name: localMunchboyName,
                    munchboy_shell_color: localMunchboyColors.shell,
                    munchboy_a_color: localMunchboyColors.a,
                    munchboy_b_color: localMunchboyColors.b,
                    app_config: tenant?.app_config,
                    updated_at: new Date().toISOString()
                }).filter(([_, v]) => v !== null && v !== undefined)
            );

            console.log('[Settings Save] Payload:', payload);

            // 2. Cloud Sync
            await updateBranding(payload, businessId);

            // 3. Global Refresh
            await refreshTenantData();

            // 4. Success State
            setHasChanges(false);
            sessionStorage.removeItem(`dirty_branding_${businessId}`);
            setSaveStatus({ message: t('branding_saved') });
            setTimeout(() => setSaveStatus(null), 3000);

        } catch (error) {
            console.error("Save failed:", error);
            setSaveStatus({ error: true, message: t('save_error') });
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

    if (!tenant) return <div className="p-4 text-center text-gray-500">{t('loading_vault')}</div>;

    const heroIconMode = tenant?.hero_icon_mode || 'black';
    const navIconMode = tenant?.nav_icon_mode || 'white';
    const navbarColor = tenant?.navbar_color || '#1F2937';

    return (
        <div className="bg-[#F8FAFC] min-h-screen">
            <BackendHeader title={t('settings_title')} onLogout={handleLogout} />

            <div className="settings-vault">
                {/* ========== 1. IDENTITY & TYPOGRAPHY ========== */}
                <section className="branding-card">
                    <h3>1. {t('identity_typography')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                            type="text"
                            className="fs-input"
                            value={localIdentity.business_name}
                            onChange={handleNameChange}
                            onBlur={handleNameBlur}
                            placeholder={t('business_name_placeholder')}
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
                                        {localIdentity.font_weight === '400' ? t('font_weight_400') :
                                            localIdentity.font_weight === '500' ? t('font_weight_500') :
                                                localIdentity.font_weight === '600' ? t('font_weight_600') :
                                                    localIdentity.font_weight === '700' ? t('font_weight_700') :
                                                        localIdentity.font_weight === '800' ? t('font_weight_800') : t('font_weight_600')}
                                    </span>
                                    <span className="dropdown-arrow">▼</span>
                                </button>
                                {isWeightMenuOpen && (
                                    <div className="dropdown-menu">
                                        {[
                                            { value: '400', label: t('font_weight_400') },
                                            { value: '500', label: t('font_weight_500') },
                                            { value: '600', label: t('font_weight_600') },
                                            { value: '700', label: t('font_weight_700') },
                                            { value: '800', label: t('font_weight_800') }
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
                        <h3>2. {t('hero_cover')}</h3>
                        <div className="mode-toggle">
                            <button
                                onClick={() => handleFieldUpdate('hero_mode', 'text')}
                                className={tenant?.hero_mode === 'text' ? 'active' : ''}
                            >
                                {t('text_mode')}
                            </button>
                            <button
                                onClick={() => handleFieldUpdate('hero_mode', 'image')}
                                className={tenant?.hero_mode === 'image' ? 'active' : ''}
                            >
                                {t('image_mode')}
                            </button>
                        </div>
                    </div>

                    {tenant?.hero_mode === 'image' ? (
                        <div className="hero-studio-trigger" onClick={() => setShowCoverEditor(true)}>
                            {tenant?.hero_url ? (
                                <>
                                    <div className="editor-crosshair">+</div>
                                    <img src={tenant.hero_url} className="preview-img" alt="Hero" />
                                    <div className="edit-overlay"><span>{t('edit_image')}</span></div>
                                </>
                            ) : (
                                <div className="empty-state">
                                    <span className="plus-icon">+</span>
                                    <span>{t('upload_logo_cover')}</span>
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
                        initialData={(() => {
                            if (!tenant?.hero_url) return {};
                            try {
                                const url = new URL(tenant.hero_url, 'http://dummy.com');
                                const params = new URLSearchParams(url.search);
                                return {
                                    image: tenant.hero_url,
                                    scale: parseFloat(params.get('s')) || 1,
                                    offsetX: parseFloat(params.get('x')) || 0,
                                    offsetY: parseFloat(params.get('y')) || 0,
                                };
                            } catch (e) {
                                return { image: tenant.hero_url, scale: 1, offsetX: 0, offsetY: 0 };
                            }
                        })()}
                        onSave={(data) => {
                            // 💾 ENCODE CROP SETTINGS IN URL
                            // Robust fix: Avoid DB schema dependency by using query params
                            const cleanUrl = data.image.split('?')[0];
                            const timestamp = Date.now();
                            // Use s/x/y shorter keys
                            const finalUrl = `${cleanUrl}?t=${timestamp}&s=${data.scale}&x=${data.offsetX}&y=${data.offsetY}`;

                            // Update hero_url directly
                            handleFieldUpdate('hero_url', finalUrl)
                        }}
                    />
                </section>

                {/* ========== 3. HERO ICONS (NEW - WYSIWYG) ========== */}
                <section className="branding-card">
                    <div className="section-header">
                        <h3>3. {t('hero_icons_label')}</h3>
                        <div className="mode-toggle">
                            <button
                                onClick={() => handleFieldUpdate('hero_icon_mode', 'white')}
                                className={heroIconMode === 'white' ? 'active' : ''}
                            >
                                {t('white_mode')}
                            </button>
                            <button
                                onClick={() => handleFieldUpdate('hero_icon_mode', 'black')}
                                className={heroIconMode === 'black' ? 'active' : ''}
                            >
                                {t('dark_mode')}
                            </button>
                        </div>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>{t('hero_icons_desc')}</p>

                    {/* 2x2 Hero Icons Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                        maxWidth: 280,
                        margin: '0 auto'
                    }}>
                        {HERO_ICON_DEFS(t).map(({ id, label, Icon }) => {
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
                        <h3>4. {t('bar_style')}</h3>
                        <div className="mode-toggle">
                            <button
                                onClick={() => handleFieldUpdate('nav_icon_mode', 'white')}
                                className={navIconMode === 'white' ? 'active' : ''}
                            >
                                {t('white_mode')}
                            </button>
                            <button
                                onClick={() => handleFieldUpdate('nav_icon_mode', 'black')}
                                className={navIconMode === 'black' ? 'active' : ''}
                            >
                                {t('dark_mode')}
                            </button>
                        </div>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>{t('bar_color_desc')}</p>

                    {/* MiniNav Preview */}
                    <div
                        onClick={() => openColorPicker(t('bar_color_title'), 'navbar_color', '--color-navbar-bg', '#1F2937')}
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
                    <h3>5. {t('theme_colors')}</h3>
                    <div className="color-grid">
                        <ColorPillar label={t('primary')} keyName="primary_color" cssVar="--color-primary" defaultValue="#B8956A" />
                        <ColorPillar label={t('secondary')} keyName="secondary_color" cssVar="--color-secondary" defaultValue="#A89070" />
                        <ColorPillar label={t('confirmation')} keyName="confirmation_color" cssVar="--color-confirm" defaultValue="#22C55E" />
                        <ColorPillar label={t('powered_by')} keyName="powered_by_color" cssVar="--color-powered" defaultValue="#C4856A" />
                    </div>
                </section>

                {/* ========== 6. MUNCHBOY BRANDING - HIDDEN FOR LAUNCH ========== */}
                {false && (
                <section className="branding-card">
                    <div className="section-header">
                        <h3>🎮 Munchboy Arcade</h3>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>Customize the gaming experience branding</p>
                    
                    {/* Visual Emulator Preview */}
                    <div 
                        className="munchboy-preview"
                        style={{
                            background: localMunchboyColors.shell,
                            borderRadius: 20,
                            padding: '24px 16px 16px',
                            marginBottom: 20,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                        }}
                    >
                        {/* Screen area */}
                        <div style={{
                            background: '#000',
                            borderRadius: 12,
                            height: 120,
                            marginBottom: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '3px solid #333'
                        }}>
                            <span style={{ color: '#fff', fontSize: 12, opacity: 0.5 }}>GAME SCREEN</span>
                        </div>
                        
                        {/* foodspot branding */}
                        <div style={{
                            textAlign: 'center',
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 600,
                            letterSpacing: 3,
                            marginBottom: 16,
                            opacity: 0.9
                        }}>
                            {localMunchboyName}
                        </div>
                        
                        {/* Controller preview */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0 8px'
                        }}>
                            {/* D-Pad */}
                            <div style={{
                                width: 70,
                                height: 70,
                                position: 'relative'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: 0,
                                    transform: 'translateY(-50%)',
                                    width: '100%',
                                    height: '35%',
                                    background: '#D1D5DB',
                                    borderRadius: 6,
                                    border: '2px solid #1a1a1a'
                                }} />
                                <div style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: 0,
                                    transform: 'translateX(-50%)',
                                    width: '35%',
                                    height: '100%',
                                    background: '#D1D5DB',
                                    borderRadius: 6,
                                    border: '2px solid #1a1a1a'
                                }} />
                            </div>
                            
                            {/* A/B Buttons */}
                            <div style={{
                                position: 'relative',
                                width: 60,
                                height: 58
                            }}>
                                {/* A Button */}
                                <div 
                                    onClick={() => openColorPicker('A Button Color', 'munchboy_a_color', '', localMunchboyColors.a)}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        background: localMunchboyColors.a,
                                        border: '3px solid #1a1a1a',
                                        boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontSize: 16,
                                        fontWeight: 'bold',
                                        color: '#666'
                                    }}
                                >A</div>
                                {/* B Button */}
                                <div 
                                    onClick={() => openColorPicker('B Button Color', 'munchboy_b_color', '', localMunchboyColors.b)}
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        background: localMunchboyColors.b,
                                        border: '3px solid #1a1a1a',
                                        boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontSize: 16,
                                        fontWeight: 'bold',
                                        color: '#666'
                                    }}
                                >B</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Compact Controls Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        {/* Colors - compact row */}
                        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                            <div 
                                onClick={() => openColorPicker('Shell', 'munchboy_shell_color', '', localMunchboyColors.shell)}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    background: localMunchboyColors.shell,
                                    border: '2px solid rgba(0,0,0,0.1)',
                                    cursor: 'pointer'
                                }}
                                title="Shell"
                            />
                            <div 
                                onClick={() => openColorPicker('A Button', 'munchboy_a_color', '', localMunchboyColors.a)}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    background: localMunchboyColors.a,
                                    border: '2px solid rgba(0,0,0,0.1)',
                                    cursor: 'pointer'
                                }}
                                title="A Button"
                            />
                            <div 
                                onClick={() => openColorPicker('B Button', 'munchboy_b_color', '', localMunchboyColors.b)}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    background: localMunchboyColors.b,
                                    border: '2px solid rgba(0,0,0,0.1)',
                                    cursor: 'pointer'
                                }}
                                title="B Button"
                            />
                        </div>
                        
                        {/* Enable Toggle */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: tenant?.munchboy_enabled ? '#22C55E' : '#64748B' }}>
                                {tenant?.munchboy_enabled ? 'ON' : 'OFF'}
                            </span>
                            <input
                                type="checkbox"
                                checked={!!tenant?.munchboy_enabled}
                                onChange={(e) => handleFieldUpdate('munchboy_enabled', e.target.checked)}
                                style={{ accentColor: '#22C55E' }}
                            />
                        </label>
                    </div>
                    
                    {/* Display Name */}
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>
                            Display Name
                        </label>
                        <input
                            type="text"
                            className="pill-input"
                            value={localMunchboyName}
                            placeholder="MUNCHBOY"
                            onChange={(e) => {
                                setLocalMunchboyName(e.target.value);
                                setHasChanges(true);
                            }}
                            style={{ width: '100%', fontSize: 14 }}
                        />
                    </div>
                </section>
                )}

                {/* ========== 6. INFO PILLS ========== */}
                {/* ========== 6. INFO PILLS ========== */}
                <section className="branding-card">
                    <div className="section-header">
                        <h3>6. {t('info_pills')}</h3>
                        <div className="mode-toggle">
                            <button
                                onClick={() => {
                                    const currentPills = tenant?.info_pills || {};
                                    handleFieldUpdate('info_pills', { ...currentPills, pill_icon_mode: 'white' });
                                }}
                                className={tenant?.info_pills?.pill_icon_mode === 'white' || !tenant?.info_pills?.pill_icon_mode ? 'active' : ''}
                            >
                                {t('white_mode')}
                            </button>
                            <button
                                onClick={() => {
                                    const currentPills = tenant?.info_pills || {};
                                    handleFieldUpdate('info_pills', { ...currentPills, pill_icon_mode: 'dark' });
                                }}
                                className={tenant?.info_pills?.pill_icon_mode === 'dark' ? 'active' : ''}
                            >
                                {t('dark_mode')}
                            </button>
                        </div>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>{t('info_pills_desc')}</p>
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
                                                    {isActive ? t('visible') : t('hidden')}
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
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{t('unsaved_changes_warning')}</div>
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
                            {isSaving ? t('saving_btn') : t('save')}
                        </button>
                    </div>
                )
            }
        </div >
    );
};

export default Settings;
