import React from 'react';

/**
 * PreviewActions.jsx — Immersive Preview Layer
 * Electric Green primary + Pure White secondary + Discard link.
 * Renders inside the glassmorphism action bar (no self-positioning).
 */
export const PreviewActions = ({ capturedImg, capturedBlob, onDone }) => {

    // 💾 SAVE TO GALLERY — iOS-compatible
    const handleSaveToGallery = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        try {
            let blob = capturedBlob;
            if (!blob) {
                if (typeof capturedImg === 'string' && capturedImg.startsWith('data:')) {
                    const res = await fetch(capturedImg);
                    blob = await res.blob();
                } else if (capturedImg instanceof Blob) {
                    blob = capturedImg;
                }
            }

            // iOS: use share API (gives "Save Image" option in share sheet)
            if (blob && navigator.canShare) {
                const file = new File([blob], `foodspot-${Date.now()}.jpg`, { type: 'image/jpeg' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'Save Image' });
                    return;
                }
            }

            // Fallback: open blob in new tab (long-press to save)
            if (blob) {
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                return;
            }

            // Last resort: anchor download (works on desktop / Chrome Android)
            const link = document.createElement('a');
            link.download = `foodspot-${Date.now()}.jpg`;
            link.href = capturedImg;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Save to gallery failed', err);
            }
        }
    };

    // 🚀 SHARE TO SOCIALS — navigator.share with image blob (SYNCHRONOUS FOR SAFARI)
    const handleShare = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        try {
            let file;
            if (capturedBlob) {
                // Synchronous file creation - CRITICAL for Safari security policy
                file = new File([capturedBlob], `foodspot-${Date.now()}.jpg`, { type: 'image/jpeg' });
            } else if (typeof capturedImg === 'string' && capturedImg.startsWith('data:')) {
                const res = await fetch(capturedImg);
                const blob = await res.blob();
                file = new File([blob], `foodspot-${Date.now()}.jpg`, { type: 'image/jpeg' });
            } else if (capturedImg instanceof Blob) {
                file = new File([capturedImg], `foodspot-${Date.now()}.jpg`, { type: 'image/jpeg' });
            }

            if (navigator.share && file) {
                await navigator.share({
                    files: [file],
                    title: 'Check out my FoodSpot moment!',
                    text: 'Shared via FoodSpot',
                });
            } else {
                alert("Sharing is not supported on this browser. Try saving to gallery instead.");
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Sharing failed', err);
            }
        }
    };

    return (
        <div style={styles.wrapper}>

            {/* ── PRIMARY: SHARE TO SOCIALS ── */}
            <button onClick={handleShare} style={styles.primaryButton}>
                {/* Share icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                <span>SHARE TO SOCIALS</span>
            </button>

            {/* ── SECONDARY: SAVE TO GALLERY ── */}
            <button onClick={handleSaveToGallery} style={styles.secondaryButton}>
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
    },
};

export default PreviewActions;
