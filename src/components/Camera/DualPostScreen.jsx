import { useTenant } from '../../contexts/TenantContext.jsx'
import PreviewActions from './PreviewActions.jsx'

/**
 * DualPostScreen — Immersive Preview Layer
 * Edge-to-edge image, location pill, glassmorphism action bar.
 *
 * Props:
 *   previewDataURL - The flattened JPEG data URL
 *   previewBlob    - The blob object for the preview
 *   cameraPinStyle - Camera pin style (classic, cafe, vegan, burger)
 *   onClose        - Go back to editor
 *   onComplete     - Exit entire camera flow
 */
export default function DualPostScreen({ previewDataURL, previewBlob, cameraPinStyle, onClose, onComplete }) {
    const { tenantData } = useTenant()
    const businessName = tenantData?.business_name || 'FoodSpot'

    // Camera pin style colors
    const PIN_STYLE_COLORS = {
        classic: 'rgba(255, 255, 255, 0.22)',
        cafe:    'rgba(130, 90, 60, 0.55)',
        vegan:   'rgba(145, 170, 100, 0.55)',
        burger:  'rgba(255, 193, 7, 0.60)',
    }
    const pinStyle = cameraPinStyle || tenantData?.app_config?.cameraPinStyle || 'classic'
    const pinBg = PIN_STYLE_COLORS[pinStyle] || PIN_STYLE_COLORS.classic

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

            {/* ── Location Pill (bottom-left, above action bar) ── */}
            <div style={{...styles.locationPill, background: pinBg}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
                </svg>
                <span style={styles.locationText}>
                    {businessName.toUpperCase()}
                </span>
            </div>

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
    locationPill: {
        position: 'absolute',
        bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))',
        left: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        padding: '6px 12px',
        background: 'rgba(255, 255, 255, 0.22)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '20px',
        color: '#fff',
        zIndex: 10,
        pointerEvents: 'none',
    },
    locationText: {
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        lineHeight: 1,
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
