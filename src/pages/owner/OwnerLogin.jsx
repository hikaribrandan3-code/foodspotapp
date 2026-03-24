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
                    title: 'Acceso Admin',
                    emailPlaceholderStaff: 'Usuario',
                    submit: 'Ingresar',
                    staffLogin: 'Staff',
                    ownerLogin: 'Owner',
                    incorrect: 'Credenciales incorrectas',
                    loading: 'Verificando...',
                    forgot: '¿Olvidaste tu contraseña?',
                },
                en: {
                    title: 'Admin Access',
                    emailPlaceholderStaff: 'Username',
                    submit: 'Login',
                    staffLogin: 'Staff',
                    ownerLogin: 'Owner',
                    incorrect: 'Incorrect credentials',
                    loading: 'Verifying...',
                    forgot: 'Forgot Password?',
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
    // PREMIUM LIGHT LOGIN UI
    // ============================
    return (
        <div style={{
            background: 'radial-gradient(circle at top left, #e0eaff 0%, #f7f9fb 100%)',
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Montserrat", sans-serif',
            color: '#191c1e',
            padding: 24,
            position: 'relative'
        }}>
            {/* TopAppBar */}
            <header style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '16px 24px',
                background: 'transparent'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Placeholder for left action */}
                </div>
                <h1 style={{
                    fontFamily: '"Montserrat", sans-serif',
                    fontWeight: 700,
                    fontSize: 24,
                    letterSpacing: '-0.025em',
                    color: '#0058bc',
                    margin: 0
                }}>FoodSpot Admin</h1>
                <div style={{ width: 40 }} />
            </header>

            <main style={{ width: '100%', maxWidth: 448, marginTop: 64, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Logo Branding */}
                <div style={{ marginBottom: 40, textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 48, color: '#0058bc' }}>🍽️</span>
                    </div>
                    <div style={{
                        fontSize: 30,
                        fontWeight: 700,
                        letterSpacing: '-0.05em',
                        color: '#191c1e'
                    }}>
                        FoodSpot<span style={{ color: '#0058bc' }}>.</span>
                    </div>
                </div>

                {/* Auth Card */}
                <div style={{
                    width: '100%',
                    background: '#ffffff',
                    padding: 32,
                    borderRadius: 12,
                    boxShadow: '0 40px 80px -20px rgba(0, 88, 188, 0.08), 0 0 40px rgba(0, 88, 188, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)'
                }}>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: '#191c1e', marginBottom: 32, textAlign: 'center', margin: '0 0 32px 0' }}>{t('title')}</h2>

                    {/* Auth Toggle (Segmented Control) */}
                    <div style={{
                        display: 'flex',
                        padding: 6,
                        background: '#eceef0',
                        borderRadius: 12,
                        marginBottom: 32
                    }}>
                        <button
                            type="button"
                            onClick={() => { setLoginMode('owner'); setError(''); }}
                            style={{
                                flex: 1,
                                padding: '10px 0',
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 700,
                                background: loginMode === 'owner' ? '#0058bc' : 'transparent',
                                color: loginMode === 'owner' ? '#ffffff' : '#414755',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: loginMode === 'owner' ? '0 10px 15px -3px rgba(0, 88, 188, 0.2)' : 'none'
                            }}
                        >
                            {t('ownerLogin')}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setLoginMode('staff'); setError(''); }}
                            style={{
                                flex: 1,
                                padding: '10px 0',
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 700,
                                background: loginMode === 'staff' ? '#0058bc' : 'transparent',
                                color: loginMode === 'staff' ? '#ffffff' : '#414755',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: loginMode === 'staff' ? '0 10px 15px -3px rgba(0, 88, 188, 0.2)' : 'none'
                            }}
                        >
                            {t('staffLogin')}
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Email Field */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: 12,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: '#414755',
                                marginLeft: 4,
                                marginBottom: 8
                            }}>{loginMode === 'staff' ? t('emailPlaceholderStaff') : 'Email Address'}</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span style={{ position: 'absolute', left: 16, color: '#414755', fontSize: 20 }}>✉️</span>
                                <input
                                    type={loginMode === 'staff' ? 'text' : 'email'}
                                    placeholder={loginMode === 'owner' ? 'owner@foodspot.com' : t('emailPlaceholderStaff')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoFocus
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '16px 16px 16px 48px',
                                        background: '#f2f4f6',
                                        border: '1px solid rgba(193, 198, 215, 0.15)',
                                        borderRadius: 8,
                                        fontSize: 16,
                                        color: '#191c1e',
                                        outline: 'none',
                                        transition: 'all 0.3s ease',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.background = '#ffffff'
                                        e.target.style.borderColor = '#0058bc'
                                        e.target.style.boxShadow = '0 0 0 4px rgba(0, 88, 188, 0.1)'
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = '#f2f4f6'
                                        e.target.style.borderColor = 'rgba(193, 198, 215, 0.15)'
                                        e.target.style.boxShadow = 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: '#414755',
                                    marginLeft: 4,
                                    margin: 0
                                }}>{loginMode === 'staff' ? 'PIN' : 'Password'}</label>
                                {loginMode === 'owner' && (
                                    <a href="#" style={{ fontSize: 12, fontWeight: 700, color: '#0058bc', textDecoration: 'none' }}>{t('forgot')}</a>
                                )}
                            </div>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span style={{ position: 'absolute', left: 16, color: '#414755', fontSize: 20 }}>🔒</span>
                                <input
                                    type="password"
                                    placeholder={loginMode === 'staff' ? '••••' : '••••••••'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    maxLength={loginMode === 'staff' ? 4 : undefined}
                                    style={{
                                        width: '100%',
                                        padding: '16px 16px 16px 48px',
                                        background: '#f2f4f6',
                                        border: '1px solid rgba(193, 198, 215, 0.15)',
                                        borderRadius: 8,
                                        fontSize: 16,
                                        color: '#191c1e',
                                        outline: 'none',
                                        transition: 'all 0.3s ease',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.background = '#ffffff'
                                        e.target.style.borderColor = '#0058bc'
                                        e.target.style.boxShadow = '0 0 0 4px rgba(0, 88, 188, 0.1)'
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.background = '#f2f4f6'
                                        e.target.style.borderColor = 'rgba(193, 198, 215, 0.15)'
                                        e.target.style.boxShadow = 'none'
                                    }}
                                />
                            </div>
                            
                            {/* Error Message */}
                            {error && (
                                <p style={{
                                    color: '#ba1a1a',
                                    textAlign: 'center',
                                    fontSize: 13,
                                    marginTop: 12,
                                    background: 'rgba(186, 26, 26, 0.1)',
                                    padding: '10px 16px',
                                    borderRadius: 12,
                                    border: '1px solid rgba(186, 26, 26, 0.2)'
                                }}>{error}</p>
                            )}

                            {/* Access Strength Meter */}
                            <div style={{ paddingTop: 8, paddingLeft: 4, paddingRight: 4, marginTop: 8 }}>
                                <div style={{ display: 'flex', gap: 6, height: 4, width: '100%' }}>
                                    <div style={{ flex: 1, backgroundColor: '#0058bc', borderRadius: 9999 }} />
                                    <div style={{ flex: 1, backgroundColor: '#0058bc', borderRadius: 9999 }} />
                                    <div style={{ flex: 1, backgroundColor: password.length > 4 ? '#0058bc' : '#e0e3e5', borderRadius: 9999 }} />
                                    <div style={{ flex: 1, backgroundColor: password.length > 6 ? '#0058bc' : '#e0e3e5', borderRadius: 9999 }} />
                                    <div style={{ flex: 1, backgroundColor: password.length > 8 ? '#0058bc' : '#e0e3e5', borderRadius: 9999 }} />
                                </div>
                                <p style={{ fontSize: 10, marginTop: 8, fontWeight: 500, color: '#414755' }}>
                                    Access Strength: <span style={{ color: '#0058bc', fontWeight: 700 }}>
                                    {password.length === 0 ? 'None' : password.length <= 4 ? 'Standard' : password.length <= 8 ? 'Strong' : 'Maximum'}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '16px 0',
                                background: loading ? '#e0e3e5' : 'linear-gradient(to right, #0058bc, #0070eb)',
                                color: loading ? '#717786' : '#ffffff',
                                fontWeight: 700,
                                borderRadius: 8,
                                border: 'none',
                                boxShadow: loading ? 'none' : '0 10px 15px -3px rgba(0, 88, 188, 0.25)',
                                cursor: loading ? 'wait' : 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                marginTop: 16
                            }}
                            onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
                            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {loading ? t('loading') : t('submit')}
                            {!loading && <span style={{ fontSize: 18 }}>→</span>}
                        </button>
                    </form>
                </div>

                {/* Secondary Action */}
                <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); navigate(`/${tenantSlug || ''}`); }}
                    style={{
                        marginTop: 40,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: '#414755',
                        fontWeight: 700,
                        textDecoration: 'none',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#0058bc'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#414755'}
                >
                    <span style={{ fontSize: 18 }}>←</span>
                    Back to Public Portal
                </a>
            </main>

            {/* Footer Semantic Shell */}
            <footer style={{
                position: 'fixed',
                bottom: 0,
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 16,
                paddingBottom: 32,
                fontFamily: '"Montserrat", sans-serif',
                fontSize: 14,
                color: '#717786'
            }}>
                <span style={{ color: '#414755', opacity: 0.6 }}>© 2026 FoodSpot Systems</span>
                <div style={{ display: 'flex', gap: 24 }}>
                    <a href="#" style={{ color: '#717786', textDecoration: 'none', transition: 'color 0.2s ease' }} onMouseEnter={(e)=>e.currentTarget.style.color='#0058bc'} onMouseLeave={(e)=>e.currentTarget.style.color='#717786'}>Privacy Policy</a>
                    <a href="#" style={{ color: '#717786', textDecoration: 'none', transition: 'color 0.2s ease' }} onMouseEnter={(e)=>e.currentTarget.style.color='#0058bc'} onMouseLeave={(e)=>e.currentTarget.style.color='#717786'}>Terms of Service</a>
                    <a href="#" style={{ color: '#717786', textDecoration: 'none', transition: 'color 0.2s ease' }} onMouseEnter={(e)=>e.currentTarget.style.color='#0058bc'} onMouseLeave={(e)=>e.currentTarget.style.color='#717786'}>Help Center</a>
                </div>
            </footer>
        </div>
    )
}

export default OwnerLogin