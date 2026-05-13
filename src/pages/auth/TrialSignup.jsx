import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../../utils/storage.js'
import OnboardingModal from '../../components/Onboarding/OnboardingModal'
import './TrialSignup.css'

// ============================================
// GOOGLE ICON
// ============================================
const GoogleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8 flex flex-col gap-5"
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
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
    <div className="min-h-screen flex flex-col bg-white">
      {/* Hero Section */}
      <section
        className="h-[530px] min-h-[400px] w-full bg-cover bg-center flex flex-col items-center justify-center px-4 text-center relative overflow-hidden"
        style={{
          backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB-P3U7v1O8MTwyyyOSCbZsMfSkvEXUg6v3oTiwqjE9VFKgUPfgJTmcimbn4eEKypIfL14gJ8pGbVv36LP0HRwMpVaMoAQKQTq1vdPLxLXUpRpsF7Ieas5qWn7aXmJDiT8NUktgSNzOER9YgM_2ArhxwhKW6F12KMIY6OyMEu_eXMGgO3QgetRwZ7QywBIKvgowlTOGBcniDH5EfalhhZ9LMyaq72B4rvOdPCNy-cg_xbXdYIjqHJ8CR7kFTgbLAfnq8uOyGK-scA')"
        }}
      >
        <div className="absolute inset-0 bg-black/60 z-0" />
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-3 pt-10 pb-20">
          <h1 style={{ color: '#ffffff' }} className="!text-white text-4xl md:text-5xl font-bold drop-shadow-lg leading-tight">
            {l.headline}
          </h1>
          <p style={{ color: '#ffffff' }} className="!text-white text-lg md:text-xl drop-shadow-md">
            {l.subheadline}
          </p>
        </div>
      </section>

      {/* Language Switcher */}
      <button
        onClick={cycleLang}
        className="fixed top-4 right-4 bg-gray-600 hover:bg-gray-700 text-white rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors z-40"
      >
        <span>🌐</span>
        {lang.toUpperCase()}
      </button>

      {/* Card Section */}
      <main className="flex flex-col items-center px-4 -mt-32 relative z-20 pb-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 md:p-8 flex flex-col gap-6">
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{l.getStarted}</h2>
            <p className="text-gray-700 text-sm">{l.signupSubtitle}</p>
          </div>

          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full min-h-12 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white rounded-full flex items-center justify-center gap-2 font-semibold transition-all duration-200 active:scale-95 shadow-sm"
          >
            <GoogleIcon size={18} />
            {loading ? 'Processing...' : l.signupGoogle}
          </button>

          <div className="text-center border-t border-gray-200 pt-4">
            <p className="text-gray-700 text-sm">
              {l.haveAccount}{' '}
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-green-600 font-semibold hover:text-green-700"
              >
                {l.login}
              </button>
            </p>
          </div>

          <div className="pt-4 flex justify-center">
            <a
              href="https://wa.me/543512122600?text=I need help with FoodSpot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-700 text-sm font-medium"
            >
              <span className="underline underline-offset-2">{l.needHelp}? {l.contactSupport}</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto w-full bg-gray-50 border-t border-gray-200 py-6 px-4 text-center">
        <p className="text-gray-900 font-semibold text-sm mb-2">FoodSpot Mobile</p>
        <p className="text-gray-700 text-xs">© 2025 FoodSpot Mobile. All rights reserved.</p>
        <p className="text-gray-700 text-xs mt-1">📍 {l.location}</p>
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
