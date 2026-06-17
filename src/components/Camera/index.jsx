import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../contexts/TenantContext'
import CameraLayer from './CameraLayer.jsx'
import CameraLayerV18 from './CameraLayerV18.jsx'
import EditorLayer from './EditorLayer.jsx'
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
    const { tenantData } = useTenant() || {}
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
        setMode('EDITOR')
    }

    const handleRetake = () => {
        setCapturedImage(null)
        setMode('CAMERA')
    }

    const handleDone = (points = 0) => {
        const slug = window.location.pathname.split('/').filter(Boolean)[0]
        if (points > 0) {
            navigate(`/${slug}?ugcShared=true&ugcPoints=${points}`)
        } else {
            navigate(-1)
        }
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
                isOwner ? (
                    <CameraLayerV18
                        onCapture={handleCapture}
                        onClose={handleClose}
                        locationLabel={businessName}
                        pinBg={pinBg}
                        pinText={pinText}
                    />
                ) : (
                    <CameraLayer
                        onCapture={handleCapture}
                        onOpenSettings={handleOpenSettings}
                        onClose={handleClose}
                        toolPosition={toolPosition}
                    />
                )
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
