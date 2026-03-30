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
                    emailLabel: 'Correo Electrónico',
                    passwordLabel: 'Contraseña',
                    pinLabel: 'Station PIN',
                    privacy: 'Privacidad',
                    terms: 'Términos'
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
                    terms: 'Terms'
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
    // PREMIUM FOODSPOT OS UI
    // ============================
    return (
        <div style={{
            backgroundColor: '#f7f9fb',
            color: '#191c1e',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100dvh',
            fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
            overflowX: 'hidden'
        }}>
            {/* Hero Image Section */}
            <div style={{ position: 'relative', width: '100%', overflow: 'hidden', height: '30vh' }}>
                <img 
                    alt="Gourmet Burger" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA3kJf4SvwgmpJBEZosFOk5f5jv75s8LYW4Rm2cpJO4sz3Ezljvv7WK-WttaW5gvh_Qfh5X2JG0Kixv35rtEABkGWQgwMCCmi5lmDiAS1_j3lHfjMZKd_92yzqIc7ju5myq-yu4wYEc9yrevO_KFWKvmGOujfykQbVPjgOaNxJfa3US6HOntNFhyHJaTECgciT5m8jZy9EoYR1L6ADtwjIxJ5o51jrUnfW3MGErIYofJdqfdQpdftOd53yE3NqvrN9MlpWjs4FelV0"
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #f7f9fb, transparent, transparent)' }}></div>
            </div>

            {/* Main Content Container - Pull up into the gradient */}
            <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', padding: '0 24px', marginTop: '-48px', position: 'relative', zIndex: 10 }}>
                {/* Logo Branding */}
                <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 15h2a2 2 0 1 0 0-4h-2a2 2 0 1 1 0-4h2"></path>
                            <path d="M12 17v2"></path>
                            <path d="M12 5v2"></path>
                            <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                    </div>
                    <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#191c1e', letterSpacing: '-0.05em', margin: 0 }}>FoodSpot OS</h1>
                </header>

                {/* Role Toggle */}
                <div style={{ 
                    backgroundColor: '#e6e8ea', 
                    borderRadius: '9999px', 
                    padding: '4px', 
                    display: 'flex', 
                    marginBottom: '40px', 
                    width: '100%', 
                    maxWidth: '380px', 
                    margin: '0 auto 40px auto', 
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' 
                }}>
                    <button 
                        type="button"
                        onClick={() => { setLoginMode('owner'); setError(''); }}
                        style={{
                            flex: 1, padding: '12px 24px', borderRadius: '9999px', fontSize: '14px', fontWeight: 700, transition: 'all 0.3s ease',
                            backgroundColor: loginMode === 'owner' ? '#8b5000' : 'transparent',
                            color: loginMode === 'owner' ? '#ffffff' : '#554434',
                            boxShadow: loginMode === 'owner' ? '0 8px 16px rgba(139, 80, 0, 0.3)' : 'none',
                            border: 'none', cursor: 'pointer'
                        }}
                    >
                        {t('ownerLogin')}
                    </button>
                    <button 
                        type="button"
                        onClick={() => { setLoginMode('staff'); setError(''); }}
                        style={{
                            flex: 1, padding: '12px 24px', borderRadius: '9999px', fontSize: '14px', fontWeight: 700, transition: 'all 0.3s ease',
                            backgroundColor: loginMode === 'staff' ? '#8b5000' : 'transparent',
                            color: loginMode === 'staff' ? '#ffffff' : '#554434',
                            boxShadow: loginMode === 'staff' ? '0 8px 16px rgba(139, 80, 0, 0.3)' : 'none',
                            border: 'none', cursor: 'pointer'
                        }}
                    >
                        {t('staffLogin')}
                    </button>
                </div>

                {/* Form Section */}
                <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '380px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Username/Email Field */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#554434', marginBottom: '8px', marginLeft: '16px', opacity: 0.7 }}>
                            {loginMode === 'staff' ? t('emailPlaceholderStaff') : t('emailLabel')}
                        </label>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            backgroundColor: '#ffffff', 
                            border: '1px solid rgba(219, 194, 173, 0.5)', 
                            borderRadius: '18px', 
                            padding: '16px', 
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s' 
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#554434" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 12, opacity: 0.6}}>
                                {loginMode === 'staff' ? (
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                ) : (
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                )}
                                {loginMode === 'staff' ? <circle cx="12" cy="7" r="4"></circle> : <polyline points="22,6 12,13 2,6"></polyline>}
                            </svg>
                            <input 
                                type={loginMode === 'staff' ? 'text' : 'email'}
                                placeholder={loginMode === 'staff' ? 'chef_mario' : 'name@restaurant.com'}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                style={{ backgroundColor: 'transparent', border: 'none', outline: 'none', width: '100%', color: '#191c1e', fontWeight: 600, fontSize: '16px' }}
                            />
                        </div>
                    </div>

                    {/* Password/PIN Field */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#554434', marginBottom: '8px', marginLeft: '16px', opacity: 0.7 }}>
                            {loginMode === 'staff' ? t('pinLabel') : t('passwordLabel')}
                        </label>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            backgroundColor: '#ffffff', 
                            border: '1px solid rgba(219, 194, 173, 0.5)', 
                            borderRadius: '18px', 
                            padding: '16px', 
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            transition: 'all 0.2s' 
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#554434" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 12, opacity: 0.6}}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            <input 
                                type="password"
                                placeholder={loginMode === 'staff' ? '0000' : '••••••••'}
                                maxLength={loginMode === 'staff' ? 4 : undefined}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                style={{ backgroundColor: 'transparent', border: 'none', outline: 'none', width: '100%', color: '#191c1e', fontWeight: 600, fontSize: '16px', letterSpacing: loginMode === 'staff' ? '0.4em' : 'normal' }}
                            />
                        </div>
                    </div>

                    {error && (
                        <p style={{ color: '#ba1a1a', textAlign: 'center', fontSize: '14px', background: '#ffdad6', padding: '14px', borderRadius: '14px', border: '1px solid rgba(186,26,26,0.15)', margin: 0 }}>{error}</p>
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
                                borderRadius: '20px', 
                                padding: '20px', 
                                fontSize: '16px', 
                                fontWeight: 900, 
                                letterSpacing: '0.15em', 
                                boxShadow: loading ? 'none' : '0 12px 24px rgba(255, 152, 0, 0.35)', 
                                border: 'none', 
                                cursor: loading ? 'wait' : 'pointer', 
                                transition: 'all 0.2s ease', 
                                textTransform: 'uppercase',
                                transform: loading ? 'scale(0.98)' : 'none',
                                opacity: loading ? 0.8 : 1
                            }}
                        >
                            {loading ? t('loading') : t('submit')}
                        </button>
                    </div>

                    {/* Forgot Password */}
                    <div style={{ textAlign: 'center', paddingTop: '8px' }}>
                        <button 
                            type="button"
                            style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 700, color: 'rgba(25, 28, 30, 0.5)', cursor: 'pointer' }}
                        >
                            {t('forgot')}
                        </button>
                    </div>
                </form>
            </main>

            {/* Footer */}
            <footer style={{ marginTop: 'auto', paddingTop: '40px', paddingBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '12px', opacity: 0.8 }}>
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(25, 28, 30, 0.3)', margin: 0 }}>Powered by @foodspotapp</p>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <button 
                        onClick={(e) => { e.preventDefault(); navigate(`/${tenantSlug || ''}`) }}
                        style={{ background: 'none', border: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(25, 28, 30, 0.4)', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                        {t('privacy')}
                    </button>
                    <button 
                        style={{ background: 'none', border: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(25, 28, 30, 0.4)', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                        {t('terms')}
                    </button>
                </div>
            </footer>
        </div>
    )
}

export default OwnerLogin