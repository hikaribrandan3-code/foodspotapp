import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'
import GameHeroEasy from '../../components/GameHero-EASY'

/**
 * Arcade - TikTok-Style Vertical Swipe Game Discovery Feed
 * - Clean Covers
 * - High-Impact Header
 * - Cinematic Layout
 */

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
    const [showQuickGames, setShowQuickGames] = useState(false)

    useEffect(() => {
        if (!showQuickGames) {
            document.body.style.overflow = 'hidden'
            document.documentElement.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
            document.documentElement.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
            document.documentElement.style.overflow = ''
        }
    }, [showQuickGames])

    useEffect(() => {
        const container = containerRef.current
        if (!container || showQuickGames) return

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

        const cards = container.querySelectorAll('[data-game-card]')
        cards.forEach(card => observer.observe(card))
        return () => observer.disconnect()
    }, [showQuickGames])

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
            overflow: 'hidden'
        }}>
            {/* LAYER 1: CONTENT (Scroll Container OR Quick Games Grid) */}
            <div style={{ position: 'relative', flex: 1, width: '100%' }}>
                {!showQuickGames ? (
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
                ) : (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: '#0F172A',
                        zIndex: 100,
                        paddingTop: 'calc(env(safe-area-inset-top, 12px) + 140px)',
                        overflowY: 'auto'
                    }}>
                        <GameHeroEasy />
                    </div>
                )}
            </div>

            {/* LAYER 2: INTERFACE (Header & Toggle) - Always on Top */}
            <header style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 6000,
                padding: '12px',
                paddingTop: 'calc(env(safe-area-inset-top, 12px) + 12px)',
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
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

            <div style={{
                position: 'absolute',
                top: 'calc(env(safe-area-inset-top, 12px) + 75px)',
                left: 0,
                right: 0,
                zIndex: 5500,
                display: 'flex',
                justifyContent: 'center',
                gap: 10,
                pointerEvents: 'none'
            }}>
                <button
                    onClick={() => { setShowQuickGames(false); setActiveGameId(null); }}
                    style={{
                        padding: '8px 20px',
                        background: !showQuickGames ? '#3B82F6' : 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 20,
                        color: 'white',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        pointerEvents: 'auto'
                    }}
                >
                    🎮 ARCADE
                </button>
                <button
                    onClick={() => { setShowQuickGames(true); setActiveGameId(null); }}
                    style={{
                        padding: '8px 20px',
                        background: showQuickGames ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 20,
                        color: 'white',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        pointerEvents: 'auto'
                    }}
                >
                    ⚡ QUICK GAMES
                </button>
            </div>

            {/* LAYER 3: INDICATORS */}
            {!showQuickGames && (
                <div style={{ height: '4px', position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', zIndex: 100 }}>
                    {GAMES.map((_, idx) => (
                        <div key={idx} style={{ flex: 1, background: visibleIndex === idx ? '#3B82F6' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s ease' }} />
                    ))}
                </div>
            )}
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
            <div style={{ height: '100%', width: '100%', position: 'relative', background: '#0F172A' }}>
                {isPlaying ? (
                    <iframe
                        src={`/games/${game.id}/index.html`}
                        title={game.title}
                        style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
                        allow="accelerometer; gyroscope; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen; pointer-lock"
                    />
                ) : (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        backgroundImage: `url(${game.cover})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: '#0F172A'
                    }}>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(180deg, transparent 0%, rgba(15,23,42,0.9) 100%)' }} />
                        <div style={{ position: 'relative', padding: 24, paddingBottom: 60, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPlay(game.id); }}
                                style={{
                                    padding: '16px 40px',
                                    background: '#3B82F6',
                                    border: 'none',
                                    borderRadius: 32,
                                    fontSize: 18,
                                    fontWeight: 800,
                                    color: '#FFFFFF',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 16px rgba(59, 130, 246, 0.4)',
                                    textTransform: 'uppercase'
                                }}
                            >
                                PLAY NOW
                            </button>
                        </div>
                    </div>
                )}
            </div>

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
        const gradient = ctx.createLinearGradient(0, 0, width, height)
        gradient.addColorStop(0, '#8B5CF6'); gradient.addColorStop(1, '#6366F1')
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 36px Arial'; ctx.textAlign = 'center'; ctx.fillText('🍽️ FoodSpot', width / 2, 50)
        ctx.font = 'bold 48px Arial'; ctx.fillText('🎉 VICTORY!', width / 2, 110)
        ctx.font = 'bold 72px Arial'; ctx.fillStyle = '#FFD700'; ctx.fillText(`${score} PTS`, width / 2, 190)
        ctx.font = '24px Arial'; ctx.fillStyle = '#FFFFFF'; ctx.fillText(venueName || 'GrubClub', width / 2, 250)
        ctx.font = '16px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText('Play at FoodSpot → foodspot.app', width / 2, 290)
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
                    try { await navigator.share({ title: '🎉 My FoodSpot Victory!', text: `I scored ${score} points at ${venueName || 'GrubClub'}!`, files: [file] }) }
                    catch (e) { console.log('Share cancelled') }
                } else {
                    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'victory.png'; a.click(); URL.revokeObjectURL(url)
                }
                setShowCanvas(false)
            })
        }, 100)
    }

    return (
        <div style={{ position: 'fixed', bottom: 100, right: 20, zIndex: 1000 }}>
            <button
                onClick={handleShare}
                style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #FFD700, #FFA500)', border: 'none', boxShadow: '0 4px 20px rgba(255, 165, 0, 0.5)', cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                🏆
            </button>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    )
}

export default Arcade
