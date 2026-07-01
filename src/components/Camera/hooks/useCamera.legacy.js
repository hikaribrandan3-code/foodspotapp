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
    const isInitializingRef = useRef(false)

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

        // Non-blocking background upgrade: try 4K, fall back to 1080p
        const upgradeAsync = async () => {
            try {
                // Try 4K with soft constraints (no min, just ideal)
                console.log('--- UPGRADE: attempting 4K ---')
                await track.applyConstraints({
                    width: { ideal: 3840 },
                    height: { ideal: 2160 }
                })
                const settings = track.getSettings()
                console.log(`--- 4K SUCCESS: ${settings.width}x${settings.height} ---`)
            } catch (err) {
                // Fallback: try 1080p
                try {
                    console.log('--- UPGRADE: 4K failed, trying 1080p ---')
                    await track.applyConstraints({
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    })
                    const settings = track.getSettings()
                    console.log(`--- 1080p SUCCESS: ${settings.width}x${settings.height} ---`)
                } catch (e2) {
                    console.warn('--- UPGRADE: Resolution upgrade failed, keeping preview ---')
                }
            }

            // Probe capabilities after resolution is set
            await probeCapabilities(track)
        }

        // Fire in background (non-blocking)
        upgradeAsync().catch(() => {})
    }, [probeCapabilities])

    const initCamera = useCallback(async () => {
        // Guard: prevent overlapping inits
        if (isInitializingRef.current) return
        isInitializingRef.current = true

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
            upgradeResolution(stream).catch(() => {})
        } catch (err) {
            console.error('Camera initialization error:', err)
            setError(err.message)
            setIsReady(false)
        } finally {
            isInitializingRef.current = false
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

        // Capture at DEVICE VIEWPORT dimensions (landscape or portrait, 1:1 with what user sees)
        const dpr = window.devicePixelRatio || 1
        const viewportWidth = Math.round(window.innerWidth * dpr)
        const viewportHeight = Math.round(window.innerHeight * dpr)

        // COVER logic: crop the video source so it fills the viewport with NO black bars.
        // This matches object-fit: cover — what the user actually sees on screen.
        const videoAspect = video.videoWidth / video.videoHeight
        const viewportAspect = viewportWidth / viewportHeight

        let srcX = 0, srcY = 0, srcW = video.videoWidth, srcH = video.videoHeight

        if (videoAspect > viewportAspect) {
            // Video is wider than viewport — crop left/right sides, fill height
            srcH = video.videoHeight
            srcW = Math.round(video.videoHeight * viewportAspect)
            srcX = Math.round((video.videoWidth - srcW) / 2)
        } else {
            // Video is taller than viewport — crop top/bottom, fill width
            srcW = video.videoWidth
            srcH = Math.round(video.videoWidth / viewportAspect)
            srcY = Math.round((video.videoHeight - srcH) / 2)
        }

        canvas.width = viewportWidth
        canvas.height = viewportHeight
        const ctx = canvas.getContext('2d', { colorSpace: 'display-p3', willReadFrequently: true })

        ctx.save()
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0)
            ctx.scale(-1, 1)
        }
        // Draw CROPPED video source to fill the FULL canvas — no black bars, no letterboxing
        // Signature: drawImage(source, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
        ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, viewportWidth, viewportHeight)
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
                        width: viewportWidth,
                        height: viewportHeight,
                        aspectRatio: viewportWidth / viewportHeight
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
        // Only retry if video is truly black (videoWidth === 0 = no actual frame)
        const recoveryTimeout = setTimeout(() => {
            const video = videoRef.current
            if (video && video.videoWidth === 0 && !isInitializingRef.current) {
                console.warn('Camera black screen detected, retrying...')
                initCamera()
            }
        }, 1500)
        if (videoRef.current) {
            videoRef.current.addEventListener('playing', () => clearTimeout(recoveryTimeout), { once: true })
        }
        return () => clearTimeout(recoveryTimeout)
    }, [initCamera])

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
