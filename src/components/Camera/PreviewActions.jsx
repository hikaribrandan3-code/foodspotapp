import React from 'react';

/**
 * PreviewActions.jsx — Immersive Preview Layer
 * Electric Green primary + Pure White secondary + Discard link.
 * Renders inside the glassmorphism action bar (no self-positioning).
 */
export const PreviewActions = ({ capturedImg, onDone }) => {

    // 💾 SAVE TO GALLERY — programmatic download
    const handleSaveToGallery = async () => {
        try {
            const link = document.createElement('a');
            link.download = `foodspot-${Date.now()}.jpg`;
            link.href = capturedImg;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Save to gallery failed', err);
        }
    };

    // 🚀 SHARE TO SOCIALS — navigator.share with image blob
    const handleShare = async () => {
        try {
            let file;
            if (typeof capturedImg === 'string' && capturedImg.startsWith('data:')) {
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

            {/* ── DISCARD ── */}
            <button onClick={onDone} style={styles.discardLink}>
                Dismiss
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
    discardLink: {
        background: 'none',
        border: 'none',
        color: 'rgba(255, 255, 255, 0.45)',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        padding: '8px 16px',
        letterSpacing: '0.02em',
    },
};

export default PreviewActions;
