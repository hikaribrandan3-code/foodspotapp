import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabaseClient';
import HeaderClamp from '../../components/HeaderClamp.jsx';
import BurgerLoader from '../../components/BurgerLoader';

const Info = ({ config }) => {
    const navigate = useNavigate();
    const { tenantSlug } = useParams();
    const { tenantData, loading } = useTenant();
    const { t } = useLanguage();
    const [authUser, setAuthUser] = useState(null);

    useEffect(() => {
        const checkOwner = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setAuthUser(user);
        };
        checkOwner();
    }, []);

    const isOwner = authUser && (authUser.id === tenantData?.user_id || authUser.id === tenantData?.owner_id);

    if (loading) return <BurgerLoader />;

    const primaryColor = tenantData?.confirmation_color || '#DB0007';
    const whatsapp = tenantData?.whatsapp_number || tenantData?.app_config?.businessInfo?.whatsapp || tenantData?.business_info?.whatsapp || tenantData?.whatsapp || '';
    const address = tenantData?.address_label || tenantData?.app_config?.businessInfo?.address || tenantData?.address || '';
    const rawMapsUrl = tenantData?.google_maps_url || tenantData?.app_config?.businessInfo?.googleMapsLink || '';
    const mapsUrl = typeof rawMapsUrl === 'string' && rawMapsUrl.trim().startsWith('http') ? rawMapsUrl.trim() : '';
    const businessHours = tenantData?.business_hours || tenantData?.app_config?.businessInfo?.hours || '';
    const logoUrl = tenantData?.logo_url || tenantData?.hero_url || tenantData?.branding?.logoURL;

    // Get info pills from config (set in Settings.jsx)
    const infoPills = config?.infoPills || tenantData?.info_pills || {};
    const pillIconMode = infoPills?.pill_icon_mode || 'white';

    // Default colors for pills if not set
    const defaultPillColors = {
        whatsapp: '#E55F51',
        adminAccess: '#22C55E'
    };

    // Get pill color from config or fallback to default
    const getPillColor = (pillId) => {
        return infoPills[pillId]?.bgColor || defaultPillColors[pillId] || '#666666';
    };

    // Check if pill is enabled (default to true for backward compatibility)
    const isPillEnabled = (pillId) => {
        // Admin access is always visible — hardwired regardless of config
        if (pillId === 'adminAccess') return true;
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
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
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
                    {/* VENUE INFO HERO CARD */}
                    {(whatsapp || address || mapsUrl || businessHours) && (
                        <div style={{
                            fontFamily: "'Outfit', sans-serif",
                            background: '#FFFFFF',
                            borderRadius: 20,
                            padding: '20px',
                            marginBottom: 16,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                            border: '1px solid rgba(0,0,0,0.04)',
                            textAlign: 'left'
                        }}>
                            {/* WhatsApp Row */}
                            {whatsapp && (
                                <a
                                    href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, textDecoration: 'none' }}
                                >
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>WhatsApp</p>
                                        <p style={{ fontSize: 15, color: '#0F0F0F', margin: 0, fontWeight: 700 }}>{whatsapp}</p>
                                    </div>
                                </a>
                            )}

                            {/* Address Row */}
                            {address && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Address</p>
                                        <p style={{ fontSize: 15, color: '#0F0F0F', margin: 0, fontWeight: 600, lineHeight: 1.35 }}>{address}</p>
                                    </div>
                                </div>
                            )}

                            {/* Business Hours Row */}
                            {businessHours && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hours</p>
                                        <p style={{ fontSize: 14, color: '#374151', margin: 0, fontWeight: 500, lineHeight: 1.4, whiteSpace: 'pre-line' }}>{businessHours}</p>
                                    </div>
                                </div>
                            )}

                            {/* Google Maps Row */}
                            {tenantData?.app_config?.externalOrdering?.mapsLink && (
                                <a
                                    href={tenantData.app_config.externalOrdering.mapsLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, textDecoration: 'none' }}
                                >
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Directions</p>
                                        <p style={{ fontSize: 15, color: '#0F0F0F', margin: 0, fontWeight: 600 }}>Open in Google Maps</p>
                                    </div>
                                </a>
                            )}

                            {/* Google Review Row */}
                            {tenantData?.app_config?.externalOrdering?.googleReviewUrl && (
                                <a
                                    href={tenantData.app_config.externalOrdering.googleReviewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, textDecoration: 'none' }}
                                >
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#FBBF24" stroke="#FBBF24" strokeWidth="1"><polygon points="12 2 15.09 10.26 23.77 11.25 17.77 17.25 19.09 25.95 12 21.77 4.91 25.95 6.23 17.25 0.23 11.25 8.91 10.26 12 2"/></svg>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reviews</p>
                                        <p style={{ fontSize: 15, color: '#0F0F0F', margin: 0, fontWeight: 600 }}>Leave a Review</p>
                                    </div>
                                </a>
                            )}

                        </div>
                    )}

                    {/* Hidden Owner Admin Pill */}
                    {/* Settings-configured Admin Access */}
                    {isPillEnabled('adminAccess') && (
                        <button
                            style={{ ...buttonBase, background: getPillColor('adminAccess') }}
                            onClick={() => navigate(`/${tenantSlug}/owner`)}
                        >
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
                    <p style={{ color: config?.colors?.powered || '#C4856A', fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>
                        {t('powered_by')}
                    </p>
                    <a href="https://www.instagram.com/foodspotmobile?igsh=MXgxcDlvcGFtbW93Yw==" target="_blank" rel="noopener noreferrer"
                        style={{ color: config?.colors?.powered || '#C4856A', fontSize: '1.85rem', fontWeight: '800', letterSpacing: '-0.05em', textDecoration: 'none', cursor: 'pointer' }}>
                        FoodSpot OS
                    </a>
                </div>
            </div> {/* End Content Container */}
        </div>
    );
};

export default Info;
