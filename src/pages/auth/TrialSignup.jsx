import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../../utils/storage.js'
import OnboardingModal from '../../components/Onboarding/OnboardingModal'
import './TrialSignup.css'

// ============================================
// ICONS
// ============================================
const GoogleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
  </svg>
)

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
    signupSubtitle: 'Sign up with Google to create your FoodSpot account',
    signupGoogle: 'Sign up with Google',
    haveAccount: 'Already have an account?',
    login: 'Log in',
    needHelp: 'Need help',
    contactSupport: 'Contact support on WhatsApp',
    location: 'Córdoba, Argentina',
    // Login modal
    welcomeBack: 'Welcome Back',
    loginSubtitle: 'Log in to FoodSpot OS',
    emailLabel: 'Email Address',
    emailPlaceholder: 'owner@restaurant.com',
    passwordLabel: 'Password',
    forgotPassword: 'Forgot password?',
    processing: 'Processing...',
    close: 'Close'
  },
  es: {
    headline: 'Foodspot: El Shopify de la Comida',
    subheadline: 'Lanza tu app. Convierte clientes en creadores.',
    getStarted: 'Comenzar',
    signupSubtitle: 'Regístrate con Google para crear tu cuenta de FoodSpot',
    signupGoogle: 'Registrarse con Google',
    haveAccount: '¿Ya tienes una cuenta?',
    login: 'Iniciar sesión',
    needHelp: '¿Necesitas ayuda',
    contactSupport: 'Contacta a soporte en WhatsApp',
    location: 'Córdoba, Argentina',
    // Login modal
    welcomeBack: 'Bienvenido de Nuevo',
    loginSubtitle: 'Inicia sesión en FoodSpot OS',
    emailLabel: 'Correo Electrónico',
    emailPlaceholder: 'propietario@restaurante.com',
    passwordLabel: 'Contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    processing: 'Procesando...',
    close: 'Cerrar'
  },
  pt: {
    headline: 'Foodspot: O Shopify da Comida',
    subheadline: 'Lance seu app. Transforme clientes em criadores.',
    getStarted: 'Começar',
    signupSubtitle: 'Cadastre-se com Google para criar sua conta FoodSpot',
    signupGoogle: 'Cadastrar com Google',
    haveAccount: 'Já tem uma conta?',
    login: 'Faça login',
    needHelp: 'Precisa de ajuda',
    contactSupport: 'Contate o suporte no WhatsApp',
    location: 'Córdoba, Argentina',
    // Login modal
    welcomeBack: 'Bem-vindo de Volta',
    loginSubtitle: 'Faça login no FoodSpot OS',
    emailLabel: 'E-mail',
    emailPlaceholder: 'proprietario@restaurante.com',
    passwordLabel: 'Senha',
    forgotPassword: 'Esqueceu a senha?',
    processing: 'Processando...',
    close: 'Fechar'
  }
}

// ============================================
// LOGIN MODAL
// ============================================
const LoginModal = ({ onClose, lang }) => {
  const l = TRANSLATIONS[lang]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[1rem] shadow-2xl w-full max-w-md p-6 md:p-8 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">{l.welcomeBack}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <p className="text-gray-600 text-sm -mt-2">{l.loginSubtitle}</p>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l.emailLabel}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={l.emailPlaceholder}
              required
              autoFocus
              className="w-full px-4 py-3 rounded-[0.75rem] border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l.passwordLabel}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-[0.75rem] border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold transition-all active:scale-95"
          >
            {loading ? l.processing : l.login}
          </button>
        </form>
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

  const l = TRANSLATIONS[lang]

  // Auth state listener for redirects
  useEffect(() => {
    const { subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' || !session?.user) return

      const user = session.user
      let { slug } = user.user_metadata || {}

      // Check if user already has a business
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

      if (slug) {
        window.location.replace(`/${slug}/owner/summary`)
      } else {
        // First time login - show onboarding
        setShowOnboarding(true)
      }
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
      setError(err.message || 'Google sign-in failed')
      setLoading(false)
    }
  }

  const handleOnboardingComplete = async (formData) => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const businessName = formData.businessName || 'My Business'
      const slug = generateSlug(businessName)
      if (!slug) throw new Error('Invalid business name')

      const businessId = crypto.randomUUID()
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 14)

      // Find template business (owned by hikaribrandan3@gmail.com or flagged as template)
      const { data: templateBranding } = await supabase
        .from('branding')
        .select('*')
        .eq('is_template', true)
        .single()

      if (templateBranding) {
        // Clone from template business
        const templateBusinessId = templateBranding.business_id

        // Clone menu items
        const { data: menuItems } = await supabase
          .from('menu_items')
          .select('*')
          .eq('business_id', templateBusinessId)

        if (menuItems && menuItems.length > 0) {
          const clonedMenuItems = menuItems.map(item => ({
            ...item,
            id: crypto.randomUUID(),
            business_id: businessId
          }))
          await supabase.from('menu_items').insert(clonedMenuItems)
        }

        // Clone categories
        const { data: categories } = await supabase
          .from('categories')
          .select('*')
          .eq('business_id', templateBusinessId)

        if (categories && categories.length > 0) {
          const clonedCategories = categories.map(cat => ({
            ...cat,
            id: crypto.randomUUID(),
            business_id: businessId
          }))
          await supabase.from('categories').insert(clonedCategories)
        }

        // Create branding with cloned app_config
        const clonedAppConfig = {
          ...templateBranding.app_config,
          businessInfo: {
            businessType: formData.businessType,
            duration: formData.duration,
            serviceType: formData.serviceType,
            socialMedia: formData.socialMedia,
            priorAppUsage: formData.priorAppUsage,
            eventsInfo: formData.events,
            phoneNumber: formData.phoneNumber
          }
        }

        await supabase.from('branding').insert({
          business_id: businessId,
          user_id: user.id,
          business_name: businessName,
          slug,
          trial_ends_at: trialEndsAt.toISOString(),
          language: 'es',
          app_config: clonedAppConfig
        })
      } else {
        // Fallback: create blank business if template not found
        await supabase.from('branding').insert({
          business_id: businessId,
          user_id: user.id,
          business_name: businessName,
          slug,
          trial_ends_at: trialEndsAt.toISOString(),
          language: 'es',
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
      }

      // Create language_settings entry
      await supabase.from('language_settings').insert({
        business_id: businessId,
        language: 'es'
      })

      // Update auth user
      await supabase.auth.updateUser({
        data: { slug, business_id: businessId, role: 'owner' }
      })

      setTenantStoragePrefix(businessId)
      window.location.href = `/${slug}/owner/summary`

    } catch (err) {
      setError(err.message || 'Error creating account')
      setShowOnboarding(false)
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
          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-3 pt-10 pb-20">
            <h1 className="font-display text-5xl font-bold !text-white tracking-tight">
              <span style={{ color: '#ffffff' }}>{l.headline}</span>
            </h1>
            <p className="font-sans text-lg !text-white max-w-xl">
              {l.subheadline}
            </p>
          </div>
        </section>

        {/* Interactive Card Section */}
        <section className="flex flex-col items-center px-4 -mt-[132px] relative z-20 pb-6">
          <div className="w-full max-w-md bg-white rounded-[0.75rem] shadow-[0px_10px_15px_-3px_rgba(17,24,39,0.1)] p-6 flex flex-col gap-6 transition-transform duration-300 hover:shadow-[0px_15px_20px_-3px_rgba(17,24,39,0.15)]">
            <div className="text-center flex flex-col gap-1">
              <h2 className="font-display text-3xl font-bold text-gray-900">{l.getStarted}</h2>
              <p className="font-sans text-base text-gray-600">{l.signupSubtitle}</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-[0.5rem] text-sm">{error}</div>
            )}

            <div className="flex flex-col gap-3 mt-1">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full min-h-[48px] bg-emerald-500 text-white rounded-full flex items-center justify-center gap-2 font-sans text-sm font-semibold tracking-wider transition-all duration-200 hover:bg-emerald-700 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
              >
                <GoogleIcon size={18} />
                {loading ? 'Processing...' : l.signupGoogle}
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
            </div>
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
          <a
            href="https://www.instagram.com/foodspotmobile?igsh=MXBvZjk0dWJjcGR0OA%3D%3D&utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 font-sans text-sm cursor-pointer hover:text-emerald-800 transition-colors flex items-center gap-1"
          >
            <InstagramIcon size={16} />
            Instagram
          </a>
        </nav>

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
        />
      )}
    </div>
  )
}

export default TrialSignup
