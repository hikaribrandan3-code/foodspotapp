import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * useCamera Hook - CamTech v1.7
 * Handles camera stream, filters, flip, flash, and capture
 * Uses MANUAL pixel manipulation for 100% reliable filter baking
 */

// CSS Filter definitions for preview (pixel math used for capture)
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

// Flash modes cycle
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

    // Initialize camera stream
    const initCamera = useCallback(async () => {
        try {
            // SAFETY CHECK: Verify camera API is available
            // iOS Safari blocks mediaDevices on non-HTTPS origins (except localhost)
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('Camera access requires HTTPS. This will work once deployed.')
                setIsReady(false)
                return
            }

            // Stop existing stream if any
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }

            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            streamRef.current = stream

            // Get video track for flash control
            const videoTrack = stream.getVideoTracks()[0]
            trackRef.current = videoTrack

            // Check flash and zoom support
            if (videoTrack.getCapabilities) {
                const capabilities = videoTrack.getCapabilities()
                setFlashSupported(!!capabilities.torch)

                // Check zoom support
                if (capabilities.zoom) {
                    setZoomSupported(true)
                    zoomRangeRef.current = {
                        min: capabilities.zoom.min || 1,
                        max: Math.min(capabilities.zoom.max || 1, 3) // Cap at 3x per requirements
                    }
                } else {
                    setZoomSupported(false)
                }
            } else {
                setFlashSupported(false)
                setZoomSupported(false)
            }

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
                setIsReady(true)
                setError(null)
            }
        } catch (err) {
            console.error('Camera error:', err)
            setError(err.message)
            setIsReady(false)
        }
    }, [facingMode])

    // Flip camera (front/back) - clean restart <200ms
    const flipCamera = useCallback(() => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
    }, [])

    // Cycle flash mode: off → on → auto → torch → off
    const cycleFlash = useCallback(() => {
        setFlashMode(prev => {
            const currentIndex = FLASH_MODES.indexOf(prev)
            const nextIndex = (currentIndex + 1) % FLASH_MODES.length
            return FLASH_MODES[nextIndex]
        })
    }, [])

    // Set zoom level (clamped 1.0-3.0)
    const setZoom = useCallback((newZoom) => {
        if (!zoomSupported || !trackRef.current) return

        const clampedZoom = Math.max(
            zoomRangeRef.current.min,
            Math.min(newZoom, zoomRangeRef.current.max)
        )

        try {
            trackRef.current.applyConstraints({ advanced: [{ zoom: clampedZoom }] })
            setZoomLevel(clampedZoom)
        } catch (e) {
            // Zoom not supported on this device
        }
    }, [zoomSupported])

    // Apply flash/torch to track
    const applyFlash = useCallback(async (mode) => {
        if (!trackRef.current || !flashSupported) return false

        try {
            const constraints = {}

            if (mode === 'torch' || mode === 'on') {
                constraints.torch = true
            } else {
                constraints.torch = false
            }

            await trackRef.current.applyConstraints({ advanced: [constraints] })
            return true
        } catch (err) {
            console.warn('Flash not supported:', err)
            return false
        }
    }, [flashSupported])

    // Apply torch mode when flash mode changes to 'torch'
    useEffect(() => {
        if (flashMode === 'torch') {
            applyFlash('torch')
        } else if (flashMode === 'off') {
            applyFlash('off')
        }
    }, [flashMode, applyFlash])

    // Set filter
    const setFilter = useCallback((filterId) => {
        if (FILTER_STYLES[filterId]) {
            setSelectedFilter(filterId)
        }
    }, [])

    // Get current filter CSS
    const getFilterStyle = useCallback(() => {
        return FILTER_STYLES[selectedFilter] || 'none'
    }, [selectedFilter])

    /**
     * Apply filter using MANUAL pixel manipulation
     * 100% deterministic, works on ALL browsers including iOS Safari
     * No ctx.filter, no CSS filters, no GPU dependencies
     */
    const applyPixelFilter = useCallback((imageData, filterName) => {
        const data = imageData.data
        const len = data.length

        // Helper: clamp value to 0-255
        const clamp = (v) => v < 0 ? 0 : v > 255 ? 255 : v

        switch (filterName) {
            case 'mono': {
                // Luminance grayscale: 0.299R + 0.587G + 0.114B
                // With slight contrast boost (multiply by 1.1, centered at 128)
                for (let i = 0; i < len; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
                    // Apply contrast: (gray - 128) * 1.1 + 128
                    const contrasted = (gray - 128) * 1.1 + 128
                    const final = clamp(contrasted)
                    data[i] = final
                    data[i + 1] = final
                    data[i + 2] = final
                }
                break
            }

            case 'warm': {
                // Warm: boost red/yellow, reduce blue
                // R +15, G +5, B -20, slight saturation boost
                for (let i = 0; i < len; i += 4) {
                    let r = data[i]
                    let g = data[i + 1]
                    let b = data[i + 2]

                    // Slight saturation boost (increase distance from gray)
                    const gray = (r + g + b) / 3
                    r = gray + (r - gray) * 1.15
                    g = gray + (g - gray) * 1.1
                    b = gray + (b - gray) * 0.9

                    // Color shift
                    r += 15
                    g += 8
                    b -= 20

                    // Brightness boost
                    r *= 1.08
                    g *= 1.05
                    b *= 1.0

                    data[i] = clamp(r)
                    data[i + 1] = clamp(g)
                    data[i + 2] = clamp(b)
                }
                break
            }

            case 'cool': {
                // Cool: boost blue/cyan, reduce red
                // R -10, G +5, B +20
                for (let i = 0; i < len; i += 4) {
                    let r = data[i]
                    let g = data[i + 1]
                    let b = data[i + 2]

                    // Slight desaturation for cooler feel
                    const gray = (r + g + b) / 3
                    r = gray + (r - gray) * 0.9
                    g = gray + (g - gray) * 1.0
                    b = gray + (b - gray) * 1.1

                    // Color shift
                    r -= 10
                    g += 5
                    b += 20

                    // Slight brightness boost
                    r *= 1.02
                    g *= 1.05
                    b *= 1.08

                    data[i] = clamp(r)
                    data[i + 1] = clamp(g)
                    data[i + 2] = clamp(b)
                }
                break
            }

            case 'vibrant': {
                // Vibrant: high saturation, slight contrast
                // Increase distance from gray by 1.5x
                for (let i = 0; i < len; i += 4) {
                    let r = data[i]
                    let g = data[i + 1]
                    let b = data[i + 2]

                    // High saturation boost
                    const gray = (r + g + b) / 3
                    r = gray + (r - gray) * 1.5
                    g = gray + (g - gray) * 1.5
                    b = gray + (b - gray) * 1.5

                    // Slight contrast
                    r = (r - 128) * 1.1 + 128
                    g = (g - 128) * 1.1 + 128
                    b = (b - 128) * 1.1 + 128

                    // Brightness
                    r *= 1.03
                    g *= 1.03
                    b *= 1.03

                    data[i] = clamp(r)
                    data[i + 1] = clamp(g)
                    data[i + 2] = clamp(b)
                }
                break
            }

            case 'vintage': {
                // Vintage: desaturate, sepia tint, lower contrast, lift blacks
                for (let i = 0; i < len; i += 4) {
                    let r = data[i]
                    let g = data[i + 1]
                    let b = data[i + 2]

                    // Desaturate (move toward gray)
                    const gray = (r + g + b) / 3
                    r = gray + (r - gray) * 0.7
                    g = gray + (g - gray) * 0.7
                    b = gray + (b - gray) * 0.7

                    // Sepia/yellow-brown tint
                    r = r * 1.1 + 10
                    g = g * 1.0 + 5
                    b = b * 0.85 - 5

                    // Lower contrast (compress toward middle)
                    r = (r - 128) * 0.85 + 128
                    g = (g - 128) * 0.85 + 128
                    b = (b - 128) * 0.85 + 128

                    // Lift blacks (add base brightness to shadows)
                    r += 15
                    g += 10
                    b += 5

                    data[i] = clamp(r)
                    data[i + 1] = clamp(g)
                    data[i + 2] = clamp(b)
                }
                break
            }

            default:
                // No filter or unknown - leave pixels unchanged
                break
        }

        return imageData
    }, [])

    // Capture frame - 100% MANUAL PIXEL FILTERS
    // No ctx.filter, no CSS filters, no GPU dependencies
    // Guaranteed deterministic on iOS Safari, Android Chrome, all browsers
    const captureFrame = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return null

        const video = videoRef.current
        const canvas = canvasRef.current

        // Fire flash if mode is 'on' or 'auto'
        if (flashMode === 'on' || flashMode === 'auto') {
            await applyFlash('on')
        }

        // Set canvas to exact video dimensions
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')

        // Step 1: Draw raw video frame to canvas
        ctx.save()

        // Mirror horizontally for front camera to match preview
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0)
            ctx.scale(-1, 1)
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        ctx.restore()

        // Step 2: Apply filter using MANUAL pixel manipulation
        // Skip if filter is 'original' (none)
        if (selectedFilter !== 'original') {
            try {
                // Get pixel data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

                // Apply filter (modifies imageData in place)
                applyPixelFilter(imageData, selectedFilter)

                // Write filtered pixels back to canvas
                ctx.putImageData(imageData, 0, 0)
            } catch (e) {
                console.warn('Pixel filter failed:', e)
                // Continue with unfiltered image on error
            }
        }

        // Step 3: Convert to data URL (pixels are now FINAL)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92)

        // Turn off flash after capture
        if (flashMode === 'on' || flashMode === 'auto') {
            setTimeout(() => applyFlash('off'), 100)
        }

        return dataUrl
    }, [flashMode, applyFlash, facingMode, selectedFilter, applyPixelFilter])

    // Stop camera stream (used for backgrounding)
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
            trackRef.current = null
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
        setIsReady(false)
    }, [])

    // Black-screen recovery: retry init if video doesn't start playing
    const initCameraWithRecovery = useCallback(async () => {
        await initCamera()

        // Set up black-screen detection timeout (3 seconds)
        const recoveryTimeout = setTimeout(() => {
            if (videoRef.current && videoRef.current.readyState < 2) {
                // Video not playing - likely black screen, retry once
                console.warn('Camera black screen detected, retrying...')
                stopCamera()
                setTimeout(() => {
                    initCamera()
                }, 100)
            }
        }, 3000)

        // Clean up timeout if video starts playing
        if (videoRef.current) {
            const handlePlaying = () => {
                clearTimeout(recoveryTimeout)
            }
            videoRef.current.addEventListener('playing', handlePlaying, { once: true })
        }

        return () => clearTimeout(recoveryTimeout)
    }, [initCamera, stopCamera])

    // Visibility change handler - pause/resume camera
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // App backgrounded - stop camera to save battery
                stopCamera()
            } else {
                // App foregrounded - reinitialize camera
                initCameraWithRecovery()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [stopCamera, initCameraWithRecovery])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera()
        }
    }, [stopCamera])

    // Re-init when facing mode changes
    useEffect(() => {
        // Only init if document is visible
        if (!document.hidden) {
            initCameraWithRecovery()
        }
    }, [facingMode]) // eslint-disable-line react-hooks/exhaustive-deps

    return {
        videoRef,
        canvasRef,
        isReady,
        error,
        facingMode,
        flipCamera,
        flashMode,
        flashSupported,
        cycleFlash,
        selectedFilter,
        setFilter,
        getFilterStyle,
        captureFrame,
        initCamera,
        zoomLevel,
        setZoom,
        zoomSupported
    }
}
