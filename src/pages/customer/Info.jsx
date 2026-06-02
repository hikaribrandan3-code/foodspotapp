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
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="#000000">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                            </a>
                        )}
                        {tenantData?.app_config?.externalOrdering?.tiktokUrl && (
                            <a href={tenantData.app_config.externalOrdering.tiktokUrl} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="#000000">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/>
                                </svg>
                            </a>
                        )}
                    </div>
                )}

                {/* 4. FOOTER */}
                <div style={{ marginTop: '28px', marginBottom: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p style={{ color: config?.colors?.powered || '#C4856A', fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>
                        {t('powered_by')}
                    </p>
                    <a href="https://www.instagram.com/foodspotmobile?igsh=MXgxcDlvcGFtbW93Yw==" target="_blank" rel="noopener noreferrer"
                        style={{ color: config?.colors?.powered || '#C4856A', fontSize: '1.21rem', fontWeight: '800', letterSpacing: '-0.05em', textDecoration: 'none', cursor: 'pointer', marginBottom: '16px' }}>
                        FoodSpot OS
                    </a>
                    {logoUrl && (
                        <img
                            src={logoUrl}
                            alt="Logo"
                            style={{ width: '120px', height: 'auto', marginBottom: '12px', maxHeight: '120px' }}
                        />
                    )}
                    {isPillEnabled('adminAccess') && (
                        <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}
                            onClick={() => navigate(`/${tenantSlug}/owner`)}
                            title={t('info_admin_access')}
                        >
                            <svg width="16" height="16" viewBox="0 0 512 512" fill={getPillColor('adminAccess')} xmlns="http://www.w3.org/2000/svg">
                                <path d="M392.328,211.614v-89.699C392.328,54.365,337.514,0,269.963,0h-26.407c-67.551,0-122.651,54.365-122.651,121.915v89.699 c-27.142,0.072-48.116,21.344-48.116,47.484v204.208c0,26.182,22.206,48.694,48.39,48.694h271.16 c26.184,0,46.87-22.512,46.87-48.695V259.097C439.21,232.958,418.236,211.685,392.328,211.614z M145.581,121.915 c0-53.944,44.031-97.241,97.976-97.241h26.407c53.945,0,97.69,43.297,97.69,97.241v90.287h-24.675v-90.287 c0-40.339-32.675-72.566-73.015-72.566h-26.407c-40.339,0-73.301,32.226-73.301,72.566v90.287h-24.675V121.915z M318.304,121.915 v90.287H194.93v-90.287c0-26.734,21.893-47.891,48.626-47.891h26.407C296.697,74.024,318.304,95.181,318.304,121.915z M414.535,463.305c0,12.926-10.213,24.021-22.812,24.021H120.277c-12.599,0-22.812-11.095-22.812-24.021v-203.64 c0-12.926,10.213-22.787,22.812-22.787h271.446c12.599,0,22.812,9.861,22.812,22.787V463.305z"/>
                                <path d="M256.878,268.876c-31.649,0-57.705,25.828-57.705,57.575c0,17.112,8.095,33.147,20.432,44.095v70.514 c0,6.813,6.14,12.954,12.954,12.954h49.349c6.814,0,11.721-6.142,11.721-12.954v-70.535 c13.571-10.832,20.634-26.852,20.634-44.075C314.263,294.703,288.691,268.876,256.878,268.876z M274.845,354.034 c-3.483,2.28-5.891,6.161-5.891,10.324v64.982H244.28v-64.982c0-4.163-1.791-8.045-5.274-10.324 c-9.491-6.209-15.003-16.522-15.003-27.583c0-18.141,14.755-32.9,32.799-32.9c18.206,0,32.902,14.759,32.902,32.9 C289.704,337.682,284.077,347.993,274.845,354.034z"/>
                            </svg>
                        </button>
                    )}
                </div>
            </div> {/* End Content Container */}
        </div>
    );
};

export default Info;
