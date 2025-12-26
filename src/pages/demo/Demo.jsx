import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getConfig } from '../../config/appConfig.js';
import { isInDemoMode, getDemoRole } from '../../utils/demoSession.js';

// Layout
import DashboardLayout from '../../components/Shared/DashboardLayout.jsx';

// Tab Components
import StoreBranding from '../../components/Admin/StoreBranding.jsx';

/**
 * DEMO DASHBOARD
 * Unified demo experience using DashboardLayout wrapper.
 * Shows same capabilities as Owner but in demo mode.
 */
export default function Demo() {
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState('menu');
    const [config, setConfig] = useState(() => getConfig());

    // Verify demo mode
    useEffect(() => {
        if (!isInDemoMode()) {
            // If not in demo mode, could redirect or show message
            console.log('Not in demo mode - allowing access for testing');
        }
    }, []);

    // Config sync
    useEffect(() => {
        const handleSync = () => setConfig(getConfig());
        window.addEventListener('frontendSync', handleSync);
        const interval = setInterval(handleSync, 2000);
        return () => {
            window.removeEventListener('frontendSync', handleSync);
            clearInterval(interval);
        };
    }, []);

    // Render tab content
    const renderTabContent = () => {
        switch (currentTab) {
            case 'menu':
                return <MenuManagerDemo config={config} />;
            case 'orders':
                return <OrdersDemo config={config} />;
            case 'settings':
                return <StoreBranding isDemo={true} />;
            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <DashboardLayout
            role="DEMO"
            userName="Demo User"
            activeTab={currentTab}
            onTabChange={setCurrentTab}
        >
            {renderTabContent()}
        </DashboardLayout>
    );
}

// ============================================
// DEMO EMBEDDED COMPONENTS
// ============================================

function MenuManagerDemo({ config }) {
    return (
        <div>
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

            <p style={{ color: '#6B7280', marginBottom: 20 }}>
                Try adding items, changing prices, and organizing your menu.
            </p>

            {/* Quick demo actions */}
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

function OrdersDemo({ config }) {
    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
                🚀 Live Orders (Demo)
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
                🚧 <strong>Demo Mode:</strong> Simulated orders for testing the workflow.
            </div>

            {/* Simulated orders */}
            <div style={{
                background: 'white',
                borderRadius: 12,
                border: '1px solid #E5E7EB',
                overflow: 'hidden'
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
    );
}
