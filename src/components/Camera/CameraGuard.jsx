import { useMemo } from 'react'
import { detectAndroidInAppBrowser, getChromeIntentUrl } from '../../utils/detectBrowser.js'
import Camera from './index.jsx'

export default function CameraGuard() {
  const { shouldBlock, appName } = useMemo(() => detectAndroidInAppBrowser(), [])

  if (shouldBlock) {
    return <OpenInChromeScreen appName={appName} />
  }

  return <Camera />
}

function OpenInChromeScreen({ appName }) {
  const intentUrl = getChromeIntentUrl()

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <div style={styles.iconWrap}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>

        <h2 style={styles.title}>Open in Chrome to share</h2>
        <p style={styles.body}>
          {appName}'s browser doesn't support photo sharing.
          One tap and you're good to go.
        </p>

        {/* ANCHOR TAG — not window.location. Instagram can't block a user tap. */}
        <a href={intentUrl} style={styles.button}>
          Open in Chrome
        </a>

        <p style={styles.hint}>
          Chrome will open this same page automatically.
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    background: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '16px',
    maxWidth: '320px',
    width: '100%',
  },
  iconWrap: {
    width: '80px',
    height: '80px',
    borderRadius: '24px',
    background: 'rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  title: {
    color: '#fff',
    fontSize: '22px',
    fontWeight: 700,
    margin: 0,
    lineHeight: 1.2,
  },
  body: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: '15px',
    lineHeight: 1.5,
    margin: 0,
  },
  button: {
    display: 'block',
    width: '100%',
    padding: '16px',
    marginTop: '8px',
    background: '#4285F4',
    color: '#fff',
    borderRadius: '14px',
    fontSize: '16px',
    fontWeight: 700,
    textDecoration: 'none',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  hint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '12px',
    margin: 0,
  },
}
