import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useTenant } from '../../contexts/TenantContext'

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

function OwnerLogin() {
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const { tenantData } = useTenant()
    
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [loginMode, setLoginMode] = useState('owner')

    const t = useMemo(() => {
        const lang = tenantData?.language || 'es';
        return (key) => {
            const translations = {
                es: {
                    title: 'FoodSpot OS',
                    emailPlaceholderStaff: 'Usuario de Staff',
                    submit: 'ENTRAR',
                    staffLogin: 'Staff',
                    ownerLogin: 'Owner',
                    incorrect: 'Credenciales incorrectas',
                    loading: 'Verificando...',
                    forgot: '¿Olvidaste tu contraseña?',
                    emailLabel: 'Email Address',
                    passwordLabel: 'Password',
                    pinLabel: 'Station PIN',
                    privacy: 'Privacidad',
                    terms: 'Términos',
                    staffUsername: 'Staff Username'
                },
                en: {
                    title: 'FoodSpot OS',
                    emailPlaceholderStaff: 'Staff Username',
                    submit: 'LOGIN',
                    staffLogin: 'Staff',
                    ownerLogin: 'Owner',
                    incorrect: 'Incorrect credentials',
                    loading: 'Verifying...',
                    forgot: 'Forgot Password?',
                    emailLabel: 'Email Address',
                    passwordLabel: 'Password',
                    pinLabel: 'Station PIN',
                    privacy: 'Privacy',
                    terms: 'Terms',
                    staffUsername: 'Staff Username'
                }
            };
            return translations[lang]?.[key] || translations['es'][key] || key;
        };
    }, [tenantData?.language]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const metadata = session.user.user_metadata || {}
                const role = metadata.role || 'owner'
                const slug = metadata.slug || tenantSlug || 'default'

                if (role === 'superadmin') {
                    window.location.replace('/admin')
                } else if (role === 'owner') {
                    window.location.replace(`/${slug}/owner/summary`)
                } else {
                    window.location.replace(`/${slug}/staff/dashboard`)
                }
            }
        })

        return () => subscription?.unsubscribe()
    }, [tenantSlug])

    const handleStaffLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError(t('incorrect'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const businessId = tenantData?.id;
            if (!businessId) {
                throw new Error('Business ID not found');
            }

            const passwordHash = simpleHash(password);

            const { data: staff, error: staffError } = await supabase
                .from('staff')
                .select('*')
                .eq('business_id', businessId)
                .eq('email', email.toLowerCase().trim())
                .eq('pin', passwordHash)
                .eq('status', 'active')
                .single();

            if (staffError || !staff) {
                setError(t('incorrect'));
                setLoading(false);
                return;
            }

            const { data: shiftData, error: shiftError } = await supabase.rpc('clock_in', {
                p_business_id: businessId,
                p_staff_id: staff.id,
                p_lat: 0,
                p_lon: 0
            });

            if (shiftError) {
                console.warn('[StaffLogin] Clock in failed, continuing:', shiftError);
            }

            const staffData = {
                id: staff.id,
                business_id: staff.business_id,
                name: staff.name,
                role: staff.role,
                email: staff.email
            };

            localStorage.setItem('fs_staff_member', JSON.stringify(staffData));
            localStorage.setItem('fs_business_id', staff.business_id);
            localStorage.setItem('x-staff-id', staff.id);

            if (shiftData) {
                const shift = {
                    id: shiftData,
                    staff_id: staff.id,
                    business_id: staff.business_id,
                    status: 'active'
                };
                localStorage.setItem('fs_current_shift', JSON.stringify(shift));
            }

            window.location.replace(`/${tenantSlug}/staff/dashboard`);
        } catch (err) {
            console.error('Staff login error:', err);
            setError(err.message || t('incorrect'));
            setTimeout(() => setError(''), 5000);
            setLoading(false);
        }
    };

    const handleOwnerSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (authError) throw authError

            const metadata = data.user?.user_metadata || {}
            const role = metadata.role || 'owner'
            const slug = metadata.slug || tenantSlug || 'default'

            if (role === 'superadmin') {
                window.location.href = '/admin'
            } else if (role === 'owner') {
                window.location.href = `/${slug}/owner/summary`
            } else {
                window.location.href = `/${slug}/staff/dashboard`
            }
        } catch (err) {
            console.error('Login error:', err)
            setError(err.message || t('incorrect'))
            setTimeout(() => setError(''), 5000)
            setLoading(false)
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (loginMode === 'staff') {
            handleStaffLogin();
        } else {
            handleOwnerSubmit(e);
        }
    };

    // ============================
    // PREMIUM FOODSPOT OS LOGIN UI
    // ============================
    return (
        <div style={{
            backgroundColor: '#ffffff',
            color: '#191c1e',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100dvh',
            fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
            overflowX: 'hidden'
        }}>
            {/* Main Content Container */}
            <main style={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                padding: '0 24px', 
                paddingTop: '48px',
                position: 'relative', 
                zIndex: 10 
            }}>
                {/* Brand Card Header */}
                <header style={{ 
                    width: '100%', 
                    maxWidth: '400px', 
                    margin: '0 auto 40px auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        padding: '16px',
                        borderRadius: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        marginBottom: '16px'
                    }}>
                        {/* Restaurant Icon */}
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
                            <path d="M7 2v20"/>
                            <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
                        </svg>
                    </div>
                    <h1 style={{
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        fontSize: '30px',
                        fontWeight: 900,
                        color: '#191c1e',
                        letterSpacing: '-0.05em',
                        margin: 0
                    }}>FoodSpot OS</h1>
                </header>

                {/* Role Toggle */}
                <div style={{ 
                    backgroundColor: '#e6e8ea', 
                    borderRadius: '9999px', 
                    padding: '4px', 
                    display: 'flex', 
                    marginBottom: '40px', 
                    width: '100%', 
                    maxWidth: '400px', 
                    margin: '0 auto 40px auto', 
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                }}>
                    <button 
                        type="button"
                        onClick={() => { setLoginMode('owner'); setError(''); setEmail(''); setPassword(''); }}
                        style={{
                            flex: 1, 
                            padding: '12px 24px', 
                            borderRadius: '9999px', 
                            fontSize: '14px', 
                            fontWeight: 700, 
                            transition: 'all 0.3s ease',
                            backgroundColor: loginMode === 'owner' ? '#8b5000' : 'transparent',
                            color: loginMode === 'owner' ? '#ffffff' : '#554434',
                            boxShadow: loginMode === 'owner' ? '0 4px 12px rgba(139, 80, 0, 0.3)' : 'none',
                            border: 'none', 
                            cursor: 'pointer'
                        }}
                    >
                        {t('ownerLogin')}
                    </button>
                    <button 
                        type="button"
                        onClick={() => { setLoginMode('staff'); setError(''); setEmail(''); setPassword(''); }}
                        style={{
                            flex: 1, 
                            padding: '12px 24px', 
                            borderRadius: '9999px', 
                            fontSize: '14px', 
                            fontWeight: 700, 
                            transition: 'all 0.3s ease',
                            backgroundColor: loginMode === 'staff' ? '#8b5000' : 'transparent',
                            color: loginMode === 'staff' ? '#ffffff' : '#554434',
                            boxShadow: loginMode === 'staff' ? '0 4px 12px rgba(139, 80, 0, 0.3)' : 'none',
                            border: 'none', 
                            cursor: 'pointer'
                        }}
                    >
                        {t('staffLogin')}
                    </button>
                </div>

                {/* Form Section */}
                <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Owner Fields - Email/Password */}
                    {loginMode === 'owner' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Email Field */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: '#554434',
                                    marginBottom: '8px',
                                    marginLeft: '16px'
                                }}>{t('emailLabel')}</label>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: '#f2f4f6',
                                    border: '1px solid rgba(219, 194, 173, 0.2)',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    transition: 'all 0.2s ease'
                                }}>
                                    {/* Mail Icon */}
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#554434" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px', opacity: 0.6 }}>
                                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                                    </svg>
                                    <input
                                        type="email"
                                        placeholder="name@restaurant.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            width: '100%',
                                            color: '#191c1e',
                                            fontWeight: 500,
                                            fontSize: '16px'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: '#554434',
                                    marginBottom: '8px',
                                    marginLeft: '16px'
                                }}>{t('passwordLabel')}</label>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: '#f2f4f6',
                                    border: '1px solid rgba(219, 194, 173, 0.2)',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    transition: 'all 0.2s ease'
                                }}>
                                    {/* Lock Icon */}
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#554434" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px', opacity: 0.6 }}>
                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            width: '100%',
                                            color: '#191c1e',
                                            fontWeight: 500,
                                            fontSize: '16px'
                                        }}
                                    />
                                    {/* Visibility Icon */}
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#554434" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px', opacity: 0.4, cursor: 'pointer' }}>
                                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Staff Fields - Username/PIN */}
                    {loginMode === 'staff' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Staff Username Field */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: '#554434',
                                    marginBottom: '8px',
                                    marginLeft: '16px'
                                }}>{t('staffUsername')}</label>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: '#f2f4f6',
                                    border: '1px solid rgba(219, 194, 173, 0.2)',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    transition: 'all 0.2s ease'
                                }}>
                                    {/* Person Icon */}
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#554434" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px', opacity: 0.6 }}>
                                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="chef_mario"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            width: '100%',
                                            color: '#191c1e',
                                            fontWeight: 500,
                                            fontSize: '16px'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Station PIN Field */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: '#554434',
                                    marginBottom: '8px',
                                    marginLeft: '16px'
                                }}>{t('pinLabel')}</label>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: '#f2f4f6',
                                    border: '1px solid rgba(219, 194, 173, 0.2)',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    transition: 'all 0.2s ease'
                                }}>
                                    {/* Dialpad Icon */}
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#554434" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px', opacity: 0.6 }}>
                                        <circle cx="12" cy="12" r="1"/>
                                        <circle cx="19" cy="12" r="1"/>
                                        <circle cx="5" cy="12" r="1"/>
                                        <circle cx="12" cy="5" r="1"/>
                                        <circle cx="19" cy="5" r="1"/>
                                        <circle cx="5" cy="5" r="1"/>
                                        <circle cx="12" cy="19" r="1"/>
                                        <circle cx="19" cy="19" r="1"/>
                                        <circle cx="5" cy="19" r="1"/>
                                    </svg>
                                    <input
                                        type="password"
                                        placeholder="0000"
                                        maxLength={4}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            width: '100%',
                                            color: '#191c1e',
                                            fontWeight: 500,
                                            fontSize: '16px',
                                            letterSpacing: '0.3em'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <p style={{ 
                            color: '#ba1a1a', 
                            textAlign: 'center', 
                            fontSize: '14px', 
                            background: '#ffdad6', 
                            padding: '14px', 
                            borderRadius: '14px', 
                            border: '1px solid rgba(186,26,26,0.15)', 
                            margin: 0 
                        }}>{error}</p>
                    )}

                    {/* Primary CTA */}
                    <div style={{ paddingTop: '16px' }}>
                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{ 
                                width: '100%', 
                                backgroundColor: '#ff9800', 
                                color: '#ffffff', 
                                borderRadius: '16px', 
                                padding: '20px', 
                                fontSize: '16px', 
                                fontWeight: 900, 
                                letterSpacing: '0.15em', 
                                boxShadow: loading ? 'none' : '0 8px 24px rgba(255, 152, 0, 0.35)', 
                                border: 'none', 
                                cursor: loading ? 'wait' : 'pointer', 
                                transition: 'all 0.2s ease', 
                                textTransform: 'uppercase',
                                transform: loading ? 'scale(0.98)' : 'none'
                            }}
                        >
                            {loading ? t('loading') : t('submit')}
                        </button>
                    </div>

                    {/* Forgot Password */}
                    <div style={{ textAlign: 'center', paddingTop: '8px' }}>
                        <button 
                            type="button"
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                fontSize: '12px', 
                                fontWeight: 700, 
                                color: 'rgba(25, 28, 30, 0.5)', 
                                cursor: 'pointer' 
                            }}
                        >
                            {t('forgot')}
                        </button>
                    </div>
                </form>
            </main>

            {/* Footer */}
            <footer style={{ 
                marginTop: 'auto', 
                paddingTop: '40px', 
                paddingBottom: '32px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '100%', 
                gap: '8px', 
                opacity: 0.8 
            }}>
                <p style={{ 
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    fontSize: '10px', 
                    fontWeight: 500, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    color: 'rgba(25, 28, 30, 0.4)', 
                    margin: 0 
                }}>Powered by FoodSpot OS</p>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button 
                        onClick={(e) => { e.preventDefault(); navigate(`/${tenantSlug || ''}`) }}
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            fontSize: '10px', 
                            fontWeight: 500, 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.05em', 
                            color: 'rgba(25, 28, 30, 0.4)', 
                            textDecoration: 'underline', 
                            cursor: 'pointer' 
                        }}
                    >
                        {t('privacy')}
                    </button>
                    <button 
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            fontSize: '10px', 
                            fontWeight: 500, 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.05em', 
                            color: 'rgba(25, 28, 30, 0.4)', 
                            textDecoration: 'underline', 
                            cursor: 'pointer' 
                        }}
                    >
                        {t('terms')}
                    </button>
                </div>
            </footer>
        </div>
    )
}

export default OwnerLogin
