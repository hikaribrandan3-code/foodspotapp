import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CameraLayer from './CameraLayer.jsx'
import EditorLayer from './EditorLayer.jsx'
import SettingsSheet from './SettingsSheet.jsx'
import './CameraLayer.css'
import './EditorLayer.css'

/**
 * CamTech v1.8 - Camera Component
 * Drop-in replacement for existing camera
 * Preserves route and navigation behavior
 */
export const VERSION = 'CamTech v1.8'

function Camera() {
    const navigate = useNavigate()

    const [mode, setMode] = useState('CAMERA')
    const [capturedImage, setCapturedImage] = useState(null)
    const [showSettings, setShowSettings] = useState(false)
    const [toolPosition, setToolPosition] = useState('right')

    const handleCapture = (imageData) => {
        if (!imageData) return
        setCapturedImage(imageData)
        setMode('EDITOR')
    }

    const handleRetake = () => {
        setCapturedImage(null)
        setMode('CAMERA')
    }

    // Handle Done - return to camera after share
    const handleDone = () => {
        setCapturedImage(null)
        setMode('CAMERA')
    }

    // Handle Close - navigate back (preserves existing behavior)
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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#000',
            zIndex: 1000
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
