/**
 * TrialSignup.jsx — Google OAuth Only
 *
 * Simplified auth with Google OAuth only.
 * User signs up with Google → Onboarding → Creates business
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { setTenantStoragePrefix } from '../../utils/storage.js'
import OnboardingModal from '../../components/Onboarding/OnboardingModal'
import './TrialSignup.css'

const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const icons = {
    google: <><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></>,
    language: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    groups: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || null}
    </svg>
  )
}

const TRANSLATIONS = {
  en: {
    headlineBrand: 'Foodspot: The OS',
    headlinePrefix: ' That Turns Diners Into\n',
    headlineAccent: 'Content Creators !',
    subheadline: 'Your menu. Their content. Your growth.',
    liveMenus: 'Live Menus',
    instantCheckout: 'Instant Checkout',
    creatorLoop: 'Creator Loop',
    trialDays: '14',
    trialText: 'Day Trial',
    orContinueWith: 'Continue with',
    google: 'Google',
    processing: 'Processing...',
    needHelp: 'Need help?',
    contactSupport: 'Contact support on WhatsApp'
  },
  es: {
    headlineBrand: 'Foodspot: El SO',
    headlinePrefix: ' Que Convierte Clientes En\n',
    headlineAccent: '¡Content Creators!',
    subheadline: 'Tu menú. Su contenido. Tu crecimiento.',
    liveMenus: 'Menús en Vivo',
    instantCheckout: 'Pago Instantáneo',
    creatorLoop: 'Creator Loop',
    trialDays: '14',
    trialText: 'Días de Prueba',
    orContinueWith: 'Continuar con',
    google: 'Google',
    processing: 'Procesando...',
    needHelp: '¿Necesitas ayuda?',
    contactSupport: 'Contacta a soporte en WhatsApp'
  },
  pt: {
    headlineBrand: 'Foodspot: O SO',
    headlinePrefix: ' Que Transforma Clientes Em\n',
    headlineAccent: 'Criadores de Conteúdo!',
    subheadline: 'Seu menu. Seu conteúdo. Seu crescimento.',
    liveMenus: 'Menus ao Vivo',
    instantCheckout: 'Pagamento Instantâneo',
    creatorLoop: 'Creator Loop',
    trialDays: '14',
    trialText: 'Dias de Avaliação',
    orContinueWith: 'Continuar com',
    google: 'Google',
    processing: 'Processando...',
    needHelp: 'Precisa de ajuda?',
    contactSupport: 'Contate o suporte no WhatsApp'
  }
}

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

const FloatingBadge = ({ number, text }) => (
  <div className="dm-float-deco">
    <div style={{ textAlign: 'center' }}>
      <span className="dm-float-deco__number">{number}</span>
      <span className="dm-float-deco__text">{text}</span>
    </div>
  </div>
)

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

      // Create branding record
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
    <>
      <HeroBackground />

      {/* Language Switcher */}
      <button onClick={cycleLang} className="lang-switcher">
        <Icon name="language" size={18} />
        {lang.toUpperCase()}
      </button>

      {/* Navigation */}
      <header className="dm-nav">
        <NavBrand />
      </header>

      {/* Main Content */}
      <main className="dm-main">
        <div className="dm-grid">
          {/* Headline Section */}
          <div className="dm-text-center">
            <h1 className="dm-h1" style={{ whiteSpace: 'pre-line' }}>
              <span>{l.headlineBrand}</span>{l.headlinePrefix}<span className="dm-h1__accent">{l.headlineAccent}</span>{l.headlineSuffix}
            </h1>
            <p className="dm-p dm-p--light">{l.subheadline}</p>
            <div className="dm-features">
              <FeatureItem icon="menu" text={l.liveMenus} />
              <FeatureItem icon="bolt" text={l.instantCheckout} />
              <FeatureItem icon="groups" text={l.creatorLoop} />
            </div>
          </div>

          {/* Form Card */}
          <div className="dm-glass-wrapper">
            <div className="dm-glass-card">
              <div className="dm-glass-card__header">
                <h2 className="dm-h2">Get Started</h2>
                <p className="dm-glass-card__subtitle">Sign up with Google to create your FoodSpot account</p>
              </div>

              {error && <div className="dm-error">{error}</div>}

              <div className="dm-form">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="dm-btn-primary"
                  style={{ width: '100%', marginBottom: '20px' }}
                >
                  {loading ? (
                    <>
                      <Icon name="google" size={18} /> {l.processing}
                    </>
                  ) : (
                    <>
                      <Icon name="google" size={18} /> {l.google}
                    </>
                  )}
                </button>
              </div>

              <div className="dm-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '20px', paddingTop: '20px', marginBottom: '80px' }}>
                <p className="dm-footer__text">
                  {l.needHelp}{' '}
                  <a href="https://wa.me/543512122600?text=I need help with FoodSpot" target="_blank" rel="noopener noreferrer" className="dm-footer__link">
                    {l.contactSupport}
                  </a>
                </p>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '20px', paddingTop: '16px', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                📍 Córdoba, Capital, Argentina
              </div>
            </div>

            <FloatingBadge number={l.trialDays} text={l.trialText} />
          </div>
        </div>
      </main>

      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </>
  )
}

export default TrialSignup
