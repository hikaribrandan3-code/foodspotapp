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
    // RENDER
    // ============================
    return (
        <div style={{
            minHeight: '100vh',
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
        }}>
            {/* 1. HERO BACKGROUND */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0,
                backgroundImage: 'url(https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80)',
                backgroundSize: 'cover',
                backgroundPosition: 'center 30%'
            }} />

            {/* 2. GRADIENT OVERLAY (Red/Orange swirl) */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: 'linear-gradient(180deg, rgba(220, 60, 20, 0.75) 0%, rgba(200, 80, 30, 0.6) 35%, rgba(180, 60, 20, 0.85) 65%, rgba(30, 10, 5, 0.95) 100%)'
            }} />

            {/* 3. CONTENT LAYER */}
            <div style={{
                position: 'relative', zIndex: 2,
                flex: 1, display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '0 28px',
                paddingTop: 'calc(env(safe-area-inset-top, 20px) + 48px)',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 24px)',
                minHeight: '100vh', minHeight: '100dvh'
            }}>
                {/* TOP: BRANDING */}
                <div style={{ textAlign: 'center' }}>
                    {/* Slogan */}
                    <p style={{
                        color: 'rgba(255,255,255,0.85)', fontSize: 13,
                        fontWeight: 600, letterSpacing: '0.15em',
                        textTransform: 'uppercase', marginBottom: 24
                    }}>
                        TU NEGOCIO. TU MARCA. TU APP.
                    </p>

                    {/* Main Title */}
                    <h1 style={{
                        color: 'white', fontSize: 'clamp(36px, 10vw, 52px)',
                        fontWeight: 800, lineHeight: 1.05,
                        margin: 0, textShadow: '0 4px 24px rgba(0,0,0,0.3)',
                        letterSpacing: '-0.02em'
                    }}>
                        ¡Bienvenidos a<br />
                        <span style={{ fontStyle: 'italic' }}>FoodSpot</span><br />
                        Mobile!
                    </h1>
                </div>

                {/* BOTTOM: AUTH ACTIONS */}
                <div style={{ maxWidth: 400, width: '100%', margin: '0 auto' }}>
                    {/* Error Toast */}
                    {error && (
                        <div style={{
                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                            borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                            color: '#fca5a5', fontSize: 14, textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    {!showEmailForm ? (
                        /* BUTTON STACK (Holy Trinity Lite) */
                        <>
                            {/* GOOGLE BUTTON */}
                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '16px 20px',
                                    background: '#FFFFFF', border: 'none', borderRadius: 14,
                                    display: 'flex', alignItems: 'center', gap: 16,
                                    fontSize: 16, fontWeight: 600, color: '#1F2937',
                                    cursor: 'pointer', marginBottom: 12,
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                    opacity: loading ? 0.7 : 1,
                                    transition: 'transform 0.15s, box-shadow 0.15s'
                                }}
                            >
                                {/* Google G Logo */}
                                <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="24" height="24" viewBox="0 0 48 48">
                                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                    </svg>
                                </div>
                                <span style={{ flex: 1, textAlign: 'center' }}>Continuar con Google</span>
                            </button>

                            {/* EMAIL BUTTON */}
                            <button
                                onClick={() => setShowEmailForm(true)}
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '16px 20px',
                                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255,255,255,0.3)', borderRadius: 14,
                                    display: 'flex', alignItems: 'center', gap: 16,
                                    fontSize: 16, fontWeight: 600, color: 'white',
                                    cursor: 'pointer', marginBottom: 24,
                                    transition: 'background 0.15s'
                                }}
                            >
                                {/* Envelope Icon */}
                                <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2" />
                                        <path d="M22 7l-10 7L2 7" />
                                    </svg>
                                </div>
                                <span style={{ flex: 1, textAlign: 'center' }}>Continuar con Email</span>
                            </button>
                        </>
                    ) : (
                        /* EMAIL FORM (Expanded) */
                        <div style={{
                            background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)',
                            borderRadius: 20, padding: 24,
                            border: '1px solid rgba(255,255,255,0.15)',
                            marginBottom: 24
                        }}>
                            {/* Back Arrow */}
                            <button
                                onClick={() => { setShowEmailForm(false); setError(null) }}
                                style={{
                                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)',
                                    fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 16,
                                    display: 'flex', alignItems: 'center', gap: 6
                                }}
                            >
                                ← Volver
                            </button>

                            <h3 style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: '0 0 20px', textAlign: 'center' }}>
                                {mode === 'signup' ? 'Creá tu cuenta' : 'Iniciá sesión'}
                            </h3>

                            <form onSubmit={mode === 'signup' ? handleSignup : handleLogin}>
                                {/* Business Name (Signup only) */}
                                {mode === 'signup' && (
                                    <div style={{ marginBottom: 14 }}>
                                        <label style={labelStyle}>Nombre del Negocio</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={iconWrapStyle}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                                            </div>
                                            <input
                                                type="text" value={businessName}
                                                onChange={(e) => setBusinessName(e.target.value)}
                                                placeholder="Ej: Burger Palace"
                                                required style={inputStyle}
                                            />
                                        </div>
                                        {businessName && (
                                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4, marginBottom: 0 }}>
                                                Tu URL: foodspot.app/<strong>{generateSlug(businessName)}</strong>
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Email */}
                                <div style={{ marginBottom: 14 }}>
                                    <label style={labelStyle}>Email</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={iconWrapStyle}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" /></svg>
                                        </div>
                                        <input
                                            type="email" value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="tu@email.com"
                                            required style={inputStyle}
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div style={{ marginBottom: 20 }}>
                                    <label style={labelStyle}>Contraseña</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={iconWrapStyle}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                        </div>
                                        <input
                                            type="password" value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                                            required minLength={6} style={inputStyle}
                                        />
                                    </div>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit" disabled={loading}
                                    style={{
                                        width: '100%', padding: 16, fontSize: 16,
                                        fontWeight: 700, borderRadius: 14, border: 'none',
                                        background: loading ? 'rgba(255,255,255,0.3)' : '#FFFFFF',
                                        color: loading ? 'rgba(0,0,0,0.4)' : '#DC3C14',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        boxShadow: loading ? 'none' : '0 4px 20px rgba(0,0,0,0.2)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {loading ? (
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                            <span style={{
                                                width: 16, height: 16,
                                                border: '2px solid rgba(0,0,0,0.2)',
                                                borderTopColor: '#DC3C14',
                                                borderRadius: '50%',
                                                animation: 'authSpin 0.8s linear infinite'
                                            }} />
                                            {mode === 'signup' ? 'Creando tu espacio...' : 'Ingresando...'}
                                        </span>
                                    ) : (
                                        mode === 'signup' ? 'Comenzar prueba gratis →' : 'Iniciar sesión →'
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* MODE TOGGLE */}
                    <p style={{
                        color: 'rgba(255,255,255,0.7)', fontSize: 14,
                        textAlign: 'center', margin: 0
                    }}>
                        {mode === 'signup' ? (
                            <>
                                ¿Ya tienes cuenta?{' '}
                                <button
                                    onClick={() => { setMode('login'); setShowEmailForm(true); setError(null) }}
                                    style={{
                                        background: 'none', border: 'none',
                                        color: 'white', fontWeight: 600,
                                        cursor: 'pointer', textDecoration: 'underline',
                                        fontSize: 14, padding: 0
                                    }}
                                >
                                    Inicia Sesión
                                </button>
                            </>
                        ) : (
                            <>
                                ¿Eres nuevo?{' '}
                                <button
                                    onClick={() => { setMode('signup'); setShowEmailForm(true); setError(null) }}
                                    style={{
                                        background: 'none', border: 'none',
                                        color: 'white', fontWeight: 600,
                                        cursor: 'pointer', textDecoration: 'underline',
                                        fontSize: 14, padding: 0
                                    }}
                                >
                                    Regístrate
                                </button>
                            </>
                        )}
                    </p>
                </div>
            </div>

            {/* ANIMATIONS */}
            <style>{`
                @keyframes authSpin {
                    to { transform: rotate(360deg); }
                }
                input::placeholder {
                    color: #9CA3AF;
                }
                input:focus {
                    border-color: rgba(255,255,255,0.5) !important;
                    box-shadow: 0 0 0 3px rgba(255,255,255,0.1) !important;
                }
            `}</style>
        </div>
    )
}

// ============================
// SHARED STYLES
// ============================
const labelStyle = {
    display: 'block', color: 'rgba(255,255,255,0.8)',
    fontSize: 12, fontWeight: 600, marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: '0.03em'
}

const iconWrapStyle = {
    position: 'absolute', left: 14, top: '50%',
    transform: 'translateY(-50%)', pointerEvents: 'none'
}

const inputStyle = {
    width: '100%', padding: '14px 16px 14px 46px',
    borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)',
    fontSize: 15, color: '#1F2937', background: 'rgba(255,255,255,0.92)',
    boxSizing: 'border-box', outline: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'border-color 0.2s, box-shadow 0.2s'
}

export default TrialSignup
