import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAuth, clearAuth, getAnalytics, getOrders, getRewards } from '../../utils/storage.js'

// Shared Owner Header Component
function OwnerHeader({ title, subtitle, onLogout }) {
    return (
        <div style={{
            background: '#1E293B',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <div>
                <h1 style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: '#FFFFFF',
                    margin: 0,
                    letterSpacing: '-0.01em'
                }}>{title}</h1>
                {subtitle && (
                    <p style={{
                        fontSize: 12,
                        color: '#94A3B8',
                        margin: '2px 0 0'
                    }}>{subtitle}</p>
                )}
            </div>
            <button
                onClick={onLogout}
                style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#94A3B8',
                    background: 'transparent',
                    border: '1px solid #475569',
                    borderRadius: 6,
                    cursor: 'pointer'
                }}
            >
                Salir
            </button>
        </div>
    )
}

// Shared Owner Tab Navigation
function OwnerTabs({ activeTab }) {
    const tabs = [
        { id: 'settings', path: '/owner/settings', label: 'Config' },
        { id: 'menu', path: '/owner/menu', label: 'Menú' },
        { id: 'delivery', path: '/owner/delivery', label: 'Envíos' },
        { id: 'analytics', path: '/owner/analytics', label: 'Stats' },
        { id: 'rewards', path: '/owner/rewards', label: 'Recompensas' }
    ]

    return (
        <div style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
        }}>
            {tabs.map(tab => (
                <Link
                    key={tab.id}
                    to={tab.path}
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        fontSize: 13,
                        fontWeight: activeTab === tab.id ? 600 : 500,
                        color: activeTab === tab.id ? '#1E293B' : '#64748B',
                        textDecoration: 'none',
                        textAlign: 'center',
                        borderBottom: activeTab === tab.id ? '2px solid #3B82F6' : '2px solid transparent',
                        background: 'transparent',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    )
}

function Analytics() {
    const navigate = useNavigate()
    const [analytics, setAnalytics] = useState(() => getAnalytics())
    const [orders, setOrders] = useState(() => getOrders())
    const [rewards, setRewards] = useState(() => getRewards())

    useEffect(() => {
        const auth = getAuth()
        if (!auth.authenticated || (auth.role !== 'owner' && auth.role !== 'superadmin')) {
            navigate('/owner')
        }
    }, [navigate])

    useEffect(() => {
        const interval = setInterval(() => {
            setAnalytics(getAnalytics())
            setOrders(getOrders())
            setRewards(getRewards())
        }, 5000)
        return () => clearInterval(interval)
    }, [])

    const handleLogout = () => {
        clearAuth()
        navigate('/')
    }

    // Calculate stats
    const today = new Date().toDateString()
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const ordersToday = orders.filter(o => new Date(o.createdAt).toDateString() === today).length
    const ordersWeek = orders.filter(o => new Date(o.createdAt) >= weekAgo).length
    const ordersMonth = orders.filter(o => new Date(o.createdAt) >= monthAgo).length

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const revenueToday = orders
        .filter(o => new Date(o.createdAt).toDateString() === today)
        .reduce((sum, o) => sum + (o.total || 0), 0)

    const StatCard = ({ value, label }) => (
        <div style={{
            background: '#FFFFFF',
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            padding: 16,
            textAlign: 'center'
        }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1E293B' }}>{value}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{label}</div>
        </div>
    )

    return (
        <div className="backend-surface" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
            <OwnerHeader
                title="Estadísticas"
                subtitle="Métricas del negocio"
                onLogout={handleLogout}
            />
            <OwnerTabs activeTab="analytics" />

            <div style={{ padding: 16 }}>
                {/* Orders Stats */}
                <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 10, marginTop: 0 }}>PEDIDOS</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <StatCard value={ordersToday} label="Hoy" />
                        <StatCard value={ordersWeek} label="Esta semana" />
                        <StatCard value={ordersMonth} label="Este mes" />
                        <StatCard value={orders.length} label="Total" />
                    </div>
                </div>

                {/* Engagement Stats */}
                <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 10, marginTop: 0 }}>ACTIVIDAD</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <StatCard value={analytics.visits || 0} label="Visitas" />
                        <StatCard value={analytics.instagramShares || 0} label="Shares IG" />
                        <StatCard value={rewards.stamps || 0} label="Sellos activos" />
                        <StatCard value={rewards.redeemed?.length || 0} label="Canjeados" />
                    </div>
                </div>

                {/* Revenue Stats */}
                <div>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 10, marginTop: 0 }}>INGRESOS</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <StatCard value={`$${(revenueToday / 1000).toFixed(1)}k`} label="Hoy" />
                        <StatCard value={`$${(totalRevenue / 1000).toFixed(1)}k`} label="Total" />
                    </div>
                </div>

                <p style={{
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: 11,
                    marginTop: 24
                }}>
                    Solo números · Sin gráficos
                </p>
            </div>
        </div>
    )
}

export default Analytics
