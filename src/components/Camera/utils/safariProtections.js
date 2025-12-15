/**
 * Safari Mobile Protections - Hikari CamTech Engine v3.1
 * Prevents zoom, text selection popups, magnifier bubble, and handles safe-area
 * PATCH 13: Enhanced for real-device stability
 */

export function initSafariProtections() {
    // Prevent double-tap zoom
    let lastTouchEnd = 0
    document.addEventListener('touchend', (e) => {
        const now = Date.now()
        if (now - lastTouchEnd <= 300) {
            e.preventDefault()
        }
        lastTouchEnd = now
    }, { passive: false })

    // Prevent pinch zoom (Safari gesture events)
    document.addEventListener('gesturestart', (e) => {
        e.preventDefault()
    }, { passive: false })

    document.addEventListener('gesturechange', (e) => {
        e.preventDefault()
    }, { passive: false })

    document.addEventListener('gestureend', (e) => {
        e.preventDefault()
    }, { passive: false })

    // Prevent touchmove zoom (two-finger)
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault()
        }
    }, { passive: false })

    // Prevent context menu (long press)
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault()
    })

    // Disable text selection on non-input elements
    document.addEventListener('selectstart', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault()
        }
    })

    // Prevent Safari magnifier bubble on text elements
    document.addEventListener('touchstart', (e) => {
        // Don't prevent on inputs/textareas for text selection
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return
        }
        // Mark touch to prevent magnifier
        if (e.target.style) {
            e.target.style.webkitUserSelect = 'none'
            e.target.style.webkitTouchCallout = 'none'
        }
    }, { passive: true })

    // Prevent zoom on input focus (iOS Safari auto-zoom on small fonts)
    const preventFocusZoom = () => {
        const viewport = document.querySelector('meta[name=viewport]')
        if (viewport) {
            viewport.setAttribute('content',
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
            )
        }
    }
    preventFocusZoom()

    // Re-apply on visibility change (Safari sometimes resets)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            preventFocusZoom()
        }
    })

    // Prevent wheel zoom (desktop Safari)
    document.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault()
        }
    }, { passive: false })
}

