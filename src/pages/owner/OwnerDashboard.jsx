import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, clearAuth } from '../../utils/storage.js'

// Layout
import DashboardLayout from '../../components/Shared/DashboardLayout.jsx'

// Tab Components (imported from existing pages)
import StoreBranding from '../../components/Admin/StoreBranding.jsx'

/**
 * OWNER DASHBOARD
 * Unified dashboard using DashboardLayout wrapper.
 * 
 * ARCHITECTURAL INVARIANT: Config MUST come from props, NOT getConfig().
 * This ensures Single Source of Truth from App.jsx.
 */
export default function OwnerDashboard({ config }) {
    const navigate = useNavigate()
    const [currentTab, setCurrentTab] = useState('menu')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userName, setUserName] = useState('Owner')

    // Auth check
    useEffect(() => {
        const auth = getAuth()
        if (!auth.authenticated || (auth.role !== 'owner' && auth.role !== 'superadmin')) {
            navigate('/owner')
            return
        }
        setIsAuthenticated(true)
        setUserName(auth.username || 'Owner')
    }, [navigate])

    // Logout handler
    const handleLogout = () => {
        clearAuth()
        navigate('/')
    }

    if (!isAuthenticated) {
        return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
    }

    // Render tab content
    const renderTabContent = () => {
        switch (currentTab) {
            case 'menu':
                return <MenuManagerEmbed config={config} />
            case 'orders':
                return <OrdersEmbed config={config} />
            case 'analytics':
                return <AnalyticsEmbed config={config} />
            case 'settings':
                return <StoreBranding config={config} isDemo={false} />
            case 'qr':
                return <QRCodeEmbed />
            default:
                return <div>Select a tab</div>
        }
    }

    return (
        <DashboardLayout
            role="OWNER"
            userName={userName}
            activeTab={currentTab}
            onTabChange={setCurrentTab}
        >
            {renderTabContent()}
        </DashboardLayout>
    )
}

// ============================================
// EMBEDDED COMPONENTS (Lightweight wrappers)
// ============================================

function MenuManagerEmbed({ config }) {
    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
                📖 Menu Manager
            </h2>
            <p style={{ color: '#6B7280', marginBottom: 20 }}>
                Manage your menu items, categories, and pricing.
            </p>
            <a
                href="/owner/menu"
                style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: '#3B82F6',
                    color: 'white',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontWeight: 600
                }}
            >
                Open Full Menu Editor →
            </a>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 12 }}>
                Tip: Full menu editing is available in the dedicated page for better mobile experience.
            </p>
        </div>
    )
}

function OrdersEmbed({ config }) {
    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
                🚀 Live Orders
            </h2>
            <p style={{ color: '#6B7280', marginBottom: 20 }}>
                View and manage incoming orders.
            </p>
            <a
                href="/owner/delivery"
                style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: '#F59E0B',
                    color: 'white',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontWeight: 600
                }}
            >
                Open Order Manager →
            </a>
        </div>
    )
}

function AnalyticsEmbed({ config }) {
    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
                📈 Analytics
            </h2>
            <p style={{ color: '#6B7280', marginBottom: 20 }}>
                View your store performance and insights.
            </p>
            <a
                href="/owner/analytics"
                style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: '#10B981',
                    color: 'white',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontWeight: 600
                }}
            >
                Open Analytics →
            </a>
        </div>
    )
}

function QRCodeEmbed() {
    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
                📱 QR Codes
            </h2>
            <p style={{ color: '#6B7280', marginBottom: 20 }}>
                Generate and download QR codes for your tables.
            </p>
            <div style={{
                background: '#F9FAFB',
                borderRadius: 12,
                padding: 40,
                textAlign: 'center',
                border: '2px dashed #E5E7EB'
            }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>🏁</p>
                <p style={{ color: '#6B7280' }}>QR Code generator coming soon!</p>
            </div>
        </div>
    )
}
