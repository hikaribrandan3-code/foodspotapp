import React from 'react';

/**
 * PreviewActions.jsx
 * Unified action layer for the camera preview.
 * Replaces complex toggles with direct "Save" and "Share" actions.
 */
export const PreviewActions = ({ capturedImg, onDone }) => {

    // 💾 ACTION 1: SAVE TO GALLERY
    const handleSaveToGallery = async () => {
        try {
            const link = document.createElement('a');
            link.download = `foodspot-${Date.now()}.jpg`;
            link.href = capturedImg;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // Note: In some mobile browsers, a direct click might be blocked or behave differently.
            // But for a dataURL/blob link, this is the standard way.
        } catch (err) {
            console.error('Save to gallery failed', err);
        }
    };

    // 🚀 ACTION 2: SHARE TO SOCIALS (Navigator Share)
    const handleShare = async () => {
        try {
            // Convert dataURL to Blob if it's a string, or just use it if it's already a blob/file
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
                // Fallback for browsers that don't support navigator.share
                alert("Sharing is not supported on this browser. Try saving to gallery instead.");
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Sharing failed', err);
            }
        } finally {
            // onDone(); // Optional: User might want to save AFTER sharing. 
            // User request says "Exit back to app" in finally, so we follow that.
            onDone();
        }
    };

    return (
        <div className="absolute bottom-10 left-0 right-0 px-6 flex flex-col gap-4 z-[600] pointer-events-auto">

            {/* PRIMARY ACTION: SHARE */}
            <button
                onClick={handleShare}
                className="w-full bg-[#E5484D] py-4 rounded-2xl font-black text-white text-lg shadow-2xl active:scale-95 transition-all"
                style={{ background: 'var(--primary-red, #E5484D)' }}
            >
                SHARE TO SOCIALS
            </button>

            {/* SECONDARY ACTION: SAVE */}
            <button
                onClick={handleSaveToGallery}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 py-4 rounded-2xl font-bold text-white active:scale-95 transition-all"
            >
                SAVE TO GALLERY
            </button>

            {/* DISMISS */}
            <button
                onClick={onDone}
                className="text-white/50 text-xs font-bold uppercase tracking-widest mt-2"
            >
                Discard
            </button>
        </div>
    );
};

export default PreviewActions;
