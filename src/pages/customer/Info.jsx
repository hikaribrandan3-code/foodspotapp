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
                            {/* WhatsApp Row - Icon only, no number display */}
                            {/* Removed - too prominent, users can find it elsewhere */}

                            {/* Address Row */}
                            {address && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                    <div>
                                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Address</p>
                                        <p style={{ fontSize: 15, color: '#0F0F0F', margin: 0, fontWeight: 600, lineHeight: 1.35 }}>{address}</p>
                                    </div>
                                </div>
                            )}

                            {/* Business Hours Row */}
                            {businessHours && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
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
                                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12, textDecoration: 'none' }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
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
                                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12, textDecoration: 'none' }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#000000" stroke="none" style={{ flexShrink: 0, marginTop: 2 }}><polygon points="12 2 15.09 10.26 23.77 11.25 17.77 17.25 19.09 25.95 12 21.77 4.91 25.95 6.23 17.25 0.23 11.25 8.91 10.26 12 2"/></svg>
                                    <div>
                                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reviews</p>
                                        <p style={{ fontSize: 15, color: '#0F0F0F', margin: 0, fontWeight: 600 }}>Leave a Review</p>
                                    </div>
                                </a>
                            )}

                        </div>
                    )}
                </div>

                {/* 3. SOCIAL ICONS */}
                {(tenantData?.app_config?.externalOrdering?.instagramUrl || tenantData?.app_config?.externalOrdering?.tiktokUrl) && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '24px', marginBottom: '8px' }}>
                        {tenantData?.app_config?.externalOrdering?.instagramUrl && (
                            <a href={tenantData.app_config.externalOrdering.instagramUrl} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                                <svg width="33" height="33" viewBox="0 0 24 24" fill="#000000">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                            </a>
                        )}
                        {tenantData?.app_config?.externalOrdering?.tiktokUrl && (
                            <a href={tenantData.app_config.externalOrdering.tiktokUrl} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                                <svg width="33" height="33" viewBox="0 0 24 24" fill="#000000">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/>
                                </svg>
                            </a>
                        )}
                    </div>
                )}

                {/* 4. FOOTER */}
                <div style={{ marginTop: '28px', marginBottom: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p style={{ color: config?.colors?.powered || '#C4856A', fontSize: '1.14rem', fontWeight: 'bold', marginBottom: '8px' }}>
                        {t('powered_by')}
                    </p>
                    <a href="https://www.instagram.com/foodspotmobile?igsh=MXgxcDlvcGFtbW93Yw==" target="_blank" rel="noopener noreferrer"
                        style={{ color: config?.colors?.powered || '#C4856A', fontSize: '1.21rem', fontWeight: '800', letterSpacing: '-0.05em', textDecoration: 'none', cursor: 'pointer', marginBottom: '16px' }}>
                        FoodSpot OS
                    </a>
                    {isPillEnabled('adminAccess') && (
                        <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}
                            onClick={() => navigate(`/${tenantSlug}/owner`)}
                            title={t('info_admin_access')}
                        >
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="#000000" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M5.25 10.0546V8C5.25 4.27208 8.27208 1.25 12 1.25C15.7279 1.25 18.75 4.27208 18.75 8V10.0546C19.8648 10.1379 20.5907 10.348 21.1213 10.8787C22 11.7574 22 13.1716 22 16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H8C5.17157 22 3.75736 22 2.87868 21.1213C2 20.2426 2 18.8284 2 16C2 13.1716 2 11.7574 2.87868 10.8787C3.40931 10.348 4.13525 10.1379 5.25 10.0546ZM6.75 8C6.75 5.10051 9.10051 2.75 12 2.75C14.8995 2.75 17.25 5.10051 17.25 8V10.0036C16.867 10 16.4515 10 16 10H8C7.54849 10 7.13301 10 6.75 10.0036V8ZM12 13.25C12.4142 13.25 12.75 13.5858 12.75 14V18C12.75 18.4142 12.4142 18.75 12 18.75C11.5858 18.75 11.25 18.4142 11.25 18V14C11.25 13.5858 11.5858 13.25 12 13.25Z"/>
                            </svg>
                        </button>
                    )}
                </div>
            </div> {/* End Content Container */}
        </div>
    );
};

export default Info;
