/**
 * 🛡️ OPERATION VAULT-SEAL: STRIKE 1
 * TenantContext.jsx — Blocking Identity Anchor & Silo Guard
 * 
 * MISSION: Resolve tenant identity from URL slug BEFORE app renders.
 * PREVENTS: null context crashes, branding desync, silo violations.
 * 
 * Architecture:
 *   1. Parse URL slug → Query Supabase branding table
 *   2. Normalize snake_case (DB) → camelCase (Frontend)
 *   3. Inject CSS variables via Direct DOM (zero-latency hydration)
 *   4. Block render until identity is established
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { setTenantStoragePrefix } from '../utils/storage.js';

const TenantContext = createContext(null);

/**
 * 🔄 WIRING MISMATCH FIX: snake_case → camelCase normalizer
 * Single source of truth for DB → Frontend field mapping
 */
function normalizeBranding(dbRow) {
    if (!dbRow) return null;

    return {
        // Core Identity
        businessId: dbRow.business_id || dbRow.user_id || null,
        businessName: dbRow.business_name || 'FoodSpot',
        slug: dbRow.slug || null,

        // Branding Colors
        primaryColor: dbRow.primary_color || '#8B7355',
        secondaryColor: dbRow.secondary_color || '#A89070',
        confirmationColor: dbRow.confirmation_color || '#22C55E',
        poweredByColor: dbRow.powered_by_color || '#C4856A',

        // Typography
        fontFamily: dbRow.font_family || 'Inter',
        fontWeight: dbRow.font_weight || '400',

        // Nav Theming
        iconColorMode: dbRow.icon_color_mode || 'white',

        // Assets
        logoUrl: dbRow.logo_url || null,
        heroUrl: dbRow.hero_url || null,

        // JSON Objects (pass-through, already camelCase inside)
        heroIcons: dbRow.hero_icons || {},
        infoPills: dbRow.info_pills || {},
        colors: dbRow.colors || {},
        camera: dbRow.camera || {},

        // Trial Status
        isPaid: dbRow.is_paid || false,
        trialEndsAt: dbRow.trial_ends_at || null,

        // Metadata
        createdAt: dbRow.created_at,
        updatedAt: dbRow.updated_at,
    };
}

/**
 * 🎨 DIRECT-DOM HYDRATION: Inject CSS variables before React paints
 * This ensures zero-latency visual consistency on cold boot.
 */
function injectBrandingCSS(branding) {
    if (!branding) return;

    const root = document.documentElement;

    // Primary Theme Colors
    root.style.setProperty('--color-primary', branding.primaryColor);
    root.style.setProperty('--color-primary-light', branding.secondaryColor);
    root.style.setProperty('--color-confirmation', branding.confirmationColor);

    // Navigation Bar
    root.style.setProperty('--nav-primary-color', branding.primaryColor);
    root.style.setProperty('--nav-icon-color', branding.iconColorMode === 'black' ? '#000000' : '#FFFFFF');

    // Typography
    root.style.setProperty('--font-family-brand', `"${branding.fontFamily}", system-ui, sans-serif`);
    root.style.setProperty('--font-weight-brand', branding.fontWeight);

    // Apply font to body immediately
    document.body.style.fontFamily = `"${branding.fontFamily}", system-ui, sans-serif`;
}

/**
 * 🛡️ TenantProvider — Blocking Identity Anchor
 */
export function TenantProvider({ children }) {
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [trialExpired, setTrialExpired] = useState(false);

    const resolveTenant = useCallback(async () => {
        const pathname = window.location.pathname;
        const pathSegments = pathname.split('/').filter(Boolean);

        // 🛡️ SILO GUARD: Explicit bypass for system routes
        // These routes do NOT require tenant context
        const SYSTEM_ROUTES = [
            'admin', 'superadmin',           // Admin panel
            'start-trial', 'login', 'signup', // Auth flows
            'camera', 'receipt', 'api'        // Utilities
        ];

        if (pathSegments.length === 0 || SYSTEM_ROUTES.includes(pathSegments[0])) {
            // 🏠 NEUTRAL STATE: No tenant, no error — just render children
            setLoading(false);
            return;
        }

        const slug = pathSegments[0];

        try {
            // 🛡️ SILO GUARD: Single source of truth fetch from Supabase
            const { data: business, error: fetchError } = await supabase
                .from('branding')
                .select('*')
                .eq('slug', slug)
                .maybeSingle();

            if (fetchError) throw fetchError;

            // 🔄 FALLBACK: Try case-insensitive business_name match
            let resolvedBusiness = business;
            if (!resolvedBusiness) {
                const { data: byName } = await supabase
                    .from('branding')
                    .select('*')
                    .ilike('business_name', slug)
                    .maybeSingle();
                resolvedBusiness = byName;
            }

            if (!resolvedBusiness) {
                throw new Error(`Business "${slug}" not found. Check URL or contact support.`);
            }

            // 🔄 NORMALIZE: snake_case → camelCase
            const branding = normalizeBranding(resolvedBusiness);

            // 🎨 DIRECT-DOM HYDRATION: Inject CSS before paint
            injectBrandingCSS(branding);

            // 🗄️ STORAGE ISOLATION: Prefix localStorage keys with tenant ID
            const tenantId = branding.businessId || resolvedBusiness.user_id;
            if (tenantId) {
                setTenantStoragePrefix(tenantId);
            }

            // ⏰ TRIAL CHECK: Lock app if trial expired
            if (!branding.isPaid && branding.trialEndsAt) {
                const trialEnd = new Date(branding.trialEndsAt);
                if (new Date() > trialEnd) {
                    console.warn(`[Vault-Seal] Trial expired for ${branding.businessName}`);
                    setTrialExpired(true);
                }
            }

            // ✅ SUCCESS: Set tenant state (single update, no cascade)
            setTenant({
                businessId: tenantId,
                slug: resolvedBusiness.slug,
                tenantData: resolvedBusiness,  // Raw DB row for edge cases
                branding: branding,             // Normalized for components
                isLoaded: true,
            });

        } catch (err) {
            console.error('[Vault-Seal] Identity Resolution Failure:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        resolveTenant();
    }, [resolveTenant]);

    // 🛡️ BLOCKING GUARD: Prevent null context crashes
    // App will NOT render until Silo identity is established
    if (loading) {
        return (
            <div className="vault-seal-loading">
                <style>{`
                    .vault-seal-loading {
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                        font-family: 'Inter', system-ui, sans-serif;
                    }
                    .anchor-spinner {
                        width: 48px;
                        height: 48px;
                        border: 4px solid rgba(255,255,255,0.1);
                        border-top: 4px solid #fff;
                        border-radius: 50%;
                        animation: anchor-spin 0.8s linear infinite;
                    }
                    @keyframes anchor-spin { to { transform: rotate(360deg); } }
                    .vault-seal-loading p {
                        margin-top: 16px;
                        color: rgba(255,255,255,0.7);
                        font-weight: 500;
                        font-size: 14px;
                    }
                `}</style>
                <div className="anchor-spinner"></div>
                <p>Cargando FoodSpot...</p>
            </div>
        );
    }

    // 🚨 ERROR BOUNDARY: Fallback if slug resolution fails
    // Only show for tenant routes, not system routes
    if (error && !['/', '/start-trial', '/login', '/admin'].includes(window.location.pathname)) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1a1a2e',
                color: '#fff',
                fontFamily: 'Inter, system-ui, sans-serif',
                padding: '24px',
                textAlign: 'center'
            }}>
                <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>🏢 Negocio no encontrado</h1>
                <p style={{ opacity: 0.7, maxWidth: '400px', marginBottom: '24px' }}>{error}</p>
                <button
                    onClick={() => window.location.href = '/'}
                    style={{
                        padding: '12px 24px',
                        background: '#7C3AED',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    // ✅ PROVIDE CONTEXT: Includes refresh callback for manual re-sync
    return (
        <TenantContext.Provider value={{
            ...tenant,
            loading,
            error,
            trialExpired,
            refresh: resolveTenant
        }}>
            {children}
        </TenantContext.Provider>
    );
}

/**
 * 🪝 useTenant — Primary hook for consuming tenant context
 * Returns safe defaults when context is null (for system routes)
 */
export function useTenant() {
    const context = useContext(TenantContext);

    // 🛡️ SAFE DEFAULTS: Return empty object for system routes
    // This prevents crashes on /admin, /start-trial, etc.
    if (!context) {
        return {
            businessId: null,
            slug: null,
            tenantData: {},
            branding: {},
            loading: false,
            isLoaded: false,
            trialExpired: false,
            error: null,
            refresh: () => { }
        };
    }

    return {
        ...context,
        tenantData: context.tenantData || {},
        branding: context.branding || {},
        isLoaded: context.isLoaded ?? !context.loading
    };
}

/**
 * 🪝 useBusinessId — Shortcut hook for businessId only
 * Used by Supabase functions for silo-scoped queries
 */
export function useBusinessId() {
    const context = useContext(TenantContext);
    if (!context) return null;
    return context.businessId;
}
