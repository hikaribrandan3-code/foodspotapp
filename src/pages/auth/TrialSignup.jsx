/**
 * TrialSignup.jsx — Strike 12: Premier Auth Screen
 * 
 * Premium full-bleed auth screen with:
 * - Login: Cinematic bright light mode
 * - Signup: Dark mode "Culinary OS" theme with responsive split-screen
 * 
 * Surgical Redesign Updates:
 * - Removed font-based material icons. Using inline `SvgIcon` glyphs to fix fallback string bugs.
 * - Converted `.dm-glass-card` to High Contrast White Glassmorphism.
 * - Solid orange "Hype" #FF5733 interaction button.
 * - Removed floating bottom nav for cleaner UX flow.
 * - Overhauled Mobile spacing and typography.
 * 
 * Flow (Signup/Login):
 * - Creates Auth User + Branding Row + Storage Bucket + Redirects
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../../utils/storage.js'

// Minimalist scalable SVG Icons logic to replace Google webfonts
const SvgIcon = ({ name, color = "currentColor", size = 24 }) => {
    switch (name) {
        case 'storefront': return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        case 'mail':
        case 'alternate_email': return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        case 'lock':
        case 'lock_open': return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        case 'language': return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
        case 'restaurant_menu': return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        case 'bolt': return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        case 'groups':
        case 'group_add': return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        case 'arrow_forward': return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        default: return null;
    }
}

// ============================================
// 🌍 TRANSLATIONS
// ============================================
const t = {
  en: {
    mobileTitle: 'FoodSpot Mobile',
    subtitleSignup: 'Elevate your culinary business',
    createAccount: 'Create your account',
    joinNetwork: 'Establish your professional culinary platform.',
    businessName: 'Business Name',
    businessPlaceholder: 'e.g., Le Gourmet Bistro',
    emailLabel: 'Email Address',
    emailPlaceholder: 'owner@restaurant.com',
    passwordLabel: 'Password',
    strength: 'Security Strength',
    good: 'Enterprise Ready',
    moderate: 'Moderate',
    weak: 'Weak',
    avoid123: "Avoid common passwords",
    startFreeTrial: 'Create Business Account',
    processing: 'Processing...',
    orContinueWith: 'Or continue with',
    alreadyHaveAccount: 'Already have an account?',
    login: 'Log in',
    bySigningUp: "By signing up, you agree to FoodSpot's",
    tos: 'Terms of Service',
    and: 'and',
    privacy: 'Privacy Policy',
    welcome: 'Welcome',
    discoverFlavors: 'Sign in to your Culinary OS.',
    signInToCulinaryOS: 'Sign in to your Culinary OS.',
    forgot: 'Forgot?',
    newHere: 'New here?',
    signUp: 'Create Account',
    backToSignup: 'Back to signup',
    exploreTasteShare: 'Enterprise • Professional • Platform',
    google: 'Google',
    email: 'Email',
    apple: 'Apple'
  },
  es: {
    mobileTitle: 'FoodSpot Mobile',
    subtitleSignup: 'Plataforma culinaria profesional',
    createAccount: 'Crear cuenta empresarial',
    joinNetwork: 'Establece tu plataforma culinaria profesional.',
    businessName: 'Nombre del Negocio',
    businessPlaceholder: 'ej. Le Gourmet Bistro',
    emailLabel: 'Correo Electrónico',
    emailPlaceholder: 'propietario@restaurante.com',
    passwordLabel: 'Contraseña',
    strength: 'Seguridad',
    good: 'Listo para Empresas',
    moderate: 'Media',
    weak: 'Baja',
    avoid123: "Evita contraseñas comunes",
    startFreeTrial: 'Crear Cuenta Empresarial',
    processing: 'Procesando...',
    orContinueWith: 'O continúa con',
    alreadyHaveAccount: '¿Ya tienes cuenta?',
    login: 'Iniciar sesión',
    bySigningUp: "Al registrarte, aceptas los",
    tos: 'Términos de Servicio',
    and: 'y la',
    privacy: 'Política de Privacidad',
    welcome: 'Bienvenido',
    discoverFlavors: 'Inicia sesión en tu OS Culinario.',
    forgot: '¿Olvidaste?',
    newHere: '¿Eres nuevo?',
    signUp: 'Regístrate',
    exploreTasteShare: 'Empresa • Profesional • Plataforma',
    google: 'Google',
    email: 'Email',
    apple: 'Apple'
  },
  pt: {
    mobileTitle: 'FoodSpot Mobile',
    subtitleSignup: 'Plataforma culinária profissional',
    createAccount: 'Criar conta empresarial',
    joinNetwork: 'Estabeleça sua plataforma culinária profissional.',
    businessName: 'Nome do Negócio',
    businessPlaceholder: 'ex: Le Gourmet Bistro',
    emailLabel: 'Endereço de Email',
    emailPlaceholder: 'proprietario@restaurante.com',
    passwordLabel: 'Senha',
    strength: 'Força da Senha',
    good: 'Pronto para Empresas',
    moderate: 'Média',
    weak: 'Baixa',
    avoid123: "Evite senhas comuns",
    startFreeTrial: 'Criar Conta Empresarial',
    processing: 'Processando...',
    orContinueWith: 'Ou continue com',
    alreadyHaveAccount: 'Já tem uma conta?',
    login: 'Entrar',
    bySigningUp: "Ao se cadastrar, você concorda com os",
    tos: 'Termos de Serviço',
    and: 'e a',
    privacy: 'Política de Privacidade',
    welcome: 'Bem-vindo',
    discoverFlavors: 'Entre na sua Plataforma Culinária.',
    forgot: 'Esqueceu?',
    newHere: 'É novo aqui?',
    signUp: 'Cadastre-se',
    exploreTasteShare: 'Empresarial • Profissional • Plataforma',
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

    // UI State
    const [mode, setMode] = useState('signup') // 'signup' | 'login'
    const [lang, setLang] = useState('en')

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

            const user = data.user
            let metadata = user?.user_metadata || {}
            let slug = metadata.slug

            if (!slug) {
                console.warn('[AUTH] Missing slug in metadata. Attempting DB recovery...')

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

            setLoading(false)

            if (slug) {
                window.location.assign(`/${slug}/owner/summary`);
                return;
            } else {
                window.location.assign('/admin');
                return;
            }

        } catch (err) {
            console.error('🛑 [TrialSignup] Login CRITICAL error:', err)
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
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                
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
                    --primary: #FF5733;
                    --on-surface-variant: #adaaaa;
                }
                .dm-wrapper {
                    background-color: var(--bg-dark);
                    color: white;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    min-height: 100dvh;
                    overflow-x: hidden;
                    position: relative;
                }
                .dm-hero-bg {
                    position: fixed; inset: 0; z-index: 0; pointer-events: none;
                }
                /* OVERLAY SET TO 60% BLACK FOR MAXIMUM CONTRAST AS REQUESTED */
                .dm-hero-gradient {
                    position: absolute; inset: 0; background: rgba(0,0,0,0.6); z-index: 10;
                }
                .dm-hero-img {
                    width: 100%; height: 100%; object-fit: cover; transform: scale(1.05); opacity: 0.8;
                }
                
                /* Top Nav */
                .dm-nav { position: fixed; top: 0; width: 100%; z-index: 50; display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; }
                
                /* Main Grid */
                .dm-main { position: relative; z-index: 20; min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 6rem 1.5rem 5rem 1.5rem; }
                .dm-grid { max-width: 80rem; width: 100%; display: grid; gap: 4rem; align-items: center; }
                
                @media (min-width: 1024px) {
                    .dm-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                }

                /* Typography */
                .dm-text-center { text-align: center; }
                @media (min-width: 1024px) { .dm-text-center { text-align: left; padding-right: 3rem; } }
                
                .dm-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 9999px; border: 1px solid rgba(255, 87, 51, 0.2); background: rgba(255, 87, 51, 0.1); backdrop-filter: blur(24px); }
                
                /* HEADLINE SURGICAL FIX: Own space, Extra Bold, No Overlaps */
                .dm-h1 { font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 3rem; line-height: 1; letter-spacing: -0.05em; color: white !important; margin-top: 1.5rem; margin-bottom: 1.5rem; }
                @media (min-width: 768px) { .dm-h1 { font-size: 4rem; margin-bottom: 2rem; color: white !important; } }
                @media (min-width: 1024px) { .dm-h1 { font-size: 5rem; margin-bottom: 2rem; color: white !important; } }
                
                .dm-p { font-size: 1.125rem; color: var(--on-surface-variant); font-weight: 500; max-width: 36rem; line-height: 1.6; margin: 0 auto; }
                @media (min-width: 1024px) { .dm-p { margin: 0; } }

                .dm-features { display: flex; flex-wrap: wrap; gap: 1.5rem; padding-top: 1rem; justify-content: center; }
                @media (min-width: 1024px) { .dm-features { justify-content: flex-start; } }
                

                /* SURGICAL FIX: PURE WHITE GLASSMORPHISM */
                .dm-glass-wrapper { position: relative; width: 100%; max-width: 500px; margin: 0 auto; }
                @media (min-width: 1024px) { .dm-glass-wrapper { margin: 0 0 0 auto; } }
                
                .dm-glass-card {
                    position: relative; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 1); border-radius: 2rem; padding: 2.5rem;
                    box-shadow: 0px 40px 80px -20px rgba(0, 0, 0, 0.5); /* Contrast shadow against dark background */
                }
                @media (max-width: 768px) { .dm-glass-card { padding: 1.5rem; } }

                .dm-h2 { font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 1.875rem; color: #0e0e0e; margin: 0 0 0.5rem 0; letter-spacing: -0.025em; }

                /* Forms */
                .dm-input-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #586377; padding: 0 0.25rem; margin-bottom: 0.5rem; display: block; }
                .dm-input-box { position: relative; display: flex; align-items: center; }
                
                /* Light grey background for dark text */
                .dm-input { width: 100%; background: #f2f4f6; border: 1px solid #e1e4e8; border-radius: 1rem; padding: 1.125rem 1rem 1.125rem 3rem; color: #000; font-weight: 600; transition: all 0.2s; font-size: 1rem; }
                .dm-input:focus { outline: none; box-shadow: 0 0 0 2px rgba(255, 87, 51, 0.5); background: white; border-color: var(--primary); }
                .dm-input::placeholder { color: #a1aab7; font-weight: 500;}
                .dm-icon { position: absolute; left: 1.125rem; color: #586377; transition: color 0.2s; }
                .dm-input:focus + .dm-icon, .dm-input-box:focus-within .dm-icon { color: var(--primary); }

                /* HYPE FESTIVAL ORANGE PILL BUTTON (#FF5733) */
                .dm-btn-primary {
                    width: 100%; background: #FF5733; color: white; padding: 1.25rem; border-radius: 9999px; font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 1.125rem; text-transform: uppercase; letter-spacing: 0.05em; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 25px rgba(255, 87, 51, 0.4);
                    margin-top: 1.5rem;
                }
                .dm-btn-primary:hover { background: #e34e2f; box-shadow: 0 10px 25px rgba(255, 87, 51, 0.6); transform: translateY(-2px); }
                .dm-btn-primary:active { transform: scale(0.95); }

                /* Floating Decoration */
                .dm-float-deco { position: absolute; bottom: -2rem; right: -2rem; width: 8rem; height: 8rem; border-radius: 1.5rem; display: flex; align-items: center; justify-content: center; transform: rotate(12deg); border: 1px solid rgba(255, 87, 51, 0.4); background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(24px); box-shadow: 0px 40px 80px -20px rgba(255, 87, 51, 0.25), 0px 20px 40px rgba(0, 0, 0, 0.2); display: none; }
                @media (min-width: 768px) { .dm-float-deco { display: flex; } }

                /* Secondary Button */
                .dm-social-btn {
                    flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; border-radius: 1rem; background: #ffffff; color: #0e0e0e; border: 1px solid #e1e4e8; cursor: pointer; transition: background 0.2s; font-weight: 700;
                }
                .dm-social-btn:hover { background: #f2f4f6; }

                /* ================================== */
                /* LOGIN VIEW STYLES - Professional   */
                /* ================================== */
                .login-cinematic-img { display: none; }
                .login-gradient-overlay { display: none; }
                .glass-card-login { display: none; }
            `}</style>
            
            {/* Global Translator Overlay Button - Absolute to prevent flow collision, Fixed to viewport */}
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
                <SvgIcon name="language" size={18} />
                {lang.toUpperCase()}
            </button>

            {mode === 'signup' ? (
                <div className="dm-wrapper">
                    {/* Darkened Hero Overlay (60%) */}
                    <div className="dm-hero-bg">
                        <div className="dm-hero-gradient"></div>
                        <img className="dm-hero-img" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4E7XYx2ZjDvx6ntI5oFq9nX98OsUxwRVdEzyOQ7fRmCSXpvN_ILKYn9vWuk01lcHqxzC8TVUYqIcNUqGjzgduax3rwYyFgPBIkz4OSPpKeEpWxIMlcKrMLxJ2oGEO1_agJB4B2EutVtrioCEEEbwcknPcHVc-Gur71hdWwyw9J92INZRg5SujiKhlAiqmmfzQL1SBfhU0vH8bHgSWyOV5ZnrwHfKFkVCMnBdfFgufuDYid5_-XPXMfXlaldejcPTe7rwNRDcn3kFe" alt="Culinary OS Festival" />
                    </div>

                    {/* Top Navigation */}
                    <header className="dm-nav">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.05em', fontSize: '1.5rem', fontStyle: 'italic', color: 'white' }}>FoodSpot</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginRight: '100px' }}>
                            <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800 }}>{l.login}</button>
                            {/* Translate is handled globally by absolute widget */}
                        </div>
                    </header>

                    <main className="dm-main">
                        <div className="dm-grid">
                            
                            {/* Headline Section: Free flowing in space, decoupled from glass panel */}
                            <div className="dm-text-center">
                                <h1 className="dm-h1" style={{ fontWeight: 800, color: 'white' }}>
                                    FOODSPOT: The First <span style={{ color: '#FF5733', fontStyle: 'italic' }}>UGC-Driven</span> Culinary OS.
                                </h1>
                                <p className="dm-p" style={{ color: 'white' }}>
                                    Turn Every Customer into a Creator. Engineered for Enterprise, Professional Venues, and Global Platform Scale.
                                </p>
                                
                                <div className="dm-features">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <SvgIcon name="restaurant_menu" color="#FF5733" size={18} />
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: "white" }}>Live Menus</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <SvgIcon name="bolt" color="#FF5733" size={18} />
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: "white" }}>Instant Checkout</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <SvgIcon name="groups" color="#FF5733" size={18} />
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: "white" }}>Creator Loop</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* PURE WHITE Glassmorphism Login/Signup Card */}
                            <div className="dm-glass-wrapper">
                                <div className="dm-glass-card">
                                    
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h2 className="dm-h2">{l.createAccount}</h2>
                                        <p style={{ color: '#586377', marginTop: '0.25rem', margin: 0, fontWeight: 500 }}>{l.joinNetwork}</p>
                                    </div>
                                    
                                    {error && <div style={{ background: '#FF5733', color: 'white', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center', fontWeight: '800' }}>{error}</div>}
                                    
                                    <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        
                                        <div>
                                            <label className="dm-input-label">{l.businessName}</label>
                                            <div className="dm-input-box">
                                                <span className="dm-icon"><SvgIcon name="storefront" size={20} /></span>
                                                <input className="dm-input" type="text" placeholder={l.businessPlaceholder} value={businessName} onChange={e => setBusinessName(e.target.value)} required disabled={loading} />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="dm-input-label">{l.emailLabel}</label>
                                            <div className="dm-input-box">
                                                <span className="dm-icon"><SvgIcon name="alternate_email" size={20} /></span>
                                                <input className="dm-input" type="email" placeholder={l.emailPlaceholder} value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label className="dm-input-label" style={{ marginBottom: 0 }}>{l.passwordLabel}</label>
                                                <a href="#" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FF5733', textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); setMode('login'); }}>{l.alreadyHaveAccount}</a>
                                            </div>
                                            <div className="dm-input-box" style={{ marginTop: '0.5rem' }}>
                                                <span className="dm-icon"><SvgIcon name="lock_open" size={20} /></span>
                                                <input className="dm-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} disabled={loading} />
                                            </div>
                                            
                                            <div style={{ paddingTop: '0.5rem', paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.025em' }}>
                                                    <span style={{ color: '#586377' }}>{l.strength}</span>
                                                    <span style={{ color: '#FF5733' }}>{password.length > 5 ? l.good : password.length > 0 ? l.moderate : l.weak}</span>
                                                </div>
                                                <div style={{ height: '0.35rem', width: '100%', backgroundColor: '#e1e4e8', borderRadius: '9999px', overflow: 'hidden', display: 'flex', gap: '0.25rem' }}>
                                                    <div style={{ height: '100%', width: '25%', backgroundColor: password.length > 0 ? '#FF5733' : 'transparent', borderRadius: '9999px' }}></div>
                                                    <div style={{ height: '100%', width: '25%', backgroundColor: password.length > 3 ? '#FF5733' : 'transparent', borderRadius: '9999px' }}></div>
                                                    <div style={{ height: '100%', width: '25%', backgroundColor: password.length > 5 ? '#FF5733' : 'transparent', borderRadius: '9999px' }}></div>
                                                    <div style={{ height: '100%', width: '25%', backgroundColor: password.length > 8 ? '#FF5733' : 'transparent', borderRadius: '9999px' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Solid massive orange pill */}
                                        <button type="submit" disabled={loading} className="dm-btn-primary">
                                            {loading ? l.processing : l.startFreeTrial}
                                        </button>
                                        
                                    </form>
                                    
                                    <div style={{ paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                                            <div style={{ height: '1px', flex: 1, backgroundColor: '#e1e4e8' }}></div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a1aab7', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l.orContinueWith}</span>
                                            <div style={{ height: '1px', flex: 1, backgroundColor: '#e1e4e8' }}></div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                                            <button type="button" onClick={handleGoogleLogin} className="dm-social-btn">
                                                <SvgIcon name="group_add" size={18} />
                                                <span>{l.google}</span>
                                            </button>
                                            <button type="button" onClick={() => document.querySelector('input[type="email"]')?.focus()} className="dm-social-btn">
                                                <SvgIcon name="alternate_email" size={18} />
                                                <span>{l.email}</span>
                                            </button>
                                        </div>
                                    </div>
                                    
                                </div>
                                {/* Floating Antigravity Item in the corner of form */}
                                <div className="dm-float-deco">
                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{ display: 'block', fontSize: '2rem', fontFamily: '"Montserrat", sans-serif', fontWeight: 900, color: '#FF5733', fontStyle: 'italic', lineHeight: 1 }}>14</span>
                                        <span style={{ fontSize: '0.625rem', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, textTransform: 'uppercase', color: '#0e0e0e' }}>Day Trial</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* Bottom nav explicitly removed as per surgical request */}
                </div>
            ) : (
                <div className="dm-wrapper">
                    {/* Darkened Hero Overlay (60%) - Same as signup for continuity */}
                    <div className="dm-hero-bg">
                        <div className="dm-hero-gradient"></div>
                        <img className="dm-hero-img" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4E7XYx2ZjDvx6ntI5oFq9nX98OsUxwRVdEzyOQ7fRmCSXpvN_ILKYn9vWuk01lcHqxzC8TVUYqIcNUqGjzgduax3rwYyFgPBIkz4OSPpKeEpWxIMlcKrMLxJ2oGEO1_agJB4B2EutVtrioCEEEbwcknPcHVc-Gur71hdWwyw9J92INZRg5SujiKhlAiqmmfzQL1SBfhU0vH8bHgSWyOV5ZnrwHfKFkVCMnBdfFgufuDYid5_-XPXMfXlaldejcPTe7rwNRDcn3kFe" alt="Culinary OS" />
                    </div>

                    {/* Top Navigation - Text Only Branding */}
                    <header className="dm-nav" style={{ justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', fontSize: '1.5rem', fontStyle: 'italic', color: 'white' }}>FoodSpot</span>
                        </div>
                    </header>

                    <main className="dm-main">
                        <div className="dm-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '480px', margin: '0 auto' }}>
                            
                            {/* Headline Section - Professional */}
                            <div className="dm-text-center" style={{ marginBottom: '2rem' }}>
                                <h1 className="dm-h1" style={{ fontWeight: 800, fontSize: '2rem' }}>
                                    Welcome Back
                                </h1>
                                <p className="dm-p" style={{ fontSize: '1rem' }}>
                                    {l.discoverFlavors}
                                </p>
                            </div>
                            
                            {/* PURE WHITE Glassmorphism Login Card - Matches Signup */}
                            <div className="dm-glass-wrapper">
                                <div className="dm-glass-card" style={{ backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
                                    
                                    {error && <div style={{ background: '#FF5733', color: 'white', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center', fontWeight: '800' }}>{error}</div>}
                                    
                                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        
                                        <div>
                                            <label className="dm-input-label">{l.emailLabel}</label>
                                            <div className="dm-input-box">
                                                <span className="dm-icon"><SvgIcon name="alternate_email" size={20} /></span>
                                                <input className="dm-input" type="email" placeholder={l.emailPlaceholder} value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label className="dm-input-label" style={{ marginBottom: 0 }}>{l.passwordLabel}</label>
                                                <a href="#" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FF5733', textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); alert('Password reset coming soon'); }}>{l.forgot}</a>
                                            </div>
                                            <div className="dm-input-box" style={{ marginTop: '0.5rem' }}>
                                                <span className="dm-icon"><SvgIcon name="lock_open" size={20} /></span>
                                                <input className="dm-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} disabled={loading} />
                                            </div>
                                        </div>
                                        
                                        {/* Professional Orange Button - Matches Signup */}
                                        <button type="submit" disabled={loading} className="dm-btn-primary" style={{ marginTop: '0.5rem' }}>
                                            {loading ? l.processing : l.login}
                                        </button>
                                        
                                    </form>
                                    
                                    <div style={{ paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                                            <div style={{ height: '1px', flex: 1, backgroundColor: '#e1e4e8' }}></div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a1aab7', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l.orContinueWith}</span>
                                            <div style={{ height: '1px', flex: 1, backgroundColor: '#e1e4e8' }}></div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                                            <button type="button" onClick={handleGoogleLogin} disabled={loading} className="dm-social-btn">
                                                <SvgIcon name="group_add" size={18} />
                                                <span>{l.google}</span>
                                            </button>
                                            <button type="button" onClick={() => document.querySelector('input[type="email"]')?.focus()} className="dm-social-btn">
                                                <SvgIcon name="alternate_email" size={18} />
                                                <span>{l.email}</span>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Back to Signup - Professional Link */}
                                    <div style={{ marginTop: '1.5rem', textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#586377', margin: 0 }}>
                                            {l.newHere}{' '}
                                            <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); setError(null); }} style={{ color: '#FF5733', fontWeight: 800, textDecoration: 'none' }}>{l.signUp}</a>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            )}
        </>
    )
}

export default TrialSignup
