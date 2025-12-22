/**
 * HeaderClamp.jsx - Header Component Passthrough
 * 
 * REFACTORED: Clamp logic moved inside AppHeader.jsx
 * HeaderClamp now simply renders AppHeader with config prop.
 * 
 * Kept for backward compatibility with pages that import HeaderClamp.
 * INVARIANT: config must be passed as prop from parent page.
 */

import AppHeader from './AppHeader.jsx'

function HeaderClamp({ config }) {
    // Pass config through to AppHeader
    return <AppHeader config={config} />
}

export default HeaderClamp
