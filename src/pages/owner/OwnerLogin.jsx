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
                    subtitle: 'Administrá tu imperio culinario',
                    emailPlaceholder: 'Email',
                    emailPlaceholderStaff: 'Usuario',
                    passwordPlaceholder: 'Contraseña',
                    passwordPlaceholderStaff: 'PIN',
                    submit: 'Ingresar',
                    back: 'Volver',
                    staffLogin: 'Staff',
                    ownerLogin: 'Owner',
                    incorrect: 'Credenciales incorrectas',
                    staffNotFound: 'Personal no encontrado en este negocio',
                    loading: 'Verificando...',
                    forgot: '¿Olvidaste tu contraseña?',
                    strengthEmpty: 'Ingresá credenciales',
                    strengthWeak: 'Débil',
                    strengthStrong: 'Nivel de acceso fuerte',
                    strengthMax: 'Seguridad máxima',
                },
                en: {
                    title: 'Admin Access',
                    subtitle: 'Manage your culinary empire',
                    emailPlaceholder: 'Email',
                    emailPlaceholderStaff: 'Username',
                    passwordPlaceholder: 'Password',
                    passwordPlaceholderStaff: 'PIN',
                    submit: 'Login',
                    back: 'Back',
                    staffLogin: 'Staff',
                    ownerLogin: 'Owner',
                    incorrect: 'Incorrect credentials',
                    staffNotFound: 'Staff not found at this business',
                    loading: 'Verifying...',
                    forgot: 'Forgot Password?',
                    strengthEmpty: 'Enter credentials',
                    strengthWeak: 'Weak',
                    strengthStrong: 'Strong Access Level',
                    strengthMax: 'Maximum Security',
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
    // PREMIUM LOGIN UI
    // ============================
    return (
        <div style={{
            minHeight: '100dvh',
            background: 'radial-gradient(circle at 50% 50%, #2a2218 0%, #131313 70%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
            color: '#e5e2e1',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Fixed Header */}
            <header style={{
                position: 'fixed',
                top: 0,
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0 24px',
                height: 80,
                zIndex: 50
            }}>
                <h1 style={{
                    fontFamily: '"Manrope", sans-serif',
                    fontWeight: 900,
                    fontSize: 24,
                    color: '#dfc29f',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    margin: 0
                }}>FoodSpot</h1>
            </header>

            {/* Main Content */}
            <main style={{ width: '100%', maxWidth: 448, padding: '48px 24px', zIndex: 10 }}>
                <div style={{
                    background: 'rgba(28, 27, 27, 0.65)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderRadius: 40,
                    padding: 32,
                    boxShadow: '0 -4px 40px rgba(0,0,0,0.12)',
                    border: '1px solid rgba(77, 69, 60, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    {/* Context Header */}
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <h2 style={{
                            fontFamily: '"Manrope", sans-serif',
                            fontSize: 30,
                            fontWeight: 700,
                            letterSpacing: '-0.025em',
                            color: '#e5e2e1',
                            margin: '0 0 8px 0'
                        }}>{t('title')}</h2>
                        <p style={{
                            color: '#d1c4b9',
                            fontWeight: 500,
                            opacity: 0.8,
                            margin: 0,
                            fontSize: 14
                        }}>{t('subtitle')}</p>
                    </div>

                    {/* Auth Toggle (Owner / Staff) */}
                    <div style={{
                        width: '100%',
                        background: 'rgba(14, 14, 14, 0.5)',
                        padding: 6,
                        borderRadius: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 40,
                        position: 'relative'
                    }}>
                        {/* Animated pill indicator */}
                        <div style={{
                            position: 'absolute',
                            left: loginMode === 'owner' ? 6 : 'calc(50% + 0px)',
                            width: 'calc(50% - 6px)',
                            height: 'calc(100% - 12px)',
                            background: '#353534',
                            borderRadius: 9999,
                            boxShadow: '0 0 15px rgba(223, 194, 159, 0.1)',
                            transition: 'left 0.3s ease',
                            top: 6
                        }} />
                        <button
                            type="button"
                            onClick={() => { setLoginMode('owner'); setError(''); }}
                            style={{
                                position: 'relative',
                                zIndex: 10,
                                flex: 1,
                                padding: '12px 0',
                                fontSize: 13,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                color: loginMode === 'owner' ? '#dfc29f' : '#d1c4b9',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                transition: 'color 0.3s ease'
                            }}
                        >
                            <span style={{ fontSize: 18 }}>⚙️</span>
                            {t('ownerLogin')}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setLoginMode('staff'); setError(''); }}
                            style={{
                                position: 'relative',
                                zIndex: 10,
                                flex: 1,
                                padding: '12px 0',
                                fontSize: 13,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                color: loginMode === 'staff' ? '#dfc29f' : '#d1c4b9',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                transition: 'color 0.3s ease'
                            }}
                        >
                            <span style={{ fontSize: 18 }}>🪪</span>
                            {t('staffLogin')}
                        </button>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        {/* Email / Username Input */}
                        <div style={{ marginBottom: 24 }}>
                            <label style={{
                                display: 'block',
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.15em',
                                color: '#d1c4b9',
                                marginLeft: 4,
                                marginBottom: 8
                            }}>{loginMode === 'staff' ? t('emailPlaceholderStaff') : 'Email Address'}</label>
                            <input
                                type={loginMode === 'staff' ? 'text' : 'email'}
                                placeholder={loginMode === 'owner' ? 'owner@foodspot.com' : t('emailPlaceholderStaff')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    height: 64,
                                    background: '#0e0e0e',
                                    border: 'none',
                                    borderRadius: 16,
                                    padding: '0 24px',
                                    color: '#e5e2e1',
                                    fontWeight: 500,
                                    fontSize: 15,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'box-shadow 0.2s ease'
                                }}
                                onFocus={(e) => e.target.style.boxShadow = '0 0 0 1px rgba(223,194,159,0.4)'}
                                onBlur={(e) => e.target.style.boxShadow = 'none'}
                            />
                        </div>

                        {/* Password / PIN Input */}
                        <div style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 8 }}>
                                <label style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.15em',
                                    color: '#d1c4b9'
                                }}>{loginMode === 'staff' ? 'PIN' : 'Security Key'}</label>
                            </div>
                            <input
                                type="password"
                                placeholder={loginMode === 'staff' ? '••••' : '••••••••'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                maxLength={loginMode === 'staff' ? 4 : undefined}
                                style={{
                                    width: '100%',
                                    height: 64,
                                    background: '#0e0e0e',
                                    border: 'none',
                                    borderRadius: 16,
                                    padding: '0 24px',
                                    color: '#e5e2e1',
                                    fontWeight: 500,
                                    fontSize: 15,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'box-shadow 0.2s ease'
                                }}
                                onFocus={(e) => e.target.style.boxShadow = '0 0 0 1px rgba(223,194,159,0.4)'}
                                onBlur={(e) => e.target.style.boxShadow = 'none'}
                            />
                            {loginMode === 'owner' && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                                    <a href="#" style={{ fontSize: 12, fontWeight: 600, color: '#dfc29f', textDecoration: 'none', opacity: 0.9 }}>{t('forgot')}</a>
                                </div>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <p style={{
                                color: '#ffb4ab',
                                textAlign: 'center',
                                fontSize: 13,
                                marginBottom: 10,
                                background: 'rgba(147, 0, 10, 0.2)',
                                padding: '10px 16px',
                                borderRadius: 12,
                                border: '1px solid rgba(255, 180, 171, 0.2)'
                            }}>{error}</p>
                        )}

                        {/* Password Strength Meter */}
                        <div style={{ marginBottom: 24, paddingTop: 8 }}>
                            <div style={{ display: 'flex', gap: 6, height: 6, width: '100%' }}>
                                <div style={{ flex: 1, borderRadius: 9999, background: '#8b7355' }} />
                                <div style={{ flex: 1, borderRadius: 9999, background: '#8b7355' }} />
                                <div style={{ flex: 1, borderRadius: 9999, background: password.length > 4 ? '#8b7355' : '#353534' }} />
                                <div style={{ flex: 1, borderRadius: 9999, background: password.length > 8 ? '#8b7355' : '#353534' }} />
                            </div>
                            <p style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.15em',
                                color: '#d1c4b9',
                                textAlign: 'center',
                                marginTop: 12
                            }}>
                                {password.length === 0 ? t('strengthEmpty') : password.length <= 4 ? t('strengthWeak') : password.length <= 8 ? t('strengthStrong') : t('strengthMax')}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    height: 64,
                                    background: loading
                                        ? '#4d453c'
                                        : 'linear-gradient(135deg, #dfc29f 0%, #8b7355 100%)',
                                    color: loading ? '#9a8f84' : '#3f2d15',
                                    fontFamily: '"Manrope", sans-serif',
                                    fontWeight: 700,
                                    fontSize: 18,
                                    borderRadius: 16,
                                    border: 'none',
                                    boxShadow: loading ? 'none' : '0 4px 20px rgba(223, 194, 159, 0.2)',
                                    cursor: loading ? 'wait' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    transition: 'opacity 0.2s ease, transform 0.1s ease'
                                }}
                                onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {loading ? t('loading') : t('submit')}
                                {!loading && <span style={{ fontSize: 20 }}>→</span>}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(`/${tenantSlug || ''}`)}
                                style={{
                                    width: '100%',
                                    height: 64,
                                    background: 'transparent',
                                    border: '1px solid rgba(77, 69, 60, 0.3)',
                                    color: '#d1c4b9',
                                    fontFamily: '"Manrope", sans-serif',
                                    fontWeight: 700,
                                    fontSize: 18,
                                    borderRadius: 16,
                                    cursor: 'pointer',
                                    transition: 'background 0.2s ease, transform 0.1s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#1c1b1b'}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {t('back')}
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            {/* Background Decorative Blur Orbs */}
            <div style={{
                position: 'absolute',
                top: '25%',
                left: -80,
                width: 320,
                height: 320,
                background: 'rgba(223, 194, 159, 0.05)',
                filter: 'blur(120px)',
                borderRadius: '50%',
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute',
                bottom: '25%',
                right: -80,
                width: 384,
                height: 384,
                background: 'rgba(139, 115, 85, 0.1)',
                filter: 'blur(150px)',
                borderRadius: '50%',
                pointerEvents: 'none'
            }} />

            {/* Background Hero Image */}
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: -1,
                opacity: 0.1
            }}>
                <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQMD1WWzULK-OYupbPZxeSzfpVJoZEnHhlAXCvT_lzZPs3W9mO4Mjhge_MHdrREJacVpXTHgo3a8vXkU06xML-SjlIIayDirdcBsZuVFTfSPhp2HhQSMbb0UoI8Ui6dQD8SM2WW5rD79R1ZvvbVyAwcls9Kn_pAL9UltGVwEvesdQXHMxE7po2xNtRtlBzYM8zFgSuQEIGYhb5TXRTU4tYkWS6OAtTwAS3biEAqvQ-9mzpYP3QGqJK-4Sd7m0TQ4yHFoG0bCVow00"
                    alt=""
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'grayscale(100%)'
                    }}
                />
            </div>
        </div>
    )
}

export default OwnerLogin