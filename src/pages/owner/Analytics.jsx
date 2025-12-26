import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAuth, clearAuth, getAnalytics, getOrders, getRewards } from '../../utils/storage.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'

function Analytics({ demoMode = false }) {
    const navigate = useNavigate()
    const [analytics, setAnalytics] = useState(() => getAnalytics())
    const [orders, setOrders] = useState(() => getOrders())
    const [rewards, setRewards] = useState(() => getRewards())

    useEffect(() => {
        // Skip auth check in demo mode
        if (demoMode) return

        const auth = getAuth()
        if (!auth.authenticated || (auth.role !== 'owner' && auth.role !== 'superadmin')) {
            navigate('/owner')
        }
    }, [navigate, demoMode])

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
    // Demo mock data - consistent with Demo Summary
    const demoStats = {
        ordersToday: 3,
        ordersWeek: 12,
        ordersMonth: 45,
        totalOrders: 127,
        revenueToday: 8500,
        totalRevenue: 45000,
        visits: 1240,
        instagramShares: 85,
        stamps: 42,
        redeemed: 15
    }

    const realOrdersToday = orders.filter(o => new Date(o.createdAt).toDateString() === today).length
    const realOrdersWeek = orders.filter(o => new Date(o.createdAt) >= weekAgo).length
    const realOrdersMonth = orders.filter(o => new Date(o.createdAt) >= monthAgo).length
    const realTotalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const realRevenueToday = orders
        .filter(o => new Date(o.createdAt).toDateString() === today)
        .reduce((sum, o) => sum + (o.total || 0), 0)

    // Use demo data when in demo mode
    const ordersToday = demoMode ? demoStats.ordersToday : realOrdersToday
    const ordersWeek = demoMode ? demoStats.ordersWeek : realOrdersWeek
    const ordersMonth = demoMode ? demoStats.ordersMonth : realOrdersMonth
    const totalRevenue = demoMode ? demoStats.totalRevenue : realTotalRevenue
    const revenueToday = demoMode ? demoStats.revenueToday : realRevenueToday
    const totalOrdersCount = demoMode ? demoStats.totalOrders : orders.length

    // Activity stats
    const visits = demoMode ? demoStats.visits : (analytics.visits || 0)
    const igShares = demoMode ? demoStats.instagramShares : (analytics.instagramShares || 0)
    const activeStamps = demoMode ? demoStats.stamps : (rewards.stamps || 0)
    const redeemedRewards = demoMode ? demoStats.redeemed : (rewards.redeemed?.length || 0)

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
            <BackendHeader
                title={demoMode ? "Demo Analytics" : "Estadísticas"}
                onLogout={handleLogout}
                showDateSelector={!demoMode}
            />

            <div style={{ padding: 16, paddingBottom: 100 }}>
                {/* Orders Stats */}
                <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 10, marginTop: 0 }}>PEDIDOS</h3>

                    {/* Demo Date Range Pill */}
                    {demoMode && (
                        <div style={{
                            background: '#DBEAFE',
                            border: '1px solid #3B82F6',
                            borderRadius: 20,
                            padding: '6px 12px',
                            marginBottom: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#1E40AF',
                            cursor: 'pointer'
                        }}>
                            📅 Demo Period: 2 weeks
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <StatCard value={ordersToday} label="Hoy" />
                        <StatCard value={ordersWeek} label="Esta semana" />
                        <StatCard value={ordersMonth} label="Este mes" />
                        <StatCard value={totalOrdersCount} label="Total" />
                    </div>
                </div>

                {/* Engagement Stats */}
                <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 10, marginTop: 0 }}>ACTIVIDAD</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <StatCard value={visits} label="Visitas" />
                        <StatCard value={igShares} label="Shares IG" />
                        <StatCard value={activeStamps} label="Sellos activos" />
                        <StatCard value={redeemedRewards} label="Canjeados" />
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

            {/* Backend Navigation */}
            <BackendNav
                role={demoMode ? 'demo' : 'owner'}
                useRoutes={true}
            />
        </div>
    )
}

export default Analytics
