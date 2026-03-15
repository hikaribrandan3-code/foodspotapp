import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useLanguage } from '../../contexts/LanguageContext';

const Info = () => {
    const navigate = useNavigate();
    const { tenantSlug } = useParams();
    const { tenantData } = useTenant();
    const { t } = useLanguage();

    const businessName = tenantData?.venue_name || tenantData?.name || "FOODSPOT";
    const primaryColor = tenantData?.primary_color || '#DB0007';
    const whatsapp = tenantData?.business_info?.whatsapp || tenantData?.whatsapp;
    const logoUrl = tenantData?.logo_url || tenantData?.hero_url || tenantData?.branding?.logoURL;

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
        color: 'white',
        border: 'none',
        marginBottom: '12px',
        cursor: 'pointer',
        textDecoration: 'none',
        boxSizing: 'border-box'
    };

    // Get hero image from tenant data (same logic as Home)
    const heroUrl = tenantData?.hero_url || tenantData?.branding?.hero_url || tenantData?.branding?.header_image;

    return (
        <div className="page" style={{ padding: 0, background: 'white', minHeight: '100vh', textAlign: 'center' }}>
            {/* 1. HERO COVER - Matches Home.jsx dimensions */}
            <div style={{
                width: '100%',
                height: '220px', // Mobile default (matches AppHeader COVER_HEIGHTS.mobile)
                background: heroUrl ? `url(${heroUrl}) center/cover no-repeat` : primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
            }}>
                {logoUrl && (
                    <img
                        src={logoUrl}
                        alt={businessName}
                        style={{
                            height: 80,
                            maxWidth: '80%',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))'
                        }}
                    />
                )}
            </div>

            {/* Content Container */}
            <div style={{ padding: '20px' }}>

                {/* 2. COLORFUL BUTTON STACK (Restored from IMG_8708) */}
                {whatsapp && (
                    <a
                        href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ ...buttonBase, background: '#E55F51' }}
                    >
                        {t('info_whatsapp')}
                    </a>
                )}

                <button
                    style={{ ...buttonBase, background: '#F4D03F' }}
                    onClick={() => navigate(`/${tenantSlug}/checkout`)}
                >
                    {t('info_mercado_pago')}
                </button>

                <button style={{ ...buttonBase, background: '#E67E22' }}>
                    {t('info_rappi')}
                </button>

                <button style={{ ...buttonBase, background: '#58D68D' }}>
                    {t('info_pedidosya')}
                </button>

                {/* THE UNIFIED GATEWAY BUTTON */}
                <button
                    style={{ ...buttonBase, background: '#448AFF' }}
                    onClick={() => navigate(`/${tenantSlug}/owner`)}
                >
                    <span style={{ marginRight: '8px' }}>🔒</span>
                    {t('info_admin_access')}
                </button>

                {/* 3. FOOTER */}
                <div style={{ marginTop: '60px' }}>
                    <p style={{ color: '#000', fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>
                        {t('powered_by')}
                    </p>
                    <p style={{ color: '#C4856A', fontSize: '1.85rem', fontWeight: '800' }}>
                        @foodspotapp
                    </p>
                </div>
            </div> {/* End Content Container */}
        </div>
    );
};

export default Info;
