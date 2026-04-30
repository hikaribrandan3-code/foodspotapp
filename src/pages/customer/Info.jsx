import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useLanguage } from '../../contexts/LanguageContext';
import HeaderClamp from '../../components/HeaderClamp.jsx';

const Info = ({ config }) => {
    const navigate = useNavigate();
    const { tenantSlug } = useParams();
    const { tenantData } = useTenant();
    const { t } = useLanguage();

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

    // Button Styles for the "Old UI" Restoration
    const buttonBase = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '16px',
        borderRadius: '30px',
        fontSize: '1.1rem',
        fontWeight: '600',
        color: pillIconMode === 'dark' ? '#1F2937' : 'white',
        border: 'none',
        marginBottom: '12px',
        cursor: 'pointer',
        textDecoration: 'none',
        boxSizing: 'border-box'
    };

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
                {/* 2. COLORFUL BUTTON STACK - Now uses config from Settings */}
                <div>
                    {/* WhatsApp - only show if enabled and has number */}
                    {isPillEnabled('whatsapp') && whatsapp && (
                        <a
                            href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ ...buttonBase, background: getPillColor('whatsapp') }}
                        >
                            {t('info_whatsapp')}
                        </a>
                    )}

                    {/* Mercado Pago */}
                    {isPillEnabled('mercadoPago') && (
                        <button
                            style={{ ...buttonBase, background: getPillColor('mercadoPago') }}
                            onClick={() => navigate(`/${tenantSlug}/menu`)}
                        >
                            {t('info_mercado_pago')}
                        </button>
                    )}

                    {/* Rappi */}
                    {isPillEnabled('rappi') && (
                        <button
                            style={{ ...buttonBase, background: getPillColor('rappi') }}
                            onClick={() => {
                                const rappiUrl = getPillContent('rappi');
                                if (rappiUrl) window.open(rappiUrl, '_blank');
                            }}
                        >
                            {t('info_rappi')}
                        </button>
                    )}

                    {/* PedidosYa */}
                    {isPillEnabled('pedidosYa') && (
                        <button
                            style={{ ...buttonBase, background: getPillColor('pedidosYa') }}
                            onClick={() => {
                                const pyUrl = getPillContent('pedidosYa');
                                if (pyUrl) window.open(pyUrl, '_blank');
                            }}
                        >
                            {t('info_pedidosya')}
                        </button>
                    )}

                    {/* Admin Access */}
                    {isPillEnabled('adminAccess') && (
                        <button
                            style={{ ...buttonBase, background: getPillColor('adminAccess') }}
                            onClick={() => navigate(`/${tenantSlug}/owner`)}
                        >
                            <span style={{ marginRight: '8px' }}>🔒</span>
                            {t('info_admin_access')}
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
