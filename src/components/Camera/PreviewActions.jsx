import React from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { earnUGCPoints, getCustomerIdentifier } from '../../lib/loyaltyClient';

/**
 * PreviewActions.jsx — Immersive Preview Layer
 * Electric Green primary + Pure White secondary + Discard link.
 * Renders inside the glassmorphism action bar (no self-positioning).
 */
export const PreviewActions = ({ capturedImg, capturedBlob, onDone }) => {
    const { businessId } = useTenant();
    const { t } = useLanguage();
    const [debugLogs, setDebugLogs] = React.useState([]);
    const [ugcToast, setUgcToast] = React.useState(null);
    const shareBtnRef = React.useRef(null);
    const saveBtnRef = React.useRef(null);

    const addLog = React.useCallback((msg, isError = false) => {
        setDebugLogs(prev => [...prev, { msg, isError, time: new Date().toLocaleTimeString() }].slice(-5));
        console.log(`[PreviewActions] ${msg}`);
    }, []);

    const shareFile = React.useMemo(() => {
        if (capturedBlob) {
            return new File([capturedBlob], `foodspot-${Date.now()}.jpg`, { type: 'image/jpeg' });
        }
        return null;
    }, [capturedBlob]);

    // 💾 SAVE TO GALLERY 
    const handleSaveToGallery = React.useCallback(async (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        addLog("Save executed");

        try {
            if (shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
                await navigator.share({ files: [shareFile], title: 'Save Image' });
                return;
            }

            let blob = capturedBlob;
            if (!blob && typeof capturedImg === 'string' && capturedImg.startsWith('data:')) {
                const res = await fetch(capturedImg);
                blob = await res.blob();
            } else if (!blob && capturedImg instanceof Blob) {
                blob = capturedImg;
            }

            if (blob) {
                const url = URL.createObjectURL(blob);
                const newWindow = window.open();
                if (newWindow) {
                    newWindow.document.write('<html><head><title>Save Image</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#000;color:#fff;font-family:sans-serif;flex-direction:column;"><img src="' + url + '" style="max-width:100%;max-height:90vh;"/><p style="margin-top:20px;">Mantén presionado la imagen para guardarla en Fotos.</p></body></html>');
                    newWindow.document.close();
                } else {
                    window.location.href = url;
                }
                return;
            }
        } catch (err) {
            if (err.name !== 'AbortError') addLog(`Save err: ${err.message}`, true);
        }
    }, [shareFile, capturedBlob, capturedImg, addLog]);

    const awardUGCPoints = React.useCallback(() => {
        if (!businessId) return;
        const identifier = getCustomerIdentifier(businessId);
        if (!identifier) return;
        earnUGCPoints(identifier, businessId).then(({ earned, points }) => {
            if (earned && points) {
                setUgcToast(points);
                setTimeout(() => setUgcToast(null), 4000);
            }
        }).catch(() => {});
    }, [businessId]);

    // 🚀 SHARE TO SOCIALS
    const handleShare = React.useCallback(async (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        addLog("Share executed");

        try {
            if (shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
                await navigator.share({
                    files: [shareFile],
                    title: 'Check out my FoodSpot moment!',
                    text: 'Shared via FoodSpot',
                });
                awardUGCPoints();
                return;
            }

            let file = shareFile;
            if (!file && typeof capturedImg === 'string' && capturedImg.startsWith('data:')) {
                const res = await fetch(capturedImg);
                const blob = await res.blob();
                file = new File([blob], `foodspot-${Date.now()}.jpg`, { type: 'image/jpeg' });
            } else if (!file && capturedImg instanceof Blob) {
                file = new File([capturedImg], `foodspot-${Date.now()}.jpg`, { type: 'image/jpeg' });
            }

            if (navigator.share && file) {
                await navigator.share({
                    files: [file],
                    title: 'Check out my FoodSpot moment!',
                    text: 'Shared via FoodSpot',
                });
                awardUGCPoints();
            } else {
                alert("Sharing is not supported on this browser or device. Try saving to gallery instead.");
            }
        } catch (err) {
            if (err.name !== 'AbortError') addLog(`Share err: ${err.message}`, true);
        }
    }, [shareFile, capturedImg, addLog, awardUGCPoints]);

    // CRITICAL: Manually bind native DOM events to bypass React SyntheticEvents
    React.useEffect(() => {
        const shareBtn = shareBtnRef.current;
        const saveBtn = saveBtnRef.current;

        if (shareBtn) {
            shareBtn.onclick = handleShare;
            shareBtn.ontouchend = (e) => { e.preventDefault(); handleShare(); };
        }
        if (saveBtn) {
            saveBtn.onclick = handleSaveToGallery;
            saveBtn.ontouchend = (e) => { e.preventDefault(); handleSaveToGallery(); };
        }

        return () => {
            if (shareBtn) { shareBtn.onclick = null; shareBtn.ontouchend = null; }
            if (saveBtn) { saveBtn.onclick = null; saveBtn.ontouchend = null; }
        };
    }, [handleShare, handleSaveToGallery]);

    return (
        <div style={styles.wrapper}>

            {/* UGC Points Toast */}
            {ugcToast && (
                <div style={{
                    position: 'absolute', top: -88, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
                    color: '#fff', zIndex: 99999, borderRadius: 18,
                    boxShadow: '0 8px 32px rgba(5,150,105,0.45)',
                    padding: '14px 22px', textAlign: 'center', whiteSpace: 'nowrap',
                    animation: 'fadeInUp 0.3s ease',
                }}>
                    <div style={{ fontSize: 18, marginBottom: 2 }}>:)</div>
                    <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.01em' }}>
                        {t('ugcToastThanks')}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, opacity: 0.9, marginTop: 2 }}>
                        +{ugcToast} {t('ugcToastEarned')}
                    </div>
                </div>
            )}

            {/* DEBUG LOGGER (VISIBLE ON DEVICE) */}
            {debugLogs.length > 0 && (
                <div style={{ ...styles.debugPanel, pointerEvents: 'auto' }} onClick={() => addLog("Panel tapped")}>
                    {debugLogs.map((log, i) => (
                        <div key={i} style={{ color: log.isError ? '#ff4b4b' : '#00ff88', marginBottom: '2px' }}>
                            <span style={{ opacity: 0.5, fontSize: '9px' }}>{log.time}</span> {log.msg}
                        </div>
                    ))}
                </div>
            )}

            {/* ── PRIMARY: SHARE TO SOCIALS ── */}
            <button ref={shareBtnRef} style={styles.primaryButton}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                <span>SHARE TO SOCIALS</span>
            </button>

            {/* ── SECONDARY: SAVE TO GALLERY ── */}
            <button ref={saveBtnRef} style={styles.secondaryButton}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>SAVE TO GALLERY</span>
            </button>

        </div>
    );
};

// ── Styles ──
const styles = {
    wrapper: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'center',
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
        transition: 'transform 120ms ease, opacity 120ms ease',
        position: 'relative',
        zIndex: 99999,
        touchAction: 'manipulation',
        pointerEvents: 'auto',
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
        transition: 'transform 120ms ease, opacity 120ms ease',
        position: 'relative',
        zIndex: 99999,
        touchAction: 'manipulation',
        pointerEvents: 'auto',
    },
};

export default PreviewActions;
