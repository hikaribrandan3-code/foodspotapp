import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'
import CameraLayer from './CameraLayer.jsx'
import EditorLayer from './EditorLayer.jsx'
import VideoPostScreen from './VideoPostScreen.jsx'
import SettingsSheet from './SettingsSheet.jsx'
import { useCamTechBroadcaster } from '../../hooks/useCamTech'
import './CameraLayer.css'
import './EditorLayer.css'

// Business pin colors — mirrors the customer camera (CameraLayer.jsx)
const PIN_STYLE_COLORS = {
    classic: 'rgba(255, 255, 255, 0.22)',
    cafe:    'rgba(130, 90, 60, 0.55)',
    vegan:   'rgba(145, 170, 100, 0.55)',
    natural: 'rgba(145, 170, 100, 0.55)',
    burger:  'rgba(255, 193, 7, 0.60)',
}

/**
 * CamTech v2.2 - Camera Component
 * God-Tier Memory Revolution: Blob Architecture Bridge
 * Managed ObjectURL lifecycle to prevent RAM leaks.
 */
export const VERSION = 'CamTech v2.2'

function Camera({ neonContext = null, branding = null }) {
    const navigate = useNavigate()
    const { activateCamera, deactivateCamera } = useCamTechBroadcaster()
    const { tenantData, businessId } = useTenant() || {}
    const [isOwner, setIsOwner] = useState(false)
    const [authLoading, setAuthLoading] = useState(true)

    // Business pin — name + style colors from tenant config
    const businessName = tenantData?.business_name || 'FoodSpot'
    const pinStyle   = tenantData?.app_config?.cameraPinStyle || 'classic'
    const customBg   = tenantData?.app_config?.cameraPinCustomBg   || 'rgba(20,20,24,0.55)'
    const customText = tenantData?.app_config?.cameraPinCustomText || '#ffffff'
    const pinBg   = pinStyle === 'custom' ? customBg   : (PIN_STYLE_COLORS[pinStyle] || PIN_STYLE_COLORS.classic)
    const pinText = pinStyle === 'custom' ? customText : '#ffffff'

    const [mode, setMode] = useState('CAMERA')
    const [capturedImage, setCapturedImage] = useState(null)
    const [showSettings, setShowSettings] = useState(false)
    const [toolPosition, setToolPosition] = useState('right')

    // --- OWNER MODE: driven by the SAME ?ownerStart signal Home.jsx uses ---
    // NOT the auth session. Owner "View Store" carries ?ownerStart=true through
    // navigation → advanced camera. Delete the param → customer → normal camera.
    // Component stays mounted through capture→editor→back, so reading once is enough.
    useEffect(() => {
        const ownerStart = new URLSearchParams(window.location.search).get('ownerStart') === 'true'
        setIsOwner(ownerStart)
        setAuthLoading(false)
    }, [])

    // --- CAMTECH BLACK BOX: Global State Management ---
    useEffect(() => {
        activateCamera()
        return () => deactivateCamera()
    }, [activateCamera, deactivateCamera])

    const handleCapture = (captureResult) => {
        if (!captureResult) return
        setCapturedImage(captureResult)
        // Video skips the editor entirely: capture → share preview
        setMode(captureResult.type === 'video' ? 'VIDEO_PREVIEW' : 'EDITOR')
    }

    // Video blob URLs are owned HERE (photos are owned by EditorLayer) —
    // dump from memory on retake/done so 15MB clips don't accumulate.
    const releaseVideo = (capture) => {
        if (capture?.type === 'video' && capture.objectURL) {
            URL.revokeObjectURL(capture.objectURL)
        }
    }

    const handleRetake = () => {
        releaseVideo(capturedImage)
        setCapturedImage(null)
        setMode('CAMERA')
    }

    const handleDone = () => {
        releaseVideo(capturedImage)
        // Reset to camera mode
        setMode('CAMERA')
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

    if (authLoading) {
        return (
            <div className="camera-fullscreen-wrapper" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#000',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#fff', fontSize: 16 }}>Loading camera...</div>
            </div>
        )
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
            {/* Owner indicator dot (owners only, top-right to avoid exit button) */}
            {isOwner && (
                <div style={{
                    position: 'fixed',
                    top: 24,
                    right: 24,
                    width: 12,
                    height: 12,
                    background: '#10B981',
                    borderRadius: '50%',
                    zIndex: 1001,
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                }}
                title="Owner Mode"
                />
            )}

            {mode === 'CAMERA' && (
                <CameraLayer
                    onCapture={handleCapture}
                    onClose={handleClose}
                    locationLabel={businessName}
                    pinBg={pinBg}
                    pinText={pinText}
                    toolPosition={toolPosition}
                    isOwner={isOwner}
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
                    isOwner={isOwner}
                />
            )}

            {mode === 'VIDEO_PREVIEW' && capturedImage?.type === 'video' && (
                <VideoPostScreen
                    videoData={capturedImage}
                    onRetake={handleRetake}
                    onComplete={handleDone}
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
