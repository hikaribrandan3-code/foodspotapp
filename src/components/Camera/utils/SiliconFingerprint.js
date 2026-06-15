/**
 * ═══════════════════════════════════════════════════════════════════════
 * SiliconFingerprint.js - HIKARI v4.5 "Titanium Forensics" Release
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Step 19: Snapdragon Thermal Fingerprint
 * Step 21: SovereignConstants Integration (Single Source of Truth)
 * Deep-inspection logic for Qualcomm/Apple/MediaTek silicon identification
 * 
 * ARCHITECTURE:
 * - Parse WEBGL_debug_renderer_info for GPU model extraction
 * - Map Adreno generations to thermal profiles
 * - Detect Titanium chassis (Samsung S24/S25 Ultra) for heat trap logic
 * - Provide Sprinter Mode: 120Hz burst → 60Hz lock on thermal saturation
 * 
 * 777x AUDIT COMPLIANCE:
 * - Regex Precision: Distinguish Adreno 6xx/7xx/8xx generations
 * - Titanium Physics: 10.8x practical / 24x theoretical decay factor
 * - Refresh Rate Lock: getMaxFramerate() returns 60 if headroom < 0.3
 * - Model Mapping: Adreno 830 → SD8_ELITE, Adreno 750 → SD8_GEN3
 * - Fallback Safety: Generic Adreno → SD_GENERIC (Graphite)
 * - Zero-Allocation: Singleton with one-time parsing
 * - Sovereign Integration: Separate from ThermalGovernor (SoC)
 * 
 * TARGET: Snapdragon 8 Elite (S25 Ultra) / 8 Gen 3 (S24 Ultra)
 * ═══════════════════════════════════════════════════════════════════════
 */

import { CONDUCTIVITY, TIME, FRAMERATE } from './SovereignConstants.js'

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS (Imported from SovereignConstants - Step 21)
// ═══════════════════════════════════════════════════════════════════════

// Chassis thermal conductivity (W/m·K) - Raw values for reference
const RAW_CONDUCTIVITY = {
    ALUMINUM: CONDUCTIVITY.ALUMINUM_RAW,
    TITANIUM: CONDUCTIVITY.TITANIUM_RAW,
    GRAPHITE: CONDUCTIVITY.GRAPHITE_RAW
}

// Decay factors (Aluminum = 1.0 baseline)
const DECAY_FACTORS = {
    ALUMINUM: CONDUCTIVITY.ALUMINUM_DECAY,
    TITANIUM_PRACTICAL: CONDUCTIVITY.TITANIUM_PRACTICAL,
    TITANIUM_THEORETICAL: CONDUCTIVITY.TITANIUM_THEORETICAL,
    GRAPHITE: CONDUCTIVITY.GRAPHITE_DECAY
}

// Sprinter Mode timing
const SPRINTER_120HZ_DURATION_MS = TIME.SPRINTER_BURST_MS   // 120 seconds at 120Hz max
const THERMAL_LOCK_THRESHOLD = FRAMERATE.THERMAL_LOCK_HEADROOM  // Lock to 60Hz if headroom < 30%

// ═══════════════════════════════════════════════════════════════════════
// SILICON IDENTITY PROFILES
// ═══════════════════════════════════════════════════════════════════════

const SILICON_PROFILES = {
    // Apple Silicon
    A21: { id: 'A21', vendor: 'APPLE', material: 'ALUMINUM', decay: 1.0, base: 60, factor: 1.1, zone: 'LIQUID', maxHz: 120 },
    A20: { id: 'A20', vendor: 'APPLE', material: 'ALUMINUM', decay: 1.0, base: 65, factor: 1.12, zone: 'LIQUID', maxHz: 120 },
    A19: { id: 'A19', vendor: 'APPLE', material: 'ALUMINUM', decay: 1.0, base: 72, factor: 1.15, zone: 'LIQUID', maxHz: 120 },
    A18: { id: 'A18', vendor: 'APPLE', material: 'ALUMINUM', decay: 1.0, base: 85, factor: 1.3, zone: 'VAPOR', maxHz: 120 },
    A17: { id: 'A17', vendor: 'APPLE', material: 'ALUMINUM', decay: 1.0, base: 100, factor: 1.5, zone: 'VAPOR', maxHz: 120 },

    // Qualcomm Snapdragon (Flagships - Titanium Samsung)
    SD8_ELITE: { id: 'SD8_ELITE', vendor: 'QUALCOMM', material: 'TITANIUM', decay: 10.8, base: 65, factor: 1.1, zone: 'VAPOR', maxHz: 120 },
    SD8_GEN3: { id: 'SD8_GEN3', vendor: 'QUALCOMM', material: 'TITANIUM', decay: 10.8, base: 70, factor: 1.15, zone: 'VAPOR', maxHz: 120 },
    SD8_GEN2: { id: 'SD8_GEN2', vendor: 'QUALCOMM', material: 'ALUMINUM', decay: 1.5, base: 80, factor: 1.25, zone: 'VAPOR', maxHz: 120 },
    SD8_GEN1: { id: 'SD8_GEN1', vendor: 'QUALCOMM', material: 'ALUMINUM', decay: 2.0, base: 90, factor: 1.35, zone: 'VAPOR', maxHz: 90 },

    // Qualcomm Snapdragon (Mid-Range)
    SD7_GEN3: { id: 'SD7_GEN3', vendor: 'QUALCOMM', material: 'GRAPHITE', decay: 3.0, base: 100, factor: 1.4, zone: 'GRAPHITE', maxHz: 90 },
    SD7_GEN2: { id: 'SD7_GEN2', vendor: 'QUALCOMM', material: 'GRAPHITE', decay: 3.0, base: 110, factor: 1.5, zone: 'GRAPHITE', maxHz: 60 },
    SD_GENERIC: { id: 'SD_GENERIC', vendor: 'QUALCOMM', material: 'GRAPHITE', decay: 3.0, base: 120, factor: 1.8, zone: 'GRAPHITE', maxHz: 60 },

    // Samsung Exynos
    EXYNOS_2400: { id: 'EXYNOS_2400', vendor: 'SAMSUNG', material: 'TITANIUM', decay: 10.8, base: 75, factor: 1.2, zone: 'VAPOR', maxHz: 120 },
    EXYNOS_2200: { id: 'EXYNOS_2200', vendor: 'SAMSUNG', material: 'GRAPHITE', decay: 3.5, base: 95, factor: 1.4, zone: 'GRAPHITE', maxHz: 90 },
    EXYNOS_GENERIC: { id: 'EXYNOS_GENERIC', vendor: 'SAMSUNG', material: 'GRAPHITE', decay: 3.5, base: 110, factor: 1.6, zone: 'GRAPHITE', maxHz: 60 },

    // MediaTek Dimensity
    DIMENSITY_9300: { id: 'DIMENSITY_9300', vendor: 'MEDIATEK', material: 'GRAPHITE', decay: 3.0, base: 80, factor: 1.25, zone: 'VAPOR', maxHz: 120 },
    DIMENSITY_9200: { id: 'DIMENSITY_9200', vendor: 'MEDIATEK', material: 'GRAPHITE', decay: 3.0, base: 90, factor: 1.35, zone: 'VAPOR', maxHz: 90 },
    DIMENSITY_GENERIC: { id: 'DIMENSITY_GENERIC', vendor: 'MEDIATEK', material: 'GRAPHITE', decay: 3.0, base: 110, factor: 1.6, zone: 'GRAPHITE', maxHz: 60 },

    // Mali (Various Android)
    MALI_G720: { id: 'MALI_G720', vendor: 'ARM', material: 'GRAPHITE', decay: 3.0, base: 85, factor: 1.3, zone: 'VAPOR', maxHz: 90 },
    MALI_G715: { id: 'MALI_G715', vendor: 'ARM', material: 'GRAPHITE', decay: 3.0, base: 95, factor: 1.4, zone: 'GRAPHITE', maxHz: 60 },
    MALI_GENERIC: { id: 'MALI_GENERIC', vendor: 'ARM', material: 'GRAPHITE', decay: 3.5, base: 110, factor: 1.6, zone: 'GRAPHITE', maxHz: 60 },

    // Fallback
    UNKNOWN: { id: 'UNKNOWN', vendor: 'UNKNOWN', material: 'GRAPHITE', decay: 3.0, base: 120, factor: 1.8, zone: 'GRAPHITE', maxHz: 60 }
}

// ═══════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════

let _fingerprintInstance = null

// ═══════════════════════════════════════════════════════════════════════
// SILICON FINGERPRINT CLASS
// ═══════════════════════════════════════════════════════════════════════

export class SiliconFingerprint {
    constructor() {
        // Singleton enforcement
        if (_fingerprintInstance) return _fingerprintInstance
        _fingerprintInstance = this

        // One-time parsing (Zero-Allocation for lifecycle)
        this._rawRenderer = ''
        this._rawVendor = ''
        this._identity = null
        this._sprinterStartTime = null
        this._sprinterExpired = false

        // Execute fingerprinting
        this._fingerprint()

        if (import.meta.env.DEV) console.log(`[SiliconFingerprint] Identity: ${this._identity.id} (${this._identity.material})`)
    }

    /**
     * Singleton accessor
     */
    static get shared() {
        if (!_fingerprintInstance) new SiliconFingerprint()
        return _fingerprintInstance
    }

    // ═══════════════════════════════════════════════════════════════════
    // FINGERPRINTING LOGIC
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Execute silicon fingerprinting
     * @private
     */
    _fingerprint() {
        // Extract WebGL renderer info
        const glInfo = this._extractWebGLInfo()
        this._rawRenderer = glInfo.renderer
        this._rawVendor = glInfo.vendor

        // Identify silicon
        this._identity = this._identifySilicon(this._rawRenderer, this._rawVendor)

        // Initialize Sprinter Mode timer for Titanium devices
        if (this._identity.material === 'TITANIUM') {
            this._sprinterStartTime = Date.now()
            if (import.meta.env.DEV) console.log('[SiliconFingerprint] Sprinter Mode started (120Hz for 120s)')
        }
    }

    /**
     * Extract WebGL debug renderer info
     * @private
     */
    _extractWebGLInfo() {
        try {
            const canvas = document.createElement('canvas')
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
            if (!gl) return { renderer: 'UNKNOWN', vendor: 'UNKNOWN' }

            const debug = gl.getExtension('WEBGL_debug_renderer_info')
            if (debug) {
                return {
                    renderer: gl.getParameter(debug.UNMASKED_RENDERER_WEBGL).toUpperCase(),
                    vendor: gl.getParameter(debug.UNMASKED_VENDOR_WEBGL).toUpperCase()
                }
            }
            return { renderer: 'UNKNOWN', vendor: 'UNKNOWN' }
        } catch (e) {
            return { renderer: 'ERROR', vendor: 'ERROR' }
        }
    }

    /**
     * Identify silicon from renderer string
     * @private
     */
    _identifySilicon(renderer, vendor) {
        // ═══════════════════════════════════════════════════════════════
        // APPLE SILICON (A-series Bionic)
        // ═══════════════════════════════════════════════════════════════
        if (renderer.includes('A21') || renderer.includes('APPLE GPU A21')) {
            return { ...SILICON_PROFILES.A21 }
        }
        if (renderer.includes('A20') || renderer.includes('APPLE GPU A20')) {
            return { ...SILICON_PROFILES.A20 }
        }
        if (renderer.includes('A19') || renderer.includes('APPLE GPU A19')) {
            return { ...SILICON_PROFILES.A19 }
        }
        if (renderer.includes('A18')) {
            return { ...SILICON_PROFILES.A18 }
        }
        if (renderer.includes('A17')) {
            return { ...SILICON_PROFILES.A17 }
        }
        // Generic Apple fallback
        if (renderer.includes('APPLE') || vendor.includes('APPLE')) {
            return { ...SILICON_PROFILES.A18 }  // Conservative Apple fallback
        }

        // ═══════════════════════════════════════════════════════════════
        // QUALCOMM ADRENO (Snapdragon)
        // ═══════════════════════════════════════════════════════════════
        const adrenoMatch = renderer.match(/ADRENO.*?(\d{3})/i)
        if (adrenoMatch) {
            const model = parseInt(adrenoMatch[1])

            // Adreno 8xx = Snapdragon 8 Elite (S25 Ultra - Titanium)
            if (model >= 830) {
                if (import.meta.env.DEV) console.log(`[SiliconFingerprint] Detected Adreno ${model} → SD8_ELITE (Titanium)`)
                return { ...SILICON_PROFILES.SD8_ELITE }
            }

            // Adreno 7xx = Snapdragon 8 Gen 3/2/1
            if (model >= 750) {
                if (import.meta.env.DEV) console.log(`[SiliconFingerprint] Detected Adreno ${model} → SD8_GEN3 (Titanium)`)
                return { ...SILICON_PROFILES.SD8_GEN3 }
            }
            if (model >= 740) {
                if (import.meta.env.DEV) console.log(`[SiliconFingerprint] Detected Adreno ${model} → SD8_GEN2`)
                return { ...SILICON_PROFILES.SD8_GEN2 }
            }
            if (model >= 730) {
                if (import.meta.env.DEV) console.log(`[SiliconFingerprint] Detected Adreno ${model} → SD8_GEN1`)
                return { ...SILICON_PROFILES.SD8_GEN1 }
            }

            // Adreno 7xx Mid-Range
            if (model >= 710) {
                if (import.meta.env.DEV) console.log(`[SiliconFingerprint] Detected Adreno ${model} → SD7_GEN3`)
                return { ...SILICON_PROFILES.SD7_GEN3 }
            }
            if (model >= 700) {
                if (import.meta.env.DEV) console.log(`[SiliconFingerprint] Detected Adreno ${model} → SD7_GEN2`)
                return { ...SILICON_PROFILES.SD7_GEN2 }
            }

            // Adreno 6xx = Older/Budget
            if (model >= 600) {
                if (import.meta.env.DEV) console.log(`[SiliconFingerprint] Detected Adreno ${model} → SD_GENERIC`)
                return { ...SILICON_PROFILES.SD_GENERIC }
            }

            // Generic Adreno fallback
            if (import.meta.env.DEV) console.log(`[SiliconFingerprint] Detected Adreno ${model} → SD_GENERIC (Fallback)`)
            return { ...SILICON_PROFILES.SD_GENERIC }
        }

        // Generic Qualcomm without model number
        if (renderer.includes('ADRENO') || vendor.includes('QUALCOMM')) {
            if (import.meta.env.DEV) console.log('[SiliconFingerprint] Generic Adreno detected')
            return { ...SILICON_PROFILES.SD_GENERIC }
        }

        // ═══════════════════════════════════════════════════════════════
        // SAMSUNG EXYNOS
        // ═══════════════════════════════════════════════════════════════
        if (renderer.includes('XCLIPSE') || renderer.includes('EXYNOS')) {
            // Xclipse is AMD RDNA2-based GPU in Exynos 2200+
            if (renderer.includes('920') || renderer.includes('2400')) {
                return { ...SILICON_PROFILES.EXYNOS_2400 }
            }
            if (renderer.includes('920') || renderer.includes('2200')) {
                return { ...SILICON_PROFILES.EXYNOS_2200 }
            }
            return { ...SILICON_PROFILES.EXYNOS_GENERIC }
        }

        // ═══════════════════════════════════════════════════════════════
        // MEDIATEK DIMENSITY
        // ═══════════════════════════════════════════════════════════════
        if (renderer.includes('IMMORTALIS') || renderer.includes('DIMENSITY')) {
            if (renderer.includes('G720') || renderer.includes('9300')) {
                return { ...SILICON_PROFILES.DIMENSITY_9300 }
            }
            if (renderer.includes('G715') || renderer.includes('9200')) {
                return { ...SILICON_PROFILES.DIMENSITY_9200 }
            }
            return { ...SILICON_PROFILES.DIMENSITY_GENERIC }
        }

        // ═══════════════════════════════════════════════════════════════
        // ARM MALI
        // ═══════════════════════════════════════════════════════════════
        const maliMatch = renderer.match(/MALI.*?G(\d{3})/i)
        if (maliMatch) {
            const model = parseInt(maliMatch[1])
            if (model >= 720) return { ...SILICON_PROFILES.MALI_G720 }
            if (model >= 715) return { ...SILICON_PROFILES.MALI_G715 }
            return { ...SILICON_PROFILES.MALI_GENERIC }
        }

        if (renderer.includes('MALI')) {
            return { ...SILICON_PROFILES.MALI_GENERIC }
        }

        // ═══════════════════════════════════════════════════════════════
        // FALLBACK
        // ═══════════════════════════════════════════════════════════════
        if (import.meta.env.DEV) console.log(`[SiliconFingerprint] Unknown GPU: ${renderer}`)
        return { ...SILICON_PROFILES.UNKNOWN }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get silicon identity
     * @returns {Object} Silicon profile
     */
    getIdentity() {
        return { ...this._identity }
    }

    /**
     * Get silicon ID string
     * @returns {string}
     */
    getId() {
        return this._identity.id
    }

    /**
     * Get vendor
     * @returns {string}
     */
    getVendor() {
        return this._identity.vendor
    }

    /**
     * Get chassis material
     * @returns {string} 'ALUMINUM' | 'TITANIUM' | 'GRAPHITE'
     */
    getMaterial() {
        return this._identity.material
    }

    /**
     * Get thermal decay factor
     * @returns {number}
     */
    getDecayFactor() {
        return this._identity.decay
    }

    /**
     * Check if device has Titanium chassis (heat trap)
     * @returns {boolean}
     */
    isTitanium() {
        return this._identity.material === 'TITANIUM'
    }

    /**
     * Get base thermal latency
     * @returns {number}
     */
    getBase() {
        return this._identity.base
    }

    /**
     * Get thermal factor
     * @returns {number}
     */
    getFactor() {
        return this._identity.factor
    }

    /**
     * Get thermal zone
     * @returns {string}
     */
    getZone() {
        return this._identity.zone
    }

    /**
     * Get raw renderer string
     * @returns {string}
     */
    getRawRenderer() {
        return this._rawRenderer
    }

    // ═══════════════════════════════════════════════════════════════════
    // SPRINTER MODE (Titanium Thermal Lock)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get maximum framerate based on thermal headroom
     * For Titanium devices: 120Hz for first 120s, then 60Hz lock if hot
     * @param {number} thermalHeadroom - Current thermal headroom (0.0-1.0)
     * @returns {number} 60 | 90 | 120
     */
    getMaxFramerate(thermalHeadroom = 1.0) {
        const defaultMax = this._identity.maxHz

        // Non-Titanium devices: Use fixed profile max
        if (!this.isTitanium()) {
            return defaultMax
        }

        // Titanium Sprinter Mode Logic
        // Phase 1: First 120 seconds at 120Hz (burst mode)
        const now = Date.now()
        const sprinterElapsed = now - this._sprinterStartTime

        if (sprinterElapsed < SPRINTER_120HZ_DURATION_MS) {
            // Still in burst window, allow full 120Hz unless thermal critical
            if (thermalHeadroom < THERMAL_LOCK_THRESHOLD) {
                console.warn('[SiliconFingerprint] Sprinter throttle: headroom < 30%')
                return 60
            }
            return 120
        }

        // Phase 2: After 120s, enforce thermal-aware lock
        if (!this._sprinterExpired) {
            this._sprinterExpired = true
            if (import.meta.env.DEV) console.log('[SiliconFingerprint] Sprinter Mode expired - thermal-aware locking active')
        }

        // Adaptive framerate based on headroom
        if (thermalHeadroom >= 0.7) return 120
        if (thermalHeadroom >= 0.5) return 90
        if (thermalHeadroom >= THERMAL_LOCK_THRESHOLD) return 60

        // Thermal critical: hard lock to 60Hz
        console.warn('[SiliconFingerprint] Titanium heat trap: locked to 60Hz')
        return 60
    }

    /**
     * Check if device is in Sprinter burst phase
     * @returns {boolean}
     */
    isInSprinterBurst() {
        if (!this.isTitanium()) return false
        const elapsed = Date.now() - this._sprinterStartTime
        return elapsed < SPRINTER_120HZ_DURATION_MS
    }

    /**
     * Get time remaining in Sprinter burst (ms)
     * @returns {number}
     */
    getSprinterTimeRemaining() {
        if (!this.isTitanium()) return 0
        const elapsed = Date.now() - this._sprinterStartTime
        return Math.max(0, SPRINTER_120HZ_DURATION_MS - elapsed)
    }

    // ═══════════════════════════════════════════════════════════════════
    // STATS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get fingerprint statistics
     * @returns {Object}
     */
    getStats() {
        return {
            id: this._identity.id,
            vendor: this._identity.vendor,
            material: this._identity.material,
            decay: this._identity.decay,
            base: this._identity.base,
            factor: this._identity.factor,
            zone: this._identity.zone,
            maxHz: this._identity.maxHz,
            rawRenderer: this._rawRenderer,
            isTitanium: this.isTitanium(),
            sprinterBurst: this.isInSprinterBurst(),
            sprinterRemaining: Math.round(this.getSprinterTimeRemaining() / 1000) + 's'
        }
    }
}

export default SiliconFingerprint
