import React from 'react';

/**
 * PreviewActions.jsx — Immersive Preview Layer
 * Electric Green primary + Pure White secondary + Discard link.
 * Renders inside the glassmorphism action bar (no self-positioning).
 */
export const PreviewActions = ({ capturedImg, capturedBlob, onDone }) => {
    const [debugLogs, setDebugLogs] = React.useState([]);

    const addLog = (msg, isError = false) => {
        setDebugLogs(prev => [...prev, { msg, isError, time: new Date().toLocaleTimeString() }].slice(-5));
        console.log(`[PreviewActions] ${msg}`);
    };

    // Pre-compute the file for Safari synchronous requirements
    const shareFile = React.useMemo(() => {
        if (capturedBlob) {
            addLog("Memoized new shareFile from capturedBlob");
            return new File([capturedBlob], `foodspot-${Date.now()}.jpg`, { type: 'image/jpeg' });
        }
        addLog("No capturedBlob provided to memoize");
        return null;
    }, [capturedBlob]);

    // 💾 SAVE TO GALLERY — iOS-compatible
    const handleSaveToGallery = async (e) => {
        if (e) e.stopPropagation();
        addLog("Save button tapped");

        try {
            // iOS: use share API (gives "Save Image" option in share sheet)
            if (shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
                addLog("Attempting navigator.share for Gallery...");
                await navigator.share({ files: [shareFile], title: 'Save Image' });
                addLog("Share API success");
                return;
            }
            addLog("canShare failed or no shareFile. Falling back.");

            let blob = capturedBlob;
            if (!blob && typeof capturedImg === 'string' && capturedImg.startsWith('data:')) {
                const res = await fetch(capturedImg);
                blob = await res.blob();
            } else if (!blob && capturedImg instanceof Blob) {
                blob = capturedImg;
            }

            // Fallback: open blob in new tab (long-press to save)
            if (blob) {
                addLog("Object URL fallback triggered");
                const url = URL.createObjectURL(blob);
                const newWindow = window.open();
                if (newWindow) {
                    newWindow.document.write('<html><head><title>Save Image</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#000;color:#fff;font-family:sans-serif;flex-direction:column;"><img src="' + url + '" style="max-width:100%;max-height:90vh;"/><p style="margin-top:20px;">Mantén presionado la imagen para guardarla en Fotos.</p></body></html>');
                    newWindow.document.close();
                } else {
                    addLog("Popup blocked, redirecting...");
                    window.location.href = url; // Hard fallback if popup blocked
                }
                return;
            }
            addLog("No blob to open. Anchor fallback triggered.");

            // Last resort: anchor download (works on desktop / Chrome Android)
            const link = document.createElement('a');
            link.download = `foodspot-${Date.now()}.jpg`;
            link.href = capturedImg;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            if (err.name !== 'AbortError') {
                addLog(`Save err: ${err.message}`, true);
            } else {
                addLog("Save aborted by user");
            }
        }
    };

    // 🚀 SHARE TO SOCIALS — navigator.share with image blob (SYNCHRONOUS FOR SAFARI)
    const handleShare = async (e) => {
        if (e) {
            e.stopPropagation();
            if (e.cancelable) e.preventDefault(); // ONLY prevent default on touchEnd
        }
        addLog("Share button tapped");

        try {
            // Fast path for Safari: pre-computed file
            if (shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
                addLog("Attempting navigator.share...");
                await navigator.share({
                    files: [shareFile],
                    title: 'Check out my FoodSpot moment!',
                    text: 'Shared via FoodSpot',
                });
                addLog("Share API success");
                return;
            }
            addLog("canShare failed or no shareFile. Falling back.");

            // Fallback if capturedBlob was missing but we have a data URL
            let file = shareFile;
            if (!file && typeof capturedImg === 'string' && capturedImg.startsWith('data:')) {
                const res = await fetch(capturedImg);
                const blob = await res.blob();
                file = new File([blob], `foodspot-${Date.now()}.jpg`, { type: 'image/jpeg' });
            } else if (!file && capturedImg instanceof Blob) {
                file = new File([capturedImg], `foodspot-${Date.now()}.jpg`, { type: 'image/jpeg' });
            }

            if (navigator.share && file) {
                addLog("Attempting fallback share...");
                await navigator.share({
                    files: [file],
                    title: 'Check out my FoodSpot moment!',
                    text: 'Shared via FoodSpot',
                });
            } else {
                addLog("Sharing not supported in fallback.", true);
                alert("Sharing is not supported on this browser or device. Try saving to gallery instead.");
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                addLog(`Share err: ${err.message}`, true);
            } else {
                addLog("Share aborted by user");
            }
        }
    };

    return (
        <div style={styles.wrapper}>

            {/* DEBUG LOGGER (VISIBLE ON DEVICE) */}
            {debugLogs.length > 0 && (
                <div style={{ ...styles.debugPanel, pointerEvents: 'auto' }} onClick={() => addLog("Debug panel tapped")}>
                    {debugLogs.map((log, i) => (
                        <div key={i} style={{ color: log.isError ? '#ff4b4b' : '#00ff88', marginBottom: '2px' }}>
                            <span style={{ opacity: 0.5, fontSize: '9px' }}>{log.time}</span> {log.msg}
                        </div>
                    ))}
                </div>
            )}

            {/* ── PRIMARY: SHARE TO SOCIALS ── */}
            <button
                onTouchEnd={(e) => { addLog("Share onTouchEnd"); handleShare(e); }}
                onClick={(e) => { addLog("Share onClick"); handleShare(e); }}
                style={styles.primaryButton}
            >
                {/* Share icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                <span>SHARE TO SOCIALS</span>
            </button>

            {/* ── SECONDARY: SAVE TO GALLERY ── */}
            <button
                onTouchEnd={(e) => { addLog("Save onTouchEnd"); handleSaveToGallery(e); }}
                onClick={(e) => { addLog("Save onClick"); handleSaveToGallery(e); }}
                style={styles.secondaryButton}
            >
                {/* Download icon */}
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
        touchAction: 'manipulation'
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
        touchAction: 'manipulation'
    },
};

export default PreviewActions;
