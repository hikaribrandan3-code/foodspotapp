/**
 * TrialSignup.jsx — Strike 12: Premier Auth Screen
 * 
 * Premium full-bleed auth screen with:
 * - Login: Cinematic cinematic bright light mode
 * - Signup: Dark mode "Culinary OS" theme with responsive split-screen and floating nav
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
    strength: 'SECURITY STRENGTH',
    good: 'GOURMET READY',
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
    strength: 'SEGURIDAD',
    good: 'LISTA PARA GOURMET',
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
    strength: 'FORÇA',
    good: 'PRONTA GOURMET',
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
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');
                
                .material-symbols-outlined {
                    font-family: 'Material Symbols Outlined', sans-serif;
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
                
                /* ================================== */
                /* DARK MODE SIGNUP STYLES (Culinary OS)*/
                /* ================================== */
                :root {
                    --bg-dark: #0e0e0e;
                    --primary: #ff8f76;
                    --primary-fixed: #ff785a;
                    --on-primary-fixed: #000000;
                    --surface-highest: #262626;
                    --surface-low: #131313;
                    --on-surface-variant: #adaaaa;
                    --outline-variant: #484847;
                }
                .dm-wrapper {
                    background-color: var(--bg-dark);
                    color: white;
                    font-family: 'Be Vietnam Pro', sans-serif;
                    min-height: 100dvh;
                    overflow-x: hidden;
                    position: relative;
                }
                .dm-hero-bg {
                    position: fixed; inset: 0; z-index: 0; pointer-events: none;
                }
                .dm-hero-gradient {
                    position: absolute; inset: 0; background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.4), black); z-index: 10;
                }
                .dm-hero-img {
                    width: 100%; height: 100%; object-fit: cover; transform: scale(1.05); opacity: 0.6;
                }
                
                /* Top Nav */
                .dm-nav { position: fixed; top: 0; width: 100%; z-index: 50; display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; }
                
                /* Main Grid */
                .dm-main { position: relative; z-index: 20; min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 6rem 1rem 5rem 1rem; }
                .dm-grid { max-width: 80rem; width: 100%; display: grid; gap: 3rem; align-items: center; }
                
                /* Media Queries */
                @media (min-width: 1024px) {
                    .dm-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                }

                /* Typography */
                .dm-text-center { text-align: center; }
                @media (min-width: 1024px) { .dm-text-center { text-align: left; padding-right: 3rem; } }
                
                .dm-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 9999px; border: 1px solid rgba(255, 143, 118, 0.2); background: rgba(255,255,255,0.03); backdrop-filter: blur(24px); }
                
                .dm-h1 { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 3rem; line-height: 0.9; letter-spacing: -0.05em; color: white; text-shadow: 0 0 20px rgba(255, 143, 118, 0.4); margin-top: 1.5rem; margin-bottom: 2rem; }
                @media (min-width: 768px) { .dm-h1 { font-size: 4.5rem; } }
                @media (min-width: 1024px) { .dm-h1 { font-size: 5rem; } }
                
                .dm-p { font-size: 1.25rem; color: var(--on-surface-variant); font-weight: 500; max-width: 36rem; line-height: 1.6; margin: 0 auto 1rem auto; }
                @media (min-width: 1024px) { .dm-p { margin: 0 0 1rem 0; } }

                /* Flex List */
                .dm-features { display: flex; flex-wrap: wrap; gap: 1.5rem; padding-top: 1rem; justify-content: center; }
                @media (min-width: 1024px) { .dm-features { justify-content: flex-start; } }
                
                .dm-feature-icon { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background: var(--surface-highest); display: flex; align-items: center; justify-content: center; }

                /* Glass Card */
                .dm-glass-wrapper { position: relative; }
                .dm-glow { position: absolute; inset: -1rem; background: rgba(255, 143, 118, 0.2); filter: blur(80px); border-radius: 9999px; pointer-events: none; }
                .dm-glass-card {
                    position: relative; background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 3rem; padding: 2rem;
                    box-shadow: 0px 40px 80px -20px rgba(255, 87, 51, 0.25), 0px 20px 40px rgba(0, 0, 0, 0.6);
                }
                @media (min-width: 768px) { .dm-glass-card { padding: 3rem; } }

                /* Forms */
                .dm-input-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--on-surface-variant); padding: 0 0.25rem; margin-bottom: 0.5rem; display: block; }
                .dm-input-box { position: relative; display: flex; align-items: center; }
                .dm-input { width: 100%; background: rgba(38,38,38,0.5); border: none; border-radius: 1rem; padding: 1rem 1rem 1rem 3rem; color: white; transition: all 0.2s; }
                .dm-input:focus { outline: none; box-shadow: 0 0 0 2px rgba(255, 143, 118, 0.5); }
                .dm-input::placeholder { color: rgba(173, 170, 170, 0.4); }
                .dm-icon { position: absolute; left: 1rem; color: var(--on-surface-variant); transition: color 0.2s; }
                .dm-input:focus + .dm-icon, .dm-input-box:focus-within .dm-icon { color: var(--primary); }

                /* Primary Button */
                .dm-btn-primary {
                    width: 100%; background: var(--primary-fixed); color: var(--on-primary-fixed); padding: 1.25rem; border-radius: 9999px; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.125rem; text-transform: uppercase; letter-spacing: 0.05em; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 15px -3px rgba(255, 143, 118, 0.2);
                    margin-top: 2rem;
                }
                .dm-btn-primary:active { transform: scale(0.95); }

                /* Floating Nav */
                .dm-floating-nav {
                    position: fixed; bottom: 0; left: 0; width: 100%; z-index: 50; display: flex; justify-content: space-around; align-items: center; padding: 1rem 1rem 1.5rem 1rem; background: rgba(14,14,14,0.8); backdrop-filter: blur(24px); border-radius: 2rem 2rem 0 0; box-shadow: 0px -20px 40px rgba(0,0,0,0.4);
                }
                .dm-nav-item {
                    display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--on-surface-variant); text-decoration: none; transition: all 0.3s; padding: 0.5rem; cursor: pointer;
                }
                .dm-nav-item:hover { color: white; }
                .dm-nav-item.active { color: #ff5c39; transform: scale(1.1); }
                .dm-nav-label { font-family: 'Be Vietnam Pro', sans-serif; font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0.25rem; }

                /* Floating Decoration */
                .dm-float-deco { position: absolute; bottom: -2rem; right: -2rem; width: 8rem; height: 8rem; border-radius: 1.5rem; display: flex; align-items: center; justify-content: center; transform: rotate(12deg); border: 1px solid rgba(255, 143, 118, 0.4); background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(24px); box-shadow: 0px 40px 80px -20px rgba(255, 87, 51, 0.25), 0px 20px 40px rgba(0, 0, 0, 0.6); display: none; }
                @media (min-width: 768px) { .dm-float-deco { display: flex; } }

                /* Secondary Button */
                .dm-social-btn {
                    flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; border-radius: 1rem; background: var(--surface-highest); color: white; border: none; cursor: pointer; transition: background 0.2s;
                }
                .dm-social-btn:hover { background: rgba(38,38,38,0.8); }

                /* ================================== */
                /* LOGIN LIGHT STYLES                 */
                /* ================================== */
                .login-cinematic-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scale(1.1); }
                .login-gradient-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0, 88, 188, 0.4), rgba(0, 0, 0, 0.6)); mix-blend-mode: multiply; }
                .glass-card-login { background: rgba(247, 249, 251, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 32px; box-shadow: 0px 20px 40px rgba(0, 88, 188, 0.15); }
                .btn-primary { background: linear-gradient(to bottom right, #0058bc, #0070eb); color: white; padding: 16px 32px; border-radius: 9999px; font-weight: 700; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 10px 20px rgba(0, 88, 188, 0.2); border: none; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; }
                .social-btn { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px 16px; background: #ffffff; border: 1px solid rgba(193, 198, 215, 0.2); border-radius: 9999px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); cursor: pointer; transition: background 0.2s, transform 0.2s; font-weight: 700; color: #191c1e; }
            `}</style>

            {mode === 'signup' ? (
                <div className="dm-wrapper">
                    {/* Hero Background */}
                    <div className="dm-hero-bg">
                        <div className="dm-hero-gradient"></div>
                        <img className="dm-hero-img" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4E7XYx2ZjDvx6ntI5oFq9nX98OsUxwRVdEzyOQ7fRmCSXpvN_ILKYn9vWuk01lcHqxzC8TVUYqIcNUqGjzgduax3rwYyFgPBIkz4OSPpKeEpWxIMlcKrMLxJ2oGEO1_agJB4B2EutVtrioCEEEbwcknPcHVc-Gur71hdWwyw9J92INZRg5SujiKhlAiqmmfzQL1SBfhU0vH8bHgSWyOV5ZnrwHfKFkVCMnBdfFgufuDYid5_-XPXMfXlaldejcPTe7rwNRDcn3kFe" alt="Culinary OS Festival" />
                    </div>

                    {/* Top Navigation */}
                    <header className="dm-nav">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.05em', fontSize: '1.5rem', fontStyle: 'italic', color: 'white' }}>FoodSpot</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: '"Be Vietnam Pro", sans-serif', fontWeight: 700 }}>{l.login}</button>
                            <button onClick={handleTranslate} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                                <span className="material-symbols-outlined">language</span>
                                {lang.toUpperCase()}
                            </button>
                        </div>
                    </header>

                    <main className="dm-main">
                        <div className="dm-grid">
                            {/* Headline Section */}
                            <div className="dm-text-center">
                                <div className="dm-badge">
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff8f76' }}></span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.2em', color: '#ff8f76', textTransform: 'uppercase' }}>Summer Festival Edition</span>
                                </div>
                                <h1 className="dm-h1">
                                    The First <span style={{ color: '#ff8f76', fontStyle: 'italic' }}>UGC-Driven</span> Culinary OS.
                                </h1>
                                <p className="dm-p">
                                    Turn Every Customer into a Creator. Engineered for Pop-ups, Festivals, and the On-the-Go Hustle.
                                </p>
                                
                                <div className="dm-features">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div className="dm-feature-icon">
                                            <span className="material-symbols-outlined" style={{ color: '#ff8f76', fontVariationSettings: "'FILL' 1" }}>restaurant_menu</span>
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.025em' }}>Live Menus</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div className="dm-feature-icon">
                                            <span className="material-symbols-outlined" style={{ color: '#ff8f76', fontVariationSettings: "'FILL' 1" }}>bolt</span>
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.025em' }}>Instant Checkout</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div className="dm-feature-icon">
                                            <span className="material-symbols-outlined" style={{ color: '#ff8f76', fontVariationSettings: "'FILL' 1" }}>groups</span>
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.025em' }}>Creator Loop</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Login/Signup Card */}
                            <div className="dm-glass-wrapper">
                                <div className="dm-glow"></div>
                                <div className="dm-glass-card">
                                    
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h2 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: '1.875rem', color: 'white', margin: 0 }}>Get Cooking</h2>
                                        <p style={{ color: '#adaaaa', marginTop: '0.5rem', margin: 0 }}>Join the hustle in under 60 seconds.</p>
                                    </div>
                                    
                                    {error && <div style={{ background: '#490013', color: '#ffb2b9', padding: '12px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}
                                    
                                    <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        
                                        <div>
                                            <label className="dm-input-label">{l.businessName}</label>
                                            <div className="dm-input-box">
                                                <span className="material-symbols-outlined dm-icon">storefront</span>
                                                <input className="dm-input" type="text" placeholder={l.businessPlaceholder} value={businessName} onChange={e => setBusinessName(e.target.value)} required disabled={loading} />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="dm-input-label">{l.emailLabel}</label>
                                            <div className="dm-input-box">
                                                <span className="material-symbols-outlined dm-icon">alternate_email</span>
                                                <input className="dm-input" type="email" placeholder={l.emailPlaceholder} value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label className="dm-input-label" style={{ marginBottom: 0 }}>{l.passwordLabel}</label>
                                                <a href="#" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ff8f76', textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); setMode('login'); }}>{l.alreadyHaveAccount}</a>
                                            </div>
                                            <div className="dm-input-box" style={{ marginTop: '0.5rem' }}>
                                                <span className="material-symbols-outlined dm-icon">lock_open</span>
                                                <input className="dm-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} disabled={loading} />
                                            </div>
                                            
                                            <div style={{ paddingTop: '0.5rem', paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.05em' }}>
                                                    <span style={{ color: '#adaaaa' }}>{l.strength}</span>
                                                    <span style={{ color: '#ff8f76' }}>{password.length > 5 ? l.good : password.length > 0 ? l.moderate : l.weak}</span>
                                                </div>
                                                <div style={{ height: '0.25rem', width: '100%', backgroundColor: '#262626', borderRadius: '9999px', overflow: 'hidden', display: 'flex', gap: '0.25rem' }}>
                                                    <div style={{ height: '100%', width: '25%', backgroundColor: password.length > 0 ? '#ff8f76' : 'transparent', borderRadius: '9999px' }}></div>
                                                    <div style={{ height: '100%', width: '25%', backgroundColor: password.length > 3 ? '#ff8f76' : 'transparent', borderRadius: '9999px' }}></div>
                                                    <div style={{ height: '100%', width: '25%', backgroundColor: password.length > 5 ? '#ff8f76' : 'transparent', borderRadius: '9999px' }}></div>
                                                    <div style={{ height: '100%', width: '25%', backgroundColor: password.length > 8 ? '#ff8f76' : 'rgba(19, 19, 19, 1)', borderRadius: '9999px' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button type="submit" disabled={loading} className="dm-btn-primary">
                                            {loading ? l.processing : l.startFreeTrial}
                                        </button>
                                        
                                    </form>
                                    
                                    <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                                            <div style={{ height: '1px', flex: 1, backgroundColor: 'rgba(72, 72, 71, 0.3)' }}></div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#adaaaa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l.orContinueWith}</span>
                                            <div style={{ height: '1px', flex: 1, backgroundColor: 'rgba(72, 72, 71, 0.3)' }}></div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                                            <button type="button" onClick={handleGoogleLogin} className="dm-social-btn">
                                                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>group_add</span>
                                                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{l.google}</span>
                                            </button>
                                            <button type="button" onClick={() => document.querySelector('input[type="email"]')?.focus()} className="dm-social-btn">
                                                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>email</span>
                                                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{l.email}</span>
                                            </button>
                                        </div>
                                    </div>
                                    
                                </div>
                                {/* Floating Antigravity Item */}
                                <div className="dm-float-deco">
                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{ display: 'block', fontSize: '1.875rem', fontWeight: 900, color: '#ff8f76', fontStyle: 'italic', lineHeight: 1 }}>14</span>
                                        <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: '#adaaaa' }}>Day Trial</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* Bottom Navigation */}
                    <nav className="dm-floating-nav">
                        <div className="dm-nav-item active">
                            <span className="material-symbols-outlined">explore</span>
                            <span className="dm-nav-label">Discover</span>
                        </div>
                        <div className="dm-nav-item">
                            <span className="material-symbols-outlined">local_fire_department</span>
                            <span className="dm-nav-label">Hustle</span>
                        </div>
                        <div className="dm-nav-item">
                            <span className="material-symbols-outlined">camera</span>
                            <span className="dm-nav-label">Creator</span>
                        </div>
                        <div className="dm-nav-item">
                            <span className="material-symbols-outlined">person</span>
                            <span className="dm-nav-label">Profile</span>
                        </div>
                    </nav>
                </div>
            ) : (
                <div style={{ minHeight: '100dvh', fontFamily: '"Montserrat", sans-serif', color: '#191c1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', backgroundColor: '#f7f9fb' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 0 }}>
                        <img className="login-cinematic-img" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHY_u1BxiUSrKWO-DeRh3p3YLyGmCL_kJvTiVl17WsnqsVGUD0JoLVsPsaEgkMH8pVJvyPj2zYe84d8k35MAM2jVHOFtDoF7_M1Ym_tKg7aj9r88B1grMY_Yvaq2fAFRog_-mhSu7Qu1sjuxl3uTjxbqlWb2T6ZAKDJ53IcmjH7JQtZlQk4BvT0SvZyX6tL88FsSZBpgLHx-MrTwJsZMY6KQOnPo8HXzFhOp8bYHbMMIeEJhV5C1_8MCfMfop2HIr9I65o3e-V66Nw" alt="Vibrant street food" />
                        <div className="login-gradient-overlay"></div>
                    </div>
                    
                    <button 
                        onClick={handleTranslate}
                        style={{ 
                            position: 'fixed', top: 24, right: 24, zIndex: 1000, 
                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', 
                            WebkitBackdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.2)', color: 'white', 
                            padding: '8px 16px', borderRadius: 20, cursor: 'pointer', 
                            fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>translate</span>
                        {lang.toUpperCase()}
                    </button>
                    
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
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#191c1e' }}>group_add</span>
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
