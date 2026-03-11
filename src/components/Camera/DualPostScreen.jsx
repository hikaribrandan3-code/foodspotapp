import { useTenant } from '../../contexts/TenantContext.jsx'
import PreviewActions from './PreviewActions.jsx'

/**
 * DualPostScreen — STRIKE 5C (Optimized)
 * Simplified premium dark-mode decision screen.
 * Shows preview + Direct actions (Save/Share)
 * 
 * Props:
 *   previewDataURL - The flattened JPEG data URL
 *   onClose        - Go back to editor
 *   onComplete     - Exit entire camera flow
 */
export default function DualPostScreen({ previewDataURL, onClose, onComplete }) {
    const { tenantData } = useTenant()
    const primaryColor = tenantData?.primary_color || '#E5484D'

    return (
        <div style={styles.container}>
            {/* ── Back button ── */}
            <button onClick={onClose} style={styles.backButton} aria-label="Volver">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>

            {/* ── Hero Preview (9:16 frame) ── */}
            <div style={styles.previewContainer}>
                <img
                    src={previewDataURL}
                    alt="Preview"
                    style={styles.previewImage}
                />
            </div>

            {/* ── Direct Actions Layer ── */}
            <PreviewActions
                capturedImg={previewDataURL}
                onDone={onComplete}
            />

            {/* Spinner animation - keep for any potential use */}
            <style>{`
                @keyframes dualpost-spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}

// ── Styles ──
const styles = {
    container: {
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0A0A0A',
        display: 'flex', flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    backButton: {
        position: 'absolute', top: 16, left: 16, zIndex: 700,
        width: 44, height: 44,
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        border: 'none', borderRadius: '50%',
        cursor: 'pointer', color: '#FFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    previewContainer: {
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '56px 24px 120px', // More bottom padding to avoid action overlap
        overflow: 'hidden'
    },
    previewImage: {
        maxWidth: '100%', maxHeight: '100%',
        borderRadius: 24,
        objectFit: 'contain',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
    }
}
