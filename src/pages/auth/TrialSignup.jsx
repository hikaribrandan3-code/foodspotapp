/**
 * TrialSignup.jsx — Strike 12: Premier Auth Screen
 * 
 * Premium full-bleed auth screen with:
 * - Hero burger background + red/orange gradient overlay
 * - "Continuar con Google" + "Continuar con Email" buttons
 * - Collapsible email/password form
 * - Login/Signup mode toggle
 * 
 * Flow (Signup):
 * 1. Capture business name, email, password
 * 2. Create Supabase Auth user with metadata
 * 3. INSERT branding row with 14-day trial
 * 4. Initialize tenant storage
 * 5. Redirect to owner dashboard
 * 
 * Flow (Login):
 * 1. Sign in with email/password
 * 2. Redirect based on role
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../../utils/storage.js'

// ============================================
// 🔐 PREMIER AUTH SCREEN (Strike 12)
// ============================================

const TrialSignup = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    // UI State
    const [mode, setMode] = useState('signup') // 'signup' | 'login'
    const [showEmailForm, setShowEmailForm] = useState(false)

    // Form state
    const [businessName, setBusinessName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Pre-fill business name from URL param
    useEffect(() => {
        const nameParam = searchParams.get('name')
        if (nameParam) {
            setBusinessName(decodeURIComponent(nameParam))
        }
    }, [searchParams])

    // Generate URL-safe slug from business name
    const generateSlug = (name) => {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 50)
    }

    // ============================
    // GOOGLE OAUTH
    // ============================
    const handleGoogleLogin = async () => {
        setLoading(true)
        setError(null)
        try {
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/auth/callback'
                }
            })
            if (oauthError) throw oauthError
        } catch (err) {
            setError(err.message || 'Error con Google')
            setLoading(false)
        }
    }

    // ============================
    // EMAIL SIGNUP
    // ============================
    const handleSignup = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const slug = generateSlug(businessName)
            if (!slug) throw new Error('Por favor ingresá un nombre de negocio válido')

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        business_name: businessName,
                        slug: slug,
                        role: 'owner'
                    }
                }
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('No se pudo crear el usuario')

            const userId = authData.user.id

            // CREATE TENANT SILO
            const trialEndsAt = new Date()
            trialEndsAt.setDate(trialEndsAt.getDate() + 14)

            try {
                const { error: siloError } = await supabase
                    .from('branding')
                    .insert({
                        user_id: userId,
                        business_name: businessName,
                        slug: slug,
                        trial_ends_at: trialEndsAt.toISOString()
                    })
                if (siloError) console.error('[TRIAL] Silo creation failed:', JSON.stringify(siloError, null, 2))
            } catch (brandingErr) {
                console.error('[TRIAL] Branding insert exception:', brandingErr)
            }

            setTenantStoragePrefix(userId)
            setLoading(false)
            window.location.href = `/${slug}/owner`

        } catch (err) {
            console.error('[TRIAL] Signup error:', err)
            setError(err.message || 'Error al crear la cuenta')
            setLoading(false)
        }
    }

    // ============================
    // EMAIL LOGIN
    // ============================
    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (loginError) throw loginError

            const role = data.user?.user_metadata?.role || 'staff'
            const slug = data.user?.user_metadata?.slug

            setLoading(false)
            if (slug) {
                window.location.href = `/${slug}/owner`
            } else {
                window.location.href = '/'
            }
        } catch (err) {
            setError(err.message || 'Error al iniciar sesión')
            setLoading(false)
        }
    }

    // ============================
    // RENDER: RESPONSIVE SPLIT
    // ============================

    // ── Shared Brand Panel (Desktop Optimized) ──
    const BrandPanel = ({ isDesktopPanel }) => (
        <div className={isDesktopPanel ? 'ts-brand-panel' : undefined} style={{
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#D80000',
            ...(isDesktopPanel ? {
                width: '50%', minHeight: '100vh',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            } : {})
        }}>
            {/* SUNBURST WINDMILL */}
            <div style={{
                position: 'absolute', inset: -400, zIndex: 0,
                background: `repeating-conic-gradient(from 0deg at 50% 50%, #D00000 0deg 15deg, #FF3300 15deg 30deg)`,
                filter: 'blur(4px) contrast(1.2)',
                animation: 'spin 60s linear infinite',
            }} />

            {/* HEAT GLOW */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: 'radial-gradient(circle at center, rgba(255,100,0,0.2) 0%, rgba(160,0,0,0.6) 90%)',
                mixBlendMode: 'overlay'
            }} />

            {/* SLOGAN - MOVED TO TOP (DESKTOP) */}
            <p style={{
                position: 'absolute', top: 48, left: 0, width: '100%',
                textAlign: 'center', zIndex: 10,
                color: '#FFFFFF', fontSize: 13, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)', opacity: 0.95,
                margin: 0
            }}>
                TU NEGOCIO. TU MARCA. TU APP.
            </p>

            {/* HERO BURGER - SHIFTED DOWN */}
            <div style={{
                position: 'absolute',
                top: isDesktopPanel ? '55%' : '50%', // Push down on desktop
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: isDesktopPanel ? '80%' : '95%',
                height: 'auto', aspectRatio: '1/1', zIndex: 2,
                backgroundImage: 'url(https://pngimg.com/uploads/burger_sandwich/burger_sandwich_PNG4135.png)',
                backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.6))',
                marginTop: 10
            }} />

            {/* BRAND TEXT (Just Title) */}
            <div style={{
                position: 'relative', zIndex: 10,
                textAlign: 'center',
                padding: '0 40px',
                marginTop: isDesktopPanel ? 60 : 0 // Push Title down to match burger
            }}>
                <div id="trial-title" style={{
                    color: '#FFFFFF',
                    textShadow: '0 4px 30px rgba(0,0,0,0.5)',
                    fontFamily: "'Inter', sans-serif",
                    transform: 'skewY(-3deg) translateY(-10px)',
                }}>
                    <div style={{ fontSize: '42px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 2 }}>
                        ¡Bienvenidos a
                    </div>
                    <div style={{ fontSize: '68px', fontWeight: 900, lineHeight: 0.85, letterSpacing: '-0.05em', display: 'block', marginBottom: -5 }}>
                        FoodSpot
                    </div>
                    <div style={{ fontSize: '68px', fontWeight: 900, lineHeight: 0.85, letterSpacing: '-0.05em', display: 'block' }}>
                        Mobile!
                    </div>
                </div>
            </div>
        </div>
    )

    // ── Shared Actions Panel (buttons + form) ──
    const ActionsPanel = ({ isDesktopPanel }) => (
        <div className={isDesktopPanel ? 'ts-form-panel' : undefined} style={{
            ...(isDesktopPanel ? {
                width: '50%', minHeight: '100vh',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center',
                background: '#F9FAFB', padding: '60px 48px'
            } : {})
        }}>
            <div style={{ maxWidth: 400, width: '100%', margin: '0 auto' }}>
                {/* Desktop heading */}
                {isDesktopPanel && (
                    <div style={{ marginBottom: 40, textAlign: 'center' }}>
                        <h2 style={{
                            fontSize: 28, fontWeight: 900, color: '#1F2937',
                            marginBottom: 8, fontFamily: "'Inter', sans-serif"
                        }}>
                            {mode === 'signup' ? 'Empezá gratis' : 'Bienvenido de vuelta'}
                        </h2>
                        <p style={{ fontSize: 15, color: '#6B7280', fontWeight: 500 }}>
                            {mode === 'signup' ? '14 días de prueba. Sin tarjeta.' : 'Ingresá a tu panel de control.'}
                        </p>
                    </div>
                )}

                {/* Error Toast */}
                {error && (
                    <div style={{
                        background: '#FEE2E2', border: '2px solid #EF4444',
                        borderRadius: 16, padding: '12px 16px', marginBottom: 16,
                        color: '#991B1B', fontSize: 13, textAlign: 'center',
                        fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                        {error}
                    </div>
                )}

                {!showEmailForm ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* GOOGLE */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            style={{
                                width: '100%', padding: '14px 20px',
                                background: isDesktopPanel ? '#FFFFFF' : 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: isDesktopPanel ? 'none' : 'blur(8px)',
                                WebkitBackdropFilter: isDesktopPanel ? 'none' : 'blur(8px)',
                                border: isDesktopPanel ? '2px solid #E5E7EB' : '1px solid rgba(255,255,255,0.5)',
                                borderRadius: 50,
                                display: 'flex', alignItems: 'center', gap: 14,
                                fontSize: 14, fontWeight: 700, color: '#1F2937',
                                cursor: 'pointer',
                                boxShadow: isDesktopPanel ? '0 2px 8px rgba(0,0,0,0.06)' : '0 4px 20px rgba(0,0,0,0.15)',
                                opacity: loading ? 0.7 : 1,
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <div style={{ width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="24" height="24" viewBox="0 0 48 48">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                </svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'center' }}>Continuar con Google</span>
                        </button>

                        {/* EMAIL */}
                        <button
                            onClick={() => setShowEmailForm(true)}
                            disabled={loading}
                            style={{
                                width: '100%', padding: '14px 20px',
                                background: isDesktopPanel ? '#FFFFFF' : 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: isDesktopPanel ? 'none' : 'blur(8px)',
                                WebkitBackdropFilter: isDesktopPanel ? 'none' : 'blur(8px)',
                                border: isDesktopPanel ? '2px solid #E5E7EB' : '1px solid rgba(255,255,255,0.5)',
                                borderRadius: 50,
                                display: 'flex', alignItems: 'center', gap: 14,
                                fontSize: 14, fontWeight: 700, color: '#1F2937',
                                cursor: 'pointer',
                                boxShadow: isDesktopPanel ? '0 2px 8px rgba(0,0,0,0.06)' : '0 4px 20px rgba(0,0,0,0.15)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <div style={{ width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                    <path d="M22 7l-10 7L2 7" />
                                </svg>
                            </div>
                            <span style={{ flex: 1, textAlign: 'center' }}>Continuar con Email</span>
                        </button>
                    </div>
                ) : (
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: isDesktopPanel ? 24 : 32,
                        padding: 28,
                        boxShadow: isDesktopPanel ? '0 4px 24px rgba(0,0,0,0.08)' : '0 25px 50px rgba(0,0,0,0.25)',
                        border: isDesktopPanel ? '1px solid #E5E7EB' : 'none',
                        marginBottom: 20
                    }}>
                        <button
                            onClick={() => { setShowEmailForm(false); setError(null) }}
                            style={{
                                background: 'none', border: 'none', color: '#6B7280',
                                fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 20,
                                display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700
                            }}
                        >
                            ← Volver
                        </button>

                        <h3 style={{ color: '#1F2937', fontSize: 22, fontWeight: 800, margin: '0 0 24px', textAlign: 'center' }}>
                            {mode === 'signup' ? 'Creá tu cuenta' : 'Iniciá sesión'}
                        </h3>

                        <form onSubmit={mode === 'signup' ? handleSignup : handleLogin}>
                            {mode === 'signup' && (
                                <div style={{ marginBottom: 16 }}>
                                    <label style={labelStyle}>Nombre del Negocio</label>
                                    <input
                                        type="text" value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        placeholder="Ej: Burger Palace"
                                        required style={inputStyle}
                                    />
                                </div>
                            )}
                            <div style={{ marginBottom: 16 }}>
                                <label style={labelStyle}>Email</label>
                                <input
                                    type="email" value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    required style={inputStyle}
                                />
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={labelStyle}>Contraseña</label>
                                <input
                                    type="password" value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min. 6 caracteres"
                                    required minLength={6} style={inputStyle}
                                />
                            </div>

                            <button
                                type="submit" disabled={loading}
                                style={{
                                    width: '100%', padding: 18, fontSize: 16,
                                    fontWeight: 800, borderRadius: 16, border: 'none',
                                    background: loading ? '#E5E7EB' : '#DC3C14',
                                    color: loading ? '#9CA3AF' : '#FFFFFF',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: loading ? 'none' : '0 4px 12px rgba(220, 60, 20, 0.3)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {loading ? 'Procesando...' : (mode === 'signup' ? 'Comenzar prueba gratis →' : 'Iniciar sesión →')}
                            </button>
                        </form>
                    </div>
                )}

                {/* FOOTER LINK */}
                <p style={{
                    color: isDesktopPanel ? '#6B7280' : 'rgba(255,255,255,0.9)',
                    fontSize: 14, textAlign: 'center', margin: 0, marginTop: 12,
                    fontWeight: 600,
                    textShadow: isDesktopPanel ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                    {mode === 'signup' ? '¿Ya tienes cuenta? ' : '¿Eres nuevo? '}
                    <button
                        onClick={() => {
                            setMode(mode === 'signup' ? 'login' : 'signup')
                            setShowEmailForm(true)
                            setError(null)
                        }}
                        style={{
                            background: 'none', border: 'none',
                            color: isDesktopPanel ? '#DC3C14' : 'white',
                            fontWeight: 800, cursor: 'pointer',
                            textDecoration: 'underline', fontSize: 14,
                            padding: 0, marginLeft: 4
                        }}
                    >
                        {mode === 'signup' ? 'Inicia Sesión' : 'Regístrate'}
                    </button>
                </p>
            </div>
        </div>
    )

    return (
        <>
            {/* RESPONSIVE CSS */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                #trial-title, #trial-title * {
                    color: #FFFFFF !important;
                }
                input::placeholder { color: #9CA3AF; }
                input:focus {
                    border-color: #DC3C14 !important;
                    box-shadow: 0 0 0 4px rgba(220, 60, 20, 0.1) !important;
                    background: #FFFFFF !important;
                }
                /* MOBILE: hide desktop layout */
                .ts-desktop-shell { display: none; }
                .ts-mobile-shell { display: flex; }

                /* DESKTOP: show split, hide mobile */
                @media (min-width: 1024px) {
                    .ts-desktop-shell { display: flex !important; }
                    .ts-mobile-shell { display: none !important; }
                    .ts-form-panel button:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 6px 20px rgba(0,0,0,0.1) !important;
                    }
                }
            `}</style>

            {/* ═══════════════════════════════════ */}
            {/* MOBILE LAYOUT (< 1024px) — UNCHANGED */}
            {/* ═══════════════════════════════════ */}
            <div className="ts-mobile-shell" style={{
                minHeight: '100vh', minHeight: '100dvh',
                display: 'flex', flexDirection: 'column',
                position: 'relative', overflow: 'hidden',
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                backgroundColor: '#D80000'
            }}>
                {/* SUNBURST */}
                <div style={{
                    position: 'absolute', inset: -400, zIndex: 0,
                    background: `repeating-conic-gradient(from 0deg at 50% 50%, #D00000 0deg 15deg, #FF3300 15deg 30deg)`,
                    filter: 'blur(4px) contrast(1.2)',
                    animation: 'spin 60s linear infinite',
                }} />
                {/* HEAT GLOW */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 1,
                    background: 'radial-gradient(circle at center, rgba(255,100,0,0.2) 0%, rgba(160,0,0,0.6) 90%)',
                    mixBlendMode: 'overlay'
                }} />
                {/* HERO BURGER */}
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '95%', height: 'auto', aspectRatio: '1/1', zIndex: 2,
                    backgroundImage: 'url(https://pngimg.com/uploads/burger_sandwich/burger_sandwich_PNG4135.png)',
                    backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                    filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.6))',
                    marginTop: 10
                }} />
                {/* CONTENT */}
                <div style={{
                    position: 'relative', zIndex: 10,
                    flex: 1, display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', padding: '0 24px',
                    paddingTop: 'calc(env(safe-area-inset-top, 20px) + 40px)',
                    paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 32px)',
                    minHeight: '100vh', minHeight: '100dvh'
                }}>
                    {/* TOP: BRANDING */}
                    <div style={{ textAlign: 'center' }}>
                        <p style={{
                            color: '#FFFFFF', fontSize: 13, fontWeight: 700,
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                            marginBottom: 16, textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            opacity: 0.95
                        }}>
                            TU NEGOCIO. TU MARCA. TU APP.
                        </p>
                        <div id="trial-title" style={{
                            color: '#FFFFFF',
                            textShadow: '0 4px 30px rgba(0,0,0,0.5)',
                            fontFamily: "'Inter', sans-serif",
                            transform: 'skewY(-3deg) translateY(-10px)',
                        }}>
                            <div style={{ fontSize: '42px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 2 }}>
                                ¡Bienvenidos a
                            </div>
                            <div style={{ fontSize: '68px', fontWeight: 900, lineHeight: 0.85, letterSpacing: '-0.05em', display: 'block', marginBottom: -5 }}>
                                FoodSpot
                            </div>
                            <div style={{ fontSize: '68px', fontWeight: 900, lineHeight: 0.85, letterSpacing: '-0.05em', display: 'block' }}>
                                Mobile!
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM: ACTIONS (mobile — glassmorphism) */}
                    <ActionsPanel isDesktopPanel={false} />
                </div>
            </div>

            {/* ═══════════════════════════════════ */}
            {/* DESKTOP LAYOUT (≥ 1024px) — 50/50 SPLIT */}
            {/* ═══════════════════════════════════ */}
            <div className="ts-desktop-shell" style={{
                flexDirection: 'row',
                minHeight: '100vh',
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            }}>
                {/* LEFT: BRAND */}
                <BrandPanel isDesktopPanel={true} />

                {/* RIGHT: FORM */}
                <ActionsPanel isDesktopPanel={true} />
            </div>
        </>
    )
}

// ============================
// STYLES
// ============================
const labelStyle = {
    display: 'block', color: '#4B5563',
    fontSize: 12, fontWeight: 800, marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: '0.05em'
}

const inputStyle = {
    width: '100%', padding: '16px',
    borderRadius: 14, border: '2px solid #E5E7EB',
    fontSize: 16, color: '#1F2937', background: '#F9FAFB',
    boxSizing: 'border-box', outline: 'none',
    fontWeight: 600
}

export default TrialSignup
