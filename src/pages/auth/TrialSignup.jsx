/**
 * TrialSignup.jsx — Clean Refactor
 * 
 * Auth screen with signup/login modes.
 * Uses external CSS (TrialSignup.css) for maintainability.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../../utils/storage.js'
import './TrialSignup.css'

// ============================================
// ICONS
// ============================================
const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const icons = {
    storefront: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    language: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    groups: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    google: <><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></>
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || null}
    </svg>
  )
}

// ============================================
// TRANSLATIONS
// ============================================
const TRANSLATIONS = {
  en: {
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
    startFreeTrial: 'Create Business Account',
    login: 'Log in',
    processing: 'Processing...',
    orContinueWith: 'Or continue with',
    alreadyHaveAccount: 'Already have an account?',
    forgot: 'Forgot?',
    newHere: 'New here?',
    signUp: 'Create Account',
    welcome: 'Welcome Back',
    welcomePrefix: 'Welcome back to sign in to your ',
    welcomeBrand: 'Foodspot OS',
    discoverFlavors: 'Sign in to your Culinary OS.',
    google: 'Google',
    email: 'Email',
    liveMenus: 'Live Menus',
    instantCheckout: 'Instant Checkout',
    creatorLoop: 'Creator Loop',
    trialDays: '14',
    trialText: 'Day Trial',
    headline: 'Foodspot: The First Restaurant OS That Turns Diners Into Creators',
    subheadline: 'Your menu. Their content. Your growth.'
  },
  es: {
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
    startFreeTrial: 'Crear Cuenta Empresarial',
    login: 'Iniciar sesión',
    processing: 'Procesando...',
    orContinueWith: 'O continúa con',
    alreadyHaveAccount: '¿Ya tienes cuenta?',
    forgot: '¿Olvidaste?',
    newHere: '¿Eres nuevo?',
    signUp: 'Regístrate',
    welcome: 'Bienvenido',
    welcomePrefix: 'Bienvenido de nuevo. Inicia sesión en ',
    welcomeBrand: 'Foodspot OS',
    discoverFlavors: 'Inicia sesión en tu OS Culinario.',
    google: 'Google',
    email: 'Email',
    liveMenus: 'Menús en Vivo',
    instantCheckout: 'Checkout Instantáneo',
    creatorLoop: 'Bucle de Creadores',
    trialDays: '14',
    trialText: 'Días de Prueba',
    headline: 'Foodspot: El Primer OS Restaurante que Convierte Comensales en Creadores',
    subheadline: 'Tu menú. Su contenido. Tu crecimiento.'
  },
  pt: {
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
    startFreeTrial: 'Criar Conta Empresarial',
    login: 'Entrar',
    processing: 'Processando...',
    orContinueWith: 'Ou continue com',
    alreadyHaveAccount: 'Já tem uma conta?',
    forgot: 'Esqueceu?',
    newHere: 'É novo aqui?',
    signUp: 'Cadastre-se',
    welcome: 'Bem-vindo',
    welcomePrefix: 'Bem-vindo de volta. Entre na sua ',
    welcomeBrand: 'Foodspot OS',
    discoverFlavors: 'Entre na sua Plataforma Culinária.',
    google: 'Google',
    email: 'Email',
    liveMenus: 'Cardápios Ao Vivo',
    instantCheckout: 'Checkout Instantâneo',
    creatorLoop: 'Loop de Criadores',
    trialDays: '14',
    trialText: 'Dias de Teste',
    headline: 'Foodspot: O Primeiro OS Restaurante que Transforma Clientes em Criadores',
    subheadline: 'Seu cardápio. O conteúdo deles. Seu crescimento.'
  }
}

// ============================================
// COMPONENTS
// ============================================

const HeroBackground = () => (
  <div className="dm-hero-bg">
    <div className="dm-hero-gradient" />
    <img
      className="dm-hero-img"
      src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4E7XYx2ZjDvx6ntI5oFq9nX98OsUxwRVdEzyOQ7fRmCSXpvN_ILKYn9vWuk01lcHqxzC8TVUYqIcNUqGjzgduax3rwYyFgPBIkz4OSPpKeEpWxIMlcKrMLxJ2oGEO1_agJB4B2EutVtrioCEEEbwcknPcHVc-Gur71hdWwyw9J92INZRg5SujiKhlAiqmmfzQL1SBfhU0vH8bHgSWyOV5ZnrwHfKFkVCMnBdfFgufuDYid5_-XPXMfXlaldejcPTe7rwNRDcn3kFe"
      alt="Culinary OS Festival"
      loading="eager"
    />
  </div>
)

const NavBrand = () => (
  <span className="dm-nav__brand">FoodSpot</span>
)

const FeatureItem = ({ icon, text }) => (
  <div className="dm-feature">
    <div className="dm-feature__icon">
      <Icon name={icon} size={18} color="#FF5733" />
    </div>
    <span className="dm-feature__text">{text}</span>
  </div>
)

const InputField = ({ label, type, placeholder, value, onChange, icon, disabled, autoFocus, rightElement }) => (
  <div className="dm-field">
    <div className="dm-field__header">
      <label className="dm-input-label">{label}</label>
      {rightElement}
    </div>
    <div className="dm-input-box">
      <span className="dm-input__icon"><Icon name={icon} size={20} /></span>
      <input 
        className="dm-input" 
        type={type} 
        placeholder={placeholder} 
        value={value} 
        onChange={onChange}
        disabled={disabled}
        autoFocus={autoFocus}
        required
      />
    </div>
  </div>
)

const PasswordStrength = ({ password, labels }) => {
  const getStrength = () => {
    if (password.length > 8) return { label: labels.good, segments: 4 }
    if (password.length > 5) return { label: labels.good, segments: 3 }
    if (password.length > 3) return { label: labels.moderate, segments: 2 }
    if (password.length > 0) return { label: labels.weak, segments: 1 }
    return { label: labels.weak, segments: 0 }
  }
  
  const { label, segments } = getStrength()
  
  return (
    <div className="dm-strength">
      <div className="dm-strength__header">
        <span className="dm-strength__label">{labels.strength}</span>
        <span className="dm-strength__value">{label}</span>
      </div>
      <div className="dm-strength__bar">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`dm-strength__segment ${i < segments ? 'dm-strength__segment--active' : ''}`} />
        ))}
      </div>
    </div>
  )
}

const SocialButtons = ({ onGoogle, onEmail, labels, loading }) => (
  <div className="dm-social-row">
    <div className="dm-divider">
      <div className="dm-divider__line" />
      <span className="dm-divider__text">{labels.orContinueWith}</span>
      <div className="dm-divider__line" />
    </div>
    <div className="dm-social-buttons">
      <button type="button" onClick={onGoogle} disabled={loading} className="dm-social-btn">
        <Icon name="groups" size={18} />
        <span>{labels.google}</span>
      </button>
      <button type="button" onClick={onEmail} className="dm-social-btn">
        <Icon name="mail" size={18} />
        <span>{labels.email}</span>
      </button>
    </div>
  </div>
)

const FloatingBadge = ({ number, text }) => (
  <div className="dm-float-deco">
    <div style={{ textAlign: 'center' }}>
      <span className="dm-float-deco__number">{number}</span>
      <span className="dm-float-deco__text">{text}</span>
    </div>
  </div>
)

// ============================================
// MAIN COMPONENT
// ============================================

const TrialSignup = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [mode, setMode] = useState('signup')
  const [lang, setLang] = useState('en')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const l = TRANSLATIONS[lang]

  // Pre-fill business name from URL
  useEffect(() => {
    const nameParam = searchParams.get('name')
    if (nameParam) setBusinessName(decodeURIComponent(nameParam))
  }, [searchParams])

  // Auth state listener for redirects
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' || !session?.user) return
      
      const user = session.user
      let { slug, role = 'owner' } = user.user_metadata || {}

      // Self-healing slug recovery
      if (!slug) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('id', user.id)
          .single()

        if (profile?.business_id) {
          const { data: branding } = await supabase
            .from('branding')
            .select('slug')
            .eq('business_id', profile.business_id)
            .single()

          if (branding?.slug) {
            slug = branding.slug
            await supabase.auth.updateUser({
              data: { slug, business_id: profile.business_id }
            })
          }
        }
      }

      const redirectPath = slug 
        ? role === 'customer' ? `/${slug}/menu`
          : role === 'staff' ? `/${slug}/staff/dashboard`
          : `/${slug}/owner/summary`
        : '/admin'

      window.location.replace(redirectPath)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const generateSlug = (name) => 
    name.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50)

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      })
      if (oauthError) throw oauthError
    } catch (err) {
      setError(err.message || 'Google login failed')
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const slug = generateSlug(businessName)
      if (!slug) throw new Error('Please enter a valid business name')

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { business_name: businessName, slug, role: 'owner' } }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 14)

      await supabase.from('branding').insert({
        user_id: authData.user.id,
        business_name: businessName,
        slug,
        trial_ends_at: trialEndsAt.toISOString()
      }).catch(console.error)

      setTenantStoragePrefix(authData.user.id)
      window.location.href = `/${slug}/owner/summary`

    } catch (err) {
      setError(err.message || 'Error creating account')
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) throw loginError

      const user = data.user
      let { slug } = user?.user_metadata || {}

      // Recovery fallback
      if (!slug) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('id', user.id)
          .single()

        if (profile?.business_id) {
          const { data: branding } = await supabase
            .from('branding')
            .select('slug')
            .eq('business_id', profile.business_id)
            .single()
          if (branding?.slug) slug = branding.slug
        }
      }

      window.location.replace(slug ? `/${slug}/owner/summary` : '/admin')

    } catch (err) {
      setError(err.message || 'Login failed')
      setLoading(false)
    }
  }

  const cycleLang = () => {
    setLang(prev => prev === 'en' ? 'es' : prev === 'es' ? 'pt' : 'en')
  }

  const focusEmail = () => {
    document.querySelector('input[type="email"]')?.focus()
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError(null)
  }

  const isSignup = mode === 'signup'

  return (
    <>
      <HeroBackground />

      {/* Language Switcher */}
      <button onClick={cycleLang} className="lang-switcher">
        <Icon name="language" size={18} />
        {lang.toUpperCase()}
      </button>

      {/* Navigation */}
      <header className={`dm-nav ${!isSignup ? 'dm-nav--centered' : ''}`}>
        <NavBrand />
        {isSignup && (
          <button onClick={() => switchMode('login')} className="dm-nav__link">
            {l.login}
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="dm-main">
        <div className={`dm-grid ${!isSignup ? 'dm-grid--single' : ''}`}>
          
          {/* Headline Section */}
          <div className="dm-text-center">
            <h1 className={`dm-h1 ${!isSignup ? 'dm-h1--small' : ''}`}>
              {isSignup ? (
                <>{l.headline.split('Restaurant OS')[0]}<span className="dm-h1__accent">Restaurant OS</span>{l.headline.split('Restaurant OS')[1]}</>
              ) : (
                <>{l.welcomePrefix}<span className="dm-h1__accent">{l.welcomeBrand}</span></>
              )}
            </h1>
            <p className={`dm-p ${isSignup ? 'dm-p--light' : ''}`}>
              {isSignup ? l.subheadline : l.discoverFlavors}
            </p>
            
            {isSignup && (
              <div className="dm-features">
                <FeatureItem icon="menu" text={l.liveMenus} />
                <FeatureItem icon="bolt" text={l.instantCheckout} />
                <FeatureItem icon="groups" text={l.creatorLoop} />
              </div>
            )}
          </div>

          {/* Form Card */}
          <div className="dm-glass-wrapper">
            <div className="dm-glass-card">
              <div className="dm-glass-card__header">
                <h2 className="dm-h2">{isSignup ? l.createAccount : l.welcome}</h2>
                {isSignup && <p className="dm-glass-card__subtitle">{l.joinNetwork}</p>}
              </div>

              {error && <div className="dm-error">{error}</div>}

              <form onSubmit={isSignup ? handleSignup : handleLogin} className="dm-form">
                {isSignup && (
                  <InputField
                    label={l.businessName}
                    type="text"
                    placeholder={l.businessPlaceholder}
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    icon="storefront"
                    disabled={loading}
                  />
                )}

                <InputField
                  label={l.emailLabel}
                  type="email"
                  placeholder={l.emailPlaceholder}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  icon="mail"
                  disabled={loading}
                  autoFocus={!isSignup}
                />

                <div>
                  <InputField
                    label={l.passwordLabel}
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    icon="lock"
                    disabled={loading}
                    rightElement={isSignup ? (
                      <a href="#" className="dm-input-link" onClick={(e) => { e.preventDefault(); switchMode('login') }}>
                        {l.alreadyHaveAccount}
                      </a>
                    ) : (
                      <a href="#" className="dm-input-link" onClick={(e) => { e.preventDefault(); alert('Password reset coming soon') }}>
                        {l.forgot}
                      </a>
                    )}
                  />
                  {isSignup && <PasswordStrength password={password} labels={l} />}
                </div>

                <button type="submit" disabled={loading} className="dm-btn-primary">
                  {loading ? l.processing : isSignup ? l.startFreeTrial : l.login}
                </button>
              </form>

              <SocialButtons 
                onGoogle={handleGoogleLogin} 
                onEmail={focusEmail} 
                labels={l} 
                loading={loading}
              />

              {!isSignup && (
                <div className="dm-footer">
                  <p className="dm-footer__text">
                    {l.newHere}{' '}
                    <a href="#" onClick={(e) => { e.preventDefault(); switchMode('signup') }} className="dm-footer__link">
                      {l.signUp}
                    </a>
                  </p>
                </div>
              )}
            </div>

            {isSignup && <FloatingBadge number={l.trialDays} text={l.trialText} />}
          </div>
        </div>
      </main>
    </>
  )
}

export default TrialSignup
