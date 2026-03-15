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
                    subtitle: 'Ingresá tu email y contraseña',
                    emailPlaceholder: 'Email',
                    passwordPlaceholder: 'Contraseña',
                    submit: 'Ingresar',
                    back: '← Volver',
                    staffLogin: 'Acceso Personal',
                    ownerLogin: 'Acceso Owner',
                    incorrect: 'Credenciales incorrectas',
                    staffNotFound: 'Personal no encontrado en este negocio',
                    loading: 'Verificando...'
                },
                en: {
                    title: 'Admin Access',
                    subtitle: 'Enter your email and password',
                    emailPlaceholder: 'Email',
                    passwordPlaceholder: 'Password',
                    submit: 'Login',
                    back: '← Back',
                    staffLogin: 'Staff Access',
                    ownerLogin: 'Owner Access',
                    incorrect: 'Incorrect credentials',
                    staffNotFound: 'Staff not found at this business',
                    loading: 'Verifying...'
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
        if (loginMode === 'staff') {
            handleStaffLogin();
        } else {
            handleOwnerSubmit(e);
        }
    };

    const isEnglish = tenantData?.language === 'en';

    return (
        <div className="page" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '80vh'
        }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>🔐</div>
                <h1 className="page-title">{t('title')}</h1>
                <p className="page-subtitle">{t('subtitle')}</p>
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 24
            }}>
                <button
                    type="button"
                    onClick={() => { setLoginMode('owner'); setError(''); }}
                    style={{
                        padding: '10px 20px',
                        borderRadius: 8,
                        border: loginMode === 'owner' ? 'none' : '1px solid #E5E7EB',
                        background: loginMode === 'owner' ? '#1F2937' : 'white',
                        color: loginMode === 'owner' ? 'white' : '#6B7280',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    {t('ownerLogin')}
                </button>
                <button
                    type="button"
                    onClick={() => { setLoginMode('staff'); setError(''); }}
                    style={{
                        padding: '10px 20px',
                        borderRadius: 8,
                        border: loginMode === 'staff' ? 'none' : '1px solid #E5E7EB',
                        background: loginMode === 'staff' ? '#1F2937' : 'white',
                        color: loginMode === 'staff' ? 'white' : '#6B7280',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    {t('staffLogin')}
                </button>
            </div>

            <form onSubmit={loginMode === 'owner' ? handleOwnerSubmit : (e) => { e.preventDefault(); handleStaffLogin(); }}>
                <div className="form-group">
                    <input
                        type={loginMode === 'staff' ? 'text' : 'email'}
                        className="form-input"
                        placeholder={loginMode === 'staff' ? (isEnglish ? 'Username' : 'Usuario') : t('emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                        disabled={loading}
                    />
                </div>
                <div className="form-group">
                    <input
                        type="password"
                        className="form-input"
                        placeholder={loginMode === 'staff' ? 'PIN' : t('passwordPlaceholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        maxLength={loginMode === 'staff' ? 4 : undefined}
                    />
                </div>

                {error && (
                    <p style={{
                        color: 'var(--color-error)',
                        textAlign: 'center',
                        marginBottom: 'var(--space-3)',
                        fontSize: '14px'
                    }}>
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    className="btn btn-primary btn-block btn-lg"
                    disabled={loading}
                    style={{ opacity: loading ? 0.7 : 1 }}
                >
                    {loading ? t('loading') : t('submit')}
                </button>
            </form>

            <button
                className="btn btn-secondary btn-block"
                style={{ marginTop: 'var(--space-4)' }}
                onClick={() => navigate('/')}
                disabled={loading}
            >
                {t('back')}
            </button>
        </div>
    )
}

export default OwnerLogin