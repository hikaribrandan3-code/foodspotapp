import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * DEMO PAGE - MINIMAL SAFE VERSION
 * No imports from demoSession.js, storage.js, or appConfig.js at module level
 * All config access is done lazily inside useEffect
 */
export default function Demo() {
    const navigate = useNavigate();
    const [isReady, setIsReady] = useState(false);
    const [currentTab, setCurrentTab] = useState('menu');

    // SAFETY: Wait for React to fully hydrate before rendering
    useEffect(() => {
        const timer = setTimeout(() => setIsReady(true), 100);
        return () => clearTimeout(timer);
    }, []);

    if (!isReady) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f4f6f8',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
                    <p style={{ color: '#666', fontSize: 14 }}>Loading Demo...</p>
                </div>
            </div>
        );
    }

    // Inline styles (no CSS imports)
    const shellStyle = {
        display: 'flex',
        minHeight: '100vh',
        background: '#f4f6f8',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    };

    const sidebarStyle = {
        width: 260,
        background: '#1a1a1a',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
    };

    const tabStyle = (isActive) => ({
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '12px 24px',
        background: isActive ? '#333' : 'transparent',
        border: 'none',
        color: isActive ? '#FF6B6B' : '#ccc',
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: '0.95rem',
        transition: 'all 0.2s'
    });

    const tabs = [
        { id: 'menu', label: '📖 Menu Manager', icon: '🍔' },
        { id: 'orders', label: '🚀 Live Orders', icon: '🛎️' },
        { id: 'settings', label: '⚙️ Settings', icon: '🔧' }
    ];

    return (
        <div style={shellStyle}>
            {/* SIDEBAR */}
            <aside style={sidebarStyle}>
                <div style={{ padding: 20, borderBottom: '1px solid #333' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                        FoodSpot <span style={{ color: '#FF6B6B' }}>.OS</span>
                    </h2>
                </div>

                <nav style={{ flex: 1, padding: '20px 0' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setCurrentTab(tab.id)}
                            style={tabStyle(currentTab === tab.id)}
                        >
                            <span style={{ marginRight: 12 }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div style={{ padding: 20, borderTop: '1px solid #333' }}>
                    <span style={{
                        display: 'inline-block',
                        background: '#f59e0b',
                        color: 'black',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        marginBottom: 12
                    }}>
                        🚧 Demo Mode
                    </span>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            width: '100%',
                            padding: 10,
                            background: '#333',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer'
                        }}
                    >
                        🚪 Exit Demo
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                {/* Header */}
                <header style={{
                    height: 60,
                    background: 'white',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 24px',
                    flexShrink: 0
                }}>
                    <div style={{ fontWeight: 'bold', color: '#555' }}>
                        {tabs.find(t => t.id === currentTab)?.label}
                    </div>
                    <span style={{ fontSize: '0.9rem', color: '#666' }}>
                        Hello, <b>Demo User</b>
                    </span>
                </header>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                    {currentTab === 'menu' && <MenuTab />}
                    {currentTab === 'orders' && <OrdersTab />}
                    {currentTab === 'settings' && <SettingsTab />}
                </div>
            </main>
        </div>
    );
}

// ============================================
// TAB COMPONENTS (All inline, no external imports)
// ============================================

function MenuTab() {
    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
                📖 Menu Manager (Demo)
            </h2>

            <div style={{
                background: '#FEF3C7',
                border: '1px solid #F59E0B',
                borderRadius: 8,
                padding: 12,
                marginBottom: 20,
                fontSize: 13,
                color: '#92400E'
            }}>
                🚧 <strong>Demo Mode:</strong> Changes are saved locally. Subscribe to save permanently.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { icon: '🍔', label: 'Add Items', desc: 'Create menu items' },
                    { icon: '📂', label: 'Categories', desc: 'Organize by type' },
                    { icon: '💰', label: 'Pricing', desc: 'Set your prices' },
                    { icon: '📷', label: 'Photos', desc: 'Upload images' }
                ].map((card, i) => (
                    <div key={i} style={{
                        background: '#F9FAFB',
                        borderRadius: 12,
                        padding: 20,
                        textAlign: 'center',
                        border: '1px solid #E5E7EB'
                    }}>
                        <p style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</p>
                        <p style={{ fontWeight: 600, color: '#1F2937', margin: 0 }}>{card.label}</p>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>{card.desc}</p>
                    </div>
                ))}
            </div>

            <a
                href="/demo/backend/dashboard"
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
                Open Full Demo Editor →
            </a>
        </div>
    );
}

function OrdersTab() {
    const mockOrders = [
        { id: 'D001', status: 'Pending', items: '2x Burger, 1x Fries', total: 2500 },
        { id: 'D002', status: 'Preparing', items: '1x Pizza, 2x Soda', total: 3200 },
        { id: 'D003', status: 'Ready', items: '3x Tacos', total: 1800 }
    ];

    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
                🚀 Live Orders (Demo)
            </h2>

            <div style={{
                background: 'white',
                borderRadius: 12,
                border: '1px solid #E5E7EB',
                overflow: 'hidden'
            }}>
                {mockOrders.map((order, i) => (
                    <div key={order.id} style={{
                        padding: 16,
                        borderBottom: i < mockOrders.length - 1 ? '1px solid #F3F4F6' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <p style={{ fontWeight: 600, color: '#1F2937', margin: 0 }}>#{order.id}</p>
                            <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>{order.items}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 600,
                                background: order.status === 'Ready' ? '#DCFCE7' :
                                    order.status === 'Preparing' ? '#DBEAFE' : '#FEF3C7',
                                color: order.status === 'Ready' ? '#166534' :
                                    order.status === 'Preparing' ? '#1E40AF' : '#92400E'
                            }}>
                                {order.status}
                            </span>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#22C55E', margin: '8px 0 0' }}>
                                ${order.total.toLocaleString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SettingsTab() {
    return (
        <div style={{ maxWidth: 500 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
                ⚙️ Store Branding (Demo)
            </h2>

            <div style={{
                background: '#FEF3C7',
                border: '1px solid #F59E0B',
                borderRadius: 8,
                padding: 12,
                marginBottom: 20,
                fontSize: 13,
                color: '#92400E'
            }}>
                🚧 <strong>Demo Mode:</strong> Changes are stored locally.
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 8 }}>
                    BUSINESS NAME
                </label>
                <input
                    type="text"
                    defaultValue="Mi Negocio Demo"
                    style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #E5E7EB',
                        borderRadius: 10,
                        fontSize: 14,
                        boxSizing: 'border-box'
                    }}
                />
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 12 }}>
                    THEME COLORS
                </label>
                <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 6 }}>Primary</p>
                        <input type="color" defaultValue="#8B7355" style={{ width: 48, height: 48, border: 'none', borderRadius: 8 }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 6 }}>Accent</p>
                        <input type="color" defaultValue="#22C55E" style={{ width: 48, height: 48, border: 'none', borderRadius: 8 }} />
                    </div>
                </div>
            </div>

            <button style={{
                width: '100%',
                padding: 14,
                background: '#22C55E',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
            }}>
                ✨ Apply Changes
            </button>
        </div>
    );
}
