import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { incrementInstagramShare } from '../../utils/storage.js'
import { useLanguage } from '../../contexts/LanguageContext.jsx'

function ShareFood({ config: configProp }) {
    const config = configProp || {};
    // BATTLE 2: Config MUST come from props (App.jsx is source of truth)
    if (!config) {
        console.error('[FATAL] ShareFood: Missing config prop — check App.jsx routing')
        return null
    }
    const navigate = useNavigate()
    const { tenantSlug } = useParams() // 🏢 SILO-AWARE: Get tenant from URL
    const { t } = useLanguage()
    const appConfig = config
    const [shared, setShared] = useState(false)

    const handleShare = () => {
        // Increment share counter for analytics
        incrementInstagramShare()

        // Try to open Instagram Stories
        // On mobile, this should open the Instagram app to Stories
        const instagramStoryUrl = 'instagram-stories://share'
        const instagramWebUrl = 'https://www.instagram.com'

        // Try the native app link first
        const startTime = Date.now()
        window.location.href = instagramStoryUrl

        // If still on page after 1.5s, fallback to web
        setTimeout(() => {
            if (Date.now() - startTime < 2000) {
                window.open(instagramWebUrl, '_blank')
            }
        }, 1500)

        setShared(true)
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">{t('share_food_title')}</h1>
                <p className="page-subtitle">{t('share_instagram_earn')}</p>
            </div>

            {/* Main Card */}
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>📸</div>

                <h3 style={{ marginBottom: 'var(--space-3)' }}>
                    ¡Compartí una foto!
                </h3>

                <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                    Sacá una foto de tu pedido, subila a tus Stories y etiquetanos
                </p>

                {!shared ? (
                    <button
                        className="btn btn-primary btn-lg btn-block"
                        onClick={handleShare}
                    >
                        🔗 Abrir Instagram Stories
                    </button>
                ) : (
                    <div style={{
                        background: 'rgba(90, 139, 85, 0.1)',
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-lg)'
                    }}>
                        <p style={{ color: 'var(--color-success)', fontWeight: 'var(--font-weight-semibold)' }}>
                            ✅ ¡Genial!
                        </p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                            Mostrá tu Story al staff para validar tu sello
                        </p>
                    </div>
                )}
            </div>

            {/* Steps */}
            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
                <h4 style={{ marginBottom: 'var(--space-3)' }}>¿Cómo funciona?</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'var(--font-weight-bold)',
                            fontSize: 'var(--font-size-sm)',
                            flexShrink: 0
                        }}>1</div>
                        <div>
                            <p style={{ fontWeight: 'var(--font-weight-medium)' }}>{t('take_photo')}</p>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                De tu café, comida o del local
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'var(--font-weight-bold)',
                            fontSize: 'var(--font-size-sm)',
                            flexShrink: 0
                        }}>2</div>
                        <div>
                            <p style={{ fontWeight: 'var(--font-weight-medium)' }}>{t('upload_stories')}</p>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                Etiquetá a {appConfig.businessInfo?.instagram || '@grubclub.ar'}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'var(--font-weight-bold)',
                            fontSize: 'var(--font-size-sm)',
                            flexShrink: 0
                        }}>3</div>
                        <div>
                            <p style={{ fontWeight: 'var(--font-weight-medium)' }}>{t('show_story')}</p>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                El staff valida y sumás +1 sello
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reward Reminder */}
            <div className="card" style={{
                marginTop: 'var(--space-4)',
                background: 'linear-gradient(135deg, var(--color-card) 0%, var(--color-primary-light) 100%)',
                textAlign: 'center'
            }}>
                <p style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                    🎁 Juntá 10 sellos = {appConfig.rewards?.rewardDescription || '¡Café gratis!'}
                </p>
            </div>

            {/* Back Button */}
            <button
                className="btn btn-secondary btn-block"
                style={{ marginTop: 'var(--space-4)' }}
                onClick={() => navigate(`/${tenantSlug}`)}
            >
                Volver al inicio
            </button>
        </div>
    )
}

export default ShareFood
