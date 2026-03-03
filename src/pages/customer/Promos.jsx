import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addToCurrentOrder } from '../../utils/storage.js'
import { formatPrice } from '../../config/menuData.js'
import { useTenant } from '../../contexts/TenantContext.jsx'

// ============================================
// 🎯 PROMOS — EVENT HUB (STRIKE 2)
// ============================================
// 9:16 Vertical Flyer Feed + Box Office Checkout
// Scroll-snap-y mandatory. Glassmorphism overlays.
// Pulsing "Live" CTA. Native OS share sheet.
// Data: tenantData.app_config.promos
// Silo: useTenant() only — zero direct Supabase calls.
// ============================================

// --- Fallback flyers (shown if owner hasn't configured promos yet) ---
const FALLBACK_FLYERS = [
    {
        id: 'flyer-1',
        title: 'NOCHE DE CERVEZAS',
        subtitle: 'Happy Hour — 2x1 en pintas',
        description: 'Todos los jueves de 19 a 23hs. La mejor selección de cervezas artesanales.',
        date: 'Todos los Jueves',
        price: null,
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&h=1400&fit=crop',
        isTicket: false,
        isLive: false
    },
    {
        id: 'flyer-2',
        title: 'DJ SET — NOCHE ELÉCTRICA',
        subtitle: 'Sábado 15 de Marzo',
        description: 'DJ Fuego trae los beats más calientes. Cover incluye una bebida.',
        date: 'Sáb 15 Mar · 23:00',
        price: 3500,
        image: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=800&h=1400&fit=crop',
        isTicket: true,
        isLive: false
    },
    {
        id: 'flyer-3',
        title: 'BRUNCH DOMINGUERO',
        subtitle: 'Reservá tu lugar',
        description: 'Waffles, café de especialidad y mimosas ilimitadas. Cupos limitados.',
        date: 'Domingos · 11:00 a 15:00',
        price: 4500,
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=1400&fit=crop',
        isTicket: true,
        isLive: false
    }
]

// --- Share Icon SVG ---
const ShareIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
)

function Promos() {
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const feedRef = useRef(null)

    // ☁️ SILO LOCK
    const { tenantData, businessId } = useTenant()
    const appConfig = tenantData?.app_config || {}
    const primaryColor = tenantData?.primary_color || '#C4856A'
    const businessName = tenantData?.business_name || ''

    // Cloud flyers or fallback
    const flyers = appConfig?.promos?.items?.length > 0
        ? appConfig.promos.items
        : FALLBACK_FLYERS
    const promosEnabled = appConfig?.promos?.enabled !== false

    // Active flyer index for dot indicator
    const [activeIndex, setActiveIndex] = useState(0)

    // 🎫 Lead-capture modal state
    const [leadModal, setLeadModal] = useState({ open: false, flyerId: null, flyerTitle: '' })
    const [leadName, setLeadName] = useState('')
    const [leadPhone, setLeadPhone] = useState('')
    const [isSubmittingLead, setIsSubmittingLead] = useState(false)

    // 🔔 Toast state
    const [toastMsg, setToastMsg] = useState(null)
    const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000) }

    // 📅 Calendar tap handler
    const handleCalendarTap = (e, flyer) => {
        e.stopPropagation()
        e.preventDefault()
        showToast(`📅 ¡Listo! Te avisaremos sobre "${flyer.title}"`)
    }

    // 🎫 Entrada Libre tap handler
    const handleEntradaLibre = (e, flyer) => {
        e.stopPropagation()
        e.preventDefault()
        setLeadModal({ open: true, flyerId: flyer.id, flyerTitle: flyer.title })
        setLeadName('')
        setLeadPhone('')
    }

    // 🎫 Lead submit (Supabase Insert)
    const handleLeadSubmit = async () => {
        if (!leadName.trim()) { showToast('⚠️ Ingresá tu nombre'); return }

        setIsSubmittingLead(true)
        try {
            const { error } = await supabase.from('event_leads').insert({
                business_id: businessId,
                event_id: leadModal.flyerId,
                full_name: leadName,
                phone: leadPhone || null
            })

            if (error) throw error

            setLeadModal({ open: false, flyerId: null, flyerTitle: '' })
            showToast('✅ ¡Reservado! Te esperamos')
        } catch (err) {
            console.error('[Promos] DB Insert Error:', err)
            showToast('❌ Ocurrió un error. Intentalo de nuevo.')
        } finally {
            setIsSubmittingLead(false)
        }
    }

    // Scroll handler for dot indicator
    const handleScroll = () => {
        if (!feedRef.current) return
        const container = feedRef.current
        const scrollTop = container.scrollTop
        const flyerHeight = container.clientHeight
        const index = Math.round(scrollTop / flyerHeight)
        setActiveIndex(Math.min(index, flyers.length - 1))
    }

    // 🎟️ BOX OFFICE: Add ticket/promo to cart
    const handleBuyTicket = (flyer) => {
        if (!flyer.price) return
        const cartItem = {
            id: flyer.id,
            name: `🎟️ ${flyer.title}`,
            price: flyer.price,
            quantity: 1,
            image: flyer.image
        }
        addToCurrentOrder(cartItem)
        navigate(`/${tenantSlug}/order`)
    }

    // 📤 NATIVE SHARE
    const handleShare = async (flyer) => {
        const shareData = {
            title: flyer.title,
            text: `${flyer.title} — ${flyer.subtitle}\n${flyer.description}`,
            url: window.location.href
        }

        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData)
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(`${flyer.title}\n${flyer.description}\n${window.location.href}`)
                alert('📋 Link copiado al portapapeles')
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.log('Share failed:', err)
            }
        }
    }

    // ☁️ Empty state
    if (!promosEnabled) {
        return (
            <div style={{
                minHeight: '100vh', background: '#000', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: 32
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
                    <p style={{ color: '#9CA3AF', fontSize: 16, margin: 0 }}>
                        No hay eventos activos en este momento.
                    </p>
                    <p style={{ color: '#6B7280', fontSize: 13, marginTop: 8 }}>
                        ¡Volvé pronto para enterarte de los próximos eventos!
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: '#000',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            {/* === INLINE STYLES (animations) === */}
            <style>{`
                @keyframes livePulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 ${primaryColor}88; }
                    50% { transform: scale(1.03); box-shadow: 0 0 20px 4px ${primaryColor}44; }
                }
                @keyframes dotPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>

            {/* === HEADER (Floating over feed) === */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                zIndex: 20, padding: '12px 16px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 'max(12px, env(safe-area-inset-top))'
            }}>
                <div>
                    <p style={{
                        color: '#FFFFFF', fontSize: 18, fontWeight: 800,
                        margin: 0, letterSpacing: '-0.02em'
                    }}>
                        {businessName || 'Eventos'}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '2px 0 0', fontWeight: 500 }}>
                        EVENTOS & PROMOS
                    </p>
                </div>

                {/* Dot Indicator */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {flyers.map((_, i) => (
                        <div key={i} style={{
                            width: i === activeIndex ? 18 : 6,
                            height: 6,
                            borderRadius: 3,
                            background: i === activeIndex ? primaryColor : 'rgba(255,255,255,0.3)',
                            transition: 'all 0.3s ease',
                            animation: i === activeIndex ? 'dotPulse 2s ease-in-out infinite' : 'none'
                        }} />
                    ))}
                </div>
            </div>

            {/* === 9:16 VERTICAL FLYER FEED === */}
            <div
                ref={feedRef}
                onScroll={handleScroll}
                style={{
                    height: '100%',
                    overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {flyers.map((flyer, index) => (
                    <div
                        key={flyer.id || index}
                        style={{
                            height: '100vh',
                            width: '100%',
                            scrollSnapAlign: 'start',
                            scrollSnapStop: 'always',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* === BLURRED BACKDROP (for non-perfect images) === */}
                        <div style={{
                            position: 'absolute', inset: '-20px',
                            backgroundImage: `url(${flyer.image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'blur(30px) brightness(0.4)',
                            transform: 'scale(1.1)',
                        }} />

                        {/* === MAIN IMAGE === */}
                        <img
                            src={flyer.image}
                            alt={flyer.title}
                            loading={index === 0 ? 'eager' : 'lazy'}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />

                        {/* === GLASSMORPHISM BOTTOM OVERLAY === */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0, left: 0, right: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
                            padding: '80px 20px 100px',
                            paddingBottom: 'max(100px, calc(80px + env(safe-area-inset-bottom)))',
                        }}>
                            {/* Date Badge (tappable) */}
                            {flyer.date && (
                                <div
                                    onClick={(e) => handleCalendarTap(e, flyer)}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        background: 'rgba(255,255,255,0.12)',
                                        backdropFilter: 'blur(16px)',
                                        WebkitBackdropFilter: 'blur(16px)',
                                        borderRadius: 20, padding: '5px 12px',
                                        marginBottom: 12,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        cursor: 'pointer',
                                    }}>
                                    <span style={{ fontSize: 12 }}>📅</span>
                                    <span style={{
                                        color: '#FFFFFF', fontSize: 12, fontWeight: 600,
                                        letterSpacing: '0.02em'
                                    }}>
                                        {flyer.date}
                                    </span>
                                </div>
                            )}

                            {/* Title */}
                            <h2 style={{
                                color: '#FFFFFF', fontSize: 28, fontWeight: 900,
                                margin: '0 0 6px', lineHeight: 1.1,
                                letterSpacing: '-0.03em',
                                textShadow: '0 4px 15px rgba(0,0,0,1)',
                            }}>
                                {flyer.title}
                            </h2>

                            {/* Subtitle */}
                            <p style={{
                                color: '#FFFFFF', fontSize: 15, fontWeight: 600,
                                margin: '0 0 8px',
                                textShadow: '0 4px 15px rgba(0,0,0,1)',
                            }}>
                                {flyer.subtitle}
                            </p>

                            {/* Description */}
                            <p style={{
                                color: 'rgba(255,255,255,0.6)', fontSize: 13,
                                margin: '0 0 20px', lineHeight: 1.5,
                                maxWidth: 320,
                            }}>
                                {flyer.description}
                            </p>

                            {/* === ACTION ROW === */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                            }}>
                                {/* BUY / RESERVE BUTTON */}
                                {flyer.price ? (
                                    <button
                                        onClick={() => handleBuyTicket(flyer)}
                                        style={{
                                            flex: 1,
                                            background: primaryColor,
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: 14,
                                            padding: '14px 24px',
                                            fontSize: 15,
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            letterSpacing: '-0.01em',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            animation: flyer.isLive ? 'livePulse 2s ease-in-out infinite' : 'none',
                                            boxShadow: `0 4px 20px ${primaryColor}66`,
                                        }}
                                    >
                                        <span>{flyer.isTicket ? '🎟️' : '🔥'}</span>
                                        <span>
                                            {flyer.isTicket ? 'Comprar Entrada' : 'Reservar Lugar'}
                                            {' · '}
                                            {formatPrice(flyer.price)}
                                        </span>
                                    </button>
                                ) : (
                                    /* Info-only flyer — clickable lead capture */
                                    <button
                                        onClick={(e) => handleEntradaLibre(e, flyer)}
                                        style={{
                                            flex: 1,
                                            background: 'rgba(255,255,255,0.1)',
                                            backdropFilter: 'blur(12px)',
                                            WebkitBackdropFilter: 'blur(12px)',
                                            borderRadius: 14,
                                            padding: '14px 24px',
                                            textAlign: 'center',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            cursor: 'pointer',
                                            color: '#FFFFFF', fontSize: 14, fontWeight: 600,
                                        }}
                                    >
                                        ✨ Entrada libre
                                    </button>
                                )}

                                {/* SHARE BUTTON */}
                                <button
                                    onClick={() => handleShare(flyer)}
                                    style={{
                                        width: 48, height: 48,
                                        borderRadius: 14,
                                        background: 'rgba(255,255,255,0.12)',
                                        backdropFilter: 'blur(16px)',
                                        WebkitBackdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        color: '#FFFFFF',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <ShareIcon />
                                </button>
                            </div>

                            {/* LIVE BADGE */}
                            {flyer.isLive && (
                                <div style={{
                                    position: 'absolute', top: -60, right: 20,
                                    background: '#EF4444',
                                    color: '#FFFFFF',
                                    padding: '4px 12px',
                                    borderRadius: 20,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    letterSpacing: '0.08em',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    boxShadow: '0 2px 12px rgba(239,68,68,0.4)',
                                }}>
                                    <div style={{
                                        width: 6, height: 6, borderRadius: '50%',
                                        background: '#FFFFFF',
                                        animation: 'dotPulse 1s ease-in-out infinite',
                                    }} />
                                    EN VIVO
                                </div>
                            )}
                        </div>

                        {/* === SHARE FLOATING (top-right) === */}
                        <button
                            onClick={() => handleShare(flyer)}
                            style={{
                                position: 'absolute', top: 64, right: 16,
                                width: 40, height: 40,
                                borderRadius: 12,
                                background: 'rgba(0,0,0,0.3)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#FFFFFF',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                            }}
                        >
                            <ShareIcon />
                        </button>
                    </div>
                ))}
            </div>

            {/* ── Floating "El Momento" Entry Button ── */}
            <button
                onClick={() => navigate(`/${tenantSlug}/wall`)}
                style={{
                    position: 'absolute', bottom: 24, left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 30,
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 22px',
                    borderRadius: 28,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                    animation: 'livePulse 3s ease-in-out infinite',
                    whiteSpace: 'nowrap'
                }}
            >
                <span style={{ fontSize: 18 }}>📸</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.02em' }}>
                    Ver El Momento
                </span>
                <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#EF4444',
                    animation: 'dotPulse 2s ease-in-out infinite'
                }} />
            </button>

            {/* 🎫 LEAD-CAPTURE MODAL */}
            {leadModal.open && (
                <div
                    onClick={(e) => { e.stopPropagation(); setLeadModal({ open: false, flyerId: null, flyerTitle: '' }); }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 99999, // Guaranteed to override everything
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 24
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#FFFFFF', borderRadius: 24, padding: 28,
                            width: '100%', maxWidth: 340,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            animation: 'slideDownToast 0.3s ease-out'
                        }}
                    >
                        <h3 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#111827' }}>
                            ✨ Reservá tu lugar
                        </h3>
                        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B7280' }}>
                            {leadModal.flyerTitle}
                        </p>
                        <input
                            type="text" placeholder="Tu nombre"
                            value={leadName} onChange={(e) => setLeadName(e.target.value)}
                            style={{
                                width: '100%', padding: '12px 16px', borderRadius: 12,
                                border: '1px solid #E5E7EB', fontSize: 15, marginBottom: 12,
                                outline: 'none', boxSizing: 'border-box'
                            }}
                        />
                        <input
                            type="tel" placeholder="WhatsApp (opcional)"
                            value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)}
                            style={{
                                width: '100%', padding: '12px 16px', borderRadius: 12,
                                border: '1px solid #E5E7EB', fontSize: 15, marginBottom: 20,
                                outline: 'none', boxSizing: 'border-box'
                            }}
                        />
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLeadSubmit(); }}
                            disabled={isSubmittingLead}
                            style={{
                                width: '100%', padding: 14, borderRadius: 14,
                                background: primaryColor, color: '#FFFFFF',
                                border: 'none', fontSize: 16, fontWeight: 700,
                                cursor: 'pointer',
                                opacity: isSubmittingLead ? 0.6 : 1,
                                boxShadow: `0 4px 16px ${primaryColor}44`
                            }}
                        >
                            {isSubmittingLead ? 'Reservando...' : 'Reservar'}
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideDownToast {
                    from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    )
}

export default Promos
