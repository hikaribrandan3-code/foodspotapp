import { useState, useCallback } from 'react'
import { supabase, uploadAsset } from '../../lib/supabaseClient.js'
import { useTenant } from '../../contexts/TenantContext.jsx'
import { shareImage } from './utils/ExportEngine.js'

/**
 * DualPostScreen — STRIKE 5C
 * Premium dark-mode decision screen after photo editing.
 * Shows flattened preview + toggle cards for Wall & IG sharing.
 * 
 * Props:
 *   previewDataURL - The flattened JPEG data URL
 *   previewBlob    - The flattened JPEG blob
 *   neonContext     - 'food' | 'event' | null
 *   onClose        - Go back to editor
 *   onComplete     - Exit entire camera flow
 */
export default function DualPostScreen({ previewDataURL, previewBlob, neonContext, onClose, onComplete }) {
    const { businessId, tenantData } = useTenant()
    const primaryColor = tenantData?.primary_color || '#C4856A'

    const [wallEnabled, setWallEnabled] = useState(true)
    const [igEnabled, setIgEnabled] = useState(true)
    const [isPosting, setIsPosting] = useState(false)
    const [postResult, setPostResult] = useState(null)

    const stamps = (wallEnabled ? 1 : 0) + (igEnabled ? 2 : 0)
    const nothingSelected = !wallEnabled && !igEnabled

    // ── Execute multi-path posting ──
    const handleConfirm = useCallback(async () => {
        if (nothingSelected || isPosting) return
        setIsPosting(true)

        let wallSuccess = false
        let igSuccess = false
        let stampCount = 0

        try {
            // PATH 1: Upload to El Momento (internal wall)
            if (wallEnabled && previewBlob && businessId) {
                try {
                    const file = new File([previewBlob], `momento-${Date.now()}.jpg`, { type: 'image/jpeg' })
                    const { url, error: uploadErr } = await uploadAsset(file, businessId, 'el-momento')

                    if (!uploadErr && url) {
                        const guestToken = localStorage.getItem('fs_guest_token')
                        const { error: insertErr } = await supabase
                            .from('el_momento_photos')
                            .insert({
                                business_id: businessId,
                                photo_url: url,
                                guest_token: guestToken || null,
                                context: neonContext || 'general',
                                hearts: 0
                            })

                        if (!insertErr) {
                            wallSuccess = true
                            stampCount += 1
                        }
                    }
                } catch (e) {
                    console.error('Wall upload failed:', e)
                }
            }

            // PATH 2: Share to Instagram via Web Share API
            if (igEnabled && previewBlob) {
                try {
                    const result = await shareImage(previewBlob, previewDataURL)
                    if (result.shared) {
                        igSuccess = true
                        stampCount += 2
                    }
                } catch (e) {
                    console.error('IG share failed:', e)
                }
            }

            // PATH 3: Award stamps
            if (stampCount > 0) {
                try {
                    const guestToken = localStorage.getItem('fs_guest_token')
                    if (guestToken && businessId) {
                        await supabase.rpc('award_stamps_for_share', {
                            p_business_id: businessId,
                            p_guest_token: guestToken,
                            p_stamp_count: stampCount
                        })
                    }
                } catch (e) {
                    console.log('Stamp award failed (RPC may not exist yet):', e)
                }
            }

            setPostResult({ wallSuccess, igSuccess, stampCount })

            // Auto-close after showing success
            setTimeout(() => {
                onComplete?.()
            }, 2000)

        } catch (err) {
            console.error('DualPost execution error:', err)
            setIsPosting(false)
        }
    }, [wallEnabled, igEnabled, previewBlob, previewDataURL, businessId, neonContext, nothingSelected, isPosting, onComplete])

    // ── Success state ──
    if (postResult) {
        return (
            <div style={styles.container}>
                <div style={styles.successCard}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
                    <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}>
                        ¡Momento Compartido!
                    </h2>
                    <p style={{ margin: '0 0 20px', fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                        {postResult.wallSuccess && '📸 Publicado en El Momento'}
                        {postResult.wallSuccess && postResult.igSuccess && ' • '}
                        {postResult.igSuccess && '🤳 Compartido en Instagram'}
                    </p>
                    {postResult.stampCount > 0 && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '10px 24px', borderRadius: 20,
                            background: 'rgba(255,255,255,0.15)',
                            backdropFilter: 'blur(10px)',
                            fontSize: 16, fontWeight: 700, color: '#FCD34D'
                        }}>
                            +{postResult.stampCount} {'⭐'.repeat(postResult.stampCount)}
                        </div>
                    )}
                </div>
            </div>
        )
    }

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

            {/* ── Bottom Panel ── */}
            <div style={styles.bottomPanel}>
                {/* Toggle Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {/* Wall Toggle */}
                    <ToggleCard
                        icon="📸"
                        title="Publicar en El Momento"
                        subtitle="+1 Sello ⭐"
                        enabled={wallEnabled}
                        onToggle={() => setWallEnabled(!wallEnabled)}
                        primaryColor={primaryColor}
                    />

                    {/* Instagram Toggle */}
                    <ToggleCard
                        icon="🤳"
                        title="Compartir en Instagram"
                        subtitle="+2 Sellos ⭐⭐"
                        enabled={igEnabled}
                        onToggle={() => setIgEnabled(!igEnabled)}
                        primaryColor={primaryColor}
                    />
                </div>

                {/* Confirm Button */}
                <button
                    onClick={handleConfirm}
                    disabled={nothingSelected || isPosting}
                    style={{
                        ...styles.confirmButton,
                        background: nothingSelected
                            ? 'rgba(255,255,255,0.1)'
                            : `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                        opacity: nothingSelected ? 0.4 : 1,
                        cursor: (nothingSelected || isPosting) ? 'not-allowed' : 'pointer',
                    }}
                >
                    {isPosting ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={styles.spinner} />
                            Publicando...
                        </span>
                    ) : nothingSelected ? (
                        'Seleccioná al menos una opción'
                    ) : (
                        `CONFIRMAR Y GANAR ${stamps} ${stamps === 1 ? 'SELLO' : 'SELLOS'}`
                    )}
                </button>

                {/* Skip link */}
                <button onClick={onComplete} style={styles.skipButton}>
                    Saltar y cerrar
                </button>
            </div>

            {/* Spinner animation */}
            <style>{`
                @keyframes dualpost-spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}

// ── Toggle Card Component ──
function ToggleCard({ icon, title, subtitle, enabled, onToggle, primaryColor }) {
    return (
        <button
            onClick={onToggle}
            style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                borderRadius: 16,
                border: enabled ? `2px solid ${primaryColor}` : '2px solid rgba(255,255,255,0.12)',
                background: enabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                width: '100%',
                textAlign: 'left'
            }}
        >
            <span style={{ fontSize: 28, flexShrink: 0 }}>{icon}</span>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 15, fontWeight: 700,
                    color: enabled ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                    transition: 'color 0.2s'
                }}>
                    {title}
                </div>
                <div style={{
                    fontSize: 12, fontWeight: 500,
                    color: enabled ? '#FCD34D' : 'rgba(255,255,255,0.25)',
                    marginTop: 2, transition: 'color 0.2s'
                }}>
                    {subtitle}
                </div>
            </div>

            {/* Toggle indicator */}
            <div style={{
                width: 44, height: 26, borderRadius: 13,
                background: enabled ? primaryColor : 'rgba(255,255,255,0.15)',
                position: 'relative', flexShrink: 0,
                transition: 'background 0.25s ease'
            }}>
                <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#FFFFFF',
                    position: 'absolute', top: 3,
                    left: enabled ? 21 : 3,
                    transition: 'left 0.25s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }} />
            </div>
        </button>
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
        position: 'absolute', top: 16, left: 16, zIndex: 10,
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
        padding: '56px 24px 12px',
        overflow: 'hidden'
    },
    previewImage: {
        maxWidth: '100%', maxHeight: '100%',
        borderRadius: 16,
        objectFit: 'contain',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
    },
    bottomPanel: {
        padding: '16px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.7))',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    },
    confirmButton: {
        width: '100%', padding: '16px 24px',
        borderRadius: 16, border: 'none',
        fontSize: 15, fontWeight: 800,
        color: '#FFFFFF', letterSpacing: '0.02em',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    },
    skipButton: {
        width: '100%', padding: '12px',
        background: 'none', border: 'none',
        fontSize: 13, fontWeight: 500,
        color: 'rgba(255,255,255,0.35)',
        cursor: 'pointer', textAlign: 'center',
        marginTop: 8
    },
    spinner: {
        width: 16, height: 16,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#FFFFFF',
        borderRadius: '50%',
        animation: 'dualpost-spin 0.8s linear infinite',
        display: 'inline-block'
    },
    successCard: {
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 40, textAlign: 'center'
    }
}
