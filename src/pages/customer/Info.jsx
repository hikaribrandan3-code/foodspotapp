import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';

// Inline SVGs for zero-dependency footprint
const LockIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
);

const WhatsAppIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

const Info = () => {
    const navigate = useNavigate();
    const { tenantSlug } = useParams();
    const { tenantData } = useTenant(); // 🛡️ SILO HARDENING

    const primaryColor = tenantData?.primary_color || 'var(--color-primary)';
    const whatsapp = tenantData?.business_info?.whatsapp || tenantData?.whatsapp;

    return (
        <div className="page" style={{ paddingBottom: 'calc(var(--nav-height) + 2rem)', background: '#F8FAFC', minHeight: '100vh' }}>
            <div style={{ padding: '2rem 1.5rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1E293B', marginBottom: '1.5rem' }}>
                    Información
                </h1>

                {/* WhatsApp Priority Action */}
                {whatsapp && (
                    <a
                        href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            width: '100%',
                            padding: '16px',
                            background: primaryColor,
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            textDecoration: 'none',
                            marginBottom: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            boxSizing: 'border-box'
                        }}
                    >
                        <WhatsAppIcon />
                        Escribinos por WhatsApp
                    </a>
                )}

                {/* Unified Gateway Button: Routes to the single OwnerLogin component which handles both Staff (PIN) and Owner (Pass) */}
                <button
                    onClick={() => navigate(`/${tenantSlug}/login`)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '16px',
                        background: 'white',
                        color: '#475569',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        marginBottom: '2rem',
                        boxSizing: 'border-box'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <LockIcon />
                    Acceso al Sistema (Staff / Owner)
                </button>

                {/* Footer Attribution */}
                <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                    <p style={{ fontSize: '0.875rem', color: '#94A3B8', fontWeight: '500' }}>
                        Powered by{' '}
                        <a
                            href="https://instagram.com/foodspotapp"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: primaryColor, textDecoration: 'none', fontWeight: '700' }}
                        >
                            @foodspotapp
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Info;
