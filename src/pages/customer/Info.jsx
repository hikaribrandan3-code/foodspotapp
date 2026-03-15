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

    return (
        <div className="page" style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '0 12px',
            paddingBottom: '120px',
            background: 'white',
            minHeight: '100vh',
            textAlign: 'center',
            boxSizing: 'border-box'
        }}>
            {/* 1. SYSTEM HERO COVER - Unified with Home.jsx */}
            <HeaderClamp config={config} />

            {/* Content Container - Flex row that pushes footer down */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '20px 8px 0'
            }}>
                {/* 2. COLORFUL BUTTON STACK (Restored from IMG_8708) */}
                <div>
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
                </div>

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
