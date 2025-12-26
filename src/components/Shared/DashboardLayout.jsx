import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * UNIFIED DASHBOARD LAYOUT
 * - Automates the Navigation Bar for SuperAdmin, Owner, and Demo.
 * - Fixes "Navigation Trap" by ensuring every screen has a way out.
 * - Standardizes the "Clean Admin Bar".
 */

export default function DashboardLayout({
    role = 'OWNER',      // 'SUPERADMIN', 'OWNER', 'DEMO'
    userName = 'User',   // The name to display
    activeTab,           // Current active tab (e.g., 'menu')
    onTabChange,         // Function to change tabs
    children
}) {
    const navigate = useNavigate();

    // 1. DEFINE TABS ONCE (Centralized Logic)
    const ALL_TABS = [
        { id: 'menu', label: '📖 Menu Manager', icon: '🍔', roles: ['SUPERADMIN', 'OWNER', 'DEMO'] },
        { id: 'orders', label: '🚀 Live Orders', icon: '🛎️', roles: ['SUPERADMIN', 'OWNER', 'DEMO'] },
        { id: 'analytics', label: '📈 Analytics', icon: '📊', roles: ['SUPERADMIN', 'OWNER'] }, // Demo doesn't see analytics? (Optional)
        { id: 'qr', label: '📱 QR Codes', icon: '🏁', roles: ['SUPERADMIN', 'OWNER'] },
        { id: 'settings', label: '⚙️ Settings', icon: '🔧', roles: ['SUPERADMIN', 'OWNER', 'DEMO'] },
        { id: 'super_users', label: '👥 Client Mgr', icon: '👔', roles: ['SUPERADMIN'] } // Only Super Admin
    ];

    // Filter tabs based on the current role
    const visibleTabs = ALL_TABS.filter(tab => tab.roles.includes(role));

    // Role Badge Color Logic
    const getBadgeStyle = () => {
        if (role === 'SUPERADMIN') return { bg: '#3b82f6', text: 'white', label: '👑 Super Admin' };
        if (role === 'DEMO') return { bg: '#f59e0b', text: 'black', label: '🚧 Demo Mode' };
        return { bg: '#10b981', text: 'white', label: '🏪 Store Owner' };
    };
    const badge = getBadgeStyle();

    return (
        <div className="dashboard-shell" style={{ display: 'flex', minHeight: '100vh', background: '#f4f6f8', fontFamily: 'sans-serif' }}>

            {/* SIDEBAR NAVIGATION */}
            <aside style={{ width: '260px', background: '#1a1a1a', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #333' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>FoodSpot <span style={{ color: '#FF6B6B' }}>.OS</span></h2>
                </div>

                <nav style={{ flex: 1, padding: '20px 0' }}>
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                padding: '12px 24px',
                                background: activeTab === tab.id ? '#333' : 'transparent',
                                border: 'none',
                                color: activeTab === tab.id ? '#FF6B6B' : '#ccc',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.95rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span style={{ marginRight: '12px' }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
                    <button
                        onClick={() => {
                            if (window.confirm('Exit Dashboard?')) navigate('/');
                        }}
                        style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        🚪 Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

                {/* TOP HEADER */}
                <header style={{ height: '60px', background: 'white', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
                    <div style={{ fontWeight: 'bold', color: '#555' }}>
                        {visibleTabs.find(t => t.id === activeTab)?.label}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '0.9rem', color: '#666' }}>Hello, <b>{userName}</b></span>
                        <span style={{
                            background: badge.bg, color: badge.text, padding: '4px 12px',
                            borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold'
                        }}>
                            {badge.label}
                        </span>
                    </div>
                </header>

                {/* SCROLLABLE CONTENT */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
