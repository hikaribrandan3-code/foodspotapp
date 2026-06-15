import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
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
    const [isOwner, setIsOwner] = useState(false)
    const [authLoading, setAuthLoading] = useState(true)

    const [mode, setMode] = useState('CAMERA')
    const [capturedImage, setCapturedImage] = useState(null)
    const [showSettings, setShowSettings] = useState(false)
    const [toolPosition, setToolPosition] = useState('right')

    // --- AUTH CHECK: Detect if user is owner (building camera for owners) ---
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user?.user_metadata?.role === 'owner') {
                    setIsOwner(true)
                }
            } catch (err) {
                console.error('Auth check failed:', err)
            } finally {
                setAuthLoading(false)
            }
        }
        checkAuth()
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
                    onOpenSettings={handleOpenSettings}
                    onClose={handleClose}
                    toolPosition={toolPosition}
                    isOwnerMode={isOwner}
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
