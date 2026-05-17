import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'

/**
 * useCamera Hook - CamTech v2.1 (Fast Preview + Background Upgrade)
 * Phase 1: Minimal constraints for instant preview
 * Phase 2: Background high-res upgrade via applyConstraints or re-negotiation
 * Color Science: display-p3 enabled.
 */

export const FILTER_STYLES = {
    original: 'none',
    mono: 'grayscale(1) contrast(1.1)',
    soft: 'brightness(1.08) contrast(0.92) saturate(0.95)'
}

const FLASH_MODES = ['off', 'on', 'auto', 'torch']

export function useCamera() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const trackRef = useRef(null)

    const [isReady, setIsReady] = useState(false)
    const [facingMode, setFacingMode] = useState('environment')
    const [error, setError] = useState(null)
    const [flashMode, setFlashMode] = useState('off')
    const [flashSupported, setFlashSupported] = useState(false)
    const [selectedFilter, setSelectedFilter] = useState('original')
    const [zoomLevel, setZoomLevel] = useState(1)
    const [zoomSupported, setZoomSupported] = useState(false)
    const zoomRangeRef = useRef({ min: 1, max: 1 })

    const probeCapabilities = useCallback(async (videoTrack) => {
        if (!videoTrack?.getCapabilities) return

        const capabilities = videoTrack.getCapabilities()
        const settings = videoTrack.getSettings()

        console.log(`--- HARDWARE VERIFIED: ${settings.width}x${settings.height} @ ${settings.frameRate}fps ---`)

        setFlashSupported(!!capabilities.torch)

        const advanced = {}
        if (capabilities.videoStabilizationMode?.includes('standard')) {
            advanced.videoStabilizationMode = 'standard'
            console.log('--- HARDWARE LOCK: STABILIZATION ACTIVE ---')
        }
        if (capabilities.focusMode?.includes('continuous')) {
            advanced.focusMode = 'continuous'
            console.log('--- HARDWARE LOCK: CONTINUOUS FOCUS ACTIVE ---')
        }
        if (capabilities.exposureMode?.includes('continuous')) {
            advanced.exposureMode = 'continuous'
            console.log('--- HARDWARE LOCK: CONTINUOUS EXPOSURE ACTIVE ---')
        }

        if (Object.keys(advanced).length > 0) {
            await videoTrack.applyConstraints({ advanced: [advanced] })
        }

        if (capabilities.zoom) {
            setZoomSupported(true)
            zoomRangeRef.current = {
                min: capabilities.zoom.min || 1,
                max: Math.min(capabilities.zoom.max || 1, 3)
            }
        } else {
            setZoomSupported(false)
        }
    }, [])

    const upgradeResolution = useCallback(async (currentStream) => {
        const track = currentStream.getVideoTracks()[0]
        if (!track) return

        // Defer capabilities probing to requestIdleCallback (non-blocking)
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => probeCapabilities(track), { timeout: 3000 })
        } else {
            setTimeout(() => probeCapabilities(track), 100)
        }

        // Try 1: Seamless applyConstraints upgrade (no flicker, 300ms timeout)
        try {
            console.log('--- UPGRADE: trying applyConstraints ---')
            const constraintPromise = track.applyConstraints({
                width: { ideal: 1920 },
                height: { ideal: 3840 }
            })

            // Don't block on this - it might take 500ms+
            constraintPromise.then(() => {
                const settings = track.getSettings()
                console.log(`--- UPGRADE: applyConstraints succeeded ${settings.width}x${settings.height} ---`)
            }).catch(() => {
                console.warn('--- UPGRADE: applyConstraints failed ---')
            })
        } catch (e) {
            console.warn('--- UPGRADE: applyConstraints error ---')
        }
    }, [probeCapabilities])

    const initCamera = useCallback(async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('Camera access requires HTTPS.')
                setIsReady(false)
                return
            }

            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }

            // === PHASE 1: FAST PREVIEW (instant) ===
            console.log('--- FAST PREVIEW: starting minimal stream ---')
            const fastConstraints = {
                video: { facingMode: facingMode },
                audio: false
            }

            const stream = await navigator.mediaDevices.getUserMedia(fastConstraints)
            streamRef.current = stream
            const videoTrack = stream.getVideoTracks()[0]
            trackRef.current = videoTrack

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                setIsReady(true)
                setError(null)
                videoRef.current.play().catch(() => {})
            }

            // === PHASE 2: BACKGROUND HIGH-RES UPGRADE ===
            upgradeResolution(stream).catch(err => {
                console.warn('Background upgrade failed, keeping fast preview:', err)
            })
        } catch (err) {
            console.error('Camera initialization error:', err)
            setError(err.message)
            setIsReady(false)
        }
    }, [facingMode, upgradeResolution])

    const flipCamera = useCallback(() => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
    }, [])

    const cycleFlash = useCallback(() => {
        setFlashMode(prev => {
            const currentIndex = FLASH_MODES.indexOf(prev)
            const nextIndex = (currentIndex + 1) % FLASH_MODES.length
            return FLASH_MODES[nextIndex]
        })
    }, [])

    const setZoom = useCallback((newZoom) => {
        if (!zoomSupported || !trackRef.current) return
        const clampedZoom = Math.max(zoomRangeRef.current.min, Math.min(newZoom, zoomRangeRef.current.max))
        try {
            trackRef.current.applyConstraints({ advanced: [{ zoom: clampedZoom }] })
            setZoomLevel(clampedZoom)
        } catch (e) { }
    }, [zoomSupported])

    const applyFlash = useCallback(async (mode) => {
        if (!trackRef.current || !flashSupported) return false
        try {
            const constraints = { torch: (mode === 'torch' || mode === 'on') }
            await trackRef.current.applyConstraints({ advanced: [constraints] })
            return true
        } catch (err) {
            return false
        }
    }, [flashSupported])

    useEffect(() => {
        if (flashMode === 'torch') applyFlash('torch')
        else if (flashMode === 'off') applyFlash('off')
    }, [flashMode, applyFlash])

    const setFilter = useCallback((filterId) => {
        if (FILTER_STYLES[filterId]) setSelectedFilter(filterId)
    }, [])

    const getFilterStyle = useCallback(() => {
        return FILTER_STYLES[selectedFilter] || 'none'
    }, [selectedFilter])

    const applyPixelFilter = useCallback((imageData, filterName) => {
        const data = imageData.data
        const len = data.length
        const clamp = (v) => v < 0 ? 0 : v > 255 ? 255 : v

        switch (filterName) {
            case 'mono': {
                for (let i = 0; i < len; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
                    const final = clamp((gray - 128) * 1.1 + 128)
                    data[i] = data[i + 1] = data[i + 2] = final
                }
                break
            }
            case 'soft': {
                for (let i = 0; i < len; i += 4) {
                    data[i] = clamp(data[i] * 1.08 + 5)
                    data[i + 1] = clamp(data[i + 1] * 1.08 + 3)
                    data[i + 2] = clamp(data[i + 2] * 1.05 + 2)
                }
                break
            }
        }
        return imageData
    }, [])

    const captureFrame = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return null
        const video = videoRef.current
        const canvas = canvasRef.current

        if (flashMode === 'on' || flashMode === 'auto') await applyFlash('on')

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d', { colorSpace: 'display-p3', willReadFrequently: true })

        ctx.save()
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0)
            ctx.scale(-1, 1)
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        ctx.restore()

        if (selectedFilter !== 'original') {
            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                applyPixelFilter(imageData, selectedFilter)
                ctx.putImageData(imageData, 0, 0)
            } catch (e) {
                console.warn('Pixel filter failed:', e)
            }
        }

        if (flashMode === 'on' || flashMode === 'auto') setTimeout(() => applyFlash('off'), 100)

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve({
                        blob,
                        objectURL: URL.createObjectURL(blob),
                        width: canvas.width,
                        height: canvas.height,
                        aspectRatio: canvas.width / canvas.height
                    })
                } else {
                    reject(new Error('Failed to create image blob'))
                }
            }, 'image/jpeg', 0.95)
        })
    }, [flashMode, applyFlash, facingMode, selectedFilter, applyPixelFilter])

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
            trackRef.current = null
        }
        if (videoRef.current) videoRef.current.srcObject = null
        setIsReady(false)
    }, [])

    const initCameraWithRecovery = useCallback(async () => {
        await initCamera()
        // Fast preview should show immediately; keep a short safety net
        const recoveryTimeout = setTimeout(() => {
            if (videoRef.current && videoRef.current.readyState < 2) {
                console.warn('Camera black screen detected, retrying...')
                stopCamera()
                setTimeout(() => initCamera(), 100)
            }
        }, 800)
        if (videoRef.current) {
            videoRef.current.addEventListener('playing', () => clearTimeout(recoveryTimeout), { once: true })
        }
        return () => clearTimeout(recoveryTimeout)
    }, [initCamera, stopCamera])

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) stopCamera()
            else initCameraWithRecovery()
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [stopCamera, initCameraWithRecovery])

    useEffect(() => {
        return () => stopCamera()
    }, [stopCamera])

    useLayoutEffect(() => {
        if (!document.hidden) initCameraWithRecovery()
    }, [facingMode])

    return {
        videoRef, canvasRef, isReady, error, facingMode, flipCamera,
        flashMode, flashSupported, cycleFlash, selectedFilter, setFilter,
        getFilterStyle, captureFrame, initCamera, zoomLevel, setZoom, zoomSupported
    }
}
