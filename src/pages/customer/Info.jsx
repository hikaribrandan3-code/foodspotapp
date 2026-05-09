import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useLanguage } from '../../contexts/LanguageContext';
import HeaderClamp from '../../components/HeaderClamp.jsx';
import BurgerLoader from '../../components/BurgerLoader';

const Info = ({ config }) => {
    const navigate = useNavigate();
    const { tenantSlug } = useParams();
    const { tenantData, loading } = useTenant();
    const { t } = useLanguage();

    if (loading) return <BurgerLoader />;

    const businessName = tenantData?.venue_name || tenantData?.name || "FOODSPOT";
    const primaryColor = tenantData?.primary_color || '#DB0007';
    const whatsapp = tenantData?.business_info?.whatsapp || tenantData?.whatsapp;
    const logoUrl = tenantData?.logo_url || tenantData?.hero_url || tenantData?.branding?.logoURL;

    // Get info pills from config (set in Settings.jsx)
    const infoPills = config?.infoPills || tenantData?.info_pills || {};
    const pillIconMode = infoPills?.pill_icon_mode || 'white';

    // Default colors for pills if not set
    const defaultPillColors = {
        whatsapp: '#E55F51',
        mercadoPago: '#F4D03F',
        rappi: '#E67E22',
        pedidosYa: '#58D68D',
        adminAccess: '#448AFF'
    };

    // Get pill color from config or fallback to default
    const getPillColor = (pillId) => {
        return infoPills[pillId]?.bgColor || defaultPillColors[pillId] || '#666666';
    };

    // Check if pill is enabled (default to true for backward compatibility)
    const isPillEnabled = (pillId) => {
        // If explicitly set to false, hide it. Otherwise show.
        return infoPills[pillId]?.enabled !== false;
    };

    // Get pill content/link
    const getPillContent = (pillId) => {
        return infoPills[pillId]?.content || '';
    };

    // Icon-only circular button style (no text labels)
    const iconButtonBase = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'none',
        boxSizing: 'border-box',
        flexShrink: 0
    };

    const iconColor = pillIconMode === 'dark' ? '#1F2937' : 'white';

    return (
        <div className="page" style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            paddingBottom: '0',
            background: 'white',
            minHeight: '100vh',
            textAlign: 'center',
            boxSizing: 'border-box'
        }}>
            {/* 1. SYSTEM HERO COVER - Unified with Home.jsx */}
            <HeaderClamp config={config} />

            {/* Content Container - Tighter vertical stack */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                padding: '12px 20px 0'
            }}>
                {/* 2. ICON-ONLY ACTION BUTTONS - No text labels */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                    marginTop: '8px',
                    marginBottom: '8px'
                }}>
                    {/* WhatsApp - only show if enabled and has number */}
                    {isPillEnabled('whatsapp') && whatsapp && (
                        <a
                            href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ ...iconButtonBase, background: getPillColor('whatsapp') }}
                            title={t('info_whatsapp')}
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                            </svg>
                        </a>
                    )}

                    {/* Mercado Pago */}
                    {isPillEnabled('mercadoPago') && (
                        <button
                            style={{ ...iconButtonBase, background: getPillColor('mercadoPago') }}
                            onClick={() => navigate(`/${tenantSlug}/menu`)}
                            title={t('info_mercado_pago')}
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                <line x1="1" y1="10" x2="23" y2="10"/>
                            </svg>
                        </button>
                    )}

                    {/* Rappi */}
                    {isPillEnabled('rappi') && (
                        <button
                            style={{ ...iconButtonBase, background: getPillColor('rappi') }}
                            onClick={() => {
                                const rappiUrl = getPillContent('rappi');
                                if (rappiUrl) window.open(rappiUrl, '_blank');
                            }}
                            title={t('info_rappi')}
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 11 3.8 11 8c0 1.25-.75 2.25-1.5 3"/><path d="M8 13.5V16c0 2.35 1.38 4.5 3.5 4.5s3.5-2.15 3.5-4.5v-2.5"/><circle cx="15" cy="6" r="3"/><path d="M18 13v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6"/>
                            </svg>
                        </button>
                    )}

                    {/* PedidosYa */}
                    {isPillEnabled('pedidosYa') && (
                        <button
                            style={{ ...iconButtonBase, background: getPillColor('pedidosYa') }}
                            onClick={() => {
                                const pyUrl = getPillContent('pedidosYa');
                                if (pyUrl) window.open(pyUrl, '_blank');
                            }}
                            title={t('info_pedidosya')}
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>
                            </svg>
                        </button>
                    )}

                    {/* Admin Access */}
                    {isPillEnabled('adminAccess') && (
                        <button
                            style={{ ...iconButtonBase, background: getPillColor('adminAccess') }}
                            onClick={() => navigate(`/${tenantSlug}/owner`)}
                            title={t('info_admin_access')}
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        </button>
                    )}
                </div>

                {/* 3. SOCIAL ICONS */}
                {(tenantData?.app_config?.externalOrdering?.instagramUrl || tenantData?.app_config?.externalOrdering?.tiktokUrl) && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '24px', marginBottom: '8px' }}>
                        {tenantData?.app_config?.externalOrdering?.instagramUrl && (
                            <a href={tenantData.app_config.externalOrdering.instagramUrl} target="_blank" rel="noopener noreferrer"
                                style={{ width: 57, height: 57, borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                            </a>
                        )}
                        {tenantData?.app_config?.externalOrdering?.tiktokUrl && (
                            <a href={tenantData.app_config.externalOrdering.tiktokUrl} target="_blank" rel="noopener noreferrer"
                                style={{ width: 57, height: 57, borderRadius: '50%', background: '#010101', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/>
                                </svg>
                            </a>
                        )}
                    </div>
                )}

                {/* 4. FOOTER */}
                <div style={{ marginTop: '28px', marginBottom: 'auto' }}>
                    <p style={{ color: '#000', fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>
                        {t('powered_by')}
                    </p>
                    <a href="https://www.instagram.com/foodspotmobile?igsh=MXgxcDlvcGFtbW93Yw==" target="_blank" rel="noopener noreferrer"
                        style={{ color: config?.branding?.poweredByColor || '#C4856A', fontSize: '1.85rem', fontWeight: '800', letterSpacing: '-0.05em', textDecoration: 'none', cursor: 'pointer' }}>
                        FoodSpot OS
                    </a>
                </div>
            </div> {/* End Content Container */}
        </div>
    );
};

export default Info;
