/**
 * Camera Component with CamTech Black Box Integration
 * 
 * This component broadcasts camera state to pause background operations
 * Prevents memory pressure and crashes on low-end devices
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCamTechBroadcaster } from '../hooks/useCamTech';

export function CameraWithCamTech({ onCapture, onClose, facingMode = 'environment' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const { activateCamera, deactivateCamera } = useCamTechBroadcaster();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  // Activate camera on mount
  useEffect(() => {
    activateCamera();
    startCamera();
    
    return () => {
      stopCamera();
      deactivateCamera();
    };
  }, [activateCamera, deactivateCamera]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true);
        };
      }
    } catch (err) {
      console.error('[Camera] Failed to start:', err);
      setError(err.message);
      deactivateCamera(); // Release the pause if camera fails
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capture = useCallback(() => {
    if (!videoRef.current || !isReady) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    
    // Get image data
    canvas.toBlob((blob) => {
      onCapture?.(blob);
    }, 'image/jpeg', 0.9);
  }, [isReady, onCapture]);

  const handleClose = () => {
    stopCamera();
    deactivateCamera();
    onClose?.();
  };

  return (
    <div className="camera-container" style={styles.container}>
      {error && (
        <div style={styles.error}>
          ❌ Camera Error: {error}
        </div>
      )}
      
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          ...styles.video,
          opacity: isReady ? 1 : 0.5
        }}
      />
      
      {!isReady && !error && (
        <div style={styles.loading}>📸 Starting camera...</div>
      )}
      
      <div style={styles.controls}>
        <button 
          onClick={handleClose}
          style={styles.closeBtn}
        >
          ✕ Cancel
        </button>
        
        <button
          onClick={capture}
          disabled={!isReady}
          style={{
            ...styles.captureBtn,
            opacity: isReady ? 1 : 0.5
          }}
        >
          📷 Capture
        </button>
      </div>
      
      {isReady && (
        <div style={styles.status}>
          ✅ Camera active - Background sync paused
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 9999
  },
  video: {
    flex: 1,
    width: '100%',
    objectFit: 'cover'
  },
  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#fff',
    fontSize: 18
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-around',
    padding: '0 20px'
  },
  closeBtn: {
    padding: '12px 24px',
    background: '#ff4444',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    cursor: 'pointer'
  },
  captureBtn: {
    padding: '16px 32px',
    background: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    fontSize: 18,
    cursor: 'pointer'
  },
  error: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    padding: 16,
    background: '#ff4444',
    color: '#fff',
    borderRadius: 8,
    textAlign: 'center'
  },
  status: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 16px',
    background: 'rgba(0,0,0,0.7)',
    color: '#4CAF50',
    borderRadius: 20,
    fontSize: 12
  }
};

export default CameraWithCamTech;
