/**
 * useVideoRecorder.js — CamTech Video Mode engine
 *
 * TWO-PHASE PIPELINE (v2):
 *
 *   Phase 1 — LIVE RECORD: MediaRecorder taps the raw camera MediaStream
 *   track directly. Zero JS touches a frame during capture — same hardware
 *   decode/encode path as the live viewfinder, so it's exactly as smooth.
 *
 *   Phase 2 — BURN (post-process, after the user stops): play the raw clip
 *   back in a hidden <video>, draw each frame through canvas (crop to the
 *   selected aspect, mirror if front camera, burn the business pin — all the
 *   same math the old live-relay pipeline did), and re-encode via
 *   canvas.captureStream() + a second MediaRecorder into the final clip.
 *
 * Why split it: burning a pin requires touching every frame in JS, which
 * only the browser's native video pipeline can do without JS in the loop.
 * Doing that DURING live capture competed with real camera frame delivery
 * for the main thread and caused visible stutter, even on an iPhone 17 Pro
 * Max — Safari's canvas→captureStream path especially. Moving the burn to
 * an offline pass after recording removes that time pressure entirely: it
 * just takes a few seconds of "Processing…" instead of degrading the
 * recording the user is trying to capture.
 *
 * Works on iOS Safari 15+ and Android Chrome. Audio is intentionally off
 * (camera stream is video-only; adding mic would trigger a second
 * permission prompt mid-flow).
 */

import { useState, useRef, useCallback, useEffect } from 'react'

export const MAX_VIDEO_SEC = 15

// DIAGNOSTIC FLAG — flip to false to re-enable the pin burn pass. Set true
// to isolate whether phase 1 (raw capture, zero JS per frame) is smooth on
// its own. If the raw output is STILL choppy with this on, the problem is
// not the pin/burn pass — it's something in phase 1 itself (bitrate,
// container timestamps, thermal) and burning the pin back in won't fix it.
const SKIP_BURN_FOR_TEST = true

// Same crop ratios as CameraLayer's photo capture
const ASPECT_RATIO = { '9:16': 9 / 16, '4:3': 3 / 4, '1:1': 1 }

// MP4 first (iOS Safari + modern Android Chrome), WebM fallback for older Android
const MIME_CANDIDATES = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=h264',
    'video/webm;codecs=vp9',
    'video/webm',
]

function pickMimeType() {
    if (typeof MediaRecorder === 'undefined') return null
    for (const t of MIME_CANDIDATES) {
        try { if (MediaRecorder.isTypeSupported(t)) return t } catch { /* keep trying */ }
    }
    return '' // let the browser pick its default
}

// Business pin SVG path (identical to .fsc-pin icon, 24x24 viewBox)
const PIN_PATH = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z'

function roundedRect(ctx, x, y, w, h, r) {
    const rad = Math.min(r, h / 2, w / 2)
    ctx.beginPath()
    ctx.moveTo(x + rad, y)
    ctx.arcTo(x + w, y, x + w, y + h, rad)
    ctx.arcTo(x + w, y + h, x, y + h, rad)
    ctx.arcTo(x, y + h, x, y, rad)
    ctx.arcTo(x, y, x + w, y, rad)
    ctx.closePath()
}

export default function useVideoRecorder() {
    const [isRecording,  setIsRecording]  = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [elapsedSec,   setElapsedSec]   = useState(0)

    const recorderRef  = useRef(null)
    const chunksRef    = useRef([])
    const tickRef      = useRef(null)
    const autoStopRef  = useRef(null)
    const startTsRef   = useRef(0)
    const abortedRef   = useRef(false)
    const sessionRef   = useRef(null) // { onComplete, pinSpec, aspect, isLandscape, facingMode }

    const cleanupTimers = useCallback(() => {
        clearInterval(tickRef.current)
        clearTimeout(autoStopRef.current)
    }, [])

    /**
     * Phase 2: decode the raw clip and burn crop + mirror + pin, offline.
     * Runs at its own pace (driven by the hidden video's playback, not a
     * live camera) so there's no real-time pressure to drop frames under.
     */
    const burnPin = useCallback((rawBlob, session) => {
        return new Promise((resolve, reject) => {
            const { pinSpec, aspect, isLandscape, facingMode, rawMimeType } = session
            const video = document.createElement('video')
            video.muted = true
            video.playsInline = true
            video.src = URL.createObjectURL(rawBlob)

            const teardown = () => URL.revokeObjectURL(video.src)

            video.onloadedmetadata = () => {
                const sw = video.videoWidth
                const sh = video.videoHeight
                if (!sw || !sh) { teardown(); reject(new Error('burn: no video dimensions')); return }

                const baseRatio   = ASPECT_RATIO[aspect] || 9 / 16
                const targetRatio = isLandscape ? 1 / baseRatio : baseRatio
                const srcRatio    = sw / sh
                let cropW, cropH
                if (srcRatio > targetRatio) { cropH = sh; cropW = Math.round(sh * targetRatio) }
                else                        { cropW = sw; cropH = Math.round(sw / targetRatio) }
                const cropX = Math.round((sw - cropW) / 2)
                const cropY = Math.round((sh - cropH) / 2)

                const shortSide = Math.min(cropW, cropH)
                const scaleDown = Math.min(1, 1080 / shortSide)
                const outW = Math.round((cropW * scaleDown) / 2) * 2
                const outH = Math.round((cropH * scaleDown) / 2) * 2

                const canvas = document.createElement('canvas')
                canvas.width = outW
                canvas.height = outH
                const ctx = canvas.getContext('2d', { alpha: false })

                // Pin geometry was captured as fractions of the frame at record
                // time (see startRecording) — reapply against the output size,
                // no DOM dependency here.
                const pin = pinSpec ? {
                    x: pinSpec.xFrac * outW,
                    y: pinSpec.yFrac * outH,
                    w: pinSpec.wFrac * outW,
                    h: pinSpec.hFrac * outH,
                    fontPx: pinSpec.fontFrac * outW,
                    iconPx: pinSpec.iconFrac * outW,
                    padX:   pinSpec.padFrac  * outW,
                    gap:    pinSpec.gapFrac  * outW,
                    label: pinSpec.label,
                    bg: pinSpec.bg,
                    text: pinSpec.text,
                    path: new Path2D(PIN_PATH),
                } : null

                const mirrored = facingMode === 'user'

                const drawFrame = () => {
                    if (mirrored) {
                        ctx.save()
                        ctx.translate(outW, 0)
                        ctx.scale(-1, 1)
                        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, outW, outH)
                        ctx.restore()
                    } else {
                        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, outW, outH)
                    }
                    if (pin) {
                        roundedRect(ctx, pin.x, pin.y, pin.w, pin.h, pin.h / 2)
                        ctx.fillStyle = pin.bg
                        ctx.fill()
                        const iScale = pin.iconPx / 24
                        const iY = pin.y + (pin.h - pin.iconPx) / 2
                        ctx.save()
                        ctx.translate(pin.x + pin.padX * 0.85, iY)
                        ctx.scale(iScale, iScale)
                        ctx.fillStyle = pin.text
                        ctx.fill(pin.path)
                        ctx.restore()
                        ctx.fillStyle = pin.text
                        ctx.font = `700 ${pin.fontPx}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
                        ctx.textBaseline = 'middle'
                        const maxTextW = pin.w - pin.padX * 1.7 - pin.iconPx - pin.gap
                        ctx.fillText(pin.label, pin.x + pin.padX * 0.85 + pin.iconPx + pin.gap, pin.y + pin.h / 2 + pin.fontPx * 0.06, Math.max(maxTextW, 10))
                    }
                }

                const useRvfc = typeof video.requestVideoFrameCallback === 'function'
                let rafId = 0, rvfcId = 0, done = false
                const loop = () => {
                    if (done) return
                    drawFrame()
                    if (useRvfc) rvfcId = video.requestVideoFrameCallback(loop)
                    else         rafId  = requestAnimationFrame(loop)
                }

                let stream
                try { stream = canvas.captureStream() }
                catch { stream = canvas.captureStream(30) }

                const outMime = rawMimeType && MediaRecorder.isTypeSupported?.(rawMimeType) ? rawMimeType : (pickMimeType() || '')
                let outRecorder
                try {
                    outRecorder = new MediaRecorder(stream, {
                        ...(outMime ? { mimeType: outMime } : {}),
                        videoBitsPerSecond: 8_000_000,
                    })
                } catch (err) {
                    teardown(); reject(err); return
                }

                const outChunks = []
                outRecorder.ondataavailable = (e) => { if (e.data?.size > 0) outChunks.push(e.data) }
                outRecorder.onstop = () => {
                    done = true
                    cancelAnimationFrame(rafId)
                    if (useRvfc && video.cancelVideoFrameCallback) { try { video.cancelVideoFrameCallback(rvfcId) } catch { /* noop */ } }
                    stream.getTracks().forEach((t) => t.stop())
                    teardown()
                    const type = (outRecorder.mimeType || outMime || 'video/mp4').split(';')[0]
                    const blob = new Blob(outChunks, { type })
                    if (!blob.size) { reject(new Error('burn: empty output')); return }
                    resolve({ blob, width: outW, height: outH, mimeType: blob.type })
                }
                outRecorder.onerror = (e) => { done = true; reject(e?.error || new Error('burn recorder error')) }

                const finish = () => { if (outRecorder.state === 'recording') outRecorder.stop() }
                video.onended = finish
                // Safety net: if 'ended' doesn't fire (some Android WebM quirks), stop
                // slightly after the known source duration.
                video.onloadeddata = () => {
                    const durMs = (Number.isFinite(video.duration) ? video.duration : MAX_VIDEO_SEC) * 1000
                    setTimeout(finish, durMs + 700)
                }

                video.play().then(() => {
                    outRecorder.start()
                    loop()
                }).catch((err) => { teardown(); reject(err) })
            }

            video.onerror = () => { teardown(); reject(new Error('burn: source video failed to load')) }
        })
    }, [])

    /**
     * Start recording. Phase 1 only — taps the raw stream, no canvas.
     * @param {object} opts
     *   video       — the live <video> element (source: video.srcObject)
     *   frameEl     — viewfinder frame element (for pin position → fractions)
     *   pinEl       — on-screen .fsc-pin element (position/size source of truth)
     *   pinLabel    — business name (uppercased for burn)
     *   pinBg/pinText — pill colors
     *   facingMode  — 'user' mirrors the burn like the live view
     *   aspect      — '9:16' | '4:3' | '1:1'
     *   isLandscape — rotate the crop like photo capture does
     *   onComplete  — called with the final (burned) result, or null on failure
     */
    const startRecording = useCallback((opts) => {
        const { video, frameEl, pinEl, pinLabel, pinBg, pinText, facingMode, aspect, isLandscape, onComplete } = opts
        if (recorderRef.current || !video?.srcObject) return false

        const rawStream = video.srcObject
        const videoTrack = rawStream.getVideoTracks?.()[0]
        if (!videoTrack) return false

        const mimeType = pickMimeType()
        if (mimeType === null) { console.error('[FSC-VIDEO] MediaRecorder unsupported'); return false }

        // Record ONLY the video track (a fresh MediaStream) — recording the
        // exact live-view stream directly, untouched, is what makes phase 1
        // as smooth as the viewfinder itself.
        const tapStream = new MediaStream([videoTrack])

        let recorder
        try {
            recorder = new MediaRecorder(tapStream, {
                ...(mimeType ? { mimeType } : {}),
                videoBitsPerSecond: 12_000_000, // generous — this is the burn pass's source
            })
        } catch (err) {
            console.error('[FSC-VIDEO] MediaRecorder init failed:', err)
            return false
        }

        // Pin geometry captured as FRACTIONS of the frame, once, at record
        // start — decouples the burn pass from needing the DOM to still be
        // in the same state (or even mounted) later.
        let pinSpec = null
        if (frameEl && pinEl) {
            const fr = frameEl.getBoundingClientRect()
            const pr = pinEl.getBoundingClientRect()
            if (fr.width > 0 && fr.height > 0) {
                pinSpec = {
                    xFrac: (pr.left - fr.left) / fr.width,
                    yFrac: (pr.top  - fr.top)  / fr.height,
                    wFrac: pr.width  / fr.width,
                    hFrac: pr.height / fr.width, // pill height scales off width like the live CSS pill does
                    fontFrac: (11 / fr.width),
                    iconFrac: (13 / fr.width),
                    padFrac:  (12 / fr.width),
                    gapFrac:  (5  / fr.width),
                    label: String(pinLabel || 'FoodSpot').toUpperCase(),
                    bg: pinBg || 'rgba(20,20,24,0.55)',
                    text: pinText || '#ffffff',
                }
            }
        }

        chunksRef.current = []
        abortedRef.current = false
        sessionRef.current = { onComplete, pinSpec, aspect, isLandscape, facingMode, rawMimeType: recorder.mimeType || mimeType }

        recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunksRef.current.push(e.data) }

        recorder.onstop = async () => {
            cleanupTimers()
            setIsRecording(false)
            setElapsedSec(0)

            const session = sessionRef.current
            recorderRef.current = null
            sessionRef.current = null
            if (abortedRef.current || !session) { chunksRef.current = []; return }

            const rawType = (session.rawMimeType || 'video/mp4').split(';')[0]
            const rawBlob = new Blob(chunksRef.current, { type: rawType })
            chunksRef.current = []
            if (!rawBlob.size) { console.error('[FSC-VIDEO] empty raw recording'); return }

            if (SKIP_BURN_FOR_TEST) {
                // No pin, no processing wait — ships the untouched phase-1
                // capture straight through. Isolates phase 1's smoothness.
                session.onComplete?.({
                    type: 'video',
                    blob: rawBlob,
                    objectURL: URL.createObjectURL(rawBlob),
                    mimeType: rawType,
                    width: videoTrack.getSettings?.().width,
                    height: videoTrack.getSettings?.().height,
                    meta: { ts: Date.now(), burnSkipped: true },
                })
                return
            }

            setIsProcessing(true)
            try {
                const burned = await burnPin(rawBlob, session)
                session.onComplete?.({
                    type: 'video',
                    blob: burned.blob,
                    objectURL: URL.createObjectURL(burned.blob),
                    mimeType: burned.mimeType,
                    width: burned.width,
                    height: burned.height,
                    meta: { ts: Date.now() },
                })
            } catch (err) {
                console.error('[FSC-VIDEO] burn failed:', err)
                // Fail open: hand back the raw (smooth, unwatermarked) clip
                // rather than losing the recording entirely.
                session.onComplete?.({
                    type: 'video',
                    blob: rawBlob,
                    objectURL: URL.createObjectURL(rawBlob),
                    mimeType: rawType,
                    width: videoTrack.getSettings?.().width,
                    height: videoTrack.getSettings?.().height,
                    meta: { ts: Date.now(), burnFailed: true },
                })
            } finally {
                setIsProcessing(false)
            }
        }

        recorder.onerror = (e) => {
            console.error('[FSC-VIDEO] recorder error:', e?.error || e)
            abortedRef.current = true
            try { recorder.stop() } catch { /* already stopped */ }
        }

        recorder.start()
        recorderRef.current = recorder
        startTsRef.current = Date.now()
        setIsRecording(true)
        setElapsedSec(0)

        tickRef.current = setInterval(() => {
            setElapsedSec(Math.min(MAX_VIDEO_SEC, (Date.now() - startTsRef.current) / 1000))
        }, 250)

        autoStopRef.current = setTimeout(() => {
            if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
        }, MAX_VIDEO_SEC * 1000)

        if (navigator.vibrate) navigator.vibrate(20)
        return true
    }, [cleanupTimers, burnPin])

    const stopRecording = useCallback(() => {
        const r = recorderRef.current
        if (r && r.state === 'recording') {
            if (navigator.vibrate) navigator.vibrate(20)
            r.stop()
        }
    }, [])

    // unmount: kill everything without delivering a result
    useEffect(() => () => {
        abortedRef.current = true
        cleanupTimers()
        const r = recorderRef.current
        if (r && r.state === 'recording') { try { r.stop() } catch { /* noop */ } }
        recorderRef.current = null
    }, [cleanupTimers])

    return { isRecording, isProcessing, elapsedSec, startRecording, stopRecording }
}
