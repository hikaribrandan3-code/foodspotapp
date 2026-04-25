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
            paddingBottom: '70px',
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
                            onClick={() => navigate(`/${tenantSlug}/checkout`)}
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

                {/* 3. FOOTER */}
                <div style={{ marginTop: '20px', marginBottom: 'auto' }}>
                    <p style={{ color: '#000', fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>
                        {t('powered_by')}
                    </p>
                    <p style={{ color: config?.branding?.poweredByColor || '#C4856A', fontSize: '1.85rem', fontWeight: '800', letterSpacing: '-0.05em' }}>
                        FoodSpot OS
                    </p>
                </div>
            </div> {/* End Content Container */}
        </div>
    );
};

export default Info;
