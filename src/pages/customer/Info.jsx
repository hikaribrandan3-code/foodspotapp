import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';

const Info = () => {
    const navigate = useNavigate();
    const { tenantSlug } = useParams();
    const { tenantData } = useTenant();

    const businessName = tenantData?.venue_name || tenantData?.name || "FOODSPOT";
    const primaryColor = tenantData?.primary_color || '#DB0007';
    const whatsapp = tenantData?.business_info?.whatsapp || tenantData?.whatsapp;

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
        <div className="page" style={{ padding: '20px', background: 'white', minHeight: '100vh', textAlign: 'center' }}>
            {/* 1. BRAND LOGO AREA */}
            <div style={{ margin: '20px 0 40px' }}>
                <h1 style={{ fontFamily: 'var(--font-family-brand)', color: primaryColor, fontSize: '2.5rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                    {businessName}
                </h1>
            </div>

            {/* 2. COLORFUL BUTTON STACK (Restored from IMG_8708) */}
            {whatsapp && (
                <a
                    href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...buttonBase, background: '#E55F51' }}
                >
                    Escribinos por WhatsApp
                </a>
            )}

            <button
                style={{ ...buttonBase, background: '#F4D03F' }}
                onClick={() => navigate(`/${tenantSlug}/checkout`)}
            >
                Pagar con Mercado Pago
            </button>

            <button style={{ ...buttonBase, background: '#E67E22' }}>
                Pedir por Rappi
            </button>

            <button style={{ ...buttonBase, background: '#58D68D' }}>
                Pedir por PedidosYa
            </button>

            {/* THE UNIFIED GATEWAY BUTTON */}
            <button
                style={{ ...buttonBase, background: '#448AFF' }}
                onClick={() => navigate(`/${tenantSlug}/login`)}
            >
                <span style={{ marginRight: '8px' }}>🔒</span>
                Acceso administrador
            </button>

            {/* 3. FOOTER */}
            <div style={{ marginTop: '60px' }}>
                <p style={{ color: '#000', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px' }}>
                    Powered by
                </p>
                <p style={{ color: '#C4856A', fontSize: '2.2rem', fontWeight: '800' }}>
                    @foodspotapp
                </p>
            </div>
        </div>
    );
};

export default Info;
