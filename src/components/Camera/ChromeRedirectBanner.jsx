import React, { useState, useEffect } from 'react'
import { detectAndroidInAppBrowser, openInChrome } from '../../utils/detectBrowser'

/**
 * ChromeRedirectBanner - Shows on Android in-app browsers
 * Prompts user to open in Chrome for full sharing support
 */
export default function ChromeRedirectBanner() {
  const [shouldShow, setShouldShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const { shouldRedirectToChrome } = detectAndroidInAppBrowser()
    const wasDismissed = sessionStorage.getItem('chromeRedirectDismissed')

    if (shouldRedirectToChrome && !wasDismissed) {
      setShouldShow(true)
    }
  }, [])

  if (!shouldShow || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('chromeRedirectDismissed', 'true')
  }

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <div style={styles.iconText}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span style={styles.message}>Open in Chrome for better sharing</span>
        </div>
        <div style={styles.actions}>
          <button onClick={openInChrome} style={styles.buttonChrome}>
            Chrome
          </button>
          <button onClick={handleDismiss} style={styles.buttonDismiss}>
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  banner: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '12px 16px',
    paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
    zIndex: 10001,
    backdropFilter: 'blur(10px)',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  iconText: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    flex: 1,
  },
  message: {
    lineHeight: 1.2,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  buttonChrome: {
    padding: '6px 12px',
    background: '#4285F4',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 150ms ease',
  },
  buttonDismiss: {
    width: '28px',
    height: '28px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    transition: 'background 150ms ease',
    flexShrink: 0,
  },
}
