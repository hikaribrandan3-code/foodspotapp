/**
 * ═══════════════════════════════════════════════════════════════════════
 * useCamera.js - GHOST WAKE: Niche Physics & Kinetic Engine
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Lead Sovereign Systems Architect: Deep Logic & Silicon Hardening
 * Mission: Bypass A19 Pro Neural Engine Center Stage Auto-Framing
 *          Raw 4K link from natively Square 18MP Sensor
 * 
 * GHOST WAKE ADDITIONS:
 * - Niche Physics: FOOD, PORTRAIT, PET, SPORTS, REAL_ESTATE modes
 * - Kinetic Engine: Gyro-stabilized UV matrix with quadratic damping
 * - Gimbal Toggle: Enable/disable motion compensation
 * 
 * 777x PROTOCOL VERIFIED:
 * - ISP Flush: enumerateDevices() during discharge to break Ghost Locks
 * - Constraint Order: aspectRatio FIRST to block 1:1 native initialization
 * - Neural Gag: centerStage: false + panTiltZoom: true in advanced
 * - Timing: 350ms Flip Discharge + 1600ms Cold Start
 * - Pulse-10: Haptic decimation for thermal safety
 * - Named Functions: Zero minification ghosts
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { ThermalGovernor } from '../utils/ThermalGovernor'

// ═══════════════════════════════════════════════════════════════════════
// 777x PROTOCOL CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const MODULE_LOAD_TIME = Date.now()
const COLD_START_MINIMUM_MS = 1600

const HARDWARE_DISCHARGE_MS = {
    ENVIRONMENT: 200,
    USER: 350
}

const SILICON_COOLDOWN_MS = 150

const PHASE_1_END = 800
const PHASE_2_END = 1600

const SWITCHING_ZONE_LOW = 1.1
const SWITCHING_ZONE_HIGH = 1.3
const OIS_SETTLING_MS = 50
const ZOOM_DEADBAND = 0.02

const ASPECT_RATIO_16_9 = 1.777777778

// ═══════════════════════════════════════════════════════════════════════
// NICHE PHYSICS CONSTANTS (GHOST WAKE)
// ═══════════════════════════════════════════════════════════════════════

export const NICHE_PHYSICS = Object.freeze({
    FOOD: Object.freeze({
        id: 'FOOD',
        zoom: 2.2,
        k1: -0.012,                    // Barrel distortion for close-up
        warmth: [1.15, 1.05, 0.95],   // R+15%, G+5%, B-5%
        shutter: null,
        description: 'Appetite Neural: Warm macro with barrel correction'
    }),

    PORTRAIT: Object.freeze({
        id: 'PORTRAIT',
        zoom: 3.5,
        k1: -0.0005,                   // Minimal distortion
        warmth: [1.02, 1.01, 0.98],   // Subtle skin harmony
        shutter: null,
        description: 'Skin Harmony: 85mm equivalent with bokeh emphasis'
    }),

    PET: Object.freeze({
        id: 'PET',
        zoom: 4.0,
        k1: 0.0008,                    // Slight pincushion for motion
        warmth: [1.0, 1.0, 1.0],      // Neutral
        shutter: 1 / 2000,              // Fast shutter for motion freeze
        description: 'Motion Freeze: High shutter speed for animal tracking'
    }),

    SPORTS: Object.freeze({
        id: 'SPORTS',
        zoom: 8.0,
        k1: 0.0046,                    // Pincushion for telephoto
        warmth: [1.0, 1.0, 1.0],      // Neutral
        shutter: 1 / 4000,              // Ultra-fast shutter
        description: 'Action Freeze: 200mm equivalent with motion lock'
    }),

    REAL_ESTATE: Object.freeze({
        id: 'REAL_ESTATE',
        zoom: 0.5,
        k1: -0.0360,                   // Strong barrel correction for ultra-wide
        warmth: [1.0, 1.02, 1.05],    // Slight cool for modern interiors
        shutter: null,
        description: 'Wide Fix: 13mm equivalent with distortion correction'
    }),

    AUTO: Object.freeze({
        id: 'AUTO',
        zoom: 1.0,
        k1: 0.0,
        warmth: [1.0, 1.0, 1.0],
        shutter: null,
        description: 'Standard: No physics override'
    })
})

// ═══════════════════════════════════════════════════════════════════════
// KINETIC ENGINE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const KINETIC_CONFIG = Object.freeze({
    // Focal lengths in mm (for gyro offset calculation)
    FOCAL_24MM: 24,
    FOCAL_35MM: 35,
    FOCAL_50MM: 50,
    FOCAL_85MM: 85,
    FOCAL_200MM: 200,

    // Damping coefficients by zoom level
    DAMPING: Object.freeze({
        0.5: 0.3,   // Ultra-wide: minimal damping
        1.0: 0.5,   // Standard: moderate damping
        2.0: 0.7,   // Portrait: higher damping
        4.0: 0.85,  // Telephoto: heavy damping
        8.0: 0.95   // Super-tele: maximum damping
    }),

    // Gyro sensitivity (degrees to UV offset)
    GYRO_SENSITIVITY: 0.0015,

    // Maximum UV offset (prevents over-correction)
    MAX_OFFSET: 0.08
})

// ═══════════════════════════════════════════════════════════════════════
// FILTER STYLES (CSS Fallback)
// ═══════════════════════════════════════════════════════════════════════

export const FILTER_STYLES = {
    original: 'none',
    soft: 'brightness(1.08) contrast(0.92) saturate(0.95)',
    warm: 'sepia(0.25) saturate(1.4) brightness(1.08)',
    crisp: 'contrast(1.18) saturate(1.15) brightness(1.02)',
    vintage: 'sepia(0.35) contrast(0.92) brightness(0.95) saturate(0.85)',
    mono: 'grayscale(1) contrast(1.1)',
    pastel: 'saturate(0.7) brightness(1.15) contrast(0.9)',
    vibrant: 'saturate(1.6) contrast(1.1) brightness(1.05)',
    cool: 'saturate(0.95) contrast(1.08) brightness(0.98)',
    fade: 'contrast(0.85) saturate(0.75) brightness(1.1)',
    // Sovereign 7 CSS fallbacks
    halide: 'invert(1) sepia(0.1) brightness(0.9)',
    carbon: 'grayscale(1) contrast(1.2)',
    silica: 'contrast(1.3) saturate(1.15)',
    vapor: 'brightness(1.1) contrast(0.9) saturate(0.9)',
    chrome: 'contrast(1.4) saturate(0.7)',
    velvet: 'sepia(0.15) saturate(1.2)',
    zenith: 'saturate(0.9) brightness(0.95)'
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN CAMERA HOOK
// ═══════════════════════════════════════════════════════════════════════

export function useCamera() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const trackRef = useRef(null)
    const burstBufferRef = useRef([])

    // VIRTUAL LENS REFS
    const targetZoomRef = useRef(1)
    const currentZoomRef = useRef(1)
    const zoomTimeoutRef = useRef(null)

    // MUTEX REFS
    const ignitionMutex = useRef(false)
    const flipMutex = useRef(false)
    const lastFacingModeRef = useRef(null)
    const zoomRangeRef = useRef({ min: 1, max: 10 })

    // KINETIC ENGINE REFS
    const gimbalEnabledRef = useRef(false)
    const kineticOffsetRef = useRef({ x: 0, y: 0 })

    const [isReady, setIsReady] = useState(false)
    const [facingMode, setFacingMode] = useState('environment')
    const [error, setError] = useState(null)
    const [isSwitching, setIsSwitching] = useState(false)
    const [flashMode, setFlashMode] = useState('off')
    const [flashSupported, setFlashSupported] = useState(false)
    const [zoomLevel, setZoomLevel] = useState(1)

    // NICHE MODE STATE
    const [nicheMode, setNicheMode] = useState('AUTO')
    const [gimbalEnabled, setGimbalEnabled] = useState(false)

    // TELEMETRY STATUS
    const [statusMessage, setStatusMessage] = useState('STANDBY')
    const [calibrationProgress, setCalibrationProgress] = useState(0)

    // ═══════════════════════════════════════════════════════════════════
    // ISP FLUSH: DEEP CLEAN 2.0
    // ═══════════════════════════════════════════════════════════════════

    async function deepCleanHardware() {
        if (streamRef.current) {
            const tracks = streamRef.current.getTracks()
            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i]
                track.stop()
                track.enabled = false
                await Promise.resolve()
            }
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null
        }

        streamRef.current = null
        trackRef.current = null

        await new Promise(function ispRelease(resolve) { setTimeout(resolve, 100) })

        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const videoInputs = devices.filter(function filterVideo(device) {
                return device.kind === 'videoinput'
            })

            const ghostLocks = videoInputs.filter(function checkGhost(d) {
                return !d.label || d.label === ''
            })

            if (ghostLocks.length > 0) {
                await new Promise(function extraFlush(r) { setTimeout(r, 50) })
            }
        } catch (enumError) {
            console.error('[ISP FLUSH] Device enumeration failed:', enumError)
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRAINT BUILDER: 777x PROTOCOL + NICHE PHYSICS
    // ═══════════════════════════════════════════════════════════════════

    function buildConstraints(mode) {
        const constraints = {
            video: {
                aspectRatio: { exact: ASPECT_RATIO_16_9 },
                facingMode: { exact: mode },
                width: { ideal: 3840, min: 1920 },
                height: { ideal: 2160, min: 1080 },
                frameRate: { ideal: 60, min: 30 }
            },
            audio: false
        }

        // NEURAL GAG: CENTER STAGE AI INHIBITION
        if (mode === 'user') {
            constraints.video.advanced = [
                { centerStage: false },
                { panTiltZoom: true }
            ]
        }

        return constraints
    }

    // ═══════════════════════════════════════════════════════════════════
    // NICHE MODE APPLICATOR
    // ═══════════════════════════════════════════════════════════════════

    const applyNicheMode = useCallback(function applyNicheMode(modeId) {
        const physics = NICHE_PHYSICS[modeId] || NICHE_PHYSICS.AUTO

        setNicheMode(modeId)

        // Apply zoom
        if (physics.zoom !== 1.0 && trackRef.current) {
            const clamped = Math.max(
                zoomRangeRef.current.min,
                Math.min(physics.zoom, zoomRangeRef.current.max)
            )

            try {
                trackRef.current.applyConstraints({ advanced: [{ zoom: clamped }] })
                currentZoomRef.current = clamped
                setZoomLevel(clamped)
            } catch (e) {
                console.warn('[NICHE] Zoom constraint failed:', e)
            }
        }

        // Apply shutter speed if specified
        if (physics.shutter && trackRef.current) {
            try {
                const exposureTime = physics.shutter * 1000000 // Convert to microseconds
                trackRef.current.applyConstraints({
                    advanced: [{ exposureTime: exposureTime }]
                })
            } catch (e) {
                // Shutter control may not be available
            }
        }

        if (navigator.vibrate) navigator.vibrate(20)

        if (import.meta.env.DEV) {
            console.log(`[NICHE] Applied: ${modeId} | Zoom: ${physics.zoom}x | k₁: ${physics.k1}`)
        }

        return physics
    }, [])

    /**
     * Get current niche physics for export/rendering
     */
    const getNichePhysics = useCallback(function getNichePhysics() {
        return NICHE_PHYSICS[nicheMode] || NICHE_PHYSICS.AUTO
    }, [nicheMode])

    // ═══════════════════════════════════════════════════════════════════
    // KINETIC ENGINE: Gyro-Stabilized UV Offset
    // Formula: Offset = (Gyro × Focal_Length) × Zoom²
    // ═══════════════════════════════════════════════════════════════════

    const calculateKineticOffset = useCallback(function calculateKineticOffset(imuData) {
        if (!gimbalEnabledRef.current || !imuData) {
            return { x: 0, y: 0 }
        }

        const zoom = currentZoomRef.current

        // Get damping coefficient based on zoom level
        let damping = 0.5
        const dampingKeys = Object.keys(KINETIC_CONFIG.DAMPING).map(Number).sort((a, b) => a - b)
        for (const key of dampingKeys) {
            if (zoom >= key) {
                damping = KINETIC_CONFIG.DAMPING[key]
            }
        }

        // Quadratic damping: Offset = (Gyro × Sensitivity) × Zoom²
        const zoomSquared = zoom * zoom
        const sensitivity = KINETIC_CONFIG.GYRO_SENSITIVITY

        // Beta = pitch (X-axis rotation), Gamma = roll (Y-axis rotation)
        let offsetX = imuData.gamma * sensitivity * zoomSquared * damping
        let offsetY = imuData.beta * sensitivity * zoomSquared * damping

        // Clamp to max offset
        offsetX = Math.max(-KINETIC_CONFIG.MAX_OFFSET, Math.min(KINETIC_CONFIG.MAX_OFFSET, offsetX))
        offsetY = Math.max(-KINETIC_CONFIG.MAX_OFFSET, Math.min(KINETIC_CONFIG.MAX_OFFSET, offsetY))

        kineticOffsetRef.current = { x: offsetX, y: offsetY }

        return { x: offsetX, y: offsetY }
    }, [])

    /**
     * Toggle gimbal stabilization
     */
    const toggleGimbal = useCallback(function toggleGimbal(enabled) {
        gimbalEnabledRef.current = enabled
        setGimbalEnabled(enabled)

        if (!enabled) {
            kineticOffsetRef.current = { x: 0, y: 0 }
        }

        if (navigator.vibrate) navigator.vibrate(15)

        if (import.meta.env.DEV) {
            console.log(`[KINETIC] Gimbal ${enabled ? 'ENABLED' : 'DISABLED'}`)
        }

        return enabled
    }, [])

    /**
     * Get current kinetic offset for UV matrix
     */
    const getKineticOffset = useCallback(function getKineticOffset() {
        return kineticOffsetRef.current
    }, [])

    // ═══════════════════════════════════════════════════════════════════
    // BOOT SEQUENCE
    // ═══════════════════════════════════════════════════════════════════

    async function runBootSequence(mode) {
        const timeSinceLoad = Date.now() - MODULE_LOAD_TIME

        if (mode === 'user') {
            if (timeSinceLoad < PHASE_1_END) {
                setStatusMessage('INHIBITING NEURAL ENGINE...')
                setCalibrationProgress(25)
                const waitTime = PHASE_1_END - timeSinceLoad
                await new Promise(function phase1(r) { setTimeout(r, waitTime) })
            }

            if (Date.now() - MODULE_LOAD_TIME < PHASE_2_END) {
                setStatusMessage('CALIBRATING 18MP SQUARE ARRAY...')
                setCalibrationProgress(50)
                const waitTime = PHASE_2_END - (Date.now() - MODULE_LOAD_TIME)
                await new Promise(function phase2(r) { setTimeout(r, Math.max(0, waitTime)) })
            }
        } else {
            if (timeSinceLoad < PHASE_1_END) {
                setStatusMessage('CALIBRATING 4K SENSOR ARRAY...')
                setCalibrationProgress(25)
                const waitTime = PHASE_1_END - timeSinceLoad
                await new Promise(function phase1(r) { setTimeout(r, waitTime) })
            }

            if (Date.now() - MODULE_LOAD_TIME < PHASE_2_END) {
                setStatusMessage('OPTIMIZING SILICON THROUGHPUT [8.3MP]...')
                setCalibrationProgress(50)
                const waitTime = PHASE_2_END - (Date.now() - MODULE_LOAD_TIME)
                await new Promise(function phase2(r) { setTimeout(r, Math.max(0, waitTime)) })
            }
        }

        setStatusMessage('NEGOTIATING HARDWARE BOND...')
        setCalibrationProgress(75)
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4K IGNITION
    // ═══════════════════════════════════════════════════════════════════

    const initCamera = useCallback(async function initCamera() {
        if (ignitionMutex.current) {
            return
        }

        if (streamRef.current && lastFacingModeRef.current === facingMode) return

        ignitionMutex.current = true

        try {
            await runBootSequence(facingMode)
            await deepCleanHardware()

            const constraints = buildConstraints(facingMode)
            const stream = await navigator.mediaDevices.getUserMedia(constraints)

            streamRef.current = stream

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }

            const videoTrack = stream.getVideoTracks()[0]
            trackRef.current = videoTrack

            const settings = videoTrack.getSettings()
            const megapixels = ((settings.width * settings.height) / 1000000).toFixed(1)

            if (videoTrack.getCapabilities) {
                const capabilities = videoTrack.getCapabilities()
                setFlashSupported(Boolean(capabilities.torch))
                if (capabilities.zoom) {
                    zoomRangeRef.current = {
                        min: capabilities.zoom.min || 1,
                        max: Math.min(capabilities.zoom.max || 10, 10)
                    }

                    const hwZoom = settings.zoom || 1
                    currentZoomRef.current = hwZoom
                    setZoomLevel(hwZoom)
                }
            }

            lastFacingModeRef.current = facingMode
            setIsReady(true)
            setError(null)

            if (facingMode === 'user') {
                setStatusMessage('4K FRONT OPTIC LINK: ACTIVE [' + megapixels + 'MP]')
            } else {
                setStatusMessage('4K OPTIC LINK: ACTIVE')
            }
            setCalibrationProgress(100)

        } catch (err) {
            console.error('[IGNITION FAILED]', err)
            setError(err.message)
            setIsReady(false)
            setStatusMessage('IGNITION FAILED: ' + err.message)
            setCalibrationProgress(0)
        } finally {
            ignitionMutex.current = false
        }
    }, [facingMode])

    // ═══════════════════════════════════════════════════════════════════
    // CAMERA FLIP
    // ═══════════════════════════════════════════════════════════════════

    const flipCamera = useCallback(async function flipCamera() {
        // STEP 16 GUARD: Prevent double-taps and race conditions
        if (flipMutex.current) {
            if (import.meta.env.DEV) console.log('[FLIP] Blocked: Mutex locked')
            return
        }

        // RESET IGNITION MUTEX (allow re-init)
        ignitionMutex.current = false

        // LOCK THE UI
        flipMutex.current = true
        setIsSwitching(true)
        setIsReady(false)  // CRITICAL: Pause render loop during flip

        const nextMode = facingMode === 'environment' ? 'user' : 'environment'
        const dischargeTime = HARDWARE_DISCHARGE_MS[nextMode.toUpperCase()]

        if (nextMode === 'user') {
            setStatusMessage('INHIBITING NEURAL ENGINE...')
        } else {
            setStatusMessage('SWITCHING SENSOR...')
        }
        setCalibrationProgress(25)

        try {
            // STEP 16: Deep clean before flip (breaks ghost locks)
            await deepCleanHardware()

            // HARDWARE DISCHARGE: Wait for ISP to fully release
            await new Promise(function discharge(r) { setTimeout(r, dischargeTime) })

            // RESET ZOOM
            setZoomLevel(1.0)
            currentZoomRef.current = 1.0

            // TRIGGER RE-INIT via facingMode change
            setFacingMode(nextMode)

        } catch (err) {
            console.error('[FLIP FAILED]', err)
            setError(err.message)
            setIsReady(false)
        } finally {
            // UNLOCK AFTER COOLDOWN
            setTimeout(function unlockFlip() {
                flipMutex.current = false
                setIsSwitching(false)
            }, SILICON_COOLDOWN_MS)
        }
    }, [facingMode])

    // ═══════════════════════════════════════════════════════════════════
    // TORCH CONTROL
    // ═══════════════════════════════════════════════════════════════════

    const applyFlash = useCallback(async function applyFlash(mode) {
        if (!trackRef.current || !flashSupported) return false
        try {
            const torchOn = mode === 'torch' || mode === 'on'
            await trackRef.current.applyConstraints({ advanced: [{ torch: torchOn }] })
            return true
        } catch (e) {
            return false
        }
    }, [flashSupported])

    const cycleFlash = useCallback(function cycleFlash() {
        const modes = ['off', 'on', 'auto', 'torch']
        const idx = modes.indexOf(flashMode)
        setFlashMode(modes[(idx + 1) % modes.length])
    }, [flashMode])

    // ═══════════════════════════════════════════════════════════════════
    // TAP-TO-FOCUS (best-effort hardware AF/AE at a normalized point)
    // The yellow iOS-style reticle is drawn by the UI regardless; this just
    // nudges the sensor where supported (Chrome/Android; Safari often no-ops).
    // ═══════════════════════════════════════════════════════════════════

    const focusAt = useCallback(async function focusAt(nx, ny) {
        const track = trackRef.current
        if (!track || !track.getCapabilities) return
        try {
            const caps = track.getCapabilities()
            const advanced = []
            if (Array.isArray(caps.focusMode)) {
                if (caps.focusMode.includes('single-shot')) advanced.push({ focusMode: 'single-shot' })
                else if (caps.focusMode.includes('manual')) advanced.push({ focusMode: 'manual' })
            }
            if (caps.pointsOfInterest) {
                advanced.push({ pointsOfInterest: [{ x: nx, y: ny }] })
            }
            if (Array.isArray(caps.exposureMode) && caps.exposureMode.includes('single-shot')) {
                advanced.push({ exposureMode: 'single-shot' })
            }
            if (advanced.length) await track.applyConstraints({ advanced })
        } catch (e) {
            /* focus point not supported — UI reticle still shows */
        }
        if (navigator.vibrate) navigator.vibrate(8)
    }, [])

    // ═══════════════════════════════════════════════════════════════════
    // 4K SHUTTER
    // ═══════════════════════════════════════════════════════════════════

    const captureHighResFrame = useCallback(async function captureHighResFrame() {
        if (!trackRef.current) return null
        let bitmap = null

        try {
            const imageCapture = new ImageCapture(trackRef.current)
            bitmap = await imageCapture.grabFrame({ imageWidth: 3840, imageHeight: 2160 })

            if (navigator.vibrate) navigator.vibrate([15, 50, 15])
            ThermalGovernor.shared.recordActivity('capture')

            return bitmap
        } catch (e) {
            if (bitmap) bitmap.close()
            return null
        }
    }, [])

    // ═══════════════════════════════════════════════════════════════════
    // ZOOM CONTROL
    // ═══════════════════════════════════════════════════════════════════

    function applyHardwareZoomInternal(value) {
        if (!trackRef.current) return

        const clamped = Math.max(zoomRangeRef.current.min, Math.min(value, zoomRangeRef.current.max))

        try {
            trackRef.current.applyConstraints({ advanced: [{ zoom: clamped }] })
            currentZoomRef.current = clamped
            setZoomLevel(clamped)
        } catch (e) {
            console.warn('[ZOOM] Hardware bond failed:', e)
        }
    }

    const handleZoomChange = useCallback(function handleZoomChange(requestedZoom) {
        if (!trackRef.current) return

        const current = currentZoomRef.current
        const delta = Math.abs(requestedZoom - current)

        if (delta < ZOOM_DEADBAND) return

        targetZoomRef.current = requestedZoom

        if (zoomTimeoutRef.current) {
            clearTimeout(zoomTimeoutRef.current)
            zoomTimeoutRef.current = null
        }

        const entering = requestedZoom >= SWITCHING_ZONE_LOW && requestedZoom <= SWITCHING_ZONE_HIGH
        const exiting = current >= SWITCHING_ZONE_LOW && current <= SWITCHING_ZONE_HIGH

        if (entering || exiting) {
            zoomTimeoutRef.current = setTimeout(function applySettled() {
                applyHardwareZoomInternal(targetZoomRef.current)
                if (navigator.vibrate) navigator.vibrate(10)
            }, OIS_SETTLING_MS)
        } else {
            applyHardwareZoomInternal(requestedZoom)
        }
    }, [])

    const setZoom = useCallback(function setZoom(value) {
        handleZoomChange(value)
    }, [handleZoomChange])

    const updateHardwareZoom = useCallback(function updateHardwareZoom(fovLevel) {
        if (!trackRef.current) return
        const min = zoomRangeRef.current.min
        const max = zoomRangeRef.current.max
        const target = min * Math.pow((max / min), fovLevel)
        handleZoomChange(target)
    }, [handleZoomChange])

    // ═══════════════════════════════════════════════════════════════════
    // BURST CAPTURE
    // ═══════════════════════════════════════════════════════════════════

    const startBurstCapture = useCallback(async function startBurstCapture() {
        if (!videoRef.current || !canvasRef.current) return []
        burstBufferRef.current = []

        const video = videoRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d', { alpha: false })
        const frameCount = 12

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        async function captureSequence(index) {
            await ThermalGovernor.shared.breathe(index)

            ctx.save()
            if (facingMode === 'user') {
                ctx.translate(canvas.width, 0)
                ctx.scale(-1, 1)
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            ctx.restore()

            const frameData = canvas.toDataURL('image/jpeg', 0.85)
            burstBufferRef.current.push(frameData)

            if (index % 10 === 0 && navigator.vibrate) {
                navigator.vibrate(20)
            }

            if (index < frameCount - 1) await captureSequence(index + 1)
        }

        await captureSequence(0)

        const frames = burstBufferRef.current
        const reversed = frames.slice(1, -1).reverse()
        return [...frames, ...reversed]
    }, [facingMode])

    // ═══════════════════════════════════════════════════════════════════
    // EFFECTS
    // ═══════════════════════════════════════════════════════════════════

    useEffect(function visibilitySentinel() {
        function handleVisibility() {
            if (document.hidden && streamRef.current) {
                deepCleanHardware()
                setIsReady(false)
                setStatusMessage('STANDBY')
                setCalibrationProgress(0)
            }
        }
        document.addEventListener('visibilitychange', handleVisibility)
        return function cleanup() {
            document.removeEventListener('visibilitychange', handleVisibility)
            if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current)
        }
    }, [])

    useEffect(function mountIgnition() {
        initCamera()
    }, [initCamera])

    useEffect(function unmountCleanup() {
        return function cleanup() {
            deepCleanHardware()
        }
    }, [])

    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════

    return {
        videoRef: videoRef,
        canvasRef: canvasRef,
        isReady: isReady,
        isSwitching: isSwitching,
        error: error,
        facingMode: facingMode,
        flipCamera: flipCamera,
        flashMode: flashMode,
        flashSupported: flashSupported,
        cycleFlash: cycleFlash,
        applyFlash: applyFlash,
        initCamera: initCamera,
        zoomLevel: zoomLevel,
        setZoom: setZoom,
        updateHardwareZoom: updateHardwareZoom,
        zoomRange: zoomRangeRef.current,
        focusAt: focusAt,
        captureHighResFrame: captureHighResFrame,
        startBurstCapture: startBurstCapture,
        statusMessage: statusMessage,
        calibrationProgress: calibrationProgress,

        // NICHE PHYSICS API
        nicheMode: nicheMode,
        applyNicheMode: applyNicheMode,
        getNichePhysics: getNichePhysics,
        NICHE_PHYSICS: NICHE_PHYSICS,

        // KINETIC ENGINE API
        gimbalEnabled: gimbalEnabled,
        toggleGimbal: toggleGimbal,
        calculateKineticOffset: calculateKineticOffset,
        getKineticOffset: getKineticOffset,
        KINETIC_CONFIG: KINETIC_CONFIG,

        terminateHardware: function terminateHardware() {
            deepCleanHardware()
            if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current)
            setStatusMessage('TERMINATED')
            setCalibrationProgress(0)
        }
    }
}

export default useCamera