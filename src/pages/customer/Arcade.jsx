import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'

/**
 * Arcade - TikTok-Style Vertical Swipe Game Discovery Feed
 * 
 * Architecture:
 * - Vertical snap scroll (100vh per card)
 * - Lazy iframe loading (only active game has iframe)
 * - Memory cleanup on swipe (unmount inactive iframes)
 */

// 🎮 GAME REGISTRY: The 12 games with metadata
// 🎮 GAME REGISTRY: The 12 games with metadata (Flat-Silo Structure)
const GAMES = [
    { id: 'avoid-zone-engine', title: 'Avoid Zone', hook: 'Dodging is the only option.', cover: '/games/avoid-zone-engine.jpg' },
    { id: 'collapse-stack', title: 'Collapse Stack', hook: 'Keep the tower stable!', cover: '/games/collapse-stack.jpg' },
    { id: 'empanada-dash', title: 'Empanada Dash', hook: 'Jump, dash, collect! Earn tasty rewards.', cover: '/games/empanada-dash.jpg' },
    { id: 'falling-choice-gate', title: 'Falling Gates', hook: 'Choose wisely or fall forever.', cover: '/games/falling-choice-gate.jpg' },
    { id: 'false-hold', title: 'False Hold', hook: 'Trust nothing. Keep moving.', cover: '/games/false-hold.jpg' },
    { id: 'gravity-flip-runner', title: 'Gravity Flip', hook: 'Up is down. Down is up.', cover: '/games/gravity-flip-runner.jpg' },
    { id: 'last-known-good', title: 'Last Known Good', hook: 'Restore order before the crash.', cover: '/games/last-known-good.jpg' },
    { id: 'lock-in-drift', title: 'Lock-In Drift', hook: 'Drift tight, hold the line.', cover: '/games/lock-in-drift.jpg' },
    { id: 'pegfall-panic', title: 'Pegfall Panic', hook: 'Don\'t let the pegs win.', cover: '/games/pegfall-panic.jpg' },
    { id: 'side-scroller-runner', title: 'Side Scroller', hook: 'Classic running action.', cover: '/games/side-scroller-runner.jpg' },
    { id: 'sushi-slicev2', title: 'Sushi Slice V2', hook: 'Slice precision required.', cover: '/games/sushi-slicev2.jpg' },
    { id: 'triple-snap-slots', title: 'Triple Snap', hook: 'Can you hit the jackpot?', cover: '/games/triple-snap-slots.jpg' }
]

const Arcade = () => {
    const navigate = useNavigate()
    const { tenantData, slug: tenantSlug } = useTenant()
    const containerRef = useRef(null)

    // 🎮 STATE: Track which game is currently playing (only one at a time)
    const [activeGameId, setActiveGameId] = useState(null)
    const [visibleIndex, setVisibleIndex] = useState(0)

    // 🛡️ MEMORY CLEANUP: Intersection Observer to detect visible card
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        const index = parseInt(entry.target.getAttribute('data-index'), 10)
                        const gameId = entry.target.getAttribute('data-game-id')

                        setVisibleIndex(index)

                        // 🛡️ CRITICAL: If user swiped away from active game, kill the iframe
                        if (activeGameId && activeGameId !== gameId) {
                            console.log('[ARCADE] Memory Cleanup: Killing iframe for', activeGameId)
                            setActiveGameId(null)
                        }
                    }
                })
            },
            {
                root: container,
                threshold: 0.5
            }
        )

        const cards = container.querySelectorAll('[data-game-card]')
        cards.forEach(card => observer.observe(card))

        return () => observer.disconnect()
    }, [activeGameId])

    // 🎮 PLAY HANDLER: Load iframe for specific game
    const handlePlay = useCallback((gameId) => {
        console.log('[ARCADE] Starting game:', gameId)
        setActiveGameId(gameId)
    }, [])

    // 🔙 BACK HANDLER: Navigate to home
    const handleBack = useCallback(() => {
        const homePath = tenantSlug ? `/${tenantSlug}/home` : '/home'
        navigate(homePath)
    }, [navigate, tenantSlug])

    const businessName = tenantData?.business_name || 'FoodSpot'

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#FAFAFA',
            zIndex: 50
        }}>
            {/* 🎨 BRANDED GLASS HEADER */}
            <header style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                padding: '12px',
                paddingTop: 'calc(env(safe-area-inset-top, 12px) + 12px)',
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(0,0,0,0.06)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    maxWidth: '100%',
                    margin: '0 auto'
                }}>
                    {/* Back Button */}
                    <button
                        onClick={handleBack}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: 8,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Title */}
                    <div style={{ textAlign: 'center' }}>
                        <p style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#94A3B8',
                            margin: 0,
                            letterSpacing: '0.05em'
                        }}>
                            {businessName}
                        </p>
                        <h1 style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: 20,
                            fontWeight: 800,
                            color: '#0F172A',
                            margin: 0,
                            letterSpacing: '0.02em'
                        }}>
                            Mini Games
                        </h1>
                    </div>

                    {/* Spacer for alignment */}
                    <div style={{ width: 40 }} />
                </div>
            </header>

            {/* 🎮 VERTICAL SNAP SCROLL CONTAINER */}
            <div
                ref={containerRef}
                style={{
                    height: '100vh',
                    overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    WebkitOverflowScrolling: 'touch',
                    paddingTop: 80, /* Space for header */
                    paddingBottom: 80 /* Space for bottom nav */
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
        </div>
    )
}

/**
 * GameCard - Individual Discovery Card
 */
const GameCard = ({ game, index, isPlaying, onPlay, isVisible }) => {
    return (
        <div
            data-game-card
            data-game-id={game.id}
            data-index={index}
            style={{
                height: 'calc(100vh - 160px)', /* Account for header + nav */
                width: '100%',
                scrollSnapAlign: 'start',
                padding: '12px',
                boxSizing: 'border-box'
            }}
        >
            <div style={{
                height: '100%',
                width: '100%',
                borderRadius: 24,
                overflow: 'hidden',
                position: 'relative',
                background: '#E5E0D8',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
            }}>
                {isPlaying ? (
                    /* 🎮 IFRAME MODE: Game is active */
                    <iframe
                        src={`/games/${game.id}.html`}
                        title={game.title}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none'
                        }}
                        allow="accelerometer; gyroscope; autoplay"
                    />
                ) : (
                    /* 📺 POSTER MODE: Show cover + Play button */
                    <>
                        {/* Cover Image */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundImage: `url(${game.cover})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}>
                            {/* Fallback gradient if no cover */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)'
                            }} />
                        </div>

                        {/* Game Info (Bottom) */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: 20,
                            background: 'rgba(255,255,255,0.95)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)'
                        }}>
                            <h2 style={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontSize: 22,
                                fontWeight: 800,
                                color: '#0F172A',
                                margin: 0,
                                marginBottom: 4
                            }}>
                                {game.title}
                            </h2>
                            <p style={{
                                fontSize: 14,
                                fontWeight: 400,
                                color: '#64748B',
                                margin: 0,
                                marginBottom: 16
                            }}>
                                {game.hook}
                            </p>

                            {/* Play Button */}
                            <button
                                onClick={onPlay}
                                style={{
                                    width: '100%',
                                    padding: '14px 0',
                                    background: '#FFFFFF',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: 12,
                                    fontFamily: 'Montserrat, sans-serif',
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: '#0F172A',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                    transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                                }}
                            >
                                Play
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default Arcade
