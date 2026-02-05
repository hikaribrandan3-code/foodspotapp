import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'

/**
 * Arcade - TikTok-Style Vertical Swipe Game Discovery Feed
 */

// 🎮 GAME REGISTRY: The 12 games (Folder Structure)
const GAMES = [
    { id: 'avoid-zone-engine', title: 'Avoid Zone', hook: 'Dodging is the only option.', cover: '/games/avoid-zone-engine/cover.jpg' },
    { id: 'collapse-stack', title: 'Collapse Stack', hook: 'Keep the tower stable!', cover: '/games/collapse-stack/cover.jpg' },
    { id: 'empanada-dash', title: 'Empanada Dash', hook: 'Jump, dash, collect! Earn tasty rewards.', cover: '/games/empanada-dash/cover.jpg' },
    { id: 'falling-choice-gate', title: 'Falling Gates', hook: 'Choose wisely or fall forever.', cover: '/games/falling-choice-gate/cover.jpg' },
    { id: 'false-hold', title: 'False Hold', hook: 'Trust nothing. Keep moving.', cover: '/games/false-hold/cover.jpg' },
    { id: 'gravity-flip-runner', title: 'Gravity Flip', hook: 'Up is down. Down is up.', cover: '/games/gravity-flip-runner/cover.jpg' },
    { id: 'last-known-good', title: 'Last Known Good', hook: 'Restore order before the crash.', cover: '/games/last-known-good/cover.jpg' },
    { id: 'lock-in-drift', title: 'Lock-In Drift', hook: 'Drift tight, hold the line.', cover: '/games/lock-in-drift/cover.jpg' },
    { id: 'pegfall-panic', title: 'Pegfall Panic', hook: 'Don\'t let the pegs win.', cover: '/games/pegfall-panic/cover.jpg' },
    { id: 'side-scroller-runner', title: 'Side Scroller', hook: 'Classic running action.', cover: '/games/side-scroller-runner/cover.jpg' },
    { id: 'sushi-slicev2', title: 'Sushi Slice V2', hook: 'Slice precision required.', cover: '/games/sushi-slicev2/cover.jpg' },
    { id: 'triple-snap-slots', title: 'Triple Snap', hook: 'Can you hit the jackpot?', cover: '/games/triple-snap-slots/cover.jpg' }
]

const Arcade = () => {
    const navigate = useNavigate()
    const { tenantData, slug: tenantSlug } = useTenant()
    const containerRef = useRef(null)

    // 🎮 STATE
    const [activeGameId, setActiveGameId] = useState(null)
    const [visibleIndex, setVisibleIndex] = useState(0)

    // 🛡️ SCROLL & INTERACTION UNLOCK
    useEffect(() => {
        // Force unlock body scroll and touch
        document.body.style.overflow = 'auto'
        document.body.style.touchAction = 'auto'
        document.documentElement.style.overflow = 'auto'

        return () => {
            // No cleanup to avoid re-locking
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

                        // If we are playing a different game than the one we just swiped into, kill it
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
            background: '#0F172A', /* Dark mode for arcade */
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            height: '100dvh'
        }}>
            {/* 🎨 HEADER (Overlay Style) */}
            <header style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                padding: '12px',
                paddingTop: 'calc(env(safe-area-inset-top, 12px) + 12px)',
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
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
                            justifyContent: 'center'
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{businessName}</p>
                        <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 18, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Discover Games</h1>
                    </div>

                    <div style={{ width: 40 }} />
                </div>
            </header>

            {/* 🎮 SCROLL CONTAINER */}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehaviorY: 'contain',
                    height: '100%',
                    width: '100%'
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
                zIndex: 100
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
                height: '100%',
                width: '100%',
                scrollSnapAlign: 'start',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
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
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        padding: 24,
                        paddingBottom: 80,
                        backgroundImage: `linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.9) 100%), url(${game.cover})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: '#1E293B'
                    }}>
                        <div style={{ maxWidth: '80%' }}>
                            <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 28, fontWeight: 900, color: '#FFFFFF', margin: 0, marginBottom: 8 }}>{game.title}</h2>
                            <p style={{ fontSize: 16, fontWeight: 400, color: '#CBD5E1', margin: 0, marginBottom: 24 }}>{game.hook}</p>

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
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
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
