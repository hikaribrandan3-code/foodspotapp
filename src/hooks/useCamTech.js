import { useEffect, useCallback } from 'react';

/**
 * 🛰️ useCamTechBroadcaster
 * 
 * Used by the Camera component to signal its active state globally.
 */
export function useCamTechBroadcaster() {
  const activate = useCallback(() => {
    console.log('[CamTech] 📸 Camera Active - Broadcasting Pause Signal');
    window.__camTechActive = true;
    window.dispatchEvent(new CustomEvent('camtech:active', { detail: true }));
  }, []);

  const deactivate = useCallback(() => {
    console.log('[CamTech] 💤 Camera inactive - Broadcasting Resume Signal');
    window.__camTechActive = false;
    window.dispatchEvent(new CustomEvent('camtech:active', { detail: false }));
  }, []);

  return { activateCamera: activate, deactivateCamera: deactivate };
}

/**
 * 🛰️ useCamTechListener
 * 
 * Used by background synchronization hooks (like KDS or AI) to pause
 * heavy operations while the camera is competing for resources.
 */
export function useCamTechListener({ onPause, onResume }) {
  useEffect(() => {
    const handler = (e) => {
      const active = e.detail;
      if (active) {
        onPause?.();
      } else {
        // Delay resume slightly to avoid clash with camera cleanup
        setTimeout(() => onResume?.(), 500);
      }
    };

    window.addEventListener('camtech:active', handler);
    return () => window.removeEventListener('camtech:active', handler);
  }, [onPause, onResume]);
}
