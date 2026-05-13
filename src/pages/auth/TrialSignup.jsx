import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../../utils/storage.js'
import OnboardingModal from '../../components/Onboarding/OnboardingModal'
import './TrialSignup.css'

const TRANSLATIONS = {
  en: {
    headline: 'Foodspot: The OS That Turns Diners Into Content Creators',
    subheadline: 'Your menu. Their content. Your growth.',
    getStarted: 'Get Started',
    signupSubtitle: 'Sign up with Google to create your FoodSpot account',
    signupGoogle: 'Sign up with Google',
    haveAccount: 'Already have an account?',
    login: 'Log in',
    needHelp: 'Need help?',
    contactSupport: 'Contact support on WhatsApp',
    location: 'Córdoba, Argentina'
  },
  es: {
    headline: 'Foodspot: El SO Que Convierte Clientes En Creadores De Contenido',
    subheadline: 'Tu menú. Su contenido. Tu crecimiento.',
    getStarted: 'Comenzar',
    signupSubtitle: 'Regístrate con Google para crear tu cuenta de FoodSpot',
    signupGoogle: 'Registrarse con Google',
    haveAccount: '¿Ya tienes una cuenta?',
    login: 'Iniciar sesión',
    needHelp: '¿Necesitas ayuda?',
    contactSupport: 'Contacta a soporte en WhatsApp',
    location: 'Córdoba, Argentina'
  },
  pt: {
    headline: 'Foodspot: O SO Que Transforma Clientes Em Criadores De Conteúdo',
    subheadline: 'Seu menu. Seu conteúdo. Seu crescimento.',
    getStarted: 'Começar',
    signupSubtitle: 'Cadastre-se com Google para criar sua conta FoodSpot',
    signupGoogle: 'Cadastrar com Google',
    haveAccount: 'Já tem uma conta?',
    login: 'Faça login',
    needHelp: 'Precisa de ajuda?',
    contactSupport: 'Contate o suporte no WhatsApp',
    location: 'Córdoba, Argentina'
  }
}


const TrialSignup = () => {
  const [lang, setLang] = useState('en')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

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
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-2 pt-10 pb-20">
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg leading-tight">
            {l.headline}
          </h1>
          <p className="text-lg md:text-xl text-white drop-shadow-md">
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
            {loading ? 'Processing...' : l.signupGoogle}
          </button>

          <div className="text-center border-t border-gray-200 pt-4">
            <p className="text-gray-700 text-sm">
              {l.haveAccount}{' '}
              <a href="#" className="text-green-600 font-semibold hover:text-green-700">
                {l.login}
              </a>
            </p>
          </div>

          <div className="pt-4">
            <a
              href="https://wa.me/543512122600?text=I need help with FoodSpot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-medium group"
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
    </div>
  )
}

export default TrialSignup
