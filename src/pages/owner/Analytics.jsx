import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getAuth, clearAuth, getAnalytics, getOrders, getRewards } from '../../utils/storage.js'

function Analytics() {
    const navigate = useNavigate()
    const [analytics, setAnalytics] = useState(() => getAnalytics())
    const [orders, setOrders] = useState(() => getOrders())
    const [rewards, setRewards] = useState(() => getRewards())

    // Check auth
    useEffect(() => {
        const auth = getAuth()
        if (!auth.authenticated || (auth.role !== 'owner' && auth.role !== 'superadmin')) {
            navigate('/owner')
        }
    }, [navigate])

    // Refresh data
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

    return (
        <div className="page" style={{ paddingBottom: 'var(--space-4)' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-4)'
            }}>
                <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                    📊 Estadísticas
                </h1>
                <button
                    className="btn btn-secondary"
                    onClick={handleLogout}
                    style={{ padding: 'var(--space-2) var(--space-3)' }}
                >
                    Salir
                </button>
            </div>

            {/* Owner Navigation */}
            <div className="tabs" style={{ marginBottom: 'var(--space-4)' }}>
                <Link to="/owner/menu" className="tab">Menú</Link>
                <Link to="/owner/rewards" className="tab">Recompensas</Link>
                <Link to="/owner/settings" className="tab">Config</Link>
                <Link to="/owner/analytics" className="tab active">Stats</Link>
            </div>

            {/* Orders Stats */}
            <div className="admin-section">
                <h3 className="admin-section-title">📋 Pedidos</h3>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{ordersToday}</div>
                        <div className="stat-label">Hoy</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{ordersWeek}</div>
                        <div className="stat-label">Esta semana</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{ordersMonth}</div>
                        <div className="stat-label">Este mes</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{orders.length}</div>
                        <div className="stat-label">Total</div>
                    </div>
                </div>
            </div>

            {/* Engagement Stats */}
            <div className="admin-section">
                <h3 className="admin-section-title">👥 Actividad</h3>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{analytics.visits || 0}</div>
                        <div className="stat-label">Visitas</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{analytics.instagramShares || 0}</div>
                        <div className="stat-label">Shares IG</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{rewards.stamps || 0}</div>
                        <div className="stat-label">Sellos activos</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{rewards.redeemed?.length || 0}</div>
                        <div className="stat-label">Canjeados</div>
                    </div>
                </div>
            </div>

            {/* Revenue Stats */}
            <div className="admin-section">
                <h3 className="admin-section-title">💰 Ingresos</h3>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">${(revenueToday / 1000).toFixed(1)}k</div>
                        <div className="stat-label">Hoy</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">${(totalRevenue / 1000).toFixed(1)}k</div>
                        <div className="stat-label">Total</div>
                    </div>
                </div>
            </div>

            {/* Note */}
            <p style={{
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: 'var(--font-size-sm)',
                marginTop: 'var(--space-4)'
            }}>
                Solo números · Sin gráficos
            </p>
        </div>
    )
}

export default Analytics
