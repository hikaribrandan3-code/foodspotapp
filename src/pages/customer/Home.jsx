import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
// 🔌 ASSETS: Restoring High-Fidelity 4x4 Icons
import { MenuIcon, DeliveryIcon, PromosIcon, GameIcon } from '../../components/HeroIcons.jsx'

export default function Home() {
    const navigate = useNavigate();

    // 🛡️ THE POWER SOURCE: Tenant Context
    const { branding: cloudBranding, tenantData, loading, slug: tenantSlug } = useTenant();

    // 🛡️ SAFETY GUARD: Prevent White Screen
    if (loading || !tenantData) return <div className="min-h-screen flex items-center justify-center bg-black text-green-500 font-mono">Loading Vault...</div>;

    // 🛡️ DATA NORMALIZATION & ASSET MAPPING
    const branding = {
        ...cloudBranding,
        ...tenantData,
        // Map snake_case (DB) to camelCase (UI)
        heroIcons: cloudBranding?.heroIcons || tenantData?.hero_icons || {},
        primaryColor: cloudBranding?.primaryColor || tenantData?.primary_color || '#8B7355',
        businessName: cloudBranding?.businessName || tenantData?.business_name || 'FoodSpot',
        logoUrl: cloudBranding?.logoUrl || tenantData?.logo_url,
        heroUrl: cloudBranding?.heroUrl || tenantData?.hero_url
    };

    // 🎨 EXTRACT COLORS & ASSETS
    const primaryColor = branding.primaryColor;
    const logoUrl = branding.logoUrl;
    const heroUrl = branding.heroUrl;

    // 📸 RESTORED: The "Lost" Feature Grid
    // Mapped directly from DB columns feature_1...feature_4
    const featurePhotos = [
        tenantData?.feature_1,
        tenantData?.feature_2,
        tenantData?.feature_3,
        tenantData?.feature_4
    ].filter(Boolean); // Only show valid images

    // 🎛️ HERO ICONS WIRING
    const heroIcons = branding?.heroIcons || {};
    const getHeroStyle = (key, defaultColor) => {
        const config = heroIcons[key] || {};
        return {
            backgroundColor: config.color || defaultColor,
            color: config.iconColorMode === 'white' ? '#FFFFFF' : '#1F2937'
        };
    };

    // 🚀 NAVIGATION HANDLER
    const handleNav = (path) => {
        const safeSlug = tenantSlug || 'demo';
        navigate(`/${safeSlug}${path}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 relative font-sans">

            {/* 1. HERO HEADER (Cover + Logo) - GUCCI TIER */}
            <div className="relative h-64 w-full bg-gray-900 overflow-hidden shadow-2xl">
                {heroUrl ? (
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                        style={{ backgroundImage: `url(${heroUrl})` }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white/20 text-5xl">
                        🏠
                    </div>
                )}
                {/* Cinema Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Floating Logo & Title */}
                <div className="absolute bottom-6 left-5 right-5 flex items-end gap-5 z-10">
                    <div className="w-24 h-24 rounded-full bg-white p-1.5 shadow-2xl relative -mb-10 z-20 overflow-hidden flex-shrink-0 ring-4 ring-black/10">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-3xl">🏪</div>
                        )}
                    </div>
                    <div className="mb-2 text-white">
                        <h1 className="text-3xl font-extrabold leading-tight drop-shadow-xl tracking-tight">
                            {branding.businessName}
                        </h1>
                        <p className="text-sm text-white/80 font-medium tracking-wide">
                            Experiencia Gastronómica
                        </p>
                    </div>
                </div>
            </div>

            {/* Spacer for floating logo overlap */}
            <div className="h-8 w-full" />

            {/* 2. THE BIG 4 HERO ICONS (2x2 GRID) - RESTORED LAYOUT */}
            <div className="px-5 mt-10 grid grid-cols-2 gap-4">

                {/* MENU CARD - Primary Brand Color */}
                <button
                    onClick={() => handleNav('/menu')}
                    className="relative h-36 rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-95 border border-white/10"
                    style={getHeroStyle('menu', primaryColor)}
                >
                    <span className="text-4xl mb-2 drop-shadow-md transform group-hover:scale-110 transition-transform"><MenuIcon /></span>
                    <span className="font-bold tracking-wider text-sm mt-1 uppercase">Menú</span>
                </button>

                {/* ENVIOS CARD - Green */}
                <button
                    onClick={() => handleNav('/envios')}
                    className="relative h-36 rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-95 border border-white/10"
                    style={getHeroStyle('delivery', '#22C55E')}
                >
                    <span className="text-4xl mb-2 drop-shadow-md"><DeliveryIcon /></span>
                    <span className="font-bold tracking-wider text-sm mt-1 uppercase">Envíos</span>
                </button>

                {/* PROMOS CARD - Amber */}
                <button
                    onClick={() => handleNav('/promos')}
                    className="relative h-28 rounded-2xl p-3 flex flex-row items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all active:scale-95 border border-white/10"
                    style={getHeroStyle('promos', '#F59E0B')}
                >
                    <span className="text-3xl drop-shadow-md"><PromosIcon /></span>
                    <span className="font-bold tracking-wider text-sm uppercase">Promos</span>
                </button>

                {/* GAME CARD - Purple */}
                <button
                    onClick={() => handleNav('/game')}
                    className="relative h-28 rounded-2xl p-3 flex flex-row items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all active:scale-95 border border-white/10"
                    style={getHeroStyle('game', '#8B5CF6')}
                >
                    <span className="text-3xl drop-shadow-md"><GameIcon /></span>
                    <span className="font-bold tracking-wider text-sm uppercase">Premios</span>
                </button>
            </div>

            {/* 3. FEATURE PHOTOS GRID (2x2) - RESTORED */}
            {featurePhotos.length > 0 && (
                <div className="px-5 mt-6 grid grid-cols-2 gap-4 pb-12">
                    {featurePhotos.map((url, i) => (
                        <div
                            key={i}
                            className="aspect-square rounded-2xl bg-cover bg-center shadow-md border border-gray-100"
                            style={{ backgroundImage: `url(${url})` }}
                        />
                    ))}
                </div>
            )}

            {/* 4. CLEAN FOOTER (PURGED "Powered By") */}
            <div className="pb-10" />

        </div>
    );
}
