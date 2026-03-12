import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * useCamera Hook - CamTech v2.0 (God-Tier Hardware Lock)
 * Implements high-res locking, advanced stability flags, and robust fallbacks.
 * Color Science: display-p3 enabled.
 */

export const FILTER_STYLES = {
    original: 'none',
    warm: 'sepia(0.3) saturate(1.4) brightness(1.1)',
    cool: 'saturate(0.9) hue-rotate(10deg) brightness(1.05)',
    vibrant: 'saturate(1.6) contrast(1.1) brightness(1.05)',
    vintage: 'sepia(0.4) contrast(0.9) brightness(0.95) saturate(0.8)',
    pastel: 'saturate(0.7) brightness(1.15) contrast(0.9)',
    mono: 'grayscale(1) contrast(1.1)',
    soft: 'brightness(1.08) contrast(0.92) saturate(0.95)',
    crisp: 'contrast(1.15) saturate(1.1) brightness(1.02)',
    fade: 'contrast(0.85) saturate(0.75) brightness(1.1)'
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

            // --- GOD-TIER HARDWARE LOCK (Tier 1: High-Res) ---
            const highResConstraints = {
                video: {
                    facingMode: facingMode,
                    width: { min: 1080, ideal: 1920, max: 3840 },
                    height: { min: 1920, ideal: 3840, max: 2160 }
                },
                audio: false
            }

            let stream
            try {
                console.log('--- HARDWARE LOCK: ATTEMPTING HIGH-RES (1080p/4K) ---')
                stream = await navigator.mediaDevices.getUserMedia(highResConstraints)
            } catch (err) {
                console.warn('--- HARDWARE LOCK: HIGH-RES FAILED, INITIATING 720p FALLBACK ---', err)
                // --- FALLBACK (Tier 2: 720p Safety) ---
                const fallbackConstraints = {
                    video: {
                        facingMode: facingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                }
                stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
            }

            streamRef.current = stream
            const videoTrack = stream.getVideoTracks()[0]
            trackRef.current = videoTrack

            // Hardware Capability Verification & Advanced Flags
            if (videoTrack.getCapabilities) {
                const capabilities = videoTrack.getCapabilities()
                const settings = videoTrack.getSettings()

                console.log(`--- HARDWARE VERIFIED: ${settings.width}x${settings.height} @ ${settings.frameRate}fps ---`)

                setFlashSupported(!!capabilities.torch)

                // Advanced Flags: Stabilization, Focus, Exposure
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

                // Zoom control
                if (capabilities.zoom) {
                    setZoomSupported(true)
                    zoomRangeRef.current = {
                        min: capabilities.zoom.min || 1,
                        max: Math.min(capabilities.zoom.max || 1, 3)
                    }
                } else {
                    setZoomSupported(false)
                }
            }

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
                setIsReady(true)
                setError(null)
            }
        } catch (err) {
            console.error('Camera initialization error:', err)
            setError(err.message)
            setIsReady(false)
        }
    }, [facingMode])

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
            case 'warm': {
                for (let i = 0; i < len; i += 4) {
                    let r = data[i], g = data[i + 1], b = data[i + 2]
                    const gray = (r + g + b) / 3
                    r = gray + (r - gray) * 1.15 + 15
                    g = gray + (g - gray) * 1.1 + 8
                    b = gray + (b - gray) * 0.9 - 20
                    data[i] = clamp(r * 1.08); data[i + 1] = clamp(g * 1.05); data[i + 2] = clamp(b)
                }
                break
            }
            case 'cool': {
                for (let i = 0; i < len; i += 4) {
                    let r = data[i], g = data[i + 1], b = data[i + 2]
                    const gray = (r + g + b) / 3
                    r = gray + (r - gray) * 0.9 - 10
                    g = gray + (g - gray) * 1.0 + 5
                    b = gray + (b - gray) * 1.1 + 20
                    data[i] = clamp(r * 1.02); data[i + 1] = clamp(g * 1.05); data[i + 2] = clamp(b * 1.08)
                }
                break
            }
            case 'vibrant': {
                for (let i = 0; i < len; i += 4) {
                    let r = data[i], g = data[i + 1], b = data[i + 2]
                    const gray = (r + g + b) / 3
                    r = (gray + (r - gray) * 1.5 - 128) * 1.1 + 128
                    g = (gray + (g - gray) * 1.5 - 128) * 1.1 + 128
                    b = (gray + (b - gray) * 1.5 - 128) * 1.1 + 128
                    data[i] = clamp(r * 1.03); data[i + 1] = clamp(g * 1.03); data[i + 2] = clamp(b * 1.03)
                }
                break
            }
            case 'vintage': {
                for (let i = 0; i < len; i += 4) {
                    let r = data[i], g = data[i + 1], b = data[i + 2]
                    const gray = (r + g + b) / 3
                    r = gray + (r - gray) * 0.7
                    g = gray + (g - gray) * 0.7
                    b = gray + (b - gray) * 0.7
                    r = (r * 1.1 + 10 - 128) * 0.85 + 128 + 15
                    g = (g * 1.0 + 5 - 128) * 0.85 + 128 + 10
                    b = (b * 0.85 - 5 - 128) * 0.85 + 128 + 5
                    data[i] = clamp(r); data[i + 1] = clamp(g); data[i + 2] = clamp(b)
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

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
        if (flashMode === 'on' || flashMode === 'auto') setTimeout(() => applyFlash('off'), 100)
        return dataUrl
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
        const recoveryTimeout = setTimeout(() => {
            if (videoRef.current && videoRef.current.readyState < 2) {
                console.warn('Camera black screen detected, retrying...')
                stopCamera()
                setTimeout(() => initCamera(), 100)
            }
        }, 3000)
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

    useEffect(() => {
        if (!document.hidden) initCameraWithRecovery()
    }, [facingMode])

    return {
        videoRef, canvasRef, isReady, error, facingMode, flipCamera,
        flashMode, flashSupported, cycleFlash, selectedFilter, setFilter,
        getFilterStyle, captureFrame, initCamera, zoomLevel, setZoom, zoomSupported
    }
}
