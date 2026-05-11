import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useTenant } from '../../contexts/TenantContext.jsx'

/**
 * Wall.jsx — STRIKE 5E "El Momento"
 * Real-time social gallery for venue photos.
 * 
 * Features:
 *   - 2-column CSS masonry grid (lightweight, no lib)
 *   - Optimistic hearting (UI first, DB after)
 *   - Supabase Realtime INSERT listener
 *   - Silo-locked by business_id
 *   - Lazy-loaded images for VRAM safety
 */
export default function Wall() {
    const navigate = useNavigate()
    const { tenantSlug } = useParams()
    const { businessId, tenantData } = useTenant()
    const primaryColor = tenantData?.confirmation_color || '#C4856A'
    const businessName = tenantData?.business_name || 'El Momento'

    const [photos, setPhotos] = useState([])
    const [loading, setLoading] = useState(true)
    const [heartedIds, setHeartedIds] = useState(new Set())
    const channelRef = useRef(null)

    // ── Fetch initial photos ──
    useEffect(() => {
        if (!businessId) return
        let cancelled = false

        const fetchPhotos = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('el_momento_photos')
                .select('id, photo_url, guest_token, context, hearts, created_at')
                .eq('business_id', businessId)
                .order('created_at', { ascending: false })
                .limit(100)

            if (!cancelled && !error && data) {
                setPhotos(data)
            }
            if (!cancelled) setLoading(false)
        }

        fetchPhotos()
        return () => { cancelled = true }
    }, [businessId])

    // ── Supabase Realtime: listen for new photos ──
    useEffect(() => {
        if (!businessId) return

        const channel = supabase
            .channel(`wall-${businessId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'el_momento_photos',
                filter: `business_id=eq.${businessId}`
            }, (payload) => {
                setPhotos(prev => [payload.new, ...prev])
            })
            .subscribe()

        channelRef.current = channel

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
            }
        }
    }, [businessId])

    // ── Optimistic Heart ──
    const handleHeart = useCallback(async (photoId) => {
        // Already hearted? Skip
        if (heartedIds.has(photoId)) return

        // Optimistic UI
        setHeartedIds(prev => new Set([...prev, photoId]))
        setPhotos(prev => prev.map(p =>
            p.id === photoId ? { ...p, hearts: (p.hearts || 0) + 1 } : p
        ))

        // DB sync
        try {
            const guestToken = localStorage.getItem('fs_guest_token')
            await supabase
                .from('el_momento_hearts')
                .insert({
                    photo_id: photoId,
                    business_id: businessId,
                    guest_token: guestToken || `anon-${Date.now()}`
                })

            // Update hearts count on the photo
            await supabase.rpc('increment_photo_hearts', { p_photo_id: photoId })
        } catch (e) {
            // Revert on failure
            setHeartedIds(prev => {
                const next = new Set(prev)
                next.delete(photoId)
                return next
            })
            setPhotos(prev => prev.map(p =>
                p.id === photoId ? { ...p, hearts: Math.max(0, (p.hearts || 1) - 1) } : p
            ))
        }
    }, [heartedIds, businessId])

    // ── Time ago helper ──
    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'Ahora'
        if (mins < 60) return `${mins}m`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h`
        return `${Math.floor(hrs / 24)}d`
    }

    // ── Split photos into 2 columns for masonry ──
    const col1 = photos.filter((_, i) => i % 2 === 0)
    const col2 = photos.filter((_, i) => i % 2 === 1)

    return (
        <div style={{
            minHeight: '100vh', background: '#0A0A0A',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            {/* ── Animations ── */}
            <style>{`
                @keyframes wallFadeIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes wallPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes heartPop {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.4); }
                    100% { transform: scale(1); }
                }
            `}</style>

            {/* ── Sticky Header ── */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 50,
                padding: 'max(12px, env(safe-area-inset-top)) 16px 12px',
                background: 'rgba(10,10,10,0.92)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Back button */}
                    <button
                        onClick={() => navigate(`/${tenantSlug}/promos`)}
                        style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.08)', border: 'none',
                            cursor: 'pointer', color: '#FFF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div>
                        <h1 style={{
                            margin: 0, fontSize: 17, fontWeight: 800,
                            color: '#FFFFFF', letterSpacing: '-0.02em'
                        }}>
                            {businessName}
                        </h1>
                        <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            EL MOMENTO
                        </p>
                    </div>
                </div>

                {/* LIVE indicator */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 20,
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)'
                }}>
                    <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#EF4444',
                        animation: 'wallPulse 2s ease-in-out infinite'
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', letterSpacing: '0.08em' }}>LIVE</span>
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ padding: '12px 8px calc(32px + env(safe-area-inset-bottom, 0px))' }}>
                {loading ? (
                    // Skeleton grid
                    <div style={{ display: 'flex', gap: 8 }}>
                        {[0, 1].map(col => (
                            <div key={col} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[0, 1, 2].map(i => (
                                    <div key={i} style={{
                                        height: 180 + Math.random() * 80,
                                        borderRadius: 14,
                                        background: 'rgba(255,255,255,0.04)',
                                        animation: 'wallPulse 1.5s ease-in-out infinite'
                                    }} />
                                ))}
                            </div>
                        ))}
                    </div>
                ) : photos.length === 0 ? (
                    // Empty state
                    <div style={{
                        textAlign: 'center', padding: '80px 32px',
                        color: 'rgba(255,255,255,0.4)'
                    }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>📸</div>
                        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                            El Momento está vacío
                        </h3>
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
                            Sé el primero en compartir una foto y ganar sellos ⭐
                        </p>
                    </div>
                ) : (
                    // Masonry Grid
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {col1.map((photo, i) => (
                                <PhotoCard
                                    key={photo.id}
                                    photo={photo}
                                    index={i * 2}
                                    hearted={heartedIds.has(photo.id)}
                                    onHeart={() => handleHeart(photo.id)}
                                    timeAgo={timeAgo(photo.created_at)}
                                    primaryColor={primaryColor}
                                />
                            ))}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {col2.map((photo, i) => (
                                <PhotoCard
                                    key={photo.id}
                                    photo={photo}
                                    index={i * 2 + 1}
                                    hearted={heartedIds.has(photo.id)}
                                    onHeart={() => handleHeart(photo.id)}
                                    timeAgo={timeAgo(photo.created_at)}
                                    primaryColor={primaryColor}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Photo Card ──
function PhotoCard({ photo, index, hearted, onHeart, timeAgo, primaryColor }) {
    return (
        <div style={{
            position: 'relative',
            borderRadius: 14,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.03)',
            animation: `wallFadeIn 0.4s ease ${index * 0.06}s both`
        }}>
            {/* Photo (Nintendo Pill already burned in) */}
            <img
                src={photo.photo_url}
                alt="El Momento"
                loading="lazy"
                style={{
                    width: '100%', display: 'block',
                    minHeight: 160,
                    objectFit: 'cover'
                }}
            />

            {/* Overlay gradient */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 64,
                background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                pointerEvents: 'none'
            }} />

            {/* Heart button + count */}
            <button
                onClick={onHeart}
                style={{
                    position: 'absolute', bottom: 8, right: 8,
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 10px', borderRadius: 20,
                    background: hearted ? primaryColor : 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    border: hearted ? 'none' : '1px solid rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    animation: hearted ? 'heartPop 0.3s ease' : 'none'
                }}
            >
                <span style={{ fontSize: 14 }}>{hearted ? '❤️' : '🤍'}</span>
                <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: '#FFFFFF'
                }}>
                    {photo.hearts || 0}
                </span>
            </button>

            {/* Time ago badge */}
            <div style={{
                position: 'absolute', bottom: 10, left: 8,
                fontSize: 10, fontWeight: 600,
                color: 'rgba(255,255,255,0.6)',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}>
                {timeAgo}
            </div>
        </div>
    )
}
