/**
 * useVideoRecorder.js — CamTech Video Mode engine
 *
 * Records the live <video> element through an offscreen canvas so the
 * business pin is burned into every frame (same spot as the live-view pin).
 *
 * Pipeline: <video> → rVFC/rAF draw loop → canvas.captureStream() →
 *           MediaRecorder (MP4 preferred, WebM fallback on older Android).
 *
 * No MediaRecorder on the raw camera stream — that path can't watermark.
 * Works on iOS Safari 15+ and Android Chrome. Audio is intentionally off
 * (camera stream is video-only; adding mic would trigger a second
 * permission prompt mid-flow).
 */

import { useState, useRef, useCallback, useEffect } from 'react'

export const MAX_VIDEO_SEC = 15

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
    const [isRecording, setIsRecording] = useState(false)
    const [elapsedSec, setElapsedSec] = useState(0)

    const recorderRef  = useRef(null)
    const chunksRef    = useRef([])
    const rafRef       = useRef(0)
    const rvfcRef      = useRef(0)
    const tickRef      = useRef(null)
    const autoStopRef  = useRef(null)
    const startTsRef   = useRef(0)
    const abortedRef   = useRef(false)
    const sessionRef   = useRef(null) // { canvas, video, onComplete, meta }

    const cleanupTimers = useCallback(() => {
        clearInterval(tickRef.current)
        clearTimeout(autoStopRef.current)
        cancelAnimationFrame(rafRef.current)
        const s = sessionRef.current
        if (s?.video && rvfcRef.current && s.video.cancelVideoFrameCallback) {
            try { s.video.cancelVideoFrameCallback(rvfcRef.current) } catch { /* noop */ }
        }
    }, [])

    /**
     * Start recording.
     * @param {object} opts
     *   video       — the live <video> element
     *   frameEl     — the viewfinder frame element (for pin position mapping)
     *   pinEl       — the on-screen .fsc-pin element (position/size source of truth)
     *   pinLabel    — business name (uppercased for burn)
     *   pinBg/pinText — pill colors
     *   facingMode  — 'user' mirrors the burn like the live view
     *   aspect      — '9:16' | '4:3' | '1:1'
     *   isLandscape — rotate the crop like photo capture does
     *   onComplete  — called with the result when recording stops (manual or 15s cap)
     */
    const startRecording = useCallback((opts) => {
        const { video, frameEl, pinEl, pinLabel, pinBg, pinText, facingMode, aspect, isLandscape, onComplete } = opts
        if (recorderRef.current || !video || !video.videoWidth) return false

        const mimeType = pickMimeType()
        if (mimeType === null) {
            console.error('[FSC-VIDEO] MediaRecorder unsupported')
            return false
        }

        // ── crop math: identical shape to captureFromVideo ──────────────────
        const sw = video.videoWidth
        const sh = video.videoHeight
        const baseRatio   = ASPECT_RATIO[aspect] || 9 / 16
        const targetRatio = isLandscape ? 1 / baseRatio : baseRatio
        const srcRatio    = sw / sh
        let cropW, cropH
        if (srcRatio > targetRatio) { cropH = sh; cropW = Math.round(sh * targetRatio) }
        else                        { cropW = sw; cropH = Math.round(sw / targetRatio) }
        const cropX = Math.round((sw - cropW) / 2)
        const cropY = Math.round((sh - cropH) / 2)

        // 1080p target: cap the SHORT side at 1080, never upscale
        const shortSide = Math.min(cropW, cropH)
        const scaleDown = Math.min(1, 1080 / shortSide)
        // H.264 wants even dimensions
        const outW = Math.round((cropW * scaleDown) / 2) * 2
        const outH = Math.round((cropH * scaleDown) / 2) * 2

        const canvas = document.createElement('canvas')
        canvas.width  = outW
        canvas.height = outH
        const ctx = canvas.getContext('2d', { alpha: false })

        // ── pin burn geometry: measured off the REAL on-screen pin ─────────
        // so the burned pin lands exactly where the user sees it in live view.
        let pin = null
        if (frameEl && pinEl) {
            const fr = frameEl.getBoundingClientRect()
            const pr = pinEl.getBoundingClientRect()
            if (fr.width > 0) {
                const s = outW / fr.width
                pin = {
                    x: (pr.left - fr.left) * s,
                    y: (pr.top  - fr.top)  * s,
                    w: pr.width  * s,
                    h: pr.height * s,
                    fontPx: 11 * s,
                    iconPx: 13 * s,
                    padX: 12 * s,
                    gap: 5 * s,
                    label: String(pinLabel || 'FoodSpot').toUpperCase(),
                    bg: pinBg || 'rgba(20,20,24,0.55)',
                    text: pinText || '#ffffff',
                    path: new Path2D(PIN_PATH),
                }
            }
        }

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
                // icon
                const iScale = pin.iconPx / 24
                const iY = pin.y + (pin.h - pin.iconPx) / 2
                ctx.save()
                ctx.translate(pin.x + pin.padX * 0.85, iY)
                ctx.scale(iScale, iScale)
                ctx.fillStyle = pin.text
                ctx.fill(pin.path)
                ctx.restore()
                // label
                ctx.fillStyle = pin.text
                ctx.font = `700 ${pin.fontPx}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
                ctx.textBaseline = 'middle'
                const maxTextW = pin.w - pin.padX * 1.7 - pin.iconPx - pin.gap
                ctx.fillText(pin.label, pin.x + pin.padX * 0.85 + pin.iconPx + pin.gap, pin.y + pin.h / 2 + pin.fontPx * 0.06, Math.max(maxTextW, 10))
            }
        }

        // draw loop: rVFC (frame-accurate, iOS 15.4+/Chrome) with rAF fallback
        const useRvfc = typeof video.requestVideoFrameCallback === 'function'
        const loop = () => {
            drawFrame()
            if (useRvfc) rvfcRef.current = video.requestVideoFrameCallback(loop)
            else         rafRef.current  = requestAnimationFrame(loop)
        }

        // ── stream + recorder ────────────────────────────────────────────────
        let stream
        try { stream = canvas.captureStream(30) }
        catch { stream = canvas.captureStream() }

        let recorder
        try {
            recorder = new MediaRecorder(stream, {
                ...(mimeType ? { mimeType } : {}),
                videoBitsPerSecond: 8_000_000,
            })
        } catch (err) {
            console.error('[FSC-VIDEO] MediaRecorder init failed:', err)
            return false
        }

        chunksRef.current = []
        abortedRef.current = false
        sessionRef.current = { canvas, video, onComplete, meta: { outW, outH, mimeType: recorder.mimeType || mimeType } }

        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
        }

        recorder.onstop = () => {
            cleanupTimers()
            stream.getTracks().forEach((t) => t.stop())
            const session = sessionRef.current
            recorderRef.current = null
            sessionRef.current = null
            setIsRecording(false)
            setElapsedSec(0)
            if (abortedRef.current || !session) return

            const type = session.meta.mimeType || 'video/mp4'
            const blob = new Blob(chunksRef.current, { type: type.split(';')[0] })
            chunksRef.current = []
            if (!blob.size) { console.error('[FSC-VIDEO] empty recording'); return }

            session.onComplete?.({
                type: 'video',
                blob,
                objectURL: URL.createObjectURL(blob),
                mimeType: blob.type,
                width: session.meta.outW,
                height: session.meta.outH,
                durationSec: Math.min(MAX_VIDEO_SEC, (Date.now() - startTsRef.current) / 1000),
                meta: { ts: Date.now() },
            })
        }

        recorder.onerror = (e) => {
            console.error('[FSC-VIDEO] recorder error:', e?.error || e)
            abortedRef.current = true
            try { recorder.stop() } catch { /* already stopped */ }
        }

        // fire the first frame before start so the stream has content, then roll
        drawFrame()
        recorder.start(1000) // 1s timeslices — steadier memory on iOS
        recorderRef.current = recorder
        startTsRef.current = Date.now()
        setIsRecording(true)
        setElapsedSec(0)
        loop()

        tickRef.current = setInterval(() => {
            setElapsedSec(Math.min(MAX_VIDEO_SEC, (Date.now() - startTsRef.current) / 1000))
        }, 250)

        autoStopRef.current = setTimeout(() => {
            if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
        }, MAX_VIDEO_SEC * 1000)

        if (navigator.vibrate) navigator.vibrate(20)
        return true
    }, [cleanupTimers])

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

    return { isRecording, elapsedSec, startRecording, stopRecording }
}
