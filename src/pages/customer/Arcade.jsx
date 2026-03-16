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

// Quick games (external iframes) - MOBILE VERIFIED
const QUICK_GAMES = [
    { id: '2048', title: '2048 📱', hook: 'Merge tiles to reach 2048!', cover: '🔢', type: 'external', url: 'https://gabrielecirulli.github.io/2048/' },
    { id: 'hextris', title: 'Hextris 📱', hook: 'Rotate hexagon, match colors.', cover: '🔷', type: 'external', url: 'https://hextris.github.io/hextris/' },
    { id: 'stack', title: 'Stack 📱', hook: 'Stack blocks perfectly.', cover: '📚', type: 'external', url: 'https://stevengoldberg.github.io/stack/' },
    { id: 'clumsybird', title: 'Clumsy Bird 📱', hook: 'Tap to fly, don\'t crash!', cover: '🐤', type: 'external', url: 'https://ellisonleao.github.io/clumsy-bird/' },
    { id: 'tictactoe', title: 'Tic Tac Toe 📱', hook: 'Classic X vs O.', cover: '⭕', type: 'external', url: 'https://beumsk.github.io/Tic-Tac-Toe/' },
    { id: 'connect4', title: 'Connect Four 📱', hook: 'Line up 4 to win.', cover: '🔴', type: 'external', url: 'https://kenrick95.github.io/connect-four/' },
]

// All games combined
const ALL_GAMES = [...CUSTOM_GAMES, ...QUICK_GAMES]

const Arcade = () => {
    const navigate = useNavigate()
    const { tenantData, slug: tenantSlug } = useTenant()
    const containerRef = useRef(null)

    const [activeGame, setActiveGame] = useState(null)
    const [visibleIndex, setVisibleIndex] = useState(0)
    const [showLicense, setShowLicense] = useState(false)

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

        const cards = container.querySelectorAll('[data-game-card]')
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
        navigate(homePath)
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
                    sandbox="allow-scripts allow-same-origin allow-pointer-lock"
                />
                <button 
                    onClick={handleClose}
                    onTouchStart={handleClose}
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
                        cursor: 'pointer',
                        touchAction: 'manipulation'
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
            overflow: 'hidden',
            touchAction: 'none'
        }}>
            {/* Scroll Container */}
            <div
                ref={containerRef}
                style={{
                    position: 'relative',
                    flex: 1,
                    overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y',
                    zIndex: 10,
                    marginTop: 'calc(env(safe-area-inset-top, 12px) + 60px)'
                }}
            >
                {ALL_GAMES.map((game, index) => (
                    <div
                        key={game.id}
                        data-game-card
                        data-index={index}
                        onClick={() => handlePlay(game)}
                        style={{
                            height: 'calc(100dvh - 60px)',
                            scrollSnapAlign: 'start',
                            scrollSnapStop: 'always',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '0 20px',
                            position: 'relative',
                            touchAction: 'pan-y',
                            cursor: 'pointer'
                        }}
                    >
                        {/* Game Cover */}
                        {game.type === 'local' ? (
                            <img 
                                src={game.cover} 
                                alt={game.title}
                                style={{
                                    width: '100%',
                                    maxWidth: 320,
                                    aspectRatio: '9/16',
                                    objectFit: 'cover',
                                    borderRadius: 24,
                                    marginBottom: 24,
                                    boxShadow: visibleIndex === index 
                                        ? '0 20px 60px rgba(0,0,0,0.5)' 
                                        : '0 10px 30px rgba(0,0,0,0.3)',
                                    transform: visibleIndex === index ? 'scale(1)' : 'scale(0.95)',
                                    transition: 'all 0.3s ease',
                                    opacity: visibleIndex === index ? 1 : 0.6
                                }}
                            />
                        ) : (
                            <div style={{
                                width: '100%',
                                maxWidth: 320,
                                aspectRatio: '9/16',
                                borderRadius: 24,
                                marginBottom: 24,
                                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 120,
                                boxShadow: visibleIndex === index 
                                    ? '0 20px 60px rgba(0,0,0,0.5)' 
                                    : '0 10px 30px rgba(0,0,0,0.3)',
                                transform: visibleIndex === index ? 'scale(1)' : 'scale(0.95)',
                                transition: 'all 0.3s ease',
                                opacity: visibleIndex === index ? 1 : 0.6,
                                border: '2px solid #334155'
                            }}>
                                <span>{game.cover}</span>
                                <span style={{ fontSize: 14, color: '#94a3b8', marginTop: 16 }}>📱 Mobile</span>
                            </div>
                        )}

                        {/* Game Info */}
                        <div style={{ textAlign: 'center', maxWidth: 320 }}>
                            <h2 style={{ 
                                fontSize: 28, 
                                fontWeight: 800, 
                                color: '#fff', 
                                margin: '0 0 8px',
                                textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                            }}>
                                {game.title}
                            </h2>
                            <p style={{ 
                                fontSize: 16, 
                                color: '#94a3b8', 
                                margin: '0 0 24px',
                                lineHeight: 1.5 
                            }}>
                                {game.hook}
                            </p>
                            <button
                                style={{
                                    padding: '16px 48px',
                                    background: '#3B82F6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 30,
                                    fontSize: 18,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
                                    touchAction: 'manipulation'
                                }}
                            >
                                PLAY NOW
                            </button>
                        </div>

                        {/* Scroll indicator */}
                        {index < ALL_GAMES.length - 1 && (
                            <div style={{
                                position: 'absolute',
                                bottom: 20,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                animation: 'bounce 2s infinite'
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M12 5v14M19 12l-7 7-7-7"/>
                                </svg>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Header Controls */}
            <div style={{
                position: 'fixed',
                top: 'max(12px, env(safe-area-inset-top))',
                left: 16,
                right: 16,
                zIndex: 100,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pointerEvents: 'none'
            }}>
                <button
                    onClick={handleBack}
                    onTouchStart={handleBack}
                    style={{
                        padding: '10px 16px',
                        background: 'rgba(15,23,42,0.9)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid #334155',
                        borderRadius: 20,
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        touchAction: 'manipulation',
                        pointerEvents: 'auto'
                    }}
                >
                    ← Back
                </button>

                <button
                    onClick={() => setShowLicense(true)}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'rgba(15,23,42,0.9)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid #334155',
                        color: '#fff',
                        fontSize: 16,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        touchAction: 'manipulation',
                        pointerEvents: 'auto'
                    }}
                >
                    ⓘ
                </button>
            </div>

            {/* License Modal */}
            {showLicense && (
                <div 
                    onClick={() => setShowLicense(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20
                    }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#1e293b',
                            borderRadius: 16,
                            padding: 24,
                            maxWidth: 400,
                            maxHeight: '80vh',
                            overflow: 'auto',
                            color: '#fff'
                        }}
                    >
                        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Game Licenses</h3>
                        <div style={{ fontSize: 13, lineHeight: 1.6, color: '#94a3b8' }}>
                            <p style={{ marginBottom: 12 }}>FoodSpot Arcade includes MIT-licensed open source games:</p>
                            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                                <li><strong>2048</strong> - Gabriele Cirulli</li>
                                <li><strong>Stack</strong> - Steven Goldberg</li>
                                <li><strong>Hextris</strong> - Hextris Team</li>
                                <li><strong>Clumsy Bird</strong> - Ellison Leão</li>
                                <li><strong>Tic Tac Toe</strong> - beumsk</li>
                                <li><strong>Connect Four</strong> - Kenrick</li>
                            </ul>
                            <p style={{ fontSize: 11, opacity: 0.7 }}>
                                Full license text: grubclub/LICENSE-ACKNOWLEDGMENTS.md
                            </p>
                        </div>
                        <button
                            onClick={() => setShowLicense(false)}
                            style={{
                                marginTop: 16,
                                width: '100%',
                                padding: 12,
                                background: '#3B82F6',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes bounce {
                    0%, 100% { transform: translateX(-50%) translateY(0); }
                    50% { transform: translateX(-50%) translateY(8px); }
                }
            `}</style>

        </div>
    )
}

export default Arcade
