/**
 * ThermalGovernor.js - V15.7 Messiah Build
 * Hardened for A19 Pro Vapor Chamber Scaling + Chi Coefficient Feedback
 * 
 * MASONIC INVARIANTS:
 * - Logarithmic Silicon Breath: Base * Factor^(FrameCount / 5)
 * - 1.15 Factor calibration for A19 Pro (Phase-Change Efficiency)
 * - ≤3.0°C Thermal Cap enforcement
 * 
 * STEP 17: Chi Coefficient Feedback Loop
 * STEP 19: SiliconFingerprint Integration (Separation of Concerns)
 * STEP 21: SovereignConstants Integration (Single Source of Truth)
 */

import AsyncBridge from './AsyncBridge.js'
import SiliconFingerprint from './SiliconFingerprint.js'
import { THERMAL, MEMORY, ZONES } from './SovereignConstants.js'

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS (Imported from SovereignConstants - Step 21)
// ═══════════════════════════════════════════════════════════════════════

const CHI_MAX = THERMAL.CHI_MAX
const CHI_MIN = THERMAL.CHI_MIN
const CHI_RECOVERY_RATE = THERMAL.CHI_RECOVERY_RATE
const CHI_DECAY_BASE = THERMAL.CHI_DECAY_BASE
const ROLLING_WINDOW = THERMAL.ROLLING_WINDOW_SIZE
const SAFE_MODE_THRESHOLD_MS = THERMAL.ZOMBIE_BRIDGE_THRESHOLD_MS
const VRAM_EMERGENCY_THRESHOLD = MEMORY.EMERGENCY_THRESHOLD

// Note: GPU fingerprinting is now handled by SiliconFingerprint.js (Step 19)
// Note: Chassis conductivity is now handled by SovereignConstants (Step 21)

// ═══════════════════════════════════════════════════════════════════════
// THERMAL GOVERNOR SINGLETON
// ═══════════════════════════════════════════════════════════════════════

export class ThermalGovernor {
    constructor() {
        if (ThermalGovernor._instance) return ThermalGovernor._instance
        ThermalGovernor._instance = this

        // ════════════════════════════════════════════════════════════════
        // STEP 19: SiliconFingerprint Integration (Separation of Concerns)
        // ════════════════════════════════════════════════════════════════
        this._fingerprint = SiliconFingerprint.shared
        const identity = this._fingerprint.getIdentity()

        // Extract identity into local vars
        this.renderer = this._fingerprint.getRawRenderer()
        this.vendor = identity.vendor

        // Use fingerprint-provided thermal profile
        this.config = {
            base: identity.base,
            factor: identity.factor,
            zone: identity.zone
        }

        // Chassis from fingerprint (Titanium/Aluminum/Graphite)
        this._chassisType = identity.material
        this._conductivityPenalty = identity.decay

        // Chi Coefficient State
        this._chi = CHI_MAX  // Start at full headroom
        this._zone = identity.zone
        this._thermalHeadroom = 1.0
        this._fpsHistory = []  // Rolling window for hysteresis
        this._lastTelemetryTime = performance.now()
        this._unsubscribe = null
        this._safeMode = false

        // Real-time Telemetry
        this._estimatedTemp = 32.0
        this._frameCount = 0
        this._lastUpdate = Date.now()

        // Subscribe to AsyncBridge telemetry
        this._subscribeToBridge()

        if (import.meta.env.DEV) {
            console.log(`[Silicon Bond] Active: ${identity.id} (${this.renderer})`)
            console.log(`[Thermal] Zone: ${this._zone} | Chassis: ${this._chassisType} | Decay: ${this._conductivityPenalty}x`)
            console.log(`[Chi] Initial: ${this._chi.toFixed(1)} | Thermal Headroom: ${this._thermalHeadroom.toFixed(2)}`)
        }
    }

    static get shared() {
        if (!ThermalGovernor._instance) new ThermalGovernor()
        return ThermalGovernor._instance
    }

    // ═══════════════════════════════════════════════════════════════════
    // SILICON FINGERPRINT DELEGATION (Step 19)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get maximum framerate based on thermal state
     * Delegates to SiliconFingerprint for Titanium Sprinter Mode logic
     * @returns {number} 60 | 90 | 120
     */
    getMaxFramerate() {
        return this._fingerprint.getMaxFramerate(this._thermalHeadroom)
    }

    /**
     * Check if device has Titanium chassis (heat trap)
     * @returns {boolean}
     */
    isTitanium() {
        return this._fingerprint.isTitanium()
    }

    /**
     * Check if device is in Sprinter burst phase
     * @returns {boolean}
     */
    isInSprinterBurst() {
        return this._fingerprint.isInSprinterBurst()
    }

    // ═══════════════════════════════════════════════════════════════════
    // ASYNCBRIDGE SUBSCRIPTION (Bridge Binding)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Subscribe to AsyncBridge telemetry feed
     * @private
     */
    _subscribeToBridge() {
        try {
            const bridge = AsyncBridge.shared
            this._unsubscribe = bridge.subscribe((telemetry) => {
                this._updateChiCoefficient(telemetry)
            })
            if (import.meta.env.DEV) console.log('[ThermalGovernor] Subscribed to AsyncBridge telemetry')
        } catch (e) {
            console.warn('[ThermalGovernor] Failed to subscribe to bridge:', e)
            this._safeMode = true  // Fallback to safe mode
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CHI COEFFICIENT UPDATE (The Feedback Loop)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Update chi coefficient based on telemetry
     * Called every 1 second by AsyncBridge
     * @private
     * @param {Object} telemetry - { actualFPS, targetFPS, vramPressure, isPotentialSpike }
     */
    _updateChiCoefficient(telemetry) {
        const { actualFPS, targetFPS, vramPressure, isPotentialSpike, isAppVisible } = telemetry

        // Update last telemetry time (for Zombie Bridge detection)
        this._lastTelemetryTime = performance.now()
        this._safeMode = false

        // 1. VRAM EMERGENCY BRAKE (Liquid Glass Invariant)
        if (vramPressure > VRAM_EMERGENCY_THRESHOLD) {
            this._chi = CHI_MIN
            this._zone = 'MAGMA'
            this._thermalHeadroom = 0.0
            console.warn('[Chi] VRAM Emergency Brake! Headroom: 0%')
            return
        }

        // 2. 17.4W SPIKE DETECTION - Ignore FPS drops during app switch
        if (isPotentialSpike || !isAppVisible) {
            // Don't penalize chi during system spikes (silent in production)
            return
        }

        // 3. ADD TO ROLLING WINDOW (Hysteresis Dampening)
        this._fpsHistory.push(actualFPS)
        if (this._fpsHistory.length > ROLLING_WINDOW) {
            this._fpsHistory.shift()
        }

        // 4. CALCULATE ROLLING AVERAGE FPS
        const avgFPS = this._fpsHistory.reduce((a, b) => a + b, 0) / this._fpsHistory.length

        // 5. CALCULATE DEVIATION
        const delta = targetFPS - avgFPS

        // 6. APPLY CHASSIS PHYSICS (Titanium vs Aluminum)
        const decayFactor = this._conductivityPenalty

        // 7. UPDATE CHI
        if (delta > 3) {
            // Dropping frames -> Heat rising -> Lower Chi
            const decay = delta * decayFactor * CHI_DECAY_BASE
            this._chi -= decay
            if (import.meta.env.DEV) console.log(`[Chi] Decay: -${decay.toFixed(2)} (FPS: ${avgFPS.toFixed(0)}/${targetFPS})`)
        } else if (delta <= 0) {
            // Stable or exceeding target -> Heat dissipating -> Recover Chi
            const recovery = CHI_RECOVERY_RATE / decayFactor  // Recovery slower on Titanium
            this._chi += recovery
        }

        // 8. CLAMP CHI (0.0 - 100.0)
        this._chi = Math.min(CHI_MAX, Math.max(CHI_MIN, this._chi))

        // 9. UPDATE THERMAL HEADROOM (0.0 - 1.0)
        this._thermalHeadroom = this._chi / CHI_MAX

        // 10. UPDATE ZONE
        if (this._chi > 80) {
            this._zone = 'LIQUID'   // Glacier Mode
        } else if (this._chi > 40) {
            this._zone = 'VAPOR'    // Sprinter Mode
        } else if (this._chi > 10) {
            this._zone = 'GRAPHITE' // Throttled
        } else {
            this._zone = 'MAGMA'    // Emergency
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════

    /**
     * MASONIC INVARIANT: Adaptive Silicon Breath
     * Calculates the required cool-down period for the current frame index.
     * Formula: Base * Factor^(FrameCount / 5)
     */
    getAdaptivePause(index) {
        // Apply thermal headroom modifier
        const headroomModifier = 1 + (1 - this._thermalHeadroom)  // Lower headroom = longer pause
        const pause = Math.round(this.config.base * Math.pow(this.config.factor, index / 5) * headroomModifier)

        // Safety Clamp: Ensure UX responsiveness while maintaining ≤3.0°C rise
        return Math.min(pause, 500)
    }

    /**
     * Frame pacing helper for burst capture
     * Called at the start of every capture cycle in useCamera.js
     */
    async breathe(index = 0) {
        const delay = this.getAdaptivePause(index)

        if (delay > 0) {
            await new Promise(r => setTimeout(r, delay))
            this.recordActivity('burst')
        }
    }

    recordActivity(type = 'frame') {
        this._frameCount++

        // Thermal rise estimation (Simplified model)
        const heatPulse = type === 'burst' ? 0.4 : 0.2
        this._estimatedTemp = Math.min(45, this._estimatedTemp + heatPulse)
    }

    /**
     * GET THERMAL HEADROOM
     * Primary API for render loop decimation decisions
     * @returns {number} - 0.0 (MAGMA) to 1.0 (GLACIER)
     */
    getThermalHeadroom() {
        // Check for Zombie Bridge (no telemetry > 5 seconds)
        const timeSinceTelemetry = performance.now() - this._lastTelemetryTime
        if (timeSinceTelemetry > SAFE_MODE_THRESHOLD_MS || this._safeMode) {
            console.warn('[ThermalGovernor] Zombie Bridge detected - Safe Mode active')
            return 0.5  // 50% headroom in safe mode (30fps cap equivalent)
        }

        return this._thermalHeadroom
    }

    /**
     * Get current thermal zone
     * @returns {string} - 'LIQUID' | 'VAPOR' | 'GRAPHITE' | 'MAGMA'
     */
    getZone() {
        return this._zone
    }

    /**
     * Get chi coefficient (0.0 - 100.0)
     * @returns {number}
     */
    getChi() {
        return this._chi
    }

    getStats() {
        return {
            temp: this._estimatedTemp.toFixed(1),
            zone: this._zone,
            renderer: this.renderer,
            chi: this._chi.toFixed(1),
            thermalHeadroom: (this._thermalHeadroom * 100).toFixed(0) + '%',
            chassis: this._chassisType,
            conductivityPenalty: this._conductivityPenalty.toFixed(1) + 'x',
            safeMode: this._safeMode,
            siliconId: this._fingerprint.getId(),
            isTitanium: this.isTitanium(),
            sprinterBurst: this.isInSprinterBurst(),
            maxFramerate: this.getMaxFramerate()
        }
    }

    // AI/ISP Throttle recommendation
    getAIThrottle() {
        // Use chi-based throttling instead of temperature
        if (this._chi < 20) return 75      // Heavy throttle
        if (this._chi < 50) return 50      // Medium throttle
        if (this._chi < 80) return 25      // Light throttle
        return 0                           // No throttle
    }

    // ═══════════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════════

    destroy() {
        if (this._unsubscribe) {
            this._unsubscribe()
            this._unsubscribe = null
        }
        ThermalGovernor._instance = null
        if (import.meta.env.DEV) console.log('[ThermalGovernor] Destroyed')
    }
}

export default ThermalGovernor