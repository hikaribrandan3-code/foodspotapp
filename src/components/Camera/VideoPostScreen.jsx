import React from 'react'

/**
 * VideoPostScreen — Video share preview (CamTech Video Mode)
 *
 * Deliberately editor-free: video goes capture → HERE → share/save.
 * The business pin is already burned into the pixels by useVideoRecorder,
 * so no overlay pill is rendered (it would double up).
 *
 * Note: browsers cannot deep-link media into Instagram Stories — both share
 * buttons open the OS share sheet with the video file attached; the user
 * picks Stories / WhatsApp / etc. from there.
 *
 * Props:
 *   videoData  — { objectURL, blob, mimeType, durationSec }
 *   onRetake   — dump the video, back to camera
 *   onComplete — exit the camera flow after a successful share/save
 */
export default function VideoPostScreen({ videoData, onRetake, onComplete }) {
    const [toast, setToast] = React.useState(null)
    const toastTimer = React.useRef(null)

    const showToast = React.useCallback((msg) => {
        setToast(msg)
        clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(null), 1800)
    }, [])

    React.useEffect(() => () => clearTimeout(toastTimer.current), [])

    const ext = videoData?.mimeType?.includes('mp4') ? 'mp4' : 'webm'
    const shareFile = React.useMemo(() => {
        if (!videoData?.blob) return null
        return new File([videoData.blob], `foodspot-${Date.now()}.${ext}`, { type: videoData.blob.type })
    }, [videoData, ext])

    const shareVideo = React.useCallback(async (title) => {
        try {
            if (shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
                await navigator.share({ files: [shareFile], title })
                return true
            }
            showToast('Compartir no disponible — usá Guardar')
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('[VideoPost] share failed:', err)
                showToast('No se pudo compartir')
            }
        }
        return false
    }, [shareFile, showToast])

    const handleShareStories = React.useCallback(() => shareVideo('FoodSpot Story'), [shareVideo])
    const handleShareSocial  = React.useCallback(() => shareVideo('FoodSpot moment'), [shareVideo])

    const handleSave = React.useCallback(async () => {
        // iOS: share sheet is the only path to Photos. Android: download works.
        try {
            if (shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
                await navigator.share({ files: [shareFile], title: 'Save Video' })
                return
            }
            const a = document.createElement('a')
            a.href = videoData.objectURL
            a.download = `foodspot-${Date.now()}.${ext}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            showToast('Video guardado')
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('[VideoPost] save failed:', err)
                showToast('No se pudo guardar')
            }
        }
    }, [shareFile, videoData, ext, showToast])

    if (!videoData?.objectURL) return null

    return (
        <div style={styles.container}>
            <video
                src={videoData.objectURL}
                style={styles.video}
                autoPlay
                loop
                muted
                playsInline
            />

            {/* Retake — dump video, back to camera */}
            <button onClick={onRetake} aria-label="Retake" style={styles.closeButton}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>

            {toast && <div style={styles.toast}>{toast}</div>}

            {/* Glassmorphism action bar — mirrors DualPostScreen */}
            <div style={styles.actionBar}>
                <button onClick={handleShareStories} style={styles.primaryButton}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
                    </svg>
                    <span>SHARE TO STORIES</span>
                </button>
                <button onClick={handleShareSocial} style={styles.secondaryButton}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    <span>SHARE TO SOCIAL</span>
                </button>
                <button onClick={handleSave} style={styles.tertiaryButton}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>SAVE TO DEVICE</span>
                </button>
            </div>
        </div>
    )
}

const styles = {
    container: {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        userSelect: 'none',
    },
    video: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        pointerEvents: 'none',
        background: '#000',
    },
    closeButton: {
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        left: '16px',
        width: '44px',
        height: '44px',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        zIndex: 1000,
    },
    toast: {
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0px) + 24px)',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        padding: '9px 18px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        zIndex: 1001,
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        padding: '20px 20px',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        zIndex: 10,
    },
    primaryButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '16px 0',
        background: '#22C55E',
        border: 'none',
        borderRadius: '16px',
        color: '#fff',
        fontSize: '15px',
        fontWeight: 800,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        touchAction: 'manipulation',
    },
    secondaryButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '16px 0',
        background: '#FFFFFF',
        border: 'none',
        borderRadius: '16px',
        color: '#000',
        fontSize: '15px',
        fontWeight: 800,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        touchAction: 'manipulation',
    },
    tertiaryButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '14px 0',
        background: 'rgba(255,255,255,0.14)',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: '16px',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        touchAction: 'manipulation',
    },
}
