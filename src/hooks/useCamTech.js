/**
 * CamTech Black Box - Camera Isolation System
 * 
 * Pauses background operations when camera is active
 * Prevents memory pressure and crashes on low-end devices
 */

import React, { useEffect, useRef, useCallback } from 'react';

const CAMTECH_ACTIVE_EVENT = 'camtech:active';

/**
 * Hook to broadcast camera active/inactive state
 * Use this in Camera component
 */
export function useCamTechBroadcaster() {
  const broadcast = useCallback((isActive) => {
    window.dispatchEvent(new CustomEvent(CAMTECH_ACTIVE_EVENT, { 
      detail: { active: isActive, timestamp: Date.now() }
    }));
  }, []);

  const activateCamera = useCallback(() => {
    console.log('[CamTech] 📸 Camera activating - pausing background ops');
    broadcast(true);
  }, [broadcast]);

  const deactivateCamera = useCallback(() => {
    console.log('[CamTech] 📸 Camera deactivated - resuming background ops');
    broadcast(false);
  }, [broadcast]);

  return { activateCamera, deactivateCamera };
}

/**
 * Hook to listen for camera state and pause operations
 * Use this in components that poll or sync (KDS, analytics, etc.)
 * 
 * @param {Object} options
 * @param {Function} options.onPause - Called when camera activates
 * @param {Function} options.onResume - Called when camera deactivates
 * @param {number} options.debounceMs - Delay before resuming (default: 1000ms)
 */
export function useCamTechListener({ onPause, onResume, debounceMs = 1000 } = {}) {
  const isCameraActiveRef = useRef(false);
  const resumeTimeoutRef = useRef(null);

  useEffect(() => {
    const handleCamTechEvent = (e) => {
      const { active } = e.detail;
      
      // Clear any pending resume
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }

      if (active && !isCameraActiveRef.current) {
        // Camera just activated
        isCameraActiveRef.current = true;
        onPause?.();
      } else if (!active && isCameraActiveRef.current) {
        // Camera just deactivated - debounce resume
        resumeTimeoutRef.current = setTimeout(() => {
          isCameraActiveRef.current = false;
          onResume?.();
        }, debounceMs);
      }
    };

    window.addEventListener(CAMTECH_ACTIVE_EVENT, handleCamTechEvent);
    
    return () => {
      window.removeEventListener(CAMTECH_ACTIVE_EVENT, handleCamTechEvent);
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, [onPause, onResume, debounceMs]);

  return {
    isCameraActive: () => isCameraActiveRef.current
  };
}

/**
 * Hook that returns whether operations should be paused
 * Use this to conditionally skip API calls
 */
export function useIsCamTechPaused() {
  const [isPaused, setIsPaused] = React.useState(false);
  
  useCamTechListener({
    onPause: () => setIsPaused(true),
    onResume: () => setIsPaused(false)
  });
  
  return isPaused;
}

/**
 * Wrapper for fetch that respects camera state
 * Automatically queues/rejects requests when camera is active
 */
export function createCamTechAwareFetch(baseFetch = fetch) {
  return async function camTechFetch(url, options = {}) {
    // Check if camera is active via global flag
    if (window.__camTechActive) {
      console.log('[CamTech] ⏸️ Request blocked - camera active:', url);
      
      // Option 1: Queue and retry after camera closes
      if (options.queueWhenPaused) {
        return new Promise((resolve, reject) => {
          const checkAndRetry = () => {
            if (!window.__camTechActive) {
              resolve(baseFetch(url, options));
            } else {
              setTimeout(checkAndRetry, 500);
            }
          };
          checkAndRetry();
        });
      }
      
      // Option 2: Reject immediately (default for non-critical requests)
      throw new Error('CAMTECH_PAUSED: Camera is active');
    }
    
    return baseFetch(url, options);
  };
}

// Global state tracker (for non-React code)
if (typeof window !== 'undefined') {
  window.__camTechActive = false;
  
  window.addEventListener(CAMTECH_ACTIVE_EVENT, (e) => {
    window.__camTechActive = e.detail.active;
  });
}

export default {
  useCamTechBroadcaster,
  useCamTechListener,
  useIsCamTechPaused,
  createCamTechAwareFetch,
  CAMTECH_ACTIVE_EVENT
};
