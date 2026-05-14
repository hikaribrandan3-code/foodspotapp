// src/pages/owner/Settings.jsx - VISUAL MIRROR v2.1 (FIXED)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { updateBranding, uploadAsset, supabase } from '../../lib/supabaseClient';
import { useDebouncedAutoSave } from '../../hooks/useDebouncedAutoSave';
import { deepMergeAppConfig } from '../../utils/appConfig';
import BackendHeader from '../../components/BackendHeader';
import BackendNav from '../../components/BackendNav';
import CoverImageEditor from '../../components/CoverImageEditor';
import ColorPickerModal from '../../components/ColorPickerModal';
import BurgerLoader from '../../components/BurgerLoader';
import { clearAuth } from '../../utils/storage';
import { MenuIcon, DeliveryIcon, PromosIcon, GameIcon } from '../../components/HeroIcons.jsx';
import { HERO_ICON_DARK } from '../../config/appConfig.v2.js';
import './Settings.css';

const boostSaturation = (hex) => {
  const rgb = parseInt(hex.slice(1), 16);
  let r = (rgb >> 16) & 255, g = (rgb >> 8) & 255, b = rgb & 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2 / 255;
  if (max === min) { h = s = 0; } else {
    const d = max - min;
    s = l > 0.5 ? d / (510 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  s = Math.min(1, s * 1.6);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  let r2 = 0, g2 = 0, b2 = 0;
  if (h < 1/6) { r2 = c; g2 = x; } else if (h < 2/6) { r2 = x; g2 = c; } else if (h < 3/6) { g2 = c; b2 = x; } else if (h < 4/6) { g2 = x; b2 = c; } else if (h < 5/6) { r2 = x; b2 = c; } else { r2 = c; b2 = x; }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + toHex(r2) + toHex(g2) + toHex(b2);
};

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

// Default values for all branding fields
const DEFAULTS = {
    navbar: '#1F2937',
    confirmation: '#B8956A',
    poweredBy: '#C4856A',
    fontFamily: 'Inter',
    fontWeight: '600',
    heroIconColor: '#FFFFFF'
};

const Settings = () => {
    const { tenantData: tenant, businessId, refreshTenantData, loading } = useTenant();
    const { t } = useLanguage();
    const navigate = useNavigate();
    
    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [showCoverEditor, setShowCoverEditor] = useState(false);

    // Track the last businessId we've initialized for to prevent re-initialization
    const initializedForBusinessRef = useRef(null);
    const [isDraftReady, setIsDraftReady] = useState(false);

    // ============================================================
    // SINGLE SOURCE OF TRUTH: All editable data lives here
    // ============================================================
    const [draft, setDraft] = useState({
        // Identity
        business_name: '',
        font_family: DEFAULTS.fontFamily,
        font_weight: DEFAULTS.fontWeight,

        // Theme Colors
        navbar_color: DEFAULTS.navbar,
        confirmation_color: DEFAULTS.confirmation,
        powered_by_color: DEFAULTS.poweredBy,
        
        // Hero Icons
        hero_icons: {
            menu: { color: DEFAULTS.heroIconColor },
            delivery: { color: DEFAULTS.heroIconColor },
            promos: { color: DEFAULTS.heroIconColor },
            game: { color: DEFAULTS.heroIconColor }
        },
        
        // Info Pills
        info_pills: {},
        
        // Payment & Fulfillment Configuration
        service_modes: {
            pickup: true,
            delivery: true,
            dineIn: false,
            dineInPayment: 'after'
        },
        payment_methods: {
            cash: true,
            mercado_pago: true,
            card: false,
            transfer: false
        },

        // Other
        hero_mode: 'text',
        hero_url: '',
        hero_cover_image: '',
        hero_cover_image_uploaded_at: null,
        nav_icon_mode: 'white',
        hero_icon_mode: 'black',
        app_config: {},
        menu_data: { categories: [] }
    });

    // Dropdown states
    const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
    const [isWeightMenuOpen, setIsWeightMenuOpen] = useState(false);
    const fontMenuRef = useRef(null);
    const weightMenuRef = useRef(null);
    const rafRef = useRef(null);
    const justSavedRef = useRef(false); // Guard: Blocks Data Pump from overwriting after save

    // ============================================================
    // AUTO-SAVE: Service Modes (1.2s debounce, direct to flat columns)
    // ============================================================
    const { saveStatus: serviceModeSaveStatus } = useDebouncedAutoSave(
        isDraftReady ? draft.service_modes : null,
        async (nextModes) => {
            if (!businessId) return;
            const payload = {
                pickup_enabled: nextModes?.pickup ?? true,
                delivery_enabled: nextModes?.delivery ?? true,
                dine_in_enabled: nextModes?.dineIn ?? false,
                dine_in_payment_timing: 'after',
                // Backward-compat: also write to app_config during transition
                app_config: deepMergeAppConfig(
                    tenant?.app_config || {},
                    { service_modes: nextModes }
                )
            };
            const { data, error } = await updateBranding(payload, businessId);
            if (error || !data) throw error || new Error('Save returned no data');
            return data;
        },
        1200,
        isDraftReady
    );

    // ============================================================
    // AUTO-SAVE: Payment Methods (1.2s debounce)
    // ============================================================
    const { saveStatus: paymentSaveStatus } = useDebouncedAutoSave(
        isDraftReady ? draft.payment_methods : null,
        async (nextMethods) => {
            if (!businessId) return;
            const payload = {
                app_config: deepMergeAppConfig(
                    tenant?.app_config || {},
                    { payment_methods: nextMethods }
                )
            };
            const { data, error } = await updateBranding(payload, businessId);
            if (error || !data) throw error || new Error('Save returned no data');
            return data;
        },
        1200,
        isDraftReady
    );

    // Color Picker Modal State
    const [colorPickerState, setColorPickerState] = useState({
        isOpen: false,
        title: '',
        keyName: '',
        cssVar: '',
        initialColor: '#8B7355',
        originalColor: '#8B7355',
        isHeroIcon: false,
        iconId: null
    });

    // ============================================================
    // INITIALIZATION: One-time load from tenant data
    // Only runs when businessId changes, not on every tenant update
    // ============================================================
    useEffect(() => {
        if (!tenant?.business_id) return;

        // HYDRATION LOCK: Wait for real DB data before initializing.
        // pickup_enabled is undefined while TenantContext is still fetching.
        if (tenant.pickup_enabled === undefined) return;
        
        // Only initialize once per businessId to prevent overwrites
        if (initializedForBusinessRef.current === tenant.business_id) return;
        
        console.log('[Settings] Initializing draft from tenant for business:', tenant.business_id);
        
        const icons = tenant.hero_icons || {};
        
        setDraft({
            business_name: tenant.business_name || '',
            font_family: tenant.font_family || DEFAULTS.fontFamily,
            font_weight: tenant.font_weight || DEFAULTS.fontWeight,
            
            navbar_color: tenant.navbar_color || DEFAULTS.navbar,
            confirmation_color: tenant.confirmation_color || DEFAULTS.confirmation,
            powered_by_color: tenant.powered_by_color || DEFAULTS.poweredBy,
            
            hero_icons: {
                menu: { color: icons.menu?.color || DEFAULTS.heroIconColor },
                delivery: { color: icons.delivery?.color || DEFAULTS.heroIconColor },
                promos: { color: icons.promos?.color || DEFAULTS.heroIconColor },
                game: { color: icons.game?.color || DEFAULTS.heroIconColor }
            },
            
            info_pills: tenant.info_pills || {},

            service_modes: (tenant.pickup_enabled !== undefined ? {
                pickup: tenant.pickup_enabled,
                delivery: tenant.delivery_enabled,
                dineIn: tenant.dine_in_enabled,
                dineInPayment: tenant.dine_in_payment_timing || 'after'
            } : null) || tenant.app_config?.service_modes || tenant.service_modes || {
                pickup: true,
                delivery: true,
                dineIn: false,
                dineInPayment: 'after'
            },
            payment_methods: tenant.app_config?.payment_methods || tenant.payment_methods || {
                cash: true,
                mercado_pago: true,
                card: false,
                transfer: false
            },

            hero_mode: tenant.hero_mode || 'text',
            hero_url: tenant.hero_url || '',
            hero_cover_image: tenant.hero_cover_image || '',
            hero_cover_image_uploaded_at: tenant.hero_cover_image_uploaded_at || null,
            nav_icon_mode: tenant.nav_icon_mode || 'white',
            hero_icon_mode: tenant.hero_icon_mode || 'black',
            app_config: {
                ...(tenant.app_config || {}),
                // Payment & Fulfillment — stored in app_config JSONB
                service_modes: (tenant.pickup_enabled !== undefined ? {
                    pickup: tenant.pickup_enabled,
                    delivery: tenant.delivery_enabled,
                    dineIn: tenant.dine_in_enabled,
                    dineInPayment: tenant.dine_in_payment_timing || 'after'
                } : null) || tenant.app_config?.service_modes || tenant.service_modes || {
                    pickup: true,
                    delivery: true,
                    dineIn: false,
                    dineInPayment: 'after'
                },
                payment_methods: tenant.app_config?.payment_methods || tenant.payment_methods || {
                    cash: true,
                    mercado_pago: true,
                    card: false,
                    transfer: false
                },
                // Munchboy — migrate from top-level columns if present
                munchboy: tenant.app_config?.munchboy || {
                    enabled: tenant.munchboy_enabled ?? false,
                    name: tenant.munchboy_name || 'MUNCHBOY',
                    shell_color: tenant.munchboy_shell_color || '#6B0FCC',
                    a_color: tenant.munchboy_a_color || '#D1D5DB',
                    b_color: tenant.munchboy_b_color || '#D1D5DB'
                }
            },
            menu_data: tenant.menu_data || { categories: [] }
        });
        
        // Apply CSS variables immediately
        applyCssVariables(tenant);
        
        initializedForBusinessRef.current = tenant.business_id;
        setHasChanges(false);
        setIsDraftReady(true);
        
    }, [tenant?.business_id, tenant?.pickup_enabled]); // Depend on business_id and hydration signal

    // ============================================================
    // CSS VARIABLES: Apply current draft values to document
    // ============================================================
    const applyCssVariables = useCallback((data) => {
        const root = document.documentElement.style;
        
        if (data.font_family) root.setProperty('--font-main', data.font_family);
        if (data.font_weight) root.setProperty('--font-weight-hero', data.font_weight);
        if (data.navbar_color) root.setProperty('--color-navbar-bg', data.navbar_color);
        if (data.confirmation_color) root.setProperty('--color-primary', data.confirmation_color);
        if (data.powered_by_color) root.setProperty('--color-powered', data.powered_by_color);
    }, []);

    // Apply CSS whenever draft changes
    useEffect(() => {
        applyCssVariables(draft);
    }, [draft, applyCssVariables]);

    // ============================================================
    // DRAFT UPDATE HELPERS
    // ============================================================
    const updateDraftField = useCallback((field, value) => {
        setDraft(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    }, []);

    const updateHeroIconColor = useCallback((iconId, color) => {
        setDraft(prev => ({
            ...prev,
            hero_icons: {
                ...prev.hero_icons,
                [iconId]: { ...prev.hero_icons[iconId], color }
            }
        }));
        setHasChanges(true);
    }, []);

    const updateInfoPill = useCallback((pillId, updates) => {
        setDraft(prev => ({
            ...prev,
            info_pills: {
                ...prev.info_pills,
                [pillId]: { ...prev.info_pills[pillId], ...updates }
            }
        }));
        setHasChanges(true);
    }, []);

    // ============================================================
    // EVENT HANDLERS
    // ============================================================
    const handleNameChange = (e) => {
        updateDraftField('business_name', e.target.value);
    };

    const handleFontSelect = (family) => {
        updateDraftField('font_family', family);
        setIsFontMenuOpen(false);
    };

    const handleWeightSelect = (weight) => {
        updateDraftField('font_weight', weight);
        setIsWeightMenuOpen(false);
    };

    // Color Picker Modal Handlers
    const openColorPicker = (title, keyName, cssVar, defaultColor) => {
        const currentColor = draft[keyName] || defaultColor;
        setColorPickerState({
            isOpen: true,
            title,
            keyName,
            cssVar,
            initialColor: currentColor,
            originalColor: currentColor,
            isHeroIcon: false,
            iconId: null
        });
    };

    const openHeroIconColorPicker = (iconId, label) => {
        const currentColor = draft.hero_icons[iconId]?.color || DEFAULTS.heroIconColor;
        setColorPickerState({
            isOpen: true,
            title: `Color: ${label}`,
            keyName: '',
            cssVar: '',
            initialColor: currentColor,
            originalColor: currentColor,
            isHeroIcon: true,
            iconId
        });
    };

    const handleColorPickerLiveChange = (newColor) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        
        rafRef.current = requestAnimationFrame(() => {
            if (colorPickerState.cssVar) {
                document.documentElement.style.setProperty(colorPickerState.cssVar, newColor);
            }
            if (colorPickerState.isHeroIcon) {
                updateHeroIconColor(colorPickerState.iconId, newColor);
            }
            // Live preview for munchboy colors
            if (colorPickerState.keyName === 'munchboy_shell_color') {
                setDraft(prev => ({ ...prev, app_config: { ...prev.app_config, munchboy: { ...prev.app_config.munchboy, shell_color: newColor } } }));
            } else if (colorPickerState.keyName === 'munchboy_a_color') {
                setDraft(prev => ({ ...prev, app_config: { ...prev.app_config, munchboy: { ...prev.app_config.munchboy, a_color: newColor } } }));
            } else if (colorPickerState.keyName === 'munchboy_b_color') {
                setDraft(prev => ({ ...prev, app_config: { ...prev.app_config, munchboy: { ...prev.app_config.munchboy, b_color: newColor } } }));
            }
        });
    };

    const handleColorPickerApply = (finalColor) => {
        if (colorPickerState.isHeroIcon) {
            updateHeroIconColor(colorPickerState.iconId, finalColor);
        } else if (colorPickerState.keyName.startsWith('info_pill_')) {
            const pillId = colorPickerState.keyName.replace('info_pill_', '');
            updateInfoPill(pillId, { bgColor: finalColor });
        } else if (colorPickerState.keyName === 'munchboy_shell_color' || colorPickerState.keyName === 'munchboy_a_color' || colorPickerState.keyName === 'munchboy_b_color') {
            const munchKey = colorPickerState.keyName.replace('munchboy_', '');
            const nextMunchboy = {
                ...draft.app_config?.munchboy,
                [munchKey]: finalColor
            };
            setDraft(prev => ({
                ...prev,
                app_config: {
                    ...prev.app_config,
                    munchboy: nextMunchboy
                }
            }));
            autoSaveMunchboy(nextMunchboy);
        } else if (colorPickerState.keyName) {
            updateDraftField(colorPickerState.keyName, finalColor);
        }
        setColorPickerState(prev => ({ ...prev, isOpen: false }));
    };

    const handleColorPickerClose = () => {
        // Revert CSS variable
        if (colorPickerState.cssVar) {
            document.documentElement.style.setProperty(colorPickerState.cssVar, colorPickerState.originalColor);
        }
        // Revert hero icon if canceled
        if (colorPickerState.isHeroIcon) {
            updateHeroIconColor(colorPickerState.iconId, colorPickerState.originalColor);
        }
        // Revert munchboy colors on cancel
        if (colorPickerState.keyName === 'munchboy_shell_color') {
            setDraft(prev => ({ ...prev, app_config: { ...prev.app_config, munchboy: { ...prev.app_config.munchboy, shell_color: colorPickerState.originalColor } } }));
        } else if (colorPickerState.keyName === 'munchboy_a_color') {
            setDraft(prev => ({ ...prev, app_config: { ...prev.app_config, munchboy: { ...prev.app_config.munchboy, a_color: colorPickerState.originalColor } } }));
        } else if (colorPickerState.keyName === 'munchboy_b_color') {
            setDraft(prev => ({ ...prev, app_config: { ...prev.app_config, munchboy: { ...prev.app_config.munchboy, b_color: colorPickerState.originalColor } } }));
        }
        setColorPickerState(prev => ({ ...prev, isOpen: false }));
    };

    // Logout
    const handleLogout = async () => {
        await supabase.auth.signOut();
        clearAuth();
        window.location.href = `/${tenant?.slug || ''}`;
    };

    // ATOMIC SAVE (v7 — Self-Healing via updateBranding)
    const handlePlatformSave = async () => {
        if (!businessId) return;
        setIsSaving(true);
        console.log('SAVING BRANDING — business:', businessId);

        // GUARD: Prevent Data Pump from overwriting local state with stale DB data
        justSavedRef.current = true;

        try {
            // Single payload from DRAFT state — updateBranding handles column filtering
            const payload = {
                business_name: draft.business_name,
                font_family: draft.font_family,
                font_weight: draft.font_weight,
                navbar_color: draft.navbar_color,
                nav_icon_mode: draft.nav_icon_mode,
                confirmation_color: draft.confirmation_color,
                powered_by_color: draft.powered_by_color,
                hero_mode: draft.hero_mode,
                hero_url: draft.hero_url,
                hero_cover_image: draft.hero_cover_image,
                hero_cover_image_uploaded_at: draft.hero_cover_image_uploaded_at,
                hero_icons: draft.hero_icons,
                hero_icon_mode: draft.hero_icon_mode,
                info_pills: draft.info_pills,
                pickup_enabled: draft.service_modes?.pickup ?? true,
                delivery_enabled: draft.service_modes?.delivery ?? true,
                dine_in_enabled: draft.service_modes?.dineIn ?? false,
                dine_in_payment_timing: 'after',
                app_config: deepMergeAppConfig(
                    tenant?.app_config || draft.app_config || {},
                    {
                        service_modes: draft.service_modes,
                        payment_methods: draft.payment_methods,
                        munchboy: draft.app_config?.munchboy
                    }
                ),
                menu_data: draft.menu_data,
            };

            const { data: savedData, error: saveError } = await updateBranding(payload, businessId);

            // STRICT CHECK: Only show success if data was actually written
            if (saveError || !savedData) {
                throw saveError || new Error('Save returned no data');
            }

            // Apply confirmed data to context + cache
            Object.assign(tenant, savedData);

            // FRONTEND SYNC: Map flat DB rows to nested UI config
            const frontendSyncData = {
                ...savedData,
                colors: {
                    primary: savedData.confirmation_color,
                    confirmation: savedData.confirmation_color,
                    powered: savedData.powered_by_color
                },
                branding: {
                    primaryColor: savedData.confirmation_color,
                    navbar_color: savedData.navbar_color,
                    nav_icon_mode: savedData.nav_icon_mode,
                    fontFamily: savedData.font_family,
                    fontWeight: savedData.font_weight
                },
                infoPills: savedData.info_pills,
                heroIcons: savedData.hero_icons
            };

            window.dispatchEvent(new CustomEvent('frontendSync', { detail: frontendSyncData }));

            if (tenant.slug) {
                const cacheKey = `tenant_lock_${tenant.slug}`;
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try { localStorage.setItem(cacheKey, JSON.stringify({ ...JSON.parse(cached), ...savedData })); } catch (e) { /* ignore */ }
                }
            }

            setHasChanges(false);
            sessionStorage.removeItem(`dirty_branding_${businessId}`);
            setSaveStatus({ message: t('branding_saved') });
            setTimeout(() => setSaveStatus(null), 3000);
            setTimeout(() => { justSavedRef.current = false; }, 2000);

        } catch (error) {
            console.error('Save failed:', error);
            justSavedRef.current = false;
            const isForbidden = error?.code === '42501' || error?.status === 403 || error?.message?.includes('permission');
            setSaveStatus({
                error: true,
                message: isForbidden
                    ? 'Access denied. Please log out and log back in as the business owner.'
                    : (t('save_failed') || 'Save failed')
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save munchboy color changes immediately (no main Save button needed)
    const autoSaveMunchboy = async (munchboyData) => {
        if (!businessId) return;
        setSaveStatus({ message: t('saving') || 'Saving...' });
        try {
            const payload = {
                app_config: deepMergeAppConfig(
                    tenant?.app_config || {},
                    { munchboy: munchboyData }
                )
            };
            const { data, error } = await updateBranding(payload, businessId);
            if (error) throw error;
            if (data) Object.assign(tenant, data);
            setSaveStatus({ message: t('saved') || 'Saved' });
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (err) {
            console.error('[autoSaveMunchboy] failed:', err);
            setSaveStatus({
                error: true,
                message: err?.message?.includes('403') || err?.code === '403'
                    ? 'Access denied. Please log out and log back in as the business owner.'
                    : (t('save_failed') || 'Save failed')
            });
            setTimeout(() => setSaveStatus(null), 3000);
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
        const currentColor = draft[keyName] || defaultValue;
        return (
            <div className="color-pillar">
                <p className="pillar-label">{label}</p>
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

    if (loading || !tenant || !isDraftReady) return <BurgerLoader />;

    const heroIconMode = draft.hero_icon_mode || 'black';
    const navIconMode = draft.nav_icon_mode || 'white';
    const navbarColor = draft.navbar_color || DEFAULTS.navbar;

    return (
        <div className="bg-[#F8FAFC] min-h-screen">
            <BackendHeader title={t('settings_title')} onLogout={handleLogout} />

            <div className="settings-vault">
                {/* ========== 1. IDENTITY & TYPOGRAPHY ========== */}
                <section className="branding-card">
                    <h3 style={{ color: '#10B981', fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>1. {t('identity_typography')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                            type="text"
                            className="fs-input"
                            value={draft.business_name}
                            onChange={handleNameChange}
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
                                    <span>{draft.font_family}</span>
                                    <span className="dropdown-arrow">▼</span>
                                </button>
                                {isFontMenuOpen && (
                                    <div className="dropdown-menu">
                                        {['Inter', 'Roboto', 'Outfit', 'Lora', 'Poppins', 'Montserrat'].map((font) => (
                                            <div
                                                key={font}
                                                className={`dropdown-option ${draft.font_family === font ? 'active' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); handleFontSelect(font); }}
                                                style={{ fontFamily: font }}
                                            >
                                                {font}
                                                {draft.font_family === font && <span className="check">{t('selected')}</span>}
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
                                        {draft.font_weight === '400' ? t('font_weight_400') :
                                         draft.font_weight === '500' ? t('font_weight_500') :
                                         draft.font_weight === '600' ? t('font_weight_600') :
                                         draft.font_weight === '700' ? t('font_weight_700') :
                                         draft.font_weight === '800' ? t('font_weight_800') : t('font_weight_600')}
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
                                                className={`dropdown-option ${draft.font_weight === option.value ? 'active' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); handleWeightSelect(option.value); }}
                                                style={{ fontWeight: option.value }}
                                            >
                                                {option.label}
                                                {draft.font_weight === option.value && <span className="check">{t('selected')}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* MP token warning removed for MVP — token kept dormant in DB */}
                    </div>
                </section>

                {/* ========== 2. HERO COVER ========== */}
                <section className="branding-card">
                    <div className="section-header">
                        <h3>2. {t('hero_cover')}</h3>
                        <div className="mode-toggle">
                            <button
                                onClick={() => updateDraftField('hero_mode', 'text')}
                                className={draft.hero_mode === 'text' ? 'active' : ''}
                            >
                                {t('text_mode')}
                            </button>
                            <button
                                onClick={() => updateDraftField('hero_mode', 'image')}
                                className={draft.hero_mode === 'image' ? 'active' : ''}
                            >
                                {t('image_mode')}
                            </button>
                        </div>
                    </div>

                    {draft.hero_mode === 'image' ? (
                        <>
                        <div className="hero-studio-trigger" onClick={() => setShowCoverEditor(true)}>
                            {draft.hero_url ? (
                                <>
                                    <div className="editor-crosshair">+</div>
                                    <img src={draft.hero_url} className="preview-img" alt="Hero" />
                                    <div className="edit-overlay"><span>{t('edit_image')}</span></div>
                                </>
                            ) : (
                                <div className="empty-state">
                                    <span className="plus-icon">+</span>
                                    <span>{t('upload_logo_cover')}</span>
                                </div>
                            )}
                        </div>
                        {/* Guidelines for best results */}
                        <p style={{ fontSize: 11, color: '#64748B', marginTop: 10, marginBottom: 0, textAlign: 'center' }}>
                            {t('hero_image_tip')}
                        </p>
                        </>

                    ) : (
                        <div
                            className="hero-preview-text"
                            style={{ fontFamily: draft.font_family, fontWeight: draft.font_weight }}
                        >
                            {draft.business_name || t('business_name_placeholder')}
                        </div>
                    )}

                    {/* COVER IMAGE EDITOR MODAL */}
                    <CoverImageEditor
                        isOpen={showCoverEditor}
                        onClose={() => setShowCoverEditor(false)}
                        businessId={businessId}
                        config={{ branding: { logo_url: null } }}
                        initialData={(() => {
                            if (!draft.hero_url) return { image: null, scale: 1, posX: 50, posY: 50 };
                            try {
                                const url = new URL(draft.hero_url, 'http://dummy.com');
                                const params = new URLSearchParams(url.search);
                                return {
                                    image: draft.hero_url,
                                    scale: parseFloat(params.get('s')) || 1,
                                    posX: parseFloat(params.get('px')) || 50,
                                    posY: parseFloat(params.get('py')) || 50,
                                    // Legacy fallbacks
                                    offsetX: parseFloat(params.get('x')) || 0,
                                    offsetY: parseFloat(params.get('y')) || 0,
                                };
                            } catch (e) {
                                return { image: draft.hero_url, scale: 1, posX: 50, posY: 50 };
                            }
                        })()}
                        onSave={async (data) => {
                            if (!data?.image) {
                                console.error('onSave: No image data received');
                                alert('Upload failed. Please try again.');
                                return;
                            }

                            // Delete old hero cover image from storage to keep it clean (1 file at a time)
                            if (draft.hero_cover_image) {
                                try {
                                    const oldUrl = new URL(draft.hero_cover_image);
                                    const oldPath = oldUrl.pathname.split('/storage/v1/object/')[1];
                                    if (oldPath) {
                                        await supabase.storage.from('assets').remove([oldPath]);
                                        console.log('[Hero] Deleted old cover image:', oldPath);
                                    }
                                } catch (err) {
                                    console.warn('[Hero] Could not delete old image (non-critical):', err);
                                }
                            }

                            const cleanUrl = data.image.split('?')[0];
                            const timestamp = Date.now();
                            // NEW STANDARD: px/py for percentage based positioning
                            const finalUrl = `${cleanUrl}?t=${timestamp}&s=${data.scale}&px=${data.posX}&py=${data.posY}`;
                            updateDraftField('hero_cover_image', cleanUrl);
                            updateDraftField('hero_cover_image_uploaded_at', new Date().toISOString());
                            updateDraftField('hero_url', finalUrl);
                            setShowCoverEditor(false);
                        }}
                    />
                </section>

                {/* ========== 3. HERO ICONS ========== */}
                <section className="branding-card">
                    <div className="section-header">
                        <h3>3. {t('hero_icons_label')}</h3>
                        <div className="mode-toggle">
                            <button
                                onClick={() => updateDraftField('hero_icon_mode', 'white')}
                                className={heroIconMode === 'white' ? 'active' : ''}
                            >
                                {t('white_mode')}
                            </button>
                            <button
                                onClick={() => updateDraftField('hero_icon_mode', 'black')}
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
                            const bgColor = draft.hero_icons[id]?.color || DEFAULTS.heroIconColor;
                            const iconColor = heroIconMode === 'white' ? '#FFFFFF' : HERO_ICON_DARK;

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
                                    <div style={{ color: iconColor, fontSize: '28px' }}><Icon /></div>
                                    <span style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: iconColor,
                                        opacity: 0.95
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

                {/* ========== 4. NAVBAR STYLE ========== */}
                <section className="branding-card">
                    <div className="section-header">
                        <h3>4. {t('bar_style')}</h3>
                        <div className="mode-toggle">
                            <button
                                onClick={() => updateDraftField('nav_icon_mode', 'white')}
                                className={navIconMode === 'white' ? 'active' : ''}
                            >
                                {t('white_mode')}
                            </button>
                            <button
                                onClick={() => updateDraftField('nav_icon_mode', 'black')}
                                className={navIconMode === 'black' ? 'active' : ''}
                            >
                                {t('dark_mode')}
                            </button>
                        </div>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>{t('bar_color_desc')}</p>

                    {/* MiniNav Preview */}
                    <div
                        onClick={() => openColorPicker(t('bar_color_title'), 'navbar_color', '--color-navbar-bg', DEFAULTS.navbar)}
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
                        <ColorPillar label={t('confirmation')} keyName="confirmation_color" cssVar="--color-primary" defaultValue={DEFAULTS.confirmation} />
                        <ColorPillar label={t('powered_by')} keyName="powered_by_color" cssVar="--color-powered" defaultValue={DEFAULTS.poweredBy} />
                    </div>
                </section>

                {/* ========== 6. MUNCHBOY BRANDING ========== */}
                <section className="branding-card">
                    <div className="section-header">
                        <h3>Munchboy Arcade</h3>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>{t('munchboy_subtitle')}</p>
                    
                    {/* Visual Emulator Preview */}
                    <div 
                        className="munchboy-preview"
                        style={{
                            background: draft.app_config?.munchboy?.shell_color || '#6B0FCC',
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
                            {draft.app_config?.munchboy?.name || 'MUNCHBOY'}
                        </div>
                        
                        {/* Controller preview */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0 8px'
                        }}>
                            {/* D-Pad */}
                            <div style={{ width: 70, height: 70, position: 'relative' }}>
                                <div style={{
                                    position: 'absolute', top: '50%', left: 0,
                                    transform: 'translateY(-50%)',
                                    width: '100%', height: '35%',
                                    background: '#D1D5DB',
                                    borderRadius: 6,
                                    border: '2px solid #1a1a1a'
                                }} />
                                <div style={{
                                    position: 'absolute', left: '50%', top: 0,
                                    transform: 'translateX(-50%)',
                                    width: '35%', height: '100%',
                                    background: '#D1D5DB',
                                    borderRadius: 6,
                                    border: '2px solid #1a1a1a'
                                }} />
                            </div>
                            
                            {/* A/B Buttons */}
                            <div style={{ position: 'relative', width: 100, height: 58, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                                <div
                                    onClick={() => openColorPicker(t('munchboy_b_button_color'), 'munchboy_b_color', '', draft.app_config?.munchboy?.b_color || '#D1D5DB')}
                                    style={{
                                        width: 44, height: 44, borderRadius: '50%',
                                        background: boostSaturation(draft.app_config?.munchboy?.b_color || '#D1D5DB'),
                                        border: '2px solid #1a1a1a',
                                        boxShadow: 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', fontSize: 14, fontWeight: 'bold', color: '#000',
                                        opacity: 1
                                    }}
                                >B</div>
                                <div
                                    onClick={() => openColorPicker(t('munchboy_a_button_color'), 'munchboy_a_color', '', draft.app_config?.munchboy?.a_color || '#D1D5DB')}
                                    style={{
                                        width: 44, height: 44, borderRadius: '50%',
                                        background: boostSaturation(draft.app_config?.munchboy?.a_color || '#D1D5DB'),
                                        border: '2px solid #1a1a1a',
                                        boxShadow: 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', fontSize: 14, fontWeight: 'bold', color: '#000',
                                        opacity: 1
                                    }}
                                >A</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Compact Controls Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                            <div 
                                onClick={() => openColorPicker(t('munchboy_shell'), 'munchboy_shell_color', '', draft.app_config?.munchboy?.shell_color || '#6B0FCC')}
                                style={{
                                    width: 36, height: 36, borderRadius: 8,
                                    background: draft.app_config?.munchboy?.shell_color || '#6B0FCC',
                                    border: '2px solid rgba(0,0,0,0.1)',
                                    cursor: 'pointer'
                                }}
                                title={t('munchboy_shell')}
                            />
                            <div
                                onClick={() => openColorPicker(t('munchboy_a_button'), 'munchboy_a_color', '', draft.app_config?.munchboy?.a_color || '#D1D5DB')}
                                style={{
                                    width: 36, height: 36, borderRadius: '50%',
                                    background: boostSaturation(draft.app_config?.munchboy?.a_color || '#D1D5DB'),
                                    border: '2px solid rgba(0,0,0,0.1)',
                                    cursor: 'pointer'
                                }}
                                title={t('munchboy_a_button')}
                            />
                            <div
                                onClick={() => openColorPicker(t('munchboy_b_button'), 'munchboy_b_color', '', draft.app_config?.munchboy?.b_color || '#D1D5DB')}
                                style={{
                                    width: 36, height: 36, borderRadius: '50%',
                                    background: boostSaturation(draft.app_config?.munchboy?.b_color || '#D1D5DB'),
                                    border: '2px solid rgba(0,0,0,0.1)',
                                    cursor: 'pointer'
                                }}
                                title={t('munchboy_b_button')}
                            />
                        </div>
                        
                        {/* Enable Toggle — hidden until wired to frontend */}
                    </div>

                    {/* Display Name — hidden until frontend sync is fixed */}
                </section>

                {/* ========== 7. INFO PILLS ========== */}
                <section className="branding-card">
                    <div className="section-header">
                        <h3>6. {t('info_pills')}</h3>
                        <div className="mode-toggle">
                            <button
                                onClick={() => updateDraftField('info_pills', { ...draft.info_pills, pill_icon_mode: 'white' })}
                                className={draft.info_pills?.pill_icon_mode === 'white' || !draft.info_pills?.pill_icon_mode ? 'active' : ''}
                            >
                                {t('white_mode')}
                            </button>
                            <button
                                onClick={() => updateDraftField('info_pills', { ...draft.info_pills, pill_icon_mode: 'dark' })}
                                className={draft.info_pills?.pill_icon_mode === 'dark' ? 'active' : ''}
                            >
                                {t('dark_mode')}
                            </button>
                        </div>
                    </div>
                    <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8, marginTop: -4 }}>{t('info_pills_desc')}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {['mercadoPago', 'adminAccess'].map(pillId => {
                            const pillData = draft.info_pills[pillId] || {};
                            const isActive = pillData.enabled;
                            const bgColor = pillData.bgColor || '#EEEEEE';
                            const content = pillData.content || '';

                            const labels = {
                                mercadoPago: t('label_mercado_pago'),
                                adminAccess: t('admin_login')
                            };

                            const placeHolders = {
                                mercadoPago: t('mp_alias_placeholder'),
                                adminAccess: t('not_applicable')
                            };

                            return (
                                <div key={pillId} className="pill-row">
                                    {/* Color Swatch */}
                                    <div
                                        onClick={() => openColorPicker(`Color: ${labels[pillId]}`, `info_pill_${pillId}`, '', bgColor)}
                                        className="pill-swatch"
                                        style={{ background: bgColor }}
                                    />

                                    {/* Content Input */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{labels[pillId]}</span>
                                            {pillId !== 'adminAccess' ? (
                                                <label className="switch-label">
                                                    <span style={{ color: isActive ? '#10B981' : '#94A3B8', fontWeight: 600 }}>
                                                        {isActive ? t('visible') : t('hidden')}
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!isActive}
                                                        onChange={(e) => updateInfoPill(pillId, { enabled: e.target.checked })}
                                                        style={{ accentColor: '#10B981' }}
                                                    />
                                                </label>
                                            ) : (
                                                <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>Always visible</span>
                                            )}
                                        </div>
                                        {pillId !== 'adminAccess' && (
                                            <input
                                                type="text"
                                                className="pill-input"
                                                defaultValue={content}
                                                placeholder={placeHolders[pillId]}
                                                onBlur={(e) => updateInfoPill(pillId, { content: e.target.value })}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ========== PAYMENT & FULFILLMENT ========== */}
                <section className="branding-card">
                    <div className="section-header">
                        <h3>{t('payment_settings') || 'Payment & Fulfillment'}</h3>
                    </div>

                    {/* SERVICE MODES */}
                    <div style={{ marginBottom: 20 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: 10 }}>
                            {t('service_modes') || 'Service Modes'}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                                { key: 'pickup',   label: t('pickup'),   defaultOn: true  },
                                { key: 'delivery', label: t('delivery'), defaultOn: true  },
                                { key: 'dineIn',   label: t('dine_in'),  defaultOn: false },
                            ].map(({ key, label, defaultOn }) => {
                                const on = draft.service_modes?.[key] ?? defaultOn;
                                return (
                                    <div
                                        key={key}
                                        onClick={() => {
                                            setDraft(d => {
                                                const current = d.service_modes || { pickup: true, delivery: true, dineIn: false, dineInPayment: 'after' };
                                                return { ...d, service_modes: { ...current, [key]: !on } };
                                            });
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                                            background: on ? '#ECFDF5' : '#F9FAFB',
                                            border: `1px solid ${on ? '#10B981' : '#E5E7EB'}`
                                        }}
                                    >
                                        <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</span>
                                        <div style={{ width: 36, height: 20, borderRadius: 10, background: on ? '#10B981' : '#D1D5DB', position: 'relative', transition: 'all 0.2s' }}>
                                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: on ? 18 : 2, transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* DINE-IN: Always pay at the end */}
                    {draft.service_modes?.dineIn && (
                        <div style={{ marginBottom: 20, padding: '10px 12px', background: '#F3F4F6', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
                                {t('customers_pay_at_end')}
                            </span>
                        </div>
                    )}

                    {/* PAYMENT METHODS */}
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: 10 }}>
                            {t('payment_methods') || 'Payment Methods'}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                                { key: 'cash',         label: t('cash')         },
                                { key: 'mercado_pago', label: t('label_mercado_pago') || 'Mercado Pago' },
                            ].map(({ key, label }) => {
                                const on = draft.payment_methods?.[key] ?? true;
                                return (
                                    <div
                                        key={key}
                                        onClick={() => {
                                            setDraft(d => {
                                                const current = d.payment_methods || { cash: true, mercado_pago: true, card: false, transfer: false };
                                                return { ...d, payment_methods: { ...current, [key]: !on } };
                                            });
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '10px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                                            background: on ? '#ECFDF5' : '#F9FAFB',
                                            border: `1px solid ${on ? '#10B981' : '#E5E7EB'}`
                                        }}
                                    >
                                        <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</span>
                                        <div style={{ width: 36, height: 20, borderRadius: 10, background: on ? '#10B981' : '#D1D5DB', position: 'relative', transition: 'all 0.2s' }}>
                                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: on ? 18 : 2, transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* MP token warning removed for MVP — token kept dormant in DB */}
                    </div>
                </section>
            </div>

            <BackendNav role="owner" useRoutes={true} />

            {/* Color Picker Modal */}
            {colorPickerState.isOpen && (
                <ColorPickerModal
                    title={colorPickerState.title}
                    initialColor={colorPickerState.initialColor}
                    onLiveChange={handleColorPickerLiveChange}
                    onApply={handleColorPickerApply}
                    onClose={handleColorPickerClose}
                />
            )}

            {/* AUTO-SAVE PILL (Service Modes + Payment Methods) */}
            {(serviceModeSaveStatus || paymentSaveStatus) && (
                (() => {
                    const status = serviceModeSaveStatus?.error ? serviceModeSaveStatus
                        : paymentSaveStatus?.error ? paymentSaveStatus
                        : serviceModeSaveStatus || paymentSaveStatus;
                    return (
                        <div style={{
                            position: 'fixed', bottom: 80, left: '50%',
                            transform: 'translateX(-50%)',
                            background: status?.error ? '#EF4444' : '#059669', color: 'white',
                            padding: '10px 20px', borderRadius: 999,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            fontWeight: 600, fontSize: 13, zIndex: 9999,
                            pointerEvents: 'none',
                            animation: 'fadeIn 0.2s ease-out'
                        }}>
                            {status?.message}
                        </div>
                    );
                })()
            )}

            {/* SAVE SUCCESS TOAST (manual branding save) */}
            {saveStatus && (
                <div style={{
                    position: 'fixed', bottom: 24, left: '50%',
                    transform: 'translateX(-50%)',
                    background: saveStatus.error ? '#EF4444' : '#22C55E', color: 'white',
                    padding: '10px 24px', borderRadius: 50,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                    fontWeight: 600, fontSize: 14, zIndex: 9999,
                    display: 'flex', alignItems: 'center', gap: 8,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <span style={{ fontWeight: 700 }}>{saveStatus.error ? '!' : ''}</span> {saveStatus.message}
                </div>
            )}

            {/* FLOATING SAVE BAR */}
            {hasChanges && (
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
            )}
        </div>
    );
};

export default Settings;
