// Demo Backend Dashboard
// Uses SAME UI layout as production, but with demo session + mock data
// NO authentication required - only demo session check

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    getDemoSession,
    clearDemoSession,
    getDemoRole,
    toggleDemoRole,
    getDemoConfig,
    updateDemoConfig,
    getDemoMenu,
    saveDemoMenu,
    updateDemoMenuItem,
    applyDemoToFrontend,
    clearAllDemoData
} from '../../utils/demoSession.js'
import { getConfig, HERO_DEFAULT } from '../../config/appConfig.js'
import { getMenu } from '../../config/menuData.js'

// Import existing branding components (REUSE)
import BrandingColorPicker from '../../components/BrandingColorPicker.jsx'
import HeroIconPicker from '../../components/HeroIconPicker.jsx'

// Mock data for demo (inline to avoid touching production services)
const MOCK_ORDERS = [
    {
        id: 'demo-1',
        orderNumber: '101',
        status: 'preparacion',
        items: [{ name: 'Flat White', quantity: 2, price: 1800 }],
        total: 3600,
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        paymentConfirmed: false
    },
    {
        id: 'demo-2',
        orderNumber: '102',
        status: 'listo',
        items: [{ name: 'Cappuccino', quantity: 1, price: 1600 }, { name: 'Brownie', quantity: 1, price: 2200 }],
        total: 3800,
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        paymentConfirmed: true,
        paymentMethod: 'mercado_pago'
    },
    {
        id: 'demo-3',
        orderNumber: '103',
        status: 'entregado',
        items: [{ name: 'Espresso', quantity: 1, price: 1200 }],
        total: 1200,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        paymentConfirmed: true,
        paymentMethod: 'cash'
    }
]

const MOCK_ANALYTICS = {
    today: { orders: 12, revenue: 28500 },
    week: { orders: 67, revenue: 156000 },
    month: { orders: 245, revenue: 612000 }
}

function DemoBackend() {
    const navigate = useNavigate()
    const [demoSession, setDemoSession] = useState(() => getDemoSession())
    const [activeTab, setActiveTab] = useState('resumen')
    const [orders] = useState(MOCK_ORDERS)
    const [role, setRole] = useState(() => getDemoRole())

    // Demo-specific state (localStorage-backed)
    const [demoConfig, setDemoConfig] = useState(() => getDemoConfig())
    const [demoMenu, setDemoMenu] = useState(() => getDemoMenu() || getMenu())
    const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false)
    const [applyFeedback, setApplyFeedback] = useState('')

    // Redirect if no valid demo session
    useEffect(() => {
        if (!demoSession) {
            navigate('/')
        }
    }, [demoSession, navigate])

    // Check session expiry periodically
    useEffect(() => {
        const interval = setInterval(() => {
            const session = getDemoSession()
            if (!session) {
                navigate('/')
            }
        }, 5000)
        return () => clearInterval(interval)
    }, [navigate])

    const handleExitDemo = () => {
        clearDemoSession()
        navigate('/')
    }

    const handleResetDemo = () => {
        if (confirm('Reset all demo customizations? This cannot be undone.')) {
            clearAllDemoData()
            alert('✅ Demo data reset!')
            window.location.href = '/'
        }
    }

    const handleApplyToFrontend = () => {
        applyDemoToFrontend()
        setHasUnappliedChanges(false)
        setApplyFeedback('✅ Applied!')
        setTimeout(() => setApplyFeedback(''), 2000)
    }

    // Config update helpers
    const handleConfigChange = (updates) => {
        const newConfig = updateDemoConfig(updates)
        setDemoConfig(newConfig)
        setHasUnappliedChanges(true)
    }

    // Menu edit helpers
    const handleMenuItemEdit = (categoryId, itemId, updates) => {
        const newMenu = updateDemoMenuItem(demoMenu, categoryId, itemId, updates)
        setDemoMenu(newMenu)
        setHasUnappliedChanges(true)
    }

    if (!demoSession) {
        return null // Will redirect
    }

    // Tabs based on role
    const ownerTabs = [
        { id: 'resumen', label: 'Summary' },
        { id: 'branding', label: 'Branding' },
        { id: 'menu', label: 'Menu' },
        { id: 'info', label: 'Info' },
        { id: 'orders', label: 'Orders' },
        { id: 'analytics', label: 'Analytics' }
    ]

    const staffTabs = [
        { id: 'orders', label: 'Orders' },
        { id: 'stock', label: 'Stock' },
        { id: 'rewards', label: 'Stamps' }
    ]

    const tabs = role === 'owner' ? ownerTabs : staffTabs

    // Ensure active tab is valid for current role
    useEffect(() => {
        if (!tabs.find(t => t.id === activeTab)) {
            setActiveTab(tabs[0].id)
        }
    }, [role, tabs, activeTab])

    // Styles (matching Super Admin baseline)
    const cardStyle = { background: 'white', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
    const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }
    const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 8 }

    const activeOrders = orders.filter(o => o.status !== 'entregado')
    const todayOrders = orders

    return (
        <div style={{ minHeight: '100vh', background: '#F5F2EE', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: 80 }}>
            {/* Header - Matching Super Admin */}
            <div style={{ background: '#FFFFFF', padding: '16px 16px 12px', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={handleExitDemo} style={{ background: 'none', border: 'none', color: '#1F2937', fontSize: 20, cursor: 'pointer', padding: 0 }}>←</button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, background: demoConfig.primaryColor || '#1F2937', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: '#FFFFFF', fontSize: 18 }}>🍽</span>
                            </div>
                            <span style={{ fontSize: 20, fontWeight: 700, color: '#1F2937' }}>{demoConfig.businessName || 'FoodSpot'}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Demo Badge */}
                        <span style={{
                            padding: '4px 10px',
                            background: '#FEF3C7',
                            color: '#92400E',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600
                        }}>
                            DEMO
                        </span>
                        {/* Role Toggle */}
                        <select
                            value={role}
                            onChange={(e) => {
                                const newRole = e.target.value
                                toggleDemoRole()
                                setRole(newRole)
                            }}
                            style={{
                                padding: '6px 24px 6px 10px',
                                fontSize: 11,
                                fontWeight: 600,
                                border: 'none',
                                borderRadius: 5,
                                cursor: 'pointer',
                                background: role === 'owner' ? '#22C55E' : '#6366F1',
                                color: 'white',
                                minWidth: 80
                            }}
                        >
                            <option value="owner">👔 Owner</option>
                            <option value="staff">👷 Staff</option>
                        </select>
                        {/* Exit Demo */}
                        <button
                            onClick={handleExitDemo}
                            style={{
                                padding: '6px 12px',
                                fontSize: 11,
                                fontWeight: 500,
                                background: 'transparent',
                                border: '1px solid #E5E7EB',
                                borderRadius: 5,
                                cursor: 'pointer',
                                color: '#6B7280'
                            }}
                        >
                            Exit
                        </button>
                    </div>
                </div>

                {/* Apply to Frontend Button - REQUIRED */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                        onClick={handleApplyToFrontend}
                        style={{
                            flex: 1,
                            padding: '10px 16px',
                            fontSize: 13,
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: hasUnappliedChanges ? '#22C55E' : '#3B82F6',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8
                        }}
                    >
                        {applyFeedback || (hasUnappliedChanges ? '⚡ Apply to Frontend' : '✅ Apply to Frontend')}
                    </button>
                    <button
                        onClick={handleResetDemo}
                        style={{
                            padding: '10px 16px',
                            fontSize: 13,
                            fontWeight: 500,
                            border: '1px solid #E5E7EB',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: 'white',
                            color: '#6B7280'
                        }}
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Tab Navigation - Matching Super Admin */}
            <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 'none',
                            padding: '12px 14px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '3px solid #22C55E' : '3px solid transparent',
                            fontSize: 13,
                            fontWeight: activeTab === tab.id ? 600 : 400,
                            color: activeTab === tab.id ? '#1F2937' : '#6B7280',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ padding: 16 }}>

                {/* SUMMARY TAB (Owner only) */}
                {activeTab === 'resumen' && role === 'owner' && (
                    <>
                        <h3 style={labelStyle}>💳 TODAY'S PAYMENTS</h3>
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #F3F4F6' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#E0F2F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💳</div>
                                    <div><p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>Mercado Pago</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>5 orders</p></div>
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>$18,500</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💵</div>
                                    <div><p style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', margin: 0 }}>Cash</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>7 orders</p></div>
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 600, color: '#22C55E' }}>$10,000</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
                                <div><p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: 0 }}>Today's Total</p><p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>12 orders</p></div>
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>$28,500</span>
                            </div>
                        </div>

                        <h3 style={labelStyle}>📊 SESSIONS</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{MOCK_ANALYTICS.week.orders}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>This week</p></div>
                            <div style={cardStyle}><p style={{ fontSize: 24, fontWeight: 700, color: '#22C55E', margin: 0 }}>{MOCK_ANALYTICS.month.orders}</p><p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>This month</p></div>
                        </div>
                    </>
                )}

                {/* BRANDING TAB (Owner only) - REUSES EXISTING COMPONENTS */}
                {activeTab === 'branding' && role === 'owner' && (
                    <>
                        <h3 style={labelStyle}>🎨 BRANDING</h3>

                        {/* Business Name */}
                        <div style={cardStyle}>
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Business Name</label>
                            <input
                                type="text"
                                value={demoConfig.businessName || ''}
                                onChange={(e) => handleConfigChange({ businessName: e.target.value })}
                                placeholder="Your business name"
                                style={inputStyle}
                            />
                        </div>

                        {/* Hero Cover Image - Simplified uploader */}
                        <div style={cardStyle}>
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 8 }}>Hero Cover Image</label>
                            {demoConfig.coverImage ? (
                                <div style={{ marginBottom: 12 }}>
                                    <img src={demoConfig.coverImage} alt="Cover" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                                    <button
                                        onClick={() => handleConfigChange({ coverImage: null })}
                                        style={{ marginTop: 8, padding: '6px 12px', fontSize: 12, background: '#EF4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            const reader = new FileReader()
                                            reader.onload = (event) => {
                                                handleConfigChange({ coverImage: event.target?.result })
                                            }
                                            reader.readAsDataURL(file)
                                        }
                                    }}
                                    style={{ fontSize: 13 }}
                                />
                            )}
                            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Upload a hero image for the home screen</p>
                        </div>

                        {/* Color Picker - REUSE EXISTING */}
                        <BrandingColorPicker
                            primaryColor={demoConfig.primaryColor || '#8B7355'}
                            iconColorMode={demoConfig.iconColorMode || 'white'}
                            onColorChange={(color) => handleConfigChange({ primaryColor: color })}
                            onIconModeChange={(mode) => handleConfigChange({ iconColorMode: mode })}
                        />

                        {/* Hero Icons - REUSE EXISTING */}
                        <h3 style={labelStyle}>🎯 HERO ICONS</h3>
                        <div style={cardStyle}>
                            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Customize the color and icon style for home tiles</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {['menu', 'delivery', 'rewards', 'game'].map(iconId => {
                                    const iconConfig = demoConfig.heroIcons?.[iconId] || HERO_DEFAULT
                                    const labels = { menu: 'Menu', delivery: 'Delivery', rewards: 'Rewards', game: 'Game' }
                                    return (
                                        <HeroIconPicker
                                            key={iconId}
                                            label={labels[iconId]}
                                            iconId={iconId}
                                            color={iconConfig.color}
                                            iconColorMode={iconConfig.iconColorMode}
                                            onColorChange={(newColor) => {
                                                handleConfigChange({
                                                    heroIcons: {
                                                        ...demoConfig.heroIcons,
                                                        [iconId]: { ...iconConfig, color: newColor }
                                                    }
                                                })
                                            }}
                                            onIconModeChange={(mode) => {
                                                handleConfigChange({
                                                    heroIcons: {
                                                        ...demoConfig.heroIcons,
                                                        [iconId]: { ...iconConfig, iconColorMode: mode }
                                                    }
                                                })
                                            }}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* MENU TAB (Owner only) - FUNCTIONAL EDITING */}
                {activeTab === 'menu' && role === 'owner' && (
                    <>
                        <h3 style={labelStyle}>🍽️ MENU MANAGEMENT</h3>
                        {demoMenu?.categories?.map(category => (
                            <div key={category.id} style={{ marginBottom: 20 }}>
                                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 }}>{category.icon} {category.name}</h4>
                                {category.items?.map(item => (
                                    <div key={item.id} style={{ ...cardStyle, marginBottom: 8 }}>
                                        <div style={{ marginBottom: 8 }}>
                                            <label style={{ fontSize: 11, color: '#9CA3AF' }}>Name</label>
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => handleMenuItemEdit(category.id, item.id, { name: e.target.value })}
                                                style={{ ...inputStyle, marginBottom: 4, fontWeight: 500 }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: 11, color: '#9CA3AF' }}>Price ($)</label>
                                                <input
                                                    type="number"
                                                    value={item.price || 0}
                                                    onChange={(e) => handleMenuItemEdit(category.id, item.id, { price: parseFloat(e.target.value) || 0 })}
                                                    style={{ ...inputStyle, marginBottom: 0 }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: 11, color: '#9CA3AF' }}>Status</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={item.outOfStock || false}
                                                        onChange={(e) => handleMenuItemEdit(category.id, item.id, { outOfStock: e.target.checked })}
                                                        style={{ accentColor: '#EF4444' }}
                                                    />
                                                    <span style={{ fontSize: 12, color: '#6B7280' }}>Out of stock</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                        <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 16 }}>
                            💡 Click "Apply to Frontend" to see changes in customer view
                        </p>
                    </>
                )}

                {/* INFO TAB (Owner only) - PRESENCE MODE */}
                {activeTab === 'info' && role === 'owner' && (
                    <>
                        <h3 style={labelStyle}>📍 BUSINESS INFO</h3>
                        <div style={cardStyle}>
                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Hours</label>
                            <input
                                type="text"
                                value={demoConfig.businessInfo?.hours || ''}
                                onChange={(e) => handleConfigChange({
                                    businessInfo: { ...demoConfig.businessInfo, hours: e.target.value }
                                })}
                                placeholder="Add your hours (e.g., Mon-Fri 9am-6pm)"
                                style={inputStyle}
                            />

                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, marginTop: 12 }}>Address</label>
                            <input
                                type="text"
                                value={demoConfig.businessInfo?.address || ''}
                                onChange={(e) => handleConfigChange({
                                    businessInfo: { ...demoConfig.businessInfo, address: e.target.value }
                                })}
                                placeholder="Add your address"
                                style={inputStyle}
                            />

                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, marginTop: 12 }}>Phone</label>
                            <input
                                type="text"
                                value={demoConfig.businessInfo?.phone || ''}
                                onChange={(e) => handleConfigChange({
                                    businessInfo: { ...demoConfig.businessInfo, phone: e.target.value }
                                })}
                                placeholder="Add your phone number"
                                style={inputStyle}
                            />

                            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4, marginTop: 12 }}>WhatsApp</label>
                            <input
                                type="text"
                                value={demoConfig.businessInfo?.whatsapp || ''}
                                onChange={(e) => handleConfigChange({
                                    businessInfo: { ...demoConfig.businessInfo, whatsapp: e.target.value }
                                })}
                                placeholder="Add your WhatsApp number"
                                style={inputStyle}
                            />
                        </div>
                        <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
                            These fields show presence in the Info screen
                        </p>
                    </>
                )}

                {/* ORDERS TAB */}
                {activeTab === 'orders' && (
                    <>
                        <h3 style={labelStyle}>📋 ACTIVE ORDERS</h3>
                        {activeOrders.length === 0 ? (
                            <div style={{ ...cardStyle, textAlign: 'center', padding: 32 }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                                <p style={{ color: '#6B7280' }}>No active orders</p>
                            </div>
                        ) : (
                            activeOrders.map(order => (
                                <div key={order.id} style={{ ...cardStyle, borderLeft: `4px solid ${order.status === 'listo' ? '#22C55E' : '#F59E0B'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontSize: 20, fontWeight: 700 }}>#{order.orderNumber}</span>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            fontSize: 11,
                                            fontWeight: 500,
                                            background: order.status === 'listo' ? '#D1FAE5' : '#FEF3C7',
                                            color: order.status === 'listo' ? '#065F46' : '#92400E'
                                        }}>
                                            {order.status === 'preparacion' ? 'Preparing' : order.status === 'listo' ? 'Ready' : order.status}
                                        </span>
                                    </div>
                                    <div style={{ marginBottom: 8 }}>
                                        {order.items.map((item, idx) => (
                                            <p key={idx} style={{ fontSize: 13, color: '#374151', margin: '2px 0' }}>{item.quantity}× {item.name}</p>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#22C55E' }}>${order.total.toLocaleString()}</span>
                                        <button
                                            onClick={() => alert('ℹ️ Demo Mode — Order status changes are simulated')}
                                            style={{
                                                padding: '8px 16px',
                                                background: '#3B82F6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: 6,
                                                fontSize: 12,
                                                fontWeight: 500,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {order.status === 'preparacion' ? 'Mark Ready' : 'Deliver'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}

                        <div style={{ ...cardStyle, textAlign: 'center', marginTop: 8 }}>
                            <p style={{ color: '#6B7280', fontSize: 13 }}>Orders today</p>
                            <p style={{ fontSize: 28, fontWeight: 700, color: '#22C55E', margin: '4px 0' }}>{todayOrders.length}</p>
                        </div>
                    </>
                )}

                {/* ANALYTICS TAB (Owner only) */}
                {activeTab === 'analytics' && role === 'owner' && (
                    <>
                        <h3 style={labelStyle}>📈 ANALYTICS</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div style={cardStyle}>
                                <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>This Week</p>
                                <p style={{ fontSize: 20, fontWeight: 700, color: '#22C55E', margin: '4px 0' }}>${MOCK_ANALYTICS.week.revenue.toLocaleString()}</p>
                                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{MOCK_ANALYTICS.week.orders} orders</p>
                            </div>
                            <div style={cardStyle}>
                                <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>This Month</p>
                                <p style={{ fontSize: 20, fontWeight: 700, color: '#22C55E', margin: '4px 0' }}>${MOCK_ANALYTICS.month.revenue.toLocaleString()}</p>
                                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{MOCK_ANALYTICS.month.orders} orders</p>
                            </div>
                        </div>

                        {/* Demo Chart Placeholder */}
                        <div style={cardStyle}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Revenue Trend (30 days)</p>
                            <div style={{ display: 'flex', alignItems: 'flex-end', height: 80, gap: 4 }}>
                                {[45, 60, 35, 80, 55, 70, 90, 65, 75, 85, 50, 95, 70, 60, 80].map((h, i) => (
                                    <div key={i} style={{ flex: 1, height: `${h}%`, background: i % 2 === 0 ? '#B8A089' : '#C9B89A', borderRadius: '3px 3px 0 0', minHeight: 6 }} />
                                ))}
                            </div>
                            <p style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>⚠️ Demo data</p>
                        </div>
                    </>
                )}

                {/* STOCK TAB (Staff) */}
                {activeTab === 'stock' && role === 'staff' && (
                    <>
                        <h3 style={labelStyle}>🍽️ ITEM AVAILABILITY</h3>
                        {demoMenu?.categories?.slice(0, 2).map(category => (
                            <div key={category.id} style={{ marginBottom: 16 }}>
                                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>{category.icon} {category.name}</h4>
                                <div style={cardStyle}>
                                    {category.items?.slice(0, 4).map(item => (
                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{item.name}</p>
                                                <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>${item.price?.toLocaleString()}</p>
                                            </div>
                                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                                <input type="checkbox" defaultChecked style={{ accentColor: '#22C55E' }} onChange={() => alert('ℹ️ Demo Mode — Availability toggle simulated')} />
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {/* REWARDS TAB (Staff) */}
                {activeTab === 'rewards' && role === 'staff' && (
                    <>
                        <h3 style={labelStyle}>⭐ STAMP VALIDATION</h3>
                        <div style={cardStyle}>
                            <h3 style={{ textAlign: 'center', marginBottom: 12 }}>Validate Stamp</h3>
                            <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
                                Use this to add a stamp when a customer visits or shares on Instagram
                            </p>
                            <button
                                onClick={() => alert('ℹ️ Demo Mode — Stamp added (simulated)')}
                                style={{
                                    width: '100%',
                                    padding: 14,
                                    background: '#22C55E',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 10,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                ⭐ Add Stamp
                            </button>
                        </div>
                    </>
                )}

            </div>

            {/* Demo Footer */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '12px 16px',
                background: '#FEF3C7',
                borderTop: '1px solid #FCD34D',
                textAlign: 'center'
            }}>
                <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>
                    🔒 Demo Mode — Demo data resets automatically
                </p>
            </div>
        </div>
    )
}

export default DemoBackend
