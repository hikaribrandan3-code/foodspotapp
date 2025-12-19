/**
 * HeaderClamp.jsx - Invisible Mobile Header Padding Reducer
 * 
 * SUPER ADMIN ONLY — End users never see this
 * 
 * Wraps the header without modifying it.
 * Uses CSS clamp to visually reduce padding on mobile only.
 * 
 * Rules:
 * - Does NOT modify header component
 * - Does NOT change logo size
 * - Does NOT use negative margins on body/root
 * - ONLY affects mobile (<768px)
 * - Safari-safe, PWA-safe
 */

import { getConfig } from '../config/appConfig.js'
import AppHeader from './AppHeader.jsx'

function HeaderClamp() {
    const config = getConfig()
    const useClamp = config.experimental?.headerClampMobile

    // Mobile clamp enabled via experimental flag
    if (useClamp) {
        return (
            <div className="header-clamp-mobile">
                <AppHeader />
            </div>
        )
    }

    // Default: render header without wrapper
    return <AppHeader />
}

export default HeaderClamp
