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

            // STRIKE 13.1: TENANT/SLUG ARCHITECTURE ENFORCEMENT
            const user = data.user
            let metadata = user?.user_metadata || {}
            let slug = metadata.slug

            // ---------------------------------------------------------
            // 🛡️ SELF-HEALING: Database Lookup Fallback for Legacy Users
            // If slug is missing in metadata, check the branding table
            // ---------------------------------------------------------
            if (!slug) {
                console.warn('[AUTH] Missing slug in metadata. Attempting DB recovery...')

                // STAGE 1: Find Business ID from Profiles
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('business_id')
                    .eq('id', user.id)
                    .single()

                if (profileData?.business_id) {
                    // STAGE 2: Find Slug from Branding using Business ID
                    const { data: brandingData, error: brandingError } = await supabase
                        .from('branding')
                        .select('slug')
                        .eq('business_id', profileData.business_id)
                        .single()

                    if (brandingData?.slug) {
                        slug = brandingData.slug
                        console.log('[AUTH] Recovered slug from DB:', slug)

                        // 🩹 HEAL: Backfill metadata for future logins (Fire & Forget)
                        supabase.auth.updateUser({
                            data: { ...metadata, slug: slug, business_id: profileData.business_id }
                        }).then(() => console.log('[AUTH] Metadata backfilled successfully'))
                    } else {
                        console.warn('[AUTH] Branding lookup failed:', brandingError)
                    }
                } else {
                    console.warn('[AUTH] Profile lookup failed:', profileError)
                }
            }

            setLoading(false)

            if (slug) {
                // If we have a slug, ALWAYS go to the tenant owner dashboard
                // This prevents owners from landing on generic /admin
                window.location.href = `/${slug}/owner`
            } else {
                // Fallback for platform admins or legacy users without slugs
                console.warn('[AUTH] No slug found anywhere. Redirecting to /admin as fallback.')
                window.location.href = '/admin'
            }

        } catch (err) {
            console.error('[AUTH] Login error:', err)

            // CRITICAL: Clear ghost sessions if login failed but state lingered
            await supabase.auth.signOut()

            setError(err.message || 'Error al iniciar sesión')
            setLoading(false)
        }
    }

    // ============================
    // RENDER: RESPONSIVE SPLIT
    // ============================



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
                /* MOBILE: Default Layout */
                .ts-desktop-shell { display: none !important; }
                .ts-mobile-shell { 
                    display: flex;
                    flex-direction: column;
                }

                /* DESKTOP: show split, hide mobile */
                @media (min-width: 1024px) {
                    .ts-desktop-shell { 
                        display: flex !important;
                        align-items: center;
                        justify-content: center;
                    }
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
                minHeight: '100vh',
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
                    <div className="ts-form-panel" style={{
                        width: '100%',
                        display: 'flex', flexDirection: 'column',
                        justifyContent: 'center', alignItems: 'center',
                        padding: '24px 0'
                    }}>
                        <div style={{ maxWidth: 400, width: '100%', margin: '0 auto' }}>
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
                                            background: 'rgba(255, 255, 255, 0.9)',
                                            backdropFilter: 'blur(8px)',
                                            WebkitBackdropFilter: 'blur(8px)',
                                            border: '1px solid rgba(255,255,255,0.5)',
                                            borderRadius: 50,
                                            display: 'flex', alignItems: 'center', gap: 14,
                                            fontSize: 14, fontWeight: 700, color: '#1F2937',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
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
                                            background: 'rgba(255, 255, 255, 0.9)',
                                            backdropFilter: 'blur(8px)',
                                            WebkitBackdropFilter: 'blur(8px)',
                                            border: '1px solid rgba(255,255,255,0.5)',
                                            borderRadius: 50,
                                            display: 'flex', alignItems: 'center', gap: 14,
                                            fontSize: 14, fontWeight: 700, color: '#1F2937',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
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
                                    borderRadius: 32,
                                    padding: 28,
                                    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                                    border: 'none',
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
                                color: 'rgba(255,255,255,0.9)',
                                fontSize: 14, textAlign: 'center', margin: 0, marginTop: 12,
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
                                        color: 'white',
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
                </div>
            </div>

            {/* ═══════════════════════════════════ */}
            {/* DESKTOP LAYOUT (≥ 1024px) — CENTERED MODAL REPLICA */}
            {/* ═══════════════════════════════════ */}
            <div className="ts-desktop-shell" style={{
                minHeight: '100vh',
                fontFamily: "'Inter', sans-serif",
                backgroundColor: '#FDF8F0', // Beige background from reference
                position: 'relative', overflow: 'hidden'
            }}>
                {/* MODAL CARD */}
                <div style={{
                    position: 'relative', zIndex: 10,
                    width: 440,
                    background: '#FFFFFF',
                    borderRadius: 32,
                    padding: '48px 40px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)',
                    textAlign: 'center'
                }}>
                    {/* LOGO HEADER */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                        <div style={{ width: 24, height: 24, marginBottom: 0 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 19V6M5 12l7-7 7 7" stroke="none" />
                                <path d="M2.05 10.5a9 9 0 0 1 17.4 3.5l1.55 1.55a9 9 0 0 1-1.55 1.55l-1.55-1.55a9 9 0 0 1-3.5 17.4" stroke="none" />
                                {/* Simple Leaf Icon Replica */}
                                <path d="M12 2L12 12" stroke="#1F2937" strokeWidth="2.5" />
                                <path d="M12 2C12 2 18 4 18 10C18 16 12 12 12 12" stroke="#1F2937" strokeWidth="2.5" fill="none" />
                                <path d="M12 2C12 2 6 4 6 10C6 16 12 12 12 12" stroke="#1F2937" strokeWidth="2.5" fill="none" />
                            </svg>
                        </div>
                        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', margin: 0, letterSpacing: '-0.02em', marginTop: -4 }}>
                            FoodSpot
                            <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#6B7280', marginTop: 2 }}>Mobile</span>
                        </h1>
                    </div>

                    {/* TITLE */}
                    <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1F2937', margin: '0 0 12px', letterSpacing: '-0.03em' }}>
                        {mode === 'signup' ? 'Empezá gratis' : '¡Hola de nuevo!'}
                    </h2>
                    <p style={{ fontSize: 15, color: '#4B5563', margin: '0 0 32px', lineHeight: 1.5 }}>
                        {mode === 'signup' ? '14 días gratis. Sin tarjeta. Cancelás cuando quieras.' : 'Ingresá a tu panel de control.'}
                    </p>

                    {/* BUTTONS (Desktop Styles) */}
                    {!showEmailForm ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* GOOGLE - ORANGE/RED */}
                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '16px',
                                    background: 'linear-gradient(135deg, #E2552D 0%, #CC3210 100%)',
                                    border: 'none', borderRadius: 50,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                                    fontSize: 16, fontWeight: 600, color: '#FFFFFF',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(220, 60, 20, 0.3)',
                                    transition: 'transform 0.1s'
                                }}
                            >
                                <div style={{ background: 'white', borderRadius: '50%', padding: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#EA4335" d="M12.48 10.92v3.28h5.22c-.2 1.05-2.55 3.3-5.22 3.3-3.15 0-5.73-2.6-5.73-5.77s2.57-5.77 5.73-5.77c1.78 0 2.96.76 3.65 1.41l2.58-2.6C16.96 2.86 14.88 2 12.48 2 6.72 2 2 6.72 2 12.5s4.72 10.5 10.48 10.5c6.04 0 10.04-4.24 10.04-10.25 0-.7-.07-1.3-.18-1.83h-9.86z"></path></svg>
                                </div>
                                Continuar con Google
                            </button>

                            <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>o</div>

                            {/* EMAIL - BLUE */}
                            <button
                                onClick={() => setShowEmailForm(true)}
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '16px',
                                    background: '#4285F4',
                                    border: 'none', borderRadius: 50,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                                    fontSize: 16, fontWeight: 600, color: '#FFFFFF',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)',
                                    transition: 'transform 0.1s'
                                }}
                            >
                                Continuar con Email
                            </button>
                        </div>
                    ) : (
                        /* EMAIL FORM (Simplified for desktop modal) */
                        <form onSubmit={mode === 'signup' ? handleSignup : handleLogin} style={{ textAlign: 'left' }}>
                            {/* ... Inputs ... Reuse Input Styles but maybe scoped? Using style={inputStyle} */}
                            {mode === 'signup' && (
                                <div style={{ marginBottom: 16 }}>
                                    <label style={labelStyle}>Nombre del Negocio</label>
                                    <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ej: Burger Palace" required style={inputStyle} />
                                </div>
                            )}
                            <div style={{ marginBottom: 16 }}>
                                <label style={labelStyle}>Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required style={inputStyle} />
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={labelStyle}>Contraseña</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 caracteres" required minLength={6} style={inputStyle} />
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button type="button" onClick={() => setShowEmailForm(false)} style={{ flex: 1, padding: 14, background: '#F3F4F6', border: 'none', borderRadius: 12, color: '#4B5563', fontWeight: 600, cursor: 'pointer' }}>Volver</button>
                                <button type="submit" disabled={loading} style={{ flex: 2, padding: 14, background: '#DC3C14', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                                    {loading ? '...' : 'Continuar'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* FOOTER */}
                    <p style={{ marginTop: 32, fontSize: 13, color: '#6B7280' }}>
                        {mode === 'signup' ? '¿Ya tenés cuenta? ' : '¿Sos nuevo? '}
                        <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null); setShowEmailForm(false) }}
                            style={{ background: 'none', border: 'none', color: '#1F2937', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                            {mode === 'signup' ? 'Inicia sesión' : 'Registrate'}
                        </button>
                    </p>
                </div>
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
