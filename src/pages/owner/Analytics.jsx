import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import BackendHeader from '../../components/BackendHeader.jsx'
import BackendNav from '../../components/BackendNav.jsx'
import { formatPrice } from '../../config/menuData.js'
import { logout } from '../../utils/auth.js'

/* --- ANALYTICS COMPONENT (SUPABASE-READY READ LAYER) --- */
const Analytics = ({ orders = [] }) => {
    const navigate = useNavigate()
    const { tenantSlug } = useParams() // 🏢 Get tenant from URL for logout redirect

    // Navigation Exit Strategy: Prevents Admin Sub-Page Trap
    const handleBack = () => navigate(`/${tenantSlug}/owner/summary`)
    // 🚀 SILO-AWARE LOGOUT: Redirect to customer-facing view of THIS tenant
    const handleLogout = async () => {
        await supabase.auth.signOut()
        logout()
        window.location.href = `/${tenantSlug}`
    }

    // Data Logic: Purely functional, derived from 'orders' prop to ensure Single Source of Truth
    const stats = useMemo(() => {
        const deliveredOrders = orders.filter(o => o.status === 'entregado')
        const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0)
        const deliveryTotal = orders.filter(o => o.orderType === 'delivery').length
        const pickupTotal = orders.filter(o => o.orderType === 'pickup').length

        return {
            totalRevenue,
            deliveredCount: deliveredOrders.length,
            deliveryTotal,
            pickupTotal
        }
    }, [orders])

    // Styles
    const cardStyle = { padding: '20px', background: '#fff', borderRadius: '18px', border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }
    const labelStyle = { display: 'block', color: '#888', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }
    const valueStyle = { margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#000' }

    return (
        <div className="page backend-surface" style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>
            <BackendHeader
                title="Analytics"
                onLogout={handleLogout}
                showDateSelector={false}
                extraActions={
                    <button
                        onClick={handleBack}
                        style={{ background: '#f0f0f0', border: 'none', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: 12 }}
                    >
                        ← Volver
                    </button>
                }
            />

            <div style={{ padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: 20 }}>
                    <div style={cardStyle}>
                        <span style={labelStyle}>Ingresos Totales</span>
                        <h3 style={valueStyle}>{formatPrice(stats.totalRevenue)}</h3>
                    </div>
                    <div style={cardStyle}>
                        <span style={labelStyle}>Entregados</span>
                        <h3 style={valueStyle}>{stats.deliveredCount}</h3>
                    </div>
                    <div style={cardStyle}>
                        <span style={labelStyle}>Envíos</span>
                        <h3 style={valueStyle}>{stats.deliveryTotal}</h3>
                    </div>
                    <div style={cardStyle}>
                        <span style={labelStyle}>Pickup</span>
                        <h3 style={valueStyle}>{stats.pickupTotal}</h3>
                    </div>
                </div>

                <div style={{ marginTop: '30px', padding: '30px', textAlign: 'center', border: '1px dashed #ccc', borderRadius: '20px', color: '#888' }}>
                    <p style={{ margin: 0 }}>📈 Real-time Supabase insights pendiente migración.</p>
                </div>
            </div>

            <BackendNav
                role="owner"
                activeTab="analytics"
                onTabChange={(tab) => navigate(`/owner/${tab}`)}
            />
        </div>
    )
}

export default Analytics
