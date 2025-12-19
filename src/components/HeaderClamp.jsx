/**
 * HeaderClamp.jsx - Header Component Passthrough
 * 
 * REFACTORED: Clamp logic moved inside AppHeader.jsx
 * HeaderClamp now simply renders AppHeader.
 * 
 * Kept for backward compatibility with pages that import HeaderClamp.
 */

import AppHeader from './AppHeader.jsx'

function HeaderClamp() {
    // Clamp logic is now internal to AppHeader
    // This component is a passthrough for backward compatibility
    return <AppHeader />
}

export default HeaderClamp
