import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../../utils/storage.js'
import OnboardingModal from '../../components/Onboarding/OnboardingModal'

// ============================================
// ICONS
// ============================================
const ChatIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
  </svg>
)

const InstagramIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const GlobeIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
)

const ArrowBackIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
)

const LocationIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>
)

// ============================================
// TRANSLATIONS
// ============================================
const TRANSLATIONS = {
  en: {
    headline: 'Foodspot: The Shopify of Food',
    subheadline: 'Launch your app. Turn diners into creators.',
    getStarted: 'Get Started',
    signupSubtitle: 'Create your account to get started',
    createAccount: 'Create Account',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Create a password',
    businessNameLabel: 'Business Name',
    businessNamePlaceholder: 'Your Restaurant Name',
    haveAccount: 'Already have an account?',
    login: 'Log in',
    needHelp: 'Need help',
    contactSupport: 'Contact support on WhatsApp',
    location: 'Córdoba, Argentina',
    // Login modal
    welcomeBack: 'Welcome Back to FoodSpot!',
    loginSubtitle: 'Your menu. Their content. Your growth.',
    forgotPassword: 'Forgot password?',
    logIn: 'Log In',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    forgotPasswordTitle: 'Forgot Password?',
    forgotPasswordSubtitle: "Don't worry, it happens to the best of us. Enter your email to reset it.",
    sendResetLink: 'Send Reset Link',
    resetEmailPlaceholder: 'Enter your email address',
    backToLogin: 'Back to Login',
    resetSentTitle: 'Check Your Email',
    resetSentMessage: "We've sent a password reset link to your email.",
    processing: 'Processing...',
    close: 'Close'
  },
  es: {
    headline: 'Foodspot: El Shopify de la Comida',
    subheadline: 'Lanza tu app. Convierte clientes en creadores.',
    getStarted: 'Comenzar',
    signupSubtitle: 'Crea tu cuenta para comenzar',
    createAccount: 'Crear Cuenta',
    emailLabel: 'Correo',
    emailPlaceholder: 'tu@ejemplo.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Crea una contraseña',
    businessNameLabel: 'Nombre del Negocio',
    businessNamePlaceholder: 'Nombre de tu Restaurante',
    haveAccount: '¿Ya tienes una cuenta?',
    login: 'Iniciar sesión',
    needHelp: '¿Necesitas ayuda',
    contactSupport: 'Contacta a soporte en WhatsApp',
    location: 'Córdoba, Argentina',
    // Login modal
    welcomeBack: '¡Bienvenido de Nuevo a FoodSpot!',
    loginSubtitle: 'Tu menú. Su contenido. Tu crecimiento.',
    forgotPassword: '¿Olvidaste tu contraseña?',
    logIn: 'Iniciar Sesión',
    noAccount: '¿No tienes una cuenta?',
    signUp: 'Regístrate',
    forgotPasswordTitle: '¿Olvidaste tu Contraseña?',
    forgotPasswordSubtitle: 'No te preocupes, le pasa a los mejores. Ingresa tu correo para restablecerla.',
    sendResetLink: 'Enviar Enlace de Restablecimiento',
    resetEmailPlaceholder: 'Ingresa tu dirección de correo',
    backToLogin: 'Volver al Inicio de Sesión',
    resetSentTitle: 'Revisa tu Correo',
    resetSentMessage: 'Hemos enviado un enlace de restablecimiento a tu correo.',
    processing: 'Procesando...',
    close: 'Cerrar'
  },
  pt: {
    headline: 'Foodspot: O Shopify da Comida',
    subheadline: 'Lance seu app. Transforme clientes em criadores.',
    getStarted: 'Começar',
    signupSubtitle: 'Crie sua conta para começar',
    createAccount: 'Criar Conta',
    emailLabel: 'E-mail',
    emailPlaceholder: 'voce@exemplo.com',
    passwordLabel: 'Senha',
    passwordPlaceholder: 'Crie uma senha',
    businessNameLabel: 'Nome do Negócio',
    businessNamePlaceholder: 'Nome do seu Restaurante',
    haveAccount: 'Já tem uma conta?',
    login: 'Faça login',
    needHelp: 'Precisa de ajuda',
    contactSupport: 'Contate o suporte no WhatsApp',
    location: 'Córdoba, Argentina',
    // Login modal
    welcomeBack: 'Bem-vindo de Volta ao FoodSpot!',
    loginSubtitle: 'Seu cardápio. O conteúdo deles. Seu crescimento.',
    forgotPassword: 'Esqueceu a senha?',
    logIn: 'Fazer Login',
    noAccount: 'Não tem uma conta?',
    signUp: 'Cadastre-se',
    forgotPasswordTitle: 'Esqueceu a Senha?',
    forgotPasswordSubtitle: 'Não se preocupe, acontece com os melhores. Digite seu e-mail para redefinir.',
    sendResetLink: 'Enviar Link de Redefinição',
    resetEmailPlaceholder: 'Digite seu endereço de e-mail',
    backToLogin: 'Voltar ao Login',
    resetSentTitle: 'Verifique seu E-mail',
    resetSentMessage: 'Enviamos um link de redefinição de senha para seu e-mail.',
    processing: 'Processando...',
    close: 'Fechar'
  }
}

// ============================================
// LOGIN MODAL
// ============================================
const LoginModal = ({ onClose, lang, onLangCycle }) => {
  const l = TRANSLATIONS[lang]
  const [view, setView] = useState('login') // 'login' | 'forgot' | 'resetSent'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) throw loginError

      const user = data.user
      let { slug } = user.user_metadata || {}

      // Recovery fallback
      if (!slug) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.business_id) {
          const { data: branding } = await supabase
            .from('branding')
            .select('slug')
            .eq('business_id', profile.business_id)
            .maybeSingle()
          if (branding?.slug) slug = branding.slug
        }
      }

      window.location.replace(slug ? `/${slug}/owner/summary` : '/admin')
    } catch (err) {
      setError(err.message || 'Login failed')
      setLoading(false)
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`
      })
      if (resetError) throw resetError
      setView('resetSent')
    } catch (err) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const isLogin = view === 'login'
  const isForgot = view === 'forgot'
  const isResetSent = view === 'resetSent'

  const heroTitle = isLogin ? l.welcomeBack : isForgot ? l.forgotPasswordTitle : l.resetSentTitle
  const heroSubtitle = isLogin ? l.loginSubtitle : isForgot ? l.forgotPasswordSubtitle : l.resetSentMessage

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50">
      <div className="min-h-screen flex flex-col">
        {/* Hero Section */}
        <div className="relative w-full h-[35vh] min-h-[280px] overflow-hidden">
          {/* Video Background */}
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/foodspotherovideo.mp4" type="video/mp4" />
            <div className="absolute inset-0 bg-cover bg-center" style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=600&fit=crop')"
            }} />
          </video>

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center px-4 text-center">
            <h1 className="!text-white mb-3 drop-shadow-lg text-[44.8px] font-black" style={{ textShadow: '0 4px 8px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.5)' }}>
              {heroTitle}
            </h1>
            <p className="!text-white/90 drop-shadow-md font-medium text-[21.6px]" style={{ textShadow: '0 3px 6px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.5)' }}>
              {heroSubtitle}
            </p>
          </div>
        </div>

        {/* Main Card Content */}
        <main className="flex-grow w-full max-w-[480px] mx-auto px-4 relative z-10 -mt-8 mb-12">
          <div className="bg-white rounded-[0.75rem] shadow-[0px_10px_15px_-3px_rgba(17,24,39,0.1)] p-6 md:p-8">
            {isResetSent ? (
              /* Reset Sent View */
              <div className="text-center flex flex-col gap-4 py-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <svg width={28} height={28} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
                <p className="font-sans text-sm text-gray-600">{l.resetSentMessage}</p>
                <button
                  onClick={() => setView('login')}
                  className="font-sans text-sm font-semibold tracking-wider text-emerald-700 hover:text-emerald-500 transition-colors inline-flex items-center justify-center gap-1"
                >
                  <ArrowBackIcon size={16} />
                  {l.backToLogin}
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl font-semibold text-gray-900 mb-6">
                  {isLogin ? l.logIn : l.forgotPasswordTitle}
                </h2>

                {error && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-[0.5rem] text-sm mb-4">{error}</div>
                )}

                <form onSubmit={isLogin ? handleLoginSubmit : handleForgotSubmit} className="flex flex-col gap-3">
                  {/* Email Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-medium text-gray-700 uppercase tracking-wide" htmlFor="login-email">{l.emailLabel}</label>
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="username webauthn"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={isLogin ? l.emailPlaceholder : l.resetEmailPlaceholder}
                      required
                      autoFocus
                      className="w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-4 py-3 font-sans text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300"
                    />
                  </div>

                  {/* Password Input (login only) */}
                  {isLogin && (
                    <div className="flex flex-col gap-1.5">
                      <label className="font-sans text-xs font-medium text-gray-700 uppercase tracking-wide" htmlFor="login-password">{l.passwordLabel}</label>
                      <input
                        id="login-password"
                        name="password"
                        type="password"
                        autoComplete="current-password webauthn"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={l.passwordPlaceholder}
                        required
                        className="w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-4 py-3 font-sans text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300"
                      />
                    </div>
                  )}

                  {/* Forgot Password Link (login only) */}
                  {isLogin && (
                    <div className="flex justify-end mt-1">
                      <button
                        type="button"
                        onClick={() => setView('forgot')}
                        className="font-sans text-xs font-medium text-emerald-700 hover:text-emerald-500 transition-colors"
                      >
                        {l.forgotPassword}
                      </button>
                    </div>
                  )}

                  {/* Primary Action Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 text-white font-sans text-sm font-semibold tracking-wider py-3.5 rounded-[0.5rem] mt-1 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                  >
                    {loading ? l.processing : (isLogin ? l.logIn : l.sendResetLink)}
                  </button>

                  {/* Back / Toggle Link */}
                  <div className="text-center mt-4">
                    {isLogin ? (
                      <p className="font-sans text-sm text-gray-600">
                        {l.noAccount}{' '}
                        <button
                          type="button"
                          onClick={onClose}
                          className="font-sans text-sm font-semibold tracking-wider text-emerald-700 hover:text-emerald-500 transition-colors ml-1"
                        >
                          {l.signUp}
                        </button>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setView('login')}
                        className="font-sans text-sm font-semibold tracking-wider text-emerald-700 hover:text-emerald-500 transition-colors inline-flex items-center justify-center gap-1"
                      >
                        <ArrowBackIcon size={16} />
                        {l.backToLogin}
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        </main>

        {/* Contextual Footer */}
        <footer className="w-full py-8 px-4 flex flex-col items-center gap-1 text-center bg-gray-50 mt-auto">
          <p className="font-display text-xl font-semibold text-gray-600 opacity-80">FoodSpot Mobile</p>
          <p className="font-sans text-sm text-gray-500">© 2025 FoodSpot Mobile. All rights reserved.</p>
          <p className="font-sans text-sm text-gray-500">{l.location}</p>
          <button
            onClick={onLangCycle}
            className="mt-3 flex items-center gap-2 cursor-pointer text-gray-600 hover:text-emerald-700 transition-colors"
          >
            <GlobeIcon size={20} />
            <span className="font-sans text-xs font-medium">{lang.toUpperCase()}</span>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
            </svg>
          </button>
        </footer>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

const TrialSignup = () => {
  const [lang, setLang] = useState('en')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Email/password signup form state
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupBusinessName, setSignupBusinessName] = useState('')

  const l = TRANSLATIONS[lang]

  // Auth state listener for redirects
  useEffect(() => {
    const { subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!['SIGNED_IN', 'INITIAL_SESSION'].includes(event) || !session?.user) return
      await handleAuthSession(session.user)
    })

    return () => subscription?.unsubscribe()
  }, [])

  // 🛡️ FORCE FRESH SIGNUP: Clear any lingering session so users always see the form
  useEffect(() => {
    const clearSession = async () => {
      await supabase.auth.signOut()
      // Also nuke any cached auth tokens Supabase may have restored
      const authKey = Object.keys(localStorage).find(k => k.includes('auth-token'))
      if (authKey) localStorage.removeItem(authKey)
    }
    clearSession()
  }, [])

  const handleAuthSession = async (user) => {
    let { slug } = user.user_metadata || {}

    // Check if user already has a business
    if (!slug) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.business_id) {
        const { data: branding } = await supabase
          .from('branding')
          .select('slug')
          .eq('business_id', profile.business_id)
          .maybeSingle()

        if (branding?.slug) {
          slug = branding.slug
          await supabase.auth.updateUser({
            data: { slug, business_id: profile.business_id }
          })
        }
      }
    }

    if (slug) {
      window.location.replace(`/${slug}/owner/summary`)
    } else {
      // First time login - show onboarding
      setShowOnboarding(true)
    }
  }

  const generateSlug = (name) =>
    name.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50)

  const handleEmailSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!signupEmail || !signupPassword || !signupBusinessName) {
        throw new Error('Please fill in all fields')
      }
      if (signupPassword.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword
      })
      if (signUpError) throw signUpError
      if (!authData.user) throw new Error('Signup failed — no user returned')

      // Store business name for onboarding
      const slug = generateSlug(signupBusinessName)
      await supabase.auth.updateUser({
        data: { temp_business_name: signupBusinessName, temp_slug: slug }
      })

      // Show onboarding modal
      setShowOnboarding(true)
    } catch (err) {
      setError(err.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOnboardingComplete = async (formData) => {
    setLoading(true)
    setError(null)
    console.log('[Onboarding] Starting account creation...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('[Onboarding] Auth user:', user?.id || 'NONE')
      if (!user) throw new Error('Not authenticated')

      const businessName = formData.businessName || user.user_metadata?.temp_business_name || 'My Business'
      const slug = generateSlug(businessName)
      console.log('[Onboarding] Business name:', businessName, '| Slug:', slug)
      if (!slug) throw new Error('Invalid business name')

      const businessId = crypto.randomUUID()
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 14)

      // Clear any stale slug from localStorage so old broken tenants don't poison the session
      localStorage.removeItem('fs_last_active_slug')
      localStorage.removeItem('fs_business_id')

      // Create businesses row (required for events/orders FK constraints)
      console.log('[Onboarding] Inserting businesses row...')
      const { error: bizError } = await supabase.from('businesses').insert({
        id: businessId,
        slug,
        name: businessName,
        owner_id: user.id
      })
      if (bizError) {
        console.error('[Onboarding] businesses insert failed:', bizError)
        throw new Error('Failed to create business record: ' + bizError.message)
      }
      console.log('[Onboarding] businesses row created:', businessId)

      // Create blank branding row (no template cloning)
      console.log('[Onboarding] Inserting branding row...')
      const { error: brandingError } = await supabase.from('branding').insert({
        business_id: businessId,
        user_id: user.id,
        business_name: businessName,
        slug,
        trial_ends_at: trialEndsAt.toISOString(),
        app_config: {
          businessInfo: {
            businessType: formData.businessType,
            duration: formData.duration,
            serviceType: formData.serviceType,
            socialMedia: formData.socialMedia,
            priorAppUsage: formData.priorAppUsage,
            eventsInfo: formData.events,
            phoneNumber: formData.phoneNumber
          },
          externalOrdering: {},
          payments: {},
          notifications: {},
          businessCurrency: 'ARS'
        }
      })
      if (brandingError) {
        console.error('[Onboarding] branding insert failed:', brandingError)
        throw new Error('Failed to create business branding: ' + brandingError.message)
      }
      console.log('[Onboarding] branding row created')

      // Create language_settings entry
      console.log('[Onboarding] Inserting language_settings...')
      const { error: langError } = await supabase.from('language_settings').insert({
        business_id: businessId,
        language: 'es'
      })
      if (langError) console.error('[Onboarding] language_settings insert failed:', langError)

      // Create tenants row
      console.log('[Onboarding] Inserting tenants row...')
      const { error: tenantsError } = await supabase.from('tenants').insert({
        id: crypto.randomUUID(),
        venue_name: slug,
        owner_id: user.id,
        language: 'es'
      })
      if (tenantsError) console.error('[Onboarding] tenants insert failed:', tenantsError)

      // Create profiles row
      console.log('[Onboarding] Inserting profiles row...')
      const { error: profilesError } = await supabase.from('profiles').insert({
        id: user.id,
        business_id: businessId
      })
      if (profilesError) console.error('[Onboarding] profiles insert failed:', profilesError)

      // Update auth user
      console.log('[Onboarding] Updating auth user metadata...')
      await supabase.auth.updateUser({
        data: { slug, business_id: businessId, role: 'owner' }
      })

      // Seed localStorage so TenantContext resolves correctly on next load
      localStorage.setItem('fs_last_active_slug', slug)
      localStorage.setItem('fs_business_id', businessId)
      setTenantStoragePrefix(businessId)
      console.log('[Onboarding] Redirecting to:', `/${slug}/owner/summary`)
      window.location.href = `/${slug}/owner/summary`

    } catch (err) {
      console.error('[Onboarding] FATAL ERROR:', err)
      setError(err.message || 'Error creating account')
      // Keep modal open so user can retry; re-throw so OnboardingModal shows submitError
      throw err
    } finally {
      setLoading(false)
    }
  }

  const cycleLang = () => {
    setLang(prev => prev === 'en' ? 'es' : prev === 'es' ? 'pt' : 'en')
  }

  return (
    <div className="min-h-screen flex flex-col bg-white antialiased selection:bg-emerald-500 selection:text-white">
      {/* Main Content Area */}
      <main className="flex-grow flex flex-col">
        {/* Hero Section */}
        <section
          className="h-[530px] min-h-[400px] w-full bg-cover bg-center flex flex-col items-center justify-center px-4 text-center relative overflow-hidden"
          style={{
            backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB-P3U7v1O8MTwyyyOSCbZsMfSkvEXUg6v3oTiwqjE9VFKgUPfgJTmcimbn4eEKypIfL14gJ8pGbVv36LP0HRwMpVaMoAQKQTq1vdPLxLXUpRpsF7Ieas5qWn7aXmJDiT8NUktgSNzOER9YgM_2ArhxwhKW6F12KMIY6OyMEu_eXMGgO3QgetRwZ7QywBIKvgowlTOGBcniDH5EfalhhZ9LMyaq72B4rvOdPCNy-cg_xbXdYIjqHJ8CR7kFTgbLAfnq8uOyGK-scA')"
          }}
        >
          {/* Decorative Background Elements for Depth */}
          <div className="absolute inset-0 z-0 bg-black/60" />
          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-3 pt-10 pb-20">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold !text-white tracking-tight">
              <span style={{ color: '#ffffff' }}>{l.headline}</span>
            </h1>
            <p className="font-sans text-base sm:text-lg !text-white max-w-xl">
              {l.subheadline}
            </p>
          </div>
        </section>

        {/* Interactive Card Section */}
        <section className="flex flex-col items-center px-4 -mt-[132px] relative z-20 pb-6">
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 md:p-8 flex flex-col gap-6 border border-gray-100 transition-all duration-300 hover:shadow-xl hover:border-emerald-100">
            <div className="text-center flex flex-col gap-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900">{l.getStarted}</h2>
              <p className="font-sans text-sm md:text-base text-gray-600">{l.signupSubtitle}</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-[0.5rem] text-sm">{error}</div>
            )}

            <form onSubmit={handleEmailSignup} className="flex flex-col gap-3 mt-1">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="font-sans text-xs font-medium text-gray-700 uppercase tracking-wide">{l.businessNameLabel}</label>
                <input
                  type="text"
                  value={signupBusinessName}
                  onChange={e => setSignupBusinessName(e.target.value)}
                  placeholder={l.businessNamePlaceholder}
                  required
                  className="w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-4 py-3 font-sans text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300"
                />
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="font-sans text-xs font-medium text-gray-700 uppercase tracking-wide">{l.emailLabel}</label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                  placeholder={l.emailPlaceholder}
                  required
                  className="w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-4 py-3 font-sans text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300"
                />
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="font-sans text-xs font-medium text-gray-700 uppercase tracking-wide">{l.passwordLabel}</label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  placeholder={l.passwordPlaceholder}
                  required
                  minLength={6}
                  className="w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-4 py-3 font-sans text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-gray-400 hover:border-gray-300"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] bg-emerald-500 text-white rounded-lg flex items-center justify-center gap-2 font-sans text-sm font-semibold tracking-wider transition-all duration-200 hover:bg-emerald-600 hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? l.processing || 'Processing...' : l.createAccount}
              </button>

              <div className="text-center mt-2">
                <p className="font-sans text-sm text-gray-600">
                  {l.haveAccount}{' '}
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); setShowLoginModal(true); }}
                    className="text-emerald-700 font-sans text-sm font-semibold tracking-wider hover:underline hover:text-emerald-800 transition-colors"
                  >
                    {l.login}
                  </a>
                </p>
              </div>
            </form>
          </div>

          {/* WhatsApp Link */}
          <div className="mt-6">
            <a
              href="https://wa.me/543512122600?text=I need help with FoodSpot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-800 transition-colors font-sans text-sm group"
            >
              <ChatIcon size={16} className="transition-transform group-hover:scale-110" />
              <span className="underline underline-offset-2 decoration-emerald-700/30 group-hover:decoration-emerald-700">
                {l.needHelp}? {l.contactSupport}
              </span>
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white flex flex-col items-center gap-6 py-4 px-4 text-center mt-auto border-t border-transparent">
        {/* Brand */}
        <div className="font-display text-2xl font-semibold text-emerald-700">FoodSpot Mobile</div>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-1">
          <a href="#" className="text-gray-600 font-sans text-sm cursor-pointer hover:text-emerald-700 transition-colors">Privacy</a>
          <a href="#" className="text-gray-600 font-sans text-sm cursor-pointer hover:text-emerald-700 transition-colors">Terms</a>
          <a href="#" className="text-gray-600 font-sans text-sm cursor-pointer hover:text-emerald-700 transition-colors">Location</a>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); cycleLang(); }}
            className="text-gray-600 font-sans text-sm cursor-pointer hover:text-emerald-700 transition-colors flex items-center gap-1"
          >
            <GlobeIcon size={16} />
            Language
          </a>
        </nav>

        {/* Instagram */}
        <a
          href="https://www.instagram.com/foodspotmobile?igsh=MXBvZjk0dWJjcGR0OA%3D%3D&utm_source=qr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-emerald-700 transition-colors flex items-center gap-1 font-sans text-sm"
        >
          <InstagramIcon size={16} />
          Instagram
        </a>

        {/* Custom Additional Info & Copyright */}
        <div className="flex flex-col gap-1 items-center">
          <div className="text-gray-600 font-sans text-sm flex items-center gap-1">
            <LocationIcon size={16} />
            {l.location}
          </div>
          <div className="text-gray-500 font-sans text-sm">© 2025 FoodSpot Mobile. All rights reserved.</div>
        </div>
      </footer>

      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          lang={lang}
          onLangCycle={cycleLang}
        />
      )}
    </div>
  )
}

export default TrialSignup
