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

function TrialSignup() {
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
    // RENDER: STRICT MODE 1:1
    // ============================
    return (
        <div style={{
            minHeight: '100vh',
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            backgroundColor: '#D80000'
        }}>
            {/* 1. SOFT-GLOW SWIRL BACKGROUND */}
            <div style={{
                position: 'absolute', inset: -200, zIndex: 0,
                background: `
                    repeating-conic-gradient(
                        from 0deg at 50% 50%,
                        #D80000 0deg 15deg,
                        #FF4500 15deg 30deg
                    )
                `,
                filter: 'blur(8px)',
            }} />

            {/* 2. WARM VIGNETTE */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: 'radial-gradient(circle at center, rgba(255, 69, 0, 0.1) 0%, rgba(180, 20, 0, 0.5) 100%)'
            }} />

            {/* 3. BURGER IMAGE */}
            <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '130%',
                height: 'auto',
                aspectRatio: '1/1',
                zIndex: 2,
                backgroundImage: 'url(https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=100)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                filter: 'saturate(1.3) contrast(1.08) drop-shadow(0 30px 60px rgba(0,0,0,0.4))',
                marginTop: -10
            }} />

            {/* 4. CONTENT LAYER */}
            <div style={{
                position: 'relative', zIndex: 10,
                flex: 1, display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '0 24px',
                paddingTop: 'calc(env(safe-area-inset-top, 20px) + 56px)',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 32px)',
                minHeight: '100vh', minHeight: '100dvh'
            }}>
                {/* TOP: BRANDING */}
                <div style={{ textAlign: 'center' }}>
                    {/* Slogan */}
                    <p style={{
                        color: '#FFFFFF', fontSize: 13,
                        fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', marginBottom: 20,
                        textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                        TU NEGOCIO. TU MARCA. TU APP.
                    </p>

                    {/* Main Title - INTER BLACK 900, HEAVY STAMP */}
                    <h1 id="trial-title" style={{
                        color: '#FFFFFF', fontSize: 'clamp(48px, 13vw, 64px)',
                        fontWeight: 900, lineHeight: 0.85,
                        margin: 0,
                        textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        letterSpacing: '-0.04em',
                        fontFamily: "'Inter', sans-serif"
                    }}>
                        ¡Bienvenidos a<br />
                        <span style={{ display: 'block' }}>FoodSpot</span>
                        <span style={{ display: 'block' }}>Mobile!</span>
                    </h1>
                </div>

                {/* FORCE WHITE OVERRIDE */}
                <style>{`
                    #trial-title, #trial-title * {
                        color: #FFFFFF !important;
                    }
                    input::placeholder { color: #9CA3AF; }
                    input:focus {
                        border-color: #DC3C14 !important;
                        box-shadow: 0 0 0 4px rgba(220, 60, 20, 0.1) !important;
                        background: #FFFFFF !important;
                    }
                `}</style>

                {/* BOTTOM: ACTIONS */}
                <div style={{ maxWidth: 400, width: '100%', margin: '0 auto' }}>
                    {/* Error Toast */}
                    {error && (
                        <div style={{
                            background: '#FEE2E2',
                            border: '2px solid #EF4444',
                            borderRadius: 16, padding: '12px 16px', marginBottom: 16,
                            color: '#991B1B', fontSize: 13, textAlign: 'center',
                            fontWeight: 700,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            {error}
                        </div>
                    )}

                    {!showEmailForm ? (
                        /* BUTTON STACK - PURE WHITE PILLS */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* GOOGLE */}
                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '18px 24px',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    backdropFilter: 'blur(4px)',
                                    WebkitBackdropFilter: 'blur(4px)',
                                    border: 'none',
                                    borderRadius: 50,
                                    display: 'flex', alignItems: 'center', gap: 16,
                                    fontSize: 16, fontWeight: 700, color: '#1F2937',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                                    opacity: loading ? 0.7 : 1
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
                                    width: '100%', padding: '18px 24px',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    backdropFilter: 'blur(4px)',
                                    WebkitBackdropFilter: 'blur(4px)',
                                    border: 'none',
                                    borderRadius: 50,
                                    display: 'flex', alignItems: 'center', gap: 16,
                                    fontSize: 16, fontWeight: 700, color: '#1F2937',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
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
                        /* EMAIL FORM - CLEAN CARD */
                        <div style={{
                            background: '#FFFFFF',
                            borderRadius: 32, padding: 28,
                            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                            marginBottom: 20
                        }}>
                            <button
                                onClick={() => { setShowEmailForm(false); setError(null) }}
                                style={{
                                    background: 'none', border: 'none', color: '#6B7280',
                                    fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 20,
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    fontWeight: 700
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
                        color: 'rgba(255,255,255,0.9)', fontSize: 14,
                        textAlign: 'center', margin: 0,
                        marginTop: 12,
                        fontWeight: 600,
                        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
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
                                color: 'white', fontWeight: 800,
                                cursor: 'pointer', textDecoration: 'underline',
                                fontSize: 14, padding: 0,
                                marginLeft: 4
                            }}
                        >
                            {mode === 'signup' ? 'Inicia Sesión' : 'Regístrate'}
                        </button>
                    </p>
                </div>
            </div>


        </div>
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
