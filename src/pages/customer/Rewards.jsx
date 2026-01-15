import { useState, useEffect } from 'react'
import { getRewards } from '../../utils/storage.js'

// --- REWARDS CONFIG (Backend-editable) ---
// Owner can modify these values via backend config
const defaultRewardsConfig = {
    enabled: true,
    stampsRequired: 10,
    nextReward: {
        enabled: true,
        title: '¡Café gratis!'
    }
}

// --- SVG ICONS ---
const GiftIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <rect x="5" y="12" width="14" height="9" rx="1" />
        <path d="M12 8v13" />
        <path d="M12 8c-2-4-6-4-6 0" />
        <path d="M12 8c2-4 6-4 6 0" />
    </svg>
)

const CartIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
)

const InstagramIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="18" cy="6" r="1" fill="currentColor" />
    </svg>
)

const WaveIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18.36 6.64A9 9 0 0 1 21 12c0 2.21-.8 4.24-2.12 5.82" />
        <path d="M15.54 8.46A5 5 0 0 1 17 12a5 5 0 0 1-1.46 3.54" />
        <path d="M12 12h.01" />
        <path d="M7 17l-5-5 5-5" />
    </svg>
)

const CoffeeStampIcon = ({ filled }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={filled ? "#A67C52" : "none"} stroke={filled ? "#8B5E3C" : "#C4A77D"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={filled ? "none" : "3 2"}>
        <circle cx="12" cy="12" r="9" />
        {filled && (
            <>
                <ellipse cx="12" cy="11" rx="4" ry="3" fill="#8B5E3C" stroke="none" />
                <path d="M8 14c0 2 1.8 3 4 3s4-1 4-3" stroke="#8B5E3C" strokeWidth="1.5" fill="none" />
            </>
        )}
    </svg>
)

// --- MAIN COMPONENT ---
function Rewards({ config: configProp }) {
    const config = configProp || {};
    // BATTLE 2: Config MUST come from props (App.jsx is source of truth)
    if (!config) {
        console.error('[FATAL] Rewards: Missing config prop — check App.jsx routing')
        return null
    }
    const appConfig = config
    const [rewards, setRewards] = useState(() => getRewards())

    // Backend config hook - merge with defaults
    const rewardsConfig = {
        ...defaultRewardsConfig,
        ...appConfig.rewards
    }

    // Poll for updates
    useEffect(() => {
        const interval = setInterval(() => {
            setRewards(getRewards())
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    const stampsRequired = rewardsConfig.stampsRequired || 10
    const currentStamps = rewards.stamps || 0
    const progress = Math.min(currentStamps / stampsRequired, 1)
    const stampsRemaining = Math.max(0, stampsRequired - currentStamps)

    // If rewards disabled, show nothing
    if (!rewardsConfig.enabled) {
        return (
            <div style={styles.page}>
                <div style={styles.disabledCard}>
                    <p style={{ color: '#8C8476', textAlign: 'center' }}>
                        Las recompensas no están disponibles en este momento.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div style={styles.page}>
            {/* HEADER */}
            <header style={styles.header}>
                <h1 style={styles.title}>Recompensas</h1>
                <p style={styles.subtitle}>Juntá sellos y ganá premios ⭐</p>
            </header>

            {/* STAMP PROGRESS CARD */}
            <div style={styles.card}>
                <h3 style={styles.stampTitle}>
                    {currentStamps >= stampsRequired
                        ? '🎉 ¡Tenés una recompensa!'
                        : `${stampsRemaining} más para tu premio`
                    }
                </h3>

                {/* 2×5 Stamp Grid */}
                <div style={styles.stampsGrid}>
                    {Array.from({ length: stampsRequired }).map((_, i) => (
                        <div key={i} style={styles.stampSlot}>
                            <CoffeeStampIcon filled={i < currentStamps} />
                        </div>
                    ))}
                </div>

                {/* Progress Bar */}
                <div style={styles.progressContainer}>
                    <div style={styles.progressTrack}>
                        <div style={{
                            ...styles.progressFill,
                            width: `${progress * 100}%`
                        }} />
                    </div>
                    <p style={styles.progressText}>
                        {currentStamps} / {stampsRequired} sellos
                    </p>
                </div>
            </div>

            {/* NEXT REWARD CARD (Owner-editable) */}
            {rewardsConfig.nextReward?.enabled && (
                <div style={styles.card}>
                    <div style={styles.rewardIconWrap}>
                        <GiftIcon />
                    </div>
                    <p style={styles.rewardLabel}>Tu próxima recompensa</p>
                    <p style={styles.rewardTitle}>{rewardsConfig.nextReward.title}</p>
                    <p style={styles.rewardNote}>Placeholder configurable by store owner</p>
                </div>
            )}

            {/* HOW TO EARN STAMPS (Static rules) */}
            <div style={styles.card}>
                <h4 style={styles.rulesTitle}>¿Cómo ganás sellos?</h4>

                <div style={styles.ruleRow}>
                    <div style={styles.ruleIcon}><CartIcon /></div>
                    <div>
                        <p style={styles.ruleLabel}>Hacé un pedido</p>
                        <p style={styles.ruleDesc}>+1 sello por pedido completado</p>
                    </div>
                </div>

                <div style={styles.ruleRow}>
                    <div style={styles.ruleIcon}><InstagramIcon /></div>
                    <div>
                        <p style={styles.ruleLabel}>Compartí en Instagram</p>
                        <p style={styles.ruleDesc}>+1 sello al compartir tu comida</p>
                    </div>
                </div>

                <div style={styles.ruleRow}>
                    <div style={styles.ruleIcon}><WaveIcon /></div>
                    <div>
                        <p style={styles.ruleLabel}>Visitános</p>
                        <p style={styles.ruleDesc}>El staff puede validar tu visita</p>
                    </div>
                </div>
            </div>

            {/* CLAIM BANNER (if eligible) */}
            {currentStamps >= stampsRequired && (
                <div style={styles.claimBanner}>
                    <p style={styles.claimText}>🎁 Mostrá esto al staff para canjear</p>
                    <p style={styles.claimReward}>{rewardsConfig.nextReward?.title}</p>
                </div>
            )}
        </div>
    )
}

// --- STYLES (Warm Beige / Café Premium) ---
const styles = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#F7F4EF',
        padding: '0 16px 100px',
    },
    header: {
        textAlign: 'center',
        padding: '24px 0 20px',
    },
    title: {
        fontSize: 28,
        fontWeight: 700,
        color: '#4A4238',
        margin: 0,
        letterSpacing: '-0.02em',
    },
    subtitle: {
        fontSize: 14,
        color: '#8C8476',
        marginTop: 6,
        margin: 0,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: '20px 16px',
        marginBottom: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    },
    disabledCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 32,
        marginTop: 40,
    },
    stampTitle: {
        fontSize: 18,
        fontWeight: 600,
        color: '#4A4238',
        textAlign: 'center',
        margin: '0 0 20px',
    },
    stampsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: 10,
        justifyItems: 'center',
        marginBottom: 16,
    },
    stampSlot: {
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressContainer: {
        marginTop: 8,
    },
    progressTrack: {
        height: 10,
        borderRadius: 5,
        backgroundColor: '#E8E0D5',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 5,
        backgroundColor: '#A67C52',
        transition: 'width 0.4s ease',
    },
    progressText: {
        textAlign: 'center',
        fontSize: 13,
        color: '#8C8476',
        marginTop: 8,
        margin: 0,
    },
    rewardIconWrap: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 12,
        color: '#A67C52',
    },
    rewardLabel: {
        fontSize: 13,
        color: '#8C8476',
        textAlign: 'center',
        margin: '0 0 4px',
    },
    rewardTitle: {
        fontSize: 22,
        fontWeight: 700,
        color: '#4A4238',
        textAlign: 'center',
        margin: 0,
    },
    rewardNote: {
        fontSize: 10,
        color: '#B8AFA4',
        textAlign: 'center',
        marginTop: 8,
        margin: 0,
    },
    rulesTitle: {
        fontSize: 16,
        fontWeight: 600,
        color: '#4A4238',
        margin: '0 0 16px',
    },
    ruleRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 14,
    },
    ruleIcon: {
        color: '#A67C52',
        flexShrink: 0,
        marginTop: 2,
    },
    ruleLabel: {
        fontSize: 14,
        fontWeight: 500,
        color: '#4A4238',
        margin: 0,
    },
    ruleDesc: {
        fontSize: 12,
        color: '#8C8476',
        margin: '2px 0 0',
    },
    claimBanner: {
        position: 'fixed',
        bottom: 80,
        left: 16,
        right: 16,
        backgroundColor: '#A67C52',
        borderRadius: 16,
        padding: '16px 20px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    },
    claimText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 600,
        margin: '0 0 4px',
    },
    claimReward: {
        color: '#FFFFFF',
        fontSize: 12,
        opacity: 0.9,
        margin: 0,
    },
}

export default Rewards
