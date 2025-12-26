import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/Shared/DashboardLayout';
import StoreBranding from '../../components/Admin/StoreBranding';

/**
 * DEMO PAGE - SAFE VERSION
 * Includes "Safety Timer" to prevent ReferenceError crash on Safari/Mobile.
 * Uses DashboardLayout for unified sidebar navigation.
 */
export default function Demo() {
    // 1. SAFETY STATE: Prevents "Uninitialized Variable" crash by waiting for mount
    const [isReady, setIsReady] = useState(false);
    const [currentTab, setCurrentTab] = useState('menu');

    // 2. MOCK CONFIG (Since Demo doesn't have a real backend yet)
    const [demoConfig, setDemoConfig] = useState({
        heroImage: null,
        logo: null,
        theme: { primary: '#000000', secondary: '#FF6B6B' }
    });

    useEffect(() => {
        // Short delay to ensure React DOM is stable before rendering heavy children
        const timer = setTimeout(() => setIsReady(true), 50);
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
                    <p style={{ color: '#666', fontSize: 14 }}>Loading Demo OS...</p>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout
            role="DEMO"
            userName="Future Client"
            activeTab={currentTab}
            onTabChange={setCurrentTab}
        >
            {/* TAB 1: MENU */}
            {currentTab === 'menu' && (
                <div className="fade-in">
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
                        📖 Menu Manager (Demo)
                    </h2>

                    {/* Demo Notice */}
                    <div style={{
                        background: '#FEF3C7',
                        border: '1px solid #F59E0B',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 20,
                        fontSize: 13,
                        color: '#92400E'
                    }}>
                        🚧 <strong>Demo Mode:</strong> Menu changes are saved locally. Subscribe to save permanently.
                    </div>

                    {/* Quick demo cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
                        <div style={{
                            background: '#F9FAFB',
                            borderRadius: 12,
                            padding: 20,
                            textAlign: 'center',
                            border: '1px solid #E5E7EB'
                        }}>
                            <p style={{ fontSize: 32, marginBottom: 8 }}>🍔</p>
                            <p style={{ fontWeight: 600, color: '#1F2937', margin: 0 }}>Add Items</p>
                            <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Create menu items</p>
                        </div>
                        <div style={{
                            background: '#F9FAFB',
                            borderRadius: 12,
                            padding: 20,
                            textAlign: 'center',
                            border: '1px solid #E5E7EB'
                        }}>
                            <p style={{ fontSize: 32, marginBottom: 8 }}>📂</p>
                            <p style={{ fontWeight: 600, color: '#1F2937', margin: 0 }}>Categories</p>
                            <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Organize by type</p>
                        </div>
                        <div style={{
                            background: '#F9FAFB',
                            borderRadius: 12,
                            padding: 20,
                            textAlign: 'center',
                            border: '1px solid #E5E7EB'
                        }}>
                            <p style={{ fontSize: 32, marginBottom: 8 }}>💰</p>
                            <p style={{ fontWeight: 600, color: '#1F2937', margin: 0 }}>Pricing</p>
                            <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Set your prices</p>
                        </div>
                        <div style={{
                            background: '#F9FAFB',
                            borderRadius: 12,
                            padding: 20,
                            textAlign: 'center',
                            border: '1px solid #E5E7EB'
                        }}>
                            <p style={{ fontSize: 32, marginBottom: 8 }}>📷</p>
                            <p style={{ fontWeight: 600, color: '#1F2937', margin: 0 }}>Photos</p>
                            <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Upload images</p>
                        </div>
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
            )}

            {/* TAB 2: SETTINGS / BRANDING */}
            {currentTab === 'settings' && (
                <div className="fade-in">
                    <StoreBranding
                        isDemo={true}
                    />
                </div>
            )}

            {/* TAB 3: ORDERS (Placeholder) */}
            {currentTab === 'orders' && (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>
                        🚀 Live Orders Simulation
                    </h3>
                    <p style={{ color: '#6B7280', marginBottom: 24 }}>Incoming orders will appear here.</p>

                    {/* Simulated orders */}
                    <div style={{
                        background: 'white',
                        borderRadius: 12,
                        border: '1px solid #E5E7EB',
                        overflow: 'hidden',
                        maxWidth: 500,
                        margin: '0 auto',
                        textAlign: 'left'
                    }}>
                        {[
                            { id: 'D001', status: 'Pending', items: '2x Burger, 1x Fries', total: 2500 },
                            { id: 'D002', status: 'Preparing', items: '1x Pizza, 2x Soda', total: 3200 },
                            { id: 'D003', status: 'Ready', items: '3x Tacos', total: 1800 }
                        ].map((order, i) => (
                            <div key={order.id} style={{
                                padding: 16,
                                borderBottom: i < 2 ? '1px solid #F3F4F6' : 'none',
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
                                        background: order.status === 'Ready' ? '#DCFCE7' : order.status === 'Preparing' ? '#DBEAFE' : '#FEF3C7',
                                        color: order.status === 'Ready' ? '#166534' : order.status === 'Preparing' ? '#1E40AF' : '#92400E'
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
            )}
        </DashboardLayout>
    );
}
