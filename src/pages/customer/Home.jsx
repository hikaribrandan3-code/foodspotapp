import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
// 🔌 ASSETS: Keeping real imports for visual fidelity
import { MenuIcon, DeliveryIcon, PromosIcon, GameIcon } from '../../components/HeroIcons.jsx'
import { getMenu } from '../../config/menuData.js'

export default function Home() {
    const navigate = useNavigate();

    // 🛡️ THE NEW POWER SOURCE: Context instead of Props
    const { branding: cloudBranding, tenantData, loading, slug: tenantSlug } = useTenant();

    // 🔄 FALLBACKS: If the Silo is loading, show a skeleton or nothing
    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

    // 🛡️ DATA NORMALIZATION (CamelCase vs Snake_Case Armor)
    const branding = {
        ...cloudBranding,
        ...tenantData,
        // Map snake_case (DB) to camelCase (UI)
        heroIcons: cloudBranding?.heroIcons || tenantData?.hero_icons || {},
        primaryColor: cloudBranding?.primaryColor || tenantData?.primary_color || '#8B7355',
        businessName: cloudBranding?.businessName || tenantData?.business_name || 'FoodSpot',
        infoPills: cloudBranding?.infoPills || tenantData?.info_pills || {},
        poweredByColor: cloudBranding?.poweredByColor || tenantData?.powered_by_color || '#C4856A',
        logoUrl: cloudBranding?.logoUrl || tenantData?.logo_url,
        heroUrl: cloudBranding?.heroUrl || tenantData?.hero_url
    };

    // 🎨 EXTRACT COLORS (With Safety Defaults)
    const primaryColor = branding.primaryColor;
    const logoUrl = branding.logoUrl;
    // Hero URL: Try branding, then tenantData, then null
    const heroUrl = branding.heroUrl;

    // 🎛️ HERO ICONS WIRING
    // This connects the "Big 4" to the Admin Settings
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
        // Ensure we don't double-slash or miss slug
        const safeSlug = tenantSlug || 'demo';
        navigate(`/${safeSlug}${path}`);
    };

    // 💊 PILLS DATA: Database -> fallback
    const menuData = getMenu(); // Static fallback list
    const pillsData = (branding?.infoPills && Object.keys(branding.infoPills).length > 0)
        ? Object.entries(branding.infoPills).map(([k, v]) => ({ label: v.label || k, icon: v.icon || '🍽️' }))
        : menuData.map(cat => ({ label: cat.name, icon: '🍽️' })); // Map static menu to pills

    return (
        <div className="min-h-screen bg-gray-50 pb-20 relative font-sans">

            {/* 1. HERO HEADER (Cover + Logo) */}
            <div className="relative h-64 w-full bg-gray-900 overflow-hidden shadow-md">
                {heroUrl ? (
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                        style={{ backgroundImage: `url(${heroUrl})` }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white/20 text-4xl">
                        🏠
                    </div>
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {/* Logo & Title */}
                <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4 z-10">
                    <div className="w-20 h-20 rounded-full bg-white p-1 shadow-lg relative -mb-8 z-20 overflow-hidden flex-shrink-0">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-2xl">🏪</div>
                        )}
                    </div>
                    <div className="mb-2 text-white">
                        <h1 className="text-2xl font-bold leading-tight shadow-black drop-shadow-md">
                            {branding?.businessName || tenantData?.business_name || 'FoodSpot'}
                        </h1>
                        <p className="text-sm text-white/90 font-light">
                            ¡Pedí lo que más te guste!
                        </p>
                    </div>
                </div>
            </div>

            {/* Spacer for floating logo */}
            <div className="h-6 w-full" />

            {/* 2. THE BIG 4 HERO ICONS (Wired to Admin) */}
            <div className="px-4 mt-8 grid grid-cols-2 gap-3">

                {/* MENU CARD */}
                <button
                    onClick={() => handleNav('/menu')}
                    className="relative h-32 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all active:scale-95"
                    style={getHeroStyle('menu', primaryColor)}
                >
                    <span className="text-3xl mb-1 drop-shadow-sm"><MenuIcon /></span>
                    <span className="font-bold tracking-wide text-sm mt-2">MENÚ</span>
                </button>

                {/* ENVIOS CARD */}
                <button
                    onClick={() => handleNav('/envios')}
                    className="relative h-32 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all active:scale-95"
                    style={getHeroStyle('delivery', '#22C55E')}
                >
                    <span className="text-3xl mb-1 drop-shadow-sm"><DeliveryIcon /></span>
                    <span className="font-bold tracking-wide text-sm mt-2">ENVÍOS</span>
                </button>

                {/* PROMOS CARD */}
                <button
                    onClick={() => handleNav('/promos')}
                    className="relative h-24 rounded-2xl p-3 flex flex-row items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95"
                    style={getHeroStyle('promos', '#F59E0B')}
                >
                    <span className="text-2xl drop-shadow-sm"><PromosIcon /></span>
                    <span className="font-bold tracking-wide text-sm">PROMOS</span>
                </button>

                {/* GAME/REWARDS CARD */}
                <button
                    onClick={() => handleNav('/game')}
                    className="relative h-24 rounded-2xl p-3 flex flex-row items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95"
                    style={getHeroStyle('game', '#8B5CF6')}
                >
                    <span className="text-2xl drop-shadow-sm"><GameIcon /></span>
                    <span className="font-bold tracking-wide text-sm">PREMIOS</span>
                </button>
            </div>

            {/* 3. THE 60+ PILLS (Horizontal Scroll) */}
            <div className="mt-8 pl-4">
                <div className="flex items-center justify-between pr-4 mb-3">
                    <h3 className="font-bold text-gray-800 text-lg">Categorías</h3>
                    <button onClick={() => handleNav('/menu')} className="text-xs text-blue-600 font-medium">Ver todas</button>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-6 pr-4 scrollbar-hide">
                    {pillsData.map((item, index) => (
                        <div key={index} className="flex flex-col items-center gap-2 min-w-[70px] cursor-pointer active:opacity-70">
                            <div className="w-16 h-16 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-2xl">
                                {item.icon}
                            </div>
                            <span className="text-xs font-medium text-gray-600 truncate w-full text-center">
                                {item.label}
                            </span>
                        </div>
                    ))}

                    {/* Fallback if list is dangerously empty */}
                    {pillsData.length === 0 && ['Burgers', 'Pizza', 'Sushi'].map((label, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 min-w-[70px] cursor-pointer">
                            <div className="w-16 h-16 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-2xl">🍽️</div>
                            <span className="text-xs font-medium text-gray-600">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. FOOTER */}
            <div className="mt-auto py-8 text-center text-xs text-gray-400">
                Powered by <span style={{ color: branding?.poweredByColor || '#C4856A', fontWeight: 'bold' }}>FoodSpot</span>
            </div>
        </div>
    );
}
