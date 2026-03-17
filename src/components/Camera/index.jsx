import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import CameraLayer from './CameraLayer.jsx'
import EditorLayer from './EditorLayer.jsx'
import SettingsSheet from './SettingsSheet.jsx'
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

    // --- MEMORY REVOLUTION: ObjectURL Lifecycle Management ---
    const lastObjectURLRef = useRef(null)

    useEffect(() => {
        // Cleanup on unmount or when capturedImage changes
        if (capturedImage?.objectURL && capturedImage.objectURL !== lastObjectURLRef.current) {
            // If we have a new objectURL, we should revoke the OLD one if it exists
            if (lastObjectURLRef.current) {
                URL.revokeObjectURL(lastObjectURLRef.current)
            }
            lastObjectURLRef.current = capturedImage.objectURL
        }

        return () => {
            // Final cleanup on unmount
            if (lastObjectURLRef.current) {
                URL.revokeObjectURL(lastObjectURLRef.current)
                lastObjectURLRef.current = null
            }
        }
    }, [capturedImage])

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
        setCapturedImage(null)
        setMode('CAMERA')
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
