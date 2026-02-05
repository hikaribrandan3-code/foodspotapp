import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'

/**
 * Arcade - TikTok-Style Vertical Swipe Game Discovery Feed
 * PERFECT 10 EDITION - Pointer Events Fixed for Scroll
 */

// 🎮 GAME REGISTRY: The Perfect 10 games with verified covers
const GAMES = [
    { id: 'empanada-dash', title: 'Empanada Dash', hook: 'Jump, dash, collect! Earn tasty rewards.', cover: '/games/empanada-dash.jpg' },
    { id: 'triple-snap-slots', title: 'Triple Snap', hook: 'Can you hit the jackpot?', cover: '/games/triplesnapslots.jpg' },
    { id: 'sushi-slicev2', title: 'Sushi Slice', hook: 'Slice precision required.', cover: '/games/sushislicernew.jpg' },
    { id: 'gravity-flip-runner', title: 'Gravity Flip', hook: 'Up is down. Down is up.', cover: '/games/gravityflip.jpg' },
    { id: 'pegfall-panic', title: 'Peg Stack', hook: 'Don\'t let the pegs fall!', cover: '/games/pegstacker.png' },
    { id: 'side-scroller-runner', title: 'Box Runner', hook: 'Classic running action.', cover: '/games/siderunnergamecover.png' },
    { id: 'false-hold', title: 'False Hold', hook: 'Keep the rhythm!', cover: '/games/falsehold.jpg' },
    { id: 'falling-choice-gate', title: 'Escapa del Turno', hook: 'Overtime Edition - Escape now!', cover: '/games/escapadelturno.jpg' },
    { id: 'avoid-zone-engine', title: 'Cuidado con la Grasa', hook: 'Dodge the grease!', cover: '/games/avoid-zone-engine.png' },
    { id: 'collapse-stack', title: 'Burger Stacker', hook: 'Stack the perfect burger!', cover: '/games/collapse-stack.jpg' }
]

const Arcade = () => {
    const navigate = useNavigate()
    const { tenantData, slug: tenantSlug } = useTenant()
    const containerRef = useRef(null)

    const [activeGameId, setActiveGameId] = useState(null)
    const [visibleIndex, setVisibleIndex] = useState(0)

    // 🛡️ SCROLL UNLOCK
    useEffect(() => {
        document.body.style.overflow = 'hidden' // Lock body, scroll inside container
        document.body.style.touchAction = 'none'
        document.documentElement.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
            document.body.style.touchAction = ''
            document.documentElement.style.overflow = ''
        }
    }, [])

    // 🛡️ MEMORY CLEANUP
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
                        const index = parseInt(entry.target.getAttribute('data-index'), 10)
                        const gameId = entry.target.getAttribute('data-game-id')
                        setVisibleIndex(index)
                        if (activeGameId && activeGameId !== gameId) {
                            setActiveGameId(null)
                        }
                    }
                })
            },
            { root: container, threshold: 0.6 }
        )

        const cards = container.querySelectorAll('[data-game-card]')
        cards.forEach(card => observer.observe(card))
        return () => observer.disconnect()
    }, [activeGameId])

    const handlePlay = useCallback((gameId) => {
        setActiveGameId(gameId)
    }, [])

    const handleBack = useCallback(() => {
        const homePath = tenantSlug ? `/${tenantSlug}/home` : '/home'
        navigate(homePath)
    }, [navigate, tenantSlug])

    const businessName = tenantData?.business_name || 'FoodSpot'

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: '#0F172A',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            height: '100dvh',
            pointerEvents: 'auto' /* 🛡️ FORCE INTERACTION ON ROOT */
        }}>
            {/* 🎨 HEADER */}
            <header style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                padding: '12px',
                paddingTop: 'calc(env(safe-area-inset-top, 12px) + 12px)',
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                pointerEvents: 'none' /* 🛡️ LET TOUCHES PASS THROUGH */
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <button
                        onClick={handleBack}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            padding: 8,
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto' /* 🛡️ BACK BUTTON IS CLICKABLE */
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{businessName}</p>
                        <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 18, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Discover Games</h1>
                    </div>

                    <div style={{ width: 40 }} />
                </div>
            </header>

            {/* 🎮 SCROLL CONTAINER - THE ONE TRUE SCROLLABLE ELEMENT */}
            <div
                ref={containerRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehaviorY: 'contain',
                    touchAction: 'pan-y', /* 🛡️ CRITICAL: ONLY VERTICAL SCROLL */
                    pointerEvents: 'auto' /* 🛡️ FORCE INTERACTION ON SCROLL CONTAINER */
                }}
            >
                {GAMES.map((game, index) => (
                    <GameCard
                        key={game.id}
                        game={game}
                        index={index}
                        isPlaying={activeGameId === game.id}
                        onPlay={() => handlePlay(game.id)}
                        isVisible={visibleIndex === index}
                    />
                ))}
            </div>

            {/* 📊 FOOTER NAV INDICATOR */}
            <div style={{
                height: '4px',
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                zIndex: 100,
                pointerEvents: 'none' /* 🛡️ LET TOUCHES PASS THROUGH */
            }}>
                {GAMES.map((_, idx) => (
                    <div key={idx} style={{
                        flex: 1,
                        background: visibleIndex === idx ? '#3B82F6' : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.3s ease'
                    }} />
                ))}
            </div>
        </div>
    )
}

const GameCard = ({ game, index, isPlaying, onPlay, isVisible }) => {
    return (
        <div
            data-game-card
            data-game-id={game.id}
            data-index={index}
            style={{
                height: '100dvh', /* 🛡️ FULL DYNAMIC VIEWPORT HEIGHT */
                width: '100%',
                scrollSnapAlign: 'start',
                position: 'relative',
                flexShrink: 0
            }}
        >
            <div style={{
                height: '100%',
                width: '100%',
                position: 'relative',
                background: '#1E293B'
            }}>
                {isPlaying ? (
                    <iframe
                        src={`/games/${game.id}/index.html`}
                        title={game.title}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            pointerEvents: 'auto',
                            position: 'relative',
                            zIndex: 10
                        }}
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
                        allow="accelerometer; gyroscope; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    />
                ) : (
                    /* 📺 POSTER MODE */
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        backgroundImage: `url(${game.cover})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: '#1E293B',
                        pointerEvents: 'none' /* 🛡️ LET SCROLL THROUGH */
                    }}>
                        {/* Gradient Overlay */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '50%',
                            background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.9) 100%)',
                            pointerEvents: 'none'
                        }} />

                        {/* UI Layer */}
                        <div style={{
                            position: 'relative',
                            padding: 24,
                            paddingBottom: 40,
                            zIndex: 10,
                            pointerEvents: 'none' /* 🛡️ TEXT IS TRANSPARENT TO TOUCH */
                        }}>
                            <h2 style={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontSize: 28,
                                fontWeight: 900,
                                color: '#FFFFFF',
                                margin: 0,
                                marginBottom: 8,
                                textShadow: '0 2px 8px rgba(0,0,0,0.5)'
                            }}>
                                {game.title}
                            </h2>
                            <p style={{
                                fontSize: 16,
                                fontWeight: 400,
                                color: '#CBD5E1',
                                margin: 0,
                                marginBottom: 24,
                                textShadow: '0 1px 4px rgba(0,0,0,0.5)'
                            }}>
                                {game.hook}
                            </p>

                            {/* PLAY BUTTON - ONLY CLICKABLE ELEMENT ON CARD */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPlay(game.id);
                                }}
                                style={{
                                    padding: '16px 48px',
                                    background: '#3B82F6',
                                    border: 'none',
                                    borderRadius: 32,
                                    fontFamily: 'Montserrat, sans-serif',
                                    fontSize: 18,
                                    fontWeight: 800,
                                    color: '#FFFFFF',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 16px rgba(59, 130, 246, 0.4)',
                                    pointerEvents: 'auto' /* 🛡️ ONLY THIS IS CLICKABLE */
                                }}
                            >
                                PLAY NOW
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Arcade
