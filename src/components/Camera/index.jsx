import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import CameraLayer from './CameraLayer.jsx'
import EditorLayer from './EditorLayer.jsx'
import SettingsSheet from './SettingsSheet.jsx'
import ChromeRedirectBanner from './ChromeRedirectBanner.jsx'
import { useCamTechBroadcaster } from '../../hooks/useCamTech'
import './CameraLayer.css'
import './EditorLayer.css'

/**
 * CamTech v2.2 - Camera Component
 * God-Tier Memory Revolution: Blob Architecture Bridge
 * Managed ObjectURL lifecycle to prevent RAM leaks.
 */
export const VERSION = 'CamTech v2.2'

function Camera({ neonContext = null, branding = null }) {
    const navigate = useNavigate()
    const { activateCamera, deactivateCamera } = useCamTechBroadcaster()

    const [mode, setMode] = useState('CAMERA')
    const [capturedImage, setCapturedImage] = useState(null)
    const [showSettings, setShowSettings] = useState(false)
    const [toolPosition, setToolPosition] = useState('right')

    // --- CAMTECH BLACK BOX: Global State Management ---
    useEffect(() => {
        activateCamera()
        return () => deactivateCamera()
    }, [activateCamera, deactivateCamera])

    const handleCapture = (captureResult) => {
        if (!captureResult) return
        setCapturedImage(captureResult)
        setMode('EDITOR')
    }

    const handleRetake = () => {
        setCapturedImage(null)
        setMode('CAMERA')
    }

    const handleDone = () => {
        // Don't revoke blob here — EditorLayer still needs it for DualPostScreen.
        // Let EditorLayer manage the blob lifecycle via its own useEffect cleanup.
        setMode('CAMERA')
        // Clear capturedImage only after a tick so EditorLayer can unmount cleanly
        setTimeout(() => setCapturedImage(null), 0)
    }

    const handleClose = () => {
        navigate(-1)
    }

    const handleOpenSettings = () => {
        setShowSettings(true)
    }

    const handleCloseSettings = () => {
        setShowSettings(false)
    }

    const handleToolPositionChange = (position) => {
        setToolPosition(position)
    }

    return (
        <div className="camera-fullscreen-wrapper" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#000',
            zIndex: 1000,
            pointerEvents: 'auto'
        }}>
            <ChromeRedirectBanner />

            {mode === 'CAMERA' && (
                <CameraLayer
                    onCapture={handleCapture}
                    onOpenSettings={handleOpenSettings}
                    onClose={handleClose}
                    toolPosition={toolPosition}
                />
            )}

            {mode === 'EDITOR' && capturedImage && (
                <EditorLayer
                    imageData={capturedImage}
                    onRetake={handleRetake}
                    onDone={handleDone}
                    toolPosition={toolPosition}
                    neonContext={neonContext}
                    branding={branding}
                />
            )}

            {showSettings && (
                <SettingsSheet
                    toolPosition={toolPosition}
                    onToolPositionChange={handleToolPositionChange}
                    onClose={handleCloseSettings}
                />
            )}
        </div>
    )
}

export default Camera
