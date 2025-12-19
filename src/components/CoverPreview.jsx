/**
 * CoverPreview.jsx - Static Cover Preview Route
 * 
 * Separate route for cover image preview.
 * Renders real Home with cover applied.
 * Persistent until user navigates away.
 */

import { useNavigate } from 'react-router-dom'
import { getConfig } from '../config/appConfig.js'
import Home from '../pages/customer/Home.jsx'
import BottomNav from './BottomNav.jsx'

function CoverPreview() {
    const navigate = useNavigate()
    const config = getConfig()

    const handleBack = () => {
        navigate('/admin', { state: { returnToEditor: true } })
    }

    const handleDone = () => {
        // Config already saved via CoverImageEditor
        navigate('/admin')
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--canvas-bg, #fff)', zIndex: 9999 }}>
            {/* Real Home render */}
            <Home config={config} />

            {/* Real BottomNav */}
            <BottomNav />

            {/* Floating buttons */}
            <div style={{
                position: 'fixed',
                top: 0,
                right: 0,
                paddingTop: 'max(12px, env(safe-area-inset-top))',
                paddingRight: 12,
                display: 'flex',
                gap: 8,
                zIndex: 10000
            }}>
                <button
                    onClick={handleBack}
                    onTouchEnd={(e) => { e.preventDefault(); handleBack(); }}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        border: 'none',
                        fontSize: 18,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        touchAction: 'manipulation'
                    }}
                >
                    ←
                </button>
                <button
                    onClick={handleDone}
                    onTouchEnd={(e) => { e.preventDefault(); handleDone(); }}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: '#22C55E',
                        color: '#fff',
                        border: 'none',
                        fontSize: 20,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(34,197,94,0.4)',
                        touchAction: 'manipulation'
                    }}
                >
                    ✓
                </button>
            </div>
        </div>
    )
}

export default CoverPreview
