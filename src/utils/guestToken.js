/**
 * ⚠️  DEPRECATED — guestToken.js is LEGACY and will be removed.
 *
 * All new code MUST use `getScopedGuestToken()` from `storage.js`.
 * This file is kept only to avoid breaking external references during the
 * deprecation window. Internally it now delegates to `storage.js` so that
 * token generation is unified and future mismatch bugs are prevented.
 */

import { getScopedGuestToken as _getScopedGuestToken } from './storage.js'

/**
 * @deprecated Use `getScopedGuestToken()` from `storage.js` instead.
 * Kept for backward compatibility; delegates to the scoped implementation.
 */
export function getGuestToken() {
    console.warn('[guestToken.js] DEPRECATED: Use getScopedGuestToken() from storage.js')
    return _getScopedGuestToken()
}

/**
 * @deprecated No longer needed. Token lifecycle is managed by storage.js.
 */
export function clearGuestToken() {
    console.warn('[guestToken.js] DEPRECATED: clearGuestToken() is a no-op. Use storage.js utilities.')
}

/**
 * @deprecated Use storage.js `getScopedGuestToken()` directly.
 */
export function hasGuestToken() {
    console.warn('[guestToken.js] DEPRECATED: Use getScopedGuestToken() from storage.js')
    return !!_getScopedGuestToken()
}
