/**
 * useVideoRecorder.js — CamTech Video + Boomerang engine
 *
 * VIDEO: single-phase raw capture. MediaRecorder taps the raw camera
 * MediaStream track directly — zero JS touches a frame. Same hardware
 * decode/encode path as the live viewfinder, so it's exactly as smooth.
 * (An earlier version burned the business pin into every frame via a
 * canvas relay; that per-frame JS work competed with real camera frame
 * delivery and caused visible stutter, confirmed even on an iPhone 17 Pro
 * Max. Confirmed by disabling the burn: raw capture alone is smooth. The
 * pin is not burned in at all anymore — CameraLayer shows a REC indicator
 * instead of the business pin while in Video/Boomerang mode, since the tag
 * no longer ends up in the file.)
 *
 * BOOMERANG: capture ~1s raw (same smooth path as Video), then an OFFLINE
 * reassembly pass — decode the clip, collect each frame as an ImageBitmap
 * while playing it back once, build a forward+reverse ("ping-pong")
 * sequence, and re-encode that sequence into the final looping clip.
 * Reversing playback isn't possible directly (MediaRecorder/<video> can't
 * play backward — no negative playbackRate), so frame buffering is the
 * only reliable way to do it in a browser. This reassembly pass still
 * touches every frame in JS, same as the old pin-burn pass did — but it's
 * only ~1s of source (a couple dozen frames, no text/pin drawing, just a
 * cheap blit) instead of up to 15s of 4K video, so the same class of work
 * that caused stutter at Video-mode scale should be comfortably light here.
 *
 * Works on iOS Safari 15+ and Android Chrome.
 *
 * AUDIO: Video mode only. Mic access is requested lazily on first recording
 * and the resulting audio track is cached (audioStreamRef) so repeat
 * recordings in the same camera session don't re-prompt. If mic permission
 * is denied or getUserMedia fails, we fail open — recording proceeds
 * video-only rather than blocking capture. Boomerang never requests or
 * carries audio: its output is rebuilt from canvas frames during the
 * reassembly pass, which has no audio path by construction.
 */

import { useState, useRef, useCallback, useEffect } from 'react'

export const MAX_VIDEO_SEC = 15
export const MAX_BOOMERANG_SEC = 1.7

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

// Crop math shared by the boomerang reassembly pass — identical shape to
// the photo capture / old burn pass.
function computeCrop(sw, sh, aspect, isLandscape) {
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
    return { cropW, cropH, cropX, cropY, outW, outH }
}

export default function useVideoRecorder() {
    const [isRecording,  setIsRecording]  = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [elapsedSec,   setElapsedSec]   = useState(0)

    const recorderRef   = useRef(null)
    const chunksRef     = useRef([])
    const tickRef       = useRef(null)
    const autoStopRef   = useRef(null)
    const startTsRef     = useRef(0)
    const durationCapRef = useRef(MAX_VIDEO_SEC)
    const abortedRef    = useRef(false)
    const sessionRef    = useRef(null) // { onComplete, mode, aspect, isLandscape, facingMode, rawMimeType }
    const audioStreamRef = useRef(null) // cached mic stream — Video mode only, reused across recordings
    const startingRef    = useRef(false) // guards re-entrant starts while awaiting mic permission

    const cleanupTimers = useCallback(() => {
        clearInterval(tickRef.current)
        clearTimeout(autoStopRef.current)
    }, [])

    // Lazily grab a mic track for Video mode, caching the stream so repeat
    // recordings in the same session don't re-prompt. Fails open (returns
    // null) on denial/error — never blocks recording from proceeding.
    const getAudioTrack = useCallback(async () => {
        const cached = audioStreamRef.current?.getAudioTracks?.()[0]
        if (cached && cached.readyState === 'live') return cached
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            audioStreamRef.current = stream
            return stream.getAudioTracks()[0] || null
        } catch (err) {
            console.warn('[FSC-VIDEO] mic unavailable, recording video without audio:', err)
            return null
        }
    }, [])

    /**
     * Boomerang reassembly: decode the raw ~1s clip, collect frames while
     * playing it back once, then re-encode a forward+reverse sequence.
     * Runs at its own pace (driven by playback of an already-recorded local
     * file, not a live camera) so there's no real-time pressure to drop
     * frames under.
     */
    const assembleBoomerang = useCallback((rawBlob, session) => {
        return new Promise((resolve, reject) => {
            const { aspect, isLandscape, facingMode, rawMimeType } = session
            const video = document.createElement('video')
            video.muted = true
            video.playsInline = true
            video.src = URL.createObjectURL(rawBlob)

            let settled = false
            const teardown = () => URL.revokeObjectURL(video.src)
            const fail = (err) => { if (settled) return; settled = true; teardown(); reject(err) }

            video.onerror = () => fail(new Error('boomerang: source video failed to load'))

            video.onloadedmetadata = () => {
                const sw = video.videoWidth
                const sh = video.videoHeight
                if (!sw || !sh) { fail(new Error('boomerang: no video dimensions')); return }

                const { cropW, cropH, cropX, cropY, outW, outH } = computeCrop(sw, sh, aspect, isLandscape)
                const mirrored = facingMode === 'user'

                // Scratch canvas: one frame drawn here, then snapshotted into
                // an ImageBitmap (lighter than keeping N full canvases alive).
                const scratch = document.createElement('canvas')
                scratch.width = outW
                scratch.height = outH
                const sctx = scratch.getContext('2d', { alpha: false })

                const frames = []
                const useRvfc = typeof video.requestVideoFrameCallback === 'function'
                let rvfcId = 0, rafId = 0, collecting = true

                const captureFrame = async () => {
                    if (mirrored) {
                        sctx.save()
                        sctx.translate(outW, 0)
                        sctx.scale(-1, 1)
                        sctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, outW, outH)
                        sctx.restore()
                    } else {
                        sctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, outW, outH)
                    }
                    try { frames.push(await createImageBitmap(scratch)) } catch { /* skip a bad frame */ }
                }

                const collectLoop = async () => {
                    if (!collecting) return
                    await captureFrame()
                    if (!collecting) return
                    if (useRvfc) rvfcId = video.requestVideoFrameCallback(collectLoop)
                    else         rafId  = requestAnimationFrame(collectLoop)
                }

                const stopCollecting = () => {
                    if (!collecting) return
                    collecting = false
                    cancelAnimationFrame(rafId)
                    if (useRvfc && video.cancelVideoFrameCallback) { try { video.cancelVideoFrameCallback(rvfcId) } catch { /* noop */ } }
                    renderSequence()
                }

                video.onended = stopCollecting
                // Safety net in case 'ended' doesn't fire on some Android/WebM combos.
                const safetyTimer = setTimeout(stopCollecting, MAX_BOOMERANG_SEC * 1000 + 700)

                function renderSequence() {
                    clearTimeout(safetyTimer)
                    teardown()

                    if (frames.length < 2) {
                        frames.forEach((f) => f.close?.())
                        fail(new Error('boomerang: not enough frames captured'))
                        return
                    }

                    // Ping-pong: forward, then reverse (excluding both
                    // endpoints so the loop doesn't stutter-hold on a
                    // duplicated frame at the turnaround).
                    const middle = frames.slice(1, -1).reverse()
                    const sequence = [...frames, ...middle]

                    const durMs = Number.isFinite(video.duration) && video.duration > 0
                        ? video.duration * 1000
                        : MAX_BOOMERANG_SEC * 1000
                    const frameDurationMs = Math.max(20, Math.min(80, durMs / frames.length))

                    const outCanvas = document.createElement('canvas')
                    outCanvas.width = outW
                    outCanvas.height = outH
                    const octx = outCanvas.getContext('2d', { alpha: false })

                    let outStream
                    try { outStream = outCanvas.captureStream() }
                    catch { outStream = outCanvas.captureStream(30) }

                    const outMime = (rawMimeType && MediaRecorder.isTypeSupported?.(rawMimeType)) ? rawMimeType : (pickMimeType() || '')
                    let outRecorder
                    try {
                        outRecorder = new MediaRecorder(outStream, {
                            ...(outMime ? { mimeType: outMime } : {}),
                            videoBitsPerSecond: 6_000_000, // short clip — doesn't need Video mode's bitrate
                        })
                    } catch (err) {
                        frames.forEach((f) => f.close?.())
                        fail(err)
                        return
                    }

                    const outChunks = []
                    outRecorder.ondataavailable = (e) => { if (e.data?.size > 0) outChunks.push(e.data) }
                    outRecorder.onstop = () => {
                        outStream.getTracks().forEach((t) => t.stop())
                        frames.forEach((f) => f.close?.())
                        if (settled) return
                        settled = true
                        const type = (outRecorder.mimeType || outMime || 'video/mp4').split(';')[0]
                        const blob = new Blob(outChunks, { type })
                        if (!blob.size) { reject(new Error('boomerang: empty output')); return }
                        resolve({ blob, width: outW, height: outH, mimeType: blob.type })
                    }
                    outRecorder.onerror = (e) => { if (!settled) { settled = true; reject(e?.error || new Error('boomerang recorder error')) } }

                    // Seed the stream with real content before starting, same
                    // pattern as the old live-relay code.
                    octx.drawImage(sequence[0], 0, 0, outW, outH)
                    outRecorder.start()
                    let idx = 1
                    const stepTimer = setInterval(() => {
                        if (idx >= sequence.length) {
                            clearInterval(stepTimer)
                            if (outRecorder.state === 'recording') outRecorder.stop()
                            return
                        }
                        octx.drawImage(sequence[idx], 0, 0, outW, outH)
                        idx += 1
                    }, frameDurationMs)
                }

                video.play().then(collectLoop).catch((err) => fail(err))
            }
        })
    }, [])

    /**
     * Start recording.
     * @param {object} opts
     *   mode        — 'video' (default) or 'boomerang'
     *   video       — the live <video> element (source: video.srcObject)
     *   facingMode  — 'user' mirrors the boomerang reassembly like the live view
     *   aspect      — '9:16' | '4:3' | '1:1'
     *   isLandscape — rotate the crop like photo capture does
     *   onComplete  — called with the final result, or null on failure
     */
    const startRecording = useCallback(async (opts) => {
        if (recorderRef.current || startingRef.current) return false
        startingRef.current = true
        try {
        const { mode = 'video', video, facingMode, aspect, isLandscape, onComplete } = opts
        if (!video?.srcObject) return false

        const rawStream = video.srcObject
        const videoTrack = rawStream.getVideoTracks?.()[0]
        if (!videoTrack) return false

        const mimeType = pickMimeType()
        if (mimeType === null) { console.error('[FSC-VIDEO] MediaRecorder unsupported'); return false }

        // Video mode only: try to attach a mic track. Boomerang stays
        // video-only — its output is rebuilt from canvas frames anyway
        // (no audio path), so there's nothing to request or mute.
        const tracks = [videoTrack]
        if (mode === 'video') {
            const audioTrack = await getAudioTrack()
            if (audioTrack) tracks.push(audioTrack)
        }

        // Fresh MediaStream tapping the live tracks directly — recording
        // them untouched (no canvas relay) is what makes capture as smooth
        // as the viewfinder itself.
        const tapStream = new MediaStream(tracks)

        let recorder
        try {
            recorder = new MediaRecorder(tapStream, {
                ...(mimeType ? { mimeType } : {}),
                videoBitsPerSecond: 12_000_000,
            })
        } catch (err) {
            console.error('[FSC-VIDEO] MediaRecorder init failed:', err)
            return false
        }

        chunksRef.current = []
        abortedRef.current = false
        sessionRef.current = { onComplete, mode, aspect, isLandscape, facingMode, rawMimeType: recorder.mimeType || mimeType }
        durationCapRef.current = mode === 'boomerang' ? MAX_BOOMERANG_SEC : MAX_VIDEO_SEC

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

            if (session.mode !== 'boomerang') {
                // Video: ship the raw capture directly. No burn, no wait —
                // confirmed smooth, and no tag is implied in this mode
                // (CameraLayer shows a REC indicator instead of the pin).
                session.onComplete?.({
                    type: 'video',
                    blob: rawBlob,
                    objectURL: URL.createObjectURL(rawBlob),
                    mimeType: rawType,
                    width: videoTrack.getSettings?.().width,
                    height: videoTrack.getSettings?.().height,
                    meta: { ts: Date.now() },
                })
                return
            }

            setIsProcessing(true)
            try {
                const result = await assembleBoomerang(rawBlob, session)
                session.onComplete?.({
                    type: 'video',
                    blob: result.blob,
                    objectURL: URL.createObjectURL(result.blob),
                    mimeType: result.mimeType,
                    width: result.width,
                    height: result.height,
                    meta: { ts: Date.now(), boomerang: true },
                })
            } catch (err) {
                console.error('[FSC-VIDEO] boomerang assembly failed:', err)
                // Fail open: hand back the raw forward-only clip rather than
                // losing the capture entirely.
                session.onComplete?.({
                    type: 'video',
                    blob: rawBlob,
                    objectURL: URL.createObjectURL(rawBlob),
                    mimeType: rawType,
                    width: videoTrack.getSettings?.().width,
                    height: videoTrack.getSettings?.().height,
                    meta: { ts: Date.now(), boomerangFailed: true },
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
            setElapsedSec(Math.min(durationCapRef.current, (Date.now() - startTsRef.current) / 1000))
        }, 250)

        autoStopRef.current = setTimeout(() => {
            if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
        }, durationCapRef.current * 1000)

        if (navigator.vibrate) navigator.vibrate(20)
        return true
        } finally {
            startingRef.current = false
        }
    }, [cleanupTimers, assembleBoomerang, getAudioTrack])

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
        audioStreamRef.current?.getTracks().forEach((t) => t.stop())
        audioStreamRef.current = null
    }, [cleanupTimers])

    return { isRecording, isProcessing, elapsedSec, startRecording, stopRecording }
}
