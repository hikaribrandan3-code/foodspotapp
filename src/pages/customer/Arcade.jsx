import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'

/**
 * Arcade - Unified Game Feed
 * All games in one scrollable 9:16 format
 */

// Custom games (local)
const CUSTOM_GAMES = [
    { id: 'empanada-dash', title: 'Empanada Dash', hook: 'Jump, dash, collect! Earn tasty rewards.', cover: '/games/empanada-dash.jpg', type: 'local' },
    { id: 'triple-snap-slots', title: 'Triple Snap', hook: 'Can you hit the jackpot?', cover: '/games/triplesnapslots.jpg', type: 'local' },
    { id: 'sushi-slicev2', title: 'Sushi Slice', hook: 'Slice precision required.', cover: '/games/sushislicernew.jpg', type: 'local' },
    { id: 'gravity-flip-runner', title: 'Gravity Flip', hook: 'Up is down. Down is up.', cover: '/games/gravityflip.jpg', type: 'local' },
    { id: 'pegfall-panic', title: 'Peg Stack', hook: 'Don\'t let the pegs fall!', cover: '/games/pegstacker.png', type: 'local' },
    { id: 'side-scroller-runner', title: 'Box Runner', hook: 'Classic running action.', cover: '/games/siderunnergamecover.png', type: 'local' },
    { id: 'false-hold', title: 'False Hold', hook: 'Keep the rhythm!', cover: '/games/falsehold.jpg', type: 'local' },
    { id: 'falling-choice-gate', title: 'Escapa del Turno', hook: 'Overtime Edition - Escape now!', cover: '/games/escapadelturno.jpg', type: 'local' },
    { id: 'avoid-zone-engine', title: 'Cuidado con la Grasa', hook: 'Dodge the grease!', cover: '/games/avoid-zone-engine.png', type: 'local' },
    { id: 'collapse-stack', title: 'Burger Stacker', hook: 'Stack the perfect burger!', cover: '/games/collapse-stack.jpg', type: 'local' }
]

// Quick games (external iframes)
const QUICK_GAMES = [
    { id: '2048', title: '2048', hook: 'Merge tiles to reach 2048!', cover: '🔢', type: 'external', url: 'https://gabrielecirulli.github.io/2048/' },
    { id: 'hextris', title: 'Hextris', hook: 'Rotate hexagon, match colors.', cover: '🔷', type: 'external', url: 'https://hextris.github.io/hextris/' },
    { id: 'stack', title: 'Stack', hook: 'Stack blocks perfectly.', cover: '📚', type: 'external', url: 'https://stevengoldberg.github.io/stack/' },
    { id: 'clumsybird', title: 'Clumsy Bird', hook: 'Tap to fly, don\'t crash!', cover: '🐤', type: 'external', url: 'https://ellisonleao.github.io/clumsy-bird/' },
    { id: 'tictactoe', title: 'Tic Tac Toe', hook: 'Classic X vs O.', cover: '⭕', type: 'external', url: 'https://beumsk.github.io/Tic-Tac-Toe/' },
    { id: 'connect4', title: 'Connect Four', hook: 'Line up 4 to win.', cover: '🔴', type: 'external', url: 'https://kenrick95.github.io/connect-four/' },
]

// All games combined
const ALL_GAMES = [...CUSTOM_GAMES, ...QUICK_GAMES]

const Arcade = () => {
    const navigate = useNavigate()
    const { tenantData, slug: tenantSlug } = useTenant()
    const containerRef = useRef(null)

    const [activeGame, setActiveGame] = useState(null)
    const [visibleIndex, setVisibleIndex] = useState(0)

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        document.documentElement.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
            document.documentElement.style.overflow = ''
        }
    }, [])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
                        const index = parseInt(entry.target.getAttribute('data-index'), 10)
                        setVisibleIndex(index)
                    }
                })
            },
            { root: container, threshold: 0.6 }
        )

        const cards = container.querySelectorAll('[data-index]')
        cards.forEach(card => observer.observe(card))
        return () => observer.disconnect()
    }, [])

    const handlePlay = useCallback((game) => {
        setActiveGame(game)
    }, [])

    const handleClose = useCallback(() => {
        setActiveGame(null)
    }, [])

    const handleBack = useCallback(() => {
        const homePath = tenantSlug ? `/${tenantSlug}/home` : '/home'
        navigate(homePath, { replace: true })
    }, [navigate, tenantSlug])

    const businessName = tenantData?.business_name || 'FoodSpot'

    // If playing external game, show fullscreen iframe
    if (activeGame?.type === 'external') {
        return (
            <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 99999 }}>
                <iframe
                    src={activeGame.url}
                    title={activeGame.title}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    allow="fullscreen"
                    sandbox="allow-scripts allow-same-origin"
                />
                <button
                    onClick={handleClose}
                    style={{
                        position: 'fixed',
                        top: 10,
                        right: 10,
                        zIndex: 100000,
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.8)',
                        border: '2px solid white',
                        color: 'white',
                        fontSize: 20,
                        cursor: 'pointer'
                    }}
                >
                    ✕
                </button>
            </div>
        )
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: '#0F172A',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            height: '100dvh',
            overflow: 'hidden'
        }}>
            {/* Scroll Container */}
            <div
                ref={containerRef}
                style={{
                    position: 'absolute',
                    inset: 0,
                    overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    WebkitOverflowScrolling: 'touch',
                    zIndex: 10
                }}
            >
                {ALL_GAMES.map((game, index) => (
                    <GameCard
                        key={game.id}
                        game={game}
                        index={index}
                        isPlaying={activeGame?.id === game.id}
                        onPlay={() => handlePlay(game)}
                        isVisible={visibleIndex === index}
                        businessName={businessName}
                    />
                ))}
            </div>

            {/* Header */}
            <header style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 6000,
                padding: '12px',
                paddingTop: 'calc(env(safe-area-inset-top, 12px) + 12px)',
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, transparent 100%)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button onClick={handleBack} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', padding: 8, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{businessName}</p>
                        <p style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.6)', margin: 0 }}>ARCADE</p>
                    </div>
                    <div style={{ width: 40 }} />
                </div>
            </header>

            {/* Progress Indicators */}
            <div style={{
                position: 'fixed',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                zIndex: 100
            }}>
                {ALL_GAMES.map((_, idx) => (
                    <div key={idx} style={{
                        width: 4,
                        height: visibleIndex === idx ? 24 : 4,
                        borderRadius: 2,
                        background: visibleIndex === idx ? '#3B82F6' : 'rgba(255,255,255,0.2)',
                        transition: 'all 0.3s ease'
                    }} />
                ))}
            </div>
        </div>
    )
}

const GameCard = ({ game, index, isPlaying, onPlay, isVisible, businessName }) => {
    // External games use emoji covers, local games use image paths
    const isExternal = game.type === 'external'

    return (
        <div
            data-game-card
            data-index={index}
            style={{
                height: '100dvh',
                width: '100%',
                scrollSnapAlign: 'start',
                position: 'relative',
                flexShrink: 0
            }}
        >
            <div style={{ height: '100%', width: '100%', position: 'relative', background: '#0F172A' }}>
                {isPlaying ? (
                    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
                        <iframe
                            src={`/games/${game.id}/index.html`}
                            title={game.title}
                            style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
                            allow="accelerometer; gyroscope; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen; pointer-lock"
                        />
                        {/* Close button for local games */}
                        <button
                            onClick={(e) => { e.stopPropagation(); window.location.reload(); }}
                            style={{
                                position: 'absolute',
                                top: 'calc(env(safe-area-inset-top, 12px) + 12px)',
                                right: 12,
                                zIndex: 100000,
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.5)',
                                border: 'none',
                                color: 'white',
                                fontSize: 18,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        background: isExternal
                            ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
                            : `url(${game.cover})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}>
                        {/* Gradient overlay for text readability */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(180deg, transparent 0%, rgba(15,23,42,0.9) 100%)' }} />

                        {/* Content */}
                        <div style={{
                            position: 'relative',
                            padding: '24px 24px 48px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 12
                        }}>
                            {/* Emoji or icon for external games */}
                            {isExternal && (
                                <span style={{ fontSize: 80, marginBottom: 10 }}>{game.cover}</span>
                            )}

                            <h2 style={{ color: 'white', fontSize: 32, fontWeight: 900, margin: 0, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                                {game.title}
                            </h2>

                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, margin: 0, textAlign: 'center', maxWidth: '80%' }}>
                                {game.hook}
                            </p>

                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPlay(); }}
                                style={{
                                    marginTop: 24,
                                    padding: '18px 56px',
                                    background: isExternal ? '#8B5CF6' : '#3B82F6',
                                    border: 'none',
                                    borderRadius: 40,
                                    fontSize: 18,
                                    fontWeight: 900,
                                    color: '#FFFFFF',
                                    cursor: 'pointer',
                                    boxShadow: isExternal
                                        ? '0 10px 20px rgba(139, 92, 246, 0.4)'
                                        : '0 10px 20px rgba(59, 130, 246, 0.4)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                {isExternal ? '⚡ PLAY NOW' : 'PLAY NOW'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Arcade
