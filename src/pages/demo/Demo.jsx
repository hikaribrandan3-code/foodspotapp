import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'

/**
 * DEMO SUMMARY PAGE
 * Exact replica of OwnerSummary layout with BackendHeader + BackendNav.
 * NO AUTH REQUIRED - Demo mode for prospective clients.
 * 
 * This is the entry point for /demo - matches Owner's bottom tab navigation.
 */
export default function Demo() {
    const navigate = useNavigate()
    const [isReady, setIsReady] = useState(false)

    // SAFETY: 50ms delay to prevent Safari "Uninitialized Variable" crash
    useEffect(() => {
        const timer = setTimeout(() => setIsReady(true), 50)
        return () => clearTimeout(timer)
    }, [])

    const handleExitDemo = () => {
        // Clear any demo session data
        try {
            sessionStorage.removeItem('foodspot_demo_session')
            localStorage.removeItem('foodspot_demo_active')
        } catch (e) { }
        navigate('/')
    }

    if (!isReady) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F5F2EE',
                fontFamily: 'system-ui'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
                    <p style={{ color: '#666' }}>Loading Demo...</p>
                </div>
            </div>
        )
    }

    // Style helpers (same as OwnerSummary)
    const cardStyle = { background: 'white', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
    const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F5F2EE', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <BackendHeader
                title="Demo Summary"
                onLogout={handleExitDemo}
                showDateSelector={false}
                showNotifications={false}
                showAvatar={false}
            />

            {/* Demo Mode Banner */}
            <div style={{ padding: '12px 16px', background: '#FEF3C7', borderBottom: '1px solid #F59E0B' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#92400E',
                    fontWeight: 500
                }}>
                    🚧 <strong>Demo Mode</strong> — Changes are saved locally. Subscribe to save permanently.
                </div>
            </div>

            {/* Content - with bottom padding for BackendNav */}
            <div style={{ padding: 16, paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>

                {/* ==================== WELCOME CARD ==================== */}
                <div style={cardStyle}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', margin: 0, marginBottom: 8 }}>
                        👋 Welcome to FoodSpot Demo!
                    </h2>
                    <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
                        Explore the owner dashboard. Use the tabs below to navigate.
                    </p>
                </div>

                {/* ==================== DEMO STATS ==================== */}
                <h3 style={labelStyle}>DEMO STATISTICS</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={cardStyle}>
                        <p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>12</p>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Demo Orders</p>
                    </div>
                    <div style={cardStyle}>
                        <p style={{ fontSize: 24, fontWeight: 700, color: '#3B82F6', margin: 0 }}>$45,000</p>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Demo Revenue</p>
                    </div>
                </div>

                {/* ==================== QUICK ACTIONS ==================== */}
                <h3 style={labelStyle}>QUICK ACTIONS</h3>
                <div style={cardStyle}>
                    <button
                        onClick={() => navigate('/demo/menu')}
                        style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginBottom: 10
                        }}
                    >
                        📖 Edit Menu
                    </button>
                    <button
                        onClick={() => navigate('/demo/branding')}
                        style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: '#8B5CF6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginBottom: 10
                        }}
                    >
                        🎨 Customize Branding
                    </button>
                    <button
                        onClick={() => {
                            // Set demo mode flag so frontend shows demo pill
                            try {
                                localStorage.setItem('foodspot_demo_active', 'true')
                            } catch (e) { }
                            navigate('/')
                        }}
                        style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: '#10B981',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        👀 View Customer App
                    </button>
                </div>

                {/* ==================== DEMO INFO ==================== */}
                <h3 style={labelStyle}>ABOUT THIS DEMO</h3>
                <div style={cardStyle}>
                    <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>
                        This is a fully functional demo of the FoodSpot owner dashboard.
                        All features work exactly as they would with a real subscription.
                        Data is stored locally in your browser.
                    </p>
                </div>

            </div>

            {/* Backend Navigation - Same as Owner */}
            <BackendNav
                role="demo"
                useRoutes={true}
            />
        </div>
    )
}
