import { useTenant } from '../../contexts/TenantContext.jsx'
import PreviewActions from './PreviewActions.jsx'

/**
 * DualPostScreen — Immersive Preview Layer
 * Edge-to-edge image, location pill, glassmorphism action bar.
 *
 * Props:
 *   previewDataURL - The flattened JPEG data URL
 *   onClose        - Go back to editor
 *   onComplete     - Exit entire camera flow
 */
export default function DualPostScreen({ previewDataURL, previewBlob, onClose, onComplete }) {
    const { tenantData } = useTenant()
    const businessName = tenantData?.business_name || 'FoodSpot'

    return (
        <div style={styles.container}>

            {/* ── Immersive Background ── */}
            <img
                src={previewDataURL}
                alt="Preview"
                style={styles.immersiveImage}
            />

            {/* ── Close (X) button - top left, returns to editor ── */}
            <button
                onClick={onClose}
                aria-label="Back to Editor"
                style={styles.closeButton}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>

            {/* ── Glassmorphism Action Bar ── */}
            <div style={styles.actionBar}>
                <PreviewActions
                    capturedImg={previewDataURL}
                    capturedBlob={previewBlob}
                    onDone={onComplete}
                />
            </div>
        </div>
    )
}

// ── Styles ──
const styles = {
    container: {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        touchAction: 'auto',
        pointerEvents: 'auto',
        WebkitTouchCallout: 'default',
        userSelect: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    closeButton: {
        position: 'absolute',
        top: '16px',
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
        pointerEvents: 'auto',
        touchAction: 'auto',
    },
    immersiveImage: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        pointerEvents: 'none',
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        padding: '20px 20px',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        zIndex: 10,
        pointerEvents: 'auto',
    },
}
