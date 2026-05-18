import { useEffect } from 'react'
import { detectAndroidInAppBrowser, openInChrome } from '../../utils/detectBrowser.js'
import Camera from './index.jsx'

/**
 * CameraGuard — Route wrapper that redirects Android in-app browsers to Chrome
 * BEFORE Camera component renders (blocks permission prompt entirely).
 */
export default function CameraGuard() {
  useEffect(() => {
    const { shouldRedirectToChrome } = detectAndroidInAppBrowser()
    if (shouldRedirectToChrome) {
      console.log('[CameraGuard] 🔴 Blocking Android in-app browser → redirecting to Chrome')
      openInChrome()
    }
  }, [])

  return <Camera />
}
