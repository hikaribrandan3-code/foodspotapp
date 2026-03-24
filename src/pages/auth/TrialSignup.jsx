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
// 🌍 TRANSLATIONS
// ============================================
const t = {
  en: {
    mobileTitle: 'FoodSpot Mobile',
    subtitleSignup: 'Elevate your culinary business',
    createAccount: 'Create your account',
    joinNetwork: 'Join the elite network of food creators.',
    businessName: 'BUSINESS NAME',
    businessPlaceholder: 'e.g., Burger Palace',
    emailLabel: 'EMAIL ADDRESS',
    emailPlaceholder: 'chef@restaurant.com',
    passwordLabel: 'PASSWORD',
    strength: 'STRENGTH:',
    good: 'GOOD',
    moderate: 'MODERATE',
    weak: 'WEAK',
    avoid123: "Avoid '123456'",
    startFreeTrial: 'Start free trial',
    processing: 'Processing...',
    orContinueWith: 'Or continue with',
    alreadyHaveAccount: 'Already have an account?',
    login: 'Log in',
    bySigningUp: "By signing up, you agree to FoodSpot's",
    tos: 'Terms of Service',
    and: 'and',
    privacy: 'Privacy Policy',
    welcome: 'Welcome',
    discoverFlavors: 'Discover the best flavors around you',
    forgot: 'FORGOT?',
    newHere: 'New here?',
    signUp: 'Sign up',
    exploreTasteShare: 'Explore • Taste • Share',
    google: 'Google',
    email: 'Email',
    apple: 'Apple'
  },
  es: {
    mobileTitle: 'FoodSpot Mobile',
    subtitleSignup: 'Eleva tu negocio culinario',
    createAccount: 'Crea tu cuenta',
    joinNetwork: 'Únete a la red élite de creadores.',
    businessName: 'NOMBRE DEL NEGOCIO',
    businessPlaceholder: 'ej. Burger Palace',
    emailLabel: 'CORREO ELECTRÓNICO',
    emailPlaceholder: 'chef@restaurante.com',
    passwordLabel: 'CONTRASEÑA',
    strength: 'SEGURIDAD:',
    good: 'ALTA',
    moderate: 'MEDIA',
    weak: 'BAJA',
    avoid123: "Evita '123456'",
    startFreeTrial: 'Comenzar prueba gratis',
    processing: 'Procesando...',
    orContinueWith: 'O continúa con',
    alreadyHaveAccount: '¿Ya tienes cuenta?',
    login: 'Iniciar sesión',
    bySigningUp: "Al registrarte, aceptas los",
    tos: 'Términos de Servicio',
    and: 'y la',
    privacy: 'Política de Privacidad',
    welcome: 'Bienvenido',
    discoverFlavors: 'Descubre los mejores sabores a tu alrededor',
    forgot: '¿OLVIDASTE?',
    newHere: '¿Eres nuevo?',
    signUp: 'Regístrate',
    exploreTasteShare: 'Explora • Prueba • Comparte',
    google: 'Google',
    email: 'Email',
    apple: 'Apple'
  },
  pt: {
    mobileTitle: 'FoodSpot Mobile',
    subtitleSignup: 'Eleve o seu negócio culinário',
    createAccount: 'Crie sua conta',
    joinNetwork: 'Junte-se à rede de criadores de elite.',
    businessName: 'NOME DO NEGÓCIO',
    businessPlaceholder: 'ex: Burger Palace',
    emailLabel: 'ENDEREÇO DE EMAIL',
    emailPlaceholder: 'chef@restaurante.com',
    passwordLabel: 'SENHA',
    strength: 'FORÇA:',
    good: 'ALTA',
    moderate: 'MEDIA',
    weak: 'BAIXA',
    avoid123: "Evite '123456'",
    startFreeTrial: 'Começar teste grátis',
    processing: 'Processando...',
    orContinueWith: 'Ou continue com',
    alreadyHaveAccount: 'Já tem uma conta?',
    login: 'Entrar',
    bySigningUp: "Ao se cadastrar, você concorda com os",
    tos: 'Termos de Serviço',
    and: 'e a',
    privacy: 'Política de Privacidade',
    welcome: 'Bem-vindo',
    discoverFlavors: 'Descubra os melhores sabores ao seu redor',
    forgot: 'ESQUECEU?',
    newHere: 'É novo aqui?',
    signUp: 'Cadastre-se',
    exploreTasteShare: 'Explore • Prove • Compartilhe',
    google: 'Google',
    email: 'Email',
    apple: 'Apple'
  }
}

// ============================================
// 🔐 PREMIER AUTH SCREEN (Strike 12)
// ============================================

const TrialSignup = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    // Performance: Respect user's motion preferences
    const prefersReducedMotion = typeof window !== 'undefined' 
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
        : false

    // UI State
    const [mode, setMode] = useState('signup') // 'signup' | 'login'
    const [lang, setLang] = useState('en')
    const [showEmailForm, setShowEmailForm] = useState(false)

    // Form state
    const [businessName, setBusinessName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    
    // Quick Reference to localized copy
    const l = t[lang]

    // Pre-fill business name from URL param
    useEffect(() => {
        const nameParam = searchParams.get('name')
        if (nameParam) {
            setBusinessName(decodeURIComponent(nameParam))
        }
    }, [searchParams])

    // ============================
    // GLOBAL AUTH STATE LISTENER
    // Automatically redirect when Google OAuth completes
    // ============================
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const user = session.user
                let metadata = user.user_metadata || {}
                let slug = metadata.slug
                let role = metadata.role || 'owner'

                // Self-healing fallback for slug
                if (!slug) {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('business_id')
                        .eq('id', user.id)
                        .single()

                    if (profileData?.business_id) {
                        const { data: brandingData } = await supabase
                            .from('branding')
                            .select('slug')
                            .eq('business_id', profileData.business_id)
                            .single()

                        if (brandingData?.slug) {
                            slug = brandingData.slug
                            supabase.auth.updateUser({
                                data: { ...metadata, slug: slug, business_id: profileData.business_id }
                            })
                        }
                    }
                }

                // Redirect based on role
                if (slug) {
                    if (role === 'customer') {
                        window.location.replace(`/${slug}/menu`)
                    } else if (role === 'staff') {
                        window.location.replace(`/${slug}/staff/dashboard`)
                    } else {
                        window.location.replace(`/${slug}/owner/summary`)
                    }
                } else {
                    window.location.replace('/admin')
                }
            }
        })

        return () => subscription?.unsubscribe()
    }, [])

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
            window.location.href = `/${slug}/owner/summary`

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
                // If we have a slug, ALWAYS go to the tenant owner SUMMARY (not /owner which is OwnerLogin)
                // This prevents the double-login problem
                console.log("🚀 [TrialSignup] SUCCESS: Redirecting to owner dashboard:", `/${slug}/owner/summary`);
                window.location.assign(`/${slug}/owner/summary`);
                return; // Stop any downstream logic
            } else {
                // Fallback for platform admins or legacy users without slugs
                console.warn('⚠️ [TrialSignup] WARNING: No slug found after DB lookup. Redirecting to /admin as last resort.')
                console.warn('⚠️ [TrialSignup] User ID:', user.id);
                console.warn('⚠️ [TrialSignup] Metadata:', metadata);
                window.location.assign('/admin');
                return;
            }

        } catch (err) {
            console.error('🛑 [TrialSignup] Login CRITICAL error:', err)

            // CRITICAL: Clear ghost sessions if login failed but state lingered
            await supabase.auth.signOut()

            setError(err.message || 'Error al iniciar sesión')
            setLoading(false)
        }
    }

    // Toggle Language Handler
    const handleTranslate = () => {
        setLang(current => {
            if (current === 'en') return 'es'
            if (current === 'es') return 'pt'
            return 'en'
        })
    }

    // ============================
    // RENDER
    // ============================

    return (
        <>
            <style>{`
                /* Material Symbols Setup */
                .material-symbols-outlined {
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                    display: inline-block;
                    line-height: 1;
                }
                
                /* Global Animations */
                .ts-btn:hover { transform: scale(1.02); }
                .ts-btn:active { transform: scale(0.98); }
                
                .ts-input::placeholder { color: #c1c6d7; }
                .ts-input:focus {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(0, 88, 188, 0.2);
                }
                
                /* Sign Up specific hero bg */
                .signup-hero-bg {
                    background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.6)), url(https://lh3.googleusercontent.com/aida-public/AB6AXuAwbRWIbTSOLmazpgRD0jJQ-dY3mjTSoUE8FPmHn9gqca4PcdTMcSz4y9SOQJeXvinys-9mN5MOHpB1KbcmqKA2ArSsjQmr3yqxdHgVtLnnjizH4KXLgwbU9uClN1EgiaeMq-IhWv9gZ0OXPa2WvK0vcwI6fXoD3mDfdI28FWP1_PG10NeNN1zpu25UCGDtf_Mkb3KrjtjQ1nNZQLXY7BD32-rSVgah9vsTeGANvBPDAObs34KtWlV7jDOtMVg9IVNoSQX2DMXko0eF);
                    background-size: cover;
                    background-position: center;
                }
                
                /* Login cinematic bg image layer */
                .login-cinematic-img {
                    position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scale(1.1);
                }
                .login-gradient-overlay {
                    position: absolute; inset: 0; background: linear-gradient(to top, rgba(0, 88, 188, 0.4), rgba(0, 0, 0, 0.6)); mix-blend-mode: multiply;
                }
                
                /* Glassmorphism Classes */
                .glass-card-signup {
                    background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
                    border: 1px solid rgba(0, 122, 255, 0.1); border-radius: 16px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }
                
                .glass-card-login {
                    background: rgba(247, 249, 251, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 32px; box-shadow: 0px 20px 40px rgba(0, 88, 188, 0.15);
                }
                
                /* Modifiers */
                .btn-primary {
                    background: linear-gradient(to bottom right, #0058bc, #0070eb); color: white; padding: 16px 32px;
                    border-radius: 9999px; font-weight: 700; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 10px 20px rgba(0, 88, 188, 0.2);
                    border: none; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
                }
                .btn-primary:active { transform: scale(0.98); box-shadow: none; }
                
                .social-btn {
                    display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px 16px;
                    background: #ffffff; border: 1px solid rgba(193, 198, 215, 0.2); border-radius: 9999px;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); cursor: pointer; transition: background 0.2s, transform 0.2s; font-weight: 700; color: #191c1e;
                }
                .social-btn:hover { background: #f2f4f6; }
                .social-btn:active { transform: scale(0.95); }
            `}</style>
            
            {/* Global Floating Language Translator Button */}
            <button 
                onClick={handleTranslate}
                style={{ 
                    position: 'absolute', top: 24, right: 24, zIndex: 100, 
                    background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)', 
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.4)', color: 'white', 
                    padding: '8px 16px', borderRadius: 20, cursor: 'pointer', 
                    fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>translate</span>
                {lang.toUpperCase()}
            </button>

            {mode === 'signup' ? (
                <div className="signup-hero-bg" style={{ minHeight: '100dvh', fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#191c1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative' }}>
                    <main style={{ width: '100%', maxWidth: '448px', margin: '32px 0' }}>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
                            <h1 style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 900, fontSize: '40px', color: '#ffffff', letterSpacing: '-0.05em', margin: 0, textShadow: '0 4px 6px rgba(0,0,0,0.3)', transform: 'scale(1.1)' }}>{l.mobileTitle}</h1>
                            <p style={{ color: 'rgba(255,255,255,0.9)', marginTop: '12px', fontWeight: 600, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{l.subtitleSignup}</p>
                        </div>
                        
                        {error && (
                            <div style={{ background: '#ffdad6', color: '#ba1a1a', padding: '12px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>
                        )}

                        <div className="glass-card-signup">
                            <div style={{ marginBottom: '32px' }}>
                                <h2 style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 800, fontSize: '24px', margin: 0 }}>{l.createAccount}</h2>
                                <p style={{ color: '#586377', fontSize: '14px', marginTop: '4px', margin: 0 }}>{l.joinNetwork}</p>
                            </div>
                            
                            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontFamily: '"Montserrat", sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#586377', marginLeft: '4px' }}>{l.businessName}</label>
                                    <input className="ts-input" type="text" placeholder={l.businessPlaceholder} value={businessName} onChange={e => setBusinessName(e.target.value)} required disabled={loading} style={{ width: '100%', background: '#f2f4f6', border: 'none', borderRadius: '6px', padding: '16px 20px', color: '#191c1e', fontWeight: 600 }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontFamily: '"Montserrat", sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#586377', marginLeft: '4px' }}>{l.emailLabel}</label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <span className="material-symbols-outlined" style={{ position: 'absolute', left: '16px', color: '#0058bc' }}>mail</span>
                                        <input className="ts-input" type="email" placeholder={l.emailPlaceholder} value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} style={{ width: '100%', background: '#f2f4f6', border: 'none', borderRadius: '6px', padding: '16px 20px 16px 48px', color: '#191c1e', fontWeight: 600 }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontFamily: '"Montserrat", sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#586377', marginLeft: '4px' }}>{l.passwordLabel}</label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <span className="material-symbols-outlined" style={{ position: 'absolute', left: '16px', color: '#0058bc' }}>lock</span>
                                        <input className="ts-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} disabled={loading} style={{ width: '100%', background: '#f2f4f6', border: 'none', borderRadius: '6px', padding: '16px 48px', color: '#191c1e', fontWeight: 600 }} />
                                    </div>
                                    <div style={{ paddingTop: '8px', paddingLeft: '4px', paddingRight: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#586377' }}>{l.strength} {password.length > 5 ? l.good : password.length > 0 ? l.moderate : l.weak}</span>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#9e3d00' }}>{l.avoid123}</span>
                                        </div>
                                        <div style={{ height: '6px', width: '100%', background: '#e6e8ea', borderRadius: '9999px', overflow: 'hidden', display: 'flex', gap: '2px' }}>
                                            <div style={{ height: '100%', width: '33.33%', background: password.length > 0 ? '#9e3d00' : 'transparent', borderRadius: '9999px' }}></div>
                                            <div style={{ height: '100%', width: '33.33%', background: password.length > 5 ? 'rgba(0, 88, 188, 0.6)' : 'transparent', borderRadius: '9999px' }}></div>
                                            <div style={{ height: '100%', width: '33.33%', background: password.length > 8 ? '#0058bc' : 'transparent', borderRadius: '9999px' }}></div>
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '16px', padding: '18px' }}>
                                    {loading ? l.processing : l.startFreeTrial}
                                </button>
                            </form>
                            
                            <div style={{ position: 'relative', margin: '32px 0' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: '100%', borderTop: '1px solid rgba(193, 198, 215, 0.5)' }}></div>
                                </div>
                                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                                    <span style={{ background: '#ffffff', padding: '0 16px', color: '#586377', opacity: 0.9 }}>{l.orContinueWith}</span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button type="button" onClick={handleGoogleLogin} disabled={loading} className="social-btn" style={{ flex: 1 }}>
                                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvoDfKDiuMJl1Schk_jYlonI9Ak2qxMNG2ce5EIF2O_FwFCu1U1VUknDhCrjkId-cYpXhXcGi8TQqQk9lnZ5cNsejz0y69g2Ecar2hNuQbwSqlILIsneGl8qZTIv8KoZGC2hz22GswAIyz_mn4Wz0HjArG41ZODqO_Wb_gCuhNiSE4F0JlNrkRIEH32UQ1ZgETf9Ek1cNH3WVrX9lFWUDf1N4PBL322dHeCXt8ZuEIb53-8XWxJBdwpxUwh1xP10py8o9chTnJcPlY" alt="Google" style={{ width: 16, height: 16 }} />
                                    <span style={{ fontFamily: '"Montserrat", sans-serif', fontSize: '12px' }}>{l.google}</span>
                                </button>
                                <button type="button" onClick={() => document.querySelector('input[type="email"]')?.focus()} className="social-btn" style={{ flex: 1 }}>
                                    <span className="material-symbols-outlined" style={{ color: '#191c1e', opacity: 0.7, fontSize: 18 }}>mail</span>
                                    <span style={{ fontFamily: '"Montserrat", sans-serif', fontSize: '12px' }}>{l.email}</span>
                                </button>
                            </div>
                            
                            <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '14px', color: '#586377', margin: '32px 0 0 0', fontWeight: 500 }}>
                                {l.alreadyHaveAccount}{' '}
                                <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); setError(null); }} style={{ color: '#0058bc', fontWeight: 800, textDecoration: 'none' }}>{l.login}</a>
                            </p>
                        </div>
                        
                        <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, lineHeight: 1.5, padding: '0 32px' }}>
                            {l.bySigningUp} <br/>
                            <span style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}>{l.tos}</span> {l.and} <span style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}>{l.privacy}</span>.
                        </p>
                    </main>
                </div>
            ) : (
                <div style={{ minHeight: '100dvh', fontFamily: '"Montserrat", sans-serif', color: '#191c1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', backgroundColor: '#f7f9fb' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 0 }}>
                        <img className="login-cinematic-img" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHY_u1BxiUSrKWO-DeRh3p3YLyGmCL_kJvTiVl17WsnqsVGUD0JoLVsPsaEgkMH8pVJvyPj2zYe84d8k35MAM2jVHOFtDoF7_M1Ym_tKg7aj9r88B1grMY_Yvaq2fAFRog_-mhSu7Qu1sjuxl3uTjxbqlWb2T6ZAKDJ53IcmjH7JQtZlQk4BvT0SvZyX6tL88FsSZBpgLHx-MrTwJsZMY6KQOnPo8HXzFhOp8bYHbMMIeEJhV5C1_8MCfMfop2HIr9I65o3e-V66Nw" alt="Vibrant street food" />
                        <div className="login-gradient-overlay"></div>
                    </div>
                    
                    <header style={{ position: 'absolute', top: 0, width: '100%', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
                        <div style={{ fontSize: '30px', fontWeight: 800, color: 'white', letterSpacing: '-0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '36px', fontVariationSettings: "'FILL' 1" }}>restaurant_menu</span>
                            <span style={{ fontFamily: '"Montserrat", sans-serif', textTransform: 'uppercase', letterSpacing: '0.2em' }}>FoodSpot</span>
                        </div>
                    </header>
                    
                    <main style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '448px', padding: '0 24px' }}>
                        <div className="glass-card-login">
                            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                                <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#0058bc', marginBottom: '8px', letterSpacing: '-0.025em', margin: 0 }}>{l.welcome}</h1>
                                <p style={{ color: '#586377', fontSize: '14px', fontWeight: 600, margin: 0, marginTop: '8px' }}>{l.discoverFlavors}</p>
                            </div>
                            
                            {error && (
                                <div style={{ background: '#ffdad6', color: '#ba1a1a', padding: '12px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>
                            )}
                            
                            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0058bc', marginLeft: '4px' }}>{l.emailLabel}</label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <span className="material-symbols-outlined" style={{ position: 'absolute', left: '16px', color: '#586377' }}>mail</span>
                                        <input className="ts-input" type="email" placeholder={l.emailPlaceholder} value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} style={{ width: '100%', background: '#ffffff', border: 'none', borderRadius: '8px', padding: '16px 16px 16px 48px', color: '#191c1e', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontWeight: 600 }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: '4px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0058bc', margin: 0 }}>{l.passwordLabel}</label>
                                        <a href="#" style={{ fontSize: '10px', fontWeight: 700, color: '#586377', textDecoration: 'none' }}>{l.forgot}</a>
                                    </div>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <span className="material-symbols-outlined" style={{ position: 'absolute', left: '16px', color: '#586377' }}>lock</span>
                                        <input className="ts-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} disabled={loading} style={{ width: '100%', background: '#ffffff', border: 'none', borderRadius: '8px', padding: '16px 16px 16px 48px', color: '#191c1e', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontWeight: 600 }} />
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '0', fontSize: '18px', padding: '16px', borderRadius: '9999px' }}>
                                    <span>{loading ? l.processing : l.login}</span>
                                    {!loading && <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>}
                                </button>
                            </form>
                            
                            <div style={{ display: 'flex', alignItems: 'center', margin: '32px 0' }}>
                                <div style={{ flexGrow: 1, borderTop: '1px solid rgba(193, 198, 215, 0.5)' }}></div>
                                <span style={{ margin: '0 16px', fontSize: '10px', fontWeight: 700, color: '#c1c6d7', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l.orContinueWith}</span>
                                <div style={{ flexGrow: 1, borderTop: '1px solid rgba(193, 198, 215, 0.5)' }}></div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button type="button" onClick={handleGoogleLogin} disabled={loading} className="social-btn" style={{ flex: 1, padding: '12px', fontSize: '12px' }}>
                                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuY8s_dsoFucVh5TaXd4oIju_IptYK3cJ-QJIyF6y5OUwKyBTeKs7_jA9X8s7swzDmHyrJjWQP7KltGwFfFkECKNmsVwU2UIA--h5kNKsjEjCU9xzmEWMNgVVPM8oIFbP9pZb__ixpk6q9dL_OiGpM5fhLwSYFULmZ_KWO6gp2tnvpPIfwjMPaKPTugwjVPIcmU1wz38A7dM2vrQ6meUrAr6k9rf1Q2Pc0vAuXk-JcmKoUQldCh2SLUJBmQ7WzzTJ3vuN9CQma4Tnd" alt="Google" style={{ width: 16, height: 16 }} />
                                    <span>{l.google}</span>
                                </button>
                                <button type="button" onClick={() => document.querySelector('input[type="email"]')?.focus()} className="social-btn" style={{ flex: 1, padding: '12px', fontSize: '12px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#586377' }}>alternate_email</span>
                                    <span>{l.apple}</span>
                                </button>
                            </div>
                            
                            <div style={{ marginTop: '40px', textAlign: 'center' }}>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: '#586377', margin: 0 }}>
                                    {l.newHere}{' '}
                                    <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); setError(null); }} style={{ color: '#0058bc', fontWeight: 800, textDecoration: 'none', marginLeft: '4px' }}>{l.signUp}</a>
                                </p>
                            </div>
                        </div>
                    </main>
                    
                    <div style={{ position: 'fixed', bottom: '40px', zIndex: 10, textAlign: 'center', width: '100%', padding: '0 24px', pointerEvents: 'none' }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            {l.exploreTasteShare}
                        </p>
                    </div>
                </div>
            )}
        </>
    )
}

export default TrialSignup
