import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Layout
import DashboardLayout from '../../components/Shared/DashboardLayout.jsx';

// Tab Components
import StoreBranding from '../../components/Admin/StoreBranding.jsx';

/**
 * DEMO DASHBOARD
 * Exact visual replica of OwnerDashboard using DashboardLayout.
 * NO AUTH REQUIRED - Demo mode for prospective clients.
 * 
 * SAFETY: Includes 50ms delay to prevent Safari "Uninitialized Variable" crash.
 */
export default function Demo() {
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState('menu');
    const [isReady, setIsReady] = useState(false);

    // Mock config for demo mode
    const [demoConfig, setDemoConfig] = useState({
        heroImage: null,
        logo: null,
        theme: { primary: '#000000', secondary: '#FF6B6B' }
    });

    // SAFETY CRASH GUARD: Prevent Safari "Uninitialized Variable" crash
    useEffect(() => {
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

    // Render tab content (mirrors OwnerDashboard exactly)
    const renderTabContent = () => {
        switch (currentTab) {
            case 'menu':
                return <MenuManagerEmbed isDemo={true} />;
            case 'orders':
                return <OrdersEmbed isDemo={true} />;
            case 'analytics':
                return <AnalyticsEmbed isDemo={true} />;
            case 'settings':
                return <StoreBranding isDemo={true} />;
            case 'qr':
                return <QRCodeEmbed isDemo={true} />;
            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <DashboardLayout
            role="DEMO"
            userName="Future Client"
            activeTab={currentTab}
            onTabChange={setCurrentTab}
        >
            {renderTabContent()}
        </DashboardLayout>
    );
}

// ============================================
// EMBEDDED COMPONENTS (Exact replica of Owner embeds)
// ============================================

function MenuManagerEmbed({ isDemo }) {
    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
                📖 Menu Manager
            </h2>
            <p style={{ color: '#6B7280', marginBottom: 20 }}>
                Manage your menu items, categories, and pricing.
            </p>

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
                🚧 <strong>Demo Mode:</strong> Changes are saved locally. Subscribe to save permanently.
            </div>

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
    );
}

function OrdersEmbed({ isDemo }) {
    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
                🚀 Live Orders
            </h2>
            <p style={{ color: '#6B7280', marginBottom: 20 }}>
                View and manage incoming orders.
            </p>

            {/* Demo Simulation */}
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

            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 16, textAlign: 'center' }}>
                Demo orders — Real orders appear here with a subscription.
            </p>
        </div>
    );
}

function AnalyticsEmbed({ isDemo }) {
    return (
        <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 20 }}>
                📈 Analytics
            </h2>
            <p style={{ color: '#6B7280', marginBottom: 20 }}>
                View your store performance and insights.
            </p>

            {/* Demo Analytics Placeholder */}
            <div style={{
                background: '#F9FAFB',
                borderRadius: 12,
                padding: 40,
                textAlign: 'center',
                border: '2px dashed #E5E7EB'
            }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>📊</p>
                <p style={{ color: '#6B7280', marginBottom: 8 }}>Analytics Dashboard</p>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                    Full analytics available with subscription
                </p>
            </div>
        </div>
    );
}

function QRCodeEmbed({ isDemo }) {
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
    );
}
