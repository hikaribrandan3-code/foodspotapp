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
const GAMES = [
    { id: 'empanada-dash', title: 'Empanada Dash', hook: 'Jump, dash, collect! Earn tasty rewards.', cover: '/games/empanada-dash/cover.jpg' },
    { id: 'sushi-slice', title: 'Sushi Slice V2', hook: 'Slice & dice like a master chef.', cover: '/games/sushi-slice/cover.jpg' },
    { id: 'pizza-stack', title: 'Pizza Stack', hook: 'Stack the perfect tower of toppings.', cover: '/games/pizza-stack/cover.jpg' },
    { id: 'burger-builder', title: 'Burger Builder', hook: 'Build burgers at lightning speed.', cover: '/games/burger-builder/cover.jpg' },
    { id: 'taco-run', title: 'Taco Run', hook: 'Run for your life... and tacos!', cover: '/games/taco-run/cover.jpg' },
    { id: 'donut-drop', title: 'Donut Drop', hook: 'Catch donuts, avoid the burns.', cover: '/games/donut-drop/cover.jpg' },
    { id: 'coffee-rush', title: 'Coffee Rush', hook: 'Serve orders before they rage quit.', cover: '/games/coffee-rush/cover.jpg' },
    { id: 'ice-cream-catch', title: 'Ice Cream Catch', hook: 'Stack scoops to the sky.', cover: '/games/ice-cream-catch/cover.jpg' },
    { id: 'waffle-wars', title: 'Waffle Wars', hook: 'Flip, stack, serve. Repeat.', cover: '/games/waffle-wars/cover.jpg' },
    { id: 'noodle-ninja', title: 'Noodle Ninja', hook: 'Slice noodles with precision.', cover: '/games/noodle-ninja/cover.jpg' },
    { id: 'smoothie-blast', title: 'Smoothie Blast', hook: 'Blend ingredients before time runs out.', cover: '/games/smoothie-blast/cover.jpg' },
    { id: 'pancake-flip', title: 'Pancake Flip', hook: 'Master the perfect flip.', cover: '/games/pancake-flip/cover.jpg' }
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
                        src={`/games/${game.id}/index.html`}
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
