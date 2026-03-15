import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'
import GameHeroEasy from '../../components/GameHero-EASY'

/**
 * Arcade - TikTok-Style Vertical Swipe Game Discovery Feed
 * PERFECT 10 EDITION - VISUAL PURITY ACT
 * - Clean Covers (No redundant text)
 * - Bigger Header
 * - Cinematic Layout
 */

// 🎮 GAME REGISTRY: The Perfect 10 games
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

    // 🎮 STATE
    const [activeGameId, setActiveGameId] = useState(null)
    const [visibleIndex, setVisibleIndex] = useState(0)
    const [showQuickGames, setShowQuickGames] = useState(false)

    // 🛡️ SCROLL & INTERACTION UNLOCK
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
            pointerEvents: 'auto'
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
                background: 'rgba(15, 23, 42, 0.4)', /* Lighter backdrop */
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                pointerEvents: 'none'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <button
                        onClick={handleBack}
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            padding: 8,
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto'
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
                        {/* 💎 UPDATED VISUAL HIERARCHY */}
                        <p style={{
                            fontSize: 14, /* Bigger */
                            fontWeight: 700, /* Bolder */
                            color: '#FFFFFF', /* Brighter */
                            margin: 0,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}>
                            {businessName}
                        </p>
                        <h1 style={{
                            display: 'none' /* Hidden for cleaner look, or verify if user wants title too? Keeping for now hidden to emphasize brand */
                        }}>Discover Games</h1>
                        {/* Option B: Keep title smaller? Let's assume user wants BRAND name big. */}
                        <p style={{
                            fontSize: 10,
                            fontWeight: 500,
                            color: 'rgba(255,255,255,0.7)',
                            margin: 0
                        }}>ARCADE</p>
                    </div>

                    <div style={{ width: 40 }} />
                </div>
            </header>

            {/* 🎮 QUICK GAMES TOGGLE BUTTON */}
            <div style={{
                position: 'absolute',
                top: 'calc(env(safe-area-inset-top, 12px) + 70px)',
                left: 0,
                right: 0,
                zIndex: 90,
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                pointerEvents: 'auto'
            }}>
                <button
                    onClick={() => setShowQuickGames(false)}
                    style={{
                        padding: '10px 24px',
                        background: showQuickGames ? 'rgba(255,255,255,0.1)' : '#3B82F6',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 24,
                        color: 'white',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    🎮 ARCADE
                </button>
                <button
                    onClick={() => setShowQuickGames(true)}
                    style={{
                        padding: '10px 24px',
                        background: showQuickGames ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 24,
                        color: 'white',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    ⚡ QUICK GAMES
                </button>
            </div>

            {/* 🎮 QUICK GAMES OVERLAY */}
            {showQuickGames && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: '#0F172A',
                    zIndex: 80,
                    paddingTop: 'calc(env(safe-area-inset-top, 12px) + 140px)',
                    overflowY: 'auto'
                }}>
                    <GameHeroEasy />
                </div>
            )}

            {/* 🎮 SCROLL CONTAINER */}
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
                    touchAction: 'pan-y',
                    pointerEvents: 'auto'
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
                        businessName={businessName}
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
                pointerEvents: 'none'
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

const GameCard = ({ game, index, isPlaying, onPlay, isVisible, businessName }) => {
    return (
        <div
            data-game-card
            data-game-id={game.id}
            data-index={index}
            style={{
                height: '100dvh',
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
                    /* 📺 POSTER MODE - CLEAN */
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        /* 📷 CENTERED COVER, NO CROPPING THE TOP LOGO */
                        backgroundImage: `url(${game.cover})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center 20%', /* Shift focus slightly up so logo is safe */
                        backgroundColor: '#1E293B',
                        pointerEvents: 'none'
                    }}>
                        {/* 🔽 REDUCED GRADIENT - ONLY BOTTOM 25% */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '25%',
                            background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 100%)',
                            pointerEvents: 'none'
                        }} />

                        {/* 🕹️ UI Layer - BUTTON ONLY */}
                        <div style={{
                            position: 'relative',
                            padding: 24,
                            paddingBottom: 40,
                            zIndex: 10,
                            pointerEvents: 'none',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexDirection: 'column'
                        }}>
                            {/* 🧹 TITLE & HOOK DELETED as requested */}

                            {/* PLAY BUTTON - ONLY CLICKABLE ELEMENT */}
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
                                    pointerEvents: 'auto'
                                }}
                            >
                                PLAY NOW
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* VICTORY SHARE BUTTON */}
            <ShareVictoryButton venueName={businessName} />
        </div>
    )
}

function ShareVictoryButton({ venueName }) {
    const [score, setScore] = useState(0)
    const [showCanvas, setShowCanvas] = useState(false)
    const canvasRef = useRef(null)

    useEffect(() => {
        const stored = localStorage.getItem('grubclub_highscore')
        if (stored) setScore(parseInt(stored, 10))
    }, [])

    const generateVictoryImage = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        const width = 600
        const height = 315

        canvas.width = width
        canvas.height = height

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, width, height)
        gradient.addColorStop(0, '#8B5CF6')
        gradient.addColorStop(1, '#6366F1')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)

        // FoodSpot Logo text
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 36px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('🍽️ FoodSpot', width / 2, 50)

        // Victory text
        ctx.font = 'bold 48px Arial'
        ctx.fillText('🎉 VICTORY!', width / 2, 110)

        // Score
        ctx.font = 'bold 72px Arial'
        ctx.fillStyle = '#FFD700'
        ctx.fillText(`${score} PTS`, width / 2, 190)

        // Venue name
        ctx.font = '24px Arial'
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(venueName || 'GrubClub', width / 2, 250)

        // Footer
        ctx.font = '16px Arial'
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillText('Play at FoodSpot → foodspot.app', width / 2, 290)

        setShowCanvas(true)
    }, [score, venueName])

    const handleShare = async () => {
        generateVictoryImage()

        setTimeout(() => {
            const canvas = canvasRef.current
            if (!canvas) return

            canvas.toBlob(async (blob) => {
                if (!blob) return

                const file = new File([blob], 'victory.png', { type: 'image/png' })

                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: '🎉 My FoodSpot Victory!',
                            text: `I scored ${score} points at ${venueName || 'GrubClub'}!`,
                            files: [file]
                        })
                    } catch (e) {
                        console.log('Share cancelled')
                    }
                } else {
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'victory.png'
                    a.click()
                    URL.revokeObjectURL(url)
                }
                setShowCanvas(false)
            })
        }, 100)
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: 100,
            right: 20,
            zIndex: 100
        }}>
            <button
                onClick={handleShare}
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(255, 165, 0, 0.5)',
                    cursor: 'pointer',
                    fontSize: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                🏆
            </button>
            <canvas ref={canvasRef} style={{ display: showCanvas ? 'block' : 'none' }} />
        </div>
    )
}

export default Arcade
