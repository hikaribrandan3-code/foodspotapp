import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useTenant } from '../contexts/TenantContext.jsx'

// ============================================
// 🎟️ TICKET SCANNER — STRIKE 4
// ============================================
// Uses BarcodeDetector API (Chrome 83+, Safari 17.2+)
// Haptic feedback on scan. Atomic redemption via RPC.
// ============================================

// 🔔 Sound effects
const playSuccessBeep = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, ctx.currentTime) // High A
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15)
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start(); osc.stop(ctx.currentTime + 0.3)
    } catch (e) { /* silent fail */ }
}

const playErrorBuzz = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(150, ctx.currentTime)
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
        osc.start(); osc.stop(ctx.currentTime + 0.4)
    } catch (e) { /* silent fail */ }
}

function TicketScanner({ onClose }) {
    const { businessId } = useTenant()
    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const scanningRef = useRef(false)

    const [status, setStatus] = useState('loading') // loading | scanning | success | error | already_used
    const [result, setResult] = useState(null)
    const [cameraError, setCameraError] = useState(null)
    const [currentUserId, setCurrentUserId] = useState(null)

    // Start camera
    useEffect(() => {
        let cancelled = false

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
                })
                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop())
                    return
                }
                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    await videoRef.current.play()
                    setStatus('scanning')
                    startDetection()
                }
            } catch (err) {
                if (!cancelled) setCameraError(err.message)
            }
        }

        startCamera()

        return () => {
            cancelled = true
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop())
            }
        }
    }, [])

    // Get current user ID for audit trail
    useEffect(() => {
        const fetchUser = async () => {
            const { data } = await supabase.auth.getUser()
            if (data?.user?.id) setCurrentUserId(data.user.id)
        }
        fetchUser()
    }, [])

    // QR Detection loop
    const startDetection = useCallback(async () => {
        // Check for BarcodeDetector support
        if (!('BarcodeDetector' in window)) {
            setCameraError('Tu navegador no soporta el escáner. Usá Chrome o Safari actualizado.')
            return
        }

        const detector = new BarcodeDetector({ formats: ['qr_code'] })

        const detect = async () => {
            if (scanningRef.current || !videoRef.current || videoRef.current.readyState < 2) {
                requestAnimationFrame(detect)
                return
            }

            try {
                const barcodes = await detector.detect(videoRef.current)
                if (barcodes.length > 0) {
                    const raw = barcodes[0].rawValue
                    // Support old format (TKT-ABC-123), new format (ABC123), and food orders (FS-TICKET|...)
                    if (raw.startsWith('TKT-') || raw.startsWith('FS-TICKET|') || /^[A-Z]{3}\d{3}$/.test(raw)) {
                        scanningRef.current = true
                        await handleTicketScan(raw)
                        return // Stop scanning after first hit
                    }
                }
            } catch (e) {
                // Detection frame error, ignore and retry
            }

            requestAnimationFrame(detect)
        }

        requestAnimationFrame(detect)
    }, [businessId])

    // Process scanned ticket
    const handleTicketScan = async (raw) => {
        // ── Event Ticket Format: TKT-XXX-NNN ──
        if (raw.startsWith('TKT-')) {
            try {
                // 1. Look up order by ticket_code
                const { data: order, error: orderError } = await supabase
                    .from('event_orders')
                    .select('id, event_id, customer_name, tier_snapshot, payment_status, business_id')
                    .eq('ticket_code', raw)
                    .single()

                if (orderError || !order) {
                    setStatus('error')
                    setResult({ message: 'Entrada no encontrada' })
                    playErrorBuzz()
                    return
                }

                if (order.payment_status !== 'paid') {
                    setStatus('error')
                    setResult({ message: 'Pago pendiente' })
                    playErrorBuzz()
                    return
                }

                // 2. Check if already checked in
                const { data: existingCheckin, error: checkinError } = await supabase
                    .from('event_checkins')
                    .select('id')
                    .eq('order_id', order.id)
                    .eq('event_id', order.event_id)
                    .single()

                if (existingCheckin) {
                    setStatus('already_used')
                    setResult({
                        message: 'Ya canjeada',
                        customer_name: order.customer_name
                    })
                    playErrorBuzz()
                    if (navigator.vibrate) navigator.vibrate(300)
                    return
                }

                // 3. Record check-in
                const { error: insertError } = await supabase
                    .from('event_checkins')
                    .insert({
                        event_id: order.event_id,
                        order_id: order.id,
                        checkin_method: 'qr_scan',
                        checked_in_by: currentUserId
                    })

                if (insertError) throw insertError

                setStatus('success')
                setResult({
                    message: '¡Entrada válida!',
                    customer_name: order.customer_name,
                    order_number: raw,
                    tier: order.tier_snapshot?.name || 'General'
                })
                playSuccessBeep()
                if (navigator.vibrate) navigator.vibrate([100, 50, 100])
            } catch (err) {
                setStatus('error')
                setResult({ message: err.message })
                playErrorBuzz()
            }
            return
        }

        // ── Food Order Ticket Format: FS-TICKET|orderId|... ──
        const parts = raw.split('|')
        if (parts.length < 3) {
            setStatus('error')
            setResult({ message: 'QR inválido' })
            playErrorBuzz()
            return
        }

        const orderId = parts[1]

        try {
            const { data, error } = await supabase.rpc('redeem_ticket', {
                p_order_id: orderId,
                p_business_id: businessId
            })

            if (error) throw error

            if (data?.success) {
                setStatus('success')
                setResult(data)
                playSuccessBeep()
                // Haptic feedback
                if (navigator.vibrate) navigator.vibrate([100, 50, 100])
            } else if (data?.error === 'ALREADY_REDEEMED') {
                setStatus('already_used')
                setResult(data)
                playErrorBuzz()
                if (navigator.vibrate) navigator.vibrate(300)
            } else {
                setStatus('error')
                setResult(data)
                playErrorBuzz()
                if (navigator.vibrate) navigator.vibrate(300)
            }
        } catch (err) {
            setStatus('error')
            setResult({ message: err.message })
            playErrorBuzz()
        }
    }

    // Reset to scan again
    const handleScanAgain = () => {
        scanningRef.current = false
        setStatus('scanning')
        setResult(null)
        startDetection()
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: '#000', color: '#FFF',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(0,0,0,0.8)',
                paddingTop: 'max(16px, env(safe-area-inset-top))',
                zIndex: 10,
            }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🎟️ Escanear Entradas</h2>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255,255,255,0.15)', border: 'none',
                        color: '#FFF', fontSize: 16, padding: '8px 16px',
                        borderRadius: 10, cursor: 'pointer', fontWeight: 600,
                    }}
                >
                    Cerrar
                </button>
            </div>

            {/* Camera Feed */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                    }}
                />

                {/* Scan Frame Overlay */}
                {status === 'scanning' && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{
                            width: 250, height: 250,
                            border: '3px solid rgba(255,255,255,0.6)',
                            borderRadius: 24,
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                            animation: 'scanPulse 2s ease-in-out infinite',
                        }} />
                        <p style={{
                            position: 'absolute', bottom: 80,
                            color: 'rgba(255,255,255,0.8)', fontSize: 14,
                            fontWeight: 500, textAlign: 'center',
                        }}>
                            Apuntá al código QR de la entrada
                        </p>
                    </div>
                )}

                {/* Camera Error */}
                {cameraError && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 32, textAlign: 'center',
                    }}>
                        <div>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
                            <p style={{ color: '#EF4444', fontSize: 16, fontWeight: 600 }}>
                                Error de cámara
                            </p>
                            <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 8 }}>
                                {cameraError}
                            </p>
                        </div>
                    </div>
                )}

                {/* RESULT OVERLAY */}
                {(status === 'success' || status === 'already_used' || status === 'error') && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: status === 'success'
                            ? 'rgba(34,197,94,0.9)'
                            : status === 'already_used'
                                ? 'rgba(245,158,11,0.9)'
                                : 'rgba(239,68,68,0.9)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: 32,
                    }}>
                        {/* Icon */}
                        <div style={{ fontSize: 72, marginBottom: 16 }}>
                            {status === 'success' ? '✅' : status === 'already_used' ? '⚠️' : '❌'}
                        </div>

                        {/* Title */}
                        <h3 style={{
                            fontSize: 28, fontWeight: 900, color: '#FFF',
                            margin: '0 0 8px', textAlign: 'center',
                        }}>
                            {status === 'success' ? '¡Entrada Válida!'
                                : status === 'already_used' ? 'Ya Canjeada'
                                    : 'Error'}
                        </h3>

                        {/* Customer Name */}
                        {result?.customer_name && (
                            <p style={{
                                fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.9)',
                                margin: '0 0 4px',
                            }}>
                                👤 {result.customer_name}
                            </p>
                        )}

                        {/* Details */}
                        <p style={{
                            fontSize: 14, color: 'rgba(255,255,255,0.8)',
                            margin: '0 0 32px', textAlign: 'center',
                        }}>
                            {result?.message}
                            {result?.order_number && ` · Pedido #${result.order_number}`}
                        </p>

                        {/* Scan Again */}
                        <button
                            onClick={handleScanAgain}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: '2px solid rgba(255,255,255,0.4)',
                                color: '#FFF', fontSize: 16, fontWeight: 700,
                                padding: '14px 32px', borderRadius: 14,
                                cursor: 'pointer',
                            }}
                        >
                            📷 Escanear otra entrada
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scanPulse {
                    0%, 100% { border-color: rgba(255,255,255,0.4); }
                    50% { border-color: rgba(255,255,255,0.9); }
                }
            `}</style>
        </div>
    )
}

export default TicketScanner
